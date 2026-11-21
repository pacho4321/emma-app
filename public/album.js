/*
  Family photo album. Emma and Ellen share one album per profile id,
  the same id on every device. Guest photos are not kept. This file
  never writes progress, the notebook, or stickers.
*/
(function () {
  var FAMILY = {
    emma: "881078b433019ca48f1be40fd5641f7bbfb1ae4e16e943fd28596ba14c359fbd",
    ellen: "edcf12d66bc81b44981af0dce6bde22e0c9e257ba9f25b0ccbb3a72fedde9ff6"
  };
  var profileFn = function () { return ""; };
  var urls = [];

  function keeps(id) {
    return id === FAMILY.emma || id === FAMILY.ellen;
  }

  function albumKey(id) { return "emma-album-" + id; }
  function goneKey(id) { return "emma-album-gone-" + id; }

  function readList(id) {
    if (!window.EmmaStore) return [];
    try {
      var data = JSON.parse(EmmaStore.get(albumKey(id)) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function readGone(id) {
    if (!window.EmmaStore) return [];
    try {
      var data = JSON.parse(EmmaStore.get(goneKey(id)) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(id, rows) {
    if (!window.EmmaStore || !keeps(id)) return;
    var slim = rows.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }).slice(0, 40);
    EmmaStore.set(albumKey(id), JSON.stringify(slim.map(function (row) {
      return {
        id: row.id,
        createdAt: row.createdAt,
        width: row.width,
        height: row.height,
        jpeg: row.jpeg,
        synced: !!row.synced
      };
    })));
  }

  function mergeLists(local, remote, gone) {
    var skip = {};
    (gone || []).forEach(function (id) { skip[id] = true; });
    var map = {};
    function add(row) {
      if (!row || !row.id || skip[row.id] || !row.jpeg) return;
      var prev = map[row.id];
      if (!prev) map[row.id] = row;
      else map[row.id] = {
        id: row.id,
        createdAt: Math.max(Number(prev.createdAt) || 0, Number(row.createdAt) || 0),
        width: prev.width || row.width,
        height: prev.height || row.height,
        jpeg: prev.jpeg || row.jpeg,
        synced: !!(prev.synced || row.synced)
      };
    }
    (local || []).forEach(add);
    (remote || []).forEach(add);
    return Object.keys(map).map(function (id) { return map[id]; }).sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function bytesToDataUrl(bytes) {
    var blob = new Blob([bytes], { type: "image/jpeg" });
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { resolve(""); };
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlBytes(url) {
    var comma = String(url || "").indexOf(",");
    if (comma < 0) return null;
    var bin = atob(String(url).slice(comma + 1));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function fitJpeg(canvas) {
    var longest = Math.max(canvas.width || 1, canvas.height || 1);
    var scale = Math.min(1, 1280 / longest);
    var out = document.createElement("canvas");
    out.width = Math.max(1, Math.round((canvas.width || 1) * scale));
    out.height = Math.max(1, Math.round((canvas.height || 1) * scale));
    out.getContext("2d").drawImage(canvas, 0, 0, out.width, out.height);
    function attempt(quality) {
      return new Promise(function (resolve) {
        out.toBlob(function (blob) { resolve(blob); }, "image/jpeg", quality);
      }).then(function (blob) {
        if (blob && blob.size > 520000 && quality > 0.52) return attempt(Math.round((quality - 0.1) * 100) / 100);
        return blob;
      });
    }
    return attempt(0.82).then(function (blob) {
      return blob ? { blob: blob, width: out.width, height: out.height } : null;
    });
  }

  function downloadBlob(blob) {
    var a = document.createElement("a");
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "emma-photo.jpg";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function shareOrDownload(blob) {
    var file = new File([blob], "emma-photo.jpg", { type: "image/jpeg" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: "しゃしん" }).then(function () {
        return "shared";
      }).catch(function (err) {
        if (err && err.name === "AbortError") return "cancel";
        return "cancel";
      });
    }
    downloadBlob(blob);
    return Promise.resolve("download");
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pushUnsynced(id, rows) {
    if (!window.EmmaCloud || !EmmaCloud.putPhoto) return Promise.resolve(rows);
    var pending = rows.filter(function (row) { return row && row.jpeg && !row.synced; });
    return pending.reduce(function (chain, row) {
      return chain.then(function () {
        var bytes = dataUrlBytes(row.jpeg);
        if (!bytes) return;
        return EmmaCloud.putPhoto(id, {
          id: row.id,
          createdAt: row.createdAt,
          width: row.width,
          height: row.height,
          bytes: bytes
        }).then(function (ok) { if (ok) row.synced = true; });
      });
    }, Promise.resolve()).then(function () { return rows; });
  }

  function pullRemote(id, local) {
    if (!window.EmmaCloud || !EmmaCloud.listPhotos) return Promise.resolve(local);
    return EmmaCloud.listPhotos(id).then(function (remote) {
      if (!remote || !remote.length) return local;
      return Promise.all(remote.map(function (row) {
        return bytesToDataUrl(row.bytes).then(function (jpeg) {
          return {
            id: row.id,
            createdAt: row.createdAt,
            width: row.width,
            height: row.height,
            jpeg: jpeg,
            synced: true
          };
        });
      })).then(function (ready) {
        return mergeLists(local, ready, readGone(id));
      });
    }).catch(function () { return local; });
  }

  function remember(id, shot) {
    if (!keeps(id) || !shot) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { resolve(""); };
      reader.readAsDataURL(shot.blob);
    }).then(function (jpeg) {
      if (!jpeg) return false;
      var row = {
        id: newId(),
        createdAt: Date.now(),
        width: shot.width,
        height: shot.height,
        jpeg: jpeg,
        synced: false
      };
      var rows = mergeLists(readList(id).concat([row]), [], readGone(id));
      writeList(id, rows);
      return pushUnsynced(id, rows).then(function (next) {
        writeList(id, next);
        return true;
      });
    });
  }

  function clearUrls() {
    urls.forEach(function (url) { URL.revokeObjectURL(url); });
    urls = [];
  }

  function root() { return document.getElementById("album"); }

  function render(rows) {
    var grid = document.getElementById("albumGrid");
    var empty = document.getElementById("albumEmpty");
    if (!grid) return;
    clearUrls();
    grid.innerHTML = "";
    if (empty) empty.hidden = rows.length > 0;
    rows.forEach(function (row) {
      var card = document.createElement("figure");
      card.className = "album-card";
      var img = document.createElement("img");
      img.alt = "";
      img.src = row.jpeg;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "album-del";
      btn.textContent = "けす";
      btn.setAttribute("data-photo", row.id);
      card.appendChild(img);
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  function refresh() {
    var id = profileFn();
    var box = root();
    if (!box || box.hidden) return Promise.resolve();
    if (!keeps(id)) {
      render([]);
      var note = document.getElementById("albumNote");
      if (note) note.textContent = "ゲストの しゃしんは アルバムに のこさないよ";
      return Promise.resolve();
    }
    var local = mergeLists(readList(id), [], readGone(id));
    render(local);
    var note = document.getElementById("albumNote");
    if (note) note.textContent = "この きかいと クラウドの アルバム";
    return pullRemote(id, local).then(function (rows) {
      writeList(id, rows);
      if (!box.hidden && profileFn() === id) render(mergeLists(rows, [], readGone(id)));
      return pushUnsynced(id, readList(id));
    }).then(function (rows) {
      if (rows) writeList(id, rows);
    }).catch(function () {});
  }

  function open() {
    var box = root();
    if (!box) return;
    box.hidden = false;
    var ask = document.getElementById("albumAsk");
    if (ask) ask.hidden = true;
    refresh();
  }

  function close() {
    var box = root();
    if (box) box.hidden = true;
    var ask = document.getElementById("albumAsk");
    if (ask) ask.hidden = true;
    clearUrls();
  }

  function askDelete(photoId) {
    var ask = document.getElementById("albumAsk");
    if (!ask) return;
    ask.hidden = false;
    ask.setAttribute("data-photo", photoId);
  }

  function confirmDelete() {
    var ask = document.getElementById("albumAsk");
    var id = profileFn();
    var photoId = ask ? ask.getAttribute("data-photo") : "";
    if (ask) ask.hidden = true;
    if (!keeps(id) || !photoId) return;
    var gone = readGone(id);
    if (gone.indexOf(photoId) < 0) gone.push(photoId);
    if (window.EmmaStore) EmmaStore.set(goneKey(id), JSON.stringify(gone.slice(-80)));
    writeList(id, readList(id).filter(function (row) { return row.id !== photoId; }));
    render(mergeLists(readList(id), [], gone));
    if (window.EmmaCloud && EmmaCloud.deletePhoto) EmmaCloud.deletePhoto(id, photoId);
  }

  var wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    var back = document.getElementById("albumBack");
    if (back) back.addEventListener("click", close);
    var grid = document.getElementById("albumGrid");
    if (grid) grid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-photo]");
      if (!btn) return;
      askDelete(btn.getAttribute("data-photo"));
    });
    var cancel = document.getElementById("albumCancel");
    if (cancel) cancel.addEventListener("click", function () {
      var ask = document.getElementById("albumAsk");
      if (ask) ask.hidden = true;
    });
    var yes = document.getElementById("albumYes");
    if (yes) yes.addEventListener("click", confirmDelete);
  }

  function saveCanvas(canvas) {
    wire();
    return fitJpeg(canvas).then(function (shot) {
      if (!shot) return "download";
      var id = profileFn();
      var kept = keeps(id) ? remember(id, shot) : Promise.resolve(false);
      return Promise.all([shareOrDownload(shot.blob), kept]).then(function (result) {
        return result[0];
      });
    });
  }

  document.addEventListener("DOMContentLoaded", wire);
  if (document.readyState !== "loading") wire();

  window.EmmaAlbum = {
    setProfile: function (fn) { profileFn = fn || profileFn; },
    saveCanvas: saveCanvas,
    open: open,
    close: close,
    mergeLists: mergeLists
  };
})();
