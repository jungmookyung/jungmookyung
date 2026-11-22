/* 5. QR 생성기 (링크·텍스트 / 와이파이) */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var st = { mode: 'link', size: 300, margin: 2, dark: '#111111', light: '#ffffff', text: '', ok: false };

  function escWifi(s) {
    return String(s == null ? '' : s).replace(/([\\;,:"])/g, '\\$1');
  }

  function payload() {
    if (st.mode === 'link') return $('#qrText').value.trim();
    var ssid = $('#qrSsid').value.trim();
    if (!ssid) return '';
    var sec = $('#qrSec').value;
    var pass = $('#qrPass').value;
    var hidden = $('#qrHidden').checked;
    var s = 'WIFI:T:' + (sec === 'nopass' ? 'nopass' : sec) + ';S:' + escWifi(ssid) + ';';
    if (sec !== 'nopass' && pass) s += 'P:' + escWifi(pass) + ';';
    if (hidden) s += 'H:true;';
    return s + ';';
  }

  function draw(text) {
    var canvas = $('#qrCanvas');
    var hint = $('#qrEmpty');
    var meta = $('#qrMeta');
    if (!text) {
      var c0 = canvas.getContext('2d');
      c0.clearRect(0, 0, canvas.width, canvas.height);
      canvas.getContext('2d').fillStyle = '#fff';
      canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
      hint.hidden = false;
      hint.textContent = st.mode === 'link' ? '내용을 입력하면 바로 만들어집니다.' : '와이파이 이름을 입력하면 만들어집니다.';
      meta.textContent = '';
      st.ok = false;
      $('#qrSave').disabled = true;
      return;
    }
    if (typeof qrcode !== 'function') {
      U.toast('QR 라이브러리를 불러오지 못했어요');
      return;
    }
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
        qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      }
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      var n = qr.getModuleCount();
      var margin = st.margin;
      var total = n + margin * 2;
      var cell = st.size / total;
      var px = st.size;
      canvas.width = px;
      canvas.height = px;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = st.light;
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = st.dark;
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) {
            var x0 = Math.round((c + margin) * cell);
            var y0 = Math.round((r + margin) * cell);
            var x1 = Math.round((c + margin + 1) * cell);
            var y1 = Math.round((r + margin + 1) * cell);
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          }
        }
      }
      hint.hidden = true;
      meta.textContent = px + '×' + px + 'px';
      st.ok = true;
      $('#qrSave').disabled = false;
    } catch (e) {
      console.warn(e);
      hint.hidden = false;
      hint.textContent = '내용이 너무 길어 QR로 만들 수 없어요. 조금 줄여주세요.';
      meta.textContent = '';
      st.ok = false;
      $('#qrSave').disabled = true;
    }
  }

  var refresh = U.debounce(function () { draw(payload()); }, 120);

  async function save() {
    if (!st.ok) { U.toast('먼저 내용을 입력해 주세요'); return; }
    try {
      var canvas = $('#qrCanvas');
      var blob = await U.canvasToBlob(canvas, 'image/png');
      var raw = payload();
      var slug = (st.mode === 'wifi' ? 'wifi-' + $('#qrSsid').value : raw)
        .replace(/^https?:\/\//, '').replace(/[^\w가-힣.-]+/g, '-').slice(0, 40) || 'qr';
      U.downloadBlob(blob, 'qr-' + U.safeName(slug) + '.png');
      U.toast('PNG로 저장했어요');
    } catch (e) {
      U.toast('저장 실패');
    }
  }

  function bindTabs() {
    $('#qrTabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.mode = b.getAttribute('data-tab');
      $('#pane-qr-link').hidden = st.mode !== 'link';
      $('#pane-qr-wifi').hidden = st.mode !== 'wifi';
      draw(payload());
    });
  }

  function mount() {
    bindTabs();
    $('#qrText').addEventListener('input', refresh);
    $('#qrSsid').addEventListener('input', refresh);
    $('#qrPass').addEventListener('input', refresh);
    $('#qrSec').addEventListener('change', function () {
      $('#qrPass').disabled = this.value === 'nopass';
      refresh();
    });
    $('#qrHidden').addEventListener('change', refresh);
    $('#qrSize').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-s]');
      if (!b) return;
      U.$$('button', this).forEach(function (x) { x.classList.toggle('on', x === b); });
      st.size = +b.getAttribute('data-s');
      draw(payload());
    });
    $('#qrDark').addEventListener('input', function () { st.dark = this.value; draw(payload()); });
    $('#qrLight').addEventListener('input', function () { st.light = this.value; draw(payload()); });
    $('#qrMargin').addEventListener('change', function () { st.margin = +this.value; draw(payload()); });
    $('#qrSave').addEventListener('click', save);
    $('#qrSave').disabled = true;
    draw('');
  }

  PT.register('qr', { mount: mount });
  PT.qrTool = { st: st, payload: payload, draw: draw };
})();
