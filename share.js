/* share.js — condivisione professionale di una ricetta.
   · Link di sola lettura: la ricetta (alla dose scelta, con il nome del ricettario) viaggia
     compressa dentro l'indirizzo, dopo il «#»: non passa da nessun server e chi la riceve
     la apre senza accedere. Se usa il Ricettario può salvarla nel suo account.
   · PDF / stampa con intestazione del ricettario.
   Espone window.RSH = { open(r, dose), view(hash), print(html, css) } */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fq(v) { if (v == null) return ''; var a = Math.abs(v), r = a >= 100 ? Math.round(v) : a >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100; return r.toLocaleString('it-IT', { maximumFractionDigits: 2 }); }
  function fx(d) { return '×' + String(Math.round(d * 100) / 100).replace('.', ','); }
  function toast(m) { try { if (window.XL && XL.toast) return XL.toast(m); libToast(m, ''); } catch (e) {} }
  var ICON = {
    share: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/></svg>'
  };

  /* ── impacchettare la ricetta nell'indirizzo ── */
  function b64u(bytes) { var s = '', i = 0, CH = 0x8000; for (; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function ub64u(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; var bin = atob(str), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function pack(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      try { var cs = new CompressionStream('deflate'); return new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer().then(function (b) { return 'z' + b64u(new Uint8Array(b)); }, function () { return 'j' + b64u(bytes); }); } catch (e) {}
    }
    return Promise.resolve('j' + b64u(bytes));
  }
  function unpack(str) {
    var k = str.charAt(0), data = ub64u(str.slice(1));
    if (k === 'z') {
      if (!window.DecompressionStream) return Promise.reject(new Error('Per aprire questa ricetta aggiorna il browser'));
      return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer().then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
    }
    return Promise.resolve(JSON.parse(new TextDecoder().decode(data)));
  }
  function base() { var p = location.pathname.replace(/index\.html$/, ''); if (!/\/$/.test(p)) p += '/'; return location.origin + p; }
  function snap(r, d, o) {
    var x = { v: 1, n: r.n || 'Ricetta', c: r.c || '', pi: r.piatto || '', i: (r.i || []).map(function (g) { return [String(g[0] || ''), g[1] == null || g[1] === '' ? null : num(g[1]), g[2] || 'g']; }), d: d > 0 ? Math.round(d * 1000) / 1000 : 1 };
    try { var sl = WL.secLabel && WL.secLabel(r.s); if (sl) x.sec = sl; } catch (e) {}
    if (o.proc !== false && r.p && String(r.p).trim()) x.p = String(r.p);
    if (o.notes && r.nt && String(r.nt).trim()) x.nt = String(r.nt);
    if (r.resa) x.y = r.resa;
    try { if (window.NUT) { var D = NUT.detect(r); if (D.on.length) x.al = D.on; if (D.may.length) x.may = D.may; } } catch (e) {}
    try { var b = WL.brand(); if (b && b.name) { x.b = b.name; if (b.sub) x.bs = b.sub; } } catch (e) {}
    x.at = new Date().toISOString().slice(0, 10);
    if (r._lang === 'en') x.lang = 'en';
    return x;
  }
  function makeLink(r, d, o) { return pack(snap(r, d, o)).then(function (z) { return base() + '#ricetta=' + z; }); }

  /* ── stampa o PDF con l'intestazione del ricettario ── */
  function printHTML(html, css) {
    var area = $('printArea'); if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); } else if (area.parentNode !== document.body) document.body.appendChild(area);
    area.innerHTML = '<style>' + (css || '') + '</style>' + html;
    document.body.classList.add('pd-printing');
    var done = function () { document.body.classList.remove('pd-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 80);
  }
  function pdfOf(r, d, o) {
    if (r._lang !== 'en' && typeof pdPrint === 'function' && typeof pdSnap === 'function') {
      var it = pdSnap(r, d); if (o.proc === false) it.p = '';
      var docName = r.n + (d !== 1 ? ' · ' + fx(d) : '');
      pdPrint({ name: docName, onePerPage: false, items: [it] });
      return;
    }
    printHTML(viewHTML(snap(r, d, o), d, true), PRINT_CSS);
  }

  /* ── foglio «Condividi» (chi manda) ── */
  var S = { r: null, d: 1, o: { proc: true, notes: false } };
  function open(r, d) {
    if (!r) return; S.r = r; S.d = d > 0 ? d : 1; S.o = { proc: true, notes: false }; S.lang = 'it'; S.en = null; S.busy = false;
    var old = $('rsBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'rsBg'; bg.className = 'rs-bg';
    bg.innerHTML = '<div class="rs-sheet" role="dialog" aria-modal="true" aria-labelledby="rsT"><span class="rs-grab"></span><div class="rs-in" id="rsIn"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick);
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('rsBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'rsBgOut'; setTimeout(function () { bg.remove(); }, 250); }
  function paint() {
    var r = S.r, d = S.d, tot = 0; (r.i || []).forEach(function (g) { var v = num(g[1]); if (v != null && /^(g|gr|ml)?$/i.test(String(g[2] || 'g'))) tot += v; });
    var nIng = (r.i || []).length, hasP = !!(r.p && String(r.p).trim()), hasN = !!(r.nt && String(r.nt).trim());
    $('rsIn').innerHTML =
      '<header class="rs-hd"><div><span class="rs-k">Condividi la ricetta</span><h3 id="rsT">' + esc(r.n) + '</h3></div><button type="button" class="rs-x" data-x aria-label="Chiudi">×</button></header>' +
      '<div class="rs-prev"><span class="rs-brand">' + esc((WL.brand && WL.brand().name) || 'Ricettario') + '</span><b>' + esc(r.n) + '</b><small>' + nIng + ' ingredienti' + (tot ? ' · ' + fq(tot * d) + ' g' : '') + (hasP ? ' · procedimento' : '') + '</small></div>' +
      '<div class="rs-row"><span class="rs-l">Dose</span><div class="rs-dose"><button type="button" data-dm aria-label="Meno">−</button><output>' + fx(d) + '</output><button type="button" data-dp aria-label="Più">+</button></div></div>' +
      '<div class="rs-pre">' + [0.5, 1, 2, 3, 5].map(function (x) { return '<button type="button" data-d="' + x + '" class="' + (Math.abs(x - d) < 1e-9 ? 'on' : '') + '">' + fx(x) + '</button>'; }).join('') + '</div>' +
      '<div class="rs-row"><span class="rs-l">Lingua</span><div class="rs-lang" role="radiogroup"><button type="button" data-lang="it" class="' + (S.lang === 'it' ? 'on' : '') + '" aria-pressed="' + (S.lang === 'it') + '">Italiano</button><button type="button" data-lang="en" class="' + (S.lang === 'en' ? 'on' : '') + '" aria-pressed="' + (S.lang === 'en') + '"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Traduco…' : 'English') + '</button></div></div>' +
      (S.lang === 'en' && S.en ? '<p class="rs-en">Professional kitchen English · <b>' + esc(S.en.name) + '</b></p>' : '') + (S.enErr ? '<p class="rs-en err">' + esc(S.enErr) + '</p>' : '') +
      (hasP ? '<label class="rs-sw"><span>Procedimento</span><input type="checkbox" data-o="proc"' + (S.o.proc ? ' checked' : '') + '><i></i></label>' : '') +
      (hasN ? '<label class="rs-sw"><span>Note della ricetta</span><input type="checkbox" data-o="notes"' + (S.o.notes ? ' checked' : '') + '><i></i></label>' : '') +
      '<div class="rs-acts">' +
        '<button type="button" class="rs-b dark" data-a="send">' + ICON.share + '<span>Invia il link</span></button>' +
        '<button type="button" class="rs-b" data-a="copy">' + ICON.link + '<span>Copia link</span></button>' +
        '<button type="button" class="rs-b" data-a="pdf">' + ICON.pdf + '<span>PDF o stampa</span></button>' +
      '</div>' +
      '<p class="rs-note">Chi riceve il link vede la ricetta senza accedere, alla dose scelta, e può salvarla nel suo Ricettario. Il link contiene la ricetta stessa: non passa dai nostri server.</p>';
  }
  function onClick(e) {
    var bg = $('rsBg'); if (!bg) return;
    if (e.target === bg || e.target.closest('[data-x]')) return close();
    var t = e.target.closest('button,input'); if (!t) return;
    if (t.hasAttribute('data-o')) { S.o[t.dataset.o] = t.checked; return; }
    if (t.hasAttribute('data-dm')) { S.d = Math.max(0.1, Math.round((S.d - (S.d <= 1 ? 0.25 : 0.5)) * 100) / 100); return paint(); }
    if (t.hasAttribute('data-dp')) { S.d = Math.round((S.d + (S.d < 1 ? 0.25 : 0.5)) * 100) / 100; return paint(); }
    if (t.dataset.d) { S.d = +t.dataset.d; return paint(); }
    if (t.dataset.lang) { if (t.dataset.lang === 'it') { S.lang = 'it'; S.enErr = ''; return paint(); } return toEnglish(); }
    var a = t.dataset.a; if (!a) return;
    var R = cur();
    if (a === 'pdf') { close(); return pdfOf(R, S.d, S.o); }
    makeLink(R, S.d, S.o).then(function (url) {
      var title = R.n + (S.d !== 1 ? ' (' + fx(S.d) + ')' : ''), who = (WL.brand && WL.brand().name) || '';
      if (a === 'send' && navigator.share) {
        return navigator.share({ title: title, text: title + (who ? ' · ' + who : ''), url: url }).then(function () { close(); }, function (er) { if (er && er.name !== 'AbortError') copy(url); });
      }
      copy(url);
    }).catch(function (er) { alert('Non riesco a preparare il link: ' + (er && er.message || er)); });
  }
  /* ── versione inglese: traduzione AI (salvata sul dispositivo finché la ricetta non cambia) ── */
  function hsh(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function enKey(r) { return 'tr_en:' + (r._id || r.n) + ':' + hsh(JSON.stringify([r.n, r.i, r.p, r.nt])); }
  function enText(r) {
    var steps = String(r.p || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    return 'NAME: ' + r.n + '\nINGREDIENTS:\n' + (r.i || []).map(function (g) { return g[0]; }).join('\n') + '\nSTEPS:\n' + steps.join('\n') + (r.nt ? '\nNOTES:\n' + r.nt : '');
  }
  function toEnglish() {
    var r = S.r, k = enKey(r), c = null; try { c = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
    if (c) { S.en = c; S.lang = 'en'; return paint(); }
    if (typeof aiRunTask !== 'function') { S.enErr = 'AI non disponibile'; return paint(); }
    S.busy = true; S.enErr = ''; paint();
    aiRunTask('tr_en', enText(r)).then(function (j) {
      var n = (r.i || []).length, ing = Array.isArray(j.ingredients) ? j.ingredients.map(String) : [];
      if (!j.name || ing.length !== n) throw new Error('Traduzione incompleta: riprova');
      S.en = { name: String(j.name), ingredients: ing, steps: Array.isArray(j.steps) ? j.steps.map(String) : [], notes: String(j.notes || '') };
      try { localStorage.setItem(k, JSON.stringify(S.en)); } catch (e) {}
      S.lang = 'en';
    }).catch(function (e) { S.enErr = e.message || 'Traduzione non riuscita'; }).then(function () { S.busy = false; if ($('rsBg')) paint(); });
  }
  function cur() {
    var r = S.r; if (S.lang !== 'en' || !S.en) return r;
    var E = S.en, steps = String(r.p || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var x = Object.assign({}, r, { _lang: 'en', n: E.name, i: (r.i || []).map(function (g, k) { return [E.ingredients[k] || g[0], g[1], g[2]]; }) });
    if (steps.length) x.p = (E.steps.length ? E.steps : steps).map(function (st, k) { return (k + 1) + '. ' + String(st).replace(/^\d+[.)]\s*/, ''); }).join('\n');
    if (r.nt) x.nt = E.notes || r.nt;
    return x;
  }
  window.RSH_EN = { toEnglish: function (r) { S.r = r; return toEnglish(); }, cur: cur };
  function copy(url) {
    var ok = function () { toast('Link copiato'); var b = document.querySelector('#rsBg [data-a=copy] span'); if (b) b.textContent = 'Copiato ✓'; };
    try { navigator.clipboard.writeText(url).then(ok, function () { prompt('Copia il link', url); }); } catch (e) { prompt('Copia il link', url); }
  }

  /* ── vista di chi riceve ── */
  var V = { x: null, d: 1 };
  var EN_AL = { glutine: 'Gluten', latte: 'Milk', uova: 'Eggs', frutta_guscio: 'Tree nuts', arachidi: 'Peanuts', soia: 'Soy', sesamo: 'Sesame', pesce: 'Fish', crostacei: 'Crustaceans', molluschi: 'Molluscs', sedano: 'Celery', senape: 'Mustard', solfiti: 'Sulphites', lupini: 'Lupin' };
  function viewHTML(x, d, print) {
    var en = x.lang === 'en', T = function (it, e) { return en ? e : it; };
    var k = d > 0 ? d : 1, rows = '', tot = 0;
    x.i.forEach(function (g) { var v = g[1] == null ? null : g[1] * k; if (v != null && /^(g|gr|ml)?$/i.test(g[2] || 'g')) tot += v; });
    x.i.forEach(function (g) {
      var v = g[1] == null ? null : g[1] * k, pc = v != null && tot && /^(g|gr|ml)?$/i.test(g[2] || 'g') ? (v / tot * 100) : null;
      rows += '<tr><td>' + esc(g[0]) + '</td><td class="q">' + (v == null ? 'q.b.' : fq(v) + ' <small>' + esc(g[2] || 'g') + '</small>') + '</td><td class="pc">' + (pc == null ? '' : fq(pc) + '%') + '</td></tr>';
    });
    var AL = (window.NUT && NUT.ALLERGENI) || [], an = function (key) { var a = AL.filter(function (z) { return z[0] === key; })[0]; return a ? (print ? '' : a[2] + ' ') + (en && EN_AL[key] ? EN_AL[key] : a[1]) : (en && EN_AL[key]) || key; };
    var steps = x.p ? String(x.p).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
    return '<article class="rv-doc">' +
      '<header class="rv-hd">' + (x.b ? '<span class="rv-brand">' + esc(x.b) + '</span>' : '') + '<h1>' + esc(x.n) + '</h1>' +
        '<p class="rv-meta">' + [x.sec, x.c, x.pi].filter(Boolean).map(esc).join(' · ') + '</p></header>' +
      '<section class="rv-sum"><div><small>' + T('Totale', 'Total') + '</small><b>' + (tot ? fq(tot) + ' g' : '—') + '</b></div><div><small>' + T('Dose', 'Batch') + '</small><b>' + fx(k) + '</b></div><div><small>' + T('Ingredienti', 'Ingredients') + '</small><b>' + x.i.length + '</b></div></section>' +
      '<table class="rv-tab"><thead><tr><th>' + T('Ingrediente', 'Ingredient') + '</th><th class="q">' + T('Quantità', 'Quantity') + '</th><th class="pc">%</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      ((x.al && x.al.length) || (x.may && x.may.length) ? '<section class="rv-al"><h2>' + T('Allergeni', 'Allergens') + '</h2><p>' + (x.al || []).map(function (a) { return '<span>' + esc(an(a)) + '</span>'; }).join('') + (x.may && x.may.length ? '<em>' + T('Può contenere tracce di: ', 'May contain traces of: ') + x.may.map(function (a) { return esc(an(a).replace(/^\S+\s/, '')); }).join(', ') + '</em>' : '') + '</p></section>' : '') +
      (steps.length ? '<section class="rv-proc"><h2>' + T('Procedimento', 'Method') + '</h2><ol>' + steps.map(function (s) { return '<li>' + esc(s.replace(/^\d+[.)]\s*/, '')) + '</li>'; }).join('') + '</ol></section>' : '') +
      (x.nt ? '<section class="rv-nt"><h2>' + T('Note', 'Notes') + '</h2><p>' + esc(x.nt).replace(/\n/g, '<br>') + '</p></section>' : '') +
      '<footer class="rv-ft">' + (x.b ? T('Ricetta di ', 'Recipe by ') + esc(x.b) + ' · ' : '') + T('condivisa il ', 'shared on ') + esc(new Date(x.at || Date.now()).toLocaleDateString(en ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' })) + '</footer>' +
      '</article>';
  }
  function view(z) {
    return unpack(z).then(function (x) {
      if (!x || !x.n || !Array.isArray(x.i)) throw new Error('Link non valido');
      V.x = x; V.d = x.d || 1;
      var el = $('rvView'); if (!el) { el = document.createElement('div'); el.id = 'rvView'; el.className = 'rv'; document.body.appendChild(el); el.addEventListener('click', viewClick); }
      document.body.classList.add('rv-open');
      vpaint(); return x;
    }).catch(function (e) {
      var el = document.createElement('div'); el.id = 'rvView'; el.className = 'rv';
      el.innerHTML = '<div class="rv-bar"><span></span><button type="button" class="rv-b" data-a="x">Chiudi</button></div><div class="rv-wrap"><article class="rv-doc"><h1>Ricetta non disponibile</h1><p class="rv-meta">' + esc(e.message || 'Il link è incompleto o rovinato: chiedi di rimandarlo.') + '</p></article></div>';
      document.body.appendChild(el); el.addEventListener('click', viewClick); document.body.classList.add('rv-open');
    });
  }
  function canSave() { try { return WL.signedIn() && (!WL.canEdit || WL.canEdit()) && typeof saveRec === 'function'; } catch (e) { return false; } }
  function vpaint() {
    var el = $('rvView'), x = V.x; if (!el || !x) return;
    var st = el.querySelector('.rv-wrap'), y = st ? st.scrollTop : 0;
    el.innerHTML = '<div class="rv-bar"><span class="rv-tag">Ricetta condivisa</span><div class="rv-dose"><button type="button" data-dm aria-label="Meno">−</button><output>' + fx(V.d) + '</output><button type="button" data-dp aria-label="Più">+</button></div></div>' +
      '<div class="rv-wrap">' + viewHTML(x, V.d, false) + '</div>' +
      '<div class="rv-acts">' +
        (canSave() ? '<button type="button" class="rv-b dark" data-a="save">' + ICON.save + '<span>Salva nel mio Ricettario</span></button>' : '<button type="button" class="rv-b dark" data-a="login">' + ICON.save + '<span>' + (window.WL && WL.signedIn && WL.signedIn() ? 'Solo chi modifica può salvarla' : 'Accedi per salvarla') + '</span></button>') +
        '<button type="button" class="rv-b" data-a="pdf">' + ICON.pdf + '<span>PDF</span></button><button type="button" class="rv-b" data-a="x">Chiudi</button></div>';
    var w = el.querySelector('.rv-wrap'); if (w) w.scrollTop = y;
  }
  function closeView() { var el = $('rvView'); if (el) el.remove(); document.body.classList.remove('rv-open'); if (/^#ricetta=/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search); }
  function viewClick(e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-dm')) { V.d = Math.max(0.1, Math.round((V.d - (V.d <= 1 ? 0.25 : 0.5)) * 100) / 100); return vpaint(); }
    if (t.hasAttribute('data-dp')) { V.d = Math.round((V.d + (V.d < 1 ? 0.25 : 0.5)) * 100) / 100; return vpaint(); }
    var a = t.dataset.a;
    if (a === 'x') return closeView();
    if (a === 'pdf') return printHTML(viewHTML(V.x, V.d, true), PRINT_CSS);
    if (a === 'login') { if (window.WL && WL.signedIn && WL.signedIn()) return; try { sessionStorage.setItem('rv_pending', location.hash.slice(1)); } catch (x) {} closeView(); return; }
    if (a === 'save') {
      var x = V.x, k = V.d;
      var rec = { n: x.n, c: x.c || '', s: '', piatto: x.pi || '', i: x.i.map(function (g) { return [g[0], g[1] == null ? null : Math.round(g[1] * k * 100) / 100, g[2] || 'g']; }), p: x.p || '' };
      if (x.nt) rec.nt = x.nt; rec.src = (x.b ? 'Condivisa da ' + x.b : 'Ricetta condivisa') + ' · ' + (x.at || '');
      try { if (typeof curSec === 'string' && curSec && curSec !== 'tutti') rec.s = curSec; } catch (er) {}
      if (!rec.s) { try { var S0 = (typeof SECSf === 'function' ? SECSf() : []); if (S0[0]) rec.s = S0[0][0]; } catch (er) {} }
      if ((window.CU || []).some(function (r) { return r.n === rec.n; })) rec.n += ' (condivisa)';
      try { saveRec(rec); toast('Salvata nel tuo Ricettario: ' + rec.n); t.disabled = true; t.querySelector('span').textContent = 'Salvata ✓'; } catch (er) { alert('Non riesco a salvarla: ' + er.message); }
    }
  }
  function boot() {
    var m = location.hash.match(/^#ricetta=([A-Za-z0-9_-]+)/), pend = null;
    if (!m) { try { pend = sessionStorage.getItem('rv_pending'); } catch (e) {} if (pend && window.WL && WL.signedIn && WL.signedIn()) { try { sessionStorage.removeItem('rv_pending'); } catch (e) {} m = [0, pend.replace(/^ricetta=/, '')]; } }
    if (m) view(m[1]);
    /* il pulsante «Salva» si accende appena l'accesso è pronto */
    var n = 0; (function wait() { if (!$('rvView')) return; if (canSave() || ++n > 60) return vpaint(); setTimeout(wait, 1000); })();
  }
  window.addEventListener('hashchange', function () { var m = location.hash.match(/^#ricetta=([A-Za-z0-9_-]+)/); if (m) view(m[1]); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); }); else setTimeout(boot, 0);
  if (typeof window.boot === 'function') { var _b = window.boot; window.boot = function () { var r = _b.apply(this, arguments); setTimeout(function () { var p = null; try { p = sessionStorage.getItem('rv_pending'); } catch (e) {} if (p && !$('rvView')) boot(); else if ($('rvView')) vpaint(); }, 800); return r; }; }

  /* punti d'accesso: menu «⋯» delle schede e «Altro» della ricetta */
  var item = { k: 'share', icon: ICON.share, label: 'Condividi', t: 'Condividi la ricetta', s: 'Link di sola lettura o PDF, alla dose scelta', run: function (r, d) { open(r, d); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(item);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(item);
  window.RSH = { open: open, view: view, print: printHTML, makeLink: makeLink, snap: snap, pack: pack, unpack: unpack };

  var PRINT_CSS = '#printArea .rv-doc{font-family:"DM Sans",Arial,sans-serif;color:#1a1410;max-width:180mm;margin:0 auto}' +
    '#printArea .rv-hd{text-align:center;border-bottom:1px solid #C4933A;padding-bottom:8pt;margin-bottom:12pt}#printArea .rv-brand{font-family:"Cormorant SC",Georgia,serif;letter-spacing:.22em;font-size:8.5pt;color:#8B6914;text-transform:uppercase}' +
    '#printArea h1{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:400;font-size:26pt;margin:4pt 0}#printArea .rv-meta{font-size:9pt;color:#8B6914;margin:0}' +
    '#printArea .rv-sum{display:flex;gap:18pt;justify-content:center;margin:0 0 10pt;font-size:9pt}#printArea .rv-sum small{color:#888;margin-right:4pt}' +
    '#printArea table{width:100%;border-collapse:collapse;font-size:10.5pt}#printArea th{text-align:left;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#999;border-bottom:.75pt solid #C4933A;padding:3pt 4pt}#printArea td{padding:3.5pt 4pt;border-bottom:.5pt solid #eee}#printArea .q{text-align:right}#printArea .pc{text-align:right;color:#8B6914;font-size:9pt;width:14%}' +
    '#printArea h2{font-family:"Cormorant SC",Georgia,serif;font-size:9pt;letter-spacing:.16em;color:#8B6914;margin:12pt 0 4pt}#printArea .rv-al span{display:inline-block;margin-right:10pt;font-weight:600}#printArea .rv-al em{display:block;font-size:9pt;color:#555;margin-top:3pt}' +
    '#printArea ol{margin:0;padding-left:16pt;font-family:"Cormorant Garamond",Georgia,serif;font-size:12pt;line-height:1.5}#printArea .rv-nt p{font-size:10pt;color:#333}#printArea .rv-ft{margin-top:16pt;text-align:center;font-size:8pt;color:#999}';

  var css = document.createElement('style');
  css.textContent = [
    '.rs-bg{position:fixed;inset:0;z-index:9300;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,13,10,0);transition:background .24s}.rs-bg.on{background:rgba(15,13,10,.42)}',
    '.rs-sheet{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 20px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.rs-bg.on .rs-sheet{transform:none}@media(min-width:700px){.rs-bg{align-items:center}.rs-sheet{border-radius:24px;opacity:0;transform:translateY(14px);transition:transform .25s,opacity .2s}.rs-bg.on .rs-sheet{opacity:1}}',
    '.rs-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.rs-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.rs-k{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.rs-hd h3{margin:4px 0 0;font:500 1.55rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.rs-x{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:20px;cursor:pointer}',
    '.rs-prev{display:flex;flex-direction:column;gap:3px;padding:14px 16px;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--gold2,#B8862F) 10%,var(--card)),var(--card));border:1px solid var(--cb);margin-bottom:14px}',
    '.rs-brand{font:600 9.5px "DM Sans",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--gold3,#8B6408)}.rs-prev b{font:500 1.25rem "Cormorant Garamond",Georgia,serif;font-style:italic}.rs-prev small{font-size:.8rem;color:var(--smoke)}',
    '.rs-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.rs-l{font:600 .9rem "DM Sans",sans-serif}',
    '.rs-dose{display:flex;align-items:center;height:42px;border-radius:13px;background:var(--ctrl,rgba(0,0,0,.05))}.rs-dose button{width:42px;height:42px;border:0;background:none;font-size:20px;color:var(--ink);cursor:pointer}.rs-dose output{min-width:52px;text-align:center;font:700 15px "DM Sans",sans-serif;font-variant-numeric:tabular-nums}',
    '.rs-lang{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px;border-radius:12px;background:var(--bg2,rgba(0,0,0,.05));min-width:200px}.rs-lang button{height:34px;border:0;border-radius:9px;background:none;color:var(--ink2);font:600 .84rem "DM Sans",sans-serif;cursor:pointer}.rs-lang button.on{background:var(--card,#fff);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}.rs-lang button:disabled{opacity:.6}',
    '.rs-en{margin:-2px 0 8px;font-size:.8rem;color:var(--smoke)}.rs-en b{color:var(--ink);font-weight:600}.rs-en.err{color:#b3261e}',
    '.rs-pre{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:6px}.rs-pre button{height:38px;border-radius:11px;border:1px solid var(--cb);background:none;color:var(--ink2);font:600 .85rem "DM Sans",sans-serif;cursor:pointer}.rs-pre button.on{background:var(--ink);color:var(--bg);border-color:transparent}',
    '.rs-sw{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--cb);font:500 .92rem "DM Sans",sans-serif;cursor:pointer}.rs-sw input{position:absolute;opacity:0;pointer-events:none}',
    '.rs-sw i{position:relative;width:46px;height:28px;border-radius:99px;background:var(--cb);transition:background .2s}.rs-sw i::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}',
    '.rs-sw input:checked+i{background:var(--ok,#3F8F4A)}.rs-sw input:checked+i::after{transform:translateX(18px)}',
    '.rs-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.rs-acts .dark{grid-column:1/-1}',
    '.rs-b{display:flex;align-items:center;justify-content:center;gap:8px;height:50px;border-radius:15px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 .92rem "DM Sans",sans-serif;cursor:pointer}.rs-b.dark{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}',
    '.rs-note{margin:12px 0 0;font-size:.76rem;line-height:1.45;color:var(--smoke)}',
    /* vista di chi riceve */
    'body.rv-open{overflow:hidden}',
    '.rv{position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;background:var(--bg,#F5EFE0);color:var(--ink,#1A1A16);font-family:"DM Sans",system-ui,sans-serif}',
    '.rv-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid var(--cb,rgba(0,0,0,.08));background:var(--card,#fff)}',
    '.rv-tag{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.rv-dose{display:flex;align-items:center;height:40px;border-radius:12px;background:var(--ctrl,rgba(0,0,0,.05))}.rv-dose button{width:40px;height:40px;border:0;background:none;font-size:19px;color:var(--ink);cursor:pointer}.rv-dose output{min-width:48px;text-align:center;font:700 15px "DM Sans",sans-serif}',
    '.rv-wrap{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 16px 24px}',
    '.rv-doc{max-width:720px;margin:0 auto;background:var(--card,#fff);border:1px solid var(--cb,rgba(0,0,0,.08));border-radius:22px;padding:24px 20px}',
    '.rv-hd{text-align:center;padding-bottom:14px;border-bottom:1px solid var(--cb,rgba(0,0,0,.08));margin-bottom:14px}',
    '.rv-brand{font:600 10px "DM Sans",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.rv-doc h1{margin:6px 0 4px;font:500 clamp(1.8rem,7vw,2.5rem)/1.1 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.rv-meta{margin:0;font-size:.85rem;color:var(--smoke,#888)}',
    '.rv-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.rv-sum div{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:var(--ctrl,rgba(0,0,0,.04))}.rv-sum small{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--smoke)}.rv-sum b{font:700 1.05rem "DM Sans",sans-serif;font-variant-numeric:tabular-nums}',
    '.rv-tab{width:100%;border-collapse:collapse;font-size:.95rem}.rv-tab th{text-align:left;font:600 .68rem "DM Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke);padding:6px 4px;border-bottom:1px solid var(--cb)}',
    '.rv-tab td{padding:9px 4px;border-bottom:1px solid var(--cb,rgba(0,0,0,.06))}.rv-tab .q{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}.rv-tab .q small{font-weight:400;color:var(--smoke)}.rv-tab .pc{text-align:right;width:58px;color:var(--gold3,#8B6408);font-size:.8rem}',
    '.rv-doc h2{margin:20px 0 8px;font:700 .72rem "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.rv-al p{display:flex;flex-wrap:wrap;gap:6px;margin:0}.rv-al span{padding:5px 11px;border-radius:99px;background:var(--ctrl,rgba(0,0,0,.05));font-size:.85rem;font-weight:600}.rv-al em{flex-basis:100%;font-size:.8rem;color:var(--smoke)}',
    '.rv-proc ol{margin:0;padding-left:20px;font:400 1.1rem/1.55 "Cormorant Garamond",Georgia,serif}.rv-proc li{margin-bottom:8px}.rv-nt p{margin:0;font-size:.9rem;line-height:1.5;color:var(--ink2)}',
    '.rv-ft{margin-top:22px;text-align:center;font-size:.75rem;color:var(--smoke)}',
    '.rv-acts{display:flex;gap:8px;padding:10px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--cb,rgba(0,0,0,.08));background:var(--card,#fff)}',
    '.rv-b{display:flex;align-items:center;justify-content:center;gap:8px;height:50px;padding:0 16px;border-radius:15px;border:1px solid var(--cb,rgba(0,0,0,.1));background:var(--card,#fff);color:var(--ink);font:600 .9rem "DM Sans",sans-serif;cursor:pointer}.rv-b.dark{flex:1;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}.rv-b:disabled{opacity:.7}'
  ].join('\n');
  document.head.appendChild(css);
})();
