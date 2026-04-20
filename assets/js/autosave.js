/* ======================================
   NeatPad - Autosave System
   Debounce + localStorage draft + API
   ====================================== */

window.Autosave = {

    _timers: {},
    _lastSaved: {},
    DEBOUNCE_MS: 2500,
    DRAFT_PREFIX: 'ferraz_draft_',

    // ── Status indicator ────────────────────────

    _statusEl: null,
    _statusTimeout: null,

    _ensureStatusEl() {
        if (this._statusEl && document.body.contains(this._statusEl)) return;
        const el = document.createElement('div');
        el.id = 'autosave-status';
        el.className = 'autosave-status';
        document.body.appendChild(el);
        this._statusEl = el;
    },

    _showStatus(state, text) {
        this._ensureStatusEl();
        const el = this._statusEl;
        clearTimeout(this._statusTimeout);

        const configs = {
            saving:   { icon: 'fa-spinner fa-spin', color: '#f39c12', bg: '#fef3e2' },
            saved:    { icon: 'fa-check-circle',    color: '#27ae60', bg: '#eafaf1' },
            error:    { icon: 'fa-exclamation-triangle', color: '#e74c3c', bg: '#fdedec' },
            draft:    { icon: 'fa-hdd',             color: '#2980b9', bg: '#eaf4fb' },
            offline:  { icon: 'fa-wifi',            color: '#e67e22', bg: '#fef3e2' },
        };
        const c = configs[state] || configs.saved;

        el.innerHTML = `<i class="fas ${c.icon}"></i> <span>${text}</span>`;
        el.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            padding: 10px 20px; border-radius: 10px;
            background: ${c.bg}; color: ${c.color}; border: 1px solid ${c.color}30;
            font-size: 13px; font-weight: 600; font-family: system-ui, sans-serif;
            display: flex; align-items: center; gap: 8px;
            z-index: 99999; box-shadow: 0 4px 14px rgba(0,0,0,0.1);
            opacity: 1; transition: opacity 0.4s ease;
            pointer-events: none;
        `;

        if (state === 'saved') {
            this._statusTimeout = setTimeout(() => {
                el.style.opacity = '0';
            }, 3000);
        }
    },

    // ── localStorage drafts ─────────────────────

    saveDraft(itemId, content) {
        if (!itemId) return;
        try {
            const key = this.DRAFT_PREFIX + itemId;
            const draft = {
                content: content,
                timestamp: Date.now(),
                itemId: itemId,
            };
            localStorage.setItem(key, JSON.stringify(draft));
        } catch (e) {
            console.warn('Autosave: localStorage cheio ou indisponível', e);
        }
    },

    getDraft(itemId) {
        if (!itemId) return null;
        try {
            const raw = localStorage.getItem(this.DRAFT_PREFIX + itemId);
            if (!raw) return null;
            const draft = JSON.parse(raw);
            // Descartar drafts com mais de 7 dias
            if (Date.now() - draft.timestamp > 7 * 24 * 60 * 60 * 1000) {
                this.clearDraft(itemId);
                return null;
            }
            return draft;
        } catch (e) {
            return null;
        }
    },

    clearDraft(itemId) {
        if (!itemId) return;
        try {
            localStorage.removeItem(this.DRAFT_PREFIX + itemId);
        } catch (e) { /* ignore */ }
    },

    hasDraft(itemId) {
        return this.getDraft(itemId) !== null;
    },

    // ── Core autosave ───────────────────────────

    /**
     * Regista um editor para autosave.
     * Chama esta função sempre que o editor abre.
     *
     * @param {string|number} itemId    - ID do item na BD
     * @param {Function} getContent     - Fn que retorna o conteúdo atual do editor
     * @param {Object} [opts]           - Opções extras
     * @param {Function} [opts.onSaved] - Callback após save bem-sucedido
     * @param {Function} [opts.onError] - Callback após erro
     */
    register(itemId, getContent, opts = {}) {
        if (!itemId) return;
        const key = String(itemId);

        // Guardar referência
        this._lastSaved[key] = null;

        // Retorna a função de trigger para usar em oninput/onkeyup
        return () => {
            const content = getContent();
            if (content === undefined || content === null) return;

            // Guardar draft local imediatamente
            this.saveDraft(itemId, content);

            // Debounce do save remoto
            if (this._timers[key]) clearTimeout(this._timers[key]);

            this._timers[key] = setTimeout(() => {
                this._saveToServer(itemId, content, opts);
            }, this.DEBOUNCE_MS);
        };
    },

    /**
     * Força um save imediato (ex: ao clicar "Guardar" ou Ctrl+S)
     */
    async saveNow(itemId, content, opts = {}) {
        if (!itemId) return;
        const key = String(itemId);

        // Cancelar debounce pendente
        if (this._timers[key]) {
            clearTimeout(this._timers[key]);
            delete this._timers[key];
        }

        // Guardar draft local
        this.saveDraft(itemId, content);

        // Save remoto
        await this._saveToServer(itemId, content, { ...opts, savedBy: 'manual' });
    },

    /**
     * Desregista um editor (quando fecha)
     */
    unregister(itemId) {
        const key = String(itemId);
        if (this._timers[key]) {
            clearTimeout(this._timers[key]);
            delete this._timers[key];
        }
        delete this._lastSaved[key];
    },

    // ── API call ────────────────────────────────

    async _saveToServer(itemId, content, opts = {}) {
        const key = String(itemId);
        const savedBy = opts.savedBy || 'autosave';

        // Evitar save duplicado se conteúdo idêntico
        if (this._lastSaved[key] === content) {
            this._showStatus('saved', 'Guardado');
            return;
        }

        this._showStatus('saving', 'A guardar…');

        try {
            const response = await fetch(`${API_URL}/save_note.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id:  itemId,
                    content:  content,
                    saved_by: savedBy,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this._lastSaved[key] = content;
                this.clearDraft(itemId);
                this._showStatus('saved', savedBy === 'manual' ? 'Guardado manualmente' : 'Guardado automaticamente');
                if (opts.onSaved) opts.onSaved(data);
            } else {
                throw new Error(data.error || 'Erro desconhecido');
            }
        } catch (err) {
            console.error('Autosave error:', err);
            this._showStatus('error', 'Erro ao guardar — draft local mantido');
            // Draft local já está guardado, serve como backup
            if (opts.onError) opts.onError(err);
        }
    },

    // ── Draft recovery ──────────────────────────

    /**
     * Verifica se existe um draft mais recente que o conteúdo do servidor.
     * Retorna { hasDraft, draft, serverContent } ou null.
     */
    checkForRecovery(itemId, serverContent) {
        const draft = this.getDraft(itemId);
        if (!draft) return null;

        // Só oferecer recovery se draft diferente do conteúdo do servidor
        if (draft.content === serverContent) {
            this.clearDraft(itemId);
            return null;
        }

        return {
            hasDraft: true,
            draft: draft,
            serverContent: serverContent,
        };
    },

    /**
     * Mostra diálogo de recuperação de draft
     */
    showRecoveryDialog(itemId, serverContent, onRestore, onDiscard) {
        const check = this.checkForRecovery(itemId, serverContent);
        if (!check) return false;

        const draft = check.draft;
        const age = this._formatAge(draft.timestamp);
        const previewText = draft.content.replace(/<[^>]+>/g, '').slice(0, 120);

        const overlay = document.createElement('div');
        overlay.id = 'draft-recovery-overlay';
        overlay.innerHTML = `
            <div style="
                position:fixed; inset:0; background:rgba(0,0,0,0.5);
                display:flex; align-items:center; justify-content:center;
                z-index:100000; font-family:system-ui,sans-serif;">
                <div style="
                    background:#fff; border-radius:16px; padding:32px;
                    max-width:480px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#fef3e2;
                                    display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-exclamation-triangle" style="color:#e67e22;font-size:20px;"></i>
                        </div>
                        <div>
                            <h3 style="margin:0;font-size:18px;color:#1a1f36;">Draft encontrado</h3>
                            <p style="margin:2px 0 0;font-size:13px;color:#8892a4;">${age}</p>
                        </div>
                    </div>
                    <p style="color:#4a5568;font-size:14px;line-height:1.6;margin-bottom:8px;">
                        Existe um rascunho local que não foi guardado no servidor. Pode ter sido causado por um crash ou falha de conexão.
                    </p>
                    <div style="background:#f7f8fc;border-radius:8px;padding:12px;margin-bottom:20px;
                                font-size:13px;color:#4a5568;border:1px solid #e2e8f0;">
                        <strong>Prévia:</strong> ${previewText}…
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button id="draftDiscard" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Descartar
                        </button>
                        <button id="draftRestore" class="btn btn-primary">
                            <i class="fas fa-undo"></i> Restaurar Draft
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#draftRestore').onclick = () => {
            overlay.remove();
            if (onRestore) onRestore(draft.content);
        };

        overlay.querySelector('#draftDiscard').onclick = () => {
            this.clearDraft(itemId);
            overlay.remove();
            if (onDiscard) onDiscard();
        };

        return true;
    },

    _formatAge(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Há poucos segundos';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
        const days = Math.floor(hours / 24);
        return `Há ${days} dia${days > 1 ? 's' : ''}`;
    },

    // ── Version history UI ──────────────────────

    async showVersionHistory(itemId, onRestore) {
        this._showStatus('saving', 'A carregar historial…');

        try {
            const resp = await fetch(`${API_URL}/get_versions.php?item_id=${itemId}`);
            const data = await resp.json();

            if (!data.success || !data.data || data.data.length === 0) {
                this._showStatus('saved', 'Sem versões anteriores');
                showNotification('Sem versões anteriores para este item', 'info');
                return;
            }

            const versions = data.data;
            const overlay = document.createElement('div');
            overlay.id = 'version-history-overlay';
            overlay.innerHTML = `
                <div style="
                    position:fixed; inset:0; background:rgba(0,0,0,0.5);
                    display:flex; align-items:center; justify-content:center;
                    z-index:100000; font-family:system-ui,sans-serif;">
                    <div style="
                        background:#fff; border-radius:16px; padding:0;
                        max-width:560px; width:90%; max-height:80vh;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3); overflow:hidden;
                        display:flex; flex-direction:column;">
                        <div style="padding:24px 28px 16px; border-bottom:1px solid #e9ecf0;">
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="margin:0;font-size:18px;color:#1a1f36;">
                                    <i class="fas fa-history" style="color:#667eea;margin-right:8px;"></i>
                                    Historial de Versões
                                </h3>
                                <button onclick="document.getElementById('version-history-overlay').remove()"
                                    style="background:none;border:none;font-size:20px;cursor:pointer;color:#8892a4;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <p style="margin:6px 0 0;font-size:13px;color:#8892a4;">
                                ${versions.length} versão(ões) guardada(s)
                            </p>
                        </div>
                        <div style="overflow-y:auto; padding:12px 20px 20px;">
                            ${versions.map(v => `
                                <div class="version-row" style="
                                    display:flex; align-items:center; gap:14px;
                                    padding:14px 16px; border-radius:10px;
                                    border:1px solid #e9ecf0; margin-bottom:8px;
                                    transition:background 0.2s; cursor:default;">
                                    <div style="flex-shrink:0;width:38px;height:38px;border-radius:10px;
                                                background:${v.saved_by === 'manual' ? '#eafaf1' : '#eaf4fb'};
                                                display:flex;align-items:center;justify-content:center;">
                                        <i class="fas ${v.saved_by === 'manual' ? 'fa-save' : 'fa-robot'}"
                                           style="color:${v.saved_by === 'manual' ? '#27ae60' : '#2980b9'};font-size:14px;"></i>
                                    </div>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:600;font-size:14px;color:#1a1f36;">
                                            Versão ${v.version}
                                            <span style="font-weight:400;font-size:12px;color:#8892a4;margin-left:6px;">
                                                ${v.saved_by === 'manual' ? 'Manual' : 'Auto'}
                                            </span>
                                        </div>
                                        <div style="font-size:12px;color:#8892a4;margin-top:2px;">
                                            ${new Date(v.created_at).toLocaleString('pt-PT')} ·
                                            ${Math.round(v.content_length / 1024 * 10) / 10} KB
                                        </div>
                                    </div>
                                    <button onclick="Autosave._restoreVersion(${itemId}, ${v.version}, ${JSON.stringify(onRestore ? 'callback' : '')})"
                                        style="padding:7px 14px;border-radius:8px;border:1px solid #667eea;
                                               background:#fff;color:#667eea;font-weight:600;font-size:12px;
                                               cursor:pointer;transition:background 0.12s ease, color 0.12s ease;white-space:nowrap;"
                                        onmouseover="this.style.background='#667eea';this.style.color='#fff'"
                                        onmouseout="this.style.background='#fff';this.style.color='#667eea'">
                                        <i class="fas fa-undo"></i> Restaurar
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Store callback
            this._versionRestoreCallback = onRestore;
            this._showStatus('saved', 'Historial carregado');

        } catch (err) {
            console.error(err);
            this._showStatus('error', 'Erro ao carregar historial');
        }
    },

    async _restoreVersion(itemId, version) {
        try {
            this._showStatus('saving', 'A restaurar…');

            // First get the version content (before restore changes anything)
            const vResp = await fetch(`${API_URL}/get_versions.php?item_id=${itemId}&version=${version}`);
            const vData = await vResp.json();
            if (!vData.success) throw new Error('Versão não encontrada');
            const restoredContent = vData.data.content;

            // Now restore via POST
            const resp = await fetch(`${API_URL}/get_versions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId, version: version }),
            });

            const data = await resp.json();

            if (data.success) {
                const overlay = document.getElementById('version-history-overlay');
                if (overlay) overlay.remove();

                this._showStatus('saved', `Versão ${version} restaurada`);
                showNotification(`Versão ${version} restaurada com sucesso!`, 'success');

                // Clear any cached "last saved" so autosave won't skip
                this._lastSaved[String(itemId)] = null;

                if (this._versionRestoreCallback) {
                    this._versionRestoreCallback(restoredContent);
                } else if (typeof refreshCurrentCategory === 'function') {
                    await refreshCurrentCategory();
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error(err);
            this._showStatus('error', 'Erro ao restaurar');
        }
    },
};
