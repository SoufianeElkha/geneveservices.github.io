// Genève Service - Service Worker
// Bump CACHE_VERSION on each deploy to refresh cached assets
const CACHE_VERSION = 'gs-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/histoire.html',
  '/style.css',
  '/app.js',
  '/lang.js',
  '/leaflet.css',
  '/leaflet.js',
  '/fonts/inter.css',
  '/fonts/InterVariable.woff2',
  '/icon.svg',
  '/manifest.json'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Same-origin static assets: cache-first
// - Everything else (APIs, map tiles): network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return resp;
        }).catch(() => cached);
      })
    );
  } else {
    // External (weather API, map tiles): try network, fall back to cache
    event.respondWith(
      fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return resp;
      }).catch(() => caches.match(request))
    );
  }
});
