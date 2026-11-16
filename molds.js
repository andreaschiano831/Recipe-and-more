/* ════════════════════════════════════════════════════════════════════
   STAMPI E PLACCHE — scala la ricetta sui contenitori reali
   · gastronorm (GN 2/1 … 1/9) con altezza di riempimento
   · placche e cornici rettangolari (60×40, 40×30… o su misura)
   · cerchi e anelli per diametro, stampi quadrati/rettangolari
   · monoporzioni: numero di pezzi × ml, × grammi o per forma (cilindro, semisfera, cupola)
   · contenitori misti, densità della preparazione, margine di scarto
   · dose risultante, ingredienti scalati e arrotondati per la bilancia,
     calcolo inverso (cosa riempi con la dose attuale)
   La ricetta non viene modificata: si applica solo la dose di lavoro.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var XL = window.XL; if (!XL) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function it(n, d) { if (!isFinite(n)) return '—'; var p = Math.pow(10, d || 0); return (Math.round(n * p) / p).toLocaleString('it-IT'); }
  function gfmt(g) { return g >= 1000 ? it(g / 1000, 2) + ' kg' : it(g, g < 10 ? 1 : 0) + ' g'; }
  function mlfmt(ml) { return ml >= 1000 ? it(ml / 1000, 2) + ' l' : it(ml, 0) + ' ml'; }
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── catalogo ── */
  var GN = { '2/1': [650, 530], '1/1': [530, 325], '2/3': [354, 325], '1/2': [325, 265], '1/3': [325, 176], '1/4': [265, 162], '1/6': [176, 162], '1/9': [176, 108] };
  var GN_FACTOR = 0.93;  /* fondo più stretto della bocca e angoli arrotondati */
  var TRAYS = { '60×40': [60, 40], '40×30': [40, 30], '57×37 cornice': [57, 37], '30×20': [30, 20] };
  var KINDS = [
    ['gn', 'Gastronorm'], ['tray', 'Placca / cornice'], ['ring', 'Cerchio / anello'], ['rect', 'Stampo rettangolare'], ['mono', 'Monoporzioni'], ['vol', 'Volume libero']
  ];
  var DENS = [
    ['liq', 'Liquido, crema inglese, gelato da mantecare', 1.03],
    ['crem', 'Cremoso, ganache, crémeux', 1.1],
    ['gel', 'Gelée, inserto di frutta', 1.05],
    ['mou', 'Mousse, bavarese', 0.62],
    ['semi', 'Semifreddo', 0.55],
    ['chan', 'Chantilly, panna montata', 0.45],
    ['icec', 'Gelato mantecato (overrun ~35%)', 0.75],
    ['geno', 'Impasto montato (génoise, biscuit)', 0.45],
    ['cake', 'Impasto da torta (cake, plumcake)', 0.95],
    ['dough', 'Impasto compatto (frolla, sablé)', 1.2],
    ['cust', 'Personalizzata', 1]
  ];
  function densGuess(r) {
    var t = (String(r.n || '') + ' ' + String(r.c || '')).toLowerCase();
    if (/semifredd/.test(t)) return 'semi';
    if (/mousse|bavares|bavarois/.test(t)) return 'mou';
    if (/chantilly|montat/.test(t)) return 'chan';
    if (/g[ée]noise|biscuit|pan di spagna|joconde|savoiard|dacquoise/.test(t)) return 'geno';
    if (/cake|plumcake|muffin|torta margherita|financier/.test(t)) return 'cake';
    if (/frolla|sabl|shortbread|pasta/.test(t)) return 'dough';
    if (/gel[ée]e|insert|compost|coulis|confettura/.test(t)) return 'gel';
    if (/cremoso|cr[ée]meux|ganache/.test(t)) return 'crem';
    if (/gelat|sorbett/.test(t)) return 'liq';
    return 'liq';
  }

  /* ── stato per ricetta (ricordato sul dispositivo) ── */
  function skey(r) { return 'xl_molds:' + String(r._id || r.n); }
  function load(r) {
    var s = null; try { s = JSON.parse(localStorage.getItem(skey(r)) || 'null'); } catch (e) {}
    if (!s || !s.rows) s = { rows: [{ k: 'ring', d: 20, h: 3, n: 1 }], dens: densGuess(r), custom: 1, fill: 100, waste: 5, round: true };
    return s;
  }
  function save(r, s) { try { localStorage.setItem(skey(r), JSON.stringify(s)); } catch (e) {} }
  function myMolds() { try { return JSON.parse(localStorage.getItem('mdl_molds') || '[]') || []; } catch (e) { return []; } }
  function saveMyMolds(a) { try { localStorage.setItem('mdl_molds', JSON.stringify(a.slice(0, 40))); } catch (e) {} }

  /* ── volume di una riga (ml) ── */
  function rowVolume(x) {
    var n = Math.max(0, Math.round(num(x.n) || 0)) || 0, v = 0, label = '';
    if (x.k === 'gn') { var g = GN[x.gn || '1/1']; v = g[0] / 10 * g[1] / 10 * num(x.h) * GN_FACTOR; label = 'GN ' + (x.gn || '1/1') + ' · ' + it(num(x.h), 1) + ' cm'; }
    else if (x.k === 'tray') { var L = num(x.l), W = num(x.w); v = L * W * num(x.h); label = it(L, 1) + '×' + it(W, 1) + ' cm · ' + it(num(x.h), 1) + ' cm'; }
    else if (x.k === 'ring') { var d = num(x.d); v = Math.PI * d * d / 4 * num(x.h); label = 'Ø ' + it(d, 1) + ' cm · ' + it(num(x.h), 1) + ' cm'; }
    else if (x.k === 'rect') { v = num(x.l) * num(x.w) * num(x.h); label = it(num(x.l), 1) + '×' + it(num(x.w), 1) + ' cm · ' + it(num(x.h), 1) + ' cm'; }
    else if (x.k === 'mono') {
      var sh = x.sh || 'ml';
      if (sh === 'ml') { v = num(x.ml); label = it(num(x.ml), 0) + ' ml'; }
      else if (sh === 'g') { v = 0; label = it(num(x.g), 0) + ' g'; }
      else if (sh === 'cyl') { v = Math.PI * num(x.d) * num(x.d) / 4 * num(x.h); label = 'cilindro Ø ' + it(num(x.d), 1) + '×' + it(num(x.h), 1) + ' cm'; }
      else if (sh === 'hemi') { var rr = num(x.d) / 2; v = 2 / 3 * Math.PI * rr * rr * rr; label = 'semisfera Ø ' + it(num(x.d), 1) + ' cm'; }
      else if (sh === 'dome') { var a = num(x.d) / 2, hh = num(x.h); v = Math.PI * hh / 6 * (3 * a * a + hh * hh); label = 'cupola Ø ' + it(num(x.d), 1) + '×' + it(hh, 1) + ' cm'; }
    }
    else if (x.k === 'vol') { v = num(x.ml); label = it(num(x.ml), 0) + ' ml'; }
    return { each: v, n: n, label: label, grams: x.k === 'mono' && x.sh === 'g' ? num(x.g) : 0 };
  }
  function densityOf(s) { if (s.dens === 'cust') return Math.max(0.05, num(s.custom) || 1); var d = DENS.filter(function (x) { return x[0] === s.dens; })[0]; return d ? d[2] : 1; }
  function compute(r, s) {
    var A = rcAnalyze(r.i || []), dens = densityOf(s), fill = Math.max(1, Math.min(100, num(s.fill) || 100)) / 100, waste = Math.max(0, Math.min(50, num(s.waste))) / 100;
    var rows = s.rows.map(function (x) {
      var V = rowVolume(x), gEach = V.grams || V.each * dens * (x.k === 'mono' || x.k === 'vol' ? fill : 1);
      return { x: x, V: V, gEach: gEach, g: gEach * V.n, ml: V.each * V.n };
    });
    var net = rows.reduce(function (a, b) { return a + b.g; }, 0), need = net * (1 + waste);
    return { A: A, dens: dens, fill: fill, waste: waste, rows: rows, net: net, need: need, dose: A.tot ? need / A.tot : 0 };
  }
  /* arrotondamento per la bilancia */
  function roundQ(v, u) {
    if (v == null) return null; u = String(u || 'g').toLowerCase();
    if (!/^(g|gr|ml)$/.test(u)) return Math.round(v * 100) / 100;
    if (v >= 1000) return Math.round(v / 10) * 10;
    if (v >= 200) return Math.round(v / 5) * 5;
    if (v >= 20) return Math.round(v);
    if (v >= 2) return Math.round(v * 2) / 2;
    return Math.round(v * 10) / 10;
  }
  function qTxt(v, u) { if (v == null) return 'q.b.'; return (v >= 100 ? it(v, 0) : it(v, v < 10 ? 1 : 1)) + ' ' + (u || 'g'); }

  /* ── disegno del contenitore (vista dall'alto, in scala) ── */
  function sketch(x) {
    var c = '#55623F', f = 'rgba(85,98,63,.14)';
    if (x.k === 'ring' || (x.k === 'mono' && x.sh !== 'ml' && x.sh !== 'g')) return '<svg viewBox="0 0 60 60" class="ms-sk"><circle cx="30" cy="30" r="24" fill="' + f + '" stroke="' + c + '" stroke-width="1.6"/><path d="M8 30h44" stroke="' + c + '" stroke-dasharray="2 2" stroke-width="1"/></svg>';
    var L = 1, W = 1;
    if (x.k === 'gn') { var g = GN[x.gn || '1/1']; L = g[0]; W = g[1]; }
    else if (x.k === 'tray' || x.k === 'rect') { L = num(x.l) || 1; W = num(x.w) || 1; }
    var mx = Math.max(L, W), w = 48 * L / mx, h = 48 * W / mx;
    if (x.k === 'mono' || x.k === 'vol') return '<svg viewBox="0 0 60 60" class="ms-sk"><path d="M16 14h28l-4 34H20z" fill="' + f + '" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    return '<svg viewBox="0 0 60 60" class="ms-sk"><rect x="' + (30 - w / 2) + '" y="' + (30 - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (x.k === 'gn' ? 4 : 1.5) + '" fill="' + f + '" stroke="' + c + '" stroke-width="1.6"/></svg>';
  }

  /* ── campi di una riga ── */
  function fld(lbl, name, val, unit, w) { return '<label class="ms-f"' + (w ? ' style="flex:' + w + '"' : '') + '><span>' + lbl + '</span><span class="ms-in"><input inputmode="decimal" data-f="' + name + '" value="' + esc(val == null ? '' : String(val).replace('.', ',')) + '">' + (unit ? '<em>' + unit + '</em>' : '') + '</span></label>'; }
  function rowFields(x) {
    var n = fld('Quantità', 'n', x.n || 1, 'pz', 0.8);
    if (x.k === 'gn') return '<div class="ms-chips" data-pick="gn">' + Object.keys(GN).map(function (k) { return '<button type="button" data-v="' + k + '" class="' + ((x.gn || '1/1') === k ? 'on' : '') + '">' + k + '</button>'; }).join('') + '</div><div class="ms-fs">' + fld('Altezza strato', 'h', x.h, 'cm') + n + '</div>';
    if (x.k === 'tray') return '<div class="ms-chips" data-pick="tray">' + Object.keys(TRAYS).map(function (k) { var t = TRAYS[k], on = num(x.l) === t[0] && num(x.w) === t[1]; return '<button type="button" data-v="' + k + '" class="' + (on ? 'on' : '') + '">' + k + '</button>'; }).join('') + '</div><div class="ms-fs">' + fld('Lunghezza', 'l', x.l, 'cm') + fld('Larghezza', 'w', x.w, 'cm') + fld('Spessore', 'h', x.h, 'cm') + n + '</div>';
    if (x.k === 'ring') return '<div class="ms-chips" data-pick="ring">' + [6, 8, 12, 14, 16, 18, 20, 22, 24, 26, 28].map(function (d) { return '<button type="button" data-v="' + d + '" class="' + (num(x.d) === d ? 'on' : '') + '">Ø' + d + '</button>'; }).join('') + '</div><div class="ms-fs">' + fld('Diametro', 'd', x.d, 'cm') + fld('Altezza strato', 'h', x.h, 'cm') + n + '</div>';
    if (x.k === 'rect') return '<div class="ms-fs">' + fld('Lunghezza', 'l', x.l, 'cm') + fld('Larghezza', 'w', x.w, 'cm') + fld('Altezza strato', 'h', x.h, 'cm') + n + '</div>';
    if (x.k === 'mono') {
      var sh = x.sh || 'ml';
      var tabs = '<div class="ms-chips" data-pick="sh">' + [['ml', 'ml per pezzo'], ['g', 'g per pezzo'], ['cyl', 'Cilindro'], ['hemi', 'Semisfera'], ['dome', 'Cupola']].map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (sh === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>';
      var f = sh === 'ml' ? fld('Volume', 'ml', x.ml, 'ml') : sh === 'g' ? fld('Peso', 'g', x.g, 'g') : sh === 'hemi' ? fld('Diametro', 'd', x.d, 'cm') : fld('Diametro', 'd', x.d, 'cm') + fld('Altezza', 'h', x.h, 'cm');
      return tabs + '<div class="ms-fs">' + f + fld('Pezzi', 'n', x.n || 1, 'pz', 0.8) + '</div>';
    }
    return '<div class="ms-fs">' + fld('Volume', 'ml', x.ml, 'ml') + n + '</div>';
  }
  function defaults(k) {
    return { gn: { k: 'gn', gn: '1/1', h: 2, n: 1 }, tray: { k: 'tray', l: 60, w: 40, h: 1, n: 1 }, ring: { k: 'ring', d: 20, h: 3, n: 1 }, rect: { k: 'rect', l: 30, w: 10, h: 4, n: 1 }, mono: { k: 'mono', sh: 'ml', ml: 90, n: 12 }, vol: { k: 'vol', ml: 1000, n: 1 } }[k];
  }

  /* ══════════ VISTA ══════════ */
  function render(qtyOnly) {
    var host = $('xlMolds'), r = XL.rec; if (!host || !r) return;
    var s = XL._ms && XL._ms.r === r ? XL._ms.s : load(r); XL._ms = { r: r, s: s };
    if (qtyOnly && host.querySelector('.ms')) { paintResult(); return; }
    var dOpts = DENS.map(function (d) { return '<option value="' + d[0] + '"' + (s.dens === d[0] ? ' selected' : '') + '>' + d[1] + (d[0] === 'cust' ? '' : ' · ' + String(d[2]).replace('.', ',')) + '</option>'; }).join('');
    var mine = myMolds();
    host.innerHTML = '<div class="ms">' +
      '<section class="ms-col">' +
        '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Contenitori</span><span class="lb-count">misti, quanti ne vuoi</span></div>' +
          '<div class="ms-rows" id="msRows"></div>' +
          '<div class="ms-add"><span>Aggiungi</span>' + KINDS.map(function (k) { return '<button type="button" data-add="' + k[0] + '">+ ' + k[1] + '</button>'; }).join('') + '</div>' +
          (mine.length ? '<div class="ms-mine"><span>I miei stampi</span>' + mine.map(function (m, i) { return '<button type="button" data-mine="' + i + '" title="' + esc(m.label || '') + '">' + esc(m.name) + '<i data-del-mine="' + i + '" aria-label="Elimina">×</i></button>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Preparazione</span></div>' +
          '<label class="ms-f wide"><span>Densità (g per ml)</span><select id="msDens">' + dOpts + '</select></label>' +
          '<div class="ms-fs">' + '<label class="ms-f" id="msCustWrap"' + (s.dens === 'cust' ? '' : ' hidden') + '><span>Densità</span><span class="ms-in"><input id="msCust" inputmode="decimal" value="' + String(s.custom).replace('.', ',') + '"><em>g/ml</em></span></label>' +
          '<label class="ms-f"><span>Riempimento monoporzioni</span><span class="ms-in"><input id="msFill" inputmode="decimal" value="' + s.fill + '"><em>%</em></span></label>' +
          '<label class="ms-f"><span>Scarto e residui</span><span class="ms-in"><input id="msWaste" inputmode="decimal" value="' + s.waste + '"><em>%</em></span></label></div>' +
          '<p class="ms-tip">La densità trasforma il volume in grammi: 1 litro di mousse pesa circa 620 g, 1 litro di cremoso circa 1.100 g. Per un valore esatto pesa 100 ml della tua preparazione.</p>' +
        '</div>' +
      '</section>' +
      '<section class="ms-col ms-res" id="msRes"></section></div>';
    drawRows(); paintResult(); bindTop();
    if (!calm) [].forEach.call(host.querySelectorAll('.lb-card'), function (c, i) { c.style.setProperty('--i', i); c.classList.add('lb-in'); });
  }
  function drawRows() {
    var s = XL._ms.s, box = $('msRows'); if (!box) return;
    box.innerHTML = s.rows.map(function (x, i) {
      var nm = KINDS.filter(function (k) { return k[0] === x.k; })[0];
      return '<div class="ms-row" data-i="' + i + '">' + sketch(x) + '<div class="ms-row-b"><div class="ms-row-h"><b>' + nm[1] + '</b><span class="ms-row-v mono" data-v></span>' +
        '<button type="button" class="ms-ic" data-save title="Salva tra i miei stampi">☆</button><button type="button" class="ms-ic" data-del aria-label="Togli">×</button></div>' + rowFields(x) + '</div></div>';
    }).join('') || '<p class="lb-empty">Aggiungi almeno un contenitore.</p>';
    [].forEach.call(box.querySelectorAll('.ms-row'), function (row) {
      var i = +row.dataset.i, x = s.rows[i];
      [].forEach.call(row.querySelectorAll('input[data-f]'), function (inp) {
        inp.oninput = function () { x[inp.dataset.f] = num(inp.value); if (inp.dataset.f === 'l' || inp.dataset.f === 'w' || inp.dataset.f === 'd') { [].forEach.call(row.querySelectorAll('.ms-chips button'), function (b) { b.classList.remove('on'); }); row.querySelector('.ms-sk').outerHTML = sketch(x); } changed(); };
        inp.onfocus = function () { inp.select(); };
      });
      var pick = row.querySelector('.ms-chips');
      if (pick) [].forEach.call(pick.querySelectorAll('button'), function (b) {
        b.onclick = function () {
          var p = pick.dataset.pick, v = b.dataset.v;
          if (p === 'gn') x.gn = v; else if (p === 'tray') { x.l = TRAYS[v][0]; x.w = TRAYS[v][1]; } else if (p === 'ring') x.d = +v; else if (p === 'sh') { x.sh = v; if (v === 'hemi' && !x.d) x.d = 7; if ((v === 'cyl' || v === 'dome') && !x.d) { x.d = 7; x.h = 4; } if (v === 'g' && !x.g) x.g = 90; if (v === 'ml' && !x.ml) x.ml = 90; drawRows(); changed(); return; }
          drawRows(); changed();
        };
      });
      row.querySelector('[data-del]').onclick = function () { s.rows.splice(i, 1); drawRows(); changed(); };
      row.querySelector('[data-save]').onclick = function () {
        var V = rowVolume(x), name = prompt('Nome dello stampo (es. «Cerchio torta 20» o «Silicone sfere»)', V.label); if (!name) return;
        var a = myMolds(), cp = JSON.parse(JSON.stringify(x)); a.unshift({ name: name.trim().slice(0, 40), label: V.label, row: cp }); saveMyMolds(a); render(); XL.toast('Salvato tra i tuoi stampi');
      };
    });
    paintRowVols();
  }
  function paintRowVols() {
    var s = XL._ms.s, C = compute(XL.rec, s);
    [].forEach.call(document.querySelectorAll('#msRows .ms-row'), function (row) {
      var R = C.rows[+row.dataset.i]; if (!R) return;
      row.querySelector('[data-v]').textContent = (R.V.grams ? '' : mlfmt(R.ml) + ' · ') + gfmt(R.g);
    });
  }
  function bindTop() {
    var s = XL._ms.s, host = $('xlMolds');
    [].forEach.call(host.querySelectorAll('[data-add]'), function (b) { b.onclick = function () { s.rows.push(defaults(b.dataset.add)); drawRows(); changed(); var rows = host.querySelectorAll('.ms-row'); var last = rows[rows.length - 1]; if (last) { last.classList.add('ms-new'); var f = last.querySelector('input'); if (f && window.innerWidth >= 900) f.focus(); } }; });
    [].forEach.call(host.querySelectorAll('[data-mine]'), function (b) {
      b.onclick = function (e) {
        var del = e.target.closest('[data-del-mine]'), a = myMolds();
        if (del) { e.stopPropagation(); a.splice(+del.dataset.delMine, 1); saveMyMolds(a); render(); return; }
        var m = a[+b.dataset.mine]; if (!m) return; s.rows.push(JSON.parse(JSON.stringify(m.row))); drawRows(); changed();
      };
    });
    $('msDens').onchange = function () { s.dens = this.value; $('msCustWrap').hidden = s.dens !== 'cust'; changed(); };
    $('msCust').oninput = function () { s.custom = num(this.value) || 1; changed(); };
    $('msFill').oninput = function () { s.fill = num(this.value) || 100; changed(); };
    $('msWaste').oninput = function () { s.waste = num(this.value); changed(); };
  }
  var tmr = null;
  function changed() { save(XL.rec, XL._ms.s); paintRowVols(); clearTimeout(tmr); tmr = setTimeout(paintResult, 60); }

  function paintResult() {
    var box = $('msRes'); if (!box) return;
    var r = XL.rec, s = XL._ms.s, C = compute(r, s), ings = r.i || [];
    if (!C.A.tot) { box.innerHTML = '<div class="lb-card"><p class="lb-empty">Questa ricetta non ha quantità: impossibile scalare.</p></div>'; return; }
    var dose = C.dose, cur = XL.dose, have = C.A.tot * cur;
    var list = ings.map(function (g) {
      var v = g[1] == null ? null : g[1] * dose, rv = s.round ? roundQ(v, g[2]) : v;
      return '<div class="ms-ing"><span>' + esc(g[0]) + '</span><b class="mono">' + qTxt(rv, g[2]) + '</b></div>';
    }).join('');
    var sumR = 0; ings.forEach(function (g) { if (g[1] != null) { var v = g[1] * dose; sumR += (s.round ? roundQ(v, g[2]) : v) || 0; } });
    /* inverso: con la dose attuale */
    var inv = '';
    if (C.rows.length && have > 0) {
      var usable = have / (1 + C.waste);
      if (C.rows.length === 1) {
        var R = C.rows[0];
        if (R.gEach > 0) inv = 'Con la dose attuale (' + gfmt(have) + ') riempi <b>' + it(Math.floor(usable / R.gEach + 1e-6), 0) + '</b> ' + (R.x.k === 'mono' ? 'monoporzioni' : 'contenitori così') + (R.x.k !== 'mono' && R.x.k !== 'vol' && R.gEach ? ', oppure uno strato di <b>' + it(num(R.x.h) * usable / R.gEach / Math.max(1, R.V.n), 1) + ' cm</b> su ' + (R.V.n > 1 ? R.V.n + ' pezzi' : 'questo contenitore') : '') + '.';
      } else inv = 'Con la dose attuale (' + gfmt(have) + ') copri il <b>' + it(Math.min(999, usable / C.net * 100), 0) + '%</b> dei contenitori.';
    }
    box.innerHTML =
      '<div class="lb-card ms-hero"><div class="lb-h"><span class="lb-eyebrow">Ti serve</span><span class="lb-count mono">' + mlfmt(C.rows.reduce(function (a, b) { return a + b.ml; }, 0)) + ' · ' + it(C.dens, 2) + ' g/ml</span></div>' +
        '<div class="ms-big"><strong class="mono" id="msNeed">' + gfmt(C.need) + '</strong><span>dose <b class="mono" id="msDose">×' + it(dose, 2) + '</b></span></div>' +
        '<div class="ms-break">' + C.rows.map(function (R) { return '<div><span>' + (R.V.n > 1 ? R.V.n + ' × ' : '') + esc(R.V.label) + '</span><b class="mono">' + gfmt(R.g) + '</b></div>'; }).join('') +
        (C.waste ? '<div class="ms-w"><span>Scarto ' + it(C.waste * 100, 0) + '%</span><b class="mono">+ ' + gfmt(C.need - C.net) + '</b></div>' : '') + '</div>' +
        (inv ? '<p class="ms-inv">' + inv + '</p>' : '') +
        '<div class="ms-acts"><button type="button" class="lb-btn dark" id="msUse"' + (dose > 0 ? '' : ' disabled') + '>Usa ×' + it(dose, 2) + ' nel Laboratorio<i>→</i></button>' +
        '<button type="button" class="lb-btn" id="msCook"' + (dose > 0 ? '' : ' disabled') + '>Cucina con questa dose</button></div></div>' +
      '<div class="lb-card"><div class="lb-h"><span class="lb-eyebrow">Ingredienti per questi contenitori</span><label class="ms-sw"><input type="checkbox" id="msRound"' + (s.round ? ' checked' : '') + '><span></span>Arrotonda per la bilancia</label></div>' +
        '<div class="ms-ings">' + list + '</div><div class="ms-tot"><span>Totale</span><b class="mono">' + gfmt(sumR) + '</b></div>' +
        '<div class="ms-acts"><button type="button" class="lb-btn" id="msNote">Salva nelle note</button><button type="button" class="lb-btn" id="msCopy">Copia</button></div>' +
      '</div>';
    var nd = $('msNeed'); if (nd && !calm) { nd.classList.remove('xl-bump'); void nd.offsetWidth; nd.classList.add('xl-bump'); }
    $('msUse').onclick = function () { XL.setDose(dose, true); XL.toast('Dose ×' + it(dose, 2) + ' nel Laboratorio'); XL.open(r, 'lab'); };
    $('msCook').onclick = function () { try { openCucina(r, dose); } catch (e) {} };
    $('msRound').onchange = function () { s.round = this.checked; save(r, s); paintResult(); };
    var text = function () {
      var d = new Date(), ds = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
      return '[Stampi ' + ds + '] ' + C.rows.map(function (R) { return (R.V.n > 1 ? R.V.n + '× ' : '') + R.V.label; }).join(' + ') + ' (densità ' + it(C.dens, 2) + (C.waste ? ', scarto ' + it(C.waste * 100, 0) + '%' : '') + ') → ' + gfmt(C.need) + ', dose ×' + it(dose, 2) + '.';
    };
    $('msNote').onclick = function () { if (XL.addNotes && XL.addNotes(r, [text()])) XL.toast('Salvato nelle note della ricetta'); };
    $('msCopy').onclick = function () {
      var t = text() + '\n' + ings.map(function (g) { var v = g[1] == null ? null : g[1] * dose; return '- ' + g[0] + ': ' + qTxt(s.round ? roundQ(v, g[2]) : v, g[2]); }).join('\n');
      try { navigator.clipboard.writeText(t); XL.toast('Copiato'); } catch (e) { prompt('Copia', t); }
    };
  }
  XL.renderMolds = render;
  XL.molds = { compute: compute, rowVolume: rowVolume, roundQ: roundQ, densityOf: densityOf };
})();
