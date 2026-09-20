/* PoolApp Universal — Service Worker v4 (Elias costa NEGRET'S)
   Mesma origem: CACHE-FIRST com refresh em segundo plano.
   Externo (clima/geocode/fontes): NETWORK-FIRST com fallback de cache.
   localStorage: nunca é tocado pelo SW. */
const CACHE = 'poolapp-v4';
const CORE = ['./', './index.html', './manifest.json'];
const OPTIONAL = ['./icon-180.png','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) {
            const cl = res.clone();
            caches.open(CACHE).then(c => c.put(req, cl));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  e.respondWith(
    fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        try { const cl = res.clone(); caches.open(CACHE).then(c => c.put(req, cl)); } catch (_) {}
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
