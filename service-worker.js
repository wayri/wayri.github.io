// Service Worker for Full Offline Engineering Suite Hosting
const CACHE_NAME = 'eng-tools-suite-v1';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/tools/',
    '/tools/index.html',
    '/assets/css/style.css',
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
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Cache-first with network fallback
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // Fetch in background to update cache
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Return offline fallback if available
                return caches.match('/tools/index.html');
            });
        })
    );
});
