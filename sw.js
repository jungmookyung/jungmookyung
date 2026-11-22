/* 포켓 툴즈 서비스워커 — 앱 파일 캐시로 오프라인에서도 열림 */
var CACHE = 'pocket-tools-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/util.js',
  './js/app.js',
  './js/tools/exif.js',
  './js/tools/url.js',
  './js/tools/pdf.js',
  './js/tools/compress.js',
  './js/tools/qr.js',
  './js/tools/resize.js',
  './js/tools/watermark.js',
  './vendor/exifr.umd.js',
  './vendor/qrcode.js',
  './vendor/jszip.min.js',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './vendor/pdf-lib.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (url) {
        return c.add(new Request(url, { cache: 'reload' })).catch(function () { /* 개별 실패는 무시 */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  var isNav = req.mode === 'navigate';
  var noCacheFirst = /\.(?:js|css|html|webmanifest)$/.test(url.pathname) || isNav;

  if (noCacheFirst) {
    /* 앱 파일은 네트워크 우선 → 실패하면 캐시 */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || (isNav ? caches.match('./index.html') : undefined) || Response.error();
        });
      })
    );
  } else {
    /* 이미지·vendor 는 캐시 우선 */
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
          return res;
        });
      })
    );
  }
});
