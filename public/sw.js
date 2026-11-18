var CACHE = "emma-shell-20261118g";
var CORE = [
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/curriculum.js",
  "/sound.js",
  "/strokes.js",
  "/digit-cnn.bin",
  "/purikura.js",
  "/assets/purikura/heart.svg",
  "/assets/purikura/heart-dot.svg",
  "/assets/purikura/heart-gingham.svg",
  "/assets/purikura/heart-lace.svg",
  "/assets/purikura/heart-wing.svg",
  "/assets/purikura/heart-tiny.svg",
  "/assets/purikura/star.svg",
  "/assets/purikura/star-wink.svg",
  "/assets/purikura/star-small.svg",
  "/assets/purikura/bow.svg",
  "/assets/purikura/bow-dot.svg",
  "/assets/purikura/bow-gingham.svg",
  "/assets/purikura/bow-white.svg",
  "/assets/purikura/spark.svg",
  "/assets/purikura/spark-cluster.svg",
  "/assets/purikura/flower.svg",
  "/assets/purikura/bunny.svg",
  "/assets/purikura/bunny-wink.svg",
  "/assets/purikura/cat.svg",
  "/assets/purikura/cloud.svg",
  "/assets/purikura/text-daisuki.svg",
  "/assets/purikura/text-saikou.svg",
  "/assets/purikura/text-kirakira.svg",
  "/assets/purikura/text-pien.svg",
  "/assets/purikura/text-matane.svg",
  "/assets/purikura/frame-pink.svg",
  "/assets/purikura/frame-purple.svg",
  "/assets/purikura/frame-cloud.svg",
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
