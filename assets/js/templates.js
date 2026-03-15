/* ======================================
   FerrazNest - Templates Personalizados
   ====================================== */

window.Templates = {
    
    // ====================================
    // TEMPLATE: NOTAS
    // ====================================
    notes: {
        render(container, items) {
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-sticky-note"></i>
                        <h3>Sem notas</h3>
                        <p>Clica em "Novo" para criar uma nota</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="notes-grid">
                    ${items.map(item => `
                        <div class="note-card" style="background: ${this.getNoteColor(item.priority)}">
                            <div class="note-header">
                                <h4 class="note-title">${escapeHtml(item.title)}</h4>
                                <div class="note-actions">
                                    <button class="note-action-btn" onclick="openItemEditor(${item.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="note-action-btn delete" onclick="deleteItem(${item.id})" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="note-content">${escapeHtml(item.content || '').substring(0, 150)}${item.content && item.content.length > 150 ? '...' : ''}</div>
                            <div class="note-footer">
                                <small>${new Date(item.updated_at).toLocaleDateString('pt-PT')}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <style>
                    .notes-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 20px;
                    }
                    .note-card {
                        border-radius: 12px;
                        padding: 20px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        transition: transform 0.15s ease, box-shadow 0.15s ease;
                        min-height: 200px;
                        display: flex;
                        flex-direction: column;
                        will-change: transform;
                    }
                    .note-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                    }
                    .note-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                    }
                    .note-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #2c3e50;
                        flex: 1;
                    }
                    .note-actions {
                        display: flex;
                        gap: 8px;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    .note-card:hover .note-actions {
                        opacity: 1;
                    }
                    .note-action-btn {
                        background: rgba(255,255,255,0.8);
                        border: none;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.12s ease, transform 0.12s ease;
                    }
                    .note-action-btn:hover {
                        background: white;
                        transform: scale(1.1);
                    }
                    .note-action-btn.delete:hover {
                        color: #e74c3c;
                    }
                    .note-content {
                        flex: 1;
                        color: #34495e;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        font-size: 14px;
                    }
                    .note-footer {
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid rgba(0,0,0,0.1);
                        color: #7f8c8d;
                        font-size: 12px;
                    }
                </style>
            `;
        },

        getNoteColor(priority) {
            const colors = {
                'high': '#ffeb9c',
                'medium': '#d4f4dd',
                'low': '#cfe2ff'
            };
            return colors[priority] || '#ffffff';
        },

        _noteAutosaveTrigger: null,

        renderEditor(container, item) {
            const itemData = item || { title: '', content: '', priority: 'medium' };
            const itemId = item ? item.id : null;

            container.innerHTML = `
                <form id="noteForm" onsubmit="Templates.notes.handleSubmit(event)">
                    <input type="hidden" id="itemId" value="${item ? item.id : ''}">
                    
                    <div class="form-group">
                        <label for="noteTitle">Título da Nota</label>
                        <input type="text" id="noteTitle" class="form-control" value="${escapeHtml(itemData.title)}" required placeholder="Ex: Ideias para projeto...">
                    </div>

                    <div class="form-group">
                        <label for="noteContent">Conteúdo</label>
                        <textarea id="noteContent" class="form-control" rows="12" placeholder="Escreve aqui as tuas notas...">${escapeHtml(itemData.content || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="notePriority">Cor da Nota</label>
                        <select id="notePriority" class="form-control">
                            <option value="low" ${itemData.priority === 'low' ? 'selected' : ''}>Azul (Baixa prioridade)</option>
                            <option value="medium" ${itemData.priority === 'medium' ? 'selected' : ''}>Verde (Média prioridade)</option>
                            <option value="high" ${itemData.priority === 'high' ? 'selected' : ''}>Amarela (Alta prioridade)</option>
                        </select>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Templates.notes._cleanupAutosave(); closeItemEditor()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Nota
                        </button>
                    </div>
                </form>
            `;

            // Setup autosave if editing existing note
            if (itemId && window.Autosave) {
                const textarea = document.getElementById('noteContent');

                // Check for draft recovery
                const recovery = Autosave.checkForRecovery(itemId, itemData.content || '');
                if (recovery && recovery.hasDraft) {
                    Autosave.showRecoveryDialog(
                        itemId,
                        itemData.content || '',
                        (draftContent) => { textarea.value = draftContent; },
                        () => {}
                    );
                }

                this._noteAutosaveTrigger = Autosave.register(
                    itemId,
                    () => textarea.value,
                );
                textarea.addEventListener('input', this._noteAutosaveTrigger);
                textarea.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 's') {
                        e.preventDefault();
                        document.getElementById('noteForm').dispatchEvent(new Event('submit'));
                    }
                });
            }
        },

        _cleanupAutosave() {
            const itemId = document.getElementById('itemId')?.value;
            if (itemId && window.Autosave) Autosave.unregister(itemId);
            this._noteAutosaveTrigger = null;
        },

        handleSubmit(event) {
            event.preventDefault();
            this._cleanupAutosave();
            
            const itemData = {
                id: document.getElementById('itemId').value || null,
                category_id: AppState.currentCategory.id,
                title: document.getElementById('noteTitle').value,
                content: document.getElementById('noteContent').value,
                priority: document.getElementById('notePriority').value,
                status: 'pending',
            };

            saveItem(itemData);
        }
    },

    // ====================================
    // TEMPLATE: TAREFAS
    // ====================================
    tasks: {
        render(container, items) {
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tasks"></i>
                        <h3>Sem tarefas</h3>
                        <p>Clica em "Novo" para criar uma tarefa</p>
                    </div>
                `;
                return;
            }

            const pendingTasks = items.filter(i => i.status === 'pending');
            const inProgressTasks = items.filter(i => i.status === 'in_progress');
            const completedTasks = items.filter(i => i.status === 'completed');

            container.innerHTML = `
                <div class="tasks-kanban">
                    <div class="kanban-column">
                        <h4 class="kanban-title">
                            <i class="fas fa-clock"></i> Pendentes (${pendingTasks.length})
                        </h4>
                        <div class="kanban-items">
                            ${this.renderTaskCards(pendingTasks)}
                        </div>
                    </div>
                    <div class="kanban-column">
                        <h4 class="kanban-title">
                            <i class="fas fa-spinner"></i> Em Progresso (${inProgressTasks.length})
                        </h4>
                        <div class="kanban-items">
                            ${this.renderTaskCards(inProgressTasks)}
                        </div>
                    </div>
                    <div class="kanban-column">
                        <h4 class="kanban-title">
                            <i class="fas fa-check-circle"></i> Concluídas (${completedTasks.length})
                        </h4>
                        <div class="kanban-items">
                            ${this.renderTaskCards(completedTasks)}
                        </div>
                    </div>
                </div>
                <style>
                    .tasks-kanban {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                        overflow-x: auto;
                    }
                    @media (max-width: 968px) {
                        .tasks-kanban {
                            grid-template-columns: 1fr;
                        }
                    }
                    .kanban-column {
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 15px;
                        min-height: 300px;
                    }
                    .kanban-title {
                        font-size: 16px;
                        margin-bottom: 15px;
                        color: #2c3e50;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .kanban-items {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .task-card {
                        background: white;
                        border-radius: 8px;
                        padding: 15px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        transition: transform 0.12s ease, box-shadow 0.12s ease;
                        cursor: pointer;
                        will-change: transform;
                    }
                    .task-card:hover {
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transform: translateY(-2px);
                    }
                    .task-card.priority-high {
                        border-left: 4px solid #e74c3c;
                    }
                    .task-card.priority-medium {
                        border-left: 4px solid #f39c12;
                    }
                    .task-card.priority-low {
                        border-left: 4px solid #3498db;
                    }
                    .task-title {
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: #2c3e50;
                    }
                    .task-progress {
                        font-size: 12px;
                        color: #7f8c8d;
                        margin-top: 8px;
                    }
                    .task-progress-bar {
                        height: 4px;
                        background: #ecf0f1;
                        border-radius: 2px;
                        margin-top: 5px;
                        overflow: hidden;
                    }
                    .task-progress-fill {
                        height: 100%;
                        background: #2ecc71;
                        transition: width 0.3s ease;
                    }
                    .task-actions {
                        margin-top: 10px;
                        display: flex;
                        gap: 8px;
                        justify-content: flex-end;
                    }
                </style>
            `;
        },

        renderTaskCards(tasks) {
            if (tasks.length === 0) {
                return '<p style="color: #95a5a6; text-align: center; padding: 20px;">Sem tarefas</p>';
            }

            return tasks.map(task => {
                const progress = task.subtask_count > 0 
                    ? Math.round((task.completed_subtasks / task.subtask_count) * 100) 
                    : (task.status === 'completed' ? 100 : 0);

                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

                const priorityLabels = { high: 'Alta', medium: 'Média', low: 'Baixa' };

                return `
                    <div class="task-card priority-${task.priority}" onclick="Templates.tasks.openTaskDetail(${task.id})">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        ${task.content ? `<div style="font-size: 13px; color: #7f8c8d; margin-top: 5px; line-height:1.4;">${escapeHtml(task.content).substring(0, 90)}${task.content.length > 90 ? '...' : ''}</div>` : ''}
                        ${task.subtask_count > 0 ? `
                            <div class="task-progress">
                                <span>${task.completed_subtasks}/${task.subtask_count} subtarefas</span>
                                <span style="float:right; font-weight:600; color:${progress === 100 ? '#2ecc71' : '#7f8c8d'}">${progress}%</span>
                                <div class="task-progress-bar">
                                    <div class="task-progress-fill" style="width: ${progress}%; background: ${progress === 100 ? '#2ecc71' : progress > 50 ? '#f39c12' : '#3498db'}"></div>
                                </div>
                            </div>
                        ` : ''}
                        <div style="display:flex; gap:8px; align-items:center; margin-top:10px; flex-wrap:wrap;">
                            ${task.due_date ? `
                                <span style="font-size: 11px; color: ${isOverdue ? '#e74c3c' : '#7f8c8d'}; font-weight:${isOverdue ? '600' : 'normal'};">
                                    <i class="fas fa-calendar${isOverdue ? '-times' : ''}"></i> ${new Date(task.due_date).toLocaleDateString('pt-PT')}
                                    ${isOverdue ? '⚠️ Atrasado' : ''}
                                </span>
                            ` : ''}
                        </div>
                        <div class="task-actions" onclick="event.stopPropagation()">
                            <button class="category-action-btn" onclick="openItemEditor(${task.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="category-action-btn delete" onclick="deleteItem(${task.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        async openTaskDetail(taskId) {
            // Buscar tarefa atualizada
            const items = await fetchItems(AppState.currentCategory.id);
            const task = items.find(i => i.id == taskId);
            if (!task) return;

            // Remover modal existente se houver
            const existing = document.getElementById('taskDetailModal');
            if (existing) existing.remove();

            const priorityConfig = {
                high:   { label: 'Alta',   color: '#e74c3c', bg: '#fdf2f2', icon: 'fa-arrow-up' },
                medium: { label: 'Média',  color: '#f39c12', bg: '#fef9f0', icon: 'fa-minus' },
                low:    { label: 'Baixa',  color: '#3498db', bg: '#f0f7ff', icon: 'fa-arrow-down' },
            };
            const statusConfig = {
                pending:     { label: 'Pendente',    color: '#f39c12', bg: '#fff3cd' },
                in_progress: { label: 'Em Progresso',color: '#3498db', bg: '#cce5ff' },
                completed:   { label: 'Concluída',   color: '#2ecc71', bg: '#d4edda' },
                archived:    { label: 'Arquivada',   color: '#95a5a6', bg: '#f8f9fa' },
            };

            const p = priorityConfig[task.priority] || priorityConfig.medium;
            const s = statusConfig[task.status] || statusConfig.pending;

            const subtasks = task.subtasks || [];
            const completedCount = subtasks.filter(st => st.completed).length;
            const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : (task.status === 'completed' ? 100 : 0);

            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

            const modalHTML = `
                <div class="modal active" id="taskDetailModal" style="z-index: 3000;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #2c3e50, #3d5166); color: white; border-radius: 12px 12px 0 0; padding: 25px;">
                            <div style="flex:1;">
                                <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
                                    <span style="background:${p.bg}; color:${p.color}; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600;">
                                        <i class="fas ${p.icon}"></i> Prioridade ${p.label}
                                    </span>
                                    <span style="background:${s.bg}; color:${s.color}; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600;">
                                        ${s.label}
                                    </span>
                                    ${isOverdue ? `<span style="background:#fdf2f2; color:#e74c3c; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600;"><i class="fas fa-exclamation-triangle"></i> Atrasada</span>` : ''}
                                </div>
                                <h2 style="color:white; font-size:22px; margin:0; line-height:1.3;">${escapeHtml(task.title)}</h2>
                            </div>
                            <button class="modal-close" onclick="document.getElementById('taskDetailModal').remove()" style="color:white; font-size:22px;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="modal-body" style="padding: 30px;">

                            ${task.content ? `
                                <div style="background:#f8f9fa; border-left:4px solid #3498db; padding:15px 20px; border-radius:0 8px 8px 0; margin-bottom:25px; color:#34495e; line-height:1.6; white-space:pre-wrap;">${escapeHtml(task.content)}</div>
                            ` : ''}

                            <!-- Info Grid -->
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:25px;">
                                <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
                                    <div style="font-size:12px; color:#7f8c8d; text-transform:uppercase; margin-bottom:5px; font-weight:600;">Data Limite</div>
                                    <div style="font-size:16px; color:${isOverdue ? '#e74c3c' : '#2c3e50'}; font-weight:600;">
                                        ${task.due_date ? `<i class="fas fa-calendar"></i> ${new Date(task.due_date).toLocaleDateString('pt-PT', {day:'2-digit',month:'long',year:'numeric'})}` : '<span style="color:#95a5a6;">Sem data definida</span>'}
                                    </div>
                                </div>
                                <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
                                    <div style="font-size:12px; color:#7f8c8d; text-transform:uppercase; margin-bottom:5px; font-weight:600;">Criada em</div>
                                    <div style="font-size:16px; color:#2c3e50; font-weight:600;">
                                        <i class="fas fa-clock"></i> ${new Date(task.created_at).toLocaleDateString('pt-PT', {day:'2-digit',month:'long',year:'numeric'})}
                                    </div>
                                </div>
                            </div>

                            <!-- Progresso -->
                            <div style="margin-bottom:25px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                    <span style="font-weight:700; color:#2c3e50; font-size:16px;">
                                        <i class="fas fa-tasks"></i> Progresso Geral
                                    </span>
                                    <span style="font-size:22px; font-weight:700; color:${progress===100?'#2ecc71':'#3498db'};">${progress}%</span>
                                </div>
                                <div style="height:12px; background:#ecf0f1; border-radius:6px; overflow:hidden;">
                                    <div style="height:100%; width:${progress}%; background:${progress===100?'#2ecc71':progress>50?'#f39c12':'#3498db'}; border-radius:6px; transition:width 0.5s ease;"></div>
                                </div>
                                ${subtasks.length > 0 ? `<div style="text-align:center; margin-top:8px; font-size:13px; color:#7f8c8d;">${completedCount} de ${subtasks.length} subtarefas concluídas</div>` : ''}
                            </div>

                            <!-- Subtarefas -->
                            ${subtasks.length > 0 ? `
                                <div>
                                    <h4 style="color:#2c3e50; margin-bottom:15px; font-size:16px;">
                                        <i class="fas fa-list-check"></i> Subtarefas
                                    </h4>
                                    <div id="subtasksList" style="display:flex; flex-direction:column; gap:8px;">
                                        ${subtasks.map(st => `
                                            <div class="subtask-row" data-id="${st.id}" style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:${st.completed ? '#f0fff4' : 'white'}; border:2px solid ${st.completed ? '#2ecc71' : '#ecf0f1'}; border-radius:8px; transition:background 0.12s ease, border-color 0.12s ease; cursor:pointer;" onclick="Templates.tasks.toggleSubtask(${task.id}, ${st.id}, this)">
                                                <div style="width:26px; height:26px; border-radius:50%; border:2px solid ${st.completed ? '#2ecc71' : '#bdc3c7'}; background:${st.completed ? '#2ecc71' : 'white'}; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.12s ease, border-color 0.12s ease;">
                                                    ${st.completed ? '<i class="fas fa-check" style="color:white; font-size:12px;"></i>' : ''}
                                                </div>
                                                <span style="flex:1; font-size:15px; color:${st.completed ? '#7f8c8d' : '#2c3e50'}; text-decoration:${st.completed ? 'line-through' : 'none'};">${escapeHtml(st.description)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : `
                                <div style="text-align:center; padding:20px; color:#95a5a6;">
                                    <i class="fas fa-list" style="font-size:32px; margin-bottom:10px; display:block; opacity:0.3;"></i>
                                    <p>Sem subtarefas. Edita a tarefa para adicionar.</p>
                                </div>
                            `}

                            <!-- Mudar Estado Rápido -->
                            <div style="margin-top:25px; padding-top:25px; border-top:2px solid #ecf0f1;">
                                <p style="font-size:13px; color:#7f8c8d; margin-bottom:12px; font-weight:600; text-transform:uppercase;">Mudar Estado</p>
                                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                    ${Object.entries(statusConfig).filter(([k]) => k !== 'archived').map(([key, val]) => `
                                        <button onclick="Templates.tasks.changeStatus(${task.id}, '${key}')" 
                                            style="padding:8px 18px; border-radius:20px; border:2px solid ${val.color}; background:${task.status===key ? val.color : 'white'}; color:${task.status===key ? 'white' : val.color}; font-weight:600; font-size:13px; cursor:pointer; transition:background 0.12s ease, color 0.12s ease;">
                                            ${val.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Ações -->
                            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:25px;">
                                <button class="btn btn-secondary" onclick="document.getElementById('taskDetailModal').remove()">
                                    <i class="fas fa-times"></i> Fechar
                                </button>
                                <button class="btn btn-primary" onclick="document.getElementById('taskDetailModal').remove(); openItemEditor(${task.id})">
                                    <i class="fas fa-edit"></i> Editar Tarefa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Fechar ao clicar fora
            document.getElementById('taskDetailModal').addEventListener('click', function(e) {
                if (e.target === this) this.remove();
            });
        },

        async toggleSubtask(taskId, subtaskId, rowEl) {
            // Descobrir estado atual pelo visual
            const isCurrentlyCompleted = rowEl.style.background === 'rgb(240, 255, 244)' || rowEl.style.background === '#f0fff4';
            const newCompleted = !isCurrentlyCompleted;

            // Feedback visual imediato
            rowEl.style.background = newCompleted ? '#f0fff4' : 'white';
            rowEl.style.borderColor = newCompleted ? '#2ecc71' : '#ecf0f1';
            const circle = rowEl.querySelector('div');
            circle.style.background = newCompleted ? '#2ecc71' : 'white';
            circle.style.borderColor = newCompleted ? '#2ecc71' : '#bdc3c7';
            circle.innerHTML = newCompleted ? '<i class="fas fa-check" style="color:white; font-size:12px;"></i>' : '';
            const label = rowEl.querySelector('span');
            label.style.textDecoration = newCompleted ? 'line-through' : 'none';
            label.style.color = newCompleted ? '#7f8c8d' : '#2c3e50';

            // Buscar tarefa atual e atualizar subtarefa
            try {
                const items = await fetchItems(AppState.currentCategory.id);
                const task = items.find(i => i.id == taskId);
                if (!task) return;

                const updatedSubtasks = (task.subtasks || []).map(st => ({
                    ...st,
                    completed: st.id == subtaskId ? newCompleted : st.completed
                }));

                const completedCount = updatedSubtasks.filter(s => s.completed).length;
                const total = updatedSubtasks.length;
                const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

                // Atualizar barra de progresso no modal
                const progressBar = document.querySelector('#taskDetailModal [style*="transition:width"]');
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                    progressBar.style.background = progress === 100 ? '#2ecc71' : progress > 50 ? '#f39c12' : '#3498db';
                }
                const progressLabel = document.querySelector('#taskDetailModal [style*="font-size:22px"]');
                if (progressLabel) {
                    progressLabel.textContent = progress + '%';
                    progressLabel.style.color = progress === 100 ? '#2ecc71' : '#3498db';
                }
                const countLabel = document.querySelector('#taskDetailModal [style*="text-align:center; margin-top:8px"]');
                if (countLabel) countLabel.textContent = `${completedCount} de ${total} subtarefas concluídas`;

                // Guardar na API
                await fetch(`${API_URL}/items.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: taskId,
                        category_id: AppState.currentCategory.id,
                        title: task.title,
                        content: task.content,
                        status: progress === 100 ? 'completed' : task.status === 'completed' ? 'in_progress' : task.status,
                        priority: task.priority,
                        due_date: task.due_date,
                        subtasks: updatedSubtasks
                    }),
                });

                // Atualizar o kanban em background silenciosamente
                fetchItems(AppState.currentCategory.id).then(newItems => {
                    AppState._lastItems = newItems;
                });

            } catch (error) {
                console.error('Erro ao atualizar subtarefa:', error);
                showNotification('Erro ao guardar', 'error');
            }
        },

        async changeStatus(taskId, newStatus) {
            try {
                const items = await fetchItems(AppState.currentCategory.id);
                const task = items.find(i => i.id == taskId);
                if (!task) return;

                await fetch(`${API_URL}/items.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: taskId,
                        category_id: AppState.currentCategory.id,
                        title: task.title,
                        content: task.content,
                        status: newStatus,
                        priority: task.priority,
                        due_date: task.due_date,
                        subtasks: task.subtasks || []
                    }),
                });

                showNotification('Estado atualizado!', 'success');

                // Fechar modal e recarregar o kanban em tempo real
                document.getElementById('taskDetailModal')?.remove();
                await refreshCurrentCategory();

            } catch (error) {
                console.error('Erro:', error);
                showNotification('Erro ao mudar estado', 'error');
            }
        },

        renderEditor(container, item) {
            const itemData = item || { 
                title: '', 
                content: '', 
                status: 'pending', 
                priority: 'medium',
                subtasks: []
            };

            container.innerHTML = `
                <form id="taskForm" onsubmit="Templates.tasks.handleSubmit(event)">
                    <input type="hidden" id="itemId" value="${item ? item.id : ''}">
                    
                    <div class="form-group">
                        <label for="taskTitle">Título da Tarefa</label>
                        <input type="text" id="taskTitle" class="form-control" value="${escapeHtml(itemData.title)}" required placeholder="Ex: Implementar funcionalidade X">
                    </div>

                    <div class="form-group">
                        <label for="taskContent">Descrição</label>
                        <textarea id="taskContent" class="form-control" rows="4" placeholder="Detalhes da tarefa...">${escapeHtml(itemData.content || '')}</textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="taskStatus">Estado</label>
                            <select id="taskStatus" class="form-control">
                                <option value="pending" ${itemData.status === 'pending' ? 'selected' : ''}>Pendente</option>
                                <option value="in_progress" ${itemData.status === 'in_progress' ? 'selected' : ''}>Em Progresso</option>
                                <option value="completed" ${itemData.status === 'completed' ? 'selected' : ''}>Concluída</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="taskPriority">Prioridade</label>
                            <select id="taskPriority" class="form-control">
                                <option value="low" ${itemData.priority === 'low' ? 'selected' : ''}>Baixa</option>
                                <option value="medium" ${itemData.priority === 'medium' ? 'selected' : ''}>Média</option>
                                <option value="high" ${itemData.priority === 'high' ? 'selected' : ''}>Alta</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="taskDueDate">Data Limite</label>
                        <input type="date" id="taskDueDate" class="form-control" value="${itemData.due_date || ''}">
                    </div>

                    <div class="form-group">
                        <label>Subtarefas</label>
                        <div id="subtasksList"></div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="Templates.tasks.addSubtask()" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Adicionar Subtarefa
                        </button>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeItemEditor()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Tarefa
                        </button>
                    </div>
                </form>
            `;

            // Carregar subtarefas existentes
            if (itemData.subtasks && itemData.subtasks.length > 0) {
                itemData.subtasks.forEach(subtask => {
                    this.addSubtask(subtask.description, subtask.completed);
                });
            }
        },

        addSubtask(description = '', completed = false) {
            const container = document.getElementById('subtasksList');
            const index = container.children.length;
            
            const subtaskDiv = document.createElement('div');
            subtaskDiv.className = 'subtask-item';
            subtaskDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
            subtaskDiv.innerHTML = `
                <input type="checkbox" ${completed ? 'checked' : ''} style="width: 20px; height: 20px;">
                <input type="text" class="form-control" placeholder="Descrição da subtarefa" value="${escapeHtml(description)}" style="flex: 1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(subtaskDiv);
        },

        handleSubmit(event) {
            event.preventDefault();
            
            // Recolher subtarefas
            const subtaskElements = document.querySelectorAll('#subtasksList .subtask-item');
            const subtasks = Array.from(subtaskElements).map(el => {
                const checkbox = el.querySelector('input[type="checkbox"]');
                const input = el.querySelector('input[type="text"]');
                return {
                    description: input.value,
                    completed: checkbox.checked
                };
            }).filter(st => st.description.trim() !== '');

            const itemData = {
                id: document.getElementById('itemId').value || null,
                category_id: AppState.currentCategory.id,
                title: document.getElementById('taskTitle').value,
                content: document.getElementById('taskContent').value,
                status: document.getElementById('taskStatus').value,
                priority: document.getElementById('taskPriority').value,
                due_date: document.getElementById('taskDueDate').value || null,
                subtasks: subtasks
            };

            saveItem(itemData);
        }
    },

    // ====================================
    // TEMPLATE: CURSOS
    // ====================================
    course: {
        render(container, items) {
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-graduation-cap"></i>
                        <h3>Sem cursos</h3>
                        <p>Clica em "Novo" para adicionar um curso</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="courses-list">
                    ${items.map(item => {
                        const metadata = item.metadata || {};
                        const modules = metadata.modules || [];
                        const completedModules = modules.filter(m => m.completed).length;
                        
                        // Calcular progresso: usar o manual se > 0, senão calcular pelos módulos
                        let progress = metadata.progress || 0;
                        if (progress === 0 && modules.length > 0) {
                            progress = Math.round((completedModules / modules.length) * 100);
                        }

                        const progressColor = progress === 100 ? '#2ecc71' : progress >= 50 ? '#f39c12' : '#3498db';

                        return `
                            <div class="course-card" id="course-card-${item.id}">
                                <div class="course-header">
                                    <div>
                                        <h4 class="course-title">${escapeHtml(item.title)}</h4>
                                        ${metadata.platform ? `<span class="course-platform">${escapeHtml(metadata.platform)}</span>` : ''}
                                    </div>
                                    <div class="course-actions">
                                        <button class="category-action-btn" onclick="openItemEditor(${item.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="category-action-btn delete" onclick="deleteItem(${item.id})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="course-progress-section">
                                    <div class="course-progress-info">
                                        <span id="course-progress-label-${item.id}">Progresso: <strong>${progress}%</strong></span>
                                        ${modules.length > 0 ? `<span id="course-module-count-${item.id}">${completedModules}/${modules.length} módulos</span>` : ''}
                                    </div>
                                    <div class="course-progress-bar">
                                        <div id="course-progress-fill-${item.id}" class="course-progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
                                    </div>
                                </div>

                                ${modules.length > 0 ? `
                                    <div class="course-modules" id="course-modules-${item.id}">
                                        ${modules.map((module, idx) => `
                                            <div class="module-item ${module.completed ? 'completed' : ''} module-clickable"
                                                 id="module-${item.id}-${idx}"
                                                 onclick="Templates.course.toggleModule(${item.id}, ${idx}, this)">
                                                <div class="module-check-circle ${module.completed ? 'checked' : ''}">
                                                    ${module.completed ? '<i class="fas fa-check"></i>' : ''}
                                                </div>
                                                <span>${escapeHtml(module.name)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}

                                ${item.content ? `<div class="course-description">${escapeHtml(item.content)}</div>` : ''}
                                
                                <div class="course-notebooks-section">
                                    <button class="btn btn-sm" id="course-nb-count-btn-${item.id}" style="background: #9b59b6; color: white;" onclick="event.stopPropagation(); Templates.course.showNotebooks(${item.id})">
                                        <i class="fas fa-book"></i> Ver Cadernos (<span class="course-nb-count">…</span>)
                                    </button>
                                    <button class="btn btn-sm" style="background: #3498db; color: white;"
                                            data-course-id="${item.id}" data-course-title="${escapeHtml(item.title)}"
                                            onclick="event.stopPropagation(); Templates.course.createNotebook(Number(this.dataset.courseId), this.dataset.courseTitle)">
                                        <i class="fas fa-plus"></i> Novo Caderno
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <style>
                    .courses-list {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .course-card {
                        background: white;
                        border: 2px solid #ecf0f1;
                        border-radius: 12px;
                        padding: 25px;
                        transition: border-color 0.12s ease, box-shadow 0.12s ease;
                    }
                    .course-card:hover {
                        border-color: #3498db;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    }
                    .course-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 20px;
                    }
                    .course-title {
                        font-size: 20px;
                        font-weight: 600;
                        color: #2c3e50;
                        margin-bottom: 8px;
                    }
                    .course-platform {
                        background: #3498db;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                    }
                    .course-actions {
                        display: flex;
                        gap: 8px;
                    }
                    .course-progress-section {
                        margin-bottom: 20px;
                    }
                    .course-progress-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 14px;
                        color: #7f8c8d;
                        font-weight: 600;
                    }
                    .course-progress-bar {
                        height: 10px;
                        background: #ecf0f1;
                        border-radius: 5px;
                        overflow: hidden;
                    }
                    .course-progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #3498db, #2ecc71);
                        transition: width 0.3s ease;
                    }
                    .course-modules {
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid #ecf0f1;
                    }
                    .module-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 12px;
                        color: #7f8c8d;
                        border-radius: 8px;
                        transition: background 0.12s ease, transform 0.12s ease;
                    }
                    .module-clickable {
                        cursor: pointer;
                        user-select: none;
                    }
                    .module-clickable:hover {
                        background: #f0f7ff;
                        transform: translateX(4px);
                    }
                    .module-item.completed {
                        color: #27ae60;
                    }
                    .module-item.completed span {
                        text-decoration: line-through;
                        color: #95a5a6;
                    }
                    .module-check-circle {
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        border: 2px solid #bdc3c7;
                        background: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        font-size: 11px;
                        color: white;
                        transition: background 0.12s ease, border-color 0.12s ease;
                    }
                    .module-check-circle.checked {
                        background: #2ecc71;
                        border-color: #2ecc71;
                    }
                    .course-description {
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid #ecf0f1;
                        color: #7f8c8d;
                        font-size: 14px;
                    }
                    .course-notebooks-section {
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 2px solid #ecf0f1;
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }
                </style>
            `;
            Templates.course._updateNotebookCounts(container);
        },

        async _updateNotebookCounts(container) {
            const notebookCats = AppState.categories.filter(c => c.template_type === 'notebooks');
            let allNotebooks = [];
            for (const cat of notebookCats) {
                try {
                    const items = await fetchItems(cat.id);
                    allNotebooks = allNotebooks.concat(items);
                } catch (_) {}
            }
            const countByCourse = {};
            allNotebooks.forEach(nb => {
                const cid = (nb.metadata || {}).linkedToCourse;
                if (cid) countByCourse[cid] = (countByCourse[cid] || 0) + 1;
            });
            container.querySelectorAll('.course-nb-count').forEach(el => {
                const card = el.closest('.course-card');
                const id = card && card.id ? card.id.replace('course-card-', '') : null;
                el.textContent = id ? (countByCourse[id] || 0) : '0';
            });
        },

        async showNotebooks(courseId) {
            // Buscar o curso
            const items = await fetchItems(AppState.currentCategory.id);
            const course = items.find(i => i.id == courseId);
            
            if (!course) {
                showNotification('Curso não encontrado', 'error');
                return;
            }

            // Criar modal para mostrar cadernos do curso
            const modalHTML = `
                <div class="modal active" id="courseNotebooksModal" style="z-index: 3000;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-book"></i> Cadernos de: ${escapeHtml(course.title)}</h3>
                            <button class="modal-close" onclick="document.getElementById('courseNotebooksModal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div id="courseNotebooksContent">
                                <p style="text-align: center; color: #7f8c8d;">A carregar cadernos...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Buscar TODAS as categorias de cadernos
            const notebookCategories = AppState.categories.filter(cat => cat.template_type === 'notebooks');
            
            // Buscar cadernos de TODAS as categorias de cadernos
            let allNotebooks = [];
            for (const cat of notebookCategories) {
                const categoryItems = await fetchItems(cat.id);
                allNotebooks = allNotebooks.concat(categoryItems);
            }
            
            // Filtrar apenas os cadernos ligados a este curso
            const notebooks = allNotebooks.filter(item => {
                const meta = item.metadata || {};
                return meta.linkedToCourse == courseId;
            });

            const content = document.getElementById('courseNotebooksContent');
            
            if (notebooks.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book-open"></i>
                        <h3>Sem cadernos</h3>
                        <p>Este curso ainda não tem cadernos associados.</p>
                        <button class="btn btn-primary"
                                data-course-id="${courseId}" data-course-title="${escapeHtml(course.title)}"
                                onclick="Templates.course.createNotebook(Number(this.dataset.courseId), this.dataset.courseTitle); document.getElementById('courseNotebooksModal').remove();">
                            <i class="fas fa-plus"></i> Criar Primeiro Caderno
                        </button>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="items-list">
                        ${notebooks.map(nb => `
                            <div class="item-card" onclick="event.stopPropagation(); event.preventDefault(); Templates.course.openNotebook(${nb.id})">
                                <div class="item-header">
                                    <h4 class="item-title">
                                        <i class="fas fa-book-open"></i> ${escapeHtml(nb.title)}
                                    </h4>
                                    <div class="item-actions">
                                        <button class="category-action-btn" onclick="event.stopPropagation(); openItemEditor(${nb.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="category-action-btn delete" onclick="event.stopPropagation(); Templates.course.unlinkNotebook(${courseId}, ${nb.id})" title="Desassociar">
                                            <i class="fas fa-unlink"></i>
                                        </button>
                                    </div>
                                </div>
                                ${nb.content ? `<div class="item-content">${escapeHtml(nb.content).substring(0, 150)}...</div>` : '<em style="color: #95a5a6;">Caderno vazio</em>'}
                                <div style="margin-top: 10px;">
                                    <small style="color: #7f8c8d;">
                                        <i class="fas fa-clock"></i> ${new Date(nb.updated_at).toLocaleDateString('pt-PT')}
                                    </small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        },

        async createNotebook(courseId, courseTitle) {
            // Buscar o curso
            const items = await fetchItems(AppState.currentCategory.id);
            const course = items.find(i => i.id == courseId);
            
            if (!course) {
                showNotification('Curso não encontrado', 'error');
                return;
            }

            // Buscar categorias de cadernos
            const notebookCategories = AppState.categories.filter(cat => cat.template_type === 'notebooks');
            
            if (notebookCategories.length === 0) {
                if (confirm('Ainda não tens categorias de Cadernos!\n\nQueres criar uma agora?')) {
                    openCategoryModal();
                    showNotification('Cria uma categoria com o template "Cadernos"', 'info');
                }
                return;
            }

            // Abrir editor de caderno com informação do curso
            const modal = document.getElementById('itemEditorModal');
            const title = document.getElementById('itemEditorTitle');
            const content = document.getElementById('itemEditorContent');

            title.textContent = 'Novo Caderno para: ' + courseTitle;

            content.innerHTML = `
                <form id="courseNotebookForm" data-course-title="${escapeHtml(courseTitle)}" onsubmit="Templates.course.handleNotebookSubmit(event, ${courseId})">
                    <div class="form-group">
                        <label for="notebookCategory">
                            <i class="fas fa-folder"></i> Guardar em que categoria de Cadernos?
                        </label>
                        <select id="notebookCategory" class="form-control" required>
                            <option value="">-- Escolhe uma categoria --</option>
                            ${notebookCategories.map(cat => `
                                <option value="${cat.id}">${escapeHtml(cat.name)} (${cat.item_count} cadernos)</option>
                            `).join('')}
                        </select>
                        <small class="form-help">
                            <i class="fas fa-info-circle"></i> 
                            Escolhe onde queres guardar este caderno
                        </small>
                    </div>

                    <div class="form-group">
                        <label for="notebookTitle">
                            <i class="fas fa-book"></i> Título do Caderno
                        </label>
                        <input type="text" id="notebookTitle" class="form-control" required placeholder="Ex: Notas do Módulo 1, Exercícios, Resumo...">
                        <small class="form-help">
                            <i class="fas fa-link"></i> 
                            Este caderno será associado ao curso "${escapeHtml(courseTitle)}"
                        </small>
                    </div>

                    <div class="form-group">
                        <label for="notebookContent">
                            <i class="fas fa-pencil-alt"></i> Conteúdo Inicial (opcional)
                        </label>
                        <textarea id="notebookContent" class="form-control" rows="12" placeholder="Podes deixar vazio e escrever depois...">${escapeHtml(courseTitle)}\n${'='.repeat(courseTitle.length)}\n\n</textarea>
                    </div>

                    <div class="form-group">
                        <label for="notebookPriority">
                            <i class="fas fa-palette"></i> Importância
                        </label>
                        <select id="notebookPriority" class="form-control">
                            <option value="low">🟦 Azul (Normal)</option>
                            <option value="medium" selected>🟩 Verde (Importante)</option>
                            <option value="high">🟨 Amarelo (Muito Importante)</option>
                        </select>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeItemEditor()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Criar Caderno
                        </button>
                    </div>
                </form>
            `;

            modal.classList.add('active');
        },

        async handleNotebookSubmit(event, courseId) {
            event.preventDefault();

            const categoryId = document.getElementById('notebookCategory').value;
            const title = document.getElementById('notebookTitle').value;
            const content = document.getElementById('notebookContent').value;
            const priority = document.getElementById('notebookPriority').value;

            if (!categoryId) {
                showNotification('Escolhe uma categoria de Cadernos!', 'error');
                return;
            }

            const notebookData = {
                category_id: parseInt(categoryId), // Categoria de CADERNOS escolhida
                title: title,
                content: content,
                status: 'pending',
                priority: priority,
                metadata: {
                    linkedToCourse: courseId,
                    linkedToCourseCategory: AppState.currentCategory.id,
                    linkedToCourseTitle: (document.getElementById('courseNotebookForm') && document.getElementById('courseNotebookForm').dataset.courseTitle) || '',
                    type: 'notebook'
                }
            };

            try {
                // Criar o caderno
                const response = await fetch(`${API_URL}/items.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(notebookData),
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Caderno criado e associado ao curso! 📓', 'success');
                    closeItemEditor();
                    await refreshCurrentCategory();
                } else {
                    throw new Error(data.error || 'Erro ao criar caderno');
                }
            } catch (error) {
                console.error('Erro:', error);
                showNotification('Erro ao criar caderno: ' + error.message, 'error');
            }
        },

        async openNotebook(notebookId) {
            const modal = document.getElementById('courseNotebooksModal');
            if (modal) modal.remove();
            // Pequeno atraso para o clique não ser interpretado no modal por baixo (ex.: Editar Categoria)
            setTimeout(() => openItemEditor(notebookId), 50);
        },

        async unlinkNotebook(courseId, notebookId) {
            if (!confirm('Desassociar este caderno do curso?\n\nO caderno não será eliminado, apenas desassociado.')) {
                return;
            }

            try {
                // Buscar TODAS as categorias de cadernos
                const notebookCategories = AppState.categories.filter(cat => cat.template_type === 'notebooks');
                
                // Buscar o caderno em todas as categorias de cadernos
                let notebook = null;
                for (const cat of notebookCategories) {
                    const categoryItems = await fetchItems(cat.id);
                    notebook = categoryItems.find(i => i.id == notebookId);
                    if (notebook) break;
                }

                if (!notebook) {
                    showNotification('Caderno não encontrado', 'error');
                    return;
                }

                // Remover a ligação ao curso
                const metadata = notebook.metadata || {};
                delete metadata.linkedToCourse;
                delete metadata.linkedToCourseCategory;

                const itemData = {
                    id: notebookId,
                    category_id: notebook.category_id, // Manter na mesma categoria de cadernos
                    title: notebook.title,
                    content: notebook.content,
                    status: notebook.status,
                    priority: notebook.priority,
                    metadata: metadata
                };

                const response = await fetch(`${API_URL}/items.php`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(itemData),
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Caderno desassociado do curso', 'success');
                    
                    // Recarregar modal
                    document.getElementById('courseNotebooksModal').remove();
                    setTimeout(() => this.showNotebooks(courseId), 300);
                } else {
                    throw new Error(data.error || 'Erro ao desassociar');
                }
            } catch (error) {
                console.error('Erro:', error);
                showNotification('Erro ao desassociar caderno', 'error');
            }
        },

        renderEditor(container, item) {
            const itemData = item || { 
                title: '', 
                content: '', 
                metadata: { platform: '', progress: 0, modules: [] }
            };
            const metadata = itemData.metadata || { platform: '', progress: 0, modules: [] };

            container.innerHTML = `
                <form id="courseForm" onsubmit="Templates.course.handleSubmit(event)">
                    <input type="hidden" id="itemId" value="${item ? item.id : ''}">
                    
                    <div class="form-group">
                        <label for="courseTitle">Nome do Curso</label>
                        <input type="text" id="courseTitle" class="form-control" value="${escapeHtml(itemData.title)}" required placeholder="Ex: Fundamentos de Cibersegurança">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="coursePlatform">Plataforma</label>
                            <input type="text" id="coursePlatform" class="form-control" value="${escapeHtml(metadata.platform || '')}" placeholder="Ex: Udemy, Coursera...">
                        </div>

                        <div class="form-group">
                            <label for="courseProgress">Progresso Manual (%)</label>
                            <input type="number" id="courseProgress" class="form-control" min="0" max="100" value="${metadata.progress || 0}" placeholder="0 = automático">
                            <small class="form-help">Deixa em 0 para calcular automaticamente pelos módulos</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="courseDescription">Descrição</label>
                        <textarea id="courseDescription" class="form-control" rows="3" placeholder="Notas sobre o curso...">${escapeHtml(itemData.content || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Módulos do Curso</label>
                        <div id="modulesList"></div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="Templates.course.addModule()" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Adicionar Módulo
                        </button>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeItemEditor()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Curso
                        </button>
                    </div>
                </form>
            `;

            // Carregar módulos existentes
            if (metadata.modules && metadata.modules.length > 0) {
                metadata.modules.forEach(module => {
                    this.addModule(module.name, module.completed);
                });
            }
        },

        addModule(name = '', completed = false) {
            const container = document.getElementById('modulesList');
            
            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'module-item-editor';
            moduleDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
            moduleDiv.innerHTML = `
                <input type="checkbox" ${completed ? 'checked' : ''} style="width: 20px; height: 20px;" onchange="Templates.course.updateProgress()">
                <input type="text" class="form-control" placeholder="Nome do módulo" value="${escapeHtml(name)}" style="flex: 1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); Templates.course.updateProgress();">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(moduleDiv);
        },

        updateProgress() {
            // Calcular progresso automaticamente em tempo real
            const moduleElements = document.querySelectorAll('#modulesList .module-item-editor');
            const modules = Array.from(moduleElements);
            
            if (modules.length > 0) {
                const completed = modules.filter(el => {
                    const checkbox = el.querySelector('input[type="checkbox"]');
                    return checkbox && checkbox.checked;
                }).length;
                
                const progress = Math.round((completed / modules.length) * 100);
                const progressInput = document.getElementById('courseProgress');
                
                if (progressInput) {
                    // Só atualiza se estiver em 0 (modo automático)
                    if (parseInt(progressInput.value) === 0 || progressInput.value === '') {
                        progressInput.value = progress;
                    }
                }
            }
        },

        async toggleModule(courseId, moduleIndex, rowEl) {
            try {
                // Ler estado atual
                const circle = rowEl.querySelector('.module-check-circle');
                const isCompleted = circle.classList.contains('checked');
                const newCompleted = !isCompleted;

                // Feedback visual imediato
                if (newCompleted) {
                    circle.classList.add('checked');
                    circle.innerHTML = '<i class="fas fa-check"></i>';
                    rowEl.classList.add('completed');
                } else {
                    circle.classList.remove('checked');
                    circle.innerHTML = '';
                    rowEl.classList.remove('completed');
                }

                // Buscar o item do curso da API
                const response = await fetch(`${API_URL}/items.php?category_id=${AppState.currentCategory.id}`);
                const data = await response.json();
                const courseItem = (data.data || data).find(i => i.id == courseId);
                if (!courseItem) return;

                const metadata = courseItem.metadata || {};
                const modules = metadata.modules || [];
                if (modules[moduleIndex] !== undefined) {
                    modules[moduleIndex].completed = newCompleted;
                }

                // Calcular novo progresso
                const completedCount = modules.filter(m => m.completed).length;
                const total = modules.length;
                const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

                // Atualizar barra e labels imediatamente no DOM
                const fillEl = document.getElementById(`course-progress-fill-${courseId}`);
                const labelEl = document.getElementById(`course-progress-label-${courseId}`);
                const countEl = document.getElementById(`course-module-count-${courseId}`);
                const progressColor = progress === 100 ? '#2ecc71' : progress >= 50 ? '#f39c12' : '#3498db';

                if (fillEl) {
                    fillEl.style.width = progress + '%';
                    fillEl.style.background = progressColor;
                    fillEl.style.transition = 'width 0.4s ease, background 0.4s ease';
                }
                if (labelEl) labelEl.innerHTML = `Progresso: <strong>${progress}%</strong>`;
                if (countEl) countEl.textContent = `${completedCount}/${total} módulos`;

                // Guardar na API
                metadata.modules = modules;
                metadata.progress = progress;

                await fetch(`${API_URL}/items.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: courseId,
                        category_id: AppState.currentCategory.id,
                        title: courseItem.title,
                        content: courseItem.content,
                        status: progress === 100 ? 'completed' : courseItem.status,
                        priority: courseItem.priority,
                        due_date: courseItem.due_date,
                        metadata: metadata
                    })
                });

                // Actualizar contador da categoria em background
                fetchCategories();

            } catch (error) {
                console.error('Erro ao toggling módulo:', error);
                showNotification('Erro ao guardar módulo', 'error');
            }
        },

        handleSubmit(event) {
            event.preventDefault();
            
            try {
                // Recolher módulos
                const moduleElements = document.querySelectorAll('#modulesList .module-item-editor');
                const modules = Array.from(moduleElements).map(el => {
                    const checkbox = el.querySelector('input[type="checkbox"]');
                    const input = el.querySelector('input[type="text"]');
                    return {
                        name: input.value,
                        completed: checkbox.checked ? true : false
                    };
                }).filter(m => m.name.trim() !== '');

                // Calcular progresso automaticamente baseado nos módulos
                let calculatedProgress = 0;
                if (modules.length > 0) {
                    const completedCount = modules.filter(m => m.completed).length;
                    calculatedProgress = Math.round((completedCount / modules.length) * 100);
                }

                // Usar o progresso manual se fornecido, caso contrário usar o calculado
                const manualProgress = parseInt(document.getElementById('courseProgress').value);
                const finalProgress = manualProgress > 0 ? manualProgress : calculatedProgress;

                const itemData = {
                    id: document.getElementById('itemId').value || null,
                    category_id: AppState.currentCategory.id,
                    title: document.getElementById('courseTitle').value,
                    content: document.getElementById('courseDescription').value || '',
                    status: 'in_progress',
                    priority: 'medium',
                    metadata: {
                        platform: document.getElementById('coursePlatform').value || '',
                        progress: finalProgress,
                        modules: modules
                    }
                };

                saveItem(itemData);
            } catch (error) {
                console.error('Erro ao guardar curso:', error);
                showNotification('Erro ao guardar curso: ' + error.message, 'error');
            }
        }
    },

    // ====================================
    // TEMPLATE: EXCEL (Spreadsheet Simples)
    // ====================================
    excel: {
        render(container, items) {
            window.__lastExcelItems = items;
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-table"></i>
                        <h3>Sem tabelas</h3>
                        <p>Clica em "Novo" para criar uma tabela</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="excel-list">
                    ${items.map(item => {
                        const metadata = item.metadata || {};
                        const data = metadata.data || [];
                        const headers = metadata.headers || [];

                        return `
                            <div class="excel-card">
                                <div class="excel-header">
                                    <h4 class="excel-title">
                                        <i class="fas fa-table"></i> ${escapeHtml(item.title)}
                                    </h4>
                                    <div class="excel-actions">
                                        <button class="category-action-btn" onclick="Templates.excel.exportToCsv(${item.id})" title="Exportar para CSV">
                                            <i class="fas fa-file-csv"></i> Exportar CSV
                                        </button>
                                        <button class="category-action-btn" onclick="openItemEditor(${item.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="category-action-btn delete" onclick="deleteItem(${item.id})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                ${headers.length > 0 ? `
                                    <div class="excel-table-container">
                                        <table class="excel-table">
                                            <thead>
                                                <tr>
                                                    ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${data.slice(0, 5).map(row => `
                                                    <tr>
                                                        ${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                        ${data.length > 5 ? `<p class="excel-more-rows">+${data.length - 5} linhas...</p>` : ''}
                                    </div>
                                ` : '<p class="excel-empty-hint">Tabela vazia</p>'}
                            </div>
                        `;
                    }).join('')}
                </div>
                <style>
                    .excel-list { display: flex; flex-direction: column; gap: 20px; }
                    .excel-card {
                        background: var(--bg-card);
                        border: 2px solid var(--border-color);
                        border-radius: 12px;
                        padding: 25px;
                    }
                    .excel-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .excel-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--text-primary);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .excel-actions { display: flex; gap: 8px; }
                    .excel-table-container { overflow-x: auto; }
                    .excel-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 14px;
                        color: var(--text-primary);
                    }
                    .excel-table th {
                        background: var(--primary-color);
                        color: #fff;
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                    }
                    .excel-table td {
                        padding: 10px 12px;
                        border: 1px solid var(--border-color);
                        color: var(--text-primary);
                        background: var(--bg-card);
                    }
                    .excel-table tbody tr:nth-child(even) td {
                        background: var(--bg-input);
                    }
                    .excel-table tbody tr:hover td {
                        background: var(--bg-badge);
                    }
                    .excel-more-rows, .excel-empty-hint {
                        color: var(--text-secondary);
                        margin-top: 10px;
                        font-size: 13px;
                    }
                    .excel-empty-hint { margin: 0; }
                </style>
            `;
        },

        renderEditor(container, item) {
            const itemData = item || { 
                title: '', 
                metadata: { headers: ['Coluna 1', 'Coluna 2', 'Coluna 3'], data: [] }
            };
            const metadata = itemData.metadata || { headers: ['Coluna 1', 'Coluna 2', 'Coluna 3'], data: [] };

            container.innerHTML = `
                <form id="excelForm" onsubmit="Templates.excel.handleSubmit(event)">
                    <input type="hidden" id="itemId" value="${item ? item.id : ''}">
                    
                    <div class="form-group">
                        <label for="excelTitle">Nome da Tabela</label>
                        <input type="text" id="excelTitle" class="form-control" value="${escapeHtml(itemData.title)}" required placeholder="Ex: Lista de Recursos">
                    </div>

                    <div class="form-group">
                        <label>Cabeçalhos das Colunas (separados por vírgula)</label>
                        <input type="text" id="excelHeaders" class="form-control" value="${metadata.headers.map(h => escapeHtml(h)).join(', ')}" placeholder="Ex: Nome, Link, Categoria">
                    </div>

                    <div class="form-group">
                        <label>Dados (uma linha por entrada, células separadas por vírgula)</label>
                        <textarea id="excelData" class="form-control" rows="10" placeholder="Ex:\nRecurso 1, https://..., Cursos\nRecurso 2, https://..., Tools">${metadata.data.map(row => row.map(cell => escapeHtml(cell)).join(', ')).join('\n')}</textarea>
                        <small class="form-help">Cada linha representa uma entrada na tabela</small>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeItemEditor()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Tabela
                        </button>
                    </div>
                </form>
            `;
        },

        handleSubmit(event) {
            event.preventDefault();
            
            const headersText = document.getElementById('excelHeaders').value;
            const dataText = document.getElementById('excelData').value;

            const headers = headersText.split(',').map(h => h.trim()).filter(h => h !== '');
            const data = dataText.split('\n')
                .map(line => line.split(',').map(cell => cell.trim()))
                .filter(row => row.some(cell => cell !== ''));

            const itemData = {
                id: document.getElementById('itemId').value || null,
                category_id: AppState.currentCategory.id,
                title: document.getElementById('excelTitle').value,
                status: 'pending',
                priority: 'medium',
                metadata: {
                    headers: headers,
                    data: data
                }
            };

            saveItem(itemData);
        },

        exportToCsv(itemId) {
            const item = (AppState.currentCategory && window.__lastExcelItems) ?
                window.__lastExcelItems.find(i => i.id == itemId) : null;
            if (!item || !item.metadata) {
                showNotification('Dados da tabela não disponíveis. Abre a categoria novamente.', 'error');
                return;
            }
            const headers = item.metadata.headers || [];
            const data = item.metadata.data || [];
            const escapeCsv = (cell) => {
                const s = String(cell ?? '');
                if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
                return s;
            };
            const headerLine = headers.map(escapeCsv).join(',');
            const dataLines = data.map(row => row.map(escapeCsv).join(','));
            const csv = [headerLine, ...dataLines].join('\r\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (item.title || 'tabela').replace(/[^\w\s-]/g, '') + '.csv';
            a.click();
            URL.revokeObjectURL(a.href);
            showNotification('CSV exportado', 'success');
        }
    },

    // ====================================
    // TEMPLATE: CADERNOS
    // ====================================
    notebooks: {

        _priorityConfig: {
            high:   { color: '#e67e22', label: 'Muito Importante', bg: '#fef3e2', icon: 'fa-fire', border: '#e67e22' },
            medium: { color: '#27ae60', label: 'Importante',       bg: '#eafaf1', icon: 'fa-star', border: '#27ae60' },
            low:    { color: '#2980b9', label: 'Normal',           bg: '#eaf4fb', icon: 'fa-bookmark', border: '#2980b9' }
        },

        render(container, items) {
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book"></i>
                        <h3>Sem cadernos</h3>
                        <p>Clica em "Novo" para criar o teu primeiro caderno</p>
                    </div>
                `;
                return;
            }

            const pc = this._priorityConfig;

            container.innerHTML = `
                <div class="nb-shell">
                    <!-- SIDEBAR -->
                    <aside class="nb-sidebar">
                        <div class="nb-sidebar-header">
                            <div class="nb-sidebar-logo"><i class="fas fa-book-open"></i></div>
                            <div>
                                <div class="nb-sidebar-brand">Os Meus Cadernos</div>
                                <div class="nb-sidebar-count">${items.length} caderno${items.length !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                        <div class="nb-search-wrap">
                            <i class="fas fa-search nb-search-icon"></i>
                            <input class="nb-search" type="text" placeholder="Pesquisar cadernos..." oninput="Templates.notebooks.filterList(this.value)">
                        </div>
                        <div class="nb-list" id="nbList">
                            ${items.map((item, i) => {
                                const p = pc[item.priority] || pc.low;
                                const preview = (item.content || '').replace(/<[^>]+>/g, '').slice(0, 60) || 'Caderno vazio…';
                                return `
                                <div class="nb-list-item ${i === 0 ? 'active' : ''} nb-p-${item.priority}"
                                     data-notebook-id="${item.id}"
                                     data-title="${escapeHtml(item.title).toLowerCase()}"
                                     onclick="event.stopPropagation(); event.preventDefault(); Templates.notebooks.showNotebook(${item.id})">
                                    <div class="nb-item-accent" style="background:${p.color}"></div>
                                    <div class="nb-item-icon" style="color:${p.color}">
                                        <i class="fas ${p.icon}"></i>
                                    </div>
                                    <div class="nb-item-body">
                                        <div class="nb-item-title">${escapeHtml(item.title)}</div>
                                        ${(item.metadata && item.metadata.linkedToCourseTitle) ? `<div class="nb-item-linked-course" title="Associado ao curso"><i class="fas fa-link"></i> Associado: ${escapeHtml(item.metadata.linkedToCourseTitle)}</div>` : ''}
                                        <div class="nb-item-preview">${escapeHtml(preview)}</div>
                                        <div class="nb-item-date"><i class="fas fa-clock"></i> ${new Date(item.updated_at).toLocaleDateString('pt-PT')}</div>
                                    </div>
                                    <div class="nb-item-btns" onclick="event.stopPropagation()">
                                        <button class="nb-btn-sm" onclick="openItemEditor(${item.id})" title="Editar"><i class="fas fa-pen"></i></button>
                                        <button class="nb-btn-sm danger" onclick="deleteItem(${item.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </aside>

                    <!-- CONTENT -->
                    <main class="nb-main">
                        <div id="nbContent">
                            ${this.renderNotebookView(items[0])}
                        </div>
                    </main>
                </div>

                <style>
                /* ── Shell ─────────────────────────────── */
                .nb-shell {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    height: 72vh;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.14);
                    font-family: 'Segoe UI', system-ui, sans-serif;
                }
                @media(max-width:860px){
                    .nb-shell { grid-template-columns:1fr; height:auto; }
                    .nb-sidebar { max-height:260px; }
                }

                /* ── Sidebar ────────────────────────────── */
                .nb-sidebar {
                    background: linear-gradient(170deg, #1a1f36 0%, #2d3561 100%);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .nb-sidebar-header {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 22px 20px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                .nb-sidebar-logo {
                    width: 44px; height: 44px;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.12);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 20px; color: #a5b4fc;
                }
                .nb-sidebar-brand { font-size: 15px; font-weight: 700; color: #fff; }
                .nb-sidebar-count { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 2px; }

                /* search */
                .nb-search-wrap {
                    position: relative;
                    padding: 14px 16px 10px;
                    flex-shrink: 0;
                }
                .nb-search-icon {
                    position: absolute; left: 28px; top: 50%; transform: translateY(-50%);
                    color: rgba(255,255,255,0.35); font-size: 13px; pointer-events: none;
                }
                .nb-search {
                    width: 100%; box-sizing: border-box;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px;
                    padding: 9px 12px 9px 34px;
                    color: #fff; font-size: 13px;
                    outline: none; transition: border-color 0.2s;
                }
                .nb-search::placeholder { color: rgba(255,255,255,0.35); }
                .nb-search:focus { border-color: rgba(165,180,252,0.6); }

                /* list */
                .nb-list {
                    flex: 1; overflow-y: auto;
                    padding: 8px 12px 16px;
                    display: flex; flex-direction: column; gap: 6px;
                }
                .nb-list::-webkit-scrollbar { width: 4px; }
                .nb-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

                .nb-list-item {
                    position: relative;
                    display: flex; align-items: flex-start; gap: 10px;
                    padding: 12px 10px 12px 14px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.2s;
                    overflow: hidden;
                }
                .nb-list-item:hover { background: rgba(255,255,255,0.1); transform: translateX(3px); }
                .nb-list-item.active { background: rgba(165,180,252,0.2); box-shadow: inset 3px 0 0 #a5b4fc; }

                .nb-item-accent {
                    position: absolute; left: 0; top: 0; bottom: 0;
                    width: 3px; border-radius: 0 2px 2px 0;
                }
                .nb-item-icon {
                    width: 32px; height: 32px; border-radius: 8px;
                    background: rgba(255,255,255,0.08);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px; flex-shrink: 0; margin-top: 2px;
                }
                .nb-item-body { flex: 1; min-width: 0; }
                .nb-item-title {
                    font-size: 13px; font-weight: 600; color: #fff;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-bottom: 3px;
                }
                .nb-item-preview {
                    font-size: 11px; color: rgba(255,255,255,0.45);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-bottom: 4px;
                }
                .nb-item-date { font-size: 10px; color: rgba(255,255,255,0.3); }
                .nb-item-date i { margin-right: 3px; }
                .nb-item-linked-course { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }
                .nb-item-linked-course i { margin-right: 4px; }
                .nb-item-btns {
                    display: flex; flex-direction: column; gap: 4px;
                    opacity: 0; transition: opacity 0.2s; flex-shrink: 0;
                }
                .nb-list-item:hover .nb-item-btns { opacity: 1; }
                .nb-btn-sm {
                    background: rgba(255,255,255,0.1); border: none;
                    color: rgba(255,255,255,0.7); padding: 4px 7px;
                    border-radius: 6px; cursor: pointer; font-size: 11px;
                    transition: background 0.12s ease, color 0.12s ease;
                }
                .nb-btn-sm:hover { background: rgba(255,255,255,0.2); color: #fff; }
                .nb-btn-sm.danger:hover { background: #e74c3c; color: #fff; }

                /* ── Main content ───────────────────────── */
                .nb-main {
                    background: #f7f8fc;
                    overflow-y: auto;
                    display: flex; flex-direction: column;
                    position: relative;
                }
                #nbContent { flex: 1; padding: 0; }
                .nb-content-inner { padding: 32px 36px; }

                /* ── Notebook view ──────────────────────── */
                .nb-view-header {
                    display: flex; align-items: flex-start; justify-content: space-between;
                    gap: 16px;
                    padding: 0 0 20px;
                    margin-bottom: 24px;
                    border-bottom: 2px solid #e9ecf0;
                }
                .nb-view-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
                .nb-view-title {
                    font-size: 28px; font-weight: 800; color: #1a1f36; margin: 0;
                    line-height: 1.2;
                }
                .nb-priority-pill {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 4px 12px; border-radius: 20px;
                    font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
                }
                .nb-view-meta { display: flex; flex-wrap: wrap; gap: 18px; font-size: 13px; color: #8892a4; align-items: center; }
                .nb-view-meta i { margin-right: 5px; }
                .nb-view-linked-course {
                    background: linear-gradient(135deg, rgba(155,89,182,0.15), rgba(108,99,255,0.12));
                    color: #6C63FF;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .nb-edit-btn {
                    display: flex; align-items: center; gap: 7px;
                    padding: 8px 18px; border-radius: 10px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: #fff; border: none; font-size: 14px; font-weight: 600;
                    cursor: pointer; white-space: nowrap;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 14px rgba(102,126,234,0.4);
                }
                .nb-edit-btn:hover { opacity: 0.9; transform: translateY(-1px); }

                /* view content */
                .nb-view-body {
                    background: #fff;
                    border-radius: 12px;
                    padding: 28px 32px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
                    min-height: 200px;
                    font-size: 15px; line-height: 1.85; color: #2d3748;
                }
                .nb-view-body h1 { font-size: 24px; font-weight: 800; color: #1a1f36; margin: 20px 0 10px; }
                .nb-view-body h2 { font-size: 20px; font-weight: 700; color: #2d3561; margin: 18px 0 8px; border-bottom: 2px solid #e9ecf0; padding-bottom: 6px; }
                .nb-view-body h3 { font-size: 17px; font-weight: 600; color: #3d4e7a; margin: 14px 0 6px; }
                .nb-view-body p { margin: 8px 0; }
                .nb-view-body ul, .nb-view-body ol { padding-left: 22px; margin: 8px 0; }
                .nb-view-body li { margin: 4px 0; }
                .nb-view-body strong { color: #1a1f36; }
                .nb-view-body em { color: #5a6a85; }
                .nb-view-body u { text-decoration-color: #667eea; }
                .nb-view-body s { color: #9aa5b4; }
                .nb-view-body code {
                    background: #f1f3f9; border: 1px solid #dde1ea;
                    border-radius: 5px; padding: 2px 7px;
                    font-family: 'Fira Code','Courier New',monospace;
                    font-size: 13px; color: #e74c3c;
                }
                .nb-view-body pre {
                    background: #1a1f36; color: #a5b4fc;
                    border-radius: 10px; padding: 16px 20px;
                    font-family: 'Fira Code','Courier New',monospace;
                    font-size: 13px; line-height: 1.7; overflow-x: auto;
                    margin: 12px 0;
                }
                .nb-view-body blockquote {
                    border-left: 4px solid #667eea;
                    background: #f0f2ff; border-radius: 0 8px 8px 0;
                    padding: 12px 18px; margin: 12px 0; color: #4a5568;
                }
                .nb-view-body hr { border: none; border-top: 2px solid #e9ecf0; margin: 20px 0; }
                .nb-view-body mark { background: #fff3a3; padding: 1px 4px; border-radius: 3px; }
                .nb-view-body a { color: #667eea; text-decoration: underline; }
                .nb-empty-hint {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 60px 20px;
                    color: #b0bac6; gap: 10px;
                }
                .nb-empty-hint i { font-size: 56px; opacity: 0.3; }
                .nb-empty-hint p { font-size: 15px; }

                /* ── Rich-text toolbar ──────────────────── */
                #notebookToolbarSlot {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: #fff;
                    box-shadow: 0 4px 18px rgba(0,0,0,0.10);
                    border-bottom: 2px solid #e2e8f0;
                }
                .nb-toolbar {
                    display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
                    padding: 8px 16px;
                    border-radius: 0;
                }
                .nb-tool-sep {
                    width: 1px; height: 26px; background: #e2e8f0; margin: 0 4px;
                }
                .nb-tool {
                    display: flex; align-items: center; justify-content: center;
                    min-width: 32px; height: 32px; border-radius: 8px;
                    border: none; background: transparent; cursor: pointer;
                    color: #4a5568; font-size: 13px; font-weight: 600;
                    transition: background 0.15s, color 0.15s;
                    padding: 0 8px;
                }
                .nb-tool:hover { background: #eef2ff; color: #667eea; }
                .nb-tool.active { background: #667eea; color: #fff; }
                .nb-tool-select {
                    height: 32px; border: 1px solid #e2e8f0; border-radius: 8px;
                    padding: 0 8px; font-size: 13px; color: #4a5568;
                    background: #fff; cursor: pointer; outline: none;
                }
                .nb-color-btn {
                    width: 22px; height: 22px; border-radius: 50%;
                    border: 3px solid #fff; box-shadow: 0 0 0 1px #cbd5e0;
                    cursor: pointer; display: inline-block;
                }

                /* editor area */
                .nb-editor-wrap { display: flex; flex-direction: column; }
                .nb-rich-editor {
                    background: #fff;
                    border: 2px solid #667eea;
                    border-radius: 12px;
                    padding: 20px 24px;
                    min-height: 380px; outline: none;
                    font-size: 15px; line-height: 1.85; color: #2d3748;
                    overflow-y: auto;
                    margin-top: 16px;
                    box-shadow: 0 2px 12px rgba(102,126,234,0.1);
                }
                .nb-rich-editor:empty::before {
                    content: attr(data-placeholder);
                    color: #b0bac6; pointer-events: none;
                }
                .nb-rich-editor h1 { font-size: 24px; font-weight: 800; color: #1a1f36; }
                .nb-rich-editor h2 { font-size: 20px; font-weight: 700; color: #2d3561; border-bottom: 2px solid #e9ecf0; padding-bottom: 6px; }
                .nb-rich-editor h3 { font-size: 17px; font-weight: 600; color: #3d4e7a; }
                .nb-rich-editor code { background: #f1f3f9; border: 1px solid #dde1ea; border-radius: 5px; padding: 2px 7px; font-family: monospace; font-size: 13px; color: #e74c3c; }
                .nb-rich-editor blockquote { border-left: 4px solid #667eea; background: #f0f2ff; border-radius: 0 8px 8px 0; padding: 12px 18px; margin: 8px 0; }
                .nb-rich-editor mark { background: #fff3a3; }

                /* bottom actions */
                .nb-editor-actions {
                    display: flex; align-items: center; gap: 10px;
                    padding: 14px 0 0; flex-wrap: wrap;
                }
                .nb-word-count {
                    margin-left: auto; font-size: 12px; color: #8892a4;
                    display: flex; align-items: center; gap: 5px;
                }

                /* empty placeholder */
                .nb-select-hint {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; height: 100%;
                    color: #b0bac6; gap: 14px; padding: 60px;
                }
                .nb-select-hint i { font-size: 64px; opacity: 0.25; }

                /* ── Version history panel ────────────── */
                .nb-version-panel {
                    background: #fff;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    overflow: hidden;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
                }
                .nb-version-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 20px;
                    background: linear-gradient(135deg, #1a1f36, #2d3561);
                    color: #fff;
                }
                .nb-version-header h3 {
                    margin: 0; font-size: 15px; font-weight: 700;
                    display: flex; align-items: center; gap: 8px;
                }
                .nb-version-close {
                    background: rgba(255,255,255,0.15); border: none;
                    color: #fff; width: 28px; height: 28px; border-radius: 8px;
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center; font-size: 13px;
                    transition: background 0.12s ease;
                }
                .nb-version-close:hover { background: rgba(255,255,255,0.3); }
                .nb-version-list {
                    max-height: 280px;
                    overflow-y: auto;
                    padding: 8px;
                }
                .nb-version-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    border-radius: 8px;
                    margin-bottom: 4px;
                    transition: background 0.12s ease;
                }
                .nb-version-item:hover { background: #f7f8fc; }
                .nb-version-icon {
                    width: 36px; height: 36px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; font-size: 14px;
                }
                .nb-version-info { flex: 1; min-width: 0; }
                .nb-version-info strong { font-size: 14px; color: #1a1f36; }
                .nb-version-badge {
                    display: inline-block;
                    padding: 1px 8px; border-radius: 10px;
                    font-size: 10px; font-weight: 700;
                    margin-left: 6px;
                    vertical-align: middle;
                }
                .nb-version-badge.manual { background: #eafaf1; color: #27ae60; }
                .nb-version-badge.autosave { background: #eaf4fb; color: #2980b9; }
                .nb-version-date { font-size: 12px; color: #8892a4; margin-top: 2px; }
                .nb-version-restore {
                    padding: 6px 12px; border-radius: 8px;
                    border: 1px solid #667eea; background: #fff;
                    color: #667eea; font-weight: 600; font-size: 12px;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    transition: background 0.12s ease, color 0.12s ease;
                }
                .nb-version-restore:hover { background: #667eea; color: #fff; }
                </style>
            `;

            // Auto open first
            if (items.length > 0) {
                // Already rendered above
            }
        },

        filterList(query) {
            const q = query.toLowerCase().trim();
            document.querySelectorAll('#nbList .nb-list-item').forEach(el => {
                const title = el.getAttribute('data-title') || '';
                el.style.display = (!q || title.includes(q)) ? '' : 'none';
            });
        },

        renderNotebookView(notebook) {
            if (!notebook) {
                return `
                    <div class="nb-select-hint">
                        <i class="fas fa-book-open"></i>
                        <p>Seleciona um caderno para visualizar</p>
                    </div>
                `;
            }

            const pc = this._priorityConfig;
            const p = pc[notebook.priority] || pc.low;

            let htmlContent = notebook.content || '';
            if (htmlContent && !htmlContent.trim().startsWith('<')) {
                htmlContent = htmlContent
                    .split('\n')
                    .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br>')
                    .join('');
            }

            return `
                <div class="nb-view" data-notebook-id="${notebook.id}">

                    <div id="notebookToolbarSlot" style="display:none;">
                        ${this._buildToolbar()}
                    </div>

                    <div class="nb-content-inner">
                        <div class="nb-view-header">
                            <div style="flex:1;min-width:0;">
                                <div class="nb-view-title-row">
                                    <h1 class="nb-view-title">${escapeHtml(notebook.title)}</h1>
                                    <span class="nb-priority-pill" style="background:${p.bg};color:${p.color};">
                                        <i class="fas ${p.icon}"></i> ${p.label}
                                    </span>
                                </div>
                                <div class="nb-view-meta">
                                    <span><i class="fas fa-calendar-alt"></i>${new Date(notebook.created_at).toLocaleDateString('pt-PT')}</span>
                                    <span><i class="fas fa-clock"></i>Atualizado: ${new Date(notebook.updated_at).toLocaleDateString('pt-PT')}</span>
                                    ${(notebook.metadata && notebook.metadata.linkedToCourseTitle) ? `<span class="nb-view-linked-course" title="Caderno associado a este curso"><i class="fas fa-link"></i> Associado: ${escapeHtml(notebook.metadata.linkedToCourseTitle)}</span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex;gap:8px;align-items:flex-start;" id="nbViewButtons">
                                <button class="nb-edit-btn" id="editNotebookBtn" onclick="Templates.notebooks.enableEditMode()">
                                    <i class="fas fa-pencil-alt"></i> Editar
                                </button>
                                <button class="nb-edit-btn" style="background:linear-gradient(135deg,#27ae60,#2ecc71);box-shadow:0 4px 14px rgba(39,174,96,0.3);"
                                        onclick="Templates.notebooks.saveCurrentVersion(${notebook.id})" title="Guardar versão manual do conteúdo atual">
                                    <i class="fas fa-download"></i> Guardar Versão
                                </button>
                                <button class="nb-edit-btn" style="background:linear-gradient(135deg,#2d3561,#1a1f36);box-shadow:0 4px 14px rgba(26,31,54,0.3);"
                                        onclick="Templates.notebooks.toggleVersionPanel()" title="Historial de versões">
                                    <i class="fas fa-history"></i> Versões
                                </button>
                            </div>
                        </div>

                        <!-- Version history panel (hidden by default) -->
                        <div id="nbVersionPanel" style="display:none;">
                            <div class="nb-version-panel">
                                <div class="nb-version-header">
                                    <h3><i class="fas fa-history"></i> Historial de Versões</h3>
                                    <button class="nb-version-close" onclick="Templates.notebooks.toggleVersionPanel()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div id="nbVersionList" class="nb-version-list">
                                    <div style="text-align:center;padding:20px;color:#8892a4;">
                                        <i class="fas fa-spinner fa-spin"></i> A carregar...
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="notebookDisplayArea">
                            ${htmlContent
                                ? `<div class="nb-view-body">${htmlContent}</div>`
                                : `<div class="nb-empty-hint"><i class="fas fa-feather-alt"></i><p>Caderno vazio. Clica em "Editar" para começar a escrever.</p></div>`
                            }
                        </div>

                        <div id="notebookEditorArea" style="display:none;">
                            <div id="notebookRichEditor" class="nb-rich-editor"
                                 contenteditable="true"
                                 data-placeholder="Começa a escrever aqui…"
                                 data-original-html="${encodeURIComponent(htmlContent)}"
                                 data-item-id="${notebook.id}"
                                 onkeydown="Templates.notebooks._editorKeydown(event)"
                                 oninput="Templates.notebooks._onEditorInput()">
                            </div>
                            <div class="nb-editor-actions">
                                <button class="btn btn-success" onclick="Templates.notebooks.saveInlineEdit()">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                                <button class="btn btn-secondary" onclick="Templates.notebooks.saveVersionFromEditor(${notebook.id})" title="Guardar como versão sem sair da edição" style="background:linear-gradient(135deg,#27ae60,#2ecc71);color:#fff;border:none;">
                                    <i class="fas fa-download"></i> Guardar Versão
                                </button>
                                <button class="btn btn-secondary" onclick="Templates.notebooks.cancelEditMode()">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                                <span class="nb-word-count" id="nbWordCount">
                                    <i class="fas fa-font"></i> 0 palavras
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        _buildToolbar() {
            return `
                <div class="nb-toolbar" id="nbToolbar">
                    <!-- Headings -->
                    <select class="nb-tool-select" onchange="Templates.notebooks._formatBlock(this.value); this.value='p';" title="Estilo">
                        <option value="p">Parágrafo</option>
                        <option value="h1">Título 1</option>
                        <option value="h2">Título 2</option>
                        <option value="h3">Título 3</option>
                        <option value="pre">Código</option>
                        <option value="blockquote">Citação</option>
                    </select>

                    <div class="nb-tool-sep"></div>

                    <!-- Text style -->
                    <button class="nb-tool" title="Negrito (Ctrl+B)" onclick="Templates.notebooks._exec('bold')"><b>B</b></button>
                    <button class="nb-tool" title="Itálico (Ctrl+I)" onclick="Templates.notebooks._exec('italic')"><i>I</i></button>
                    <button class="nb-tool" title="Sublinhado (Ctrl+U)" onclick="Templates.notebooks._exec('underline')"><u>U</u></button>
                    <button class="nb-tool" title="Riscado" onclick="Templates.notebooks._exec('strikeThrough')"><s>S</s></button>
                    <button class="nb-tool" title="Destacar (Highlight)" onclick="Templates.notebooks._highlight()"><i class="fas fa-highlighter"></i></button>
                    <button class="nb-tool" title="Código inline" onclick="Templates.notebooks._inlineCode()"><i class="fas fa-code"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Lists -->
                    <button class="nb-tool" title="Lista com pontos" onclick="Templates.notebooks._exec('insertUnorderedList')"><i class="fas fa-list-ul"></i></button>
                    <button class="nb-tool" title="Lista numerada" onclick="Templates.notebooks._exec('insertOrderedList')"><i class="fas fa-list-ol"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Alignment -->
                    <button class="nb-tool" title="Alinhar à esquerda" onclick="Templates.notebooks._exec('justifyLeft')"><i class="fas fa-align-left"></i></button>
                    <button class="nb-tool" title="Centrar" onclick="Templates.notebooks._exec('justifyCenter')"><i class="fas fa-align-center"></i></button>
                    <button class="nb-tool" title="Alinhar à direita" onclick="Templates.notebooks._exec('justifyRight')"><i class="fas fa-align-right"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Extras -->
                    <button class="nb-tool" title="Inserir separador" onclick="Templates.notebooks._exec('insertHorizontalRule')"><i class="fas fa-minus"></i></button>
                    <button class="nb-tool" title="Remover formatação" onclick="Templates.notebooks._exec('removeFormat')"><i class="fas fa-remove-format"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Text colors (mousedown para não perder a seleção) -->
                    <span style="font-size:11px;color:var(--text-secondary);margin-right:2px;">Cor:</span>
                    ${['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#1a1f36'].map(c =>
                        `<span class="nb-color-btn" style="background:${c}" title="${c}" onmousedown="event.preventDefault();Templates.notebooks._exec('foreColor','${c}')"></span>`
                    ).join('')}
                    <span class="nb-color-btn" style="background:#000" title="Preto" onmousedown="event.preventDefault();Templates.notebooks._exec('foreColor','#000')"></span>
                    <span class="nb-color-btn" style="background:#fff;box-shadow:0 0 0 1px #bbb" title="Branco" onmousedown="event.preventDefault();Templates.notebooks._exec('foreColor','#fff')"></span>
                </div>
            `;
        },

        _exec(command, value = null) {
            document.getElementById('notebookRichEditor').focus();
            document.execCommand(command, false, value);
            this._updateWordCount();
        },

        _formatBlock(tag) {
            const editor = document.getElementById('notebookRichEditor');
            if (!editor) return;
            editor.focus();
            // 'p' = parágrafo (texto normal); formatBlock com tag vazia não limpa em alguns browsers
            document.execCommand('formatBlock', false, tag === 'p' || !tag ? 'p' : tag);
            this._updateWordCount();
        },

        _highlight() {
            document.getElementById('notebookRichEditor').focus();
            document.execCommand('hiliteColor', false, '#fff3a3');
            this._updateWordCount();
        },

        _inlineCode() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const code = document.createElement('code');
            try {
                range.surroundContents(code);
            } catch(e) {
                const frag = range.extractContents();
                code.appendChild(frag);
                range.insertNode(code);
            }
            this._updateWordCount();
        },

        _onEditorInput() {
            this._updateWordCount();
            // Trigger autosave debounce
            if (this._autosaveTrigger) this._autosaveTrigger();
        },

        _editorKeydown(e) {
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveInlineEdit(); }
        },

        _updateWordCount() {
            const editor = document.getElementById('notebookRichEditor');
            const wc = document.getElementById('nbWordCount');
            if (!editor || !wc) return;
            const text = (editor.innerText || '').trim();
            const words = text.length > 0 ? text.split(/\s+/).length : 0;
            const chars = text.length;
            wc.innerHTML = `<i class="fas fa-font"></i> ${words} palavra${words !== 1 ? 's' : ''} · ${chars} char`;
        },

        _autosaveTrigger: null,

        enableEditMode() {
            const displayArea  = document.getElementById('notebookDisplayArea');
            const editorArea   = document.getElementById('notebookEditorArea');
            const editBtn      = document.getElementById('editNotebookBtn');
            const richEditor   = document.getElementById('notebookRichEditor');
            const toolbarSlot  = document.getElementById('notebookToolbarSlot');
            const itemId       = richEditor.getAttribute('data-item-id');

            const originalHtml = decodeURIComponent(richEditor.getAttribute('data-original-html') || '');

            // Check for recovered draft BEFORE loading content
            const serverContent = originalHtml;
            let useContent = serverContent;

            if (window.Autosave) {
                const recovery = Autosave.checkForRecovery(itemId, serverContent);
                if (recovery && recovery.hasDraft) {
                    Autosave.showRecoveryDialog(
                        itemId,
                        serverContent,
                        (draftContent) => {
                            richEditor.innerHTML = draftContent;
                            this._updateWordCount();
                        },
                        () => { /* discard — keep server content */ }
                    );
                }

                // Register autosave
                this._autosaveTrigger = Autosave.register(
                    itemId,
                    () => richEditor.innerHTML,
                    {
                        onSaved: () => {},
                        onError: () => {},
                    }
                );
            }

            richEditor.innerHTML = useContent;

            displayArea.style.display = 'none';
            editorArea.style.display = 'block';
            const btnGroup = document.getElementById('nbViewButtons');
            if (btnGroup) btnGroup.style.display = 'none';
            const versionPanel = document.getElementById('nbVersionPanel');
            if (versionPanel) versionPanel.style.display = 'none';

            if (toolbarSlot) toolbarSlot.style.display = 'block';

            const nbMain = document.querySelector('.nb-main');
            if (nbMain) nbMain.scrollTop = 0;

            richEditor.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(richEditor);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            this._updateWordCount();
        },

        cancelEditMode() {
            const richEditor = document.getElementById('notebookRichEditor');
            if (richEditor && window.Autosave) {
                Autosave.unregister(richEditor.getAttribute('data-item-id'));
            }
            this._autosaveTrigger = null;

            const notebookView = document.querySelector('.nb-view');
            if (notebookView) {
                this.showNotebook(notebookView.getAttribute('data-notebook-id'));
            }
        },

        async saveInlineEdit() {
            const richEditor = document.getElementById('notebookRichEditor');
            const notebookView = document.querySelector('.nb-view');
            const editorArea = document.getElementById('notebookEditorArea');

            if (!richEditor || !notebookView) {
                showNotification('Erro ao guardar', 'error');
                return;
            }

            const notebookId = notebookView.getAttribute('data-notebook-id');
            const newContent = richEditor.innerHTML;

            const saveBtn = editorArea.querySelector('.btn-success');
            const origText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar…';
            saveBtn.disabled = true;

            try {
                // Unregister autosave before manual save
                if (window.Autosave) Autosave.unregister(notebookId);
                this._autosaveTrigger = null;

                // Save directly via save_note.php (versioning + content)
                const response = await fetch(`${API_URL}/save_note.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_id: Number(notebookId),
                        content: newContent,
                        saved_by: 'manual',
                    }),
                });
                const data = await response.json();
                if (!data.success) throw new Error(data.error || 'Erro ao guardar');

                // Clear local draft
                if (window.Autosave) Autosave.clearDraft(notebookId);

                showNotification('Caderno guardado!', 'success');

                // Re-render notebook view (exits edit mode)
                await this.showNotebook(notebookId);

                // Update sidebar preview + date
                const sidebarItem = document.querySelector(`.nb-list-item[data-notebook-id="${notebookId}"]`);
                if (sidebarItem) {
                    const preview = newContent.replace(/<[^>]+>/g, '').slice(0, 60) || 'Caderno vazio…';
                    const previewEl = sidebarItem.querySelector('.nb-item-preview');
                    if (previewEl) previewEl.textContent = preview;
                    const dateEl = sidebarItem.querySelector('.nb-item-date');
                    if (dateEl) dateEl.innerHTML = `<i class="fas fa-clock"></i> ${new Date().toLocaleDateString('pt-PT')}`;
                }

                fetchCategories();
            } catch (err) {
                console.error('Save error:', err);
                showNotification('Erro ao guardar: ' + err.message, 'error');
                saveBtn.innerHTML = origText;
                saveBtn.disabled = false;
            }
        },

        async saveVersionFromEditor(itemId) {
            const richEditor = document.getElementById('notebookRichEditor');
            if (!richEditor) return;

            const content = richEditor.innerHTML;
            const btn = event.currentTarget;
            const origHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                // First save current content to server
                await fetch(`${API_URL}/save_note.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_id: Number(itemId),
                        content: content,
                        saved_by: 'manual',
                    }),
                });

                // Then snapshot that saved content as a version (com nome opcional)
                const versionName = window.prompt('Nome para esta versão (opcional):', '') || undefined;
                const resp = await fetch(`${API_URL}/save_note.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_id: Number(itemId),
                        content: null,
                        saved_by: 'manual_snapshot',
                        version_name: versionName,
                    }),
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.error);

                if (window.Autosave) Autosave.clearDraft(itemId);
                showNotification(`Versão ${data.data.version} guardada!`, 'success');
            } catch (err) {
                console.error(err);
                showNotification('Erro: ' + err.message, 'error');
            } finally {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }
        },

        async saveCurrentVersion(itemId) {
            const versionName = window.prompt('Nome para esta versão (opcional):', '') || undefined;
            const btn = event.currentTarget;
            const origHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar…';
            btn.disabled = true;

            try {
                const resp = await fetch(`${API_URL}/save_note.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_id: Number(itemId),
                        content: null,
                        saved_by: 'manual_snapshot',
                        version_name: versionName,
                    }),
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.error || 'Erro ao guardar versão');

                showNotification('Versão guardada com sucesso!', 'success');

                const panel = document.getElementById('nbVersionPanel');
                if (panel && panel.style.display !== 'none') {
                    this.toggleVersionPanel();
                    setTimeout(() => this.toggleVersionPanel(), 100);
                }
            } catch (err) {
                console.error(err);
                showNotification('Erro: ' + err.message, 'error');
            } finally {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }
        },

        async toggleVersionPanel() {
            const panel = document.getElementById('nbVersionPanel');
            if (!panel) return;

            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
                return;
            }

            panel.style.display = 'block';
            const listEl = document.getElementById('nbVersionList');
            const notebookView = document.querySelector('.nb-view');
            const itemId = notebookView ? notebookView.getAttribute('data-notebook-id') : null;
            if (!itemId) return;

            listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#8892a4;"><i class="fas fa-spinner fa-spin"></i> A carregar...</div>';

            try {
                const resp = await fetch(`${API_URL}/get_versions.php?item_id=${itemId}`);
                const data = await resp.json();

                if (!data.success || !data.data || data.data.length === 0) {
                    listEl.innerHTML = `
                        <div style="text-align:center;padding:30px 20px;color:#8892a4;">
                            <i class="fas fa-inbox" style="font-size:32px;opacity:0.3;display:block;margin-bottom:10px;"></i>
                            Sem versões anteriores.<br>
                            <small>As versões são criadas automaticamente ao guardar.</small>
                        </div>`;
                    return;
                }

                listEl.innerHTML = data.data.map(v => `
                    <div class="nb-version-item">
                        <div class="nb-version-icon" style="background:${v.saved_by === 'manual' ? '#eafaf1' : '#eaf4fb'};">
                            <i class="fas ${v.saved_by === 'manual' ? 'fa-save' : 'fa-robot'}"
                               style="color:${v.saved_by === 'manual' ? '#27ae60' : '#2980b9'};"></i>
                        </div>
                        <div class="nb-version-info">
                            <strong>Versão ${v.version}</strong>
                            <span class="nb-version-badge ${v.saved_by}">${v.saved_by === 'manual' ? 'Manual' : 'Auto'}</span>
                            <div class="nb-version-date">${new Date(v.created_at).toLocaleString('pt-PT')} · ${Math.round(v.content_length / 1024 * 10) / 10} KB</div>
                        </div>
                        <button class="nb-version-restore" onclick="Templates.notebooks.restoreVersion(${itemId}, ${v.version})">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                    </div>
                `).join('');
            } catch (err) {
                console.error(err);
                listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar versões</div>';
            }
        },

        async restoreVersion(itemId, version) {
            if (!confirm(`Restaurar a versão ${version}? O conteúdo actual será guardado como nova versão antes de restaurar.`)) return;

            try {
                const resp = await fetch(`${API_URL}/get_versions.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item_id: itemId, version: version }),
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.error);

                showNotification(`Versão ${version} restaurada!`, 'success');
                await this.showNotebook(itemId);
            } catch (err) {
                console.error(err);
                showNotification('Erro ao restaurar: ' + err.message, 'error');
            }
        },

        async showNotebook(notebookId) {
            document.querySelectorAll('.nb-list-item').forEach(el => el.classList.remove('active'));
            const activeEl = document.querySelector(`.nb-list-item[data-notebook-id="${notebookId}"]`);
            if (activeEl) activeEl.classList.add('active');

            try {
                const items = await fetchItems(AppState.currentCategory.id);
                const notebook = items.find(i => i.id == notebookId);
                if (notebook) {
                    const mainEl = document.getElementById('nbContent');
                    if (mainEl) mainEl.innerHTML = this.renderNotebookView(notebook);
                }
            } catch (err) {
                console.error(err);
                showNotification('Erro ao carregar caderno', 'error');
            }
        },

        renderEditor(container, item) {
            const itemData = item || { title: '', content: '', priority: 'medium' };

            container.innerHTML = `
                <form id="notebookForm" onsubmit="Templates.notebooks.handleSubmit(event)">
                    <input type="hidden" id="itemId" value="${item ? item.id : ''}">

                    <div class="form-group">
                        <label for="notebookTitle"><i class="fas fa-book"></i> Título do Caderno</label>
                        <input type="text" id="notebookTitle" class="form-control" value="${escapeHtml(itemData.title)}" required placeholder="Ex: Notas de Cibersegurança…">
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-palette"></i> Importância</label>
                        <select id="notebookColor" class="form-control">
                            <option value="low"    ${itemData.priority === 'low'    ? 'selected' : ''}>🟦 Azul — Normal</option>
                            <option value="medium" ${itemData.priority === 'medium' ? 'selected' : ''}>🟩 Verde — Importante</option>
                            <option value="high"   ${itemData.priority === 'high'   ? 'selected' : ''}>🟧 Laranja — Muito Importante</option>
                        </select>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeItemEditor()"><i class="fas fa-times"></i> Cancelar</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
                    </div>
                </form>
            `;
        },

        async handleSubmit(event) {
            event.preventDefault();
            const existingId = document.getElementById('itemId').value;

            let existingContent = '';
            let existingStatus = 'pending';

            // Preserve content and status if editing
            if (existingId) {
                try {
                    const items = await fetchItems(AppState.currentCategory.id);
                    const existing = items.find(i => i.id == existingId);
                    if (existing) {
                        existingContent = existing.content || '';
                        existingStatus = existing.status || 'pending';
                    }
                } catch(e) { /* ignore */ }
            }

            saveItem({
                id: existingId || null,
                category_id: AppState.currentCategory.id,
                title: document.getElementById('notebookTitle').value,
                content: existingContent,
                priority: document.getElementById('notebookColor').value,
                status: existingStatus
            });
        }
    }
};
