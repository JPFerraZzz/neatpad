/* ======================================
   NeatPad - JavaScript Principal
   ====================================== */

// Estado global da aplicação
const AppState = {
    categories: [],
    currentCategory: null,
    currentItem: null,
    isSavingCategory: false,
    currentView: 'home', // 'home' | 'categories'
};

// ==== Utilidades genéricas de loading de botões ====
function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.classList.add('is-loading');
        const labelEl = btn.querySelector('.btn-label');
        if (labelEl) {
            if (!btn.dataset._origLabel) btn.dataset._origLabel = labelEl.textContent;
            const loadingLabel = btn.dataset.labelLoading || 'A guardar…';
            labelEl.textContent = loadingLabel;
        }
    } else {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        const labelEl = btn.querySelector('.btn-label');
        if (labelEl && btn.dataset._origLabel) {
            labelEl.textContent = btn.dataset._origLabel;
        }
    }
}

// API Base URL
const API_URL = 'api';

// ====================================
// Funções de API
// ====================================

async function fetchCategories() {
    try {
        const response = await fetch(`${API_URL}/categories.php`, { credentials: 'same-origin' });
        const data = await response.json();
        
        if (data.success) {
            AppState.categories = data.data;
            renderCategories();
        } else {
            showNotification('Erro ao carregar categorias', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function saveCategory(categoryData) {
    try {
        const isEdit = !!categoryData.id;
        const method = isEdit ? 'PUT' : 'POST';
        const response = await fetch(`${API_URL}/categories.php`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData),
            credentials: 'same-origin',
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Categoria guardada com sucesso!', 'success');
            closeCategoryModal();
            // Recarregar categorias e atualizar o header do modal se estava aberto
            await fetchCategories();
            if (isEdit && AppState.currentCategory && AppState.currentCategory.id == categoryData.id) {
                // Atualizar AppState com novos dados
                AppState.currentCategory = AppState.categories.find(c => c.id == categoryData.id);
                // Atualizar título e ícone no modal de itens
                const iconMap = {
                    'folder': 'fa-folder', 'briefcase': 'fa-briefcase', 'lightbulb': 'fa-lightbulb',
                    'box': 'fa-box', 'sticky-note': 'fa-sticky-note', 'graduation-cap': 'fa-graduation-cap',
                    'shield-alt': 'fa-shield-alt', 'code': 'fa-code', 'book': 'fa-book',
                    'star': 'fa-star', 'heart': 'fa-heart', 'video': 'fa-video',
                };
                const cat = AppState.currentCategory;
                if (cat) {
                    document.getElementById('itemsModalTitle').textContent = cat.name;
                    document.getElementById('currentCategoryIcon').innerHTML = 
                        `<i class="fas ${iconMap[cat.icon] || 'fa-folder'}" style="color: ${cat.color}"></i>`;
                }
            }
        } else {
            showNotification(data.error || 'Erro ao guardar categoria', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Tens a certeza que queres eliminar esta categoria? Todos os itens serão removidos.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/categories.php?id=${categoryId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Categoria eliminada com sucesso!', 'success');
            closeItemsModal();
            fetchCategories();
        } else {
            showNotification(data.error || 'Erro ao eliminar categoria', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function fetchItems(categoryId) {
    try {
        const response = await fetch(`${API_URL}/items.php?category_id=${categoryId}`, { credentials: 'same-origin' });
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            showNotification('Erro ao carregar itens', 'error');
            return [];
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão', 'error');
        return [];
    }
}

async function saveItem(itemData) {
    try {
        const method = itemData.id ? 'PUT' : 'POST';
        const response = await fetch(`${API_URL}/items.php`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData),
            credentials: 'same-origin',
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Item guardado com sucesso!', 'success');
            closeItemEditor();
            // Recarregar itens sem fechar o modal da categoria
            await refreshCurrentCategory();
        } else {
            showNotification(data.error || 'Erro ao guardar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function deleteItem(itemId) {
    if (!confirm('Tens a certeza que queres eliminar este item?')) {
        return;
    }

    // Kill any autosave running for this item BEFORE deleting
    if (window.Autosave) {
        Autosave.unregister(itemId);
        Autosave.clearDraft(itemId);
    }

    try {
        const response = await fetch(`${API_URL}/items.php?id=${itemId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Item eliminado com sucesso!', 'success');
            await refreshCurrentCategory();
        } else {
            showNotification(data.error || 'Erro ao eliminar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão', 'error');
    }
}

// ====================================
// Funções de Renderização
// ====================================

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');

    renderHomeStats();
    renderQuickAccess();

    if (!grid) return;

    if (AppState.categories.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-folder-open"></i>
                <h3>Ainda não tens categorias</h3>
                <p>Clica em "Nova categoria" para começar</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = AppState.categories.map(category => {
        const iconMap = {
            'folder': 'fa-folder',
            'briefcase': 'fa-briefcase',
            'lightbulb': 'fa-lightbulb',
            'box': 'fa-box',
            'sticky-note': 'fa-sticky-note',
            'graduation-cap': 'fa-graduation-cap',
            'shield-alt': 'fa-shield-alt',
            'code': 'fa-code',
            'book': 'fa-book',
            'star': 'fa-star',
            'heart': 'fa-heart',
            'video': 'fa-video',
        };

        const templateNames = {
            'simple': 'Simples',
            'notes': 'Notas',
            'tasks': 'Tarefas',
            'course': 'Cursos',
            'excel': 'Excel',
            'notebooks': 'Cadernos',
        };

        return `
            <div class="category-card" onclick="openCategory(${category.id})" style="border-top-color: ${category.color}">
                <div class="category-header">
                    <div class="category-icon" style="color: ${category.color}">
                        <i class="fas ${iconMap[category.icon] || 'fa-folder'}"></i>
                    </div>
                    <div class="category-actions">
                        <button class="category-action-btn" onclick="event.stopPropagation(); openCategoryModal(${category.id});" title="Editar" aria-label="Editar categoria">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="category-action-btn delete" onclick="event.stopPropagation(); deleteCategory(${category.id});" title="Eliminar" aria-label="Eliminar categoria">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <h3 class="category-title">${escapeHtml(category.name)}</h3>
                <div class="category-info">
                    <span><i class="fas fa-file-alt"></i> ${category.item_count} item(s)</span>
                    <span class="category-badge">${templateNames[category.template_type]}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================================
// Home view: estatísticas + acesso rápido
// ============================================================================
window.renderHomeStats = renderHomeStats;
function renderHomeStats() {
    const elCats = document.getElementById('statCategories');
    const elItems = document.getElementById('statItems');
    const elRecent = document.getElementById('statRecent');
    if (!elCats) return;

    const total = AppState.categories.length;
    const totalItems = AppState.categories.reduce((acc, c) => acc + (Number(c.item_count) || 0), 0);

    // Consideramos "atualizada recentemente" toda a categoria com item_count > 0 nos últimos 7 dias.
    // Como não temos last_updated por categoria aqui, usamos heurística: categorias com itens.
    const recent = AppState.categories.filter(c => Number(c.item_count) > 0).length;

    elCats.textContent = total;
    elItems.textContent = totalItems;
    elRecent.textContent = recent;

    // Saudação
    const greeting = document.getElementById('heroGreeting');
    if (greeting && window.__currentUser) {
        const name = (window.__currentUser.name || window.__currentUser.email || '').split('@')[0];
        const hour = new Date().getHours();
        const prefix = hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite';
        greeting.textContent = `${prefix}${name ? ', ' + name : ''} 👋`;
    }
}

function renderQuickAccess() {
    const grid = document.getElementById('quickGrid');
    if (!grid) return;

    const iconMap = {
        'folder': 'fa-folder', 'briefcase': 'fa-briefcase', 'lightbulb': 'fa-lightbulb',
        'box': 'fa-box', 'sticky-note': 'fa-sticky-note', 'graduation-cap': 'fa-graduation-cap',
        'shield-alt': 'fa-shield-alt', 'code': 'fa-code', 'book': 'fa-book',
        'star': 'fa-star', 'heart': 'fa-heart', 'video': 'fa-video',
    };

    if (AppState.categories.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-sparkles"></i>
                <h3>Ainda sem nada por aqui</h3>
                <p>Cria a tua primeira categoria para começar.</p>
            </div>
        `;
        return;
    }

    // Mostra até 6 categorias recentes
    const recent = AppState.categories.slice(0, 6);
    grid.innerHTML = recent.map(c => `
        <button class="quick-card" type="button" onclick="openCategory(${c.id})">
            <span class="qc-icon" style="color:${c.color}">
                <i class="fas ${iconMap[c.icon] || 'fa-folder'}"></i>
            </span>
            <span class="qc-body">
                <span class="qc-title">${escapeHtml(c.name)}</span>
                <span class="qc-sub">${c.item_count || 0} item(s)</span>
            </span>
            <span class="qc-arrow"><i class="fas fa-chevron-right"></i></span>
        </button>
    `).join('');
}

// ============================================================================
// View router (home ⇄ categories)
// ============================================================================
function switchView(name) {
    const home = document.getElementById('viewHome');
    const cats = document.getElementById('viewCategories');
    if (!home || !cats) return;

    AppState.currentView = name;
    document.documentElement.setAttribute('data-view', name);

    if (name === 'categories') {
        home.hidden = true;
        cats.hidden = false;
    } else {
        home.hidden = false;
        cats.hidden = true;
    }

    // Sincronizar bottom bar
    document.querySelectorAll('.bottom-bar [data-nav]').forEach(b => {
        b.classList.toggle('active', b.dataset.nav === name);
    });

    // Scroll para cima ao mudar de view
    window.scrollTo({ top: 0, behavior: 'instant' });
}
window.switchView = switchView;

// ====================================
// Funções de Modal - Categoria
// ====================================

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('categoryModalTitle');

    form.reset();

    if (categoryId) {
        const category = AppState.categories.find(c => c.id == categoryId);
        
        if (category) {
            title.textContent = 'Editar Categoria';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryIcon').value = category.icon;
            document.getElementById('categoryColor').value = category.color;
            document.getElementById('categoryTemplate').value = category.template_type;
        } else {
            showNotification('Erro: Categoria não encontrada', 'error');
            return;
        }
    } else {
        title.textContent = 'Nova Categoria';
        document.getElementById('categoryId').value = '';
    }

    const excelImportGroup = document.getElementById('excelImportGroup');
    const templateSelect = document.getElementById('categoryTemplate');
    if (excelImportGroup) {
        excelImportGroup.style.display = (templateSelect && templateSelect.value === 'excel' && !categoryId) ? 'block' : 'none';
        document.getElementById('categoryExcelImport').value = '';
    }
    modal.classList.add('active');
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.classList.remove('active');
}

// ====================================
// Funções de Modal - Itens
// ====================================

async function openCategory(categoryIdOrObj) {
    // Aceita tanto um ID como um objeto category
    const categoryId = typeof categoryIdOrObj === 'object' ? categoryIdOrObj.id : categoryIdOrObj;
    const category = AppState.categories.find(c => c.id == categoryId);
    if (!category) return;

    AppState.currentCategory = category;

    const modal = document.getElementById('itemsModal');
    const title = document.getElementById('itemsModalTitle');
    const iconDisplay = document.getElementById('currentCategoryIcon');
    const container = document.getElementById('itemsContainer');

    const iconMap = {
        'folder': 'fa-folder',
        'briefcase': 'fa-briefcase',
        'lightbulb': 'fa-lightbulb',
        'box': 'fa-box',
        'sticky-note': 'fa-sticky-note',
        'graduation-cap': 'fa-graduation-cap',
        'shield-alt': 'fa-shield-alt',
        'code': 'fa-code',
        'book': 'fa-book',
        'star': 'fa-star',
        'heart': 'fa-heart',
        'video': 'fa-video',
    };

    iconDisplay.innerHTML = `<i class="fas ${iconMap[category.icon] || 'fa-folder'}" style="color: ${category.color}"></i>`;
    title.textContent = category.name;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>A carregar...</p></div>';

    modal.classList.add('active');

    // Carregar itens
    const items = await fetchItems(category.id);
    
    // Renderizar baseado no template
    if (window.Templates && window.Templates[category.template_type]) {
        window.Templates[category.template_type].render(container, items);
    } else {
        renderSimpleItems(container, items);
    }
}

function closeItemsModal() {
    const modal = document.getElementById('itemsModal');
    modal.classList.remove('active');
    AppState.currentCategory = null;
}

// Recarregar apenas o conteúdo da categoria atual sem fechar o modal
async function refreshCurrentCategory() {
    if (!AppState.currentCategory) return;

    const container = document.getElementById('itemsContainer');
    if (!container) return;

    const items = await fetchItems(AppState.currentCategory.id);

    const templateType = AppState.currentCategory.template_type;

    // Para cadernos: preservar o caderno activo em vez de resetar para o 1º
    if (templateType === 'notebooks') {
        const activeEl = container.querySelector('.nb-list-item.active');
        const activeId = activeEl ? activeEl.getAttribute('data-notebook-id') : null;

        if (window.Templates && window.Templates.notebooks) {
            window.Templates.notebooks.render(container, items);
        }

        // Restaurar selecção do caderno activo
        if (activeId) {
            const notebook = items.find(i => String(i.id) === String(activeId));
            if (notebook) {
                window.Templates.notebooks.showNotebook(notebook.id);
            }
        }
    } else if (window.Templates && window.Templates[templateType]) {
        window.Templates[templateType].render(container, items);
    } else {
        renderSimpleItems(container, items);
    }

    // Atualizar contador no card da categoria
    await fetchCategories();
}

function renderSimpleItems(container, items) {
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Sem itens</h3>
                <p>Clica em "Novo" para adicionar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="items-list">
            ${items.map(item => `
                <div class="item-card">
                    <div class="item-header">
                        <h4 class="item-title">${escapeHtml(item.title)}</h4>
                        <div class="item-actions">
                            <button class="category-action-btn" onclick="openItemEditor(${item.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="category-action-btn delete" onclick="deleteItem(${item.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${item.content ? `<div class="item-content">${escapeHtml(item.content).substring(0, 200)}...</div>` : ''}
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <span class="item-badge badge-${item.status}">${getStatusLabel(item.status)}</span>
                        <span class="item-badge badge-${item.priority}">${getPriorityLabel(item.priority)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ====================================
// Funções de Modal - Editor de Item
// ====================================

async function openItemEditor(itemId = null) {
    const modal = document.getElementById('itemEditorModal');
    const title = document.getElementById('itemEditorTitle');
    const content = document.getElementById('itemEditorContent');

    AppState.currentItem = null;

    if (itemId) {
        title.textContent = 'Editar Item';
        const items = await fetchItems(AppState.currentCategory.id);
        AppState.currentItem = items.find(i => i.id == itemId);
    } else {
        title.textContent = 'Novo Item';
    }

    // Renderizar editor baseado no template
    const templateType = AppState.currentCategory.template_type;
    if (window.Templates && window.Templates[templateType]) {
        window.Templates[templateType].renderEditor(content, AppState.currentItem);
    } else {
        renderSimpleEditor(content, AppState.currentItem);
    }

    modal.classList.add('active');
}

function closeItemEditor() {
    // Cleanup any active autosave timers before closing
    if (window.Autosave) {
        const itemIdEl = document.getElementById('itemId');
        if (itemIdEl && itemIdEl.value) {
            Autosave.unregister(itemIdEl.value);
        }
    }

    const modal = document.getElementById('itemEditorModal');
    modal.classList.remove('active');
    AppState.currentItem = null;
}

function renderSimpleEditor(container, item) {
    const itemData = item || { title: '', content: '', status: 'pending', priority: 'medium' };

    container.innerHTML = `
        <form id="itemForm" onsubmit="handleSimpleItemSubmit(event)">
            <input type="hidden" id="itemId" value="${item ? item.id : ''}">
            
            <div class="form-group">
                <label for="itemTitle">Título</label>
                <input type="text" id="itemTitle" class="form-control" value="${escapeHtml(itemData.title)}" required>
            </div>

            <div class="form-group">
                <label for="itemContent">Conteúdo</label>
                <textarea id="itemContent" class="form-control" rows="6">${escapeHtml(itemData.content || '')}</textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="itemStatus">Estado</label>
                    <select id="itemStatus" class="form-control">
                        <option value="pending" ${itemData.status === 'pending' ? 'selected' : ''}>Pendente</option>
                        <option value="in_progress" ${itemData.status === 'in_progress' ? 'selected' : ''}>Em Progresso</option>
                        <option value="completed" ${itemData.status === 'completed' ? 'selected' : ''}>Concluído</option>
                        <option value="archived" ${itemData.status === 'archived' ? 'selected' : ''}>Arquivado</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="itemPriority">Prioridade</label>
                    <select id="itemPriority" class="form-control">
                        <option value="low" ${itemData.priority === 'low' ? 'selected' : ''}>Baixa</option>
                        <option value="medium" ${itemData.priority === 'medium' ? 'selected' : ''}>Média</option>
                        <option value="high" ${itemData.priority === 'high' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="itemDueDate">Data de Conclusão</label>
                <input type="date" id="itemDueDate" class="form-control" value="${itemData.due_date || ''}">
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeItemEditor()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </form>
    `;
}

// ====================================
// Event Handlers
// ====================================

function handleSimpleItemSubmit(event) {
    event.preventDefault();

    const itemData = {
        id: document.getElementById('itemId').value || null,
        category_id: AppState.currentCategory.id,
        title: document.getElementById('itemTitle').value,
        content: document.getElementById('itemContent').value,
        status: document.getElementById('itemStatus').value,
        priority: document.getElementById('itemPriority').value,
        due_date: document.getElementById('itemDueDate').value || null,
    };

    saveItem(itemData);
}

// ====================================
// Funções Auxiliares
// ====================================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendente',
        'in_progress': 'Em Progresso',
        'completed': 'Concluído',
        'archived': 'Arquivado',
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'low': 'Baixa',
        'medium': 'Média',
        'high': 'Alta',
    };
    return labels[priority] || priority;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'app-notification app-notification--' + type;
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ====================================
// Inicialização
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    // Carregar categorias
    fetchCategories();

    // Event Listeners (alguns botões só existem em desktop; null-safe)
    const newCatBtn = document.getElementById('newCategoryBtn');
    if (newCatBtn) newCatBtn.addEventListener('click', () => openCategoryModal());

    const vmBtn = document.getElementById('versionManagerBtn');
    if (vmBtn) vmBtn.addEventListener('click', () => openVersionManager());

    // Logo → Home (fecha modais/popups abertos)
    const logoBtn = document.getElementById('logoHome');
    if (logoBtn) logoBtn.addEventListener('click', () => {
        document.querySelectorAll('.modal.active, .popup-modal.active').forEach(m => m.classList.remove('active'));
        switchView('home');
    });

    // Hero CTAs
    const ctaSee = document.getElementById('ctaSeeCategories');
    if (ctaSee) ctaSee.addEventListener('click', () => switchView('categories'));
    const ctaAll = document.getElementById('ctaSeeAll');
    if (ctaAll) ctaAll.addEventListener('click', () => switchView('categories'));
    const ctaNew = document.getElementById('ctaNewCategory');
    if (ctaNew) ctaNew.addEventListener('click', () => openCategoryModal());
    const backBtn = document.getElementById('backToHome');
    if (backBtn) backBtn.addEventListener('click', () => switchView('home'));

    document.getElementById('categoryTemplate').addEventListener('change', () => {
        const excelImportGroup = document.getElementById('excelImportGroup');
        const categoryId = document.getElementById('categoryId').value;
        if (excelImportGroup) {
            excelImportGroup.style.display = (document.getElementById('categoryTemplate').value === 'excel' && !categoryId) ? 'block' : 'none';
        }
    });

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Guarda anti-duplo-submit
        if (AppState.isSavingCategory) return;
        AppState.isSavingCategory = true;

        const submitBtn = document.getElementById('categorySubmitBtn');
        setButtonLoading(submitBtn, true);

        const categoryData = {
            id: document.getElementById('categoryId').value || null,
            name: document.getElementById('categoryName').value,
            icon: document.getElementById('categoryIcon').value,
            color: document.getElementById('categoryColor').value,
            template_type: document.getElementById('categoryTemplate').value,
        };

        const fileInput = document.getElementById('categoryExcelImport');
        const isNewExcelWithFile = !categoryData.id && categoryData.template_type === 'excel' && fileInput && fileInput.files && fileInput.files[0];

        try {
            if (isNewExcelWithFile) {
                const res = await fetch(`${API_URL}/categories.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData),
                    credentials: 'same-origin',
                });
                const data = await res.json();
                if (!data.success) {
                    showNotification(data.error || 'Erro ao criar categoria', 'error');
                    return;
                }
                const newCat = data.data;
                const text = await fileInput.files[0].text();
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length >= 1) {
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const dataRows = lines.slice(1).map(line => {
                        const row = [];
                        let cur = '', inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                            if (line[i] === '"') { inQuotes = !inQuotes; continue; }
                            if (!inQuotes && line[i] === ',') { row.push(cur.trim()); cur = ''; continue; }
                            cur += line[i];
                        }
                        row.push(cur.trim());
                        return row;
                    });
                    await fetch(`${API_URL}/items.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            category_id: newCat.id,
                            title: newCat.name + ' (importado)',
                            status: 'pending',
                            priority: 'medium',
                            metadata: { headers, data: dataRows },
                        }),
                    });
                }
                showNotification('Categoria criada' + (lines.length >= 1 ? ' e dados importados' : '') + '!', 'success');
                closeCategoryModal();
                await fetchCategories();
            } else {
                await saveCategory(categoryData);
            }
        } catch (err) {
            showNotification('Erro: ' + (err.message || 'ao guardar categoria'), 'error');
        } finally {
            AppState.isSavingCategory = false;
            setButtonLoading(submitBtn, false);
        }
    });

    document.getElementById('newItemBtn').addEventListener('click', () => openItemEditor());

    document.getElementById('editCategoryBtn').addEventListener('click', () => {
        if (AppState.currentCategory) {
            openCategoryModal(AppState.currentCategory.id);
        }
    });

    document.getElementById('deleteCategoryBtn').addEventListener('click', () => {
        if (AppState.currentCategory) {
            deleteCategory(AppState.currentCategory.id);
        }
    });

    // Fechar modais ao clicar fora (views)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Fechar popup categoria ao clicar fora
    const pm = document.getElementById('categoryModal');
    if (pm) {
        pm.addEventListener('click', (e) => {
            if (e.target === pm) closeCategoryModal();
        });
    }

    // Fechar view / popup com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const popup = document.querySelector('.popup-modal.active');
        if (popup) { closeCategoryModal(); return; }
        // Fecha a view mais interna (editor > itens > versões)
        const editor = document.getElementById('itemEditorModal');
        if (editor && editor.classList.contains('active')) { closeItemEditor(); return; }
        const items = document.getElementById('itemsModal');
        if (items && items.classList.contains('active')) { closeItemsModal(); return; }
        const vm = document.getElementById('versionManagerModal');
        if (vm && vm.classList.contains('active')) { closeVersionManager(); return; }
    });
});

// ====================================
// Gestão Global de Versões
// ====================================

function openVersionManager() {
    document.getElementById('versionManagerModal').classList.add('active');
    loadVersionManager();
}

function closeVersionManager() {
    document.getElementById('versionManagerModal').classList.remove('active');
}

async function loadVersionManager() {
    const container = document.getElementById('versionManagerContent');
    if (!container) return;

    container.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>A carregar versões...</p></div>`;

    try {
        const resp = await fetch(`${API_URL}/manage_versions.php`, { credentials: 'same-origin' });
        const data = await resp.json();

        if (!data.success) throw new Error(data.error);

        const items = data.data.items || [];
        const totalVersions = data.data.total_versions || 0;
        const totalSizeKb = data.data.total_size_kb || 0;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Sem versões guardadas</h3>
                    <p><strong>A gestão de versões aplica-se apenas a cadernos.</strong></p>
                    <p style="margin-top:8px; max-width: 420px; margin-left:auto; margin-right:auto;">
                        As versões são criadas quando guardas um caderno ou quando usas
                        <em>“Guardar versão”</em> dentro de um caderno.
                    </p>
                </div>`;
            return;
        }

        const templateIcons = {
            notebooks: 'fa-book', notes: 'fa-sticky-note', tasks: 'fa-tasks',
            course: 'fa-graduation-cap', excel: 'fa-table', simple: 'fa-folder',
        };

        container.innerHTML = `
            <div class="vm-wrapper">
                <div class="vm-intro">
                    <i class="fas fa-info-circle"></i>
                    <p><strong>Versões apenas para cadernos.</strong> Só os cadernos guardam historial — automaticamente ou quando usas <em>“Guardar versão”</em>.</p>
                </div>

                <div class="vm-stats">
                    <div class="vm-stat">
                        <span class="vm-stat-icon"><i class="fas fa-layer-group"></i></span>
                        <div class="vm-stat-body">
                            <strong>${items.length}</strong>
                            <span>itens</span>
                        </div>
                    </div>
                    <div class="vm-stat">
                        <span class="vm-stat-icon"><i class="fas fa-history"></i></span>
                        <div class="vm-stat-body">
                            <strong>${totalVersions}</strong>
                            <span>versões</span>
                        </div>
                    </div>
                    <div class="vm-stat">
                        <span class="vm-stat-icon"><i class="fas fa-database"></i></span>
                        <div class="vm-stat-body">
                            <strong>${totalSizeKb > 1024 ? (totalSizeKb / 1024).toFixed(1) + ' MB' : totalSizeKb + ' KB'}</strong>
                            <span>espaço usado</span>
                        </div>
                    </div>
                </div>

                <div class="vm-toolbar">
                    <h4>Itens com historial</h4>
                    <button class="btn btn-danger btn-sm" onclick="deleteAllVersions()">
                        <i class="fas fa-trash"></i> Limpar tudo
                    </button>
                </div>

                <div class="vm-list">
                    ${items.map(item => `
                        <div class="vm-item" id="vm-item-${item.item_id}">
                            <button class="vm-item-row" type="button" onclick="toggleItemVersions(${item.item_id})">
                                <span class="vm-item-icon" style="background:${item.category_color}22;color:${item.category_color};">
                                    <i class="fas ${templateIcons[item.template_type] || 'fa-file'}"></i>
                                </span>
                                <span class="vm-item-info">
                                    <span class="vm-item-title">${escapeHtml(item.title)}</span>
                                    <span class="vm-item-meta">
                                        <span class="vm-chip" style="background:${item.category_color}22;color:${item.category_color};">${escapeHtml(item.category_name)}</span>
                                        <span>${item.version_count} versões</span>
                                        <span>${item.total_size_kb} KB</span>
                                        <span>${new Date(item.last_version_at).toLocaleDateString('pt-PT')}</span>
                                    </span>
                                </span>
                                <span class="vm-chev"><i class="fas fa-chevron-down"></i></span>
                            </button>
                            <div class="vm-versions-detail" id="vm-detail-${item.item_id}" hidden></div>
                            <div class="vm-item-side">
                                <button class="btn btn-danger btn-sm" onclick="deleteItemVersions(${item.item_id})" aria-label="Apagar todas as versões deste item">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="empty-state" style="color:var(--danger);">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Não foi possível carregar versões</h3>
                <p>${escapeHtml(err.message || 'Erro desconhecido')}</p>
            </div>`;
    }
}

async function toggleItemVersions(itemId) {
    const detail = document.getElementById(`vm-detail-${itemId}`);
    const wrapper = document.getElementById(`vm-item-${itemId}`);
    if (!detail) return;

    if (!detail.hidden) {
        detail.hidden = true;
        wrapper && wrapper.classList.remove('open');
        return;
    }

    detail.hidden = false;
    wrapper && wrapper.classList.add('open');
    detail.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>A carregar…</p></div>`;

    try {
        const resp = await fetch(`${API_URL}/get_versions.php?item_id=${itemId}`, { credentials: 'same-origin' });
        const data = await resp.json();

        if (!data.success || !data.data.length) {
            detail.innerHTML = `<div class="vm-empty">Sem versões.</div>`;
            return;
        }

        detail.innerHTML = `
            <ul class="vm-version-list">
                ${data.data.map(v => `
                    <li class="vm-version-row" id="vm-ver-${v.id}">
                        <span class="vm-ver-badge ${v.saved_by}">
                            <i class="fas ${v.saved_by === 'manual' ? 'fa-save' : 'fa-robot'}"></i>
                        </span>
                        <span class="vm-ver-info">
                            <strong>v${v.version}</strong>
                            <span>${v.saved_by === 'manual' ? 'Manual' : 'Auto'}${v.version_name ? ' · ' + escapeHtml(v.version_name) : ''}</span>
                            <span>${new Date(v.created_at).toLocaleString('pt-PT')}</span>
                            <span>${Math.round(v.content_length / 1024 * 10) / 10} KB</span>
                        </span>
                        <button class="vm-ver-delete" onclick="deleteSingleVersion(${v.id}, ${itemId})" aria-label="Apagar versão">
                            <i class="fas fa-times"></i>
                        </button>
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (err) {
        detail.innerHTML = `<div class="vm-empty" style="color:var(--danger);">Erro: ${escapeHtml(err.message)}</div>`;
    }
}

async function deleteSingleVersion(versionId, itemId) {
    try {
        const resp = await fetch(`${API_URL}/manage_versions.php?id=${versionId}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        const row = document.getElementById(`vm-ver-${versionId}`);
        if (row) { row.style.opacity = '0.3'; setTimeout(() => row.remove(), 200); }

        showNotification('Versão apagada', 'success');
        // Refresh the parent item count after a short delay
        setTimeout(() => loadVersionManager(), 500);
    } catch (err) {
        showNotification('Erro: ' + err.message, 'error');
    }
}

async function deleteItemVersions(itemId) {
    if (!confirm('Apagar TODAS as versões deste item? Esta ação é irreversível.')) return;

    try {
        const resp = await fetch(`${API_URL}/manage_versions.php?item_id=${itemId}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        showNotification(`${data.data.deleted} versões apagadas`, 'success');
        loadVersionManager();
    } catch (err) {
        showNotification('Erro: ' + err.message, 'error');
    }
}

async function deleteAllVersions() {
    if (!confirm('ATENÇÃO: Isto apaga TODO o historial de versões de TODOS os itens. Continuar?')) return;

    try {
        const resp = await fetch(`${API_URL}/manage_versions.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_all' }),
            credentials: 'same-origin',
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        showNotification(`Todo o historial limpo (${data.data.deleted} versões)`, 'success');
        loadVersionManager();
    } catch (err) {
        showNotification('Erro: ' + err.message, 'error');
    }
}

// Estilos dinâmicos do version manager (limpos, baseados em design tokens)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to   { transform: translateX(100%); opacity: 0; }
    }

    /* ==== Version Manager ==================================== */
    .vm-wrapper { padding: 16px; }
    @media (min-width: 768px) { .vm-wrapper { padding: 24px; } }

    .vm-intro {
        display: flex; gap: 10px;
        padding: 12px 14px;
        background: var(--primary-weak);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        color: var(--text);
        margin-bottom: 16px;
    }
    .vm-intro i { color: var(--primary); margin-top: 2px; }
    .vm-intro p { font-size: 13px; margin: 0; line-height: 1.5; color: var(--text-muted); }
    .vm-intro p strong { color: var(--text); }

    .vm-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 16px;
    }
    @media (min-width: 768px) { .vm-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
    .vm-stat {
        display: flex; align-items: center; gap: 10px;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 10px 12px;
    }
    .vm-stat-icon {
        width: 34px; height: 34px;
        border-radius: var(--radius);
        background: var(--primary-weak);
        color: var(--primary);
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        font-size: 14px;
    }
    .vm-stat-body { display: flex; flex-direction: column; min-width: 0; }
    .vm-stat-body strong { font-size: 17px; line-height: 1; color: var(--text); font-weight: 800; }
    .vm-stat-body span { font-size: 11px; color: var(--text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }

    .vm-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 10px;
    }
    .vm-toolbar h4 {
        font-size: 13px; font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.08em;
    }

    .vm-list { display: flex; flex-direction: column; gap: 8px; }

    .vm-item {
        position: relative;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        transition: border-color 0.12s ease;
    }
    .vm-item:hover { border-color: var(--border-strong); }
    .vm-item.open { border-color: var(--primary); }

    .vm-item-row {
        display: flex; align-items: center; gap: 12px;
        width: 100%;
        padding: 12px 56px 12px 14px;
        background: transparent;
        border: none;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        color: var(--text);
        min-height: var(--touch-min);
    }
    .vm-item-icon {
        width: 36px; height: 36px;
        border-radius: var(--radius);
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        font-size: 14px;
    }
    .vm-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .vm-item-title {
        font-size: 14px; font-weight: 600;
        color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .vm-item-meta {
        display: flex; gap: 10px; flex-wrap: wrap;
        font-size: 12px; color: var(--text-muted);
        align-items: center;
    }
    .vm-chip {
        padding: 2px 8px;
        border-radius: var(--radius-pill);
        font-size: 10.5px; font-weight: 600;
        line-height: 1.5;
    }
    .vm-chev {
        margin-left: auto;
        color: var(--text-subtle);
        font-size: 12px;
        transition: transform 0.15s ease;
    }
    .vm-item.open .vm-chev { transform: rotate(180deg); }

    .vm-item-side {
        position: absolute;
        top: 10px; right: 10px;
    }

    .vm-versions-detail {
        background: var(--bg-subtle);
        border-top: 1px solid var(--border);
    }
    .vm-empty { padding: 14px; text-align: center; color: var(--text-muted); font-size: 13px; }

    .vm-version-list { list-style: none; margin: 0; padding: 6px; }
    .vm-version-row {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px;
        border-radius: var(--radius);
        transition: background 0.12s ease;
    }
    .vm-version-row:hover { background: var(--bg-muted); }
    .vm-ver-badge {
        width: 28px; height: 28px;
        border-radius: var(--radius);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
    }
    .vm-ver-badge.manual { background: var(--primary-weak); color: var(--primary); }
    .vm-ver-badge.auto   { background: var(--bg-muted); color: var(--success); }
    .vm-ver-info {
        flex: 1;
        display: flex; flex-wrap: wrap; gap: 4px 10px;
        font-size: 12px; color: var(--text-muted);
        align-items: center;
    }
    .vm-ver-info strong { color: var(--text); }
    .vm-ver-delete {
        background: transparent;
        border: none;
        color: var(--text-subtle);
        cursor: pointer;
        width: var(--touch-min); height: var(--touch-min);
        border-radius: var(--radius);
        display: inline-flex; align-items: center; justify-content: center;
        transition: color 0.12s ease, background 0.12s ease;
        flex-shrink: 0;
    }
    .vm-ver-delete:hover { color: var(--danger); background: var(--danger-weak); }
`;
document.head.appendChild(style);
