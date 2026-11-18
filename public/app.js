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
    guest: "66b49fe4f7018673a75d9a7c39911a0458695d23bff9e96b6298eb7704d6bf1d"
  };
  var GLYPH_FONT = '"Hiragino Maru Gothic ProN", "Hiragino Maru Gothic Pro", "Yu Gothic", "YuGothic", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';
  var GRID_N = 24;
  var RECALL_HANAMARU = 0.8;
  var RECALL_MISS_KANJI = 0.5;
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

  function readUsers() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    var out = [];
    var seen = {};
    list.forEach(function (u) {
      if (!u || typeof u.id !== "string" || !/^[0-9a-f]{64}$/.test(u.id)) return;
      if (seen[u.id]) return;
      seen[u.id] = true;
      out.push({ id: u.id, name: String(u.name || "なまえ").slice(0, 12), builtin: u.builtin || "" });
    });
    if (!seen[GATE_HASH.emma]) out.unshift({ id: GATE_HASH.emma, name: "エマ", builtin: "main" });
    if (!seen[GATE_HASH.guest]) out.push({ id: GATE_HASH.guest, name: "ゲスト", builtin: "guest" });
    out.sort(function (a, b) {
      var rank = function (u) { return u.builtin === "main" ? 0 : (u.builtin === "guest" ? 1 : 2); };
      return rank(a) - rank(b);
    });
    return out;
  }

  function saveUsers(list) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(list.map(function (u) {
        return { id: u.id, name: String(u.name || "").slice(0, 12), builtin: u.builtin || "" };
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

  function profileId() {
    var w = "";
    try { w = localStorage.getItem(GATE_KEY) || ""; } catch (e) { w = ""; }
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
    var base = { sessions: 0, kanjiIndex: 0, kukuIndex: 0, worksheetIndex: 0, remember: [], mute: false, bgmPaused: true };
    try {
      var raw = localStorage.getItem(progressKey());
      if (!raw) raw = localStorage.getItem(legacyProgressKey(profileId())) || "";
      var p = JSON.parse(raw || "{}");
      base.sessions = Number(p.sessions) || 0;
      base.kanjiIndex = Number(p.kanjiIndex) || 0;
      base.kukuIndex = Number(p.kukuIndex) || 0;
      base.worksheetIndex = Number(p.worksheetIndex) || 0;
      base.mute = !!p.mute;
      base.bgmPaused = !!p.bgmPaused;
      if (Array.isArray(p.remember)) base.remember = p.remember.filter(known);
    } catch (e) {}
    base.kanjiIndex = ((base.kanjiIndex % KANJI.length) + KANJI.length) % KANJI.length;
    base.kukuIndex = ((base.kukuIndex % KUKU.length) + KUKU.length) % KUKU.length;
    if (window.WORKSHEET_ITEMS && WORKSHEET_ITEMS.length) {
      base.worksheetIndex = ((base.worksheetIndex % WORKSHEET_ITEMS.length) + WORKSHEET_ITEMS.length) % WORKSHEET_ITEMS.length;
    }
    return base;
  }

  function saveProgress() {
    try {
      localStorage.setItem(progressKey(), JSON.stringify(progress));
    } catch (e) {}
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
      var raw = JSON.parse(localStorage.getItem(bookKey()) || "");
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
      localStorage.setItem(bookKey(), JSON.stringify(book));
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
        return { img: cell.img, stamp: cell.stamp === "hanamaru" ? "hanamaru" : "maru" };
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
    book.kanji[view.id].push({ img: thumbOf(canvas), stamp: stamp === "hanamaru" ? "hanamaru" : "maru" });
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
    home.hidden = name !== "home";
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = name === "home";
    play.hidden = name !== "play";
    study.hidden = name !== "study";
    done.hidden = name !== "done";
    var book = document.getElementById("book");
    var parent = document.getElementById("parent");
    if (book) book.hidden = name !== "book";
    if (parent) parent.hidden = name !== "parent";
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

  function showHome() {
    cancelReward();
    stopPlayTimer();
    stopCamera();
    EmmaSound.stopSong();
    kanjiMusicOff();
    showOnly("home");
    updateParentButton();
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

  function judgeNumber(canvas, answer) {
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
    var score = cosine(userNorm, tmpl.norm);
    var missBelow = kind === "kuku" ? RECALL_MISS_MATH : RECALL_MISS_KANJI;
    if (score >= RECALL_HANAMARU && placementOk(stats)) return { kind: "hanamaru", score: score };
    if (score < missBelow) return { kind: "miss", score: score };
    return { kind: "maru", score: score };
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

  function strokeMatch(userPts, expPts) {
    if (!userPts || userPts.length < 2 || !expPts || expPts.length < 2) return false;
    var us = userPts[0];
    var ue = userPts[userPts.length - 1];
    var es = expPts[0];
    var ee = expPts[expPts.length - 1];
    var start = Math.hypot(us.x - es.x, us.y - es.y);
    var udx = ue.x - us.x;
    var udy = ue.y - us.y;
    var edx = ee.x - es.x;
    var edy = ee.y - es.y;
    var ul = Math.hypot(udx, udy);
    var el = Math.hypot(edx, edy);
    var dot = 1;
    if (ul > 0.03 && el > 0.03) dot = (udx * edx + udy * edy) / (ul * el);
    var um = userPts[Math.floor(userPts.length / 2)];
    var em = expPts[Math.floor(expPts.length / 2)];
    var mid = Math.hypot(um.x - em.x, um.y - em.y);
    return start < 0.28 && mid < 0.32 && dot > 0.15;
  }

  function classifyOrder(userStrokes, ch, canvas) {
    var exp = expectedStrokes(ch);
    if (!exp.length || !userStrokes.length) return "unknown";
    var normed = userStrokes.map(function (s) { return normUserStroke(s, canvas); });
    var n = exp.length;
    var m = normed.length;
    var matched = 0;
    var limit = Math.min(m, n);
    for (var i = 0; i < limit; i++) if (strokeMatch(normed[i], exp[i])) matched++;
    var seq = matched / n;
    if (seq >= 0.6 && m >= n * 0.5) return "good";
    if (m <= 2 && n >= 5) return "wrong";
    if (seq < 0.25 && m >= 2) return "wrong";
    if (seq >= 0.25) return "slip";
    return "wrong";
  }

  function withOrder(result, canvas, answer, copy) {
    var order = classifyOrder(kanjiUserStrokes, answer, canvas);
    if (order === "unknown" || result.kind === "empty") return result;
    if (copy) {
      if (result.kind === "keep") return result;
      if (order === "good") return { kind: "hanamaru", score: result.score, order: order };
      return { kind: result.kind === "miss" ? "maru" : "maru", score: result.score, order: order };
    }
    if (order === "wrong") return { kind: "miss", score: result.score, order: "wrong" };
    if (order === "slip") {
      if (result.kind === "miss" && result.score < 0.35) return { kind: "miss", score: result.score, order: "wrong" };
      return { kind: "maru", score: result.score, order: "slip" };
    }
    if (order === "good") {
      if (result.kind === "hanamaru" || result.score >= 0.62) return { kind: "hanamaru", score: result.score, order: "good" };
      return { kind: "maru", score: result.score, order: "good" };
    }
    return result;
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
      kanjiYomi.textContent = view.yomi || view.reading || "";
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
    var praise = great ? "はなまる！" : (result.order === "slip" ? "まる！ かきじゅんも みてね" : "まる！");
    if (view.kind === "kanji") saveKanjiSample(view, canvas, great ? "hanamaru" : "maru");
    else saveFactSample(view, great ? "hanamaru" : "maru");
    setFeedback(praise, great ? "hanamaru" : "maru");
    EmmaSound.chime(great ? "hanamaru" : "maru");
    if (result.order === "slip" && view.kind === "kanji") playStrokeOrder(view.answer, { fade: true });
    if (ref.fromRemember && !ref.copy) removeRemember(ref);
    setTimeout(function () {
      if (!active) return;
      active.queue.shift();
      renderFromActive();
    }, result.order === "slip" ? 1500 : 800);
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
      else clearInk(mathInk);
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
    if (video.hidden || !stream) startLive();
    else capturePhoto();
  }

  function resetScene() {
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
      beginStudy();
      return;
    }
    playTick = setTimeout(tickPlay, 250);
  }

  function startCameraFun() {
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
  bindDraw(mathInk, 20, false);
  bindDraw(playInk, 16, true);

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
      var name = document.createElement("span");
      name.textContent = u.name + (u.builtin === "main" ? "（メイン）" : (u.builtin === "guest" ? "（ゲスト）" : ""));
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
          try { localStorage.removeItem("emma-progress-" + u.id); } catch (e) {}
          try { localStorage.removeItem("emma-book-" + u.id); } catch (e) {}
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

  playBack.addEventListener("click", showHome);
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
  if (parentBtn) parentBtn.addEventListener("click", function () {
    if (!isMainProfile()) return;
    showOnly("parent");
    renderParent();
  });
  var parentBack = document.getElementById("parentBack");
  if (parentBack) parentBack.addEventListener("click", showHome);
  var parentAdd = document.getElementById("parentAdd");
  if (parentAdd) parentAdd.addEventListener("click", addProfileFromForm);

  captureBtn.addEventListener("click", onShutter);
  resetBtn.addEventListener("click", resetScene);
  clearPlay.addEventListener("click", function () { clearInk(playInk); });
  savePlay.addEventListener("click", savePicture);
  fileInput.addEventListener("change", function () {
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

  document.getElementById("styleRow").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-style]");
    if (!btn) return;
    setStyle(btn.getAttribute("data-style"));
  });
  document.getElementById("toolRow").addEventListener("click", function (e) {
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

  function showGate() {
    if (gateEl) gateEl.hidden = false;
    home.hidden = true;
    var shell = document.querySelector(".card");
    if (shell) shell.hidden = true;
    document.body.dataset.screen = "gate";
    gateCode = "";
    renderGate();
    if (gateMsg) gateMsg.textContent = "";
    fitHome();
  }

  function enterApp(id) {
    try { localStorage.setItem(GATE_KEY, id); } catch (e) {}
    if (gateEl) gateEl.hidden = true;
    progress = loadProgress();
    active = null;
    applySoundFlags();
    showHome();
    EmmaSound.playOpening();
  }

  function logout() {
    cancelReward();
    try { localStorage.removeItem(GATE_KEY); } catch (e) {}
    active = null;
    EmmaSound.stopSong();
    kanjiMusicOff();
    showGate();
  }

  function tryGate() {
    if (gateCode.length < 6) return;
    var digest = sha256hex(gateCode);
    gateCode = "";
    ensureUsers();
    var user = userById(digest);
    if (!user) {
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

  applySoundFlags();
  ensureUsers();
  if (profileId()) {
    if (gateEl) gateEl.hidden = true;
    showHome();
  } else {
    showGate();
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
      }
    };
  }
})();
