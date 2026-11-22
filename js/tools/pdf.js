/* 3. PDF ↔ 이미지 */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var pdfjsReady = null;
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = U.loadScript('vendor/pdf.min.js').then(function () {
      if (!window.pdfjsLib) throw new Error('PDF 라이브러리를 불러오지 못했어요');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.js', document.baseURI).href;
      return window.pdfjsLib;
    });
    return pdfjsReady;
  }

  var pdfLibReady = null;
  function ensurePdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (pdfLibReady) return pdfLibReady;
    pdfLibReady = U.loadScript('vendor/pdf-lib.min.js').then(function () {
      if (!window.PDFLib) throw new Error('PDF 생성 라이브러리를 불러오지 못했어요');
      return window.PDFLib;
    });
    return pdfLibReady;
  }

  /* ================= PDF → 이미지 ================= */
  var p2i = {
    file: null, doc: null, quality: 1600, format: 'image/jpeg',
    pages: [], urls: [], busy: false
  };

  function p2iReset() {
    p2i.urls.forEach(function (u) { URL.revokeObjectURL(u); });
    p2i.urls = [];
    p2i.pages = [];
    $('#pdfPages').innerHTML = '';
  }

  async function p2iLoad(file) {
    if (!file) return;
    if (!/pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      U.toast('PDF 파일을 선택해 주세요');
      return;
    }
    if (p2i.busy) return;
    p2iReset();
    p2i.file = file;
    $('#pdf2imgOpts').hidden = false;
    $('#pdfProg').hidden = false;
    U.setProgress($('#pdfProg'), 2, 'PDF 여는 중…');
    try {
      var lib = await ensurePdfJs();
      var buf = await U.readAsArrayBuffer(file);
      p2i.doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
      await p2iRender();
      U.toast(p2i.doc.numPages + '페이지를 이미지로 만들었어요');
    } catch (e) {
      console.warn(e);
      U.setProgress($('#pdfProg'), 0, '');
      $('#pdfProg').hidden = true;
      U.toast(e && e.name === 'PasswordException' ? '암호가 걸린 PDF예요' : 'PDF를 열 수 없어요');
      p2i.doc = null;
    }
  }

  async function p2iRender() {
    if (!p2i.doc) return;
    if (p2i.busy) return;
    p2i.busy = true;
    p2iReset();
    $('#pdfProg').hidden = false;
    var doc = p2i.doc;
    var total = doc.numPages;
    var fmt = p2i.format;
    var quality = p2i.quality;
    var wrap = $('#pdfPages');
    var totalBytes = 0;
    try {
      for (var i = 1; i <= total; i++) {
        U.setProgress($('#pdfProg'), Math.round((i - 1) / total * 100), (i) + ' / ' + total + ' 페이지 변환 중…');
        await U.nextFrame();
        var page = await doc.getPage(i);
        var base = page.getViewport({ scale: 1 });
        var scale = Math.min(quality / Math.max(base.width, base.height), 6);
        var vp = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vp.width));
        canvas.height = Math.max(1, Math.round(vp.height));
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        page.cleanup();
        var blob = await U.canvasToBlob(canvas, fmt, 0.92);
        totalBytes += blob.size;
        var url = URL.createObjectURL(blob);
        p2i.urls.push(url);
        var rec = { page: i, blob: blob, url: url, w: canvas.width, h: canvas.height };
        p2i.pages.push(rec);
        appendPageCard(rec, fmt);
        canvas.width = canvas.height = 0;
      }
      U.setProgress($('#pdfProg'), 100, total + '페이지 완료 · ' + U.fmtBytes(totalBytes));
      $('#pdfZip').disabled = false;
    } catch (e) {
      console.warn(e);
      U.toast('변환 중 문제가 생겼어요');
    } finally {
      p2i.busy = false;
    }
  }

  function appendPageCard(rec, fmt) {
    var ext = U.extFor(fmt);
    var d = document.createElement('div');
    d.className = 'thumb-card';
    d.innerHTML = '<img src="' + rec.url + '" alt="' + rec.page + '페이지" loading="lazy">' +
      '<div class="cap"><span>' + rec.page + 'p · ' + U.fmtBytes(rec.blob.size) + '</span>' +
      '<button type="button" data-save="' + rec.page + '">저장</button></div>';
    $('#pdfPages').appendChild(d);
    void ext;
  }

  function pageName(rec) {
    var base = U.baseName(p2i.file ? p2i.file.name : 'document');
    return U.safeName(base) + '-p' + String(rec.page).padStart(2, '0') + '.' + U.extFor(p2i.format);
  }

  async function p2iZip() {
    if (!p2i.pages.length) { U.toast('먼저 PDF를 선택해 주세요'); return; }
    if (p2i.busy) { U.toast('아직 변환 중이에요'); return; }
    var btn = $('#pdfZip');
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = 'ZIP 만드는 중…';
    try {
      var files = p2i.pages.map(function (r) { return { name: pageName(r), blob: r.blob }; });
      var zip = await U.zipFiles(files);
      U.downloadBlob(zip, U.safeName(U.baseName(p2i.file.name)) + '-images.zip');
      U.toast('ZIP 저장 완료');
    } catch (e) {
      U.toast(e.message || 'ZIP 생성 실패');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  /* ================= 이미지 → PDF ================= */
  var i2p = { items: [], size: 'auto', busy: false };

  function i2pRenderList() {
    var list = $('#img2pdfList');
    list.innerHTML = '';
    var totalBytes = 0;
    i2p.items.forEach(function (it, idx) {
      totalBytes += it.file.size;
      var d = document.createElement('div');
      d.className = 'item';
      d.innerHTML =
        '<img class="thumb" src="' + it.url + '" alt="">' +
        '<div class="meta"><div class="nm">' + (idx + 1) + '. ' + esc(it.file.name) + '</div>' +
        '<div class="sz">' + it.w + '×' + it.h + ' · ' + U.fmtBytes(it.file.size) + '</div></div>' +
        '<div class="ops">' +
        '<button class="mini" data-up="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + ' aria-label="위로">↑</button>' +
        '<button class="mini" data-down="' + idx + '" ' + (idx === i2p.items.length - 1 ? 'disabled' : '') + ' aria-label="아래로">↓</button>' +
        '<button class="mini" data-del="' + idx + '" aria-label="삭제">✕</button>' +
        '</div>';
      list.appendChild(d);
    });
    $('#img2pdfSum').innerHTML = i2p.items.length
      ? '<span><b>' + i2p.items.length + '장</b> · ' + U.fmtBytes(totalBytes) + '</span><span>위/아래로 순서를 바꿔요</span>'
      : '<span>사진을 선택해 주세요</span>';
    $('#img2pdfOpts').hidden = i2p.items.length === 0;
  }

  async function i2pAdd(files) {
    var arr = Array.prototype.slice.call(files || []);
    if (!arr.length) return;
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      if (!/^image\//.test(f.type)) continue;
      try {
        var res = await U.loadImageFromBlob(f);
        i2p.items.push({
          file: f, url: res.url, img: res.img,
          w: res.img.naturalWidth, h: res.img.naturalHeight
        });
      } catch (e) { console.warn('skip', f.name, e); }
    }
    i2pRenderList();
  }

  async function imageToJpegBytes(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    var blob = await U.canvasToBlob(canvas, 'image/jpeg', 0.9);
    canvas.width = canvas.height = 0;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w: w, h: h, size: blob.size };
  }

  async function i2pMake() {
    if (!i2p.items.length) { U.toast('사진을 먼저 선택해 주세요'); return; }
    if (i2p.busy) return;
    i2p.busy = true;
    var btn = $('#img2pdfMake');
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = 'PDF 만드는 중…';
    try {
      var PDFLib = await ensurePdfLib();
      var doc = await PDFLib.PDFDocument.create();
      var A4 = [595.28, 841.89];
      for (var i = 0; i < i2p.items.length; i++) {
        var it = i2p.items[i];
        var jpg = await imageToJpegBytes(it.img);
        var emb = await doc.embedJpg(jpg.bytes);
        var pageW, pageH, drawW, drawH;
        if (i2p.size === 'a4') {
          var landscape = jpg.w > jpg.h;
          pageW = landscape ? A4[1] : A4[0];
          pageH = landscape ? A4[0] : A4[1];
          var m = 24;
          var s = Math.min((pageW - m * 2) / jpg.w, (pageH - m * 2) / jpg.h);
          drawW = jpg.w * s; drawH = jpg.h * s;
          var page = doc.addPage([pageW, pageH]);
          page.drawImage(emb, { x: (pageW - drawW) / 2, y: (pageH - drawH) / 2, width: drawW, height: drawH });
        } else {
          pageW = jpg.w * 72 / 96;
          pageH = jpg.h * 72 / 96;
          var p2 = doc.addPage([pageW, pageH]);
          p2.drawImage(emb, { x: 0, y: 0, width: pageW, height: pageH });
        }
      }
      var bytes = await doc.save();
      var blob = new Blob([bytes], { type: 'application/pdf' });
      var name = U.safeName(U.baseName(i2p.items[0].file.name) + (i2p.items.length > 1 ? '-외' + (i2p.items.length - 1) + '장' : '')) + '.pdf';
      U.downloadBlob(blob, name);
      U.toast('PDF 저장 완료 · ' + U.fmtBytes(blob.size));
    } catch (e) {
      console.warn(e);
      U.toast('PDF를 만들지 못했어요: ' + (e.message || ''));
    } finally {
      i2p.busy = false;
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- 탭 ---- */
  function bindTabs() {
    var tabs = $('#pdfTabs');
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (!b) return;
      U.$$('button', tabs).forEach(function (x) { x.classList.toggle('on', x === b); });
      var tab = b.getAttribute('data-tab');
      $('#pane-pdf2img').hidden = tab !== 'pdf2img';
      $('#pane-img2pdf').hidden = tab !== 'img2pdf';
    });
  }

  function mount() {
    bindTabs();

    $('#pdfInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) p2iLoad(f);
    });

    $('#pdfQuality').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-q]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      p2i.quality = +b.getAttribute('data-q');
      if (p2i.doc) p2iRender();
    });

    $('#pdfFormat').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      p2i.format = b.getAttribute('data-f');
      if (p2i.doc) p2iRender();
    });

    $('#pdfReconvert').addEventListener('click', function () {
      if (!p2i.doc) { U.toast('PDF를 먼저 선택해 주세요'); return; }
      p2iRender();
    });

    $('#pdfZip').addEventListener('click', p2iZip);

    $('#pdfPages').addEventListener('click', function (e) {
      var b = e.target.closest('[data-save]');
      if (!b) return;
      var n = +b.getAttribute('data-save');
      var rec = p2i.pages.filter(function (r) { return r.page === n; })[0];
      if (rec) { U.downloadBlob(rec.blob, pageName(rec)); U.toast('저장했어요'); }
    });

    /* 이미지 → PDF */
    $('#img2pdfInput').addEventListener('change', function (e) {
      i2pAdd(e.target.files);
      e.target.value = '';
    });
    $('#img2pdfSize').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-s]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      i2p.size = b.getAttribute('data-s');
    });
    $('#img2pdfList').addEventListener('click', function (e) {
      var up = e.target.closest('[data-up]'), dn = e.target.closest('[data-down]'), del = e.target.closest('[data-del]');
      if (up) {
        var i = +up.getAttribute('data-up');
        if (i > 0) { var t = i2p.items[i - 1]; i2p.items[i - 1] = i2p.items[i]; i2p.items[i] = t; i2pRenderList(); }
      } else if (dn) {
        var j = +dn.getAttribute('data-down');
        if (j < i2p.items.length - 1) { var t2 = i2p.items[j + 1]; i2p.items[j + 1] = i2p.items[j]; i2p.items[j] = t2; i2pRenderList(); }
      } else if (del) {
        var k = +del.getAttribute('data-del');
        var it = i2p.items[k];
        if (it) URL.revokeObjectURL(it.url);
        i2p.items.splice(k, 1);
        i2pRenderList();
      }
    });
    $('#img2pdfMake').addEventListener('click', i2pMake);
  }

  PT.register('pdf', { mount: mount });
  PT.pdfTools = { p2i: p2i, i2p: i2p, ensurePdfJs: ensurePdfJs, ensurePdfLib: ensurePdfLib };
})();
