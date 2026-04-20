/* ============================================================================
 * NeatPad — Mobile UX controller
 * ----------------------------------------------------------------------------
 * Controla:
 *  - Bottom bar navigation (Início / Espaços / Nova / Versões / Mais)
 *  - Bottom sheet "Mais" (user, tema, fundo, versões, logout)
 *  - Sincroniza saudação + user info
 *
 * Não depende de JS existente além de:
 *   - window.switchView(name)            (app.js)
 *   - window.openCategoryModal()         (app.js)
 *   - window.openVersionManager()        (app.js)
 *   - window.logout()                    (auth.js)
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
                    openMoreSheet();
                    break;
            }
        });
    }

    function closeAllViews() {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }

    // ── Bottom sheet "Mais" ────────────────────────────────────────────
    function openMoreSheet() {
        const sheet = document.getElementById('moreSheet');
        const bd = document.getElementById('moreSheetBackdrop');
        if (!sheet || !bd) return;

        refreshSheet();
        sheet.hidden = false;
        bd.hidden = false;
        sheet.setAttribute('aria-hidden', 'false');
    }
    function closeMoreSheet() {
        const sheet = document.getElementById('moreSheet');
        const bd = document.getElementById('moreSheetBackdrop');
        if (!sheet || !bd) return;
        sheet.hidden = true;
        bd.hidden = true;
        sheet.setAttribute('aria-hidden', 'true');
    }

    function refreshSheet() {
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
    }

    function initMoreSheet() {
        const bd = document.getElementById('moreSheetBackdrop');
        if (bd) bd.addEventListener('click', closeMoreSheet);

        const tt = document.getElementById('sheetToggleTheme');
        if (tt) tt.addEventListener('click', () => {
            if (typeof window.toggleTheme === 'function') window.toggleTheme();
            refreshSheet();
        });

        const bg = document.getElementById('sheetBgTheme');
        if (bg) bg.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-bg') || 'waves';
            const idx = BG_THEMES.findIndex(t => t.id === current);
            const next = BG_THEMES[(idx + 1) % BG_THEMES.length];
            document.documentElement.setAttribute('data-bg', next.id);
            localStorage.setItem('neatpad-bg-theme', next.id);
            refreshSheet();
        });

        const vm = document.getElementById('sheetVersions');
        if (vm) vm.addEventListener('click', () => {
            closeMoreSheet();
            if (typeof window.openVersionManager === 'function') window.openVersionManager();
        });

        const lo = document.getElementById('sheetLogout');
        if (lo) lo.addEventListener('click', () => {
            closeMoreSheet();
            if (typeof window.logout === 'function') window.logout();
        });

        // Fechar ao tocar fora / ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMoreSheet();
        });

        document.addEventListener('neatpad:theme-changed', refreshSheet);
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

    // ── Saudação no header quando o user carrega ────────────────────────
    function pollUser(max = 40) {
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (window.__currentUser) {
                clearInterval(t);
                refreshSheet();
                // Saudação no hero (caso app.js já tenha renderizado)
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
        initMoreSheet();
        watchActiveStateChanges();
        syncBottomBarHighlight();
        pollUser();
    });

    // Expor para debug
    window.Neatpad = window.Neatpad || {};
    window.Neatpad.mobile = { openMoreSheet, closeMoreSheet, refreshSheet };
})();
