/* shop.js — lista della spesa dalle ricette messe in produzione.
   Somma gli ingredienti di tutte le ricette del foglio del giorno (alle quantità del foglio),
   converte kg/l in g/ml, raggruppa per reparto, si spunta mentre si prepara l'ordine e
   si condivide o stampa. Le spunte restano sul dispositivo, per giorno. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function cap(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function toast(m) { try { if (window.XL && XL.toast) return XL.toast(m); libToast(m, ''); } catch (e) {} }
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/></svg>';

  var GROUPS = [
    ['gel', 'Gelificanti e additivi', /gelatin|agar|pectin|colla di pesce|lievito|bicarbonat|ammoniaca|cremor|carragen|xantan|gomma|lecitin|neutro|stabilizz|alginat|gellan|acido citric|sorbato/],
    ['cho', 'Cioccolato e cacao', /cioccolat|cacao|copertura|gianduia|pralinat|ivoire|caramelia|dulcey|jivara|guanaja|manjari/],
    ['fat', 'Grassi e oli', /\bolio\b|burro di cacao|strutto|margarina|grasso/],
    ['dai', 'Latticini e uova', /latte|panna|burro|yogurt|mascarpone|ricotta|formagg|uov|tuorl|album|creme fraiche|kefir|philadelphia|robiola/],
    ['flo', 'Farine e cereali', /farin|amido|maizena|fecola|semol|riso|avena|crusca|grano|mais|biscott|pane/],
    ['sug', 'Zuccheri e dolcificanti', /zucchero|zuccheri|glucosio|destrosio|fruttosio|miele|sciroppo|invertit|isomalt|trealosio|maltodestrin|sorbitol|saccarosio|melassa/],
    ['nut', 'Frutta secca e semi', /mandorl|nocciol|pistacch|\bnoci\b|\bnoce\b|pinol|sesamo|arachid|cocco|anacard|pecan|macadamia|semi di/],
    ['fru', 'Frutta e verdura', /frutt|lampon|fragol|albicocc|limon|arancia|aranc|mela|mele|pera|pere|banan|mango|passion|purea|polpa|cilieg|mirtill|pesca|pesche|ribes|more|kiwi|ananas|lime|pompelm|uva|fico|fichi|verdur|zucca|carot|menta|basilico|erbe/],
    ['aro', 'Aromi, spezie e liquori', /vanigl|cannell|sale|pepe|spezi|zest|scorza|aroma|liquor|\brum\b|cognac|grand marnier|cointreau|amaretto|marsala|vino|caffe|te\b|tè|fava tonka|cardamom|zenzero|noce moscata|chiodi di garofano|anice/],
    ['oth', 'Altro', /.*/]
  ];
  function group(name) { var n = norm(name); for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][2].test(n)) return GROUPS[i]; return GROUPS[GROUPS.length - 1]; }
  /* unità: tutto in g o ml; pezzi a parte; q.b. a parte */
  function unit(u, q) {
    u = norm(u || 'g').replace(/\.$/, '');
    if (/^(g|gr|grammi?)$/.test(u) || !u) return ['g', q];
    if (/^(kg|chili|chilogrammi?)$/.test(u)) return ['g', q * 1000];
    if (/^(mg)$/.test(u)) return ['g', q / 1000];
    if (/^(ml|millilitri?)$/.test(u)) return ['ml', q];
    if (/^(cl)$/.test(u)) return ['ml', q * 10];
    if (/^(dl)$/.test(u)) return ['ml', q * 100];
    if (/^(l|lt|litri?)$/.test(u)) return ['ml', q * 1000];
    if (/^(n|n°|nr|pz|pezzi?|uova|uovo|n\.)$/.test(u)) return ['pz', q];
    return [u, q];
  }
  function fmt(v, u) {
    if (u === 'g' && v >= 1000) return (Math.round(v / 10) / 100).toLocaleString('it-IT') + ' kg';
    if (u === 'ml' && v >= 1000) return (Math.round(v / 10) / 100).toLocaleString('it-IT') + ' l';
    var r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
    return r.toLocaleString('it-IT') + ' ' + (u === 'pz' ? 'pz' : u);
  }
  function roundBuy(v, u) { if (u === 'pz') return Math.ceil(v); if (v < 100) return Math.ceil(v / 5) * 5; if (v < 1000) return Math.ceil(v / 50) * 50; return Math.ceil(v / 100) * 100; }

  function build(items, opt) {
    var M = {}, qb = {};
    items.forEach(function (it) {
      (it.rec.i || []).forEach(function (g) {
        var name = String(g[0] || '').trim(); if (!name) return; var k = norm(name).replace(/\s*\(.*\)\s*$/, '');
        var q = num(g[1]);
        if (q == null) { (qb[k] = qb[k] || { n: name, from: [] }).from.push(it.rec.n); return; }
        var U = unit(g[2], q * it.d), key = k + '|' + U[0];
        var e = M[key] || (M[key] = { k: key, n: name, u: U[0], v: 0, from: [], grp: group(name) });
        e.v += U[1]; e.from.push({ r: it.rec.n, d: it.d, v: U[1] });
      });
    });
    var L = Object.keys(M).map(function (k) { var e = M[k], v = e.v * (1 + (opt.extra || 0) / 100); e.buy = opt.round ? roundBuy(v, e.u) : v; return e; });
    L.sort(function (a, b) { return GROUPS.indexOf(a.grp) - GROUPS.indexOf(b.grp) || b.buy - a.buy; });
    return { list: L, qb: Object.keys(qb).map(function (k) { return qb[k]; }) };
  }

  var S = null;
  function ckey() { return 'shop:' + S.day; }
  function loadChk() { try { return JSON.parse(localStorage.getItem(ckey()) || '{}') || {}; } catch (e) { return {}; } }
  function saveChk() { try { localStorage.setItem(ckey(), JSON.stringify(S.chk)); } catch (e) {} }
  function open(o) {
    S = { title: o.title || 'Produzione', day: o.day || '', when: o.when || '', items: o.items || [], loose: o.loose || [], round: false, extra: 0, open: {} };
    try { var pf = JSON.parse(localStorage.getItem('shop_pref') || '{}'); S.round = !!pf.round; S.extra = pf.extra || 0; } catch (e) {}
    S.chk = loadChk();
    var old = $('shBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'shBg'; bg.className = 'sp-bg';
    bg.innerHTML = '<div class="sp-sheet" role="dialog" aria-modal="true" aria-labelledby="spT"><span class="sp-grab"></span><div id="spIn"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick); bg.addEventListener('change', onChange);
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('shBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'shBgOut'; setTimeout(function () { bg.remove(); }, 250); }
  function paint() {
    var box = $('spIn'); if (!box) return;
    var sh = box.parentNode, y = sh.scrollTop, B = build(S.items, S), L = B.list, done = L.filter(function (e) { return S.chk[e.k]; }).length;
    var h = '<header class="sp-hd"><div><span class="sp-k">Lista della spesa</span><h3 id="spT">' + esc(S.title) + '</h3><small>' + esc(S.when) + ' · ' + S.items.length + (S.items.length === 1 ? ' ricetta' : ' ricette') + '</small></div><button type="button" class="sp-x" data-x aria-label="Chiudi">×</button></header>';
    if (!S.items.length) { box.innerHTML = h + '<p class="sp-empty">Nessuna riga del foglio è collegata a una ricetta: scegli le preparazioni dall’elenco delle ricette per calcolare la spesa.</p>'; return; }
    h += '<div class="sp-recs">' + S.items.map(function (it) { return '<span>' + esc(it.rec.n) + (it.d !== 1 ? ' <b>×' + String(Math.round(it.d * 100) / 100).replace('.', ',') + '</b>' : '') + '</span>'; }).join('') + '</div>';
    h += '<div class="sp-opts"><label class="sp-tg"><input type="checkbox" data-o="round"' + (S.round ? ' checked' : '') + '><i></i>Arrotonda per l’acquisto</label>' +
      '<div class="sp-extra"><span>Scorta</span>' + [0, 5, 10, 20].map(function (x) { return '<button type="button" data-extra="' + x + '" class="' + (S.extra === x ? 'on' : '') + '">' + (x ? '+' + x + '%' : '0') + '</button>'; }).join('') + '</div></div>';
    h += '<div class="sp-prog"><span><b>' + done + '</b> di ' + L.length + ' presi</span><i><b style="width:' + (L.length ? done / L.length * 100 : 0) + '%"></b></i></div>';
    var cur = null;
    L.forEach(function (e) {
      if (e.grp !== cur) { if (cur) h += '</div>'; cur = e.grp; h += '<h4 class="sp-g">' + esc(e.grp[1]) + '</h4><div class="sp-list">'; }
      var on = !!S.chk[e.k], op = !!S.open[e.k];
      h += '<div class="sp-it' + (on ? ' on' : '') + '"><label class="sp-row"><input type="checkbox" data-k="' + esc(e.k) + '"' + (on ? ' checked' : '') + '><span class="sp-box"></span><span class="sp-n">' + esc(cap(e.n)) + '</span><b class="sp-q">' + esc(fmt(e.buy, e.u)) + '</b></label>' +
        (e.from.length > 1 || S.round || S.extra ? '<button type="button" class="sp-from" data-open="' + esc(e.k) + '">' + (e.from.length > 1 ? 'in ' + e.from.length + ' ricette' : 'dettaglio') + (op ? ' ▴' : ' ▾') + '</button>' : '<span class="sp-from1">' + esc(e.from[0].r) + '</span>') +
        (op ? '<ul class="sp-det">' + e.from.map(function (f) { return '<li><span>' + esc(f.r) + (f.d !== 1 ? ' ×' + String(Math.round(f.d * 100) / 100).replace('.', ',') : '') + '</span><b>' + esc(fmt(f.v, e.u)) + '</b></li>'; }).join('') + (S.round || S.extra ? '<li class="sum"><span>Totale esatto' + (S.extra ? ' +' + S.extra + '%' : '') + '</span><b>' + esc(fmt(e.v * (1 + S.extra / 100), e.u)) + '</b></li>' : '') + '</ul>' : '') + '</div>';
    });
    if (cur) h += '</div>';
    if (B.qb.length) h += '<h4 class="sp-g">Quanto basta</h4><p class="sp-qb">' + B.qb.map(function (x) { return esc(cap(x.n)); }).join(' · ') + '</p>';
    if (S.loose.length) h += '<p class="sp-loose">Senza ricetta collegata, non calcolate: ' + S.loose.map(esc).join(', ') + '</p>';
    h += '<div class="sp-acts"><button type="button" class="sp-b dark" data-a="share">' + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>' + '<span>Invia la lista</span></button><button type="button" class="sp-b" data-a="copy">Copia</button><button type="button" class="sp-b" data-a="print">Stampa</button>' +
      (done ? '<button type="button" class="sp-b ghost" data-a="reset">Togli le spunte</button>' : '') + '</div>';
    box.innerHTML = h; sh.scrollTop = y;
  }
  function text() {
    var B = build(S.items, S), out = ['LISTA DELLA SPESA · ' + S.title + (S.when ? ' · ' + S.when : '')], cur = null;
    B.list.forEach(function (e) { if (e.grp !== cur) { cur = e.grp; out.push('', e.grp[1].toUpperCase()); } out.push((S.chk[e.k] ? '☑ ' : '☐ ') + cap(e.n) + ' — ' + fmt(e.buy, e.u)); });
    if (B.qb.length) out.push('', 'QUANTO BASTA', B.qb.map(function (x) { return cap(x.n); }).join(', '));
    out.push('', 'Ricette: ' + S.items.map(function (it) { return it.rec.n + (it.d !== 1 ? ' ×' + String(Math.round(it.d * 100) / 100).replace('.', ',') : ''); }).join(', '));
    return out.join('\n');
  }
  function onChange(e) {
    var t = e.target;
    if (t.dataset.k) { if (t.checked) S.chk[t.dataset.k] = 1; else delete S.chk[t.dataset.k]; saveChk(); return paint(); }
    if (t.dataset.o) { S[t.dataset.o] = t.checked; try { localStorage.setItem('shop_pref', JSON.stringify({ round: S.round, extra: S.extra })); } catch (x) {} return paint(); }
  }
  function onClick(e) {
    var bg = $('shBg'); if (!bg) return;
    if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open) { S.open[b.dataset.open] = !S.open[b.dataset.open]; return paint(); }
    if (b.dataset.extra != null) { S.extra = +b.dataset.extra; try { localStorage.setItem('shop_pref', JSON.stringify({ round: S.round, extra: S.extra })); } catch (x) {} return paint(); }
    var a = b.dataset.a;
    if (a === 'reset') { S.chk = {}; saveChk(); return paint(); }
    if (a === 'copy' || (a === 'share' && !navigator.share)) { var t = text(); try { navigator.clipboard.writeText(t).then(function () { toast('Lista copiata'); }, function () { prompt('Copia la lista', t); }); } catch (x) { prompt('Copia la lista', t); } return; }
    if (a === 'share') { navigator.share({ title: 'Lista della spesa · ' + S.title, text: text() }).catch(function () {}); return; }
    if (a === 'print') {
      var B = build(S.items, S), cur = null, rows = '';
      B.list.forEach(function (e2) { if (e2.grp !== cur) { cur = e2.grp; rows += '<tr class="g"><td colspan="3">' + esc(e2.grp[1]) + '</td></tr>'; } rows += '<tr><td class="c">☐</td><td>' + esc(cap(e2.n)) + '</td><td class="q">' + esc(fmt(e2.buy, e2.u)) + '</td></tr>'; });
      var html = '<div class="sp-print"><header><div class="b">' + esc((window.WL && WL.brand && WL.brand().name) || '') + '</div><h1>Lista della spesa</h1><p>' + esc(S.title) + (S.when ? ' · ' + esc(S.when) : '') + '</p></header><table>' + rows + '</table>' +
        (B.qb.length ? '<p class="qb"><b>Quanto basta:</b> ' + B.qb.map(function (x) { return esc(cap(x.n)); }).join(', ') + '</p>' : '') +
        '<p class="r">Ricette: ' + S.items.map(function (it) { return esc(it.rec.n) + (it.d !== 1 ? ' ×' + String(Math.round(it.d * 100) / 100).replace('.', ',') : ''); }).join(' · ') + '</p></div>';
      var css = '#printArea .sp-print{font-family:"DM Sans",Arial,sans-serif;color:#1a1410;max-width:180mm;margin:0 auto}#printArea header{text-align:center;border-bottom:1px solid #C4933A;padding-bottom:8pt;margin-bottom:10pt}#printArea .b{font-size:8pt;letter-spacing:.2em;text-transform:uppercase;color:#8B6914}#printArea h1{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:400;font-size:24pt;margin:3pt 0}#printArea header p{margin:0;font-size:9pt;color:#777}' +
        '#printArea table{width:100%;border-collapse:collapse;font-size:11pt}#printArea td{padding:4pt;border-bottom:.5pt solid #e5e5e5}#printArea tr.g td{padding-top:10pt;font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:#8B6914;border-bottom:.75pt solid #C4933A}#printArea .c{width:14pt;color:#999}#printArea .q{text-align:right;font-weight:600;white-space:nowrap}#printArea .qb,#printArea .r{font-size:9pt;color:#555;margin-top:8pt}';
      close();
      if (window.RSH && RSH.print) RSH.print(html, css); else { var w = window.open(''); if (w) { w.document.write('<style>' + css.replace(/#printArea /g, '') + '</style>' + html); w.print(); } }
    }
  }
  window.SHOP = { open: open, build: build, icon: ICON, group: group };

  var st = document.createElement('style');
  st.textContent = [
    '.sp-bg{position:fixed;inset:0;z-index:9300;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,13,10,0);transition:background .24s}.sp-bg.on{background:rgba(15,13,10,.42)}',
    '.sp-sheet{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 20px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.sp-bg.on .sp-sheet{transform:none}@media(min-width:760px){.sp-bg{align-items:center}.sp-sheet{border-radius:24px;opacity:0;transform:translateY(14px);transition:transform .25s,opacity .2s}.sp-bg.on .sp-sheet{opacity:1}}',
    '.sp-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.sp-hd{display:flex;justify-content:space-between;gap:10px}.sp-k{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.sp-hd h3{margin:4px 0 2px;font:500 1.6rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}.sp-hd small{font-size:.8rem;color:var(--smoke)}',
    '.sp-x{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:20px;cursor:pointer}',
    '.sp-recs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:14px -20px 0;padding:0 20px 2px}.sp-recs span{flex-shrink:0;padding:6px 11px;border-radius:99px;background:var(--ctrl,rgba(0,0,0,.05));font-size:.8rem;color:var(--ink2);white-space:nowrap}.sp-recs b{color:var(--gold3,#8B6408)}',
    '.sp-opts{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}',
    '.sp-tg{display:flex;align-items:center;gap:8px;font-size:.86rem;color:var(--ink2);cursor:pointer}.sp-tg input{position:absolute;opacity:0;pointer-events:none}',
    '.sp-tg i{position:relative;width:38px;height:23px;border-radius:99px;background:var(--cb);transition:background .2s}.sp-tg i::after{content:"";position:absolute;top:2.5px;left:2.5px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .2s}.sp-tg input:checked+i{background:var(--ok,#3F8F4A)}.sp-tg input:checked+i::after{transform:translateX(15px)}',
    '.sp-extra{display:flex;align-items:center;gap:4px;font-size:.8rem;color:var(--smoke)}.sp-extra span{margin-right:4px}.sp-extra button{height:30px;min-width:40px;padding:0 8px;border-radius:9px;border:1px solid var(--cb);background:none;color:var(--ink2);font:600 .78rem "DM Sans",sans-serif;cursor:pointer}.sp-extra button.on{background:var(--ink);color:var(--bg);border-color:transparent}',
    '.sp-prog{display:flex;align-items:center;gap:10px;margin:16px 0 4px;font-size:.82rem;color:var(--smoke)}.sp-prog b{color:var(--ink)}.sp-prog i{flex:1;height:6px;border-radius:99px;background:var(--ctrl,rgba(0,0,0,.06));overflow:hidden}.sp-prog i b{display:block;height:100%;background:var(--ok,#3F8F4A);transition:width .3s}',
    '.sp-g{margin:16px 0 4px;font:700 10.5px "DM Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.sp-it{border-bottom:1px solid var(--cb)}.sp-row{display:flex;align-items:center;gap:12px;padding:11px 0 4px;cursor:pointer}.sp-row input{position:absolute;opacity:0;pointer-events:none}',
    '.sp-box{flex-shrink:0;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--cb);display:grid;place-items:center;transition:all .15s}.sp-it.on .sp-box{background:var(--ok,#3F8F4A);border-color:var(--ok,#3F8F4A)}.sp-it.on .sp-box::after{content:"";width:10px;height:5px;border:2px solid #fff;border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}',
    '.sp-row input:focus-visible+.sp-box{outline:2px solid var(--ink);outline-offset:2px}',
    '.sp-n{flex:1;min-width:0;font-size:.98rem}.sp-q{font:700 .98rem "DM Sans",sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.sp-it.on .sp-n,.sp-it.on .sp-q{color:var(--smoke);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--smoke) 60%,transparent)}',
    '.sp-from,.sp-from1{display:inline-block;margin:0 0 9px 34px;font-size:.74rem;color:var(--smoke)}.sp-from{border:0;background:none;padding:0;color:var(--gold3,#8B6408);font-weight:600;cursor:pointer}',
    '.sp-det{list-style:none;margin:-2px 0 10px 34px;padding:8px 10px;border-radius:10px;background:var(--ctrl,rgba(0,0,0,.04));font-size:.8rem}.sp-det li{display:flex;justify-content:space-between;gap:10px;padding:2px 0;color:var(--ink2)}.sp-det li.sum{border-top:1px solid var(--cb);margin-top:4px;padding-top:5px;font-weight:600}',
    '.sp-qb{margin:4px 0 0;font-size:.86rem;color:var(--ink2);line-height:1.5}.sp-loose{margin:14px 0 0;padding:9px 11px;border-radius:12px;background:rgba(214,120,30,.1);font-size:.8rem;line-height:1.45}',
    '.sp-empty{margin:18px 0;color:var(--smoke);line-height:1.5}',
    '.sp-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.sp-acts .dark{grid-column:1/-1}',
    '.sp-b{display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:15px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 .92rem "DM Sans",sans-serif;cursor:pointer}.sp-b.dark{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}.sp-b.ghost{grid-column:1/-1;border:0;color:var(--smoke)}'
  ].join('\n');
  document.head.appendChild(st);
})();
