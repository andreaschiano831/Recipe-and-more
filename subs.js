/* subs.js — Sostituzioni intelligenti.
   «Ingrediente»: regole tecniche fisse (gelatina ↔ agar, zuccheri, latticini, uova, farine, amidi, cioccolato…)
   con quantità ricalcolate su grassi, solidi e potere gelificante. «Variante AI»: senza glutine, senza lattosio,
   vegana, senza uova, meno zucchero. Il risultato non tocca la ricetta: diventa una Prova da assaggiare e confrontare. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function rq(v) { return v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10; }
  function fq(v) { return rq(v).toLocaleString('it-IT'); }
  function nk(s) { return String(s || '').toLowerCase().trim(); }
  function isW(u) { return /^(g|gr|grammi?|ml|)$/i.test(String(u || 'g').trim()); }
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 0 8h-1"/><path d="m17 20 4-4-4-4"/><path d="M21 16H8"/></svg>';

  /* regola: m = riconosce l'ingrediente; alt = [nome, righe [[nome, fattore]], nota] */
  var RULES = [
    { m: /gelatina|colla di pesce/, x: /polvere/, alt: [
      ['Gelatina in polvere', [['Gelatina in polvere 200 bloom', 1], ['Acqua (per idratare)', 5]], 'Stesso peso. Idrata in 5 volte il suo peso d\'acqua fredda per 10 minuti, poi sciogli a 50-60 °C.'],
      ['Agar agar', [['Agar agar', 1 / 7]], 'Circa 1 g di agar ogni 7 g di gelatina. Va portato a bollore 1-2 minuti e gelifica sotto i 40 °C: gel più netto e fragile, regge il caldo (fino a 80 °C) ma non il congelamento.'],
      ['Pectina NH', [['Pectina NH', 1 / 2], ['Zucchero (da miscelare alla pectina)', 2]], 'Per gelée di frutta e nappage: mescola la pectina a secco con lo zucchero, porta a bollore. Serve un minimo di acidità e zucchero.']] },
    { m: /gelatina.*polvere/, alt: [
      ['Gelatina in fogli', [['Gelatina in fogli', 1]], 'Stesso peso. Ammolla in acqua fredda abbondante e strizza.'],
      ['Agar agar', [['Agar agar', 1 / 7]], 'Circa 1 g di agar ogni 7 g di gelatina, bollore 1-2 minuti. Non regge il congelamento.']] },
    { m: /^zucchero( semolato| bianco| a velo| fine)?$|saccarosio/, alt: [
      ['Destrosio · stessa massa', [['Destrosio', 1]], 'Stessi solidi, dolcezza al 70% (−30%) e potere anticongelante quasi doppio: utile in gelateria per un gelato meno dolce e più morbido.'],
      ['Destrosio · stessa dolcezza', [['Destrosio', 1.43]], '+43% di peso per la stessa dolcezza: aumentano solidi e PAC, il prodotto diventa molto più morbido.'],
      ['Trealosio', [['Trealosio', 1]], 'Stessa massa, dolcezza al 45%: meno dolce, protegge la struttura al congelamento e al forno. Ottimo per frutta e mousse.'],
      ['25% invertito', [['Zucchero', 0.75], ['Zucchero invertito', 0.31]], 'Un quarto degli zuccheri diventa invertito (≈80% solidi): più morbidezza e umidità, ritarda la cristallizzazione.'],
      ['Zucchero di canna', [['Zucchero di canna', 1]], 'Stesso peso: note di caramello e colore più scuro.'],
      ['Isomalto', [['Isomalto', 1]], 'Stesso peso, dolcezza al 50%: non assorbe umidità, ideale per decorazioni.']] },
    { m: /sciroppo di glucosio|^glucosio( liquido)?$/, alt: [
      ['Glucosio atomizzato', [['Glucosio atomizzato DE 38', 0.8], ['Acqua', 0.2]], 'Lo sciroppo ha circa l\'80% di solidi: stessi solidi con il glucosio in polvere più acqua.'],
      ['Destrosio + acqua', [['Destrosio', 0.8], ['Acqua', 0.2]], 'Stessi solidi ma più dolce e più anticongelante, meno corpo.'],
      ['Zucchero invertito', [['Zucchero invertito', 1]], 'Stesso peso: più dolce e più igroscopico.']] },
    { m: /^burro( fresco| di centrifuga| 82%| bavarese)?$/, alt: [
      ['Burro senza lattosio', [['Burro senza lattosio', 1]], 'Stesso peso, stessa resa.'],
      ['Burro di cacao + acqua', [['Burro di cacao deodorato', 0.82], ['Acqua', 0.16]], 'Ricostruisce il burro (82% grassi, 16% acqua). Struttura più dura a freddo: bene in frolle e creme, non in sfoglia.'],
      ['Olio di cocco + acqua', [['Olio di cocco deodorato', 0.82], ['Acqua', 0.16]], 'Versione vegetale: punto di fusione più basso, lavora freddo.']] },
    { m: /^panna( fresca| liquida| da montare| 35%| intera)*$/, alt: [
      ['Latte + burro', [['Latte intero', 0.6], ['Burro', 0.4]], 'Ricostruisce il 35% di grassi. Emulsiona con il frullatore a immersione: va bene in cottura (creme, ganache), non si monta.'],
      ['Panna senza lattosio', [['Panna senza lattosio', 1]], 'Stesso peso, si monta.'],
      ['Panna vegetale', [['Panna vegetale', 1]], 'Spesso zuccherata: riduci lo zucchero della ricetta di circa il 10% del suo peso.'],
      ['Crema di cocco', [['Crema di cocco', 1]], 'Grassi simili, gusto di cocco: bene in ganache e mousse vegane.']] },
    { m: /^latte( intero| fresco)?( intero)?$/, alt: [
      ['Scremato + panna', [['Latte scremato', 0.9], ['Panna 35%', 0.1]], 'Stesso 3,6% di grassi: utile se hai solo scremato e panna.'],
      ['Latte in polvere + acqua', [['Latte intero in polvere', 0.125], ['Acqua', 0.875]], 'Ricostruisce il latte intero (12,5% solidi).'],
      ['Latte senza lattosio', [['Latte senza lattosio', 1]], 'Stesso peso: un po\' più dolce, colora prima in cottura.'],
      ['Bevanda di soia', [['Bevanda di soia', 1]], 'Stesso peso: meno grassi, proteine diverse; nelle creme aggiungi 5% di amido in più.']] },
    { m: /^uov(a|o)( intere| intero| fresche)?$/, alt: [
      ['Tuorli + albumi', [['Tuorli', 0.35], ['Albumi', 0.65]], 'Un uovo senza guscio è circa 1/3 tuorlo e 2/3 albume: comodo se hai tuorli e albumi separati.'],
      ['Uova pastorizzate', [['Uova intere pastorizzate', 1]], 'Stesso peso: più sicure in preparazioni poco cotte.'],
      ['Aquafaba', [['Aquafaba', 1]], 'Stesso peso come legante o montata (vegana). Non sostituisce il tuorlo nelle creme.']] },
    { m: /^tuorl(i|o)( d'uovo)?$/, alt: [
      ['Tuorli pastorizzati', [['Tuorli pastorizzati', 1]], 'Stesso peso: più sicuri in creme poco cotte e semifreddi.']] },
    { m: /^album(i|e)$/, alt: [
      ['Albumi pastorizzati', [['Albumi pastorizzati', 1]], 'Stesso peso: montano un po\' meno, aggiungi 0,5% di cremor tartaro.'],
      ['Albumina in polvere', [['Albumina in polvere', 0.12], ['Acqua', 0.88]], 'Ricostruisce l\'albume (12% solidi): meringhe più stabili.']] },
    { m: /^farina( debole| 00| 0| tipo 00| tipo 0| per dolci)?$/, alt: [
      ['Mix senza glutine', [['Farina di riso', 0.6], ['Amido di mais', 0.25], ['Fecola di patate', 0.142], ['Gomma xantana', 0.008]], 'Stesso peso totale. La xantana (0,8%) sostituisce l\'elasticità del glutine: impasto più friabile, riposo in frigo obbligatorio.'],
      ['Farina di farro', [['Farina di farro', 1]], 'Stesso peso: più profumo, meno forza; assorbe un po\' meno liquidi.'],
      ['Mandorla + amido', [['Farina di mandorle', 0.6], ['Amido di mais', 0.4]], 'Senza glutine e più ricca: frolle e basi più friabili e grasse.']] },
    { m: /amido di mais|maizena|amido di frumento/, alt: [
      ['Fecola di patate', [['Fecola di patate', 1]], 'Stesso peso: gelifica prima, crema più lucida e meno stabile alla congelazione.'],
      ['Amido di riso', [['Amido di riso', 1]], 'Stesso peso: crema più corta e vellutata.'],
      ['Farina 00', [['Farina 00', 2]], 'Il doppio del peso: sapore più farinoso, contiene glutine.']] },
    { m: /fecola/, alt: [
      ['Amido di mais', [['Amido di mais', 1]], 'Stesso peso: crema più stabile, meno lucida.']] },
    { m: /cioccolato fondente|fondente (6|7|8)\d%|copertura fondente/, alt: [
      ['Cacao + burro di cacao', [['Cacao in polvere 22-24%', 0.38], ['Burro di cacao', 0.32], ['Zucchero a velo', 0.3]], 'Ricostruisce un fondente circa al 70%: scioglili insieme a 45-50 °C. Meno aroma, stessa struttura.'],
      ['Fondente 55%', [['Cioccolato fondente 55%', 1]], 'Stesso peso: più dolce (+15% zuccheri), struttura un po\' più morbida.']] },
    { m: /lievito di birra( fresco)?$|lievito fresco/, alt: [
      ['Lievito secco', [['Lievito di birra secco', 1 / 3]], 'Un terzo del peso. Attivalo in una parte dei liquidi tiepidi (30-35 °C).']] },
    { m: /lievito di birra secco|lievito secco/, alt: [
      ['Lievito fresco', [['Lievito di birra fresco', 3]], 'Il triplo del peso, sbriciolato nei liquidi.']] },
    { m: /mascarpone/, alt: [
      ['Panna + formaggio fresco', [['Formaggio fresco spalmabile', 0.6], ['Panna 35%', 0.4]], 'Grassi simili e più acidità: crema più leggera.']] },
    { m: /^miele/, alt: [
      ['Zucchero invertito', [['Zucchero invertito', 1]], 'Stesso peso: stessa morbidezza, gusto neutro.']] }
  ];
  function rulesFor(g) {
    var n = nk(g[0]); if (!isW(g[2]) || !(num(g[1]) > 0)) return null;
    for (var i = 0; i < RULES.length; i++) { var R = RULES[i]; if (R.m.test(n) && !(R.x && R.x.test(n))) return R.alt; }
    return null;
  }
  function swapRows(g, alt) { var q = num(g[1]); return alt[1].map(function (x) { return [x[0], rq(q * x[1]), g[2] || 'g']; }); }

  var S = null;
  function open(r, dose) {
    if (!r) return;
    S = { r: r, dose: dose || 1, pick: {}, tab: 'ing', ai: null, busy: false };
    var old = $('subBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'subBg'; bg.className = 'scl-bg';
    bg.innerHTML = '<div class="scl-sheet sub-sheet" role="dialog" aria-modal="true" aria-labelledby="subT"><span class="scl-grab"></span>' +
      '<header class="scl-hd"><div><span class="scl-k">Sostituzioni</span><h3 id="subT">' + esc(r.n) + '</h3></div><button type="button" class="scl-x" data-x aria-label="Chiudi">×</button></header>' +
      '<div class="sub-seg" role="tablist"><button type="button" role="tab" data-tab="ing">Un ingrediente</button><button type="button" role="tab" data-tab="ai">Variante completa</button></div>' +
      '<div id="subBody"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick);
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('subBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'subOut'; setTimeout(function () { bg.remove(); }, 240); }
  function paint() {
    var bg = $('subBg'); if (!bg) return;
    [].forEach.call(bg.querySelectorAll('.sub-seg button'), function (b) { var on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('subBody').innerHTML = S.tab === 'ing' ? paintIng() : paintAi();
  }
  function paintIng() {
    var r = S.r, rows = '', n = 0;
    (r.i || []).forEach(function (g, i) {
      var alt = rulesFor(g); if (!alt) return; n++;
      var p = S.pick[i];
      rows += '<div class="sub-ing' + (p != null ? ' on' : '') + '"><div class="sub-ih"><b>' + esc(g[0]) + '</b><span class="mono">' + fq(num(g[1])) + ' ' + esc(g[2] || 'g') + '</span></div>' +
        '<div class="sub-chips">' + alt.map(function (a, k) { return '<button type="button" class="sub-chip' + (p === k ? ' on' : '') + '" data-i="' + i + '" data-k="' + k + '" aria-pressed="' + (p === k) + '">' + esc(a[0]) + '</button>'; }).join('') + '</div>' +
        (p != null ? '<div class="sub-out"><ul>' + swapRows(g, alt[p]).map(function (x) { return '<li><span>' + esc(x[0]) + '</span><b class="mono">' + fq(x[1]) + ' ' + esc(x[2]) + '</b></li>'; }).join('') + '</ul><p>' + esc(alt[p][2]) + '</p></div>' : '') + '</div>';
    });
    if (!n) return '<div class="sub-empty"><p>Per questi ingredienti non ci sono sostituzioni tecniche fisse.</p><button type="button" class="sub-link" data-tab="ai">Chiedi una variante completa all\'AI →</button></div>';
    var k = Object.keys(S.pick).length;
    return '<p class="scl-lead">Tocca un\'alternativa: le quantità sono ricalcolate su grassi, solidi e potere gelificante. La ricetta non cambia, crei una prova da assaggiare.</p>' + rows +
      '<div class="scl-res"><button type="button" class="scl-go" data-make' + (k ? '' : ' disabled') + '>' + (k ? 'Crea la prova con ' + k + (k === 1 ? ' cambio' : ' cambi') : 'Scegli almeno un\'alternativa') + '</button></div>';
  }
  var GOALS = [['senza glutine', 'Senza glutine'], ['senza lattosio', 'Senza lattosio'], ['vegana (senza latte, uova, gelatina animale, miele)', 'Vegana'], ['senza uova', 'Senza uova'], ['zuccheri ridotti del 20-25% mantenendo la struttura', 'Meno zucchero']];
  function paintAi() {
    var h = '<p class="scl-lead">L\'AI riscrive solo gli ingredienti che servono e spiega ogni cambio. Controlla sempre il risultato con una prova.</p><div class="sub-goals">' +
      GOALS.map(function (g) { return '<button type="button" class="sub-chip goal" data-goal="' + esc(g[0]) + '"' + (S.busy ? ' disabled' : '') + '>' + esc(g[1]) + '</button>'; }).join('') + '</div>' +
      '<form class="sub-free" id="subFree"><input id="subGoal" placeholder="Altro obiettivo… es. senza frutta a guscio" aria-label="Altro obiettivo"' + (S.busy ? ' disabled' : '') + '><button type="submit" class="sub-ask"' + (S.busy ? ' disabled' : '') + '>Chiedi</button></form>';
    if (S.busy) h += '<div class="sub-wait"><span class="sub-dot"></span><span class="sub-dot"></span><span class="sub-dot"></span><p>Sto studiando la variante «' + esc(S.busy) + '»…</p></div>';
    var A = S.ai;
    if (A && A.err) h += '<p class="sub-err">' + esc(A.err) + '</p>';
    if (A && A.ok) {
      var v = A.ok;
      h += '<div class="sub-var"><span class="scl-k">Variante</span><h4>' + esc(v.nome) + '</h4>' +
        (v.cambi.length ? '<ul class="sub-cambi">' + v.cambi.map(function (c) { return '<li><span class="da">' + esc(c.da) + '</span><span class="ar">→</span><span class="a">' + esc(c.a) + '</span>' + (c.perche ? '<small>' + esc(c.perche) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '') +
        '<table class="sub-tab"><tbody>' + v.ing.map(function (g) { return '<tr' + (g.nw ? ' class="nw"' : '') + '><td>' + esc(g[0]) + '</td><td class="mono">' + (g[1] == null ? 'q.b.' : fq(g[1]) + ' ' + esc(g[2])) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (v.note ? '<p class="sub-note">' + esc(v.note) + '</p>' : '') +
        '<div class="scl-res"><button type="button" class="scl-go" data-saveai>Salva come prova</button></div></div>';
    }
    return h;
  }
  function recText(r) {
    var t = 'RICETTA: ' + (r.n || '') + (r.c ? ' (' + r.c + ')' : '') + '\nINGREDIENTI:\n' + (r.i || []).map(function (g) { return '- ' + g[0] + ' ' + (g[1] == null ? 'q.b.' : g[1]) + ' ' + (g[2] || 'g'); }).join('\n');
    if (r.p) t += '\nPROCEDIMENTO:\n' + String(r.p).slice(0, 3500);
    return t;
  }
  function askAi(goal) {
    if (typeof aiRunTask !== 'function') { S.ai = { err: 'AI non disponibile in questa pagina' }; return paint(); }
    S.busy = goal.replace(/\s*\(.*$/, ''); S.ai = null; paint();
    aiRunTask('subs', 'OBIETTIVO: ' + goal + '\n\n' + recText(S.r)).then(function (j) {
      var base = {}; (S.r.i || []).forEach(function (g) { base[nk(g[0])] = num(g[1]); });
      var ing = (Array.isArray(j.ingredienti) ? j.ingredienti : []).map(function (x) {
        var a = Array.isArray(x) ? x : [x && (x.nome || x.name), x && (x.quantita || x.quantity), x && (x.unita || x.unit)];
        var g = [String(a[0] || '').trim(), num(a[1]), String(a[2] || 'g').trim() || 'g']; g.nw = !(nk(g[0]) in base) || base[nk(g[0])] !== g[1]; return g;
      }).filter(function (g) { return g[0]; });
      if (!ing.length) throw new Error('L\'AI non ha restituito ingredienti: riprova');
      S.ai = { ok: { nome: String(j.nome || 'Variante ' + S.busy).slice(0, 60), ing: ing, note: String(j.note || '').slice(0, 600), cambi: (Array.isArray(j.cambi) ? j.cambi : []).slice(0, 12).map(function (c) { return { da: String(c.da || ''), a: String(c.a || ''), perche: String(c.perche || '') }; }).filter(function (c) { return c.da || c.a; }) } };
    }).catch(function (e) { S.ai = { err: e.message || 'AI non disponibile' }; }).then(function () { S.busy = false; paint(); });
  }
  function makeTrial(name, ings, note) {
    var me = ''; try { me = (WL.email && WL.email() || '').split('@')[0]; } catch (x) {}
    var rec = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n: name.slice(0, 70), at: new Date().toISOString(), i: ings.map(function (g) { return [g[0], g[1], g[2]]; }), v: 0, nt: note || '', by: me };
    var r = S.r, ok = XL.patchRec(r, function (nd) { nd.pv = (Array.isArray(nd.pv) ? nd.pv : []).concat([rec]); });
    if (!ok) return;
    close();
    XL.toast('Prova «' + rec.n + '» creata');
    var go = function () { try { XL.openSheet('prove'); } catch (e) {} };
    if (XL.viewOpen && XL.rec && (XL.rec._id || XL.rec.n) === (r._id || r.n)) setTimeout(go, 260);
    else { try { XL.open(XL.rec && (XL.rec._id === r._id) ? XL.rec : r, 'lab'); } catch (e) {} setTimeout(go, 600); }
  }
  function onClick(e) {
    var bg = $('subBg');
    if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.tab) { S.tab = b.dataset.tab; return paint(); }
    if (b.dataset.k != null) { var i = b.dataset.i, k = +b.dataset.k; if (S.pick[i] === k) delete S.pick[i]; else S.pick[i] = k; var y = bg.querySelector('.scl-sheet').scrollTop; paint(); bg.querySelector('.scl-sheet').scrollTop = y; return; }
    if (b.hasAttribute('data-make')) {
      var r = S.r, names = [], notes = [], out = [];
      (r.i || []).forEach(function (g, i) {
        var p = S.pick[i]; if (p == null) { out.push([g[0], num(g[1]), g[2] || 'g']); return; }
        var a = rulesFor(g)[p]; names.push(a[0]); notes.push(g[0] + ' → ' + a[0] + ': ' + a[2]);
        swapRows(g, a).forEach(function (x) {
          var same = out.filter(function (o) { return nk(o[0]) === nk(x[0]) && o[2] === x[2]; })[0];
          if (same) same[1] = rq((same[1] || 0) + x[1]); else out.push(x);
        });
      });
      return makeTrial('Con ' + names.join(', ').toLowerCase(), out, notes.join('\n'));
    }
    if (b.dataset.goal) return askAi(b.dataset.goal);
    if (b.hasAttribute('data-saveai') && S.ai && S.ai.ok) { var v = S.ai.ok; return makeTrial(v.nome, v.ing, (v.cambi.map(function (c) { return c.da + ' → ' + c.a + (c.perche ? ' (' + c.perche + ')' : ''); }).join('\n') + (v.note ? '\n' + v.note : '')).trim()); }
  }
  document.addEventListener('submit', function (e) { if (e.target.id !== 'subFree') return; e.preventDefault(); var v = ($('subGoal').value || '').trim(); if (v && !S.busy) askAi(v); });

  var item = { k: 'subs', icon: ICON, label: 'Sostituzioni', t: 'Sostituzioni', s: 'Gelatina ↔ agar, zuccheri, latticini · varianti senza glutine, lattosio, vegane', run: function (r, d) { open(r, d); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(item);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(item);
  window.SUBS = { open: open, rulesFor: rulesFor, icon: ICON, _s: function () { return S; } };
  var st = document.createElement('style');
  st.textContent = [
    '.sub-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:12px 0 4px;padding:4px;border-radius:14px;background:var(--bg2,rgba(0,0,0,.05))}',
    '.sub-seg button{height:38px;border:0;border-radius:11px;background:none;color:var(--ink2);font:600 .88rem "DM Sans",sans-serif;cursor:pointer}.sub-seg button.on{background:var(--card,#fff);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}',
    '.sub-ing{padding:12px 0;border-bottom:1px solid var(--cb)}.sub-ih{display:flex;justify-content:space-between;gap:10px;font-size:.95rem}.sub-ih span{color:var(--smoke);font-size:.85rem}',
    '.sub-chips,.sub-goals{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.sub-chip{min-height:34px;padding:0 13px;border-radius:99px;border:1px solid var(--cb);background:none;color:var(--ink);font:500 .84rem "DM Sans",sans-serif;cursor:pointer;transition:background .15s,border-color .15s}',
    '.sub-chip:hover{border-color:var(--ink2)}.sub-chip.on{background:var(--btn-bg,var(--ink));border-color:transparent;color:var(--btn-ink,var(--bg))}.sub-chip:disabled{opacity:.5}',
    '.sub-out{margin-top:10px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--gold2,#B8862F) 9%,transparent)}',
    '.sub-out ul{list-style:none;margin:0;padding:0}.sub-out li{display:flex;justify-content:space-between;gap:10px;font-size:.88rem;padding:2px 0}.sub-out p{margin:6px 0 0;font-size:.8rem;line-height:1.45;color:var(--ink2)}',
    '.sub-empty{padding:22px 0;text-align:center;color:var(--ink2);font-size:.9rem}.sub-link{border:0;background:none;color:var(--gold3,#8B6408);font:600 .9rem "DM Sans",sans-serif;cursor:pointer}',
    '.sub-free{display:flex;gap:8px;margin:10px 0 4px}.sub-free input{flex:1;min-width:0;height:42px;padding:0 12px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:16px "DM Sans",sans-serif}',
    '.sub-ask{flex-shrink:0;height:42px;padding:0 16px;border-radius:12px;border:0;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));font:600 .88rem "DM Sans",sans-serif;cursor:pointer}.sub-ask:disabled{opacity:.5}',
    '.sub-wait{display:flex;align-items:center;gap:6px;padding:18px 0;color:var(--ink2);font-size:.86rem}.sub-wait p{margin:0 0 0 6px}',
    '.sub-dot{width:7px;height:7px;border-radius:50%;background:var(--gold2,#B8862F);animation:subDot 1s infinite ease-in-out}.sub-dot:nth-child(2){animation-delay:.15s}.sub-dot:nth-child(3){animation-delay:.3s}',
    '@keyframes subDot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.sub-dot{animation:none}}',
    '.sub-err{color:#b3261e;font-size:.86rem}',
    '.sub-var{margin-top:12px;padding-top:12px;border-top:1px solid var(--cb)}.sub-var h4{margin:2px 0 8px;font:500 1.25rem "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.sub-cambi{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:6px}.sub-cambi li{display:grid;grid-template-columns:auto auto 1fr;gap:4px 8px;align-items:baseline;font-size:.88rem}',
    '.sub-cambi .da{color:var(--smoke);text-decoration:line-through}.sub-cambi .ar{color:var(--gold3,#8B6408)}.sub-cambi .a{font-weight:600}.sub-cambi small{grid-column:1/-1;color:var(--ink2);font-size:.78rem}',
    '.sub-tab{width:100%;border-collapse:collapse;font-size:.88rem}.sub-tab td{padding:6px 0;border-bottom:1px solid var(--cb)}.sub-tab td:last-child{text-align:right}.sub-tab tr.nw td:first-child{font-weight:600}.sub-tab tr.nw td:first-child::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold2,#B8862F);margin-right:7px;vertical-align:middle}',
    '.sub-note{font-size:.82rem;line-height:1.5;color:var(--ink2)}'
  ].join('\n');
  document.head.appendChild(st);
})();
