(function () {
    'use strict';

    function csrf() {
        var el = document.getElementById('gestCsrf');
        return el ? el.value : '';
    }

    function uidPage() {
        var el = document.getElementById('gestUid');
        return el ? el.value : '';
    }

    function msg(text, ok) {
        var m = document.getElementById('gestDetailMsg')
            || document.getElementById('gestUsersMsg')
            || document.getElementById('gestDiagMsg');
        if (!m) return;
        m.textContent = text || '';
        m.hidden = !text;
        m.className = 'gest-inline-msg' + (ok ? ' gest-inline-msg--ok' : ' gest-inline-msg--err');
    }

    function postApi(payload) {
        return fetch('api/users.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrf()
            },
            body: JSON.stringify(payload)
        }).then(function (r) {
            return r.json().catch(function () {
                return { success: false, error: 'Resposta inválida.' };
            });
        });
    }

    document.querySelectorAll('.gest-js-api').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var action = btn.getAttribute('data-action');
            var uid = uidPage();
            if (!uid) return;
            var body = { action: action, uid: uid, csrf: csrf() };
            if (action === 'update_notes') {
                var ta = document.getElementById('gestNotes');
                body.notes = ta ? ta.value : '';
            }
            if (action === 'promote_role') {
                var sel = document.getElementById('gestAppRole');
                body.app_role = sel ? sel.value : 'user';
            }
            if (btn.getAttribute('data-use-phrase') === '1') {
                var ph = document.getElementById('gestHardPhrase');
                body.phrase = ph ? ph.value.trim() : '';
            }
            if (btn.getAttribute('data-prompt-days') === '1') {
                var d = window.prompt('Número de dias?', '7');
                var n = parseInt(d, 10);
                if (!n || n < 1) return;
                body.days = Math.min(720, n);
            }
            if (action === 'soft_delete' || action === 'recover') {
                if (!window.confirm('Confirmar esta acção?')) return;
            }
            postApi(body).then(function (j) {
                msg(j.success ? 'Operação concluída.' : (j.error || 'Falhou.'), j.success);
                if (j.success && (action === 'hard_delete' || action === 'soft_delete')) {
                    window.location.href = 'users.php';
                } else if (j.success) {
                    window.location.reload();
                }
            }).catch(function () {
                msg('Pedido falhou.', false);
            });
        });
    });

    var hardBtn = document.getElementById('gestHardBtn');
    if (hardBtn) {
        hardBtn.addEventListener('click', function () {
            var box = document.getElementById('gestHardBox');
            if (box) box.hidden = !box.hidden;
        });
    }

    document.querySelectorAll('.gest-js-act').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var action = btn.getAttribute('data-act');
            var uid = btn.getAttribute('data-uid');
            if (!uid) return;
            var body = { action: action, uid: uid, csrf: csrf() };
            if (action === 'silence' || action === 'suspend') {
                var d = window.prompt('Dias?', '7');
                var n = parseInt(d, 10);
                if (!n || n < 1) return;
                body.days = Math.min(720, n);
            }
            if (action === 'soft_delete' && !window.confirm('Marcar utilizador como eliminado (soft)?')) return;
            postApi(body).then(function (j) {
                msg(j.success ? 'OK.' : (j.error || 'Falhou.'), j.success);
            }).catch(function () {
                msg('Pedido falhou.', false);
            });
        });
    });

    document.querySelectorAll('.gest-diag-logout').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var uid = btn.getAttribute('data-uid');
            if (!uid || !window.confirm('Terminar todas as sessões PHP deste utilizador?')) return;
            postApi({ action: 'force_logout', uid: uid, csrf: csrf() }).then(function (j) {
                msg(j.success ? 'Sessões removidas: ' + (j.removed != null ? j.removed : '?') : (j.error || 'Falhou.'), j.success);
            });
        });
    });

    document.querySelectorAll('.gest-diag-reset').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var uid = btn.getAttribute('data-uid');
            if (!uid || !window.confirm('Reset completo de sessões PHP (moderador+)?')) return;
            postApi({ action: 'reset_sessions', uid: uid, csrf: csrf() }).then(function (j) {
                msg(j.success ? 'Removidas: ' + (j.removed != null ? j.removed : '?') : (j.error || 'Falhou.'), j.success);
            });
        });
    });
})();
