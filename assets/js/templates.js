/* ======================================
   NeatPad - Templates Personalizados
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
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    @media (min-width: 768px) {
                        .notes-grid {
                            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                            gap: 16px;
                        }
                    }
                    .note-card {
                        --note-ink: #1f1d2b;
                        --note-ink-muted: rgba(31, 29, 43, 0.72);
                        --note-ink-subtle: rgba(31, 29, 43, 0.55);
                        --note-divider: rgba(31, 29, 43, 0.18);
                        border-radius: var(--radius-lg);
                        padding: 16px;
                        border: 1px solid var(--note-divider);
                        transition: border-color 0.12s ease, transform 0.12s ease;
                        min-height: 180px;
                        display: flex;
                        flex-direction: column;
                        color: var(--note-ink);
                    }
                    .note-card:hover {
                        border-color: rgba(31, 29, 43, 0.32);
                        transform: translateY(-1px);
                    }
                    .note-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 10px;
                        gap: 8px;
                    }
                    .note-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: var(--note-ink);
                        flex: 1;
                        line-height: 1.3;
                        word-break: break-word;
                    }
                    .note-actions {
                        display: flex;
                        gap: 4px;
                    }
                    .note-action-btn {
                        background: transparent;
                        border: none;
                        border-radius: var(--radius);
                        width: 32px;
                        height: 32px;
                        color: var(--note-ink-muted);
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.12s ease, color 0.12s ease;
                    }
                    .note-action-btn:hover { background: rgba(31, 29, 43, 0.10); color: var(--note-ink); }
                    .note-action-btn.delete:hover { background: rgba(220, 38, 38, 0.15); color: #b91c1c; }
                    .note-content {
                        flex: 1;
                        color: var(--note-ink-muted);
                        line-height: 1.55;
                        white-space: pre-wrap;
                        font-size: 13px;
                    }
                    .note-footer {
                        margin-top: 12px;
                        padding-top: 12px;
                        border-top: 1px solid var(--note-divider);
                        color: var(--note-ink-subtle);
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
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    @media (min-width: 768px) {
                        .tasks-kanban {
                            grid-template-columns: repeat(3, 1fr);
                            gap: 16px;
                        }
                    }
                    .kanban-column {
                        background: var(--bg-subtle);
                        border: 1px solid var(--border);
                        border-radius: var(--radius-lg);
                        padding: 12px;
                        min-height: 240px;
                    }
                    .kanban-title {
                        font-size: 14px;
                        margin-bottom: 12px;
                        color: var(--text);
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .kanban-items {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .task-card {
                        background: var(--bg-surface);
                        border: 1px solid var(--border);
                        border-radius: var(--radius);
                        padding: 14px;
                        transition: border-color 0.12s ease;
                        cursor: pointer;
                    }
                    .task-card:hover { border-color: var(--border-strong); }
                    .task-card.priority-high   { border-left: 3px solid var(--danger); }
                    .task-card.priority-medium { border-left: 3px solid var(--warning); }
                    .task-card.priority-low    { border-left: 3px solid var(--info); }
                    .task-title {
                        font-weight: 600;
                        margin-bottom: 6px;
                        color: var(--text);
                        font-size: 14px;
                    }
                    .task-progress {
                        font-size: 12px;
                        color: var(--text-muted);
                        margin-top: 8px;
                    }
                    .task-progress-bar {
                        height: 4px;
                        background: var(--bg-muted);
                        border-radius: 2px;
                        margin-top: 5px;
                        overflow: hidden;
                    }
                    .task-progress-fill {
                        height: 100%;
                        background: var(--success);
                        transition: width 0.3s ease;
                    }
                    .task-actions {
                        margin-top: 10px;
                        display: flex;
                        gap: 6px;
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
                        <div class="modal-header" style="background: var(--bg-surface); color: var(--text); border-bottom: 1px solid var(--border); padding: 16px 20px;">
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
                        gap: 12px;
                    }
                    .course-card {
                        background: var(--bg-surface);
                        border: 1px solid var(--border);
                        border-radius: var(--radius-lg);
                        padding: 16px;
                        transition: border-color 0.12s ease;
                    }
                    @media (min-width: 768px) {
                        .courses-list { gap: 16px; }
                        .course-card { padding: 20px; }
                    }
                    .course-card:hover { border-color: var(--border-strong); }
                    .course-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 14px;
                        gap: 10px;
                        flex-wrap: wrap;
                    }
                    .course-title {
                        font-size: 17px;
                        font-weight: 600;
                        color: var(--text);
                        margin-bottom: 6px;
                    }
                    .course-platform {
                        background: var(--primary-weak);
                        color: var(--primary);
                        padding: 2px 10px;
                        border-radius: var(--radius-pill);
                        font-size: 11px;
                        font-weight: 600;
                    }
                    .course-actions {
                        display: flex;
                        gap: 6px;
                    }
                    .course-progress-section {
                        margin-bottom: 14px;
                    }
                    .course-progress-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 6px;
                        font-size: 13px;
                        color: var(--text-muted);
                        font-weight: 600;
                    }
                    .course-progress-bar {
                        height: 6px;
                        background: var(--bg-muted);
                        border-radius: 3px;
                        overflow: hidden;
                    }
                    .course-progress-fill {
                        height: 100%;
                        background: var(--primary);
                        transition: width 0.3s ease;
                    }
                    .course-modules {
                        margin-top: 12px;
                        padding-top: 12px;
                        border-top: 1px solid var(--border);
                    }
                    .module-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 8px 10px;
                        color: var(--text-muted);
                        border-radius: var(--radius-sm);
                        transition: background 0.12s ease;
                    }
                    .module-clickable {
                        cursor: pointer;
                        user-select: none;
                    }
                    .module-clickable:hover {
                        background: var(--bg-subtle);
                    }
                    .module-item.completed {
                        color: var(--success);
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
                const ok = await appConfirm(
                    'Ainda não tens categorias de Cadernos.\nQueres criar uma agora?',
                    { title: 'Criar categoria de cadernos?', okLabel: 'Criar' }
                );
                if (ok) {
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
            const ok = await appConfirm(
                'Desassociar este caderno do curso?\nO caderno não será eliminado, apenas desassociado.',
                { title: 'Desassociar caderno?', okLabel: 'Desassociar' }
            );
            if (!ok) return;

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

            const toolbar = `
                <div class="excel-toolbar">
                    <div class="excel-toolbar-info">
                        <i class="fas fa-table"></i>
                        <span>${items.length} tabela${items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="excel-toolbar-actions">
                        <button type="button" class="btn btn-secondary excel-import-btn" onclick="Templates.excel.openImportPicker()" title="Importar CSV como nova tabela">
                            <i class="fas fa-file-import"></i>
                            <span>Importar CSV</span>
                        </button>
                    </div>
                    <input type="file" id="excelImportInput" accept=".csv,text/csv" hidden onchange="Templates.excel.handleImportFile(event)">
                </div>
            `;

            const list = items.length === 0
                ? `<div class="empty-state">
                        <i class="fas fa-table"></i>
                        <h3>Sem tabelas</h3>
                        <p>Cria uma com "Novo" ou importa um ficheiro CSV.</p>
                   </div>`
                : `<div class="excel-list">
                    ${items.map(item => {
                        const metadata = item.metadata || {};
                        const data = metadata.data || [];
                        const headers = metadata.headers || [];

                        return `
                            <div class="excel-card">
                                <div class="excel-header">
                                    <h4 class="excel-title">
                                        <i class="fas fa-table"></i>
                                        <span>${escapeHtml(item.title)}</span>
                                    </h4>
                                    <div class="excel-actions">
                                        <button type="button" class="excel-action-btn" onclick="Templates.excel.exportToCsv(${item.id})" title="Exportar para CSV">
                                            <i class="fas fa-file-csv"></i>
                                            <span>CSV</span>
                                        </button>
                                        <button type="button" class="excel-action-btn" onclick="openItemEditor(${item.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                            <span>Editar</span>
                                        </button>
                                        <button type="button" class="excel-action-btn excel-action-danger" onclick="deleteItem(${item.id})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                            <span>Eliminar</span>
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
                                        ${data.length > 5 ? `<p class="excel-more-rows">+${data.length - 5} linhas…</p>` : ''}
                                    </div>
                                ` : '<p class="excel-empty-hint">Tabela vazia. Clica em "Editar" para adicionar dados.</p>'}
                            </div>
                        `;
                    }).join('')}
                </div>`;

            container.innerHTML = `
                ${toolbar}
                ${list}
                <style>
                    .excel-toolbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        margin-bottom: 16px;
                        padding: 10px 14px;
                        background: var(--bg-surface);
                        border: 1px solid var(--border);
                        border-radius: var(--radius-lg);
                        flex-wrap: wrap;
                    }
                    .excel-toolbar-info {
                        display: inline-flex; align-items: center; gap: 8px;
                        color: var(--text-muted); font-size: 13px; font-weight: 500;
                    }
                    .excel-toolbar-actions { display: inline-flex; gap: 8px; flex-wrap: wrap; }
                    .excel-import-btn {
                        display: inline-flex; align-items: center; gap: 8px;
                        height: var(--touch-min);
                        padding: 0 16px;
                    }
                    @media (min-width: 768px) {
                        .excel-import-btn { height: 38px; padding: 0 14px; font-size: 14px; }
                    }

                    .excel-list { display: flex; flex-direction: column; gap: 16px; }
                    .excel-card {
                        background: var(--bg-surface);
                        border: 1px solid var(--border);
                        border-radius: var(--radius-lg);
                        padding: 16px;
                    }
                    @media (min-width: 768px) { .excel-card { padding: 20px; } }
                    .excel-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 14px;
                        flex-wrap: wrap;
                    }
                    .excel-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: var(--text);
                        display: inline-flex;
                        align-items: center;
                        gap: 10px;
                        margin: 0;
                        word-break: break-word;
                        min-width: 0;
                        flex: 1;
                    }
                    .excel-title i { color: var(--primary); }
                    .excel-actions {
                        display: inline-flex;
                        gap: 6px;
                        flex-wrap: wrap;
                    }
                    .excel-action-btn {
                        display: inline-flex; align-items: center; gap: 6px;
                        padding: 0 12px;
                        height: 34px;
                        border-radius: var(--radius);
                        border: 1px solid var(--border);
                        background: var(--bg-surface);
                        color: var(--text-muted);
                        font-size: 13px; font-weight: 500;
                        cursor: pointer;
                        transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
                    }
                    .excel-action-btn:hover {
                        background: var(--bg-subtle);
                        color: var(--text);
                        border-color: var(--border-strong);
                    }
                    .excel-action-btn:focus-visible {
                        outline: 2px solid var(--focus-ring, var(--primary));
                        outline-offset: 1px;
                    }
                    .excel-action-btn.excel-action-danger:hover {
                        background: var(--danger-weak);
                        color: var(--danger);
                        border-color: var(--danger);
                    }
                    /* Mobile: ações em fila full-width para serem fáceis de tocar */
                    @media (max-width: 480px) {
                        .excel-actions { width: 100%; }
                        .excel-action-btn {
                            flex: 1 1 0;
                            justify-content: center;
                            min-height: var(--touch-min);
                        }
                    }

                    .excel-table-container {
                        overflow-x: auto;
                        border: 1px solid var(--border);
                        border-radius: var(--radius);
                    }
                    .excel-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 13px;
                        color: var(--text);
                        background: var(--bg-surface);
                    }
                    .excel-table th {
                        background: var(--bg-subtle);
                        color: var(--text);
                        padding: 10px 12px;
                        text-align: left;
                        font-weight: 600;
                        border-bottom: 1px solid var(--border);
                        white-space: nowrap;
                    }
                    .excel-table td {
                        padding: 9px 12px;
                        border-bottom: 1px solid var(--border);
                        color: var(--text);
                    }
                    .excel-table tbody tr:last-child td { border-bottom: none; }
                    .excel-table tbody tr:hover td { background: var(--bg-subtle); }
                    .excel-more-rows, .excel-empty-hint {
                        color: var(--text-muted);
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
                        <textarea id="excelData" class="form-control" rows="6" placeholder="Ex:\nRecurso 1, https://..., Cursos\nRecurso 2, https://..., Tools" style="font-family: var(--font-mono); font-size: 13px;">${metadata.data.map(row => row.map(cell => escapeHtml(cell)).join(', ')).join('\n')}</textarea>
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
        },

        // Abre o seletor de ficheiro CSV (delegado ao input hidden no toolbar)
        openImportPicker() {
            const input = document.getElementById('excelImportInput');
            if (!input) return;
            input.value = ''; // permite reimportar o mesmo ficheiro
            input.click();
        },

        async handleImportFile(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
            if (file.size > MAX_BYTES) {
                showNotification('Ficheiro demasiado grande (máx. 2 MB)', 'error');
                return;
            }

            try {
                const text = await file.text();
                const parsed = this._parseCsv(text);
                if (!parsed.headers.length && !parsed.data.length) {
                    showNotification('CSV vazio ou inválido', 'error');
                    return;
                }

                if (!AppState.currentCategory || !AppState.currentCategory.id) {
                    showNotification('Categoria não disponível', 'error');
                    return;
                }

                const baseName = (file.name || 'tabela importada').replace(/\.[^.]+$/, '');
                const itemData = {
                    id: null,
                    category_id: AppState.currentCategory.id,
                    title: baseName.slice(0, 100) || 'Tabela importada',
                    status: 'pending',
                    priority: 'medium',
                    metadata: {
                        headers: parsed.headers,
                        data: parsed.data,
                    },
                };

                const btn = document.querySelector('.excel-import-btn');
                if (btn && typeof setButtonLoading === 'function') setButtonLoading(btn, true);

                await saveItem(itemData);
                showNotification(`Importado "${itemData.title}" (${parsed.data.length} linhas)`, 'success');
                if (btn && typeof setButtonLoading === 'function') setButtonLoading(btn, false);
            } catch (err) {
                console.error('Erro ao importar CSV:', err);
                showNotification('Erro ao importar CSV', 'error');
            } finally {
                event.target.value = '';
            }
        },

        // Parser de CSV minimalista mas correcto: suporta aspas, escape de aspas
        // duplas, separadores , ou ; (auto-detetado), e quebras de linha em CRLF/LF.
        // Não depende de nenhuma biblioteca externa.
        _parseCsv(text) {
            // Remove BOM
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

            // Auto-deteta separador analisando a primeira linha não vazia
            const firstLine = (text.split(/\r?\n/).find(l => l.trim().length) || '');
            const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

            const rows = [];
            let row = [];
            let cell = '';
            let inQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (inQuotes) {
                    if (ch === '"') {
                        if (text[i + 1] === '"') { cell += '"'; i++; }
                        else { inQuotes = false; }
                    } else {
                        cell += ch;
                    }
                } else {
                    if (ch === '"') { inQuotes = true; }
                    else if (ch === sep) { row.push(cell); cell = ''; }
                    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
                    else if (ch === '\r') { /* ignora — \n trata o newline */ }
                    else { cell += ch; }
                }
            }
            // Último valor / última linha
            if (cell.length || row.length) { row.push(cell); rows.push(row); }

            // Remove linhas totalmente vazias
            const clean = rows.filter(r => r.some(c => String(c).trim() !== ''));
            if (!clean.length) return { headers: [], data: [] };

            const headers = clean[0].map(h => String(h).trim());
            const data = clean.slice(1).map(r => {
                // Normaliza para o mesmo nº de colunas dos headers
                const out = headers.map((_, i) => (r[i] != null ? String(r[i]) : ''));
                return out;
            });
            return { headers, data };
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
                /* Botão "← Cadernos" só em modo tablet/mobile da shell */
                #nbBackBtn { display: none !important; }

                /* ── Shell (mobile-first: coluna única até tablet landscape) ── */
                .nb-shell {
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: auto 1fr;
                    height: auto;
                    min-height: 70vh;
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background: var(--bg-surface);
                    font-family: var(--font);
                }
                .nb-shell .nb-sidebar {
                    max-height: 280px;
                    border-right: none;
                    border-bottom: 1px solid var(--border);
                }

                /* Tablet paisagem (1024–1366): sidebar 280px, altura ao viewport */
                @media (min-width: 1024px) and (max-width: 1366px) {
                    .nb-shell {
                        grid-template-columns: 280px 1fr;
                        grid-template-rows: 1fr;
                        height: 100%;
                        min-height: 0;
                        max-height: 100dvh;
                        border: none;
                        border-radius: 0;
                    }
                    .nb-shell .nb-sidebar {
                        max-height: none;
                        border-right: 1px solid var(--border);
                        border-bottom: none;
                    }
                }
                /* Desktop grande: coluna 300px (inalterado face ao legado) */
                @media (min-width: 1367px) {
                    .nb-shell {
                        grid-template-columns: 300px 1fr;
                        grid-template-rows: 1fr;
                        height: 100%;
                        min-height: 0;
                        border: none;
                        border-radius: 0;
                    }
                    .nb-shell .nb-sidebar {
                        max-height: none;
                        border-right: 1px solid var(--border);
                        border-bottom: none;
                    }
                }

                /* ── Sidebar ────────────────────────────── */
                .nb-sidebar {
                    background: var(--bg-surface);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .nb-sidebar-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    border-bottom: 1px solid var(--border);
                    flex-shrink: 0;
                }
                .nb-sidebar-logo {
                    width: 36px; height: 36px;
                    border-radius: 8px;
                    background: var(--primary-weak);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 16px; color: var(--primary);
                }
                .nb-sidebar-brand { font-size: 14px; font-weight: 700; color: var(--text); }
                .nb-sidebar-count { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

                /* search */
                .nb-search-wrap {
                    position: relative;
                    padding: 10px 12px;
                    flex-shrink: 0;
                }
                .nb-search-icon {
                    position: absolute; left: 24px; top: 50%; transform: translateY(-50%);
                    color: var(--text-subtle); font-size: 13px; pointer-events: none;
                }
                .nb-search {
                    width: 100%; box-sizing: border-box;
                    background: var(--bg-subtle);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 8px 12px 8px 32px;
                    color: var(--text); font-size: 13px;
                    outline: none; transition: border-color 0.12s ease, box-shadow 0.12s ease;
                }
                .nb-search::placeholder { color: var(--text-subtle); }
                .nb-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }

                /* list */
                .nb-list {
                    flex: 1; overflow-y: auto;
                    padding: 4px 8px 12px;
                    display: flex; flex-direction: column; gap: 2px;
                }
                .nb-list::-webkit-scrollbar { width: 6px; }
                .nb-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

                .nb-list-item {
                    position: relative;
                    display: flex; align-items: flex-start; gap: 10px;
                    padding: 10px 10px 10px 14px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.12s ease;
                    overflow: hidden;
                }
                .nb-list-item:hover { background: var(--bg-subtle); }
                .nb-list-item.active { background: var(--primary-weak); box-shadow: inset 3px 0 0 var(--primary); }

                .nb-item-accent {
                    position: absolute; left: 0; top: 0; bottom: 0;
                    width: 3px; border-radius: 0 2px 2px 0;
                }
                .nb-item-icon {
                    width: 28px; height: 28px; border-radius: 6px;
                    background: var(--bg-subtle);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 13px; flex-shrink: 0; margin-top: 2px;
                }
                .nb-item-body { flex: 1; min-width: 0; }
                .nb-item-title {
                    font-size: 13px; font-weight: 600; color: var(--text);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-bottom: 2px;
                }
                .nb-item-preview {
                    font-size: 11px; color: var(--text-muted);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-bottom: 3px;
                }
                .nb-item-date { font-size: 10px; color: var(--text-subtle); }
                .nb-item-date i { margin-right: 3px; }
                .nb-item-linked-course { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
                .nb-item-linked-course i { margin-right: 4px; }
                .nb-item-btns {
                    display: flex; flex-direction: column; gap: 4px;
                    opacity: 0; transition: opacity 0.15s ease; flex-shrink: 0;
                }
                .nb-list-item:hover .nb-item-btns,
                .nb-list-item.active .nb-item-btns { opacity: 1; }
                .nb-btn-sm {
                    background: transparent; border: none;
                    color: var(--text-muted); padding: 4px 6px;
                    border-radius: 6px; cursor: pointer; font-size: 11px;
                    transition: background 0.12s ease, color 0.12s ease;
                }
                .nb-btn-sm:hover { background: var(--bg-muted); color: var(--text); }
                .nb-btn-sm.danger:hover { background: var(--danger-weak); color: var(--danger); }

                /* ── Main content ───────────────────────── */
                .nb-main {
                    background: var(--bg);
                    overflow-y: auto;
                    display: flex; flex-direction: column;
                    position: relative;
                    min-width: 0;   /* permite shrink dentro do grid */
                }
                #nbContent { flex: 1; padding: 0; }
                .nb-content-inner {
                    padding: 16px;
                    max-width: 880px;
                    margin: 0 auto;
                    width: 100%;
                }
                @media (min-width: 768px)  { .nb-content-inner { padding: 24px; } }
                @media (min-width: 1280px) { .nb-content-inner { padding: 32px 40px; } }

                /* ── Notebook view ──────────────────────── */
                /* Mobile-first: título em cima, ações em baixo (sem sobreposição em tablet portrait) */
                .nb-view-header {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 14px;
                    padding: 0 0 16px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--border);
                }
                .nb-view-header .nb-view-title-block { min-width: 0; flex: 1 1 auto; }
                .nb-view-header #nbViewButtons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                /* Desktop / tablet landscape: lado-a-lado */
                @media (min-width: 1024px) {
                    .nb-view-header {
                        flex-direction: row;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 16px;
                    }
                    .nb-view-header #nbViewButtons { flex-shrink: 0; }
                }
                .nb-view-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
                .nb-view-title {
                    font-size: 22px; font-weight: 700; color: var(--text); margin: 0;
                    line-height: 1.25;
                    letter-spacing: -0.01em;
                    word-break: break-word;
                }
                @media (min-width: 1024px) { .nb-view-title { font-size: 24px; } }
                .nb-priority-pill {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 2px 10px; border-radius: var(--radius-pill);
                    font-size: 11px; font-weight: 600;
                }
                .nb-view-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; color: var(--text-muted); align-items: center; }
                .nb-view-meta i { margin-right: 5px; }
                .nb-view-linked-course {
                    background: var(--primary-weak);
                    color: var(--primary);
                    padding: 2px 10px;
                    border-radius: var(--radius-pill);
                    font-size: 12px;
                    font-weight: 600;
                }
                .nb-edit-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    padding: 8px 14px; border-radius: var(--radius);
                    background: var(--primary);
                    color: var(--primary-text); border: 1px solid var(--primary);
                    font-size: 13px; font-weight: 600;
                    cursor: pointer; white-space: nowrap;
                    min-height: var(--touch-min);
                    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
                }
                .nb-edit-btn:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
                .nb-edit-btn--success {
                    background: var(--success); border-color: var(--success); color: #fff;
                }
                .nb-edit-btn--success:hover {
                    background: var(--success); border-color: var(--success); filter: brightness(0.95);
                }
                .nb-edit-btn--ghost {
                    background: var(--bg-surface); color: var(--text); border-color: var(--border);
                }
                .nb-edit-btn--ghost:hover {
                    background: var(--bg-subtle); border-color: var(--border-strong); color: var(--text);
                }
                /* Em ecrãs muito estreitos (<480px) colapsa para ícones apenas */
                @media (max-width: 479px) {
                    .nb-edit-btn { padding: 8px 10px; }
                    .nb-edit-btn .nb-btn-text { display: none; }
                }

                /* view content */
                .nb-view-body {
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 16px;
                    min-height: 200px;
                    font-size: 15px; line-height: 1.7; color: var(--text);
                    overflow-wrap: anywhere;
                }
                @media (min-width: 768px) { .nb-view-body { padding: 20px 24px; } }
                .nb-view-body h1 { font-size: 22px; font-weight: 700; color: var(--text); margin: 18px 0 10px; }
                .nb-view-body h2 { font-size: 19px; font-weight: 700; color: var(--text); margin: 16px 0 8px; }
                .nb-view-body h3 { font-size: 16px; font-weight: 600; color: var(--text); margin: 12px 0 6px; }
                .nb-view-body p { margin: 8px 0; }
                .nb-view-body ul, .nb-view-body ol { padding-left: 22px; margin: 8px 0; }
                .nb-view-body li { margin: 4px 0; }
                .nb-view-body strong { color: var(--text); }
                .nb-view-body em { color: var(--text-muted); }
                .nb-view-body u { text-decoration-color: var(--primary); }
                .nb-view-body s { color: var(--text-subtle); }
                .nb-view-body code {
                    background: var(--bg-subtle); border: 1px solid var(--border);
                    border-radius: 4px; padding: 1px 6px;
                    font-family: var(--font-mono);
                    font-size: 13px; color: var(--danger);
                }
                .nb-view-body pre {
                    background: var(--bg-subtle); color: var(--text);
                    border: 1px solid var(--border);
                    border-radius: var(--radius); padding: 12px 16px;
                    font-family: var(--font-mono);
                    font-size: 13px; line-height: 1.6; overflow-x: auto;
                    margin: 12px 0;
                }
                .nb-view-body blockquote {
                    border-left: 3px solid var(--primary);
                    background: var(--bg-subtle); border-radius: 0 6px 6px 0;
                    padding: 10px 14px; margin: 12px 0; color: var(--text-muted);
                }
                .nb-view-body hr { border: none; border-top: 1px solid var(--border); margin: 18px 0; }
                .nb-view-body mark { background: #fff3a3; padding: 1px 4px; border-radius: 3px; }
                [data-theme="dark"] .nb-view-body mark { background: #433a12; color: #F2D87A; }
                .nb-view-body a { color: var(--primary); text-decoration: underline; }
                .nb-empty-hint {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 48px 20px;
                    color: var(--text-subtle); gap: 10px;
                }
                .nb-empty-hint i { font-size: 40px; opacity: 0.5; }
                .nb-empty-hint p { font-size: 14px; }

                /* ── Rich-text toolbar ──────────────────── */

                /* Wrapper único sticky que agrupa barra de acções + toolbar de
                   formatação em edit mode. Evita a sobreposição entre as duas
                   barras que tinham cada uma o seu próprio sticky/z-index. */
                #nbEditStickyShell {
                    position: sticky;
                    top: 0;
                    z-index: 200;
                    background: var(--bg-surface);
                    border-bottom: 2px solid var(--border);
                    display: none; /* mostrado apenas em edit mode via JS */
                }
                /* Linha 1: botões de acção */
                .nb-action-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-bottom: 1px solid var(--border);
                    flex-wrap: wrap;
                }
                /* Linha 2: toolbar de formatação */
                #notebookToolbarSlot {
                    background: transparent;
                    border-bottom: none;
                }
                .nb-toolbar {
                    display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
                    padding: 6px 12px;
                    border-radius: 0;
                }
                .nb-tool-sep {
                    width: 1px; height: 22px; background: var(--border); margin: 0 4px;
                }
                .nb-tool-label {
                    font-size: 11px; color: var(--text-muted); margin: 0 4px 0 2px;
                }
                .nb-tool {
                    display: flex; align-items: center; justify-content: center;
                    min-width: 30px; height: 30px; border-radius: 6px;
                    border: none; background: transparent; cursor: pointer;
                    color: var(--text-muted); font-size: 13px; font-weight: 600;
                    transition: background 0.12s ease, color 0.12s ease;
                    padding: 0 6px;
                }
                .nb-tool:hover { background: var(--bg-subtle); color: var(--text); }
                .nb-tool:focus-visible {
                    outline: 2px solid var(--focus-ring, var(--primary));
                    outline-offset: 1px;
                }
                .nb-tool.active {
                    background: var(--primary-weak);
                    color: var(--primary);
                    box-shadow: inset 0 0 0 1px var(--primary);
                }
                .nb-tool.active:hover {
                    background: var(--primary-weak);
                    color: var(--primary);
                }
                .nb-tool-select {
                    height: 30px; border: 1px solid var(--border); border-radius: 6px;
                    padding: 0 8px; font-size: 13px; color: var(--text);
                    background: var(--bg-surface); cursor: pointer; outline: none;
                    transition: border-color 0.12s ease, box-shadow 0.12s ease;
                }
                .nb-tool-select:hover { border-color: var(--border-strong); }
                .nb-tool-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
                .nb-color-btn {
                    width: 20px; height: 20px; border-radius: 50%;
                    border: 2px solid var(--bg-surface); box-shadow: 0 0 0 1px var(--border-strong);
                    cursor: pointer; display: inline-block;
                }

                /* editor area */
                .nb-editor-wrap { display: flex; flex-direction: column; }
                .nb-rich-editor {
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 18px 20px;
                    min-height: 360px; outline: none;
                    font-size: 15px; line-height: 1.7; color: var(--text);
                    overflow-y: auto;
                    margin-top: 14px;
                    transition: border-color 0.12s ease, box-shadow 0.12s ease;
                }
                .nb-rich-editor:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px var(--focus-ring);
                }
                .nb-rich-editor:empty::before {
                    content: attr(data-placeholder);
                    color: var(--text-subtle); pointer-events: none;
                }
                .nb-rich-editor h1 { font-size: 26px; font-weight: 700; color: var(--text); margin: 18px 0 8px; line-height: 1.25; }
                .nb-rich-editor h2 { font-size: 21px; font-weight: 700; color: var(--text); margin: 16px 0 6px; line-height: 1.3; }
                .nb-rich-editor h3 { font-size: 17px; font-weight: 700; color: var(--text); margin: 14px 0 4px; line-height: 1.35; }
                .nb-rich-editor p  { margin: 0 0 10px; }
                .nb-rich-editor ul, .nb-rich-editor ol { margin: 6px 0 12px; padding-left: 26px; }
                .nb-rich-editor li { margin: 2px 0; }
                .nb-rich-editor a  { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
                .nb-rich-editor a:hover { color: var(--primary-strong); }
                .nb-rich-editor hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
                .nb-rich-editor code { background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; font-family: var(--font-mono); font-size: 13px; color: var(--danger); }
                .nb-rich-editor pre {
                    background: var(--bg-subtle);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 12px 14px;
                    margin: 10px 0;
                    font-family: var(--font-mono);
                    font-size: 13px;
                    color: var(--text);
                    white-space: pre-wrap;
                    overflow-x: auto;
                }
                .nb-rich-editor pre code { background: transparent; border: none; padding: 0; color: inherit; }
                .nb-rich-editor blockquote {
                    border-left: 3px solid var(--primary);
                    background: var(--bg-subtle);
                    border-radius: 0 6px 6px 0;
                    padding: 10px 14px;
                    margin: 10px 0;
                    color: var(--text);
                }
                .nb-rich-editor mark { background: #fff3a3; color: #1f1d2b; padding: 0 2px; border-radius: 2px; }
                [data-theme="dark"] .nb-rich-editor mark { background: #433a12; color: #F2D87A; }

                /* bottom actions */
                .nb-editor-actions {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 0 0; flex-wrap: wrap;
                }
                .nb-word-count {
                    margin-left: auto; font-size: 12px; color: var(--text-muted);
                    display: flex; align-items: center; gap: 5px;
                }

                /* empty placeholder */
                .nb-select-hint {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; height: 100%;
                    color: var(--text-subtle); gap: 12px; padding: 48px;
                }
                .nb-select-hint i { font-size: 48px; opacity: 0.35; }

                /* ── Version history panel ────────────── */
                .nb-version-panel {
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    margin-bottom: 16px;
                    overflow: hidden;
                }
                .nb-version-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: var(--bg-subtle);
                    color: var(--text);
                    border-bottom: 1px solid var(--border);
                }
                .nb-version-header h3 {
                    margin: 0; font-size: 14px; font-weight: 600;
                    display: flex; align-items: center; gap: 8px;
                }
                .nb-version-close {
                    background: transparent; border: none;
                    color: var(--text-muted); width: 32px; height: 32px; border-radius: 6px;
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center; font-size: 13px;
                    transition: background 0.12s ease, color 0.12s ease;
                }
                .nb-version-close:hover { background: var(--bg-muted); color: var(--text); }
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
                .nb-version-item:hover { background: var(--bg-subtle); }
                .nb-version-icon {
                    width: 36px; height: 36px; border-radius: var(--radius);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; font-size: 14px;
                }
                .nb-version-info { flex: 1; min-width: 0; }
                .nb-version-info strong { font-size: 14px; color: var(--text); font-weight: 700; }
                .nb-version-badge {
                    display: inline-block;
                    padding: 1px 8px; border-radius: var(--radius-pill);
                    font-size: 10px; font-weight: 700;
                    margin-left: 6px;
                    vertical-align: middle;
                }
                .nb-version-badge.manual   { background: var(--primary-weak); color: var(--primary); }
                .nb-version-badge.autosave { background: var(--bg-muted);     color: var(--success); }
                .nb-version-date { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
                .nb-version-restore {
                    padding: 6px 12px; border-radius: var(--radius);
                    border: 1px solid var(--primary); background: var(--bg-surface);
                    color: var(--primary); font-weight: 600; font-size: 12px;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    transition: background 0.12s ease, color 0.12s ease;
                    min-height: 32px;
                }
                .nb-version-restore:hover { background: var(--primary); color: var(--primary-text); }

                /* Tablet retrato + telemóvel: lista ↔ detalhe (drawer lógico) */
                @media (max-width: 1023px) {
                    .nb-shell.nb-mobile {
                        display: flex;
                        flex-direction: column;
                        min-height: 70vh;
                    }
                    .nb-shell.nb-mobile .nb-sidebar {
                        max-height: none;
                        height: 100%;
                        border-bottom: none;
                        flex: 1 1 auto;
                    }
                    .nb-shell.nb-mobile .nb-main {
                        display: none;
                        flex-direction: column;
                        min-height: 60vh;
                    }
                    .nb-shell.nb-mobile--detail .nb-sidebar {
                        display: none;
                    }
                    .nb-shell.nb-mobile--detail .nb-main {
                        display: flex;
                    }
                    .nb-shell.nb-mobile--detail #nbBackBtn {
                        display: flex !important;
                        align-items: center;
                        gap: 8px;
                        padding: 12px 16px;
                        background: var(--bg-surface);
                        border: none;
                        border-bottom: 1px solid var(--border);
                        color: var(--primary);
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                        text-align: left;
                        font-family: var(--font);
                    }
                    .nb-shell.nb-mobile--detail #nbBackBtn:active {
                        background: var(--bg-subtle);
                    }
                    .nb-shell.nb-mobile--detail #nbBackBtn i { font-size: 12px; }
                }

                /* ── Slash menu ────────────────────────── */
                .nb-slash-menu {
                    position: fixed;
                    z-index: 9999;
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    width: 280px;
                    max-height: 360px;
                    overflow-y: auto;
                    font-family: var(--font);
                    padding: 6px 0 8px;
                }
                .nb-slash-header {
                    padding: 8px 12px 4px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--text-subtle);
                }
                .nb-slash-empty {
                    padding: 8px 16px 12px;
                    font-size: 12px;
                    color: var(--text-subtle);
                    font-style: italic;
                }
                .nb-slash-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 6px;
                    margin: 0 4px;
                    transition: background 0.1s ease;
                }
                .nb-slash-item:hover,
                .nb-slash-item.active {
                    background: var(--primary-weak);
                }
                .nb-slash-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: var(--bg-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    font-size: 13px;
                    flex-shrink: 0;
                }
                .nb-slash-info { min-width: 0; flex: 1; }
                .nb-slash-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text);
                }
                .nb-slash-desc {
                    font-size: 11px;
                    color: var(--text-subtle);
                }
                .nb-slash-item.hidden { display: none; }
                @media (max-width: 768px) {
                    .nb-slash-menu {
                        width: min(92vw, 360px);
                        max-height: 60vh;
                    }
                }

                /* ── Callouts ───────────────────────────── */
                .nb-callout {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    border-radius: var(--radius);
                    padding: 12px 16px;
                    margin: 10px 0;
                    border-left: 4px solid transparent;
                }
                .nb-callout--info    { background: #e8f4fd; border-left-color: #3498db; }
                .nb-callout--warning { background: #fef9e7; border-left-color: #f39c12; }
                .nb-callout--error   { background: #fdf2f2; border-left-color: #e74c3c; }
                .nb-callout--success { background: #eafaf1; border-left-color: #2ecc71; }
                [data-theme="dark"] .nb-callout--info    { background: rgba(52,152,219,0.15); }
                [data-theme="dark"] .nb-callout--warning { background: rgba(243,156,18,0.15); }
                [data-theme="dark"] .nb-callout--error   { background: rgba(231,76,60,0.15); }
                [data-theme="dark"] .nb-callout--success { background: rgba(46,204,113,0.15); }
                .nb-callout-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                    cursor: pointer;
                    user-select: none;
                    line-height: 1.5;
                }
                .nb-callout-text {
                    flex: 1;
                    outline: none;
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text);
                    min-height: 24px;
                    word-break: break-word;
                }
                .nb-callout-text:empty::before,
                .nb-callout-text:has(> br:only-child)::before {
                    content: attr(data-placeholder);
                    color: var(--text-subtle);
                    pointer-events: none;
                }
                /* Em modo de visualização (display) os callouts não devem
                   parecer editáveis nem terem cursor de texto. */
                .nb-view-body .nb-callout-icon { cursor: default; }

                /* ── Tabela inserida via slash ─────────── */
                .nb-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 12px 0;
                    font-size: 14px;
                }
                .nb-table th, .nb-table td {
                    border: 1px solid var(--border);
                    padding: 8px 12px;
                    text-align: left;
                    min-width: 80px;
                    vertical-align: top;
                    color: var(--text);
                }
                .nb-table th {
                    background: var(--bg-subtle);
                    font-weight: 700;
                }
                .nb-table th:focus, .nb-table td:focus {
                    outline: 2px solid var(--primary);
                    outline-offset: -2px;
                    background: var(--primary-weak);
                }

                /* ── Mobile toolbar (acima do teclado em edição) ── */
                .nb-mobile-toolbar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 500;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    background: var(--bg-surface);
                    border-top: 1px solid var(--border);
                    padding: 8px 10px;
                    padding-bottom: calc(8px + env(safe-area-inset-bottom));
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .nb-mtool {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: background 0.1s ease, color 0.1s ease;
                    font-family: var(--font);
                }
                .nb-mtool:active { background: var(--primary-weak); color: var(--primary); }
                .nb-mtool--slash {
                    font-family: var(--font-mono);
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--primary);
                }
                .nb-mtool--save {
                    margin-left: auto;
                    background: var(--primary);
                    color: var(--primary-text);
                    border-radius: 8px;
                    padding: 0 14px;
                    min-width: 48px;
                }
                .nb-mtool--save:active {
                    background: var(--primary);
                    filter: brightness(0.9);
                    color: var(--primary-text);
                }

                /* ── Sticky action bar (view + edit mode) ── */
                @media (min-width: 769px) {
                    .nb-sticky-bar {
                        position: sticky;
                        top: 0;
                        z-index: 200;
                        background: var(--bg-surface);
                        border-bottom: 1px solid var(--border);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 16px;
                        /* Inicialmente oculta — aparece via JS quando botões saem do viewport */
                        opacity: 0;
                        pointer-events: none;
                        transform: translateY(-100%);
                        transition: opacity 0.18s ease, transform 0.18s ease;
                    }
                    .nb-sticky-bar.visible {
                        opacity: 1;
                        pointer-events: auto;
                        transform: translateY(0);
                    }
                    .nb-sticky-bar .nb-sticky-title {
                        font-size: 14px;
                        font-weight: 600;
                        color: var(--text-muted);
                        flex: 1;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    /* .nb-editor-actions-sticky absorvida por #nbEditStickyShell */
                }
                </style>
            `;

            // Auto open first
            if (items.length > 0) {
                // Already rendered above
            }

            // Tablet retrato e telemóvel: navegação em duas camadas (lista → detalhe)
            if (window.innerWidth <= 1023) {
                this._initMobileNav();
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
            // Em modo de visualização não queremos áreas editáveis (heranças
            // do editor: callouts, tabelas, etc.). Removemos o atributo;
            // a estrutura visual mantém-se. Em modo de edição, _normalizeCallouts
            // volta a aplicar contenteditable nos sítios certos.
            htmlContent = htmlContent.replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, '');

            return `
                <div class="nb-view" data-notebook-id="${notebook.id}">

                    <!-- Sticky bar: aparece quando os botões originais saem do viewport -->
                    <div class="nb-sticky-bar" id="nbStickyViewBar">
                        <span class="nb-sticky-title">${escapeHtml(notebook.title)}</span>
                        <button class="nb-edit-btn" onclick="Templates.notebooks.enableEditMode()">
                            <i class="fas fa-pencil-alt"></i> <span class="nb-btn-text">Editar</span>
                        </button>
                        <button class="nb-edit-btn nb-edit-btn--success"
                                onclick="Templates.notebooks.saveCurrentVersion(${notebook.id})">
                            <i class="fas fa-download"></i> <span class="nb-btn-text">Guardar Versão</span>
                        </button>
                        <button class="nb-edit-btn nb-edit-btn--ghost"
                                onclick="Templates.notebooks.toggleVersionPanel()">
                            <i class="fas fa-history"></i> <span class="nb-btn-text">Versões</span>
                        </button>
                    </div>

                    <!-- Wrapper sticky unificado para edit mode:
                         linha 1 = botões de acção | linha 2 = toolbar de formatação.
                         Nunca se sobrepõem: vivem no mesmo sticky container. -->
                    <div id="nbEditStickyShell">
                        <div class="nb-action-row" id="nbEditActionBar">
                            <button class="btn btn-success" onclick="Templates.notebooks.saveInlineEdit()">
                                <i class="fas fa-save"></i> Guardar
                            </button>
                            <button class="btn btn-success" onclick="Templates.notebooks.saveVersionFromEditor(${notebook.id})" title="Guardar como versão sem sair da edição">
                                <i class="fas fa-download"></i> Guardar Versão
                            </button>
                            <button class="btn btn-secondary" onclick="Templates.notebooks.cancelEditMode()">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <span class="nb-word-count" id="nbWordCount">
                                <i class="fas fa-font"></i> 0 palavras
                            </span>
                        </div>
                        <div id="notebookToolbarSlot">
                            ${this._buildToolbar()}
                        </div>
                    </div>

                    <div class="nb-content-inner">
                        <div class="nb-view-header">
                            <div class="nb-view-title-block">
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
                            <div id="nbViewButtons">
                                <button class="nb-edit-btn" id="editNotebookBtn" onclick="Templates.notebooks.enableEditMode()">
                                    <i class="fas fa-pencil-alt"></i> <span class="nb-btn-text">Editar</span>
                                </button>
                                <button class="nb-edit-btn nb-edit-btn--success"
                                        onclick="Templates.notebooks.saveCurrentVersion(${notebook.id})" title="Guardar versão manual do conteúdo atual">
                                    <i class="fas fa-download"></i> <span class="nb-btn-text">Guardar Versão</span>
                                </button>
                                <button class="nb-edit-btn nb-edit-btn--ghost"
                                        onclick="Templates.notebooks.toggleVersionPanel()" title="Historial de versões">
                                    <i class="fas fa-history"></i> <span class="nb-btn-text">Versões</span>
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
                                    <div class="loading"><i class="fas fa-spinner fa-spin"></i><p>A carregar…</p></div>
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
                        </div>
                    </div>
                </div>
            `;
        },

        _buildToolbar() {
            // mousedown preventDefault em <button>: impede que o editor perca foco
            // ao clicar e mata a seleção. NÃO aplicamos isto a <select> porque
            // mousedown é o evento que abre o dropdown nativo.
            const md = `onmousedown="event.preventDefault()"`;
            return `
                <div class="nb-toolbar" id="nbToolbar">
                    <!-- Cabeçalhos -->
                    <select class="nb-tool-select" id="nbBlockSelect"
                            onmousedown="Templates.notebooks._stashSelection()"
                            onchange="Templates.notebooks._formatBlock(this.value)"
                            title="Estilo do parágrafo">
                        <option value="p">Parágrafo</option>
                        <option value="h1">Título 1</option>
                        <option value="h2">Título 2</option>
                        <option value="h3">Título 3</option>
                        <option value="pre">Código (bloco)</option>
                        <option value="blockquote">Citação</option>
                    </select>

                    <div class="nb-tool-sep"></div>

                    <!-- Estilo de texto -->
                    <button type="button" data-cmd="bold"          class="nb-tool" title="Negrito (Ctrl+B)"    ${md} onclick="Templates.notebooks._exec('bold')"><b>B</b></button>
                    <button type="button" data-cmd="italic"        class="nb-tool" title="Itálico (Ctrl+I)"    ${md} onclick="Templates.notebooks._exec('italic')"><i>I</i></button>
                    <button type="button" data-cmd="underline"     class="nb-tool" title="Sublinhado (Ctrl+U)" ${md} onclick="Templates.notebooks._exec('underline')"><u>U</u></button>
                    <button type="button" data-cmd="strikeThrough" class="nb-tool" title="Riscado"             ${md} onclick="Templates.notebooks._exec('strikeThrough')"><s>S</s></button>
                    <button type="button" data-cmd="hilite"        class="nb-tool" title="Destacar"            ${md} onclick="Templates.notebooks._highlight()"><i class="fas fa-highlighter"></i></button>
                    <button type="button" data-cmd="code"          class="nb-tool" title="Código inline"       ${md} onclick="Templates.notebooks._inlineCode()"><i class="fas fa-code"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Listas -->
                    <button type="button" data-cmd="insertUnorderedList" class="nb-tool" title="Lista com pontos" ${md} onclick="Templates.notebooks._exec('insertUnorderedList')"><i class="fas fa-list-ul"></i></button>
                    <button type="button" data-cmd="insertOrderedList"   class="nb-tool" title="Lista numerada"   ${md} onclick="Templates.notebooks._exec('insertOrderedList')"><i class="fas fa-list-ol"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Alinhamento -->
                    <button type="button" data-cmd="justifyLeft"   class="nb-tool" title="Alinhar à esquerda" ${md} onclick="Templates.notebooks._exec('justifyLeft')"><i class="fas fa-align-left"></i></button>
                    <button type="button" data-cmd="justifyCenter" class="nb-tool" title="Centrar"            ${md} onclick="Templates.notebooks._exec('justifyCenter')"><i class="fas fa-align-center"></i></button>
                    <button type="button" data-cmd="justifyRight"  class="nb-tool" title="Alinhar à direita"  ${md} onclick="Templates.notebooks._exec('justifyRight')"><i class="fas fa-align-right"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Extras -->
                    <button type="button" class="nb-tool" title="Inserir separador"    ${md} onclick="Templates.notebooks._exec('insertHorizontalRule')"><i class="fas fa-minus"></i></button>
                    <button type="button" class="nb-tool" title="Inserir link"         ${md} onclick="Templates.notebooks._insertLink()"><i class="fas fa-link"></i></button>
                    <button type="button" class="nb-tool" title="Remover formatação"   ${md} onclick="Templates.notebooks._clearFormatting()"><i class="fas fa-remove-format"></i></button>

                    <div class="nb-tool-sep"></div>

                    <!-- Cores de texto -->
                    <span class="nb-tool-label">Cor:</span>
                    ${['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6'].map(c =>
                        `<span class="nb-color-btn" style="background:${c}" title="${c}" onmousedown="event.preventDefault();Templates.notebooks._setFontColor('${c}')"></span>`
                    ).join('')}
                    <span class="nb-color-btn" style="background:var(--text)" title="Padrão" onmousedown="event.preventDefault();Templates.notebooks._resetFontColor()"></span>
                </div>
            `;
        },

        // Guarda a seleção atual antes de o <select> abrir o dropdown nativo,
        // para podermos restaurá-la quando o utilizador escolhe um estilo
        // (clicar no select tira o foco ao editor → seleção perde-se).
        _stashSelection() {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) {
                this._savedRange = null;
                return;
            }
            const editor = this._getEditor();
            if (!editor) return;
            const range = sel.getRangeAt(0);
            // só guarda se a seleção estiver dentro do editor
            if (editor.contains(range.commonAncestorContainer) || range.commonAncestorContainer === editor) {
                this._savedRange = range.cloneRange();
            }
        },

        _restoreSelection() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            if (this._savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(this._savedRange);
            }
        },

        _exec(command, value = null) {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            document.execCommand(command, false, value);
            this._updateWordCount();
            this._refreshToolbarState();
        },

        // Aplica cor ao texto selecionado usando <span style="color:"> para
        // garantir cross-browser (execCommand('foreColor') gera <font> em
        // Safari/Firefox que o sanitizer PHP pode descartar).
        _setFontColor(color) {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount || sel.isCollapsed) return;
            const range = sel.getRangeAt(0);
            // Tenta execCommand primeiro (Chrome gera <span style> correctamente)
            const ok = document.execCommand('foreColor', false, color);
            // Se o resultado for um <font>, converte para <span style>
            this._normalizeFontTags(editor);
            this._updateWordCount();
            this._refreshToolbarState();
        },

        // Remove cor do texto selecionado sem apagar outra formatação.
        _resetFontColor() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            // Percorre a seleção e remove atributo color / style.color nos nós
            document.execCommand('foreColor', false, '#000000');
            // Substitui por herança (remove o style inline de cor)
            const sel = window.getSelection();
            if (sel && sel.rangeCount && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const frag = range.cloneContents();
                frag.querySelectorAll('[style]').forEach(el => {
                    el.style.color = '';
                    if (!el.getAttribute('style').trim()) el.removeAttribute('style');
                });
                frag.querySelectorAll('font[color]').forEach(el => {
                    el.removeAttribute('color');
                });
            }
            this._normalizeFontTags(editor);
            this._refreshToolbarState();
        },

        // Converte todos os <font color="…"> dentro de `root` em
        // <span style="color:…">, preservando filhos.
        _normalizeFontTags(root) {
            root.querySelectorAll('font[color]').forEach(font => {
                const span = document.createElement('span');
                const color = font.getAttribute('color');
                if (color) span.style.color = color;
                while (font.firstChild) span.appendChild(font.firstChild);
                font.parentNode.replaceChild(span, font);
            });
        },

        _formatBlock(tag) {
            const select = document.getElementById('nbBlockSelect');
            // Restaura a seleção que estava antes do dropdown abrir (senão o
            // formatBlock aplicar-se-ia ao elemento <select>, não ao editor).
            this._restoreSelection();
            const value = (!tag || tag === 'p') ? 'p' : tag;
            // O Chrome aceita o nome direto; alguns browsers exigem <tag>.
            try {
                document.execCommand('formatBlock', false, value);
            } catch (_) {
                document.execCommand('formatBlock', false, '<' + value + '>');
            }
            this._updateWordCount();
            this._refreshToolbarState();
            // Reset para "Parágrafo" só fica bem depois de já termos aplicado
            if (select) select.value = 'p';
        },

        _highlight() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            // toggle: se já está destacado, remove a cor de fundo
            const current = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor');
            const isHighlighted = current && current !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)$/.test(current);
            document.execCommand('hiliteColor', false, isHighlighted ? 'transparent' : '#fff3a3');
            this._updateWordCount();
            this._refreshToolbarState();
        },

        _insertLink() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            const url = window.prompt('URL do link:', 'https://');
            if (!url) return;
            // Validação básica para evitar javascript: ou data:
            const safe = /^(https?:|mailto:|#)/i.test(url) ? url : 'https://' + url.replace(/^\/+/, '');
            document.execCommand('createLink', false, safe);
        },

        _clearFormatting() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            document.execCommand('removeFormat');
            // formatBlock para 'p' garante que cabeçalhos/quotes voltam a parágrafo
            document.execCommand('formatBlock', false, 'p');
            this._refreshToolbarState();
        },

        _inlineCode() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);

            // Toggle: se a seleção já está dentro de um <code>, desfaz; senão envolve
            const codeAncestor = (function findCode(node) {
                while (node && node !== editor) {
                    if (node.nodeType === 1 && node.tagName === 'CODE') return node;
                    node = node.parentNode;
                }
                return null;
            })(range.commonAncestorContainer);

            if (codeAncestor) {
                const parent = codeAncestor.parentNode;
                while (codeAncestor.firstChild) parent.insertBefore(codeAncestor.firstChild, codeAncestor);
                parent.removeChild(codeAncestor);
            } else if (!range.collapsed) {
                const code = document.createElement('code');
                try {
                    range.surroundContents(code);
                } catch(e) {
                    const frag = range.extractContents();
                    code.appendChild(frag);
                    range.insertNode(code);
                }
            }
            this._updateWordCount();
            this._refreshToolbarState();
        },

        // Atualiza visualmente os botões da toolbar com base na seleção actual.
        // Chamado em selectionchange, keyup e após cada execCommand.
        _refreshToolbarState() {
            // No editor mobile: actualiza botões da toolbar do teclado e sai
            if (this._mobileEditorActive) {
                this._nbeUpdateKbToolbarState();
                return;
            }
            const toolbar = document.getElementById('nbToolbar');
            if (!toolbar) return;
            const editor = this._getEditor();
            if (!editor) return;

            // Só queremos refletir estado quando a seleção está dentro do editor
            const sel = window.getSelection();
            const inEditor = sel && sel.rangeCount &&
                (editor.contains(sel.anchorNode) || sel.anchorNode === editor);

            const cmds = ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight'];
            cmds.forEach(cmd => {
                const btn = toolbar.querySelector(`.nb-tool[data-cmd="${cmd}"]`);
                if (!btn) return;
                let active = false;
                if (inEditor) {
                    try { active = document.queryCommandState(cmd); } catch (_) {}
                }
                btn.classList.toggle('active', active);
            });

            // Highlight (hiliteColor): considera ativo se há cor de fundo não-transparente
            const hiliteBtn = toolbar.querySelector('.nb-tool[data-cmd="hilite"]');
            if (hiliteBtn) {
                let activeH = false;
                if (inEditor) {
                    const c = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor');
                    activeH = !!c && c !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)$/.test(c) && !/^#?fff(fff)?$/i.test(c);
                }
                hiliteBtn.classList.toggle('active', activeH);
            }

            // Inline code: ativo se a seleção está dentro de um <code>
            const codeBtn = toolbar.querySelector('.nb-tool[data-cmd="code"]');
            if (codeBtn && inEditor && sel.anchorNode) {
                let n = sel.anchorNode;
                let inCode = false;
                while (n && n !== editor) {
                    if (n.nodeType === 1 && n.tagName === 'CODE') { inCode = true; break; }
                    n = n.parentNode;
                }
                codeBtn.classList.toggle('active', inCode);
            }

            // Block select: reflete o tipo de bloco onde está o cursor
            const blockSelect = document.getElementById('nbBlockSelect');
            if (blockSelect && inEditor) {
                let blockTag = 'p';
                try {
                    const v = document.queryCommandValue('formatBlock');
                    if (v) blockTag = String(v).toLowerCase().replace(/[<>]/g, '');
                } catch (_) {}
                const allowed = ['p','h1','h2','h3','pre','blockquote'];
                if (!allowed.includes(blockTag)) {
                    // pode vir como "div" ou outros — vasculhamos manualmente
                    let n = sel.anchorNode;
                    while (n && n !== editor) {
                        if (n.nodeType === 1 && allowed.includes(n.tagName.toLowerCase())) {
                            blockTag = n.tagName.toLowerCase(); break;
                        }
                        n = n.parentNode;
                    }
                }
                blockSelect.value = allowed.includes(blockTag) ? blockTag : 'p';
            }
        },

        _onEditorInput() {
            this._updateWordCount();
            if (this._autosaveTrigger) this._autosaveTrigger();
            if (this._nbeAutoSaveTrigger) this._nbeAutoSaveTrigger();
            if (this._slashMenuOpen) this._updateSlashFilter();
        },

        _editorKeydown(e) {
            // 1) Slash menu aberto → captura navegação antes de tudo o resto
            if (this._slashMenuOpen) {
                if (e.key === 'ArrowDown') { e.preventDefault(); this._navigateSlashMenu(1);  return; }
                if (e.key === 'ArrowUp')   { e.preventDefault(); this._navigateSlashMenu(-1); return; }
                if (e.key === 'Enter')     { e.preventDefault(); this._selectActiveSlashItem(); return; }
                if (e.key === 'Escape')    { e.preventDefault(); this._closeSlashMenu();        return; }
                // backspace que apague o "/" deve também fechar o menu
                if (e.key === 'Backspace') {
                    setTimeout(() => this._maybeCloseSlashIfTriggerGone(), 0);
                }
            }

            // 2) Pressionar "/" abre o slash menu (depois do caractere ser inserido)
            if (e.key === '/' && !this._slashMenuOpen) {
                setTimeout(() => this._maybeOpenSlashMenu(), 0);
                // Não preventDefault — deixamos o "/" ser inserido normalmente.
            }

            // 3) Markdown shortcuts ao pressionar espaço (#, ##, -, 1., >, etc.)
            if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !this._slashMenuOpen) {
                if (this._maybeApplyMarkdownShortcut(e)) return;
            }

            // 4) Enter dentro de um callout: se o cursor está no fim do texto,
            //    sai do callout e cria um <p> abaixo.
            if (e.key === 'Enter' && !e.shiftKey && !this._slashMenuOpen) {
                if (this._handleCalloutEnter(e)) return;
            }

            // 5) Comportamento existente: Ctrl+S guarda
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveInlineEdit(); }
        },

        // ─────────────────────────────────────────────────────────────────
        // Markdown auto-shortcuts
        // ─────────────────────────────────────────────────────────────────
        // Devolve true se aplicou alguma transformação (e fez preventDefault).
        _maybeApplyMarkdownShortcut(e) {
            const editor = this._getEditor();
            if (!editor) return false;

            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return false;
            const range = sel.getRangeAt(0);
            if (!range.collapsed) return false;

            const node = range.startContainer;
            if (node.nodeType !== Node.TEXT_NODE) return false;
            // Tem de estar dentro do editor
            if (!editor.contains(node)) return false;

            const offset = range.startOffset;
            const textBefore = node.textContent.slice(0, offset);

            // Só ativa no início de uma linha/bloco — evita transformar
            // "ver isto # algo" em h1 quando o utilizador escreve uma frase normal.
            if (!this._isAtStartOfBlock(node)) return false;

            // Determina trigger
            let action = null, triggerLen = 0;
            if      (textBefore === '#')   { action = 'h1';         triggerLen = 1; }
            else if (textBefore === '##')  { action = 'h2';         triggerLen = 2; }
            else if (textBefore === '###') { action = 'h3';         triggerLen = 3; }
            else if (textBefore === '-' || textBefore === '*' || textBefore === '+') {
                                              action = 'ul';         triggerLen = 1;
            }
            else if (textBefore === '1.')  { action = 'ol';         triggerLen = 2; }
            else if (textBefore === '>')   { action = 'blockquote'; triggerLen = 1; }
            else if (textBefore === '---') { action = 'hr';         triggerLen = 3; }
            else if (textBefore === '```') { action = 'pre';        triggerLen = 3; }

            if (!action) return false;

            e.preventDefault();

            // Apaga o trigger
            const delRange = document.createRange();
            delRange.setStart(node, offset - triggerLen);
            delRange.setEnd(node, offset);
            delRange.deleteContents();

            // Recoloca o cursor no sítio onde o trigger estava
            const after = document.createRange();
            after.setStart(node, Math.max(0, offset - triggerLen));
            after.collapse(true);
            sel.removeAllRanges();
            sel.addRange(after);

            // Aplica a transformação
            if (['h1','h2','h3','blockquote','pre'].includes(action)) {
                this._formatBlock(action);
            } else if (action === 'ul') {
                this._exec('insertUnorderedList');
            } else if (action === 'ol') {
                this._exec('insertOrderedList');
            } else if (action === 'hr') {
                this._exec('insertHorizontalRule');
                // Garante uma linha nova editável a seguir ao <hr>
                this._exec('formatBlock', 'p');
            }
            return true;
        },

        // Verifica se o nó de texto é o primeiro nó significativo do bloco
        // que o contém — o trigger só vale no início de uma linha.
        _isAtStartOfBlock(textNode) {
            const blockTags = new Set(['P','DIV','LI','BLOCKQUOTE','H1','H2','H3','H4','H5','H6','PRE','TD','TH']);
            let n = textNode;
            // Se há um irmão antes, só é "início" se esse irmão for vazio (br/whitespace)
            while (n) {
                let prev = n.previousSibling;
                while (prev) {
                    if (prev.nodeType === Node.TEXT_NODE && prev.textContent.trim() !== '') return false;
                    if (prev.nodeType === Node.ELEMENT_NODE && prev.tagName !== 'BR') return false;
                    prev = prev.previousSibling;
                }
                const parent = n.parentNode;
                if (!parent) return false;
                if (blockTags.has(parent.tagName) || parent.id === 'notebookRichEditor') return true;
                n = parent;
            }
            return false;
        },

        // ─────────────────────────────────────────────────────────────────
        // Callouts: lidar com Enter no fim
        // ─────────────────────────────────────────────────────────────────
        _handleCalloutEnter(e) {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return false;

            // Procura .nb-callout-text como ancestral do cursor
            let node = sel.anchorNode;
            let calloutText = null;
            while (node) {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('nb-callout-text')) {
                    calloutText = node;
                    break;
                }
                node = node.parentNode;
            }
            if (!calloutText) return false;

            // Verifica se o cursor está no fim do texto do callout
            const range = sel.getRangeAt(0);
            const test = range.cloneRange();
            test.selectNodeContents(calloutText);
            test.setStart(range.endContainer, range.endOffset);
            const tail = test.toString();
            // Se há texto não vazio depois do cursor, deixa o Enter normal
            if (tail.replace(/\s+$/g, '') !== '') return false;

            e.preventDefault();
            const callout = calloutText.closest('.nb-callout');
            if (!callout) return false;

            // Cria <p><br></p> imediatamente a seguir e move cursor para lá
            const p = document.createElement('p');
            p.appendChild(document.createElement('br'));
            callout.parentNode.insertBefore(p, callout.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            return true;
        },

        // ═══════════════════════════════════════════════════════════════════
        // SLASH MENU — opções de blocos com filtro em tempo real
        // ═══════════════════════════════════════════════════════════════════

        // Estado interno
        _slashMenuOpen: false,
        _slashRange: null,        // range a apontar para a posição do "/"
        _slashOutsideHandler: null,
        _slashFilter: '',

        _slashItems() {
            return [
                { action: 'h1',               icon: 'fa-heading',               label: 'Título 1',         desc: 'Cabeçalho grande',     keywords: 'titulo h1 heading t1' },
                { action: 'h2',               icon: 'fa-heading',               label: 'Título 2',         desc: 'Cabeçalho médio',      keywords: 'titulo h2 heading t2' },
                { action: 'h3',               icon: 'fa-heading',               label: 'Título 3',         desc: 'Cabeçalho pequeno',    keywords: 'titulo h3 heading t3' },
                { action: 'ul',               icon: 'fa-list-ul',               label: 'Lista',            desc: 'Lista com pontos',     keywords: 'lista ul bullet' },
                { action: 'ol',               icon: 'fa-list-ol',               label: 'Lista numerada',   desc: 'Lista com números',    keywords: 'lista ol numero numerada' },
                { action: 'blockquote',       icon: 'fa-quote-right',           label: 'Citação',          desc: 'Bloco de citação',     keywords: 'citacao quote blockquote' },
                { action: 'pre',              icon: 'fa-code',                  label: 'Código',           desc: 'Bloco de código',      keywords: 'codigo code pre' },
                { action: 'hr',               icon: 'fa-minus',                 label: 'Separador',        desc: 'Linha divisória',      keywords: 'hr separador linha divisoria' },
                { action: 'callout-info',     icon: 'fa-info-circle',           label: 'Info',             desc: 'Nota informativa azul',keywords: 'info callout azul nota' },
                { action: 'callout-warning',  icon: 'fa-exclamation-triangle',  label: 'Aviso',            desc: 'Alerta amarelo',       keywords: 'aviso warning callout amarelo alerta' },
                { action: 'callout-error',    icon: 'fa-times-circle',          label: 'Erro',             desc: 'Alerta vermelho',      keywords: 'erro error callout vermelho' },
                { action: 'callout-success',  icon: 'fa-check-circle',          label: 'Sucesso',          desc: 'Confirmação verde',    keywords: 'sucesso success callout verde' },
                { action: 'table',            icon: 'fa-table',                 label: 'Tabela',           desc: 'Tabela editável 2×3',  keywords: 'tabela table' },
                { action: 'template-aula',    icon: 'fa-graduation-cap',        label: 'Template: Aula',   desc: 'Estrutura de aula',    keywords: 'aula template aula notas' },
                { action: 'template-resumo',  icon: 'fa-book',                  label: 'Template: Resumo', desc: 'Estrutura de resumo',  keywords: 'resumo template' },
                { action: 'template-reuniao', icon: 'fa-users',                 label: 'Template: Reunião',desc: 'Estrutura de reunião', keywords: 'reuniao template meeting' },
                { action: 'template-bug',     icon: 'fa-bug',                   label: 'Template: Bug',    desc: 'Estrutura de bug report', keywords: 'bug template issue erro' },
            ];
        },

        // Chamado num setTimeout(0) depois de o utilizador pressionar "/".
        // Confirma que o "/" foi mesmo inserido no texto e abre o menu.
        _maybeOpenSlashMenu() {
            const editor = this._getEditor();
            if (!editor) return;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            if (node.nodeType !== Node.TEXT_NODE) return;
            if (!editor.contains(node)) return;

            const offset = range.startOffset;
            if (offset === 0) return;
            if (node.textContent[offset - 1] !== '/') return;

            // O "/" só vale como trigger se vier no início da linha ou
            // depois de um espaço — assim "https://" ou "a/b" não abrem o menu.
            if (offset >= 2) {
                const prevChar = node.textContent[offset - 2];
                if (!/\s/.test(prevChar)) return;
            }

            // Guarda a posição do "/" — vai servir para apagar "/filtro" depois
            this._slashRange = document.createRange();
            this._slashRange.setStart(node, offset - 1);
            this._slashRange.setEnd(node, offset - 1);

            this._openSlashMenu();
        },

        _openSlashMenu() {
            if (this._slashMenuOpen) return;
            this._slashMenuOpen = true;
            this._slashFilter = '';

            // No editor mobile a UX de slash é o bottom sheet de blocos (com pesquisa),
            // não o menu flutuante desktop.
            if (this._mobileEditorActive) {
                this._openMobileBlockSheet(true);
                return;
            }

            const items = this._slashItems();
            const menu = document.createElement('div');
            menu.id = 'nbSlashMenu';
            menu.className = 'nb-slash-menu';
            menu.innerHTML = `
                <div class="nb-slash-header">Blocos</div>
                <div class="nb-slash-items">
                    ${items.map((it, i) => `
                        <div class="nb-slash-item ${i === 0 ? 'active' : ''}"
                             data-action="${it.action}"
                             data-label="${(it.label || '').toLowerCase()}"
                             data-keywords="${(it.keywords || '').toLowerCase()}"
                             onmousedown="event.preventDefault()"
                             onclick="Templates.notebooks._executeSlashAction('${it.action}')">
                            <div class="nb-slash-icon"><i class="fas ${it.icon}"></i></div>
                            <div class="nb-slash-info">
                                <div class="nb-slash-label">${it.label}</div>
                                <div class="nb-slash-desc">${it.desc}</div>
                            </div>
                        </div>
                    `).join('')}
                    <div class="nb-slash-empty" style="display:none;">Sem resultados</div>
                </div>
            `;
            document.body.appendChild(menu);

            this._positionSlashMenu(menu);

            // Fecha ao clicar fora (mousedown para apanhar antes do focus se mover)
            this._slashOutsideHandler = (ev) => {
                if (!menu.contains(ev.target)) this._closeSlashMenu();
            };
            // Atrasa a ligação para o próprio mousedown que originou o "/" não fechar imediatamente.
            setTimeout(() => {
                if (this._slashMenuOpen) {
                    document.addEventListener('mousedown', this._slashOutsideHandler);
                }
            }, 0);
        },

        _positionSlashMenu(menu) {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                // Centrado horizontalmente, 30% do topo
                menu.style.left = '50%';
                menu.style.top  = '30%';
                menu.style.transform = 'translate(-50%, 0)';
                return;
            }
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) {
                menu.style.left = '50%';
                menu.style.top  = '30%';
                menu.style.transform = 'translate(-50%, 0)';
                return;
            }
            const range = sel.getRangeAt(0).cloneRange();
            range.collapse(true);
            const rect = range.getBoundingClientRect();
            // Se o range não tiver dimensão (cursor entre nós), usa o editor
            const editor = this._getEditor();
            const editorRect = editor ? editor.getBoundingClientRect() : { left: 100, bottom: 100 };
            const x = (rect && (rect.left || rect.right)) ? rect.left : editorRect.left;
            const y = (rect && rect.bottom) ? rect.bottom : editorRect.bottom;

            // Clamp à viewport
            const menuW = 280, menuH = 360;
            const left = Math.min(window.innerWidth - menuW - 12, Math.max(12, x));
            const top  = Math.min(window.innerHeight - menuH - 12, Math.max(12, y + 6));
            menu.style.left = left + 'px';
            menu.style.top  = top + 'px';
            menu.style.transform = 'none';
        },

        _closeSlashMenu() {
            const menu = document.getElementById('nbSlashMenu');
            if (menu) menu.remove();
            if (this._slashOutsideHandler) {
                document.removeEventListener('mousedown', this._slashOutsideHandler);
                this._slashOutsideHandler = null;
            }
            this._slashMenuOpen = false;
            this._slashRange = null;
            this._slashFilter = '';
        },

        _navigateSlashMenu(direction) {
            const menu = document.getElementById('nbSlashMenu');
            if (!menu) return;
            const visible = Array.from(menu.querySelectorAll('.nb-slash-item:not(.hidden)'));
            if (!visible.length) return;
            let idx = visible.findIndex(el => el.classList.contains('active'));
            if (idx === -1) idx = 0;
            idx = (idx + direction + visible.length) % visible.length;
            visible.forEach(el => el.classList.remove('active'));
            visible[idx].classList.add('active');
            visible[idx].scrollIntoView({ block: 'nearest' });
        },

        _selectActiveSlashItem() {
            const menu = document.getElementById('nbSlashMenu');
            if (!menu) return;
            const active = menu.querySelector('.nb-slash-item.active:not(.hidden)') ||
                           menu.querySelector('.nb-slash-item:not(.hidden)');
            if (active) this._executeSlashAction(active.getAttribute('data-action'));
        },

        // Lê o texto digitado entre o "/" e o cursor e usa-o como filtro.
        _updateSlashFilter() {
            if (!this._slashMenuOpen || !this._slashRange) return;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;

            const startNode = this._slashRange.startContainer;
            const startOffset = this._slashRange.startOffset;
            const endRange = sel.getRangeAt(0);

            // Se o cursor saiu do mesmo text node ou ficou antes do "/", fecha
            if (endRange.endContainer !== startNode || endRange.endOffset <= startOffset) {
                this._closeSlashMenu();
                return;
            }

            const slice = startNode.textContent.slice(startOffset + 1, endRange.endOffset);
            // Espaço termina o filtro → fecha
            if (/\s/.test(slice)) {
                this._closeSlashMenu();
                return;
            }
            this._slashFilter = slice.toLowerCase();
            this._filterSlashItems();
        },

        _filterSlashItems() {
            const menu = document.getElementById('nbSlashMenu');
            if (!menu) return;
            const q = this._slashFilter || '';
            const items = menu.querySelectorAll('.nb-slash-item');
            let firstVisible = null;
            let visibleCount = 0;
            items.forEach(el => {
                const label = el.getAttribute('data-label') || '';
                const kw = el.getAttribute('data-keywords') || '';
                const match = !q || label.includes(q) || kw.includes(q);
                el.classList.toggle('hidden', !match);
                el.classList.remove('active');
                if (match) {
                    if (!firstVisible) firstVisible = el;
                    visibleCount++;
                }
            });
            if (firstVisible) firstVisible.classList.add('active');
            const empty = menu.querySelector('.nb-slash-empty');
            if (empty) empty.style.display = visibleCount ? 'none' : 'block';
        },

        // Se o "/" original deixou de existir (ex: utilizador apagou), fecha o menu.
        _maybeCloseSlashIfTriggerGone() {
            if (!this._slashMenuOpen || !this._slashRange) return;
            const node = this._slashRange.startContainer;
            const off = this._slashRange.startOffset;
            const ch = (node.textContent || '')[off];
            if (ch !== '/') this._closeSlashMenu();
        },

        _executeSlashAction(action) {
            const editor = this._getEditor();
            if (!editor) { this._closeSlashMenu(); return; }
            editor.focus();

            const sel = window.getSelection();
            if (this._slashRange && sel && sel.rangeCount) {
                const startNode = this._slashRange.startContainer;
                const startOff  = this._slashRange.startOffset;
                const cur = sel.getRangeAt(0);
                if (cur.endContainer === startNode && cur.endOffset >= startOff) {
                    const del = document.createRange();
                    del.setStart(startNode, startOff);
                    del.setEnd(cur.endContainer, cur.endOffset);
                    del.deleteContents();
                    const c = document.createRange();
                    c.setStart(startNode, startOff);
                    c.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(c);
                }
            }

            this._closeSlashMenu();

            if (['h1','h2','h3','blockquote','pre'].includes(action)) {
                this._formatBlock(action);
            } else if (action === 'ul') {
                this._exec('insertUnorderedList');
            } else if (action === 'ol') {
                this._exec('insertOrderedList');
            } else if (action === 'hr') {
                this._exec('insertHorizontalRule');
                this._exec('formatBlock', 'p');
            } else if (action.startsWith('callout-')) {
                this._insertCallout(action.slice('callout-'.length));
            } else if (action === 'table') {
                this._insertTable();
            } else if (action.startsWith('template-')) {
                this._insertTemplate(action.slice('template-'.length));
            }
        },

        // Abre o slash menu a partir do botão "/" da toolbar mobile:
        // garante focus no editor e abre o menu na posição actual do cursor,
        // sem exigir que o "/" venha após espaço (foi clique intencional).
        _openSlashFromButton() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.focus();

            // Se não há seleção dentro do editor, posiciona o cursor no fim
            let sel = window.getSelection();
            if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
                const r = document.createRange();
                r.selectNodeContents(editor);
                r.collapse(false);
                sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(r);
            }

            // Insere "/" para servir de marcador (será apagado em _executeSlashAction)
            document.execCommand('insertText', false, '/');

            // Captura a posição do "/" e abre o menu directamente
            setTimeout(() => {
                const s = window.getSelection();
                if (!s || !s.rangeCount) return;
                const r = s.getRangeAt(0);
                const node = r.startContainer;
                const off = r.startOffset;
                if (node.nodeType === Node.TEXT_NODE && off > 0 && node.textContent[off - 1] === '/') {
                    this._slashRange = document.createRange();
                    this._slashRange.setStart(node, off - 1);
                    this._slashRange.setEnd(node, off - 1);
                }
                this._openSlashMenu();
            }, 0);
        },

        // ═══════════════════════════════════════════════════════════════════
        // CALLOUTS
        // ═══════════════════════════════════════════════════════════════════

        _calloutEmojis: {
            info:    '💡',
            warning: '⚠️',
            error:   '❌',
            success: '✅',
        },

        _insertCallout(variant) {
            if (!['info','warning','error','success'].includes(variant)) variant = 'info';
            const emoji = this._calloutEmojis[variant];
            // contenteditable="false" no wrapper para que o cursor não pare lá;
            // contenteditable="true" só dentro de .nb-callout-text para o utilizador escrever.
            const html = `<div class="nb-callout nb-callout--${variant}" contenteditable="false" data-variant="${variant}">` +
                            `<span class="nb-callout-icon" contenteditable="false" onclick="Templates.notebooks._toggleCalloutEmoji(this)">${emoji}</span>` +
                            `<div class="nb-callout-text" contenteditable="true" data-placeholder="Escreve aqui..."><br></div>` +
                         `</div><p><br></p>`;
            document.execCommand('insertHTML', false, html);

            // Move o cursor para dentro do callout-text
            setTimeout(() => {
                const editor = this._getEditor();
                if (!editor) return;
                const all = editor.querySelectorAll('.nb-callout-text');
                const last = all[all.length - 1];
                if (last) {
                    last.innerHTML = ''; // remove <br> placeholder para placeholder CSS aparecer
                    const r = document.createRange();
                    r.selectNodeContents(last);
                    r.collapse(true);
                    const s = window.getSelection();
                    s.removeAllRanges();
                    s.addRange(r);
                }
            }, 0);
        },

        // Cicla o emoji do callout ao clicar nele.
        _toggleCalloutEmoji(span) {
            const cycle = ['💡','⚠️','❌','✅','📌','🔥','ℹ️','⭐','🚀','🐛'];
            const cur = (span.textContent || '').trim();
            const idx = cycle.indexOf(cur);
            const next = cycle[(idx + 1) % cycle.length] || cycle[0];
            span.textContent = next;
            // Atualiza autosave
            if (this._autosaveTrigger) this._autosaveTrigger();
        },

        // O sanitizer pode descartar contenteditable; ao entrar em modo de
        // edição, garantimos que todos os callouts estão estruturalmente
        // corretos (wrapper non-editable, texto editable).
        _normalizeCallouts() {
            const editor = this._getEditor();
            if (!editor) return;
            editor.querySelectorAll('.nb-callout').forEach(c => {
                c.setAttribute('contenteditable', 'false');
                const icon = c.querySelector('.nb-callout-icon');
                if (icon) {
                    icon.setAttribute('contenteditable', 'false');
                    if (!icon.getAttribute('onclick')) {
                        icon.setAttribute('onclick', 'Templates.notebooks._toggleCalloutEmoji(this)');
                    }
                }
                const txt = c.querySelector('.nb-callout-text');
                if (txt) {
                    txt.setAttribute('contenteditable', 'true');
                    if (!txt.getAttribute('data-placeholder')) {
                        txt.setAttribute('data-placeholder', 'Escreve aqui...');
                    }
                }
            });
        },

        // ═══════════════════════════════════════════════════════════════════
        // TABELA
        // ═══════════════════════════════════════════════════════════════════
        _insertTable() {
            const html = `<table class="nb-table">` +
                `<thead><tr><th contenteditable="true">Coluna 1</th><th contenteditable="true">Coluna 2</th></tr></thead>` +
                `<tbody>` +
                    `<tr><td contenteditable="true"><br></td><td contenteditable="true"><br></td></tr>` +
                    `<tr><td contenteditable="true"><br></td><td contenteditable="true"><br></td></tr>` +
                `</tbody>` +
                `</table><p><br></p>`;
            document.execCommand('insertHTML', false, html);
        },

        // ═══════════════════════════════════════════════════════════════════
        // TEMPLATES (snippets de escrita rápida)
        // ═══════════════════════════════════════════════════════════════════

        _templates: {
            aula: `
                <h2>📚 Aula — [Título]</h2>
                <p><strong>Data:</strong> [data]</p>
                <hr>
                <h3>Objetivos</h3>
                <ul><li>[objetivo 1]</li><li>[objetivo 2]</li></ul>
                <h3>Conteúdo</h3>
                <p>[notas da aula]</p>
                <h3>Dúvidas</h3>
                <ul><li>[dúvida 1]</li></ul>
                <h3>Resumo</h3>
                <p>[resumo em 2-3 frases]</p>
            `,
            resumo: `
                <h2>📖 Resumo — [Título]</h2>
                <hr>
                <h3>Ideia Principal</h3>
                <p>[ideia central em 1-2 frases]</p>
                <h3>Pontos-Chave</h3>
                <ul><li>[ponto 1]</li><li>[ponto 2]</li><li>[ponto 3]</li></ul>
                <h3>Conclusão</h3>
                <p>[o que retirar disto]</p>
            `,
            reuniao: `
                <h2>👥 Reunião — [Título]</h2>
                <p><strong>Data:</strong> [data] &nbsp;|&nbsp; <strong>Participantes:</strong> [nomes]</p>
                <hr>
                <h3>Agenda</h3>
                <ul><li>[ponto 1]</li><li>[ponto 2]</li></ul>
                <h3>Notas</h3>
                <p>[notas da reunião]</p>
                <h3>Ações</h3>
                <ul><li>[ ] [tarefa] — [responsável]</li></ul>
            `,
            bug: `
                <h2>🐛 Bug Report — [título]</h2>
                <hr>
                <h3>Descrição</h3>
                <p>[o que acontece]</p>
                <h3>Passos para reproduzir</h3>
                <ol><li>[passo 1]</li><li>[passo 2]</li></ol>
                <h3>Comportamento esperado</h3>
                <p>[o que deveria acontecer]</p>
                <h3>Comportamento atual</h3>
                <p>[o que acontece de facto]</p>
                <h3>Notas / Screenshots</h3>
                <p>[info adicional]</p>
            `,
        },

        _insertTemplate(name) {
            const tpl = this._templates[name];
            if (!tpl) return;
            // Compacta em uma única linha — execCommand sensível a whitespace entre tags
            const html = tpl.replace(/>\s+</g, '><').trim();
            document.execCommand('insertHTML', false, html);

            // Move o cursor para o início do conteúdo inserido
            setTimeout(() => {
                const editor = this._getEditor();
                if (!editor) return;
                editor.focus();
            }, 0);
        },

        // ═══════════════════════════════════════════════════════════════════
        // MOBILE TOOLBAR (B/I/U + slash + save fixos acima do teclado)
        // ═══════════════════════════════════════════════════════════════════

        _mountMobileToolbar() {
            if (window.innerWidth > 768) return;
            if (document.getElementById('nbMobileToolbar')) return;
            const wrap = document.createElement('div');
            wrap.innerHTML = `
                <div id="nbMobileToolbar" class="nb-mobile-toolbar">
                    <button class="nb-mtool" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks._exec('bold')"><b>B</b></button>
                    <button class="nb-mtool" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks._exec('italic')"><i>I</i></button>
                    <button class="nb-mtool" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks._exec('underline')"><u>U</u></button>
                    <button class="nb-mtool" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks._inlineCode()"><i class="fas fa-code"></i></button>
                    <button class="nb-mtool" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks._exec('insertUnorderedList')"><i class="fas fa-list-ul"></i></button>
                    <button class="nb-mtool nb-mtool--slash" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks._openSlashFromButton()">/</button>
                    <button class="nb-mtool nb-mtool--save" type="button" onmousedown="event.preventDefault()" onclick="Templates.notebooks.saveInlineEdit()"><i class="fas fa-save"></i></button>
                </div>
            `;
            document.body.appendChild(wrap.firstElementChild);

            // Em mobile escondemos o shell sticky desktop (acções + toolbar)
            const shell = document.getElementById('nbEditStickyShell');
            if (shell) { shell.dataset.prevDisplay = shell.style.display || ''; shell.style.display = 'none'; }
        },

        _unmountMobileToolbar() {
            const tb = document.getElementById('nbMobileToolbar');
            if (tb) tb.remove();
            const shell = document.getElementById('nbEditStickyShell');
            if (shell && 'prevDisplay' in shell.dataset) {
                shell.style.display = shell.dataset.prevDisplay;
                delete shell.dataset.prevDisplay;
            }
        },

        _updateWordCount() {
            if (this._mobileEditorActive) return; // no word-count bar in mobile editor
            const editor = this._getEditor();
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

            // Esconde a sticky view bar durante edição
            this._teardownViewStickyBar();

            richEditor.innerHTML = useContent;

            // Os callouts são guardados sem `contenteditable` (o sanitizer
            // controla o que sobrevive). Aqui re-aplicamos a estrutura de
            // edição para que o utilizador possa escrever no texto e o ícone
            // continue clicável (cicla emojis) sem o cursor parar nele.
            this._normalizeCallouts();

            displayArea.style.display = 'none';
            editorArea.style.display = 'block';
            const btnGroup = document.getElementById('nbViewButtons');
            if (btnGroup) btnGroup.style.display = 'none';
            const versionPanel = document.getElementById('nbVersionPanel');
            if (versionPanel) versionPanel.style.display = 'none';

            // Mostra o shell unificado (acções + toolbar de formatação)
            const editShell = document.getElementById('nbEditStickyShell');
            if (editShell) editShell.style.display = 'block';

            // Em mobile, montamos a toolbar fixa acima do teclado e escondemos
            // a desktop (#notebookToolbarSlot). O slash menu cobre tudo o resto.
            this._mountMobileToolbar();

            const nbMain = document.querySelector('.nb-main');
            if (nbMain) nbMain.scrollTop = 0;

            richEditor.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(richEditor);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            // Sincronização visual da toolbar com a seleção
            this._toolbarSyncHandler = () => this._refreshToolbarState();
            document.addEventListener('selectionchange', this._toolbarSyncHandler);
            richEditor.addEventListener('keyup', this._toolbarSyncHandler);
            richEditor.addEventListener('mouseup', this._toolbarSyncHandler);

            this._updateWordCount();
            this._refreshToolbarState();
        },

        cancelEditMode() {
            const richEditor = document.getElementById('notebookRichEditor');
            if (richEditor && window.Autosave) {
                Autosave.unregister(richEditor.getAttribute('data-item-id'));
            }
            this._autosaveTrigger = null;
            // Desliga listeners de sincronização da toolbar
            if (this._toolbarSyncHandler) {
                document.removeEventListener('selectionchange', this._toolbarSyncHandler);
                if (richEditor) {
                    richEditor.removeEventListener('keyup', this._toolbarSyncHandler);
                    richEditor.removeEventListener('mouseup', this._toolbarSyncHandler);
                }
                this._toolbarSyncHandler = null;
            }
            // Fecha slash menu se ainda estiver aberto e desmonta toolbar mobile
            if (this._slashMenuOpen) this._closeSlashMenu();
            this._unmountMobileToolbar();

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

            const actionBar = document.getElementById('nbEditActionBar') || editorArea;
            const saveBtn = actionBar.querySelector('.btn-success');
            const origText = saveBtn ? saveBtn.innerHTML : '';
            if (saveBtn) { saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar…'; saveBtn.disabled = true; }

            try {
                // Unregister autosave before manual save
                if (window.Autosave) Autosave.unregister(notebookId);
                this._autosaveTrigger = null;
                // Limpa também o sync da toolbar (vamos sair do modo de edição)
                if (this._toolbarSyncHandler) {
                    document.removeEventListener('selectionchange', this._toolbarSyncHandler);
                    richEditor.removeEventListener('keyup', this._toolbarSyncHandler);
                    richEditor.removeEventListener('mouseup', this._toolbarSyncHandler);
                    this._toolbarSyncHandler = null;
                }
                // Fecha slash menu (se aberto) e desmonta toolbar mobile
                if (this._slashMenuOpen) this._closeSlashMenu();
                this._unmountMobileToolbar();

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
                if (saveBtn) { saveBtn.innerHTML = origText; saveBtn.disabled = false; }
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

            listEl.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>A carregar…</p></div>`;

            try {
                const resp = await fetch(`${API_URL}/get_versions.php?item_id=${itemId}`);
                const data = await resp.json();

                if (!data.success || !data.data || data.data.length === 0) {
                    listEl.innerHTML = `
                        <div class="empty-state" style="padding:28px 20px;">
                            <i class="fas fa-inbox"></i>
                            <h3>Sem versões</h3>
                            <p>As versões são criadas automaticamente ao guardar.</p>
                        </div>`;
                    return;
                }

                listEl.innerHTML = data.data.map(v => {
                    const isManual = v.saved_by === 'manual';
                    return `
                    <div class="nb-version-item">
                        <div class="nb-version-icon" style="background:${isManual ? 'var(--primary-weak)' : 'var(--bg-muted)'};">
                            <i class="fas ${isManual ? 'fa-save' : 'fa-robot'}" style="color:${isManual ? 'var(--primary)' : 'var(--success)'};"></i>
                        </div>
                        <div class="nb-version-info">
                            <strong>Versão ${v.version}</strong>
                            <span class="nb-version-badge ${isManual ? 'manual' : 'autosave'}">${isManual ? 'Manual' : 'Auto'}</span>
                            <div class="nb-version-date">${new Date(v.created_at).toLocaleString('pt-PT')} · ${Math.round(v.content_length / 1024 * 10) / 10} KB</div>
                        </div>
                        <button class="nb-version-restore" onclick="Templates.notebooks.restoreVersion(${itemId}, ${v.version})">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                    </div>`;
                }).join('');
            } catch (err) {
                console.error(err);
                listEl.innerHTML = `<div class="empty-state" style="color:var(--danger);padding:20px;"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3><p>${escapeHtml(err.message || '')}</p></div>`;
            }
        },

        async restoreVersion(itemId, version) {
            const ok = await appConfirm(
                `Restaurar a versão ${version}?\nO conteúdo atual será guardado como nova versão antes de restaurar.`,
                { title: 'Restaurar versão?', okLabel: 'Restaurar' }
            );
            if (!ok) return;

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
                if (!notebook) { this._suppressMobileDetail = false; return; }

                // Mobile (≤768px): editor em ecrã cheio estilo Notion
                if (window.innerWidth <= 768) {
                    this._suppressMobileDetail = false;
                    await this._showMobileEditor(notebook);
                    return;
                }

                // Desktop / tablet: render na área #nbContent
                const mainEl = document.getElementById('nbContent');
                if (mainEl) {
                    const suppressDetail = this._suppressMobileDetail;
                    mainEl.innerHTML = this.renderNotebookView(notebook);
                    // IntersectionObserver: sticky view bar aparece quando
                    // #nbViewButtons sai do viewport (scroll para baixo).
                    this._setupViewStickyBar();
                    // Tablet retrato + telemóvel largo: mostrar painel de detalhe (lista ↔ caderno)
                    const shellAfter = document.querySelector('.nb-shell');
                    if (shellAfter && window.innerWidth <= 1023 && !suppressDetail) {
                        shellAfter.classList.add('nb-mobile--detail');
                    }
                }
            } catch (err) {
                console.error(err);
                showNotification('Erro ao carregar caderno', 'error');
            }
            this._suppressMobileDetail = false;
        },

        // Inicializa a navegação em duas camadas em mobile:
        // - shell ganha .nb-mobile (lista a ecrã cheio, sem o painel direito)
        // - injecta o botão "← Cadernos" no topo de .nb-main
        // - clicar num caderno → adiciona .nb-mobile--detail (esconde lista,
        //   mostra conteúdo + botão voltar)
        // - botão voltar → remove .nb-mobile--detail
        _initMobileNav() {
            const shell = document.querySelector('.nb-shell');
            if (!shell) return;
            shell.classList.add('nb-mobile');
            shell.classList.remove('nb-mobile--detail');

            const main = shell.querySelector('.nb-main');
            if (main && !main.querySelector('#nbBackBtn')) {
                const back = document.createElement('button');
                back.id = 'nbBackBtn';
                back.type = 'button';
                back.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Cadernos</span>';
                back.onclick = () => Templates.notebooks._mobileNavBack();
                main.insertBefore(back, main.firstChild);
            }

            // Listener único para limpar/recolocar o estado quando o utilizador
            // muda a largura do ecrã (rotate, redimensionar janela em DevTools).
            if (!this._mobileResizeHandler) {
                this._mobileResizeHandler = () => {
                    const sh = document.querySelector('.nb-shell');
                    if (!sh) return;
                    if (window.innerWidth > 1023) {
                        sh.classList.remove('nb-mobile', 'nb-mobile--detail');
                    } else {
                        // Garante o setup mobile (incluindo botão "Voltar")
                        Templates.notebooks._initMobileNav();
                    }
                };
                window.addEventListener('resize', this._mobileResizeHandler);
            }
        },

        _mobileNavBack() {
            // Se o utilizador está em modo de edição, sai primeiro (autosave já guardou).
            // Marcamos para que o showNotebook subsequente não reabra a camada detalhe.
            const editorArea = document.getElementById('notebookEditorArea');
            if (editorArea && editorArea.style.display !== 'none') {
                this._suppressMobileDetail = true;
                this.cancelEditMode();
            }
            const shell = document.querySelector('.nb-shell');
            if (shell) shell.classList.remove('nb-mobile--detail');
        },

        // ═══════════════════════════════════════════════════════════════════
        // HELPER — editor ativo: nbeBody (mobile overlay) ou notebookRichEditor
        // ═══════════════════════════════════════════════════════════════════
        _mobileEditorActive: false,
        _mobileEditorId:     null,
        _mobileKeyboardH:    0,
        _mobileVpHandler:    null,
        _nbeAutoSaveTrigger: null,
        _mbeResizeForDesktop: null,
        _nbeOriginalTitle:   null,

        _getEditor() {
            if (this._mobileEditorActive) return document.getElementById('nbeBody');
            return document.getElementById('notebookRichEditor');
        },

        // Activa IntersectionObserver para mostrar/ocultar a sticky view bar
        // quando os botões originais #nbViewButtons entram/saem do viewport.
        _nbStickyBarObserver: null,
        _setupViewStickyBar() {
            // Limpa observer anterior (ex: ao mudar de caderno sem sair da view)
            if (this._nbStickyBarObserver) {
                this._nbStickyBarObserver.disconnect();
                this._nbStickyBarObserver = null;
            }
            if (window.innerWidth <= 1023) return; // lista mobile/tablet ou editor full-screen
            const sentinel = document.getElementById('nbViewButtons');
            const bar = document.getElementById('nbStickyViewBar');
            if (!sentinel || !bar) return;
            this._nbStickyBarObserver = new IntersectionObserver(
                ([entry]) => {
                    bar.classList.toggle('visible', !entry.isIntersecting);
                },
                { threshold: 0 }
            );
            this._nbStickyBarObserver.observe(sentinel);
        },

        // Para o observer quando o editor muda de caderno ou entra em edit mode
        _teardownViewStickyBar() {
            if (this._nbStickyBarObserver) {
                this._nbStickyBarObserver.disconnect();
                this._nbStickyBarObserver = null;
            }
            const bar = document.getElementById('nbStickyViewBar');
            if (bar) bar.classList.remove('visible');
        },

        // ═══════════════════════════════════════════════════════════════════
        // MOBILE EDITOR — Notion-like, ecrã cheio, ≤768px
        // ═══════════════════════════════════════════════════════════════════

        _injectMobileEditorCSS() {
            if (document.getElementById('nbe-css')) return;
            const s = document.createElement('style');
            s.id = 'nbe-css';
            s.textContent = `
            .nbe-overlay{position:fixed;inset:0;z-index:3000;background:#0d0d0d;color:#fff;display:flex;flex-direction:column;font-family:var(--font,-apple-system,system-ui,sans-serif);overflow:hidden;}
            .nbe-topbar{display:flex;align-items:center;height:48px;padding:0 8px;background:#0d0d0d;border-bottom:1px solid #1f1f1f;flex-shrink:0;gap:4px;padding-top:env(safe-area-inset-top);}
            .nbe-back-btn{display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--primary,#3b82f6);font-size:15px;font-weight:500;cursor:pointer;padding:8px 4px;min-height:44px;white-space:nowrap;font-family:inherit;}
            .nbe-topbar-title{flex:1;text-align:center;font-size:14px;font-weight:600;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 8px;}
            .nbe-topbar-actions{display:flex;}
            .nbe-topbar-btn{display:flex;align-items:center;justify-content:center;width:40px;height:44px;background:none;border:none;color:#888;font-size:18px;cursor:pointer;border-radius:8px;}
            .nbe-topbar-btn:active{background:#1a1a1a;}
            .nbe-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:60px;}
            .nbe-title-input{outline:none;padding:20px 16px 8px;font-size:26px;font-weight:700;color:#fff;line-height:1.3;min-height:52px;word-break:break-word;display:block;}
            .nbe-title-input:empty::before{content:attr(data-placeholder);color:#555;pointer-events:none;}
            #nbeBody{outline:none;padding:4px 16px 20px;min-height:200px;font-size:16px;line-height:1.7;color:#e0e0e0;word-break:break-word;overflow-wrap:anywhere;display:block;}
            #nbeBody:empty::before{content:attr(data-placeholder);color:#555;pointer-events:none;}
            #nbeBody h1{font-size:24px;font-weight:700;color:#fff;margin:20px 0 6px;}
            #nbeBody h2{font-size:20px;font-weight:700;color:#fff;margin:16px 0 5px;}
            #nbeBody h3{font-size:17px;font-weight:600;color:#ddd;margin:13px 0 4px;}
            #nbeBody h4{font-size:15px;font-weight:600;color:#ccc;margin:11px 0 3px;}
            #nbeBody p{margin:5px 0;color:#e0e0e0;}
            #nbeBody ul,#nbeBody ol{padding-left:22px;margin:5px 0;color:#e0e0e0;}
            #nbeBody li{margin:2px 0;}
            #nbeBody blockquote{border-left:3px solid #444;padding:8px 14px;margin:10px 0;color:#aaa;}
            #nbeBody pre{background:#141414;border-radius:8px;padding:12px 16px;font-family:var(--font-mono,monospace);font-size:14px;overflow-x:auto;color:#e0e0e0;margin:10px 0;}
            #nbeBody code{background:#1d1d1d;border-radius:4px;padding:1px 6px;font-family:var(--font-mono,monospace);font-size:13px;color:#f87171;}
            #nbeBody hr{border:none;border-top:1px solid #2a2a2a;margin:16px 0;}
            #nbeBody mark{background:#3d3100;color:#ffd700;padding:0 2px;border-radius:2px;}
            #nbeBody a{color:#60a5fa;text-decoration:underline;}
            #nbeBody strong{color:#fff;}
            #nbeBody em{color:#ccc;}
            #nbeBody s{color:#666;text-decoration:line-through;}
            #nbeBody u{text-decoration:underline;text-decoration-color:#60a5fa;}
            .nbe-overlay .nb-callout--info{background:rgba(52,152,219,.15);border-left-color:#3498db;}
            .nbe-overlay .nb-callout--warning{background:rgba(243,156,18,.15);border-left-color:#f39c12;}
            .nbe-overlay .nb-callout--error{background:rgba(231,76,60,.15);border-left-color:#e74c3c;}
            .nbe-overlay .nb-callout--success{background:rgba(46,204,113,.15);border-left-color:#2ecc71;}
            .nbe-overlay .nb-callout-text{color:#e0e0e0;}
            .nbe-overlay .nb-table th{background:#1a1a1a;color:#fff;border-color:#2a2a2a;}
            .nbe-overlay .nb-table td{color:#e0e0e0;border-color:#2a2a2a;}
            /* Keyboard toolbar */
            #nbeKbToolbar{position:fixed;left:0;right:0;height:44px;background:#1a1a1a;border-top:1px solid #2a2a2a;display:none;align-items:center;padding:0 4px;z-index:3100;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:0;scrollbar-width:none;}
            #nbeKbToolbar::-webkit-scrollbar{display:none;}
            .nbe-kbtn{display:flex;align-items:center;justify-content:center;min-width:40px;height:44px;background:none;border:none;color:#999;font-size:16px;cursor:pointer;border-radius:6px;flex-shrink:0;padding:0;font-family:inherit;transition:background .1s,color .1s;-webkit-tap-highlight-color:transparent;}
            .nbe-kbtn:active,.nbe-kbtn.nbe-active{background:#2a2a2a;color:#fff;}
            .nbe-kbtn-accent{color:var(--primary,#3b82f6);}
            .nbe-kbtn-sep{width:1px;height:22px;background:#2a2a2a;flex-shrink:0;margin:0 2px;}
            /* Format bar */
            #nbeFormatBar{position:fixed;left:0;right:0;height:44px;background:#1a1a1a;border-top:1px solid #2a2a2a;display:none;align-items:center;padding:0 4px;z-index:3101;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:0;}
            #nbeFormatBar::-webkit-scrollbar{display:none;}
            .nbe-fbtn{display:flex;align-items:center;justify-content:center;min-width:40px;height:44px;background:none;border:none;color:#999;font-size:15px;font-weight:600;cursor:pointer;border-radius:6px;flex-shrink:0;font-family:inherit;transition:background .1s,color .1s;-webkit-tap-highlight-color:transparent;}
            .nbe-fbtn:active,.nbe-fbtn.nbe-active{background:#2a2a2a;color:#fff;}
            /* Bottom sheet backdrop */
            .nbe-sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3200;}
            /* Bottom sheet */
            .nbe-sheet{position:fixed;left:0;right:0;bottom:0;background:#1a1a1a;border-radius:12px 12px 0 0;z-index:3201;max-height:82vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .22s cubic-bezier(.4,0,.2,1);}
            .nbe-sheet.nbe-open{transform:translateY(0);}
            .nbe-sheet-handle{width:40px;height:4px;background:#333;border-radius:2px;margin:10px auto 0;flex-shrink:0;}
            .nbe-sheet-title{padding:8px 16px 6px;font-size:15px;font-weight:700;color:#fff;flex-shrink:0;}
            .nbe-sheet-search{margin:0 12px 8px;padding:9px 13px;background:#262626;border:1px solid #333;border-radius:8px;color:#fff;font-size:15px;outline:none;flex-shrink:0;font-family:inherit;}
            .nbe-sheet-search::placeholder{color:#555;}
            .nbe-sheet-scroll{flex:1;overflow-y:auto;padding:0 12px 28px;-webkit-overflow-scrolling:touch;}
            .nbe-sheet-section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;padding:12px 4px 6px;}
            .nbe-sheet-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;}
            .nbe-sheet-item{display:flex;flex-direction:column;align-items:flex-start;gap:6px;background:#262626;border-radius:8px;padding:12px;cursor:pointer;border:none;color:#fff;text-align:left;-webkit-tap-highlight-color:transparent;transition:background .1s;font-family:inherit;}
            .nbe-sheet-item:active{background:#333;}
            .nbe-sheet-item i{font-size:20px;color:#aaa;}
            .nbe-sheet-label{font-size:14px;font-weight:600;color:#fff;line-height:1.2;}
            .nbe-sheet-item.nbe-hidden{display:none;}
            .nbe-sheet-actions{display:flex;flex-direction:column;padding-bottom:24px;}
            .nbe-sheet-action{display:flex;align-items:center;gap:14px;padding:14px 16px;background:none;border:none;color:#fff;font-size:16px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left;border-bottom:1px solid #252525;-webkit-tap-highlight-color:transparent;width:100%;}
            .nbe-sheet-action:last-child{border-bottom:none;}
            .nbe-sheet-action:active{background:#252525;}
            .nbe-sheet-action i{font-size:18px;color:#888;width:22px;flex-shrink:0;}
            .nbe-sheet-action .nbe-arrow{margin-left:auto;font-size:12px;color:#444;}
            .nbe-sheet-action.nbe-danger{color:#f87171;}
            .nbe-sheet-action.nbe-danger i{color:#f87171;}
            .nbe-sheet-foot{padding:12px 16px;font-size:12px;color:#444;flex-shrink:0;border-top:1px solid #222;}
            `;
            document.head.appendChild(s);
        },

        async _showMobileEditor(notebook) {
            this._injectMobileEditorCSS();
            this._mobileEditorActive = true;
            this._mobileEditorId = notebook.id;
            this._nbeOriginalTitle  = notebook.title;

            // Remove overlay anterior se existir (stale)
            document.getElementById('nbMobileEditorOverlay')?.remove();
            // Garante que não fica toolbar mobile anterior (da sessão anterior)
            document.getElementById('nbMobileToolbar')?.remove();

            let htmlContent = notebook.content || '';
            if (htmlContent && !htmlContent.trim().startsWith('<')) {
                htmlContent = htmlContent.split('\n')
                    .map(l => l.trim() ? `<p>${escapeHtml(l)}</p>` : '<br>').join('');
            }
            // Strip contenteditable (re-aplicado por _normalizeCallouts)
            htmlContent = htmlContent.replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, '');

            const md = `onmousedown="event.preventDefault()"`;
            const overlay = document.createElement('div');
            overlay.id = 'nbMobileEditorOverlay';
            overlay.className = 'nbe-overlay';
            overlay.innerHTML = `
                <div class="nbe-topbar">
                    <button class="nbe-back-btn" type="button" ${md}
                        onclick="Templates.notebooks._closeMobileEditor()">
                        <i class="fas fa-arrow-left"></i> Cadernos
                    </button>
                    <span class="nbe-topbar-title" id="nbeMiniTitle">${escapeHtml(notebook.title)}</span>
                    <div class="nbe-topbar-actions">
                        <button class="nbe-topbar-btn" type="button" title="Partilhar" ${md}
                            onclick="Templates.notebooks._nbeShare()">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="nbe-topbar-btn" type="button" title="Ações" ${md}
                            onclick="Templates.notebooks._openMobileBlockActionsSheet()">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                </div>
                <div class="nbe-scroll" id="nbeScroll">
                    <div id="nbeTitleInput" class="nbe-title-input"
                         contenteditable="true"
                         data-placeholder="Sem título"
                         oninput="Templates.notebooks._onNbeTitleInput()"
                         onkeydown="Templates.notebooks._onNbeTitleKeydown(event)">${escapeHtml(notebook.title)}</div>
                    <div id="nbeBody"
                         contenteditable="true"
                         data-placeholder="Começa a escrever, ou escreve '/' para inserir um bloco…"
                         onkeydown="Templates.notebooks._editorKeydown(event)"
                         oninput="Templates.notebooks._onEditorInput()">${htmlContent}</div>
                </div>
                <div id="nbeKbToolbar">${this._getNbeKbToolbarHTML()}</div>
                <div id="nbeFormatBar">${this._getNbeFormatBarHTML()}</div>
            `;
            document.body.appendChild(overlay);

            // Re-normaliza callouts no conteúdo carregado
            this._normalizeCallouts();

            // Autosave
            if (window.Autosave) {
                this._nbeAutoSaveTrigger = Autosave.register(
                    String(notebook.id),
                    () => { const b = document.getElementById('nbeBody'); return b ? b.innerHTML : ''; },
                    { onSaved: () => {}, onError: () => {} }
                );
            } else {
                let _nbeTimer;
                this._nbeAutoSaveTrigger = () => {
                    clearTimeout(_nbeTimer);
                    _nbeTimer = setTimeout(() => this._saveMobileEditorContent(), 5000);
                };
            }

            // Detecção do teclado via visualViewport
            this._setupMobileKeyboardDetection();

            // Bloqueia scroll do body enquanto overlay está aberto
            document.body.style.overflow = 'hidden';

            // Foca o body e coloca o cursor no fim
            requestAnimationFrame(() => {
                const body = document.getElementById('nbeBody');
                if (body) {
                    body.focus();
                    const r = document.createRange();
                    r.selectNodeContents(body);
                    r.collapse(false);
                    const s = window.getSelection();
                    s.removeAllRanges();
                    s.addRange(r);
                }
            });

            // Se a janela for redimensionada para desktop, fecha o overlay
            if (!this._mbeResizeForDesktop) {
                this._mbeResizeForDesktop = () => {
                    if (window.innerWidth > 768 && this._mobileEditorActive) {
                        this._closeMobileEditor(false);
                    }
                };
                window.addEventListener('resize', this._mbeResizeForDesktop);
            }
        },

        _closeMobileEditor(save = true) {
            if (save) this._saveMobileEditorContent();
            if (window.Autosave && this._mobileEditorId) {
                Autosave.unregister(String(this._mobileEditorId));
            }
            this._nbeAutoSaveTrigger = null;
            this._teardownMobileKeyboardDetection();
            this._closeAllMobileSheets();
            if (this._slashMenuOpen) this._closeSlashMenu();
            document.getElementById('nbMobileEditorOverlay')?.remove();
            this._mobileEditorActive = false;
            this._mobileEditorId = null;
            this._mobileKeyboardH = 0;
            document.body.style.overflow = '';
            // Refresh categories para actualizar sidebar
            if (typeof fetchCategories === 'function') fetchCategories();
        },

        async _saveMobileEditorContent() {
            const body = document.getElementById('nbeBody');
            const titleEl = document.getElementById('nbeTitleInput');
            if (!body || !this._mobileEditorId) return;
            const newContent = body.innerHTML;
            const newTitle = (titleEl ? titleEl.innerText.trim() : '') || 'Sem título';
            try {
                // 1) Guarda o conteúdo (rich-text + versão automática)
                const resp = await fetch(`${API_URL}/save_note.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_id: Number(this._mobileEditorId),
                        content: newContent,
                        saved_by: 'mobile',
                    }),
                    credentials: 'same-origin',
                });
                const data = await resp.json();
                if (!data.success && !data.unchanged) throw new Error(data.error || 'Erro');

                // 2) Actualiza o título (PATCH só envia o campo alterado)
                if (newTitle !== this._nbeOriginalTitle) {
                    await fetch(`${API_URL}/items.php`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: Number(this._mobileEditorId), title: newTitle }),
                        credentials: 'same-origin',
                    });
                    this._nbeOriginalTitle = newTitle;
                }

                // 3) Actualiza sidebar sem reload
                const sidebarItem = document.querySelector(`.nb-list-item[data-notebook-id="${this._mobileEditorId}"]`);
                if (sidebarItem) {
                    const preview = newContent.replace(/<[^>]+>/g, '').slice(0, 60) || 'Caderno vazio…';
                    const pEl = sidebarItem.querySelector('.nb-item-preview');
                    if (pEl) pEl.textContent = preview;
                    const tEl = sidebarItem.querySelector('.nb-item-title');
                    if (tEl) tEl.textContent = newTitle;
                    const dEl = sidebarItem.querySelector('.nb-item-date');
                    if (dEl) dEl.innerHTML = `<i class="fas fa-clock"></i> ${new Date().toLocaleDateString('pt-PT')}`;
                }
                if (window.Autosave) Autosave.clearDraft(String(this._mobileEditorId));
            } catch (err) {
                console.error('Mobile save error:', err);
            }
        },

        _onNbeTitleInput() {
            const titleEl = document.getElementById('nbeTitleInput');
            const mini = document.getElementById('nbeMiniTitle');
            if (titleEl && mini) mini.textContent = titleEl.innerText.trim() || 'Sem título';
            if (this._nbeAutoSaveTrigger) this._nbeAutoSaveTrigger();
        },

        _onNbeTitleKeydown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const body = document.getElementById('nbeBody');
                if (body) {
                    body.focus();
                    const r = document.createRange();
                    r.selectNodeContents(body);
                    r.collapse(true);
                    const s = window.getSelection();
                    s.removeAllRanges();
                    s.addRange(r);
                }
            }
        },

        _setupMobileKeyboardDetection() {
            if (!window.visualViewport) return;
            const TOOLBAR_H = 44;
            this._mobileVpHandler = () => {
                const kbH = Math.max(0,
                    window.innerHeight
                    - window.visualViewport.height
                    - (window.visualViewport.offsetTop || 0)
                );
                const kt = document.getElementById('nbeKbToolbar');
                const fb = document.getElementById('nbeFormatBar');
                const sc = document.getElementById('nbeScroll');
                this._mobileKeyboardH = kbH;
                if (kbH > 80) {
                    const bottom = kbH + 'px';
                    if (kt) { kt.style.bottom = bottom; kt.style.display = 'flex'; }
                    if (fb && fb.style.display === 'flex') fb.style.bottom = bottom;
                    if (sc) sc.style.paddingBottom = (kbH + TOOLBAR_H + 20) + 'px';
                } else {
                    if (kt) kt.style.display = 'none';
                    if (fb) fb.style.display = 'none';
                    if (sc) sc.style.paddingBottom = '60px';
                }
                this._nbeUpdateKbToolbarState();
            };
            window.visualViewport.addEventListener('resize', this._mobileVpHandler);
            window.visualViewport.addEventListener('scroll', this._mobileVpHandler);
        },

        _teardownMobileKeyboardDetection() {
            if (this._mobileVpHandler && window.visualViewport) {
                window.visualViewport.removeEventListener('resize', this._mobileVpHandler);
                window.visualViewport.removeEventListener('scroll', this._mobileVpHandler);
                this._mobileVpHandler = null;
            }
        },

        // ── Toolbar do teclado ────────────────────────────────────────────
        _getNbeKbToolbarHTML() {
            const md = `onmousedown="event.preventDefault()"`;
            return `
                <button class="nbe-kbtn nbe-kbtn-accent" type="button" ${md}
                    onclick="Templates.notebooks._openMobileBlockSheet()" title="Inserir bloco">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="Templates.notebooks._openMobileFormatBar()" title="Formatação">
                    <span style="font-size:13px;font-weight:700;letter-spacing:-.5px">Aa</span>
                </button>
                <div class="nbe-kbtn-sep"></div>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('bold')" data-cmd="bold" title="Negrito">
                    <b style="font-size:15px">B</b>
                </button>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('italic')" data-cmd="italic" title="Itálico">
                    <i style="font-size:15px">I</i>
                </button>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="Templates.notebooks._inlineCode()" data-cmd="code" title="Código inline">
                    <i class="fas fa-code" style="font-size:13px"></i>
                </button>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('insertUnorderedList')" data-cmd="insertUnorderedList" title="Lista">
                    <i class="fas fa-list-ul" style="font-size:13px"></i>
                </button>
                <button class="nbe-kbtn nbe-kbtn-accent" type="button" ${md}
                    onclick="Templates.notebooks._openSlashFromButton()" title="Inserir bloco (/)"
                    style="font-family:monospace;font-size:18px;font-weight:700">/</button>
                <div class="nbe-kbtn-sep" style="margin-left:auto"></div>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('undo')" title="Desfazer">
                    <i class="fas fa-undo" style="font-size:13px"></i>
                </button>
                <button class="nbe-kbtn" type="button" ${md}
                    onclick="document.activeElement&&document.activeElement.blur()" title="Fechar teclado">
                    <i class="fas fa-keyboard" style="font-size:13px"></i>
                </button>
            `;
        },

        _getNbeFormatBarHTML() {
            const md = `onmousedown="event.preventDefault()"`;
            return `
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._closeMobileFormatBar()" title="Voltar">
                    <i class="fas fa-arrow-left" style="font-size:14px"></i>
                </button>
                <div class="nbe-kbtn-sep"></div>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('bold')" data-cmd="bold"><b>B</b></button>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('italic')" data-cmd="italic"><i>I</i></button>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('underline')" data-cmd="underline"><u>U</u></button>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._exec('strikeThrough')" data-cmd="strikeThrough"><s>S</s></button>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._insertLink()" title="Link">
                    <i class="fas fa-link" style="font-size:13px"></i>
                </button>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._inlineCode()" data-cmd="code">
                    <i class="fas fa-code" style="font-size:12px"></i>
                </button>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._highlight()" data-cmd="hilite">
                    <i class="fas fa-highlighter" style="font-size:12px"></i>
                </button>
                <div class="nbe-kbtn-sep"></div>
                <button class="nbe-fbtn" type="button" ${md}
                    onclick="Templates.notebooks._openMobileTransformSheet()" title="Transformar em">
                    <i class="fas fa-exchange-alt" style="font-size:13px"></i>
                </button>
            `;
        },

        _openMobileFormatBar() {
            const kt = document.getElementById('nbeKbToolbar');
            const fb = document.getElementById('nbeFormatBar');
            if (!kt || !fb) return;
            kt.style.display = 'none';
            fb.style.display = 'flex';
            fb.style.bottom = (this._mobileKeyboardH > 80 ? this._mobileKeyboardH : 0) + 'px';
        },

        _closeMobileFormatBar() {
            const kt = document.getElementById('nbeKbToolbar');
            const fb = document.getElementById('nbeFormatBar');
            if (fb) fb.style.display = 'none';
            if (kt && this._mobileKeyboardH > 80) kt.style.display = 'flex';
        },

        _nbeUpdateKbToolbarState() {
            if (!this._mobileEditorActive) return;
            const body = document.getElementById('nbeBody');
            if (!body) return;
            const sel = window.getSelection();
            const inEditor = sel && sel.rangeCount && body.contains(sel.anchorNode);
            if (!inEditor) return;
            const toolbars = [
                document.getElementById('nbeKbToolbar'),
                document.getElementById('nbeFormatBar'),
            ].filter(Boolean);
            const cmds = ['bold','italic','underline','strikeThrough','insertUnorderedList'];
            toolbars.forEach(tb => {
                cmds.forEach(cmd => {
                    const btn = tb.querySelector(`[data-cmd="${cmd}"]`);
                    if (!btn) return;
                    let active = false;
                    try { active = document.queryCommandState(cmd); } catch (_) {}
                    btn.classList.toggle('nbe-active', active);
                });
                const codeBtn = tb.querySelector('[data-cmd="code"]');
                if (codeBtn && sel.anchorNode) {
                    let n = sel.anchorNode;
                    let inCode = false;
                    while (n && n !== body) {
                        if (n.nodeType === 1 && n.tagName === 'CODE') { inCode = true; break; }
                        n = n.parentNode;
                    }
                    codeBtn.classList.toggle('nbe-active', inCode);
                }
                const hiliteBtn = tb.querySelector('[data-cmd="hilite"]');
                if (hiliteBtn) {
                    const c = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor');
                    const isH = !!c && c !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)/.test(c);
                    hiliteBtn.classList.toggle('nbe-active', isH);
                }
            });
        },

        // ── Bottom sheet de blocos ────────────────────────────────────────
        _openMobileBlockSheet(fromSlash = false) {
            this._closeAllMobileSheets();
            const bg = document.createElement('div');
            bg.className = 'nbe-sheet-bg'; bg.id = 'nbeSheetBg';
            bg.onclick = () => this._closeAllMobileSheets();
            document.body.appendChild(bg);

            const sheet = document.createElement('div');
            sheet.className = 'nbe-sheet'; sheet.id = 'nbeBlockSheet';
            sheet.innerHTML = `
                <div class="nbe-sheet-handle"></div>
                <div class="nbe-sheet-title">Inserir bloco</div>
                ${fromSlash ? `<input class="nbe-sheet-search" type="text" id="nbeBlockSearch"
                    placeholder="Pesquisar blocos…"
                    oninput="Templates.notebooks._filterNbeBlockSheet(this.value)">` : ''}
                <div class="nbe-sheet-scroll">${this._getNbeBlockSections()}</div>
            `;
            document.body.appendChild(sheet);
            requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('nbe-open')));
            if (fromSlash) setTimeout(() => document.getElementById('nbeBlockSearch')?.focus(), 260);
        },

        _closeAllMobileSheets() {
            ['nbeSheetBg','nbeBlockSheet','nbeTransformSheet','nbeBlockActionsSheet'].forEach(
                id => document.getElementById(id)?.remove()
            );
            // Se o sheet foi aberto por slash command, resetamos o estado
            if (this._slashMenuOpen) this._closeSlashMenu();
        },

        _getNbeBlockSections() {
            const sections = {
                'Blocos básicos': [
                    { action:'p',             icon:'fa-paragraph',          label:'Texto' },
                    { action:'h1',            icon:'fa-heading',            label:'Título 1' },
                    { action:'h2',            icon:'fa-heading',            label:'Título 2' },
                    { action:'h3',            icon:'fa-heading',            label:'Título 3' },
                    { action:'h4',            icon:'fa-heading',            label:'Título 4' },
                    { action:'ul',            icon:'fa-list-ul',            label:'Lista com marcadores' },
                    { action:'ol',            icon:'fa-list-ol',            label:'Lista numerada' },
                    { action:'blockquote',    icon:'fa-quote-right',        label:'Citação' },
                    { action:'pre',           icon:'fa-code',               label:'Código' },
                    { action:'hr',            icon:'fa-minus',              label:'Separador' },
                ],
                'Callouts': [
                    { action:'callout-info',    icon:'fa-info-circle',          label:'Info' },
                    { action:'callout-warning', icon:'fa-exclamation-triangle', label:'Aviso' },
                    { action:'callout-error',   icon:'fa-times-circle',         label:'Erro' },
                    { action:'callout-success', icon:'fa-check-circle',         label:'Sucesso' },
                ],
                'Tabela': [
                    { action:'table', icon:'fa-table', label:'Tabela 2×3' },
                ],
                'Templates': [
                    { action:'template-aula',    icon:'fa-graduation-cap', label:'Aula' },
                    { action:'template-resumo',  icon:'fa-book',           label:'Resumo' },
                    { action:'template-reuniao', icon:'fa-users',          label:'Reunião' },
                    { action:'template-bug',     icon:'fa-bug',            label:'Bug Report' },
                ],
            };
            return Object.entries(sections).map(([sec, items]) => `
                <div class="nbe-sheet-section">${sec}</div>
                <div class="nbe-sheet-grid">
                    ${items.map(it => `
                        <button class="nbe-sheet-item" type="button"
                            data-label="${it.label.toLowerCase()}"
                            onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._executeNbeBlock('${it.action}')">
                            <i class="fas ${it.icon}"></i>
                            <span class="nbe-sheet-label">${it.label}</span>
                        </button>
                    `).join('')}
                </div>
            `).join('');
        },

        _filterNbeBlockSheet(q) {
            const sheet = document.getElementById('nbeBlockSheet');
            if (!sheet) return;
            const lower = (q || '').trim().toLowerCase();
            sheet.querySelectorAll('.nbe-sheet-item').forEach(el => {
                const label = el.getAttribute('data-label') || '';
                el.classList.toggle('nbe-hidden', !!lower && !label.includes(lower));
            });
            sheet.querySelectorAll('.nbe-sheet-section').forEach(sec => {
                const grid = sec.nextElementSibling;
                if (!grid) return;
                const allHide = [...grid.querySelectorAll('.nbe-sheet-item')]
                    .every(el => el.classList.contains('nbe-hidden'));
                sec.style.display = allHide ? 'none' : '';
                grid.style.display = allHide ? 'none' : '';
            });
        },

        _executeNbeBlock(action) {
            // Guarda estado do slash ANTES de fechar sheets (closeAllMobileSheets reseta slash)
            const wasSlash = this._slashMenuOpen;
            const savedSlashRange = this._slashRange ? {
                node: this._slashRange.startContainer,
                off: this._slashRange.startOffset,
            } : null;

            this._closeAllMobileSheets(); // também fecha slash menu se aberto

            const body = document.getElementById('nbeBody');
            if (body) body.focus();

            // Apaga o texto "/query" se foi activado por slash
            if (wasSlash && savedSlashRange) {
                const sel = window.getSelection();
                if (sel && sel.rangeCount) {
                    const cur = sel.getRangeAt(0);
                    const { node, off } = savedSlashRange;
                    if (cur.endContainer === node && cur.endOffset >= off) {
                        const del = document.createRange();
                        del.setStart(node, off);
                        del.setEnd(cur.endContainer, cur.endOffset);
                        del.deleteContents();
                        const c = document.createRange();
                        c.setStart(node, off);
                        c.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(c);
                    }
                }
            }

            // Executa a acção do bloco
            if (['h1','h2','h3','h4','blockquote','pre','p'].includes(action)) {
                this._formatBlock(action);
            } else if (action === 'ul') {
                this._exec('insertUnorderedList');
            } else if (action === 'ol') {
                this._exec('insertOrderedList');
            } else if (action === 'hr') {
                this._exec('insertHorizontalRule');
                this._exec('formatBlock', 'p');
            } else if (action.startsWith('callout-')) {
                this._insertCallout(action.slice('callout-'.length));
            } else if (action === 'table') {
                this._insertTable();
            } else if (action.startsWith('template-')) {
                this._insertTemplate(action.slice('template-'.length));
            }
            setTimeout(() => body && body.focus(), 60);
        },

        // ── Sheet "Transformar em" ────────────────────────────────────────
        _openMobileTransformSheet() {
            this._closeAllMobileSheets();
            const bg = document.createElement('div');
            bg.className = 'nbe-sheet-bg'; bg.id = 'nbeSheetBg';
            bg.onclick = () => this._closeAllMobileSheets();
            document.body.appendChild(bg);

            const transforms = [
                { action:'p',          icon:'fa-paragraph',   label:'Texto' },
                { action:'h1',         icon:'fa-heading',     label:'Título 1' },
                { action:'h2',         icon:'fa-heading',     label:'Título 2' },
                { action:'h3',         icon:'fa-heading',     label:'Título 3' },
                { action:'h4',         icon:'fa-heading',     label:'Título 4' },
                { action:'ul',         icon:'fa-list-ul',     label:'Lista com marcadores' },
                { action:'ol',         icon:'fa-list-ol',     label:'Lista numerada' },
                { action:'blockquote', icon:'fa-quote-right', label:'Citação' },
                { action:'pre',        icon:'fa-code',        label:'Código' },
            ];

            const sheet = document.createElement('div');
            sheet.className = 'nbe-sheet'; sheet.id = 'nbeTransformSheet';
            sheet.innerHTML = `
                <div class="nbe-sheet-handle"></div>
                <div class="nbe-sheet-title">Transformar em</div>
                <div class="nbe-sheet-scroll">
                    <div class="nbe-sheet-grid">
                        ${transforms.map(t => `
                            <button class="nbe-sheet-item" type="button"
                                onmousedown="event.preventDefault()"
                                onclick="Templates.notebooks._executeNbeTransform('${t.action}')">
                                <i class="fas ${t.icon}"></i>
                                <span class="nbe-sheet-label">${t.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            document.body.appendChild(sheet);
            requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('nbe-open')));
        },

        _executeNbeTransform(action) {
            this._closeAllMobileSheets();
            const body = document.getElementById('nbeBody');
            if (body) body.focus();
            if (['h1','h2','h3','h4','blockquote','pre','p'].includes(action)) {
                this._formatBlock(action);
            } else if (action === 'ul') {
                this._exec('insertUnorderedList');
            } else if (action === 'ol') {
                this._exec('insertOrderedList');
            }
        },

        // ── Sheet de acções do bloco (···) ───────────────────────────────
        _openMobileBlockActionsSheet() {
            this._closeAllMobileSheets();
            const bg = document.createElement('div');
            bg.className = 'nbe-sheet-bg'; bg.id = 'nbeSheetBg';
            bg.onclick = () => this._closeAllMobileSheets();
            document.body.appendChild(bg);

            const titleEl = document.getElementById('nbeTitleInput');
            const title = titleEl ? titleEl.innerText.trim() : '';
            const date = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

            const sheet = document.createElement('div');
            sheet.className = 'nbe-sheet'; sheet.id = 'nbeBlockActionsSheet';
            sheet.innerHTML = `
                <div class="nbe-sheet-handle"></div>
                <div class="nbe-sheet-title">${escapeHtml(title) || 'Ações'}</div>
                <div class="nbe-sheet-scroll">
                    <div class="nbe-sheet-actions">
                        <button class="nbe-sheet-action" type="button" onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._openMobileTransformSheet()">
                            <i class="fas fa-exchange-alt"></i>
                            Transformar em
                            <i class="fas fa-chevron-right nbe-arrow"></i>
                        </button>
                        <button class="nbe-sheet-action" type="button" onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._nbeInsertBelow()">
                            <i class="fas fa-level-down-alt"></i> Inserir abaixo
                        </button>
                        <button class="nbe-sheet-action" type="button" onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._nbeDuplicateBlock()">
                            <i class="fas fa-copy"></i> Duplicar
                        </button>
                        <button class="nbe-sheet-action" type="button" onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._nbeMoveBlockUp()">
                            <i class="fas fa-arrow-up"></i> Mover para cima
                        </button>
                        <button class="nbe-sheet-action" type="button" onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._nbeMoveBlockDown()">
                            <i class="fas fa-arrow-down"></i> Mover para baixo
                        </button>
                        <button class="nbe-sheet-action nbe-danger" type="button" onmousedown="event.preventDefault()"
                            onclick="Templates.notebooks._nbeDeleteBlock()">
                            <i class="fas fa-trash-alt"></i> Eliminar bloco
                        </button>
                    </div>
                </div>
                <div class="nbe-sheet-foot">Editado em ${date}</div>
            `;
            document.body.appendChild(sheet);
            requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('nbe-open')));
        },

        // ── Manipulação de blocos ─────────────────────────────────────────
        _nbeGetCurrentBlock() {
            const body = document.getElementById('nbeBody');
            if (!body) return null;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return null;
            const BLOCK = new Set(['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','BLOCKQUOTE','PRE','DIV','TABLE']);
            let n = sel.anchorNode;
            while (n && n !== body) {
                if (n.nodeType === Node.ELEMENT_NODE && n.parentNode === body) return n;
                n = n.parentNode;
            }
            return null;
        },

        _nbeInsertBelow() {
            this._closeAllMobileSheets();
            const p = document.createElement('p');
            p.appendChild(document.createElement('br'));
            const block = this._nbeGetCurrentBlock();
            const body = document.getElementById('nbeBody');
            if (block && body) {
                body.insertBefore(p, block.nextSibling);
            } else if (body) {
                body.appendChild(p);
            }
            const r = document.createRange();
            r.setStart(p, 0); r.collapse(true);
            const s = window.getSelection();
            s.removeAllRanges(); s.addRange(r);
            body?.focus();
        },

        _nbeDuplicateBlock() {
            this._closeAllMobileSheets();
            const block = this._nbeGetCurrentBlock();
            const body = document.getElementById('nbeBody');
            if (!block || !body) return;
            const clone = block.cloneNode(true);
            body.insertBefore(clone, block.nextSibling);
            showNotification('Bloco duplicado', 'success');
        },

        _nbeMoveBlockUp() {
            this._closeAllMobileSheets();
            const block = this._nbeGetCurrentBlock();
            if (!block || !block.previousElementSibling) return;
            block.parentNode.insertBefore(block, block.previousElementSibling);
        },

        _nbeMoveBlockDown() {
            this._closeAllMobileSheets();
            const block = this._nbeGetCurrentBlock();
            if (!block || !block.nextElementSibling) return;
            block.parentNode.insertBefore(block.nextElementSibling, block);
        },

        _nbeDeleteBlock() {
            this._closeAllMobileSheets();
            const block = this._nbeGetCurrentBlock();
            if (!block) return;
            const body = document.getElementById('nbeBody');
            block.remove();
            if (body && !body.firstChild) {
                const p = document.createElement('p');
                p.appendChild(document.createElement('br'));
                body.appendChild(p);
            }
            showNotification('Bloco eliminado', 'success');
        },

        _nbeShare() {
            const titleEl = document.getElementById('nbeTitleInput');
            const title = titleEl ? titleEl.innerText.trim() : 'NeatPad';
            if (navigator.share) {
                navigator.share({ title, text: title, url: window.location.href }).catch(() => {});
            } else {
                showNotification('Partilha não suportada neste browser', 'error');
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
