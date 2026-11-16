/* ════════════════════════════════════════════════════════════════════
   ÉCLAT OS — registrazione del tema e scene 3D per Recipe-and-more
   Va caricato subito dopo lo script principale dell'app (prima di WL.start).
   Non modifica funzioni dell'app: aggiunge il tema "Éclat" ai selettori,
   lo applica una volta come predefinito e monta le scene 3D in accesso e home.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ID = 't-eclat', FLAG = 'mdl_eclat_v3';
  var THREE_URL = '/vendor/three.min.js';
  var ENGINE_URL = '/eclat3d.js';
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ── 1. il tema entra nei selettori esistenti ── */
  try { if (window.THEMES && THEMES.indexOf(ID) === -1) THEMES.unshift(ID); } catch (e) {}
  try { if (window.THEME_META && !THEME_META.some(function (t) { return t.id === ID; })) THEME_META.unshift({ id: ID, lbl: 'Atelier', color: '#9A7B4F' }); } catch (e) {}
  try { if (window._TH && !_TH.some(function (t) { return t.id === ID; })) _TH.unshift({ id: ID, l: 'Atelier', c: '#9A7B4F' }); } catch (e) {}
  var bar = document.querySelector('#landing .t-bar');
  if (bar && !bar.querySelector('.t-dot[data-t="' + ID + '"]')) {
    var dot = document.createElement('div');
    dot.className = 't-dot'; dot.dataset.t = ID; dot.title = 'Atelier';
    var first = bar.querySelector('.t-dot');
    bar.insertBefore(dot, first || null);
  }

  /* già alla pagina d'accesso si vede il nuovo aspetto */
  var saved = ls('mdl_th');
  if (!saved || saved === ID || !ls(FLAG)) document.body.classList.add(ID);

  /* ── 2. una sola volta per account: Éclat diventa il tema attivo ── */
  var _boot = window.boot;
  if (typeof _boot === 'function') {
    window.boot = function () {
      if (!ls(FLAG)) { ls('mdl_th', ID); ls(FLAG, '1'); }
      var r = _boot.apply(this, arguments);
      afterBoot();
      return r;
    };
  }

  /* ── 3. caricamento pigro del motore 3D ── */
  var engine = null;
  function load3D() {
    if (engine) return engine;
    engine = new Promise(function (res, rej) {
      function add(src, next) {
        var s = document.createElement('script'); s.src = src; s.async = true;
        s.onload = next; s.onerror = function () { rej(new Error(src)); };
        document.head.appendChild(s);
      }
      var go = function () { window.Eclat3D ? res(window.Eclat3D) : add(ENGINE_URL, function () { res(window.Eclat3D); }); };
      window.THREE ? go() : add(THREE_URL, go);
    });
    return engine;
  }
  function mount(slot, opts) {
    if (!slot || slot._ex) return;
    slot._ex = true;
    load3D().then(function (E) {
      var v = E && E.mount(slot, opts);
      if (!v || !v.ok) slot.closest('.ex-stage, .ex-hero3d').classList.add('ex-no3d');
      slot._view = v;
    }).catch(function () { var p = slot.closest('.ex-stage, .ex-hero3d'); if (p) p.classList.add('ex-no3d'); });
  }
  window.eclatLoad3D = load3D;
  function isEclat() { return document.body.classList.contains(ID); }

  /* ── 4. pagina d'accesso: scheda + palco 3D (stessi elementi, solo raccolti) ── */
  function decorateLogin() {
    var pwd = $('pwd');
    if (!pwd || pwd._ex) return;
    pwd._ex = true;
    var card = document.createElement('div'); card.className = 'ex-login';
    var ey = document.createElement('span'); ey.className = 'ex-eyebrow'; ey.textContent = 'Atelier privato';
    card.appendChild(ey);
    while (pwd.firstChild) card.appendChild(pwd.firstChild);
    var stage = document.createElement('div'); stage.className = 'ex-stage'; stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<div class="ex-stage-slot"></div>' +
      '<span class="ex-badge ex-b1"><i>✦</i><span>Laboratorio 3D<small>trascina per ruotare</small></span></span>' +
      '<span class="ex-badge ex-b2"><i>◐</i><span>Glassa a specchio<small>34 °C · 24 °Brix</small></span></span>';
    pwd.appendChild(card); /* niente palco 3D: versione stabile */
    /* la scena parte solo se la pagina d'accesso resta davvero a schermo */
    var check = function () {
      if (isEclat() && pwd.style.display !== 'none' && getComputedStyle(pwd).display !== 'none') mount(stage.firstChild, { scene: 'accesso', autoPlay: !calm });
    };
  }

  /* ── 5. home: marchio a sinistra, scena 3D a destra, numeri del ricettario ── */
  function decorateLanding() {
    var top = document.querySelector('#landing .land-top');
    if (!top || top._ex) return;
    top._ex = true;
    var brand = document.createElement('div'); brand.className = 'ex-brand';
    ['.land-logo', '.land-ey', '.land-h', '.land-rule'].forEach(function (sel) { var n = top.querySelector(sel); if (n) brand.appendChild(n); });
    var stats = document.createElement('div'); stats.className = 'ex-stats'; stats.id = 'exStats';
    brand.appendChild(stats);
    var hero = document.createElement('div'); hero.className = 'ex-hero3d'; hero.setAttribute('aria-hidden', 'true');
    hero.innerHTML = '<div class="ex-stage-slot"></div><span class="ex-badge"><i>✦</i><span>Atelier 3D<small>trascina per ruotare</small></span></span>';
    top.appendChild(brand); /* niente scena 3D in home: versione stabile */
  }
  function updateStats() {
    var box = $('exStats'); if (!box) return;
    var recs = []; try { recs = (window.CU || []).concat(window.R || []); } catch (e) {}
    try { if (typeof allRecs === 'function') { var s = window.curSec; window.curSec = null; recs = allRecs(); window.curSec = s; } } catch (e) {}
    var cats = {}, plates = {};
    recs.forEach(function (r) { if (r && r.c) cats[r.c] = 1; if (r && r.piatto && String(r.piatto).trim()) plates[String(r.piatto).trim()] = 1; });
    var html = '<span class="ex-stat"><b>' + recs.length + '</b>ricette</span>' +
      '<span class="ex-stat"><b>' + Object.keys(cats).length + '</b>categorie</span>';
    if (Object.keys(plates).length) html += '<span class="ex-stat"><b>' + Object.keys(plates).length + '</b>piatti</span>';
    box.innerHTML = html;
  }

  function afterBoot() {
    /* home con il layout originale: niente riorganizzazione, niente contatori */
    var hero = document.querySelector('.ex-hero3d .ex-stage-slot');
    var land = $('landing');
    var tryHero = function () {
      if (isEclat() && land && land.style.display !== 'none' && hero && !hero._ex) mount(hero, { scene: 'accesso' });
    };
    tryHero();
    /* le schermate cambiano col display: osservo solo lo stile della home */
    if (land && window.MutationObserver) new MutationObserver(function () { tryHero(); updateStats(); }).observe(land, { attributes: true, attributeFilter: ['style'] });
    /* cambio tema dal selettore: la scena parte se si torna su Éclat */
    if (window.MutationObserver) new MutationObserver(tryHero).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    /* i numeri si aggiornano quando l'elenco ricette cambia */
    try {
      var _rg = window.renderGrid;
      if (typeof _rg === 'function') window.renderGrid = function () { var r = _rg.apply(this, arguments); try { updateStats(); } catch (e) {} return r; };
    } catch (e) {}
  }

  /* ── 6. notifiche con spunta, a disposizione dell'app ── */
  window.eclatToast = function (msg) {
    var host = document.querySelector('.ex-toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'ex-toast-host'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    var t = document.createElement('div'); t.className = 'ex-toast';
    t.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.4 2.4 4.6-5"/></svg><span></span>';
    t.lastChild.textContent = msg;
    while (host.children.length > 1) host.firstChild.remove();
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 380); }, 2200);
  };

  decorateLogin();
})();
