/*
  Original Web Audio only. No recorded music files.
  Opening chime, kanji study pad, sticker pop, and the 九九 jingle
  are simple melodies written for this app.
  The 九九 words are the traditional school chant, spoken by the
  device voice (speechSynthesis), not a copyrighted recording.
*/
var EmmaSound = (function () {
  var muted = false;
  var bgmPaused = false;
  var wantBgm = false;
  var ducked = false;
  var ctx = null;
  var master = null;
  var bgmBus = null;
  var sfxBus = null;
  var bgmTimer = null;
  var songToken = 0;
  var songActive = false;
  var lastOpening = 0;
  var BGM_NOTES = [261.63, 329.63, 392.0, 493.88, 440.0, 392.0, 329.63, 293.66];

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    bgmBus = ctx.createGain();
    bgmBus.gain.value = 0;
    bgmBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    return ctx;
  }

  function unlock() {
    var c = ensure();
    if (!c) return Promise.resolve();
    if (c.state === "suspended") return c.resume();
    return Promise.resolve();
  }

  function tone(freq, t, dur, type, gain, dest) {
    if (!ctx || !dest) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

function refreshBgmLevel() {
  var level = 0;
  if (wantBgm && !muted && !bgmPaused) level = ducked ? 0.3 : 1;
  if (bgmBus && ctx) bgmBus.gain.setValueAtTime(level, ctx.currentTime);
  document.body.dataset.bgm = level > 0 ? "on" : "off";
}

  function scheduleBgm() {
    if (!wantBgm || muted || bgmPaused || !ctx) return;
    var t = ctx.currentTime + 0.05;
    BGM_NOTES.forEach(function (f, i) {
      tone(f, t + i * 0.95, 0.85, "sine", 0.018, bgmBus);
    });
    bgmTimer = setTimeout(scheduleBgm, BGM_NOTES.length * 950 - 180);
  }

  function haltScheduler() {
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }

  function startBgm() {
    wantBgm = true;
    ensure();
    refreshBgmLevel();
    if (muted || bgmPaused) return;
    if (bgmTimer) return;
    unlock().then(function () {
      if (!wantBgm || muted || bgmPaused) return;
      if (bgmTimer) return;
      scheduleBgm();
      refreshBgmLevel();
    });
  }

  function stopBgm() {
    wantBgm = false;
    haltScheduler();
    refreshBgmLevel();
  }

  function setMuted(value) {
    muted = !!value;
    ensure();
    if (master && ctx) master.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
    if (muted) haltScheduler();
    refreshBgmLevel();
    document.body.dataset.muted = muted ? "1" : "0";
  }

  function setBgmPaused(value) {
    bgmPaused = !!value;
    if (bgmPaused) haltScheduler();
    else if (wantBgm && !muted && !bgmTimer) scheduleBgm();
    refreshBgmLevel();
  }

  function playOpening() {
    if (muted) return;
    var now = Date.now();
    if (now - lastOpening < 1200) return;
    lastOpening = now;
    unlock().then(function () {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(f, t + i * 0.14, 0.32, "triangle", 0.05, sfxBus);
      });
    });
  }

  function chime(kind) {
    if (muted) return;
    unlock().then(function () {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.01;
      if (kind === "hanamaru") {
        tone(523.25, t, 0.16, "triangle", 0.045, sfxBus);
        tone(659.25, t + 0.1, 0.16, "triangle", 0.045, sfxBus);
        tone(783.99, t + 0.2, 0.26, "triangle", 0.05, sfxBus);
      } else {
        tone(659.25, t, 0.14, "triangle", 0.04, sfxBus);
        tone(783.99, t + 0.1, 0.18, "triangle", 0.04, sfxBus);
      }
    });
  }

  function celebrate() {
    if (muted) return;
    unlock().then(function () {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(f, t + i * 0.13, 0.28, "triangle", 0.045, sfxBus);
      });
    });
  }

  function pop() {
    if (muted) return;
    unlock().then(function () {
      if (!ctx || muted) return;
      tone(880, ctx.currentTime, 0.09, "sine", 0.03, sfxBus);
    });
  }

  function speak(text) {
    return new Promise(function (resolve) {
      ducked = true;
      refreshBgmLevel();
      var finished = false;
      function done() {
        if (finished) return;
        finished = true;
        ducked = false;
        refreshBgmLevel();
        resolve();
      }
      if (!window.speechSynthesis || !text) {
        setTimeout(done, 500);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        u.rate = 0.9;
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
        setTimeout(done, Math.min(9000, 900 + String(text).length * 320));
      } catch (e) {
        done();
      }
    });
  }

  function playSong(lines, onDone) {
    stopSong();
    var token = ++songToken;
    songActive = true;
    var motif = [523.25, 659.25, 587.33, 783.99];
    var i = 0;
    function step() {
      if (token !== songToken) return;
      if (i >= lines.length) {
        songActive = false;
        if (onDone) onDone();
        return;
      }
      var line = lines[i++];
      unlock().then(function () {
        if (token !== songToken) return;
        if (ctx && !muted) {
          var t = ctx.currentTime;
          tone(motif[(i - 1) % motif.length], t, 0.2, "triangle", 0.04, sfxBus);
          tone(motif[i % motif.length], t + 0.14, 0.2, "triangle", 0.032, sfxBus);
        }
        speak(line.speak).then(function () {
          if (token !== songToken) return;
          setTimeout(step, 140);
        });
      });
    }
    step();
  }

  function stopSong() {
    songToken++;
    songActive = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    ducked = false;
    refreshBgmLevel();
  }

  function songPlaying() {
    return songActive;
  }

  return {
    unlock: unlock,
    playOpening: playOpening,
    startBgm: startBgm,
    stopBgm: stopBgm,
    setMuted: setMuted,
    setBgmPaused: setBgmPaused,
    speak: speak,
    playSong: playSong,
    stopSong: stopSong,
    songPlaying: songPlaying,
    chime: chime,
    celebrate: celebrate,
    pop: pop
  };
})();
