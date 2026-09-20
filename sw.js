/* PoolApp Universal — Service Worker v5 (Elias costa NEGRET'S)
   Navegação (HTML): NETWORK-FIRST → deploy novo aparece na hora; offline usa cache.
   Estáticos (css/js/ícones): CACHE-FIRST com refresh em segundo plano.
   Externo (clima/geocode/fontes): NETWORK-FIRST com fallback de cache.
   localStorage ("dados salvos neste dispositivo"): nunca é tocado pelo SW. */
const CACHE = 'poolapp-v5';
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

  /* 1) navegação: REDE PRIMEIRO — sempre a versão mais nova do app */
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

  /* 2) mesma origem (assets): cache primeiro + atualização por baixo */
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

  /* 3) cross-origin (clima/geocode/fontes): rede primeiro, cache como reserva */
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(req, cl)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
