/* PoolApp Universal — Service Worker (GitHub Pages safe: tudo relativo) */
const CACHE = 'poolapp-v8';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  /* Clima e geocodificação: sempre rede, nunca cache (o app trata fallback) */
  if (url.host.includes('open-meteo') || url.host.includes('bigdatacloud')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(hit =>
      hit ||
      fetch(event.request).then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
