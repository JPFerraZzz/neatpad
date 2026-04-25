// ================================================
// NeatPad — Autenticação Firebase
// ================================================

// Shim global: injecta X-Requested-With em todos os pedidos para a API (CSRF
// "lite") e força credentials:'same-origin' para o cookie de sessão viajar.
// Aplicado uma única vez, antes de qualquer outro código fazer fetch().
(function patchFetchForApi() {
    if (window.__neatpadFetchPatched) return;
    window.__neatpadFetchPatched = true;

    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            // Só toca em chamadas internas para api/ — não interfere com Firebase, fonts, etc.
            if (/(^|\/)api\//.test(url)) {
                init = init || {};
                if (init.credentials === undefined) init.credentials = 'same-origin';
                const headers = new Headers(init.headers || (input && input.headers) || {});
                if (!headers.has('X-Requested-With')) {
                    headers.set('X-Requested-With', 'XMLHttpRequest');
                }
                init.headers = headers;
            }
        } catch (_) { /* fail open: nunca quebrar o fetch original */ }
        return origFetch(input, init);
    };
})();

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Garantir persistência local da sessão Firebase mesmo após refresh/fecho do browser
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

// Envia o ID token Firebase para o backend PHP criar a sessão
async function createPhpSession(user) {
    const token = await user.getIdToken();
    const res = await fetch('api/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ token }),
    });
    let data;
    try {
        data = await res.json();
    } catch (_) {
        throw new Error('Resposta inválida do servidor (HTTP ' + res.status + '). Verifica os logs do Railway.');
    }
    if (!data.success) {
        const errMsg = data.error || 'Erro ao criar sessão';
        throw new Error(res.status === 401 ? errMsg : '[' + res.status + '] ' + errMsg);
    }
    return data;
}

// Espera por uma decisão definitiva do Firebase Auth (com timeout)
function waitForFirebaseUser(timeoutMs = 6000) {
    return new Promise((resolve) => {
        let done = false;
        const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
        const unsub = auth.onAuthStateChanged((user) => {
            if (done) return;
            done = true;
            clearTimeout(t);
            unsub();
            resolve(user || null);
        });
    });
}

/**
 * Bootstrap da sessão para páginas protegidas (chamado por index.html).
 * Estratégia:
 *   1. GET /api/auth.php — sessão PHP ainda válida? Usa.
 *   2. Caso contrário, espera pelo Firebase Auth (que persiste em localStorage)
 *      e recria a sessão PHP com o ID token.
 *   3. Se nem isso, redirige para o login.
 *
 * Este fluxo evita o "logout ao refresh" típico de quando o cookie de sessão
 * PHP expira mas o Firebase ainda tem o utilizador autenticado localmente.
 */
async function bootstrapAuthenticatedPage() {
    // Tentativa 1: sessão PHP existente
    try {
        const r = await fetch('api/auth.php', {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (r.ok) {
            const d = await r.json();
            if (d && d.success && d.data) {
                window.__currentUser = d.data;
                document.dispatchEvent(new CustomEvent('neatpad:auth-ready', { detail: d.data }));
                return d.data;
            }
        }
    } catch (_) { /* continua para fallback Firebase */ }

    // Tentativa 2: Firebase persistido localmente → recriar sessão PHP
    const user = await waitForFirebaseUser();
    if (user) {
        try {
            const d = await createPhpSession(user);
            if (d && d.success && d.data) {
                window.__currentUser = d.data;
                document.dispatchEvent(new CustomEvent('neatpad:auth-ready', { detail: d.data }));
                return d.data;
            }
        } catch (e) {
            console.error('Não foi possível recriar a sessão PHP a partir do Firebase:', e);
        }
    }

    // Sem sessão e sem Firebase user → login
    window.location.replace('login.html');
    return null;
}

// Renovação automática do PHP cookie sempre que o Firebase rota o ID token.
// Sem isto, em sessões longas o cookie PHP pode expirar enquanto o Firebase
// continua válido — daí o "logout misterioso" ao refresh.
auth.onIdTokenChanged((user) => {
    if (!user) return;
    if (window.location.pathname.endsWith('login.html')) return;

    // Pinta o nome assim que o Firebase responde, mesmo antes da sessão PHP voltar.
    if (user.displayName) {
        const nameEl = document.getElementById('userDisplayName');
        if (nameEl && !nameEl.textContent.trim()) nameEl.textContent = user.displayName;
    }
    createPhpSession(user).catch(() => { /* silencioso: bootstrap trata se falhar */ });
});

window.bootstrapAuthenticatedPage = bootstrapAuthenticatedPage;

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span class="loading-spinner"></span>';
    } else {
        btn.innerHTML = btn.dataset.original || btn.innerHTML;
    }
}

function showError(sectionId, msg) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
}

function clearError(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.classList.remove('visible');
}

// Login com Email + Password
async function loginEmail() {
    clearError('loginError');
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError('loginError', 'Preenche o email e a password.');
        return;
    }

    setLoading('loginBtn', true);
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        await createPhpSession(cred.user);
        window.location.replace('index.html');
    } catch (err) {
        const msg = err.code ? translateFirebaseError(err.code) : (err.message || 'Ocorreu um erro. Tenta novamente.');
        showError('loginError', msg);
        setLoading('loginBtn', false);
        if (!err.code) console.error('Erro login/sessão:', err);
    }
}

// Registo com Email + Password
async function registerEmail() {
    clearError('registerError');
    const name     = document.getElementById('registerName').value.trim();
    const email    = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        showError('registerError', 'Preenche todos os campos.');
        return;
    }
    if (password.length < 6) {
        showError('registerError', 'A password deve ter pelo menos 6 caracteres.');
        return;
    }

    setLoading('registerBtn', true);
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await createPhpSession(cred.user);
        window.location.replace('index.html');
    } catch (err) {
        const msg = err.code ? translateFirebaseError(err.code) : (err.message || 'Ocorreu um erro. Tenta novamente.');
        showError('registerError', msg);
        setLoading('registerBtn', false);
        if (!err.code) console.error('Erro registo/sessão:', err);
    }
}

// Login com Google
async function loginGoogle() {
    clearError('loginError');
    clearError('registerError');
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const cred = await auth.signInWithPopup(provider);
        await createPhpSession(cred.user);
        window.location.replace('index.html');
    } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
            const msg = err.code ? translateFirebaseError(err.code) : (err.message || 'Ocorreu um erro. Tenta novamente.');
            showError('loginError', msg);
            if (!err.code) console.error('Erro Google/sessão:', err);
        }
    }
}

// Logout — chamado a partir do index.html
async function logout() {
    try {
        await fetch('api/auth.php', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        await auth.signOut();
    } catch (_) {}
    window.location.replace('login.html');
}

function translateFirebaseError(code) {
    const map = {
        'auth/invalid-email':            'Email inválido.',
        'auth/user-disabled':            'Esta conta foi desativada.',
        'auth/user-not-found':           'Utilizador não encontrado.',
        'auth/wrong-password':           'Password incorreta.',
        'auth/email-already-in-use':     'Este email já está registado.',
        'auth/weak-password':            'A password é demasiado fraca.',
        'auth/too-many-requests':        'Demasiadas tentativas. Tenta mais tarde.',
        'auth/network-request-failed':   'Sem ligação à internet.',
        'auth/invalid-credential':       'Credenciais inválidas.',
        'auth/popup-blocked':            'O popup foi bloqueado pelo browser.',
        'auth/operation-not-allowed':    'Método de login não ativado no Firebase.',
        'auth/requires-recent-login':    'Sessão expirada. Faz logout e entra de novo.',
    };
    return map[code] || (code ? 'Erro: ' + code : 'Ocorreu um erro. Tenta novamente.');
}
