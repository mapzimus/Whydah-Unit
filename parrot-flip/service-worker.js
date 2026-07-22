// service-worker.js — offline precache for Bottle Game.
// Bump CACHE_NAME on every release so stale caches are purged and users get
// the fresh build. All paths are RELATIVE so they resolve under /flipgame/
// on GitHub Pages (the SW lives at repo root → scope is /flipgame/).
const CACHE_NAME = 'parrot-flip-v5';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/polyfills.js',
  './js/game.js',
  './js/physics.js',
  './js/input.js',
  './js/renderer.js',
  './js/audio.js',
  './js/settings.js',
  './js/records.js',
  './js/skins.js',
  './js/main.js',
  './js/vendor/matter.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  // Cache entries INDIVIDUALLY (not addAll, which is atomic). A single 404 or
  // flaky fetch must not abort the whole precache and leave us with no offline
  // cache at all — better a partial cache than none.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything, always: a live classroom needs today's real
// code, not whatever got cached (possibly incomplete — precache tolerates
// partial failures, see above) during some earlier install. The cache is only
// an OFFLINE FALLBACK, never served ahead of a working network fetch — that
// stale-while-revalidate used to serve a cached JS file instantly against a
// freshly fetched HTML page, which could mismatch and crash the game (shows
// as the black window.onerror overlay) until someone manually cleared site data.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const isPage = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() =>
        cache.match(req).then((cached) => cached || (isPage ? cache.match('./') : undefined))
      )
    )
  );
});
