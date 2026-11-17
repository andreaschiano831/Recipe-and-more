/* ════════════════════════════════════════════════════════════════════
   IMPORTA BACKUP — ricette da questa app o da altre app
   Formati riconosciuti:
   · backup di questa app e di PastryRecipe (.json con «ricette»)
   · ricette schema.org / JSON-LD (siti web, Mealie, Nextcloud Cookbook…)
   · Mealie (ingredienti strutturati), Tandoor (passaggi con ingredienti)
   · Paprika (.paprikarecipes / .paprikarecipe)
   · CSV (anche esportato da Excel o Google Fogli), con intestazioni
   · altri JSON con nome + ingredienti; il resto passa all'AI
   Prima di salvare: anteprima, scelta delle ricette, sezione di arrivo,
   gestione dei doppioni (salta / aggiungi come copia / sostituisci).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function str(v) { if (v == null) return ''; if (Array.isArray(v)) return v.map(str).filter(Boolean).join(', '); if (typeof v === 'object') return str(v.name || v.text || v['@value'] || ''); return String(v).trim(); }
  function clean(t) { return String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim(); }

  /* ══════════ INGREDIENTI DA TESTO ══════════ */
  var UNITS = [
    ['kg', /^(kg|chili|chilogrammi?)$/], ['g', /^(g|gr|grammi?|gramm?i|grams?)$/], ['mg', /^mg$/],
    ['l', /^(l|lt|litri?|liters?|litres?)$/], ['dl', /^dl$/], ['cl', /^cl$/], ['ml', /^(ml|millilitri?)$/],
    ['cucchiaio', /^(cucchiai[oe]?|cucch\.?|tbsp|tablespoons?|cs)$/], ['cucchiaino', /^(cucchiain[oi]|tsp|teaspoons?|cc)$/],
    ['tazza', /^(tazz[ae]|cups?)$/], ['pz', /^(pz|pezzi?|pcs?)$/], ['pizzico', /^(pizzic[oh]i?|pinch(es)?)$/],
    ['bustina', /^(bustin[ae]|bust\.)$/], ['foglio', /^(fogli[oe]?)$/], ['spicchio', /^(spicchi[oe]?|cloves?)$/],
    ['oz', /^(oz|ounces?)$/], ['lb', /^(lbs?|pounds?)$/]
  ];
  var FR = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
  function qnum(s) {
    s = String(s).trim().replace(/[½¼¾⅓⅔⅛]/g, function (c) { return ' ' + FR[c]; }).trim();
    var m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s); if (m) return +m[1] + m[2] / m[3];
    m = /^(\d+)\/(\d+)$/.exec(s); if (m) return m[1] / m[2];
    m = /^(\d+(?:[.,]\d+)?)\s+(0?\.\d+)$/.exec(s); if (m) return parseFloat(m[1].replace(',', '.')) + parseFloat(m[2]);
    var n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : null;
  }
  function unitOf(w) { w = String(w || '').toLowerCase().replace(/\.$/, ''); for (var i = 0; i < UNITS.length; i++) if (UNITS[i][1].test(w)) return UNITS[i][0]; return null; }
  var NUM = '(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[½¼¾⅓⅔⅛])?|[½¼¾⅓⅔⅛])(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?';
  function parseIng(line) {
    var t = clean(line).replace(/^[-•*·▪︎•]\s*/, '').trim(); if (!t) return null;
    var qb = /\bq\.?\s?b\.?\b|quanto basta|to taste/i.test(t);
    var m = new RegExp('^' + NUM).exec(t);
    if (m) {
      var q = qnum(m[1]), rest = t.slice(m[0].length).trim(), w0 = (/^([a-zA-Zà-ú.]+)/.exec(rest) || [''])[0], u = unitOf(w0), name = rest;
      if (u) name = rest.slice(w0.length).replace(/^\.?\s*/, '').replace(/^(di|d')\s*/i, '');
      else { var mm = /^(\d*[.,]?\d*)\s*(g|gr|kg|ml|l|cl|dl)(?=\s|$)/i.exec(rest); if (mm) { u = unitOf(mm[2]); name = rest.slice(mm[0].length).replace(/^\s*(di|d')\s*/i, ''); } }
      return fin(name, q, u || (q != null && q >= 20 && !/^(uov|tuorl|album|spicch|fogli|fett)/i.test(name) ? 'g' : 'pz'));
    }
    m = new RegExp('^(.+?)[\\s:,–-]+' + NUM + '\\s*([a-zA-Zà-ú.]+)?\\.?\\s*$', 'i').exec(t);
    if (m) { var u2 = unitOf(m[3]); if (u2 || !m[3]) return fin(m[1], qnum(m[2]), u2 || 'pz'); }
    return fin(t.replace(/\bq\.?\s?b\.?\b|quanto basta/ig, '').replace(/[:,\s]+$/, ''), null, qb ? 'q.b.' : 'g');
  }
  function fin(name, q, u) {
    name = String(name || '').replace(/^(di|d')\s+/i, '').replace(/\s+/g, ' ').replace(/[:,;.\s]+$/, '').trim(); if (!name) return null;
    if (u === 'kg' && q != null) { q = q * 1000; u = 'g'; }
    if (u === 'l' && q != null) { q = q * 1000; u = 'ml'; }
    if (u === 'dl' && q != null) { q = q * 100; u = 'ml'; }
    if (u === 'cl' && q != null) { q = q * 10; u = 'ml'; }
    if (u === 'q.b.') u = 'g';
    if (q != null) q = Math.round(q * 100) / 100;
    return [name.charAt(0).toUpperCase() + name.slice(1), q, u || 'g'];
  }
  function lines(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.reduce(function (a, x) { return a.concat(typeof x === 'string' ? lines(x) : x && typeof x === 'object' ? [x] : []); }, []);
    return String(v).split(/\r?\n|;\s*(?=\S)/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function steps(v) {
    if (v == null) return '';
    if (typeof v === 'string') return clean(v);
    if (Array.isArray(v)) return v.map(function (x) {
      if (typeof x === 'string') return clean(x);
      if (x && x.itemListElement) return (x.name ? x.name + ':\n' : '') + steps(x.itemListElement);
      return clean(x && (x.text || x.instruction || x.name || x.description) || '');
    }).filter(Boolean).join('\n');
    if (typeof v === 'object') return steps(v.itemListElement || v.text || '');
    return '';
  }

  /* ══════════ FORMATI ══════════ */
  function fromOwn(list) {
    return list.filter(function (r) { return r && r.n && Array.isArray(r.i) && !r._cfg; }).map(function (r) {
      var o = JSON.parse(JSON.stringify(r)); delete o._id; delete o._c;
      o.i = o.i.filter(function (g) { return Array.isArray(g) && g[0]; }).map(function (g) { return [String(g[0]), g[1] == null || g[1] === '' ? null : +g[1], g[2] || 'g']; });
      o._srcSec = r.s || ''; return o;
    });
  }
  function isSchema(o) { var t = o && o['@type']; return t === 'Recipe' || (Array.isArray(t) && t.indexOf('Recipe') > -1); }
  function fromSchema(o) {
    var ing = (o.recipeIngredient || o.ingredients || []).map(function (x) {
      if (typeof x === 'string') return parseIng(x);
      /* Mealie: {quantity, unit{name}, food{name}, note, display, originalText} */
      if (x && (x.food || x.quantity != null)) {
        var name = str(x.food) || clean(x.note || x.display || x.originalText || ''), u = unitOf(str(x.unit)) || str(x.unit) || 'g';
        if (!name && x.display) return parseIng(x.display);
        return fin(name + (x.food && x.note ? ' (' + clean(x.note) + ')' : ''), x.quantity ? +x.quantity : null, u);
      }
      return x && (x.display || x.originalText || x.note) ? parseIng(x.display || x.originalText || x.note) : null;
    }).filter(Boolean);
    var cat = str(o.recipeCategory) || str(o.recipeCuisine) || str(o.tags || o.keywords).split(',')[0] || '';
    var y = str(o.recipeYield || o.yield);
    var notes = [clean(o.description || ''), y ? 'Resa: ' + y : '', o.notes ? steps(o.notes) : ''].filter(Boolean).join('\n');
    return { n: clean(o.name || o.title || ''), c: cat, i: ing, p: steps(o.recipeInstructions || o.instructions), nt: notes, _srcSec: cat };
  }
  function fromTandoor(o) {
    var ing = [], p = [];
    (o.steps || []).forEach(function (s) {
      (s.ingredients || []).forEach(function (x) { var name = str(x.food) || clean(x.note || ''); if (name) ing.push(fin(name, x.amount ? +x.amount : null, unitOf(str(x.unit)) || str(x.unit) || 'g')); });
      if (s.instruction || s.instructions) p.push(clean(s.instruction || s.instructions));
    });
    return { n: clean(o.name), c: str((o.keywords || [])[0]), i: ing.filter(Boolean), p: p.join('\n'), nt: clean(o.description || ''), _srcSec: str((o.keywords || [])[0]) };
  }
  function fromPaprika(o) {
    var cats = o.categories || [];
    return { n: clean(o.name), c: str(cats[0]), i: lines(o.ingredients).map(parseIng).filter(Boolean), p: clean(o.directions || ''), nt: [clean(o.notes || ''), o.servings ? 'Resa: ' + o.servings : '', o.source ? 'Fonte: ' + o.source : ''].filter(Boolean).join('\n'), _srcSec: str(cats[0]) };
  }
  function fromGeneric(o) {
    var name = o.name || o.title || o.nome || o.titolo; if (!name) return null;
    var ingRaw = o.ingredients || o.ingredienti || o.recipeIngredient || o.ingredient || o.ing;
    if (!ingRaw) return null;
    var ing = lines(ingRaw).map(function (x) {
      if (typeof x === 'string') return parseIng(x);
      if (Array.isArray(x)) return fin(x[0], x[1] == null ? null : +x[1], x[2] || 'g');
      var nm = x.name || x.nome || x.food || x.ingredient || x.ingrediente; var q = x.quantity != null ? x.quantity : x.qty != null ? x.qty : x.amount != null ? x.amount : x.quantita;
      return nm ? fin(str(nm), q == null || q === '' ? null : qnum(q), unitOf(str(x.unit || x.unita || x.um)) || str(x.unit || x.unita || x.um) || 'g') : (x.text ? parseIng(x.text) : null);
    }).filter(Boolean);
    var cat = str(o.category || o.categoria || o.categories || o.recipeCategory || o.course || '');
    return { n: clean(name), c: cat.split(',')[0].trim(), i: ing, p: steps(o.instructions || o.procedimento || o.directions || o.method || o.steps || o.preparazione || o.recipeInstructions), nt: clean(o.notes || o.note || o.description || o.descrizione || ''), piatto: o.piatto || '', _srcSec: str(o.section || o.sezione || cat) };
  }
  function walkJSON(d) {
    var out = { recs: [], fmt: '' };
    if (d && !Array.isArray(d) && Array.isArray(d.ricette)) { out.recs = fromOwn(d.ricette); out.fmt = 'Backup di ' + (d.app ? String(d.app).replace(/^Ricettario\s*·\s*/, '') || 'Ricettario' : 'Ricettario'); return out; }
    var list = Array.isArray(d) ? d : d && Array.isArray(d['@graph']) ? d['@graph'] : d && Array.isArray(d.recipes) ? d.recipes : d && Array.isArray(d.items) ? d.items : d && Array.isArray(d.data) ? d.data : [d];
    if (list.length && list.every(function (r) { return r && r.n && Array.isArray(r.i); })) { out.recs = fromOwn(list); out.fmt = 'Backup Ricettario'; return out; }
    var kinds = {};
    list.forEach(function (o) {
      if (!o || typeof o !== 'object') return;
      if (o['@graph']) { var g = walkJSON(o); out.recs = out.recs.concat(g.recs); kinds[g.fmt] = 1; return; }
      var r = null;
      if (isSchema(o)) { r = fromSchema(o); kinds['Ricette schema.org (siti web, Mealie, Cookbook)'] = 1; }
      else if (Array.isArray(o.steps) && o.steps.some(function (s) { return s && (s.ingredients || s.instruction); })) { r = fromTandoor(o); kinds.Tandoor = 1; }
      else if (o.recipeIngredient) { r = fromSchema(o); kinds['Ricette JSON (Mealie)'] = 1; }
      else if (typeof o.ingredients === 'string' && o.directions != null) { r = fromPaprika(o); kinds.Paprika = 1; }
      else { r = fromGeneric(o); if (r) kinds['JSON generico'] = 1; }
      if (r && r.n) out.recs.push(r);
    });
    out.fmt = Object.keys(kinds).join(' · ');
    return out;
  }
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false, sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : (text.split('\n')[0].indexOf('\t') > -1 ? '\t' : ',');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (rows.length < 2) return [];
    var hd = rows[0].map(norm), col = function (re) { for (var k = 0; k < hd.length; k++) if (re.test(hd[k])) return k; return -1; };
    var cN = col(/^(nome|name|titolo|title|ricetta|recipe)/), cI = col(/ingred/), cP = col(/(proced|istruz|instruct|direction|method|preparaz|steps)/), cC = col(/^(categ|category|tipo|course)/), cS = col(/^(sezion|section)/), cT = col(/^(note|notes|descri)/), cPi = col(/^piatto/);
    if (cN < 0) return [];
    /* formato «una riga per ingrediente»: colonne ingrediente + quantità + unità */
    var cQ = col(/^(quantit|qty|quantity|amount|grammi|peso)/), cU = col(/^(unit|um|misura)/);
    var by = {}, order = [];
    rows.slice(1).forEach(function (r) {
      var n = (r[cN] || '').trim(); if (!n) return;
      var o = by[n]; if (!o) { o = by[n] = { n: n, c: cC > -1 ? (r[cC] || '').trim() : '', i: [], p: '', nt: '', piatto: cPi > -1 ? (r[cPi] || '').trim() : '', _srcSec: cS > -1 ? (r[cS] || '').trim() : (cC > -1 ? (r[cC] || '').trim() : '') }; order.push(n); }
      if (cI > -1 && r[cI]) {
        if (cQ > -1) { var g = fin(r[cI], r[cQ] === '' || r[cQ] == null ? null : qnum(r[cQ]), unitOf(r[cU]) || (r[cU] || 'g')); if (g) o.i.push(g); }
        else lines(r[cI]).forEach(function (x) { var g2 = parseIng(x); if (g2) o.i.push(g2); });
      }
      if (cP > -1 && r[cP] && o.p.indexOf(r[cP].trim()) < 0) o.p = (o.p ? o.p + '\n' : '') + r[cP].trim();
      if (cT > -1 && r[cT] && o.nt.indexOf(r[cT].trim()) < 0) o.nt = (o.nt ? o.nt + '\n' : '') + r[cT].trim();
    });
    return order.map(function (k) { return by[k]; });
  }
  function gunzip(buf) {
    if (!window.DecompressionStream) return Promise.reject(new Error('Questo browser non sa aprire i file Paprika: usa Chrome o Safari aggiornato.'));
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = (window.LIB_CDN && LIB_CDN.jszip) || 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = function () { res(window.JSZip); }; s.onerror = function () { rej(new Error('Non riesco a caricare il lettore di file compressi: controlla la connessione.')); }; document.head.appendChild(s); });
  }
  function readFile(file) {
    var nm = String(file.name || '').toLowerCase();
    if (/\.paprikarecipes$|\.zip$/.test(nm)) {
      return Promise.all([loadZip(), file.arrayBuffer()]).then(function (r) {
        return r[0].loadAsync(r[1]).then(function (z) {
          var files = Object.keys(z.files).filter(function (k) { return !z.files[k].dir; });
          return Promise.all(files.map(function (k) {
            var f = z.files[k];
            if (/\.paprikarecipe$/i.test(k)) return f.async('arraybuffer').then(gunzip).then(function (t) { return fromPaprika(JSON.parse(t)); }).catch(function () { return null; });
            if (/\.json$/i.test(k)) return f.async('string').then(function (t) { return walkJSON(JSON.parse(t)).recs; }).catch(function () { return null; });
            return null;
          })).then(function (all) { var recs = [].concat.apply([], all.filter(Boolean)); return { recs: recs, fmt: /\.paprikarecipes$/.test(nm) ? 'Paprika' : 'Archivio ZIP' }; });
        });
      });
    }
    if (/\.paprikarecipe$/.test(nm)) return file.arrayBuffer().then(gunzip).then(function (t) { return { recs: [fromPaprika(JSON.parse(t))], fmt: 'Paprika' }; });
    return file.text().then(function (t) {
      var s = t.replace(/^﻿/, '').trim();
      if (/^[\[{]/.test(s)) { try { return walkJSON(JSON.parse(s)); } catch (e) {} }
      var ld = []; s.replace(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, function (m, j) { try { ld.push(JSON.parse(j)); } catch (e) {} return m; });
      if (ld.length) { var w = walkJSON(ld); w.fmt = 'Pagina web (schema.org)'; return w; }
      if (/\.(csv|tsv|txt)$/.test(nm) || /[,;\t]/.test(s.split('\n')[0])) { var c = parseCSV(s); if (c.length) return { recs: c, fmt: 'CSV' }; }
      return { recs: [], fmt: '', text: s };
    });
  }
  window.BK_PARSE = { parseIng: parseIng, walkJSON: walkJSON, parseCSV: parseCSV, readFile: readFile };

  /* ══════════ ANTEPRIMA E IMPORTAZIONE ══════════ */
  var ST = null;
  function secs() { try { return WL.sections(); } catch (e) { return [{ k: 'colazioni', l: 'Ricette' }]; } }
  function guessSec(src) {
    var n = norm(src); if (!n) return '';
    var S = secs(), hit = S.filter(function (s) { return s.k === src || norm(s.l) === n; })[0];
    if (hit) return hit.k;
    hit = S.filter(function (s) { var l = norm(s.l + ' ' + (s.sub || '')); return l.indexOf(n) > -1 || n.indexOf(norm(s.l)) > -1; })[0];
    if (hit) return hit.k;
    var map = [[/gelat|sorbett|semifredd/, 'gelateria'], [/torte|torta|cake|entremet|mousse/, 'torte'], [/fine|dining|piatt|ristor|dessert al piatto/, 'fine-dining'], [/colazion|monopor|viennois|brioch|croissant|lievitat/, 'colazioni']];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(n) && S.some(function (s) { return s.k === map[i][1]; })) return map[i][1];
    return '';
  }
  function existing() { var m = {}; (window.CU || []).forEach(function (r) { if (r && r.n && !r._cfg) m[norm(r.n)] = r; }); return m; }

  function open() {
    if (window.WL && WL.canEdit && !WL.canEdit()) { WL.readOnlyNote(); return; }
    var old = $('bk'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'bk'; el.className = 'bk on'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Importa ricette da un backup');
    el.innerHTML = '<div class="bk-sh"><div class="bk-hd"><div><span class="bk-k">Importa ricette</span><b>Da un backup o da un’altra app</b></div><button type="button" class="bk-x" aria-label="Chiudi">×</button></div><div class="bk-body" id="bkBody"></div></div>';
    document.body.appendChild(el);
    el.querySelector('.bk-x').onclick = close;
    el.addEventListener('mousedown', function (e) { if (e.target === el) close(); });
    document.addEventListener('keydown', escK);
    pick();
  }
  function escK(e) { if (e.key === 'Escape' && $('bk') && !ST_busy) close(); }
  var ST_busy = false;
  function close() { var el = $('bk'); if (el) el.remove(); document.removeEventListener('keydown', escK); ST = null; }
  function pick(msg) {
    var b = $('bkBody');
    b.innerHTML = '<label class="bk-drop" id="bkDrop"><input type="file" id="bkFile" accept=".json,.csv,.tsv,.txt,.html,.htm,.zip,.paprikarecipes,.paprikarecipe,application/json,text/csv" hidden>' +
      '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg><b>Scegli il file del backup</b><span>oppure trascinalo qui</span></label>' +
      (msg ? '<p class="bk-err">' + esc(msg) + '</p>' : '') +
      '<div class="bk-fmts"><span class="bk-k">Formati riconosciuti</span><ul><li><b>Backup di questa app e di PastryRecipe</b> (.json)</li><li><b>Ricette in formato standard</b> schema.org: Mealie, Nextcloud Cookbook, pagine web salvate</li><li><b>Tandoor</b>, <b>Paprika</b> (.paprikarecipes)</li><li><b>CSV</b> da Excel o Google Fogli, con una colonna per nome, ingredienti, procedimento (o una riga per ingrediente)</li><li>Altri formati: il testo passa all’AI, come in «Importa con l’AI»</li></ul></div>';
    var inp = $('bkFile'), drop = $('bkDrop');
    inp.onchange = function () { if (inp.files[0]) load(inp.files[0]); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = function () { drop.classList.remove('over'); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); var f = e.dataTransfer.files[0]; if (f) load(f); };
  }
  function load(file) {
    $('bkBody').innerHTML = '<div class="bk-wait"><span class="bk-spin"></span>Leggo «' + esc(file.name) + '»…</div>';
    readFile(file).then(function (res) {
      if (!res.recs.length) { unknown(file, res.text); return; }
      var ex = existing();
      ST = { file: file.name, fmt: res.fmt, dup: 'skip', q: '', items: res.recs.map(function (r, i) {
        r.i = (r.i || []).filter(Boolean);
        var dup = ex[norm(r.n)] || null;
        return { r: r, on: true, dup: dup, sec: guessSec(r._srcSec || r.s || r.c) };
      }) };
      var srcs = {}; ST.items.forEach(function (it) { var k = it.r._srcSec || ''; if (!srcs[k]) srcs[k] = { k: k, n: 0, to: it.sec || (secs()[0] || {}).k }; srcs[k].n++; });
      ST.map = srcs;
      preview();
    }).catch(function (e) { pick('Non riesco a leggere il file: ' + (e && e.message || e)); });
  }
  function unknown(file, text) {
    var b = $('bkBody');
    b.innerHTML = '<div class="bk-unk"><b>Formato non riconosciuto</b><p>Non trovo ricette strutturate in «' + esc(file.name) + '».' + (text ? ' Posso passare il testo all’AI, che riconosce nomi, ingredienti e procedimenti (come in «Importa con l’AI»).' : '') + '</p>' +
      '<div class="bk-acts">' + (text ? '<button type="button" class="bk-b dark" id="bkAi">Passa all’AI</button>' : '') + '<button type="button" class="bk-b" id="bkAgain">Scegli un altro file</button></div>' +
      (text && text.length > 18000 ? '<p class="bk-note">Il file è lungo: l’AI ne leggerà la prima parte. Per i backup grandi conviene esportarli in JSON o CSV dall’altra app.</p>' : '') + '</div>';
    $('bkAgain').onclick = function () { pick(); };
    var ai = $('bkAi'); if (ai) ai.onclick = function () { close(); openStudio({ text: text.slice(0, 18000) }); };
  }
  function preview() {
    var b = $('bkBody'), S = ST, nDup = S.items.filter(function (x) { return x.dup; }).length;
    var secOpts = function (sel) { return secs().map(function (s) { return '<option value="' + esc(s.k) + '"' + (s.k === sel ? ' selected' : '') + '>' + esc(s.l) + '</option>'; }).join(''); };
    var maps = Object.keys(S.map).map(function (k) { var m = S.map[k]; return '<div class="bk-map"><span>' + (k ? esc(k) : '<i>senza sezione</i>') + ' <small>' + m.n + '</small></span><b>→</b><select data-src="' + esc(k) + '">' + secOpts(m.to) + '</select></div>'; }).join('');
    b.innerHTML =
      '<div class="bk-sum"><div><b class="bk-big">' + S.items.length + '</b> ricette trovate</div><span>' + esc(S.file) + (S.fmt ? ' · ' + esc(S.fmt) : '') + '</span></div>' +
      '<div class="bk-sec"><span class="bk-k">Dove vanno</span><p class="bk-note">Ogni sezione o categoria del backup va in una sezione del tuo ricettario.</p>' + maps + '</div>' +
      (nDup ? '<div class="bk-sec"><span class="bk-k">' + nDup + ' già nel ricettario (stesso nome)</span><div class="bk-seg" id="bkDup">' + [['skip', 'Salta'], ['copy', 'Aggiungi come copia'], ['over', 'Sostituisci']].map(function (o) { return '<button type="button" data-d="' + o[0] + '" class="' + (S.dup === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div></div>' : '') +
      '<div class="bk-sec"><div class="bk-lh"><span class="bk-k">Ricette</span><input id="bkQ" type="search" placeholder="Filtra…" value="' + esc(S.q) + '"><label class="bk-all"><input type="checkbox" id="bkAll" checked> Tutte</label></div><div class="bk-list" id="bkList"></div></div>' +
      '<div class="bk-foot"><button type="button" class="bk-b" id="bkBack">Altro file</button><button type="button" class="bk-b dark" id="bkGo"></button></div>';
    [].forEach.call(b.querySelectorAll('.bk-map select'), function (s) { s.onchange = function () { S.map[s.dataset.src].to = s.value; }; });
    var dg = $('bkDup'); if (dg) [].forEach.call(dg.querySelectorAll('button'), function (x) { x.onclick = function () { S.dup = x.dataset.d; [].forEach.call(dg.querySelectorAll('button'), function (y) { y.classList.toggle('on', y === x); }); list(); }; });
    $('bkQ').oninput = function () { S.q = this.value; list(); };
    $('bkAll').onchange = function () { var on = this.checked; vis().forEach(function (it) { it.on = on; }); list(); };
    $('bkBack').onclick = function () { pick(); };
    $('bkGo').onclick = run;
    list();
  }
  function vis() { var q = norm(ST.q); return ST.items.filter(function (it) { return !q || norm(it.r.n + ' ' + (it.r.c || '')).indexOf(q) > -1; }); }
  function count() { return ST.items.filter(function (it) { return it.on && !(it.dup && ST.dup === 'skip'); }).length; }
  function list() {
    var box = $('bkList'), V = vis();
    box.innerHTML = V.slice(0, 400).map(function (it) {
      var i = ST.items.indexOf(it), r = it.r, nq = r.i.filter(function (g) { return g[1] == null; }).length;
      var tag = it.dup ? '<em class="' + (ST.dup === 'skip' ? 'skip' : ST.dup === 'over' ? 'over' : 'copy') + '">' + (ST.dup === 'skip' ? 'già presente · saltata' : ST.dup === 'over' ? 'sostituisce' : 'copia') + '</em>' : '';
      return '<label class="bk-it' + (it.dup && ST.dup === 'skip' ? ' off' : '') + '"><input type="checkbox" data-i="' + i + '"' + (it.on ? ' checked' : '') + '><span class="bk-box"></span><span class="bk-t"><b>' + esc(r.n) + '</b><small>' + r.i.length + ' ingredienti' + (nq ? ' (' + nq + ' senza quantità)' : '') + (r.p ? ' · procedimento' : '') + (r.nt ? ' · note' : '') + (r.c ? ' · ' + esc(r.c) : '') + '</small></span>' + tag + '</label>';
    }).join('') + (V.length > 400 ? '<p class="bk-note">… e altre ' + (V.length - 400) + ' (usa il filtro per vederle)</p>' : '') + (!V.length ? '<p class="bk-note">Nessuna ricetta con questo filtro.</p>' : '');
    [].forEach.call(box.querySelectorAll('input[data-i]'), function (c) { c.onchange = function () { ST.items[+c.dataset.i].on = c.checked; foot(); }; });
    foot();
  }
  function foot() { var n = count(), g = $('bkGo'); g.textContent = n ? 'Importa ' + n + (n === 1 ? ' ricetta' : ' ricette') : 'Nessuna ricetta scelta'; g.disabled = !n; }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function run() {
    var todo = ST.items.filter(function (it) { return it.on && !(it.dup && ST.dup === 'skip'); }); if (!todo.length) return;
    ST_busy = true;
    var b = $('bkBody'), done = 0, fail = 0, total = todo.length;
    b.innerHTML = '<div class="bk-run"><b id="bkRunT">Importo 0 di ' + total + '…</b><div class="bk-bar"><i id="bkBar"></i></div><p class="bk-note">Non chiudere l’app finché non ha finito.</p></div>';
    var names = existing();
    var step = function (it) {
      var r = JSON.parse(JSON.stringify(it.r)), src = r._srcSec || '';
      var rec = { n: r.n, c: r.c || 'Varie', s: (ST.map[src] && ST.map[src].to) || (secs()[0] || {}).k, i: r.i };
      if (r.p) rec.p = r.p; if (r.piatto) rec.piatto = r.piatto; if (r.nt) rec.nt = r.nt;
      ['ph', 'img', 'foto', 'tags', 'resa'].forEach(function (k) { if (r[k] != null) rec[k] = r[k]; });
      if (it.dup && ST.dup === 'copy') { var base = rec.n, k = 2; while (names[norm(rec.n)]) rec.n = base + ' (' + k++ + ')'; }
      names[norm(rec.n)] = rec;
      var p;
      try { p = (it.dup && ST.dup === 'over' && it.dup._id != null) ? updateRec(it.dup, rec) : saveRec(rec); } catch (e) { p = Promise.reject(e); }
      return Promise.resolve(p).then(function () { done++; }, function () { fail++; });
    };
    var i = 0;
    (function next() {
      if (i >= todo.length) { finish(); return; }
      var batch = todo.slice(i, i + 4); i += batch.length;
      Promise.all(batch.map(step)).then(function () {
        var n = done + fail; $('bkRunT').textContent = 'Importo ' + n + ' di ' + total + '…'; $('bkBar').style.width = (n / total * 100) + '%';
        return wait(60);
      }).then(next);
    })();
    function finish() {
      ST_busy = false;
      try { renderCats(); renderGrid(); } catch (e) {}
      try { if (window.HM) HM.render(); } catch (e) {}
      b.innerHTML = '<div class="bk-run done"><div class="bk-ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><b>' + done + (done === 1 ? ' ricetta importata' : ' ricette importate') + '</b>' +
        (fail ? '<p class="bk-err">' + fail + ' non salvate per un errore di rete: restano in memoria e verranno inviate appena torna la connessione, oppure riprova l’importazione.</p>' : '<p class="bk-note">Sono già nel ricettario e su tutti i tuoi dispositivi.</p>') +
        '<div class="bk-acts"><button type="button" class="bk-b dark" id="bkSee">Vedi le ricette</button><button type="button" class="bk-b" id="bkMore">Importa un altro file</button></div></div>';
      $('bkSee').onclick = function () { close(); try { if (window.XL && XL.viewOpen) XL.close(); openSection('tutti'); } catch (e) {} };
      $('bkMore').onclick = function () { pick(); };
    }
  }
  window.BK = { open: open };

  /* punti d'accesso: impostazioni account, menu, ricerca */
  new MutationObserver(function (list) {
    list.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) {
      if (n.id !== 'wlSheet' || (window.WL && WL.canEdit && !WL.canEdit())) return;
      var sh = n.querySelector('.wl-sh'); if (!sh || sh.querySelector('#bkCard')) return;
      var c = document.createElement('section'); c.className = 'wl-card'; c.id = 'bkCard';
      c.innerHTML = '<b class="wl-t">Backup</b><p class="wl-n">Scarica tutte le ricette, oppure importale da un backup di questa app, di PastryRecipe o di altre app.</p><div class="wl-row"><button type="button" class="wl-btn" id="bkDl">Scarica backup</button><button type="button" class="wl-btn gold" id="bkUp">Importa backup</button></div>';
      var first = sh.querySelectorAll('.wl-card')[1]; sh.insertBefore(c, first || null);
      c.querySelector('#bkDl').onclick = function () { try { downloadBackup(); } catch (e) {} };
      c.querySelector('#bkUp').onclick = function () { n.remove(); open(); };
    }); });
  }).observe(document.body, { childList: true });
})();
