(function () {
    'use strict';

    var INTERVAL_MS = 30000;

    function apiRootPrefix() {
        var r = document.body ? document.body.getAttribute('data-gest-root') : '';
        if (!r) return '';
        if (r.charAt(0) !== '/') {
            r = '/' + r;
        }
        return r.replace(/\/$/, '') + '/';
    }

    function apiUrl(type) {
        return apiRootPrefix() + 'api/realtime.php?type=' + encodeURIComponent(type);
    }

    function fetchJson(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) {
                return { success: false };
            }
            return r.json().catch(function () {
                return { success: false };
            });
        });
    }

    function setLive(ok) {
        var el = document.getElementById('gestLiveDot');
        if (!el) return;
        el.classList.toggle('gest-live-dot--off', !ok);
        el.setAttribute('aria-label', ok ? 'Ligação em tempo real activa' : 'Última actualização falhou');
    }

    function renderAudit(container, rows) {
        if (!container || !rows || !rows.length) {
            if (container) {
                container.innerHTML = '<p class="gest-muted-line gest-audit-feed__empty">Sem eventos ainda.</p>';
            }
            return;
        }
        var esc = function (s) {
            var t = document.createElement('div');
            t.textContent = s == null ? '' : String(s);
            return t.innerHTML;
        };
        var html = '<ul class="gest-audit-feed__list">';
        rows.forEach(function (a) {
            var when = (a.created_at || '').toString().slice(0, 19);
            var who = esc(a.gest_username || '—');
            var act = esc(a.action || '');
            var tgt = esc(a.target_uid || '');
            html += '<li class="gest-audit-feed__item"><time>' + esc(when) + '</time> <strong>' + who + '</strong> · ' + act;
            if (tgt) html += ' <span class="gest-mono">' + tgt + '</span>';
            html += '</li>';
        });
        html += '</ul>';
        container.innerHTML = html;
    }

    function findRow(uid) {
        var rows = document.querySelectorAll('tr[data-gest-uid]');
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('data-gest-uid') === uid) return rows[i];
        }
        return null;
    }

    function isTruthyOnline(raw) {
        return raw === true || raw === 1 || raw === '1';
    }

    function applyUserRow(u) {
        var tr = findRow(u.uid);
        if (!tr) return;

        var st = (u.status || 'active').toString().toLowerCase();
        var stEl = tr.querySelector('.gest-cell-status .gest-tag');
        if (stEl) {
            stEl.className = 'gest-tag gest-tag--' + st;
            stEl.textContent = st;
        }

        var nameEl = tr.querySelector('.gest-cell-name');
        if (nameEl && Object.prototype.hasOwnProperty.call(u, 'display_name')) {
            var dn = (u.display_name || '').toString().trim();
            nameEl.textContent = dn || '—';
        }

        var emailEl = tr.querySelector('.gest-cell-email');
        if (emailEl && Object.prototype.hasOwnProperty.call(u, 'email')) {
            var em = (u.email || '').toString().trim();
            emailEl.textContent = em || '—';
        }

        var timeEl = tr.querySelector('.gest-cell-lastact__time');
        if (timeEl) timeEl.textContent = u.activity_label || '—';

        var badge = tr.querySelector('.gest-online-badge');
        if (badge) {
            var online = st === 'active' && isTruthyOnline(u.is_online);
            badge.hidden = !online;
        }

        var av = tr.querySelector('.gest-avatar');
        if (av && u.display_name) {
            var t = u.display_name.toString().trim();
            if (t) {
                av.textContent = t.charAt(0).toUpperCase();
            }
        }
    }

    function tick() {
        var hasDash = document.getElementById('gestDashOnline');
        var hasUsers = document.getElementById('gestUsersTable');

        var pDash = hasDash ? fetchJson(apiUrl('dashboard')) : Promise.resolve(null);
        var pUsers = hasUsers ? fetchJson(apiUrl('users_status')) : Promise.resolve(null);

        Promise.all([pDash, pUsers]).then(function (results) {
            var dDash = results[0];
            var dUsers = results[1];
            var ok = (dDash && dDash.success) || (dUsers && dUsers.success);
            setLive(!!ok);

            if (dDash && dDash.success) {
                var onlineEl = document.getElementById('gestDashOnline');
                var ticketsEl = document.getElementById('gestDashTickets');
                var auditEl = document.getElementById('gestDashAudit');
                if (onlineEl) onlineEl.textContent = String(dDash.active_online != null ? dDash.active_online : '—');
                if (ticketsEl) ticketsEl.textContent = String(dDash.tickets_open != null ? dDash.tickets_open : '0');
                if (auditEl && dDash.audit) renderAudit(auditEl, dDash.audit);
            }

            if (dUsers && dUsers.success && dUsers.users) {
                dUsers.users.forEach(applyUserRow);
            }
        }).catch(function () {
            setLive(false);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var main = document.getElementById('gestMain');
        if (!main) return;
        var hasDash = document.getElementById('gestDashOnline');
        var hasUsers = document.getElementById('gestUsersTable');
        if (!hasDash && !hasUsers) return;

        tick();
        setInterval(tick, INTERVAL_MS);
    });
})();
