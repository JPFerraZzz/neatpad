/* ======================================
   NeatPad - JavaScript Principal
   ====================================== */

// Estado global da aplicação
const AppState = {
    categories: [],
    currentCategory: null,
    currentItem: null,
};

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
    
    if (AppState.categories.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-folder-open"></i>
                <h3>Ainda não tens categorias</h3>
                <p>Clica em "Nova Categoria" para começar</p>
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

    // Event Listeners
    document.getElementById('newCategoryBtn').addEventListener('click', () => openCategoryModal());
    document.getElementById('versionManagerBtn').addEventListener('click', () => openVersionManager());

    document.getElementById('categoryTemplate').addEventListener('change', () => {
        const excelImportGroup = document.getElementById('excelImportGroup');
        const categoryId = document.getElementById('categoryId').value;
        if (excelImportGroup) {
            excelImportGroup.style.display = (document.getElementById('categoryTemplate').value === 'excel' && !categoryId) ? 'block' : 'none';
        }
    });

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const categoryData = {
            id: document.getElementById('categoryId').value || null,
            name: document.getElementById('categoryName').value,
            icon: document.getElementById('categoryIcon').value,
            color: document.getElementById('categoryColor').value,
            template_type: document.getElementById('categoryTemplate').value,
        };

        const fileInput = document.getElementById('categoryExcelImport');
        const isNewExcelWithFile = !categoryData.id && categoryData.template_type === 'excel' && fileInput && fileInput.files && fileInput.files[0];

        if (isNewExcelWithFile) {
            try {
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
            } catch (err) {
                showNotification('Erro: ' + (err.message || 'ao criar categoria'), 'error');
            }
            return;
        }

        saveCategory(categoryData);
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

    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
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
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#8892a4;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><p style="margin-top:10px;">A carregar versões...</p></div>';

    try {
        const resp = await fetch(`${API_URL}/manage_versions.php`, { credentials: 'same-origin' });
        const data = await resp.json();

        if (!data.success) throw new Error(data.error);

        const items = data.data.items || [];
        const totalVersions = data.data.total_versions || 0;
        const totalSizeKb = data.data.total_size_kb || 0;

        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size:48px;opacity:0.3;display:block;margin-bottom:15px;"></i>
                    <h3 style="color:var(--text-primary);margin-bottom:8px;">Sem versões guardadas</h3>
                    <p><strong>A gestão de versões aplica-se apenas a cadernos.</strong></p>
                    <p style="margin-top:8px;">As versões são criadas quando guardas um caderno ou quando usas "Guardar versão" dentro de um caderno.</p>
                </div>`;
            return;
        }

        const templateIcons = {
            notebooks: 'fa-book', notes: 'fa-sticky-note', tasks: 'fa-tasks',
            course: 'fa-graduation-cap', excel: 'fa-table', simple: 'fa-folder',
        };

        container.innerHTML = `
            <p class="vm-notice" style="background:var(--bg-badge);color:var(--text-secondary);padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;">
                <i class="fas fa-info-circle"></i> <strong>Versões apenas para cadernos.</strong> Só os cadernos têm historial de versões. Podes guardar versões manualmente com um nome dentro de cada caderno.
            </p>
            <div class="vm-stats">
                <div class="vm-stat">
                    <i class="fas fa-layer-group"></i>
                    <div><strong>${items.length}</strong><span>Itens</span></div>
                </div>
                <div class="vm-stat">
                    <i class="fas fa-history"></i>
                    <div><strong>${totalVersions}</strong><span>Versões</span></div>
                </div>
                <div class="vm-stat">
                    <i class="fas fa-database"></i>
                    <div><strong>${totalSizeKb > 1024 ? (totalSizeKb / 1024).toFixed(1) + ' MB' : totalSizeKb + ' KB'}</strong><span>Espaço</span></div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteAllVersions()" style="margin-left:auto;">
                    <i class="fas fa-trash"></i> Limpar Tudo
                </button>
            </div>
            <div class="vm-list">
                ${items.map(item => `
                    <div class="vm-item" id="vm-item-${item.item_id}">
                        <div class="vm-item-icon" style="background:${item.category_color}20;color:${item.category_color};">
                            <i class="fas ${templateIcons[item.template_type] || 'fa-file'}"></i>
                        </div>
                        <div class="vm-item-info">
                            <div class="vm-item-title">${escapeHtml(item.title)}</div>
                            <div class="vm-item-meta">
                                <span style="background:${item.category_color}20;color:${item.category_color};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${escapeHtml(item.category_name)}</span>
                                <span>${item.version_count} versão(ões)</span>
                                <span>${item.total_size_kb} KB</span>
                                <span>${new Date(item.last_version_at).toLocaleDateString('pt-PT')}</span>
                            </div>
                        </div>
                        <div class="vm-item-actions">
                            <button class="btn btn-sm btn-secondary" onclick="toggleItemVersions(${item.item_id})" title="Ver versões">
                                <i class="fas fa-list"></i> Ver
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteItemVersions(${item.item_id})" title="Apagar todas">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="vm-versions-detail" id="vm-detail-${item.item_id}" style="display:none;"></div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#e74c3c;"><i class="fas fa-exclamation-triangle" style="font-size:32px;display:block;margin-bottom:10px;"></i>Erro ao carregar: ${err.message}</div>`;
    }
}

async function toggleItemVersions(itemId) {
    const detail = document.getElementById(`vm-detail-${itemId}`);
    if (!detail) return;

    if (detail.style.display !== 'none') {
        detail.style.display = 'none';
        return;
    }

    detail.style.display = 'block';
    detail.innerHTML = '<div style="padding:15px;text-align:center;color:#8892a4;"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const resp = await fetch(`${API_URL}/get_versions.php?item_id=${itemId}`, { credentials: 'same-origin' });
        const data = await resp.json();

        if (!data.success || !data.data.length) {
            detail.innerHTML = '<div style="padding:15px;text-align:center;color:#8892a4;">Sem versões</div>';
            return;
        }

        detail.innerHTML = `
            <div class="vm-version-list">
                ${data.data.map(v => `
                    <div class="vm-version-row" id="vm-ver-${v.id}">
                        <div class="vm-ver-badge ${v.saved_by}">
                            <i class="fas ${v.saved_by === 'manual' ? 'fa-save' : 'fa-robot'}"></i>
                        </div>
                        <div class="vm-ver-info">
                            <strong>v${v.version}</strong> · ${v.saved_by === 'manual' ? 'Manual' : 'Auto'}${v.version_name ? ' · ' + escapeHtml(v.version_name) : ''} ·
                            ${new Date(v.created_at).toLocaleString('pt-PT')} ·
                            ${Math.round(v.content_length / 1024 * 10) / 10} KB
                        </div>
                        <button class="vm-ver-delete" onclick="deleteSingleVersion(${v.id}, ${itemId})" title="Apagar versão">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        detail.innerHTML = `<div style="padding:15px;color:#e74c3c;">Erro: ${err.message}</div>`;
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

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    /* Version Manager */
    .vm-stats {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 16px 20px;
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border);
    }
    .vm-stat {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .vm-stat i {
        font-size: 16px;
        color: var(--primary);
    }
    .vm-stat div {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
    }
    .vm-stat strong {
        font-size: 16px;
        color: var(--text);
    }
    .vm-stat span {
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .vm-list {
        max-height: 55vh;
        overflow-y: auto;
    }
    .vm-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--border);
        transition: background 0.12s ease;
    }
    .vm-item:hover { background: var(--bg-subtle); }
    .vm-item-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
    }
    .vm-item-info { flex: 1; min-width: 0; }
    .vm-item-title {
        font-weight: 600;
        color: var(--text);
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .vm-item-meta {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 2px;
        font-size: 12px;
        color: var(--text-muted);
        flex-wrap: wrap;
    }
    .vm-item-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
    }
    .vm-versions-detail {
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border);
    }
    .vm-version-list {
        padding: 8px 20px 8px 56px;
    }
    .vm-version-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        margin-bottom: 2px;
        transition: background 0.12s ease;
    }
    .vm-version-row:hover { background: var(--bg-muted); }
    .vm-ver-badge {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
    }
    .vm-ver-badge.manual { background: var(--primary-weak); color: var(--primary); }
    .vm-ver-badge.auto   { background: rgba(46,125,50,0.12); color: var(--success); }
    [data-theme="dark"] .vm-ver-badge.auto { background: rgba(111,207,126,0.15); }
    .vm-ver-info {
        flex: 1;
        font-size: 12px;
        color: var(--text-muted);
    }
    .vm-ver-delete {
        background: none;
        border: none;
        color: var(--text-subtle);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: color 0.12s ease, background 0.12s ease;
    }
    .vm-ver-delete:hover { color: var(--danger); background: var(--danger-weak); }
`;
document.head.appendChild(style);
