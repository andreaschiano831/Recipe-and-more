/* settings.js — Impostazioni: un unico posto per tutto.
   Raccoglie il vecchio menu «Altro» (azioni rapide, AI, salute del ricettario, ultime aggiunte, database),
   la scheda «Account, logo e sezioni» (account, ricettario attivo, logo e nome, sezioni, brigata,
   Instagram e TikTok, animazioni, backup), il tema e la scelta «Resta connesso».
   Le schede esistenti non vengono riscritte: vengono costruite come prima e spostate qui dentro,
   così ogni pulsante e ogni salvataggio continua a funzionare. Telefono: elenco e pagine che scorrono;
   computer: elenco a sinistra e pagina a destra. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var P = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
    brand: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    secs: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    look: '<circle cx="13.5" cy="6.5" r="1.4"/><circle cx="17.5" cy="10.5" r="1.4"/><circle cx="8.5" cy="7.5" r="1.4"/><circle cx="6.5" cy="12.5" r="1.4"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.6C22 5.4 17.5 2 12 2z"/>',
    ai: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
    health: '<path d="M20 6L9 17l-5-5"/>',
    recent: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/>',
    menu: '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11"/><path d="M17 21V3c-2 1.5-3 4-3 7s1 4 3 4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    chev: '<path d="M9 18l6-6-6-6"/>', back: '<path d="M15 18l-6-6 6-6"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  function ic(k, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[k] + '</svg>'; }
  function can(f) { try { return !!(window.WL && WL[f] && WL[f]()); } catch (e) { return false; } }
  function aiOk() { try { return (typeof _aiServer !== 'undefined' && _aiServer) || aiHasLocalKey(); } catch (e) { return false; } }
  function dbOk() { try { return typeof _dbConnected !== 'undefined' && _dbConnected; } catch (e) { return false; } }
  function nRec() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }).length; }
  function dups() { try { var D = HUB.dupInfo(); return D.dupCount + D.near.length; } catch (e) { return 0; } }
  function admin(go) { if (can('canEdit')) return go(); try { adminGate(go, 'Questa azione è riservata all’amministratore.'); } catch (e) { go(); } }
  function act(fn) { return function () { close(); setTimeout(function () { try { fn(); } catch (e) { console.error(e); } }, 240); }; }

  /* ── le pagine: gruppo, titolo, riga di stato, parole per la ricerca, contenuto ── */
  var PAGES = [
    { k: 'account', g: 'Account', t: 'Account e accesso', i: 'user', kw: 'google email esci cambia account resta connesso accesso sessione ricettario attivo',
      s: function () { return (WL.email && WL.email()) || 'Google'; }, cards: ['wlAccCard', 'keep', 'wlWsCard', 'wlRoCard'] },
    { k: 'brigata', g: 'Account', t: 'Brigata', i: 'team', kw: 'membri invita ruoli commis pastry chef approva', show: function () { return can('isAdmin'); },
      s: function () { return 'Membri, ruoli e inviti'; }, cards: ['wlTeamCard'] },
    { k: 'brand', g: 'Personalizza', t: 'Logo e nome', i: 'brand', kw: 'logo nome sottotitolo pagina accesso indirizzo', show: function () { return can('isAdmin'); },
      s: function () { try { return WL.brand().name || 'Il mio Ricettario'; } catch (e) { return ''; } }, cards: ['wlBrandCard'] },
    { k: 'sezioni', g: 'Personalizza', t: 'Sezioni del ricettario', i: 'secs', kw: 'sezioni rinomina riordina home', show: function () { return can('canEdit'); },
      s: function () { try { return WL.sections().map(function (x) { return x.l; }).join(' · '); } catch (e) { return ''; } }, cards: ['wlSecCard'] },
    { k: 'rapidi', g: 'Personalizza', t: 'Comandi rapidi', i: 'secs', kw: 'comandi rapidi azioni rapide tasti home personalizza aggiungi togli', show: function () { return !!window.RAPIDI; },
      run: act(function () { try { tbGoHome(); } catch (e) {} setTimeout(function () { if (!RAPIDI.edit('rm-home')) setTimeout(function () { RAPIDI.edit('rm-home'); }, 600); }, 450); }) },
    { k: 'aspetto', g: 'Personalizza', t: 'Aspetto', i: 'look', kw: 'tema colori scuro chiaro animazioni movimento',
      s: function () { try { return THEME_UI.PAL[THEME_UI.cur()].n + ' · animazioni ' + ({ full: 'complete', reduced: 'ridotte', off: 'spente' }[(window.MOTION && MOTION.level && MOTION.level()) || ''] || ''); } catch (e) { return 'Tema e animazioni'; } }, cards: ['theme', 'moCard'] },
    { k: 'ai', g: 'Strumenti', t: 'Intelligenza artificiale', i: 'ai', kw: 'groq chiave ai import foto',
      s: function () { return aiOk() ? 'Pronta' : 'Manca la chiave'; }, badge: function () { return aiOk() ? '' : '!'; }, cards: ['hub:ai'] },
    { k: 'share', g: 'Strumenti', t: 'Salva da Instagram e TikTok', i: 'share', kw: 'instagram tiktok condividi reel comando rapido', show: function () { return can('canEdit') && !!(window.VID && VID.guide); },
      s: function () { return 'Il tasto Condividi manda le ricette qui'; }, cards: ['wlShareCard'] },
    { k: 'gruppi', g: 'Strumenti', t: 'Categorie e piatti', i: 'folder', kw: 'gruppi categorie piatti', run: function () { admin(act(function () { (typeof openCatManager === 'function' ? openCatManager : openPiattiManager)(); })); } },
    { k: 'docs', g: 'Strumenti', t: 'Documenti di stampa', i: 'print', kw: 'stampa documenti pdf', run: act(function () { openDocsManager(); }) },
    { k: 'menu', g: 'Strumenti', t: 'Menù e degustazioni', i: 'menu', kw: 'menu degustazione coperti', show: function () { return !!window.MENU; }, run: act(function () { MENU.open(); }) },
    { k: 'lib', g: 'Strumenti', t: 'Biblioteca', i: 'book', kw: 'ebook pdf libri', run: act(function () { openLibrary(); }) },
    { k: 'salute', g: 'Ricettario', t: 'Salute del ricettario', i: 'health', kw: 'duplicati doppioni nomi simili procedimento quantità',
      s: function () { var n = dups(); return n ? n + ' da controllare' : 'Tutto in ordine'; }, badge: function () { return dups() ? String(dups()) : ''; }, cards: ['hub:health'] },
    { k: 'recenti', g: 'Ricettario', t: 'Ultime aggiunte', i: 'recent', kw: 'ultime recenti modifica elimina', s: function () { return nRec() + ' ricette'; }, cards: ['hub:recent'] },
    { k: 'import', g: 'Ricettario', t: 'Importa file', i: 'file', kw: 'word txt importa', show: function () { return can('canEdit'); }, run: function () { admin(act(function () { openImport(); })); } },
    { k: 'dati', g: 'Dati e sicurezza', t: 'Database e backup', i: 'db', kw: 'supabase connessione backup scarica importa', s: function () { return dbOk() ? 'Connesso · ' + nRec() + ' ricette' : 'Non connesso'; }, badge: function () { return dbOk() ? '' : '!'; }, cards: ['hub:db', 'bkCard'] }
  ];
  var GROUPS = ['Account', 'Personalizza', 'Strumenti', 'Ricettario', 'Dati e sicurezza'];
  function visible() { return PAGES.filter(function (p) { try { return !p.show || p.show(); } catch (e) { return false; } }); }
  function page(k) { return PAGES.filter(function (p) { return p.k === k; })[0]; }

  /* ── schede sorgenti ── */
  var S = { open: false, page: 'home', q: '' };
  function stage() {
    var st = $('setStage'); if (st) st.remove();
    st = document.createElement('div'); st.id = 'setStage'; st.hidden = true; $('setBg').appendChild(st);
    try { if (window.HUB) { HUB.build(); HUB.render(); } } catch (e) { console.error(e); }
    try { WL.openSettings(st); } catch (e) { console.error(e); }
    S.cards = {}; [].forEach.call(st.querySelectorAll('section[id]'), function (c) { S.cards[c.id] = c; });
  }
  function cardEl(id) {
    if (id === 'keep') return keepCard();
    if (id === 'theme') return themeCard();
    if (id.indexOf('hub:') === 0) { var n = window.HUB && HUB.refs[id.slice(4)]; return n || null; }
    return (S.cards && S.cards[id]) || $(id);
  }
  function keepCard() {
    if (!WL.keepHere) return null;
    var on = WL.keep && WL.keep(), c = document.createElement('section'); c.className = 'wl-card set-keep'; c.id = 'setKeepCard';
    c.innerHTML = '<b class="wl-t">Resta connesso</b><p class="wl-n">Su questo dispositivo, sul sito e nell’app installata. Con «Sì» l’accesso resta aperto anche se il telefono svuota la memoria del sito; con «No» si chiude quando esci dall’app.</p>' +
      '<div class="set-seg" role="radiogroup" aria-label="Resta connesso"><button type="button" role="radio" data-keep="1" aria-checked="' + (on === true) + '" class="' + (on === true ? 'on' : '') + '">Sì</button><button type="button" role="radio" data-keep="0" aria-checked="' + (on === false) + '" class="' + (on === false ? 'on' : '') + '">No</button></div>';
    c.addEventListener('click', function (e) { var b = e.target.closest('[data-keep]'); if (b) { WL.setKeep(b.dataset.keep === '1'); } });
    return c;
  }
  function themeCard() {
    if (!window.THEME_UI) return null;
    var T = THEME_UI, c = document.createElement('section'); c.className = 'wl-card'; c.id = 'setThemeCard';
    c.innerHTML = '<b class="wl-t">Tema dei colori</b><p class="wl-n">Cambia i colori di tutta l’app.</p><div class="set-th">' + T.ORDER.map(function (k) {
      var p = T.PAL[k]; return '<button type="button" class="set-thc' + (k === T.cur() ? ' on' : '') + '" data-th="' + k + '" aria-pressed="' + (k === T.cur()) + '" style="--tb:' + p.bg + ';--tc:' + p.card + ';--ti:' + p.ink + ';--ta:' + p.acc + '"><span class="set-thp"><i></i><i></i><i></i></span><b>' + esc(p.n) + '</b><small>' + esc(p.d) + '</small></button>';
    }).join('') + '</div>';
    c.addEventListener('click', function (e) {
      var b = e.target.closest('[data-th]'); if (!b) return;
      T.pick(b.dataset.th, b);
      setTimeout(function () { [].forEach.call(c.querySelectorAll('[data-th]'), function (x) { var on = x.dataset.th === T.cur(); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); paintNav(); }, 700);
    });
    return c;
  }

  /* ── interfaccia ── */
  function open(k) {
    if (!window.WL || !WL.email) return;
    if (S.open) { go(k || 'home'); return; }
    var bg = document.createElement('div'); bg.id = 'setBg'; bg.className = 'set-bg';
    bg.innerHTML = '<div class="set-win" role="dialog" aria-modal="true" aria-labelledby="setT">' +
      '<aside class="set-nav" id="setNav"></aside><main class="set-main" id="setMain"></main></div>';
    document.body.appendChild(bg);
    S.open = true; S.q = '';
    stage();
    bg.addEventListener('click', onClick); bg.addEventListener('input', onInput);
    go(k || 'home', true);
    requestAnimationFrame(function () { bg.classList.add('on'); });
    try { document.body.classList.add('set-open'); } catch (e) {}
  }
  function close() {
    var bg = $('setBg'); if (!bg) return;
    S.open = false; bg.classList.remove('on'); bg.id = 'setOut';
    try { document.body.classList.remove('set-open'); } catch (e) {}
    setTimeout(function () { bg.remove(); }, 260);
  }
  function wide() { return window.matchMedia && matchMedia('(min-width: 900px)').matches; }
  function hero() {
    var b = {}; try { b = WL.brand(); } catch (e) {}
    var keep = WL.keep ? WL.keep() : null;
    var nm = b.name || 'Il mio Ricettario', logo = b.logo || ((document.querySelector('#landing img.wl-logo') || {}).src || '');
    return '<div class="set-hero">' + (logo ? '<img class="set-av" src="' + esc(logo) + '" alt="">' : '<span class="set-av set-mono">' + esc(nm.trim().charAt(0).toUpperCase()) + '</span>') + '<div><b>' + esc(b.name || 'Il mio Ricettario') + '</b><span>' + esc(WL.email() || '') + (WL.inTeam && WL.inTeam() ? ' · ' + esc(WL.roleLabel()) : '') + '</span>' +
      '<div class="set-chips"><span class="' + (dbOk() ? 'ok' : 'warn') + '"><i></i>' + (dbOk() ? nRec() + ' ricette' : 'Offline') + '</span><span class="' + (aiOk() ? 'ok' : 'warn') + '"><i></i>' + (aiOk() ? 'AI pronta' : 'AI senza chiave') + '</span>' +
      (WL.keepHere ? '<span class="' + (keep ? 'ok' : '') + '"><i></i>' + (keep ? 'Resti connesso' : keep === false ? 'Accesso per sessione' : 'Accesso da scegliere') + '</span>' : '') + '</div></div></div>';
  }
  function rows(q) {
    var V = visible(), nq = String(q || '').toLowerCase().trim(), h = '';
    GROUPS.forEach(function (g) {
      var L = V.filter(function (p) { return p.g === g && (!nq || (p.t + ' ' + (p.kw || '') + ' ' + g).toLowerCase().indexOf(nq) > -1); }); if (!L.length) return;
      h += '<div class="set-g"><span class="set-gt">' + esc(g) + '</span><div class="set-list">' + L.map(function (p) {
        var sub = ''; try { sub = p.s ? p.s() : ''; } catch (e) {}
        var bd = ''; try { bd = p.badge ? p.badge() : ''; } catch (e) {}
        return '<button type="button" class="set-row' + (S.page === p.k ? ' on' : '') + '" data-go="' + p.k + '"><span class="set-ri">' + ic(p.i, 18) + '</span><span class="set-rt"><b>' + esc(p.t) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
          (bd ? '<em class="set-bd">' + esc(bd) + '</em>' : '') + '<span class="set-rc">' + ic(p.run ? 'chev' : 'chev', 16) + '</span></button>';
      }).join('') + '</div></div>';
    });
    return h || '<p class="set-empty">Nessuna impostazione per «' + esc(q) + '».</p>';
  }
  function paintNav() {
    var nav = $('setNav'); if (!nav) return;
    nav.innerHTML = '<header class="set-hd"><b class="set-title" id="setT">Impostazioni</b><button type="button" class="set-x" data-x aria-label="Chiudi">' + ic('x', 18) + '</button></header>' +
      '<div class="set-scroll">' + hero() + '<label class="set-search">' + ic('search', 16) + '<input id="setQ" type="search" placeholder="Cerca nelle impostazioni" value="' + esc(S.q) + '" autocomplete="off"></label>' +
      '<div id="setRows">' + rows(S.q) + '</div><p class="set-foot">' + esc((function () { try { return WL.brand().sub + ' · ' + WL.brand().name; } catch (e) { return ''; } })()) + '</p></div>';
  }
  function go(k, first) {
    var p = page(k);
    if (p && p.run) { p.run(); return; }
    if (!p) k = 'home';
    if (k === 'home' && wide()) k = 'home';
    S.page = k;
    var bg = $('setBg'); if (!bg) return;
    bg.classList.toggle('in-page', k !== 'home');
    paintNav();
    var main = $('setMain'); main.innerHTML = '';
    if (k === 'home') { main.innerHTML = homeMain(); try { quick(main.querySelector('#setQuick')); } catch (e) {} return; }
    var hd = document.createElement('header'); hd.className = 'set-hd set-phd';
    hd.innerHTML = '<button type="button" class="set-back" data-back aria-label="Indietro">' + ic('back', 18) + '<span>Impostazioni</span></button><b class="set-title">' + esc(p.t) + '</b><button type="button" class="set-x" data-x aria-label="Chiudi">' + ic('x', 18) + '</button>';
    var body = document.createElement('div'); body.className = 'set-scroll set-page';
    var n = 0;
    (p.cards || []).forEach(function (id) { var el = cardEl(id); if (el) { body.appendChild(el); n++; } });
    if (!n) body.innerHTML = '<p class="set-empty">Niente da mostrare qui per il tuo ruolo.</p>';
    main.appendChild(hd); main.appendChild(body);
    if (!first) main.classList.remove('set-in'), void main.offsetWidth, main.classList.add('set-in');
    if (k === 'brigata') try { WL.renderTeam(); } catch (e) {}
    try { if (window.HUB) HUB.render(); } catch (e) {}
  }
  function homeMain() {
    return '<header class="set-hd set-phd only-wide"><b class="set-title">Azioni rapide</b><button type="button" class="set-x" data-x aria-label="Chiudi">' + ic('x', 18) + '</button></header>' +
      '<div class="set-scroll set-page"><div id="setQuick"></div></div>';
  }
  function quick(host) {
    if (!host || !window.HUB || !HUB.refs.tiles) return;
    host.appendChild(HUB.refs.tiles);
  }
  function refresh() { if (!S.open) return; go(S.page, true); }
  function onClick(e) {
    var bg = $('setBg');
    if (e.target === bg) { if (S.page !== 'home' && !wide()) return go('home'); return close(); }
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-x')) return close();
    if (b.hasAttribute('data-back')) return go('home');
    if (b.dataset.go) return go(b.dataset.go);
  }
  function onInput(e) { if (e.target.id !== 'setQ') return; S.q = e.target.value; $('setRows').innerHTML = rows(S.q); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.open && !document.querySelector('.wl-bg.on,.scl-bg.on')) { if (S.page !== 'home' && !wide()) go('home'); else close(); } });

  window.SET = { open: open, close: close, go: go, refresh: refresh, isOpen: function () { return S.open; }, pages: PAGES };
  /* il vecchio «Altro» apre le Impostazioni */
  try {
    var _mc = window.MDL_CLOSE;
    window.MDL_OPEN = function () { open('home'); };
    window.MDL_CLOSE = function () { if (S.open) return close(); if (_mc) try { _mc.apply(this, arguments); } catch (e) {} };
    window.openDrawer = function () { open('home'); };
  } catch (e) {}

  var st = document.createElement('style');
  st.textContent = [
    '.set-bg{position:fixed;inset:0;z-index:8500;background:rgba(20,16,10,.32);opacity:0;transition:opacity .24s;display:flex;justify-content:flex-end}.set-bg.on{opacity:1}',
    '.set-win{position:relative;width:100%;height:100%;background:var(--bg,#F3F0E8);color:var(--ink,#1A1A16);display:flex;overflow:hidden;transform:translateX(24px);transition:transform .3s cubic-bezier(.2,.8,.2,1)}.set-bg.on .set-win{transform:none}',
    '.set-nav,.set-main{display:flex;flex-direction:column;min-width:0;height:100%}.set-nav{flex:1}.set-main{display:none}',
    '.set-bg.in-page .set-nav{display:none}.set-bg.in-page .set-main{display:flex;flex:1}',
    '@media(min-width:900px){.set-bg{padding:24px;justify-content:center;align-items:center}.set-win{max-width:1080px;height:min(880px,100%);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.25)}',
    '.set-nav{flex:0 0 360px;display:flex!important;border-right:1px solid var(--cb,rgba(0,0,0,.08))}.set-main{display:flex!important;flex:1}.set-nav .set-x{display:none}.only-wide{display:flex!important}}',
    '.only-wide{display:none!important}',
    '.set-hd{display:flex;align-items:center;gap:10px;padding:calc(14px + env(safe-area-inset-top)) 18px 10px;flex-shrink:0}@media(min-width:900px){.set-hd{padding-top:18px}}',
    '.set-title{flex:1;min-width:0;font:500 1.85rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.set-phd .set-title{font-size:1.45rem}',
    '.set-x,.set-back{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:40px;min-width:40px;padding:0 10px;border-radius:12px;border:1px solid var(--cb,rgba(0,0,0,.1));background:var(--card,#fff);color:var(--ink);font:600 .82rem "DM Sans",sans-serif;cursor:pointer}',
    '.set-back span{display:none}@media(min-width:900px){.set-back{display:none}}',
    '.set-scroll{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:4px 16px calc(28px + env(safe-area-inset-bottom))}@media(min-width:900px){.set-page{padding:6px 28px 32px}}',
    '.set-in{animation:setIn .28s cubic-bezier(.2,.8,.2,1)}@keyframes setIn{from{opacity:0;transform:translateX(18px)}}@media(prefers-reduced-motion:reduce){.set-in{animation:none}.set-win{transition:none}}',
    '.set-hero{display:flex;gap:14px;align-items:center;padding:14px;border-radius:18px;background:var(--card,#fff);border:1px solid var(--cb,rgba(0,0,0,.06));margin-bottom:12px}',
    '.set-av{width:56px;height:56px;border-radius:14px;object-fit:cover;flex-shrink:0;background:var(--bg2,#eee)}.set-hero>div{min-width:0}.set-hero b{display:block;font:500 1.25rem "Cormorant Garamond",Georgia,serif;font-style:italic}.set-hero>div>span{display:block;font-size:.82rem;color:var(--smoke,#888);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.set-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.set-chips span{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:99px;background:var(--bg2,rgba(0,0,0,.05));font:600 .7rem "DM Sans",sans-serif;color:var(--ink2,#555)}.set-chips i{width:6px;height:6px;border-radius:50%;background:var(--smoke,#999)}.set-chips .ok i{background:#2F7A55}.set-chips .warn i{background:#C0861E}',
    '.set-search{display:flex;align-items:center;gap:8px;height:42px;padding:0 12px;border-radius:12px;background:var(--bg2,rgba(0,0,0,.05));color:var(--smoke);margin-bottom:6px}.set-search input{flex:1;min-width:0;border:0!important;background:none!important;box-shadow:none!important;outline:none!important;padding:0!important;height:auto!important;color:var(--ink);font:16px "DM Sans",sans-serif}',
    '.set-g{margin-top:14px}.set-gt{display:block;padding:0 6px 6px;font:700 10.5px "DM Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke,#888)}',
    '.set-list{border-radius:16px;background:var(--card,#fff);border:1px solid var(--cb,rgba(0,0,0,.06));overflow:hidden}',
    '.set-row{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;padding:9px 12px;border:0;border-top:1px solid var(--cb,rgba(0,0,0,.06));background:none;color:var(--ink);text-align:left;cursor:pointer}.set-row:first-child{border-top:0}',
    '.set-row:hover{background:color-mix(in srgb,var(--ink) 3%,transparent)}.set-row.on{background:color-mix(in srgb,var(--gold2,#B8862F) 10%,transparent)}',
    '.set-ri{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex-shrink:0;background:color-mix(in srgb,var(--gold2,#B8862F) 13%,transparent);color:var(--gold3,#8B6408)}',
    '.set-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.set-rt b{font:600 .95rem "DM Sans",sans-serif}.set-rt small{font-size:.78rem;color:var(--smoke,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.set-bd{font-style:normal;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:#C0861E;color:#fff;font:700 .7rem/20px "DM Sans",sans-serif;text-align:center}.set-rc{color:var(--smoke,#999);display:flex}',
    '.set-empty{padding:24px 6px;color:var(--smoke);font-size:.9rem;text-align:center}.set-foot{margin:22px 0 0;text-align:center;font:italic 1rem "Cormorant Garamond",Georgia,serif;color:var(--smoke)}',
    '.set-mono{display:grid;place-items:center;font:500 1.7rem "Cormorant Garamond",Georgia,serif;font-style:italic;color:var(--gold3,#8B6408);background:color-mix(in srgb,var(--gold2,#B8862F) 13%,transparent)}',
    '.set-page .wl-n,.set-page p{word-break:normal;overflow-wrap:break-word}',
    '.set-page>.wl-card,.set-page>.hub-card,.set-page>section{margin:0 0 12px!important}',
    '.set-page .hub-tiles{margin-top:6px}',
    '.set-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:13px;background:var(--bg2,rgba(0,0,0,.05));margin-top:10px;max-width:320px}.set-seg button{height:38px;border:0;border-radius:10px;background:none;color:var(--ink2);font:600 .9rem "DM Sans",sans-serif;cursor:pointer}.set-seg button.on{background:var(--card,#fff);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.14)}',
    '.set-th{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:10px}',
    '.set-thc{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px;border-radius:14px;border:1.5px solid var(--cb,rgba(0,0,0,.1));background:var(--card,#fff);color:var(--ink);text-align:left;cursor:pointer}.set-thc.on{border-color:var(--gold2,#B8862F);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold2,#B8862F) 30%,transparent)}',
    '.set-thp{display:flex;flex-direction:column;gap:4px;width:100%;height:58px;padding:8px;border-radius:10px;background:var(--tb);margin-bottom:6px}.set-thp i{display:block;height:8px;border-radius:4px;background:var(--tc);box-shadow:0 0 0 1px rgba(0,0,0,.06)}.set-thp i:first-child{width:55%;background:var(--ti)}.set-thp i:last-child{width:35%;background:var(--ta)}',
    '.set-thc b{font-size:.88rem}.set-thc small{font-size:.72rem;color:var(--smoke)}',
    '.wl-embed .wl-hd{display:none}',
    '.wl-keep .wl-n,.wl-embed .wl-n{word-break:normal!important;overflow-wrap:break-word}.wl-keep .wl-sh{text-align:center;padding:1.6rem 1.3rem 1.8rem;max-width:420px}.wl-keep .wl-sh .fd{display:block;font-size:1.6rem;font-style:italic;margin:6px 0 8px}.wl-keep .wl-n{margin:0 0 6px}',
    '.wl-keep-ic{width:58px;height:58px;margin:0 auto;border-radius:18px;display:grid;place-items:center;background:color-mix(in srgb,var(--gold2,#B8862F) 14%,transparent);color:var(--gold3,#8B6408)}',
    '.wl-keep-me{font:600 .85rem "DM Sans",sans-serif;color:var(--ink2);margin:8px 0 14px}.wl-keep .wl-btn.wide{width:100%;margin-top:8px;min-height:48px}'
  ].join('\n');
  document.head.appendChild(st);
})();
