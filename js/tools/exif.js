/* 1. EXIF 확인 · 모자이크 · 메타데이터 제거 저장 */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var MAX_SIDE = 4096;

  var state = {
    file: null,
    img: null,
    url: null,
    name: 'photo',
    canvas: null,
    ctx: null,
    base: null,
    strokes: [],
    cur: null,
    drawing: false,
    brush: 5, /* 이미지 가로 대비 % */
    w: 0, h: 0
  };

  function brushPx() {
    return Math.max(10, Math.round(state.w * state.brush / 100));
  }

  function fmtDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return String(d);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function fmtShutter(v) {
    if (!v || isNaN(v)) return null;
    if (v >= 1) return v + '초';
    return '1/' + Math.round(1 / v) + '초';
  }

  function buildRows(data) {
    var rows = [];
    if (!data) return rows;
    var make = data.Make || data.make;
    var model = data.Model || data.model;
    var device = [make, model].filter(Boolean).join(' ').trim();
    if (device) rows.push(['기기', device]);

    var shot = data.DateTimeOriginal || data.CreateDate || data.ModifyDate;
    if (shot) rows.push(['촬영일시', fmtDate(shot)]);

    var lat = data.latitude != null ? data.latitude : data.GPSLatitude;
    var lon = data.longitude != null ? data.longitude : data.GPSLongitude;
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      rows.push(['위치(GPS)', lat.toFixed(6) + ', ' + lon.toFixed(6), 'gps']);
      if (data.GPSAltitude != null) rows.push(['고도', Math.round(data.GPSAltitude) + ' m']);
    }

    if (data.LensModel) rows.push(['렌즈', data.LensModel]);
    var exifBits = [];
    if (data.FNumber) exifBits.push('f/' + data.FNumber);
    if (data.ExposureTime) exifBits.push(fmtShutter(data.ExposureTime));
    if (data.ISO) exifBits.push('ISO ' + data.ISO);
    if (data.FocalLength) exifBits.push(Math.round(data.FocalLength) + 'mm');
    if (exifBits.length) rows.push(['촬영 설정', exifBits.join(' · ')]);

    if (data.Software) rows.push(['소프트웨어', data.Software]);
    if (data.Orientation) rows.push(['방향', 'Orientation ' + data.Orientation]);
    if (data.Artist) rows.push(['작성자', data.Artist]);
    if (data.Copyright) rows.push(['저작권', data.Copyright]);
    if (data.ImageDescription) rows.push(['설명', data.ImageDescription]);
    if (data.GPSProcessingMethod) rows.push(['GPS 방식', String(data.GPSProcessingMethod)]);
    return rows;
  }

  async function readExif(file) {
    if (!window.exifr) return null;
    try {
      var data = await exifr.parse(file, {
        tiff: true, ifd0: true, exif: true, gps: true, interop: true,
        iptc: true, jfif: true, ihdr: true,
        translateValues: true, reviveValues: true, mergeOutput: true
      });
      return data || null;
    } catch (e) {
      return null;
    }
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name)) {
      U.toast('이미지 파일을 선택해 주세요');
      return;
    }
    U.toast('사진을 여는 중…');
    try {
      var res = await U.loadImageFromBlob(file);
      if (state.url) URL.revokeObjectURL(state.url);
      state.file = file;
      state.img = res.img;
      state.url = res.url;
      state.name = U.baseName(file.name);

      var w = res.img.naturalWidth || res.img.width;
      var h = res.img.naturalHeight || res.img.height;
      var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      state.w = Math.max(1, Math.round(w * scale));
      state.h = Math.max(1, Math.round(h * scale));

      var c = $('#exifCanvas');
      c.width = state.w; c.height = state.h;
      state.canvas = c;
      state.ctx = c.getContext('2d');
      state.ctx.imageSmoothingQuality = 'high';
      state.ctx.drawImage(res.img, 0, 0, state.w, state.h);
      state.base = document.createElement('canvas');
      state.base.width = state.w; state.base.height = state.h;
      state.base.getContext('2d').drawImage(c, 0, 0);
      state.strokes = [];
      updateMasked();

      $('#exifEditor').hidden = false;
      var dropStrong = document.querySelector('#screen-exif .drop strong');
      if (dropStrong) dropStrong.textContent = '다른 사진 선택';

      /* 메타데이터 표시 */
      var data = await readExif(file);
      var rows = buildRows(data);
      var info = $('#exifInfo');
      var linkWrap = $('#exifGpsLink');
      linkWrap.innerHTML = '';
      if (!rows.length) {
        info.innerHTML = '<dt>결과</dt><dd>메타데이터 없음 — 위치·기기 정보가 들어있지 않아요.</dd>' +
          '<dt>파일</dt><dd>' + U.fmtBytes(file.size) + ' · ' + w + '×' + h + '</dd>';
        $('#exifCount').textContent = '없음';
      } else {
        var html = '';
        rows.forEach(function (r) {
          html += '<dt>' + r[0] + '</dt><dd' + (r[2] === 'gps' ? ' class="mono"' : '') + '>' + escapeHtml(r[1]) + '</dd>';
        });
        var gps = rows.filter(function (r) { return r[2] === 'gps'; })[0];
        if (gps) {
          linkWrap.innerHTML = '<div class="notice">📍 위치 정보가 들어 있어요. 공유 전에 아래에서 가리고 저장하면 완전히 사라집니다.</div>' +
            '<div class="actions"><a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
            encodeURIComponent(gps[1]) + '">지도에서 보기</a></div>';
        }
        html += '<dt>파일</dt><dd>' + U.fmtBytes(file.size) + ' · ' + w + '×' + h +
          (scale < 1 ? ' (편집용 ' + state.w + '×' + state.h + ')' : '') + '</dd>';
        info.innerHTML = html;
        $('#exifCount').textContent = rows.length + '개 항목';
      }
      U.toast('불러왔어요. 문질러서 가리세요');
    } catch (e) {
      console.warn(e);
      U.toast(e.message || '사진을 열 수 없어요');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- 모자이크 ---- */
  var scratch = document.createElement('canvas');

  function pixelate(x, y, size) {
    var s = Math.max(6, Math.round(size));
    var half = s / 2;
    var rx = Math.round(x - half), ry = Math.round(y - half);
    var rw = s, rh = s;
    if (rx < 0) { rw += rx; rx = 0; }
    if (ry < 0) { rh += ry; ry = 0; }
    if (rx + rw > state.w) rw = state.w - rx;
    if (ry + rh > state.h) rh = state.h - ry;
    if (rw < 2 || rh < 2) return;
    var block = Math.max(4, Math.round(s / 5));
    var sw = Math.max(1, Math.round(rw / block));
    var sh = Math.max(1, Math.round(rh / block));
    scratch.width = sw; scratch.height = sh;
    var sc = scratch.getContext('2d');
    sc.imageSmoothingEnabled = true;
    sc.drawImage(state.canvas, rx, ry, rw, rh, 0, 0, sw, sh);
    var ctx = state.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, 0, 0, sw, sh, rx, ry, rw, rh);
    ctx.imageSmoothingEnabled = true;
  }

  function renderAll() {
    var ctx = state.ctx;
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.drawImage(state.base, 0, 0);
    state.strokes.forEach(function (st) {
      st.points.forEach(function (p) { pixelate(p.x, p.y, st.size); });
    });
  }

  function pos(e) {
    var c = state.canvas;
    var r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height)
    };
  }

  function updateMasked() {
    $('#exifMasked').textContent = state.strokes.length ? state.strokes.length + '곳 가림' : '';
    $('#exifUndo').disabled = !state.strokes.length;
  }

  function bindCanvas() {
    var c = $('#exifCanvas');
    c.addEventListener('pointerdown', function (e) {
      if (!state.base) return;
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
      state.drawing = true;
      var p = pos(e);
      state.cur = { size: brushPx(), points: [p] };
      state.strokes.push(state.cur);
      pixelate(p.x, p.y, brushPx());
      updateMasked();
    });
    c.addEventListener('pointermove', function (e) {
      if (!state.drawing || !state.cur) return;
      e.preventDefault();
      var p = pos(e);
      var bs = state.cur.size;
      var last = state.cur.points[state.cur.points.length - 1];
      var d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < Math.max(3, bs / 6)) return;
      var steps = Math.min(16, Math.ceil(d / Math.max(3, bs / 8)));
      for (var i = 1; i <= steps; i++) {
        var q = { x: last.x + (p.x - last.x) * i / steps, y: last.y + (p.y - last.y) * i / steps };
        state.cur.points.push(q);
        pixelate(q.x, q.y, bs);
      }
    });
    function end() {
      if (!state.drawing) return;
      state.drawing = false;
      state.cur = null;
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && e.buttons === 0) end(); });
  }

  async function save() {
    if (!state.base) return;
    var fmt = $('#exifFormat').value;
    var btn = $('#exifSave');
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = '저장 중…';
    try {
      var blob = await U.canvasToBlob(state.canvas, fmt, 0.94);
      U.downloadBlob(blob, U.safeName(state.name) + '-clean.' + U.extFor(fmt));
      U.toast('저장 완료 — 위치·기기 정보가 제거됐어요');
    } catch (e) {
      U.toast(e.message || '저장 실패');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function mount() {
    $('#exifInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
      e.target.value = '';
    });
    $('#exifBrush').addEventListener('input', function () {
      state.brush = +this.value;
      $('#exifBrushVal').textContent = this.value + '%';
    });
    $('#exifUndo').addEventListener('click', function () {
      if (!state.strokes.length) { U.toast('되돌릴 게 없어요'); return; }
      state.strokes.pop();
      renderAll();
      updateMasked();
    });
    $('#exifReset').addEventListener('click', function () {
      if (!state.base) return;
      state.strokes = [];
      renderAll();
      updateMasked();
      U.toast('초기화했어요');
    });
    $('#exifSave').addEventListener('click', save);
    bindCanvas();
    updateMasked();
  }

  PT.register('exif', { mount: mount });
})();
