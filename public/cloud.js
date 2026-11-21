/*
  Cloud copy for the family account. Emma and Ellen are keyed by their
  profile id (the same 64-hex id on every device and every site origin),
  not by the anonymous Firebase user and not by the phone. Guest stays
  on this device only. A device with no local save must not replace a
  cloud save that already has progress.
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
  var FAMILY = {
    emma: "881078b433019ca48f1be40fd5641f7bbfb1ae4e16e943fd28596ba14c359fbd",
    ellen: "edcf12d66bc81b44981af0dce6bde22e0c9e257ba9f25b0ccbb3a72fedde9ff6",
    guest: "66b49fe4f7018673a75d9a7c39911a0458695d23bff9e96b6298eb7704d6bf1d"
  };

  function isGuest(id) {
    return id === FAMILY.guest;
  }

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
    return Math.max(Number(local && local[key]) || 0, Number(remote && remote[key]) || 0);
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

  function progressWeight(data) {
    if (!data || typeof data !== "object") return 0;
    var score = (Number(data.sessions) || 0) * 100
      + (Number(data.kanjiIndex) || 0)
      + (Number(data.kukuIndex) || 0)
      + (Number(data.worksheetIndex) || 0)
      + ((data.remember && data.remember.length) || 0);
    var spanish = data.spanish || {};
    score += (Number(spanish.setIndex) || 0) * 50 + (Number(spanish.round) || 0) * 20;
    var words = spanish.words || {};
    Object.keys(words).forEach(function (id) {
      var row = words[id] || {};
      score += (Number(row.correct) || 0) * 5 + (Number(row.box) || 0) + (Number(row.wrong) || 0);
    });
    score += ((spanish.stickers && spanish.stickers.length) || 0) * 3;
    return score;
  }

  function bookWeight(book) {
    if (!book) return 0;
    var score = 0;
    var kanji = book.kanji || {};
    Object.keys(kanji).forEach(function (id) { score += (kanji[id] || []).length * 5; });
    var facts = book.facts || {};
    Object.keys(facts).forEach(function (id) { score += Number(facts[id] && facts[id].n) || 0; });
    return score;
  }

  function recordWeight(data) {
    if (!data) return 0;
    return progressWeight(data.progress || data) + bookWeight(data.book) + stickerScore(data.stickers);
  }

  function snapshotOf(data) {
    var progress = (data && data.progress) || {};
    var spanish = progress.spanish || {};
    return {
      at: Date.now(),
      sessions: Number(progress.sessions) || 0,
      kanjiIndex: Number(progress.kanjiIndex) || 0,
      kukuIndex: Number(progress.kukuIndex) || 0,
      setIndex: Number(spanish.setIndex) || 0,
      round: Number(spanish.round) || 0,
      words: Object.keys(spanish.words || {}).length,
      book: bookWeight(data && data.book),
      stickers: stickerScore(data && data.stickers)
    };
  }

  function mergeProgress(localText, remoteObj) {
    var local = parseJson(localText) || {};
    var remote = remoteObj || {};
    if (!remoteObj) return localText || JSON.stringify(local);
    var merged = {};
    Object.keys(remote).forEach(function (key) { merged[key] = remote[key]; });
    Object.keys(local).forEach(function (key) {
      if (merged[key] === undefined) merged[key] = local[key];
    });
    var newerSettings = (Number(remote.updatedAt) || 0) >= (Number(local.updatedAt) || 0) ? remote : local;
    merged.sessions = pickNum(local, remote, "sessions");
    merged.kanjiIndex = pickNum(local, remote, "kanjiIndex");
    merged.kukuIndex = pickNum(local, remote, "kukuIndex");
    merged.worksheetIndex = pickNum(local, remote, "worksheetIndex");
    merged.remember = mergeRemember(local.remember, remote.remember);
    merged.mute = !!newerSettings.mute;
    merged.bgmPaused = newerSettings.bgmPaused !== false;
    merged.updatedAt = Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0);
    var spanish = mergeSpanish(local.spanish, remote.spanish);
    if (spanish) merged.spanish = spanish;
    var snaps = []
      .concat(Array.isArray(remote.snapshots) ? remote.snapshots : [])
      .concat(Array.isArray(local.snapshots) ? local.snapshots : []);
    if (snaps.length) merged.snapshots = snaps.slice(-5);
    return JSON.stringify(merged);
  }

  function planSync(localBody, remote) {
    var localWeight = recordWeight(localBody || {});
    var remoteWeight = recordWeight(remote || {});
    if (remote && remoteWeight > 0 && localWeight === 0) {
      return { write: false, restore: true, remote: remote };
    }
    var progress = JSON.parse(mergeProgress(JSON.stringify((localBody && localBody.progress) || {}), (remote && remote.progress) || null));
    var book = JSON.parse(mergeBook(JSON.stringify((localBody && localBody.book) || {}), (remote && remote.book) || null));
    var stickers = JSON.parse(mergeStickers(JSON.stringify((localBody && localBody.stickers) || {}), (remote && remote.stickers) || null) || "{}");
    var snaps = []
      .concat(progress.snapshots || [])
      .concat(remote && remoteWeight > 0 ? [snapshotOf(remote)] : []);
    progress.snapshots = snaps.slice(-5);
    var localAt = Number(localBody && localBody.avatarAt) || 0;
    var remoteAt = Number(remote && remote.avatarAt) || 0;
    return {
      write: true,
      restore: false,
      body: {
        profileId: (localBody && localBody.profileId) || (remote && remote.profileId) || "",
        name: (localBody && localBody.name) || (remote && remote.name) || "",
        avatar: localAt >= remoteAt ? ((localBody && localBody.avatar) || (remote && remote.avatar) || "") : ((remote && remote.avatar) || (localBody && localBody.avatar) || ""),
        avatarAt: Math.max(localAt, remoteAt),
        updatedAt: Date.now(),
        progress: progress,
        book: book,
        settings: {
          mute: !!progress.mute,
          bgmPaused: progress.bgmPaused !== false,
          updatedAt: Date.now()
        },
        stickers: stickers
      }
    };
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

  function stickerScore(data) {
    if (!data) return 0;
    return ((data.items && data.items.length) || 0) + ((data.espanol && data.espanol.length) || 0) + (data.frame ? 1 : 0);
  }

  function mergeStickers(localText, remoteObj) {
    var local = parseJson(localText);
    var remote = remoteObj || null;
    if (!local && !remote) return "";
    if (!local || stickerScore(local) === 0) return remote ? JSON.stringify(remote) : (localText || "");
    if (!remote || stickerScore(remote) === 0) return JSON.stringify(local);
    var espanol = {};
    function addRows(list) {
      (list || []).forEach(function (row) {
        if (!row || !row.id) return;
        var prev = espanol[row.id];
        if (!prev || (Number(row.t) || 0) >= (Number(prev.t) || 0)) espanol[row.id] = { id: String(row.id), t: Number(row.t) || 0 };
      });
    }
    addRows(local.espanol);
    addRows(remote.espanol);
    var items = (local.items || []).length >= (remote.items || []).length ? local.items : remote.items;
    return JSON.stringify({
      frame: local.frame || remote.frame || "",
      filter: local.filter || remote.filter || "",
      items: items || [],
      espanol: Object.keys(espanol).map(function (key) { return espanol[key]; }),
      updatedAt: Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0)
    });
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
    if (!configured || !db || !id || !/^[0-9a-f]{64}$/.test(id) || isGuest(id)) return Promise.resolve(false);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline", "クラウド: オフライン");
      return Promise.resolve(false);
    }
    setStatus("saving", "クラウド: ほぞんちゅう");
    return ensureAuth().then(function (ok) {
      if (!ok) return false;
      var ref = db.collection("profiles").doc(id);
      return ref.get().then(function (snap) {
        var remote = snap.exists ? snap.data() : null;
        var plan = planSync(payload(id), remote);
        if (!plan.write) {
          if (plan.restore) applyRemote(id, plan.remote);
          setStatus("saved", "クラウドに保存ずみ " + clock(remote && remote.updatedAt), remote && remote.updatedAt);
          return true;
        }
        return ref.set(plan.body, { merge: true }).then(function () {
          applyRemote(id, plan.body);
          setStatus("saved", "クラウドに保存ずみ " + clock(plan.body.updatedAt), plan.body.updatedAt);
          return true;
        });
      });
    }).catch(function () {
      setStatus("error", "クラウド: うまく いかなかった");
      return false;
    });
  }

  function pullAndMerge(id) {
    if (!configured || !db || !id || !/^[0-9a-f]{64}$/.test(id) || isGuest(id)) return Promise.resolve(false);
    return syncProfile(id);
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
    if (progress && !isGuest(progress[1])) schedule(progress[1]);
    else if (book && !isGuest(book[1])) schedule(book[1]);
    else if (stickers && !isGuest(stickers[1])) schedule(stickers[1]);
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
    planSync: planSync,
    preview: function (id) { return payload(id); },
    accountKey: function (id) { return isGuest(id) ? "" : id; },
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
