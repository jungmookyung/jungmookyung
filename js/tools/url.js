/* 2. URL 추적 파라미터 제거 */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util;
  var $ = U.$;

  var STRIP_PREFIX = ['utm_', 'mc_', 'trk_', 'hsa_', 'matomo_', 'pk_', 'at_', 'ito_', 'sc_', 'vero_', 'oly_', '__hs'];
  var STRIP_EXACT = [
    /* 광고 클릭 ID */
    'fbclid', 'gclid', 'dclid', 'gclsrc', 'gbraid', 'wbraid', 'msclkid', 'ttclid', 'twclid',
    'yclid', 'li_fat_id', 'epik', 'irclickid', 'cvid', 'oicd', 'rb_clickid', 's_cid', 'wickedid',
    /* 인스타·스레드 공유 */
    'igsh', 'igshid', 'igsrc', 'ig_mid', 'ig_rid', 'ig_did', 'share_id', 'share_source', 'share_medium',
    'share_platform', 'share_token', 'slof',
    /* 메일 캠페인 */
    'mc_cid', 'mc_eid', 'mkt_tok', '_hsenc', '_hsmi', '_ga', '_gl', 'gcl_au', '__hssc', '__hstc',
    'hsa_cam', 'hsa_grp', 'hsa_mt', 'hsa_src', 'hsa_ad', 'hsa_acc', 'hsa_net', 'hsa_kw', 'hsa_tgt',
    'hsctatracking',
    /* 쿠팡·커머스 추적 */
    'sourcetype', 'searchid', 'rank', 'isaddedcart', 'trcid', 'traid', 'trk', 'trkcampaign', 'trkinfo',
    'clickeventid', 'searchkeyword',
    /* 범용 공유·리퍼럴 */
    'ref', 'ref_', 'ref_src', 'ref_url', 'referrer', 'referer', 'referral', 'referral_source',
    's', 'si', 'spm', 'scm', 'share', 'from', 'from_source', 'cmpid', 'campaign_id',
    'af_siteid', 'af_ss_channel', 'vero_id', 'vero_conv', 'oly_anon_id', 'oly_enc_id',
    'ga_source', 'ga_medium', 'ga_campaign', 'click_id', 'clickid', 'creative', 'creative_id',
    'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref', 'action_object_map', 'action_type_map',
    'action_ref_map', 'sr_share', 'ab_channel', 'feature'
  ];
  /* 특정 사이트에서만 지우는 파라미터 */
  var STRIP_BY_HOST = {
    'coupang.com': ['src', 'spec', 'addtag', 'bucketid', 'clicktime', 'ctag'],
    'instagram.com': ['hl', 'img_index', 'season'],
    'threads.net': ['hl'],
    'threads.com': ['hl'],
    'tiktok.com': ['_r', '_t', 'is_from_webapp', 'sender_device', 'web_id'],
    'x.com': ['t', 's'],
    'twitter.com': ['t', 's'],
    'facebook.com': ['mibextid', 'sfnsn'],
    'smartstore.naver.com': ['nl-query', 'nl-aid', 'NaPm'],
    'naver.me': []
  };
  var KEEP_BY_HOST = {
    'coupang.com': ['itemid', 'vendoritemid', 'productid', 'item_id', 'vendor_item_id', 'srchitemid'],
    'youtube.com': ['v', 'list', 'index', 't', 'start'],
    'youtu.be': ['t'],
    'google.com': ['q', 'tbm', 'hl', 'start', 'num'],
    'naver.com': ['q', 'where', 'start', 'section', 'query'],
    'baekjo.com': ['q'],
    'tistory.com': ['page'],
    'github.com': ['tab', 'q', 'is', 'state'],
    'notion.so': ['p', 'v'],
    'docs.google.com': ['id', 'gid', 'usp', 'rtpof', 'sd'],
    'drive.google.com': ['id', 'export', 'usp'],
    'open.kakao.com': ['id'],
    'map.naver.com': ['c', 'lvl', 'enc'],
    'map.kakao.com': ['map_open_params', 'target']
  };

  function hostMatches(host, base) {
    return host === base || host.slice(-(base.length + 1)) === '.' + base;
  }

  function keepListFor(host) {
    var keep = [];
    Object.keys(KEEP_BY_HOST).forEach(function (base) {
      if (hostMatches(host, base)) keep = keep.concat(KEEP_BY_HOST[base]);
    });
    // 모든 도메인 공통으로 살리는 파라미터(상품 식별자)
    ['itemid', 'vendoritemid', 'productid'].forEach(function (k) { if (keep.indexOf(k) < 0) keep.push(k); });
    return keep;
  }

  function extraStripFor(host) {
    var list = [];
    Object.keys(STRIP_BY_HOST).forEach(function (base) {
      if (hostMatches(host, base)) list = list.concat(STRIP_BY_HOST[base].map(function (k) { return k.toLowerCase(); }));
    });
    return list;
  }

  function shouldStrip(key, extra) {
    var k = key.toLowerCase();
    if (extra && extra.indexOf(k) > -1) return true;
    if (STRIP_EXACT.indexOf(k) > -1) return true;
    for (var i = 0; i < STRIP_PREFIX.length; i++) {
      if (k.indexOf(STRIP_PREFIX[i]) === 0) return true;
    }
    return false;
  }

  function cleanOne(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var hasProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
    var url;
    try {
      url = new URL(hasProto ? raw : 'https://' + raw);
    } catch (e) {
      return { ok: false, input: raw };
    }
    if (!url.hostname || url.hostname.indexOf('.') < 0) return { ok: false, input: raw };

    var host = url.hostname.replace(/^www\./, '').toLowerCase();
    var keep = keepListFor(host);
    var extra = extraStripFor(host);
    var removed = [];
    var keys = [];
    url.searchParams.forEach(function (v, k) { if (keys.indexOf(k) < 0) keys.push(k); });

    keys.forEach(function (k) {
      if (keep.indexOf(k.toLowerCase()) > -1) return;
      if (shouldStrip(k, extra)) {
        var vals = url.searchParams.getAll(k);
        url.searchParams.delete(k);
        removed.push(vals.length > 1 ? k + ' ×' + vals.length : k);
      }
    });

    /* 아마존 경로에 붙는 /ref=... 제거 */
    if (/amazon\./.test(host)) {
      url.pathname = url.pathname.replace(/\/ref=[^/]+/g, '');
    }

    var cleaned = url.toString();
    // 끝에 남는 ?# 정리
    cleaned = cleaned.replace(/\?$/, '');
    return {
      ok: true,
      original: raw,
      cleaned: cleaned,
      removed: removed,
      host: host,
      protocolFixed: !hasProto ? url.protocol + '//' : ''
    };
  }

  var URL_RE = /https?:\/\/[^\s<>"'`）)】]+/gi;

  function extract(text) {
    var found = (String(text).match(URL_RE) || []).map(function (s) {
      return s.replace(/[.,;:!?]+$/, '');
    });
    if (found.length) return found;
    var t = String(text).trim();
    if (t && /^[\w.-]+\.[a-z]{2,}(\/|\?|#|$)/i.test(t)) return [t];
    return [];
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('복사 실패'));
      } catch (e) { reject(e); }
      ta.remove();
    });
  }

  var lastResults = [];

  function run() {
    var text = $('#urlInput').value;
    if (!text.trim()) { U.toast('링크를 붙여넣어 주세요'); $('#urlInput').focus(); return; }
    var urls = extract(text);
    if (!urls.length) {
      U.toast('주소를 찾지 못했어요. http:// 부터 다시 넣어보세요');
      return;
    }
    lastResults = urls.map(cleanOne).filter(Boolean);
    var okOnes = lastResults.filter(function (r) { return r.ok; });
    if (!okOnes.length) { U.toast('주소 형식을 확인해 주세요'); return; }

    var wrap = $('#urlBlocks');
    wrap.innerHTML = '';
    okOnes.forEach(function (r) {
      var div = document.createElement('div');
      div.className = 'urlblock';
      var chips = r.removed.length
        ? '<div class="chips">' + r.removed.map(function (k) { return '<span class="chip">' + esc(k) + '</span>'; }).join('') + '</div>'
        : '<p class="hint" style="color:#14614a">추적 파라미터가 없었어요. 이미 깔끔한 주소예요.</p>';
      div.innerHTML =
        (okOnes.length > 1 || r.removed.length ? '<div class="orig">' + esc(r.original) + '</div>' : '') +
        '<div class="urlout">' + esc(r.cleaned) + '</div>' +
        chips +
        '<div class="actions"><button class="btn btn-sm btn-ghost" data-copy="' + encodeURIComponent(r.cleaned) + '">📋 복사</button>' +
        (r.removed.length ? '<span class="badge">' + r.removed.length + "개 제거됨</span>" : '') + '</div>';
      wrap.appendChild(div);
    });
    $('#urlCount').textContent = okOnes.length > 1 ? okOnes.length + '개 링크' : (okOnes[0].removed.length ? okOnes[0].removed.length + '개 제거' : '깨끗함');
    $('#urlResult').hidden = false;
    $('#urlResult').scrollIntoView({ behavior: 'smooth', block: 'start' });

    var totalRemoved = okOnes.reduce(function (n, r) { return n + r.removed.length; }, 0);
    U.toast(totalRemoved ? '추적 파라미터 ' + totalRemoved + '개를 지웠어요' : '이미 깔끔한 주소예요');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount() {
    $('#urlClean').addEventListener('click', run);

    $('#urlPaste').addEventListener('click', async function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          var t = await navigator.clipboard.readText();
          if (t) {
            $('#urlInput').value = t.trim();
            run();
            return;
          }
          U.toast('클립보드가 비어 있어요');
          return;
        } catch (e) { /* 권한 없음 → 직접 붙여넣기 안내 */ }
      }
      $('#urlInput').focus();
      U.toast('입력창을 길게 눌러 붙여넣기 해주세요');
    });

    $('#urlClear').addEventListener('click', function () {
      $('#urlInput').value = '';
      $('#urlResult').hidden = true;
      $('#urlInput').focus();
    });

    $('#urlBlocks').addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var text = decodeURIComponent(b.getAttribute('data-copy'));
      copyText(text).then(function () {
        U.toast('복사했어요');
        var old = b.textContent;
        b.textContent = '✓ 복사됨';
        setTimeout(function () { b.textContent = old; }, 1500);
      }).catch(function () { U.toast('복사 권한이 없어요. 주소를 길게 눌러 복사해 주세요'); });
    });

    $('#urlCopyAll').addEventListener('click', function () {
      var text = lastResults.filter(function (r) { return r.ok; }).map(function (r) { return r.cleaned; }).join('\n');
      copyText(text).then(function () { U.toast('정리된 주소를 복사했어요'); })
        .catch(function () { U.toast('복사가 막혔어요. 주소를 길게 눌러 복사해 주세요'); });
    });
  }

  PT.register('url', { mount: mount });
  // 테스트용
  PT.urlClean = { cleanOne: cleanOne, extract: extract };
})();
