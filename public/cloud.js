/*
  Cloud copy of each profile. The document id is the same profile id
  already used on this device. Offline edits stay in EmmaStore and
  are sent again when the network returns. Deletes are never sent.
*/
(function () {
  var state = { phase: "off", at: 0, message: "クラウド: まだ" };
  var listeners = [];
  var profileFn = function () { return ""; };
  var nameFn = function () { return ""; };
  var db = null;
  var authReady = null;
  var timers = {};
  var configured = false;

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) {}
    });
  }

  function setStatus(phase, message, at) {
    state = { phase: phase, message: message, at: at || 0 };
    emit();
  }

  function clock(ms) {
    if (!ms) return "";
    var d = new Date(ms);
    var h = d.getHours();
    var m = d.getMinutes();
    return h + ":" + (m < 10 ? "0" : "") + m;
  }

  function parseJson(text) {
    if (!text) return null;
    try {
      var data = JSON.parse(text);
      return data && typeof data === "object" ? data : null;
    } catch (e) {
      return null;
    }
  }

  function pickNum(local, remote, key) {
    var lt = Number(local && local.updatedAt) || 0;
    var rt = Number(remote && remote.updatedAt) || 0;
    var lv = Number(local && local[key]) || 0;
    var rv = Number(remote && remote[key]) || 0;
    if (rt > lt) return rv || lv;
    if (lt > rt) return lv || rv;
    return Math.max(lv, rv);
  }

  function mergeRemember(a, b) {
    var map = {};
    function add(list) {
      (list || []).forEach(function (item) {
        if (!item || !item.id || !item.kind) return;
        map[item.kind + ":" + item.id] = { kind: item.kind, id: item.id };
      });
    }
    add(a);
    add(b);
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function mergeSpanish(local, remote) {
    if (!local && !remote) return null;
    var words = {};
    function take(src) {
      var rows = (src && src.words) || {};
      Object.keys(rows).forEach(function (id) {
        var row = rows[id];
        if (!row || typeof row !== "object") return;
        var prev = words[id];
        var next = {
          box: Math.max(Number(row.box) || 0, prev ? Number(prev.box) || 0 : 0),
          due: Number(row.due) || 0,
          streak: Number(row.streak) || 0,
          lapses: Math.max(Number(row.lapses) || 0, prev ? Number(prev.lapses) || 0 : 0),
          correct: Math.max(Number(row.correct) || 0, prev ? Number(prev.correct) || 0 : 0),
          wrong: Math.max(Number(row.wrong) || 0, prev ? Number(prev.wrong) || 0 : 0),
          t: Math.max(Number(row.t) || 0, prev ? Number(prev.t) || 0 : 0)
        };
        if (prev && (Number(prev.t) || 0) > (Number(row.t) || 0)) next.due = prev.due;
        if (prev && (Number(prev.box) || 0) > (Number(row.box) || 0)) next.streak = prev.streak;
        words[id] = next;
      });
    }
    take(local);
    take(remote);
    var stickers = {};
    function takeStick(src) {
      ((src && src.stickers) || []).forEach(function (row) {
        if (!row || !row.id) return;
        var prev = stickers[row.id];
        if (!prev || (Number(row.t) || 0) >= prev.t) stickers[row.id] = { id: String(row.id), t: Number(row.t) || 0 };
      });
    }
    takeStick(local);
    takeStick(remote);
    var localSet = Number(local && local.setIndex) || 0;
    var remoteSet = Number(remote && remote.setIndex) || 0;
    var setIndex = Math.max(localSet, remoteSet);
    var roundCount = localSet === remoteSet
      ? Math.max(Number(local && local.round) || 0, Number(remote && remote.round) || 0)
      : (localSet > remoteSet ? (Number(local && local.round) || 0) : (Number(remote && remote.round) || 0));
    var newer = (Number(remote && remote.updatedAt) || 0) >= (Number(local && local.updatedAt) || 0) ? remote : local;
    var voice = newer && typeof newer.voice === "string" ? newer.voice : "elvira";
    return {
      words: words,
      stickers: Object.keys(stickers).map(function (key) { return stickers[key]; }),
      setIndex: setIndex,
      round: roundCount,
      voice: voice,
      updatedAt: Math.max(Number(local && local.updatedAt) || 0, Number(remote && remote.updatedAt) || 0)
    };
  }

  function mergeProgress(localText, remoteObj) {
    var local = parseJson(localText) || {};
    var remote = remoteObj || {};
    if (!remoteObj) return localText || JSON.stringify(local);
    var newerSettings = (Number(remote.updatedAt) || 0) >= (Number(local.updatedAt) || 0) ? remote : local;
    var merged = {
      sessions: pickNum(local, remote, "sessions"),
      kanjiIndex: pickNum(local, remote, "kanjiIndex"),
      kukuIndex: pickNum(local, remote, "kukuIndex"),
      worksheetIndex: pickNum(local, remote, "worksheetIndex"),
      remember: mergeRemember(local.remember, remote.remember),
      mute: !!newerSettings.mute,
      bgmPaused: newerSettings.bgmPaused !== false,
      updatedAt: Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0)
    };
    var spanish = mergeSpanish(local.spanish, remote.spanish);
    if (spanish) merged.spanish = spanish;
    return JSON.stringify(merged);
  }

  function mergeKanji(localRows, remoteRows) {
    var map = {};
    function add(rows) {
      (rows || []).forEach(function (cell) {
        if (!cell || typeof cell.img !== "string" || !cell.img) return;
        var t = Number(cell.t) || 0;
        var prev = map[cell.img];
        if (!prev || t >= prev.t) {
          map[cell.img] = {
            img: cell.img,
            stamp: cell.stamp === "hanamaru" ? "hanamaru" : "maru",
            t: t
          };
        } else if (cell.stamp === "hanamaru") {
          prev.stamp = "hanamaru";
        }
      });
    }
    add(localRows);
    add(remoteRows);
    return Object.keys(map).map(function (key) { return map[key]; })
      .sort(function (a, b) { return a.t - b.t; })
      .slice(-10);
  }

  function mergeFacts(localFacts, remoteFacts) {
    var out = {};
    var keys = {};
    Object.keys(localFacts || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(remoteFacts || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(keys).forEach(function (key) {
      var a = (localFacts || {})[key];
      var b = (remoteFacts || {})[key];
      if (!a) { out[key] = b; return; }
      if (!b) { out[key] = a; return; }
      var newer = (Number(b.t) || 0) >= (Number(a.t) || 0) ? b : a;
      out[key] = {
        n: Math.max(Number(a.n) || 0, Number(b.n) || 0),
        stamp: a.stamp === "hanamaru" || b.stamp === "hanamaru" ? "hanamaru" : "maru",
        mode: newer.mode || a.mode || b.mode || "",
        id: newer.id || a.id || b.id || "",
        t: Math.max(Number(a.t) || 0, Number(b.t) || 0)
      };
    });
    return out;
  }

  function mergeBook(localText, remoteObj) {
    var local = parseJson(localText) || { kanji: {}, facts: {} };
    var remote = remoteObj || { kanji: {}, facts: {} };
    var kanji = {};
    var ids = {};
    Object.keys(local.kanji || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(remote.kanji || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      var rows = mergeKanji((local.kanji || {})[id], (remote.kanji || {})[id]);
      if (rows.length) kanji[id] = rows;
    });
    return JSON.stringify({
      kanji: kanji,
      facts: mergeFacts(local.facts, remote.facts),
      updatedAt: Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0)
    });
  }

  function mergeStickers(localText, remoteObj) {
    var local = parseJson(localText);
    var remote = remoteObj || null;
    if (!local) return remote ? JSON.stringify(remote) : "";
    if (!remote) return localText;
    var lt = Number(local.updatedAt) || 0;
    var rt = Number(remote.updatedAt) || 0;
    return JSON.stringify(rt >= lt ? remote : local);
  }

  function mergeKids(localList, remoteList) {
    var map = {};
    function add(list) {
      (list || []).forEach(function (kid) {
        if (!kid || typeof kid.id !== "string" || !/^[0-9a-f]{64}$/.test(kid.id)) return;
        var prev = map[kid.id];
        var t = Number(kid.t) || Number(kid.avatarAt) || 0;
        var avatarAt = Math.max(Number(kid.avatarAt) || 0, prev ? (Number(prev.avatarAt) || 0) : 0);
        var avatar = (Number(kid.avatarAt) || 0) >= (prev ? (Number(prev.avatarAt) || 0) : 0)
          ? (kid.avatar || (prev && prev.avatar) || "")
          : ((prev && prev.avatar) || kid.avatar || "");
        if (!prev || t >= (prev.t || 0)) {
          map[kid.id] = {
            id: kid.id,
            name: String(kid.name || (prev && prev.name) || "なまえ").slice(0, 12),
            builtin: kid.builtin || (prev && prev.builtin) || "",
            avatar: String(avatar || "").slice(0, 20),
            avatarAt: avatarAt,
            t: Math.max(t, prev ? (prev.t || 0) : 0)
          };
        } else if (avatar) {
          prev.avatar = String(avatar).slice(0, 20);
          prev.avatarAt = avatarAt;
        }
      });
    }
    add(localList);
    add(remoteList);
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function configOk() {
    var cfg = window.EMMA_FIREBASE;
    return !!(cfg && cfg.apiKey && cfg.appId && cfg.projectId);
  }

  function ensureAuth() {
    if (authReady) return authReady;
    authReady = firebase.auth().signInAnonymously().then(function () {
      return true;
    }).catch(function () {
      authReady = null;
      setStatus("error", "クラウド: うまく いかなかった");
      return false;
    });
    return authReady;
  }

  function localProgress(id) { return window.EmmaStore ? EmmaStore.get("emma-progress-" + id) : null; }
  function localBook(id) { return window.EmmaStore ? EmmaStore.get("emma-book-" + id) : null; }
  function localStickers(id) { return window.EmmaStore ? EmmaStore.get("emma-stickers-" + id) : null; }

  function writeLocal(id, progressText, bookText, stickerText) {
    if (!window.EmmaStore) return;
    if (progressText) EmmaStore.set("emma-progress-" + id, progressText);
    if (bookText) EmmaStore.set("emma-book-" + id, bookText);
    if (stickerText) EmmaStore.set("emma-stickers-" + id, stickerText);
  }

  function localUser(id) {
    if (!window.EmmaStore) return null;
    var list = parseJson(EmmaStore.get("emma-users-v1"));
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }

  function payload(id) {
    var progress = parseJson(localProgress(id)) || {};
    var book = parseJson(localBook(id)) || { kanji: {}, facts: {} };
    var stickers = parseJson(localStickers(id)) || { frame: "", items: [], updatedAt: 0 };
    var user = localUser(id) || {};
    var now = Date.now();
    if (!progress.updatedAt) progress.updatedAt = now;
    return {
      profileId: id,
      name: String(user.name || nameFn(id) || "").slice(0, 12),
      avatar: String(user.avatar || "").slice(0, 20),
      avatarAt: Number(user.avatarAt) || 0,
      updatedAt: now,
      progress: progress,
      book: book,
      settings: {
        mute: !!progress.mute,
        bgmPaused: progress.bgmPaused !== false,
        updatedAt: Number(progress.updatedAt) || now
      },
      stickers: stickers
    };
  }

  function applyRemote(id, data) {
    if (!data) return false;
    var progressText = mergeProgress(localProgress(id), data.progress || null);
    var bookText = mergeBook(localBook(id), data.book || null);
    var stickerText = mergeStickers(localStickers(id), data.stickers || null);
    writeLocal(id, progressText, bookText, stickerText);
    if (window.EmmaStore && (data.name || data.avatar)) {
      var raw = parseJson(EmmaStore.get("emma-users-v1"));
      if (Array.isArray(raw)) {
        raw.forEach(function (user) {
          if (!user || user.id !== id) return;
          if (data.name) user.name = String(data.name).slice(0, 12);
          if (data.avatar && (Number(data.avatarAt) || 0) >= (Number(user.avatarAt) || 0)) {
            user.avatar = String(data.avatar).slice(0, 20);
            user.avatarAt = Number(data.avatarAt) || 0;
          }
        });
        EmmaStore.set("emma-users-v1", JSON.stringify(raw));
      }
    }
    return true;
  }

  function syncProfile(id) {
    if (!configured || !db || !id || !/^[0-9a-f]{64}$/.test(id)) return Promise.resolve(false);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline", "クラウド: オフライン");
      return Promise.resolve(false);
    }
    setStatus("saving", "クラウド: ほぞんちゅう");
    return ensureAuth().then(function (ok) {
      if (!ok) return false;
      var body = payload(id);
      return db.collection("profiles").doc(id).set(body, { merge: true }).then(function () {
        setStatus("saved", "クラウドに保存ずみ " + clock(body.updatedAt), body.updatedAt);
        return true;
      });
    }).catch(function () {
      setStatus("error", "クラウド: うまく いかなかった");
      return false;
    });
  }

  function pullAndMerge(id) {
    if (!configured || !db || !id || !/^[0-9a-f]{64}$/.test(id)) return Promise.resolve(false);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline", "クラウド: オフライン");
      return Promise.resolve(false);
    }
    return ensureAuth().then(function (ok) {
      if (!ok) return false;
      return db.collection("profiles").doc(id).get().then(function (snap) {
        if (snap.exists) applyRemote(id, snap.data());
        return syncProfile(id);
      });
    }).catch(function () {
      setStatus("error", "クラウド: うまく いかなかった");
      return false;
    });
  }

  function syncRoster() {
    if (!configured || !db || !window.EmmaStore) return Promise.resolve(false);
    var list = parseJson(EmmaStore.get("emma-users-v1"));
    if (!Array.isArray(list)) return Promise.resolve(false);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline", "クラウド: オフライン");
      return Promise.resolve(false);
    }
    return ensureAuth().then(function (ok) {
      if (!ok) return false;
      var ref = db.collection("registry").doc("names");
      return ref.get().then(function (snap) {
        var remoteKids = snap.exists && snap.data() ? snap.data().kids : [];
        var kids = mergeKids(list, remoteKids);
        EmmaStore.set("emma-users-v1", JSON.stringify(kids.map(function (kid) {
          return {
            id: kid.id,
            name: kid.name,
            builtin: kid.builtin || "",
            avatar: kid.avatar || "",
            avatarAt: Number(kid.avatarAt) || 0
          };
        })));
        return ref.set({ updatedAt: Date.now(), kids: kids }, { merge: true });
      });
    }).catch(function () {
      return false;
    });
  }

  function schedule(id) {
    if (!id) return;
    clearTimeout(timers[id]);
    timers[id] = setTimeout(function () { syncProfile(id); }, 400);
  }

  function noteLocalWrite(key) {
    if (!configured || !key) return;
    var progress = key.match(/^emma-progress-([0-9a-f]{64})$/);
    var book = key.match(/^emma-book-([0-9a-f]{64})$/);
    var stickers = key.match(/^emma-stickers-([0-9a-f]{64})$/);
    if (progress) schedule(progress[1]);
    else if (book) schedule(book[1]);
    else if (stickers) schedule(stickers[1]);
    else if (key === "emma-users-v1") {
      clearTimeout(timers.roster);
      timers.roster = setTimeout(syncRoster, 400);
    }
  }

  function start() {
    if (!configOk()) {
      configured = false;
      setStatus("setup", "クラウド: せってい まち");
      return Promise.resolve(false);
    }
    if (!window.firebase) {
      setStatus("error", "クラウド: うまく いかなかった");
      return Promise.resolve(false);
    }
    if (!configured) {
      try {
        firebase.initializeApp(window.EMMA_FIREBASE);
        db = firebase.firestore();
      } catch (e) {
        setStatus("error", "クラウド: うまく いかなかった");
        return Promise.resolve(false);
      }
      configured = true;
      return db.enablePersistence({ synchronizeTabs: true }).catch(function () {}).then(function () {
        var jobs = [syncRoster()];
        var id = profileFn();
        if (id) jobs.push(pullAndMerge(id));
        return Promise.all(jobs).then(function () { return true; });
      });
    }
    var jobs = [syncRoster()];
    var id = profileFn();
    if (id) jobs.push(pullAndMerge(id));
    return Promise.all(jobs).then(function () { return true; });
  }

  window.addEventListener("online", function () {
    if (!configured) return;
    syncRoster();
    var id = profileFn();
    if (id) syncProfile(id);
  });
  window.addEventListener("offline", function () {
    if (configured) setStatus("offline", "クラウド: オフライン");
  });

  window.EmmaCloud = {
    setProfile: function (fn) { profileFn = fn || profileFn; },
    setName: function (fn) { nameFn = fn || nameFn; },
    start: start,
    pullAndMerge: pullAndMerge,
    syncProfile: syncProfile,
    noteLocalWrite: noteLocalWrite,
    noteStickers: function (data) {
      var id = profileFn();
      if (!id || !window.EmmaStore || !data) return;
      data.updatedAt = Date.now();
      var prevStick = parseJson(EmmaStore.get("emma-stickers-" + id)) || {};
      EmmaStore.set("emma-stickers-" + id, JSON.stringify({
        frame: String(data.frame || ""),
        filter: String(data.filter || ""),
        items: Array.isArray(data.items) ? data.items.slice(0, 40) : [],
        espanol: Array.isArray(prevStick.espanol) ? prevStick.espanol : [],
        updatedAt: data.updatedAt
      }));
      noteLocalWrite("emma-stickers-" + id);
    },
    status: function () { return state; },
    onStatus: function (fn) { listeners.push(fn); },
    mergeProgress: mergeProgress,
    mergeBook: mergeBook,
    mergeStickers: mergeStickers,
    mergeKids: mergeKids
  };
})();
