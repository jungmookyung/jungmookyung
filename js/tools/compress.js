/* 4. 이미지 압축 (일괄) */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var st = { items: [], format: 'auto', quality: 80, maxW: 0, busy: false, seq: 0 };

  function targetType(file) {
    if (st.format !== 'auto') return st.format;
    var t = (file.type || '').toLowerCase();
    if (t === 'image/jpeg' || t === 'image/png' || t === 'image/webp') return t;
    return 'image/jpeg';
  }

  async function compressOne(item) {
    var type = targetType(item.file);
    var img = item.img;
    var w = img.naturalWidth, h = img.naturalHeight;
    var scale = 1;
    if (st.maxW && w > st.maxW) scale = st.maxW / w;
    var outW = Math.max(1, Math.round(w * scale));
    var outH = Math.max(1, Math.round(h * scale));

    var canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(img, 0, 0, outW, outH);
    var q = st.quality / 100;
    var blob = await U.canvasToBlob(canvas, type, q);
    canvas.width = canvas.height = 0;

    // WebP 미지원 브라우저는 PNG로 떨어짐
    if (type === 'image/webp' && blob.type !== 'image/webp') {
      throw new Error('이 브라우저는 WebP 저장을 지원하지 않아요');
    }
    return { blob: blob, w: outW, h: outH, type: blob.type };
  }

  function renderList() {
    var list = $('#cmpList');
    list.innerHTML = '';
    var oTot = 0, nTot = 0, done = 0;
    st.items.forEach(function (it) {
      oTot += it.file.size;
      if (it.out) { nTot += it.out.blob.size; done++; }
      var saved = it.out ? Math.round((1 - it.out.blob.size / it.file.size) * 100) : null;
      var d = document.createElement('div');
      d.className = 'item';
      d.innerHTML =
        '<img class="thumb" src="' + it.url + '" alt="">' +
        '<div class="meta"><div class="nm">' + esc(it.file.name) + '</div>' +
        '<div class="sz">' + U.fmtBytes(it.file.size) + ' → ' +
        (it.out ? U.fmtBytes(it.out.blob.size) +
          (saved > 0 ? ' <b>(-' + saved + '%)</b>' : (saved < 0 ? ' <i>(+' + Math.abs(saved) + '%)</i>' : '')) : '…') +
        ' · ' + it.srcW + '×' + it.srcH + (it.out && (it.out.w !== it.srcW) ? ' → ' + it.out.w + '×' + it.out.h : '') +
        '</div></div>' +
        '<div class="ops"><button class="mini" data-dl="' + it.id + '" ' + (it.out ? '' : 'disabled') + ' aria-label="저장">↓</button>' +
        '<button class="mini" data-rm="' + it.id + '" aria-label="삭제">✕</button></div>';
      list.appendChild(d);
    });
    if (st.items.length) {
      var pct = oTot ? Math.round((1 - nTot / oTot) * 100) : 0;
      $('#cmpSum').innerHTML = '<span><b>' + done + '/' + st.items.length + '장</b> · ' + U.fmtBytes(oTot) + ' → ' + U.fmtBytes(nTot) + '</span>' +
        '<span class="pct">' + (pct > 0 ? pct + '% 절감' : pct === 0 ? '용량 그대로' : Math.abs(pct) + '% 증가') + '</span>';
    } else {
      $('#cmpSum').innerHTML = '';
    }
    $('#cmpZip').disabled = !done;
  }

  function downloadOne(it) {
    if (!it.out) return;
    var ext = U.extFor(it.out.type);
    U.downloadBlob(it.out.blob, U.safeName(U.baseName(it.file.name)) + '-min.' + ext);
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 220);
  }

  async function run() {
    if (!st.items.length) { renderList(); return; }
    var seq = ++st.seq;
    var prog = $('#cmpProg');
    prog.hidden = false;
    for (var i = 0; i < st.items.length; i++) {
      if (seq !== st.seq) return;
      var it = st.items[i];
      U.setProgress(prog, Math.round((i / st.items.length) * 100), (i + 1) + ' / ' + st.items.length + ' 처리 중…');
      try {
        it.out = await compressOne(it);
      } catch (e) {
        it.out = null;
        if (!st._warned) { st._warned = true; U.toast(e.message || '변환 실패'); }
      }
      renderList();
    }
    if (seq !== st.seq) return;
    U.setProgress(prog, 100, '완료 · ' + st.items.length + '장');
    setTimeout(function () { if (seq === st.seq) prog.hidden = true; }, 700);
    renderList();
  }

  async function add(files) {
    var arr = Array.prototype.slice.call(files || []);
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      if (!/^image\//.test(f.type)) continue;
      try {
        var res = await U.loadImageFromBlob(f);
        st.items.push({
          id: 'i' + (Date.now() + i) + Math.random().toString(36).slice(2, 6),
          file: f, img: res.img, url: res.url,
          srcW: res.img.naturalWidth, srcH: res.img.naturalHeight, out: null
        });
      } catch (e) {
        U.toast(f.name + ' 열 수 없음');
      }
    }
    $('#cmpOpts').hidden = st.items.length === 0;
    renderList();
    run();
  }

  async function zipAll() {
    var files = st.items.filter(function (it) { return it.out; }).map(function (it) {
      return { name: U.safeName(U.baseName(it.file.name)) + '-min.' + U.extFor(it.out.type), blob: it.out.blob };
    });
    if (!files.length) { U.toast('저장할 이미지가 없어요'); return; }
    var btn = $('#cmpZip');
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = 'ZIP 만드는 중…';
    try {
      var zip = await U.zipFiles(files);
      U.downloadBlob(zip, 'compressed-images.zip');
      U.toast('ZIP 저장 완료');
    } catch (e) { U.toast(e.message || 'ZIP 실패'); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount() {
    $('#cmpInput').addEventListener('change', function (e) {
      add(e.target.files);
      e.target.value = '';
    });
    $('#cmpFormat').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.format = b.getAttribute('data-f');
      st.items.forEach(function (it) { it.out = null; });
      schedule();
    });
    $('#cmpQuality').addEventListener('input', function () {
      st.quality = +this.value;
      $('#cmpQualityVal').textContent = this.value + '%';
      schedule();
    });
    $('#cmpMaxWidth').addEventListener('change', function () {
      st.maxW = +this.value;
      st.items.forEach(function (it) { it.out = null; });
      schedule();
    });
    $('#cmpList').addEventListener('click', function (e) {
      var dl = e.target.closest('[data-dl]');
      var rm = e.target.closest('[data-rm]');
      if (dl) {
        var it = st.items.filter(function (x) { return x.id === dl.getAttribute('data-dl'); })[0];
        if (it) downloadOne(it);
      } else if (rm) {
        var k = st.items.findIndex(function (x) { return x.id === rm.getAttribute('data-rm'); });
        if (k > -1) { URL.revokeObjectURL(st.items[k].url); st.items.splice(k, 1); renderList(); }
      }
    });
    $('#cmpZip').addEventListener('click', zipAll);
    $('#cmpClear').addEventListener('click', function () {
      st.items.forEach(function (it) { URL.revokeObjectURL(it.url); });
      st.items = [];
      $('#cmpOpts').hidden = true;
      renderList();
    });
  }

  PT.register('compress', { mount: mount });
  PT.compressTool = { st: st, run: run, add: add };
})();
