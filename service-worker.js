// Service Worker for Full Offline Engineering Suite Hosting
const CACHE_NAME = 'eng-tools-suite-v2';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/tools/',
    '/tools/index.html',
    '/assets/css/style.css',
    '/assets/css/tools-workspace.css',
    '/assets/js/main.js',
    '/assets/js/tools.js',
    '/assets/js/tools_ui.js',
    '/assets/js/tools_expansion.js',
    '/assets/js/diagrams.js',
    '/assets/js/motor_dynamics.js',
    '/assets/js/harness_designer.js',
    '/manifest.json'
];

// Install Event - Precache core shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => {
                    if (name.startsWith('eng-tools-suite-') && name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Prefer current files online; retain a stable cache key for offline tool navigation.
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    const cacheKey = url.origin + url.pathname;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(event.request);
            if (response.ok && response.type === 'basic') {
                event.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
            }
            return response;
        } catch (error) {
            const cached = await cache.match(cacheKey);
            if (cached) return cached;
            if (event.request.mode === 'navigate') {
                const fallback = await cache.match('/tools/');
                if (fallback) return fallback;
            }
            return Response.error();
        }
    })());
});
