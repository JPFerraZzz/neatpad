/* ============================================================================
 * NeatPad — PWA bootstrap + Install Gate
 * ----------------------------------------------------------------------------
 * 1. Regista o service worker.
 * 2. Em mobile (iPhone/Android), se a app NÃO está instalada (modo standalone):
 *      - bloqueia o uso da web
 *      - mostra ecrã com instruções de instalação
 *      - Android: botão nativo via beforeinstallprompt
 *      - iOS: instruções passo-a-passo (Partilhar → Adicionar ao ecrã inicial)
 * 3. Em desktop: nunca bloqueia.
 * 4. Bypass opcional: adicionar ?dev=1 ao URL em desenvolvimento local.
 * ==========================================================================*/

(function () {
    'use strict';

    // ── Registar service worker ──────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                .catch(err => console.warn('[PWA] SW registration failed:', err));
        });
    }

    // ── Deteção ──────────────────────────────────────────────────────────

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.matchMedia('(display-mode: fullscreen)').matches
            || window.matchMedia('(display-mode: minimal-ui)').matches
            || window.navigator.standalone === true;
    }

    function isIOS() {
        const ua = navigator.userAgent;
        const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return /iPhone|iPod/.test(ua) || isIPad;
    }

    function isAndroid() { return /Android/.test(navigator.userAgent); }

    function isMobileDevice() {
        // Preferimos deteção por user agent para mobile real.
        // Browsers desktop com ecrã pequeno não devem ser bloqueados.
        return isIOS() || isAndroid();
    }

    function isDevBypass() {
        try {
            const q = new URLSearchParams(window.location.search);
            if (q.get('dev') === '1') {
                localStorage.setItem('neatpad-dev-bypass', '1');
                return true;
            }
            if (localStorage.getItem('neatpad-dev-bypass') === '1') return true;
        } catch (e) {}
        return false;
    }

    // ── Install gate ─────────────────────────────────────────────────────

    let deferredPrompt = null;

    const gate       = document.getElementById('pwa-install-gate');
    const gateSteps  = document.getElementById('gateSteps');
    const gateInstallBtn = document.getElementById('gateInstallBtn');
    const gateTabs   = gate?.querySelectorAll('[data-gate-tab]');

    function activateGate() {
        if (!gate) return;
        document.body.classList.add('gate-active');
        // Travar scroll e focus de elementos da app
        document.body.style.overflow = 'hidden';
        // Anunciar a qualquer screen reader
        gate.setAttribute('aria-modal', 'true');
    }

    function renderSteps(platform) {
        if (!gateSteps) return;

        gateTabs?.forEach(t => {
            t.classList.toggle('active', t.dataset.gateTab === platform);
            t.setAttribute('aria-selected', t.dataset.gateTab === platform ? 'true' : 'false');
        });

        if (platform === 'ios') {
            gateSteps.innerHTML = `
                <li>Abre o NeatPad no <strong>Safari</strong> (não funciona no Chrome iOS).</li>
                <li>Toca no botão <strong>Partilhar</strong> <i class="fas fa-share" aria-hidden="true"></i> na barra inferior.</li>
                <li>Escolhe <strong>Adicionar ao ecrã principal</strong>.</li>
                <li>Confirma em <strong>Adicionar</strong>.</li>
                <li>Abre o NeatPad a partir do ícone no ecrã inicial.</li>
            `;
            if (gateInstallBtn) gateInstallBtn.style.display = 'none';
        } else {
            gateSteps.innerHTML = `
                <li>Se aparecer a opção, toca em <strong>Instalar agora</strong> em baixo.</li>
                <li>Caso contrário, abre o menu do Chrome (<i class="fas fa-ellipsis-v"></i>) e escolhe <strong>Instalar app</strong> ou <strong>Adicionar ao ecrã inicial</strong>.</li>
                <li>Confirma em <strong>Instalar</strong>.</li>
                <li>Abre o NeatPad a partir do ícone no ecrã inicial.</li>
            `;
            if (gateInstallBtn) {
                gateInstallBtn.style.display = deferredPrompt ? 'inline-flex' : 'none';
            }
        }
    }

    gateTabs?.forEach(tab => {
        tab.addEventListener('click', () => renderSteps(tab.dataset.gateTab));
    });

    gateInstallBtn?.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        try {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } catch (err) { /* ignore */ }
        deferredPrompt = null;
        gateInstallBtn.style.display = 'none';
    });

    // Android dispara beforeinstallprompt mesmo dentro do gate; ativamos o botão.
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (document.body.classList.contains('gate-active') && isAndroid()) {
            if (gateInstallBtn) gateInstallBtn.style.display = 'inline-flex';
        }
    });

    // Se o utilizador instalar a app enquanto o gate está ativo, recarrega.
    window.addEventListener('appinstalled', () => {
        // Na prática, a app abre numa nova janela standalone. Mas se o browser
        // actualizar a flag display-mode, desativamos o gate.
        if (isStandalone()) {
            document.body.classList.remove('gate-active');
            document.body.style.overflow = '';
        }
    });

    // ── Decisão principal ────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        if (isStandalone()) return;           // instalado → permitir
        if (!isMobileDevice()) return;         // desktop → nunca bloquear
        if (isDevBypass()) return;             // ?dev=1 em desenvolvimento

        // Mobile browser fora de standalone → bloqueio duro (em qualquer página)
        const platform = isIOS() ? 'ios' : 'android';
        renderSteps(platform);
        activateGate();
    });
})();
