/*
  Español 1. Picture cards and a Spanish voice for Ellen.
  Pictures are original. Speech files were made with eSpeak NG (es-419).
  If a file cannot play, the page tries a Spanish speechSynthesis voice.
*/
var EmmaSpanish = (function () {
  var WORDS = [
    { id: "casa", label: "casa", cat: "casa" },
    { id: "mesa", label: "mesa", cat: "casa" },
    { id: "silla", label: "silla", cat: "casa" },
    { id: "cama", label: "cama", cat: "casa" },
    { id: "puerta", label: "puerta", cat: "casa" },
    { id: "ventana", label: "ventana", cat: "casa" },
    { id: "sofa", label: "sofá", cat: "casa" },
    { id: "lampara", label: "lámpara", cat: "casa" },
    { id: "bano", label: "baño", cat: "casa" },
    { id: "cocina", label: "cocina", cat: "casa" },
    { id: "reloj", label: "reloj", cat: "casa" },
    { id: "llave", label: "llave", cat: "casa" },
    { id: "perro", label: "perro", cat: "animales" },
    { id: "gato", label: "gato", cat: "animales" },
    { id: "pajaro", label: "pájaro", cat: "animales" },
    { id: "pez", label: "pez", cat: "animales" },
    { id: "conejo", label: "conejo", cat: "animales" },
    { id: "caballo", label: "caballo", cat: "animales" },
    { id: "vaca", label: "vaca", cat: "animales" },
    { id: "pato", label: "pato", cat: "animales" },
    { id: "mariposa", label: "mariposa", cat: "animales" },
    { id: "oso", label: "oso", cat: "animales" },
    { id: "leon", label: "león", cat: "animales" },
    { id: "rana", label: "rana", cat: "animales" },
    { id: "manzana", label: "manzana", cat: "comida" },
    { id: "platano", label: "plátano", cat: "comida" },
    { id: "pan", label: "pan", cat: "comida" },
    { id: "leche", label: "leche", cat: "comida" },
    { id: "agua", label: "agua", cat: "comida" },
    { id: "galleta", label: "galleta", cat: "comida" },
    { id: "huevo", label: "huevo", cat: "comida" },
    { id: "queso", label: "queso", cat: "comida" },
    { id: "naranja", label: "naranja", cat: "comida" },
    { id: "uvas", label: "uvas", cat: "comida" },
    { id: "helado", label: "helado", cat: "comida" },
    { id: "sopa", label: "sopa", cat: "comida" },
    { id: "rojo", label: "rojo", cat: "colores" },
    { id: "azul", label: "azul", cat: "colores" },
    { id: "amarillo", label: "amarillo", cat: "colores" },
    { id: "verde", label: "verde", cat: "colores" },
    { id: "rosa", label: "rosa", cat: "colores" },
    { id: "morado", label: "morado", cat: "colores" },
    { id: "blanco", label: "blanco", cat: "colores" },
    { id: "negro", label: "negro", cat: "colores" },
    { id: "cabeza", label: "cabeza", cat: "cuerpo" },
    { id: "ojo", label: "ojo", cat: "cuerpo" },
    { id: "nariz", label: "nariz", cat: "cuerpo" },
    { id: "boca", label: "boca", cat: "cuerpo" },
    { id: "oreja", label: "oreja", cat: "cuerpo" },
    { id: "mano", label: "mano", cat: "cuerpo" },
    { id: "pie", label: "pie", cat: "cuerpo" },
    { id: "pelo", label: "pelo", cat: "cuerpo" },
    { id: "diente", label: "diente", cat: "cuerpo" },
    { id: "barriga", label: "barriga", cat: "cuerpo" },
    { id: "pelota", label: "pelota", cat: "juguetes" },
    { id: "muneca", label: "muñeca", cat: "juguetes" },
    { id: "carro", label: "carro", cat: "juguetes" },
    { id: "bloques", label: "bloques", cat: "juguetes" },
    { id: "osito", label: "osito", cat: "juguetes" },
    { id: "tambor", label: "tambor", cat: "juguetes" },
    { id: "cometa", label: "cometa", cat: "juguetes" },
    { id: "burbujas", label: "burbujas", cat: "juguetes" },
    { id: "tren", label: "tren", cat: "juguetes" },
    { id: "rompecabezas", label: "rompecabezas", cat: "juguetes" },
    { id: "camisa", label: "camisa", cat: "ropa" },
    { id: "pantalon", label: "pantalón", cat: "ropa" },
    { id: "zapato", label: "zapato", cat: "ropa" },
    { id: "vestido", label: "vestido", cat: "ropa" },
    { id: "sombrero", label: "sombrero", cat: "ropa" },
    { id: "calcetin", label: "calcetín", cat: "ropa" },
    { id: "chaqueta", label: "chaqueta", cat: "ropa" },
    { id: "pijama", label: "pijama", cat: "ropa" },
    { id: "sol", label: "sol", cat: "naturaleza" },
    { id: "luna", label: "luna", cat: "naturaleza" },
    { id: "estrella", label: "estrella", cat: "naturaleza" },
    { id: "flor", label: "flor", cat: "naturaleza" },
    { id: "arbol", label: "árbol", cat: "naturaleza" },
    { id: "lluvia", label: "lluvia", cat: "naturaleza" },
    { id: "nube", label: "nube", cat: "naturaleza" },
    { id: "arcoiris", label: "arcoíris", cat: "naturaleza" }
  ];
  var CATS = [
    { id: "casa", icon: "casa" },
    { id: "animales", icon: "perro" },
    { id: "comida", icon: "manzana" },
    { id: "colores", icon: "rojo" },
    { id: "cuerpo", icon: "mano" },
    { id: "juguetes", icon: "pelota" },
    { id: "ropa", icon: "vestido" },
    { id: "naturaleza", icon: "sol" }
  ];
  var SAY = {
    "muy-bien": "¡Muy bien!",
    "excelente": "¡Excelente!",
    "otra-vez": "¡Otra vez!",
    "de-nuevo": "¡Intentemos de nuevo!"
  };
  var STEP = [2 * 60 * 1000, 30 * 60 * 1000, 24 * 60 * 60 * 1000, 4 * 24 * 60 * 60 * 1000];
  var api = null;
  var player = new Audio();
  var queue = [];
  var round = null;
  var busy = false;
  var cheerFlip = false;
  var retryFlip = false;
  var advanceTimer = 0;

  function byId(id) {
    for (var i = 0; i < WORDS.length; i++) if (WORDS[i].id === id) return WORDS[i];
    return null;
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function pack() {
    var progress = api.progress();
    if (!progress.spanish || typeof progress.spanish !== "object") {
      progress.spanish = { words: {}, stickers: [] };
    }
    if (!progress.spanish.words || typeof progress.spanish.words !== "object") progress.spanish.words = {};
    if (!Array.isArray(progress.spanish.stickers)) progress.spanish.stickers = [];
    return progress.spanish;
  }

  function ensure(id) {
    var words = pack().words;
    if (!words[id]) words[id] = { box: 0, due: 0, streak: 0, lapses: 0, correct: 0, wrong: 0, t: 0 };
    return words[id];
  }

  function learnedCount() {
    var words = pack().words;
    var n = 0;
    Object.keys(words).forEach(function (id) {
      if ((words[id].correct || 0) > 0) n++;
    });
    return n;
  }

  function starsFor(cat) {
    var list = WORDS.filter(function (w) { return w.cat === cat; });
    var learned = 0;
    list.forEach(function (w) {
      var row = pack().words[w.id];
      if (row && ((row.correct || 0) > 0 || row.box >= 1)) learned++;
    });
    if (!list.length) return 0;
    var ratio = learned / list.length;
    if (ratio >= 0.85) return 3;
    if (ratio >= 0.45) return 2;
    if (learned > 0) return 1;
    return 0;
  }

  function buildQueue() {
    var now = Date.now();
    var words = pack().words;
    var due = WORDS.filter(function (w) { return words[w.id] && (words[w.id].due || 0) <= now; });
    due.sort(function (a, b) { return (words[a.id].box || 0) - (words[b.id].box || 0); });
    var fresh = WORDS.filter(function (w) { return !words[w.id]; });
    shuffle(fresh);
    var q = due.slice(0, 8);
    var added = 0;
    fresh.forEach(function (w) {
      if (q.length >= 8 || added >= 4) return;
      q.push(w);
      added++;
    });
    if (!q.length) {
      q = WORDS.slice().sort(function (a, b) {
        return ((words[a.id] && words[a.id].box) || 0) - ((words[b.id] && words[b.id].box) || 0);
      }).slice(0, 4);
    }
    return q;
  }

  function pickChoices(word) {
    var same = WORDS.filter(function (w) { return w.cat === word.cat && w.id !== word.id; });
    var other = WORDS.filter(function (w) { return w.cat !== word.cat; });
    shuffle(same);
    shuffle(other);
    var pool = learnedCount() >= 8 ? same.concat(other) : other.concat(same);
    return shuffle(pool.slice(0, 3).concat([word]));
  }

  function spanishVoice() {
    if (!window.speechSynthesis) return null;
    var voices = speechSynthesis.getVoices() || [];
    var mx = null;
    var es = null;
    voices.forEach(function (v) {
      var lang = (v.lang || "").toLowerCase();
      if (lang.indexOf("es-mx") === 0 || lang.indexOf("es_mx") === 0) mx = v;
      else if (lang.indexOf("es") === 0) es = es || v;
    });
    return mx || es;
  }

  function fallback(text) {
    var voice = spanishVoice();
    if (!voice || !text) return;
    var utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = voice.lang || "es-MX";
    utter.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function playFile(name, text, done) {
    player.onended = function () {
      player.onended = null;
      if (done) done();
    };
    player.src = "assets/spanish/audio/" + name + ".mp3";
    var pending = player.play();
    if (pending && pending.catch) {
      pending.catch(function () {
        fallback(text || SAY[name] || "");
        if (done) done();
      });
    }
  }

  function speakWord() {
    if (!round) return;
    playFile(round.word.id, round.word.label);
  }

  function hidePop() {
    var pop = document.getElementById("espanolPop");
    if (pop) pop.hidden = true;
  }

  function showPop(text, stickerId, kind) {
    var pop = document.getElementById("espanolPop");
    var label = document.getElementById("espanolPopText");
    var sticker = document.getElementById("espanolSticker");
    if (!pop || !label) return;
    pop.className = "espanol-pop " + (kind || "");
    pop.hidden = false;
    label.textContent = text;
    if (sticker) {
      if (stickerId) {
        sticker.hidden = false;
        sticker.src = "assets/spanish/pic/" + stickerId + ".svg";
      } else sticker.hidden = true;
    }
  }

  function paintFace() {
    var src = api.avatar();
    document.querySelectorAll(".ellen-avatar-img").forEach(function (img) { img.src = src; });
  }

  function paintCats(host) {
    if (!host) return;
    host.innerHTML = CATS.map(function (cat) {
      var n = starsFor(cat.id);
      var stars = "";
      for (var i = 0; i < 3; i++) stars += "<i" + (i < n ? " class='on'" : "") + "></i>";
      return "<div class='cat-pip'><img src='assets/spanish/pic/" + cat.icon + ".svg' alt=''><span>" + stars + "</span></div>";
    }).join("");
  }

  function paintStickers(host) {
    if (!host) return;
    var rows = pack().stickers.slice().sort(function (a, b) { return (a.t || 0) - (b.t || 0); }).slice(-12);
    host.innerHTML = rows.map(function (row) {
      return "<img src='assets/spanish/pic/" + row.id + ".svg' alt=''>";
    }).join("");
  }

  function renderRound() {
    var wordEl = document.getElementById("espanolWord");
    var grid = document.getElementById("espanolGrid");
    if (!wordEl || !grid || !round) return;
    wordEl.textContent = round.word.label;
    hidePop();
    grid.innerHTML = "";
    round.choices.forEach(function (word) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pic-card cat-" + word.cat;
      btn.innerHTML = "<img src='assets/spanish/pic/" + word.id + ".svg' alt=''><span>" + word.label + "</span>";
      btn.addEventListener("click", function () { choose(word, btn); });
      grid.appendChild(btn);
    });
    paintCats(document.getElementById("espanolCats"));
    paintFace();
  }

  function next() {
    hidePop();
    if (!queue.length) {
      round = null;
      openMenu();
      return;
    }
    var word = queue.shift();
    round = { word: word, choices: pickChoices(word), missed: false };
    renderRound();
    speakWord();
  }

  function saveAll() {
    api.save();
  }

  function giveSticker(id) {
    var rows = pack().stickers;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return;
    rows.push({ id: id, t: Date.now() });
  }

  function choose(word, btn) {
    if (busy || !round) return;
    if (word.id !== round.word.id) {
      btn.classList.remove("is-soft");
      void btn.offsetWidth;
      btn.classList.add("is-soft");
      round.missed = true;
      var row = ensure(round.word.id);
      row.wrong = (row.wrong || 0) + 1;
      row.lapses = (row.lapses || 0) + 1;
      row.streak = 0;
      row.box = Math.max(0, (row.box || 0) - 1);
      row.due = Date.now();
      row.t = Date.now();
      saveAll();
      retryFlip = !retryFlip;
      var phrase = retryFlip ? "¡Intentemos de nuevo!" : "¡Otra vez!";
      var file = retryFlip ? "de-nuevo" : "otra-vez";
      showPop(phrase, "", "soft");
      setTimeout(function () {
        var pop = document.getElementById("espanolPop");
        if (pop && pop.classList.contains("soft")) pop.hidden = true;
      }, 1100);
      playFile(file, phrase, function () { speakWord(); });
      return;
    }
    busy = true;
    btn.classList.add("is-right");
    var got = ensure(word.id);
    var first = !(got.correct > 0);
    got.correct = (got.correct || 0) + 1;
    got.t = Date.now();
    if (!round.missed) {
      got.streak = (got.streak || 0) + 1;
      got.box = Math.min(3, (got.box || 0) + 1);
    } else {
      got.streak = 0;
      if (!got.box) got.box = 0;
    }
    got.due = Date.now() + STEP[Math.max(0, Math.min(3, got.box || 0))];
    if (first) giveSticker(word.id);
    saveAll();
    cheerFlip = !cheerFlip;
    var cheer = cheerFlip ? "¡Excelente!" : "¡Muy bien!";
    var cheerFile = cheerFlip ? "excelente" : "muy-bien";
    showPop(cheer, word.id, "yay");
    if (api.chime) api.chime("hanamaru");
    playFile(cheerFile, cheer);
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(function () {
      busy = false;
      round = null;
      next();
    }, 1500);
  }

  function openMenu() {
    if (!api) return;
    api.show("ellen");
    paintFace();
    paintCats(document.getElementById("ellenCatStars"));
    paintStickers(document.getElementById("ellenStickerTray"));
  }

  function openGame() {
    if (!api) return;
    clearTimeout(advanceTimer);
    busy = false;
    api.show("espanol");
    paintFace();
    if (!round && !queue.length) queue = buildQueue();
    if (!round) next();
    else renderRound();
    warm();
  }

  function warm() {
    if (!window.caches) return;
    var urls = ["spanish.js", "assets/avatars/ellen.svg"];
    WORDS.forEach(function (w) {
      urls.push("assets/spanish/pic/" + w.id + ".svg");
      urls.push("assets/spanish/audio/" + w.id + ".mp3");
    });
    ["muy-bien", "excelente", "otra-vez", "de-nuevo"].forEach(function (name) {
      urls.push("assets/spanish/audio/" + name + ".mp3");
    });
    caches.open("emma-shell-20261120d").then(function (cache) {
      cache.addAll(urls).catch(function () {});
    }).catch(function () {});
  }

  function boot(nextApi) {
    api = nextApi;
    var play = document.getElementById("ellenPlay");
    var leave = document.getElementById("ellenLeave");
    var back = document.getElementById("espanolBack");
    var replay = document.getElementById("espanolReplay");
    var menuFace = document.getElementById("ellenMenuFace");
    var gameFace = document.getElementById("espanolFace");
    if (play) play.addEventListener("click", function () {
      queue = buildQueue();
      round = null;
      openGame();
    });
    if (leave) leave.addEventListener("click", function () {
      stop();
      api.leave();
    });
    if (back) back.addEventListener("click", function () {
      player.pause();
      openMenu();
    });
    if (replay) replay.addEventListener("click", speakWord);
    if (menuFace) menuFace.addEventListener("click", function () { api.pickAvatar(); });
    if (gameFace) gameFace.addEventListener("click", function () { api.pickAvatar(); });
    if (window.speechSynthesis) speechSynthesis.getVoices();
  }

  return {
    boot: boot,
    unlock: function () {
      player.volume = 0;
      player.src = "assets/spanish/audio/mesa.mp3";
      var pending = player.play();
      if (pending && pending.then) {
        pending.then(function () {
          player.pause();
          player.currentTime = 0;
          player.volume = 1;
        }).catch(function () { player.volume = 1; });
      } else player.volume = 1;
    },
    openGame: openGame,
    openMenu: openMenu,
    refresh: function () {
      paintFace();
      paintCats(document.getElementById("ellenCatStars"));
      paintCats(document.getElementById("espanolCats"));
      paintStickers(document.getElementById("ellenStickerTray"));
    },
    stop: function () {
      clearTimeout(advanceTimer);
      try { player.pause(); } catch (e) {}
      if (window.speechSynthesis) speechSynthesis.cancel();
    }
  };
})();
