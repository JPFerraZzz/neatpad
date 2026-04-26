/* ============================================================================
 * NeatPad Service Worker
 * ----------------------------------------------------------------------------
 * Estratégias:
 *  - Cache-first   para assets estáticos (CSS, JS, ícones, fonts, HTML shell)
 *  - Network-first para endpoints da API (/api/*) com fallback offline JSON
 *  - Nunca cacheia dados dinâmicos do utilizador nem credenciais
 * ==========================================================================*/

const VERSION      = 'neatpad-v2.2.0';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// Assets críticos para funcionamento offline mínimo (shell da app)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/login.html',
    '/manifest.json',
    '/assets/css/style.css',
    '/assets/js/app.js',
    '/assets/js/auth.js',
    '/assets/js/autosave.js',
    '/assets/js/templates.js',
    '/assets/js/mobile.js',
    '/assets/js/pwa.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    '/assets/icons/apple-touch-icon.png'
];

// ── Install: precache do shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {
                // Se algum asset falhar (ex.: login.html bloqueado), continua
                return Promise.all(PRECACHE_URLS.map(url =>
                    cache.add(url).catch(() => null)
                ));
            }))
            .then(() => self.skipWaiting())
    );
});

// ── Activate: limpar caches antigas ───────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Helpers ───────────────────────────────────────────────────────────────
function isApiRequest(url) {
    return url.pathname.startsWith('/api/') || url.pathname.endsWith('.php');
}

function isStaticAsset(url) {
    return /\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$/i
        .test(url.pathname);
}

function isHtmlDocument(request, url) {
    return request.mode === 'navigate'
        || (request.headers.get('accept') || '').includes('text/html')
        || url.pathname.endsWith('.html');
}

// Nunca cachear credenciais ou configs sensíveis
function isSensitive(url) {
    return url.pathname.includes('firebase-config')
        || url.pathname.includes('config.php');
}

// ── Fetch: routing por tipo de recurso ────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Só tratamos GET (POST/PUT/DELETE passam direto à rede)
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Origem diferente → deixar o browser tratar (CDNs, Google Fonts, Firebase)
    if (url.origin !== self.location.origin) return;

    // Dados sensíveis → bypass total do SW
    if (isSensitive(url)) return;

    // 1) API / PHP → network-first (não cachear dados dinâmicos)
    if (isApiRequest(url)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 2) Documento HTML → network-first com fallback ao cache (shell offline)
    if (isHtmlDocument(request, url)) {
        event.respondWith(networkFirstHtml(request));
        return;
    }

    // 3) Assets estáticos → cache-first
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 4) Restante → network, cai para cache se offline
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

// Cache-first: tenta cache, cai para network e popula cache com a resposta
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response && response.status === 200 && response.type === 'basic') {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Fallback para ícone/asset se disponível; caso contrário, falha silenciosa
        return cached || Response.error();
    }
}

// Network-first para API: nunca cacheia (evita servir dados stale ao utilizador)
async function networkFirst(request) {
    try {
        return await fetch(request);
    } catch (err) {
        // Offline: resposta JSON padronizada para o frontend tratar elegantemente
        return new Response(
            JSON.stringify({
                success: false,
                error: 'offline',
                message: 'Sem ligação. Liga-te à Internet para usar o NeatPad.'
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
        );
    }
}

// Network-first para HTML: atualiza cache do shell quando online
async function networkFirstHtml(request) {
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Último recurso: index.html em cache
        return caches.match('/index.html');
    }
}

// ── Mensagens (permite forçar update a partir do cliente) ─────────────────
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
