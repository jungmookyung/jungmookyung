/* 홈 타일 · 라우터 · PWA */
(function () {
  'use strict';
  var PT = window.PT;
  var U = PT.util;

  var ICON_GRID = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2.6" y="2.6" width="5.2" height="5.2" rx="1.1"/><rect x="9.4" y="2.6" width="5.2" height="5.2" rx="1.1"/><rect x="16.2" y="2.6" width="5.2" height="5.2" rx="1.1"/><rect x="2.6" y="9.4" width="5.2" height="5.2" rx="1.1"/><rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.1"/><rect x="16.2" y="9.4" width="5.2" height="5.2" rx="1.1"/><rect x="2.6" y="16.2" width="5.2" height="5.2" rx="1.1"/><rect x="9.4" y="16.2" width="5.2" height="5.2" rx="1.1"/><rect x="16.2" y="16.2" width="5.2" height="5.2" rx="1.1"/></svg>';
  var ICON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 13.7l3.4-3.4"/><path d="M11.4 7.2l1.5-1.5a3.9 3.9 0 015.5 5.5L16.9 12.7"/><path d="M7.1 11.3L5.6 12.8a3.9 3.9 0 005.5 5.5l1.5-1.5"/><path d="M4.5 19.5L19.5 4.5"/></svg>';
  var ICON_PDF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6.2 3h7.6L18 7.2V20a1 1 0 01-1 1H6.2a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M13.8 3v4.4H18"/><text x="11.4" y="17.4" text-anchor="middle" font-size="5.6" font-family="system-ui,sans-serif" font-weight="800" fill="currentColor" stroke="none" letter-spacing="-.4">PDF</text></svg>';
  var ICON_ZIP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4.5"/><path d="M7.6 7.6L10.4 10.4M10.4 7.6v2.8H7.6"/><path d="M16.4 16.4L13.6 13.6M13.6 16.4v-2.8h2.8"/></svg>';
  var ICON_QR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.2" y="3.2" width="6.2" height="6.2" rx="1.2"/><rect x="14.6" y="3.2" width="6.2" height="6.2" rx="1.2"/><rect x="3.2" y="14.6" width="6.2" height="6.2" rx="1.2"/><rect x="14.6" y="14.6" width="2.8" height="2.8" rx=".6" fill="currentColor"/><rect x="18.4" y="18.4" width="2.4" height="2.4" rx=".6" fill="currentColor"/><rect x="14.6" y="18.4" width="2.4" height="2.4" rx=".6" fill="currentColor"/><rect x="18.4" y="14.6" width="2.4" height="2.4" rx=".6" fill="currentColor"/></svg>';
  var ICON_RATIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4.2" width="18" height="15.6" rx="3.2"/><circle cx="8.4" cy="9.4" r="1.55" fill="currentColor" stroke="none"/><path d="M4.2 17.4l4.9-4.6 3.8 3.4 3-2.6 3.9 3.4"/></svg>';
  var ICON_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="3.1"/><path d="M15.1 12v1.35a2.4 2.4 0 004.8 0V12a7.9 7.9 0 10-3.15 6.3"/></svg>';

  var TOOLS = [
    { id: 'exif', label: 'EXIF·모자이크', color: '#1a2538', icon: ICON_GRID },
    { id: 'url', label: 'URL추적제거', color: '#0d7a6f', icon: ICON_LINK },
    { id: 'pdf', label: 'PDF↔이미지', color: '#c62828', icon: ICON_PDF },
    { id: 'compress', label: '이미지압축', color: '#1565c0', icon: ICON_ZIP },
    { id: 'qr', label: 'QR생성기', color: '#263238', icon: ICON_QR },
    { id: 'resize', label: '비율리사이즈', color: '#6a1b9a', icon: ICON_RATIO },
    { id: 'wm', label: '워터마크', color: '#a85513', icon: ICON_MARK }
  ];

  var titles = { home: '포켓 툴즈' };
  TOOLS.forEach(function (t) { titles[t.id] = t.label; });

  function buildTiles() {
    var wrap = U.$('#tiles');
    wrap.innerHTML = '';
    TOOLS.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'tile';
      b.type = 'button';
      b.setAttribute('data-go', t.id);
      b.setAttribute('aria-label', t.label);
      b.innerHTML = '<span class="ic" style="background:' + t.color + '">' + t.icon + '</span>' +
        '<span class="lb">' + t.label + '</span>';
      wrap.appendChild(b);
    });
  }

  var current = 'home';

  function route() {
    var raw = String(location.hash || '').replace(/^#\/?/, '');
    var id = titles[raw] ? raw : 'home';
    U.$$('.screen').forEach(function (s) { s.classList.toggle('on', s.id === 'screen-' + id); });
    U.$('#barTitle').textContent = titles[id];
    U.$('#topbar').hidden = (id === 'home');
    U.$('#btnBack').hidden = (id === 'home');
    document.title = id === 'home' ? '포켓 툴즈' : titles[id] + ' · 포켓 툴즈';
    current = id;
    var api = PT.registry[id];
    if (api && api.show) { try { api.show(); } catch (e) { console.warn(e); } }
    window.scrollTo(0, 0);
  }

  function go(id) {
    if (id === 'home') {
      if (history.length > 1 && location.hash) history.back();
      else location.hash = '#/';
    } else {
      location.hash = '#/' + id;
    }
  }

  function bindNav() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-go]');
      if (t) { location.hash = '#/' + t.getAttribute('data-go'); }
    });
    U.$('#btnBack').addEventListener('click', function () {
      if (location.hash && location.hash !== '#/') history.back();
      else location.hash = '#/';
      setTimeout(function () { if (PT.registry.home && location.hash === '#/' ) route(); }, 50);
    });
    window.addEventListener('hashchange', route);
  }

  /* ---- 홈 화면에 추가 ---- */
  var deferredPrompt = null;
  function setupInstall() {
    var banner = U.$('#installBanner');
    var btnInstall = U.$('#btnInstall');
    var how = U.$('#installHow');
    var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) { banner.hidden = true; return; }

    U.$('#btnInstallHow').addEventListener('click', function () {
      banner.classList.toggle('open');
      this.textContent = banner.classList.contains('open') ? '접기' : '방법 보기';
    });

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      btnInstall.hidden = false;
      U.$('#btnInstallHow').hidden = true;
      how.classList.add('how');
    });

    btnInstall.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        btnInstall.hidden = true;
        U.$('#btnInstallHow').hidden = false;
        banner.classList.remove('open');
      });
    });

    window.addEventListener('appinstalled', function () {
      banner.hidden = true;
      U.toast('홈 화면에 추가되었어요');
    });
  }

  function setupSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW', e); });
    });
  }

  function boot() {
    buildTiles();
    bindNav();
    setupInstall();
    setupSW();
    Object.keys(PT.registry).forEach(function (id) {
      var api = PT.registry[id];
      if (api.mount) { try { api.mount(); } catch (e) { console.error('mount ' + id, e); } }
    });
    if (!location.hash) history.replaceState(null, '', '#/');
    route();
    document.body.classList.add('ready');
  }

  PT.app = { go: go, route: route, tools: TOOLS };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
