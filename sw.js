/* PoolApp Universal — Service Worker v8 (Elias costa NEGRET'S)
   GitHub Pages (/Casa/): tudo relativo.
   Navegação: NETWORK-FIRST. Estáticos: CACHE-FIRST com refresh.
   APIs de clima: NUNCA cacheadas (fallback offline fica no localStorage). */
const CACHE = 'poolapp-v8';
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

  /* APIs de clima: passa direto, sem cache */
  if (url.hostname === 'api.open-meteo.com' || url.hostname === 'api.weatherapi.com') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', cl)).catch(() => {});
        }
        return res;
      }).catch(async () =>
        (await caches.match(req)) ||
        (await caches.match('./index.html')) ||
        (await caches.match('./')) ||
        Response.error()
      )
    );
    return;
  }

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
      if (res && res.ok) {
        try { const cl = res.clone(); caches.open(CACHE).then(c => c.put(req, cl)).catch(() => {}); } catch (_) {}
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
