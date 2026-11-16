/* ════════════════════════════════════════════════════════════════════
   RICETTARIO BIANCO — strato account
   · login con Google (Supabase Auth) e cambio account
   · dati separati per account: database (RLS) + memoria del dispositivo
     (ogni account ha il suo spazio in localStorage/sessionStorage/IndexedDB)
   · logo, nome e sottotitolo personalizzabili per account, in home e
     nella pagina d'accesso (anche con indirizzo personale ?a=nome)
   · sezioni del ricettario personalizzabili
   · impostazioni (documenti di stampa, piatti, tema, ecc.) sincronizzate
   Caricato in <head> PRIMA dello script dell'app.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var C = window.WL_CONFIG || {};
  if (C.supabaseUrl) C.supabaseUrl = String(C.supabaseUrl).trim().replace(/\/(rest|auth|storage)\/v1.*$/i, '').replace(/\/+$/, '');
  var AUTH_KEY = 'wl_auth';
  var GLOBAL_KEY = /^(wl_|sb-)/;            // chiavi comuni a tutto il dispositivo
  var SYNC_KEYS = ['mdl_docs', 'mdl_piatti_custom', 'mdl_th', 'mdl_hidden', 'mdl_pct', 'mdl_pct_base', 'mdl_sort', 'mdl_tr_lang', 'mdl_sections', 'mdl_brand'];
  var PAL = ['colazioni', 'fine-dining', 'gelateria', 'torte'];
  var ICONS = {"colazioni": "<svg class=\"panel-icon\" width=\"38\" height=\"38\" viewBox=\"0 0 64 64\" fill=\"none\"> <path d=\"M20 28Q20 44 32 44Q44 44 44 28\" stroke=\"#fff\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" opacity=\".8\"/> <line x1=\"20\" y1=\"28\" x2=\"44\" y2=\"28\" stroke=\"#fff\" stroke-width=\"1.6\" stroke-linecap=\"round\" opacity=\".8\"/> <line x1=\"27\" y1=\"16\" x2=\"27\" y2=\"22\" stroke=\"#fff\" stroke-width=\"1.3\" stroke-linecap=\"round\" opacity=\".5\"/> <line x1=\"32\" y1=\"14\" x2=\"32\" y2=\"22\" stroke=\"#fff\" stroke-width=\"1.3\" stroke-linecap=\"round\" opacity=\".5\"/> <line x1=\"37\" y1=\"16\" x2=\"37\" y2=\"22\" stroke=\"#fff\" stroke-width=\"1.3\" stroke-linecap=\"round\" opacity=\".5\"/> </svg>", "fine-dining": "<svg class=\"panel-icon\" width=\"38\" height=\"38\" viewBox=\"0 0 64 64\" fill=\"none\"> <circle cx=\"32\" cy=\"34\" r=\"16\" stroke=\"#C9A84C\" stroke-width=\"1.4\" opacity=\".4\"/> <circle cx=\"32\" cy=\"34\" r=\"10\" stroke=\"#C9A84C\" stroke-width=\"1\" opacity=\".6\"/> <path d=\"M24 26Q24 30 26 32L26 50M40 16L40 28Q40 32 38 34L38 50\" stroke=\"#C9A84C\" stroke-width=\"1.4\" stroke-linecap=\"round\" opacity=\".7\"/> </svg>", "gelateria": "<svg class=\"panel-icon\" width=\"38\" height=\"38\" viewBox=\"0 0 64 64\" fill=\"none\"> <path d=\"M24 20Q24 14 32 14Q40 14 40 20L38 38Q36 46 32 48Q28 46 26 38Z\" stroke=\"#fff\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\".8\"/> <path d=\"M26 24Q32 28 38 24\" stroke=\"#fff\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\" opacity=\".5\"/> </svg>", "torte": "<svg class=\"panel-icon\" width=\"38\" height=\"38\" viewBox=\"0 0 64 64\" fill=\"none\"> <ellipse cx=\"32\" cy=\"42\" rx=\"18\" ry=\"6\" stroke=\"#fff\" stroke-width=\"1.4\" fill=\"none\" opacity=\".5\"/> <path d=\"M14 42L14 32Q14 26 32 26Q50 26 50 32L50 42\" stroke=\"#fff\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\" opacity=\".8\"/> <line x1=\"32\" y1=\"11\" x2=\"32\" y2=\"19\" stroke=\"#fff\" stroke-width=\"1.3\" stroke-linecap=\"round\" opacity=\".6\"/> </svg>", "tutti": "<svg class=\"panel-icon\" width=\"38\" height=\"38\" viewBox=\"0 0 64 64\" fill=\"none\"> <rect x=\"12\" y=\"14\" width=\"18\" height=\"22\" rx=\"2\" stroke=\"#C9A84C\" stroke-width=\"1.4\" fill=\"none\" opacity=\".7\"/> <rect x=\"34\" y=\"18\" width=\"18\" height=\"22\" rx=\"2\" stroke=\"#C9A84C\" stroke-width=\"1.4\" fill=\"none\" opacity=\".5\"/> <rect x=\"18\" y=\"30\" width=\"28\" height=\"18\" rx=\"2\" stroke=\"#C9A84C\" stroke-width=\"1.4\" fill=\"none\" opacity=\".8\"/> </svg>", "biblioteca": "<svg class=\"panel-icon\" width=\"38\" height=\"38\" viewBox=\"0 0 64 64\" fill=\"none\"> <path d=\"M14 16h12a6 6 0 0 1 6 6v28a5 5 0 0 0-5-5H14z\" stroke=\"#fff\" stroke-width=\"1.5\" stroke-linejoin=\"round\" opacity=\".8\"/> <path d=\"M50 16H38a6 6 0 0 0-6 6v28a5 5 0 0 1 5-5h13z\" stroke=\"#C9A84C\" stroke-width=\"1.5\" stroke-linejoin=\"round\" opacity=\".8\"/> </svg>"};
  var DEFAULT_SECTIONS = [
    { k: 'colazioni', l: 'Monoporzioni', sub: 'Impasti · Creme · Lievitati' },
    { k: 'fine-dining', l: 'Fine Dining', sub: 'Alta cucina · Dessert' },
    { k: 'gelateria', l: 'Gelateria', sub: 'Gelati · Sorbetti · Semifreddi' },
    { k: 'torte', l: 'Torte', sub: 'Torte · Mousse · Entremet' }
  ];
  var DEFAULT_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#F5EFE0"/>' +
    '<circle cx="60" cy="60" r="44" fill="none" stroke="#C4933A" stroke-width="1.6"/>' +
    '<path d="M40 70q0-22 20-22t20 22z" fill="none" stroke="#8B6A2E" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M36 74h48" stroke="#8B6A2E" stroke-width="2" stroke-linecap="round"/><circle cx="60" cy="44" r="3" fill="#C4933A"/></svg>');

  /* ── sessione salvata (lettura sincrona: serve prima che parta l'app) ── */
  function readStoredSession() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
      if (raw && raw.currentSession) raw = raw.currentSession;
      return raw && raw.user ? raw : null;
    } catch (e) { return null; }
  }
  var stored = readStoredSession();
  var UID = stored && stored.user && stored.user.id || null;
  var TOKEN = stored && stored.access_token || '';
  var USER = stored && stored.user || null;
  /* ── ricettario attivo: il proprio oppure quello di una brigata ── */
  var WS_KEY = 'wl_ws:' + (UID || 'anon');
  var WSI = null; try { WSI = JSON.parse(window.localStorage.getItem(WS_KEY) || 'null'); } catch (e) {}
  var WS = (UID && WSI && WSI.ws) || UID;
  var ROLE = WS && WS !== UID ? (WSI.role || 'staff') : 'owner';
  var TEAMS = (WSI && WSI.teams) || [];
  var PREFIX = 'u:' + (UID || 'anon') + ':' + (WS && WS !== UID ? 'w:' + WS + ':' : '');
  var ROLES = { owner: 'Titolare', admin: 'Admin', pastry_chef: 'Pastry Chef', demi_chef: 'Demi Chef', commis: 'Commis', staff: 'Staff' };
  var PERSONAL_KEYS = ['mdl_th', 'mdl_hidden', 'mdl_pct', 'mdl_pct_base', 'mdl_sort', 'mdl_tr_lang'];

  /* ── memoria del dispositivo separata per account ── */
  var SP = Storage.prototype, oGet = SP.getItem, oSet = SP.setItem, oDel = SP.removeItem;
  function mapKey(k) { k = String(k); return GLOBAL_KEY.test(k) ? k : PREFIX + k; }
  var suppressDirty = false;
  SP.getItem = function (k) { return oGet.call(this, mapKey(k)); };
  SP.setItem = function (k, v) {
    oSet.call(this, mapKey(k), v);
    if (!suppressDirty && this === window.localStorage && SYNC_KEYS.indexOf(String(k)) > -1) WL._dirty();
  };
  SP.removeItem = function (k) {
    oDel.call(this, mapKey(k));
    if (!suppressDirty && this === window.localStorage && SYNC_KEYS.indexOf(String(k)) > -1) WL._dirty();
  };
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsJSON(k, def) { try { var v = JSON.parse(lsGet(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var WL = window.WL = {
    sb: null,
    uid: UID,
    ws: WS,
    prefix: PREFIX,
    roles: ROLES,
    role: function () { return ROLE; },
    roleLabel: function (r) { return ROLES[r || ROLE] || r || ''; },
    inTeam: function () { return !!(WS && WS !== UID); },
    canEdit: function () { return ROLE === 'owner' || ROLE === 'admin' || ROLE === 'pastry_chef'; },
    isAdmin: function () { return ROLE === 'owner' || ROLE === 'admin'; },
    teams: function () { return TEAMS; },
    signedIn: function () { return !!UID; },
    user: function () { return USER; },
    email: function () { return USER && USER.email || ''; },
    token: function () { return TOKEN || C.supabaseAnonKey || ''; },
    url: C.supabaseUrl || '',
    key: C.supabaseAnonKey || '',
    apiH: function (extra) {
      var h = { 'Content-Type': 'application/json' };
      if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
      if (extra) for (var k in extra) h[k] = extra[k];
      return h;
    }
  };
  window.WL_TOKEN = function () { return WL.token(); };

  /* ══════════════ SEZIONI ══════════════ */
  WL.sections = function () {
    var s = lsJSON('mdl_sections', null);
    if (!Array.isArray(s) || !s.length) s = DEFAULT_SECTIONS;
    return s.filter(function (x) { return x && x.k && x.l; });
  };
  WL.saveSections = function (list) { lsSet('mdl_sections', JSON.stringify(list)); WL.applySections(); };
  WL.secLabel = function (k) {
    if (k === 'tutti') return 'Tutti i Ricettari';
    if (k === 'biblioteca') return 'Biblioteca';
    var s = WL.sections().filter(function (x) { return x.k === k; })[0];
    return s ? s.l : (k || '');
  };
  WL.secMap = function () { var m = {}; WL.sections().forEach(function (s) { m[s.k] = s.l; }); return m; };
  WL.secPairs = function () { return WL.sections().map(function (s) { return [s.k, s.l]; }); };
  WL.secKeys = function () { return WL.sections().map(function (s) { return s.k; }); };
  WL.defSec = function () { var s = WL.sections(); return s.length ? s[0].k : 'colazioni'; };
  WL.secOptions = function (sel, opts) {
    // riempie un <select> con le sezioni (opts.first: [valore, etichetta], opts.tutti: aggiunge "Tutte")
    if (!sel) return;
    var cur = sel.value; opts = opts || {};
    sel.innerHTML = '';
    if (opts.first) { var f = document.createElement('option'); f.value = opts.first[0]; f.textContent = opts.first[1]; sel.appendChild(f); }
    WL.sections().forEach(function (s) { var o = document.createElement('option'); o.value = s.k; o.textContent = s.l; sel.appendChild(o); });
    if (opts.tutti) { var t = document.createElement('option'); t.value = 'tutti'; t.textContent = 'Tutte'; sel.appendChild(t); }
    var ok = Array.prototype.some.call(sel.options, function (o) { return o.value === cur; });
    if (ok) sel.value = cur;
  };
  WL.applySections = function () {
    var secs = WL.sections();
    var L = {}, S = {};
    secs.forEach(function (s) { L[s.k] = s.l; S[s.k] = s.sub || ''; });
    L.tutti = 'Tutti i Ricettari'; S.tutti = 'Tutte le ricette';
    try { window.SLABELS = L; window.SSUBS = S; } catch (e) {}
    try { window.AI_SECTIONS = WL.secMap(); } catch (e) {}
    ['mSec', 'aiSec', 'moveSec', 'importSec'].forEach(function (id) { WL.secOptions($(id)); });
    WL.secOptions($('newPiattoSec'), { first: ['', 'Sez. attuale'], tutti: true });
    WL.renderPanels();
  };
  WL.renderPanels = function () {
    var box = $('landPanels'); if (!box) return;
    var secs = WL.sections();
    var all = secs.map(function (s, i) { return { k: s.k, l: s.l, sub: s.sub || '', pal: PAL[i % PAL.length], icon: ICONS[s.k] || ICONS[PAL[i % PAL.length]] }; });
    all.push({ k: 'tutti', l: 'Tutti i Ricettari', sub: 'Tutte le ricette', pal: 'tutti', icon: ICONS.tutti });
    all.push({ k: 'biblioteca', l: 'Biblioteca', sub: 'Ebook · PDF · Note', pal: 'biblioteca', icon: ICONS.biblioteca });
    var n = all.length, pad = function (x) { return (x < 10 ? '0' : '') + x; };
    box.innerHTML = all.map(function (p, i) {
      var words = esc(p.l).split(' ');
      var title = '<em>' + words[0] + '</em>' + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
      return '<div class="panel" data-sec="' + esc(p.k) + '" data-pal="' + p.pal + '"><div class="panel-bg"></div><div class="panel-noise"></div>' +
        '<div class="panel-body fd"><p class="panel-num fsc">' + pad(i + 1) + ' / ' + pad(n) + '</p>' + (p.icon || '') +
        '<p class="panel-title">' + title + '</p><p class="panel-sub fsc">' + esc(p.sub) + '</p></div><div class="panel-arr fd">&rsaquo;</div></div>';
    }).join('');
    if (WL._booted) {
      Array.prototype.forEach.call(box.querySelectorAll('.panel'), function (p) {
        p.addEventListener('click', function () { window.openSection(p.dataset.sec); });
      });
    }
  };

  /* ══════════════ LOGO E NOME ══════════════ */
  WL.brand = function () {
    var b = lsJSON('mdl_brand', {}) || {};
    return { name: b.name || 'Il mio Ricettario', sub: b.sub || 'Ricettario Professionale', logo: b.logo || '', slug: b.slug || '' };
  };
  WL.saveBrand = function (b) {
    var cur = lsJSON('mdl_brand', {}) || {};
    for (var k in b) cur[k] = b[k];
    lsSet('mdl_brand', JSON.stringify(cur));
    WL.applyBrand();
  };
  WL.logoSrc = function () { return WL.brand().logo || DEFAULT_LOGO; };
  WL.applyBrand = function () {
    var b = WL.brand(), src = WL.logoSrc();
    Array.prototype.forEach.call(document.querySelectorAll('.wl-logo'), function (im) { im.src = src; im.alt = b.name; });
    Array.prototype.forEach.call(document.querySelectorAll('.wl-name'), function (e) { e.textContent = b.name; });
    Array.prototype.forEach.call(document.querySelectorAll('.wl-sub'), function (e) { e.textContent = b.sub; });
    document.title = 'Ricettario · ' + b.name;
    // monogramma decorativo dietro la home: iniziali del nome dell'account
    var ini = b.name.split(/\s+/).filter(function (w) { return /^[A-Za-zÀ-ÿ]/.test(w) && w.length > 2; }).map(function (w) { return w[0].toUpperCase(); }).join('').slice(0, 3);
    document.documentElement.style.setProperty('--wl-mono', JSON.stringify(ini || 'R'));
    // la pagina d'accesso di questo dispositivo mostra l'ultimo account usato
    try { oSet.call(window.localStorage, 'wl_last_brand', JSON.stringify({ name: b.name, sub: b.sub, logo: b.logo || '' })); } catch (e) {}
    WL._rememberAccount();
  };
  WL._rememberAccount = function () {
    if (!UID) return;
    var list = []; try { list = JSON.parse(oGet.call(window.localStorage, 'wl_accounts') || '[]'); } catch (e) {}
    var b = WL.brand();
    list = list.filter(function (a) { return a.id !== UID; });
    list.unshift({ id: UID, email: WL.email(), name: b.name, logo: b.logo ? b.logo.slice(0, 60000) : '' });
    try { oSet.call(window.localStorage, 'wl_accounts', JSON.stringify(list.slice(0, 6))); } catch (e) {}
  };

  // ridimensiona l'immagine del logo (quadrata, max 512 px) → data URL leggero
  WL.readLogo = function (file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Scegli un’immagine (PNG, JPG, WEBP, SVG)'));
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('Impossibile leggere il file')); };
      fr.onload = function () {
        if (/svg/.test(file.type) && fr.result.length < 120000) return res(fr.result);
        var img = new Image();
        img.onload = function () {
          var max = 512, w = img.naturalWidth, h = img.naturalHeight, sc = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * sc); c.height = Math.round(h * sc);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          var out = c.toDataURL('image/webp', 0.9);
          if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
          if (out.length > 450000) out = c.toDataURL('image/jpeg', 0.82);
          res(out);
        };
        img.onerror = function () { rej(new Error('Immagine non valida')); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  /* ══════════════ RITAGLIO GUIDATO DEL LOGO ══════════════
     Sposta col dito o col mouse, ingrandisci (cursore, rotellina o due dita),
     ruota di 90°, scegli lo sfondo; anteprima rotonda come in home e nell'accesso. */
  WL.fileToDataURL = function (file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Scegli un’immagine (PNG, JPG, WEBP, SVG)'));
      if (file.size > 25 * 1024 * 1024) return rej(new Error('Immagine troppo grande (massimo 25 MB)'));
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('Impossibile leggere il file')); };
      fr.onload = function () { res(fr.result); };
      fr.readAsDataURL(file);
    });
  };
  WL.cropLogo = function (src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onerror = function () { alert('Immagine non valida'); resolve(null); };
      img.onload = function () { open(); };
      img.src = src;
      function open() {
        var V = 300, OUT = 512;
        var iw = img.naturalWidth || 512, ih = img.naturalHeight || 512;
        var st = { rot: 0, zoom: 1, x: 0, y: 0, bg: 'white' };
        var ov = document.createElement('div'); ov.className = 'wl-bg wl-crop-bg';
        ov.innerHTML =
          '<div class="wl-sh wl-crop" role="dialog" aria-label="Ritaglia il logo">' +
          '<div class="wl-hd"><b class="fd">Ritaglia il logo</b><button type="button" class="wl-x" aria-label="Chiudi">&times;</button></div>' +
          '<p class="wl-n">Trascina per spostare, usa il cursore, la rotellina o due dita per ingrandire. Il cerchio mostra come apparirà in home e nell’accesso.</p>' +
          '<div class="wl-crop-stage"><canvas width="' + V * 2 + '" height="' + V * 2 + '"></canvas><div class="wl-crop-mask"></div></div>' +
          '<div class="wl-crop-zoom"><span>−</span><input type="range" min="0" max="100" value="0" aria-label="Ingrandimento"><span>+</span></div>' +
          '<div class="wl-crop-tools">' +
          '<button type="button" class="wl-btn" data-a="rot">↻ Ruota</button>' +
          '<button type="button" class="wl-btn" data-a="fit">Adatta</button>' +
          '<button type="button" class="wl-btn" data-a="fill">Riempi</button>' +
          '<button type="button" class="wl-btn" data-a="center">Centra</button></div>' +
          '<div class="wl-crop-tools"><span class="wl-n">Sfondo</span>' +
          '<button type="button" class="wl-chipb on" data-bg="white">Bianco</button><button type="button" class="wl-chipb" data-bg="cream">Crema</button>' +
          '<button type="button" class="wl-chipb" data-bg="black">Nero</button><button type="button" class="wl-chipb" data-bg="none">Trasparente</button></div>' +
          '<div class="wl-crop-tools"><span class="wl-n">Anteprima</span>' +
          '<button type="button" class="wl-chipb on" data-sh="circle">Cerchio</button><button type="button" class="wl-chipb" data-sh="square">Quadrato</button></div>' +
          '<div class="wl-row" style="margin-top:12px"><button type="button" class="wl-btn" data-a="cancel">Annulla</button><button type="button" class="wl-btn gold" data-a="ok" style="flex:1">Usa questo ritaglio</button></div></div>';
        document.body.appendChild(ov);
        requestAnimationFrame(function () { ov.classList.add('on'); });
        var cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), range = ov.querySelector('input[type=range]');
        var BG = { white: '#ffffff', cream: '#F5EFE0', black: '#141414', none: null };
        function dims() { var r = st.rot % 180 !== 0; return { w: r ? ih : iw, h: r ? iw : ih }; }
        function minZ() { var d = dims(); return Math.min(V / d.w, V / d.h); }
        function coverZ() { var d = dims(); return Math.max(V / d.w, V / d.h); }
        function maxZ() { return coverZ() * 6; }
        function toRange() { var a = Math.log(minZ()), b = Math.log(maxZ()); range.value = b > a ? Math.round((Math.log(st.zoom) - a) / (b - a) * 100) : 0; }
        function clampPan() {
          var d = dims(), w = d.w * st.zoom, h = d.h * st.zoom;
          var mx = Math.max(0, (w - V) / 2), my = Math.max(0, (h - V) / 2);
          st.x = Math.max(-mx, Math.min(mx, st.x)); st.y = Math.max(-my, Math.min(my, st.y));
        }
        function paint(c, size) {
          var k = size / V;
          c.save(); c.clearRect(0, 0, size, size);
          if (BG[st.bg]) { c.fillStyle = BG[st.bg]; c.fillRect(0, 0, size, size); }
          c.translate(size / 2 + st.x * k, size / 2 + st.y * k); c.rotate(st.rot * Math.PI / 180);
          var w = iw * st.zoom * k, h = ih * st.zoom * k;
          c.imageSmoothingQuality = 'high'; c.drawImage(img, -w / 2, -h / 2, w, h); c.restore();
        }
        function draw() { clampPan(); paint(ctx, V * 2); }
        function setZoom(z, cx, cy) {
          var old = st.zoom; z = Math.max(minZ(), Math.min(maxZ(), z));
          if (cx != null) { st.x = cx - (cx - st.x) * z / old; st.y = cy - (cy - st.y) * z / old; }
          st.zoom = z; toRange(); draw();
        }
        st.zoom = coverZ(); toRange(); draw();
        range.oninput = function () { var a = Math.log(minZ()), b = Math.log(maxZ()); setZoom(Math.exp(a + (b - a) * range.value / 100)); };
        var pts = {}, last = null, pinch = null;
        function rel(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * V - V / 2, y: (e.clientY - r.top) / r.height * V - V / 2 }; }
        cv.addEventListener('pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} pts[e.pointerId] = rel(e); last = rel(e); pinch = null; });
        cv.addEventListener('pointermove', function (e) {
          if (!pts[e.pointerId]) return;
          pts[e.pointerId] = rel(e);
          var ids = Object.keys(pts);
          if (ids.length >= 2) {
            var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            if (pinch && pinch.d > 0) { setZoom(st.zoom * d / pinch.d, m.x, m.y); st.x += m.x - pinch.m.x; st.y += m.y - pinch.m.y; draw(); }
            pinch = { d: d, m: m }; last = null; return;
          }
          var p = rel(e); if (last) { st.x += p.x - last.x; st.y += p.y - last.y; draw(); } last = p;
        });
        function up(e) { delete pts[e.pointerId]; pinch = null; last = null; }
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        cv.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); setZoom(st.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });
        cv.tabIndex = 0;
        cv.addEventListener('keydown', function (e) { var s = 8; if (e.key === 'ArrowLeft') st.x -= s; else if (e.key === 'ArrowRight') st.x += s; else if (e.key === 'ArrowUp') st.y -= s; else if (e.key === 'ArrowDown') st.y += s; else if (e.key === '+') { setZoom(st.zoom * 1.1); return; } else if (e.key === '-') { setZoom(st.zoom / 1.1); return; } else return; e.preventDefault(); draw(); });
        function done(val) { ov.classList.remove('on'); setTimeout(function () { ov.remove(); }, 200); resolve(val); }
        ov.querySelector('.wl-x').onclick = function () { done(null); };
        ov.onclick = function (e) { if (e.target === ov) done(null); };
        Array.prototype.forEach.call(ov.querySelectorAll('[data-a]'), function (b) {
          b.onclick = function () {
            var a = b.dataset.a;
            if (a === 'rot') { st.rot = (st.rot + 90) % 360; st.x = st.y = 0; st.zoom = Math.max(minZ(), Math.min(maxZ(), st.zoom)); toRange(); draw(); }
            else if (a === 'fit') { st.x = st.y = 0; setZoom(minZ()); }
            else if (a === 'fill') { st.x = st.y = 0; setZoom(coverZ()); }
            else if (a === 'center') { st.x = st.y = 0; draw(); }
            else if (a === 'cancel') done(null);
            else if (a === 'ok') {
              var out = document.createElement('canvas'); out.width = out.height = OUT;
              paint(out.getContext('2d'), OUT);
              var d;
              if (st.bg === 'none') d = out.toDataURL('image/png');
              else { d = out.toDataURL('image/webp', 0.92); if (d.indexOf('data:image/webp') !== 0) d = out.toDataURL('image/jpeg', 0.9); }
              if (d.length > 450000) d = out.toDataURL('image/jpeg', 0.82);
              done(d);
            }
          };
        });
        Array.prototype.forEach.call(ov.querySelectorAll('[data-bg]'), function (b) {
          b.onclick = function () {
            st.bg = b.dataset.bg;
            Array.prototype.forEach.call(ov.querySelectorAll('[data-bg]'), function (x) { x.classList.toggle('on', x === b); });
            ov.querySelector('.wl-crop-stage').classList.toggle('transp', st.bg === 'none'); draw();
          };
        });
        Array.prototype.forEach.call(ov.querySelectorAll('[data-sh]'), function (b) {
          b.onclick = function () {
            Array.prototype.forEach.call(ov.querySelectorAll('[data-sh]'), function (x) { x.classList.toggle('on', x === b); });
            ov.querySelector('.wl-crop-mask').classList.toggle('sq', b.dataset.sh === 'square');
          };
        });
      }
    });
  };

  /* ══════════════ SINCRONIZZAZIONE IMPOSTAZIONI ══════════════ */
  var pushTimer = null;
  WL._dirty = function () {
    if (!UID) return;
    try { oSet.call(window.localStorage, PREFIX + 'wl_dirty', '1'); } catch (e) {}
    clearTimeout(pushTimer); pushTimer = setTimeout(WL.push, 1500);
  };
  function rest(path, opt) {
    opt = opt || {};
    var h = { apikey: WL.key, Authorization: 'Bearer ' + WL.token(), 'Content-Type': 'application/json' };
    if (opt.headers) for (var k in opt.headers) h[k] = opt.headers[k];
    return fetch(WL.url + '/rest/v1/' + path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { return r.text().then(function (t) { var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) { var er = new Error((d && (d.message || d.error)) || ('Errore ' + r.status)); er.status = r.status; er.code = d && d.code; throw er; } return d; }); });
  }
  WL.rest = rest;
  function collect() {
    var data = {};
    SYNC_KEYS.forEach(function (k) { if (k === 'mdl_brand') return; var v = lsGet(k); if (v != null) data[k] = v; });
    return data;
  }
  function saveWs(o) { try { oSet.call(window.localStorage, WS_KEY, JSON.stringify(o)); } catch (e) {} }
  function pushTeam() {
    if (!WL.canEdit()) { try { oDel.call(window.localStorage, PREFIX + 'wl_dirty'); } catch (e) {} return Promise.resolve(true); }
    var d = collect(); PERSONAL_KEYS.forEach(function (k) { delete d[k]; });
    var raw = lsJSON('mdl_brand', {}) || {};
    var brand = WL.isAdmin() ? { name: raw.name || null, sub: raw.sub || null, logo: raw.logo || null } : null;
    return rest('rpc/brigata_save_settings', { method: 'POST', body: { p_owner: WS, p_data: d, p_brand: brand } })
      .then(function () { try { oDel.call(window.localStorage, PREFIX + 'wl_dirty'); } catch (e) {} return true; })
      .catch(function () { return false; });
  }
  WL.push = function () {
    if (!UID || !TOKEN) return Promise.resolve(false);
    clearTimeout(pushTimer);
    if (WL.inTeam()) return pushTeam();
    var b = WL.brand(), raw = lsJSON('mdl_brand', {}) || {};
    var row = { user_id: UID, data: collect(), brand_name: raw.name || null, brand_sub: raw.sub || null, logo: raw.logo || null, slug: raw.slug || null, updated_at: new Date().toISOString() };
    return rest('user_settings?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: row })
      .then(function () { try { oDel.call(window.localStorage, PREFIX + 'wl_dirty'); } catch (e) {} return true; })
      .catch(function (e) {
        if (e && (e.code === '23505' || e.status === 409)) {
          // indirizzo personale già usato da un altro account
          var cur = lsJSON('mdl_brand', {}) || {}; var bad = cur.slug; delete cur.slug;
          suppressDirty = true; lsSet('mdl_brand', JSON.stringify(cur)); suppressDirty = false;
          alert('L’indirizzo personale «' + bad + '» è già usato da un altro account: scegline un altro.');
          return WL.push();
        }
        return false;
      });
  };
  WL.pull = function () {
    if (!UID || !TOKEN) return Promise.resolve();
    var dirty = false; try { dirty = oGet.call(window.localStorage, PREFIX + 'wl_dirty') === '1'; } catch (e) {}
    return rest('user_settings?select=*&user_id=eq.' + WS).then(function (rows) {
      var r = rows && rows[0];
      if (!r) return WL.inTeam() ? null : WL.push();   // primo accesso: crea la riga
      if (dirty && WL.canEdit()) return WL.push();     // modifiche fatte offline: vincono quelle locali
      suppressDirty = true;
      try {
        var d = r.data || {};
        SYNC_KEYS.forEach(function (k) { if (k === 'mdl_brand') return; if (WL.inTeam() && PERSONAL_KEYS.indexOf(k) > -1) return; if (d[k] != null) lsSet(k, d[k]); });
        lsSet('mdl_brand', JSON.stringify({ name: r.brand_name || '', sub: r.brand_sub || '', logo: r.logo || '', slug: r.slug || '' }));
      } finally { suppressDirty = false; }
    }).catch(function () {});
  };

  /* ══════════════ ACCESSO ══════════════ */
  function cleanUrl() {
    var u = new URL(location.href);
    ['code', 'error', 'error_description', 'error_code', 'state'].forEach(function (p) { u.searchParams.delete(p); });
    u.hash = '';
    return u.toString();
  }
  function redirectTo() { return cleanUrl(); }
  /* ══════════════ BRIGATA ══════════════ */
  // attiva gli inviti, legge i ricettari di cui si fa parte e controlla il ruolo
  WL.teamsSync = function (joinOwner) {
    var step = Promise.resolve(null);
    if (joinOwner && /^[0-9a-f-]{36}$/i.test(joinOwner)) {
      step = rest('rpc/brigata_join', { method: 'POST', body: { p_owner: joinOwner } }).catch(function () { return null; });
      var u = new URL(location.href); u.searchParams.delete('join'); history.replaceState(null, '', u.toString());
    }
    return step.then(function (joinRes) {
      return rest('rpc/brigata_mine', { method: 'POST', body: {} }).then(function (rows) {
        TEAMS = (rows || []).map(function (r) { return { ws: r.owner_id, role: r.role, name: r.brand_name || '', sub: r.brand_sub || '', logo: r.logo ? String(r.logo).slice(0, 60000) : '' }; });
        var cur = null; TEAMS.forEach(function (t) { if (t.ws === WS) cur = t; });
        var want = WS;
        var prev = (WSI && WSI.teams) || [];
        var fresh = TEAMS.filter(function (t) { return !prev.some(function (p) { return p.ws === t.ws; }); })[0];
        if (joinRes === 'active' && joinOwner) want = joinOwner;                     // appena entrato con il link d'invito
        else if (fresh) want = fresh.ws;                                             // nuovo invito: si apre quel ricettario
        if (want !== UID && !TEAMS.some(function (t) { return t.ws === want; })) want = UID;   // tolto dalla brigata
        var role = want === UID ? 'owner' : TEAMS.filter(function (t) { return t.ws === want; })[0].role;
        saveWs({ ws: want, role: role === 'owner' ? null : role, teams: TEAMS });
        if (joinRes === 'pending') WL._notice = 'Richiesta inviata: potrai vedere il ricettario quando l’admin ti avrà approvato.';
        if (want !== WS) { location.replace(cleanUrl()); return new Promise(function () {}); }
        ROLE = role;
      });
    }).catch(function () {});
  };
  WL.useWorkspace = function (ws) {
    var t = TEAMS.filter(function (x) { return x.ws === ws; })[0];
    var go = function () { saveWs({ ws: ws, role: t ? t.role : null, teams: TEAMS }); location.replace(cleanUrl()); };
    WL.push().then(go, go);
  };
  WL.readOnlyNote = function () {
    var t = TEAMS.filter(function (x) { return x.ws === WS; })[0];
    alert('Sei ' + WL.roleLabel() + (t && t.name ? ' nella brigata di «' + t.name + '»' : '') + ': puoi consultare ricette e biblioteca, ma solo admin e pastry chef possono modificarle.');
  };
  WL.inviteLink = function () {
    var b = WL.brand(), q = (b.slug && !WL.inTeam() ? 'a=' + encodeURIComponent(b.slug) + '&' : '') + 'join=' + WS;
    return location.origin + location.pathname + '?' + q;
  };

  WL.signIn = function (selectAccount) {
    if (!WL.sb) return;
    var err = $('wlLoginErr'); if (err) err.textContent = '';
    return WL.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo(), queryParams: selectAccount ? { prompt: 'select_account' } : {} } })
      .then(function (r) { if (r && r.error && err) err.textContent = r.error.message; });
  };
  WL.switchAccount = function () {
    var go = function () { WL.signIn(true); };
    WL.push().then(go, go);
  };
  WL.signOut = function () {
    var go = function () { WL.sb.auth.signOut().finally(function () { location.replace(cleanUrl()); }); };
    WL.push().then(go, go);
  };

  function loginBrand() {
    var u = new URL(location.href), slug = (u.searchParams.get('a') || '').toLowerCase().trim();
    var last = null; try { last = JSON.parse(oGet.call(window.localStorage, 'wl_last_brand') || 'null'); } catch (e) {}
    var paint = function (b) {
      b = b || {};
      var im = $('wlLoginLogo'); if (im) im.src = b.logo || DEFAULT_LOGO;
      var n = $('wlLoginName'); if (n) n.textContent = b.name || 'Il mio Ricettario';
      var s = $('wlLoginSub'); if (s) s.textContent = b.sub || 'Ricettario Professionale';
      document.title = 'Ricettario · ' + (b.name || 'Accedi');
    };
    paint(last);
    if (slug && WL.sb) {
      WL.sb.rpc('get_branding', { p_slug: slug }).then(function (r) {
        var row = r && r.data && r.data[0];
        if (row) paint({ name: row.brand_name, sub: row.brand_sub, logo: row.logo });
      });
    }
  }
  function showLogin(msg) {
    var p = $('pwd'); if (p) { p.style.display = 'flex'; p.classList.remove('gone'); }
    var land = $('landing'); if (land) land.style.display = 'none';
    var g = $('globalMenuBtn'); if (g) g.style.display = 'none';
    loginBrand();
    var list = []; try { list = JSON.parse(oGet.call(window.localStorage, 'wl_accounts') || '[]'); } catch (e) {}
    var box = $('wlAccounts');
    if (box) {
      box.innerHTML = list.length ? '<p class="wl-acc-t fsc">Account usati su questo dispositivo</p>' + list.map(function (a) {
        return '<button type="button" class="wl-acc" data-email="' + esc(a.email) + '"><img src="' + esc(a.logo || DEFAULT_LOGO) + '" alt=""><span><b>' + esc(a.name || a.email) + '</b><small>' + esc(a.email) + '</small></span></button>';
      }).join('') : '';
      Array.prototype.forEach.call(box.querySelectorAll('.wl-acc'), function (b) {
        b.onclick = function () {
          WL.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo(), queryParams: { login_hint: b.dataset.email, prompt: 'select_account' } } });
        };
      });
    }
    var e = $('wlLoginErr'); if (e && msg) e.textContent = msg;
  }

  WL.start = function () {
    var gbtn = $('wlGoogle'); if (gbtn) gbtn.onclick = function () { WL.signIn(true); };
    if (!C.supabaseUrl || !C.supabaseAnonKey || /INSERISCI/.test(C.supabaseUrl)) {
      showLogin('Configura Supabase in config.js (supabaseUrl e supabaseAnonKey).');
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      if (UID && !navigator.onLine) return enter();       // offline: si lavora con i dati del dispositivo
      showLogin('Impossibile caricare il modulo di accesso: controlla la connessione.');
      return;
    }
    WL.sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
      auth: { storageKey: AUTH_KEY, flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    var qp = new URL(location.href).searchParams;
    if (qp.get('error_description')) showLogin(qp.get('error_description'));
    WL.sb.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (s && s.user.id !== UID) { location.replace(cleanUrl()); return; }   // nuovo account: riparte nel suo spazio
      if (!s) {
        if (UID && !navigator.onLine) return enter();
        if (UID) { try { oDel.call(window.localStorage, AUTH_KEY); } catch (e) {} }
        if (!qp.get('error_description')) showLogin();
        return;
      }
      TOKEN = s.access_token; USER = s.user;
      if (qp.get('code')) history.replaceState(null, '', cleanUrl());
      WL.sb.auth.onAuthStateChange(function (ev, ss) {
        if (ss && ss.access_token) { TOKEN = ss.access_token; USER = ss.user; }
        if (ev === 'SIGNED_OUT') location.replace(cleanUrl());
      });
      var t = new Promise(function (res) { setTimeout(res, 6000); });
      Promise.race([WL.teamsSync(qp.get('join')).then(WL.pull), t]).then(enter, enter);
    }).catch(function () { if (UID) enter(); else showLogin('Errore di connessione'); });
  };

  function enter() {
    if (WL._booted) return;
    try {
      window.sessionStorage.setItem('mdl_ul', '1');
      if (WL.canEdit()) { window.sessionStorage.setItem('adm', '1'); window.localStorage.setItem('mdl_adm', new Date().toDateString()); }
      else { window.sessionStorage.removeItem('adm'); window.localStorage.removeItem('mdl_adm'); }
    } catch (e) {}
    if (!WSI && UID) saveWs({ ws: WS, role: WL.inTeam() ? ROLE : null, teams: TEAMS });
    WL.applySections();
    WL.applyBrand();
    WL._booted = true;
    try { window.boot(); } catch (e) { console.error(e); }
    try { if (typeof window.unlockApp === 'function') window.unlockApp(); } catch (e) {}
    var p = $('pwd'); if (p) p.style.display = 'none';
    WL._rememberAccount();
    window.addEventListener('online', function () { WL.pull(); });
    if (WL._notice) { var nt = WL._notice; WL._notice = null; setTimeout(function () { alert(nt); }, 600); }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') WL.push(); });
  }

  /* ══════════════ SCHEDA «ACCOUNT, LOGO E SEZIONI» ══════════════ */
  function roleOpts(sel) {
    return ['admin', 'pastry_chef', 'demi_chef', 'commis', 'staff'].map(function (r) { return '<option value="' + r + '"' + (r === sel ? ' selected' : '') + '>' + ROLES[r] + '</option>'; }).join('');
  }
  function wsCard() {
    if (!TEAMS.length) return '';
    var own = { ws: UID, role: 'owner', name: 'Il mio ricettario', sub: WL.email() };
    return '<section class="wl-card"><b class="wl-t">Ricettario attivo</b><p class="wl-n">Fai parte di altre brigate: scegli quale ricettario aprire.</p><div class="wl-ws">' +
      [own].concat(TEAMS).map(function (t) {
        return '<button type="button" class="wl-acc' + (t.ws === WS ? ' on' : '') + '" data-ws="' + esc(t.ws) + '"><img src="' + esc(t.logo || DEFAULT_LOGO) + '" alt=""><span><b>' + esc(t.name || 'Ricettario') + '</b><small>' + esc(WL.roleLabel(t.role)) + (t.ws === WS ? ' · aperto ora' : '') + '</small></span></button>';
      }).join('') + '</div></section>';
  }
  WL.renderTeam = function () {
    var box = $('wlTeam'); if (!box) return;
    var msg = $('wlTeamMsg');
    box.innerHTML = '<p class="wl-n">Caricamento…</p>';
    rest('brigata?select=*&owner_id=eq.' + WS + '&order=status.desc,created_at.asc').then(function (rows) {
      rows = rows || [];
      if (!rows.length) { box.innerHTML = '<p class="wl-n">Nessun membro ancora.</p>'; return; }
      box.innerHTML = rows.map(function (m) {
        var st = m.status === 'pending' ? '<em class="wl-st p">Richiesta</em>' : m.status === 'invited' ? '<em class="wl-st i">Invitato</em>' : '<em class="wl-st a">Attivo</em>';
        return '<div class="wl-mem" data-id="' + esc(m.id) + '"><span class="wl-mem-n"><b>' + esc(m.name || m.email) + '</b><small>' + esc(m.email) + '</small></span>' + st +
          '<select class="wl-in sm" data-a="role">' + roleOpts(m.role) + '</select>' +
          (m.status === 'pending' ? '<button type="button" class="wl-btn gold" data-a="ok">Approva</button>' : '') +
          '<button type="button" class="wl-btn danger" data-a="del" aria-label="Rimuovi">' + (m.status === 'pending' ? 'Rifiuta' : 'Rimuovi') + '</button></div>';
      }).join('');
      Array.prototype.forEach.call(box.querySelectorAll('.wl-mem'), function (row) {
        var id = row.dataset.id, m = rows.filter(function (x) { return x.id === id; })[0];
        var patch = function (body, ok) {
          rest('brigata?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: body })
            .then(function () { msg.textContent = ok; WL.renderTeam(); }).catch(function (e) { msg.textContent = 'Errore: ' + e.message; });
        };
        row.querySelector('[data-a=role]').onchange = function () { patch({ role: this.value }, 'Ruolo aggiornato.'); };
        var okb = row.querySelector('[data-a=ok]'); if (okb) okb.onclick = function () { patch({ status: 'active', role: row.querySelector('[data-a=role]').value }, 'Accesso approvato.'); };
        row.querySelector('[data-a=del]').onclick = function () {
          if (!confirm((m.status === 'pending' ? 'Rifiutare la richiesta di ' : 'Togliere dalla brigata ') + (m.name || m.email) + '?')) return;
          rest('brigata?id=eq.' + id, { method: 'DELETE' }).then(function () { msg.textContent = 'Fatto.'; WL.renderTeam(); }).catch(function (e) { msg.textContent = 'Errore: ' + e.message; });
        };
      });
    }).catch(function (e) {
      box.innerHTML = '<p class="wl-n">' + (/brigata|schema cache|does not exist/i.test(e.message || '') ? 'Per usare la brigata esegui di nuovo <b>supabase/schema.sql</b> nel SQL Editor di Supabase.' : 'Errore: ' + esc(e.message)) + '</p>';
    });
  };
  function inviteText() {
    var b = WL.brand();
    return 'Ti ho aggiunto alla brigata' + (b.name ? ' di ' + b.name : '') + ' sul ricettario. Apri il link e accedi con Google:\n' + WL.inviteLink();
  }
  WL.openSettings = function () {
    var old = $('wlSheet'); if (old) old.remove();
    var b = WL.brand();
    var bg = document.createElement('div'); bg.id = 'wlSheet'; bg.className = 'wl-bg';
    bg.innerHTML =
      '<div class="wl-sh" role="dialog" aria-label="Account, logo e sezioni">' +
      '<div class="wl-hd"><b class="fd">Account e personalizzazione</b><button type="button" class="wl-x" aria-label="Chiudi">&times;</button></div>' +
      '<section class="wl-card"><div class="wl-acc-me"><img class="wl-logo" alt=""><span><b>' + esc(WL.email() || 'Account') + '</b><small>' + (WL.inTeam() ? esc(WL.roleLabel()) + ' · brigata di ' + esc(WL.brand().name || 'un altro account') : 'Accesso con Google · dati separati per questo account') + '</small></span></div>' +
      '<div class="wl-row"><button type="button" class="wl-btn" id="wlSwitch">Cambia account</button><button type="button" class="wl-btn danger" id="wlOut">Esci</button></div></section>' +
      wsCard() +
      (WL.canEdit() ? '' : '<section class="wl-card"><b class="wl-t">Solo consultazione</b><p class="wl-n">Sei <b>' + esc(WL.roleLabel()) + '</b> in questa brigata: puoi leggere ricette e biblioteca. Le modifiche le fanno admin e pastry chef.</p></section>') +
      (WL.isAdmin() ?       '<section class="wl-card"><b class="wl-t">Logo e nome</b><p class="wl-n">Compaiono nella home, nel menu, nei documenti di stampa e nella pagina d’accesso.</p>' +
      '<div class="wl-logo-ed"><img class="wl-logo" alt=""><div class="wl-col"><label class="wl-btn gold">Carica logo<input type="file" accept="image/*" id="wlLogoFile" hidden></label><button type="button" class="wl-btn" id="wlLogoCrop">Ritaglia</button><button type="button" class="wl-btn" id="wlLogoDel">Rimuovi</button></div></div>' +
      '<label class="wl-l">Nome</label><input class="wl-in" id="wlName" maxlength="60" value="' + esc(lsJSON('mdl_brand', {}).name || '') + '" placeholder="Es. Pasticceria Rossi">' +
      '<label class="wl-l">Sottotitolo</label><input class="wl-in" id="wlSub" maxlength="60" value="' + esc(lsJSON('mdl_brand', {}).sub || '') + '" placeholder="Ricettario Professionale">' +
      (WL.inTeam() ? '' : '<label class="wl-l">Indirizzo personale della pagina d’accesso</label><div class="wl-row"><input class="wl-in" id="wlSlug" maxlength="40" value="' + esc(b.slug) + '" placeholder="es. pasticceria-rossi"><button type="button" class="wl-btn" id="wlCopy">Copia link</button></div>' +
      '<p class="wl-n" id="wlSlugInfo"></p>') +
      '<button type="button" class="wl-btn gold wide" id="wlSaveBrand">Salva logo e nome</button><p class="wl-msg" id="wlBrandMsg"></p></section>' : '') +
      (WL.canEdit() ?       '<section class="wl-card"><b class="wl-t">Sezioni del ricettario</b><p class="wl-n">Rinomina, riordina, aggiungi o togli le sezioni della home.</p><div id="wlSecs"></div>' +
      '<button type="button" class="wl-btn" id="wlSecAdd">+ Nuova sezione</button><button type="button" class="wl-btn gold wide" id="wlSecSave">Salva sezioni</button><p class="wl-msg" id="wlSecMsg"></p></section>' : '') +
      (WL.isAdmin() ? '<section class="wl-card" id="wlTeamCard"><b class="wl-t">Brigata</b><p class="wl-n">Invita i membri con la loro email Google. <b>Admin</b> e <b>Pastry Chef</b> possono modificare; <b>Demi Chef</b>, <b>Commis</b> e <b>Staff</b> possono solo consultare.</p>' +
        '<div class="wl-row wl-inv"><input class="wl-in" id="wlInvEmail" type="email" placeholder="email@gmail.com" autocomplete="off"><select class="wl-in sm" id="wlInvRole">' + roleOpts('commis') + '</select></div>' +
        '<button type="button" class="wl-btn gold wide" id="wlInvAdd">Aggiungi alla brigata</button><p class="wl-msg" id="wlTeamMsg"></p><div id="wlTeam"></div>' +
        '<div class="wl-row"><button type="button" class="wl-btn" id="wlInvShare">Invia il link dell’app</button><button type="button" class="wl-btn" id="wlInvCopy">Copia link</button></div>' +
        '<p class="wl-n">Chi apre il link e accede con l’email invitata entra subito con il suo ruolo; le altre richieste arrivano qui da approvare.</p></section>' : '') +
      '</div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { bg.classList.add('on'); });
    WL.applyBrand();
    var close = function () { bg.classList.remove('on'); setTimeout(function () { bg.remove(); }, 220); };
    bg.querySelector('.wl-x').onclick = close;
    bg.onclick = function (e) { if (e.target === bg) close(); };
    $('wlSwitch').onclick = WL.switchAccount;
    $('wlOut').onclick = function () { if (confirm('Uscire da questo account? I dati restano salvati.')) WL.signOut(); };
    Array.prototype.forEach.call(bg.querySelectorAll('.wl-ws .wl-acc'), function (x) { x.onclick = function () { if (x.dataset.ws !== WS) WL.useWorkspace(x.dataset.ws); }; });
    if ($('wlTeamCard')) {
      WL.renderTeam();
      $('wlInvAdd').onclick = function () {
        var em = $('wlInvEmail').value.trim().toLowerCase(), role = $('wlInvRole').value, msg = $('wlTeamMsg');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = 'Scrivi un’email valida.'; return; }
        if (em === String(WL.email()).toLowerCase()) { msg.textContent = 'È il tuo account: sei già il titolare.'; return; }
        msg.textContent = 'Aggiungo…';
        rest('brigata?on_conflict=owner_id,email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { owner_id: WS, email: em, role: role, status: 'invited' } })
          .then(function () { $('wlInvEmail').value = ''; msg.textContent = 'Aggiunto. Ora invia il link dell’app a ' + em + '.'; WL.renderTeam(); })
          .catch(function (e) { msg.textContent = 'Errore: ' + e.message; });
      };
      $('wlInvShare').onclick = function () {
        var t = inviteText();
        if (navigator.share) { navigator.share({ title: 'Ricettario', text: t }).catch(function () {}); return; }
        location.href = 'mailto:?subject=' + encodeURIComponent('Invito al ricettario') + '&body=' + encodeURIComponent(t);
      };
      $('wlInvCopy').onclick = function () { var l = WL.inviteLink(); try { navigator.clipboard.writeText(l); $('wlTeamMsg').textContent = 'Link copiato.'; } catch (e) { prompt('Copia il link', l); } };
    }
    if ($('wlSaveBrand')) (function () {
    var pendingLogo = null;
    var showLogo = function (d) { Array.prototype.forEach.call(bg.querySelectorAll('.wl-logo'), function (im) { im.src = d; }); };
    var cropFrom = function (src) {
      WL.cropLogo(src).then(function (d) { if (!d) return; pendingLogo = d; showLogo(d); $('wlBrandMsg').textContent = 'Anteprima: premi \u00abSalva logo e nome\u00bb per confermare.'; });
    };
    $('wlLogoFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      WL.fileToDataURL(f).then(cropFrom).catch(function (er) { alert(er.message); });
    };
    $('wlLogoCrop').onclick = function () {
      var cur = pendingLogo || WL.brand().logo;
      if (!cur) { $('wlLogoFile').click(); return; }
      cropFrom(cur);
    };
    $('wlLogoDel').onclick = function () { pendingLogo = ''; Array.prototype.forEach.call(bg.querySelectorAll('.wl-logo'), function (im) { im.src = DEFAULT_LOGO; }); };
    var slugIn = $('wlSlug') || { value: b.slug || '' };
    var link = function () { var s = WL.slugify(slugIn.value); return s ? location.origin + location.pathname + '?a=' + s : ''; };
    var info = function () { if (!$('wlSlugInfo')) return; var l = link(); $('wlSlugInfo').textContent = l ? 'Pagina d’accesso con il tuo logo: ' + l : 'Facoltativo: crea un link alla pagina d’accesso con il tuo logo e il tuo nome.'; };
    slugIn.oninput = info; info();
    if ($('wlCopy')) $('wlCopy').onclick = function () { var l = link(); if (!l) return; try { navigator.clipboard.writeText(l); $('wlSlugInfo').textContent = 'Link copiato: ' + l; } catch (e) { prompt('Copia il link', l); } };
    $('wlSaveBrand').onclick = function () {
      var patch = { name: $('wlName').value.trim(), sub: $('wlSub').value.trim(), slug: WL.inTeam() ? (WL.brand().slug || '') : WL.slugify(slugIn.value) };
      if (pendingLogo !== null) patch.logo = pendingLogo;
      slugIn.value = patch.slug;
      WL.saveBrand(patch);
      var m = $('wlBrandMsg'); m.textContent = 'Salvataggio…';
      WL.push().then(function (ok) { m.textContent = ok ? (WL.inTeam() ? 'Salvato per tutta la brigata.' : 'Salvato su tutti i tuoi dispositivi.') : 'Salvato su questo dispositivo: lo invio appena torna la connessione.'; info(); try { MDL_REFRESH(); } catch (e) {} });
    };
    })();
    // sezioni
    if ($('wlSecs')) (function () {
    var work = WL.sections().map(function (s) { return { k: s.k, l: s.l, sub: s.sub || '' }; });
    var counts = function () { var c = {}; (window.CU || []).forEach(function (r) { if (r && r.s) c[r.s] = (c[r.s] || 0) + 1; }); return c; };
    function draw() {
      var c = counts(), box = $('wlSecs');
      box.innerHTML = work.map(function (s, i) {
        return '<div class="wl-sec" data-i="' + i + '"><div class="wl-sec-f"><input class="wl-in" data-f="l" value="' + esc(s.l) + '" placeholder="Nome sezione" maxlength="40">' +
          '<input class="wl-in sm" data-f="sub" value="' + esc(s.sub) + '" placeholder="Sottotitolo (es. Creme · Basi)" maxlength="60"></div>' +
          '<div class="wl-sec-a"><span class="wl-cnt">' + (c[s.k] || 0) + '</span><button type="button" data-a="up" aria-label="Su">&#8593;</button><button type="button" data-a="down" aria-label="Giù">&#8595;</button><button type="button" data-a="del" aria-label="Elimina">&times;</button></div></div>';
      }).join('');
      Array.prototype.forEach.call(box.querySelectorAll('.wl-sec'), function (row) {
        var i = +row.dataset.i;
        Array.prototype.forEach.call(row.querySelectorAll('input'), function (inp) { inp.oninput = function () { work[i][inp.dataset.f] = inp.value; }; });
        row.querySelector('[data-a=up]').onclick = function () { if (i > 0) { var t = work[i - 1]; work[i - 1] = work[i]; work[i] = t; draw(); } };
        row.querySelector('[data-a=down]').onclick = function () { if (i < work.length - 1) { var t = work[i + 1]; work[i + 1] = work[i]; work[i] = t; draw(); } };
        row.querySelector('[data-a=del]').onclick = function () {
          if (work.length < 2) { alert('Serve almeno una sezione.'); return; }
          var n = counts()[work[i].k] || 0, dest = null;
          if (n) {
            var others = work.filter(function (x, j) { return j !== i; });
            var ans = prompt('«' + work[i].l + '» contiene ' + n + ' ricette. In quale sezione spostarle?\n' + others.map(function (x, j) { return (j + 1) + ') ' + x.l; }).join('\n'), '1');
            if (ans === null) return;
            dest = others[(parseInt(ans, 10) || 1) - 1]; if (!dest) return;
            work[i]._moveTo = dest.k;
          }
          if (!n && !confirm('Eliminare la sezione «' + work[i].l + '»?')) return;
          (WL._secMoves = WL._secMoves || []).push({ from: work[i].k, to: dest && dest.k });
          work.splice(i, 1); draw();
        };
      });
    }
    draw();
    $('wlSecAdd').onclick = function () { work.push({ k: 's-' + Date.now().toString(36), l: '', sub: '' }); draw(); var ins = $('wlSecs').querySelectorAll('input[data-f=l]'); if (ins.length) ins[ins.length - 1].focus(); };
    $('wlSecSave').onclick = function () {
      var clean = work.map(function (s) { return { k: s.k, l: String(s.l || '').trim(), sub: String(s.sub || '').trim() }; }).filter(function (s) { return s.l; });
      if (!clean.length) { alert('Serve almeno una sezione con un nome.'); return; }
      (WL._secMoves || []).forEach(function (m) {
        if (!m.to) return;
        (window.CU || []).slice().forEach(function (r) {
          if (r && r.s === m.from && r._id != null) { var nd = JSON.parse(JSON.stringify(r)); delete nd._id; nd.s = m.to; try { window.updateRec(r, nd); } catch (e) {} }
        });
      });
      WL._secMoves = [];
      WL.saveSections(clean);
      $('wlSecMsg').textContent = 'Sezioni salvate.';
      try { if (document.getElementById('app').classList.contains('on')) { window.renderCats(); window.renderGrid(); } } catch (e) {}
      WL.push();
    };
    })();
  };
  WL.slugify = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  };
})();
