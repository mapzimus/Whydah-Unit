/* Service worker for Photo Hunt 2.
 *
 * The point: a kid loads this page on school WiFi, walks to Bertram Field with
 * no signal, and the page still opens (and reopens, and survives a refresh).
 * Photos themselves are held in IndexedDB by hunt.js — this only keeps the app
 * shell alive.
 *
 * Strategy: network-first with a short timeout, cache as the fallback. On WiFi
 * that means a fix pushed mid-day reaches phones on the very next load — a
 * stale-while-revalidate cache would hand out yesterday's copy one more time,
 * which is exactly the wrong behaviour for a tool being edited the same day.
 * Off WiFi the fetch fails (or the timeout fires) and the cached copy answers.
 * Supabase requests are never touched — they must always hit the network.
 */
const CACHE = 'photohunt2-v2';
const ASSETS = [
  './',
  './index.html',
  './gallery.html',
  './teams.html',
  './hunt.js',
  '../photo/photo.js',
  '../photo/photo.css',
  '../pics/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // one bad URL should not sink the whole precache
    await Promise.all(ASSETS.map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, etc. — hands off

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // Give the network a moment; a dead field connection should not stall the page.
    const net = (async () => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 2500);
      try {
        const res = await fetch(req, { signal: ctl.signal });
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch (err) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    })();

    const res = await net;
    if (res) return res;

    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    // offline and never cached — for a page request, fall back to the hunt
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
