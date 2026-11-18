/*
  Cute プリクラ editor. The photo is kept at the camera's own size.
  The on-screen canvas is only a sharp preview (device pixels).
  Saving paints the same layers again at full resolution.
*/
(function () {
  var BASE = "assets/purikura/";
  var CATS = {
    heart: ["heart", "heart-dot", "heart-gingham", "heart-lace", "heart-wing", "heart-tiny"],
    star: ["star", "star-wink", "star-small", "spark", "spark-cluster"],
    ribbon: ["bow", "bow-dot", "bow-gingham", "bow-white"],
    flower: ["flower", "heart-tiny", "spark"],
    chara: ["bunny", "bunny-wink", "cat", "cloud", "flower"],
    more: ["spark-cluster", "heart-wing", "star-wink", "bow-white", "cloud", "bunny"]
  };
  var TEXTS = [
    ["だいすき〜!", "#ff4f93"],
    ["最高の思い出♡", "#8d62ef"],
    ["キラキラ☆", "#7a4fe0"],
    ["ぴえん♡", "#e0a020"],
    ["またね〜(´ω`)", "#ff4f93"]
  ];
  var FILTERS = [
    ["none", "そのまま", "none"],
    ["bright", "あかるく", "brightness(1.18) saturate(1.25)"],
    ["pink", "ぴんく", "sepia(0.2) saturate(1.45) hue-rotate(-8deg) brightness(1.06)"],
    ["pastel", "パステル", "saturate(0.8) brightness(1.1) contrast(0.94)"],
    ["sparkle", "きらきら", "saturate(1.4) brightness(1.08) contrast(1.04)"],
    ["retro", "レトロ", "sepia(0.6) contrast(1.08) brightness(1.02)"],
    ["bw", "モノクロ", "grayscale(1) contrast(1.08)"]
  ];
  var COLORS = [
    ["ぴんく", "#ff4f93"],
    ["むらさき", "#8d62ef"],
    ["あお", "#3aa0ff"],
    ["きいろ", "#ffe14a"],
    ["みどり", "#3dcb7a"],
    ["オレンジ", "#ff9a3c"],
    ["ベビーピンク", "#ffd0e4"],
    ["ラベンダー", "#d7c4f8"],
    ["スカイブルー", "#8fd4ff"],
    ["レモンイエロー", "#fff3a1"],
    ["キラキラグリーン", "#b6f5c8"],
    ["ホワイト", "#ffffff"]
  ];
  var FRAMES = ["pink", "purple", "cloud"];

  var photo = document.createElement("canvas");
  var view, stage, video, tray, handles;
  var items = [];
  var inkStrokes = [];
  var images = {};
  var stream = null;
  var filterId = "none";
  var frameId = "pink";
  var glitter = false;
  var deco = false;
  var pen = { color: "#ff4f93", size: 0.012, glitter: false, erase: false };
  var mode = "draw";
  var selected = -1;
  var drag = null;
  var live = false;
  var glitterTick = 0;
  var nextId = 1;

  function el(id) { return document.getElementById(id); }

  function preload() {
    Object.keys(CATS).forEach(function (cat) {
      CATS[cat].forEach(function (name) { want(name); });
    });
    FRAMES.forEach(function (name) { want("frame-" + name); });
  }
  function want(name) {
    if (images[name]) return;
    var img = new Image();
    img.src = BASE + name + ".svg";
    images[name] = img;
  }

  function resizeTo(w, h) {
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    var maxSide = 1920;
    var scale = Math.min(1, maxSide / Math.max(w, h));
    photo.width = Math.max(2, Math.round(w * scale));
    photo.height = Math.max(2, Math.round(h * scale));
  }

  function drawCute(ctx, w, h) {
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#c9e7ff");
    sky.addColorStop(0.55, "#ffd6ee");
    sky.addColorStop(1, "#d7f5b8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffe56b";
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.22, Math.min(w, h) * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(w * 0.28, h * 0.28, h * 0.08, 0, Math.PI * 2);
    ctx.arc(w * 0.38, h * 0.26, h * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8ec0";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.62, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  function cute() {
    stop();
    resizeTo(1280, 960);
    drawCute(photo.getContext("2d"), photo.width, photo.height);
    showStill();
    redraw();
  }

  function showStill() {
    live = false;
    if (video) video.hidden = true;
    if (view) view.hidden = false;
    var shutter = el("captureBtn");
    if (shutter) shutter.hidden = true;
  }

  function showLive() {
    live = true;
    if (video) video.hidden = false;
    if (view) view.hidden = true;
    var shutter = el("captureBtn");
    if (shutter) shutter.hidden = false;
    selected = -1;
    placeHandles();
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cute();
      return;
    }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1440 }
      }
    }).then(function (s) {
      if (!stage || stage.closest("[hidden]")) {
        s.getTracks().forEach(function (t) { t.stop(); });
        return;
      }
      stop();
      stream = s;
      video.srcObject = s;
      video.play().catch(function () {});
      showLive();
      var note = el("playNote");
      if (note) note.textContent = "しゃしんを とって かざろう";
    }).catch(function () { cute(); });
  }

  function paintPhoto(bmp) {
    var w = bmp.videoWidth || bmp.naturalWidth || bmp.width;
    var h = bmp.videoHeight || bmp.naturalHeight || bmp.height;
    if (!w || !h) { cute(); return; }
    resizeTo(w, h);
    var ctx = photo.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, photo.width, photo.height);
    ctx.save();
    ctx.translate(photo.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(bmp, 0, 0, photo.width, photo.height);
    ctx.restore();
    showStill();
    redraw();
  }

  function grabVideo() {
    if (!video || !video.videoWidth) { cute(); return; }
    paintPhoto(video);
  }

  function capture() {
    var track = stream && stream.getVideoTracks()[0];
    if (window.ImageCapture && track) {
      try {
        var ic = new ImageCapture(track);
        if (ic.takePhoto) {
          ic.takePhoto().then(function (blob) {
            var img = new Image();
            img.onload = function () {
              URL.revokeObjectURL(img.src);
              paintPhoto(img);
            };
            img.onerror = grabVideo;
            img.src = URL.createObjectURL(blob);
          }).catch(grabVideo);
          return;
        }
      } catch (e) {}
    }
    grabVideo();
  }

  function shutter() {
    if (live && stream) capture();
    else startCamera();
  }

  function outSize() {
    var r = view ? view.getBoundingClientRect() : { width: 400, height: 520 };
    var aspect = r.width / Math.max(1, r.height);
    var h = 1600;
    var w = Math.round(h * aspect);
    if (w > 1600) {
      w = 1600;
      h = Math.round(w / aspect);
    }
    var holeW = w * 0.72;
    if (photo.width && holeW > photo.width) {
      var fit = photo.width / holeW;
      w = Math.max(2, Math.round(w * fit));
      h = Math.max(2, Math.round(h * fit));
    }
    return { w: w, h: h };
  }

  function contentBox() {
    var r = view.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function normPoint(e) {
    var box = contentBox();
    return {
      x: (e.clientX - box.left) / box.width,
      y: (e.clientY - box.top) / box.height
    };
  }

  function hitItem(p) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      var dx = (p.x - it.x) / (it.w / 2);
      var dy = (p.y - it.y) / (it.h / 2);
      if (dx * dx + dy * dy <= 1.15) return i;
    }
    return -1;
  }

  function drawInk(ctx, w, h) {
    inkStrokes.forEach(function (s) {
      if (!s.pts.length) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, s.size * w);
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = s.erase ? "rgba(0,0,0,1)" : s.color;
      ctx.beginPath();
      s.pts.forEach(function (p, i) {
        var x = p.x * w;
        var y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (s.glitter && !s.erase) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#fff7b0";
        s.pts.forEach(function (p, i) {
          if (i % 3) return;
          star(ctx, p.x * w, p.y * h, Math.max(4, s.size * w * 0.7));
        });
      }
      ctx.restore();
    });
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 4;
      var rad = i % 2 ? r * 0.4 : r;
      var px = x + Math.cos(a) * rad;
      var py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawItems(ctx, w, h) {
    items.forEach(function (it) {
      ctx.save();
      ctx.translate(it.x * w, it.y * h);
      ctx.rotate(it.rot || 0);
      if (it.kind === "text") {
        var size = Math.max(18, it.w * w * 0.45);
        ctx.font = "900 " + size + "px 'Zen Maru Gothic', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(4, size * 0.14);
        ctx.strokeStyle = "#fff";
        ctx.fillStyle = it.color || "#ff4f93";
        ctx.strokeText(it.text, 0, 0);
        ctx.fillText(it.text, 0, 0);
      } else {
        var img = images[it.src];
        var dw = it.w * w;
        var dh = it.h * h;
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      }
      ctx.restore();
    });
  }

  function drawGlitter(ctx, w, h, t) {
    if (!glitter) return;
    for (var i = 0; i < 28; i++) {
      var x = (Math.sin(i * 12.3) * 0.5 + 0.5) * w;
      var y = (Math.cos(i * 7.7 + t) * 0.5 + 0.5) * h;
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.9)" : "rgba(255,225,74,0.9)";
      star(ctx, x, y, 6 + (i % 3) * 3);
    }
  }

  function drawDeco(ctx, w, h) {
    if (!deco) return;
    var img = images.bow;
    if (!img || !img.complete) return;
    var s = Math.min(w, h) * 0.16;
    [[0.08, 0.1], [0.92, 0.1], [0.1, 0.9], [0.9, 0.88]].forEach(function (p) {
      ctx.drawImage(img, p[0] * w - s / 2, p[1] * h - s / 2, s, s);
    });
  }

  function drawFrame(ctx, w, h) {
    var img = images["frame-" + frameId];
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, w, h);
  }

  function paint(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    var hx = w * 0.14;
    var hy = h * 0.145;
    var hw = w * 0.72;
    var hh = h * 0.68;
    ctx.save();
    ctx.beginPath();
    ctx.rect(hx, hy, hw, hh);
    ctx.clip();
    ctx.filter = filterCss();
    var pw = photo.width || 4;
    var ph = photo.height || 3;
    var scale = Math.max(hw / pw, hh / ph);
    var dw = pw * scale;
    var dh = ph * scale;
    ctx.drawImage(photo, hx + (hw - dw) / 2, hy + (hh - dh) / 2, dw, dh);
    ctx.filter = "none";
    ctx.restore();
    drawInk(ctx, w, h);
    drawItems(ctx, w, h);
    drawDeco(ctx, w, h);
    drawGlitter(ctx, w, h, t || 0);
    drawFrame(ctx, w, h);
  }

  function filterCss() {
    for (var i = 0; i < FILTERS.length; i++) if (FILTERS[i][0] === filterId) return FILTERS[i][2];
    return "none";
  }

  function redraw() {
    if (!view || live) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = view.clientWidth || 300;
    var cssH = view.clientHeight || 400;
    view.width = Math.max(2, Math.round(cssW * dpr));
    view.height = Math.max(2, Math.round(cssH * dpr));
    var ctx = view.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffe4f3";
    ctx.fillRect(0, 0, view.width, view.height);
    var snap = document.createElement("canvas");
    snap.width = view.width;
    snap.height = view.height;
    paint(snap.getContext("2d"), snap.width, snap.height, glitterTick);
    ctx.drawImage(snap, 0, 0);
    placeHandles();
  }

  function loop() {
    if (!glitter || live || !stage || stage.closest("[hidden]")) return;
    glitterTick += 0.08;
    redraw();
    requestAnimationFrame(loop);
  }

  function placeHandles() {
    if (!handles) return;
    if (selected < 0 || !items[selected] || live) {
      handles.hidden = true;
      return;
    }
    var it = items[selected];
    var box = contentBox();
    var stageRect = stage.getBoundingClientRect();
    handles.hidden = false;
    handles.style.left = (box.left - stageRect.left + it.x * box.width) + "px";
    handles.style.top = (box.top - stageRect.top + it.y * box.height - 18) + "px";
  }

  function addSticker(name) {
    items.push({
      id: nextId++,
      kind: "sticker",
      src: name,
      x: 0.5,
      y: 0.55,
      w: 0.28,
      h: 0.28,
      rot: 0
    });
    selected = items.length - 1;
    mode = "move";
    hideTray();
    redraw();
  }

  function addText(text, color) {
    text = String(text || "").trim();
    if (!text) return;
    items.push({
      id: nextId++,
      kind: "text",
      text: text.slice(0, 16),
      color: color || pen.color,
      x: 0.5,
      y: 0.42,
      w: 0.7,
      h: 0.18,
      rot: 0
    });
    selected = items.length - 1;
    mode = "move";
    hideTray();
    redraw();
  }

  function hideTray() {
    if (tray) tray.hidden = true;
  }

  function showTray(html) {
    tray.innerHTML = html;
    tray.hidden = false;
  }

  function stickerButtons(names) {
    return names.map(function (name) {
      return "<button type='button' data-sticker='" + name + "'><img alt='' src='" + BASE + name + ".svg'></button>";
    }).join("");
  }

  function openCat(cat) {
    showTray(stickerButtons(CATS[cat] || CATS.more));
  }

  function openText() {
    var html = TEXTS.map(function (row, i) {
      return "<button type='button' data-stamp='" + i + "'>" + row[0] + "</button>";
    }).join("");
    showTray(html);
    var form = el("puriTextForm");
    if (form) form.hidden = false;
  }

  function openFilters() {
    showTray(FILTERS.map(function (row) {
      return "<button type='button' data-filter='" + row[0] + "'>" + row[1] + "</button>";
    }).join(""));
  }

  function openFrames() {
    showTray(FRAMES.map(function (name) {
      return "<button type='button' data-frame='" + name + "'><img alt='' src='" + BASE + "frame-" + name + ".svg'></button>";
    }).join(""));
  }

  function onPointerDown(e) {
    if (live || !view) return;
    if (e.target.closest && e.target.closest("#puriHandles")) return;
    var p = normPoint(e);
    if (p.x < -0.05 || p.y < -0.05 || p.x > 1.05 || p.y > 1.05) return;
    var hit = hitItem(p);
    if (hit >= 0 && mode !== "draw") {
      selected = hit;
      drag = { kind: "move", id: e.pointerId, x: p.x, y: p.y, ox: items[hit].x, oy: items[hit].y };
      try { view.setPointerCapture(e.pointerId); } catch (err) {}
      redraw();
      return;
    }
    if (mode === "draw") {
      selected = -1;
      inkStrokes.push({
        color: pen.color,
        size: pen.size,
        glitter: pen.glitter,
        erase: pen.erase,
        pts: [p]
      });
      drag = { kind: "draw", id: e.pointerId };
      try { view.setPointerCapture(e.pointerId); } catch (err2) {}
      redraw();
    } else {
      selected = -1;
      placeHandles();
    }
  }

  function onPointerMove(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var p = normPoint(e);
    if (drag.kind === "draw") {
      var s = inkStrokes[inkStrokes.length - 1];
      if (s) s.pts.push(p);
      redraw();
      return;
    }
    if (drag.kind === "move" && items[selected]) {
      items[selected].x = drag.ox + (p.x - drag.x);
      items[selected].y = drag.oy + (p.y - drag.y);
      redraw();
    } else if (drag.kind === "scale" && items[selected]) {
      var it = items[selected];
      var dist = Math.hypot(p.x - it.x, p.y - it.y);
      it.w = Math.max(0.08, Math.min(0.9, dist * 2));
      it.h = it.kind === "text" ? it.w * 0.28 : it.w;
      redraw();
    } else if (drag.kind === "rot" && items[selected]) {
      var it2 = items[selected];
      it2.rot = Math.atan2(p.y - it2.y, p.x - it2.x);
      redraw();
    }
  }

  function onPointerUp(e) {
    if (drag && drag.id === e.pointerId) drag = null;
  }

  function buildCols() {
    var left = el("puriLeft");
    var right = el("puriRight");
    if (!left || !right) return;
    var leftItems = [
      ["heart", "ハート", "♥"],
      ["star", "スター", "★"],
      ["ribbon", "リボン", "🎀"],
      ["flower", "おはな", "✿"],
      ["chara", "キャラ", "☺"],
      ["more", "もっと見る", "…"]
    ];
    left.innerHTML = leftItems.map(function (row) {
      return "<button type='button' data-cat='" + row[0] + "'><span>" + row[2] + "</span>" + row[1] + "</button>";
    }).join("");
    var rightItems = [
      ["text", "文字", "T"],
      ["spark", "きらきら", "✦"],
      ["filter", "フィルター", "◐"],
      ["deco", "デコ", "❀"],
      ["frame", "フレーム", "▢"]
    ];
    right.innerHTML = rightItems.map(function (row) {
      return "<button type='button' data-tool='" + row[0] + "'><span>" + row[2] + "</span>" + row[1] + "</button>";
    }).join("");
    var colors = el("puriColors");
    if (colors) {
      colors.innerHTML = COLORS.map(function (c, i) {
        return "<button type='button' class='swatch" + (i === 0 ? " picked" : "") + "' data-color='" + c[1] + "' style='background:" + c[1] + "' aria-label='" + c[0] + "'></button>";
      }).join("");
    }
  }

  var wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    stage = el("puriStage");
    view = el("puriView");
    video = el("video");
    tray = el("puriTray");
    handles = el("puriHandles");
    if (!stage || !view) return;
    buildCols();
    preload();
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    ["touchstart", "touchmove"].forEach(function (type) {
      stage.addEventListener(type, function (e) {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
    });
    el("puriLeft").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cat]");
      if (!btn) return;
      mode = "move";
      openCat(btn.getAttribute("data-cat"));
    });
    el("puriRight").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tool]");
      if (!btn) return;
      var tool = btn.getAttribute("data-tool");
      if (tool === "text") openText();
      else if (tool === "spark") { glitter = !glitter; if (glitter) loop(); redraw(); }
      else if (tool === "filter") openFilters();
      else if (tool === "deco") { deco = !deco; redraw(); }
      else if (tool === "frame") openFrames();
    });
    tray.addEventListener("click", function (e) {
      var sticker = e.target.closest("[data-sticker]");
      var stamp = e.target.closest("[data-stamp]");
      var filter = e.target.closest("[data-filter]");
      var frame = e.target.closest("[data-frame]");
      if (sticker) addSticker(sticker.getAttribute("data-sticker"));
      if (stamp) addText(TEXTS[Number(stamp.getAttribute("data-stamp"))][0], TEXTS[Number(stamp.getAttribute("data-stamp"))][1]);
      if (filter) { filterId = filter.getAttribute("data-filter"); hideTray(); redraw(); }
      if (frame) { frameId = frame.getAttribute("data-frame"); hideTray(); redraw(); }
    });
    el("puriColors").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-color]");
      if (!btn) return;
      pen.color = btn.getAttribute("data-color");
      pen.erase = false;
      mode = "draw";
      el("puriColors").querySelectorAll(".swatch").forEach(function (s) { s.classList.toggle("picked", s === btn); });
    });
    document.querySelector(".puri-pen").addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      if (btn.hasAttribute("data-size")) {
        pen.size = Number(btn.getAttribute("data-size"));
        pen.erase = false;
        mode = "draw";
        document.querySelectorAll(".puri-pen [data-size]").forEach(function (b) { b.classList.toggle("picked", b === btn); });
      } else if (btn.id === "puriGlitterPen") {
        pen.glitter = !pen.glitter;
        pen.erase = false;
        mode = "draw";
        btn.classList.toggle("picked", pen.glitter);
      } else if (btn.id === "puriEraser") {
        pen.erase = !pen.erase;
        mode = "draw";
        btn.classList.toggle("picked", pen.erase);
      } else if (btn.id === "puriUndo") {
        inkStrokes.pop();
        redraw();
      }
    });
    handles.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest("[data-h]");
      if (!btn || selected < 0) return;
      e.stopPropagation();
      var kind = btn.getAttribute("data-h");
      if (kind === "del") {
        items.splice(selected, 1);
        selected = -1;
        redraw();
        return;
      }
      if (kind === "front") {
        var it = items.splice(selected, 1)[0];
        items.push(it);
        selected = items.length - 1;
        redraw();
        return;
      }
      drag = { kind: kind === "rot" ? "rot" : "scale", id: e.pointerId };
      try { handles.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handles.addEventListener("pointermove", onPointerMove);
    handles.addEventListener("pointerup", onPointerUp);
    var form = el("puriTextForm");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = el("puriTextInput");
      addText(input.value, pen.color);
      input.value = "";
      form.hidden = true;
    });
    var textBtn = el("puriText");
    if (textBtn) textBtn.addEventListener("click", function () {
      mode = "move";
      openText();
    });
    var sparkBtn = el("puriSpark");
    if (sparkBtn) sparkBtn.addEventListener("click", function () {
      glitter = !glitter;
      sparkBtn.classList.toggle("picked", glitter);
      if (glitter) loop();
      redraw();
    });
    var filterBtn = el("puriFilter");
    if (filterBtn) filterBtn.addEventListener("click", openFilters);
    var printBtn = el("puriPrint");
    if (printBtn) printBtn.addEventListener("click", printSheet);
    var homeBtn = el("puriHome");
    if (homeBtn) homeBtn.addEventListener("click", function () {
      var back = el("playBack");
      if (back) back.click();
    });
    var gear = el("puriGear");
    if (gear) gear.addEventListener("click", function () {
      deco = !deco;
      redraw();
    });
    window.addEventListener("resize", redraw);
  }

  function compositeCanvas() {
    var size = outSize();
    var out = document.createElement("canvas");
    out.width = size.w;
    out.height = size.h;
    paint(out.getContext("2d"), out.width, out.height, glitterTick);
    return out;
  }

  function save() {
    var out = compositeCanvas();
    var a = document.createElement("a");
    a.href = out.toDataURL("image/jpeg", 0.95);
    a.download = "emma-purikura.jpg";
    a.click();
  }

  function printSheet() {
    var out = compositeCanvas();
    out.toBlob(function (blob) {
      var file = new File([blob], "emma-purikura.jpg", { type: "image/jpeg" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "プリクラ" }).catch(function () { openPrint(out); });
        return;
      }
      openPrint(out);
    }, "image/jpeg", 0.95);
  }

  function openPrint(canvas) {
    var url = canvas.toDataURL("image/jpeg", 0.95);
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.write("<!DOCTYPE html><title>プリクラ</title><img alt='' src='" + url + "' style='width:100%'><script>onload=function(){print()}<\/script>");
    win.document.close();
  }

  function loadFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      stop();
      resizeTo(img.naturalWidth || img.width, img.naturalHeight || img.height);
      photo.getContext("2d").drawImage(img, 0, 0, photo.width, photo.height);
      showStill();
      redraw();
    };
    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  }

  function reset() {
    items = [];
    inkStrokes = [];
    selected = -1;
    filterId = "none";
    frameId = "pink";
    glitter = false;
    deco = false;
    hideTray();
    resizeTo(1280, 960);
    drawCute(photo.getContext("2d"), photo.width, photo.height);
    showStill();
    requestAnimationFrame(redraw);
  }

  document.addEventListener("DOMContentLoaded", wire);
  if (document.readyState !== "loading") wire();

  window.EmmaPuri = {
    open: function () { reset(); startCamera(); },
    startCamera: startCamera,
    shutter: shutter,
    reset: reset,
    cute: cute,
    save: save,
    stop: stop,
    loadFile: loadFile
  };
})();
