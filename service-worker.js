/* ============================================================================
 * NeatPad Service Worker
 * ----------------------------------------------------------------------------
 * Invalide caches em cada deploy: actualiza BUILD_DATE (timestamp único).
 * CACHE_NAME = 'neatpad-v' + BUILD_DATE → activate remove todos os outros.
 *
 * Estratégias:
 *  - Network-first para HTML (index, login, docs) e API
 *  - Stale-while-revalidate para CSS/JS/imagens (cache rápido + validação em rede)
 *  - Nunca cacheia credenciais ou configs sensíveis
 * ==========================================================================*/

// Bump em cada deploy para forçar novo cache (YYYYMMDDHHmm ou sequencial).
const BUILD_DATE = '20260430200000';
const CACHE_NAME   = 'neatpad-v' + BUILD_DATE;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;
const ALLOWED_CACHE_KEYS = new Set([STATIC_CACHE, RUNTIME_CACHE]);

// Assets críticos para funcionamento offline mínimo (shell da app)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/login.html',
    '/docs.html',
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

// ── Install: novo SW assume controlo de imediato ───────────────────────────
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {
                return Promise.all(PRECACHE_URLS.map(url =>
                    cache.add(url).catch(() => null)
                ));
            }))
    );
});

// ── Activate: apagar todos os caches que não sejam os actuais + claim ──────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((k) => !ALLOWED_CACHE_KEYS.has(k))
                    .map((k) => caches.delete(k))
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

/** HTML da app: rede primeiro (sempre conteúdo fresco após deploy). */
function isAppHtmlUrl(url) {
    const p = url.pathname;
    return p === '/' || p === '/index.html' || p.endsWith('/index.html')
        || p === '/login.html' || p.endsWith('/login.html')
        || p === '/docs.html' || p.endsWith('/docs.html');
}

function isHtmlDocument(request, url) {
    return request.mode === 'navigate'
        || (request.headers.get('accept') || '').includes('text/html')
        || url.pathname.endsWith('.html');
}

function isSensitive(url) {
    return url.pathname.includes('firebase-config')
        || url.pathname.includes('config.php');
}

// ── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;

    if (isSensitive(url)) return;

    if (isApiRequest(url)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // HTML da app (e navegação HTML) → network-first, fallback cache
    if (isAppHtmlUrl(url) || isHtmlDocument(request, url)) {
        event.respondWith(networkFirstHtml(request));
        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(cacheFirstWithRevalidate(request));
        return;
    }

    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

/**
 * Cache-first com validação em rede (stale-while-revalidate):
 * devolve cache de imediato se existir; em paralelo pede à rede com
 * cache: 'no-cache' para revalidar / actualizar o SW cache.
 */
async function cacheFirstWithRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    const networkPromise = fetch(request, { cache: 'no-cache' })
        .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        void networkPromise;
        return cached;
    }

    try {
        const response = await networkPromise;
        if (response) return response;
    } catch (_) { /* empty */ }
    return Response.error();
}

async function networkFirstHtml(request) {
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('/index.html');
    }
}

async function networkFirst(request) {
    try {
        return await fetch(request);
    } catch (err) {
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

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
