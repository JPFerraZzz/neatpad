// ================================================
// FerrazNest — Autenticação Firebase
// ================================================

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Envia o ID token Firebase para o backend PHP criar a sessão
async function createPhpSession(user) {
    const token = await user.getIdToken();
    const res = await fetch('api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        await fetch('api/auth.php', { method: 'DELETE', credentials: 'same-origin' });
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
