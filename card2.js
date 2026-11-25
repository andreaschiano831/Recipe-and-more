/* ════════════════════════════════════════════════════════════════════
   CARD RICETTA 2 — la scheda della collezione ripensata
   · tocco sulla scheda = apre la ricetta (pagina Laboratorio, con la dose scelta)
   · in alto: categoria · piatto e un solo menu «⋯» per modifica, sposta,
     procedimento, scheda classica, elimina
   · nome, poi i dati che contano: ingredienti, peso, kcal/100 g, allergeni
   · dose e ingredienti (anteprima di 6 righe, «mostra tutti»)
   · in basso una barra d'azioni chiara: Apri · Cucina · Stampi · Stampa
   Si appoggia ai pezzi esistenti (dose per scheda, tabella, selezione multipla).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof window.buildCard !== 'function') return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function fmtG(v) { return Math.round(v).toLocaleString('it-IT'); }
  var I = {
    play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>',
    pot: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h20M9 6c0-1.5 1-2 1-3M14 6c0-1.5 1-2 1-3"/></svg>',
    mold: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="7" width="18" height="11" rx="2"/><path d="M3 11h18"/></svg>',
    print: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
    move: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5 12 16l2.5-2.5"/></svg>',
    proc: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    card: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    lab: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/></svg>'
  };
  function doseOf(r) { try { return cardDoseOf(r); } catch (e) { return (typeof dose === 'number' && dose > 0) ? dose : 1; } }
  function multi() { return typeof _multiMode !== 'undefined' && _multiMode; }
  function admin() { return typeof isAdmin !== 'undefined' && isAdmin; }
  function openLab(r, mode) {
    var d = doseOf(r);
    if (!window.XL || !XL.open) { try { openRecipePanel(r); } catch (x) {} return; }
    try { XL.open(r, mode || 'lab'); } catch (e) { console.warn(e); }
    /* XL.open parte già dalla dose della scheda; se una transizione la ritarda, la riallinea */
    setTimeout(function () { try { if (XL.viewOpen && XL.rec && XL.rec.n === r.n && Math.abs(d - XL.dose) > 1e-9) XL.setDose(d, true); } catch (e) {} }, 450);
  }

  /* menu «⋯» */
  function menu(anchor, r) {
    var old = document.getElementById('rc2Menu'); if (old) { var same = old._a === anchor; old.remove(); if (same) return; }
    var it = [];
    if (admin()) {
      it.push(['edit', I.edit, 'Modifica ricetta', function () { openEdit(r); }]);
      it.push(['move', I.move, 'Sposta in un altro ricettario', function () { openMove(r); }]);
      if (!r.p) it.push(['proc', I.proc, 'Aggiungi procedimento', function () { openQuickProc(r); }]);
    }
    it.push(['card', I.card, 'Scheda classica', function () { openRecipePanel(r); }]);
    it.push(['lab', I.lab, 'Bilanciamento e analisi', function () { openLab(r, 'formula'); }]);
    (window.RC2_MENU || []).forEach(function (x) { try { if (!x.show || x.show(r)) it.push([x.k, x.icon, x.label, function () { x.run(r, doseOf(r)); }]); } catch (e) {} });
    if (admin() && r._c && r._id) it.push(['del', I.trash, 'Elimina', function () { openCfm(r); }]);
    var m = h('div', 'rc2-menu'); m.id = 'rc2Menu'; m._a = anchor; m.setAttribute('role', 'menu');
    m.innerHTML = it.map(function (x, i) { return '<button type="button" role="menuitem" data-i="' + i + '" class="' + (x[0] === 'del' ? 'del' : '') + '">' + x[1] + '<span>' + x[2] + '</span></button>'; }).join('');
    document.body.appendChild(m);
    var b = anchor.getBoundingClientRect(), w = m.offsetWidth, hh = m.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, b.right - w)), top = b.bottom + 6;
    if (top + hh > window.innerHeight - 8) top = Math.max(8, b.top - hh - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    requestAnimationFrame(function () { m.classList.add('on'); });
    [].forEach.call(m.querySelectorAll('[data-i]'), function (x) { x.onclick = function (e) { e.stopPropagation(); m.remove(); it[+x.dataset.i][3](); }; });
    setTimeout(function () {
      function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); window.removeEventListener('scroll', off2, true); } }
      function off2() { m.remove(); document.removeEventListener('pointerdown', off, true); window.removeEventListener('scroll', off2, true); }
      document.addEventListener('pointerdown', off, true); window.addEventListener('scroll', off2, true);
    }, 0);
  }

  var _bc = window.buildCard;
  window.buildCard = function (r, idx) {
    var c = _bc.apply(this, arguments);
    try { rebuild(c, r); } catch (e) { console.error(e); }
    (window.RC2_HOOKS || []).forEach(function (fn) { try { fn(c, r); } catch (e) {} });
    return c;
  };
  try { buildCard = window.buildCard; } catch (e) {}

  function rebuild(c, r) {
    c.classList.add('rc2');
    var old = c.querySelector('.card-hd'), tbl = c.querySelector('.tbl'), bar = c.querySelector('.cd-bar');
    var pt = c.querySelector('.card-proc-toggle'), pc = c.querySelector('.card-proc'), pa = c.querySelector('.card-proc-add');
    [].forEach.call(c.querySelectorAll('.xl-card-ctas'), function (x) { x.remove(); });
    if (pa) pa.remove();
    var ings = r.i || [], tot = 0;
    ings.forEach(function (g) { var v = null; try { v = rcGrams(g[1], g[2], g[0]); } catch (e) {} if (v > 0) tot += v; });
    var kcal = null, alg = '';
    try { if (window.NUT) { var A = NUT.analyze(r); if (A.known && A.cov > .6) kcal = A.sum[0] / A.known * 100; alg = NUT.badges(r).join(''); } } catch (e) {}

    /* testata */
    var hd = h('div', 'rc2-hd');
    var sec = '';
    try { if (typeof curSec !== 'undefined' && curSec === 'tutti' && r.s) sec = WL.secLabel(r.s); } catch (e) {}
    var metaBits = [r.c ? '<span class="rc2-cat">' + esc(r.c) + '</span>' : '', sec && sec !== r.c ? '<span class="rc2-sec">' + esc(sec) + '</span>' : '', r.piatto ? '<span class="rc2-pi">' + esc(r.piatto) + '</span>' : ''];
    try { if (typeof isLocalId === 'function' && isLocalId(r._id)) metaBits.push('<span class="rc2-pend" title="Salvata solo sul dispositivo: verrà inviata appena possibile">In attesa</span>'); } catch (e) {}
    hd.innerHTML = '<div class="rc2-top"><div class="rc2-meta">' + metaBits.join('') + '</div><button type="button" class="rc2-more" aria-label="Altre azioni" aria-haspopup="menu">' + I.more + '</button></div>' +
      '<h3 class="rc2-name card-name">' + esc(r.n) + (r._c ? '<i class="rc2-star" title="Ricetta tua">★</i>' : '') + '</h3>' +
      '<div class="rc2-facts"><span><b>' + ings.length + '</b> ingredient' + (ings.length === 1 ? 'e' : 'i') + '</span>' +
        (tot ? '<span><b class="rc2-tot">' + fmtG(tot * doseOf(r)) + '</b> g</span>' : '') +
        (kcal != null ? '<span><b>' + fmtG(kcal) + '</b> kcal/100 g</span>' : '') +
        (alg ? '<span class="rc2-alg card-alg" title="Allergeni">' + alg + '</span>' : '') + '</div>';
    hd.querySelector('.rc2-more').addEventListener('click', function (e) { e.stopPropagation(); if (multi()) return; menu(this, r); });
    if (old) old.replaceWith(hd); else c.insertBefore(hd, c.firstChild);

    /* corpo: dose + ingredienti (anteprima) */
    var body = h('div', 'rc2-body');
    if (bar) {
      body.appendChild(bar); bar.classList.add('rc2-dose');
      [].forEach.call(bar.querySelectorAll('.cd-chip[data-d]'), function (b) { var t = b.textContent.replace('×', ''); b.textContent = t; b.setAttribute('aria-label', 'Dose ×' + t); });
      var pz = bar.querySelector('.cd-peso');
      if (pz) { pz.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8h11l2.3 11.2a1 1 0 0 1-1 1.2H5.2a1 1 0 0 1-1-1.2z"/><circle cx="12" cy="5" r="2"/></svg>'; pz.setAttribute('aria-label', 'Dose da un peso totale'); pz.title = 'Dose da un peso totale'; }
    }
    if (tbl) {
      body.appendChild(tbl);
      var rows = tbl.querySelectorAll('tbody tr');
      if (rows.length > 6) {
        tbl.classList.add('rc2-clip');
        var more = h('button', 'rc2-all', 'Mostra tutti i ' + rows.length + ' ingredienti'); more.type = 'button';
        more.addEventListener('click', function (e) { e.stopPropagation(); var on = tbl.classList.toggle('rc2-clip'); more.textContent = on ? 'Mostra tutti i ' + rows.length + ' ingredienti' : 'Mostra meno'; });
        body.appendChild(more);
      }
    }
    if (pt && pc) { pt.classList.add('rc2-proc-t'); body.appendChild(pt); body.appendChild(pc); }
    hd.after(body);

    /* barra d'azioni */
    var act = h('div', 'rc2-act');
    act.innerHTML = '<button type="button" class="rc2-go" data-a="lab">' + I.play + '<span>Apri</span></button>' +
      '<button type="button" data-a="cook" title="Modalità cucina">' + I.pot + '<span>Cucina</span></button>' +
      '<button type="button" data-a="molds" title="Stampi, teglie e monoporzioni">' + I.mold + '<span>Stampi</span></button>' +
      '<button type="button" data-a="print" title="Stampa o aggiungi a un documento">' + I.print + '<span>Stampa</span></button>';
    act.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || multi()) return; e.stopPropagation();
      var a = b.dataset.a, d = doseOf(r);
      if (a === 'lab') openLab(r);
      else if (a === 'cook') { try { openCucina(r, d); } catch (x) {} }
      else if (a === 'molds') openLab(r, 'molds');
      else if (a === 'print') { try { openAddToDoc(r, d); } catch (x) {} }
    });
    c.appendChild(act);

    /* tocco sulla scheda = apre la ricetta (prima dell'anteprima classica) */
    c.addEventListener('click', function (e) {
      if (multi()) return;
      if (e.target.closest('button,a,input,select,textarea,.card-proc,.cd-bar,.rc2-act')) return;
      e.stopPropagation(); openLab(r);
    }, true);
    /* il peso nella testata segue la dose della scheda */
    if (bar) bar.addEventListener('click', function () { setTimeout(function () { var t = hd.querySelector('.rc2-tot'); if (t) t.textContent = fmtG(tot * doseOf(r)); }, 0); });
  }

  var css = document.createElement('style');
  css.textContent =
    '#app .card.rc2{display:flex;flex-direction:column;border-radius:20px!important;padding:0;background:var(--card)!important;border:1px solid var(--cb,var(--rim))!important;box-shadow:0 1px 2px rgba(0,0,0,.04),0 14px 30px -26px rgba(0,0,0,.45)!important}' +
    '#app .card.rc2:hover{transform:translateY(-2px);box-shadow:0 1px 2px rgba(0,0,0,.04),0 22px 40px -26px rgba(0,0,0,.5)!important}' +
    '#app .card.rc2 .card-stripe,#app .card.rc2::before{display:none!important}#app .rc2 .card-name::first-letter{font:inherit!important;color:inherit!important;margin:0!important;float:none!important}' +
    '.rc2-hd{padding:16px 16px 6px;cursor:pointer}' +
    '.rc2-top{display:flex;align-items:flex-start;gap:8px;min-height:30px}' +
    '.rc2-meta{flex:1;min-width:0;display:flex;flex-wrap:wrap;gap:5px}' +
    '.rc2-meta span{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:99px;font:600 10.5px "DM Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.rc2-cat{background:color-mix(in srgb,var(--gold2,#A8772A) 14%,transparent);color:var(--gold3,#8B6408)}' +
    '.rc2-sec{background:var(--ctrl,#F3F0E8);color:var(--smoke2,#7B796E)}' +
    '.rc2-pi{background:none;border:1px solid var(--cb,rgba(0,0,0,.1));color:var(--ink2);text-transform:none!important;letter-spacing:0!important;font-weight:500!important;font-size:11.5px!important}' +
    '.rc2-pi::before{content:"🍽";margin-right:5px;font-size:11px}' +
    '.rc2-pend{background:#FFF3CD;color:#8B6914}' +
    '.rc2-more{flex-shrink:0;width:34px;height:30px;margin:-3px -6px 0 0;border-radius:10px;border:0;background:transparent;color:var(--smoke2,#7B796E);display:grid;place-items:center;cursor:pointer;transition:background .15s,color .15s}' +
    '.rc2-more:hover,.rc2-more:focus-visible{background:var(--ctrl,#F3F0E8);color:var(--ink)}' +
    '.rc2-name{margin:8px 0 0!important;font:500 clamp(1.45rem,2.2vw,1.7rem)/1.08 "Cormorant Garamond",Georgia,serif!important;color:var(--ink)!important;letter-spacing:-.005em}' +
    '.rc2-star{font-style:normal;color:var(--gold2,#A8772A);font-size:.6em;margin-left:6px;vertical-align:.25em}' +
    '.rc2-facts{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-top:8px;font:500 12px "DM Sans",sans-serif;color:var(--smoke2,#7B796E)}' +
    '.rc2-facts b{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:600;color:var(--ink);font-size:12.5px}' +
    '.rc2-facts .rc2-alg{display:inline-flex;gap:3px;margin:0}' +
    '.rc2-body{padding:4px 16px 8px;flex:1}' +
    '#app .rc2 .cd-bar.rc2-dose{display:flex!important;flex-wrap:nowrap!important;align-items:center;gap:4px!important;margin:12px 0 6px!important;padding:4px!important;border-radius:15px!important;background:var(--ctrl,#F3F0E8)!important;border:0!important;box-shadow:none!important}' +
    '#app .rc2-dose .cd-lbl,#app .rc2-dose .cd-tot{display:none!important}' +
    '#app .rc2-dose .cd-step{flex-shrink:0;display:flex;align-items:center;height:38px;border:0!important;border-radius:11px!important;background:var(--card,#fff)!important;box-shadow:0 1px 3px rgba(0,0,0,.1)!important;overflow:hidden}' +
    '#app .rc2-dose .cd-step button{width:34px!important;height:38px!important;border:0!important;background:none!important;color:var(--ink2)!important;font:400 19px/1 "DM Sans",sans-serif!important;cursor:pointer;padding:0!important}' +
    '#app .rc2-dose .cd-step button:active{background:var(--ctrl,#F3F0E8)!important}' +
    '#app .rc2-dose .cd-val{min-width:42px!important;text-align:center;font:700 15px "DM Sans",sans-serif!important;font-variant-numeric:tabular-nums;color:var(--ink)!important}' +
    '#app .rc2-dose.custom .cd-val{color:var(--gold3,#8B6408)!important}' +
    '#app .rc2-dose .cd-chips{flex:1;min-width:0;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px!important;flex-wrap:nowrap!important}' +
    '#app .rc2-dose .cd-chip{height:38px!important;min-width:0;padding:0!important;display:flex;align-items:center;justify-content:center;border:0!important;border-radius:11px!important;background:transparent!important;color:var(--ink2)!important;font:600 14px "DM Sans",sans-serif!important;box-shadow:none!important;transition:background .15s,color .15s,transform .12s}' +
    '#app .rc2-dose .cd-chip:active{transform:scale(.92)}' +
    '#app .rc2-dose .cd-chip.on{background:var(--ink)!important;color:var(--bg)!important}' +
    '#app .rc2-dose .cd-chip.cd-peso{color:var(--smoke2,#7B796E)!important;border-left:1px solid var(--cb,rgba(0,0,0,.1))!important;border-radius:0 11px 11px 0!important}' +
    '@media(hover:hover){#app .rc2-dose .cd-chip:not(.on):hover{background:color-mix(in srgb,var(--ink) 7%,transparent)!important}}' +
    '#app .rc2 .tbl{margin:0!important;width:100%}' +
    '#app .rc2 .tbl.rc2-clip tbody tr:nth-child(n+7){display:none}' +
    '.rc2-all{display:block;width:100%;margin:6px 0 0;padding:8px 0;border:0;border-top:1px dashed var(--cb,rgba(0,0,0,.12));background:none;font:600 12px "DM Sans",sans-serif;color:var(--gold3,#8B6408);cursor:pointer;text-align:center}' +
    '#app .rc2 .rc2-proc-t{display:flex;align-items:center;gap:6px;width:100%;margin:8px 0 0!important;padding:9px 12px!important;border-radius:11px!important;border:1px solid var(--cb,rgba(0,0,0,.1))!important;background:none!important;font:600 12.5px "DM Sans",sans-serif!important;color:var(--ink2)!important;justify-content:space-between}' +
    '#app .rc2 .card-proc.on{margin-top:8px;padding:12px;border-radius:12px;background:var(--ctrl,#F3F0E8);font-size:14px;line-height:1.55}' +
    '.rc2-act{display:grid;grid-template-columns:1.35fr 1fr 1fr 1fr;gap:6px;padding:10px 12px 12px;border-top:1px solid var(--cb,rgba(0,0,0,.08));margin-top:auto}' +
    '.rc2-act button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:50px;border-radius:13px;border:0;background:transparent;color:var(--ink2);font:600 11px "DM Sans",sans-serif;cursor:pointer;transition:background .15s,transform .12s;-webkit-tap-highlight-color:transparent}' +
    '.rc2-act button:hover{background:var(--ctrl,#F3F0E8);color:var(--ink)}.rc2-act button:active{transform:scale(.95)}' +
    '.rc2-act .rc2-go{flex-direction:row;gap:8px;background:var(--btn-bg,#1A1A16)!important;color:var(--btn-ink,#fff)!important;font-size:14px}' +
    '.rc2-act .rc2-go:hover{filter:brightness(1.1)}' +
    '.rc2-menu{position:fixed;z-index:130;min-width:240px;padding:6px;border-radius:16px;background:var(--card,#fff);border:1px solid var(--cb,rgba(0,0,0,.1));box-shadow:0 20px 44px -18px rgba(0,0,0,.45);opacity:0;transform:translateY(-4px) scale(.98);transform-origin:top right;transition:opacity .15s,transform .18s cubic-bezier(.2,.8,.2,1)}' +
    '.rc2-menu.on{opacity:1;transform:none}' +
    '.rc2-menu button{display:flex;align-items:center;gap:12px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:none;color:var(--ink);font:500 14px "DM Sans",sans-serif;text-align:left;cursor:pointer}' +
    '.rc2-menu button:hover{background:var(--ctrl,#F3F0E8)}.rc2-menu button svg{color:var(--smoke2,#7B796E);flex-shrink:0}' +
    '.rc2-menu button.del{color:#9B2C3C;border-top:1px solid var(--cb,rgba(0,0,0,.08));border-radius:0 0 11px 11px;margin-top:4px}.rc2-menu button.del svg{color:#9B2C3C}' +
    '#app .grid.list .rc2 .rc2-body,#app .grid.list .rc2 .rc2-act{display:none}' +
    '#app .card.rc2.multi-sel{box-shadow:0 0 0 2.5px var(--gold2,#A8772A)!important}';
  document.head.appendChild(css);
})();
