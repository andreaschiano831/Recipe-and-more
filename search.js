/* ════════════════════════════════════════════════════════════════════
   RICERCA ISTANTANEA — una casella per tutto
   · ricette (nome, piatto, categoria, sezione, ingredienti, note, procedimento)
   · ingredienti raggruppati: «panna» → in quali ricette e quanto
   · libri della biblioteca, sezioni, azioni dell'app, timer attivi
   · senza accenti, in qualsiasi ordine, tollera un errore di battitura
   · comandi: «timer 10», «timer 4 ore abbattitore», «800 g frolla»,
     «×2 cremoso», «cucina cremoso», «stampi cremoso»
   · tastiera: ⌘K / Ctrl+K o «/» per aprire, ↑↓, ↵ apri, ⇧↵ Laboratorio,
     ⌘↵ Cucina, Tab cambia filtro, Esc chiude
   · anteprima a lato (desktop) con le azioni rapide
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%×.,\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function fq(v) { if (v == null || isNaN(v)) return 'q.b.'; var r = Math.round(v * 100) / 100; if (Math.abs(r) >= 100) r = Math.round(r); return String(r).replace('.', ','); }
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
  var IC = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    rec: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
    ing: '<svg viewBox="0 0 24 24"><path d="M12 3c3 3.8 5.5 6.6 5.5 9.8a5.5 5.5 0 0 1-11 0C6.5 9.6 9 6.8 12 3z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H4zM20 5h-6a3 3 0 0 0-3 3"/><path d="M20 5v12.5h-6.5A2.5 2.5 0 0 0 11 20"/></svg>',
    act: '<svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>',
    sec: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/></svg>',
    hist: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>'
  };

  /* ══════════ CONFRONTO ══════════ */
  function lev1(a, b) { /* distanza ≤ 1 (sostituzione, inserimento, cancellazione, scambio) */
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, e = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++e > 1) return false;
      if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; continue; }
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return e + (a.length - i) + (b.length - j) <= 1;
  }
  /* punteggio di un token su un testo già normalizzato (0 = nessun riscontro) */
  function tokScore(t, text, words) {
    if (!text) return 0;
    var p = text.indexOf(t);
    if (p === 0) return 1;
    if (p > 0) return text[p - 1] === ' ' ? 0.9 : 0.6;
    if (t.length >= 4) for (var i = 0; i < words.length; i++) { var w = words[i]; if (lev1(t, w.slice(0, t.length)) || lev1(t, w)) return 0.45; }
    if (t.length >= 3) { /* lettere in sequenza nella stessa parola */
      for (var k = 0; k < words.length; k++) { var ww = words[k], q = 0; for (var c = 0; c < ww.length && q < t.length; c++) if (ww[c] === t[q]) q++; if (q === t.length && ww[0] === t[0]) return 0.3; }
    }
    return 0;
  }
  function field(text, w) { var n = norm(text); return { n: n, w: n.split(' '), wt: w }; }
  function matchAll(tokens, fields) {
    if (!tokens.length) return { s: 0 };
    var total = 0, why = null;
    for (var i = 0; i < tokens.length; i++) {
      var best = 0, bf = null;
      for (var j = 0; j < fields.length; j++) { var f = fields[j], s = tokScore(tokens[i], f.n, f.w) * f.wt; if (s > best) { best = s; bf = f; } }
      if (!best) return null;
      total += best; if (bf && bf.why && (!why || bf.wt < 1)) why = bf.why;
    }
    return { s: total / tokens.length, why: why };
  }
  /* evidenzia nel testo originale le parti trovate */
  function hl(text, tokens) {
    var src = String(text || ''), n = src.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n.length !== src.length) return esc(src);
    var marks = [];
    tokens.forEach(function (t) { var p = n.indexOf(t); if (p > -1) marks.push([p, p + t.length]); });
    if (!marks.length) return esc(src);
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', at = 0;
    marks.forEach(function (m) { if (m[0] < at) return; out += esc(src.slice(at, m[0])) + '<mark>' + esc(src.slice(m[0], m[1])) + '</mark>'; at = m[1]; });
    return out + esc(src.slice(at));
  }

  /* ══════════ INDICE ══════════ */
  var IDX = null;
  function secLabel(k) { try { return WL.secLabel(k); } catch (e) { return k || ''; } }
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }); }
  function books() {
    var b = (window.LIB && LIB.books && LIB.books.length) ? LIB.books : null;
    if (!b) { try { var c = JSON.parse(localStorage.getItem('mdl_lib_cache') || 'null'); b = c && c.books; } catch (e) {} }
    return b || [];
  }
  function build() {
    var R = recs(), ingMap = {};
    var items = R.map(function (r) {
      var ings = r.i || [];
      ings.forEach(function (g) { var k = norm(g[0]); if (!k) return; (ingMap[k] = ingMap[k] || { name: g[0], uses: [] }).uses.push({ r: r, g: g }); });
      var fi = field(ings.map(function (g) { return g[0]; }).join(' · '), 0.7); fi.why = 'ing';
      var fp = field(r.p || '', 0.35); fp.why = 'proc';
      var fn = field(r.nt || '', 0.45); fn.why = 'note';
      return { r: r, f: [field(r.n, 1), field(r.piatto || '', 0.85), field((r.c || '') + ' ' + secLabel(r.s), 0.75), fi, fn, fp] };
    });
    var ingList = Object.keys(ingMap).map(function (k) { var o = ingMap[k]; o.f = [field(o.name, 1)]; return o; });
    IDX = { recs: items, ings: ingList, books: books().map(function (b) { return { b: b, f: [field(b.title, 1), field(b.author || '', 0.7)] }; }) };
  }

  /* ══════════ AZIONI ══════════ */
  function actions() {
    var A = [
      { t: 'Nuova ricetta', k: 'nuova aggiungi crea ricetta', run: function () { if (window.openStudio) openStudio(); else if (window.openModal) openModal(); } },
      { t: 'Importa ricetta con l’AI (foto, testo, documento)', k: 'importa ai foto testo pdf word documento scansiona', run: function () { if (window.openStudio) openStudio(); } },
      { t: 'Home', k: 'home inizio sezioni', run: function () { if (window.XL && XL.viewOpen) XL.close(); tbGoHome(); } },
      { t: 'Tutte le ricette', k: 'tutte ricette collezione elenco', run: function () { if (window.XL && XL.viewOpen) XL.close(); openSection('tutti'); } },
      { t: 'Importa ricette da un backup', k: 'importa backup ripristina altra app json csv paprika mealie tandoor', run: function () { if (window.BK) BK.open(); } },
      { t: 'Biblioteca', k: 'biblioteca libri ebook pdf epub', run: function () { if (window.openLibrary) openLibrary(); } },
      { t: 'Account, logo e sezioni', k: 'impostazioni account logo sezioni brigata membri cambia account animazioni', run: function () { WL.openSettings(); } },
      { t: 'Brigata: invita membri', k: 'brigata membri invita collaboratori commis ruoli', run: function () { WL.openSettings(); setTimeout(function () { var c = $('wlTeamCard'); if (c) c.scrollIntoView({ block: 'start' }); }, 250); } },
      { t: 'Tema e colori', k: 'tema colori aspetto grafica', run: function () { if (window.openThemeSheet) openThemeSheet(); } },
      { t: 'Menu', k: 'menu impostazioni ai chiave groq backup documenti', run: function () { if (window.openDrawer) openDrawer(); } }
    ];
    try { WL.sections().forEach(function (s) { A.push({ t: 'Sezione ' + s.l, k: 'sezione ' + s.l + ' ' + (s.sub || ''), icon: 'sec', run: function () { if (window.XL && XL.viewOpen) XL.close(); openSection(s.k); } }); }); } catch (e) {}
    return A;
  }

  /* ══════════ COMANDI ══════════ */
  function parseCommand(q) {
    var n = norm(q).replace(/,/g, '.'), m;
    if ((m = /^(?:timer|sveglia|conta)\s*(\d+(?:\.\d+)?)?\s*(ore|ora|h|min|minuti|m|sec|secondi|s)?\s*(.*)$/.exec(n))) {
      var v = num(m[1] || 0), u = m[2] || 'min', mins = /^(ore|ora|h)$/.test(u) ? v * 60 : /^(sec|secondi|s)$/.test(u) ? v / 60 : v;
      var label = (q.replace(/^\s*\S+\s*[\d.,]*\s*(ore|ora|h|minuti|min|m|secondi|sec|s)?\b/i, '').trim()) || '';
      return { kind: 'timer', min: mins, label: label };
    }
    if ((m = /^(\d+(?:\.\d+)?)\s*(kg|g|gr)\s+(.+)$/.exec(n))) return { kind: 'weight', g: num(m[1]) * (m[2] === 'kg' ? 1000 : 1), q: m[3] };
    if ((m = /^[x×]\s*(\d+(?:\.\d+)?)\s+(.+)$/.exec(n)) || (m = /^(\d+(?:\.\d+)?)\s*[x×]\s+(.+)$/.exec(n))) return { kind: 'dose', d: num(m[1]), q: m[2] };
    if ((m = /^(.+?)\s+[x×]\s*(\d+(?:\.\d+)?)$/.exec(n))) return { kind: 'dose', d: num(m[2]), q: m[1] };
    if ((m = /^(cucina|cucinare|cuoci|produci)\s+(.+)$/.exec(n))) return { kind: 'cook', q: m[2] };
    if ((m = /^(stampi|stampo|placca|teglia|gastronorm|gn)\s+(.+)$/.exec(n))) return { kind: 'molds', q: m[2] };
    if ((m = /^(lab|laboratorio)\s+(.+)$/.exec(n))) return { kind: 'lab', q: m[2] };
    return null;
  }
  function totOf(r) { try { return rcAnalyze(r.i || []).tot; } catch (e) { return 0; } }

  /* ══════════ RICERCA ══════════ */
  var S = { open: false, q: '', filter: 'all', drill: null, items: [], sel: 0 };
  var FILTERS = [['all', 'Tutto'], ['rec', 'Ricette'], ['ing', 'Ingredienti'], ['book', 'Libri'], ['act', 'Azioni']];
  function recent() { try { return JSON.parse(localStorage.getItem('sx_recent') || '[]'); } catch (e) { return []; } }
  function pushRecent(r) { var a = recent().filter(function (x) { return x !== r.n; }); a.unshift(r.n); try { localStorage.setItem('sx_recent', JSON.stringify(a.slice(0, 8))); } catch (e) {} }
  function findRec(q) { var t = norm(q).split(' ').filter(Boolean), best = null; IDX.recs.forEach(function (x) { var m = matchAll(t, x.f.slice(0, 3)); if (m && (!best || m.s > best.s)) best = { r: x.r, s: m.s }; }); return best && best.r; }

  function search() {
    if (!IDX) build();
    var q = S.q.trim(), tokens = norm(q).split(' ').filter(function (t) { return t.length; }), out = [];
    /* scheda di un ingrediente */
    if (S.drill) {
      var ing = S.drill, list = ing.uses.slice().sort(function (a, b) { return (b.g[1] || 0) - (a.g[1] || 0); });
      list.forEach(function (u) { if (!tokens.length || matchAll(tokens, [field(u.r.n, 1)])) out.push({ type: 'rec', r: u.r, sub: ing.name + ' ' + fq(u.g[1]) + ' ' + (u.g[2] || 'g') + ' · ' + secLabel(u.r.s), s: 1 }); });
      return out;
    }
    /* comandi */
    var cmd = q ? parseCommand(q) : null;
    if (cmd) {
      if (cmd.kind === 'timer' && cmd.min > 0) out.push({ type: 'cmd', icon: 'clock', t: 'Avvia un timer di ' + mins(cmd.min) + (cmd.label ? ' «' + cmd.label + '»' : ''), run: function () { XL.timers.add({ label: cmd.label || ('Timer ' + mins(cmd.min)), min: cmd.min }); } });
      else if (cmd.q) {
        var r = findRec(cmd.q);
        if (r) {
          var tot = totOf(r);
          if (cmd.kind === 'weight' && tot) out.push({ type: 'cmd', icon: 'act', t: 'Apri «' + r.n + '» a ' + fq(cmd.g) + ' g nel Laboratorio', sub: 'dose ×' + fq(cmd.g / tot), run: function () { XL.open(r, 'lab'); XL.setDose(cmd.g / tot, true); } });
          if (cmd.kind === 'dose' && cmd.d > 0) out.push({ type: 'cmd', icon: 'act', t: 'Apri «' + r.n + '» a ×' + fq(cmd.d) + ' nel Laboratorio', sub: tot ? fq(tot * cmd.d) + ' g totali' : '', run: function () { XL.open(r, 'lab'); XL.setDose(cmd.d, true); } });
          if (cmd.kind === 'cook') out.push({ type: 'cmd', icon: 'act', t: 'Modalità cucina: ' + r.n, run: function () { openCucina(r); } });
          if (cmd.kind === 'molds') out.push({ type: 'cmd', icon: 'act', t: 'Stampi e placche: ' + r.n, run: function () { XL.open(r, 'molds'); } });
          if (cmd.kind === 'lab') out.push({ type: 'cmd', icon: 'act', t: 'Laboratorio: ' + r.n, run: function () { XL.open(r, 'lab'); } });
        }
      }
    }
    var f = S.filter;
    if (!tokens.length) {
      /* vuoto: timer attivi, recenti, azioni utili */
      try { XL.timers.list().forEach(function (t) { out.push({ type: 'timer', t: t }); }); } catch (e) {}
      var rc = recent(), R = recs();
      if (f === 'all' || f === 'rec') rc.forEach(function (n) { var r = R.filter(function (x) { return x.n === n; })[0]; if (r) out.push({ type: 'rec', r: r, recent: true, sub: [secLabel(r.s), r.c].filter(Boolean).join(' · ') }); });
      if (f === 'rec' && !rc.length) R.slice(-12).reverse().forEach(function (r) { out.push({ type: 'rec', r: r, sub: [secLabel(r.s), r.c].filter(Boolean).join(' · ') }); });
      if (f === 'all' || f === 'act') actions().slice(0, f === 'act' ? 99 : 5).forEach(function (a) { out.push({ type: 'act', a: a }); });
      if (f === 'ing') IDX.ings.slice().sort(function (a, b) { return b.uses.length - a.uses.length; }).slice(0, 30).forEach(function (o) { out.push({ type: 'ing', o: o }); });
      if (f === 'book') IDX.books.forEach(function (x) { out.push({ type: 'book', b: x.b }); });
      return out;
    }
    var res = [];
    if (f === 'all' || f === 'rec') IDX.recs.forEach(function (x) {
      var m = matchAll(tokens, x.f); if (!m) return;
      var r = x.r, sub = [secLabel(r.s), r.c, r.piatto].filter(Boolean).join(' · ');
      if (m.why === 'ing') { var hit = (r.i || []).filter(function (g) { var n = norm(g[0]); return tokens.some(function (t) { return n.indexOf(t) > -1; }); })[0]; if (hit) sub = 'contiene ' + hit[0] + ' ' + fq(hit[1]) + ' ' + (hit[2] || 'g'); }
      else if (m.why === 'proc' || m.why === 'note') { var src = m.why === 'proc' ? r.p : r.nt, nn = norm(src), p = nn.indexOf(tokens[0]); if (p > -1) { var a = Math.max(0, p - 28); sub = (m.why === 'note' ? 'nota: ' : '') + (a ? '…' : '') + String(src).slice(a, p + 60).replace(/\s+/g, ' ') + '…'; } }
      res.push({ type: 'rec', r: r, s: m.s + (recent().indexOf(r.n) > -1 ? 0.05 : 0), sub: sub });
    });
    if (f === 'all' || f === 'ing') IDX.ings.forEach(function (o) { var m = matchAll(tokens, o.f); if (m) res.push({ type: 'ing', o: o, s: m.s * 0.92 + Math.min(0.06, o.uses.length / 100) }); });
    if (f === 'all' || f === 'book') IDX.books.forEach(function (x) { var m = matchAll(tokens, x.f); if (m) res.push({ type: 'book', b: x.b, s: m.s * 0.9 }); });
    if (f === 'all' || f === 'act') actions().forEach(function (a) { var m = matchAll(tokens, [field(a.t, 1), field(a.k, 0.8)]); if (m) res.push({ type: 'act', a: a, s: m.s * 0.85 }); });
    res.sort(function (a, b) { return b.s - a.s; });
    /* in «Tutto» al massimo 8 per tipo, per vedere un po' di tutto */
    if (f === 'all') { var cnt = {}; res = res.filter(function (x) { cnt[x.type] = (cnt[x.type] || 0) + 1; return cnt[x.type] <= 8; }); }
    return out.concat(res.slice(0, 60));
  }
  function mins(m) { if (m >= 60) { var h = Math.floor(m / 60), r = Math.round(m % 60); return h + (h === 1 ? ' ora' : ' ore') + (r ? ' ' + r + ' min' : ''); } if (m < 1) return Math.round(m * 60) + ' s'; return fq(m) + ' min'; }

  /* ══════════ INTERFACCIA ══════════ */
  function ui() {
    var el = $('sx'); if (el) return el;
    el = document.createElement('div'); el.id = 'sx'; el.className = 'sx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Cerca');
    el.innerHTML = '<div class="sx-panel"><div class="sx-top">' + IC.search +
      '<span class="sx-drill" id="sxDrill" hidden></span><input id="sxIn" type="text" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Cerca ricette, ingredienti, libri… o scrivi «timer 10», «800 g frolla»" role="combobox" aria-expanded="true" aria-controls="sxList">' +
      '<button type="button" class="sx-x" id="sxX" aria-label="Chiudi">Esc</button></div>' +
      '<div class="sx-f" id="sxF" role="tablist">' + FILTERS.map(function (x) { return '<button type="button" role="tab" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="sx-body"><div class="sx-list" id="sxList" role="listbox"><i class="sx-hl" id="sxHl"></i><div id="sxRows"></div></div><aside class="sx-prev" id="sxPrev"></aside></div>' +
      '<div class="sx-foot"><span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>↵</kbd> apri</span><span><kbd>⇧</kbd><kbd>↵</kbd> Laboratorio</span><span><kbd>⌘</kbd><kbd>↵</kbd> Cucina</span><span><kbd>Tab</kbd> filtro</span></div></div>';
    document.body.appendChild(el);
    el.addEventListener('mousedown', function (e) { if (e.target === el) close(); });
    $('sxX').onclick = close;
    var inp = $('sxIn');
    inp.addEventListener('input', function () { S.q = inp.value; S.sel = 0; draw(); });
    inp.addEventListener('keydown', key);
    [].forEach.call(el.querySelectorAll('#sxF button'), function (b) { b.onclick = function () { setFilter(b.dataset.f); inp.focus(); }; });
    $('sxRows').addEventListener('mousemove', function (e) { var row = e.target.closest('.sx-row'); if (row && +row.dataset.i !== S.sel) { S.sel = +row.dataset.i; mark(); } });
    $('sxRows').addEventListener('click', function (e) {
      var b = e.target.closest('[data-do]'), row = e.target.closest('.sx-row'); if (!row) return;
      S.sel = +row.dataset.i; go(b ? b.dataset.do : 'open');
    });
    $('sxPrev').addEventListener('click', function (e) { var b = e.target.closest('[data-do]'); if (b) go(b.dataset.do); });
    return el;
  }
  function setFilter(f) { S.filter = f; S.sel = 0; [].forEach.call(document.querySelectorAll('#sxF button'), function (b) { b.classList.toggle('on', b.dataset.f === f); b.setAttribute('aria-selected', String(b.dataset.f === f)); }); draw(); }
  var GROUP = { cmd: 'Comando', timer: 'Timer attivi', rec: 'Ricette', ing: 'Ingredienti', book: 'Libri', act: 'Azioni' };
  function draw() {
    S.items = search();
    var rows = $('sxRows'), html = '', lastG = '';
    S.items.forEach(function (it, i) {
      var g = it.type === 'rec' && it.recent ? 'Aperte di recente' : GROUP[it.type];
      if (g !== lastG) { html += '<div class="sx-g">' + g + '</div>'; lastG = g; }
      html += row(it, i);
    });
    if (!S.items.length) html = '<div class="sx-empty"><b>Nessun risultato per «' + esc(S.q) + '»</b><span>Prova con un ingrediente, una parte del procedimento o un comando come «timer 10».</span></div>';
    rows.innerHTML = html;
    if (S.sel >= S.items.length) S.sel = Math.max(0, S.items.length - 1);
    mark(true);
  }
  function tokens() { return norm(S.q).split(' ').filter(Boolean); }
  function row(it, i) {
    var T = tokens(), ic, t, sub = '', side = '';
    if (it.type === 'rec') { ic = IC.rec; t = hl(it.r.n, T); sub = esc(it.sub || ''); side = '<span class="sx-acts"><button type="button" data-do="lab" title="Laboratorio (⇧↵)">Lab</button><button type="button" data-do="cook" title="Cucina (⌘↵)">Cucina</button></span>'; }
    else if (it.type === 'ing') { ic = IC.ing; t = hl(it.o.name, T); sub = 'in ' + it.o.uses.length + (it.o.uses.length === 1 ? ' ricetta' : ' ricette'); side = '<span class="sx-go">›</span>'; }
    else if (it.type === 'book') { ic = IC.book; t = hl(it.b.title, T); sub = esc([it.b.author, String(it.b.kind || '').toUpperCase()].filter(Boolean).join(' · ')); }
    else if (it.type === 'act') { ic = IC[it.a.icon || 'act']; t = hl(it.a.t, T); }
    else if (it.type === 'cmd') { ic = IC[it.icon || 'act']; t = esc(it.t); sub = esc(it.sub || ''); side = '<kbd class="sx-k">↵</kbd>'; }
    else if (it.type === 'timer') { ic = IC.clock; var L = XL.timers.left(it.t); t = esc(it.t.label); sub = it.t.rang ? 'Finito' : XL.timers.fmt(L) + (it.t.end ? '' : ' · in pausa'); }
    return '<div class="sx-row sx-' + it.type + '" role="option" data-i="' + i + '" id="sxo' + i + '"><span class="sx-ic">' + ic + '</span><span class="sx-t"><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + side + '</div>';
  }
  function mark(instant) {
    var rows = document.querySelectorAll('#sxRows .sx-row'), hlb = $('sxHl'), list = $('sxList');
    [].forEach.call(rows, function (r) { var on = +r.dataset.i === S.sel; r.classList.toggle('on', on); r.setAttribute('aria-selected', String(on)); });
    var cur = rows[S.sel];
    $('sxIn').setAttribute('aria-activedescendant', cur ? cur.id : '');
    if (!cur) { hlb.style.opacity = '0'; preview(null); return; }
    var top = cur.offsetTop, h = cur.offsetHeight;
    if (instant) hlb.style.transition = 'none';
    hlb.style.opacity = '1'; hlb.style.transform = 'translateY(' + top + 'px)'; hlb.style.height = h + 'px';
    if (instant) { void hlb.offsetWidth; hlb.style.transition = ''; }
    if (top < list.scrollTop + 30) list.scrollTop = Math.max(0, top - 30);
    else if (top + h > list.scrollTop + list.clientHeight - 8) list.scrollTop = top + h - list.clientHeight + 8;
    preview(S.items[S.sel]);
  }
  var pvT = null;
  function preview(it) {
    var p = $('sxPrev'); if (!p) return;
    clearTimeout(pvT);
    pvT = setTimeout(function () {
      if (!it) { p.innerHTML = '<div class="sx-pv-empty">' + IC.search + '<span>Scrivi per cercare in ricette, ingredienti, note, procedimenti e libri.</span></div>'; return; }
      var html = '';
      if (it.type === 'rec') {
        var r = it.r, tot = totOf(r);
        html = '<span class="sx-pv-k">' + esc([secLabel(r.s), r.c].filter(Boolean).join(' · ')) + '</span><h3>' + esc(r.n) + '</h3>' + (r.piatto ? '<p class="sx-pv-s">' + esc(r.piatto) + '</p>' : '') +
          '<div class="sx-pv-ings">' + (r.i || []).slice(0, 14).map(function (g) { var on = tokens().some(function (t) { return norm(g[0]).indexOf(t) > -1; }); return '<div' + (on ? ' class="on"' : '') + '><span>' + esc(g[0]) + '</span><b>' + fq(g[1]) + ' ' + esc(g[2] || 'g') + '</b></div>'; }).join('') + ((r.i || []).length > 14 ? '<div class="more">+ ' + ((r.i || []).length - 14) + ' ingredienti</div>' : '') + '</div>' +
          (tot ? '<p class="sx-pv-tot">Totale ' + fq(tot) + ' g' + (r.p ? ' · ' + (String(r.p).split(/\n+/).filter(Boolean).length) + ' passaggi' : '') + '</p>' : '') +
          (r.nt ? '<p class="sx-pv-note">' + esc(String(r.nt).slice(0, 220)) + (String(r.nt).length > 220 ? '…' : '') + '</p>' : '') +
          '<div class="sx-pv-a"><button type="button" class="sx-b dark" data-do="open">Apri la scheda</button><button type="button" class="sx-b" data-do="lab">Laboratorio</button><button type="button" class="sx-b" data-do="cook">Cucina</button><button type="button" class="sx-b" data-do="molds">Stampi</button></div>';
      } else if (it.type === 'ing') {
        var o = it.o, uses = o.uses.slice().sort(function (a, b) { return (b.g[1] || 0) - (a.g[1] || 0); });
        html = '<span class="sx-pv-k">Ingrediente</span><h3>' + esc(o.name) + '</h3><p class="sx-pv-s">Usato in ' + uses.length + (uses.length === 1 ? ' ricetta' : ' ricette') + '</p>' +
          '<div class="sx-pv-ings">' + uses.slice(0, 12).map(function (u) { return '<div><span>' + esc(u.r.n) + '</span><b>' + fq(u.g[1]) + ' ' + esc(u.g[2] || 'g') + '</b></div>'; }).join('') + '</div>' +
          '<div class="sx-pv-a"><button type="button" class="sx-b dark" data-do="open">Mostra le ricette</button></div>';
      } else if (it.type === 'book') {
        var b = it.b, pr = window.LIB && LIB.progress && LIB.progress[b.id];
        html = '<span class="sx-pv-k">Libro · ' + esc(String(b.kind || '').toUpperCase()) + '</span><h3>' + esc(b.title) + '</h3>' + (b.author ? '<p class="sx-pv-s">' + esc(b.author) + '</p>' : '') +
          (pr ? '<div class="sx-pv-bar"><i style="width:' + Math.round((pr.percent || 0) * 100) + '%"></i></div><p class="sx-pv-tot">Letto al ' + Math.round((pr.percent || 0) * 100) + '%</p>' : '') +
          '<div class="sx-pv-a"><button type="button" class="sx-b dark" data-do="open">Apri il libro</button></div>';
      } else if (it.type === 'cmd' || it.type === 'act') {
        html = '<span class="sx-pv-k">' + (it.type === 'cmd' ? 'Comando' : 'Azione') + '</span><h3>' + esc(it.t || it.a.t) + '</h3>' + (it.sub ? '<p class="sx-pv-s">' + esc(it.sub) + '</p>' : '') + '<div class="sx-pv-a"><button type="button" class="sx-b dark" data-do="open">Esegui</button></div>';
      } else if (it.type === 'timer') {
        html = '<span class="sx-pv-k">Timer</span><h3>' + esc(it.t.label) + '</h3><p class="sx-pv-s">' + (it.t.sub ? esc(it.t.sub) : '') + '</p>';
      }
      p.innerHTML = '<div class="sx-pv">' + html + '</div>';
    }, 40);
  }
  function key(e) {
    var n = S.items.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) { S.sel = (S.sel + 1) % n; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) { S.sel = (S.sel - 1 + n) % n; mark(); } }
    else if (e.key === 'Enter') { e.preventDefault(); go(e.metaKey || e.ctrlKey ? 'cook' : e.shiftKey ? 'lab' : 'open'); }
    else if (e.key === 'Tab') { e.preventDefault(); var i = FILTERS.map(function (x) { return x[0]; }).indexOf(S.filter); setFilter(FILTERS[(i + (e.shiftKey ? FILTERS.length - 1 : 1)) % FILTERS.length][0]); }
    else if (e.key === 'Escape') { e.preventDefault(); if (S.drill) undrill(); else if (S.q) { S.q = ''; $('sxIn').value = ''; draw(); } else close(); }
    else if (e.key === 'Backspace' && !$('sxIn').value && S.drill) { e.preventDefault(); undrill(); }
  }
  function drill(o) { S.drill = o; S.q = ''; $('sxIn').value = ''; var d = $('sxDrill'); d.hidden = false; d.innerHTML = IC.ing + esc(o.name) + '<button type="button" aria-label="Togli">×</button>'; d.querySelector('button').onclick = function () { undrill(); $('sxIn').focus(); }; $('sxIn').placeholder = 'Filtra le ricette con ' + o.name + '…'; S.sel = 0; draw(); }
  function undrill() { S.drill = null; $('sxDrill').hidden = true; $('sxIn').placeholder = 'Cerca ricette, ingredienti, libri… o scrivi «timer 10», «800 g frolla»'; S.sel = 0; draw(); }
  function go(how) {
    var it = S.items[S.sel]; if (!it) return;
    if (it.type === 'ing') { drill(it.o); return; }
    if (it.type === 'timer') return;
    close(true);
    setTimeout(function () {
      if (it.type === 'rec') {
        var r = it.r; pushRecent(r);
        if (how === 'lab') XL.open(r, 'lab');
        else if (how === 'cook') openCucina(r);
        else if (how === 'molds') XL.open(r, 'molds');
        else { if (window.XL && XL.viewOpen) XL.close(); openRecipePanel(r); }
      } else if (it.type === 'book') {
        var b = it.b; if (window.openLibrary) openLibrary(); setTimeout(function () { try { libOpenReader(b); } catch (e) {} }, 350);
      } else if (it.type === 'act') it.a.run();
      else if (it.type === 'cmd') it.run();
    }, 30);
  }
  var lastFocus = null;
  function open(q) {
    if (!window.WL || !WL.signedIn || !WL.signedIn()) return;
    var el = ui(); build();
    lastFocus = document.activeElement;
    S.open = true; S.sel = 0; S.drill = null; $('sxDrill').hidden = true;
    S.q = q || ''; $('sxIn').value = S.q;
    setFilter(S.filter || 'all');
    el.classList.add('on'); document.body.classList.add('sx-open');
    setTimeout(function () { $('sxIn').focus(); $('sxIn').select(); }, 20);
  }
  function close(keepFocus) {
    var el = $('sx'); if (!el || !S.open) return;
    S.open = false; el.classList.remove('on'); document.body.classList.remove('sx-open');
    if (!keepFocus && lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  window.SX = { open: open, close: close, search: function (q, f) { S.q = q; S.filter = f || 'all'; S.drill = null; build(); return search(); }, parse: parseCommand, norm: norm };

  /* scorciatoie */
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); if (S.open) close(); else open(); return; }
    if (S.open) return;
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (e.key === '/' && !typing && !document.querySelector('#kc.on')) { e.preventDefault(); open(); }
  });

  /* punti d'accesso: Home, Collezione, Laboratorio */
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  function entry() {
    var land = $('landing');
    if (land && !$('sxHome')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'sxHome'; b.className = 'sx-entry';
      b.innerHTML = IC.search + '<span>Cerca ricette, ingredienti, libri…</span><kbd>' + (isMac ? '⌘' : 'Ctrl') + ' K</kbd>';
      b.onclick = function () { open(); };
      var panels = $('landPanels'); if (panels && panels.parentNode) panels.parentNode.insertBefore(b, panels); else land.appendChild(b);
    }
    var srch = $('srch');
    if (srch && !$('sxAll')) {
      var a = document.createElement('button'); a.type = 'button'; a.id = 'sxAll'; a.className = 'sx-mini'; a.title = 'Cerca ovunque (' + (isMac ? '⌘' : 'Ctrl') + ' K)'; a.setAttribute('aria-label', 'Cerca ovunque');
      a.innerHTML = IC.search + '<span>Ovunque</span>';
      a.onclick = function () { open(srch.value); };
      srch.parentNode.appendChild(a);
    }
  }
  if (typeof window.boot === 'function') { var _b = window.boot; window.boot = function () { var r = _b.apply(this, arguments); try { entry(); } catch (e) {} return r; }; }
  if (document.readyState !== 'loading') setTimeout(entry, 0); else document.addEventListener('DOMContentLoaded', entry);
  /* l'indice si aggiorna quando cambiano le ricette */
  if (typeof window.persistLocal === 'function') { var _pl = window.persistLocal; window.persistLocal = function () { var r = _pl.apply(this, arguments); IDX = null; if (S.open) draw(); return r; }; }
})();
