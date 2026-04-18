/* ============================================================================
 * NeatPad — PWA bootstrap
 * ----------------------------------------------------------------------------
 * - Regista o service worker
 * - Deteta se a app já está em modo standalone (instalada)
 * - Mostra banner de instalação (Android: beforeinstallprompt, iOS: instruções)
 * - Permite dispensar o banner (não volta a aparecer)
 *
 * A versão web continua 100% funcional para quem não instalar.
 * ==========================================================================*/

(function () {
    'use strict';

    const DISMISS_KEY = 'neatpad-pwa-banner-dismissed';
    const MIN_INTERACTION_MS = 1500;

    // ── Registar o service worker ────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                .catch(err => console.warn('[PWA] SW registration failed:', err));
        });
    }

    // ── Utils ────────────────────────────────────────────────────────────
    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent)
            && !window.MSStream;
    }

    function bannerDismissed() {
        try {
            return localStorage.getItem(DISMISS_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function dismissBanner() {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
        const el = document.getElementById('pwa-install-banner');
        if (el) el.remove();
    }

    // ── Banner UI ────────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('pwa-install-styles')) return;
        const css = `
        .pwa-banner {
            position: fixed;
            left: 16px;
            right: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            max-width: 520px;
            margin: 0 auto;
            background: #1B1830;
            color: #fff;
            border-radius: 14px;
            box-shadow: 0 10px 32px rgba(0,0,0,0.28);
            padding: 14px 16px 14px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 9500;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            animation: pwaSlideUp 0.3s ease-out;
        }
        @keyframes pwaSlideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .pwa-banner__icon {
            width: 40px; height: 40px; border-radius: 10px;
            background: linear-gradient(145deg, #6C63FF, #9D97FF);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; color: #fff; font-size: 18px;
        }
        .pwa-banner__body { flex: 1; min-width: 0; }
        .pwa-banner__title { font-size: 14px; font-weight: 700; margin: 0 0 2px; }
        .pwa-banner__text  { font-size: 12.5px; opacity: 0.82; margin: 0; line-height: 1.35; }
        .pwa-banner__actions { display: flex; gap: 8px; flex-shrink: 0; }
        .pwa-banner__btn {
            border: none; border-radius: 10px;
            padding: 10px 14px;
            font-size: 13px; font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            min-height: 40px;
        }
        .pwa-banner__btn--primary { background: #6C63FF; color: #fff; }
        .pwa-banner__btn--primary:hover { background: #5A52E0; }
        .pwa-banner__btn--ghost {
            background: transparent; color: rgba(255,255,255,0.75);
        }
        .pwa-banner__btn--ghost:hover { color: #fff; }

        /* Modal iOS com instruções */
        .pwa-ios-modal {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.55);
            display: flex; align-items: flex-end; justify-content: center;
            z-index: 9600;
            animation: pwaSlideUp 0.2s ease-out;
        }
        .pwa-ios-modal__box {
            background: #fff; color: #1B1830;
            border-radius: 18px 18px 0 0;
            padding: 22px 22px calc(22px + env(safe-area-inset-bottom, 0px));
            width: 100%; max-width: 520px;
        }
        .pwa-ios-modal__title {
            font-size: 17px; font-weight: 700; margin: 0 0 10px;
            display: flex; align-items: center; gap: 8px;
        }
        .pwa-ios-modal__steps { margin: 10px 0 18px; padding-left: 18px; font-size: 14px; line-height: 1.55; }
        .pwa-ios-modal__close {
            width: 100%;
            background: #6C63FF; color: #fff;
            border: none; border-radius: 12px;
            padding: 12px; font-size: 14px; font-weight: 600;
            cursor: pointer; font-family: inherit;
        }

        @media (prefers-color-scheme: dark) {
            .pwa-ios-modal__box { background: #1E1A36; color: #EDEAFF; }
        }
        `;
        const style = document.createElement('style');
        style.id = 'pwa-install-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderBanner({ title, text, primaryLabel, onPrimary }) {
        injectStyles();
        const banner = document.createElement('div');
        banner.className = 'pwa-banner';
        banner.id = 'pwa-install-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Instalar NeatPad');
        banner.innerHTML = `
            <div class="pwa-banner__icon"><i class="fas fa-feather-alt"></i></div>
            <div class="pwa-banner__body">
                <p class="pwa-banner__title">${title}</p>
                <p class="pwa-banner__text">${text}</p>
            </div>
            <div class="pwa-banner__actions">
                <button class="pwa-banner__btn pwa-banner__btn--ghost" data-action="dismiss">Agora não</button>
                <button class="pwa-banner__btn pwa-banner__btn--primary" data-action="install">${primaryLabel}</button>
            </div>
        `;
        banner.querySelector('[data-action="dismiss"]').addEventListener('click', dismissBanner);
        banner.querySelector('[data-action="install"]').addEventListener('click', () => {
            onPrimary();
        });
        document.body.appendChild(banner);
    }

    function showIosInstructions() {
        injectStyles();
        const overlay = document.createElement('div');
        overlay.className = 'pwa-ios-modal';
        overlay.innerHTML = `
            <div class="pwa-ios-modal__box">
                <h3 class="pwa-ios-modal__title">
                    <i class="fas fa-mobile-alt" style="color:#6C63FF"></i>
                    Instalar no iPhone/iPad
                </h3>
                <ol class="pwa-ios-modal__steps">
                    <li>Toca no ícone <strong>Partilhar</strong> (<i class="fas fa-share"></i>) na barra do Safari.</li>
                    <li>Escolhe <strong>Adicionar ao ecrã principal</strong>.</li>
                    <li>Confirma <strong>Adicionar</strong>. O NeatPad fica como ícone no ecrã inicial.</li>
                </ol>
                <button class="pwa-ios-modal__close" type="button">Percebido</button>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        overlay.querySelector('button').addEventListener('click', () => {
            overlay.remove();
            dismissBanner();
        });
        document.body.appendChild(overlay);
    }

    // ── Fluxo principal ──────────────────────────────────────────────────
    // Se já instalado ou já dispensou, não mexemos
    if (isStandalone() || bannerDismissed()) return;

    // Android / Chrome / Edge: usar beforeinstallprompt
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
            if (bannerDismissed() || isStandalone()) return;
            renderBanner({
                title: 'Instalar o NeatPad',
                text: 'Abre como app no teu telefone — mais rápido e com ícone próprio.',
                primaryLabel: 'Instalar',
                onPrimary: async () => {
                    if (!deferredPrompt) { dismissBanner(); return; }
                    deferredPrompt.prompt();
                    try {
                        await deferredPrompt.userChoice;
                    } catch (err) { /* ignored */ }
                    deferredPrompt = null;
                    dismissBanner();
                }
            });
        }, MIN_INTERACTION_MS);
    });

    window.addEventListener('appinstalled', () => {
        dismissBanner();
        deferredPrompt = null;
    });

    // iOS: não existe beforeinstallprompt, mostra instruções manuais
    if (isIOS()) {
        setTimeout(() => {
            if (bannerDismissed() || isStandalone()) return;
            renderBanner({
                title: 'Instalar o NeatPad',
                text: 'Adiciona ao ecrã inicial para usar como app.',
                primaryLabel: 'Como?',
                onPrimary: showIosInstructions
            });
        }, MIN_INTERACTION_MS);
    }
})();
