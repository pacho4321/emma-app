/*
  Progress, the notebook, and the user list live here.
  IndexedDB is the copy that stays across reloads. localStorage is a
  mirror so an older page can still read it. Nothing in this file
  deletes the database on an update.
*/
(function () {
  var DB = "emma-app";
  var STORE = "kv";
  var mem = {};
  var idb = null;
  var opened = false;
  var waiters = [];

  function emmaKey(key) {
    return typeof key === "string" && key.indexOf("emma-") === 0;
  }

  function seedFromLocal() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (emmaKey(key) && !albumKey(key)) mem[key] = localStorage.getItem(key);
      }
    } catch (e) {}
  }

  function albumKey(key) {
    return key.indexOf("emma-album-") === 0;
  }

  function mirror(key, value) {
    try {
      if (albumKey(key) || value == null) localStorage.removeItem(key);
      if (albumKey(key) || value == null) return;
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function writeIdb(key, value) {
    if (!idb) return;
    try {
      var tx = idb.transaction(STORE, "readwrite");
      var store = tx.objectStore(STORE);
      if (value == null) store.delete(key);
      else store.put({ k: key, v: value, t: Date.now() });
    } catch (e) {}
  }

  function finish(changed) {
    opened = true;
    var list = waiters.splice(0);
    list.forEach(function (fn) {
      try { fn(changed); } catch (e) {}
    });
  }

  seedFromLocal();

  window.EmmaStore = {
    get: function (key) {
      return mem[key] == null ? null : mem[key];
    },
    set: function (key, value) {
      var text = String(value);
      mem[key] = text;
      mirror(key, text);
      writeIdb(key, text);
    },
    remove: function (key) {
      delete mem[key];
      mirror(key, null);
      writeIdb(key, null);
    },
    whenReady: function (fn) {
      if (opened) fn(false);
      else waiters.push(fn);
    },
    snapshot: function () {
      var items = {};
      Object.keys(mem).forEach(function (key) {
        if (key.indexOf("emma-active-") === 0) return;
        items[key] = mem[key];
      });
      return { app: "emma", v: 1, savedAt: new Date().toISOString(), items: items };
    },
    restore: function (data) {
      if (!data || data.app !== "emma" || data.v !== 1 || !data.items || typeof data.items !== "object") return false;
      Object.keys(data.items).forEach(function (key) {
        if (!emmaKey(key) || typeof data.items[key] !== "string") return;
        window.EmmaStore.set(key, data.items[key]);
      });
      return true;
    },
    askPersist: function () {
      if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
      return navigator.storage.persist().catch(function () { return false; });
    },
    persisted: function () {
      if (!navigator.storage || !navigator.storage.persisted) return Promise.resolve(false);
      return navigator.storage.persisted().catch(function () { return false; });
    }
  };

  if (!window.indexedDB) {
    finish(false);
    return;
  }
  var req = indexedDB.open(DB, 1);
  req.onupgradeneeded = function () {
    var db = req.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "k" });
  };
  req.onerror = function () { finish(false); };
  req.onsuccess = function () {
    idb = req.result;
    var tx = idb.transaction(STORE, "readwrite");
    var store = tx.objectStore(STORE);
    var all = store.getAll();
    all.onerror = function () { finish(false); };
    all.onsuccess = function () {
      var rows = all.result || [];
      var seen = {};
      var changed = false;
      rows.forEach(function (row) {
        if (!row || !emmaKey(row.k) || typeof row.v !== "string") return;
        seen[row.k] = true;
        if (mem[row.k] == null) {
          mem[row.k] = row.v;
          mirror(row.k, row.v);
          changed = true;
        }
      });
      Object.keys(mem).forEach(function (key) {
        if (!seen[key]) store.put({ k: key, v: mem[key], t: Date.now() });
      });
      finish(changed);
    };
  };

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () {});
  }
})();
