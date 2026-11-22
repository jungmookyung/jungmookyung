/* 공통 유틸 — window.PT */
(function () {
  'use strict';
  window.PT = window.PT || {};
  var PT = window.PT;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('on'); }, 1900);
  }

  function fmtBytes(n) {
    if (n == null || isNaN(n)) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
  }

  function extFor(type) {
    if (!type) return 'bin';
    type = String(type).toLowerCase();
    if (type.indexOf('jpeg') > -1 || type.indexOf('jpg') > -1) return 'jpg';
    if (type.indexOf('png') > -1) return 'png';
    if (type.indexOf('webp') > -1) return 'webp';
    if (type.indexOf('pdf') > -1) return 'pdf';
    if (type.indexOf('gif') > -1) return 'gif';
    return 'bin';
  }

  function baseName(name) {
    return String(name || 'image').replace(/\.[^.]+$/, '') || 'image';
  }

  function safeName(name) {
    return String(name || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 4000);
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error('이미지를 만들 수 없어요'));
      }, type || 'image/jpeg', quality == null ? 0.92 : quality);
    });
  }

  function loadImageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        resolve({ img: img, url: url });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('이미지를 열 수 없어요 (지원하지 않는 형식일 수 있어요)'));
      };
      img.src = url;
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('파일을 읽을 수 없어요')); };
      r.readAsArrayBuffer(file);
    });
  }

  var scriptCache = {};
  function loadScript(src) {
    if (scriptCache[src]) return scriptCache[src];
    scriptCache[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { delete scriptCache[src]; reject(new Error('라이브러리를 불러오지 못했어요: ' + src)); };
      document.head.appendChild(s);
    });
    return scriptCache[src];
  }

  function zipFiles(files) {
    if (typeof JSZip === 'undefined') return Promise.reject(new Error('ZIP 라이브러리를 불러오지 못했어요'));
    var zip = new JSZip();
    var folder = zip.folder('files');
    files.forEach(function (f, i) {
      var name = f.name;
      // 중복 이름 방지
      var used = files.slice(0, i).filter(function (x) { return x.name === name; }).length;
      if (used) name = name.replace(/(\.[^.]+)$/, '-' + (used + 1) + '$1');
      folder.file(name, f.blob);
    });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function setProgress(el, pct, text) {
    if (!el) return;
    var bar = el.querySelector('.bar i');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (text != null) {
      var t = el.querySelector('span');
      if (t) t.textContent = text;
    }
  }

  function nextFrame() {
    return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  PT.registry = {};
  PT.register = function (id, api) { PT.registry[id] = api; };

  PT.util = {
    $: $, $$: $$, toast: toast, fmtBytes: fmtBytes, extFor: extFor, baseName: baseName,
    safeName: safeName, downloadBlob: downloadBlob, canvasToBlob: canvasToBlob,
    loadImageFromBlob: loadImageFromBlob, readAsArrayBuffer: readAsArrayBuffer,
    loadScript: loadScript, zipFiles: zipFiles, debounce: debounce,
    setProgress: setProgress, nextFrame: nextFrame, clamp: clamp
  };
})();
