var CACHE_NAME = 'xmrpay-v2';
var ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/i18n.js',
  '/monitor.js',
  '/style.css',
  '/lib/qrcode.min.js'
  // xmr-crypto.bundle.js is lazy-loaded and runtime-cached
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
             .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // External APIs and RPC proxy — network only, don't cache
  if (url.hostname !== location.hostname || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App assets — cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var networkFetch = fetch(e.request).then(function (response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || networkFetch;
    })
  );
});
