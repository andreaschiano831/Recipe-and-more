/* menu.js — Menù e degustazioni.
   Un menù è una sequenza di portate; ogni portata è fatta di ricette con i grammi per coperto
   (se il piatto ha già una «Sezione», i grammi a pezzo arrivano da lì). Con i coperti calcola quanto
   produrre di ogni ricetta e la dose, le mette in ordine di lavoro (giorno prima, mattina, servizio),
   apre la lista della spesa e stampa menù e piano di produzione in PDF.
   I menù sono condivisi con la brigata: stanno nella tabella delle ricette come righe di configurazione
   («_cfg: 'menu'»), quindi niente tabelle nuove; restano anche sul dispositivo per lavorare senza rete. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function it(n, d) { var p = Math.pow(10, d || 0); return (Math.round(n * p) / p).toLocaleString('it-IT'); }
  function gfmt(g) { return g >= 1000 ? it(g / 1000, 2) + ' kg' : it(g, g < 20 ? 1 : 0) + ' g'; }
  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }); }
  function recBy(n) { return recs().filter(function (r) { return r.n === n; })[0] || null; }
  function canEdit() { return !(window.WL && WL.canEdit) || WL.canEdit(); }
  function toast(t) { try { if (window.XL && XL.toast) return XL.toast(t); } catch (e) {} try { showToast(t); } catch (e) {} }
  function totOf(r) { try { return rcAnalyze(r.i || []).tot; } catch (e) { return 0; } }
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11"/><path d="M17 21V3c-2 1.5-3 4-3 7s1 4 3 4"/></svg>';
  var WHEN = [['d1', 'Il giorno prima'], ['am', 'La mattina'], ['srv', 'Al servizio']];
  var COURSES = ['Benvenuto', 'Pre-dessert', 'Dessert', 'Piccola pasticceria', 'Antipasto', 'Primo', 'Secondo', 'Formaggi'];

  /* ── archivio: righe «_cfg: 'menu'» della tabella ricette + copia sul dispositivo ── */
  var M = { list: [], open: null, view: 'list', tab: 'portate', dirty: {} };
  function ckey() { return 'mn_cache:' + ((window.WL && WL.ws) || 'local'); }
  function cacheSave() { try { localStorage.setItem(ckey(), JSON.stringify({ list: M.list, dirty: M.dirty })); } catch (e) {} }
  function cacheLoad() { try { var c = JSON.parse(localStorage.getItem(ckey()) || 'null'); if (c) { M.list = c.list || []; M.dirty = c.dirty || {}; } } catch (e) {} }
  cacheLoad();
  function onRows(rows) {
    var srv = (rows || []).filter(function (row) { return row && row.data && row.data._cfg === 'menu'; }).map(function (row) { var d = row.data; d._row = row.id; return d; });
    var byId = {}; srv.forEach(function (d) { byId[d.id] = d; });
    M.list.forEach(function (d) { if (M.dirty[d.id] && (!byId[d.id] || String(byId[d.id].at || '') <= String(d.at || ''))) { if (byId[d.id]) d._row = byId[d.id]._row; byId[d.id] = d; } });
    M.list = Object.keys(byId).map(function (k) { return byId[k]; }).filter(function (d) { return !d._del; });
    cacheSave(); flush();
    if ($('mnBg') && M.view === 'list') paint();
  }
  function sbOk() { return typeof SB_URL !== 'undefined' && SB_URL && typeof sbH === 'function' && window.WL && WL.ws && navigator.onLine !== false; }
  var flushing = false;
  function flush() {
    if (flushing || !sbOk()) return;
    var ids = Object.keys(M.dirty); if (!ids.length) return;
    flushing = true;
    var id = ids[0], d = M.list.filter(function (x) { return x.id === id; })[0] || M.dirty[id].del;
    var done = function (ok) { flushing = false; if (ok) { delete M.dirty[id]; cacheSave(); setTimeout(flush, 50); } };
    if (!d) return done(true);
    var H = Object.assign({}, sbH(), { 'Prefer': 'return=representation' }), base = SB_URL + '/rest/v1/ricette';
    if (M.dirty[id].del) {
      if (!M.dirty[id].del._row) return done(true);
      return fetch(base + '?id=eq.' + M.dirty[id].del._row, { method: 'DELETE', headers: H }).then(function (r) { done(r.ok || r.status === 404); }).catch(function () { done(false); });
    }
    var data = JSON.parse(JSON.stringify(d)); delete data._row; data._cfg = 'menu';
    var row = { user_id: WL.ws, data: data };
    fetch(base + (d._row ? '?id=eq.' + d._row : ''), { method: d._row ? 'PATCH' : 'POST', headers: H, body: JSON.stringify(row) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) { if (rows && rows[0] && rows[0].id != null) d._row = rows[0].id; done(true); })
      .catch(function () { done(false); });
  }
  window.addEventListener('online', function () { setTimeout(flush, 800); });
  var saveT = null;
  function touch(m) { m.at = new Date().toISOString(); M.dirty[m.id] = M.dirty[m.id] && M.dirty[m.id].del ? M.dirty[m.id] : { at: m.at }; cacheSave(); clearTimeout(saveT); saveT = setTimeout(flush, 700); }
  function remove(m) { M.list = M.list.filter(function (x) { return x !== m; }); M.dirty[m.id] = { del: { _row: m._row } }; cacheSave(); flush(); }

  /* ── calcoli ── */
  function lines(m) {
    var by = {}, order = [];
    (m.portate || []).forEach(function (p) {
      (p.items || []).forEach(function (x) {
        var g = num(x.g); if (!x.n) return;
        if (!by[x.n]) { by[x.n] = { n: x.n, g: 0, in: [] }; order.push(x.n); }
        by[x.n].g += g; if (by[x.n].in.indexOf(p.t) < 0) by[x.n].in.push(p.t);
      });
    });
    var cov = Math.max(0, Math.round(num(m.cov))), k = 1 + Math.max(0, Math.min(50, num(m.waste))) / 100;
    return order.map(function (n) {
      var L = by[n], r = recBy(n), tot = r ? totOf(r) : 0, need = L.g * cov * k;
      return { n: n, r: r, gp: L.g, need: need, tot: tot, dose: tot ? need / tot : 0, in: L.in, when: (m.when && m.when[n]) || guessWhen(r) };
    });
  }
  function guessWhen(r) {
    if (!r) return 'am';
    var t = (String(r.n) + ' ' + String(r.c || '') + ' ' + String(r.p || '')).toLowerCase(), I = null; try { I = FD.info(r); } catch (e) {}
    var tech = I ? I.tech : [];
    if (/chantilly|montare al momento|al momento|espresso|fritt|frigg|zabaion|souffl|tuile|spuma/.test(t) || tech.indexOf('friggere') >= 0) return 'srv';
    if (/ganache|mousse|bavares|semifredd|gel[ée]e|inserto|glassa|specchio|gelato|sorbett|lievit|riposo.*notte|tutta la notte|12 ore|24 ore/.test(t) || tech.indexOf('abbattere') >= 0 || tech.indexOf('gelificare') >= 0 || tech.indexOf('lievitare') >= 0 || tech.indexOf('mantecare') >= 0) return 'd1';
    return 'am';
  }
  function perCover(n, piatto) {
    try {
      var s = JSON.parse(localStorage.getItem('sez:' + String(piatto || '').trim().toLowerCase()) || 'null'); if (!s || !window.SEZ) return null;
      var r = recBy(n); if (!r) return null;
      var was = SEZ.calcFor ? SEZ.calcFor(r) : null; /* calcolo della sezione salvata, a pezzo */
      if (was) { var row = was.rows.filter(function (x) { return x.x.n === n; })[0]; if (row && was.n) return Math.round(row.g / was.n); }
    } catch (e) {}
    return null;
  }

  /* ── interfaccia ── */
  function open(id) {
    var old = $('mnBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'mnBg'; bg.className = 'scl-bg';
    bg.innerHTML = '<div class="scl-sheet mn-sheet" role="dialog" aria-modal="true" aria-labelledby="mnT"><span class="scl-grab"></span><div id="mnIn"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick); bg.addEventListener('input', onInput); bg.addEventListener('change', onChange);
    M.view = 'list'; M.open = null;
    if (id) { var m = M.list.filter(function (x) { return x.id === id; })[0]; if (m) { M.open = m; M.view = 'edit'; M.tab = 'portate'; } }
    try { if (window._cfgRows) onRows(window._cfgRows); } catch (e) {}
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('mnBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'mnOut'; setTimeout(function () { bg.remove(); }, 240); flush(); }
  function when(m) { if (!m.d) return ''; try { return new Date(m.d + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }); } catch (e) { return m.d; } }
  function paint() {
    var box = $('mnIn'); if (!box) return;
    var sh = box.parentNode, y = sh.scrollTop;
    box.innerHTML = M.view === 'edit' && M.open ? paintEdit(M.open) : paintList();
    sh.scrollTop = y;
  }
  function paintList() {
    var L = M.list.slice().sort(function (a, b) { return String(b.d || b.at || '').localeCompare(String(a.d || a.at || '')); });
    return '<header class="scl-hd"><div><span class="scl-k">Menù e degustazioni</span><h3 id="mnT">I tuoi menù</h3></div><button type="button" class="scl-x" data-x aria-label="Chiudi">×</button></header>' +
      '<p class="scl-lead">Componi le portate con le ricette e i grammi per coperto: per i coperti della serata ottieni quanto produrre, in che ordine, la spesa e il PDF per la brigata.</p>' +
      (canEdit() ? '<button type="button" class="mn-new" data-new>+ Nuovo menù</button>' : '') +
      (L.length ? '<div class="mn-list">' + L.map(function (m) {
        var P = m.portate || [], n = P.reduce(function (a, p) { return a + (p.items || []).length; }, 0);
        return '<button type="button" class="mn-card" data-open="' + esc(m.id) + '"><span class="mn-cd">' + (m.d ? '<b>' + esc(new Date(m.d + 'T12:00').getDate()) + '</b><small>' + esc(new Date(m.d + 'T12:00').toLocaleDateString('it-IT', { month: 'short' })) + '</small>' : ICON) + '</span>' +
          '<span class="mn-cb"><b>' + esc(m.n || 'Menù senza nome') + '</b><small>' + esc([P.length + (P.length === 1 ? ' portata' : ' portate'), n + (n === 1 ? ' ricetta' : ' ricette'), num(m.cov) ? num(m.cov) + ' coperti' : ''].filter(Boolean).join(' · ')) + '</small>' +
          (P.length ? '<em>' + esc(P.map(function (p) { return p.t; }).filter(Boolean).join(' → ')) + '</em>' : '') + '</span><span class="mn-go">›</span></button>';
      }).join('') + '</div>' : '<p class="mn-empty">Nessun menù ancora.</p>');
  }
  function paintEdit(m) {
    var ed = canEdit(), dis = ed ? '' : ' disabled';
    var h = '<header class="scl-hd"><div class="mn-hl"><button type="button" class="mn-back" data-back aria-label="Tutti i menù">‹ Menù</button><input class="mn-name" id="mnT" data-f="n" value="' + esc(m.n || '') + '" placeholder="Nome del menù" aria-label="Nome del menù"' + dis + '></div><button type="button" class="scl-x" data-x aria-label="Chiudi">×</button></header>' +
      '<div class="mn-meta"><label class="sz-f"><span>Data</span><span class="sz-in"><input type="date" data-f="d" value="' + esc(m.d || '') + '"' + dis + '></span></label>' +
      '<label class="sz-f"><span>Coperti</span><span class="sz-in"><input inputmode="numeric" data-f="cov" value="' + esc(m.cov || '') + '"' + dis + '><em>cop.</em></span></label>' +
      '<label class="sz-f"><span>Scarto</span><span class="sz-in"><input inputmode="decimal" data-f="waste" value="' + esc(m.waste == null ? 5 : m.waste) + '"' + dis + '><em>%</em></span></label></div>' +
      '<div class="sub-seg mn-tabs" role="tablist">' + [['portate', 'Portate'], ['prod', 'Produzione']].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" class="' + (M.tab === t[0] ? 'on' : '') + '" aria-selected="' + (M.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += M.tab === 'prod' ? paintProd(m) : paintCourses(m, ed);
    h += '<div class="mn-acts"><button type="button" class="mn-b" data-print>' + svgI('print') + 'PDF</button><button type="button" class="mn-b" data-shop' + (window.SHOP ? '' : ' hidden') + '>' + svgI('cart') + 'Lista della spesa</button>' + (ed ? '<button type="button" class="mn-del" data-delmenu>Elimina menù</button>' : '') + '</div>';
    return h;
  }
  function svgI(k) { var p = { print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>', cart: '<path d="M3 4h2l2.5 11h10L20 7H6.5"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>' }[k]; return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  function paintCourses(m, ed) {
    var P = m.portate || [], dis = ed ? '' : ' disabled';
    var piatti = {}; recs().forEach(function (r) { var p = String(r.piatto || '').trim(); if (p) piatti[p] = (piatti[p] || 0) + 1; });
    var h = '<datalist id="mnRecs">' + recs().map(function (r) { return '<option value="' + esc(r.n) + '">'; }).join('') + '</datalist>' +
      '<datalist id="mnCourses">' + COURSES.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>';
    h += P.map(function (p, i) {
      var g = (p.items || []).reduce(function (a, x) { return a + num(x.g); }, 0);
      return '<section class="mn-c"><div class="mn-ch"><span class="mn-cn">' + (i + 1) + '</span><input class="mn-ct" data-pt="' + i + '" list="mnCourses" value="' + esc(p.t || '') + '" placeholder="Nome della portata" aria-label="Nome della portata"' + dis + '>' +
        (ed ? '<span class="sz-mv"><button type="button" data-pup="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Sposta su">↑</button><button type="button" data-pdn="' + i + '"' + (i < P.length - 1 ? '' : ' disabled') + ' aria-label="Sposta giù">↓</button><button type="button" data-pdel="' + i + '" aria-label="Togli la portata">×</button></span>' : '') + '</div>' +
        (p.piatto ? '<p class="mn-pi">' + esc(p.piatto) + '</p>' : '') +
        '<div class="mn-items">' + (p.items || []).map(function (x, j) {
          var miss = !recBy(x.n);
          return '<div class="mn-it' + (miss ? ' miss' : '') + '"><span class="mn-in">' + esc(x.n) + (miss ? '<small>non è nel ricettario</small>' : '') + '</span><span class="sz-in sm"><input inputmode="decimal" data-ig="' + i + ':' + j + '" value="' + esc(x.g == null ? '' : String(x.g).replace('.', ',')) + '" placeholder="g" aria-label="Grammi per coperto di ' + esc(x.n) + '"' + dis + '><em>g/cop.</em></span>' + (ed ? '<button type="button" class="mn-rm" data-irm="' + i + ':' + j + '" aria-label="Togli ' + esc(x.n) + '">×</button>' : '') + '</div>';
        }).join('') + '</div>' +
        (ed ? '<div class="mn-add"><input list="mnRecs" data-addto="' + i + '" placeholder="+ Aggiungi una ricetta…" aria-label="Aggiungi una ricetta alla portata"></div>' : '') +
        (g ? '<p class="mn-sum">' + gfmt(g) + ' a coperto</p>' : '') + '</section>';
    }).join('');
    if (ed) {
      var pk = Object.keys(piatti).filter(function (k) { return piatti[k] > 0; }).sort();
      h += '<div class="mn-newc"><button type="button" class="mn-b2" data-addc>+ Portata vuota</button>' + (pk.length ? '<select data-addpiatto aria-label="Aggiungi un piatto come portata"><option value="">+ Piatto intero…</option>' + pk.map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + ' (' + piatti[k] + ')</option>'; }).join('') + '</select>' : '') + '</div>';
    }
    if (!P.length) h += '<p class="mn-empty">Aggiungi la prima portata: un piatto intero porta con sé tutte le sue preparazioni.</p>';
    return h;
  }
  function paintProd(m) {
    var L = lines(m), cov = Math.round(num(m.cov));
    if (!L.length) return '<p class="mn-empty">Aggiungi ricette alle portate per vedere la produzione.</p>';
    if (!cov) return '<p class="mn-empty">Scrivi i coperti per calcolare quanto produrre.</p>';
    var tot = L.reduce(function (a, x) { return a + x.need; }, 0), at = srvAt(m);
    var h = '<label class="mn-srv"><span>Servizio alle</span><input type="time" data-f="srv" value="' + esc(m.srv || '') + '"' + (canEdit() ? '' : ' disabled') + '>' + (m.d ? '' : '<small>scegli anche la data</small>') + '</label>' +
      '<div class="mn-ptot"><span>' + cov + ' coperti</span><b class="mono">' + gfmt(tot) + '</b><small>da produrre, scarto ' + it(num(m.waste == null ? 5 : m.waste), 0) + '% compreso</small></div>';
    WHEN.forEach(function (w) {
      var G = L.filter(function (x) { return x.when === w[0]; }); if (!G.length) return;
      if (at && window.TL) G.sort(function (a, b) { return (a.r ? +TL.latestStart(a.r, at) : 0) - (b.r ? +TL.latestStart(b.r, at) : 0); });
      h += '<section class="mn-w"><h4><span class="mn-wd ' + w[0] + '"></span>' + w[1] + '</h4>' + G.map(function (x) {
        return '<div class="mn-pr"><div class="mn-prh"><b>' + esc(x.n) + '</b><span class="mono">' + gfmt(x.need) + '</span></div>' +
          '<div class="mn-prs"><small>' + esc(x.in.join(', ')) + ' · ' + it(x.gp, 0) + ' g × ' + cov + '</small>' + (x.tot ? '<small>ricetta ' + gfmt(x.tot) + ' → <b>×' + it(x.dose, 2) + '</b></small>' : '<small class="miss">non è nel ricettario</small>') + '</div>' +
          (at && x.r && window.TL ? (function () { var ls = TL.latestStart(x.r, at); return '<div class="mn-ls' + (ls < Date.now() ? ' late' : '') + '"><span>Inizia entro <b>' + esc(absT(ls)) + '</b> · ' + esc(TL.dur(TL.plan(x.r).total)) + '</span><button type="button" class="mn-tl" data-tl="' + esc(x.n) + '">Timeline</button></div>'; })() : '') +
          '<div class="mn-prw">' + WHEN.map(function (z) { return '<button type="button" data-when="' + esc(x.n) + '" data-w="' + z[0] + '" class="' + (x.when === z[0] ? 'on' : '') + '">' + z[1].replace('Il giorno prima', 'Giorno prima').replace('La mattina', 'Mattina') + '</button>'; }).join('') +
          (x.r && x.tot ? '<button type="button" class="sz-open" data-lab="' + esc(x.n) + '">Apri ×' + it(x.dose, 2) + '</button>' : '') + '</div></div>';
      }).join('') + '</section>';
    });
    return h;
  }
  function absT(d) { return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function srvAt(m) { if (!m.d || !m.srv) return null; var d = new Date(m.d + 'T' + m.srv); return isNaN(d) ? null : d; }
  function cur() { return M.open; }
  function addRecipe(i, name) {
    var m = cur(), r = recBy(name); if (!r) { toast('«' + name + '» non è nel ricettario'); return false; }
    var p = m.portate[i]; p.items = p.items || [];
    if (p.items.some(function (x) { return x.n === r.n; })) { toast('È già nella portata'); return false; }
    p.items.push({ n: r.n, g: perCover(r.n, r.piatto) });
    touch(m); return true;
  }
  function addPiatto(k) {
    var m = cur(), L = recs().filter(function (r) { return String(r.piatto || '').trim() === k; });
    m.portate.push({ id: uid(), t: '', piatto: k, items: L.map(function (r) { return { n: r.n, g: perCover(r.n, k) }; }) });
    touch(m);
  }
  function onInput(e) {
    var t = e.target, m = cur(); if (!m) return;
    if (t.dataset.f) { var f = t.dataset.f; m[f] = f === 'n' || f === 'd' || f === 'srv' ? t.value : num(t.value); touch(m); if (f !== 'n' && f !== 'd' && f !== 'srv') later(t); return; }
    if (t.dataset.pt != null) { m.portate[+t.dataset.pt].t = t.value; touch(m); return; }
    if (t.dataset.ig) { var a = t.dataset.ig.split(':'), x = m.portate[+a[0]].items[+a[1]]; x.g = t.value.trim() === '' ? null : num(t.value); touch(m); later(t); return; }
    if (t.dataset.addto != null && e.inputType === 'insertReplacementText') { if (addRecipe(+t.dataset.addto, t.value)) { paint(); focusAdd(+t.dataset.addto); } }
  }
  function later(t) { /* ridisegna solo i totali, senza perdere il cursore */
    clearTimeout(M._t); M._t = setTimeout(function () {
      var sel = t.dataset.f ? '[data-f="' + t.dataset.f + '"]' : '[data-ig="' + t.dataset.ig + '"]', pos = t.selectionStart; paint(); var n = document.querySelector('#mnBg ' + sel); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
    }, 450);
  }
  function focusAdd(i) { var n = document.querySelector('#mnBg [data-addto="' + i + '"]'); if (n) n.focus(); }
  function onChange(e) {
    var t = e.target, m = cur(); if (!m) return;
    if (t.dataset.f === 'srv' || (t.dataset.f === 'd' && M.tab === 'prod')) return paint();
    if (!t.isConnected) return; /* già aggiunta dalla scelta nel suggerimento: l'elemento è stato ridisegnato */
    if (t.dataset.addto != null && t.value.trim()) { if (addRecipe(+t.dataset.addto, t.value.trim())) { paint(); focusAdd(+t.dataset.addto); } else t.value = ''; }
    if (t.hasAttribute('data-addpiatto') && t.value) { addPiatto(t.value); paint(); }
  }
  function onClick(e) {
    var bg = $('mnBg'); if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var m = cur();
    if (b.hasAttribute('data-new')) { var nm = { id: uid(), n: '', d: '', cov: 20, waste: 5, portate: [], when: {} }; try { nm.by = (WL.email && WL.email() || '').split('@')[0]; } catch (x) {} M.list.push(nm); M.open = nm; M.view = 'edit'; M.tab = 'portate'; touch(nm); paint(); var i = $('mnT'); if (i) i.focus(); return; }
    if (b.dataset.open) { M.open = M.list.filter(function (x) { return x.id === b.dataset.open; })[0]; M.view = 'edit'; M.tab = 'portate'; return paint(); }
    if (b.hasAttribute('data-back')) { M.view = 'list'; M.open = null; return paint(); }
    if (!m) return;
    if (b.dataset.tab) { M.tab = b.dataset.tab; return paint(); }
    if (b.hasAttribute('data-addc')) { m.portate.push({ id: uid(), t: COURSES[Math.min(m.portate.length, 3)] || '', items: [] }); touch(m); paint(); var c = document.querySelectorAll('#mnBg [data-addto]'); if (c.length) c[c.length - 1].focus(); return; }
    if (b.dataset.pup != null) { var i1 = +b.dataset.pup; m.portate.splice(i1 - 1, 0, m.portate.splice(i1, 1)[0]); touch(m); return paint(); }
    if (b.dataset.pdn != null) { var i2 = +b.dataset.pdn; m.portate.splice(i2 + 1, 0, m.portate.splice(i2, 1)[0]); touch(m); return paint(); }
    if (b.dataset.pdel != null) { var P = m.portate[+b.dataset.pdel]; if ((P.items || []).length && !confirm('Togliere la portata «' + (P.t || P.piatto || 'senza nome') + '»?')) return; m.portate.splice(+b.dataset.pdel, 1); touch(m); return paint(); }
    if (b.dataset.irm) { var a = b.dataset.irm.split(':'); m.portate[+a[0]].items.splice(+a[1], 1); touch(m); return paint(); }
    if (b.dataset.when) { m.when = m.when || {}; m.when[b.dataset.when] = b.dataset.w; touch(m); return paint(); }
    if (b.dataset.lab) { var R = lines(m).filter(function (x) { return x.n === b.dataset.lab; })[0]; if (!R || !R.r) return; close(); setTimeout(function () { try { XL.open(R.r, 'lab'); setTimeout(function () { XL.setDose(Math.round(R.dose * 100) / 100, true); }, 450); } catch (x) {} }, 200); return; }
    if (b.dataset.tl) { var T = lines(m).filter(function (x) { return x.n === b.dataset.tl; })[0]; if (T && T.r && window.TL) TL.open(T.r, { at: srvAt(m) }); return; }
    if (b.hasAttribute('data-shop')) { var I = lines(m).filter(function (x) { return x.r && x.tot && x.need; }).map(function (x) { return { rec: x.r, d: x.dose }; }); if (!I.length) return toast(num(m.cov) ? 'Aggiungi i grammi per coperto' : 'Scrivi i coperti'); close(); setTimeout(function () { SHOP.open({ title: m.n || 'Menù', when: when(m), items: I }); }, 200); return; }
    if (b.hasAttribute('data-print')) return print(m);
    if (b.hasAttribute('data-delmenu')) { if (!confirm('Eliminare il menù «' + (m.n || 'senza nome') + '» per tutta la brigata?')) return; remove(m); M.view = 'list'; M.open = null; toast('Menù eliminato'); return paint(); }
  }
  function print(m) {
    var L = lines(m), cov = Math.round(num(m.cov)), brand = ''; try { brand = (WL.brand && WL.brand().name) || ''; } catch (e) {}
    var menu = (m.portate || []).map(function (p) { return '<div class="c"><h2>' + esc(p.t || p.piatto || '') + '</h2>' + (p.piatto && p.t ? '<p class="pi">' + esc(p.piatto) + '</p>' : '') + '<p class="it">' + (p.items || []).map(function (x) { return esc(x.n) + (num(x.g) ? ' <span>' + it(num(x.g), 0) + ' g</span>' : ''); }).join(' · ') + '</p></div>'; }).join('<div class="sep">✦</div>');
    var at = srvAt(m), prod = cov ? WHEN.map(function (w) { var G = L.filter(function (x) { return x.when === w[0]; }); if (!G.length) return ''; return '<tr class="g"><td colspan="4">' + w[1] + '</td></tr>' + G.map(function (x) { return '<tr><td class="c">☐</td><td>' + esc(x.n) + '<small>' + esc(x.in.join(', ')) + (at && x.r && window.TL ? ' · inizia entro ' + esc(absT(TL.latestStart(x.r, at))) : '') + '</small></td><td class="q">' + esc(gfmt(x.need)) + '</td><td class="q">' + (x.tot ? '×' + it(x.dose, 2) : '—') + '</td></tr>'; }).join(''); }).join('') : '';
    var html = '<div class="mn-print"><header><div class="b">' + esc(brand) + '</div><h1>' + esc(m.n || 'Menù') + '</h1><p>' + esc([when(m), cov ? cov + ' coperti' : ''].filter(Boolean).join(' · ')) + '</p></header>' +
      '<section class="menu">' + menu + '</section>' +
      (prod ? '<section class="prod"><h3>Piano di produzione</h3><table><thead><tr><th></th><th>Ricetta</th><th>Quantità</th><th>Dose</th></tr></thead><tbody>' + prod + '</tbody></table><p class="n">Scarto ' + it(num(m.waste == null ? 5 : m.waste), 0) + '% compreso.</p></section>' : '') + '</div>';
    var css = '#printArea .mn-print{font-family:"DM Sans",Arial,sans-serif;color:#1a1410;max-width:180mm;margin:0 auto}#printArea header{text-align:center;padding-bottom:10pt;border-bottom:.75pt solid #C4933A;margin-bottom:14pt}#printArea .b{font-size:8pt;letter-spacing:.22em;text-transform:uppercase;color:#8B6914}#printArea h1{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:500;font-size:26pt;margin:6pt 0 2pt}#printArea header p{margin:0;font-size:10pt;color:#666}' +
      '#printArea .menu{text-align:center;padding:6pt 0 14pt;page-break-after:always}#printArea .menu h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:15pt;letter-spacing:.04em;margin:0 0 2pt}#printArea .menu .pi{margin:0;font-size:9pt;color:#8B6914;font-style:italic}#printArea .menu .it{margin:4pt 0 0;font-size:10pt;color:#333}#printArea .menu .it span{color:#888;font-size:8.5pt}#printArea .sep{color:#C4933A;margin:10pt 0;font-size:9pt}' +
      '#printArea .prod h3{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:500;font-size:18pt;margin:0 0 8pt}#printArea table{width:100%;border-collapse:collapse;font-size:10.5pt}#printArea th{text-align:left;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#888;border-bottom:.75pt solid #C4933A;padding:4pt}#printArea td{padding:5pt 4pt;border-bottom:.5pt solid #e5e5e5;vertical-align:top}#printArea td small{display:block;font-size:8pt;color:#888}#printArea .q{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}#printArea .c{width:14pt}#printArea tr.g td{padding-top:12pt;font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:#8B6914;border-bottom:.75pt solid #C4933A}#printArea .n{font-size:8pt;color:#888}';
    if (window.RSH && RSH.print) RSH.print(html, css); else { var w = window.open(''); if (w) { w.document.write('<style>' + css.replace(/#printArea /g, '') + '</style>' + html); w.print(); } }
  }

  window.MENU = { open: open, onRows: onRows, lines: lines, list: function () { return M.list; }, icon: ICON, flush: flush, _M: M };
  var st = document.createElement('style');
  st.textContent = [
    '.mn-sheet{max-width:720px!important}',
    '.mn-new{width:100%;height:50px;border-radius:15px;border:1.5px dashed var(--cb);background:none;color:var(--ink);font:600 .95rem "DM Sans",sans-serif;cursor:pointer;margin:2px 0 10px}',
    '.mn-list{display:grid;gap:8px}.mn-card{display:flex;align-items:center;gap:14px;width:100%;padding:12px;border-radius:16px;border:1px solid var(--cb);background:var(--card);color:var(--ink);text-align:left;cursor:pointer}',
    '.mn-cd{flex-shrink:0;width:50px;height:54px;border-radius:12px;display:grid;place-items:center;align-content:center;background:var(--bg2,rgba(0,0,0,.04));color:var(--gold3,#8B6408)}.mn-cd b{font:700 1.3rem/1 "DM Sans",sans-serif;color:var(--ink)}.mn-cd small{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}',
    '.mn-cb{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.mn-cb b{font:500 1.15rem "Cormorant Garamond",Georgia,serif;font-style:italic}.mn-cb small{font-size:.78rem;color:var(--smoke)}.mn-cb em{font-style:normal;font-size:.8rem;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mn-go{color:var(--smoke);font-size:20px}',
    '.mn-empty{padding:18px 2px;color:var(--smoke);font-size:.9rem;line-height:1.5;text-align:center}',
    '.mn-hl{display:flex;flex-direction:column;align-items:flex-start;gap:2px;flex:1;min-width:0}.mn-back{border:0;background:none;padding:0;color:var(--gold3,#8B6408);font:600 .82rem "DM Sans",sans-serif;cursor:pointer}',
    '.mn-name{width:100%;border:0!important;background:none!important;box-shadow:none!important;outline:none!important;padding:0!important;height:auto!important;color:var(--ink);font:500 1.6rem/1.2 "Cormorant Garamond",Georgia,serif!important;font-style:italic!important}',
    '.mn-meta{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:8px;margin:12px 0 4px}.mn-meta input[type=date]{font-size:15px!important}',
    '.mn-c{padding:14px 0;border-bottom:1px solid var(--cb)}.mn-ch{display:flex;align-items:center;gap:10px}.mn-cn{flex-shrink:0;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));font:700 .78rem "DM Sans",sans-serif}',
    '.mn-ct{flex:1;min-width:0;border:0!important;background:none!important;box-shadow:none!important;outline:none!important;padding:0!important;height:34px!important;font:600 1.02rem "DM Sans",sans-serif!important;color:var(--ink)}',
    '.mn-ct::-webkit-calendar-picker-indicator,.mn-add input::-webkit-calendar-picker-indicator{display:none!important;opacity:0}',
    '.mn-pi{margin:2px 0 0 36px;font:italic 500 .95rem "Cormorant Garamond",Georgia,serif;color:var(--gold3,#8B6408)}',
    '.mn-items{margin:6px 0 0 36px}.mn-it{display:flex;align-items:center;gap:8px;padding:5px 0}.mn-in{flex:1;min-width:0;font-size:.92rem;display:flex;flex-direction:column}.mn-in small{font-size:.72rem;color:#b3261e}.mn-it .sz-in.sm{width:118px}',
    '.mn-rm{flex-shrink:0;width:30px;height:30px;border-radius:50%;border:0;background:none;color:var(--smoke);font-size:18px;cursor:pointer}',
    '.mn-add{margin:6px 0 0 36px}.mn-add input{width:100%;height:40px;padding:0 12px;border-radius:11px;border:1px dashed var(--cb);background:none;color:var(--ink);font:16px "DM Sans",sans-serif}',
    '.mn-sum{margin:6px 0 0 36px;font-size:.78rem;color:var(--smoke)}',
    '.mn-newc{display:flex;flex-wrap:wrap;gap:8px;padding:14px 0}.mn-b2,.mn-newc select{height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 .88rem "DM Sans",sans-serif;cursor:pointer;max-width:100%}',
    '.mn-srv{display:flex;align-items:center;gap:10px;margin:12px 0 0;font-size:.86rem;color:var(--ink2)}.mn-srv input{height:40px;padding:0 10px;border-radius:11px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 15px "DM Sans",sans-serif}.mn-srv small{color:var(--smoke);font-size:.76rem}',
    '.mn-ls{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;padding:6px 10px;border-radius:10px;background:var(--bg2,rgba(0,0,0,.04));font-size:.8rem;color:var(--ink2)}.mn-ls.late{background:color-mix(in srgb,#b3261e 9%,transparent);color:#9b2018}.mn-tl{border:0;background:none;color:var(--gold3,#8B6408);font:600 .8rem "DM Sans",sans-serif;cursor:pointer;flex-shrink:0}',
    '.mn-ptot{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;padding:12px 0}.mn-ptot span{font-size:.85rem;color:var(--smoke)}.mn-ptot b{font:700 1.6rem "DM Sans",sans-serif}.mn-ptot small{font-size:.8rem;color:var(--ink2)}',
    '.mn-w h4{display:flex;align-items:center;gap:8px;margin:14px 0 4px;font:700 11px "DM Sans",sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}.mn-wd{width:9px;height:9px;border-radius:50%}.mn-wd.d1{background:#5b7fa8}.mn-wd.am{background:#d0a03a}.mn-wd.srv{background:#b8455a}',
    '.mn-pr{padding:10px 0;border-bottom:1px solid var(--cb)}.mn-prh{display:flex;justify-content:space-between;gap:10px;font-size:.96rem}.mn-prh span{font-weight:700}.mn-prs{display:flex;justify-content:space-between;flex-wrap:wrap;gap:2px 10px;margin-top:2px}.mn-prs small{font-size:.76rem;color:var(--smoke)}.mn-prs small b{color:var(--ink)}.mn-prs .miss{color:#b3261e}',
    '.mn-prw{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:7px}.mn-prw [data-w]{height:28px;padding:0 10px;border-radius:99px;border:1px solid var(--cb);background:none;color:var(--ink2);font:500 .76rem "DM Sans",sans-serif;cursor:pointer}.mn-prw [data-w].on{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}.mn-prw .sz-open{margin-left:auto;height:30px}',
    '.mn-acts{position:sticky;bottom:calc(-18px - env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 0 6px;background:linear-gradient(transparent,var(--card) 22%);margin-top:10px}',
    '.mn-b{display:inline-flex;align-items:center;gap:7px;height:42px;padding:0 15px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 .86rem "DM Sans",sans-serif;cursor:pointer}.mn-b[data-print]{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}.mn-del{margin-left:auto;border:0;background:none;color:#b3261e;font:600 .82rem "DM Sans",sans-serif;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(st);
})();
