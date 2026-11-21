/*
  Emma's study session.
  Photos stay in this tab's memory only. They are not uploaded and
  not written into localStorage.

  Handwriting check is a generous shape comparison against a schoolbook
  glyph. It is not a trained grader. Empty ink is a gentle nudge.
  A clear scribble can be a kind retry. Anything uncertain becomes まる.
  There is no harsh "wrong" state. はなまる is only for a close, centered match.
*/
(function () {
  var QUERY = new URLSearchParams(location.search);
  var TEST_MODE = QUERY.get("test") === "1";
  var GATE_KEY = "emma-who-v1";
  // SHA-256 of the family code and the guest code. The page can only
  // compare these. It is a light lock for a shared tablet, not account security.
  var GATE_HASH = {
    emma: "881078b433019ca48f1be40fd5641f7bbfb1ae4e16e943fd28596ba14c359fbd",
    guest: "66b49fe4f7018673a75d9a7c39911a0458695d23bff9e96b6298eb7704d6bf1d",
    ellen: "edcf12d66bc81b44981af0dce6bde22e0c9e257ba9f25b0ccbb3a72fedde9ff6"
  };
  var GLYPH_FONT = '"Hiragino Maru Gothic ProN", "Hiragino Maru Gothic Pro", "Yu Gothic", "YuGothic", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';
  var GRID_N = 24;
  var RECALL_HANAMARU = 0.8;
  var RECALL_MISS_KANJI = 0.3;
  var RECALL_MISS_MATH = 0.72;
  var COPY_HANAMARU = 0.72;
  var COPY_MARU = 0.38;
  var RIVAL_MIN = 0.55;
  var RIVAL_MARGIN = 0.1;
  var BLUR_PASSES = 2;

  var KANJI_BY_ID = {};
  var KUKU_BY_ID = {};
  KANJI.forEach(function (k) { KANJI_BY_ID[k.id] = k; });
  KUKU.forEach(function (k) { KUKU_BY_ID[k.id] = k; });
  if (window.WORKSHEET_ITEMS) {
    WORKSHEET_ITEMS.forEach(function (k) { KUKU_BY_ID[k.id] = k; });
  }

  var home = document.getElementById("home");
  var play = document.getElementById("play");
  var study = document.getElementById("study");
  var done = document.getElementById("done");
  var startBtn = document.getElementById("startBtn");
  var muteBtn = document.getElementById("muteBtn");
  var timerEl = document.getElementById("timer");
  var cakesEl = document.getElementById("cakes");
  var soonEl = document.getElementById("soon");
  var playNote = document.getElementById("playNote");
  var video = document.getElementById("video");
  var photoCanvas = document.getElementById("photoCanvas");
  var playInk = document.getElementById("playInk");
  var sparkleLayer = document.getElementById("sparkleLayer");
  var captureBtn = document.getElementById("captureBtn");
  var fileInput = document.getElementById("fileInput");
  var resetBtn = document.getElementById("resetBtn");
  var clearPlay = document.getElementById("clearPlay");
  var savePlay = document.getElementById("savePlay");
  var playBack = document.getElementById("playBack");
  var modeTitle = document.getElementById("modeTitle");
  var promptEl = document.getElementById("prompt");
  var questionEl = document.getElementById("question");
  var readingEl = document.getElementById("reading");
  var kanjiBoard = document.getElementById("kanjiBoard");
  var mathBoard = document.getElementById("mathBoard");
  var kanjiGuide = document.getElementById("kanjiGuide");
  var kanjiInk = document.getElementById("kanjiInk");
  var mathGuide = document.getElementById("mathGuide");
  var mathInk = document.getElementById("mathInk");
  var feedbackEl = document.getElementById("feedback");
  var clearBtn = document.getElementById("clearBtn");
  var doneBtn = document.getElementById("doneBtn");
  var skipBtn = document.getElementById("skipBtn");
  var speakBtn = document.getElementById("speakBtn");
  var strokeBtn = document.getElementById("strokeBtn");
  var strokeSvg = document.getElementById("strokeSvg");
  var unitMark = document.getElementById("unitMark");
  var kanjiUserStrokes = [];
  var mathUserStrokes = [];
  var hintIndex = 0;
  var strokeToken = 0;
  var strokePlaying = false;
  var strokeGuideOn = false;
  var guideAnim = 0;
  var strokeSamples = {};
  var SVGNS = "http://www.w3.org/2000/svg";
  var progressEl = document.getElementById("progress");
  var backBtn = document.getElementById("backBtn");
  var againBtn = document.getElementById("againBtn");
  var homeBtn = document.getElementById("homeBtn");

  var progress = loadProgress();
  var active = null;
  var busy = false;
  var stream = null;
  var rawPixels = null;
  var currentStyle = "normal";
  var tool = "draw";
  var playUntil = 0;
  var playTick = 0;
  var photoDone = null;
  var photoEnding = false;
  var tmplCanvas = document.createElement("canvas");
  var tmplCache = {};

  var CSS_FILTER = {
    normal: "none",
    bright: "brightness(1.18) saturate(1.35)",
    toon: "contrast(1.45) saturate(1.7)",
    sparkle: "saturate(1.4) brightness(1.08)"
  };

  function known(ref) {
    if (!ref) return false;
    if (ref.kind === "kanji") return !!KANJI_BY_ID[ref.id];
    if (ref.kind === "kuku" || ref.kind === "math") return !!KUKU_BY_ID[ref.id];
    return false;
  }

  var USERS_KEY = "emma-users-v1";
  var BOOK_CAP = 10;

  function storeGet(key) {
    if (window.EmmaStore) {
      var saved = EmmaStore.get(key);
      if (saved != null) return saved;
    }
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStore(key, value) {
    if (window.EmmaStore) EmmaStore.set(key, value);
    else {
      try { localStorage.setItem(key, value); } catch (e) {}
    }
  }

  function storeSet(key, value) {
    var text = String(value);
    if (/^emma-(progress|book|stickers)-[0-9a-f]{64}$/.test(key)) {
      var prev = storeGet(key);
      if (prev && prev !== text) {
        var older = storeGet("emma-bak1-" + key);
        if (older && older !== prev) writeStore("emma-bak2-" + key, older);
        writeStore("emma-bak1-" + key, prev);
      }
    }
    writeStore(key, text);
    if (window.EmmaCloud && EmmaCloud.noteLocalWrite) EmmaCloud.noteLocalWrite(key);
  }

  function storeRemove(key) {
    if (window.EmmaStore) EmmaStore.remove(key);
    else {
      try { localStorage.removeItem(key); } catch (e) {}
    }
  }

  function readUsers() {
    var list = [];
    try { list = JSON.parse(storeGet(USERS_KEY) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    var out = [];
    var seen = {};
    list.forEach(function (u) {
      if (!u || typeof u.id !== "string" || !/^[0-9a-f]{64}$/.test(u.id)) return;
      if (seen[u.id]) return;
      seen[u.id] = true;
      out.push({
        id: u.id,
        name: String(u.name || "なまえ").slice(0, 12),
        builtin: u.builtin || "",
        avatar: typeof u.avatar === "string" ? u.avatar : "",
        avatarAt: Number(u.avatarAt) || 0
      });
    });
    if (!seen[GATE_HASH.emma]) out.unshift({ id: GATE_HASH.emma, name: "エマ", builtin: "main" });
    if (!seen[GATE_HASH.ellen]) out.push({ id: GATE_HASH.ellen, name: "エレン", builtin: "ellen" });
    if (!seen[GATE_HASH.guest]) out.push({ id: GATE_HASH.guest, name: "ゲスト", builtin: "guest" });
    out.sort(function (a, b) {
      var rank = function (u) {
        if (u.builtin === "main") return 0;
        if (u.builtin === "ellen") return 1;
        if (u.builtin === "guest") return 2;
        return 3;
      };
      return rank(a) - rank(b);
    });
    return out;
  }

  function saveUsers(list) {
    try {
      storeSet(USERS_KEY, JSON.stringify(list.map(function (u) {
        return {
          id: u.id,
          name: String(u.name || "").slice(0, 12),
          builtin: u.builtin || "",
          avatar: typeof u.avatar === "string" ? u.avatar : "",
          avatarAt: Number(u.avatarAt) || 0
        };
      })));
    } catch (e) {}
  }

  function ensureUsers() {
    saveUsers(readUsers());
  }

  function userById(id) {
    var users = readUsers();
    for (var i = 0; i < users.length; i++) if (users[i].id === id) return users[i];
    return null;
  }

  var AVATARS = [
    ["bunny", "うさぎ", "assets/avatars/bunny.webp"],
    ["cat", "ねこ", "assets/avatars/cat.webp"],
    ["bear", "くま", "assets/avatars/bear.webp"],
    ["princess", "おひめさま", "assets/avatars/princess.webp"],
    ["cupcake", "ケーキ", "assets/avatars/cupcake.webp"],
    ["unicorn", "ゆに", "assets/avatars/unicorn.webp"],
    ["chick", "ひよこ", "assets/avatars/chick.webp"],
    ["fox", "きつね", "assets/avatars/fox.webp"],
    ["ellen", "エレン", "assets/avatars/ellen.svg"],
    ["emma-photo", "エマ", "assets/avatars/emma-photo.webp"],
    ["ellen-photo", "エレン", "assets/avatars/ellen-photo.webp"]
  ];

  function avatarIdOf(user) {
    var chosen = user && user.avatar;
    var known = false;
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i][0] === chosen) known = true;
    if (user && user.builtin === "guest") return known && chosen ? chosen : "cupcake";
    if (user && user.builtin === "main") {
      if (known && chosen) return chosen;
      return "emma-photo";
    }
    if (user && user.builtin === "ellen") {
      if (known && chosen && chosen !== "ellen") return chosen;
      return "ellen-photo";
    }
    if (known && chosen) return chosen;
    var n = 0;
    var id = user && user.id || "";
    if (id.length >= 2) n = parseInt(id.slice(0, 2), 16) || 0;
    return AVATARS[(n % (AVATARS.length - 2)) + 2][0];
  }

  function avatarSrc(user) {
    var id = avatarIdOf(user);
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i][0] === id) return AVATARS[i][2];
    return AVATARS[0][2];
  }

  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch];
    });
  }

  var KNOWN_KEY = "emma-known-v1";
  function knownIds() {
    var list = [];
    try { list = JSON.parse(storeGet(KNOWN_KEY) || "[]"); } catch (e) { list = []; }
    return Array.isArray(list) ? list : [];
  }

  function rememberProfile(id) {
    if (!id) return;
    var list = knownIds();
    if (list.indexOf(id) < 0) list.push(id);
    storeSet(KNOWN_KEY, JSON.stringify(list));
  }

  function profileRemembered(id) {
    return knownIds().indexOf(id) >= 0;
  }

  function profileId() {
    var w = "";
    w = storeGet(GATE_KEY) || "";
    if (w === "emma") return GATE_HASH.emma;
    if (w === "guest") return GATE_HASH.guest;
    if (!/^[0-9a-f]{64}$/.test(w)) return "";
    if (userById(w)) return w;
    return "";
  }

  function isMainProfile() {
    return profileId() === GATE_HASH.emma;
  }

  function progressKey() {
    var id = profileId();
    return id ? ("emma-progress-" + id) : "emma-progress-none";
  }

  function activeKey() {
    var id = profileId();
    return id ? ("emma-active-" + id) : "emma-active-none";
  }

  function bookKey() {
    var id = profileId();
    return id ? ("emma-book-" + id) : "emma-book-none";
  }

  function legacyProgressKey(id) {
    if (id === GATE_HASH.emma) return "emma-progress-v1";
    if (id === GATE_HASH.guest) return "emma-progress-guest-v1";
    return "";
  }

  function savedRicher(current, extra) {
    if (!extra) return current || "";
    if (!current) return extra;
    if (!window.EmmaCloud || !EmmaCloud.mergeProgress) return current;
    try { return EmmaCloud.mergeProgress(current, JSON.parse(extra)); } catch (e) { return current; }
  }

  function migrateFamilySaves() {
    [GATE_HASH.emma, GATE_HASH.ellen].forEach(function (id) {
      var key = "emma-progress-" + id;
      var best = "";
      [storeGet(key), storeGet("emma-bak1-" + key), storeGet("emma-bak2-" + key), storeGet(legacyProgressKey(id))].forEach(function (text) {
        best = savedRicher(best, text);
      });
      if (best && best !== storeGet(key)) storeSet(key, best);
    });
  }

  function legacyActiveKey(id) {
    if (id === GATE_HASH.emma) return "emma-active-v1";
    if (id === GATE_HASH.guest) return "emma-active-guest-v1";
    return "";
  }

  function sha256hex(ascii) {
    function rr(n, x) { return (x >>> n) | (x << (32 - n)); }
    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    var bytes = [];
    for (var i = 0; i < ascii.length; i++) bytes.push(ascii.charCodeAt(i) & 255);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (var shift = 7; shift >= 0; shift--) bytes.push((bitLen / Math.pow(2, shift * 8)) & 255);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    for (var off = 0; off < bytes.length; off += 64) {
      for (var t = 0; t < 16; t++) {
        w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
      }
      for (var t2 = 16; t2 < 64; t2++) {
        var s0 = rr(7, w[t2 - 15]) ^ rr(18, w[t2 - 15]) ^ (w[t2 - 15] >>> 3);
        var s1 = rr(17, w[t2 - 2]) ^ rr(19, w[t2 - 2]) ^ (w[t2 - 2] >>> 10);
        w[t2] = (w[t2 - 16] + s0 + w[t2 - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (var t3 = 0; t3 < 64; t3++) {
        var S1 = rr(6, e) ^ rr(11, e) ^ rr(25, e);
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (h + S1 + ch + K[t3] + w[t3]) | 0;
        var S0 = rr(2, a) ^ rr(13, a) ^ rr(22, a);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (n) { return ("00000000" + (n >>> 0).toString(16)).slice(-8); }).join("");
  }

  function loadProgress() {
    var base = {};
    try {
      var raw = storeGet(progressKey());
      if (!raw) raw = storeGet(legacyProgressKey(profileId())) || "";
      var parsed = JSON.parse(raw || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) base = parsed;
    } catch (e) {}
    base.sessions = Number(base.sessions) || 0;
    base.kanjiIndex = Number(base.kanjiIndex) || 0;
    base.kukuIndex = Number(base.kukuIndex) || 0;
    base.worksheetIndex = Number(base.worksheetIndex) || 0;
    base.mute = !!base.mute;
    base.bgmPaused = !!base.bgmPaused;
    if (Array.isArray(base.remember)) base.remember = base.remember.filter(known);
    else base.remember = [];
    base.kanjiIndex = ((base.kanjiIndex % KANJI.length) + KANJI.length) % KANJI.length;
    base.kukuIndex = ((base.kukuIndex % KUKU.length) + KUKU.length) % KUKU.length;
    if (window.WORKSHEET_ITEMS && WORKSHEET_ITEMS.length) {
      base.worksheetIndex = ((base.worksheetIndex % WORKSHEET_ITEMS.length) + WORKSHEET_ITEMS.length) % WORKSHEET_ITEMS.length;
    }
    return base;
  }

  function saveProgress() {
    try {
      progress.updatedAt = Date.now();
      storeSet(progressKey(), JSON.stringify(progress));
    } catch (e) {}
  }

  function mirrorEspanolStickers() {
    var id = profileId();
    if (!id || !progress.spanish) return;
    var key = "emma-stickers-" + id;
    var prev = {};
    try { prev = JSON.parse(storeGet(key) || "{}"); } catch (e) { prev = {}; }
    if (!Array.isArray(prev.items)) prev.items = [];
    prev.espanol = Array.isArray(progress.spanish.stickers) ? progress.spanish.stickers.slice(-40) : [];
    prev.updatedAt = Date.now();
    storeSet(key, JSON.stringify(prev));
  }

  function readActive() {
    try {
      var text = sessionStorage.getItem(activeKey());
      if (!text) text = sessionStorage.getItem(legacyActiveKey(profileId())) || "";
      var raw = JSON.parse(text || "null");
      if (!raw || !Array.isArray(raw.queue)) return null;
      raw.queue = raw.queue.filter(known);
      return raw;
    } catch (e) {
      return null;
    }
  }

  function saveActive() {
    if (!active) return;
    try {
      sessionStorage.setItem(activeKey(), JSON.stringify(active));
    } catch (e) {}
  }

  function emptyBook() {
    return { kanji: {}, facts: {} };
  }

  function loadBook() {
    try {
      var raw = JSON.parse(storeGet(bookKey()) || "");
      if (!raw || typeof raw !== "object") return emptyBook();
      if (!raw.kanji || typeof raw.kanji !== "object") raw.kanji = {};
      if (!raw.facts || typeof raw.facts !== "object") raw.facts = {};
      return raw;
    } catch (e) {
      return emptyBook();
    }
  }

  function saveBook(book) {
    try {
      book.updatedAt = Date.now();
      storeSet(bookKey(), JSON.stringify(book));
      return true;
    } catch (e) {
      return false;
    }
  }

  function shrinkBook(book) {
    Object.keys(book.kanji).forEach(function (id) {
      var row = book.kanji[id];
      if (!Array.isArray(row)) { delete book.kanji[id]; return; }
      if (row.length > BOOK_CAP) book.kanji[id] = row.slice(row.length - BOOK_CAP);
      book.kanji[id] = book.kanji[id].map(function (cell) {
        if (!cell || !cell.img) return null;
        return { img: cell.img, stamp: cell.stamp === "hanamaru" ? "hanamaru" : "maru", t: Number(cell.t) || 0 };
      }).filter(Boolean);
      if (!book.kanji[id].length) delete book.kanji[id];
    });
  }

  function thumbOf(canvas) {
    var size = 72;
    var out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    var ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(canvas, 0, 0, size, size);
    return out.toDataURL("image/jpeg", 0.52);
  }

  function saveKanjiSample(view, canvas, stamp) {
    if (!view || view.kind !== "kanji" || !profileId()) return;
    var book = loadBook();
    if (!book.kanji[view.id]) book.kanji[view.id] = [];
    book.kanji[view.id].push({ img: thumbOf(canvas), stamp: stamp === "hanamaru" ? "hanamaru" : "maru", t: Date.now() });
    shrinkBook(book);
    if (!saveBook(book)) {
      var row = book.kanji[view.id] || [];
      book.kanji[view.id] = row.slice(-3);
      Object.keys(book.kanji).forEach(function (id) {
        if (id !== view.id && book.kanji[id].length > 4) book.kanji[id] = book.kanji[id].slice(-4);
      });
      saveBook(book);
    }
  }

  function saveFactSample(view, stamp) {
    if (!view || view.kind === "kanji" || !profileId() || !active) return;
    var mode = active.mode === "sansu" || active.mode === "math" ? "sansu" : "kuku";
    var book = loadBook();
    var key = mode + ":" + view.id;
    var prev = book.facts[key] || { n: 0, stamp: "maru", mode: mode, id: view.id };
    prev.n = (Number(prev.n) || 0) + 1;
    prev.stamp = stamp === "hanamaru" || prev.stamp === "hanamaru" ? "hanamaru" : "maru";
    prev.mode = mode;
    prev.id = view.id;
    prev.t = Date.now();
    book.facts[key] = prev;
    saveBook(book);
  }

  function playSeconds() {
    var n = Number(QUERY.get("play"));
    if (!n || n < 1) return 300;
    return Math.min(300, Math.floor(n));
  }

  function dailyCounts(reviewRound) {
    if (TEST_MODE) {
      var n = Math.min(4, Math.max(1, Number(QUERY.get("n")) || 1));
      return { kanji: n, kuku: n, reviewCap: n };
    }
    if (reviewRound) return { kanji: 2, kuku: 2, reviewCap: 6 };
    return { kanji: 4, kuku: 4, reviewCap: 6 };
  }

  function take(list, start, count) {
    var items = [];
    for (var i = 0; i < count; i++) items.push(list[(start + i) % list.length]);
    return { items: items, next: (start + count) % list.length };
  }

  function interleave(a, b) {
    var out = [];
    var n = Math.max(a.length, b.length);
    for (var i = 0; i < n; i++) {
      if (i < a.length) out.push(a[i]);
      if (i < b.length) out.push(b[i]);
    }
    return out;
  }

  function freshRef(item) {
    return {
      kind: item.kind,
      id: item.id,
      copy: false,
      fromRemember: false,
      endRedo: false,
      misses: 0,
      hint: 0
    };
  }

  function makePlan(mode) {
    var sessionLen = 10;
    if (TEST_MODE) sessionLen = Math.min(10, Math.max(1, Number(QUERY.get("n")) || 1));
    var nextKanji = progress.kanjiIndex;
    var nextKuku = progress.kukuIndex;
    var nextWorksheet = progress.worksheetIndex || 0;
    var list;
    var start;
    if (mode === "kuku") {
      list = KUKU.filter(isPureKukuItem);
      start = nextKuku;
    } else if (mode === "sansu" || mode === "math") {
      mode = "sansu";
      list = (window.WORKSHEET_ITEMS && WORKSHEET_ITEMS.length) ? WORKSHEET_ITEMS : [];
      start = nextWorksheet;
    } else {
      mode = "kanji";
      list = KANJI;
      start = nextKanji;
    }
    var taken = take(list, start, sessionLen);
    if (mode === "kanji") nextKanji = taken.next;
    if (mode === "kuku") nextKuku = taken.next;
    if (mode === "sansu") nextWorksheet = taken.next;
    return {
      queue: taken.items.map(freshRef),
      mode: mode,
      nextKanji: nextKanji,
      nextKuku: nextKuku,
      nextWorksheet: nextWorksheet,
      reviewRound: false
    };
  }

  function fillKanjiPhrase(el, phrase, mark) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var at = mark ? phrase.indexOf(mark) : -1;
    if (at < 0) {
      el.textContent = phrase;
      return;
    }
    el.appendChild(document.createTextNode(phrase.slice(0, at)));
    var markEl = document.createElement("span");
    markEl.className = "phrase-mark";
    markEl.textContent = mark;
    el.appendChild(markEl);
    el.appendChild(document.createTextNode(phrase.slice(at + mark.length)));
  }

  function hydrate(ref) {
    if (ref.kind === "kanji") {
      var k = KANJI_BY_ID[ref.id];
      return {
        kind: "kanji",
        id: ref.id,
        copy: !!ref.copy,
        fromRemember: !!ref.fromRemember,
        endRedo: !!ref.endRedo,
        misses: ref.misses || 0,
        hint: ref.hint || 0,
        kanji: k.kanji,
        speak: k.speak,
        reading: k.speak,
        yomi: k.yomi || k.speak,
        okuri: k.okuri || "",
        phrase: k.phrase || k.speak,
        mark: k.mark || k.speak,
        answer: k.kanji,
        unit: k.unit || 0,
        volume: k.volume || ""
      };
    }
    var m = KUKU_BY_ID[ref.id];
    return {
      kind: "kuku",
      id: ref.id,
      copy: !!ref.copy,
      fromRemember: !!ref.fromRemember,
      endRedo: !!ref.endRedo,
      misses: ref.misses || 0,
      hint: ref.hint || 0,
      a: m.a,
      b: m.b,
      speak: m.speak,
      answer: m.answer || String((m.a || 0) * (m.b || 0)),
      story: m.story || "",
      label: m.label || "",
      op: m.op || "",
      promptText: m.prompt || ""
    };
  }

  function addRemember(ref) {
    if (progress.remember.some(function (r) { return r.kind === ref.kind && r.id === ref.id; })) return;
    progress.remember.push({ kind: ref.kind, id: ref.id });
    if (progress.remember.length > 40) progress.remember.shift();
    saveProgress();
  }

  function removeRemember(ref) {
    progress.remember = progress.remember.filter(function (r) {
      return !(r.kind === ref.kind && r.id === ref.id);
    });
    saveProgress();
  }

  var rewardTimer = 0;
  function cancelReward() {
    clearTimeout(rewardTimer);
    rewardTimer = 0;
  }

  function showOnly(name) {
    var profiles = document.getElementById("profiles");
    var startPick = document.getElementById("startPick");
    if (startPick) startPick.hidden = name !== "start";
    if (profiles) profiles.hidden = name !== "profiles";
    var pick = document.getElementById("avatarPick");
    if (pick && name !== "home" && name !== "parent") pick.hidden = true;
    var veil = document.getElementById("loadVeil");
    if (veil && name !== "home") veil.hidden = true;
    if (gateEl) gateEl.hidden = true;
    home.hidden = name !== "home";
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = name === "home" || name === "ellen" || name === "espanol";
    play.hidden = name !== "play";
    study.hidden = name !== "study";
    done.hidden = name !== "done";
    var book = document.getElementById("book");
    var parent = document.getElementById("parent");
    if (book) book.hidden = name !== "book";
    if (parent) parent.hidden = name !== "parent";
    var ellenHome = document.getElementById("ellenHome");
    var espanol = document.getElementById("espanol");
    if (ellenHome) ellenHome.hidden = name !== "ellen";
    if (espanol) espanol.hidden = name !== "espanol";
    document.body.dataset.screen = name;
    if (name === "home") fitHome();
  }

  function updateParentButton() {
    var btn = document.getElementById("parentBtn");
    if (btn) btn.hidden = !isMainProfile();
  }

  function updateMuteLabel() {
    if (!muteBtn) return;
    muteBtn.textContent = "⚙";
    muteBtn.setAttribute("aria-label", progress.mute ? "おと なし" : "おと あり");
    muteBtn.setAttribute("aria-pressed", progress.mute ? "true" : "false");
  }

  function updateListenLabel() {
    var label = document.getElementById("listenLabel");
    var kanji = document.body.dataset.mode === "kanji";
    if (label) label.textContent = kanji ? "おんがく" : "うた";
    if (!speakBtn) return;
    var musicOn = kanji && !progress.bgmPaused;
    speakBtn.classList.toggle("is-on", musicOn);
    speakBtn.setAttribute("aria-pressed", musicOn ? "true" : "false");
    speakBtn.setAttribute("aria-label", kanji ? (musicOn ? "おんがく とめる" : "おんがく") : "九九のうた");
  }

  function kanjiMusicOff() {
    progress.bgmPaused = true;
    EmmaSound.setBgmPaused(true);
    EmmaSound.stopBgm();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    updateListenLabel();
  }

  function applySoundFlags() {
    EmmaSound.setMuted(progress.mute);
    EmmaSound.setBgmPaused(true);
    progress.bgmPaused = true;
    updateMuteLabel();
    updateListenLabel();
  }

  function fitHome() {
    var stage = document.getElementById("skyStage");
    var frame = document.getElementById("home");
    if (!stage || !frame) return;
    var w = frame.clientWidth || window.innerWidth;
    var h = frame.clientHeight || window.innerHeight;
    if (!w || !h) return;
    var s = Math.min(w / 784, h / 1168);
    stage.style.transform = "scale(" + s + ")";
  }

  function renderProfiles() {
    var grid = document.getElementById("profileGrid");
    if (!grid) return;
    var users = readUsers();
    grid.classList.toggle("few", users.length <= 3);
    grid.innerHTML = users.map(function (user) {
      return "<button type='button' class='profile-card' data-profile='" + user.id + "'><img alt='' src='" + avatarSrc(user) + "'><span>" + escapeHtml(user.name) + "</span></button>";
    }).join("");
  }

  var chosenApp = "";

  function showStart() {
    cancelReward();
    stopPlayTimer();
    stopCamera();
    if (window.EmmaSpanish) EmmaSpanish.stop();
    EmmaSound.stopSong();
    kanjiMusicOff();
    chosenApp = "";
    var start = document.getElementById("startPick");
    if (start) start.hidden = false;
    var profiles = document.getElementById("profiles");
    if (profiles) profiles.hidden = true;
    if (gateEl) gateEl.hidden = true;
    var pick = document.getElementById("avatarPick");
    if (pick) pick.hidden = true;
    var veil = document.getElementById("loadVeil");
    if (veil) veil.hidden = true;
    home.hidden = true;
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = true;
    if (play) play.hidden = true;
    if (study) study.hidden = true;
    if (done) done.hidden = true;
    var book = document.getElementById("book");
    var parent = document.getElementById("parent");
    if (book) book.hidden = true;
    if (parent) parent.hidden = true;
    var ellenHome = document.getElementById("ellenHome");
    var espanol = document.getElementById("espanol");
    if (ellenHome) ellenHome.hidden = true;
    if (espanol) espanol.hidden = true;
    document.body.dataset.screen = "start";
  }

  function showProfiles() {
    cancelReward();
    stopPlayTimer();
    stopCamera();
    EmmaSound.stopSong();
    var start = document.getElementById("startPick");
    if (start) start.hidden = true;
    var profiles = document.getElementById("profiles");
    if (profiles) profiles.hidden = false;
    var title = document.getElementById("profileTitle");
    if (title) title.textContent = chosenApp === "espanol" ? "ESPAÑOL" : "エマ勉強";
    if (gateEl) gateEl.hidden = true;
    var pick = document.getElementById("avatarPick");
    if (pick) pick.hidden = true;
    var veil = document.getElementById("loadVeil");
    if (veil) veil.hidden = true;
    home.hidden = true;
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = true;
    if (play) play.hidden = true;
    if (study) study.hidden = true;
    if (done) done.hidden = true;
    var book = document.getElementById("book");
    var parent = document.getElementById("parent");
    if (book) book.hidden = true;
    if (parent) parent.hidden = true;
    var ellenHome = document.getElementById("ellenHome");
    var espanol = document.getElementById("espanol");
    if (ellenHome) ellenHome.hidden = true;
    if (espanol) espanol.hidden = true;
    document.body.dataset.screen = "profiles";
    renderProfiles();
  }

  function showLoading(user) {
    var veil = document.getElementById("loadVeil");
    var img = document.getElementById("loadAvatar");
    if (img && user) img.src = avatarSrc(user);
    if (veil) veil.hidden = false;
    var profiles = document.getElementById("profiles");
    if (profiles) profiles.hidden = true;
    if (gateEl) gateEl.hidden = true;
  }

  function hideLoading() {
    var veil = document.getElementById("loadVeil");
    if (veil) veil.hidden = true;
  }

  function showHome() {
    cancelReward();
    stopPlayTimer();
    stopCamera();
    EmmaSound.stopSong();
    kanjiMusicOff();
    showOnly("home");
    updateParentButton();
    var mine = document.querySelector("#myAvatar img");
    var me = userById(profileId());
    if (mine && me) mine.src = avatarSrc(me);
    fitHome();
  }

  function pos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function clearInk(canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function bindDraw(canvas, lineWidth, allowSticker, hooks) {
    var drawing = false;
    var pts = null;
    var activePointer = null;
    canvas.style.touchAction = "none";
    var box = canvas.closest(".masu, .math-board, .stage") || canvas.parentElement;
    if (box && !box.dataset.touchLocked) {
      box.dataset.touchLocked = "1";
      box.style.touchAction = "none";
      ["touchstart", "touchmove", "touchend", "gesturestart", "gesturechange"].forEach(function (type) {
        box.addEventListener(type, function (e) {
          if (e.cancelable) e.preventDefault();
        }, { passive: false });
      });
    }
    document.addEventListener("touchmove", function (e) {
      if (!drawing || !e.cancelable) return;
      e.preventDefault();
    }, { passive: false });

    function finish(e) {
      if (e && activePointer != null && e.pointerId != null && e.pointerId !== activePointer) return;
      if (drawing && pts && pts.length > 1 && hooks && hooks.onStroke) hooks.onStroke(pts);
      drawing = false;
      pts = null;
      activePointer = null;
      document.documentElement.classList.remove("drawing");
    }

    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.cancelable) e.preventDefault();
      if (allowSticker && tool !== "draw") {
        var spot = pos(canvas, e);
        var sctx = canvas.getContext("2d");
        sctx.font = "72px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillText(tool, spot.x, spot.y);
        EmmaSound.pop();
        return;
      }
      if (hooks && hooks.onStart) hooks.onStart();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      drawing = true;
      activePointer = e.pointerId;
      document.documentElement.classList.add("drawing");
      pts = [];
      var ctx = canvas.getContext("2d");
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#241b38";
      var p = pos(canvas, e);
      pts.push(p);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.2, p.y + 0.2);
      ctx.stroke();
    }, { passive: false });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing || e.pointerId !== activePointer) return;
      if (e.cancelable) e.preventDefault();
      var p = pos(canvas, e);
      if (pts) pts.push(p);
      canvas.getContext("2d").lineTo(p.x, p.y);
      canvas.getContext("2d").stroke();
    }, { passive: false });
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
  }

  function inkStats(canvas) {
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var w = canvas.width;
    var h = canvas.height;
    var data = ctx.getImageData(0, 0, w, h).data;
    var minX = w, minY = h, maxX = -1, maxY = -1, count = 0;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 40) {
          count++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { data: data, w: w, h: h, count: count, minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function gridFromStats(stats, normalize) {
    var grid = new Float32Array(GRID_N * GRID_N);
    if (!stats.count) return grid;
    var x0 = 0, y0 = 0, x1 = stats.w, y1 = stats.h;
    if (normalize && stats.maxX >= stats.minX) {
      var bw = stats.maxX - stats.minX + 1;
      var bh = stats.maxY - stats.minY + 1;
      var padX = Math.max(2, bw * 0.12);
      var padY = Math.max(2, bh * 0.12);
      x0 = Math.max(0, Math.floor(stats.minX - padX));
      y0 = Math.max(0, Math.floor(stats.minY - padY));
      x1 = Math.min(stats.w, Math.ceil(stats.maxX + 1 + padX));
      y1 = Math.min(stats.h, Math.ceil(stats.maxY + 1 + padY));
    }
    var bw2 = Math.max(1, x1 - x0);
    var bh2 = Math.max(1, y1 - y0);
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) {
        var a = stats.data[(y * stats.w + x) * 4 + 3];
        if (a > 40) {
          var gx = Math.min(GRID_N - 1, Math.floor(((x - x0) / bw2) * GRID_N));
          var gy = Math.min(GRID_N - 1, Math.floor(((y - y0) / bh2) * GRID_N));
          grid[gy * GRID_N + gx] += a / 255;
        }
      }
    }
    return grid;
  }

  function blur(grid) {
    var out = new Float32Array(GRID_N * GRID_N);
    for (var y = 0; y < GRID_N; y++) {
      for (var x = 0; x < GRID_N; x++) {
        var s = 0, c = 0;
        for (var yy = y - 1; yy <= y + 1; yy++) {
          for (var xx = x - 1; xx <= x + 1; xx++) {
            if (yy < 0 || xx < 0 || yy >= GRID_N || xx >= GRID_N) continue;
            s += grid[yy * GRID_N + xx];
            c++;
          }
        }
        out[y * GRID_N + x] = s / c;
      }
    }
    return out;
  }

  function blurPasses(grid, n) {
    var g = grid;
    for (var i = 0; i < n; i++) g = blur(g);
    return g;
  }

  function cosine(a, b) {
    var d = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
      d += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (!na || !nb) return 0;
    return d / Math.sqrt(na * nb);
  }

  function coverage(user, tmpl) {
    var hit = 0, total = 0;
    for (var i = 0; i < tmpl.length; i++) {
      if (tmpl[i] > 0.18) {
        total++;
        if (user[i] > 0.06) hit++;
      }
    }
    return total ? hit / total : 0;
  }

  function glyphSize(text, w, h) {
    if (String(text).length > 1) return Math.floor(h * 0.62);
    return Math.floor(Math.min(w, h) * 0.62);
  }

  function renderTmpl(text, w, h) {
    var key = text + "@" + w + "x" + h;
    if (tmplCache[key]) return tmplCache[key];
    tmplCanvas.width = w;
    tmplCanvas.height = h;
    var ctx = tmplCanvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + glyphSize(text, w, h) + "px " + GLYPH_FONT;
    ctx.fillText(text, w / 2, h / 2);
    var stats = inkStats(tmplCanvas);
    tmplCache[key] = {
      norm: blurPasses(gridFromStats(stats, true), BLUR_PASSES),
      pos: blurPasses(gridFromStats(stats, false), BLUR_PASSES)
    };
    return tmplCache[key];
  }

  function renderStrokeTmpl(ch, w, h) {
    var key = "stroke:" + ch + "@" + w + "x" + h;
    if (tmplCache[key]) return tmplCache[key];
    var exp = expectedStrokes(ch);
    if (!exp.length) return null;
    tmplCanvas.width = w;
    tmplCanvas.height = h;
    var ctx = tmplCanvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = Math.max(10, Math.round(Math.min(w, h) * 0.075));
    exp.forEach(function (pts) {
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w, pts[i].y * h);
      ctx.stroke();
    });
    var stats = inkStats(tmplCanvas);
    tmplCache[key] = { norm: blurPasses(gridFromStats(stats, true), BLUR_PASSES) };
    return tmplCache[key];
  }

  function paintGuide(canvas, text) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#6b5a8e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + glyphSize(text, canvas.width, canvas.height) + "px " + GLYPH_FONT;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.globalAlpha = 1;
  }

  function placementOk(stats) {
    var bw = stats.maxX - stats.minX + 1;
    var bh = stats.maxY - stats.minY + 1;
    var cx = (stats.minX + stats.maxX) / 2;
    var cy = (stats.minY + stats.maxY) / 2;
    var nx = Math.abs(cx - stats.w / 2) / (stats.w / 2);
    var ny = Math.abs(cy - stats.h / 2) / (stats.h / 2);
    var size = Math.max(bw / stats.w, bh / stats.h);
    return nx < 0.35 && ny < 0.35 && size > 0.32 && size < 0.96;
  }

  function rivalMiss(userGrid, answer, w, h) {
    if (!/^\d{1,2}$/.test(answer)) return false;
    var correct = cosine(userGrid, renderTmpl(answer, w, h).norm);
    var cands = [];
    if (answer.length === 1) {
      "0123456789".split("").forEach(function (d) {
        if (d !== answer) cands.push(d);
      });
    } else {
      var n = Number(answer);
      [String(n + 1), String(Math.max(0, n - 1)), answer[1] + answer[0], answer[0], answer[1]].forEach(function (c) {
        if (c && c !== answer) cands.push(c);
      });
    }
    var best = 0;
    cands.forEach(function (c) {
      var s = cosine(userGrid, renderTmpl(c, w, h).norm);
      if (s > best) best = s;
    });
    return best >= RIVAL_MIN && best > correct + RIVAL_MARGIN;
  }

  function isPureKukuItem(item) {
    return !!(item && item.kind === "kuku" && item.a && item.b && !item.op && !item.page);
  }

  function isPureKukuRef(ref) {
    if (!ref || ref.kind === "kanji") return false;
    return isPureKukuItem(KUKU_BY_ID[ref.id]);
  }

  var digitGrids = null;
  function digitTemplates() {
    if (digitGrids) return digitGrids;
    digitGrids = {};
    function pack(draw) {
      tmplCanvas.width = 120;
      tmplCanvas.height = 160;
      var ctx = tmplCanvas.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, 120, 160);
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#000";
      draw(ctx);
      var stats = inkStats(tmplCanvas);
      if (!stats.count) return null;
      return blurPasses(gridFromStats(stats, true), 4);
    }
    function fontGrid(ch) {
      return pack(function (ctx) {
        ctx.font = "bold 112px " + GLYPH_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, 60, 82);
      });
    }
    function strokeGrid(draw) {
      return pack(function (ctx) {
        ctx.beginPath();
        draw(ctx);
        ctx.stroke();
      });
    }
    "0123456789".split("").forEach(function (d) {
      digitGrids[d] = [fontGrid(d)];
    });
    digitGrids["1"].push(
      strokeGrid(function (ctx) { ctx.moveTo(60, 18); ctx.lineTo(60, 142); }),
      strokeGrid(function (ctx) { ctx.moveTo(38, 42); ctx.lineTo(62, 16); ctx.lineTo(62, 142); })
    );
    digitGrids["4"].push(
      strokeGrid(function (ctx) { ctx.moveTo(78, 16); ctx.lineTo(28, 86); ctx.lineTo(98, 86); ctx.moveTo(78, 16); ctx.lineTo(78, 146); }),
      strokeGrid(function (ctx) { ctx.moveTo(28, 18); ctx.lineTo(28, 84); ctx.lineTo(96, 84); ctx.moveTo(72, 18); ctx.lineTo(72, 146); })
    );
    digitGrids["7"].push(
      strokeGrid(function (ctx) { ctx.moveTo(22, 24); ctx.lineTo(100, 24); ctx.lineTo(46, 146); }),
      strokeGrid(function (ctx) { ctx.moveTo(22, 24); ctx.lineTo(100, 24); ctx.lineTo(46, 146); ctx.moveTo(40, 78); ctx.lineTo(86, 78); })
    );
    digitGrids["9"].push(
      strokeGrid(function (ctx) { ctx.arc(60, 52, 30, 0, Math.PI * 2); ctx.moveTo(84, 58); ctx.lineTo(70, 146); }),
      strokeGrid(function (ctx) { ctx.arc(58, 50, 28, 0.4, Math.PI * 1.7); ctx.moveTo(80, 62); ctx.quadraticCurveTo(78, 110, 40, 142); })
    );
    digitGrids["2"].push(strokeGrid(function (ctx) {
      ctx.moveTo(28, 42); ctx.quadraticCurveTo(60, 8, 96, 42); ctx.quadraticCurveTo(100, 78, 28, 140); ctx.lineTo(100, 140);
    }));
    Object.keys(digitGrids).forEach(function (d) {
      digitGrids[d] = digitGrids[d].filter(Boolean);
    });
    return digitGrids;
  }

  function sliceStats(stats, x0, x1) {
    var minX = stats.w, minY = stats.h, maxX = -1, maxY = -1, count = 0;
    var data = new Uint8ClampedArray(stats.data.length);
    for (var y = 0; y < stats.h; y++) {
      for (var x = x0; x <= x1; x++) {
        var i = (y * stats.w + x) * 4;
        if (stats.data[i + 3] > 30) {
          data[i] = stats.data[i];
          data[i + 1] = stats.data[i + 1];
          data[i + 2] = stats.data[i + 2];
          data[i + 3] = stats.data[i + 3];
          count++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { data: data, w: stats.w, h: stats.h, count: count, minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function inkSpans(stats) {
    var cols = new Float32Array(stats.w);
    for (var y = stats.minY; y <= stats.maxY; y++) {
      for (var x = stats.minX; x <= stats.maxX; x++) {
        if (stats.data[(y * stats.w + x) * 4 + 3] > 30) cols[x]++;
      }
    }
    var spans = [];
    var start = -1;
    for (var x2 = stats.minX; x2 <= stats.maxX; x2++) {
      if (cols[x2] > 0) {
        if (start < 0) start = x2;
      } else if (start >= 0) {
        spans.push([start, x2 - 1]);
        start = -1;
      }
    }
    if (start >= 0) spans.push([start, stats.maxX]);
    var merged = [];
    spans.forEach(function (sp) {
      if (!merged.length || sp[0] - merged[merged.length - 1][1] > 12) merged.push(sp.slice());
      else merged[merged.length - 1][1] = sp[1];
    });
    return merged.filter(function (sp) { return sp[1] - sp[0] >= 4; });
  }

  function equalSpans(stats, n) {
    var spans = [];
    var width = stats.maxX - stats.minX + 1;
    for (var i = 0; i < n; i++) {
      var a = stats.minX + Math.floor(width * i / n);
      var b = stats.minX + Math.floor(width * (i + 1) / n) - 1;
      spans.push([a, Math.max(a, b)]);
    }
    return spans;
  }

  function rankDigit(userGrid) {
    var tmpls = digitTemplates();
    var ranked = [];
    "0123456789".split("").forEach(function (d) {
      var best = 0;
      tmpls[d].forEach(function (tmpl) {
        var s = cosine(userGrid, tmpl);
        if (s > best) best = s;
      });
      ranked.push({ d: d, score: best });
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked;
  }

  function readSpans(stats, spans, answer) {
    var lenient = "";
    var strict = "";
    var scores = [];
    var sure = true;
    for (var i = 0; i < spans.length; i++) {
      var part = sliceStats(stats, spans[i][0], spans[i][1]);
      if (!part.count) return null;
      var grid = blurPasses(gridFromStats(part, true), 4);
      var ranked = rankDigit(grid);
      var wanted = answer.charAt(i);
      var want = null;
      for (var j = 0; j < ranked.length; j++) if (ranked[j].d === wanted) want = ranked[j];
      var best = ranked[0];
      var chosen = best.d;
      var chosenScore = best.score;
      if (want && want.score >= 0.5 && best.score - want.score <= 0.06) {
        chosen = wanted;
        chosenScore = want.score;
        if (best.d !== wanted) sure = false;
      } else if (best.score < 0.5) {
        chosen = "?";
        sure = false;
      }
      lenient += chosen;
      strict += best.score >= 0.5 ? best.d : "?";
      scores.push(chosenScore);
    }
    return { lenient: lenient, strict: strict, scores: scores, sure: sure };
  }

  var digitNet = null;
  var lastDigitRead = "—";
  var digitReady = fetch("digit-cnn.bin").then(function (res) {
    if (!res.ok) throw new Error("digits");
    return res.arrayBuffer();
  }).then(function (buf) {
    digitNet = parseDigitNet(buf);
  }).catch(function () {
    digitNet = null;
  });

  function f16bits(h) {
    var sign = (h & 0x8000) ? -1 : 1;
    var exp = (h >> 10) & 31;
    var frac = h & 1023;
    if (exp === 0) return frac ? sign * Math.pow(2, -14) * (frac / 1024) : sign * 0;
    if (exp === 31) return frac ? NaN : sign * Infinity;
    return sign * Math.pow(2, exp - 15) * (1 + frac / 1024);
  }

  function parseDigitNet(buf) {
    var view = new DataView(buf);
    var magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== "EMN1") throw new Error("digits");
    var n = view.getUint32(8, true);
    var off = 12;
    var blobs = [];
    for (var i = 0; i < n; i++) {
      var count = view.getUint32(off, true);
      off += 4;
      var arr = new Float32Array(count);
      for (var k = 0; k < count; k++) {
        arr[k] = f16bits(view.getUint16(off, true));
        off += 2;
      }
      blobs.push(arr);
    }
    return { c1w: blobs[0], c1b: blobs[1], c2w: blobs[2], c2b: blobs[3], f1w: blobs[4], f1b: blobs[5], f2w: blobs[6], f2b: blobs[7] };
  }

  function convRelu(input, w, b, inC, outC, size) {
    var out = new Float32Array(outC * size * size);
    for (var oc = 0; oc < outC; oc++) {
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          var sum = b[oc];
          for (var ic = 0; ic < inC; ic++) {
            for (var ky = 0; ky < 3; ky++) {
              var iy = y + ky - 1;
              if (iy < 0 || iy >= size) continue;
              for (var kx = 0; kx < 3; kx++) {
                var ix = x + kx - 1;
                if (ix < 0 || ix >= size) continue;
                var iv = input[(ic * size + iy) * size + ix];
                var wv = w[(((oc * inC + ic) * 3 + ky) * 3) + kx];
                sum += iv * wv;
              }
            }
          }
          out[(oc * size + y) * size + x] = sum > 0 ? sum : 0;
        }
      }
    }
    return out;
  }

  function pool2(input, channels, size) {
    var n = size >> 1;
    var out = new Float32Array(channels * n * n);
    for (var c = 0; c < channels; c++) {
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          var m = -1e9;
          for (var ky = 0; ky < 2; ky++) {
            for (var kx = 0; kx < 2; kx++) {
              var v = input[(c * size + y * 2 + ky) * size + (x * 2 + kx)];
              if (v > m) m = v;
            }
          }
          out[(c * n + y) * n + x] = m;
        }
      }
    }
    return out;
  }

  function linear(input, w, b, inN, outN, relu) {
    var out = new Float32Array(outN);
    for (var o = 0; o < outN; o++) {
      var sum = b[o];
      var row = o * inN;
      for (var i = 0; i < inN; i++) sum += input[i] * w[row + i];
      out[o] = relu && sum < 0 ? 0 : sum;
    }
    return out;
  }

  function cnnLogits(img28) {
    var x = convRelu(img28, digitNet.c1w, digitNet.c1b, 1, 12, 28);
    x = pool2(x, 12, 28);
    x = convRelu(x, digitNet.c2w, digitNet.c2b, 12, 24, 14);
    x = pool2(x, 24, 14);
    x = linear(x, digitNet.f1w, digitNet.f1b, 1176, 64, true);
    return linear(x, digitNet.f2w, digitNet.f2b, 64, 10, false);
  }

  function softmax10(logits) {
    var m = logits[0];
    for (var i = 1; i < 10; i++) if (logits[i] > m) m = logits[i];
    var s = 0;
    var o = new Float32Array(10);
    for (var j = 0; j < 10; j++) {
      o[j] = Math.exp(logits[j] - m);
      s += o[j];
    }
    for (var k = 0; k < 10; k++) o[k] /= s || 1;
    return o;
  }

  function resizeArea(src, sw, sh, dw, dh) {
    var out = new Float32Array(dw * dh);
    for (var y = 0; y < dh; y++) {
      var y0 = y * sh / dh;
      var y1 = (y + 1) * sh / dh;
      var iy0 = Math.floor(y0);
      var iy1 = Math.ceil(y1 - 1e-8);
      for (var x = 0; x < dw; x++) {
        var x0 = x * sw / dw;
        var x1 = (x + 1) * sw / dw;
        var ix0 = Math.floor(x0);
        var ix1 = Math.ceil(x1 - 1e-8);
        var acc = 0;
        var wsum = 0;
        var yEnd = Math.min(sh, Math.max(iy0 + 1, iy1));
        var xEnd = Math.min(sw, Math.max(ix0 + 1, ix1));
        for (var yy = iy0; yy < yEnd; yy++) {
          var wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
          if (wy <= 0) continue;
          for (var xx = ix0; xx < xEnd; xx++) {
            var wx = Math.min(x1, xx + 1) - Math.max(x0, xx);
            if (wx <= 0) continue;
            acc += src[yy * sw + xx] * wy * wx;
            wsum += wy * wx;
          }
        }
        out[y * dw + x] = wsum ? acc / wsum : 0;
      }
    }
    return out;
  }

  function dilateGray(src, w, h) {
    var out = new Float32Array(src.length);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var m = 0;
        for (var ky = -1; ky <= 1; ky++) {
          var yy = y + ky;
          if (yy < 0 || yy >= h) continue;
          for (var kx = -1; kx <= 1; kx++) {
            var xx = x + kx;
            if (xx < 0 || xx >= w) continue;
            var v = src[yy * w + xx];
            if (v > m) m = v;
          }
        }
        out[y * w + x] = m;
      }
    }
    return out;
  }

  function prepDigit(src, sw, sh) {
    var minX = sw, minY = sh, maxX = -1, maxY = -1;
    for (var y = 0; y < sh; y++) {
      for (var x = 0; x < sw; x++) {
        if (src[y * sw + x] > 0.08) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    var out = new Float32Array(28 * 28);
    if (maxX < minX) return out;
    var cw = maxX - minX + 1;
    var ch = maxY - minY + 1;
    var crop = new Float32Array(cw * ch);
    for (var yy = 0; yy < ch; yy++) {
      for (var xx = 0; xx < cw; xx++) crop[yy * cw + xx] = src[(yy + minY) * sw + (xx + minX)];
    }
    crop = dilateGray(crop, cw, ch);
    var side = Math.max(cw, ch);
    var square = new Float32Array(side * side);
    var y0 = Math.floor((side - ch) / 2);
    var x0 = Math.floor((side - cw) / 2);
    for (var y2 = 0; y2 < ch; y2++) {
      for (var x2 = 0; x2 < cw; x2++) square[(y2 + y0) * side + (x2 + x0)] = crop[y2 * cw + x2];
    }
    var small = resizeArea(square, side, side, 20, 20);
    var mass = 1e-6;
    var cx = 0;
    var cy = 0;
    for (var y3 = 0; y3 < 20; y3++) {
      for (var x3 = 0; x3 < 20; x3++) {
        var v = small[y3 * 20 + x3];
        mass += v;
        cx += x3 * v;
        cy += y3 * v;
      }
    }
    cx /= mass;
    cy /= mass;
    var top = Math.round(14 - cy);
    var left = Math.round(14 - cx);
    var ySrc0 = Math.max(0, -top);
    var xSrc0 = Math.max(0, -left);
    var yDst0 = Math.max(0, top);
    var xDst0 = Math.max(0, left);
    var yCopy = Math.min(20 - ySrc0, 28 - yDst0);
    var xCopy = Math.min(20 - xSrc0, 28 - xDst0);
    if (yCopy > 0 && xCopy > 0) {
      for (var y4 = 0; y4 < yCopy; y4++) {
        for (var x4 = 0; x4 < xCopy; x4++) {
          out[(yDst0 + y4) * 28 + (xDst0 + x4)] = small[(ySrc0 + y4) * 20 + (xSrc0 + x4)];
        }
      }
    }
    for (var i = 0; i < out.length; i++) out[i] = out[i] * 2 - 1;
    return out;
  }

  function grayFromCanvas(canvas) {
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var w = canvas.width;
    var h = canvas.height;
    var data = ctx.getImageData(0, 0, w, h).data;
    var gray = new Float32Array(w * h);
    var count = 0;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var a = data[(y * w + x) * 4 + 3] / 255;
        if (a > 0.08) {
          gray[y * w + x] = a;
          count++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { gray: gray, w: w, h: h, count: count, minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function sliceGray(field, x0, x1) {
    var w = field.w;
    var h = field.h;
    var gray = new Float32Array(w * h);
    var count = 0;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    x0 = Math.max(0, x0);
    x1 = Math.min(w - 1, x1);
    for (var y = 0; y < h; y++) {
      for (var x = x0; x <= x1; x++) {
        var v = field.gray[y * w + x];
        if (v > 0.08) {
          gray[y * w + x] = v;
          count++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { gray: gray, w: w, h: h, count: count, minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function classifyField(part) {
    if (!part.count) return null;
    var img = prepDigit(part.gray, part.w, part.h);
    return softmax10(cnnLogits(img));
  }

  function topIndex(probs) {
    var best = 0;
    for (var i = 1; i < 10; i++) if (probs[i] > probs[best]) best = i;
    return best;
  }

  function digitOk(probs, expected) {
    var e = expected.charCodeAt(0) - 48;
    if (e < 0 || e > 9 || !probs) return false;
    var top = 0;
    var rank = 0;
    for (var i = 0; i < 10; i++) {
      if (probs[i] > probs[top]) top = i;
      if (probs[i] > probs[e]) rank++;
    }
    var p = probs[e];
    if (probs[top] >= 0.9 && top !== e && p < 0.06) return false;
    if (top === e && p >= 0.2) return true;
    return rank < 3 && p >= 0.07 && p >= probs[top] * 0.18;
  }

  function glyphFacts(part) {
    var empty = { holes: 0, aspect: 1, z: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
    if (!part || part.count < 8 || part.maxX < part.minX) return empty;
    var minX = part.minX;
    var minY = part.minY;
    var bw = part.maxX - minX + 1;
    var bh = part.maxY - minY + 1;
    var N = 24;
    var bin = new Uint8Array(N * N);
    var w = part.w;
    var y;
    var x;
    for (y = 0; y < N; y++) {
      var ya = minY + Math.floor(y * bh / N);
      var yb = ya + Math.max(1, Math.floor(bh / N));
      for (x = 0; x < N; x++) {
        var xa = minX + Math.floor(x * bw / N);
        var xb = xa + Math.max(1, Math.floor(bw / N));
        var hit = false;
        for (var yy = ya; yy < yb && yy < part.h; yy++) {
          var row = yy * w;
          for (var xx = xa; xx < xb && xx < w; xx++) {
            if (part.gray[row + xx] > 0.12) { hit = true; break; }
          }
          if (hit) break;
        }
        if (hit) bin[y * N + x] = 1;
      }
    }
    var dil = new Uint8Array(bin);
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        if (!bin[y * N + x]) continue;
        if (y > 0) dil[(y - 1) * N + x] = 1;
        if (y + 1 < N) dil[(y + 1) * N + x] = 1;
        if (x > 0) dil[y * N + x - 1] = 1;
        if (x + 1 < N) dil[y * N + x + 1] = 1;
      }
    }
    var seen = new Uint8Array(N * N);
    var qx = [];
    var qy = [];
    function push(px, py) {
      if (px < 0 || py < 0 || px >= N || py >= N) return;
      var i = py * N + px;
      if (seen[i] || dil[i]) return;
      seen[i] = 1;
      qx.push(px);
      qy.push(py);
    }
    for (var edge = 0; edge < N; edge++) {
      push(edge, 0);
      push(edge, N - 1);
      push(0, edge);
      push(N - 1, edge);
    }
    for (var qi = 0; qi < qx.length; qi++) {
      var cx = qx[qi];
      var cy = qy[qi];
      push(cx + 1, cy);
      push(cx - 1, cy);
      push(cx, cy + 1);
      push(cx, cy - 1);
    }
    var holes = 0;
    var upperHole = false;
    var lowerHole = false;
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        var hi = y * N + x;
        if (dil[hi] || seen[hi]) continue;
        var sx = [x];
        var sy = [y];
        var sumY = 0;
        seen[hi] = 1;
        for (var k = 0; k < sx.length; k++) {
          var nx = sx[k];
          var ny = sy[k];
          sumY += ny;
          var neigh = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var ni = 0; ni < 4; ni++) {
            var tx = nx + neigh[ni][0];
            var ty = ny + neigh[ni][1];
            if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
            var ti = ty * N + tx;
            if (seen[ti] || dil[ti]) continue;
            seen[ti] = 1;
            sx.push(tx);
            sy.push(ty);
          }
        }
        if (sx.length < 4) continue;
        holes++;
        var mid = sumY / sx.length;
        if (mid < N * 0.48) upperHole = true;
        if (mid > N * 0.52) lowerHole = true;
      }
    }
    var z = [];
    for (var gy = 0; gy < 3; gy++) {
      for (var gx = 0; gx < 3; gx++) {
        var total = 0;
        var ink = 0;
        for (var zy = gy * 8; zy < (gy + 1) * 8; zy++) {
          for (var zx = gx * 8; zx < (gx + 1) * 8; zx++) {
            total++;
            if (bin[zy * N + zx]) ink++;
          }
        }
        z.push(ink / total);
      }
    }
    return { holes: holes, upperHole: upperHole, lowerHole: lowerHole, aspect: bh / Math.max(1, bw), z: z };
  }

  function geomScores(part) {
    var f = glyphFacts(part);
    var s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var z = f.z;
    var holes = f.holes;
    var aspect = f.aspect;
    if (aspect < 0.75) return s;
    if (holes >= 2 && f.upperHole && f.lowerHole) s[8] += 0.85;
    if (holes === 1 && z[4] < 0.12 && aspect < 2.2) s[0] += 0.8;
    if (holes === 1 && z[3] > 0.6 && z[6] > 0.3 && z[4] > 0.2) s[6] += 0.75;
    if (holes === 1 && z[6] < 0.08 && z[8] < 0.08 && z[7] > 0.4) s[9] += 0.75;
    if (holes === 1 && z[6] < 0.12 && z[3] > 0.4 && z[5] > 0.35 && z[4] > 0.15) s[4] += 0.66;
    if (holes === 0 && aspect >= 1.85 && z[4] > 0.45 && z[2] < 0.25) s[1] += 0.8;
    if (holes === 0 && aspect >= 2.4 && z[6] < 0.2 && (z[4] > 0.45 || z[5] > 0.7 || z[1] > 0.7)) s[1] += 0.75;
    if (holes === 0 && aspect < 2.2 && z[3] < 0.2 && z[5] < 0.4 && z[6] > 0.3 && z[7] > 0.4 && z[0] > 0.4 && z[2] > 0.3) s[2] += 0.7;
    if (holes === 0 && z[3] < 0.08 && z[5] > 0.5 && z[2] > 0.55 && z[6] > 0.3 && aspect < 1.9) s[3] += 0.72;
    if (holes === 0 && z[6] < 0.08 && z[3] > 0.55 && aspect < 1.9) s[4] += 0.72;
    if (holes === 0 && aspect < 1.7 && z[0] > 0.55 && z[3] > 0.4 && z[4] > 0.4 && z[6] > 0.4 && z[8] > 0.35) s[5] += 0.62;
    if (holes === 0 && aspect < 1.7 && z[2] > 0.68 && z[8] < 0.08 && z[6] < 0.2) s[7] += 0.74;
    return s;
  }

  function digitSupports(probs, expected, geo, facts) {
    var e = expected.charCodeAt(0) - 48;
    if (e < 0 || e > 9 || !geo) return false;
    var aspect = facts && facts.aspect ? facts.aspect : 1;
    var upright = aspect >= 0.9 && aspect <= 7.5;
    var gTop = 0;
    for (var i = 1; i < 10; i++) if (geo[i] > geo[gTop]) gTop = i;
    var cnnMatch = !!(probs && topIndex(probs) === e && probs[e] >= 0.42 && upright);
    if (cnnMatch) return true;
    var geoSure = geo[e] >= 0.6 && geo[e] >= geo[gTop] - 0.04 && upright;
    var geoOther = gTop !== e && geo[gTop] >= 0.6 && geo[e] < 0.4;
    if (geoOther) return false;
    if (geoSure) return true;
    if (digitOk(probs, expected) && upright && geo[gTop] < 0.6) return true;
    return false;
  }

  function smoothCols(cols, x0, x1) {
    var s = new Float32Array(cols.length);
    for (var x = x0; x <= x1; x++) {
      var acc = 0;
      var n = 0;
      for (var k = -2; k <= 2; k++) {
        var xx = x + k;
        if (xx < x0 || xx > x1) continue;
        acc += cols[xx];
        n++;
      }
      s[x] = acc / n;
    }
    return s;
  }

  function columnMass(field, x0, x1) {
    var cols = new Float32Array(field.w);
    var y0 = field.minY;
    var y1 = field.maxY;
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) cols[x] += field.gray[y * field.w + x];
    }
    return cols;
  }

  function valleyCuts(field) {
    var x0 = field.minX;
    var x1 = field.maxX;
    var cols = columnMass(field, x0, x1);
    var s = smoothCols(cols, x0, x1);
    var peak = 0;
    for (var x = x0; x <= x1; x++) if (s[x] > peak) peak = s[x];
    var cuts = [];
    var width = x1 - x0 + 1;
    for (var c = x0 + 2; c <= x1 - 2; c++) {
      if (s[c] <= s[c - 1] && s[c] <= s[c + 1] && s[c] <= peak * 0.72) {
        var pos = (c - x0) / width;
        if (pos > 0.18 && pos < 0.82) cuts.push(c);
      }
    }
    return cuts;
  }

  function pushSpan(list, spans) {
    var key = spans.map(function (s) { return s[0] + ":" + s[1]; }).join("|");
    if (list.keys[key]) return;
    list.keys[key] = true;
    list.items.push(spans);
  }

  function segmentations(field, n, canvas) {
    var list = { keys: {}, items: [] };
    var x0 = field.minX;
    var x1 = field.maxX;
    if (n === 1) {
      pushSpan(list, [[x0, x1]]);
      return list.items;
    }
    var width = x1 - x0 + 1;
    if (n === 2) {
      var cuts = valleyCuts(field);
      var step = Math.max(3, Math.floor(width / 14));
      for (var x = x0 + Math.floor(width * 0.22); x <= x0 + Math.floor(width * 0.78); x += step) cuts.push(x);
      cuts.push(x0 + Math.floor(width / 2));
      cuts.forEach(function (c) {
        if (c <= x0 + 2 || c >= x1 - 2) return;
        pushSpan(list, [[x0, c], [c + 1, x1]]);
      });
    } else {
      var thirds = [0.33, 0.4, 0.5];
      var seconds = [0.6, 0.67, 0.75];
      thirds.forEach(function (a) {
        seconds.forEach(function (b) {
          if (b - a < 0.18) return;
          var c1 = x0 + Math.floor(width * a);
          var c2 = x0 + Math.floor(width * b);
          if (c2 <= c1 + 2) return;
          pushSpan(list, [[x0, c1], [c1 + 1, c2], [c2 + 1, x1]]);
        });
      });
      var valleys = valleyCuts(field);
      for (var i = 0; i < valleys.length; i++) {
        for (var j = i + 1; j < valleys.length; j++) {
          var left = valleys[i];
          var right = valleys[j];
          if (right - left < width * 0.15) continue;
          if (left - x0 < width * 0.12 || x1 - right < width * 0.12) continue;
          pushSpan(list, [[x0, left], [left + 1, right], [right + 1, x1]]);
        }
      }
    }
    var strokeSpans = canvas === mathInk ? spansFromStrokes(n) : null;
    if (strokeSpans) pushSpan(list, strokeSpans);
    if (!list.items.length) {
      var eq = [];
      for (var d = 0; d < n; d++) {
        var a = x0 + Math.floor(width * d / n);
        var b = x0 + Math.floor(width * (d + 1) / n) - 1;
        eq.push([a, Math.max(a, b)]);
      }
      pushSpan(list, eq);
    }
    return list.items.slice(0, 18);
  }

  function spansFromStrokes(n) {
    if (!mathUserStrokes || mathUserStrokes.length < n) return null;
    var boxes = mathUserStrokes.map(function (pts) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(function (p) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
      return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    }).filter(function (b) { return b.maxX > b.minX || b.maxY > b.minY; });
    if (boxes.length < n) return null;
    var parent = boxes.map(function (_, i) { return i; });
    function find(i) {
      while (parent[i] !== i) i = parent[i];
      return i;
    }
    function gapLimit(a, b) {
      var wa = a.maxX - a.minX;
      var wb = b.maxX - b.minX;
      return Math.max(10, Math.min(wa, wb) * 0.28);
    }
    for (var i = 0; i < boxes.length; i++) {
      for (var j = i + 1; j < boxes.length; j++) {
        var a = boxes[i];
        var b = boxes[j];
        var gap = Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX);
        var overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
        if (gap <= gapLimit(a, b) && overlapY > -8) parent[find(i)] = find(j);
      }
    }
    var groups = {};
    boxes.forEach(function (b, i) {
      var r = find(i);
      if (!groups[r]) groups[r] = { minX: b.minX, maxX: b.maxX };
      else {
        groups[r].minX = Math.min(groups[r].minX, b.minX);
        groups[r].maxX = Math.max(groups[r].maxX, b.maxX);
      }
    });
    var keys = Object.keys(groups);
    var spans = keys.map(function (k) { return [Math.floor(groups[k].minX), Math.ceil(groups[k].maxX)]; });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    while (spans.length > n) {
      var bestI = 0;
      var bestGap = Infinity;
      for (var g = 0; g < spans.length - 1; g++) {
        var gap = spans[g + 1][0] - spans[g][1];
        if (gap < bestGap) { bestGap = gap; bestI = g; }
      }
      spans.splice(bestI, 2, [spans[bestI][0], spans[bestI + 1][1]]);
    }
    if (spans.length !== n) return null;
    return spans;
  }

  function setDigitDebug(read, answer, ok) {
    lastDigitRead = (read || "？") + (ok ? " あってる" : " ちがう") + " / こたえ " + answer;
    var el = document.getElementById("digitDebug");
    if (el) el.textContent = "よみ: " + lastDigitRead;
  }

  function judgeNumber(canvas, answer) {
    answer = String(answer);
    if (!digitNet) return judgeNumberLegacy(canvas, answer);
    var field = grayFromCanvas(canvas);
    if (field.count < 36) return { kind: "empty", score: 0, read: "" };
    var bw = field.maxX - field.minX + 1;
    var bh = field.maxY - field.minY + 1;
    if (bw < 6 && bh < 6) return { kind: "empty", score: 0, read: "" };
    var segs = segmentations(field, answer.length, canvas);
    var accepted = null;
    var bestRead = "";
    var bestConf = -1;
    for (var s = 0; s < segs.length; s++) {
      var spans = segs[s];
      if (spans.length !== answer.length) continue;
      var probs = [];
      var greedy = "";
      var conf = 0;
      var good = true;
      var expectScore = 0;
      for (var i = 0; i < spans.length; i++) {
        var part = sliceGray(field, spans[i][0], spans[i][1]);
        if (part.count < 8) { good = false; break; }
        var p = classifyField(part);
        if (!p) { good = false; break; }
        probs.push(p);
        var top = topIndex(p);
        greedy += String(top);
        conf += p[top];
        var want = answer.charCodeAt(i) - 48;
        var facts = glyphFacts(part);
        var geo = geomScores(part);
        var supported = digitSupports(p, answer.charAt(i), geo, facts);
        if (!supported) good = false;
        var contrib = p[want] || 0;
        if (supported && geo[want] >= 0.6) contrib = Math.max(contrib, 0.7);
        expectScore += contrib;
      }
      if (probs.length !== answer.length) continue;
      conf /= probs.length;
      if (conf > bestConf) {
        bestConf = conf;
        bestRead = greedy;
      }
      if (good) {
        var score = expectScore / answer.length;
        if (!accepted || score > accepted.score) accepted = { score: score, read: answer };
      }
    }
    if (accepted) {
      setDigitDebug(accepted.read, answer, true);
      return { kind: accepted.score >= 0.72 ? "hanamaru" : "maru", score: accepted.score, read: accepted.read };
    }
    setDigitDebug(bestRead || "？", answer, false);
    if (field.count < 70) return { kind: "empty", score: 0, read: bestRead || "" };
    return { kind: "miss", score: bestConf > 0 ? bestConf : 0, read: bestRead || "" };
  }

  function judgeNumberLegacy(canvas, answer) {
    answer = String(answer);
    var stats = inkStats(canvas);
    if (stats.count < 40) return { kind: "empty", score: 0, read: "" };
    var bw = stats.maxX - stats.minX + 1;
    var bh = stats.maxY - stats.minY + 1;
    if (bw < 6 && bh < 6) return { kind: "empty", score: 0, read: "" };
    var tries = [inkSpans(stats)];
    if (answer.length > 1) tries.push(equalSpans(stats, answer.length));
    if (answer.length === 1) tries.push([[stats.minX, stats.maxX]]);
    var accepted = null;
    var wrong = null;
    for (var t = 0; t < tries.length; t++) {
      var spans = tries[t];
      if (!spans.length) continue;
      if (spans.length !== answer.length && !(answer.length === 1 && spans.length === 1)) continue;
      var reading = readSpans(stats, spans, answer);
      if (!reading) continue;
      var avg = reading.scores.reduce(function (s, n) { return s + n; }, 0) / reading.scores.length;
      if (reading.lenient === answer && reading.scores.every(function (n) { return n >= 0.5; })) {
        if (!accepted || avg > accepted.score) accepted = { score: avg, read: reading.lenient };
      } else if (reading.strict === answer && reading.scores.every(function (n) { return n >= 0.5; })) {
        if (!accepted || avg > accepted.score) accepted = { score: avg, read: reading.strict };
      } else if (/^\d+$/.test(reading.strict) && reading.strict !== answer && avg >= 0.55) {
        wrong = { score: avg, read: reading.strict };
      }
    }
    if (accepted) {
      return { kind: accepted.score >= 0.8 ? "hanamaru" : "maru", score: accepted.score, read: accepted.read };
    }
    return { kind: "miss", score: wrong ? wrong.score : 0, read: wrong ? wrong.read : "" };
  }

  function judge(canvas, answer, copy, kind) {
    if (kind !== "kanji" && /^\d+$/.test(String(answer))) return judgeNumber(canvas, String(answer));
    var stats = inkStats(canvas);
    if (stats.count < 220) return { kind: "empty", score: 0 };
    var bw = stats.maxX - stats.minX + 1;
    var bh = stats.maxY - stats.minY + 1;
    if (bw < 16 && bh < 16) return { kind: "empty", score: 0 };
    var tmpl = renderTmpl(answer, canvas.width, canvas.height);
if (copy) {
    var userPos = blurPasses(gridFromStats(stats, false), BLUR_PASSES + 1);
    var cover = coverage(userPos, tmpl.pos);
    var userShape = blurPasses(gridFromStats(stats, true), BLUR_PASSES);
    var shape = cosine(userShape, tmpl.norm);
    var score = Math.max(cover, shape);
    if (score >= COPY_HANAMARU && (cover >= COPY_HANAMARU || placementOk(stats))) {
      return { kind: "hanamaru", score: score };
    }
    if (score >= COPY_MARU) return { kind: "maru", score: score };
    return { kind: "keep", score: score };
  }
    var userNorm = blurPasses(gridFromStats(stats, true), BLUR_PASSES);
    if (kind === "kuku" && rivalMiss(userNorm, answer, canvas.width, canvas.height)) {
      return { kind: "miss", score: 0, rival: true };
    }
    var cover = coverage(blurPasses(gridFromStats(stats, false), BLUR_PASSES + 1), tmpl.pos);
    var fontShape = cosine(userNorm, tmpl.norm);
    var score = fontShape;
    if (kind === "kanji") {
      var drawn = renderStrokeTmpl(answer, canvas.width, canvas.height);
      var strokeShape = drawn ? cosine(userNorm, drawn.norm) : 0;
      score = Math.max(strokeShape, fontShape);
      if (strokeShape >= 0.42) score = Math.max(score, strokeShape * 0.72 + cover * 0.28);
      if (strokeShape < 0.64) return { kind: "miss", score: strokeShape || score };
      if (kanjiRival(userNorm, answer, canvas.width, canvas.height, strokeShape)) {
        return { kind: "miss", score: score };
      }
    }
    var missBelow = kind === "kuku" ? RECALL_MISS_MATH : RECALL_MISS_KANJI;
    if (kind !== "kanji" && score < missBelow) return { kind: "miss", score: score };
    if (score >= RECALL_HANAMARU && placementOk(stats)) return { kind: "hanamaru", score: score };
    return { kind: "maru", score: score };
  }

  function kanjiRival(userGrid, answer, w, h, correct) {
    var best = 0;
    var list = window.KANJI || [];
    for (var i = 0; i < list.length; i++) {
      var ch = list[i].kanji || list[i].id;
      if (!ch || ch === answer) continue;
      var drawn = renderStrokeTmpl(ch, w, h);
      if (!drawn) continue;
      var s = cosine(userGrid, drawn.norm);
      if (s > best) best = s;
    }
    return best > correct + 0.02;
  }

  function strokesFor(ch) {
    return (window.STROKES && STROKES[ch]) || [];
  }

  function circled(n) {
    if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1);
    return String(n);
  }

  function expectedStrokes(ch) {
    if (strokeSamples[ch]) return strokeSamples[ch];
    var paths = strokesFor(ch);
    var holder = document.createElementNS(SVGNS, "svg");
    holder.setAttribute("width", "0");
    holder.setAttribute("height", "0");
    holder.style.position = "absolute";
    holder.style.left = "-9999px";
    document.body.appendChild(holder);
    var out = paths.map(function (d) {
      var path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", d);
      holder.appendChild(path);
      var len = 0;
      try { len = path.getTotalLength(); } catch (e) { len = 0; }
      var pts = [];
      var steps = 8;
      for (var i = 0; i <= steps; i++) {
        var p = len ? path.getPointAtLength(len * i / steps) : { x: 0, y: 0 };
        pts.push({ x: p.x / 109, y: p.y / 109 });
      }
      return pts;
    });
    holder.remove();
    strokeSamples[ch] = out;
    return out;
  }

  function stopGuideAnim() {
    guideAnim++;
  }

  function stopStrokePlay() {
    strokeToken++;
    stopGuideAnim();
    strokePlaying = false;
    if (!strokeSvg) return;
    strokeSvg.innerHTML = "";
    strokeSvg.style.opacity = "1";
  }

  function guideWanted(ref) {
    return !!(ref && ref.kind === "kanji" && (strokeGuideOn || ref.copy || (ref.hint || 0) >= 1));
  }

  function loopStrokeDraw(path, len) {
    var token = ++guideAnim;
    function run() {
      if (token !== guideAnim) return;
      path.style.transition = "none";
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      var dur = Math.max(420, Math.min(900, len * 3.4));
      requestAnimationFrame(function () {
        if (token !== guideAnim) return;
        path.style.transition = "stroke-dashoffset " + dur + "ms linear";
        path.style.strokeDashoffset = "0";
      });
      setTimeout(run, dur + 520);
    }
    run();
  }

  function showHintStroke(ch) {
    if (strokePlaying) return;
    var paths = strokesFor(ch);
    if (!strokeSvg || !paths.length) return;
    stopGuideAnim();
    strokeSvg.innerHTML = "";
    strokeSvg.style.opacity = "1";
    var next = Math.max(0, Math.min(hintIndex, paths.length));
    for (var i = 0; i < next; i++) addStrokePath(paths[i], i, false);
    if (next >= paths.length) return;
    var drawn = addStrokePath(paths[next], next, true);
    loopStrokeDraw(drawn.path, drawn.len);
  }

  function addStrokePath(d, index, hint) {
    var path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", d);
    if (hint) path.setAttribute("class", "hint-stroke");
    strokeSvg.appendChild(path);
    var len = 1;
    try { len = path.getTotalLength() || 1; } catch (e) { len = 1; }
    var p0 = path.getPointAtLength(Math.min(6, len * 0.08));
    var label = document.createElementNS(SVGNS, "text");
    label.setAttribute("x", p0.x);
    label.setAttribute("y", p0.y);
    if (hint) label.setAttribute("class", "current");
    label.textContent = circled(index + 1);
    strokeSvg.appendChild(label);
    return { path: path, len: len };
  }

  function playStrokeOrder(ch, opts) {
    opts = opts || {};
    var paths = strokesFor(ch);
    strokeToken++;
    stopGuideAnim();
    var token = strokeToken;
    strokePlaying = true;
    if (!strokeSvg) { strokePlaying = false; return; }
    strokeSvg.innerHTML = "";
    strokeSvg.style.opacity = "1";
    if (!paths.length) { strokePlaying = false; return; }
    var i = 0;
    function step() {
      if (token !== strokeToken) return;
      if (i >= paths.length) {
        strokePlaying = false;
        if (opts.restore) {
          hintIndex = Math.min(kanjiUserStrokes.length, paths.length);
          showHintStroke(ch);
          return;
        }
        if (opts.fade) {
          setTimeout(function () {
            if (token !== strokeToken) return;
            strokeSvg.style.opacity = "0";
            setTimeout(function () {
              if (token !== strokeToken) return;
              strokeSvg.innerHTML = "";
              strokeSvg.style.opacity = "1";
              if (active && active.queue[0] && guideWanted(active.queue[0]) && active.queue[0].id === ch) {
                hintIndex = Math.min(kanjiUserStrokes.length, paths.length);
                showHintStroke(ch);
              }
            }, 280);
          }, 280);
        }
        return;
      }
      var drawn = addStrokePath(paths[i], i, false);
      drawn.path.style.strokeDasharray = String(drawn.len);
      drawn.path.style.strokeDashoffset = String(drawn.len);
      var dur = Math.max(260, Math.min(640, drawn.len * 3.2));
      drawn.path.style.transition = "stroke-dashoffset " + dur + "ms linear";
      requestAnimationFrame(function () {
        if (token !== strokeToken) return;
        drawn.path.style.strokeDashoffset = "0";
      });
      i++;
      setTimeout(step, dur + 90);
    }
    step();
  }

  function normUserStroke(pts, canvas) {
    return pts.map(function (p) {
      return { x: p.x / canvas.width, y: p.y / canvas.height };
    });
  }

  function strokeCentroid(pts) {
    var x = 0;
    var y = 0;
    pts.forEach(function (p) { x += p.x; y += p.y; });
    return { x: x / pts.length, y: y / pts.length };
  }

  function resampleStroke(pts, n) {
    if (!pts || pts.length < 2) return pts ? pts.slice() : [];
    var lens = [0];
    var total = 0;
    var i;
    for (i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(total);
    }
    if (total < 1e-4) return pts.slice(0, n);
    var out = [];
    for (var k = 0; k < n; k++) {
      var target = total * (n === 1 ? 0 : k / (n - 1));
      var j = 1;
      while (j < lens.length - 1 && lens[j] < target) j++;
      var span = lens[j] - lens[j - 1] || 1;
      var t = (target - lens[j - 1]) / span;
      out.push({
        x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * t,
        y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * t
      });
    }
    return out;
  }

  function strokeScore(userPts, expPts) {
    if (!userPts || userPts.length < 2 || !expPts || expPts.length < 2) return 0;
    var u = resampleStroke(userPts, 6);
    var e = resampleStroke(expPts, 6);
    var place = 0;
    for (var i = 0; i < 6; i++) place += Math.hypot(u[i].x - e[i].x, u[i].y - e[i].y);
    place /= 6;
    var udx = u[5].x - u[0].x;
    var udy = u[5].y - u[0].y;
    var edx = e[5].x - e[0].x;
    var edy = e[5].y - e[0].y;
    var ul = Math.hypot(udx, udy);
    var el = Math.hypot(edx, edy);
    var dot = 1;
    if (ul > 0.04 && el > 0.04) dot = (udx * edx + udy * edy) / (ul * el);
    var start = Math.hypot(u[0].x - e[0].x, u[0].y - e[0].y);
    var score = 0;
    if (place < 0.42) score += (0.42 - place) / 0.42 * 0.62;
    if (dot > 0) score += dot * 0.23;
    if (start < 0.45) score += (0.45 - start) / 0.45 * 0.15;
    return score;
  }

  function strokeMatch(userPts, expPts) {
    if (!userPts || userPts.length < 2 || !expPts || expPts.length < 2) return false;
    var us = userPts[0];
    var ue = userPts[userPts.length - 1];
    var es = expPts[0];
    var ee = expPts[expPts.length - 1];
    var udx = ue.x - us.x;
    var udy = ue.y - us.y;
    var edx = ee.x - es.x;
    var edy = ee.y - es.y;
    var ul = Math.hypot(udx, udy);
    var el = Math.hypot(edx, edy);
    var dot = 1;
    if (ul > 0.04 && el > 0.04) dot = (udx * edx + udy * edy) / (ul * el);
    var uc = strokeCentroid(userPts);
    var ec = strokeCentroid(expPts);
    var place = Math.hypot(uc.x - ec.x, uc.y - ec.y);
    var start = Math.hypot(us.x - es.x, us.y - es.y);
    if (ul < 0.06 && el < 0.08) return place < 0.22;
    return place < 0.42 && dot > -0.05 && start < 0.55;
  }

  function classifyOrder(userStrokes, ch, canvas) {
    var exp = expectedStrokes(ch);
    if (!exp.length || !userStrokes.length) return "unknown";
    var normed = userStrokes.map(function (s) { return normUserStroke(s, canvas); }).filter(function (s) {
      if (s.length < 2) return false;
      return Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y) > 0.03 || s.length > 3;
    });
    var n = exp.length;
    var m = normed.length;
    if (!m) return "unknown";
    var limit = Math.min(m, n);
    var diag = 0;
    var rev = 0;
    var own = 0;
    for (var i = 0; i < limit; i++) {
      var self = strokeScore(normed[i], exp[i]);
      var best = self;
      var bestJ = i;
      for (var j = 0; j < n; j++) {
        if (j === i) continue;
        var alt = strokeScore(normed[i], exp[j]);
        if (alt > best) { best = alt; bestJ = j; }
      }
      diag += self;
      if (bestJ === i && self >= 0.45) own++;
      rev += strokeScore(normed[i], exp[n - 1 - i]);
    }
    diag /= limit;
    rev /= limit;
    if (n === 1) return diag >= 0.4 ? "good" : "slip";
    if (own >= Math.ceil(n * 0.6) && diag >= 0.48 && diag >= rev + 0.08) return "good";
    if (m >= 2 && (rev > diag + 0.05 || own <= Math.floor(n * 0.34))) return "wrong";
    return "slip";
  }

  // A correct kanji shape is always まる. Wrong stroke order never
  // turns it into a miss. Correct shape and correct order is はなまる.
  // The caller adds the gentle 順番 note when order is "slip".
  function withOrder(result, canvas, answer, copy) {
    var order = classifyOrder(kanjiUserStrokes, answer, canvas);
    if (result.kind === "empty" || result.kind === "keep") return result;
    if (result.kind === "miss") return { kind: "miss", score: result.score, order: order };
    if (order === "good") return { kind: "hanamaru", score: Math.max(result.score, 0.7), order: "good" };
    var note = order === "unknown" ? "" : "slip";
    return { kind: "maru", score: result.score, order: note || "slip" };
  }

  function noteStrokeMatch() {
    if (strokePlaying) return;
    if (!active || !active.queue.length || active.queue[0].kind !== "kanji") return;
    var ref = active.queue[0];
    if (!guideWanted(ref)) return;
    var ch = ref.id;
    var paths = strokesFor(ch);
    if (!paths.length) return;
    var exp = expectedStrokes(ch);
    var last = kanjiUserStrokes[kanjiUserStrokes.length - 1];
    var matched = !!(last && hintIndex < exp.length && strokeMatch(normUserStroke(last, kanjiInk), exp[hintIndex]));
    var next = Math.min(kanjiUserStrokes.length, paths.length);
    if (next === hintIndex) return;
    hintIndex = next;
    if (matched) EmmaSound.pop();
    showHintStroke(ch);
  }

  function resetKanjiDrawing() {
    clearInk(kanjiInk);
    kanjiUserStrokes = [];
    hintIndex = 0;
  }

  function setFeedback(text, kind) {
    feedbackEl.textContent = text;
    feedbackEl.className = "feedback" + (kind ? " " + kind : "");
    var stars = document.getElementById("praiseStars");
    if (stars) stars.hidden = !(kind === "maru" || kind === "hanamaru");
    if (kind === "triangle") {
      var cheer = document.getElementById("cheer");
      if (cheer) cheer.hidden = false;
    }
  }

  function glyphNode(ch) {
    var img = document.createElement("img");
    img.alt = ch;
    img.draggable = false;
    if (ch >= "1" && ch <= "9") {
      img.className = "num";
      img.src = "assets/numbers/" + ch + ".webp";
      return img;
    }
    if (ch === "0") {
      img.className = "num zero";
      img.src = "assets/numbers/0.svg";
      return img;
    }
    var ops = { "+": "plus", "-": "minus", "×": "times", "=": "eq", "?": "q" };
    if (!ops[ch]) return null;
    img.className = "op op-" + ops[ch];
    img.src = "assets/ops/" + ops[ch] + ".svg";
    return img;
  }

  function renderEquation(el, parts) {
    el.innerHTML = "";
    var count = 0;
    parts.forEach(function (part) {
      var group = document.createElement("span");
      group.className = "eq-part";
      String(part).split("").forEach(function (ch) {
        var node = glyphNode(ch);
        if (!node) return;
        group.appendChild(node);
        count++;
      });
      if (group.childNodes.length) el.appendChild(group);
    });
    el.style.setProperty("--eq-n", String(Math.max(count, 1)));
    el.setAttribute("aria-label", parts.join(" "));
  }

  function equationFor(view, hint) {
    var reveal = !!(view.copy || hint >= 3);
    if (view.promptText && /[0-9]/.test(view.promptText)) {
      var parts = view.promptText.split(/\s+/).filter(Boolean);
      parts.push("=");
      parts.push(reveal ? String(view.answer) : "?");
      return parts;
    }
    if (view.a && view.b && !view.op) {
      if (view.story && !view.copy && hint < 2) return null;
      return [String(view.a), "×", String(view.b), "=", reveal ? String(view.answer) : "?"];
    }
    return null;
  }

  function banner(view) {
    if (view.copy && view.endRedo) return "もういちど";
    if (view.copy) return "これを かこう";
    if (view.fromRemember) return "おぼえよう";
    return view.kind === "kanji" ? "かんじ" : "九九";
  }

  function paintQuestion(view) {
    busy = false;
    EmmaSound.stopSong();
    stopStrokePlay();
    strokeGuideOn = false;
    resetKanjiDrawing();
    clearInk(mathInk);
    mathUserStrokes = [];
    clearInk(kanjiGuide);
    clearInk(mathGuide);
    var hintBadge = document.getElementById("hintBadge");
    modeTitle.textContent = banner(view);
    var isKanji = view.kind === "kanji";
    var hint = view.copy ? 3 : (view.hint || 0);
    if (hintBadge) {
      hintBadge.hidden = hint === 0;
      hintBadge.textContent = view.copy ? "こたえ" : ("ヒント " + hint);
    }
    promptEl.hidden = isKanji && !view.copy;
    promptEl.textContent = view.copy ? "これを かこう" : (isKanji ? "かこう" : "こたえを かこう");
    kanjiBoard.hidden = !isKanji;
    mathBoard.hidden = isKanji;
    document.body.dataset.mode = isKanji ? "kanji" : "kuku";
    if (unitMark) {
      if (isKanji && view.unit) {
        unitMark.hidden = false;
        unitMark.textContent = view.unit + " ばん";
      } else if (!isKanji && view.label) {
        unitMark.hidden = false;
        unitMark.textContent = view.label;
      } else {
        unitMark.hidden = true;
        unitMark.textContent = "";
      }
    }
    if (strokeBtn) strokeBtn.hidden = !isKanji;
    var kanjiPrompt = document.getElementById("kanjiPrompt");
    var kanjiYomi = document.getElementById("kanjiYomi");
    var kanjiOkuri = document.getElementById("kanjiOkuri");
    if (kanjiPrompt) kanjiPrompt.hidden = !isKanji;
    if (isKanji && kanjiYomi && kanjiOkuri) {
      fillKanjiPhrase(kanjiYomi, view.phrase || view.yomi || view.reading || "", view.mark || view.yomi || "");
      kanjiOkuri.textContent = view.okuri ? "（" + view.okuri + "）" : "";
    }
    if (isKanji) {
      questionEl.hidden = true;
      readingEl.hidden = true;
      if (view.copy || hint >= 3) paintGuide(kanjiGuide, view.answer);
      if (view.copy || hint >= 1) {
        strokeGuideOn = true;
        showHintStroke(view.answer);
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      speakBtn.classList.remove("wiggle");
      void speakBtn.offsetWidth;
      if (!view.copy) speakBtn.classList.add("wiggle");
    } else {
      questionEl.hidden = false;
      var isTimes = view.a && view.b && !view.op;
      questionEl.classList.toggle("story", !!view.story && !view.copy && hint < 3);
      if (view.copy || hint >= 3) {
        questionEl.textContent = view.story ? (view.story + "\n" + view.answer) : ((view.promptText || (view.a + " × " + view.b)) + " = " + view.answer);
        paintGuide(mathGuide, view.answer);
      } else if (view.story && hint >= 2 && isTimes) {
        questionEl.textContent = view.story + "\n" + view.a + " × " + view.b;
      } else if (view.story) {
        questionEl.textContent = view.story;
      } else if (view.promptText) {
        questionEl.textContent = view.promptText;
      } else {
        questionEl.textContent = view.a + " × " + view.b;
      }
      readingEl.hidden = !(isTimes && hint >= 2 && !view.copy);
      readingEl.textContent = isTimes ? view.speak : "";
      EmmaSound.stopBgm();
      speakBtn.classList.remove("wiggle");
    }
    var eqEl = document.getElementById("equation");
    var cheer = document.getElementById("cheer");
    var apples = document.getElementById("appleHint");
    var kukuBanner = document.getElementById("kukuBanner");
    var timesHead = !!(active && active.mode === "kuku");
    if (kukuBanner) kukuBanner.hidden = !timesHead;
    if (modeTitle) {
      modeTitle.hidden = timesHead;
      if (active && (active.mode === "sansu" || active.mode === "math")) modeTitle.textContent = "算数練習";
    }
    if (cheer) cheer.hidden = hint === 0;
    if (apples) {
      apples.hidden = !(!isKanji && hint >= 1 && ((view.a === 2 && view.b === 3) || (view.a === 3 && view.b === 2)));
    }
    if (eqEl) {
      var eq = isKanji ? null : equationFor(view, hint);
      if (eq) {
        renderEquation(eqEl, eq);
        eqEl.hidden = false;
        if (!view.story) questionEl.hidden = true;
      } else {
        eqEl.hidden = true;
        eqEl.innerHTML = "";
      }
    }
    updateListenLabel();
    progressEl.textContent = "あと " + active.queue.length + " もん";
    setFeedback("", "");
  }

  function playFactSong(view) {
    EmmaSound.playLine(view.speak);
  }

  function renderFromActive() {
    if (!active) return;
    if (!active.queue.length) {
      finishSession();
      return;
    }
    paintQuestion(hydrate(active.queue[0]));
    saveActive();
  }

  function finishSession() {
    if (!active) return;
    if (active.mode === "kuku") progress.kukuIndex = active.nextKuku;
    else if (active.mode === "sansu" || active.mode === "math") progress.worksheetIndex = active.nextWorksheet;
    else progress.kanjiIndex = active.nextKanji;
    saveProgress();
    sessionStorage.removeItem(activeKey());
    try { sessionStorage.removeItem(legacyActiveKey(profileId())); } catch (e) {}
    active = null;
    EmmaSound.stopSong();
    kanjiMusicOff();
    showOnly("done");
    document.getElementById("doneLead").textContent = "エマ、がんばったね";
    EmmaSound.celebrate();
    cancelReward();
    rewardTimer = setTimeout(function () {
      rewardTimer = 0;
      if (document.body.dataset.screen !== "done") return;
      startCameraFun();
    }, 1600);
  }

  var lastMode = "kanji";
  function beginStudy(mode) {
    lastMode = mode || lastMode || "kanji";
    mode = lastMode;
    stopPlayTimer();
    stopCamera();
    kanjiMusicOff();
    EmmaSound.stopSong();
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = false;
    var existing = readActive();
    var sameMode = existing && (existing.mode === mode || (mode === "sansu" && existing.mode === "math"));
    if (sameMode && existing.queue && existing.queue.length) {
      if (mode === "kuku") existing.queue = existing.queue.filter(isPureKukuRef);
      if (existing.queue.length) {
        existing.mode = mode;
        active = existing;
        showOnly("study");
        renderFromActive();
        return;
      }
    }
    active = makePlan(mode || "kanji");
    progress.sessions += 1;
    saveProgress();
    saveActive();
    showOnly("study");
    renderFromActive();
  }

  function onDone() {
    if (busy || !active || !active.queue.length) return;
    var ref = active.queue[0];
    var view = hydrate(ref);
    var canvas = view.kind === "kanji" ? kanjiInk : mathInk;
    var result;
    try {
      result = judge(canvas, view.answer, !!view.copy, view.kind);
      if (view.kind === "kanji") result = withOrder(result, canvas, view.answer, !!view.copy);
    } catch (err) {
      var stats = inkStats(canvas);
      result = stats.count > 220 ? { kind: "maru", score: 0 } : { kind: "empty", score: 0 };
    }
    if (result.kind === "empty") {
      setFeedback("ゆびで かいてね", "retry");
      return;
    }
    if (result.kind === "keep") {
      setFeedback("なぞって かこう", "retry");
      return;
    }
    if (result.kind === "miss") {
      showTriangle(ref);
      return;
    }
    busy = true;
    var great = result.kind === "hanamaru";
    var orderOff = view.kind === "kanji" && result.order === "slip";
    var praise = great ? "はなまる！" : (orderOff ? "かんじは せいかい！じゅんばんも れんしゅうしようね" : "まる！");
    if (view.kind === "kanji") saveKanjiSample(view, canvas, great ? "hanamaru" : "maru");
    else saveFactSample(view, great ? "hanamaru" : "maru");
    setFeedback(praise, great ? "hanamaru" : "maru");
    EmmaSound.chime(great ? "hanamaru" : "maru");
    if (orderOff) {
      playStrokeOrder(view.answer, { fade: true });
      if (!ref.orderPractice) active.queue.push({ kind: "kanji", id: ref.id, orderPractice: true });
    }
    if (ref.fromRemember && !ref.copy) removeRemember(ref);
    setTimeout(function () {
      if (!active) return;
      active.queue.shift();
      renderFromActive();
    }, orderOff ? 2200 : 800);
  }

  function showTriangle(ref) {
    if (busy) return;
    busy = true;
    stopStrokePlay();
    if (ref.kind === "kanji") {
      clearInk(kanjiInk);
      resetKanjiDrawing();
    } else {
      clearInk(mathInk);
      mathUserStrokes = [];
    }
    ref.misses = (ref.misses || 0) + 1;
    if (ref.copy) {
      ref.copy = false;
      ref.hint = 1;
      ref.misses = 1;
    } else if (ref.misses >= 3) {
      ref.copy = true;
      ref.hint = 3;
    } else {
      ref.copy = false;
      ref.hint = ref.misses;
    }
    addRemember(ref);
    setFeedback("だいじょうぶ！あとで もういちど やろうね", "triangle");
    [kanjiBoard, mathBoard, document.getElementById("kanjiPrompt"), document.getElementById("equation"), questionEl].forEach(function (el) {
      if (el) el.classList.add("away");
    });
    setTimeout(function () {
      [kanjiBoard, mathBoard, document.getElementById("kanjiPrompt"), document.getElementById("equation"), questionEl].forEach(function (el) {
        if (el) el.classList.remove("away");
      });
      if (!active || !active.queue.length || active.queue[0] !== ref) {
        busy = false;
        return;
      }
      active.queue.shift();
      active.queue.push(ref);
      renderFromActive();
    }, 1500);
  }

  function onMiss(ref, message) {
    busy = true;
    ref.misses = (ref.misses || 0) + 1;
    setFeedback(message || "もういちど かこう", "retry");
    setTimeout(function () {
      if (!active || active.queue[0] !== ref) {
        busy = false;
        return;
      }
      if (ref.kind === "kanji") resetKanjiDrawing();
      else {
        clearInk(mathInk);
        mathUserStrokes = [];
      }
      if (ref.misses >= 3 && !ref.copy) {
        ref.copy = true;
        addRemember(ref);
        renderFromActive();
        setFeedback("これを かこう", "retry");
      } else if (ref.kind === "kanji") {
        strokeGuideOn = true;
        showHintStroke(ref.id);
      }
      busy = false;
      saveActive();
    }, 450);
  }

  function onSkip() {
    if (busy || !active || !active.queue.length) return;
    var cur = active.queue[0];
    if (!cur.copy) {
      cur.misses = (cur.misses || 0) + 1;
      if (cur.misses >= 3) {
        cur.copy = true;
        cur.hint = 3;
      } else {
        cur.hint = cur.misses;
        cur.copy = false;
      }
    }
    addRemember(cur);
    active.queue.shift();
    active.queue.push(cur);
    renderFromActive();
  }

  function stopCamera() {
    if (window.EmmaPuri) EmmaPuri.stop();
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    video.srcObject = null;
  }

  function stopPlayTimer() {
    playUntil = 0;
    clearTimeout(playTick);
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      var b = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  }

  function blob(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r, y + 4, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x - r, y + 6, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCupcake(ctx, x, y, s) {
    ctx.fillStyle = "#f6a3c8";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.36, y);
    ctx.lineTo(x + s * 0.36, y);
    ctx.lineTo(x + s * 0.26, y + s * 0.42);
    ctx.lineTo(x - s * 0.26, y + s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff8cba";
    ctx.fillRect(x - s * 0.36, y, s * 0.72, 8);
    ctx.fillStyle = "#ffd0e6";
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.02, s * 0.38, s * 0.22, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#ff5a7a";
    ctx.beginPath();
    ctx.arc(x, y - s * 0.22, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCuteScene(ctx, w, h) {
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#b9e0ff");
    sky.addColorStop(0.55, "#ffd6ee");
    sky.addColorStop(1, "#c8f0a8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffe07a";
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.22, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    blob(ctx, w * 0.22, h * 0.28, h * 0.1);
    blob(ctx, w * 0.55, h * 0.18, h * 0.08);
    drawCupcake(ctx, w * 0.5, h * 0.58, h * 0.46);
    ctx.fillStyle = "#fff";
    star(ctx, w * 0.12, h * 0.16, 12);
    star(ctx, w * 0.4, h * 0.12, 8);
    star(ctx, w * 0.68, h * 0.3, 9);
  }

  function cloneImage(src) {
    var copy = new ImageData(src.width, src.height);
    copy.data.set(src.data);
    return copy;
  }

  function stylize(img, style) {
    var d = img.data;
    var sat = style === "bright" ? 1.35 : style === "toon" ? 1.65 : 1.45;
    var contrast = style === "toon" ? 1.4 : style === "bright" ? 1.05 : 1.15;
    var bright = style === "bright" ? 18 : 6;
    var levels = style === "toon" ? 5 : 7;
    var step = 255 / (levels - 1);
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var avg = (r + g + b) / 3;
      r = avg + (r - avg) * sat;
      g = avg + (g - avg) * sat;
      b = avg + (b - avg) * sat;
      r = (r - 128) * contrast + 128 + bright;
      g = (g - 128) * contrast + 128 + bright;
      b = (b - 128) * contrast + 128 + bright;
      d[i] = Math.max(0, Math.min(255, Math.round(r / step) * step));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g / step) * step));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b / step) * step));
    }
    if (style === "toon") darkenEdges(img);
  }

  function darkenEdges(img) {
    var w = img.width, h = img.height;
    var src = new Uint8ClampedArray(img.data);
    var d = img.data;
    function lum(x, y) {
      var i = (y * w + x) * 4;
      return src[i] * 0.3 + src[i + 1] * 0.5 + src[i + 2] * 0.2;
    }
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var c = lum(x, y);
        if (Math.abs(c - lum(x - 1, y)) + Math.abs(c - lum(x, y - 1)) > 70) {
          var i = (y * w + x) * 4;
          d[i] *= 0.45;
          d[i + 1] *= 0.45;
          d[i + 2] *= 0.45;
        }
      }
    }
  }

  function drawSparkleStars(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (var i = 0; i < 16; i++) {
      star(ctx, (i * 97) % photoCanvas.width, (i * 53) % photoCanvas.height, 6 + (i % 3) * 3);
    }
    ctx.restore();
  }

  function ensureRaw() {
    var ctx = photoCanvas.getContext("2d");
    if (!rawPixels) {
      drawCuteScene(ctx, photoCanvas.width, photoCanvas.height);
      rawPixels = ctx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
    }
  }

  function applyPixelStyle() {
    try {
      ensureRaw();
      var ctx = photoCanvas.getContext("2d");
      var img = cloneImage(rawPixels);
      if (currentStyle !== "normal") stylize(img, currentStyle);
      ctx.putImageData(img, 0, 0);
      if (currentStyle === "sparkle") drawSparkleStars(ctx);
    } catch (e) {
      if (rawPixels) photoCanvas.getContext("2d").putImageData(rawPixels, 0, 0);
    }
  }

  function markStyle() {
    document.querySelectorAll("#styleRow .chip").forEach(function (btn) {
      btn.classList.toggle("picked", btn.getAttribute("data-style") === currentStyle);
    });
  }

  function markTool() {
    document.querySelectorAll("#toolRow .chip").forEach(function (btn) {
      btn.classList.toggle("picked", btn.getAttribute("data-tool") === tool);
    });
  }

  function setStyle(style) {
    currentStyle = style;
    markStyle();
    sparkleLayer.hidden = style !== "sparkle";
    if (!video.hidden) {
      video.style.filter = CSS_FILTER[style] || "none";
      return;
    }
    applyPixelStyle();
  }

  function drawCover(ctx, source, w, h) {
    var sw = source.videoWidth || source.naturalWidth || source.width;
    var sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) return;
    var ir = sw / sh;
    var r = w / h;
    var dw, dh;
    if (ir > r) {
      dh = h;
      dw = h * ir;
    } else {
      dw = w;
      dh = w / ir;
    }
    ctx.fillStyle = "#ffe4f3";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function useDrawFallback() {
    if (window.EmmaPuri) { EmmaPuri.cute(); return; }
    stopCamera();
    video.hidden = true;
    photoCanvas.hidden = false;
    video.style.filter = "none";
    if (!rawPixels) ensureRaw();
    applyPixelStyle();
    captureBtn.textContent = "しゃしん";
    playNote.textContent = "カメラは いま つかえないよ。ゆびで えを かこう";
  }

  function startLive() {
    if (window.EmmaPuri) { EmmaPuri.startCamera(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      useDrawFallback();
      return;
    }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    }).then(function (s) {
      if (play.hidden) {
        s.getTracks().forEach(function (t) { t.stop(); });
        return;
      }
      stopCamera();
      stream = s;
      video.srcObject = s;
      video.hidden = false;
      photoCanvas.hidden = true;
      video.style.filter = CSS_FILTER[currentStyle] || "none";
      video.play().catch(function () {});
      captureBtn.textContent = "とる";
      playNote.textContent = "しゃしんを とって かこう";
    }).catch(function () {
      useDrawFallback();
    });
  }

  function capturePhoto() {
    if (!video.videoWidth) {
      playNote.textContent = "ちょっと まってね";
      return;
    }
    var ctx = photoCanvas.getContext("2d");
    drawCover(ctx, video, photoCanvas.width, photoCanvas.height);
    rawPixels = ctx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
    video.hidden = true;
    photoCanvas.hidden = false;
    applyPixelStyle();
    captureBtn.textContent = "とりなおす";
    playNote.textContent = "かいて かわいく しよう";
  }

  function onShutter() {
    if (window.EmmaPuri) { EmmaPuri.shutter(); return; }
    if (video.hidden || !stream) startLive();
    else capturePhoto();
  }

  function resetScene() {
    if (window.EmmaPuri) { EmmaPuri.reset(); return; }
    stopCamera();
    video.hidden = true;
    photoCanvas.hidden = false;
    video.style.filter = "none";
    clearInk(playInk);
    rawPixels = null;
    currentStyle = "normal";
    tool = "draw";
    sparkleLayer.hidden = true;
    ensureRaw();
    applyPixelStyle();
    markStyle();
    markTool();
    captureBtn.textContent = "しゃしん";
    playNote.textContent = "ゆびで かいてね";
  }

  function tickPlay() {
    if (play.hidden || !playUntil) return;
    var left = Math.max(0, playUntil - Date.now());
    var s = Math.ceil(left / 1000);
    var m = Math.floor(s / 60);
    var r = s % 60;
    timerEl.textContent = m + ":" + (r < 10 ? "0" : "") + r;
    if (playSeconds() >= 300) {
      var cakesLeft = Math.min(5, Math.max(0, Math.ceil(left / 60000)));
      cakesEl.textContent = "🧁".repeat(cakesLeft);
      soonEl.hidden = left > 60000;
    } else {
      cakesEl.textContent = "🧁";
      soonEl.hidden = left > 1500;
    }
    if (left <= 0) {
      playUntil = 0;
      endCameraFun();
      return;
    }
    playTick = setTimeout(tickPlay, 250);
  }

  function endCameraFun() {
    if (photoEnding) return;
    photoEnding = true;
    clearTimeout(playTick);
    playUntil = 0;
    stopCamera();
    var done = photoDone;
    photoDone = null;
    photoEnding = false;
    if (done) done();
    else beginStudy();
  }

  function startCameraFun(done) {
    photoDone = typeof done === "function" ? done : null;
    photoEnding = false;
    showOnly("play");
    document.body.dataset.mode = "play";
    EmmaSound.stopBgm();
    EmmaSound.stopSong();
    var sec = playSeconds();
soonEl.hidden = true;
  playUntil = Date.now() + sec * 1000;
  resetScene();
  playNote.textContent = sec >= 300 ? "5ぷん あそぼう" : "あそんだら べんきょう";
  startLive();
  tickPlay();
  }

  function savePicture() {
    if (window.EmmaPuri) { EmmaPuri.save(); return; }
    var out = document.createElement("canvas");
    out.width = photoCanvas.width;
    out.height = photoCanvas.height;
    var ctx = out.getContext("2d");
    if (!video.hidden && video.videoWidth) drawCover(ctx, video, out.width, out.height);
    else ctx.drawImage(photoCanvas, 0, 0);
    ctx.drawImage(playInk, 0, 0);
    var a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = "emma-e.png";
    a.click();
  }

  bindDraw(kanjiInk, 18, false, {
    onStart: function () { stopStrokePlay(); },
    onStroke: function (pts) {
      kanjiUserStrokes.push(pts);
      noteStrokeMatch();
    }
  });
  bindDraw(mathInk, 20, false, {
    onStroke: function (pts) { mathUserStrokes.push(pts); }
  });
  if (playInk) bindDraw(playInk, 16, true);

  muteBtn.addEventListener("click", function () {
    progress.mute = !progress.mute;
    saveProgress();
    applySoundFlags();
    if (progress.mute) EmmaSound.stopBgm();
    else EmmaSound.playOpening();
  });

  function arm(mode) {
    EmmaSound.unlock().then(function () { EmmaSound.playOpening(); });
    beginStudy(mode);
  }
  var startKanji = document.getElementById("startKanji");
  var startMath = document.getElementById("startMath");
  if (startKanji) startKanji.addEventListener("click", function () { arm("kanji"); });
  if (startMath) startMath.addEventListener("click", function () { arm("kuku"); });
  var startSansu = document.getElementById("startSansu");
  if (startSansu) startSansu.addEventListener("click", function () { arm("sansu"); });
  var moreBtn = document.getElementById("moreBtn");
  if (moreBtn) moreBtn.addEventListener("click", function () { muteBtn.click(); });

  function factLabel(entry) {
    var item = KUKU_BY_ID[entry.id];
    if (!item) return entry.id;
    if (item.prompt) return item.prompt;
    if (item.op) return item.a + " " + item.op + " " + item.b;
    if (item.a && item.b) return item.a + " × " + item.b;
    return entry.id;
  }

  function renderBook(tab) {
    var book = loadBook();
    var kanjiTab = document.getElementById("bookTabKanji");
    var mathTab = document.getElementById("bookTabMath");
    var countEl = document.getElementById("bookCount");
    var fill = document.getElementById("bookBarFill");
    var grid = document.getElementById("bookGrid");
    if (!grid) return;
    var showMath = tab === "math";
    if (kanjiTab) kanjiTab.classList.toggle("picked", !showMath);
    if (mathTab) mathTab.classList.toggle("picked", showMath);
    grid.innerHTML = "";
    if (!showMath) {
      var wrote = 0;
      KANJI.forEach(function (k) {
        var cells = book.kanji[k.id];
        if (cells && cells.length) wrote++;
      });
      if (countEl) countEl.textContent = "かいた かんじ " + wrote + " / " + KANJI.length;
      if (fill) fill.style.width = (KANJI.length ? (wrote / KANJI.length * 100) : 0) + "%";
      var any = false;
      KANJI.forEach(function (k) {
        var cells = book.kanji[k.id];
        if (!cells || !cells.length) return;
        any = true;
        var row = document.createElement("div");
        row.className = "book-row";
        var meta = document.createElement("div");
        meta.className = "book-meta";
        var ch = document.createElement("div");
        ch.className = "book-char";
        ch.textContent = k.kanji;
        var yomi = document.createElement("div");
        yomi.className = "book-yomi";
        yomi.textContent = (k.yomi || k.speak || "") + (k.okuri ? "（" + k.okuri + "）" : "");
        meta.appendChild(ch);
        meta.appendChild(yomi);
        var strip = document.createElement("div");
        strip.className = "book-cells";
        cells.forEach(function (cell) {
          var box = document.createElement("div");
          box.className = "book-cell";
          var img = document.createElement("img");
          img.alt = k.kanji;
          img.src = cell.img;
          box.appendChild(img);
          if (cell.stamp === "hanamaru") {
            var seal = document.createElement("span");
            seal.className = "book-stamp";
            seal.textContent = "花";
            box.appendChild(seal);
          }
          strip.appendChild(box);
        });
        row.appendChild(meta);
        row.appendChild(strip);
        grid.appendChild(row);
      });
      if (!any) {
        var empty = document.createElement("p");
        empty.className = "book-empty";
        empty.textContent = "まだ ないよ。かんじを かくと ここに のこるよ";
        grid.appendChild(empty);
      }
      return;
    }
    var facts = Object.keys(book.facts).map(function (key) { return book.facts[key]; }).filter(Boolean);
    var kukuTotal = KUKU.filter(isPureKukuItem).length;
    var sansuTotal = (window.WORKSHEET_ITEMS && WORKSHEET_ITEMS.length) || 0;
    var kukuN = 0;
    var sansuN = 0;
    facts.forEach(function (f) {
      if (f.mode === "sansu") sansuN++;
      else kukuN++;
    });
    if (countEl) countEl.textContent = "おぼえた 九九 " + kukuN + " / " + kukuTotal + "　算数 " + sansuN + " / " + sansuTotal;
    if (fill) fill.style.width = ((kukuTotal + sansuTotal) ? ((kukuN + sansuN) / (kukuTotal + sansuTotal) * 100) : 0) + "%";
    if (!facts.length) {
      var none = document.createElement("p");
      none.className = "book-empty";
      none.textContent = "まだ ないよ";
      grid.appendChild(none);
      return;
    }
    ["kuku", "sansu"].forEach(function (mode) {
      var group = facts.filter(function (f) { return (f.mode || "kuku") === mode; });
      if (!group.length) return;
      var title = document.createElement("p");
      title.className = "book-group";
      title.textContent = mode === "sansu" ? "算数" : "九九";
      grid.appendChild(title);
      group.forEach(function (f) {
        var line = document.createElement("div");
        line.className = "fact-row";
        var name = document.createElement("span");
        name.textContent = factLabel(f);
        var mark = document.createElement("span");
        mark.className = "fact-mark" + (f.stamp === "hanamaru" ? " great" : "");
        mark.textContent = f.stamp === "hanamaru" ? "はなまる" : "まる";
        line.appendChild(name);
        line.appendChild(mark);
        grid.appendChild(line);
      });
    });
  }

  function renderParent() {
    var listEl = document.getElementById("parentList");
    var msg = document.getElementById("parentMsg");
    if (!listEl) return;
    listEl.innerHTML = "";
    readUsers().forEach(function (u) {
      var row = document.createElement("div");
      row.className = "parent-row";
      var face = document.createElement("button");
      face.type = "button";
      face.className = "parent-avatar";
      face.setAttribute("aria-label", "かお");
      var faceImg = document.createElement("img");
      faceImg.alt = "";
      faceImg.src = avatarSrc(u);
      face.appendChild(faceImg);
      face.addEventListener("click", function () { openAvatarPicker(u.id); });
      row.appendChild(face);
      var name = document.createElement("span");
      name.textContent = u.name + (u.builtin === "main" ? "（メイン）" : (u.builtin === "ellen" ? "（Español 1）" : (u.builtin === "guest" ? "（ゲスト）" : "")));
      row.appendChild(name);
      if (!u.builtin) {
        var del = document.createElement("button");
        del.type = "button";
        del.className = "btn pink";
        del.textContent = "けす";
        del.addEventListener("click", function () {
          if (del.textContent !== "けす？") {
            del.textContent = "けす？";
            return;
          }
          var next = readUsers().filter(function (x) { return x.id !== u.id; });
          saveUsers(next);
          storeRemove("emma-progress-" + u.id);
          storeRemove("emma-book-" + u.id);
          try { sessionStorage.removeItem("emma-active-" + u.id); } catch (e2) {}
          if (msg) msg.textContent = "けしたよ";
          renderParent();
        });
        row.appendChild(del);
      }
      listEl.appendChild(row);
    });
  }

  function addProfileFromForm() {
    if (!isMainProfile()) return;
    var nameEl = document.getElementById("parentName");
    var codeEl = document.getElementById("parentCode");
    var msg = document.getElementById("parentMsg");
    var name = nameEl ? String(nameEl.value || "").trim().slice(0, 12) : "";
    var code = codeEl ? String(codeEl.value || "").replace(/\D/g, "") : "";
    if (codeEl) codeEl.value = "";
    if (!name) {
      if (msg) msg.textContent = "なまえを いれてね";
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      if (msg) msg.textContent = "6けたの すうじだよ";
      return;
    }
    var id = sha256hex(code);
    code = "";
    if (userById(id)) {
      if (msg) msg.textContent = "その ことばは つかえないよ";
      return;
    }
    var users = readUsers();
    users.push({ id: id, name: name, builtin: "" });
    saveUsers(users);
    if (nameEl) nameEl.value = "";
    if (msg) msg.textContent = "つくったよ";
    renderParent();
  }

  playBack.addEventListener("click", function () {
    if (photoDone) endCameraFun();
    else showHome();
  });
  backBtn.addEventListener("click", function () {
    saveActive();
    showHome();
  });
  homeBtn.addEventListener("click", showHome);
  againBtn.addEventListener("click", function () {
    cancelReward();
    EmmaSound.playOpening();
    sessionStorage.removeItem(activeKey());
    beginStudy(lastMode);
  });
  var photoBtn = document.getElementById("photoBtn");
  if (photoBtn) photoBtn.addEventListener("click", function () {
    cancelReward();
    startCameraFun();
  });
  var startBook = document.getElementById("startBook");
  var bookBtn = document.getElementById("bookBtn");
  function openBook() {
    cancelReward();
    stopPlayTimer();
    stopCamera();
    showOnly("book");
    renderBook("kanji");
  }
  if (startBook) startBook.addEventListener("click", openBook);
  if (bookBtn) bookBtn.addEventListener("click", openBook);
  var bookHome = document.getElementById("bookHome");
  if (bookHome) bookHome.addEventListener("click", showHome);
  var bookTabKanji = document.getElementById("bookTabKanji");
  var bookTabMath = document.getElementById("bookTabMath");
  if (bookTabKanji) bookTabKanji.addEventListener("click", function () { renderBook("kanji"); });
  if (bookTabMath) bookTabMath.addEventListener("click", function () { renderBook("math"); });
  var parentBtn = document.getElementById("parentBtn");
  function refreshCloud() {
    var el = document.getElementById("cloudStatus");
    if (!el || !window.EmmaCloud) return;
    el.textContent = EmmaCloud.status().message;
  }

  function refreshPersist() {
    var status = document.getElementById("persistStatus");
    var hint = document.getElementById("installHint");
    if (!status || !window.EmmaStore) return;
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
    if (hint) {
      hint.textContent = standalone
        ? "アプリで ひらいてるよ。きろくは この ホームがめんに のこるよ。"
        : "ホームがめんに ついか: iPhoneは 共有 → ホーム画面に追加。そうすると きろくが きえないよ。";
    }
    EmmaStore.askPersist().then(function () { return EmmaStore.persisted(); }).then(function (yes) {
      status.textContent = yes ? "きおく: まもってる" : "きおく: ブラウザが けすかも。ホームがめんに ついかしてね";
    });
  }

  function downloadBackup() {
    if (!window.EmmaStore) return;
    var blob = new Blob([JSON.stringify(EmmaStore.snapshot())], { type: "application/json" });
    var file = new File([blob], "emma-backup.json", { type: "application/json" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "エマのバックアップ" }).catch(function () {});
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "emma-backup.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data = null;
      try { data = JSON.parse(String(reader.result || "")); } catch (e) { data = null; }
      var msg = document.getElementById("parentMsg");
      if (!window.EmmaStore || !EmmaStore.restore(data)) {
        if (msg) msg.textContent = "この ファイルは つかえないよ";
        return;
      }
      if (msg) msg.textContent = "もどしたよ";
      setTimeout(function () { location.reload(); }, 400);
    };
    reader.readAsText(file);
  }

  if (parentBtn) parentBtn.addEventListener("click", function () {
    if (!isMainProfile()) return;
    showOnly("parent");
    renderParent();
    refreshPersist();
    refreshCloud();
  });
  var backupBtn = document.getElementById("backupBtn");
  if (backupBtn) backupBtn.addEventListener("click", downloadBackup);
  var restoreBtn = document.getElementById("restoreBtn");
  var restoreFile = document.getElementById("restoreFile");
  if (restoreBtn && restoreFile) {
    restoreBtn.addEventListener("click", function () { restoreFile.click(); });
    restoreFile.addEventListener("change", function () {
      var picked = restoreFile.files && restoreFile.files[0];
      restoreFile.value = "";
      if (picked) restoreBackup(picked);
    });
  }
  var parentBack = document.getElementById("parentBack");
  if (parentBack) parentBack.addEventListener("click", showHome);
  var parentAdd = document.getElementById("parentAdd");
  if (parentAdd) parentAdd.addEventListener("click", addProfileFromForm);

  if (captureBtn) captureBtn.addEventListener("click", onShutter);
  if (resetBtn) resetBtn.addEventListener("click", function () {
    if (window.EmmaPuri) EmmaPuri.startCamera();
    else resetScene();
  });
  if (clearPlay && playInk) clearPlay.addEventListener("click", function () { clearInk(playInk); });
  if (savePlay) savePlay.addEventListener("click", savePicture);
  if (fileInput) fileInput.addEventListener("change", function () {
    var picked = fileInput.files && fileInput.files[0];
    if (picked && window.EmmaPuri) {
      EmmaPuri.loadFile(picked);
      fileInput.value = "";
      return;
    }
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      stopCamera();
      video.hidden = true;
      photoCanvas.hidden = false;
      var ctx = photoCanvas.getContext("2d");
      drawCover(ctx, img, photoCanvas.width, photoCanvas.height);
      rawPixels = ctx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
      applyPixelStyle();
      captureBtn.textContent = "しゃしん";
      playNote.textContent = "かいて かわいく しよう";
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      playNote.textContent = "この しゃしんは つかえないよ";
    };
    img.src = url;
  });

  var styleRow = document.getElementById("styleRow");
  if (styleRow) styleRow.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-style]");
    if (!btn) return;
    setStyle(btn.getAttribute("data-style"));
  });
  var toolRow = document.getElementById("toolRow");
  if (toolRow) toolRow.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-tool]");
    if (!btn) return;
    tool = btn.getAttribute("data-tool");
    markTool();
  });

  clearBtn.addEventListener("click", function () {
    if (!active || !active.queue.length) return;
    if (active.queue[0].kind === "kanji") {
      stopStrokePlay();
      resetKanjiDrawing();
      if (guideWanted(active.queue[0])) showHintStroke(active.queue[0].id);
    } else {
      clearInk(mathInk);
      mathUserStrokes = [];
    }
  });
  if (strokeBtn) {
    strokeBtn.addEventListener("click", function () {
      if (!active || !active.queue.length || active.queue[0].kind !== "kanji") return;
      strokeGuideOn = true;
      playStrokeOrder(active.queue[0].id, { restore: true });
    });
  }
  doneBtn.addEventListener("click", onDone);
  skipBtn.addEventListener("click", onSkip);
  speakBtn.addEventListener("click", function () {
    if (!active || !active.queue.length) return;
    var view = hydrate(active.queue[0]);
    if (view.kind === "kanji") {
      EmmaSound.stopSong();
      progress.bgmPaused = !progress.bgmPaused;
      saveProgress();
      EmmaSound.setBgmPaused(progress.bgmPaused);
      if (progress.bgmPaused) EmmaSound.stopBgm();
      else EmmaSound.startBgm();
      updateListenLabel();
      return;
    }
    EmmaSound.stopBgm();
    if (view.a && view.b && !view.op) {
      if (EmmaSound.songPlaying()) EmmaSound.stopSong();
      else playFactSong(view);
      return;
    }
    EmmaSound.stopSong();
    EmmaSound.speak(view.speak);
  });

  document.body.addEventListener("pointerdown", function (e) {
    if (e.target && e.target.closest && e.target.closest("#muteBtn")) return;
    EmmaSound.unlock().then(function () { EmmaSound.playOpening(); });
  }, { once: true });

  var gateCode = "";
  var gateEl = document.getElementById("gate");
  var gateDots = document.getElementById("gateDots");
  var gateMsg = document.getElementById("gateMsg");

  function renderGate() {
    if (!gateDots) return;
    var dots = "";
    for (var i = 0; i < 6; i++) dots += i < gateCode.length ? "●" : "○";
    gateDots.textContent = dots;
  }

  var pendingProfile = "";

  function showGate(id) {
    pendingProfile = id || "";
    var user = userById(pendingProfile);
    if (gateEl) gateEl.hidden = false;
    var startPick = document.getElementById("startPick");
    if (startPick) startPick.hidden = true;
    var profiles = document.getElementById("profiles");
    if (profiles) profiles.hidden = true;
    home.hidden = true;
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = true;
    document.body.dataset.screen = "gate";
    gateCode = "";
    renderGate();
    if (gateMsg) gateMsg.textContent = "";
    var lead = document.getElementById("gateLead");
    if (lead) lead.textContent = user ? (user.name + "の あいことば") : "あいことば";
    var face = document.getElementById("gateAvatar");
    if (face && user) face.src = avatarSrc(user);
    fitHome();
  }

  function enterApp(id) {
    rememberProfile(id);
    storeSet(GATE_KEY, id);
    var user = userById(id);
    progress = loadProgress();
    active = null;
    showLoading(user);
    var started = Date.now();
    function finishEnter() {
      progress = loadProgress();
      applySoundFlags();
      var wait = Math.max(0, 700 - (Date.now() - started));
      setTimeout(function () {
        hideLoading();
        if (chosenApp === "espanol" && window.EmmaSpanish) {
          showOnly("espanol");
          EmmaSpanish.openGame();
        } else {
          showHome();
          EmmaSound.playOpening();
        }
      }, wait);
    }
    if (window.EmmaCloud && EmmaCloud.pullAndMerge && navigator.onLine !== false) {
      EmmaCloud.pullAndMerge(id).then(finishEnter, finishEnter);
    } else {
      finishEnter();
    }
  }

  function logout() {
    cancelReward();
    if (window.EmmaSpanish) EmmaSpanish.stop();
    storeRemove(GATE_KEY);
    active = null;
    EmmaSound.stopSong();
    kanjiMusicOff();
    showStart();
  }

  function tryGate() {
    if (gateCode.length < 6) return;
    var digest = sha256hex(gateCode);
    gateCode = "";
    ensureUsers();
    var user = userById(digest);
    if (!user || (pendingProfile && digest !== pendingProfile)) {
      renderGate();
      if (gateMsg) gateMsg.textContent = "もういちど";
      if (gateEl) {
        gateEl.classList.remove("shake");
        void gateEl.offsetWidth;
        gateEl.classList.add("shake");
      }
      return;
    }
    enterApp(user.id);
  }

  function pressGate(key) {
    EmmaSound.unlock();
    if (gateMsg) gateMsg.textContent = "";
    if (key === "del") {
      gateCode = gateCode.slice(0, -1);
      renderGate();
      return;
    }
    if (gateCode.length >= 6) return;
    gateCode += key;
    renderGate();
    if (gateCode.length === 6) tryGate();
  }

  var gatePad = document.getElementById("gatePad");
  if (gatePad) {
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0"].forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gate-key" + (key === "del" ? " del" : "");
      btn.textContent = key === "del" ? "けす" : key;
      btn.setAttribute("aria-label", key === "del" ? "けす" : key);
      btn.addEventListener("click", function () { pressGate(key); });
      gatePad.appendChild(btn);
    });
  }
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  function chooseProfile(id) {
    var user = userById(id);
    if (!user) return;
    if (chosenApp === "espanol" && window.EmmaSpanish) EmmaSpanish.unlock();
    if (user.builtin === "guest" || user.builtin === "ellen") {
      enterApp(id);
      return;
    }
    if (profileRemembered(id)) enterApp(id);
    else showGate(id);
  }

  function setAvatar(id, avatar) {
    var users = readUsers();
    var now = Date.now();
    users.forEach(function (user) {
      if (user.id === id) {
        user.avatar = avatar;
        user.avatarAt = now;
      }
    });
    saveUsers(users);
    if (window.EmmaCloud && EmmaCloud.syncProfile) EmmaCloud.syncProfile(id);
    renderProfiles();
    if (document.body.dataset.screen === "parent") renderParent();
    var mine = document.querySelector("#myAvatar img");
    var me = userById(profileId());
    if (mine && me) mine.src = avatarSrc(me);
    document.querySelectorAll(".ellen-avatar-img").forEach(function (img) {
      var who = userById(profileId());
      if (who) img.src = avatarSrc(who);
    });
  }

  var pickingFor = "";
  function openAvatarPicker(id) {
    if (!userById(id)) return;
    pickingFor = id;
    var pick = document.getElementById("avatarPick");
    var grid = document.getElementById("avatarGrid");
    if (!pick || !grid) return;
    var current = avatarIdOf(userById(id));
    grid.innerHTML = AVATARS.map(function (row) {
      return "<button type='button' data-avatar='" + row[0] + "'" + (row[0] === current ? " class='spark'" : "") + "><img alt='' src='" + row[2] + "'><span>" + row[1] + "</span></button>";
    }).join("");
    pick.hidden = false;
  }

  var profileGrid = document.getElementById("profileGrid");
  if (profileGrid) profileGrid.addEventListener("click", function (e) {
    var card = e.target.closest("[data-profile]");
    if (!card) return;
    chooseProfile(card.getAttribute("data-profile"));
  });
  var pickStudy = document.getElementById("pickStudy");
  var pickEspanol = document.getElementById("pickEspanol");
  function chooseApp(app) {
    chosenApp = app;
    EmmaSound.unlock().then(function () { EmmaSound.playOpening(); });
    showProfiles();
  }
  if (pickStudy) pickStudy.addEventListener("click", function () { chooseApp("study"); });
  if (pickEspanol) pickEspanol.addEventListener("click", function () { chooseApp("espanol"); });
  var profileBack = document.getElementById("profileBack");
  if (profileBack) profileBack.addEventListener("click", showStart);
  var gateBack = document.getElementById("gateBack");
  if (gateBack) gateBack.addEventListener("click", function () {
    pendingProfile = "";
    gateCode = "";
    showProfiles();
  });
  var myAvatar = document.getElementById("myAvatar");
  if (myAvatar) myAvatar.addEventListener("click", function () {
    if (profileId()) openAvatarPicker(profileId());
  });
  var avatarGrid = document.getElementById("avatarGrid");
  if (avatarGrid) avatarGrid.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-avatar]");
    if (!btn || !pickingFor) return;
    avatarGrid.querySelectorAll("button").forEach(function (el) { el.classList.remove("spark"); });
    btn.classList.add("spark");
    var chosen = btn.getAttribute("data-avatar");
    setTimeout(function () {
      setAvatar(pickingFor, chosen);
      var pick = document.getElementById("avatarPick");
      if (pick) pick.hidden = true;
    }, 520);
  });
  var avatarClose = document.getElementById("avatarClose");
  if (avatarClose) avatarClose.addEventListener("click", function () {
    var pick = document.getElementById("avatarPick");
    if (pick) pick.hidden = true;
  });

  applySoundFlags();
  ensureUsers();
  if (profileId()) rememberProfile(profileId());
  showStart();
  function rehydrateFromStore() {
    progress = loadProgress();
    ensureUsers();
    if (profileId() && document.body.dataset.screen === "gate") showHome();
    if (profileId() === GATE_HASH.ellen && document.body.dataset.screen === "home" && window.EmmaSpanish) {
      showOnly("ellen");
      EmmaSpanish.openMenu();
    }
    if (window.EmmaSpanish) EmmaSpanish.refresh();
    if (document.body.dataset.screen === "parent") renderParent();
    if (document.body.dataset.screen === "book") renderBook("kanji");
    refreshCloud();
  }

  if (window.EmmaCloud) {
    EmmaCloud.setProfile(profileId);
    EmmaCloud.setName(function (id) {
      var user = userById(id);
      return user ? user.name : "";
    });
    EmmaCloud.onStatus(refreshCloud);
  }
  if (window.EmmaStore) {
    EmmaStore.whenReady(function (changed) {
      migrateFamilySaves();
      if (changed) rehydrateFromStore();
      if (window.EmmaCloud) EmmaCloud.start().then(rehydrateFromStore);
      else refreshCloud();
    });
  }
  window.addEventListener("resize", fitHome);
  if (!TEST_MODE && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  if (TEST_MODE) {
    window.__emma = {
      judge: judge,
      current: function () { return active && active.queue[0] ? hydrate(active.queue[0]) : null; },
      progress: function () { return progress; },
      active: function () { return active; },
      useDrawFallback: useDrawFallback,
      paintAnswer: function (mode) {
        var view = hydrate(active.queue[0]);
        var canvas = view.kind === "kanji" ? kanjiInk : mathInk;
        clearInk(canvas);
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#241b38";
        ctx.strokeStyle = "#241b38";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 8;
        ctx.font = "bold " + glyphSize(view.answer, canvas.width, canvas.height) + "px " + GLYPH_FONT;
        if (mode === "stroke") ctx.strokeText(view.answer, canvas.width / 2, canvas.height / 2);
        else ctx.fillText(view.answer, canvas.width / 2, canvas.height / 2);
      },
      scribble: function () {
        var view = hydrate(active.queue[0]);
        var canvas = view.kind === "kanji" ? kanjiInk : mathInk;
        clearInk(canvas);
        var ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#241b38";
        ctx.lineWidth = 16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(18, 24);
        ctx.lineTo(canvas.width - 16, 36);
        ctx.lineTo(28, canvas.height - 18);
        ctx.stroke();
      },
      inkCanvas: function () {
        var view = hydrate(active.queue[0]);
        return view.kind === "kanji" ? kanjiInk : mathInk;
      },
      drawOrder: function (reverse) {
        var view = hydrate(active.queue[0]);
        resetKanjiDrawing();
        var exp = expectedStrokes(view.answer).slice();
        if (reverse) exp.reverse();
        var ctx = kanjiInk.getContext("2d");
        ctx.lineWidth = 18;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#241b38";
        exp.forEach(function (pts) {
          var pix = pts.map(function (p) {
            return { x: p.x * kanjiInk.width, y: p.y * kanjiInk.height };
          });
          kanjiUserStrokes.push(pix);
          ctx.beginPath();
          ctx.moveTo(pix[0].x, pix[0].y);
          pix.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
          ctx.stroke();
        });
      },
      orderOf: function () {
        var view = hydrate(active.queue[0]);
        return classifyOrder(kanjiUserStrokes, view.answer, kanjiInk);
      },
      digitsReady: digitReady,
      digitLogits: function (flat) {
        if (!digitNet) return null;
        return Array.prototype.slice.call(cnnLogits(new Float32Array(flat)));
      },
      prepCanvas: function (canvas) {
        var field = grayFromCanvas(canvas);
        return Array.prototype.slice.call(prepDigit(field.gray, field.w, field.h));
      },
      lastRead: function () { return lastDigitRead; },
      paintStrokes: function (kind, strokes) {
        var canvas = kind === "kanji" ? kanjiInk : mathInk;
        clearInk(canvas);
        if (kind === "kanji") kanjiUserStrokes = [];
        else mathUserStrokes = [];
        var ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#241b38";
        ctx.lineWidth = kind === "kanji" ? 16 : 18;
        (strokes || []).forEach(function (pts) {
          if (!pts || pts.length < 2) return;
          var pix = pts.map(function (p) {
            return { x: p.x * canvas.width, y: p.y * canvas.height };
          });
          if (kind === "kanji") kanjiUserStrokes.push(pix);
          else mathUserStrokes.push(pix);
          ctx.beginPath();
          ctx.moveTo(pix[0].x, pix[0].y);
          pix.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
          ctx.stroke();
        });
        return canvas;
      },
      gradeKanji: function (ch) {
        var result = judge(kanjiInk, ch, false, "kanji");
        return withOrder(result, kanjiInk, ch, false);
      },
      gradeNumber: function (answer) {
        return judgeNumber(mathInk, String(answer));
      },
      debugInk: function () {
        var field = grayFromCanvas(mathInk);
        var facts = glyphFacts(field);
        return { geo: Array.prototype.slice.call(geomScores(field)), aspect: facts.aspect, holes: facts.holes, z: facts.z };
      },
      kanjiList: function () {
        return (window.KANJI || []).map(function (k) { return k.kanji || k.id; });
      },
      expectedOf: function (ch) { return expectedStrokes(ch); }
    };
  }

  if (window.EmmaSpanish) {
    EmmaSpanish.boot({
      progress: function () { return progress; },
      save: function () {
        saveProgress();
        mirrorEspanolStickers();
      },
      leave: logout,
      avatar: function () {
        var me = userById(profileId());
        return me ? avatarSrc(me) : "assets/avatars/ellen.svg";
      },
      profileName: function () {
        var me = userById(profileId());
        return me ? me.name : "";
      },
      pickAvatar: function () {
        if (profileId()) openAvatarPicker(profileId());
      },
      show: showOnly,
      chime: function (kind) { if (window.EmmaSound) EmmaSound.chime(kind); },
      photo: function (done) { startCameraFun(done); }
    });
  }
})();
