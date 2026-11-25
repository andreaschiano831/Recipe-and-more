/* ════════════════════════════════════════════════════════════════════
   ÉCLAT · LABORATORIO — interfaccia e animazioni sopra il tema Éclat
   · barra in alto (desktop) con navigazione Home · Collezione ·
     Laboratorio · Bilanciamento · Biblioteca
   · Laboratorio = banco di lavoro: mise en place con la dose, procedimento
     completo con le quantità nei passaggi, timer multipli, composizione,
     sous-chef AI
   · Bilanciamento: distinta base con mise en place spuntabile
   · Produzione: sequenza spuntabile e timer ad anello
   · Home: «Riprendi dal laboratorio»; schede: «Apri in Laboratorio»
   · animazioni leggere: dissolvenze all'apertura, numeri, notifiche
   Disponibile con tutti i temi (i colori vengono dal tema). Prima versione: con gli altri temi
   l'app resta identica. Avvolge le funzioni esistenti senza cambiarle.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var XL = window.XL = { rec: null, dose: 1, mode: 'lab', phase: 0, weighed: {}, hero: null, acc: null };
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtG(n) { if (n == null || !isFinite(n)) return '—'; var r = Math.round(n); return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmtQ(v) { if (v == null || isNaN(v)) return 'q.b.'; var r = Math.round(v * 100) / 100; if (Math.abs(r) >= 100) r = Math.round(r); return String(r).replace('.', ','); }
  function fmtX(d) { return '×' + String(Math.round(d * 100) / 100).replace('.', ','); }
  function pct(v, t) { return t ? v / t * 100 : 0; }
  function f1(n) { return isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString('it-IT') : '—'; }
  var ICO = {
    clock: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/></svg>',
    plus: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    drop: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3.5c3 3.8 5.5 6.6 5.5 9.8a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6 5.5-9.8z"/></svg>',
    orbit: '<svg class="ico" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="3.6"/><path d="M12 3c2.2 0 3.6 4 3.6 9s-1.4 9-3.6 9-3.6-4-3.6-9 1.4-9 3.6-9z"/></svg>',
    palette: '<svg class="ico" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><circle cx="6.5" cy="12.5" r="1.3"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.6C22 5.4 17.5 2 12 2z"/></svg>',
    back: '<svg class="ico" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>'
  };

  /* ══════════ BARRA IN ALTO ══════════ */
  function initials(s) { s = String(s || '').replace(/@.*/, ''); var p = s.split(/[\s._-]+/).filter(Boolean); return ((p[0] || 'R')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function buildTop() {
    if ($('xlTop')) return;
    var top = h('header', 'xl-top xl'); top.id = 'xlTop';
    top.innerHTML =
      '<div class="xl-brand" id="xlBrand"><img class="wl-logo" alt=""><div><strong class="wl-name"></strong><span class="wl-sub"></span></div></div>' +
      '<nav class="xl-nav" id="xlNav">' +
      '<button data-k="home">Home</button><button data-k="rec">Collezione</button><button data-k="lab">Laboratorio</button><button data-k="formula">Bilanciamento</button><button data-k="lib">Biblioteca</button></nav>' +
      '<div class="xl-right"><button class="xl-pill" id="xlTopProd" hidden>' + ICO.clock + 'Produzione</button>' +
      '<button class="xl-pill dark" id="xlTopNew">' + ICO.plus + 'Nuova</button>' +
      '<button class="xl-pill" id="xlTopTheme" aria-label="Tema">' + ICO.palette + '</button>' +
      '<button class="xl-chef" id="xlChef"><i></i><span><b></b><small>Menu e impostazioni</small></span></button></div>';
    document.body.appendChild(top);
    $('xlBrand').onclick = function () { navTo('home'); };
    [].forEach.call(top.querySelectorAll('#xlNav button'), function (b) { b.onclick = function () { navTo(b.dataset.k); }; });
    $('xlTopNew').onclick = function () { closeView(); try { openStudio(); } catch (e) { openModal(); } };
    $('xlTopTheme').onclick = function () { try { openThemeSheet(); } catch (e) {} };
    $('xlTopProd').onclick = function () { XL.openProd(); };
    $('xlChef').onclick = function () { try { MDL_OPEN(); } catch (e) {} };
    refreshTop();
    var pwd = $('pwd');
    var upd = function () { var on = !pwd || getComputedStyle(pwd).display === 'none'; document.body.classList.toggle('xl-top-on', on); };
    if (pwd && window.MutationObserver) new MutationObserver(upd).observe(pwd, { attributes: true, attributeFilter: ['style', 'class'] });
    upd();
  }
  function refreshTop() {
    try { WL.applyBrand(); } catch (e) {}
    var c = $('xlChef'); if (!c) return;
    var em = (window.WL && WL.email()) || '';
    c.querySelector('i').textContent = initials((window.WL && WL.brand().name) || em);
    c.querySelector('b').textContent = em || 'Account';
  }
  function setNav(k) { [].forEach.call(document.querySelectorAll('#xlNav button'), function (b) { b.classList.toggle('on', b.dataset.k === k); }); }
  function navTo(k) {
    if (k === 'lab' || k === 'formula') {
      var r = XL.rec || lastRec();
      if (!r) { XL.toast('Crea o apri una ricetta per entrare in laboratorio'); navTo('rec'); return; }
      XL.open(r, k); return;
    }
    closeView();
    if (k === 'home') tbGoHome();
    else if (k === 'rec') tbGoRecipes();
    else if (k === 'lib') { try { openLibrary(); } catch (e) {} }
  }
  if (typeof window.tbSetActive === 'function') {
    var _tbSet = window.tbSetActive;
    window.tbSetActive = function (k) { var r = _tbSet.apply(this, arguments); if (!XL.viewOpen) setNav(k === 'new' ? '' : k); return r; };
  }

  /* ══════════ DATI DELLA RICETTA ══════════ */
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg && Array.isArray(r.i); }); }
  function lastRec() { var a = recs(); return a.length ? a.slice().sort(function (x, y) { return (+y._id || 0) - (+x._id || 0); })[0] : null; }
  function fresh(r) { if (!r) return r; var id = r._id; var f = recs().filter(function (x) { return x._id === id; })[0]; return f || r; }
  function grams(g) { try { return rcGrams(g[1], g[2], g[0]); } catch (e) { return null; } }
  function data(r) {
    var ings = r.i || [], A = rcAnalyze(ings), P = profFull(r);
    var S = ckSteps(r.p || ''), steps = S.steps;
    var temps = []; steps.forEach(function (s) { var t = ckTemp(s); if (t && temps.indexOf(t) < 0) temps.push(t); });
    return { ings: ings, A: A, P: P, steps: steps, info: S.info, temps: temps, tot: A.tot };
  }
  /* procedimento → fasi */
  var SCENES = ['biscuit', 'inserto', 'mousse', 'glassa'];
  var SCENE_NAME = { biscuit: 'Base e cottura', inserto: 'Inserto e gelificazione', mousse: 'Mousse e montaggio', glassa: 'Glassa e finitura', sezione: 'Sezione esplosa' };
  function sceneFor(t, k) {
    t = String(t || '').toLowerCase();
    if (/glass|colat|specchio|ricopr|decor|finit|spruzz|velluta/.test(t)) return 'glassa';
    if (/mousse|mont|panna|incorpor|emulsion|bavarese|semifredd|cremoso|chantilly/.test(t)) return 'mousse';
    if (/gelatin|pectin|agar|inserto|gelific|abbatt|congel|stamp|cola.*negli|compot|gel[eé]e/.test(t)) return 'inserto';
    if (/forn|cuoc|inforn|biscott|frolla|sabl|base|impast|stend|lievit|tost/.test(t)) return 'biscuit';
    return SCENES[k % 4];
  }
  function shortTitle(s) { var w = String(s).replace(/[.,;:].*$/, '').split(/\s+/).slice(0, 4).join(' '); return w.length > 28 ? w.slice(0, 27) + '…' : w; }
  function phases(D) {
    var out = [], st = D.steps, idx = [];
    if (st.length <= 4) idx = st.map(function (_, i) { return i; });
    else for (var j = 0; j < 4; j++) idx.push(Math.round(j * (st.length - 1) / 3));
    idx.forEach(function (i, k) { var s = st[i]; out.push({ lbl: 'Fase ' + (i < 9 ? '0' : '') + (i + 1), title: shortTitle(s), text: s, scene: sceneFor(s, k), temp: ckTemp(s), min: ckMinutes(s) }); });
    if (!out.length) out.push({ lbl: 'Fase 01', title: 'Procedimento', text: '', scene: 'biscuit', temp: '', min: 0, empty: true });
    return out;
  }
  function weighedOf(r) { var k = String(r._id || r.n); return XL.weighed[k] || (XL.weighed[k] = {}); }
  function misePct(r) { var w = weighedOf(r), n = (r.i || []).length; if (!n) return 0; var c = 0; for (var k in w) if (w[k]) c++; return Math.round(c / n * 100); }

  /* ══════════ VISTE LABORATORIO / BILANCIAMENTO ══════════ */
  /* ══════════ LA RICETTA: UNA PAGINA, TRE AZIONI ══════════
     Pagina: ingredienti (mise en place) + procedimento, con i timer attivi in alto.
     «Quanto ne fai» (dose e stampi), «Analisi» (bilanciamento, note e storico, sous-chef)
     e «Altro» si aprono come pannelli dal basso. «Inizia» apre la cucina a schermo intero,
     che condivide pesate e passaggi con questa pagina. */
  var IC2 = {
    chart: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    play: '<svg class="ico" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>',
    dots: '<svg class="ico" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
    down: '<svg class="ico" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    mold: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="11" rx="2"/><path d="M3 11h18"/></svg>',
    print: '<svg class="ico" viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>',
    edit: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
    card: '<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    prod: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>'
  };
  var SHEETS = {
    dose: { t: 'Quanto ne fai', panes: [['dose', 'Dose'], ['molds', 'Stampi e teglie']] },
    analisi: { t: 'Analisi', panes: [['formula', 'Bilanciamento'], ['hist', 'Note e storico'], ['ai', 'Sous-chef']] },
    more: { t: 'Altro', panes: [['more', '']] }
  };
  var PANE_EL = { dose: 'xlDose', molds: 'xlMolds', formula: 'xlFormula', hist: 'xlHist', ai: 'xlAI', more: 'xlMore' };
  /* pannelli aggiunti da altri moduli (es. «Prove» nell'Analisi) */
  XL.panes = XL.panes || {};
  XL.addPane = function (sheet, key, label, render, after) {
    if (!SHEETS[sheet] || XL.panes[key]) return;
    var L = SHEETS[sheet].panes, at = after ? L.map(function (x) { return x[0]; }).indexOf(after) : -1;
    if (at >= 0) L.splice(at + 1, 0, [key, label]); else L.push([key, label]);
    PANE_EL[key] = 'xlPx_' + key; XL.panes[key] = { render: render };
    var host = $('xlShB'); if (host && !$(PANE_EL[key])) { var d = document.createElement('div'); d.className = 'xr-pane'; d.id = PANE_EL[key]; d.hidden = true; host.appendChild(d); }
  };
  function sheetOf(p) { for (var k in SHEETS) if (SHEETS[k].panes.some(function (x) { return x[0] === p; })) return k; return null; }

  function buildView() {
    if ($('xlView')) return;
    var v = h('section', 'xl-view xl'); v.id = 'xlView'; v.setAttribute('aria-label', 'Ricetta');
    v.innerHTML =
      '<div class="xl-shell">' +
        '<header class="xl-head"><button class="xl-back" id="xlBack">' + ICO.back + 'Collezione</button>' +
          '<h1 class="xl-title" id="xlTitle"></h1><div class="xl-meta" id="xlMeta"></div>' +
          '<div class="xr-bar">' +
            '<button type="button" class="xr-dose" id="xlDoseBtn" aria-haspopup="dialog"><small>Quanto ne fai</small><strong><span class="mono" id="xlScaleChip"></span>' + IC2.down + '</strong></button>' +
            '<div class="xr-mwrap"><button type="button" class="xr-dose xr-mold" id="xlMoldBtn" aria-haspopup="dialog"><small id="xlMoldK">Stampi e teglie</small><strong><span id="xlMoldTxt">Calcola</span>' + IC2.mold + '</strong></button>' +
            '<button type="button" class="xr-mold-x" id="xlMoldX" hidden aria-label="Togli lo stampo dalla ricetta" title="Togli dalla ricetta"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>' +
          '</div>' +
          '<button type="button" class="xr-bal" id="xlBalBtn" aria-haspopup="dialog"><i class="xr-dot"></i><span><b>Bilancio</b> <span id="xlBalTxt">—</span></span><em>Analisi →</em></button>' +
          '</header>' +
        '<div id="xlLab"></div>' +
      '</div>' +
      '<nav class="xr-act" id="xlSeg" aria-label="Azioni sulla ricetta">' +
        '<button type="button" data-m="formula">' + IC2.chart + '<span>Analisi</span><b class="xr-badge" id="xlBadge" hidden></b></button>' +
        '<button type="button" data-m="cook" class="go">' + IC2.play + '<span id="xlGoL">Inizia</span></button>' +
        '<button type="button" data-m="more">' + IC2.dots + '<span>Altro</span></button>' +
      '</nav>' +
      '<div class="xr-sheet" id="xlSheet" hidden><div class="xr-sh-bg" data-x></div>' +
        '<div class="xr-sh" role="dialog" aria-modal="true" aria-labelledby="xlShT"><div class="xr-grab" data-x aria-hidden="true"><i></i></div>' +
          '<div class="xr-sh-h"><strong id="xlShT"></strong><button type="button" class="xr-x" data-x aria-label="Chiudi">×</button></div>' +
          '<div class="xr-seg" id="xlShSeg" role="tablist"></div>' +
          '<div class="xr-sh-b" id="xlShB">' + Object.keys(PANE_EL).map(function (p) { return '<div class="xr-pane" id="' + PANE_EL[p] + '" hidden></div>'; }).join('') + '</div>' +
        '</div></div>';
    document.body.appendChild(v);
    $('xlBack').onclick = function () { closeView(); tbGoRecipes(); };
    $('xlDoseBtn').onclick = function () { openSheet('dose'); };
    $('xlBalBtn').onclick = function () { openSheet('formula'); };
    $('xlMoldBtn').onclick = function () { openSheet('molds'); };
    $('xlMoldX').onclick = function (e) { e.stopPropagation(); if (XL.rec) XL.moldOff(XL.rec); };
    [].forEach.call(v.querySelectorAll('#xlSeg button'), function (b) {
      b.onclick = function () {
        var m = b.dataset.m;
        if (m === 'cook') { closeSheet(); try { openCucina(XL.rec, XL.dose); } catch (e) {} }
        else openSheet(m === 'formula' ? (XL.lastAnalisi || 'formula') : m);
      };
    });
    [].forEach.call(v.querySelectorAll('#xlSheet [data-x]'), function (x) { x.onclick = function () { closeSheet(); }; });
    /* trascina giù per chiudere */
    var sh = v.querySelector('.xr-sh'), y0 = null, dy = 0;
    function startDrag(e) { var b = $('xlShB'); if (e.target.closest('.xr-sh-b') && b.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; }
    sh.addEventListener('touchstart', startDrag, { passive: true });
    sh.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0 && e.cancelable && e.target.closest('.xr-sh-b')) e.preventDefault(); sh.style.transform = dy ? 'translateY(' + dy + 'px)' : ''; }, { passive: false });
    sh.addEventListener('touchend', function () { if (y0 == null) return; sh.style.transition = ''; sh.style.transform = ''; if (dy > 90) closeSheet(); y0 = null; dy = 0; });
  }
  function openSheet(p) {
    var k = sheetOf(p); if (!k || !XL.rec) return;
    var S = SHEETS[k], sh = $('xlSheet'), seg = $('xlShSeg');
    $('xlShT').textContent = S.t;
    seg.hidden = S.panes.length < 2;
    seg.innerHTML = S.panes.map(function (x) { return '<button type="button" role="tab" data-p="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    [].forEach.call(seg.querySelectorAll('button'), function (b) { b.onclick = function () { sheetPane(b.dataset.p); }; });
    XL.sheet = k; sheetPane(p);
    if (!sh.classList.contains('on')) { sh.hidden = false; void sh.offsetWidth; sh.classList.add('on'); document.body.classList.add('xr-sheet-on'); }
    [].forEach.call(document.querySelectorAll('#xlSeg button'), function (b) { b.classList.toggle('on', (b.dataset.m === 'formula' && k === 'analisi') || (b.dataset.m === 'more' && k === 'more')); });
  }
  function sheetPane(p) {
    XL.mode = p; if (XL.sheet === 'analisi') XL.lastAnalisi = p;
    for (var q in PANE_EL) $(PANE_EL[q]).hidden = q !== p;
    [].forEach.call(document.querySelectorAll('#xlShSeg button'), function (b) { var on = b.dataset.p === p; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    if (p === 'dose') renderDose();
    else if (p === 'molds') { if (XL.renderMolds) XL.renderMolds(); }
    else if (p === 'formula') renderFormula();
    else if (p === 'hist') { if (XL.renderHist) XL.renderHist(); }
    else if (p === 'ai') renderAI();
    else if (p === 'more') renderMore();
    else if (XL.panes && XL.panes[p]) { try { XL.panes[p].render($(PANE_EL[p]), XL.rec); } catch (e) { console.warn(e); } }
    $('xlShB').scrollTop = 0;
  }
  function closeSheet() {
    var sh = $('xlSheet'); XL.mode = 'lab'; XL.sheet = null;
    if (!sh || !sh.classList.contains('on')) return;
    sh.classList.remove('on'); document.body.classList.remove('xr-sheet-on');
    [].forEach.call(document.querySelectorAll('#xlSeg button'), function (b) { b.classList.remove('on'); });
    setTimeout(function () { if (!sh.classList.contains('on')) sh.hidden = true; }, calm ? 0 : 320);
    if (XL.rec) renderHead();
  }
  XL.closeSheet = closeSheet; XL.openSheet = openSheet;
  /* toglie lo stampo in uso: se la dose è ancora quella dello stampo torna a quella di prima */
  XL.moldOff = function (r) {
    if (!XL.molds || !XL.molds.clear) return;
    var ms = XL.molds.summary(r), p = XL.molds.clear(r);
    if (ms && ms.live && p && XL.rec && XL.rec.n === r.n) XL.setDose(p, true);
    if (XL.rec) renderHead();
    XL.toast('Stampo tolto' + (ms && ms.live && p ? ' · dose ' + fmtX(p) : ''));
  };
  XL.moldsChanged = function () { if (XL.viewOpen && XL.rec) renderHead(); };
  XL.open = function (r, mode) {
    r = fresh(r); if (!r) return;
    buildView();
    var changed = !XL.rec || XL.rec._id !== r._id || XL.rec.n !== r.n;
    if (changed) { XL.dose = (typeof cardDoseOf === 'function' ? cardDoseOf(r) : 1) || 1; XL.phase = 0; XL.lastAnalisi = null; }
    var v = $('xlView'), again = XL.viewOpen && !changed;
    XL.rec = r; mode = mode || 'lab';
    if (!again) {
      XL.viewOpen = true; v.classList.add('on'); v.scrollTop = 0; document.body.style.overflow = 'hidden'; document.body.classList.add('xl-open');
      var tp = $('xlTopProd'); if (tp) tp.hidden = false;
      renderLab();
    } else if (mode === 'lab') { var y = v.scrollTop; renderLab(); v.scrollTop = y; }
    renderHead();
    if (mode === 'lab' || mode === 'cook') closeSheet(); else openSheet(mode);
    setNav('lab');
    XL.pane = null; XLT.render();
    if (mode === 'cook') { try { openCucina(r, XL.dose); } catch (e) {} }
  };
  function closeView() {
    var v = $('xlView'); if (!v || !XL.viewOpen) return;
    var sh = $('xlSheet'); if (sh) { sh.classList.remove('on'); sh.hidden = true; } document.body.classList.remove('xr-sheet-on');
    XL.viewOpen = false; XL.mode = 'lab'; XL.sheet = null; v.classList.remove('on'); document.body.style.overflow = ''; document.body.classList.remove('xl-open'); XL._benchStep = null; XLT.render();
    try { tbSync(); } catch (e) {}
  }
  XL.close = closeView;
  function balState(r) {
    var D = data(r), A = D.A, P = D.P, bad = 0, has = !!(P.r && A.tot), S = { items: [] };
    if (has) [[A.s, P.r.s], [A.f, P.r.f], [A.tot - A.w, P.r.sol]].forEach(function (x) { if (!x[1]) return; var v = pct(x[0], A.tot); if (v < x[1][0] || v > x[1][1]) bad++; });
    try { S = suggestions(r); } catch (e) {}
    return { bad: bad, sug: S.items.length, notes: (r.ai_nt ? 1 : 0) + (procNotes(r) ? 1 : 0), has: has, any: A.tot > 0 };
  }
  function renderHead() {
    var r = XL.rec, D = data(r);
    $('xlTitle').textContent = r.n;
    var nSteps = D.steps.length, bits = [WL.secLabel(r.s), r.c].filter(Boolean).map(esc);
    $('xlMeta').innerHTML = bits.join('<span>·</span>') + (bits.length ? '<span>·</span>' : '') + '<span>' + (r.i || []).length + ' ingredienti</span>' + (nSteps ? '<span>·</span><span>' + nSteps + ' passaggi</span>' : '') + (D.P.t ? '<span>·</span><span>' + esc(D.P.t) + '</span>' : '');
    $('xlScaleChip').textContent = fmtG(D.tot * XL.dose) + ' g · ' + fmtX(XL.dose);
    var B = balState(r), bb = $('xlBalBtn'), bt = $('xlBalTxt'), cls = '', txt;
    if (B.bad) { txt = B.bad + ' fuori fascia'; cls = 'warn'; }
    else if (B.sug) { txt = B.sug + ' suggeriment' + (B.sug === 1 ? 'o' : 'i'); cls = 'warn'; }
    else if (B.notes) { txt = 'Note da sistemare'; cls = 'warn'; }
    else if (B.has) { txt = 'In equilibrio'; cls = 'ok'; }
    else txt = B.any ? 'Composizione' : '—';
    bt.textContent = txt; bb.className = 'xr-bal ' + cls; bb.hidden = !B.any;
    var bd = $('xlBadge'), nb = B.bad + B.sug + (B.notes && !B.bad && !B.sug ? 1 : 0); if (bd) { bd.hidden = !nb; bd.textContent = nb; }
    var ms = XL.molds && XL.molds.summary ? XL.molds.summary(r) : null, mt = $('xlMoldTxt'), mb = $('xlMoldBtn'), mx = $('xlMoldX');
    if (mt) mt.textContent = ms ? ms.label : 'Calcola';
    if (mb) { mb.classList.toggle('set', !!ms); $('xlMoldK').textContent = ms ? (ms.live ? 'Stampo in uso' : 'Stampo · dose cambiata') : 'Stampi e teglie'; mb.setAttribute('aria-label', ms ? 'Stampo in uso: ' + ms.label + '. Apri il calcolatore' : 'Calcola stampi e teglie'); }
    if (mx) mx.hidden = !ms;
    var dk = document.querySelector('#xlDoseBtn small'); if (dk) dk.textContent = ms && ms.live ? 'Dose da stampo' : 'Quanto ne fai';
    var sd = stepsOf(r), w = weighedOf(r), started = false; for (var k in sd) if (sd[k]) started = true; for (var j in w) if (w[j]) started = true;
    var gl = $('xlGoL'); if (gl) gl.textContent = started ? 'Riprendi' : 'Inizia';
  }
  XL.setDose = function (d, silent) {
    d = Math.max(0.05, Math.min(100, Math.round(d * 1000) / 1000));
    if (d === XL.dose) return;
    var D = data(XL.rec), from = D.tot * XL.dose; XL.dose = d;
    renderHead(); bumpEl($('xlScaleChip'));
    roll($('xlBig'), from, D.tot * d, function (v) { return fmtG(v) + ' g'; });
    [].forEach.call(document.querySelectorAll('.xl-tabs button'), function (b) { b.classList.toggle('on', +b.dataset.d === d); });
    benchQty();
    try { if (window.NUT && $('nuCard')) NUT.mount($('nuCard'), XL.rec, d); } catch (e) {}
    if (XL.rcw) XL.rcw.refresh();
    if (XL.mode === 'formula') renderFormula(true);
    else if (XL.mode === 'molds' && XL.renderMolds) XL.renderMolds(true);
    if (!silent) XL.toast('Dose ' + fmtX(d) + ' applicata');
  };
  /* pannello «Quanto ne fai» → Dose */
  function renderDose() {
    var r = XL.rec, D = data(r), host = $('xlDose');
    var presets = [0.5, 1, 1.5, 2, 3, 4].map(function (d) { return '<button type="button" data-d="' + d + '" class="' + (Math.abs(d - XL.dose) < 1e-6 ? 'on' : '') + '">' + fmtX(d) + '</button>'; }).join('');
    host.innerHTML =
      '<div class="xr-big"><strong class="mono" id="lbTot">' + fmtG(D.tot * XL.dose) + ' g</strong><span class="mono" id="lbDoseV">' + fmtX(XL.dose) + '</span></div>' +
      '<p class="xr-l">Moltiplica la ricetta</p><div class="lb-presets">' + presets + '</div>' +
      '<p class="xr-l">Oppure scegli il peso finale</p>' +
      '<div class="lb-inline"><input id="xlTarget" inputmode="decimal" placeholder="Peso in grammi, es. 1500"><button type="button" id="xlTargetGo">Applica</button></div>' +
      '<button type="button" class="lb-molds" id="lbMolds">' + IC2.mold + '<span>Calcola da stampi, teglie, gastronorm o monoporzioni</span><i>→</i></button>' +
      '<p class="xr-note">La dose vale per ingredienti, procedimento, cucina e documenti.</p>';
    [].forEach.call(host.querySelectorAll('.lb-presets button'), function (b) { b.onclick = function () { XL.setDose(+b.dataset.d); }; });
    $('xlTargetGo').onclick = function () { var v = parseFloat(String($('xlTarget').value).replace(',', '.')); if (!(v > 0) || !D.tot) { $('xlTarget').focus(); return; } XL.setDose(v / D.tot); $('xlTarget').value = ''; };
    $('xlTarget').onkeydown = function (e) { if (e.key === 'Enter') $('xlTargetGo').click(); };
    $('lbMolds').onclick = function () { openSheet('molds'); };
  }
  /* pannello Analisi → Sous-chef */
  function renderAI() {
    var r = XL.rec, host = $('xlAI');
    var aiOk = (typeof _aiServer !== 'undefined' && _aiServer) || (typeof aiHasLocalKey === 'function' && aiHasLocalKey());
    host.innerHTML = '<div class="lb-card lb-ai" id="xlVoice"><div class="lb-h"><span class="lb-eyebrow">Sous-chef AI</span><span class="lb-pill ' + (aiOk ? 'ok' : '') + '">' + (aiOk ? 'Attivo' : 'Senza chiave') + '</span></div>' +
      '<div class="xl-reply lb-reply" id="xlReply">Chiedi una sostituzione, un ricalcolo o un consiglio su «' + esc(r.n) + '».</div>' +
      '<div class="lb-q">' + [['Agar al posto della gelatina', 'Come sostituisco la gelatina con l\'agar-agar in questa ricetta?'], ['−10% zucchero', 'Riduci lo zucchero del 10% mantenendo la struttura: cosa cambio?'], ['Punti critici', 'Quali sono i punti critici (tempi e temperature) di questa ricetta?']].map(function (q) { return '<button type="button" data-q="' + esc(q[1]) + '">' + q[0] + '</button>'; }).join('') + '</div>' +
      '<div class="lb-inline"><input id="xlAsk" type="text" placeholder="Scrivi una domanda…" autocomplete="off"><button type="button" id="xlSend" aria-label="Invia">Chiedi</button></div></div>';
    $('xlSend').onclick = function () { ask(); };
    $('xlAsk').onkeydown = function (e) { if (e.key === 'Enter') ask(); };
    [].forEach.call(host.querySelectorAll('.lb-q button'), function (b) { b.onclick = function () { $('xlAsk').value = b.dataset.q; ask(); }; });
  }
  /* pannello Altro: timer, documenti, modifica, scheda completa */
  function renderMore() {
    var r = XL.rec, host = $('xlMore'), canEdit = WL.canEdit && WL.canEdit();
    var acts = [
      ['print', IC2.print, 'Stampa o aggiungi a un documento', 'Word, PDF e documenti di produzione'],
      ['prod', IC2.prod, 'Produzione del giorno', 'Foglio, preparazioni e messaggi']
    ];
    if (canEdit) acts.push(['edit', IC2.edit, 'Modifica la ricetta', 'Ingredienti, procedimento, note']);
    (XL.moreActs || []).forEach(function (x) { try { if (!x.show || x.show(r)) acts.push([x.k, x.icon, x.t, x.s]); } catch (e) {} });
    acts.push(['card', IC2.card, 'Scheda classica', 'La vista ricetta tradizionale']);
    host.innerHTML =
      '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Timer</span><span class="lb-count mono" id="lbTimN"></span></div>' +
        '<div class="lb-tnew"><div class="lb-tq">' + [1, 3, 5, 10, 15, 30].map(function (m) { return '<button type="button" data-q="' + m + '">' + m + '′</button>'; }).join('') + '</div>' +
        '<div class="lb-inline"><input id="lbTMin" inputmode="decimal" placeholder="min"><input id="lbTLab" placeholder="Nome (es. forno)"><button type="button" id="lbTAdd">Avvia</button></div></div></div>' +
      '<div class="xr-list">' + acts.map(function (a) { return '<button type="button" class="xr-row" data-a="' + a[0] + '">' + a[1] + '<span><b>' + a[2] + '</b><small>' + a[3] + '</small></span><i>›</i></button>'; }).join('') + '</div>';
    [].forEach.call(host.querySelectorAll('.lb-tq button'), function (b) { b.onclick = function () { XLT.add({ label: ($('lbTLab').value || '').trim() || ('Timer ' + b.dataset.q + ' min'), sub: r.n, min: +b.dataset.q }); $('lbTLab').value = ''; }; });
    $('lbTAdd').onclick = function () {
      var m = parseFloat(String($('lbTMin').value).replace(',', '.')); if (!(m > 0)) { $('lbTMin').focus(); return; }
      XLT.add({ label: ($('lbTLab').value || '').trim() || ('Timer ' + String(m).replace('.', ',') + ' min'), sub: r.n, min: m }); $('lbTMin').value = ''; $('lbTLab').value = '';
    };
    $('lbTMin').onkeydown = $('lbTLab').onkeydown = function (e) { if (e.key === 'Enter') $('lbTAdd').click(); };
    [].forEach.call(host.querySelectorAll('.xr-row'), function (b) {
      b.onclick = function () {
        var a = b.dataset.a, d = XL.dose;
        if (a === 'print') { closeSheet(); try { openAddToDoc(r, d); } catch (e) {} }
        else if (a === 'prod') { closeView(); try { PR.open(); } catch (e) {} }
        else if (a === 'edit') { closeView(); try { openEdit(r); } catch (e) {} }
        else if (a === 'card') { closeView(); try { openRecipePanel(r); } catch (e) {} }
        else { var ext = (XL.moreActs || []).filter(function (x) { return x.k === a; })[0]; if (ext) { if (ext.keep !== true) closeSheet(); try { ext.run(r, d); } catch (e) { console.warn(e); } } }
      };
    });
    XLT.render();
  }
  function roll(el, from, to, fmt, ms) {
    if (!el) return; cancelAnimationFrame(el._roll);
    if (calm || from === to || !isFinite(from) || !isFinite(to)) { el.textContent = fmt(to); return; }
    var t0 = performance.now(); ms = ms || 520;
    (function step(now) { var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) el._roll = requestAnimationFrame(step); })(t0);
    el.classList.remove('xl-bump'); void el.offsetWidth; el.classList.add('xl-bump');
  }
  function stagger(root) { [].forEach.call(root.querySelectorAll('.xl-card,.xl-voice,.xl-hero'), function (n, i) { n.style.setProperty('--i', i); n.classList.remove('xl-rise'); void n.offsetWidth; n.classList.add('xl-rise'); }); }
  function meters(root) { [].forEach.call(root.querySelectorAll('.xl-segs,.xl-dotm'), function (g) { [].forEach.call(g.children, function (d, i) { d.style.setProperty('--i', i); }); g.classList.remove('run'); void g.offsetWidth; g.classList.add('run'); }); }
  function segs(v, max, okRange) {
    var n = Math.max(0, Math.min(8, Math.round(v / max * 8))), out = '';
    var cls = okRange ? (v >= okRange[0] && v <= okRange[1] ? 'g' : 'a') : 'g';
    for (var i = 0; i < 8; i++) out += '<i class="' + (i < n ? (okRange ? cls : (i < 3 ? 'a' : 'g')) : '') + '"></i>';
    return out;
  }

  /* ══════════ BANCO DI LAVORO (Laboratorio) ══════════
     sinistra: mise en place con la dose · centro: procedimento completo,
     con le quantità dentro ogni passaggio · destra: timer, composizione,
     sous-chef. Sul telefono tre schede: Mise · Procedimento · Timer. */
  var BENCH_KEY = 'xl_bench';
  try { var _wb = JSON.parse(localStorage.getItem(BENCH_KEY) || 'null'); if (_wb && typeof _wb === 'object') XL.weighed = _wb; } catch (e) {}
  function saveBench(r) {
    if (r) { var t = XL.weighed._t || (XL.weighed._t = {}); t[String(r._id || r.n)] = Date.now(); }
    try { localStorage.setItem(BENCH_KEY, JSON.stringify(XL.weighed)); } catch (e) {}
    try { if (window.HM) HM.soon(); } catch (e) {}
  }
  function stepsOf(r) { var k = 'p:' + String(r._id || r.n); return XL.weighed[k] || (XL.weighed[k] = {}); }
  function curStep(r, n) { var d = stepsOf(r); for (var i = 0; i < n; i++) if (!d[i]) return i; return -1; }
  var STOPW = /^(di|del|della|dello|dei|delle|in|al|alla|allo|con|e|ed|per|da|sale|un|una|il|la|lo|le|gli|i)$/;
  function stemOf(name) {
    var w = String(name || '').toLowerCase().replace(/[^a-zà-ÿ\s]/g, ' ').split(/\s+/).filter(function (x) { return x.length >= 3 && !STOPW.test(x); });
    if (!w.length) return null;
    var s = w[0]; return s.length > 5 ? s.slice(0, s.length - 1) : s;
  }
  function qtyTxt(g) { return g[1] == null ? 'q.b.' : fmtQ(g[1] * XL.dose) + ' ' + (g[2] || 'g'); }
  /* testo del passaggio con le quantità degli ingredienti citati */
  function stepHtml(text, ings) {
    var html = esc(text), used = [], tok = [];
    var list = ings.map(function (g, i) { return { g: g, i: i, s: stemOf(g[0]) }; }).filter(function (x) { return x.s; })
      .sort(function (a, b) { return b.s.length - a.s.length; });
    list.forEach(function (x) {
      var re = new RegExp('(^|[^a-zà-ÿ])(' + x.s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-zà-ÿ]*)', 'i');
      var hit = false;
      html = html.replace(re, function (m, pre, word) { hit = true; tok.push('<mark class="lb-ing" data-ing="' + x.i + '">' + word + '<b>' + esc(qtyTxt(x.g)) + '</b></mark>'); return pre + '\u0001' + (tok.length - 1) + '\u0002'; });
      if (hit) used.push(x.i);
    });
    html = html.replace(/\u0001(\d+)\u0002/g, function (m, k) { return tok[+k]; });
    return { html: html, used: used.sort(function (a, b) { return a - b; }) };
  }
  XL.stepHtml = function (text, ings, d) { var o = XL.dose; if (d) XL.dose = d; try { return stepHtml(text, ings || []); } finally { XL.dose = o; } };
  XL.stepTitle = function (t) { return stepTitle(t); };
  XL.bench = function (r) { return { w: weighedOf(r), sd: stepsOf(r), save: function () { saveBench(r); } }; };
  XL.refreshLab = function () { if (XL.viewOpen && XL.rec) { var v = $('xlView'), y = v ? v.scrollTop : 0; renderLab(); renderHead(); if (v) v.scrollTop = y; } };
  function stepTitle(s) { var t = String(s).split(/[.;:]/)[0].trim(); if (t.length > 64) t = t.slice(0, 62).replace(/\s+\S*$/, '') + '…'; return t; }

  function renderLab() {
    var r = XL.rec, D = data(r), host = $('xlLab'), ings = r.i || [], w = weighedOf(r), sd = stepsOf(r);
    var n = D.steps.length, cur = curStep(r, n), doneN = 0; for (var k = 0; k < n; k++) if (sd[k]) doneN++;
    var mise = ings.map(function (g, i) {
      return '<label class="lb-ing-row' + (w[i] ? ' done' : '') + '" data-i="' + i + '"><input type="checkbox"' + (w[i] ? ' checked' : '') + '><span class="lb-box" aria-hidden="true"></span>' +
        '<span class="lb-ing-n">' + esc(g[0]) + '</span><span class="lb-ing-q mono">' + esc(qtyTxt(g)) + '</span></label>';
    }).join('');
    var steps = D.steps.map(function (s, i) {
      var t = ckTemp(s), m = ckMinutes(s), sh = stepHtml(s, ings), st = sd[i] ? 'done' : i === cur ? 'cur' : '';
      var chips = (t ? '<span class="lb-chip t">' + t + '</span>' : '') + (m ? '<button type="button" class="lb-chip lb-tbtn" data-min="' + m + '" aria-label="Avvia timer di ' + m + ' minuti">' + ICO.clock + (m >= 60 ? (Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + '′' : '')) : m + '′') + '</button>' : '');
      return '<article class="lb-step ' + st + '" data-i="' + i + '">' +
        '<button type="button" class="lb-num" aria-label="' + (sd[i] ? 'Segna da fare' : 'Segna fatto') + ' il passaggio ' + (i + 1) + '"><span>' + (i + 1) + '</span><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
        '<div class="lb-step-b"><div class="lb-step-h"><span class="lb-step-k">Passaggio ' + (i + 1) + ' di ' + n + '</span><strong>' + esc(stepTitle(s)) + '</strong></div>' +
        '<div class="lb-step-more"><div><p>' + sh.html + '</p>' +
        (sh.used.length ? '<div class="lb-uses">' + sh.used.map(function (j) { return '<span class="' + (w[j] ? 'ok' : '') + '">' + esc(ings[j][0]) + ' <b class="mono">' + esc(qtyTxt(ings[j])) + '</b></span>'; }).join('') + '</div>' : '') +
        '<div class="lb-step-a">' + chips + '<button type="button" class="lb-btn dark lb-next">' + (i === n - 1 ? 'Ultimo passaggio fatto' : 'Fatto, avanti') + '<i>→</i></button></div></div></div></div></article>';
    }).join('');
    var pctDone = n ? Math.round(doneN / n * 100) : 0;
    host.innerHTML =
      '<div class="lb-tstrip" id="lbTStrip" hidden><div class="lb-timers" id="lbTimers"></div></div>' +
      '<div class="lb-bench">' +
      '<section class="lb-col lb-mise" aria-label="Ingredienti"><div class="lb-card">' +
        '<div class="lb-h"><span class="lb-eyebrow">Ingredienti</span><span class="lb-count mono" id="lbMiseN"></span></div>' +
        '<div class="lb-bar"><i id="lbMiseFill"></i></div>' +
        (ings.length ? '<div class="lb-ings">' + mise + '</div><div class="lb-foot"><span class="lb-hint">Spunta mentre pesi</span><button type="button" class="lb-link" id="lbMiseReset">Azzera</button></div>' : '<p class="lb-empty">Questa ricetta non ha ancora ingredienti.</p>') +
      '</div><div class="lb-ph-host" id="xlPhotos"></div><div class="lb-rc" id="xlRcLab"></div><div id="nuCard"></div></section>' +
      '<section class="lb-col lb-proc" aria-label="Procedimento"><div class="lb-card lb-proc-card">' +
        '<div class="lb-h"><span class="lb-eyebrow">Procedimento</span><span class="lb-count mono" id="lbStepN">' + (n ? doneN + ' / ' + n : '') + '</span></div>' +
        (n ? '<div class="lb-bar"><i id="lbStepFill" style="width:' + pctDone + '%"></i></div><div class="lb-steps" id="lbSteps">' + steps + '</div>' +
          '<div class="lb-foot"><span class="lb-hint">Tocca un passaggio per rileggerlo · tasti → ←</span><button type="button" class="lb-link" id="lbStepsReset">Ricomincia</button></div>'
          : '<div class="lb-empty"><p>Nessun procedimento scritto per questa ricetta.</p>' + (WL.canEdit && WL.canEdit() ? '<button type="button" class="lb-btn dark" id="lbAddProc">Aggiungi il procedimento<i>✎</i></button>' : '') + '</div>') +
        '<div class="lb-done" id="lbDone" hidden><strong>Produzione completata</strong><span>Tutti i passaggi sono fatti.</span></div>' +
      '</div>' +
      (D.info.length ? '<div class="lb-card lb-info"><span class="lb-eyebrow">Informazioni</span><p>' + D.info.map(esc).join('<br>') + '</p></div>' : '') +
      (r.nt ? '<div class="lb-card lb-notes"><span class="lb-eyebrow">Note</span><p>' + esc(r.nt) + '</p></div>' : '') +
      '</section></div>';

    /* calcoli e bilanciamento, subito nella pagina */
    XL.rcw = null;
    if (ings.length && typeof rcWidget === 'function') try {
      XL.rcw = rcWidget($('xlRcLab'), {
        ings: function () { return XL.rec.i || []; }, name: function () { return XL.rec.n; }, cat: function () { return XL.rec.c; }, sec: function () { return XL.rec.s; },
        prof: function () { return profFull(XL.rec); }, profs: function () { return profOpts(XL.rec); }, setProf: function (v) { setProf(XL.rec, v); },
        dose: function () { return XL.dose; }, scale: function (k, round) { if (round) { XL.toast('Le quantità della scheda si arrotondano dalla modifica ricetta'); return; } XL.setDose(k); }
      });
    } catch (e) { console.warn(e); }
    (XL.labHooks || []).forEach(function (fn) { try { fn(r, host); } catch (e) { console.warn(e); } });
    /* mise en place */
    [].forEach.call(host.querySelectorAll('.lb-ing-row input'), function (c) {
      c.onchange = function () {
        var row = c.closest('.lb-ing-row'), i = +row.dataset.i; w[i] = c.checked; row.classList.toggle('done', c.checked); saveBench(r); miseUi();
        [].forEach.call(host.querySelectorAll('mark.lb-ing[data-ing="' + i + '"]'), function (mk) { mk.classList.toggle('ok', c.checked); });
        if (c.checked && misePct(r) === 100) XL.toast('Mise en place completa');
        renderHead();
      };
    });
    var mr = $('lbMiseReset'); if (mr) mr.onclick = function () { for (var k in w) delete w[k]; saveBench(r); renderLab(); renderHead(); };
    function miseUi() {
      var c = 0; for (var k in w) if (w[k]) c++;
      var f = $('lbMiseFill'); if (f) f.style.width = (ings.length ? c / ings.length * 100 : 0) + '%';
      var t = $('lbMiseN'); if (t) t.textContent = ings.length ? c + ' / ' + ings.length + ' pesati' : '';
    }
    miseUi();
    /* procedimento */
    function setDone(i, on) {
      sd[i] = on; if (!on) delete sd[i]; saveBench(r);
      var c = curStep(r, n), dn = 0; for (var j = 0; j < n; j++) if (sd[j]) dn++;
      [].forEach.call(host.querySelectorAll('.lb-step'), function (el) {
        var k = +el.dataset.i; el.classList.toggle('done', !!sd[k]); el.classList.toggle('cur', k === c); el.classList.remove('peek');
        el.querySelector('.lb-num').setAttribute('aria-label', (sd[k] ? 'Segna da fare' : 'Segna fatto') + ' il passaggio ' + (k + 1));
      });
      $('lbStepFill').style.width = (n ? dn / n * 100 : 0) + '%'; $('lbStepN').textContent = dn + ' / ' + n;
      $('lbDone').hidden = c !== -1;
      if (c === -1 && on) XL.toast('Produzione completata');
      renderHead();
      var ce = host.querySelector('.lb-step.cur');
      if (ce && on && !calm) setTimeout(function () { ce.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 280);
    }
    XL._benchStep = function (dir) {
      if (!n) return; var c = curStep(r, n);
      if (dir > 0) { if (c > -1) setDone(c, true); }
      else { var last = -1; for (var j = 0; j < n; j++) if (sd[j]) last = j; if (last > -1) setDone(last, false); }
    };
    [].forEach.call(host.querySelectorAll('.lb-step'), function (el) {
      var i = +el.dataset.i;
      el.querySelector('.lb-num').onclick = function (e) { e.stopPropagation(); setDone(i, !sd[i]); };
      el.querySelector('.lb-next').onclick = function (e) { e.stopPropagation(); setDone(i, true); };
      el.querySelector('.lb-step-h').onclick = function () { if (!el.classList.contains('cur')) el.classList.toggle('peek'); };
      var tb = el.querySelector('.lb-tbtn');
      if (tb) tb.onclick = function (e) { e.stopPropagation(); XLT.add({ label: stepTitle(D.steps[i]), sub: r.n, min: +tb.dataset.min, key: String(r._id || r.n) + ':' + i }); };
    });
    if (n) $('lbDone').hidden = curStep(r, n) !== -1;
    var sr = $('lbStepsReset'); if (sr) sr.onclick = function () { for (var k in sd) delete sd[k]; saveBench(r); renderLab(); renderHead(); };
    var ap = $('lbAddProc'); if (ap) ap.onclick = function () { closeView(); try { openEdit(r); } catch (e) {} };
    try { if (window.NUT) NUT.mount($('nuCard'), r, XL.dose); } catch (e) {}
    XLT.render();
    if (!calm) [].forEach.call(host.querySelectorAll('.lb-card'), function (c, i) { c.style.setProperty('--i', i); c.classList.remove('lb-in'); void c.offsetWidth; c.classList.add('lb-in'); });
  }
  /* aggiorna solo quantità e dose, senza ridisegnare (spunte e scroll restano) */
  function benchQty() {
    var r = XL.rec, host = $('xlLab'); if (!r || !host || !host.querySelector('.lb-bench')) return false;
    var ings = r.i || [], D = data(r);
    [].forEach.call(host.querySelectorAll('.lb-ing-row'), function (row) {
      var g = ings[+row.dataset.i], q = row.querySelector('.lb-ing-q'); if (!g || !q) return;
      var to = g[1] == null ? null : g[1] * XL.dose, from = q._v == null ? to : q._v;
      if (to == null) { q.textContent = 'q.b.'; return; }
      roll(q, from, to, function (v) { return fmtQ(v) + ' ' + (g[2] || 'g'); }, 380); q._v = to;
    });
    [].forEach.call(host.querySelectorAll('mark.lb-ing'), function (mk) { var g = ings[+mk.dataset.ing]; if (g) mk.querySelector('b').textContent = qtyTxt(g); });
    [].forEach.call(host.querySelectorAll('.lb-uses span b'), function () {});
    host.querySelectorAll('.lb-step').forEach(function (el) {
      var u = el.querySelector('.lb-uses'); if (!u) return;
      var idx = [].map.call(el.querySelectorAll('mark.lb-ing'), function (m) { return +m.dataset.ing; }).sort(function (a, b) { return a - b; });
      [].forEach.call(u.querySelectorAll('span'), function (s, k) { var g = ings[idx[k]]; if (g) s.querySelector('b').textContent = qtyTxt(g); });
    });
    var dv = $('lbDoseV'); if (dv) { dv.textContent = fmtX(XL.dose); bumpEl(dv); }
    var tt = $('lbTot'); if (tt) tt.textContent = fmtG(D.tot * XL.dose) + ' g';
    [].forEach.call(host.querySelectorAll('.lb-presets button'), function (b) { b.classList.toggle('on', Math.abs(+b.dataset.d - XL.dose) < 1e-6); });
    return true;
  }

  /* ══════════ TIMER (più timer insieme, in tutta l'app) ══════════ */
  var XLT = XL.timers = (function () {
    var KEY = 'xl_timers', list = [], tickId = null, lock = null, alarmId = null;
    try { list = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { list = []; }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
    function left(t) { return t.end ? Math.max(0, (t.end - Date.now()) / 1000) : Math.max(0, t.left); }
    function fmt(s) { s = Math.ceil(s); var hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(ss).padStart(2, '0'); }
    function running() { return list.some(function (t) { return t.end && !t.rang; }); }
    function wake() {
      var want = running();
      try {
        if (want && !lock && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () {});
        if (!want && lock) { lock.release(); lock = null; }
      } catch (e) {}
    }
    function ringing() { return list.filter(function (t) { return t.rang && !t.ack; }); }
    function alarm(t) {
      try { ckBeep(); } catch (e) {}
      XL.toast('⏱ ' + t.label + ' — tempo scaduto');
      try { if (window.Notification && Notification.permission === 'granted' && document.visibilityState !== 'visible') new Notification('Timer scaduto', { body: t.label + (t.sub ? ' · ' + t.sub : ''), tag: 'xl-' + t.id, requireInteraction: true }); } catch (e) {}
      if (!alarmId) { var rep = 0; alarmId = setInterval(function () { if (!ringing().length || ++rep > 8) { clearInterval(alarmId); alarmId = null; return; } try { ckBeep(); } catch (e) {} }, 4000); }
    }
    function tick() {
      var any = false;
      list.forEach(function (t) {
        if (t.end && !t.rang && left(t) <= 0) { t.rang = true; t.left = 0; t.end = 0; save(); alarm(t); }
        if (t.end) any = true;
      });
      paint();
      if (!any && !ringing().length) { clearInterval(tickId); tickId = null; }
      wake();
    }
    function start() { if (!tickId) tickId = setInterval(tick, 250); tick(); }
    function askNotify() { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }
    function item(t, big) {
      var L = left(t), frac = t.total ? L / t.total : 0, st = t.rang ? 'ring' : t.end ? 'run' : 'pause';
      return '<div class="lb-timer ' + st + (big ? '' : ' sm') + '" data-tid="' + t.id + '">' +
        '<svg class="lb-ring" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="19"/><circle class="fg" cx="22" cy="22" r="19" style="stroke-dashoffset:' + (119.38 * (1 - frac)).toFixed(2) + '"/></svg>' +
        '<div class="lb-tm"><strong class="mono lb-t-time">' + (t.rang ? 'Fatto' : fmt(L)) + '</strong><span>' + esc(t.label) + '</span>' + (t.sub && big ? '<small>' + esc(t.sub) + '</small>' : '') + '</div>' +
        '<div class="lb-ta">' + (t.rang
          ? '<button type="button" class="lb-ib dark" data-a="ack">Ferma</button>'
          : '<button type="button" class="lb-ib" data-a="plus" aria-label="Un minuto in più">+1′</button><button type="button" class="lb-ib dark" data-a="toggle" aria-label="' + (t.end ? 'Pausa' : 'Riprendi') + '">' + (t.end ? '❚❚' : '▶') + '</button>') +
        '<button type="button" class="lb-ib x" data-a="del" aria-label="Elimina timer">×</button></div></div>';
    }
    function bind(root) {
      [].forEach.call(root.querySelectorAll('.lb-timer [data-a]'), function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var id = b.closest('.lb-timer').dataset.tid, t = list.filter(function (x) { return x.id === id; })[0]; if (!t) return;
          var a = b.dataset.a;
          if (a === 'toggle') { if (t.end) { t.left = left(t); t.end = 0; } else { t.end = Date.now() + t.left * 1000; } }
          else if (a === 'plus') { if (t.end) t.end += 60000; else t.left += 60; t.total += 60; }
          else if (a === 'ack' || a === 'del') { list = list.filter(function (x) { return x !== t; }); }
          save(); render(); start();
        };
      });
    }
    function paint() {
      [].forEach.call(document.querySelectorAll('.lb-timer[data-tid]'), function (el) {
        var t = list.filter(function (x) { return x.id === el.dataset.tid; })[0]; if (!t) return;
        var st = t.rang ? 'ring' : t.end ? 'run' : 'pause';
        if (!el.classList.contains(st)) { render(); return; }
        var L = left(t); el.querySelector('.lb-t-time').textContent = t.rang ? 'Fatto' : fmt(L);
        el.querySelector('.fg').style.strokeDashoffset = (119.38 * (1 - (t.total ? L / t.total : 0))).toFixed(2);
      });
      var dock = $('lbDock');
      if (dock) {
        var nx = list.slice().sort(function (a, b) { return (b.rang ? 1 : 0) - (a.rang ? 1 : 0) || left(a) - left(b); })[0];
        var p = dock.querySelector('.lb-dock-p');
        if (nx && p) { p.querySelector('strong').textContent = nx.rang ? 'Fatto' : fmt(left(nx)); p.querySelector('span').textContent = nx.label; }
        dock.classList.toggle('ring', ringing().length > 0);
      }
    }
    function render() {
      var box = $('lbTimers');
      if (box) { box.innerHTML = list.map(function (t) { return item(t, false); }).join(''); bind(box); var ts = $('lbTStrip'); if (ts) ts.hidden = !list.length; }
      var n = $('lbTimN'); if (n) n.textContent = list.length ? list.length + ' attiv' + (list.length === 1 ? 'o' : 'i') : '';
      var tc = $('lbTabCount'); if (tc) tc.textContent = list.length ? list.length : '';
      var hmt = $('hmTimers'); if (hmt) { hmt.innerHTML = list.map(function (t) { return item(t, true); }).join(''); bind(hmt); var hc = $('hmTimerCard'); if (hc) hc.hidden = !list.length; }
      var kc = $('kcTimers'); if (kc) { kc.innerHTML = list.map(function (t) { return item(t, false); }).join(''); bind(kc); kc.hidden = !list.length; }
      dock();
    }
    function dock() {
      var d = $('lbDock');
      if (!list.length) { if (d) d.remove(); return; }
      if (!d) {
        d = h('div', 'lb-dock'); d.id = 'lbDock';
        d.innerHTML = '<button type="button" class="lb-dock-p" aria-expanded="false">' + ICO.clock + '<strong class="mono"></strong><span></span><em></em></button><div class="lb-dock-l" hidden></div>';
        document.body.appendChild(d);
        d.querySelector('.lb-dock-p').onclick = function () { var l = d.querySelector('.lb-dock-l'); l.hidden = !l.hidden; this.setAttribute('aria-expanded', String(!l.hidden)); if (!l.hidden) render(); };
      }
      d.querySelector('em').textContent = list.length > 1 ? '+' + (list.length - 1) : '';
      var l = d.querySelector('.lb-dock-l');
      if (!l.hidden) { l.innerHTML = list.map(function (t) { return item(t, false); }).join(''); bind(l); }
      d.classList.toggle('in-lab', !!XL.viewOpen);
      paint();
    }
    function add(o) {
      if (o.key) { var ex = list.filter(function (x) { return x.key === o.key && !x.rang; })[0]; if (ex) { XL.toast('Timer già attivo: ' + ex.label); return ex; } }
      var sec = Math.round(o.min * 60), t = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: o.label || 'Timer', sub: o.sub || '', key: o.key || '', total: sec, left: sec, end: Date.now() + sec * 1000 };
      list.push(t); save(); askNotify(); render(); start();
      XL.toast('Timer avviato: ' + t.label);
      return t;
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && list.length) { lock = null; start(); } });
    if (list.length) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { render(); start(); }); else { render(); start(); } }
    function ack() { var n = 0; list = list.filter(function (t) { if (t.rang) { n++; return false; } return true; }); if (n) { save(); render(); } return n; }
    function pauseAll() { list.forEach(function (t) { if (t.end) { t.left = left(t); t.end = 0; } }); save(); render(); }
    return { add: add, render: render, list: function () { return list; }, fmt: fmt, left: left, ack: ack, pauseAll: pauseAll };
  })();
  document.addEventListener('keydown', function (e) {
    if (!XL.viewOpen || XL.mode !== 'lab' || !XL._benchStep) return;
    var tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.ck.on,#ck.on,#kc.on,.wl-bg.on')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); XL._benchStep(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); XL._benchStep(-1); }
  });

  /* sous-chef: domanda all'AI con la ricetta come contesto */
  function context(r) {
    var D = data(r);
    return rcSummaryText(r.n, r.c, r.i, D.A, D.P) + (r.p ? '\nProcedimento:\n' + r.p : '') + '\nDose attuale: ' + fmtX(XL.dose) + ' (peso ' + fmtG(D.tot * XL.dose) + ' g)';
  }
  XL.ask = function (q, ctx) {
    var sys = 'Sei il sous-chef di un laboratorio di pasticceria e cucina professionale. Rispondi in italiano, in modo pratico e conciso (massimo 6 frasi o un breve elenco), con quantità in grammi e temperature precise quando servono. Basati sulla ricetta fornita; se un dato manca dillo, non inventarlo.';
    var user = 'RICETTA\n' + ctx + '\n\nDOMANDA DELLO CHEF\n' + q;
    return aiCheckServer().then(function (ok) {
      if (ok) return fetch('/api/import', { method: 'POST', headers: WL.apiH(), body: JSON.stringify({ ask: q, context: ctx }) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); });
      var key = ''; try { key = localStorage.getItem('groq_key') || ''; } catch (e) {}
      if (!key) { var dg = $('MDL_GROQ'); if (dg) key = (dg.value || '').trim(); }
      if (!key) return { error: 'Per usare il sous-chef serve una chiave Groq: inseriscila nel menu → AI.' };
      return aiGroqChat('https://api.groq.com/openai/v1/chat/completions', key, 'text', sys, user, null, false).then(function (x) { return x.error ? x : { answer: x.text }; });
    }).then(function (d) {
      if (d && d.error && _aiServer && (d._status === 503 || d._status === 401 || d._status === 404) && aiHasLocalKey()) { _aiServer = false; return XL.ask(q, ctx); }
      return d;
    }).catch(function (e) { return { error: 'Errore di connessione: ' + (e && e.message || e) }; });
  };
  var typing = 0;
  function ask() {
    var inp = $('xlAsk'), reply = $('xlReply'), card = $('xlVoice'); if (!inp || !inp.value.trim()) return;
    var q = inp.value.trim(); inp.value = '';
    clearInterval(typing); reply.classList.remove('typing');
    reply.innerHTML = '<span class="xl-dots" aria-label="Sto pensando"><i></i><i></i><i></i></span>';
    card.classList.add('thinking');
    XL.ask(q, context(XL.rec)).then(function (d) {
      var text = String((d && (d.answer || d.advice)) || ('⚠ ' + ((d && d.error) || 'Nessuna risposta'))).replace(/\*\*/g, '').replace(/^#+\s*/gm, '');
      if (calm) { reply.textContent = text; card.classList.remove('thinking'); return; }
      var t0 = performance.now(); reply.textContent = ''; reply.classList.add('typing');
      typing = setInterval(function () {
        var n = Math.floor((performance.now() - t0) / 9); reply.textContent = text.slice(0, n); reply.scrollTop = reply.scrollHeight;
        if (n >= text.length) { clearInterval(typing); reply.classList.remove('typing'); card.classList.remove('thinking'); reply.classList.add('flash'); setTimeout(function () { reply.classList.remove('flash'); }, 600); }
      }, 16);
    });
  }

  /* ══════════ BILANCIAMENTO: SUGGERIMENTI (la ricetta non viene modificata) ══════════
     Per ogni parametro fuori fascia calcola in grammi quanto aggiungere di un
     correttore (o quanto togliere dell'ingrediente che pesa di più), con il
     profilo che si otterrebbe. I suggerimenti scelti vanno nelle note. */
  var BAL = {
    gelato: { t: 'Gelato', r: { s: [16, 22], f: [6, 10], sol: [36, 42] }, dil: 'Latte intero' },
    sorbetto: { t: 'Sorbetto', r: { s: [25, 32], f: [0, 2], sol: [30, 36] }, dil: 'Acqua', add: { s: ['Saccarosio', 'Destrosio'], f: [], sol: ['Destrosio', 'Saccarosio'] }, combo: false },
    gelatina: { t: 'Gelée e inserti', r: { s: [14, 28], f: [0, 3], sol: [18, 34] }, dil: 'Acqua', add: { s: ['Saccarosio', 'Destrosio'], f: [], sol: ['Saccarosio', 'Destrosio'] }, combo: false },
    semifreddo: { t: 'Semifreddo', r: { s: [18, 28], f: [10, 22], sol: [38, 48] }, dil: 'Latte intero' },
    frolla: { t: 'Pasta frolla', q: { sugar: [40, 60], butter: [50, 75], eggs: [15, 25] } }
  };
  var PNAME = { s: 'Zuccheri', f: 'Grassi', sol: 'Solidi totali' };
  var ADDERS = { s: ['Saccarosio', 'Destrosio'], f: ['Panna 35%', 'Burro'], sol: ['Latte in polvere scremato', 'Destrosio'] };
  var REDUCERS = { s: 'Latte scremato', f: 'Latte scremato', sol: 'Acqua' };
  function profKey(r) { return 'xl_prof:' + String(r._id || r.n); }
  function profOverride(r) { try { return localStorage.getItem(profKey(r)); } catch (e) { return null; } }
  function balProfile(r) {
    var o = null; try { o = localStorage.getItem(profKey(r)); } catch (e) {}
    if (o) return o === 'none' ? null : o;
    var P = rcProfile(r.c, r.s, r.n), t = (String(r.c || '') + ' ' + String(r.n || '')).toLowerCase();
    if (BAL[P.k]) return P.k;
    if (/frolla|sabl[eé]|shortbread|pasta frolla/.test(t)) return 'frolla';
    return null;
  }
  /* un solo profilo per testata, calcoli, suggerimenti e AI: la scelta manuale vale ovunque */
  function profFull(r) {
    var o = profOverride(r);
    if (o === 'none') return { k: 'gen', t: '' };
    var key = balProfile(r), B = key && BAL[key];
    if (B && B.r) return { k: key, t: B.t, r: B.r };
    if (B) return { k: key, t: B.t };
    return rcProfile(r.c, r.s, r.n);
  }
  function profOpts(r) {
    var ov = profOverride(r), auto = ov ? null : balProfile(r);
    return [{ v: '', t: auto ? BAL[auto].t + ' · auto' : 'Automatico', on: !ov }]
      .concat(Object.keys(BAL).map(function (k) { return { v: k, t: BAL[k].t, on: ov === k }; }))
      .concat([{ v: 'none', t: 'Nessun riferimento', on: ov === 'none' }]);
  }
  function setProf(r, v) {
    try { if (v) localStorage.setItem(profKey(r), v); else localStorage.removeItem(profKey(r)); } catch (e) {}
    if (XL.rec && XL.rec.n === r.n) { renderHead(); if ($('xlSug')) renderSuggest(XL.rec); if (XL.mode === 'formula') renderFormula(); if (XL.rcw) XL.rcw.refresh(); }
    var B = balState(r); XL.toast(B.bad ? 'Riferimento cambiato · ' + B.bad + ' fuori fascia' : 'Riferimento cambiato');
  }
  XL.setProf = setProf;
  function comp(name) { var c = null; try { c = rcComp(name); } catch (e) {} return c ? { w: c[0] / 100, s: c[1] / 100, f: c[2] / 100, p: c[3] / 100, o: c[4] / 100, sol: 1 - c[0] / 100 } : null; }
  function prof(A) { return { T: A.tot, s: A.s, f: A.f, sol: A.tot - A.w }; }
  function pctOf(P, k) { return P.T ? P[k] / P.T * 100 : 0; }
  function afterAdd(P, c, x) { return { T: P.T + x, s: P.s + x * c.s, f: P.f + x * c.f, sol: P.sol + x * c.sol }; }
  function afterRemove(P, c, y) { return { T: P.T - y, s: P.s - y * c.s, f: P.f - y * c.f, sol: P.sol - y * c.sol }; }
  function g0(x) { return Math.round(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10; }
  function gtxt(x) { return String(g0(x)).replace('.', ',') + ' g'; }
  function solve(M, b) { /* Gauss con pivot: M x = b */
    var n = b.length, A = M.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-9) return null; var t = A[c]; A[c] = A[p]; A[p] = t;
      for (var r2 = 0; r2 < n; r2++) if (r2 !== c) { var f = A[r2][c] / A[c][c]; for (var k = c; k <= n; k++) A[r2][k] -= f * A[c][k]; }
    }
    return A.map(function (r, i) { return r[n] / r[i]; });
  }
  function outOf(Q, B) { var bad = []; ['s', 'f', 'sol'].forEach(function (k) { var v = pctOf(Q, k), rg = B.r[k]; if (v < rg[0] - 0.05 || v > rg[1] + 0.05) bad.push(PNAME[k].toLowerCase() + (v < rg[0] ? ' bassi' : ' alti')); }); return bad; }
  function afterTxt(Q) { return 'zuccheri ' + f1(pctOf(Q, 's')) + '% · grassi ' + f1(pctOf(Q, 'f')) + '% · solidi ' + f1(pctOf(Q, 'sol')) + '%'; }
  function suggestions(r) {
    var key = balProfile(r), B = key && BAL[key], A = rcAnalyze(r.i || []), out = { key: key, B: B, rows: [], items: [], A: A };
    if (!B || !A.tot) return out;
    if (B.r) {
      var P = prof(A);
      ['s', 'f', 'sol'].forEach(function (k) {
        var v = pctOf(P, k), rg = B.r[k], st = v < rg[0] ? 'low' : v > rg[1] ? 'high' : 'ok';
        out.rows.push({ k: k, v: v, rg: rg, st: st });
        if (st === 'ok') return;
        out.off = (out.off || []).concat([{ k: k, st: st, rg: rg }]);
        var t = (st === 'low' ? rg[0] + (rg[1] - rg[0]) * 0.25 : rg[1] - (rg[1] - rg[0]) * 0.25) / 100;
        var head = PNAME[k] + ' ' + f1(v) + '% (' + B.t.toLowerCase() + ' ' + rg[0] + '–' + rg[1] + '%)';
        if (st === 'low') {
          ((B.add && B.add[k]) || ADDERS[k]).forEach(function (nm) {
            var c = comp(nm); if (!c || c[k] <= t) return;
            var x = (t * P.T - P[k]) / (c[k] - t); if (!(x > 0) || x > P.T * 0.6) return;
            var Q = afterAdd(P, c, x);
            out.items.push({ k: k, head: head, act: 'Aggiungi ' + gtxt(x) + ' di ' + nm.toLowerCase(), after: afterTxt(Q), Q: Q });
          });
        } else {
          /* togliere una parte dell'ingrediente che contribuisce di più */
          var best = null;
          (r.i || []).forEach(function (g) {
            var gr = grams(g), c = comp(g[0]); if (!(gr > 0) || !c) return;
            var share = gr * c[k]; if (!best || share > best.share) best = { g: g, gr: gr, c: c, share: share };
          });
          if (best && best.c[k] > t) {
            var y = (P[k] - t * P.T) / (best.c[k] - t);
            if (y > 0 && y < best.gr * 0.9) { var Q1 = afterRemove(P, best.c, y); out.items.push({ k: k, head: head, act: 'Riduci ' + best.g[0].toLowerCase() + ' di ' + gtxt(y) + ' (da ' + gtxt(best.gr) + ' a ' + gtxt(best.gr - y) + ')', after: afterTxt(Q1), Q: Q1 }); }
          }
          var dn = k === 'sol' ? 'Acqua' : (B.dil || REDUCERS[k]), cd = comp(dn);
          if (cd && cd[k] < t) {
            var x2 = (P[k] - t * P.T) / (t - cd[k]);
            if (x2 > 0 && x2 < P.T * 0.6) { var Q2 = afterAdd(P, cd, x2); out.items.push({ k: k, head: head, act: 'Diluisci con ' + gtxt(x2) + ' di ' + dn.toLowerCase(), after: afterTxt(Q2), Q: Q2 }); }
          }
        }
      });
    }
    if (B.r && out.off && out.off.length && B.combo !== false) {
      /* correzione combinata: tre correttori risolti insieme, così i parametri già in fascia non escono */
      var P0 = prof(A), ks = ['s', 'f', 'sol'], pick = { s: 'Saccarosio', f: 'Panna 35%', sol: 'Latte in polvere scremato' };
      var cs = ks.map(function (k) { return comp(pick[k]); });
      if (cs.every(Boolean)) {
        var tg = ks.map(function (k) {
          var rg = B.r[k], v = pctOf(P0, k), w = rg[1] - rg[0];
          if (v < rg[0]) return (rg[0] + w * 0.35) / 100;
          if (v > rg[1]) return (rg[1] - w * 0.35) / 100;
          return Math.max(rg[0] + w * 0.15, Math.min(v, rg[1] - w * 0.15)) / 100;
        });
        var M = ks.map(function (k, i) { return cs.map(function (c) { return c[k] - tg[i]; }); }), bb = ks.map(function (k, i) { return tg[i] * P0.T - P0[k]; });
        var xs = solve(M, bb);
        if (xs && xs.every(function (x) { return x > -0.5 && x < P0.T * 0.6; })) {
          var Qc = P0, parts = [];
          xs.forEach(function (x, i) { if (x >= 0.5) { Qc = afterAdd(Qc, cs[i], x); parts.push(gtxt(x) + ' di ' + pick[ks[i]].toLowerCase()); } });
          if (parts.length >= 2 || (parts.length === 1 && out.off.length >= 2)) out.items.unshift({ k: 'mix', combo: true, head: 'Correzione combinata: tutti i parametri in fascia', act: 'Aggiungi ' + parts.join(' + '), after: afterTxt(Qc), Q: Qc });
        }
      }
    }
    if (B.r) out.items.forEach(function (it) { if (it.Q) { it.warn = outOf(it.Q, B); } });
    if (B.r) out.items.sort(function (a, b) { return (a.combo ? -1 : 0) - (b.combo ? -1 : 0) || a.warn.length - b.warn.length; });
    if (B.q) {
      var F = A.flour;
      if (!F) { out.rows.push({ k: 'flour', v: 0, rg: null, st: 'na', label: 'Farina non riconosciuta' }); return out; }
      [['sugar', 'Zucchero', 'zucchero'], ['butter', 'Burro', 'burro'], ['eggs', 'Uova', 'uova']].forEach(function (x) {
        var cur = A[x[0]], v = cur / F * 100, rg = B.q[x[0]], st = v < rg[0] ? 'low' : v > rg[1] ? 'high' : 'ok';
        out.rows.push({ k: x[0], v: v, rg: rg, st: st, label: x[1] + '/farina' });
        if (st === 'ok') return;
        var t = st === 'low' ? rg[0] + 2 : rg[1] - 2, d = t / 100 * F - cur;
        out.items.push({ k: x[0], head: x[1] + '/farina ' + f1(v) + '% (frolla ' + rg[0] + '–' + rg[1] + '%)', act: (d > 0 ? 'Aggiungi ' : 'Togli ') + gtxt(Math.abs(d)) + ' di ' + x[2], after: x[1].toLowerCase() + '/farina ' + f1(t) + '%' });
      });
    }
    return out;
  }
  XL.suggest = suggestions;
  function today() { var d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  /* modifica controllata di una ricetta (solo campi indicati) */
  XL.patchRec = function (r, mutate) {
    if (window.WL && WL.canEdit && !WL.canEdit()) { XL.toast('Solo admin e pastry chef possono modificare la ricetta'); return false; }
    var nd = JSON.parse(JSON.stringify(r)); delete nd._id; mutate(nd);
    try { updateRec(r, nd); } catch (e) { XL.toast('Non riesco a salvare'); return false; }
    var f = fresh(r); [f, r].forEach(function (x) { if (!x) return; Object.keys(nd).forEach(function (k) { x[k] = nd[k]; }); ['ai_nt', 'nt', 'p'].forEach(function (k) { if (!(k in nd)) delete x[k]; }); });
    if (f) XL.rec = f;
    try { XL.refreshLab(); } catch (e) {}
    return true;
  };
  /* note finite dentro il procedimento (importazioni precedenti): «Note: …» */
  function procNotes(r) { var m = /(^|\n\n)((?:note|nota)\s*:\s*[\s\S]*?)(?=\n\n|$)/i.exec(String(r.p || '')); return m ? m[2].trim() : ''; }
  XL.procNotes = procNotes;
  XL.addNotes = function (r, lines) {
    if (!lines.length) return false;
    if (window.WL && WL.canEdit && !WL.canEdit()) { XL.toast('Solo admin e pastry chef possono scrivere nelle note'); return false; }
    var nd = JSON.parse(JSON.stringify(r)); delete nd._id;
    nd.nt = (r.nt ? String(r.nt).replace(/\s+$/, '') + '\n' : '') + lines.join('\n');
    try { updateRec(r, nd); } catch (e) { XL.toast('Non riesco a salvare le note'); return false; }
    var f = fresh(r); if (f) { f.nt = nd.nt; XL.rec = f; }
    r.nt = nd.nt;
    return true;
  };
  function renderSuggest(r) {
    var box = $('xlSug'); if (!box) return;
    var S = suggestions(r), key = S.key, ed = !(window.WL && WL.canEdit) || WL.canEdit();
    var ov = profOverride(r), auto = ov ? null : balProfile(r);
    var opts = '<option value="">Automatico' + (auto ? ' (' + BAL[auto].t + ')' : '') + '</option>' +
      Object.keys(BAL).map(function (k) { return '<option value="' + k + '"' + (ov === k ? ' selected' : '') + '>' + BAL[k].t + '</option>'; }).join('') +
      '<option value="none"' + (ov === 'none' ? ' selected' : '') + '>Nessun riferimento</option>';
    var rows = S.rows.map(function (x) {
      if (x.st === 'na') return '<div class="bs-row"><span>' + esc(x.label) + '</span></div>';
      return '<div class="bs-row ' + x.st + '"><span>' + esc(x.label || PNAME[x.k]) + '</span><b class="mono">' + f1(x.v) + '%</b><small class="mono">' + x.rg[0] + '–' + x.rg[1] + '%</small><em>' + (x.st === 'ok' ? 'OK' : x.st === 'low' ? 'Basso' : 'Alto') + '</em></div>';
    }).join('');
    var items = S.items.map(function (it, i) {
      var warn = it.warn && it.warn.length ? '<span class="bs-warn">Attenzione: dopo restano ' + esc(it.warn.join(', ')) + '</span>' : (it.Q ? '<span class="bs-good">Tutto in fascia</span>' : '');
      return '<label class="bs-item' + (it.combo ? ' combo' : '') + '"><input type="checkbox" data-i="' + i + '"><span class="bs-box"></span><span class="bs-t"><small>' + esc(it.head) + '</small><b>' + esc(it.act) + '</b><span class="mono">dopo: ' + esc(it.after) + '</span>' + warn + '</span></label>';
    }).join('');
    var ai = XL._sugAi && XL._sugAi.r === r.n ? XL._sugAi : null;
    box.innerHTML = '<div class="xl-card-top"><span class="xl-label">Suggerimenti</span><select class="bs-sel" id="bsProf" aria-label="Tipo di preparazione">' + opts + '</select></div>' +
      (!S.B ? '<p class="bs-empty">Scegli il tipo di preparazione per confrontare la ricetta con le fasce di riferimento.</p>'
        : (rows ? '<div class="bs-rows">' + rows + '</div>' : '') +
          (items ? '<p class="bs-hint">La ricetta non viene modificata. Spunta i suggerimenti utili e salvali nelle note. Valori calcolati sulla dose base.</p><div class="bs-items">' + items + '</div>'
            : '<p class="bs-ok">Tutti i parametri sono nella fascia di riferimento.</p>')) +
      (r.ai_nt ? '<div class="bs-src"><span class="bs-src-h">Note dalla fonte (AI)</span><label class="bs-item"><input type="checkbox" data-src="1"><span class="bs-box"></span><span class="bs-t"><small>Lette dal testo importato: non sono nel procedimento</small><span class="bs-ai-t">' + esc(r.ai_nt) + '</span></span></label>' + (ed ? '<button type="button" class="bs-link" id="bsSrcDrop">Scarta queste note</button>' : '') + '</div>' : '') +
      (procNotes(r) && ed ? '<div class="bs-src warn"><span class="bs-src-h">Note dentro il procedimento</span><p class="bs-hint">' + esc(procNotes(r).slice(0, 180)) + (procNotes(r).length > 180 ? '…' : '') + '</p><button type="button" class="lb-btn" id="bsMoveNotes">Sposta nelle note della ricetta</button></div>' : '') +
      (ai ? '<div class="bs-ai"><label class="bs-item"><input type="checkbox" data-ai="1"><span class="bs-box"></span><span class="bs-t"><small>Consigli dell’AI</small><span class="bs-ai-t">' + esc(ai.text) + '</span></span></label></div>' : '') +
      '<div class="bs-acts">' + (ed ? '<button type="button" class="lb-btn dark" id="bsAdd" disabled>Aggiungi alle note</button>' : '<button type="button" class="lb-btn" id="bsCopy" disabled>Copia</button>') +
      '<button type="button" class="lb-btn" id="bsAi">' + (XL._sugBusy ? 'L’AI sta pensando…' : 'Altri consigli dall’AI') + '</button></div>' +
      (r.nt ? '<div class="bs-notes"><span class="xl-label">Note della ricetta</span><p>' + esc(r.nt) + '</p></div>' : '');
    var sel = $('bsProf'); sel.onchange = function () { setProf(r, sel.value); };
    var chosen = function () {
      var L = [], d = today();
      [].forEach.call(box.querySelectorAll('input[data-i]:checked'), function (c) { var it = S.items[+c.dataset.i]; L.push('[Bilanciamento ' + d + '] ' + it.head + ': ' + it.act + ' → ' + it.after + (it.warn && it.warn.length ? ' (restano ' + it.warn.join(', ') + ')' : '') + '.'); });
      var a = box.querySelector('input[data-ai]:checked'); if (a && ai) L.push('[Consigli AI ' + d + '] ' + ai.text.replace(/\s*\n\s*/g, ' · '));
      var sn = box.querySelector('input[data-src]:checked'); if (sn && r.ai_nt) L.push('[Note dalla fonte] ' + r.ai_nt);
      return L;
    };
    var btn = $('bsAdd') || $('bsCopy');
    [].forEach.call(box.querySelectorAll('input[type=checkbox]'), function (c) { c.onchange = function () { var n = chosen().length; btn.disabled = !n; btn.textContent = ($('bsAdd') ? 'Aggiungi alle note' : 'Copia') + (n ? ' (' + n + ')' : ''); }; });
    if ($('bsAdd')) $('bsAdd').onclick = function () {
      var L = chosen(), src = !!box.querySelector('input[data-src]:checked');
      var ok = XL.patchRec(r, function (nd) { nd.nt = (nd.nt ? String(nd.nt).replace(/\s+$/, '') + '\n' : '') + L.join('\n'); if (src) delete nd.ai_nt; });
      if (ok) { XL.toast(L.length === 1 ? 'Aggiunto alle note' : L.length + ' suggerimenti aggiunti alle note'); renderSuggest(XL.rec); }
    };
    var dr = $('bsSrcDrop'); if (dr) dr.onclick = function () { if (XL.patchRec(r, function (nd) { delete nd.ai_nt; })) { XL.toast('Note della fonte scartate'); renderSuggest(XL.rec); } };
    var mv = $('bsMoveNotes'); if (mv) mv.onclick = function () {
      var pn = procNotes(r);
      if (XL.patchRec(r, function (nd) { nd.p = String(nd.p || '').replace(pn, '').replace(/\n{3,}/g, '\n\n').trim(); if (!nd.p) delete nd.p; nd.nt = (nd.nt ? String(nd.nt).replace(/\s+$/, '') + '\n' : '') + pn.replace(/^(note|nota)\s*:\s*/i, ''); })) { XL.toast('Note spostate dal procedimento'); renderSuggest(XL.rec); }
    };
    if ($('bsCopy')) $('bsCopy').onclick = function () { var t = chosen().join('\n'); try { navigator.clipboard.writeText(t); XL.toast('Copiato'); } catch (e) { prompt('Copia', t); } };
    $('bsAi').onclick = function () {
      if (XL._sugBusy) return; XL._sugBusy = true; renderSuggest(r);
      var D = data(r);
      aiAdvice(rcSummaryText(r.n, r.c, r.i, D.A, D.P)).then(function (d) {
        XL._sugBusy = false;
        XL._sugAi = { r: r.n, text: String(d.advice || ('⚠ ' + (d.error || 'Nessuna risposta'))).replace(/\*\*/g, '').trim() };
        if (XL.rec && XL.rec.n === r.n && $('xlSug')) renderSuggest(XL.rec);
      });
    };
  }

  /* ── Bilanciamento: distinta base con mise en place ── */
  function role(name) {
    var c = null; try { c = rcComp(name); } catch (e) {}
    if (!c) return '—';
    var L = ['Acqua', 'Zuccheri', 'Grassi', 'Proteine', 'Solidi'], i = 0;
    for (var k = 1; k < 5; k++) if (c[k] > c[i]) i = k;
    return L[i] + ' ' + Math.round(c[i]) + '%';
  }
  function renderFormula(qtyOnly) {
    var r = XL.rec, D = data(r), host = $('xlFormula'), ings = r.i || [];
    if (qtyOnly && host.querySelector('.xl-formula')) {
      [].forEach.call(host.querySelectorAll('tr[data-i] .q'), function (cell) { var g = (r.i || [])[+cell.closest('tr').dataset.i]; if (g) cell.textContent = g[1] == null ? 'q.b.' : fmtQ(g[1] * XL.dose) + ' ' + (g[2] || 'g'); });
      var ft = $('xlFTot'); if (ft) ft.textContent = fmtG(D.tot * XL.dose) + ' g';
      if (XL.rcw) XL.rcw.refresh(); return;
    }
    var A = D.A, P = D.P;
    var parts = [['Acqua', A.w, '#A7B9BC'], ['Zuccheri', A.s, '#C9A86A'], ['Grassi', A.f, '#A67B5B'], ['Proteine', A.p, '#7F8F5A'], ['Altri solidi', Math.max(0, A.tot - A.w - A.s - A.f - A.p), '#4A5A3A']];
    var bar = A.tot ? parts.map(function (x) { var v = pct(x[1], A.tot); return v > 0.3 ? '<i style="flex:' + v.toFixed(2) + ';background:' + x[2] + '" title="' + x[0] + ' ' + f1(v) + '%"></i>' : ''; }).join('') : '';
    var legend = A.tot ? parts.map(function (x) { var v = pct(x[1], A.tot); return v > 0.3 ? '<span><i style="background:' + x[2] + '"></i>' + x[0] + ' <b class="mono">' + f1(v) + '%</b></span>' : ''; }).join('') : '';
    var checks = '';
    if (P.r && A.tot) {
      [['Zuccheri', pct(A.s, A.tot), P.r.s], ['Grassi', pct(A.f, A.tot), P.r.f], ['Solidi', pct(A.tot - A.w, A.tot), P.r.sol]].forEach(function (x) {
        if (!x[2]) return; var st = x[1] < x[2][0] ? 'Basso' : x[1] > x[2][1] ? 'Alto' : 'OK';
        checks += '<div class="lb-chk"><span>' + x[0] + '</span><span class="mono">' + f1(x[1]) + '%</span><span class="lb-rng mono">' + x[2][0] + '–' + x[2][1] + '%</span><em class="' + (st === 'OK' ? 'ok' : 'warn') + '">' + st + '</em></div>';
      });
    }
    var par = [['Acqua', A.w], ['Zuccheri', A.s], ['Grassi', A.f], ['Proteine', A.p], ['Solidi totali', A.tot - A.w]];
    host.innerHTML = '<div class="xl-formula xr-formula">' +
      '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Composizione</span><span class="xl-small">' + esc(P.t || 'Stima') + '</span></div>' +
        (A.tot ? '<div class="lb-stack">' + bar + '</div><div class="lb-leg">' + legend + '</div>' + checks +
          '<p class="lb-note">' + Math.round(A.known / A.tot * 100) + '% degli ingredienti riconosciuto' + (A.unknown.length ? ' · senza dati: ' + esc(A.unknown.join(', ')) : '') + '</p>'
          : '<p class="lb-empty">Composizione non disponibile.</p>') + '</div>' +
      '<div class="xl-card bs" id="xlSug"></div>' +
      '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Parametri</span></div>' +
        par.map(function (x) { return '<div class="xl-chem"><span>' + x[0] + '</span><strong class="mono">' + (A.tot ? f1(pct(x[1], A.tot)) + '%' : '—') + '</strong></div>'; }).join('') + '</div>' +
      (ings.length ? '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Ingredienti in percentuale</span><span class="lb-count mono" id="xlFTot">' + fmtG(D.tot * XL.dose) + ' g</span></div>' +
        '<div class="xl-tscroll"><table class="xl-table xr-ptab"><thead><tr><th>Ingrediente</th><th>Quantità</th><th>% peso</th><th>Ruolo</th></tr></thead><tbody>' +
        ings.map(function (g, i) { var gr = grams(g); return '<tr data-i="' + i + '"><td><strong>' + esc(g[0]) + '</strong></td><td class="n"><span class="q mono">' + (g[1] == null ? 'q.b.' : fmtQ(g[1] * XL.dose) + ' ' + esc(g[2] || 'g')) + '</span></td><td class="n mono">' + (gr != null && A.tot ? f1(pct(gr, A.tot)) + '%' : '—') + '</td><td class="xl-role">' + esc(role(g[0])) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>' : '') +
      '</div>';
    renderSuggest(r);
  }
  /* «Produzione» porta al banco di lavoro, sulla scheda dei timer */
  XL.openProd = function () {
    var r = XL.rec ? fresh(XL.rec) : null; if (!r) { XL.toast('Apri prima una ricetta'); return; }
    XL.open(r, 'lab');
  };
  /* ══════════ HOME: «Riprendi» ══════════ */
  function refreshHome() {
    var land = $('landing'); if (!land) return;
    var box = $('xlResume');
    if (!box) { box = h('div', 'xl-resume xl'); box.id = 'xlResume'; var top = land.querySelector('.land-top'); if (top) top.parentNode.insertBefore(box, top.nextSibling); }
    var list = recs().slice().sort(function (a, b) { return (+b._id || 0) - (+a._id || 0); }).slice(0, 8);
    if (!list.length) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="xl-resume-h"><span>Riprendi dal laboratorio</span><span class="mono" style="letter-spacing:0">' + recs().length + ' ricette</span></div><div class="xl-resume-row"></div>';
    var row = box.lastChild;
    list.forEach(function (r, i) {
      var b = h('button', 'xl-rc'); b.type = 'button'; b.style.setProperty('--i', i);
      var D = rcAnalyze(r.i || []);
      b.innerHTML = '<i></i><span><b>' + esc(r.n) + '</b><small>' + esc(WL.secLabel(r.s)) + ' · ' + fmtG(D.tot) + ' g</small></span>';
      b.onclick = function () { XL.open(r, 'lab'); };
      row.appendChild(b);
    });
  }
  var homeT = null;
  function homeSoon() { clearTimeout(homeT); homeT = setTimeout(function () { if (XL.viewOpen && XL.rec) { var f = fresh(XL.rec); if (f !== XL.rec) { XL.rec = f; renderHead(); } } }, 250); }

  /* ══════════ AGGANCI ALL'APP ESISTENTE ══════════ */
  function hooks() {
    if (typeof window.buildCard === 'function') {
      var _bc = window.buildCard;
      window.buildCard = function (r, idx) {
        var c = _bc.apply(this, arguments);
        try {
          c.style.setProperty('--i', idx || 0);
          var row = h('div', 'xl-card-ctas');
          var b = h('button', 'xl-card-cta', '<span>Laboratorio</span><i>→</i>'); b.type = 'button';
          b.onclick = function (e) { e.stopPropagation(); XL.open(r, 'lab'); };
          var m = h('button', 'xl-card-ms', IC2.mold + '<span>Stampi</span>'); m.type = 'button'; m.title = 'Scala su stampi, teglie, gastronorm e monoporzioni';
          m.onclick = function (e) { e.stopPropagation(); XL.open(r, 'molds'); };
          row.appendChild(b); row.appendChild(m); c.appendChild(row);
        } catch (e) {}
        return c;
      };
    }
    if (typeof window.openRecipePanel === 'function') {
      var _orp = window.openRecipePanel;
      window.openRecipePanel = function (r) {
        var out = _orp.apply(this, arguments);
        try {
          var name = $('rpName'), btn = $('xlRpBtn');
          if (name && !btn) {
            btn = h('button', 'xl-rp-btn', '<span>Laboratorio</span><i>→</i>'); btn.id = 'xlRpBtn'; btn.type = 'button';
            var blk = name.parentNode; blk.appendChild(btn);
            btn.onclick = function () { var rr = window._rpRec, d = window._rpDose || 1; closeRecipePanel(); if (rr) { XL.open(rr, 'lab'); if (d !== XL.dose) XL.setDose(d, true); } };
            var mb = h('button', 'xl-rp-btn xl-rp-ms', IC2.mold + '<span>Stampi e teglie</span>'); mb.id = 'xlRpMold'; mb.type = 'button'; blk.appendChild(mb);
            mb.onclick = function () { var rr = window._rpRec, d = window._rpDose || 1; closeRecipePanel(); if (rr) { XL.open(rr, 'lab'); if (d !== XL.dose) XL.setDose(d, true); XL.open(rr, 'molds'); } };
          }
        } catch (e) {}
        return out;
      };
    }
    if (typeof window.persistLocal === 'function') {
      var _pl = window.persistLocal;
      window.persistLocal = function () { var r = _pl.apply(this, arguments); homeSoon(); return r; };
    }
    if (typeof window.openStudio === 'function') { var _os = window.openStudio; window.openStudio = function () { closeView(); return _os.apply(this, arguments); }; }
    if (typeof window.openLibrary === 'function') { var _ol = window.openLibrary; window.openLibrary = function () { closeView(); return _ol.apply(this, arguments); }; }
    if (window.WL && typeof WL.renderPanels === 'function') {
      var _rp = WL.renderPanels;
      WL.renderPanels = function () { var r = _rp.apply(this, arguments); var box = document.getElementById('landPanels'); if (box) { var n = box.children.length; box.style.setProperty('--cols', n <= 4 ? n : (n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : n === 5 ? 5 : 3)); } return r; };
    }
    if (window.WL && typeof WL.applyBrand === 'function') {
      var _ab = WL.applyBrand;
      WL.applyBrand = function () { var r = _ab.apply(this, arguments); var c = $('xlChef'); if (c) { c.querySelector('i').textContent = initials(WL.brand().name || WL.email()); } return r; };
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && XL.viewOpen && !$('xlProd') && !document.querySelector('.ck,.st,.wl-bg.on,#kc.on')) closeView(); });
  }
  XL.toast = function (msg) { try { if (window.eclatToast) window.eclatToast(msg); } catch (e) {} };
  function isEclat() { return document.body.classList.contains('t-eclat'); }
  XL.isEclat = isEclat;
/* ══════════ ANIMAZIONI (solo con il tema Éclat) ══════════ */
  function stag(nodes, cls, step) {
    if (calm) return;
    [].forEach.call(nodes, function (n, i) { n.style.setProperty('--i', Math.min(i, 14)); n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); });
  }
  function bumpEl(el) { if (!el || calm) return; el.classList.remove('xl-bump'); void el.offsetWidth; el.classList.add('xl-bump'); }
  function motionHooks() {
    /* conferme: con Éclat diventano notifiche con spunta */
    if (typeof window.showDbBanner === 'function') {
      var _sdb = window.showDbBanner;
      window.showDbBanner = function (msg, type) {
        if (isEclat() && type === 'ok' && window.eclatToast) {
          var b = document.getElementById('dbBanner'); if (b) b.style.display = 'none';
          try { clearTimeout(window._bannerTimer); } catch (e) {}
          window.eclatToast(msg); return;
        }
        return _sdb.apply(this, arguments);
      };
    }
    if (typeof window.rpChangeDose === 'function') {
      var _rcd = window.rpChangeDose;
      window.rpChangeDose = function () { var r = _rcd.apply(this, arguments); if (isEclat()) bumpEl(document.getElementById('rpDose')); return r; };
    }
    /* dose generale del ricettario */
    ['dPlus', 'dMinus'].forEach(function (id) { var b = $(id); if (b) b.addEventListener('click', function () { if (isEclat()) bumpEl($('dVal')); }); });
  }
  function motionAfterBoot() {
    /* contatori in home che scorrono */
    var st = $('exStats');
    if (st && window.MutationObserver && !st._xl) {
      st._xl = 1;
      new MutationObserver(function () {
        if (!isEclat() || calm) return;
        [].forEach.call(st.querySelectorAll('b'), function (b) {
          var to = parseInt(b.textContent, 10); if (!(to > 0) || b._done === to) return; b._done = to;
          var t0 = performance.now();
          (function step(now) { var k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3); b.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); })(t0);
        });
      }).observe(st, { childList: true });
    }
  }

  function afterBoot() {
    /* barra in alto e «Riprendi» non attivi: restano la barra in basso e i pulsanti originali */
    try { WL.renderPanels(); } catch (e) {}
    motionAfterBoot();
  }
  if (typeof window.boot === 'function') {
    var _boot = window.boot;
    window.boot = function () { var r = _boot.apply(this, arguments); try { afterBoot(); } catch (e) { console.error(e); } return r; };
  }
  /* cambio tema: lontano da Éclat le viste nuove si chiudono */
  /* il Laboratorio è disponibile con tutti i temi: cambiare tema non lo chiude */
  hooks(); motionHooks();
})();
