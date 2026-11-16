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
  var PREFIX = 'u:' + (UID || 'anon') + ':';

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
    prefix: PREFIX,
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
  WL.push = function () {
    if (!UID || !TOKEN) return Promise.resolve(false);
    clearTimeout(pushTimer);
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
    return rest('user_settings?select=*&user_id=eq.' + UID).then(function (rows) {
      var r = rows && rows[0];
      if (!r) return WL.push();                 // primo accesso: crea la riga
      if (dirty) return WL.push();              // modifiche fatte offline: vincono quelle locali
      suppressDirty = true;
      try {
        var d = r.data || {};
        SYNC_KEYS.forEach(function (k) { if (k === 'mdl_brand') return; if (d[k] != null) lsSet(k, d[k]); });
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
      Promise.race([WL.pull(), t]).then(enter, enter);
    }).catch(function () { if (UID) enter(); else showLogin('Errore di connessione'); });
  };

  function enter() {
    if (WL._booted) return;
    try { window.sessionStorage.setItem('mdl_ul', '1'); window.sessionStorage.setItem('adm', '1'); window.localStorage.setItem('mdl_adm', new Date().toDateString()); } catch (e) {}
    WL.applySections();
    WL.applyBrand();
    WL._booted = true;
    try { window.boot(); } catch (e) { console.error(e); }
    try { if (typeof window.unlockApp === 'function') window.unlockApp(); } catch (e) {}
    var p = $('pwd'); if (p) p.style.display = 'none';
    WL._rememberAccount();
    window.addEventListener('online', function () { WL.pull(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') WL.push(); });
  }

  /* ══════════════ SCHEDA «ACCOUNT, LOGO E SEZIONI» ══════════════ */
  WL.openSettings = function () {
    var old = $('wlSheet'); if (old) old.remove();
    var b = WL.brand();
    var bg = document.createElement('div'); bg.id = 'wlSheet'; bg.className = 'wl-bg';
    bg.innerHTML =
      '<div class="wl-sh" role="dialog" aria-label="Account, logo e sezioni">' +
      '<div class="wl-hd"><b class="fd">Account e personalizzazione</b><button type="button" class="wl-x" aria-label="Chiudi">&times;</button></div>' +
      '<section class="wl-card"><div class="wl-acc-me"><img class="wl-logo" alt=""><span><b>' + esc(WL.email() || 'Account') + '</b><small>Accesso con Google · dati separati per questo account</small></span></div>' +
      '<div class="wl-row"><button type="button" class="wl-btn" id="wlSwitch">Cambia account</button><button type="button" class="wl-btn danger" id="wlOut">Esci</button></div></section>' +
      '<section class="wl-card"><b class="wl-t">Logo e nome</b><p class="wl-n">Compaiono nella home, nel menu, nei documenti di stampa e nella pagina d’accesso.</p>' +
      '<div class="wl-logo-ed"><img class="wl-logo" alt=""><div class="wl-col"><label class="wl-btn gold">Carica logo<input type="file" accept="image/*" id="wlLogoFile" hidden></label><button type="button" class="wl-btn" id="wlLogoDel">Rimuovi</button></div></div>' +
      '<label class="wl-l">Nome</label><input class="wl-in" id="wlName" maxlength="60" value="' + esc(lsJSON('mdl_brand', {}).name || '') + '" placeholder="Es. Pasticceria Rossi">' +
      '<label class="wl-l">Sottotitolo</label><input class="wl-in" id="wlSub" maxlength="60" value="' + esc(lsJSON('mdl_brand', {}).sub || '') + '" placeholder="Ricettario Professionale">' +
      '<label class="wl-l">Indirizzo personale della pagina d’accesso</label><div class="wl-row"><input class="wl-in" id="wlSlug" maxlength="40" value="' + esc(b.slug) + '" placeholder="es. pasticceria-rossi"><button type="button" class="wl-btn" id="wlCopy">Copia link</button></div>' +
      '<p class="wl-n" id="wlSlugInfo"></p>' +
      '<button type="button" class="wl-btn gold wide" id="wlSaveBrand">Salva logo e nome</button><p class="wl-msg" id="wlBrandMsg"></p></section>' +
      '<section class="wl-card"><b class="wl-t">Sezioni del ricettario</b><p class="wl-n">Rinomina, riordina, aggiungi o togli le sezioni della home.</p><div id="wlSecs"></div>' +
      '<button type="button" class="wl-btn" id="wlSecAdd">+ Nuova sezione</button><button type="button" class="wl-btn gold wide" id="wlSecSave">Salva sezioni</button><p class="wl-msg" id="wlSecMsg"></p></section>' +
      '</div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { bg.classList.add('on'); });
    WL.applyBrand();
    var close = function () { bg.classList.remove('on'); setTimeout(function () { bg.remove(); }, 220); };
    bg.querySelector('.wl-x').onclick = close;
    bg.onclick = function (e) { if (e.target === bg) close(); };
    $('wlSwitch').onclick = WL.switchAccount;
    $('wlOut').onclick = function () { if (confirm('Uscire da questo account? I dati restano salvati.')) WL.signOut(); };
    var pendingLogo = null;
    $('wlLogoFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      WL.readLogo(f).then(function (d) { pendingLogo = d; Array.prototype.forEach.call(bg.querySelectorAll('.wl-logo'), function (im) { im.src = d; }); $('wlBrandMsg').textContent = 'Anteprima: premi «Salva» per confermare.'; })
        .catch(function (er) { alert(er.message); });
    };
    $('wlLogoDel').onclick = function () { pendingLogo = ''; Array.prototype.forEach.call(bg.querySelectorAll('.wl-logo'), function (im) { im.src = DEFAULT_LOGO; }); };
    var slugIn = $('wlSlug');
    var link = function () { var s = WL.slugify(slugIn.value); return s ? location.origin + location.pathname + '?a=' + s : ''; };
    var info = function () { var l = link(); $('wlSlugInfo').textContent = l ? 'Pagina d’accesso con il tuo logo: ' + l : 'Facoltativo: crea un link alla pagina d’accesso con il tuo logo e il tuo nome.'; };
    slugIn.oninput = info; info();
    $('wlCopy').onclick = function () { var l = link(); if (!l) return; try { navigator.clipboard.writeText(l); $('wlSlugInfo').textContent = 'Link copiato: ' + l; } catch (e) { prompt('Copia il link', l); } };
    $('wlSaveBrand').onclick = function () {
      var patch = { name: $('wlName').value.trim(), sub: $('wlSub').value.trim(), slug: WL.slugify(slugIn.value) };
      if (pendingLogo !== null) patch.logo = pendingLogo;
      slugIn.value = patch.slug;
      WL.saveBrand(patch);
      var m = $('wlBrandMsg'); m.textContent = 'Salvataggio…';
      WL.push().then(function (ok) { m.textContent = ok ? 'Salvato su tutti i tuoi dispositivi.' : 'Salvato su questo dispositivo: lo invio appena torna la connessione.'; info(); try { MDL_REFRESH(); } catch (e) {} });
    };
    // sezioni
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
  };
  WL.slugify = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  };
})();
