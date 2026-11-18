var CACHE = "emma-shell-20261118a";
var CORE = [
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/curriculum.js",
  "/sound.js",
  "/strokes.js",
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
