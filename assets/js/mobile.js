/* ============================================================================
 * NeatPad — Mobile shell
 * ----------------------------------------------------------------------------
 * - Drawer lateral (abre via hamburger, botão ESC ou swipe da esquerda)
 * - Popula a lista de categorias no drawer a partir do AppState
 * - Bottom action bar contextual (muda conforme o que está aberto)
 * - Sincroniza o estado do utilizador no drawer
 *
 * Funciona em conjunto com app.js (que é quem faz o fetch das categorias e
 * abre/fecha as views).
 * ==========================================================================*/

(function () {
    'use strict';

    const MQ_MOBILE = '(max-width: 767px)';

    // ── Drawer ───────────────────────────────────────────────────────────

    const drawer       = document.getElementById('appDrawer');
    const overlay      = document.getElementById('drawerOverlay');
    const hamburger    = document.getElementById('hamburgerBtn');
    const closeBtn     = document.getElementById('drawerCloseBtn');
    const listEl       = document.getElementById('drawerCategoriesList');
    const newCatBtn    = document.getElementById('drawerNewCategoryBtn');
    const versionsBtn  = document.getElementById('drawerVersionsBtn');
    const logoutBtn    = document.getElementById('drawerLogoutBtn');
    const drawerName   = document.getElementById('drawerUserName');
    const drawerEmail  = document.getElementById('drawerUserEmail');

    function openDrawer() {
        if (!drawer) return;
        drawer.classList.add('open');
        overlay.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    hamburger?.addEventListener('click', openDrawer);
    closeBtn ?.addEventListener('click', closeDrawer);
    overlay  ?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
    });

    // Swipe da esquerda para abrir, swipe para a esquerda dentro do drawer para fechar
    let touchStartX = null, touchStartY = null, touchTime = 0;
    document.addEventListener('touchstart', (e) => {
        if (!window.matchMedia(MQ_MOBILE).matches) return;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = Math.abs(t.clientY - touchStartY);
        const dt = Date.now() - touchTime;

        const isHorizontal = Math.abs(dx) > 60 && dy < 50 && dt < 500;
        if (!isHorizontal) { touchStartX = null; return; }

        const fromLeftEdge = touchStartX < 24;
        if (dx > 0 && fromLeftEdge && !drawer.classList.contains('open')) {
            openDrawer();
        } else if (dx < 0 && drawer.classList.contains('open')) {
            closeDrawer();
        }
        touchStartX = null;
    }, { passive: true });

    // ── Drawer: lista de categorias ──────────────────────────────────────

    const ICON_MAP = {
        folder: 'fa-folder', briefcase: 'fa-briefcase', lightbulb: 'fa-lightbulb',
        box: 'fa-box', 'sticky-note': 'fa-sticky-note',
        'graduation-cap': 'fa-graduation-cap', 'shield-alt': 'fa-shield-alt',
        code: 'fa-code', book: 'fa-book', star: 'fa-star',
        heart: 'fa-heart', video: 'fa-video',
    };

    function renderDrawerCategories() {
        if (!listEl) return;
        const cats = (window.AppState && window.AppState.categories) || [];

        if (cats.length === 0) {
            listEl.innerHTML = `
                <li><button type="button" disabled>Sem categorias. Cria uma nova.</button></li>
            `;
            return;
        }

        const activeId = window.AppState?.currentCategory?.id;

        listEl.innerHTML = cats.map(cat => {
            const icon = ICON_MAP[cat.icon] || 'fa-folder';
            const isActive = activeId && String(activeId) === String(cat.id);
            return `
                <li>
                    <button type="button"
                            data-category-id="${cat.id}"
                            class="${isActive ? 'active' : ''}">
                        <span class="drawer-icon" style="${isActive ? '' : `color: ${cat.color};`}">
                            <i class="fas ${icon}"></i>
                        </span>
                        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${escapeHtml(cat.name)}
                        </span>
                        <span class="drawer-badge">${cat.item_count || 0}</span>
                    </button>
                </li>
            `;
        }).join('');

        listEl.querySelectorAll('button[data-category-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-category-id');
                closeDrawer();
                if (typeof window.openCategory === 'function') window.openCategory(id);
            });
        });
    }

    // Monkey-patch suave ao app.js: sempre que as categorias mudam,
    // renderizamos também o drawer. Isto evita ter de tocar em app.js.
    function wrapAppStateHooks() {
        if (!window.AppState) {
            requestAnimationFrame(wrapAppStateHooks);
            return;
        }

        // Observa renderCategories: é chamada em todos os momentos-chave.
        const origRender = window.renderCategories;
        if (typeof origRender === 'function' && !origRender.__mobileWrapped) {
            window.renderCategories = function patched() {
                const r = origRender.apply(this, arguments);
                renderDrawerCategories();
                updateBottomBar();
                return r;
            };
            window.renderCategories.__mobileWrapped = true;
        }

        // Observa abrir/fechar categoria e itens para o bottom bar
        ['openCategory', 'closeItemsModal', 'closeCategoryModal', 'closeItemEditor',
         'openItemEditor', 'openCategoryModal', 'openVersionManager', 'closeVersionManager']
            .forEach(fn => wrapFn(fn));
    }

    function wrapFn(name) {
        const orig = window[name];
        if (typeof orig !== 'function' || orig.__mobileWrapped) return;
        const wrapped = async function () {
            const r = await orig.apply(this, arguments);
            updateBottomBar();
            renderDrawerCategories();
            return r;
        };
        wrapped.__mobileWrapped = true;
        window[name] = wrapped;
    }

    // ── Drawer: dados do utilizador ──────────────────────────────────────

    function updateDrawerUser() {
        const u = window.__currentUser;
        if (!u) return;
        if (drawerName)  drawerName.textContent  = u.name || u.email || 'Utilizador';
        if (drawerEmail) drawerEmail.textContent = u.email || '';
    }

    // ── Drawer: atalhos ─────────────────────────────────────────────────

    newCatBtn?.addEventListener('click', () => {
        closeDrawer();
        if (typeof window.openCategoryModal === 'function') window.openCategoryModal();
    });

    versionsBtn?.addEventListener('click', () => {
        closeDrawer();
        if (typeof window.openVersionManager === 'function') window.openVersionManager();
    });

    logoutBtn?.addEventListener('click', () => {
        closeDrawer();
        if (typeof window.logout === 'function') window.logout();
    });

    // ── Bottom action bar ───────────────────────────────────────────────

    const bottomBar = document.getElementById('bottomBar');

    function isMobile() { return window.matchMedia(MQ_MOBILE).matches; }

    function hasOpenModal(id) {
        const el = document.getElementById(id);
        return el && el.classList.contains('active');
    }

    function anyOpenModal() {
        return document.querySelector('.modal.active');
    }

    function updateBottomBar() {
        if (!bottomBar) return;
        if (!isMobile()) { bottomBar.classList.remove('visible'); return; }

        // Editor de item aberto → sem bottom bar (o form tem o seu próprio submit)
        if (hasOpenModal('itemEditorModal')) {
            bottomBar.classList.remove('visible');
            return;
        }

        // Itens de uma categoria abertos → ações da categoria
        if (hasOpenModal('itemsModal') && window.AppState?.currentCategory) {
            bottomBar.innerHTML = `
                <button type="button" data-action="new-item" class="primary">
                    <i class="fas fa-plus"></i><span>Novo</span>
                </button>
                <button type="button" data-action="edit-category">
                    <i class="fas fa-pen"></i><span>Editar</span>
                </button>
                <button type="button" data-action="versions">
                    <i class="fas fa-history"></i><span>Versões</span>
                </button>
                <button type="button" data-action="delete-category">
                    <i class="fas fa-trash"></i><span>Apagar</span>
                </button>
            `;
            bindBottomActions();
            bottomBar.classList.add('visible');
            return;
        }

        // Version manager aberto → sem bottom bar (header já tem acções)
        if (hasOpenModal('versionManagerModal')) {
            bottomBar.classList.remove('visible');
            return;
        }

        // Category modal aberto → sem bottom bar (form tem submit próprio)
        if (hasOpenModal('categoryModal')) {
            bottomBar.classList.remove('visible');
            return;
        }

        // Ecrã inicial (lista de categorias) → acção principal: nova categoria
        if (!anyOpenModal()) {
            bottomBar.innerHTML = `
                <button type="button" data-action="drawer">
                    <i class="fas fa-bars"></i><span>Menu</span>
                </button>
                <button type="button" data-action="new-category" class="primary">
                    <i class="fas fa-plus"></i><span>Nova</span>
                </button>
                <button type="button" data-action="versions">
                    <i class="fas fa-history"></i><span>Versões</span>
                </button>
            `;
            bindBottomActions();
            bottomBar.classList.add('visible');
            return;
        }

        bottomBar.classList.remove('visible');
    }

    function bindBottomActions() {
        bottomBar.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.getAttribute('data-action');
                if (a === 'drawer')        openDrawer();
                if (a === 'new-category')  window.openCategoryModal?.();
                if (a === 'versions')      window.openVersionManager?.();
                if (a === 'new-item')      window.openItemEditor?.();
                if (a === 'edit-category' && window.AppState?.currentCategory)
                    window.openCategoryModal(window.AppState.currentCategory.id);
                if (a === 'delete-category' && window.AppState?.currentCategory)
                    window.deleteCategory(window.AppState.currentCategory.id);
            });
        });
    }

    window.addEventListener('resize', updateBottomBar);

    // ── Helpers ──────────────────────────────────────────────────────────

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
    }

    // ── Bootstrap ────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        wrapAppStateHooks();
        updateDrawerUser();

        // Tenta popular o drawer assim que as categorias chegarem
        const tick = () => {
            if (window.AppState?.categories?.length >= 0) {
                renderDrawerCategories();
                updateDrawerUser();
                updateBottomBar();
            } else {
                requestAnimationFrame(tick);
            }
        };
        tick();

        // O __currentUser é carregado em async; tenta actualizar o drawer
        // durante os primeiros segundos até estar disponível.
        let tries = 0;
        const userTick = setInterval(() => {
            tries++;
            if (window.__currentUser) {
                updateDrawerUser();
                clearInterval(userTick);
            } else if (tries > 40) {
                clearInterval(userTick);
            }
        }, 150);
    });

    // Observa mutações em .modal.active para manter a bottom bar sincronizada
    const modalObserver = new MutationObserver(() => updateBottomBar());
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal').forEach(m => {
            modalObserver.observe(m, { attributes: true, attributeFilter: ['class'] });
        });
    });

    // Expor para uso externo
    window.NeatPadMobile = {
        openDrawer,
        closeDrawer,
        updateBottomBar,
        renderDrawerCategories,
    };
})();
