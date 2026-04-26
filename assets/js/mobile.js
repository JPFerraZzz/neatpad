/* ============================================================================
 * NeatPad — Mobile + Settings UX controller
 * ----------------------------------------------------------------------------
 * Controla:
 *  - Bottom bar (mobile): Início / Espaços / Nova / Versões / Definições
 *  - Painel de Definições (bottom sheet em mobile, popover em desktop)
 *  - Sincroniza saudação + user info
 *
 * Dependências (globais opcionais):
 *   window.switchView(name)           app.js
 *   window.openCategoryModal()        app.js
 *   window.openVersionManager()       app.js
 *   window.toggleTheme()              index.html inline
 *   window.logout()                   auth.js
 * ==========================================================================*/

(function () {
    'use strict';

    const BG_THEMES = [
        { id: 'waves', label: 'Ondas' },
        { id: 'grid',  label: 'Grelha' },
        { id: 'dots',  label: 'Pontos' },
        { id: 'paper', label: 'Papel' },
        { id: 'none',  label: 'Limpo' },
    ];

    // ── Bottom bar navigation ──────────────────────────────────────────
    function initBottomBar() {
        const bar = document.getElementById('bottomBar');
        if (!bar) return;

        bar.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-nav]');
            if (!btn) return;
            const action = btn.dataset.nav;

            switch (action) {
                case 'home':
                    closeAllViews();
                    window.switchView && window.switchView('home');
                    break;
                case 'categories':
                    closeAllViews();
                    window.switchView && window.switchView('categories');
                    break;
                case 'new':
                    window.openCategoryModal && window.openCategoryModal();
                    break;
                case 'versions':
                    closeAllViews();
                    window.openVersionManager && window.openVersionManager();
                    break;
                case 'more':
                    toggleSettings();
                    break;
            }
        });
    }

    function closeAllViews() {
        // Fecha tanto views (.modal) como o popup central (.popup-modal),
        // senão clicar em "Início" deixa o popup de criar categoria aberto.
        document.querySelectorAll('.modal.active, .popup-modal.active')
            .forEach(m => m.classList.remove('active'));
    }

    // ── Painel de Definições ───────────────────────────────────────────
    function isSettingsOpen() {
        const sheet = document.getElementById('moreSheet');
        return sheet && !sheet.hidden;
    }

    function openSettings() {
        const sheet = document.getElementById('moreSheet');
        const bd = document.getElementById('moreSheetBackdrop');
        if (!sheet || !bd) return;

        refreshSettings();
        sheet.hidden = false;
        bd.hidden = false;
        sheet.setAttribute('aria-hidden', 'false');
    }

    function closeSettings() {
        const sheet = document.getElementById('moreSheet');
        const bd = document.getElementById('moreSheetBackdrop');
        if (!sheet || !bd) return;
        sheet.hidden = true;
        bd.hidden = true;
        sheet.setAttribute('aria-hidden', 'true');
    }

    function toggleSettings() {
        if (isSettingsOpen()) closeSettings();
        else openSettings();
    }

    function refreshSettings() {
        const user = window.__currentUser;
        const nameEl = document.getElementById('sheetUserName');
        const emailEl = document.getElementById('sheetUserEmail');
        if (nameEl) nameEl.textContent = user ? (user.name || user.email || 'Utilizador') : '—';
        if (emailEl) emailEl.textContent = user ? (user.email || '') : '';

        const tv = document.getElementById('sheetThemeValue');
        if (tv) tv.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Ativo' : 'Inativo';

        const bg = document.documentElement.getAttribute('data-bg') || 'waves';
        const bv = document.getElementById('sheetBgValue');
        const found = BG_THEMES.find(t => t.id === bg);
        if (bv) bv.textContent = found ? found.label : 'Limpo';

        document.querySelectorAll('#bgChips .bg-chip').forEach(chip => {
            const active = chip.dataset.bg === bg;
            chip.setAttribute('aria-checked', active ? 'true' : 'false');
        });
    }

    function applyBgTheme(id) {
        document.documentElement.setAttribute('data-bg', id);
        try { localStorage.setItem('neatpad-bg-theme', id); } catch (e) {}
        refreshSettings();
    }

    function initSettingsPanel() {
        const bd = document.getElementById('moreSheetBackdrop');
        if (bd) bd.addEventListener('click', closeSettings);

        const closeBtn = document.getElementById('sheetCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeSettings);

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            toggleSettings();
        });

        const tt = document.getElementById('sheetToggleTheme');
        if (tt) tt.addEventListener('click', () => {
            if (typeof window.toggleTheme === 'function') window.toggleTheme();
            refreshSettings();
        });

        const chips = document.getElementById('bgChips');
        if (chips) chips.addEventListener('click', (ev) => {
            const chip = ev.target.closest('.bg-chip');
            if (!chip) return;
            applyBgTheme(chip.dataset.bg);
        });

        const vm = document.getElementById('sheetVersions');
        if (vm) vm.addEventListener('click', () => {
            closeSettings();
            if (typeof window.openVersionManager === 'function') window.openVersionManager();
        });

        const lo = document.getElementById('sheetLogout');
        if (lo) lo.addEventListener('click', () => {
            closeSettings();
            if (typeof window.logout === 'function') window.logout();
        });

        // ESC fecha
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isSettingsOpen()) closeSettings();
        });

        // Em desktop: clicar fora do popover fecha-o (o backdrop é transparente)
        document.addEventListener('click', (ev) => {
            if (!isSettingsOpen()) return;
            const sheet = document.getElementById('moreSheet');
            const btn = document.getElementById('settingsBtn');
            if (sheet && sheet.contains(ev.target)) return;
            if (btn && btn.contains(ev.target)) return;
            // Só fechamos no desktop; no mobile o backdrop já trata
            if (window.matchMedia('(min-width: 768px)').matches) closeSettings();
        });

        document.addEventListener('neatpad:theme-changed', refreshSettings);
    }

    // ── Sincronizar estado da bottom bar com view ativa ─────────────────
    function syncBottomBarHighlight() {
        const activeView = document.documentElement.getAttribute('data-view') || 'home';
        const vmOpen = document.getElementById('versionManagerModal')?.classList.contains('active');

        document.querySelectorAll('.bottom-bar [data-nav]').forEach(b => {
            b.classList.remove('active');
            if (vmOpen && b.dataset.nav === 'versions') b.classList.add('active');
            else if (!vmOpen && b.dataset.nav === activeView) b.classList.add('active');
        });
    }

    function watchActiveStateChanges() {
        const targets = ['viewHome', 'viewCategories', 'itemsModal', 'itemEditorModal', 'versionManagerModal'];
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const obs = new MutationObserver(syncBottomBarHighlight);
            obs.observe(el, { attributes: true, attributeFilter: ['class', 'hidden'] });
        });

        const html = document.documentElement;
        const htmlObs = new MutationObserver(syncBottomBarHighlight);
        htmlObs.observe(html, { attributes: true, attributeFilter: ['data-view'] });
    }

    // ── Carregamento do user (async) ───────────────────────────────────
    function pollUser(max = 40) {
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (window.__currentUser) {
                clearInterval(t);
                refreshSettings();
                if (typeof window.renderHomeStats === 'function') {
                    try { window.renderHomeStats(); } catch (e) { /* noop */ }
                }
                return;
            }
            if (tries > max) clearInterval(t);
        }, 150);
    }

    // ── Boot ───────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        initBottomBar();
        initSettingsPanel();
        watchActiveStateChanges();
        syncBottomBarHighlight();
        refreshSettings();
        pollUser();
    });

    // API pública (para debug/consumo externo)
    window.Neatpad = window.Neatpad || {};
    window.Neatpad.settings = {
        open: openSettings,
        close: closeSettings,
        toggle: toggleSettings,
        refresh: refreshSettings,
        applyBgTheme,
    };
})();
