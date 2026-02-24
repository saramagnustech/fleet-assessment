const CACHE_NAME = 'magnus-fleet-v1';

// Everything we need to cache for offline use
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;600;700&display=swap',
  'https://fonts.gstatic.com/s/bebasneu/v14/JTUSjIg69CK48gW7PXoo9Wdhyzbi.woff2',
  'https://fonts.gstatic.com/s/barlow/v12/7cHpv4kjgoGqM7E3b8s8yn4.woff2',
  'https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B6xTT.woff2'
];

// Install: cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets immediately
      cache.addAll(['./index.html', './manifest.json']);
      // Try to cache fonts - non-blocking, ok if fails on first offline install
      cache.addAll(ASSETS.filter(a => a.startsWith('https://'))).catch(() => {});
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network, cache new responses
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Cache valid responses for future offline use
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // If completely offline and not cached, return a simple offline message
          // (won't happen for the main app since it's cached on install)
          return new Response('<h1>Please connect to the internet to load the app for the first time.</h1>', {
            headers: { 'Content-Type': 'text/html' }
          });
        });
    })
  );
});
