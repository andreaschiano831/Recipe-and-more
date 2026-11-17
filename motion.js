/* ════════════════════════════════════════════════════════════════════
   SISTEMA DI MOVIMENTO
   · transizioni tra schermate con continuità (View Transitions):
     pannello della Home → titolo della Collezione, scheda ricetta → titolo
     della ricetta aperta; avanti entra da destra, indietro da sinistra
   · griglia che si riordina (FLIP): le schede che restano scivolano al
     nuovo posto, le nuove compaiono in sequenza
   · pastiglia della barra in basso che scorre sulla scheda attiva
   · notifiche: niente doppioni, al massimo due
   · preferenza per dispositivo: Complete / Ridotte / Spente
   Solo trasparenza e posizione (GPU). Caricato per ultimo, avvolge le
   funzioni dell'app senza cambiarle.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KEY = 'wl_motion';
  var root = document.documentElement;
  var sysReduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function level() { var v = null; try { v = localStorage.getItem(KEY); } catch (e) {} return v || (sysReduce ? 'reduced' : 'full'); }
  function apply() { root.dataset.motion = level(); }
  apply();
  var M = window.MOTION = {
    level: level,
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} apply(); },
    full: function () { return level() === 'full'; },
    on: function () { return level() !== 'off'; }
  };
  function $(id) { return document.getElementById(id); }
  function vib(p) { if (M.on()) try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  M.vib = vib;

  /* ══════════ TRANSIZIONI TRA SCHERMATE ══════════ */
  var busy = false;
  /* dir: 'fwd' | 'back' | 'fade'; pair: [elemento di partenza, funzione che trova l'arrivo] */
  function vt(update, dir, pair) {
    if (!document.startViewTransition || !M.on() || busy || document.hidden) { update(); return; }
    var from = pair && pair[0], name = 'wl-hero';
    root.dataset.vt = M.full() ? (dir || 'fade') : 'fade';
    if (from && M.full()) from.style.viewTransitionName = name;
    busy = true;
    var t;
    try {
      t = document.startViewTransition(function () {
        if (from) from.style.viewTransitionName = '';
        update();
        if (pair && M.full()) { var to = pair[1](); if (to) { to.style.viewTransitionName = name; t && t.finished.then(function () { to.style.viewTransitionName = ''; }); pair.to = to; } }
      });
    } catch (e) { busy = false; if (from) from.style.viewTransitionName = ''; update(); return; }
    t.finished.then(done, done);
    function done() { busy = false; delete root.dataset.vt; if (pair && pair.to) pair.to.style.viewTransitionName = ''; }
  }
  M.vt = vt;
  /* rettangolo di un elemento come clip-path, per aprire la schermata dalla sua forma */
  function clipFrom(el) {
    if (!el || !M.full()) return false;
    var r = el.getBoundingClientRect(); if (!(r.width > 0) || r.bottom < 0 || r.top > innerHeight) return false;
    var W = innerWidth, H = innerHeight, rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 14;
    root.style.setProperty('--mo-clip', 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, W - r.right) + 'px ' + Math.max(0, H - r.bottom) + 'px ' + Math.max(0, r.left) + 'px round ' + rad + 'px)');
    return true;
  }
  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; }

  function wrap(name, make) { var f = window[name]; if (typeof f !== 'function' || f._mo) return; var w = make(f); w._mo = 1; window[name] = w; }

  function hook() {
    /* Home → Collezione */
    wrap('openSection', function (f) {
      return function (sec) {
        var self = this, args = arguments, land = $('landing');
        if (!land || land.style.display === 'none') return f.apply(self, args);
        var panel = document.querySelector('#landPanels .panel[data-sec="' + sec + '"]');
        enterGrid = true;
        var z = clipFrom(panel);
        vt(function () { f.apply(self, args); window.scrollTo(0, 0); }, z ? 'zoom' : 'fwd');
      };
    });
    /* Collezione → Home */
    wrap('tbGoHome', function (f) {
      return function () {
        var self = this, args = arguments, app = $('app');
        if (!app || !app.classList.contains('on')) return f.apply(self, args);
        var sec = window.curSec;
        vt(function () {
          f.apply(self, args);
          var p = sec && document.querySelector('#landPanels .panel[data-sec="' + sec + '"]');
          if (!clipFrom(p)) root.dataset.vt = 'back'; else root.dataset.vt = 'unzoom';
        }, 'back');
      };
    });
    /* scheda ricetta → ricetta aperta */
    var lastCard = null;
    document.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('#grid .card'); if (c) lastCard = c; }, true);
    wrap('openRecipePanel', function (f) {
      return function (r) {
        var self = this, args = arguments, bg = $('recipePanelBg');
        if (bg && bg.style.display !== 'none') return f.apply(self, args);
        var nm = lastCard && lastCard.isConnected && lastCard.querySelector('.card-name');
        lastCard = null;
        var res;
        vt(function () { res = f.apply(self, args); }, 'fwd', visible(nm) ? [nm, function () { return $('rpName'); }] : null);
        return res;
      };
    });
    wrap('closeRecipePanel', function (f) {
      return function () {
        var self = this, args = arguments, bg = $('recipePanelBg'), rec = window._rpRec;
        if (!bg || bg.style.display === 'none') return f.apply(self, args);
        var from = $('rpName');
        vt(function () { f.apply(self, args); }, 'back', rec ? [from, function () {
          var hit = null; [].forEach.call(document.querySelectorAll('#grid .card'), function (c) { var n = c.querySelector('.card-name'); if (!hit && n && n.firstChild && n.firstChild.nodeValue === rec.n) hit = n; });
          return visible(hit) ? hit : null;
        }] : null);
      };
    });
    /* biblioteca e laboratorio: dissolvenza con direzione */
    ['openLibrary', 'openStudio'].forEach(function (n) { wrap(n, function (f) { return function () { var s = this, a = arguments, r; vt(function () { r = f.apply(s, a); }, 'fwd'); return r; }; }); });
    ['closeLibrary'].forEach(function (n) { wrap(n, function (f) { return function () { var s = this, a = arguments, r; vt(function () { r = f.apply(s, a); }, 'back'); return r; }; }); });
    if (window.XL && XL.open && !XL.open._mo) {
      var xo = XL.open, xc = XL.close;
      XL.open = function (r, mode) {
        var s = this, a = arguments, was = XL.viewOpen, wasMode = XL.mode;
        if (was && XL.rec && r && XL.rec._id === r._id) return xo.apply(s, a);
        vt(function () { xo.apply(s, a); }, was ? 'fade' : 'fwd');
      };
      XL.open._mo = 1;
      XL.close = function () { var s = this, a = arguments; if (!XL.viewOpen) return xc.apply(s, a); vt(function () { xc.apply(s, a); }, 'back'); };
    }
    /* griglia che si riordina */
    wrap('renderGrid', function (f) {
      return function () {
        var grid = $('grid'), before = null;
        if (grid && M.on() && !busy && $('app') && $('app').classList.contains('on')) {
          before = {}; [].forEach.call(grid.querySelectorAll('.card'), function (c, i) { if (i < 60) { var k = keyOf(c); if (k) before[k] = c.getBoundingClientRect(); } });
        }
        var res = f.apply(this, arguments);
        try { flip(grid, before); } catch (e) {}
        return res;
      };
    });
  }
  var enterGrid = false;
  function keyOf(c) { var n = c.querySelector('.card-name'); return n && n.firstChild ? String(n.firstChild.nodeValue || '') : ''; }
  function flip(grid, before) {
    if (!grid || !M.on()) return;
    var cards = [].slice.call(grid.querySelectorAll('.card'), 0, 60), first = enterGrid; enterGrid = false;
    if (!cards.length) return;
    var ease = 'cubic-bezier(.2,.8,.2,1)', k = 0;
    cards.forEach(function (c) {
      var r = c.getBoundingClientRect(); if (r.top > innerHeight + 200) return;
      var b = before && before[keyOf(c)];
      if (b && !first) {
        var dx = b.left - r.left, dy = b.top - r.top;
        if (Math.abs(dx) + Math.abs(dy) > 1 && M.full()) c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 360, easing: ease });
      } else if (first || before) {
        var d = Math.min(k++, 10) * (M.full() ? 34 : 0);
        c.animate(M.full() ? [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }], { duration: M.full() ? 380 : 200, delay: d, easing: ease, fill: 'backwards' });
      }
    });
  }

  /* ══════════ BARRA IN BASSO: pastiglia che scorre ══════════ */
  function tabPill() {
    var bar = $('tabbar'); if (!bar || bar._mo) return; bar._mo = 1;
    var pill = document.createElement('span'); pill.className = 'mo-pill'; pill.setAttribute('aria-hidden', 'true'); bar.insertBefore(pill, bar.firstChild);
    bar.classList.add('mo-has-pill');
    var place = function (instant) {
      var on = bar.querySelector('button.on:not(.tb-new)');
      if (!on || !bar.offsetWidth) { pill.style.opacity = '0'; return; }
      var br = bar.getBoundingClientRect(), r = on.getBoundingClientRect();
      if (instant) pill.style.transition = 'none';
      pill.style.opacity = '1';
      pill.style.width = r.width + 'px'; pill.style.height = r.height + 'px';
      pill.style.transform = 'translate(' + (r.left - br.left) + 'px,' + (r.top - br.top) + 'px)';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    };
    new MutationObserver(function () { place(false); }).observe(bar, { subtree: true, attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', function () { place(true); });
    new MutationObserver(function () { place(true); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setTimeout(function () { place(true); }, 50);
  }

  /* ══════════ NOTIFICHE ══════════ */
  function toasts() {
    var orig = window.eclatToast; if (typeof orig !== 'function' || orig._mo) return;
    var last = { msg: '', t: 0 };
    var w = function (msg) {
      var now = Date.now(), host = document.querySelector('.ex-toast-host');
      if (msg === last.msg && now - last.t < 1800 && host && host.lastChild) { var t = host.lastChild; t.classList.remove('mo-again'); void t.offsetWidth; t.classList.add('mo-again'); last.t = now; return; }
      last = { msg: msg, t: now };
      orig.apply(this, arguments);
      vib(10);
    };
    w._mo = 1; window.eclatToast = w;
  }

  /* ══════════ IMPOSTAZIONE NELLA SCHEDA ACCOUNT ══════════ */
  function settingsCard(sheet) {
    var sh = sheet.querySelector('.wl-sh'); if (!sh || sh.querySelector('#moCard')) return;
    var cur = level();
    var card = document.createElement('section'); card.className = 'wl-card'; card.id = 'moCard';
    card.innerHTML = '<b class="wl-t">Animazioni</b><p class="wl-n">Su questo dispositivo.' + (sysReduce ? ' Il sistema chiede meno movimento.' : '') + '</p>' +
      '<div class="mo-seg" role="radiogroup" aria-label="Animazioni">' + [['full', 'Complete'], ['reduced', 'Ridotte'], ['off', 'Spente']].map(function (o) { return '<button type="button" role="radio" aria-checked="' + (cur === o[0]) + '" data-mo="' + o[0] + '" class="' + (cur === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>';
    sh.appendChild(card);
    [].forEach.call(card.querySelectorAll('[data-mo]'), function (b) {
      b.onclick = function () { M.set(b.dataset.mo); [].forEach.call(card.querySelectorAll('[data-mo]'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); }); };
    });
  }
  new MutationObserver(function (list) {
    list.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.id === 'wlSheet') settingsCard(n); }); });
  }).observe(document.body, { childList: true });

  /* ══════════ AVVIO ══════════ */
  function start() { hook(); tabPill(); toasts(); }
  if (typeof window.boot === 'function') {
    var _b = window.boot;
    window.boot = function () { var r = _b.apply(this, arguments); try { start(); } catch (e) { console.error(e); } return r; };
  }
  if (document.readyState !== 'loading') setTimeout(start, 0); else document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
})();
