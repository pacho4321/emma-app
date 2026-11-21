/*
  Español 1 for Ellen.
  A set of 15 words (the last set is the words left over) is practiced
  for 10 rounds. Each round is every word in the set once. Photo time
  sits between rounds. The Spanish voice folder is swappable.
*/
var EmmaSpanish = (function () {
  var WORDS = [
    { id: "perro", say: "perro", label: "perro", cat: "animales", pic: "perro" },
    { id: "gato", say: "gato", label: "gato", cat: "animales", pic: "gato" },
    { id: "pajaro", say: "pájaro", label: "pájaro", cat: "animales", pic: "pajaro" },
    { id: "pez", say: "pez", label: "pez", cat: "animales", pic: "pez" },
    { id: "oso", say: "oso", label: "oso", cat: "animales", pic: "oso" },
    { id: "elefante", say: "elefante", label: "elefante", cat: "animales", pic: "elefante" },
    { id: "leon", say: "león", label: "león", cat: "animales", pic: "leon" },
    { id: "mono", say: "mono", label: "mono", cat: "animales", pic: "mono" },
    { id: "conejo", say: "conejo", label: "conejo", cat: "animales", pic: "conejo" },
    { id: "tortuga", say: "tortuga", label: "tortuga", cat: "animales", pic: "tortuga" },
    { id: "vaca", say: "vaca", label: "vaca", cat: "animales", pic: "vaca" },
    { id: "cerdo", say: "cerdo", label: "cerdo", cat: "animales", pic: "cerdo" },
    { id: "caballo", say: "caballo", label: "caballo", cat: "animales", pic: "caballo" },
    { id: "gallina", say: "gallina", label: "gallina", cat: "animales", pic: "gallina" },
    { id: "pato", say: "pato", label: "pato", cat: "animales", pic: "pato" },
    { id: "manzana", say: "manzana", label: "manzana", cat: "comida", pic: "manzana" },
    { id: "platano", say: "plátano", label: "plátano", cat: "comida", pic: "platano" },
    { id: "pan", say: "pan", label: "pan", cat: "comida", pic: "pan" },
    { id: "queso", say: "queso", label: "queso", cat: "comida", pic: "queso" },
    { id: "leche", say: "leche", label: "leche", cat: "comida", pic: "leche" },
    { id: "agua-comida", say: "agua", label: "agua", cat: "comida", pic: "agua", twin: "agua-naturaleza" },
    { id: "huevo", say: "huevo", label: "huevo", cat: "comida", pic: "huevo" },
    { id: "arroz", say: "arroz", label: "arroz", cat: "comida", pic: "arroz" },
    { id: "naranja-fruta", say: "naranja", label: "naranja", cat: "comida", pic: "naranja-fruta", twin: "naranja-color" },
    { id: "fresa", say: "fresa", label: "fresa", cat: "comida", pic: "fresa" },
    { id: "zanahoria", say: "zanahoria", label: "zanahoria", cat: "comida", pic: "zanahoria" },
    { id: "tomate", say: "tomate", label: "tomate", cat: "comida", pic: "tomate" },
    { id: "helado", say: "helado", label: "helado", cat: "comida", pic: "helado" },
    { id: "galleta", say: "galleta", label: "galleta", cat: "comida", pic: "galleta" },
    { id: "jugo", say: "jugo", label: "jugo", cat: "comida", pic: "jugo" },
    { id: "rojo", say: "rojo", label: "rojo", cat: "colores", pic: "rojo", solid: true },
    { id: "azul", say: "azul", label: "azul", cat: "colores", pic: "azul", solid: true },
    { id: "amarillo", say: "amarillo", label: "amarillo", cat: "colores", pic: "amarillo", solid: true },
    { id: "verde", say: "verde", label: "verde", cat: "colores", pic: "verde", solid: true },
    { id: "blanco", say: "blanco", label: "blanco", cat: "colores", pic: "blanco", solid: true },
    { id: "negro", say: "negro", label: "negro", cat: "colores", pic: "negro", solid: true },
    { id: "rosa", say: "rosa", label: "rosa", cat: "colores", pic: "rosa", solid: true },
    { id: "morado", say: "morado", label: "morado", cat: "colores", pic: "morado", solid: true },
    { id: "naranja-color", say: "naranja", label: "naranja", cat: "colores", pic: "naranja-color", solid: true, twin: "naranja-fruta" },
    { id: "cafe", say: "café", label: "café", cat: "colores", pic: "cafe", solid: true },
    { id: "cabeza", say: "cabeza", label: "cabeza", cat: "cuerpo", pic: "cabeza" },
    { id: "ojos", say: "ojos", label: "ojos", cat: "cuerpo", pic: "ojos" },
    { id: "nariz", say: "nariz", label: "nariz", cat: "cuerpo", pic: "nariz" },
    { id: "boca", say: "boca", label: "boca", cat: "cuerpo", pic: "boca" },
    { id: "orejas", say: "orejas", label: "orejas", cat: "cuerpo", pic: "orejas" },
    { id: "manos", say: "manos", label: "manos", cat: "cuerpo", pic: "manos" },
    { id: "pies", say: "pies", label: "pies", cat: "cuerpo", pic: "pies" },
    { id: "pelo", say: "pelo", label: "pelo", cat: "cuerpo", pic: "pelo" },
    { id: "casa", say: "casa", label: "casa", cat: "objetos", pic: "casa" },
    { id: "coche", say: "coche", label: "coche", cat: "objetos", pic: "coche" },
    { id: "pelota", say: "pelota", label: "pelota", cat: "objetos", pic: "pelota" },
    { id: "libro", say: "libro", label: "libro", cat: "objetos", pic: "libro" },
    { id: "sol", say: "sol", label: "sol", cat: "objetos", pic: "sol" },
    { id: "luna", say: "luna", label: "luna", cat: "objetos", pic: "luna" },
    { id: "estrella", say: "estrella", label: "estrella", cat: "objetos", pic: "estrella" },
    { id: "arbol", say: "árbol", label: "árbol", cat: "objetos", pic: "arbol" },
    { id: "flor", say: "flor", label: "flor", cat: "objetos", pic: "flor" },
    { id: "silla", say: "silla", label: "silla", cat: "objetos", pic: "silla" },
    { id: "mesa", say: "mesa", label: "mesa", cat: "objetos", pic: "mesa" },
    { id: "cama", say: "cama", label: "cama", cat: "objetos", pic: "cama" },
    { id: "puerta", say: "puerta", label: "puerta", cat: "objetos", pic: "puerta" },
    { id: "ventana", say: "ventana", label: "ventana", cat: "objetos", pic: "ventana" },
    { id: "telefono", say: "teléfono", label: "teléfono", cat: "objetos", pic: "telefono" },
    { id: "reloj", say: "reloj", label: "reloj", cat: "objetos", pic: "reloj" },
    { id: "lapiz", say: "lápiz", label: "lápiz", cat: "objetos", pic: "lapiz" },
    { id: "tijeras", say: "tijeras", label: "tijeras", cat: "objetos", pic: "tijeras" },
    { id: "sombrero", say: "sombrero", label: "sombrero", cat: "objetos", pic: "sombrero" },
    { id: "zapatos", say: "zapatos", label: "zapatos", cat: "objetos", pic: "zapatos" },
    { id: "mama", say: "mamá", label: "mamá", cat: "familia", pic: "mama" },
    { id: "papa", say: "papá", label: "papá", cat: "familia", pic: "papa" },
    { id: "bebe", say: "bebé", label: "bebé", cat: "familia", pic: "bebe" },
    { id: "nina", say: "niña", label: "niña", cat: "familia", pic: "nina" },
    { id: "nino", say: "niño", label: "niño", cat: "familia", pic: "nino" },
    { id: "abuela", say: "abuela", label: "abuela", cat: "familia", pic: "abuela" },
    { id: "abuelo", say: "abuelo", label: "abuelo", cat: "familia", pic: "abuelo" },
    { id: "agua-naturaleza", say: "agua", label: "agua", cat: "naturaleza", pic: "agua", twin: "agua-comida" },
    { id: "fuego", say: "fuego", label: "fuego", cat: "naturaleza", pic: "fuego" },
    { id: "nube", say: "nube", label: "nube", cat: "naturaleza", pic: "nube" },
    { id: "lluvia", say: "lluvia", label: "lluvia", cat: "naturaleza", pic: "lluvia" },
    { id: "montana", say: "montaña", label: "montaña", cat: "naturaleza", pic: "montana" },
    { id: "mar", say: "mar", label: "mar", cat: "naturaleza", pic: "mar" }
  ];
  var VOICES = { espeak: true, dalia: true, elvira: true };
  var DEFAULT_VOICE = "elvira";
  var SET_SIZE = 15;
  var ROUNDS = 10;
  var api = null;
  var player = new Audio();
  var photos = {};
  var photoLoad = null;
  var queue = [];
  var round = null;
  var busy = false;
  var advanceTimer = 0;

  function fast() {
    return /(?:\?|&)test=1(?:&|$)/.test(location.search);
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

  function setCount() {
    return Math.ceil(WORDS.length / SET_SIZE);
  }

  function pack() {
    var progress = api.progress();
    if (!progress.spanish || typeof progress.spanish !== "object") progress.spanish = {};
    var box = progress.spanish;
    if (!box.words || typeof box.words !== "object") box.words = {};
    if (!Array.isArray(box.stickers)) box.stickers = [];
    box.setIndex = Math.max(0, Number(box.setIndex) || 0);
    box.round = Math.max(0, Number(box.round) || 0);
    if (box.setIndex >= setCount()) box.setIndex = 0;
    if (!VOICES[box.voice]) box.voice = DEFAULT_VOICE;
    return box;
  }

  function voiceId() {
    var chosen = "";
    try { chosen = localStorage.getItem("emma-spanish-voice") || ""; } catch (e) {}
    if (VOICES[chosen]) return chosen;
    return pack().voice || DEFAULT_VOICE;
  }

  function currentSet() {
    var start = (pack().setIndex || 0) * SET_SIZE;
    return WORDS.slice(start, start + SET_SIZE);
  }

  function ensure(id) {
    var words = pack().words;
    if (!words[id]) words[id] = { correct: 0, wrong: 0, t: 0 };
    return words[id];
  }

  function choicesFor(word) {
    var pool = WORDS.filter(function (item) {
      return item.cat === word.cat && item.id !== word.id && item.id !== word.twin;
    });
    shuffle(pool);
    var picks = pool.slice(0, 2);
    if (picks.length < 2) {
      WORDS.forEach(function (item) {
        if (picks.length >= 2) return;
        if (item.id === word.id || item.id === word.twin) return;
        if (picks.indexOf(item) >= 0) return;
        picks.push(item);
      });
    }
    return shuffle(picks.concat([word]));
  }

  function plainSlug(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function photoSlug(word) {
    if (!word) return "";
    if (word.id === "naranja-fruta" || word.id === "naranja-color") return word.id;
    return plainSlug(word.label);
  }

  function audioKey(word) {
    return plainSlug(word && (word.say || word.label));
  }

  function rememberPhoto(slug, file) {
    slug = plainSlug(slug);
    if (!slug || slug === "naranja") return;
    var url = file;
    if (!url || url === true) url = "espanol/photos/" + slug + ".jpg";
    else if (typeof url !== "string") return;
    else if (!/^https?:|^\/|espanol\//.test(url)) url = "espanol/photos/" + url.replace(/^.*\//, "");
    photos[slug] = url;
  }

  function absorbPhotoMap(data) {
    if (!data) return;
    if (Array.isArray(data)) {
      data.forEach(function (row) {
        if (!row || typeof row !== "object") return;
        rememberPhoto(row.slug || row.id || row.word, row.file || row.src || row.jpg || row.path);
      });
      return;
    }
    var table = data.photos || data.words || data.files || data;
    if (Array.isArray(table)) {
      absorbPhotoMap(table);
      return;
    }
    if (!table || typeof table !== "object") return;
    Object.keys(table).forEach(function (key) {
      var value = table[key];
      if (value && typeof value === "object") rememberPhoto(value.slug || key, value.file || value.src || value.path || value.jpg);
      else rememberPhoto(key, value);
    });
  }

  function loadPhotos() {
    if (photoLoad) return photoLoad;
    photoLoad = fetch("espanol/photos/mapping.json").then(function (res) {
      if (!res.ok) return null;
      return res.json();
    }).then(function (data) {
      absorbPhotoMap(data);
    }).catch(function () {});
    return photoLoad;
  }

  function wordBySticker(id) {
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].id === id || WORDS[i].pic === id) return WORDS[i];
    }
    return null;
  }

  function pictureSrc(word) {
    if (!word) return "";
    if (word.solid) return "assets/spanish/pic/" + word.pic + ".svg";
    var slug = photoSlug(word);
    if (photos[slug]) return photos[slug];
    return "assets/spanish/pic/" + word.pic + ".svg";
  }

  function spanishFallback(text) {
    if (!window.speechSynthesis || !text) return;
    var voices = speechSynthesis.getVoices() || [];
    var voice = null;
    voices.forEach(function (item) {
      var lang = (item.lang || "").toLowerCase();
      if (!voice && lang.indexOf("es") === 0) voice = item;
    });
    if (!voice) return;
    var utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = voice.lang || "es-MX";
    utter.rate = 0.92;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  function playUrl(src, fallbackText, done) {
    player.onended = function () {
      player.onended = null;
      if (done) done();
    };
    player.src = src;
    var pending = player.play();
    if (pending && pending.catch) {
      pending.catch(function () {
        spanishFallback(fallbackText || "");
        if (done) done();
      });
    }
  }

  function playSpanish(id, text, done) {
    playUrl("assets/spanish/voices/" + voiceId() + "/" + id + ".mp3", text || id, done);
  }

  function playJa(name, done) {
    playUrl("assets/spanish/voices/ja/" + name + ".mp3", "", done);
  }

  function speakWord() {
    if (!round) return;
    playSpanish(audioKey(round.word), round.word.label);
  }

  function paintFace() {
    var src = api.avatar();
    document.querySelectorAll(".ellen-avatar-img").forEach(function (img) { img.src = src; });
  }

  function paintStars(host, n) {
    if (!host) return;
    var html = "";
    for (var i = 0; i < ROUNDS; i++) html += "<i" + (i < n ? " class='on'" : "") + "></i>";
    host.innerHTML = html;
  }

  function showQuestion() {
    var board = document.getElementById("roundBoard");
    var grid = document.getElementById("espanolGrid");
    var prompt = document.querySelector(".espanol-prompt");
    if (board) board.hidden = true;
    if (grid) grid.hidden = false;
    if (prompt) prompt.hidden = false;
    paintStars(document.getElementById("questionStars"), pack().round || 0);
  }

  function setMessage(text, kind) {
    var msg = document.getElementById("espanolMsg");
    if (!msg) return;
    msg.hidden = !text;
    msg.className = "espanol-msg" + (kind ? " " + kind : "");
    msg.textContent = text || "";
  }

  function renderRound() {
    var wordEl = document.getElementById("espanolWord");
    var grid = document.getElementById("espanolGrid");
    if (!wordEl || !grid || !round) return;
    showQuestion();
    wordEl.textContent = round.word.label;
    setMessage("");
    grid.innerHTML = "";
    round.choices.forEach(function (word) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pic-card" + (word.solid ? " is-solid" : "");
      btn.setAttribute("data-id", word.id);
      btn.setAttribute("data-label", word.label);
      var img = document.createElement("img");
      img.alt = "";
      img.src = pictureSrc(word);
      if (!word.solid) {
        img.addEventListener("error", function once() {
          img.removeEventListener("error", once);
          img.src = "assets/spanish/pic/" + word.pic + ".svg";
        });
      }
      btn.appendChild(img);
      btn.addEventListener("click", function () { choose(word, btn); });
      grid.appendChild(btn);
    });
    paintFace();
  }

  function saveAll() {
    var box = pack();
    var chosen = "";
    try { chosen = localStorage.getItem("emma-spanish-voice") || ""; } catch (e) {}
    if (VOICES[chosen]) box.voice = chosen;
    box.updatedAt = Date.now();
    api.save();
  }

  function giveSticker(id) {
    var rows = pack().stickers;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return;
    rows.push({ id: id, t: Date.now() });
  }

  function next() {
    if (!queue.length) {
      round = null;
      finishSet();
      return;
    }
    var word = queue.shift();
    round = { word: word, choices: choicesFor(word), missed: false };
    renderRound();
    speakWord();
  }

  function finishSet() {
    var box = pack();
    box.round = Math.min(ROUNDS, (box.round || 0) + 1);
    saveAll();
    var board = document.getElementById("roundBoard");
    var grid = document.getElementById("espanolGrid");
    var prompt = document.querySelector(".espanol-prompt");
    if (grid) grid.hidden = true;
    if (prompt) prompt.hidden = true;
    setMessage("");
    if (board) board.hidden = false;
    paintStars(document.getElementById("roundStars"), box.round);
    paintStars(document.getElementById("questionStars"), box.round);
    api.show("espanol");
  }

  function afterPhoto() {
    var box = pack();
    if ((box.round || 0) >= ROUNDS) {
      box.round = 0;
      box.setIndex = (box.setIndex || 0) + 1;
      if (box.setIndex >= setCount()) box.setIndex = 0;
      saveAll();
    }
    queue = [];
    round = null;
    api.show("espanol");
    startQuestions();
  }

  function goPhoto() {
    try { player.pause(); } catch (e) {}
    if (api.photo) api.photo(afterPhoto);
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
      row.t = Date.now();
      saveAll();
      setMessage("ちがうよ〜、もういっかい やってみよう！", "soft");
      playJa("chigau");
      return;
    }
    busy = true;
    var buttons = document.querySelectorAll(".pic-card");
    buttons.forEach(function (el) { el.classList.toggle("is-right", el.getAttribute("data-id") === word.id); });
    var got = ensure(word.id);
    var first = !(got.correct > 0);
    got.correct = (got.correct || 0) + 1;
    got.t = Date.now();
    if (first) giveSticker(word.pic);
    saveAll();
    setMessage("すごい！！ ¡Muy bien!", "yay");
    if (api.chime) api.chime("hanamaru");
    playJa("sugoi", function () {
      playSpanish("muy-bien", "¡Muy bien!", function () {
        playSpanish(audioKey(round.word), round.word.label);
      });
    });
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(function () {
      busy = false;
      round = null;
      next();
    }, fast() ? 280 : 2100);
  }

  function startQuestions() {
    queue = shuffle(currentSet().slice());
    round = null;
    busy = false;
    showQuestion();
    next();
  }

  function paintStickers(host) {
    if (!host) return;
    var rows = pack().stickers.slice().sort(function (a, b) { return (a.t || 0) - (b.t || 0); }).slice(-12);
    host.innerHTML = rows.map(function (row) {
      var word = wordBySticker(row.id);
      var src = word ? pictureSrc(word) : ("assets/spanish/pic/" + row.id + ".svg");
      return "<img src='" + src + "' alt=''>";
    }).join("");
  }

  function openMenu() {
    if (!api) return;
    api.show("ellen");
    paintFace();
    paintStars(document.getElementById("ellenRoundStars"), pack().round || 0);
    paintStickers(document.getElementById("ellenStickerTray"));
  }

  function openGame() {
    if (!api) return;
    clearTimeout(advanceTimer);
    busy = false;
    loadPhotos().then(function () {
      api.show("espanol");
      paintFace();
      if (!round && !queue.length) startQuestions();
      else if (round) renderRound();
      else next();
      warm();
    });
  }

  function warm() {
    if (!window.caches) return;
    var urls = ["spanish.js", "assets/avatars/ellen.svg", "assets/spanish/voices/ja/chigau.mp3", "assets/spanish/voices/ja/sugoi.mp3"];
    var voice = voiceId();
    WORDS.forEach(function (word) {
      urls.push(pictureSrc(word));
      urls.push("assets/spanish/pic/" + word.pic + ".svg");
      urls.push("assets/spanish/voices/" + voice + "/" + audioKey(word) + ".mp3");
    });
    urls.push("assets/spanish/voices/" + voice + "/muy-bien.mp3");
    caches.open("emma-shell-20261121a").then(function (cache) {
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
    var photo = document.getElementById("roundPhoto");
    if (play) play.addEventListener("click", function () {
      queue = [];
      round = null;
      openGame();
    });
    if (leave) leave.addEventListener("click", function () {
      stop();
      api.leave();
    });
    if (back) back.addEventListener("click", function () {
      try { player.pause(); } catch (e) {}
      openMenu();
    });
    if (replay) replay.addEventListener("click", speakWord);
    if (menuFace) menuFace.addEventListener("click", function () { api.pickAvatar(); });
    if (gameFace) gameFace.addEventListener("click", function () { api.pickAvatar(); });
    if (photo) photo.addEventListener("click", goPhoto);
    if (window.speechSynthesis) speechSynthesis.getVoices();
    loadPhotos();
  }

  return {
    boot: boot,
    unlock: function () {
      player.volume = 0;
      player.src = "assets/spanish/voices/" + DEFAULT_VOICE + "/mesa.mp3";
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
      paintStars(document.getElementById("questionStars"), pack().round || 0);
      paintStars(document.getElementById("ellenRoundStars"), pack().round || 0);
      paintStickers(document.getElementById("ellenStickerTray"));
    },
    stop: function () {
      clearTimeout(advanceTimer);
      try { player.pause(); } catch (e) {}
      if (window.speechSynthesis) speechSynthesis.cancel();
    }
  };
})();
