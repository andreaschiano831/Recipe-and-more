/* ════════════════════════════════════════════════════════════════════
   HOME OPERATIVA — il lavoro del giorno in primo piano
   · saluto e data · timer attivi con i comandi
   · ricette in produzione (pesata o passaggi lasciati a metà) con
     avanzamento e «Riprendi» (Laboratorio) / «Cucina»
   · libro che stavi leggendo · azioni rapide
   · primi passi per chi ha l'account vuoto
   Ogni riquadro compare solo se c'è qualcosa da mostrare.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var IC = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    cook: '<svg viewBox="0 0 24 24"><path d="M6 14h12v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M4 14h16M9 10c0-2 2-2 2-4M13 10c0-2 2-2 2-4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H4zM20 5h-6a3 3 0 0 0-3 3"/><path d="M20 5v12.5h-6.5A2.5 2.5 0 0 0 11 20"/></svg>',
    team: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>'
  };
  var DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'adesso'; if (m < 60) return m + ' min fa';
    var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' ora fa' : ' ore fa');
    var d = Math.round(h / 24); return d === 1 ? 'ieri' : d + ' giorni fa';
  }
  function first() { try { var u = WL.user(), n = (u && u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || ''; return String(n).split(/\s+/)[0] || ''; } catch (e) { return ''; } }
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }); }

  /* ricette in produzione: spunte o passaggi fatti, non concluse, negli ultimi 4 giorni */
  function inProduction() {
    var W = (window.XL && XL.weighed) || {}, T = W._t || {}, out = [];
    recs().forEach(function (r) {
      var k = String(r._id || r.n), t = T[k]; if (!t || Date.now() - t > 4 * 864e5) return;
      var w = W[k] || {}, sd = W['p:' + k] || {}, ni = (r.i || []).length, ns = 0, nw = 0, n = 0;
      try { n = ckSteps(r.p).steps.length; } catch (e) {}
      for (var a in w) if (w[a]) nw++;
      for (var b in sd) if (sd[b]) ns++;
      if (!nw && !ns) return;
      var done = n ? ns >= n : (ni && nw >= ni);
      out.push({ r: r, t: t, nw: nw, ni: ni, ns: ns, n: n, done: done, pct: Math.round(((ni ? nw / ni : 0) * (n ? 0.35 : 1) + (n ? ns / n * 0.65 : 0)) * 100) });
    });
    return out.sort(function (a, b) { return (a.done - b.done) || b.t - a.t; }).slice(0, 8);
  }
  function lastBook() {
    var c = null; try { c = JSON.parse(localStorage.getItem('mdl_lib_cache') || 'null'); } catch (e) {}
    var books = (window.LIB && LIB.books && LIB.books.length ? LIB.books : c && c.books) || [], prog = (window.LIB && LIB.loaded ? LIB.progress : c && c.progress) || {};
    var best = null;
    books.forEach(function (b) { var p = prog[b.id]; if (!p || !(p.percent > 0.005) || p.percent > 0.995) return; var t = Date.parse(p.updated_at || 0) || 0; if (!best || t > best.t) best = { b: b, p: p, t: t }; });
    return best;
  }
  function hasTeam() { try { return WL.inTeam() || (WL.isAdmin() && false); } catch (e) { return false; } }

  function render() {
    var land = $('landing'); if (!land || !window.WL || !WL.signedIn()) return;
    var box = $('hm');
    if (!box) {
      box = document.createElement('section'); box.id = 'hm'; box.className = 'hm'; box.setAttribute('aria-label', 'Il lavoro di oggi');
      var anchor = $('landPanels'); if (!anchor) return; anchor.parentNode.insertBefore(box, anchor);
    }
    var now = new Date(), hr = now.getHours(), greet = hr < 5 ? 'Buonanotte' : hr < 13 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera';
    var P = inProduction(), B = lastBook(), R = recs(), T = (window.XL && XL.timers) ? XL.timers.list() : [], ed = WL.canEdit ? WL.canEdit() : true;
    var role = WL.inTeam && WL.inTeam() ? WL.roleLabel() : '';
    var prod = P.map(function (x, i) {
      var r = x.r, bits = [];
      if (x.ni) bits.push('pesata ' + x.nw + '/' + x.ni);
      if (x.n) bits.push(x.done ? 'tutti i passaggi fatti' : 'passaggio ' + Math.min(x.n, x.ns + 1) + ' di ' + x.n);
      return '<article class="hm-pr' + (x.done ? ' done' : '') + '" style="--i:' + i + '"><div class="hm-pr-top"><span class="hm-ring" style="--p:' + x.pct + '"><b>' + x.pct + '%</b></span><div class="hm-pr-t"><b>' + esc(r.n) + '</b><small>' + esc(bits.join(' · ')) + ' · ' + ago(x.t) + '</small></div></div>' +
        '<div class="hm-pr-a"><button type="button" class="hm-b dark" data-lab="' + i + '">' + (x.done ? 'Apri' : 'Riprendi') + '</button><button type="button" class="hm-b" data-cook="' + i + '">' + IC.cook + 'Cucina</button><button type="button" class="hm-ib" data-clear="' + i + '" title="Togli dalla produzione" aria-label="Togli dalla produzione">' + IC.x + '</button></div></article>';
    }).join('');
    var quick = [
      ed ? ['new', IC.plus, 'Nuova ricetta'] : null,
      ed ? ['ai', IC.spark, 'Importa con l’AI'] : null,
      ['timer', IC.clock, 'Timer rapido'],
      ['lib', IC.book, 'Biblioteca'],
      (WL.isAdmin && WL.isAdmin()) ? ['team', IC.team, 'Brigata'] : null
    ].filter(Boolean).map(function (q) { return '<button type="button" class="hm-q" data-q="' + q[0] + '">' + q[1] + '<span>' + q[2] + '</span></button>'; }).join('');
    var empty = !R.length;
    box.innerHTML =
      '<div class="hm-head"><div><span class="hm-date">' + DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()] + (role ? ' · ' + esc(role) : '') + '</span><h2>' + greet + (first() ? ', ' + esc(first()) : '') + '</h2></div>' +
        '<div class="hm-stats"><span><b>' + R.length + '</b> ricette</span>' + (P.filter(function (x) { return !x.done; }).length ? '<span><b>' + P.filter(function (x) { return !x.done; }).length + '</b> in produzione</span>' : '') + (T.length ? '<span><b>' + T.length + '</b> timer</span>' : '') + '</div></div>' +
      '<div class="hm-grid"><div class="hm-col hm-main">' +
        (empty ? '<div class="hm-card hm-start"><span class="hm-k">Primi passi</span><h3>Riempi il tuo ricettario</h3><p>Scrivi una ricetta, oppure fotografa una pagina o carica un PDF: l’AI la trascrive con ingredienti e procedimento.</p><div class="hm-pr-a"><button type="button" class="hm-b dark" data-q="ai">' + IC.spark + 'Importa con l’AI</button><button type="button" class="hm-b" data-q="new">Scrivila a mano</button>' + ((WL.isAdmin && WL.isAdmin()) ? '<button type="button" class="hm-b" data-q="team">Invita la brigata</button>' : '') + '</div></div>' : '') +
        (prod ? '<div class="hm-card hm-prod"><div class="hm-ch"><span class="hm-k">In produzione</span><span class="hm-n">' + P.length + '</span></div><div class="hm-prs">' + prod + '</div></div>' : '') +
        (!empty ? '<div class="hm-card hm-quick"><span class="hm-k">Azioni rapide</span><div class="hm-qs">' + quick + '</div></div>' : '') +
      '</div><div class="hm-col hm-side">' +
        '<div class="hm-card hm-timers" id="hmTimerCard"' + (T.length ? '' : ' hidden') + '><div class="hm-ch"><span class="hm-k">Timer</span></div><div id="hmTimers" class="hm-tl"></div></div>' +
        (B ? '<button type="button" class="hm-card hm-book" id="hmBook"><span class="hm-k">Continua a leggere</span><b>' + esc(B.b.title) + '</b><small>' + esc(B.b.author || '') + '</small><span class="hm-bar"><i style="width:' + Math.round(B.p.percent * 100) + '%"></i></span><small class="hm-bp">' + Math.round(B.p.percent * 100) + '% · ' + ago(B.t || Date.now()) + '</small></button>' : '') +
      '</div></div>';
    /* eventi */
    [].forEach.call(box.querySelectorAll('[data-lab]'), function (b) { b.onclick = function () { XL.open(P[+b.dataset.lab].r, 'lab'); }; });
    [].forEach.call(box.querySelectorAll('[data-cook]'), function (b) { b.onclick = function () { openCucina(P[+b.dataset.cook].r); }; });
    [].forEach.call(box.querySelectorAll('[data-clear]'), function (b) {
      b.onclick = function () {
        var r = P[+b.dataset.clear].r, k = String(r._id || r.n), W = XL.weighed;
        delete W[k]; delete W['p:' + k]; if (W._t) delete W._t[k];
        try { localStorage.setItem('xl_bench', JSON.stringify(W)); } catch (e) {}
        var card = b.closest('.hm-pr'); if (card && window.MOTION && MOTION.on()) { card.classList.add('out'); setTimeout(render, 260); } else render();
      };
    });
    [].forEach.call(box.querySelectorAll('[data-q]'), function (b) {
      b.onclick = function () {
        var q = b.dataset.q;
        if (q === 'new') { if (window.openModal) openModal(); }
        else if (q === 'ai') { if (window.openStudio) openStudio(); }
        else if (q === 'timer') { if (window.SX) SX.open('timer '); }
        else if (q === 'lib') { if (window.openLibrary) openLibrary(); }
        else if (q === 'team') { WL.openSettings(); setTimeout(function () { var c = $('wlTeamCard'); if (c) c.scrollIntoView({ block: 'start' }); }, 250); }
      };
    });
    var hb = $('hmBook'); if (hb) hb.onclick = function () { var b = B.b; if (window.openLibrary) openLibrary(); setTimeout(function () { try { libOpenReader(b); } catch (e) {} }, 350); };
    try { if (XL.timers) XL.timers.render(); } catch (e) {}
  }
  var soonT = null;
  function soon() { clearTimeout(soonT); soonT = setTimeout(function () { var l = $('landing'); if (l && l.style.display !== 'none') render(); }, 120); }
  window.HM = { render: render, soon: soon, inProduction: inProduction };

  function hook(name, after) { var f = window[name]; if (typeof f !== 'function' || f._hm) return; var w = function () { var r = f.apply(this, arguments); try { after(); } catch (e) {} return r; }; w._hm = 1; for (var k in f) if (k === '_mo') w[k] = f[k]; window[name] = w; }
  function start() {
    render();
    hook('tbGoHome', soon); hook('closeCucina', soon); hook('closeLibrary', soon); hook('persistLocal', soon);
    if (window.XL && XL.close && !XL.close._hm) { var xc = XL.close; XL.close = function () { var r = xc.apply(this, arguments); soon(); return r; }; XL.close._hm = 1; }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') soon(); });
    setInterval(soon, 60000);
  }
  if (typeof window.boot === 'function') { var _b = window.boot; window.boot = function () { var r = _b.apply(this, arguments); setTimeout(start, 0); return r; }; }
})();
