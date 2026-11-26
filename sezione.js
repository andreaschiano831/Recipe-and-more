/* sezione.js — Sezione del dolce disegnata.
   Le ricette dello stesso piatto diventano gli strati di un entremets o di una monoporzione:
   base in fondo, inserti al centro (più stretti, avvolti dalla mousse), mousse che riempie, copertura sopra.
   Scegli lo stampo (cerchio o rettangolo, altezza, quanti pezzi) e le altezze: calcola i grammi per strato
   con la densità di ciascuna preparazione e la dose di ogni ricetta. Il disegno è in scala. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function it(n, d) { var p = Math.pow(10, d || 0); return (Math.round(n * p) / p).toLocaleString('it-IT'); }
  function gfmt(g) { return g >= 1000 ? it(g / 1000, 2) + ' kg' : it(g, g < 20 ? 1 : 0) + ' g'; }
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }); }
  function pk(s) { return String(s || '').trim().toLowerCase(); }
  function group(r) { var p = pk(r && r.piatto); return p ? recs().filter(function (x) { return pk(x.piatto) === p; }) : []; }
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19h18"/><path d="M4 19v-4h16v4"/><path d="M6 15v-4h12v4"/><path d="M4 11V8a8 3 0 0 1 16 0v3z"/></svg>';

  /* ── ruolo di ogni preparazione nella sezione ── */
  var KINDS = [['base', 'Base'], ['insert', 'Inserto'], ['fill', 'Mousse'], ['top', 'Copertura']];
  function kindOf(r) {
    var t = (String(r.n || '') + ' ' + String(r.c || '')).toLowerCase();
    if (/glass|gla[cç]|nappag|specchio|velluto|spray|lucid|mirror/.test(t)) return 'top';
    if (/mousse|bavares|bavarois|semifredd|chantilly|montat|parfait/.test(t)) return 'fill';
    if (/biscuit|biscott|frolla|sabl|pan di spagna|g[ée]noise|dacquois|joconde|croccant|streusel|crumble|feuillet|pralin|base|pasta|financier|brownie|savoiard|cake/.test(t)) return 'base';
    return 'insert';
  }
  function defH(r, k) {
    var t = String(r.n || '').toLowerCase();
    if (k === 'top') return 2;
    if (k === 'base') return /frolla|sabl|feuillet|croccant|pralin/.test(t) ? 4 : 8;
    if (k === 'insert') return /gel[ée]e|gelatin|confit|compost|coulis/.test(t) ? 8 : 12;
    return 15;
  }
  var DENS = { base: 0.45, insert: 1.08, fill: 0.62, top: 1.25 };
  function densOf(r, k) {
    try { var M = XL.molds, g = M.densGuess(r), d = M.DENS.filter(function (x) { return x[0] === g; })[0]; if (d && !(k === 'top' && g === 'liq')) return /frolla|sabl/.test(String(r.n).toLowerCase()) ? 1.2 : d[2]; } catch (e) {}
    return DENS[k];
  }
  function color(r, k) {
    var t = (String(r.n || '') + ' ' + (r.i || []).map(function (g) { return g[0]; }).join(' ')).toLowerCase();
    if (/ross[oa]\b|lampon|fragol|frutti rossi|ciliegi|amaren|ribes|mirtill/.test(t) && k !== 'base') return '#b8455a';
    if (/passion|mango|limone|yuzu|albicocc|arancia|pesca/.test(t) && k !== 'base') return '#e0a93b';
    if (/pistacch|matcha|basilico|mela verde/.test(t) && k !== 'base') return '#8fa35a';
    if (/caff|fondente|cacao|cioccolato fondente|gianduia|nocciol/.test(t)) return k === 'top' ? '#3d261d' : k === 'base' ? '#5b3b2c' : '#7a5240';
    if (/caramell|toffee|mou\b|dulce/.test(t)) return '#b7773a';
    if (k === 'base') return '#c9945f';
    if (k === 'top') return '#d8b27a';
    if (k === 'fill') return '#f2e6cf';
    return '#e9cf9a';
  }

  /* ── stato per piatto (sul dispositivo) ── */
  function skey(p) { return 'sez:' + pk(p); }
  function load(r) {
    var L = group(r), s = null; try { s = JSON.parse(localStorage.getItem(skey(r.piatto)) || 'null'); } catch (e) {}
    s = s || { sh: 'ring', d: 18, l: 30, w: 10, hm: 45, n: 1, mg: 10, waste: 5, lay: [] };
    var known = {}; s.lay = s.lay.filter(function (x) { var ok = L.some(function (r2) { return r2.n === x.n; }); if (ok) known[x.n] = 1; return ok; });
    var fresh = L.filter(function (r2) { return !known[r2.n]; }).map(function (r2) { var k = kindOf(r2); return { n: r2.n, k: k, h: defH(r2, k), on: true }; });
    if (fresh.length) { var ord = { base: 0, insert: 1, fill: 2, top: 3 }; s.lay = s.lay.concat(fresh).sort(function (a, b) { return ord[a.k] - ord[b.k]; }); }
    return s;
  }
  function save() { try { localStorage.setItem(skey(S.p), JSON.stringify(S.s)); } catch (e) {} }

  /* ── calcolo ── */
  function areas(s) {
    var m = num(s.mg) / 10;
    if (s.sh === 'rect') { var l = num(s.l), w = num(s.w); return { A: l * w, Ai: Math.max(0, l - 2 * m) * Math.max(0, w - 2 * m) }; }
    var d = num(s.d), di = Math.max(0, d - 2 * m); return { A: Math.PI * d * d / 4, Ai: Math.PI * di * di / 4 };
  }
  function compute() {
    var s = S.s, Ar = areas(s), n = Math.max(1, Math.round(num(s.n)) || 1), waste = 1 + Math.max(0, Math.min(40, num(s.waste))) / 100;
    var on = s.lay.filter(function (x) { return x.on; }), fills = on.filter(function (x) { return x.k === 'fill'; }), filler = fills[0] || null;
    var fixed = on.filter(function (x) { return x !== filler && x.k !== 'insert'; }).reduce(function (a, x) { return a + num(x.h); }, 0);
    var ins = on.filter(function (x) { return x.k === 'insert'; }), insH = ins.reduce(function (a, x) { return a + num(x.h); }, 0);
    var fillH = filler ? num(s.hm) - fixed : 0;
    var rows = s.lay.map(function (x) {
      var r = recs().filter(function (q) { return q.n === x.n; })[0], vol = 0, h = num(x.h);
      if (x.on) {
        if (x === filler) { h = fillH; vol = Ar.A * fillH / 10 - ins.reduce(function (a, y) { return a + Ar.Ai * num(y.h) / 10; }, 0); }
        else vol = (x.k === 'insert' ? Ar.Ai : Ar.A) * h / 10;
      }
      var dens = r ? densOf(r, x.k) : 1, g = Math.max(0, vol) * dens * n * waste, tot = 0;
      try { tot = rcAnalyze(r.i || []).tot; } catch (e) {}
      return { x: x, r: r, h: h, vol: vol, dens: dens, g: g, tot: tot, dose: tot ? g / tot : 0, auto: x === filler };
    });
    var warn = '';
    if (filler && fillH < insH + 4) warn = 'Lo stampo è troppo basso: la mousse non copre gli inserti. Alza lo stampo o abbassa gli strati.';
    else if (!filler && on.length) { var tot = on.reduce(function (a, x) { return a + (x.k === 'insert' ? 0 : num(x.h)); }, 0) + insH; if (tot > num(s.hm) + 0.5) warn = 'Gli strati superano l\'altezza dello stampo (' + it(tot, 0) + ' mm su ' + it(num(s.hm), 0) + ' mm).'; }
    if (Ar.Ai <= 0 && ins.length) warn = 'Il margine dell\'inserto è più grande dello stampo.';
    return { rows: rows, filler: filler, fillH: fillH, insH: insH, n: n, Ar: Ar, warn: warn, total: rows.reduce(function (a, b) { return a + b.g; }, 0) };
  }

  /* ── disegno in scala ── */
  function svg(C) {
    var s = S.s, W = 410, mx = 32, mw = 210, Hm = Math.max(10, num(s.hm)), ppm = Math.min(3.4, 190 / Hm), H = Hm * ppm, top = 18, bot = top + H, insetPx = Math.min(mw / 2 - 6, num(s.mg) * (mw / ((s.sh === 'rect' ? num(s.l) : num(s.d)) * 10 || 1)));
    var shapes = '', labels = [], y = bot, fillRow = C.rows.filter(function (r) { return r.auto; })[0];
    var on = C.rows.filter(function (r) { return r.x.on; }), bases = on.filter(function (r) { return r.x.k === 'base' || (r.x.k === 'fill' && !r.auto); }), tops = on.filter(function (r) { return r.x.k === 'top'; }), ins = on.filter(function (r) { return r.x.k === 'insert'; });
    function rect(x, yy, w, h, r, row) {
      var c = color(row.r || {}, row.x.k);
      shapes += '<rect x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" rx="' + r + '" fill="' + c + '" stroke="rgba(0,0,0,.14)" stroke-width=".8"/>';
      if (row.x.k === 'base') { for (var k = 0; k < Math.min(26, w / 9); k++) { var px = x + 6 + (k * 37) % Math.max(8, w - 12), py = yy + 2 + ((k * 13) % Math.max(2, h - 4)); shapes += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (k % 3 ? .9 : 1.4) + '" fill="rgba(0,0,0,.16)"/>'; } }
      labels.push({ y: yy + h / 2, row: row, x: x + w });
    }
    bases.forEach(function (r) { var h = num(r.x.h) * ppm; y -= h; rect(mx, y, mw, h, 1.5, r); });
    var topY = top; tops.slice().reverse().forEach(function (r) { var h = Math.max(2, num(r.x.h) * ppm); rect(mx, topY, mw, h, 1.5, r); topY += h; });
    if (fillRow) {
      var fh = Math.max(0, y - topY); if (fh > 0) rect(mx, topY, mw, fh, 1.5, fillRow);
      var ih = ins.reduce(function (a, r) { return a + num(r.x.h) * ppm; }, 0), iy = topY + Math.max(0, (fh - ih) / 2) + ih;
      ins.forEach(function (r) { var h = num(r.x.h) * ppm; iy -= h; rect(mx + insetPx, iy, mw - 2 * insetPx, h, 3, r); });
      if (ins.length && iy - topY > 6) labels.forEach(function (l) { if (l.row === fillRow) l.y = topY + (iy - topY) / 2; });
    } else ins.forEach(function (r) { var h = num(r.x.h) * ppm; y -= h; rect(mx + insetPx, y, mw - 2 * insetPx, h, 3, r); });
    /* etichette senza sovrapposizioni */
    labels.sort(function (a, b) { return a.y - b.y; });
    var gap = 34, minY = 14, maxY = bot + 4;
    labels.forEach(function (l, i) { l.ly = Math.max(l.y, i ? labels[i - 1].ly + gap : minY); });
    var over = labels.length ? labels[labels.length - 1].ly - maxY : 0; if (over > 0) labels.forEach(function (l) { l.ly -= over; }); labels.forEach(function (l, i) { if (i && l.ly < labels[i - 1].ly + gap) l.ly = labels[i - 1].ly + gap; });
    var lx = mx + mw + 30, txt = '';
    labels.forEach(function (l) {
      var R = l.row, name = R.x.n.length > 24 ? R.x.n.slice(0, 23) + '…' : R.x.n;
      txt += '<path d="M' + (l.x - 6).toFixed(1) + ' ' + l.y.toFixed(1) + 'H' + (lx - 14) + 'L' + (lx - 4) + ' ' + l.ly.toFixed(1) + '" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width=".8"/><circle cx="' + (l.x - 6).toFixed(1) + '" cy="' + l.y.toFixed(1) + '" r="1.8" fill="currentColor" fill-opacity=".55"/>' +
        '<text x="' + lx + '" y="' + (l.ly - 2).toFixed(1) + '" font-size="12" font-weight="600" fill="currentColor">' + esc(name) + '</text>' +
        '<text x="' + lx + '" y="' + (l.ly + 12).toFixed(1) + '" font-size="10.5" fill="currentColor" fill-opacity=".6">' + it(R.h, R.h < 10 ? 1 : 0) + ' mm · ' + esc(gfmt(R.g)) + '</text>';
    });
    var dim = '<path d="M' + (mx - 9) + ' ' + top + 'V' + bot.toFixed(1) + 'M' + (mx - 12) + ' ' + top + 'h6M' + (mx - 12) + ' ' + bot.toFixed(1) + 'h6" stroke="currentColor" stroke-opacity=".4" stroke-width=".8" fill="none"/>' +
      '<text x="' + (mx - 16) + '" y="' + ((top + bot) / 2).toFixed(1) + '" font-size="10" fill="currentColor" fill-opacity=".55" text-anchor="middle" transform="rotate(-90 ' + (mx - 16) + ' ' + ((top + bot) / 2).toFixed(1) + ')">' + it(Hm, 0) + ' mm</text>' +
      '<path d="M' + mx + ' ' + (bot + 12).toFixed(1) + 'h' + mw + '" stroke="currentColor" stroke-opacity=".4" stroke-width=".8"/><text x="' + (mx + mw / 2) + '" y="' + (bot + 25).toFixed(1) + '" font-size="10.5" fill="currentColor" fill-opacity=".6" text-anchor="middle">' + (s.sh === 'rect' ? it(num(s.l), 1) + ' × ' + it(num(s.w), 1) + ' cm' : 'Ø ' + it(num(s.d), 1) + ' cm') + (C.n > 1 ? ' · ' + C.n + ' pezzi' : '') + '</text>';
    var mold = '<rect x="' + (mx - 1.5) + '" y="' + (top - 4) + '" width="' + (mw + 3) + '" height="' + (H + 5.5).toFixed(1) + '" rx="3" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="1.4" stroke-dasharray="3 3"/>';
    var vh = Math.max(bot + 34, labels.length ? labels[labels.length - 1].ly + 20 : 0);
    return '<svg class="sz-svg" viewBox="0 0 ' + W + ' ' + vh.toFixed(0) + '" role="img" aria-label="Sezione del dolce in scala">' + shapes + mold + dim + txt + '</svg>';
  }

  /* ── interfaccia ── */
  var S = null;
  function open(r) {
    if (!r || !pk(r.piatto)) { try { XL.toast('Assegna la ricetta a un piatto per disegnarne la sezione'); } catch (e) {} return; }
    S = { p: r.piatto, s: load(r) };
    var old = $('szBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'szBg'; bg.className = 'scl-bg';
    bg.innerHTML = '<div class="scl-sheet sz-sheet" role="dialog" aria-modal="true" aria-labelledby="szT"><span class="scl-grab"></span>' +
      '<header class="scl-hd"><div><span class="scl-k">Sezione del dolce</span><h3 id="szT">' + esc(r.piatto) + '</h3></div><button type="button" class="scl-x" data-x aria-label="Chiudi">×</button></header>' +
      '<div id="szBody"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick); bg.addEventListener('input', onInput); bg.addEventListener('change', onInput);
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('szBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'szOut'; setTimeout(function () { bg.remove(); }, 240); }
  function fld(lbl, f, v, u) { return '<label class="sz-f"><span>' + lbl + '</span><span class="sz-in"><input inputmode="decimal" data-s="' + f + '" value="' + esc(String(v).replace('.', ',')) + '"><em>' + u + '</em></span></label>'; }
  function paint() {
    var s = S.s, C = compute();
    var mold = '<div class="sz-mold"><div class="sub-seg sz-sh"><button type="button" data-sh="ring" class="' + (s.sh !== 'rect' ? 'on' : '') + '">Cerchio</button><button type="button" data-sh="rect" class="' + (s.sh === 'rect' ? 'on' : '') + '">Rettangolo</button></div>' +
      '<div class="sz-fs">' + (s.sh === 'rect' ? fld('Lunghezza', 'l', s.l, 'cm') + fld('Larghezza', 'w', s.w, 'cm') : fld('Diametro', 'd', s.d, 'cm')) + fld('Altezza', 'hm', s.hm, 'mm') + fld('Pezzi', 'n', s.n, 'pz') + fld('Margine inserto', 'mg', s.mg, 'mm') + fld('Scarto', 'waste', s.waste, '%') + '</div></div>';
    var rows = C.rows.map(function (R, i) {
      var x = R.x, c = color(R.r || {}, x.k);
      return '<div class="sz-l' + (x.on ? '' : ' off') + '" data-i="' + i + '"><div class="sz-lh"><span class="sz-sw" style="background:' + c + '"></span><b>' + esc(x.n) + '</b>' +
        '<span class="sz-mv"><button type="button" data-up="' + i + '" aria-label="Sposta sopra"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-dn="' + i + '" aria-label="Sposta sotto"' + (i < C.rows.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" data-tg="' + i + '" aria-pressed="' + x.on + '" aria-label="' + (x.on ? 'Togli dalla sezione' : 'Rimetti nella sezione') + '">' + (x.on ? '−' : '+') + '</button></span></div>' +
        (x.on ? '<div class="sz-lb"><div class="sz-kinds">' + KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '" data-li="' + i + '" class="' + (x.k === k[0] ? 'on' : '') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
          '<div class="sz-lv">' + (R.auto ? '<span class="sz-auto">Riempie lo stampo · <b class="mono">' + it(Math.max(0, R.h), 0) + ' mm</b></span>' : '<label class="sz-in sm"><input inputmode="decimal" data-h="' + i + '" value="' + esc(String(x.h).replace('.', ',')) + '" aria-label="Altezza ' + esc(x.n) + '"><em>mm</em></label>') +
          '<span class="sz-g"><b class="mono">' + gfmt(R.g) + '</b>' + (R.tot ? '<small>ricetta ' + gfmt(R.tot) + ' → <b>×' + it(R.dose, 2) + '</b></small>' : '') + '</span>' +
          (R.r && R.tot ? '<button type="button" class="sz-open" data-open="' + i + '">Apri ×' + it(R.dose, 2) + '</button>' : '') + '</div></div>' : '') + '</div>';
    }).join('');
    $('szBody').innerHTML = '<div class="sz-grid"><div class="sz-draw">' + svg(C) + (C.warn ? '<p class="sz-warn">' + esc(C.warn) + '</p>' : '') +
      '<div class="sz-tot"><span>In tutto</span><b class="mono">' + gfmt(C.total) + '</b><small>' + (C.n > 1 ? it(C.total / C.n, 0) + ' g a pezzo · ' : '') + 'scarto ' + it(num(S.s.waste), 0) + '% compreso</small></div></div>' +
      '<div class="sz-side">' + mold + '<div class="sz-ls"><span class="sz-h4">Strati · dal basso</span>' + rows + '</div>' +
      '<p class="sz-note">Base e copertura coprono tutto lo stampo; gli inserti sono più stretti del margine indicato e la prima mousse riempie lo spazio che resta. Grammi calcolati con la densità di ogni preparazione (mousse 0,62 · cremoso 1,1 · biscuit crudo 0,45 g/ml).</p></div></div>';
  }
  function onInput(e) {
    var t = e.target, v = t.value;
    if (t.dataset.s) { S.s[t.dataset.s] = num(v); save(); return repaintKeep(t); }
    if (t.dataset.h != null) { S.s.lay[+t.dataset.h].h = num(v); save(); return repaintKeep(t); }
  }
  function repaintKeep(t) {
    var sel = t.dataset.s ? '[data-s="' + t.dataset.s + '"]' : '[data-h="' + t.dataset.h + '"]', pos = t.selectionStart, sh = document.querySelector('#szBg .scl-sheet'), y = sh.scrollTop;
    clearTimeout(S._t); S._t = setTimeout(function () { paint(); sh.scrollTop = y; var n = document.querySelector('#szBg ' + sel); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }, 280);
  }
  function onClick(e) {
    var bg = $('szBg'); if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var L = S.s.lay, sh = bg.querySelector('.scl-sheet'), y = sh.scrollTop, done = function () { save(); paint(); sh.scrollTop = y; };
    if (b.dataset.sh) { S.s.sh = b.dataset.sh; return done(); }
    if (b.dataset.up != null) { var i = +b.dataset.up; L.splice(i - 1, 0, L.splice(i, 1)[0]); return done(); }
    if (b.dataset.dn != null) { var j = +b.dataset.dn; L.splice(j + 1, 0, L.splice(j, 1)[0]); return done(); }
    if (b.dataset.tg != null) { L[+b.dataset.tg].on = !L[+b.dataset.tg].on; return done(); }
    if (b.dataset.k) { var x = L[+b.dataset.li], r = recs().filter(function (q) { return q.n === x.n; })[0]; x.k = b.dataset.k; if (r) x.h = defH(r, x.k); return done(); }
    if (b.dataset.open != null) {
      var R = compute().rows[+b.dataset.open]; if (!R || !R.r) return;
      close(); setTimeout(function () { try { XL.open(R.r, 'lab'); setTimeout(function () { XL.setDose(Math.round(R.dose * 100) / 100, true); }, 450); } catch (er) {} }, 200);
    }
  }

  var item = { k: 'sezione', icon: ICON, label: 'Sezione del dolce', t: 'Sezione del dolce', s: 'Strati in scala, grammi per strato per il tuo stampo', show: function (r) { return group(r).length > 1; }, run: function (r) { open(r); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(item);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(item);
  window.SEZ = { open: open, openPiatto: function (p) { var r = recs().filter(function (x) { return pk(x.piatto) === pk(p); })[0]; if (r) open(r); }, compute: function () { return compute(); }, calcFor: function (r) { if (!r || !pk(r.piatto)) return null; var keep = S; try { if (!localStorage.getItem(skey(r.piatto))) return null; S = { p: r.piatto, s: load(r) }; return compute(); } finally { S = keep; } }, kindOf: kindOf, icon: ICON, group: group };
  var st = document.createElement('style');
  st.textContent = [
    '.sz-sheet{max-width:980px!important}@media(min-width:900px){.sz-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:26px;align-items:start}.sz-draw{position:sticky;top:0}}',
    '.sz-draw{padding:14px 0 6px}.sz-svg{display:block;width:100%;height:auto;color:var(--ink);font-family:"DM Sans",sans-serif}',
    '.sz-warn{margin:6px 0 0;padding:9px 12px;border-radius:11px;background:color-mix(in srgb,#b3261e 9%,transparent);color:#9b2018;font-size:.84rem}',
    '.sz-tot{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;padding:10px 0;border-top:1px solid var(--cb);margin-top:8px}.sz-tot span{font-size:.82rem;color:var(--smoke)}.sz-tot b{font:700 1.5rem "DM Sans",sans-serif}.sz-tot small{font-size:.8rem;color:var(--ink2)}',
    '.sz-mold{padding:8px 0 12px;border-bottom:1px solid var(--cb)}.sz-sh{margin-top:0!important}',
    '.sz-fs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}',
    '.sz-f{display:flex;flex-direction:column;gap:4px;font-size:.74rem;color:var(--smoke);min-width:0}',
    '.sz-in{display:flex;align-items:center;gap:4px;height:40px;padding:0 10px;border-radius:11px;border:1px solid var(--cb);background:var(--card)}.sz-in input{flex:1;min-width:0;width:100%;border:0!important;background:none!important;color:var(--ink);font:600 16px "DM Sans",sans-serif;outline:none!important;box-shadow:none!important;padding:0!important;height:auto!important;border-radius:0!important}.sz-in em{font-style:normal;font-size:.76rem;color:var(--smoke)}',
    '.sz-in:focus-within{border-color:var(--ink2)}.sz-in.sm{width:92px;flex-shrink:0}',
    '.sz-ls{padding-top:12px}.sz-h4{display:block;font:700 10.5px "DM Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke);margin-bottom:4px}',
    '.sz-l{padding:10px 0;border-bottom:1px solid var(--cb)}.sz-l.off{opacity:.55}.sz-lh{display:flex;align-items:center;gap:9px}.sz-lh b{flex:1;min-width:0;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sz-sw{width:14px;height:14px;border-radius:4px;flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}',
    '.sz-mv{display:flex;gap:4px}.sz-mv button{width:30px;height:30px;border-radius:9px;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:.95rem;cursor:pointer}.sz-mv button:disabled{opacity:.3}',
    '.sz-lb{padding-left:23px}.sz-kinds{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.sz-kinds button{height:28px;padding:0 10px;border-radius:99px;border:1px solid var(--cb);background:none;color:var(--ink2);font:500 .78rem "DM Sans",sans-serif;cursor:pointer}.sz-kinds button.on{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}',
    '.sz-lv{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}.sz-auto{font-size:.84rem;color:var(--ink2)}',
    '.sz-g{display:flex;flex-direction:column;gap:1px;margin-right:auto}.sz-g b{font-size:1.02rem}.sz-g small{font-size:.76rem;color:var(--smoke)}.sz-g small b{font-size:.76rem;color:var(--ink)}',
    '.sz-open{height:34px;padding:0 12px;border-radius:10px;border:1px solid var(--cb);background:none;color:var(--ink);font:600 .8rem "DM Sans",sans-serif;cursor:pointer;white-space:nowrap}',
    '.sz-note{font-size:.78rem;line-height:1.5;color:var(--smoke);margin:12px 0 0}',
    '#app .group-hd .group-sez{margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:99px;border:1px solid var(--cb,rgba(0,0,0,.1));background:var(--card,#fff);color:var(--ink2);font:500 .78rem "DM Sans",sans-serif;cursor:pointer;align-self:center}#app .group-hd .group-sez svg{width:15px;height:15px}'
  ].join('\n');
  document.head.appendChild(st);
})();
