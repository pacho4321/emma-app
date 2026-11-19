var CACHE = "emma-shell-20261119c";
var CORE = [
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/store.js",
  "/firebase-config.js",
  "/cloud.js",
  "/manifest.webmanifest",
  "/assets/icon-180.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/curriculum.js",
  "/sound.js",
  "/strokes.js",
  "/digit-cnn.bin",
  "/purikura.js",
  "/assets/fonts/kosugi-maru-kana.woff2",
  "/assets/purikura/bg.svg",
  "/assets/purikura/icon-camera.svg",
  "/assets/purikura/icon-deco.svg",
  "/assets/purikura/icon-filter.svg",
  "/assets/purikura/icon-frame.svg",
  "/assets/purikura/icon-home.svg",
  "/assets/purikura/icon-save.svg",
  "/assets/purikura/icon-spark.svg",
  "/assets/purikura/icon-text.svg",
  "/assets/purikura/real/chara-01.webp",
  "/assets/purikura/real/chara-02.webp",
  "/assets/purikura/real/chara-03.webp",
  "/assets/purikura/real/chara-04.webp",
  "/assets/purikura/real/chara-05.webp",
  "/assets/purikura/real/chara-06.webp",
  "/assets/purikura/real/chara-07.webp",
  "/assets/purikura/real/chara-08.webp",
  "/assets/purikura/real/frame-bow.webp",
  "/assets/purikura/real/frame-cloud.webp",
  "/assets/purikura/real/frame-glitter.webp",
  "/assets/purikura/real/frame-pink.webp",
  "/assets/purikura/real/frame-purple.webp",
  "/assets/purikura/real/heart-01.webp",
  "/assets/purikura/real/heart-02.webp",
  "/assets/purikura/real/heart-03.webp",
  "/assets/purikura/real/heart-04.webp",
  "/assets/purikura/real/heart-05.webp",
  "/assets/purikura/real/heart-06.webp",
  "/assets/purikura/real/heart-07.webp",
  "/assets/purikura/real/heart-08.webp",
  "/assets/purikura/real/heart-09.webp",
  "/assets/purikura/real/heart-10.webp",
  "/assets/purikura/real/heart-11.webp",
  "/assets/purikura/real/heart-12.webp",
  "/assets/purikura/real/heart-13.webp",
  "/assets/purikura/real/heart-14.webp",
  "/assets/purikura/real/heart-15.webp",
  "/assets/purikura/real/heart-16.webp",
  "/assets/purikura/real/heart-17.webp",
  "/assets/purikura/real/heart-18.webp",
  "/assets/purikura/real/heart-19.webp",
  "/assets/purikura/real/heart-20.webp",
  "/assets/purikura/real/heart-21.webp",
  "/assets/purikura/real/heart-22.webp",
  "/assets/purikura/real/heart-23.webp",
  "/assets/purikura/real/heart-24.webp",
  "/assets/purikura/real/heart-25.webp",
  "/assets/purikura/real/stamp-05.webp",
  "/assets/purikura/real/stamp-06.webp",
  "/assets/purikura/real/stamp-07.webp",
  "/assets/purikura/real/stamp-daisuki.webp",
  "/assets/purikura/real/stamp-memory.webp",
  "/assets/purikura/real/sticker-bunny.webp",
  "/assets/purikura/real/sticker-sakura.webp",
  "/assets/purikura/real/sticker-sukiyo.webp",
  "/assets/purikura/real/sticker-winkstar.webp",
  "/assets/purikura/real/sticker-yellowstar.webp",
  "/assets/apples.webp",
  "/assets/banner-ganbatte.webp",
  "/assets/banner-home.webp",
  "/assets/banner-kuku.webp",
  "/assets/bunny.webp",
  "/assets/button-kanji.webp",
  "/assets/button-kuku.webp",
  "/assets/cloud-pink.webp",
  "/assets/cloud-purple.webp",
  "/assets/cloud-white.webp",
  "/assets/fonts/OFL.txt",
  "/assets/fonts/zen-maru-gothic-900-label.ttf",
  "/assets/numbers/0.svg",
  "/assets/numbers/0.webp",
  "/assets/numbers/1.webp",
  "/assets/numbers/2.webp",
  "/assets/numbers/3.webp",
  "/assets/numbers/4.webp",
  "/assets/numbers/5.webp",
  "/assets/numbers/6.webp",
  "/assets/numbers/7.webp",
  "/assets/numbers/8.webp",
  "/assets/numbers/9.webp",
  "/assets/ops/eq.svg",
  "/assets/ops/minus.svg",
  "/assets/ops/plus.svg",
  "/assets/ops/q.svg",
  "/assets/ops/times.svg",
  "/assets/speaker.webp",
  "/assets/star-blue.webp",
  "/assets/star-pink.webp",
  "/assets/star-yellow.webp",
  "/assets/title.webp"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(CORE);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
      return caches.delete(key);
    }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(function (response) {
    var copy = response.clone();
    caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
    return response;
  }).catch(function () {
    return caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match("/index.html");
      return caches.match(event.request);
    });
  }));
});
