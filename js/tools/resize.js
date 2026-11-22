/* 6. 비율 리사이즈 */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var st = { img: null, url: null, name: 'photo', ratio: '1:1', bg: 'white', longEdge: 1080, format: 'image/jpeg' };
  var filterOK = null;

  function canFilter(ctx) {
    if (filterOK != null) return filterOK;
    try {
      ctx.filter = 'blur(2px)';
      filterOK = ctx.filter === 'blur(2px)';
      ctx.filter = 'none';
    } catch (e) { filterOK = false; }
    return filterOK;
  }

  function dims(ratio, size) {
    var p = ratio.split(':').map(Number);
    var rw = p[0], rh = p[1];
    var W, H;
    // 기준값 = 짧은 변 (1080이면 9:16 → 1080×1920)
    if (rw === rh) { W = size; H = size; }
    else if (rw > rh) { W = Math.round(size * rw / rh); H = size; }
    else { W = size; H = Math.round(size * rh / rw); }
    return { W: W, H: H };
  }

  function render() {
    if (!st.img) return;
    var d = dims(st.ratio, st.longEdge);
    var W = d.W, H = d.H;
    var c = $('#rsCanvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    var img = st.img;

    if (st.bg === 'white' || st.bg === 'black') {
      ctx.fillStyle = st.bg === 'white' ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, W, H);
    } else {
      /* 블러 배경: 꽉 차게 확대 + 블러 */
      var cover = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.14;
      var dw = img.naturalWidth * cover, dh = img.naturalHeight * cover;
      var dx = (W - dw) / 2, dy = (H - dh) / 2;
      if (canFilter(ctx)) {
        ctx.save();
        ctx.filter = 'blur(' + Math.max(6, Math.round(Math.min(W, H) * 0.045)) + 'px)';
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      } else {
        var small = document.createElement('canvas');
        small.width = Math.max(1, Math.round(W / 24));
        small.height = Math.max(1, Math.round(H / 24));
        var sc = small.getContext('2d');
        sc.imageSmoothingEnabled = true;
        sc.drawImage(img, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(small, 0, 0, small.width, small.height, dx, dy, dw, dh);
      }
      /* 살짝 어둡게 해서 앞 사진이 도드라지게 */
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);
    }

    /* 원본이 잘리지 않게 contain */
    var s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    var iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);

    $('#rsDims').textContent = W + ' × ' + H + 'px · ' + st.ratio + ' 비율';
  }

  async function save() {
    if (!st.img) return;
    try {
      var blob = await U.canvasToBlob($('#rsCanvas'), st.format, 0.92);
      U.downloadBlob(blob, U.safeName(st.name) + '-' + st.ratio.replace(':', 'x') + '.' + U.extFor(st.format));
      U.toast('저장했어요');
    } catch (e) { U.toast('저장 실패'); }
  }

  async function load(file) {
    if (!file) return;
    try {
      var res = await U.loadImageFromBlob(file);
      if (st.url) URL.revokeObjectURL(st.url);
      st.img = res.img;
      st.url = res.url;
      st.name = U.baseName(file.name);
      $('#rsOpts').hidden = false;
      render();
      U.toast('비율을 골라보세요');
    } catch (e) { U.toast(e.message || '사진을 열 수 없어요'); }
  }

  function mount() {
    $('#rsInput').addEventListener('change', function (e) {
      load(e.target.files && e.target.files[0]);
      e.target.value = '';
    });
    $('#rsRatio').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-r]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.ratio = b.getAttribute('data-r');
      render();
    });
    $('#rsBg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-b]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.bg = b.getAttribute('data-b');
      render();
    });
    $('#rsSize').addEventListener('change', function () { st.longEdge = +this.value; render(); });
    $('#rsFormat').addEventListener('change', function () { st.format = this.value; });
    $('#rsSave').addEventListener('click', save);
  }

  PT.register('resize', { mount: mount });
  PT.resizeTool = { st: st, render: render, load: load, dims: dims };
})();
