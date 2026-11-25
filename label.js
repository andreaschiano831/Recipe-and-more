/* label.js — etichetta per la vetrina (Reg. UE 1169/2011).
   Denominazione, ingredienti in ordine di peso decrescente con gli allergeni in grassetto,
   «può contenere tracce», peso netto, lotto, data, conservazione, produttore e tabella
   nutrizionale per 100 g (dai calcoli della ricetta, con il calo di cottura se impostato).
   Anteprima dal vivo e stampa su A4 in più copie, con i segni di taglio. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function it(v, d) { var p = Math.pow(10, d || 0); return (Math.round(v * p) / p).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: d || 0 }); }
  function grams(g) { try { return rcGrams(g[1], g[2], g[0]); } catch (e) { var q = num(g[1]); return q; } }
  function low(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var TAG = { glutine: 'glutine', latte: 'latte', uova: 'uova', frutta_guscio: 'frutta a guscio', arachidi: 'arachidi', soia: 'soia', sesamo: 'sesamo', pesce: 'pesce', crostacei: 'crostacei', molluschi: 'molluschi', sedano: 'sedano', senape: 'senape', solfiti: 'anidride solforosa e solfiti', lupini: 'lupini' };
  var KEEP = ['Conservare in frigorifero a 0–4 °C', 'Conservare in congelatore a −18 °C', 'Conservare in luogo fresco e asciutto', 'Conservare in vetrina refrigerata, consumare in giornata'];
  var FMT = { std: { t: 'Etichetta 92 × 64 mm', w: 92, h: 64, c: 2, r: 4 }, sm: { t: 'Cartellino 85 × 54 mm', w: 85, h: 54, c: 2, r: 5 }, big: { t: 'Grande A6 · 105 × 140 mm', w: 95, h: 136, c: 2, r: 2 } };
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.6"/></svg>';

  function prefs() { try { return JSON.parse(localStorage.getItem('lbl_pref') || '{}') || {}; } catch (e) { return {}; } }
  function savePrefs(p) { try { localStorage.setItem('lbl_pref', JSON.stringify(p)); } catch (e) {} }
  function nuPrefs(r) { try { return JSON.parse(localStorage.getItem('nu_' + (r._id || r.n)) || '{}') || {}; } catch (e) { return {}; } }
  function lot() { var d = new Date(); return 'L' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
  function plus(days) { var d = new Date(Date.now() + days * 864e5); return d.toISOString().slice(0, 10); }
  function itDate(s) { var p = String(s || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }

  /* ── contenuto dell'etichetta ── */
  function ingredients(r) {
    var L = (r.i || []).map(function (g, i) { return { g: g, w: grams(g) || 0, i: i }; }).filter(function (x) { return String(x.g[0] || '').trim(); });
    L.sort(function (a, b) { return b.w - a.w || a.i - b.i; });
    var conf = (r.alg || []).slice(), used = {}, rem = r.algNo || [];
    var parts = L.map(function (x) {
      var name = String(x.g[0]).trim().replace(/\s+/g, ' '), D = { on: [] };
      try { D = NUT.detect({ i: [x.g] }); } catch (e) {}
      var on = D.on.filter(function (k) { return rem.indexOf(k) < 0; });
      if (!on.length) return esc(name.toLowerCase());
      on.forEach(function (k) { used[k] = 1; });
      var ln = low(name), inName = on.every(function (k) { return ln.indexOf(low(TAG[k]).split(' ')[0]) >= 0; });
      return inName ? '<b>' + esc(name.toUpperCase()) + '</b>' : esc(name.toLowerCase()) + ' (<b>' + on.map(function (k) { return TAG[k].toUpperCase(); }).join(', ') + '</b>)';
    });
    var extra = conf.filter(function (k) { return !used[k] && TAG[k]; });
    var may = []; try { may = NUT.detect(r).may.filter(function (k) { return !used[k] && conf.indexOf(k) < 0; }); } catch (e) {}
    return { html: parts.join(', '), extra: extra, may: may };
  }
  function nutrition(r) {
    if (!window.NUT || !NUT.analyze) return null;
    var A = NUT.analyze(r); if (!A.known || A.cov < 0.6) return null;
    var loss = Math.max(0, Math.min(80, +(nuPrefs(r).loss) || 0)), k = function (i) { return A.sum[i] / A.known * 100 / (1 - loss / 100); };
    var v = { kcal: k(0), prot: k(1), carb: k(2), sug: k(3), fat: k(4), sat: k(5), fib: k(6), salt: k(7) };
    var f = function (x, salt) { if (salt) return x < 0.01 ? '0' : x < 1 ? it(x, 2) : it(x, 1); return x < 0.5 ? (x < 0.05 ? '0' : '<0,5') : x < 10 ? it(x, 1) : it(x, 0); };
    return { rows: [['Energia', it(v.kcal * 4.184, 0) + ' kJ / ' + it(v.kcal, 0) + ' kcal'], ['Grassi', f(v.fat) + ' g'], ['di cui acidi grassi saturi', f(v.sat) + ' g', 1], ['Carboidrati', f(v.carb) + ' g'], ['di cui zuccheri', f(v.sug) + ' g', 1], ['Fibre', f(v.fib) + ' g'], ['Proteine', f(v.prot) + ' g'], ['Sale', f(v.salt, true) + ' g']], loss: loss, cov: A.cov };
  }
  function total(r, d) { var t = 0; (r.i || []).forEach(function (g) { var w = grams(g); if (w > 0) t += w; }); var loss = +(nuPrefs(r).loss) || 0; return t * (d || 1) * (1 - loss / 100); }
  function labelHTML(r, o) {
    var I = ingredients(r), N = o.nut ? nutrition(r) : null, brand = (window.WL && WL.brand && WL.brand().name) || '';
    return '<div class="lbx">' +
      (brand ? '<div class="lbx-br">' + esc(brand) + '</div>' : '') +
      '<div class="lbx-n">' + esc(o.name || r.n) + '</div>' +
      '<p class="lbx-i"><span>Ingredienti:</span> ' + I.html + (I.extra.length ? '. Contiene: <b>' + I.extra.map(function (k) { return TAG[k].toUpperCase(); }).join(', ') + '</b>' : '') + '.</p>' +
      (o.may && I.may.length ? '<p class="lbx-m">Può contenere tracce di ' + I.may.map(function (k) { return TAG[k]; }).join(', ') + '.</p>' : '') +
      '<div class="lbx-d">' +
        (o.net ? '<span><small>Peso netto</small><b>' + esc(o.net) + ' g</b></span>' : '') +
        (o.date ? '<span><small>' + (o.tmc ? 'Da consumarsi preferibilmente entro' : 'Da consumarsi entro') + '</small><b>' + esc(itDate(o.date)) + '</b></span>' : '') +
        (o.lot ? '<span><small>Lotto</small><b>' + esc(o.lot) + '</b></span>' : '') +
        (o.price ? '<span><small>Prezzo</small><b>€ ' + esc(o.price) + '</b></span>' : '') +
      '</div>' +
      (o.keep ? '<p class="lbx-k">' + esc(o.keep) + '.</p>' : '') +
      (N ? '<table class="lbx-t"><thead><tr><th colspan="2">Valori nutrizionali medi per 100 g</th><th colspan="2">Energia ' + N.rows[0][1] + '</th></tr></thead><tbody>' +
        [[1, 2], [3, 4], [5, 6], [7, null]].map(function (p2) { var a = N.rows[p2[0]], b = p2[1] != null ? N.rows[p2[1]] : null; return '<tr><td>' + a[0] + '</td><td>' + a[1] + '</td><td class="' + (b && b[2] ? 's' : '') + '">' + (b ? b[0] : '') + '</td><td>' + (b ? b[1] : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      (o.prod ? '<p class="lbx-p">Prodotto da ' + esc(o.prod) + '</p>' : '') +
      '</div>';
  }
  var LBX_CSS = function (p) {
    return p + '.lbx{box-sizing:border-box;width:100%;height:100%;overflow:hidden;padding:3mm 3.5mm;font-family:"DM Sans",Arial,sans-serif;color:#111;font-size:6.6pt;line-height:1.28;display:flex;flex-direction:column;gap:1.2mm;background:#fff}' +
      p + '.lbx-br{font-size:5.6pt;letter-spacing:.18em;text-transform:uppercase;color:#8B6914;font-weight:600}' +
      p + '.lbx-n{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:13pt;line-height:1.05;color:#1a1410}' +
      p + '.lbx-i,' + p + '.lbx-m,' + p + '.lbx-k,' + p + '.lbx-p{margin:0}' + p + '.lbx-i span{font-weight:700}' + p + '.lbx-m{font-style:italic}' +
      p + '.lbx-d{display:flex;flex-wrap:wrap;gap:1mm 3.5mm;border-top:.25mm solid #C4933A;border-bottom:.25mm solid #C4933A;padding:1mm 0}' +
      p + '.lbx-d span{display:flex;flex-direction:column}' + p + '.lbx-d small{font-size:5pt;text-transform:uppercase;letter-spacing:.06em;color:#666}' + p + '.lbx-d b{font-size:7.4pt}' +
      p + '.lbx-t{width:100%;border-collapse:collapse;font-size:5.7pt;table-layout:auto}' + p + '.lbx-t th{text-align:left;font-weight:700;border-bottom:.25mm solid #111;padding:.3mm 0}' + p + '.lbx-t th+th{text-align:right}' +
      p + '.lbx-t td{padding:.15mm .6mm .15mm 0;border-bottom:.1mm solid #ddd;white-space:nowrap}' + p + '.lbx-t td:nth-child(2),' + p + '.lbx-t td:nth-child(4){text-align:right;font-weight:600}' + p + '.lbx-t td:nth-child(2){padding-right:2.5mm}' + p + '.lbx-t td.s{padding-left:1mm}' +
      p + '.lbx-p{font-size:5.6pt;color:#444;margin-top:auto}';
  };

  /* ── foglio ── */
  var S = null;
  function open(r, d) {
    if (!r) return;
    var P = prefs(), tot = Math.round(total(r, d));
    S = { r: r, d: d || 1, o: { name: r.n, net: tot ? String(tot) : '', date: plus(P.days != null ? P.days : 3), days: P.days != null ? P.days : 3, tmc: !!P.tmc, lot: lot(), keep: P.keep != null ? P.keep : KEEP[0], prod: P.prod || ((window.WL && WL.brand && WL.brand().name) || ''), price: '', nut: P.nut !== false, may: P.may !== false }, fmt: P.fmt || 'std', n: P.n || 8 };
    var old = $('lbBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'lbBg'; bg.className = 'lb2-bg';
    bg.innerHTML = '<div class="lb2-sheet" role="dialog" aria-modal="true" aria-labelledby="lb2T"><span class="lb2-grab"></span><div id="lb2In"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick); bg.addEventListener('input', onInput); bg.addEventListener('change', onInput);
    paint(); requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('lbBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'lbBgOut'; setTimeout(function () { bg.remove(); }, 250); }
  function paint() {
    var o = S.o, F = FMT[S.fmt], N = nutrition(S.r);
    $('lb2In').innerHTML =
      '<header class="lb2-hd"><div><span class="lb2-k">Etichetta per la vetrina</span><h3 id="lb2T">' + esc(S.r.n) + '</h3></div><button type="button" class="lb2-x" data-x aria-label="Chiudi">×</button></header>' +
      '<div class="lb2-grid"><div class="lb2-prev"><div class="lb2-paper" id="lb2Paper" style="--w:' + F.w + ';--h:' + F.h + '"><div class="lb2-lab" id="lb2Lab"></div></div><p class="lb2-warn" id="lb2Warn" hidden>Il testo non entra tutto: scegli un formato più grande o togli la tabella nutrizionale.</p>' +
        (!N && o.nut ? '<p class="lb2-note">Tabella nutrizionale non disponibile: troppi ingredienti senza dati (servono almeno il 60%).</p>' : '') + '</div>' +
      '<div class="lb2-form">' +
        '<label class="lb2-f"><span>Denominazione</span><input data-f="name" value="' + esc(o.name) + '"></label>' +
        '<div class="lb2-two"><label class="lb2-f"><span>Peso netto (g)</span><input data-f="net" inputmode="decimal" value="' + esc(o.net) + '"></label><label class="lb2-f"><span>Lotto</span><input data-f="lot" value="' + esc(o.lot) + '"></label></div>' +
        '<div class="lb2-two"><label class="lb2-f"><span>' + (o.tmc ? 'Preferibilmente entro' : 'Da consumarsi entro') + '</span><input type="date" data-f="date" value="' + esc(o.date) + '"></label><label class="lb2-f"><span>Prezzo (€)</span><input data-f="price" inputmode="decimal" value="' + esc(o.price) + '" placeholder="facoltativo"></label></div>' +
        '<div class="lb2-days">' + [1, 2, 3, 5, 7, 30].map(function (x) { return '<button type="button" data-days="' + x + '" class="' + (o.days === x ? 'on' : '') + '">+' + x + (x === 1 ? ' giorno' : ' gg') + '</button>'; }).join('') + '</div>' +
        '<label class="lb2-sw"><span>Data «preferibilmente» (TMC) per prodotti stabili</span><input type="checkbox" data-c="tmc"' + (o.tmc ? ' checked' : '') + '><i></i></label>' +
        '<label class="lb2-f"><span>Conservazione</span><select data-f="keep">' + KEEP.concat(KEEP.indexOf(o.keep) < 0 && o.keep ? [o.keep] : []).map(function (k) { return '<option' + (k === o.keep ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '<option value="">Nessuna indicazione</option></select></label>' +
        '<label class="lb2-f"><span>Prodotto da (nome e indirizzo)</span><input data-f="prod" value="' + esc(o.prod) + '" placeholder="Pasticceria Rossi, via Roma 1, Milano"></label>' +
        '<label class="lb2-sw"><span>Tabella nutrizionale per 100 g</span><input type="checkbox" data-c="nut"' + (o.nut ? ' checked' : '') + '><i></i></label>' +
        '<label class="lb2-sw"><span>«Può contenere tracce di…»</span><input type="checkbox" data-c="may"' + (o.may ? ' checked' : '') + '><i></i></label>' +
        '<div class="lb2-fmt">' + Object.keys(FMT).map(function (k) { return '<button type="button" data-fmt="' + k + '" class="' + (S.fmt === k ? 'on' : '') + '">' + FMT[k].t + '</button>'; }).join('') + '</div>' +
        '<div class="lb2-two"><label class="lb2-f"><span>Copie</span><input data-f="n" type="number" min="1" max="60" value="' + S.n + '"></label><span class="lb2-pp">' + F.c * F.r + ' per foglio A4</span></div>' +
        '<div class="lb2-acts"><button type="button" class="lb2-b dark" data-a="print">Stampa ' + S.n + (S.n === 1 ? ' etichetta' : ' etichette') + '</button><button type="button" class="lb2-b" data-a="copy">Copia il testo</button></div>' +
        '<p class="lb2-note">Gli allergeni sono riconosciuti dagli ingredienti e da quelli confermati nella ricetta: controlla sempre prima di esporre il prodotto. Ingredienti composti (es. pralinato, biscotto) vanno dettagliati nel nome.</p>' +
      '</div></div>';
    preview();
  }
  function preview() {
    var lab = $('lb2Lab'); if (!lab) return; var F = FMT[S.fmt];
    lab.innerHTML = '<style>' + LBX_CSS('#lb2Lab ') + '</style>' + labelHTML(S.r, S.o);
    var paper = $('lb2Paper'), avail = Math.max(200, (paper.parentNode.clientWidth || 320) - 32), k = Math.min(1.6, avail / (F.w * 3.78));
    paper.style.width = F.w * 3.78 * k + 'px'; paper.style.height = F.h * 3.78 * k + 'px';
    lab.style.width = F.w * 3.78 + 'px'; lab.style.height = F.h * 3.78 + 'px'; lab.style.transform = 'scale(' + k + ')';
    var x = lab.querySelector('.lbx'); $('lb2Warn').hidden = !(x && x.scrollHeight > x.clientHeight + 2);
  }
  function onInput(e) {
    var t = e.target;
    if (t.dataset.f) { if (t.dataset.f === 'n') S.n = Math.max(1, Math.min(60, parseInt(t.value, 10) || 1)); else S.o[t.dataset.f] = t.value; if (t.dataset.f === 'keep' || t.dataset.f === 'prod') store(); if (e.type === 'change' && (t.dataset.f === 'n' || t.tagName === 'SELECT')) return paint(); return preview(); }
    if (t.dataset.c) { S.o[t.dataset.c] = t.checked; store(); return paint(); }
  }
  function store() { var P = prefs(); P.keep = S.o.keep; P.prod = S.o.prod; P.nut = S.o.nut; P.may = S.o.may; P.tmc = S.o.tmc; P.days = S.o.days; P.fmt = S.fmt; P.n = S.n; savePrefs(P); }
  function onClick(e) {
    var bg = $('lbBg'); if (!bg) return;
    if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.days) { S.o.days = +b.dataset.days; S.o.date = plus(S.o.days); store(); return paint(); }
    if (b.dataset.fmt) { S.fmt = b.dataset.fmt; var F = FMT[S.fmt]; if (S.n % (F.c * F.r) && S.n < F.c * F.r) S.n = F.c * F.r; store(); return paint(); }
    if (b.dataset.a === 'copy') {
      var tmp = document.createElement('div'); tmp.innerHTML = labelHTML(S.r, S.o);
      var txt = [].map.call(tmp.querySelectorAll('.lbx > *'), function (n) { return n.tagName === 'TABLE' ? [].map.call(n.querySelectorAll('tr'), function (tr) { return [].map.call(tr.children, function (c) { return c.textContent; }).join(': '); }).join('\n') : n.textContent.replace(/\s+/g, ' ').trim(); }).join('\n');
      try { navigator.clipboard.writeText(txt).then(function () { if (window.XL && XL.toast) XL.toast('Testo dell’etichetta copiato'); }, function () { prompt('Copia', txt); }); } catch (x) { prompt('Copia', txt); }
      return;
    }
    if (b.dataset.a === 'print') {
      store(); var F2 = FMT[S.fmt], one = labelHTML(S.r, S.o), per = F2.c * F2.r, pages = Math.ceil(S.n / per), html = '';
      for (var pgi = 0; pgi < pages; pgi++) { html += '<div class="lbp-page">'; for (var j = 0; j < per && pgi * per + j < S.n; j++) html += '<div class="lbp-cell">' + one + '</div>'; html += '</div>'; }
      var css = '@page{size:A4;margin:8mm}' + LBX_CSS('#printArea ') + '#printArea .lbp-page{display:grid;grid-template-columns:repeat(' + F2.c + ',' + F2.w + 'mm);grid-auto-rows:' + F2.h + 'mm;gap:3mm;justify-content:center;page-break-after:always;break-after:page}#printArea .lbp-page:last-child{page-break-after:auto;break-after:auto}#printArea .lbp-cell{width:' + F2.w + 'mm;height:' + F2.h + 'mm;outline:.2mm dashed #bbb;overflow:hidden}';
      close(); if (window.RSH && RSH.print) RSH.print(html, css);
    }
  }
  var item = { k: 'label', icon: ICON, label: 'Etichetta vetrina', t: 'Etichetta per la vetrina', s: 'Ingredienti, allergeni, valori nutrizionali, scadenza', run: function (r, d) { open(r, d); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(item);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(item);
  window.LBL = { open: open, html: labelHTML, ingredients: ingredients, nutrition: nutrition };

  var css = document.createElement('style');
  css.textContent = [
    '.lb2-bg{position:fixed;inset:0;z-index:9300;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,13,10,0);transition:background .24s}.lb2-bg.on{background:rgba(15,13,10,.42)}',
    '.lb2-sheet{width:100%;max-width:920px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 20px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.lb2-bg.on .lb2-sheet{transform:none}@media(min-width:760px){.lb2-bg{align-items:center}.lb2-sheet{border-radius:24px;opacity:0;transform:translateY(14px);transition:transform .25s,opacity .2s}.lb2-bg.on .lb2-sheet{opacity:1}}',
    '.lb2-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.lb2-hd{display:flex;justify-content:space-between;gap:10px;margin-bottom:12px}.lb2-k{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}.lb2-hd h3{margin:4px 0 0;font:500 1.5rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.lb2-x{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:20px;cursor:pointer}',
    '.lb2-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}@media(min-width:760px){.lb2-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);align-items:start}.lb2-prev{position:sticky;top:0}}',
    '.lb2-prev{padding:16px;border-radius:18px;background:repeating-linear-gradient(45deg,var(--ctrl,#eee) 0 10px,transparent 10px 20px),var(--bg2,#f4f1ea);display:flex;flex-direction:column;align-items:center}',
    '.lb2-paper{position:relative;overflow:hidden;border-radius:4px;box-shadow:0 10px 30px -12px rgba(0,0,0,.4),0 0 0 1px rgba(0,0,0,.06);background:#fff}',
    '.lb2-lab{position:absolute;left:0;top:0;transform-origin:0 0}',
    '.lb2-warn{margin:10px 0 0;padding:8px 10px;border-radius:10px;background:rgba(214,120,30,.14);font-size:.78rem;color:var(--ink)}.lb2-note{margin:8px 0 0;font-size:.74rem;line-height:1.45;color:var(--smoke)}',
    '.lb2-form{display:flex;flex-direction:column;gap:10px}.lb2-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:end}',
    '.lb2-f{display:flex;flex-direction:column;gap:4px;min-width:0}.lb2-f span{font:600 .74rem "DM Sans",sans-serif;color:var(--smoke)}',
    '.lb2-f input,.lb2-f select{height:42px;min-width:0;padding:0 11px;border-radius:11px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:400 15px "DM Sans",sans-serif}',
    '.lb2-days,.lb2-fmt{display:flex;flex-wrap:wrap;gap:6px}.lb2-days button,.lb2-fmt button{height:34px;padding:0 11px;border-radius:99px;border:1px solid var(--cb);background:none;color:var(--ink2);font:600 .8rem "DM Sans",sans-serif;cursor:pointer}.lb2-days button.on,.lb2-fmt button.on{background:var(--ink);color:var(--bg);border-color:transparent}',
    '.lb2-sw{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.88rem;color:var(--ink2);cursor:pointer}.lb2-sw input{position:absolute;opacity:0;pointer-events:none}',
    '.lb2-sw i{flex-shrink:0;position:relative;width:42px;height:26px;border-radius:99px;background:var(--cb);transition:background .2s}.lb2-sw i::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}.lb2-sw input:checked+i{background:var(--ok,#3F8F4A)}.lb2-sw input:checked+i::after{transform:translateX(16px)}',
    '.lb2-pp{font-size:.78rem;color:var(--smoke);padding-bottom:12px}',
    '.lb2-acts{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px}.lb2-b{height:50px;border-radius:15px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 .95rem "DM Sans",sans-serif;cursor:pointer}.lb2-b.dark{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}'
  ].join('\n');
  document.head.appendChild(css);
})();
