/* PoolApp Universal — Service Worker v7 (Elias costa NEGRET'S)
   GitHub Pages (/Casa/): tudo relativo.
   Navegação: NETWORK-FIRST (deploy novo aparece na hora; offline usa cache).
   Estáticos: CACHE-FIRST com refresh em segundo plano.
   APIs de clima (open-meteo / weatherapi): NÃO são cacheadas —
   sempre direto da rede (o app guarda o último clima no localStorage). */
const CACHE = 'poolapp-v7';
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

  /* APIs de clima: NUNCA cachear — deixa passar direto (o app tem o fallback no localStorage) */
  if (url.hostname === 'api.open-meteo.com' || url.hostname === 'api.weatherapi.com') return;

  /* navegação: rede primeiro */
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

  /* mesma origem: cache primeiro + refresh por baixo */
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

  /* outros cross-origin (Google Fonts etc.): rede primeiro, cache como reserva */
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) {
        try { const cl = res.clone(); caches.open(CACHE).then(c => c.put(req, cl)).catch(() => {}); } catch (_) {}
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
