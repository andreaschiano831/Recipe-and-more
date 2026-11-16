/* ════════════════════════════════════════════════════════════════════
   ÉCLAT · LABORATORIO — interfaccia e animazioni sopra il tema Éclat
   · barra in alto (desktop) con navigazione Home · Collezione ·
     Laboratorio · Bilanciamento · Biblioteca
   · Laboratorio sulla ricetta vera: fasi dal procedimento, sezione,
     scala della dose, curva termica, composizione, sous-chef AI
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
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="xl-seg" id="xlSeg"><button data-m="lab">Laboratorio</button><button data-m="formula">Bilanciamento</button><button data-m="prod">Produzione</button></div>' +
      '<span class="xl-chip" id="xlScaleChip"></span></div></div>' +
      '<div id="xlLab"></div><div id="xlFormula" hidden></div></div>';
    document.body.appendChild(v);
    $('xlBack').onclick = function () { closeView(); tbGoRecipes(); };
    [].forEach.call(v.querySelectorAll('#xlSeg button'), function (b) { b.onclick = function () { if (b.dataset.m === 'prod') XL.openProd(); else XL.open(XL.rec, b.dataset.m); }; });
  }
  XL.open = function (r, mode) {
    r = fresh(r); if (!r) return;
    buildView();
    var changed = !XL.rec || XL.rec._id !== r._id || XL.rec.n !== r.n;
    if (changed) { XL.dose = (typeof cardDoseOf === 'function' ? cardDoseOf(r) : 1) || 1; XL.phase = 0; }
    XL.rec = r; XL.mode = mode || 'lab';
    var v = $('xlView');
    XL.viewOpen = true; v.classList.add('on'); v.scrollTop = 0; document.body.style.overflow = 'hidden';
    var tp = $('xlTopProd'); if (tp) tp.hidden = false;
    renderHead();
    $('xlLab').hidden = XL.mode !== 'lab'; $('xlFormula').hidden = XL.mode !== 'formula';
    if (XL.mode === 'lab') renderLab(); else renderFormula();
    setNav(XL.mode);
    [].forEach.call(document.querySelectorAll('#xlSeg button'), function (b) { b.classList.toggle('on', b.dataset.m === XL.mode); });
  };
  function closeView() {
    var v = $('xlView'); if (!v || !XL.viewOpen) return;
    XL.viewOpen = false; v.classList.remove('on'); document.body.style.overflow = '';
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

  function renderLab() {
    var r = XL.rec, D = data(r), A = D.A, P = D.P, host = $('xlLab'), ph = phases(D);
    if (XL.phase >= ph.length) XL.phase = 0;
    var fat = pct(A.f, A.tot), sug = pct(A.s, A.tot), sol = pct(A.tot - A.w, A.tot), wat = pct(A.w, A.tot), pro = pct(A.p, A.tot);
    var aiOk = (typeof _aiServer !== 'undefined' && _aiServer) || (typeof aiHasLocalKey === 'function' && aiHasLocalKey());
    var related = recs().filter(function (x) { return x !== r && x._id !== r._id; }).sort(function (a, b) {
      var sa = (r.piatto && a.piatto === r.piatto ? 2 : 0) + (a.s === r.s ? 1 : 0), sb = (r.piatto && b.piatto === r.piatto ? 2 : 0) + (b.s === r.s ? 1 : 0);
      return sb - sa || (+b._id || 0) - (+a._id || 0);
    }).slice(0, 4);
    /* cupola: strati per composizione */
    var stops = [], acc = 0, unk = Math.max(0, 100 - wat - sug - fat - pro - Math.max(0, sol - sug - fat - pro));
    [['#587c14', sol - sug - fat - pro], ['#d9a44a', sug], ['#c98b5b', fat], ['#8a9a5b', pro], ['#7fb2c9', wat]].forEach(function (s) { var v = Math.max(0, s[1]); if (!v) return; stops.push(s[0] + ' ' + acc + '% ' + (acc + v) + '%'); acc += v; });
    if (acc < 100) stops.push('#b8b2a0 ' + acc + '% 100%');
    var legend = [['#587c14', 'Altri solidi', sol - sug - fat - pro], ['#d9a44a', 'Zuccheri', sug], ['#c98b5b', 'Grassi', fat], ['#8a9a5b', 'Proteine', pro], ['#7fb2c9', 'Acqua', wat]].filter(function (x) { return x[2] > 0.5; }).map(function (x) { return '<span><i style="background:' + x[0] + '"></i>' + x[1] + ' <b class="mono">' + f1(x[2]) + '%</b></span>'; }).join('') || '<span>Composizione non disponibile</span>';
    var dome = A.tot ? 'linear-gradient(180deg,' + stops.join(',') + ')' : 'linear-gradient(180deg,#587c14 0 9%,#a9c268 9% 56%,#a8122f 56% 74%,#a9c268 74% 82%,#b87a33 82% 100%)';
    var dots = '', hot = D.temps.filter(function (t) { return parseInt(t, 10) >= 60; }).length, cold = D.temps.filter(function (t) { return parseInt(t, 10) <= 10; }).length, nT = D.temps.length || 1;
    var na = Math.round(hot / nT * 30), ng = Math.round((nT - hot - cold) / nT * 30) || (D.temps.length ? 0 : 13);
    for (var i = 0; i < 30; i++) dots += '<i class="' + (i < na ? 'a' : i < na + ng ? 'g' : '') + '"></i>';
    var firstT = D.temps[0] || '', tStep = D.steps.filter(function (s) { return firstT && ckTemp(s) === firstT; })[0] || '';
    var wave = ''; [12, 22, 16, 32, 36, 20, 14, 28, 34, 24, 14, 30, 36, 18, 12, 28, 32, 20, 14, 24].forEach(function (x, k) { wave += '<i style="height:' + x + 'px;animation-delay:' + (k * 0.08) + 's"></i>'; });
    var tabs = [0.5, 1, 2, 4].map(function (d) { return '<button data-d="' + d + '" class="' + (d === XL.dose ? 'on' : '') + '">' + fmtX(d) + '</button>'; }).join('');
    host.innerHTML =
      '<div class="xl-bento">' +
      /* SINISTRA */
      '<div class="xl-col">' +
        '<div class="xl-voice" id="xlVoice"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><strong style="font-size:14px">Sous-Chef AI</strong>' +
        '<span style="display:block;font-size:11px;opacity:.75">Sostituzioni, ricalcoli e tecnica su questa ricetta</span></div>' +
        '<span class="mono" style="font-size:10px;background:rgba(255,255,255,.16);padding:4px 10px;border-radius:999px;white-space:nowrap">' + (aiOk ? 'ATTIVO' : 'SENZA CHIAVE') + '</span></div>' +
        '<div class="xl-wave">' + wave + '</div><div class="xl-reply" id="xlReply">Pronto, Chef. Chiedimi una sostituzione, un ricalcolo o un consiglio su «' + esc(r.n) + '».</div>' +
        '<div class="xl-prompt"><input id="xlAsk" type="text" placeholder="Es: sostituisci la gelatina con agar…" autocomplete="off"><div class="xl-qrow"><div class="xl-q">' +
        '<button data-q="Come sostituisco la gelatina con l\'agar-agar in questa ricetta?">Agar</button><button data-q="Riduci lo zucchero del 10% mantenendo la struttura: cosa cambio?">−10% zucchero</button><button data-q="Riassumi tempi e temperature critiche di questa ricetta.">Tempi e °C</button>' +
        '</div><button class="xl-send" id="xlSend" aria-label="Invia">↑</button></div></div></div>' +
        '<div class="xl-card"><div class="xl-card-top"><span class="xl-label">Scala della dose</span><span class="xl-small">' + (D.P.t || 'Batch') + '</span></div>' +
        '<div class="xl-tabs">' + tabs + '</div><div class="xl-big" id="xlBig">' + fmtG(D.tot * XL.dose) + ' g</div>' +
        '<div class="xl-grad"><i style="left:calc(' + Math.min(100, fat * 1.6) + '% - 2px)"></i></div>' +
        '<div class="xl-row"><span>Grassi totali</span><strong>' + (A.tot ? f1(fat) + '%' : '—') + '</strong></div>' +
        '<div class="xl-inline"><input id="xlTarget" inputmode="decimal" placeholder="Peso finale (g)"><button id="xlTargetGo">Porta a peso</button></div></div>' +
        '<div class="xl-card"><div class="xl-card-top"><span class="xl-label">Curva termica</span><span class="xl-small" style="color:var(--e-warm)">' + (firstT || '—') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="min-width:0"><span class="xl-big" style="font-size:19px">' + (D.temps.length ? D.temps.length + (D.temps.length === 1 ? ' temperatura' : ' temperature') : 'Nessuna °C') + '</span>' +
        '<span style="display:block;font-size:11px;color:var(--smoke2);margin-top:3px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(tStep || (D.steps.length ? 'Nessuna temperatura scritta nel procedimento' : 'Aggiungi il procedimento per vedere le fasi')) + '</span></div>' +
        '<div class="xl-dotm">' + dots + '</div></div>' + (D.temps.length ? '<div class="xl-temps">' + D.temps.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>' : '') + '</div>' +
      '</div>' +
      /* CENTRO: fase in corso + sezione della ricetta (2D) */
      '<div class="xl-hero"><div class="xl-stage xl-flat">' +
        '<div class="xl-sect"><div class="xl-sect-dome" style="background:' + dome + '"></div><div class="xl-sect-plate"></div>' +
        '<div class="xl-sect-leg">' + legend + '</div></div>' +
        '<div class="xl-now" id="xlNow"></div>' +
        '<div class="xl-score" id="xlScore" style="--score:' + misePct(r) + '"><div><strong id="xlScoreV">' + misePct(r) + '%</strong><span>MISE EN PLACE</span></div></div></div>' +
        '<div><div class="xl-ctrls"><button class="xl-cbtn" id="xlPrev" title="Fase precedente">‹</button>' +
        '<div class="xl-prog"><i id="xlProg"></i></div><span class="mono" id="xlPct" style="font-size:11px;font-weight:600;min-width:46px;text-align:right"></span>' +
        '<button class="xl-cbtn" id="xlNext" title="Fase successiva">›</button></div>' +
        '<div class="xl-phases" id="xlPhases" style="--n:' + Math.min(ph.length, 5) + '">' + ph.map(function (p, k) { return '<button class="xl-phase' + (k === XL.phase ? ' on' : '') + '" data-k="' + k + '" title="' + esc(p.text || p.title) + '"><span>' + p.lbl + '</span><strong>' + esc(p.title) + '</strong></button>'; }).join('') + '</div></div>' +
      '</div>' +
      /* DESTRA */
      '<div class="xl-col">' +
        '<div class="xl-card"><div class="xl-card-top"><span class="xl-label">Composizione & peso</span><span class="xl-small xl-muted">' + (A.tot ? Math.round(A.known / A.tot * 100) + '% riconosciuto' : '') + '</span></div>' +
        '<div class="xl-layers"><button class="xl-dome" id="xlDome" style="background:' + dome + '"><span>Sezione</span></button>' +
        '<div style="display:flex;flex-direction:column;gap:8px"><div class="xl-kpi"><span>Peso totale</span><strong id="xlKpiW">' + fmtG(D.tot * XL.dose) + ' g</strong></div>' +
        '<div class="xl-kpi"><span>Zuccheri · Grassi</span><strong>' + (A.tot ? f1(sug) + '% · ' + f1(fat) + '%' : '—') + '</strong></div>' +
        '<div class="xl-kpi"><span>Solidi totali</span><strong>' + (A.tot ? f1(sol) + '%' : '—') + '</strong></div></div></div>' +
        '<button class="xl-cta" id="xlCook"><span>Avvia modalità cucina</span><i>✓</i></button></div>' +
        '<div class="xl-card" style="padding:15px 18px"><div class="xl-card-top" style="margin-bottom:6px"><span class="xl-label">Bilanciamento</span><button class="xl-link" id="xlToFormula">Tabella →</button></div>' +
        '<div class="xl-chem"><div><strong>Zuccheri</strong> <small>' + f1(sug) + '%</small></div><div class="xl-segs">' + segs(sug, 40, P.r && P.r.s) + '</div></div>' +
        '<div class="xl-chem"><div><strong>Grassi</strong> <small>' + f1(fat) + '%</small></div><div class="xl-segs">' + segs(fat, 40, P.r && P.r.f) + '</div></div>' +
        '<div class="xl-chem"><div><strong>Solidi</strong> <small>' + f1(sol) + '%</small></div><div class="xl-segs">' + segs(sol, 80, P.r && P.r.sol) + '</div></div></div>' +
        '<div class="xl-card" style="padding:15px 18px"><div class="xl-card-top" style="margin-bottom:4px"><span class="xl-label">Archivio d\'atelier</span><span class="xl-small xl-muted">' + recs().length + ' ricette</span></div>' +
        '<button class="xl-arch on"><span>' + esc(r.n) + '</span><span class="xl-status">Aperta</span></button>' +
        related.map(function (x, k) { return '<button class="xl-arch" data-rel="' + k + '"><span>' + esc(x.n) + '</span><span class="xl-status">' + esc(r.piatto && x.piatto === r.piatto ? x.piatto : WL.secLabel(x.s)) + '</span></button>'; }).join('') + '</div>' +
      '</div></div>';
    /* eventi */
    [].forEach.call(host.querySelectorAll('.xl-tabs button'), function (b) { b.onclick = function () { XL.setDose(+b.dataset.d); }; });
    $('xlTargetGo').onclick = function () { var n = parseFloat(String($('xlTarget').value).replace(',', '.')); if (!(n > 0) || !D.tot) { $('xlTarget').focus(); return; } XL.setDose(n / D.tot); $('xlTarget').value = ''; };
    $('xlTarget').onkeydown = function (e) { if (e.key === 'Enter') $('xlTargetGo').click(); };
    $('xlCook').onclick = function () { try { openCucina(r, XL.dose); } catch (e) {} };
    $('xlToFormula').onclick = function () { XL.open(r, 'formula'); };
    $('xlDome').onclick = function () { XL.open(r, 'formula'); };
    [].forEach.call(host.querySelectorAll('[data-rel]'), function (b) { b.onclick = function () { XL.open(related[+b.dataset.rel], 'lab'); }; });
    [].forEach.call(host.querySelectorAll('.xl-phase'), function (b) { b.onclick = function () { selectPhase(+b.dataset.k); }; });
    $('xlSend').onclick = function () { ask(); };
    $('xlAsk').onkeydown = function (e) { if (e.key === 'Enter') ask(); };
    [].forEach.call(host.querySelectorAll('.xl-q button'), function (b) { b.onclick = function () { $('xlAsk').value = b.dataset.q; ask(); }; });
    $('xlPrev').onclick = function () { selectPhase(Math.max(0, XL.phase - 1)); };
    $('xlNext').onclick = function () { selectPhase(Math.min(ph.length - 1, XL.phase + 1)); };
    XL._ph = ph;
    selectPhase(XL.phase);
    stagger(host); meters(host);
  }
  function selectPhase(k) {
    var ph = XL._ph; if (!ph || !ph[k]) return;
    XL.phase = k; var p = ph[k];
    [].forEach.call(document.querySelectorAll('.xl-phase'), function (b) { b.classList.toggle('on', +b.dataset.k === k); });
    var now = $('xlNow'); if (!now) return;
    var chips = [p.temp, p.min ? p.min + ' min' : ''].filter(Boolean).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
    now.innerHTML = p.empty
      ? '<small>' + p.lbl + '</small><h3>Nessun procedimento</h3><p>Aggiungi il procedimento dalla modifica della ricetta per vedere le fasi di lavorazione.</p>'
      : '<small>' + p.lbl + ' di ' + ph.length + '</small><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p>' + (chips ? '<div class="xl-now-chips">' + chips + '</div>' : '');
    var pr = $('xlProg'); if (pr) pr.style.width = Math.round((k + 1) / ph.length * 100) + '%';
    var pc = $('xlPct'); if (pc) pc.textContent = (k + 1) + ' / ' + ph.length;
  }

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

  /* ── Produzione: sequenza spuntabile + timer ad anello ── */
  XL.openProd = function () {
    var r = XL.rec ? fresh(XL.rec) : null; if (!r) { XL.toast('Apri prima una ricetta'); return; }
    var old = $('xlProd'); if (old) old.remove();
    var D = data(r), key = 'p:' + String(r._id || r.n), done = XL.weighed[key] || (XL.weighed[key] = {});
    var bg = h('div', 'xl-drawer-bg xl on'); bg.id = 'xlProd';
    var steps = D.steps.map(function (s, i) {
      var t = ckTemp(s), m = ckMinutes(s);
      return '<div class="xl-step' + (done[i] ? ' done' : '') + '" data-i="' + i + '" tabindex="0" role="button"><small>' + (i < 9 ? '0' : '') + (i + 1) + (t ? ' · ' + t : '') + (m ? ' · ' + m + ' MIN' : '') + '</small><p>' + esc(s) + '</p></div>';
    }).join('');
    bg.innerHTML = '<aside class="xl-drawer" role="dialog" aria-label="Modalità produzione"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="min-width:0"><span class="xl-eyebrow" style="margin-bottom:2px">Modalità produzione · ' + fmtX(XL.dose) + '</span>' +
      '<h2 class="fd" style="font-size:28px;font-weight:700;line-height:1.05">' + esc(r.n) + '</h2></div><button class="xl-cbtn ghost" id="xlProdX" aria-label="Chiudi">✕</button></div>' +
      (steps || '<p class="xl-muted" style="font-size:13px">Questa ricetta non ha ancora un procedimento.</p><button class="xl-cta" id="xlProdEdit"><span>Aggiungi il procedimento</span><i>✎</i></button>') +
      '<button class="xl-cta" id="xlProdCook" style="background:var(--e-glass-s);color:var(--ink);border:1px solid var(--cb)"><span>Apri la modalità cucina completa</span><i>→</i></button>' +
      '<div class="xl-timer" id="xlTimer"><div class="xl-timer-l"><svg class="xl-tring" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="19"/><circle class="fg" id="xlTRing" cx="22" cy="22" r="19"/></svg>' +
      '<div><span style="font-size:10.5px;opacity:.78;display:block">TIMER COTTURA / RIPOSO</span><strong class="mono" id="xlTD" style="font-size:26px">00:00</strong>' +
      '<div class="xl-tmin"><button data-m="-1">−1</button><button data-m="1">+1</button><button data-m="5">+5</button></div></div></div>' +
      '<div style="display:flex;gap:8px"><button class="xl-pill" id="xlTGo">Avvia</button><button class="xl-pill" id="xlTRe" aria-label="Azzera">↺</button></div></div></aside>';
    document.body.appendChild(bg);
    var T = { total: 600, left: 600, id: null };
    function cur() { var els = [].slice.call(bg.querySelectorAll('.xl-step')); return els.filter(function (s) { return !s.classList.contains('done'); })[0]; }
    function mark() { var c = cur(); [].forEach.call(bg.querySelectorAll('.xl-step'), function (s) { s.classList.toggle('cur', s === c); }); if (!T.id && c) { var m = ckMinutes(D.steps[+c.dataset.i]); if (m) setT(m * 60); } }
    function setT(s) { T.total = T.left = Math.max(0, s); ui(); }
    function ui() {
      var m = String(Math.floor(T.left / 60)).padStart(2, '0'), s = String(T.left % 60).padStart(2, '0');
      $('xlTD').textContent = m + ':' + s; $('xlTRing').style.strokeDashoffset = 119.4 * (1 - (T.total ? T.left / T.total : 0));
      $('xlTimer').classList.toggle('done', T.total > 0 && T.left === 0);
    }
    function stop() { clearInterval(T.id); T.id = null; $('xlTGo').textContent = 'Avvia'; }
    $('xlTGo').onclick = function () {
      if (T.id) { stop(); return; }
      if (!T.left) { if (!T.total) return; T.left = T.total; }
      this.textContent = 'Pausa';
      T.id = setInterval(function () { if (T.left > 0) { T.left--; ui(); } if (!T.left) { stop(); try { ckBeep(); } catch (e) {} XL.toast('Timer concluso'); } }, 1000);
    };
    $('xlTRe').onclick = function () { stop(); T.left = T.total; ui(); };
    [].forEach.call(bg.querySelectorAll('.xl-tmin button'), function (b) { b.onclick = function () { var v = Math.max(0, T.left + (+b.dataset.m) * 60); if (!T.id) T.total = v; T.left = v; if (T.left > T.total) T.total = T.left; ui(); }; });
    [].forEach.call(bg.querySelectorAll('.xl-step'), function (s, k) {
      s.style.animation = 'xlRise .45s var(--xl-ease) backwards'; s.style.animationDelay = (k * 50) + 'ms';
      var flip = function () { var on = s.classList.toggle('done'); done[+s.dataset.i] = on; mark(); if (on && !cur()) XL.toast('Sequenza completata'); };
      s.onclick = flip; s.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
    });
    var close = function () { stop(); bg.remove(); document.removeEventListener('keydown', esc1); };
    function esc1(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc1);
    $('xlProdX').onclick = close; bg.onclick = function (e) { if (e.target === bg) close(); };
    $('xlProdCook').onclick = function () { close(); try { openCucina(r, XL.dose); } catch (e) {} };
    var ed = $('xlProdEdit'); if (ed) ed.onclick = function () { close(); closeView(); try { openEdit(r); } catch (e) {} };
    setT(600); mark();
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
  function homeSoon() { clearTimeout(homeT); homeT = setTimeout(function () { refreshHome(); if (XL.viewOpen && XL.rec) { var f = fresh(XL.rec); if (f !== XL.rec) { XL.rec = f; renderHead(); } } }, 250); }

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
      WL.renderPanels = function () { var r = _rp.apply(this, arguments); [].forEach.call(document.querySelectorAll('#landPanels .panel'), function (p, i) { p.style.setProperty('--i', i); }); return r; };
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
    buildTop(); refreshTop(); refreshHome();
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
