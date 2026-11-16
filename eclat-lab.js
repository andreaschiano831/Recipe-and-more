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
   Visibile solo con il tema Éclat (body.t-eclat): con gli altri temi
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
    var ings = r.i || [], A = rcAnalyze(ings), P = rcProfile(r.c, r.s, r.n);
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
  function buildView() {
    if ($('xlView')) return;
    var v = h('section', 'xl-view xl'); v.id = 'xlView'; v.setAttribute('aria-label', 'Laboratorio');
    v.innerHTML = '<div class="xl-shell"><div class="xl-head"><div style="min-width:0">' +
      '<button class="xl-back" id="xlBack">' + ICO.back + 'Collezione</button>' +
      '<h1 class="xl-title" id="xlTitle"></h1><div class="xl-meta" id="xlMeta"></div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="xl-seg" id="xlSeg"><button data-m="lab">Laboratorio</button><button data-m="formula">Bilanciamento</button><button data-m="cook" title="Modalità cucina a schermo intero">Cucina</button></div>' +
      '<span class="xl-chip" id="xlScaleChip"></span></div></div>' +
      '<div id="xlLab"></div><div id="xlFormula" hidden></div></div>';
    document.body.appendChild(v);
    $('xlBack').onclick = function () { closeView(); tbGoRecipes(); };
    [].forEach.call(v.querySelectorAll('#xlSeg button'), function (b) { b.onclick = function () { if (b.dataset.m === 'cook') { try { openCucina(XL.rec, XL.dose); } catch (e) {} } else XL.open(XL.rec, b.dataset.m); }; });
  }
  XL.open = function (r, mode) {
    r = fresh(r); if (!r) return;
    buildView();
    var changed = !XL.rec || XL.rec._id !== r._id || XL.rec.n !== r.n;
    if (changed) { XL.dose = (typeof cardDoseOf === 'function' ? cardDoseOf(r) : 1) || 1; XL.phase = 0; if (!XL.pane || XL.pane === 'all') XL.pane = null; }
    XL.rec = r; XL.mode = mode || 'lab';
    var v = $('xlView');
    XL.viewOpen = true; v.classList.add('on'); v.scrollTop = 0; document.body.style.overflow = 'hidden';
    var tp = $('xlTopProd'); if (tp) tp.hidden = false;
    renderHead();
    $('xlLab').hidden = XL.mode !== 'lab'; $('xlFormula').hidden = XL.mode !== 'formula';
    if (XL.mode === 'lab') renderLab(); else renderFormula();
    setNav(XL.mode);
    [].forEach.call(document.querySelectorAll('#xlSeg button'), function (b) { b.classList.toggle('on', b.dataset.m === XL.mode); });
    XL.pane = null; XLT.render();
  };
  function closeView() {
    var v = $('xlView'); if (!v || !XL.viewOpen) return;
    XL.viewOpen = false; v.classList.remove('on'); document.body.style.overflow = ''; XL._benchStep = null; XLT.render();
    try { tbSync(); } catch (e) {}
  }
  XL.close = closeView;
  function renderHead() {
    var r = XL.rec, D = data(r);
    $('xlTitle').textContent = r.n;
    var bits = [WL.secLabel(r.s), r.c, r.piatto].filter(Boolean).map(esc);
    $('xlMeta').innerHTML = bits.join('<span>•</span>') + '<span>•</span><span class="mono">' + (r.i || []).length + ' ingredienti</span>' + (D.P.t ? '<span>•</span><span>' + esc(D.P.t) + '</span>' : '');
    $('xlScaleChip').textContent = 'BATCH ' + fmtX(XL.dose) + ' · ' + fmtG(D.tot * XL.dose) + ' g TOTALI';
  }
  XL.setDose = function (d, silent) {
    d = Math.max(0.05, Math.min(100, Math.round(d * 1000) / 1000));
    if (d === XL.dose) return;
    var D = data(XL.rec), from = D.tot * XL.dose; XL.dose = d;
    renderHead();
    roll($('xlBig'), from, D.tot * d, function (v) { return fmtG(v) + ' g'; });
    [].forEach.call(document.querySelectorAll('.xl-tabs button'), function (b) { b.classList.toggle('on', +b.dataset.d === d); });
    if (XL.mode === 'formula') renderFormula(true);
    else if (XL.mode === 'lab') benchQty();
    if (!silent) XL.toast('Dose ' + fmtX(d) + ' applicata');
  };
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
  function saveBench() { try { localStorage.setItem(BENCH_KEY, JSON.stringify(XL.weighed)); } catch (e) {} }
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
  function stepTitle(s) { var t = String(s).split(/[.;:]/)[0].trim(); if (t.length > 64) t = t.slice(0, 62).replace(/\s+\S*$/, '') + '…'; return t; }

  function renderLab() {
    var r = XL.rec, D = data(r), A = D.A, P = D.P, host = $('xlLab'), ings = r.i || [], w = weighedOf(r), sd = stepsOf(r);
    var n = D.steps.length, cur = curStep(r, n), doneN = 0; for (var k = 0; k < n; k++) if (sd[k]) doneN++;
    var pane = XL.pane || (window.innerWidth < 900 ? 'proc' : 'all');
    var presets = [0.5, 1, 1.5, 2, 3, 4].map(function (d) { return '<button data-d="' + d + '" class="' + (Math.abs(d - XL.dose) < 1e-6 ? 'on' : '') + '">' + fmtX(d) + '</button>'; }).join('');
    /* mise en place */
    var mise = ings.map(function (g, i) {
      return '<label class="lb-ing-row' + (w[i] ? ' done' : '') + '" data-i="' + i + '"><input type="checkbox"' + (w[i] ? ' checked' : '') + '><span class="lb-box" aria-hidden="true"></span>' +
        '<span class="lb-ing-n">' + esc(g[0]) + '</span><span class="lb-ing-q mono">' + esc(qtyTxt(g)) + '</span></label>';
    }).join('');
    /* procedimento */
    var steps = D.steps.map(function (s, i) {
      var t = ckTemp(s), m = ckMinutes(s), sh = stepHtml(s, ings), st = sd[i] ? 'done' : i === cur ? 'cur' : '';
      var chips = (t ? '<span class="lb-chip t">' + t + '</span>' : '') + (m ? '<span class="lb-chip">' + (m >= 60 ? (Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '')) : m + ' min') + '</span>' : '');
      return '<article class="lb-step ' + st + '" data-i="' + i + '">' +
        '<button type="button" class="lb-num" aria-label="' + (sd[i] ? 'Segna da fare' : 'Segna fatto') + ' il passaggio ' + (i + 1) + '"><span>' + (i + 1) + '</span><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
        '<div class="lb-step-b"><div class="lb-step-h"><span class="lb-step-k">Passaggio ' + (i + 1) + ' di ' + n + '</span><strong>' + esc(stepTitle(s)) + '</strong>' + chips + '</div>' +
        '<div class="lb-step-more"><div><p>' + sh.html + '</p>' +
        (sh.used.length ? '<div class="lb-uses">' + sh.used.map(function (j) { return '<span class="' + (w[j] ? 'ok' : '') + '">' + esc(ings[j][0]) + ' <b class="mono">' + esc(qtyTxt(ings[j])) + '</b></span>'; }).join('') + '</div>' : '') +
        '<div class="lb-step-a">' + (m ? '<button type="button" class="lb-btn lb-tbtn" data-min="' + m + '">' + ICO.clock + '<span>Timer ' + (m >= 60 ? (Math.round(m / 6) / 10).toString().replace('.', ',') + ' h' : m + ' min') + '</span></button>' : '') +
        '<button type="button" class="lb-btn dark lb-next">' + (i === n - 1 ? 'Ultimo passaggio fatto' : 'Fatto, avanti') + '<i>→</i></button></div></div></div></div></article>';
    }).join('');
    /* composizione */
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
    var aiOk = (typeof _aiServer !== 'undefined' && _aiServer) || (typeof aiHasLocalKey === 'function' && aiHasLocalKey());
    var pctDone = n ? Math.round(doneN / n * 100) : 0;
    host.innerHTML =
      '<div class="lb-tabs" role="tablist">' + [['mise', 'Mise en place'], ['proc', 'Procedimento'], ['tim', 'Timer']].map(function (t) { return '<button role="tab" data-p="' + t[0] + '" class="' + (pane === t[0] ? 'on' : '') + '">' + t[1] + (t[0] === 'tim' ? '<b class="lb-tcount" id="lbTabCount"></b>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="lb-bench" data-pane="' + pane + '">' +
      /* MISE EN PLACE */
      '<section class="lb-col lb-mise" data-p="mise"><div class="lb-card">' +
        '<div class="lb-h"><span class="lb-eyebrow">Mise en place</span><span class="lb-count mono" id="lbMiseN"></span></div>' +
        '<div class="lb-dose"><div class="lb-dose-v"><span>Dose</span><strong class="mono" id="lbDoseV">' + fmtX(XL.dose) + '</strong><small class="mono" id="lbTot">' + fmtG(D.tot * XL.dose) + ' g</small></div>' +
        '<div class="lb-presets">' + presets + '</div>' +
        '<div class="lb-inline"><input id="xlTarget" inputmode="decimal" placeholder="Peso finale in g"><button type="button" id="xlTargetGo">Porta a peso</button></div></div>' +
        '<div class="lb-bar"><i id="lbMiseFill"></i></div>' +
        (ings.length ? '<div class="lb-ings">' + mise + '</div><button type="button" class="lb-link" id="lbMiseReset">Azzera le spunte</button>' : '<p class="lb-empty">Questa ricetta non ha ancora ingredienti.</p>') +
      '</div></section>' +
      /* PROCEDIMENTO */
      '<section class="lb-col lb-proc" data-p="proc"><div class="lb-card lb-proc-card">' +
        '<div class="lb-h"><span class="lb-eyebrow">Procedimento</span><span class="lb-count mono" id="lbStepN">' + (n ? doneN + ' / ' + n : '') + '</span></div>' +
        (n ? '<div class="lb-bar"><i id="lbStepFill" style="width:' + pctDone + '%"></i></div><div class="lb-steps" id="lbSteps">' + steps + '</div>' +
          '<div class="lb-proc-f"><button type="button" class="lb-link" id="lbStepsReset">Ricomincia</button><span class="lb-hint">Tasti: → passaggio fatto · ← torna indietro</span></div>' +
          (D.info.length ? '<div class="lb-info">' + D.info.map(esc).join('<br>') + '</div>' : '')
          : '<div class="lb-empty"><p>Nessun procedimento scritto per questa ricetta.</p>' + (WL.canEdit && WL.canEdit() ? '<button type="button" class="lb-btn dark" id="lbAddProc">Aggiungi il procedimento<i>✎</i></button>' : '') + '</div>') +
        '<div class="lb-done" id="lbDone" hidden><strong>Produzione completata</strong><span>Tutti i passaggi sono fatti.</span></div>' +
      '</div></section>' +
      /* DESTRA */
      '<section class="lb-col lb-side" data-p="tim">' +
        '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Timer</span><span class="lb-count mono" id="lbTimN"></span></div>' +
          '<div class="lb-timers" id="lbTimers"></div>' +
          '<div class="lb-tnew"><div class="lb-tq">' + [1, 3, 5, 10, 15, 30].map(function (m) { return '<button type="button" data-q="' + m + '">' + m + '′</button>'; }).join('') + '</div>' +
          '<div class="lb-inline"><input id="lbTMin" inputmode="decimal" placeholder="min"><input id="lbTLab" placeholder="Nome (es. forno)"><button type="button" id="lbTAdd">Avvia</button></div></div></div>' +
        '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Composizione</span><button type="button" class="lb-link" id="xlToFormula">Bilanciamento →</button></div>' +
          (A.tot ? '<div class="lb-stack">' + bar + '</div><div class="lb-leg">' + legend + '</div>' + checks +
            '<p class="lb-note">' + (P.t ? esc(P.t) + ' · ' : '') + Math.round(A.known / A.tot * 100) + '% degli ingredienti riconosciuto</p>' : '<p class="lb-empty">Composizione non disponibile.</p>') +
        '</div>' +
        '<div class="lb-card lb-ai" id="xlVoice"><div class="lb-h"><span class="lb-eyebrow">Sous-chef AI</span><span class="lb-pill ' + (aiOk ? 'ok' : '') + '">' + (aiOk ? 'Attivo' : 'Senza chiave') + '</span></div>' +
          '<div class="xl-reply lb-reply" id="xlReply">Chiedi una sostituzione, un ricalcolo o un consiglio su «' + esc(r.n) + '».</div>' +
          '<div class="lb-q">' + [['Agar al posto della gelatina', 'Come sostituisco la gelatina con l\'agar-agar in questa ricetta?'], ['−10% zucchero', 'Riduci lo zucchero del 10% mantenendo la struttura: cosa cambio?'], ['Punti critici', 'Quali sono i punti critici (tempi e temperature) di questa ricetta?']].map(function (q) { return '<button type="button" data-q="' + esc(q[1]) + '">' + q[0] + '</button>'; }).join('') + '</div>' +
          '<div class="lb-inline"><input id="xlAsk" type="text" placeholder="Scrivi una domanda…" autocomplete="off"><button type="button" id="xlSend" aria-label="Invia">Chiedi</button></div>' +
        '</div>' +
      '</section></div>';

    /* eventi: schede (telefono) */
    [].forEach.call(host.querySelectorAll('.lb-tabs button'), function (b) {
      b.onclick = function () { XL.pane = b.dataset.p; host.querySelector('.lb-bench').dataset.pane = b.dataset.p; [].forEach.call(host.querySelectorAll('.lb-tabs button'), function (x) { x.classList.toggle('on', x === b); }); $('xlView').scrollTop = 0; };
    });
    /* dose */
    [].forEach.call(host.querySelectorAll('.lb-presets button'), function (b) { b.onclick = function () { XL.setDose(+b.dataset.d); }; });
    $('xlTargetGo').onclick = function () { var v = parseFloat(String($('xlTarget').value).replace(',', '.')); if (!(v > 0) || !D.tot) { $('xlTarget').focus(); return; } XL.setDose(v / D.tot); $('xlTarget').value = ''; };
    $('xlTarget').onkeydown = function (e) { if (e.key === 'Enter') $('xlTargetGo').click(); };
    /* mise en place */
    [].forEach.call(host.querySelectorAll('.lb-ing-row input'), function (c) {
      c.onchange = function () {
        var row = c.closest('.lb-ing-row'), i = +row.dataset.i; w[i] = c.checked; row.classList.toggle('done', c.checked); saveBench(); miseUi();
        [].forEach.call(host.querySelectorAll('.lb-uses span'), function () {});
        if (c.checked && misePct(r) === 100) XL.toast('Mise en place completa');
      };
    });
    var mr = $('lbMiseReset'); if (mr) mr.onclick = function () { for (var k in w) delete w[k]; saveBench(); renderLab(); };
    function miseUi() {
      var c = 0; for (var k in w) if (w[k]) c++;
      var f = $('lbMiseFill'); if (f) f.style.width = (ings.length ? c / ings.length * 100 : 0) + '%';
      var t = $('lbMiseN'); if (t) t.textContent = ings.length ? c + ' / ' + ings.length + ' pesati' : '';
    }
    miseUi();
    /* procedimento */
    function setDone(i, on) {
      sd[i] = on; if (!on) delete sd[i]; saveBench();
      var c = curStep(r, n), dn = 0; for (var j = 0; j < n; j++) if (sd[j]) dn++;
      [].forEach.call(host.querySelectorAll('.lb-step'), function (el) {
        var k = +el.dataset.i; el.classList.toggle('done', !!sd[k]); el.classList.toggle('cur', k === c);
        el.querySelector('.lb-num').setAttribute('aria-label', (sd[k] ? 'Segna da fare' : 'Segna fatto') + ' il passaggio ' + (k + 1));
      });
      $('lbStepFill').style.width = (n ? dn / n * 100 : 0) + '%'; $('lbStepN').textContent = dn + ' / ' + n;
      $('lbDone').hidden = c !== -1;
      if (c === -1 && on) XL.toast('Produzione completata');
      var ce = host.querySelector('.lb-step.cur');
      if (ce && on && !calm) setTimeout(function () { ce.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 280);
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
      el.querySelector('.lb-step-h').onclick = function () {
        if (el.classList.contains('cur')) return;
        el.classList.toggle('peek');
      };
      var tb = el.querySelector('.lb-tbtn');
      if (tb) tb.onclick = function (e) { e.stopPropagation(); XLT.add({ label: stepTitle(D.steps[i]), sub: r.n, min: +tb.dataset.min, key: String(r._id || r.n) + ':' + i }); };
    });
    if (n) $('lbDone').hidden = curStep(r, n) !== -1;
    var sr = $('lbStepsReset'); if (sr) sr.onclick = function () { for (var k in sd) delete sd[k]; saveBench(); renderLab(); };
    var ap = $('lbAddProc'); if (ap) ap.onclick = function () { closeView(); try { openEdit(r); } catch (e) {} };
    /* timer */
    [].forEach.call(host.querySelectorAll('.lb-tq button'), function (b) { b.onclick = function () { XLT.add({ label: ($('lbTLab').value || '').trim() || ('Timer ' + b.dataset.q + ' min'), sub: r.n, min: +b.dataset.q }); $('lbTLab').value = ''; }; });
    $('lbTAdd').onclick = function () {
      var m = parseFloat(String($('lbTMin').value).replace(',', '.')); if (!(m > 0)) { $('lbTMin').focus(); return; }
      XLT.add({ label: ($('lbTLab').value || '').trim() || ('Timer ' + String(m).replace('.', ',') + ' min'), sub: r.n, min: m }); $('lbTMin').value = ''; $('lbTLab').value = '';
    };
    $('lbTMin').onkeydown = $('lbTLab').onkeydown = function (e) { if (e.key === 'Enter') $('lbTAdd').click(); };
    XLT.render();
    /* composizione e sous-chef */
    $('xlToFormula').onclick = function () { XL.open(r, 'formula'); };
    $('xlSend').onclick = function () { ask(); };
    $('xlAsk').onkeydown = function (e) { if (e.key === 'Enter') ask(); };
    [].forEach.call(host.querySelectorAll('.lb-q button'), function (b) { b.onclick = function () { $('xlAsk').value = b.dataset.q; ask(); }; });
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
      if (box) { box.innerHTML = list.length ? list.map(function (t) { return item(t, true); }).join('') : '<p class="lb-empty sm">Nessun timer attivo. Avvialo da un passaggio o qui sotto.</p>'; bind(box); }
      var n = $('lbTimN'); if (n) n.textContent = list.length ? list.length + ' attiv' + (list.length === 1 ? 'o' : 'i') : '';
      var tc = $('lbTabCount'); if (tc) tc.textContent = list.length ? list.length : '';
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
      if (o.key) { var ex = list.filter(function (x) { return x.key === o.key && !x.rang; })[0]; if (ex) { XL.toast('Timer già attivo: ' + ex.label); if (XL.viewOpen && window.innerWidth < 900) showPane('tim'); return ex; } }
      var sec = Math.round(o.min * 60), t = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: o.label || 'Timer', sub: o.sub || '', key: o.key || '', total: sec, left: sec, end: Date.now() + sec * 1000 };
      list.push(t); save(); askNotify(); render(); start();
      XL.toast('Timer avviato: ' + t.label);
      return t;
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && list.length) { lock = null; start(); } });
    if (list.length) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { render(); start(); }); else { render(); start(); } }
    return { add: add, render: render, list: function () { return list; }, fmt: fmt };
  })();
  function showPane(p) { var b = document.querySelector('.lb-tabs button[data-p="' + p + '"]'); if (b) b.click(); }
  document.addEventListener('keydown', function (e) {
    if (!XL.viewOpen || XL.mode !== 'lab' || !XL._benchStep) return;
    var tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.ck.on,#ck.on,.wl-bg.on')) return;
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

  /* ── Bilanciamento: distinta base con mise en place ── */
  function role(name) {
    var c = null; try { c = rcComp(name); } catch (e) {}
    if (!c) return '—';
    var L = ['Acqua', 'Zuccheri', 'Grassi', 'Proteine', 'Solidi'], i = 0;
    for (var k = 1; k < 5; k++) if (c[k] > c[i]) i = k;
    return L[i] + ' ' + Math.round(c[i]) + '%';
  }
  function renderFormula(qtyOnly) {
    var r = XL.rec, D = data(r), host = $('xlFormula'), w = weighedOf(r), ings = r.i || [];
    if (qtyOnly && host.querySelector('.xl-table')) {
      [].forEach.call(host.querySelectorAll('tr[data-i]'), function (tr) {
        var g = ings[+tr.dataset.i], cell = tr.querySelector('.q'), to = g[1] == null ? null : g[1] * XL.dose, from = cell._v;
        if (to == null) { cell.textContent = 'q.b.'; return; }
        roll(cell, from == null ? to : from, to, function (v) { return fmtQ(v) + ' ' + (g[2] || 'g'); }); cell._v = to;
      });
      $('xlFTot').textContent = 'Totale: ' + fmtG(D.tot * XL.dose) + ' g';
      [].forEach.call(host.querySelectorAll('.xl-tabs button'), function (b) { b.classList.toggle('on', +b.dataset.d === XL.dose); });
      if (XL.rcw) XL.rcw.refresh();
      return;
    }
    var A = D.A, rows = '';
    ings.forEach(function (g, i) {
      var gr = grams(g), q = g[1] == null ? null : g[1] * XL.dose;
      rows += '<tr data-i="' + i + '" class="' + (w[i] ? 'done' : '') + '"><td><input type="checkbox" class="xl-chk" aria-label="Pesato: ' + esc(g[0]) + '"' + (w[i] ? ' checked' : '') + '></td>' +
        '<td><strong>' + esc(g[0]) + '</strong></td><td class="n"><strong class="q">' + (q == null ? 'q.b.' : fmtQ(q) + ' ' + esc(g[2] || 'g')) + '</strong></td>' +
        '<td class="n xl-muted">' + (gr != null && A.tot ? f1(pct(gr, A.tot)) + '%' : '—') + '</td><td class="xl-role">' + esc(role(g[0])) + '</td></tr>';
    });
    var tabs = [0.5, 1, 2, 4].map(function (d) { return '<button data-d="' + d + '" class="' + (d === XL.dose ? 'on' : '') + '">' + fmtX(d) + '</button>'; }).join('');
    var P = D.P, par = [['Acqua', A.w], ['Zuccheri', A.s], ['Grassi', A.f], ['Proteine', A.p], ['Solidi totali', A.tot - A.w]];
    host.innerHTML = '<div class="xl-formula"><div class="xl-card"><div class="xl-card-top"><span class="xl-label">Ingredienti & mise en place</span><span class="xl-chip" id="xlFTot">Totale: ' + fmtG(D.tot * XL.dose) + ' g</span></div>' +
      '<div class="xl-tabs" style="max-width:320px">' + tabs + '</div>' +
      '<div class="xl-mise" id="xlMise"><div class="xl-mise-bar"><i id="xlMiseFill"></i></div><span class="mono" id="xlMiseN"></span></div>' +
      (ings.length ? '<div class="xl-tscroll"><table class="xl-table"><thead><tr><th>✓</th><th>Ingrediente</th><th>Quantità</th><th>% peso</th><th>Componente principale</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="xl-muted" style="padding:24px 4px;font-size:13px">Questa ricetta non ha ancora ingredienti.</p>') +
      (r.p ? '<details style="margin-top:14px"><summary class="xl-label" style="cursor:pointer">Procedimento</summary><p style="white-space:pre-wrap;font-size:13px;line-height:1.6;margin-top:8px;color:var(--ink2)">' + esc(r.p) + '</p></details>' : '') +
      '</div><div class="xl-col"><div class="xl-card"><div class="xl-card-top"><span class="xl-label">Parametri di composizione</span><span class="xl-small">' + esc(P.t || 'Stima') + '</span></div>' +
      par.map(function (x) { return '<div class="xl-chem"><span>' + x[0] + '</span><strong class="mono">' + (A.tot ? f1(pct(x[1], A.tot)) + '%' : '—') + '</strong></div>'; }).join('') +
      (A.unknown.length ? '<p class="xl-muted" style="font-size:11px;margin-top:8px">Senza composizione nota: ' + esc(A.unknown.join(', ')) + '</p>' : '') + '</div>' +
      '<div class="xl-card xl-rc-host" id="xlRcHost"></div>' +
      '<div class="xl-card"><div class="xl-card-top"><span class="xl-label">Fasi di lavorazione</span></div><p class="xl-muted" style="font-size:12.5px;line-height:1.55;margin-bottom:14px">Torna al laboratorio per seguire il procedimento fase per fase.</p>' +
      '<button class="xl-cta" id="xlToSez"><span>Apri il laboratorio</span><i>→</i></button></div></div></div>';
    [].forEach.call(host.querySelectorAll('.xl-tabs button'), function (b) { b.onclick = function () { XL.setDose(+b.dataset.d); }; });
    [].forEach.call(host.querySelectorAll('.xl-chk'), function (c) {
      c.onchange = function () {
        var i = +c.closest('tr').dataset.i; w[i] = c.checked; c.closest('tr').classList.toggle('done', c.checked); mise();
        if (c.checked && misePct(r) === 100) XL.toast('Mise en place completa');
      };
    });
    $('xlToSez').onclick = function () { XL.open(r, 'lab'); };
    XL.rcw = null;
    try {
      XL.rcw = rcWidget($('xlRcHost'), {
        ings: function () { return XL.rec.i || []; }, name: function () { return XL.rec.n; }, cat: function () { return XL.rec.c; }, sec: function () { return XL.rec.s; },
        dose: function () { return XL.dose; }, scale: function (k, round) { if (round) { XL.toast('Le quantità della scheda si arrotondano dalla modifica ricetta'); return; } XL.setDose(k); }
      });
    } catch (e) {}
    [].forEach.call(host.querySelectorAll('.xl-table td .q'), function (c, i) { var g = ings[i]; c._v = g && g[1] != null ? g[1] * XL.dose : null; });
    mise(); stagger(host);
    function mise() {
      var p = misePct(r), n = 0; for (var k in w) if (w[k]) n++;
      $('xlMiseFill').style.width = p + '%'; $('xlMiseN').textContent = n + ' / ' + ings.length + ' pesati';
      $('xlMise').classList.toggle('complete', p === 100);
    }
  }

  /* «Produzione» porta al banco di lavoro, sulla scheda dei timer */
  XL.openProd = function () {
    var r = XL.rec ? fresh(XL.rec) : null; if (!r) { XL.toast('Apri prima una ricetta'); return; }
    XL.pane = window.innerWidth < 900 ? 'tim' : null; XL.open(r, 'lab');
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
          var b = h('button', 'xl-card-cta', '<span>Apri in Laboratorio</span><i>→</i>'); b.type = 'button';
          b.onclick = function (e) { e.stopPropagation(); XL.open(r, 'lab'); };
          c.appendChild(b);
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && XL.viewOpen && !$('xlProd') && !document.querySelector('.ck,.st,.wl-bg.on')) closeView(); });
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
  if (window.MutationObserver) new MutationObserver(function () { if (!isEclat()) { closeView(); var p = $('xlProd'); if (p) p.remove(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  hooks(); motionHooks();
})();
