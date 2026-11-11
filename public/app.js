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
  var STORE_KEY = "emma-progress-v1";
  var ACTIVE_KEY = "emma-active-v1";
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
  var songBtn = document.getElementById("songBtn");
  var bgmBtn = document.getElementById("bgmBtn");
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
    if (ref.kind === "kuku") return !!KUKU_BY_ID[ref.id];
    return false;
  }

  function loadProgress() {
    var base = { sessions: 0, kanjiIndex: 0, kukuIndex: 0, remember: [], mute: false, bgmPaused: false };
    try {
      var p = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      base.sessions = Number(p.sessions) || 0;
      base.kanjiIndex = Number(p.kanjiIndex) || 0;
      base.kukuIndex = Number(p.kukuIndex) || 0;
      base.mute = !!p.mute;
      base.bgmPaused = !!p.bgmPaused;
      if (Array.isArray(p.remember)) base.remember = p.remember.filter(known);
    } catch (e) {}
    base.kanjiIndex = ((base.kanjiIndex % KANJI.length) + KANJI.length) % KANJI.length;
    base.kukuIndex = ((base.kukuIndex % KUKU.length) + KUKU.length) % KUKU.length;
    return base;
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function readActive() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || "null");
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
      sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    } catch (e) {}
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

  function makePlan() {
    var nextSession = progress.sessions + 1;
    var reviewRound = nextSession % 5 === 0;
    var counts = dailyCounts(reviewRound);
    var queue = [];
    var seen = {};
    function pushItem(item, extra) {
      var ref = {
        kind: item.kind,
        id: item.id,
        copy: !!(extra && extra.copy),
        fromRemember: !!(extra && extra.fromRemember),
        endRedo: false,
        misses: 0
      };
      var key = ref.kind + ":" + ref.id;
      if (seen[key]) return;
      seen[key] = true;
      queue.push(ref);
    }
    if (reviewRound) {
      progress.remember.slice(0, counts.reviewCap).forEach(function (r) {
        pushItem(r, { fromRemember: true });
      });
    }
    var kanjiTake = take(KANJI, progress.kanjiIndex, counts.kanji);
    var kukuTake = take(KUKU, progress.kukuIndex, counts.kuku);
    interleave(kanjiTake.items, kukuTake.items).forEach(function (item) {
      pushItem(item, null);
    });
    return {
      queue: queue,
      nextKanji: kanjiTake.next,
      nextKuku: kukuTake.next,
      reviewRound: reviewRound
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
        kanji: k.kanji,
        speak: k.speak,
        reading: k.speak,
        answer: k.kanji
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
      a: m.a,
      b: m.b,
      speak: m.speak,
      answer: String(m.a * m.b)
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

  function showOnly(name) {
    home.hidden = name !== "home";
    play.hidden = name !== "play";
    study.hidden = name !== "study";
    done.hidden = name !== "done";
    document.body.dataset.screen = name;
  }

  function updateMuteLabel() {
    muteBtn.textContent = progress.mute ? "🔇 おと なし" : "🔊 おと あり";
    muteBtn.setAttribute("aria-pressed", progress.mute ? "true" : "false");
  }

  function updateBgmLabel() {
    bgmBtn.textContent = progress.bgmPaused ? "おんがく" : "おんがく とめる";
  }

  function applySoundFlags() {
    EmmaSound.setMuted(progress.mute);
    EmmaSound.setBgmPaused(progress.bgmPaused);
    updateMuteLabel();
    updateBgmLabel();
  }

  function showHome() {
    stopPlayTimer();
    stopCamera();
    EmmaSound.stopSong();
    EmmaSound.stopBgm();
    songBtn.textContent = "九九のうた";
    showOnly("home");
    startBtn.textContent = readActive() ? "つづき" : "はじめる";
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

  function bindDraw(canvas, lineWidth, allowSticker) {
    var drawing = false;
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
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
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      var ctx = canvas.getContext("2d");
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#241b38";
      var p = pos(canvas, e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.2, p.y + 0.2);
      ctx.stroke();
    }, { passive: false });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(canvas, e);
      canvas.getContext("2d").lineTo(p.x, p.y);
      canvas.getContext("2d").stroke();
    }, { passive: false });
    function end() { drawing = false; }
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
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

  function judge(canvas, answer, copy, kind) {
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

  function setFeedback(text, kind) {
    feedbackEl.textContent = text;
    feedbackEl.className = "feedback" + (kind ? " " + kind : "");
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
    songBtn.textContent = "九九のうた";
    clearInk(kanjiInk);
    clearInk(mathInk);
    clearInk(kanjiGuide);
    clearInk(mathGuide);
    modeTitle.textContent = banner(view);
    var isKanji = view.kind === "kanji";
    promptEl.textContent = view.copy ? "これを かこう" : (isKanji ? "きいて、かんじを かこう" : "こたえを かこう");
    kanjiBoard.hidden = !isKanji;
    mathBoard.hidden = isKanji;
    document.body.dataset.mode = isKanji ? "kanji" : "kuku";
    if (isKanji) {
      questionEl.hidden = true;
      readingEl.hidden = !view.copy;
      readingEl.textContent = view.copy ? view.reading : "";
      if (view.copy) paintGuide(kanjiGuide, view.answer);
      EmmaSound.startBgm();
      songBtn.hidden = true;
      bgmBtn.hidden = false;
      speakBtn.classList.remove("wiggle");
      void speakBtn.offsetWidth;
      if (!view.copy) speakBtn.classList.add("wiggle");
    } else {
      questionEl.hidden = false;
      questionEl.textContent = view.copy
        ? (view.a + " × " + view.b + " = " + view.answer)
        : (view.a + " × " + view.b);
      readingEl.hidden = true;
      if (view.copy) paintGuide(mathGuide, view.answer);
      EmmaSound.stopBgm();
      songBtn.hidden = false;
      bgmBtn.hidden = true;
      speakBtn.classList.remove("wiggle");
    }
    updateBgmLabel();
    progressEl.textContent = "あと " + active.queue.length + " もん";
    setFeedback("", "");
    if (isKanji || view.copy) EmmaSound.speak(view.speak);
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
    progress.kanjiIndex = active.nextKanji;
    progress.kukuIndex = active.nextKuku;
    saveProgress();
    sessionStorage.removeItem(ACTIVE_KEY);
    active = null;
    EmmaSound.stopSong();
    EmmaSound.stopBgm();
    songBtn.textContent = "九九のうた";
    showOnly("done");
    document.getElementById("doneLead").textContent = "エマ、がんばったね";
    EmmaSound.celebrate();
  }

  function beginStudy() {
    stopPlayTimer();
    stopCamera();
    var existing = readActive();
    if (existing) {
      active = existing;
      showOnly("study");
      renderFromActive();
      return;
    }
    active = makePlan();
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
      onMiss(ref);
      return;
    }
    busy = true;
    var great = result.kind === "hanamaru";
    setFeedback(great ? "はなまる！" : "まる！", great ? "hanamaru" : "maru");
    EmmaSound.chime(great ? "hanamaru" : "maru");
    if (ref.fromRemember && !ref.copy) removeRemember(ref);
    setTimeout(function () {
      if (!active) return;
      active.queue.shift();
      renderFromActive();
    }, 800);
  }

  function onMiss(ref) {
    busy = true;
    ref.misses = (ref.misses || 0) + 1;
    setFeedback("もういちど かこう", "retry");
    setTimeout(function () {
      if (!active || active.queue[0] !== ref) {
        busy = false;
        return;
      }
      clearInk(ref.kind === "kanji" ? kanjiInk : mathInk);
      if (ref.misses >= 3 && !ref.copy) {
        ref.copy = true;
        addRemember(ref);
        renderFromActive();
        setFeedback("これを かこう", "retry");
      }
      busy = false;
      saveActive();
    }, 450);
  }

  function onSkip() {
    if (busy || !active || !active.queue.length) return;
    var cur = active.queue[0];
    var endPhase = !!cur.copy && active.queue.every(function (q) { return q.copy; });
    if (endPhase) {
      setFeedback("かいてから すすもう", "retry");
      return;
    }
    addRemember(cur);
    active.queue.shift();
    active.queue.push({
      kind: cur.kind,
      id: cur.id,
      copy: true,
      fromRemember: !!cur.fromRemember,
      endRedo: true,
      misses: cur.misses || 0
    });
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

  bindDraw(kanjiInk, 18, false);
  bindDraw(mathInk, 20, false);
  bindDraw(playInk, 16, true);

  muteBtn.addEventListener("click", function () {
    progress.mute = !progress.mute;
    saveProgress();
    applySoundFlags();
    if (progress.mute) EmmaSound.stopBgm();
    else {
      EmmaSound.playOpening();
      if (document.body.dataset.mode === "kanji") EmmaSound.startBgm();
    }
  });

  startBtn.addEventListener("click", function () {
    EmmaSound.unlock().then(function () { EmmaSound.playOpening(); });
    if (readActive()) beginStudy();
    else startCameraFun();
  });

  playBack.addEventListener("click", showHome);
  backBtn.addEventListener("click", function () {
    saveActive();
    showHome();
  });
  homeBtn.addEventListener("click", showHome);
  againBtn.addEventListener("click", function () {
    EmmaSound.playOpening();
    startCameraFun();
  });

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
    clearInk(active.queue[0].kind === "kanji" ? kanjiInk : mathInk);
  });
  doneBtn.addEventListener("click", onDone);
  skipBtn.addEventListener("click", onSkip);
  speakBtn.addEventListener("click", function () {
    if (!active || !active.queue.length) return;
    EmmaSound.stopSong();
    songBtn.textContent = "九九のうた";
    EmmaSound.speak(hydrate(active.queue[0]).speak);
  });
  songBtn.addEventListener("click", function () {
    if (!active || !active.queue.length || active.queue[0].kind !== "kuku") return;
    if (EmmaSound.songPlaying()) {
      EmmaSound.stopSong();
      songBtn.textContent = "九九のうた";
      return;
    }
    var view = hydrate(active.queue[0]);
    var lines = KUKU.filter(function (k) { return k.a === view.a; }).sort(function (a, b) { return a.b - b.b; });
    songBtn.textContent = "とめる";
    EmmaSound.playSong(lines, function () { songBtn.textContent = "九九のうた"; });
  });
  bgmBtn.addEventListener("click", function () {
    progress.bgmPaused = !progress.bgmPaused;
    saveProgress();
    EmmaSound.setBgmPaused(progress.bgmPaused);
    if (!progress.bgmPaused && document.body.dataset.mode === "kanji") EmmaSound.startBgm();
    if (progress.bgmPaused) EmmaSound.stopBgm();
    updateBgmLabel();
  });

  document.body.addEventListener("pointerdown", function (e) {
    if (e.target && e.target.closest && e.target.closest("#muteBtn")) return;
    EmmaSound.unlock().then(function () { EmmaSound.playOpening(); });
  }, { once: true });

  applySoundFlags();
  showHome();
  EmmaSound.unlock().then(function () { EmmaSound.playOpening(); }).catch(function () {});

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
      }
    };
  }
})();
