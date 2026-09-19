/* PoolApp Universal — Service Worker (por Elias costa NEGRET'S) */
const CACHE = 'poolapp-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // App shell: cache primeiro (offline instantâneo), atualiza por baixo
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) {
            const cl = res.clone();
            caches.open(CACHE).then(c => c.put(req, cl));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  } else {
    // APIs (clima/geocode): rede primeiro; se falhar, responde do cache
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(req, cl));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
