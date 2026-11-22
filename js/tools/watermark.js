/* 7. 워터마크 (텍스트 / 로고, 일괄) */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var st = {
    items: [], mode: 'text', text: '', size: 7, opacity: 70, color: '#ffffff',
    shadow: true, pos: 'br', logo: null, logoName: '', busy: false
  };

  function fontFor(fs) {
    return '700 ' + Math.round(fs) + 'px system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",Roboto,sans-serif';
  }

  function drawText(ctx, W, H) {
    var txt = st.text.trim();
    if (!txt) return;
    var base = Math.min(W, H);
    var fs = Math.max(9, Math.round(base * st.size / 100));
    var m = Math.round(base * 0.04);
    ctx.save();
    ctx.font = fontFor(fs);
    ctx.globalAlpha = st.opacity / 100;
    ctx.fillStyle = st.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (st.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = Math.max(1, fs * 0.22);
      ctx.shadowOffsetY = Math.max(1, fs * 0.04);
    }
    var tw = ctx.measureText(txt).width;

    if (st.pos === 'tile') {
      var stepX = tw + fs * 3.2;
      var stepY = fs * 2.6;
      var diag = Math.sqrt(W * W + H * H);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-Math.PI / 9);
      for (var y = -diag / 2; y < diag / 2; y += stepY) {
        for (var x = -diag / 2; x < diag / 2; x += stepX) {
          ctx.fillText(txt, x, y);
        }
      }
      ctx.restore();
      return;
    }

    var px, py;
    if (st.pos === 'tl') { px = m; py = m + fs; }
    else if (st.pos === 'tr') { px = W - m - tw; py = m + fs; }
    else if (st.pos === 'bl') { px = m; py = H - m; }
    else if (st.pos === 'center') { px = (W - tw) / 2; py = H / 2 + fs * 0.34; }
    else { px = W - m - tw; py = H - m; }
    ctx.fillText(txt, px, py);
    ctx.restore();
  }

  function drawLogo(ctx, W, H) {
    var logo = st.logo;
    if (!logo) return;
    var base = Math.min(W, H);
    var targetW = base * st.size / 100 * (st.pos === 'tile' ? 1 : 2.4);
    targetW = Math.min(targetW, W * 0.9);
    var ratio = logo.naturalHeight / logo.naturalWidth;
    var tw = targetW, th = targetW * ratio;
    var m = Math.round(base * 0.04);
    ctx.save();
    ctx.globalAlpha = st.opacity / 100;

    if (st.pos === 'tile') {
      var stepX = tw + base * 0.08, stepY = th + base * 0.08;
      for (var y = -th; y < H + th; y += stepY) {
        for (var x = -tw; x < W + tw; x += stepX) {
          if (((x + y) / stepX) % 2 === 0) continue;
          ctx.drawImage(logo, x, y, tw, th);
        }
      }
      ctx.restore();
      return;
    }

    var px, py;
    if (st.pos === 'tl') { px = m; py = m; }
    else if (st.pos === 'tr') { px = W - m - tw; py = m; }
    else if (st.pos === 'bl') { px = m; py = H - m - th; }
    else if (st.pos === 'center') { px = (W - tw) / 2; py = (H - th) / 2; }
    else { px = W - m - tw; py = H - m - th; }
    ctx.drawImage(logo, px, py, tw, th);
    ctx.restore();
  }

  function applyTo(img, W, H) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, W, H);
    if (st.mode === 'text') drawText(ctx, W, H);
    else drawLogo(ctx, W, H);
    return c;
  }

  function renderPreview() {
    if (!st.items.length) return;
    var img = st.items[0].img;
    var s = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
    var W = Math.max(1, Math.round(img.naturalWidth * s));
    var H = Math.max(1, Math.round(img.naturalHeight * s));
    var out = applyTo(img, W, H);
    var c = $('#wmCanvas');
    c.width = out.width; c.height = out.height;
    c.getContext('2d').drawImage(out, 0, 0);
    out.width = out.height = 0;
  }

  var refresh = U.debounce(renderPreview, 120);

  function renderList() {
    var list = $('#wmList');
    list.innerHTML = '';
    st.items.forEach(function (it) {
      var d = document.createElement('div');
      d.className = 'item';
      d.innerHTML =
        '<img class="thumb" src="' + it.url + '" alt="">' +
        '<div class="meta"><div class="nm">' + esc(it.file.name) + '</div>' +
        '<div class="sz">' + it.srcW + '×' + it.srcH +
        (it.out ? ' · <b>완료 ' + U.fmtBytes(it.out.size) + '</b>' : ' · 대기') + '</div></div>' +
        '<div class="ops"><button class="mini" data-dl="' + it.id + '" ' + (it.out ? '' : 'disabled') + ' aria-label="저장">↓</button>' +
        '<button class="mini" data-rm="' + it.id + '" aria-label="삭제">✕</button></div>';
      list.appendChild(d);
    });
    var doneCount = st.items.filter(function (i) { return i.out; }).length;
    var sum = $('#wmSum');
    if (st.items.length) {
      sum.hidden = false;
      sum.innerHTML = '<span><b>' + doneCount + '/' + st.items.length + '장</b> 적용됨</span><span>' + (doneCount ? '개별 또는 ZIP으로 저장' : '전체 적용을 눌러주세요') + '</span>';
    } else sum.hidden = true;
    $('#wmZipRow').hidden = doneCount === 0;
  }

  async function add(files) {
    var arr = Array.prototype.slice.call(files || []);
    var added = 0;
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      if (!/^image\//.test(f.type)) continue;
      try {
        var res = await U.loadImageFromBlob(f);
        st.items.push({
          id: 'w' + Date.now() + Math.random().toString(36).slice(2, 6),
          file: f, img: res.img, url: res.url,
          srcW: res.img.naturalWidth, srcH: res.img.naturalHeight, out: null
        });
        added++;
      } catch (e) { console.warn('skip', f.name, e); }
    }
    $('#wmOpts').hidden = st.items.length === 0;
    renderList();
    renderPreview();
    if (added) U.toast(added + '장 불러왔어요');
  }

  async function applyAll() {
    if (!st.items.length) { U.toast('사진을 먼저 선택해 주세요'); return; }
    if (st.mode === 'text' && !st.text.trim()) { U.toast('문구를 입력해 주세요'); $('#wmText').focus(); return; }
    if (st.mode === 'logo' && !st.logo) { U.toast('로고 이미지를 선택해 주세요'); return; }
    if (st.busy) return;
    st.busy = true;
    var btn = $('#wmApply');
    btn.disabled = true;
    var old = btn.textContent;
    try {
      for (var i = 0; i < st.items.length; i++) {
        var it = st.items[i];
        btn.textContent = (i + 1) + ' / ' + st.items.length + ' 적용 중…';
        await U.nextFrame();
        var out = applyTo(it.img, it.srcW, it.srcH);
        var type = /png$/i.test(it.file.type) ? 'image/png' : 'image/jpeg';
        var blob = await U.canvasToBlob(out, type, 0.92);
        out.width = out.height = 0;
        it.out = { blob: blob, type: type, size: blob.size };
        renderList();
      }
      U.toast('워터마크를 넣었어요');
    } catch (e) {
      console.warn(e);
      U.toast('적용 중 문제가 생겼어요');
    } finally {
      st.busy = false;
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function downloadOne(it) {
    if (!it.out) return;
    U.downloadBlob(it.out.blob, U.safeName(U.baseName(it.file.name)) + '-wm.' + U.extFor(it.out.type));
  }

  async function zipAll() {
    var files = st.items.filter(function (i) { return i.out; }).map(function (i) {
      return { name: U.safeName(U.baseName(i.file.name)) + '-wm.' + U.extFor(i.out.type), blob: i.out.blob };
    });
    if (!files.length) { U.toast('저장할 이미지가 없어요'); return; }
    try {
      var zip = await U.zipFiles(files);
      U.downloadBlob(zip, 'watermarked-images.zip');
      U.toast('ZIP 저장 완료');
    } catch (e) { U.toast(e.message || 'ZIP 실패'); }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount() {
    $('#wmInput').addEventListener('change', function (e) {
      add(e.target.files);
      e.target.value = '';
    });

    $('#wmMode').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-m]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.mode = b.getAttribute('data-m');
      $('#pane-wm-text').hidden = st.mode !== 'text';
      $('#pane-wm-logo').hidden = st.mode !== 'logo';
      $('#wmColorRow').hidden = false;
      renderPreview();
    });

    $('#wmText').addEventListener('input', function () { st.text = this.value; refresh(); });
    $('#wmSize').addEventListener('input', function () {
      st.size = +this.value;
      $('#wmSizeVal').textContent = this.value + '%';
      refresh();
    });
    $('#wmOpacity').addEventListener('input', function () {
      st.opacity = +this.value;
      $('#wmOpacityVal').textContent = this.value + '%';
      refresh();
    });
    $('#wmColor').addEventListener('input', function () { st.color = this.value; refresh(); });
    $('#wmShadow').addEventListener('change', function () { st.shadow = this.checked; refresh(); });
    $('#wmPos').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.pos = b.getAttribute('data-p');
      refresh();
    });

    $('#wmLogoInput').addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        var res = await U.loadImageFromBlob(f);
        st.logo = res.img;
        st.logoName = f.name;
        $('#wmLogoName').textContent = f.name + ' (' + res.img.naturalWidth + '×' + res.img.naturalHeight + ')';
        U.toast('로고를 불러왔어요');
        renderPreview();
      } catch (err) { U.toast('로고를 열 수 없어요'); }
    });

    $('#wmApply').addEventListener('click', applyAll);
    $('#wmZip').addEventListener('click', zipAll);
    $('#wmList').addEventListener('click', function (e) {
      var dl = e.target.closest('[data-dl]');
      var rm = e.target.closest('[data-rm]');
      if (dl) {
        var it = st.items.filter(function (x) { return x.id === dl.getAttribute('data-dl'); })[0];
        if (it) downloadOne(it);
      } else if (rm) {
        var k = st.items.findIndex(function (x) { return x.id === rm.getAttribute('data-rm'); });
        if (k > -1) { URL.revokeObjectURL(st.items[k].url); st.items.splice(k, 1); renderList(); renderPreview(); }
      }
    });
  }

  PT.register('wm', { mount: mount });
  PT.wmTool = { st: st, applyTo: applyTo, applyAll: applyAll, add: add };
})();
