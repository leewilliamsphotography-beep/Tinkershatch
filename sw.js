const CACHE_NAME = 'tinkers-hatch-v2'; // ← BUMP THIS every time you change app.js, style.css, or any HTML
const CORE_ASSETS = [
  './', './index.html', './style.css', './app.js', './staff.html', './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(err => console.log('Cache error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Live data goes straight to the network — never cached, never stale
  if (url.hostname.includes('supabase.co') ||
      url.hostname === 'ntfy.sh' ||
      url.hostname === 'api.open-meteo.com') {
    return;
  }

  // Page navigations: network first, cache only when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  // Static assets: cache first, but ONLY your own files
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        return cached || fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
          }
          return networkResponse;
        });
      })
    );
  }
  // Cross-origin stuff (Google Fonts, ibb.co images) passes straight through
});