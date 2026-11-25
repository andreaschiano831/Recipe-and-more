/* prove.js — Prove e varianti di una ricetta (scheda «Prove» nell'Analisi).
   Una prova è una copia delle quantità che puoi cambiare senza toccare la ricetta:
   assaggi, dai un voto e scrivi le note; poi confronti due versioni fianco a fianco
   (quantità e composizione) e applichi alla ricetta quella migliore.
   Le prove restano dentro la ricetta (campo «pv»), lo storico registra quando ne applichi una. */
(function () {
  'use strict';
  var XL = window.XL; if (!XL || !XL.addPane) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fq(v) { if (v == null) return 'q.b.'; var r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10; return String(r).replace('.', ','); }
  function f1(v) { return (Math.round(v * 10) / 10).toLocaleString('it-IT'); }
  function canEdit() { return !(window.WL && WL.canEdit) || WL.canEdit(); }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function nk(s) { return String(s || '').trim().toLowerCase(); }
  function today() { var d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
  function when(t) { try { return new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  var CRIT = [['dol', 'Dolcezza'], ['str', 'Struttura'], ['gus', 'Gusto']];
  var E = null; /* prova in modifica */

  function trials(r) { return Array.isArray(r.pv) ? r.pv : []; }
  function comp(ings) { try { var A = rcAnalyze(ings || []); return A.tot ? { tot: A.tot, s: A.s / A.tot * 100, f: A.f / A.tot * 100, sol: (A.tot - A.w) / A.tot * 100 } : null; } catch (e) { return null; } }
  function changes(base, ings) {
    var B = {}, out = []; (base || []).forEach(function (g) { B[nk(g[0])] = g; });
    var seen = {};
    (ings || []).forEach(function (g) {
      var k = nk(g[0]); seen[k] = 1; var o = B[k];
      if (!o) out.push({ t: 'add', s: '+ ' + g[0] + ' ' + fq(num(g[1])) + ' ' + (g[2] || 'g') });
      else if (num(o[1]) !== num(g[1])) { var a = num(o[1]), b = num(g[1]); out.push({ t: b > a ? 'up' : 'down', s: g[0] + ' ' + fq(a) + ' → ' + fq(b) + ' ' + (g[2] || 'g') + (a && b != null ? ' (' + (b > a ? '+' : '') + Math.round((b - a) / a * 100) + '%)' : '') }); }
    });
    (base || []).forEach(function (g) { if (!seen[nk(g[0])]) out.push({ t: 'del', s: '− ' + g[0] }); });
    return out;
  }
  function stars(v, edit) { var h = ''; for (var i = 1; i <= 5; i++) h += edit ? '<button type="button" class="pv-star' + (i <= v ? ' on' : '') + '" data-v="' + i + '" aria-label="' + i + ' su 5">★</button>' : '<i class="' + (i <= v ? 'on' : '') + '">★</i>'; return h; }

  /* ── pannello ── */
  function render(host, r) {
    if (!host || !r) return;
    if (E && E.rid === (r._id || r.n)) return renderEdit(host, r);
    var L = trials(r), ed = canEdit();
    var h = '<div class="pv">' +
      '<div class="lb-card pv-intro"><span class="lb-eyebrow">Prove e varianti</span><p>Cambia le quantità in una prova senza toccare la ricetta, assaggia, dai un voto e confronta. Quando sei convinto, applica la prova alla ricetta.</p>' +
      (ed ? '<button type="button" class="lb-btn dark" data-new>+ Nuova prova</button>' : '<p class="pv-ro">Solo admin e pastry chef creano le prove.</p>') + '</div>';
    if (L.length) {
      h += '<div class="pv-list">' + L.slice().reverse().map(function (p) {
        var ch = changes(r.i, p.i), C = comp(p.i);
        return '<article class="lb-card pv-item" data-id="' + esc(p.id) + '"><header><div><b>' + esc(p.n) + '</b><small>' + esc(when(p.at)) + (p.by ? ' · ' + esc(p.by) : '') + '</small></div><span class="pv-stars">' + stars(p.v || 0) + '</span></header>' +
          (ch.length ? '<ul class="pv-ch">' + ch.slice(0, 5).map(function (c) { return '<li class="' + c.t + '">' + esc(c.s) + '</li>'; }).join('') + (ch.length > 5 ? '<li>… e altre ' + (ch.length - 5) + '</li>' : '') + '</ul>' : '<p class="pv-same">Uguale alla ricetta</p>') +
          (p.c ? '<div class="pv-crit">' + CRIT.map(function (k) { return p.c[k[0]] ? '<span>' + k[1] + ' <b>' + p.c[k[0]] + '/5</b></span>' : ''; }).join('') + '</div>' : '') +
          (p.nt ? '<p class="pv-nt">«' + esc(p.nt) + '»</p>' : '') +
          (C ? '<p class="pv-comp mono">zuccheri ' + f1(C.s) + '% · grassi ' + f1(C.f) + '% · solidi ' + f1(C.sol) + '%</p>' : '') +
          '<div class="pv-acts"><button type="button" class="lb-btn" data-cmp="' + esc(p.id) + '">Confronta</button>' +
          (ed ? '<button type="button" class="lb-btn" data-edit="' + esc(p.id) + '">Modifica</button><button type="button" class="lb-btn dark" data-apply="' + esc(p.id) + '">Applica alla ricetta</button><button type="button" class="lb-link pv-del" data-del="' + esc(p.id) + '">Elimina</button>' : '') +
          '</div></article>';
      }).join('') + '</div>';
      h += '<div class="lb-card pv-cmp" id="pvCmp"></div>';
    }
    host.innerHTML = h + '</div>';
    host.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-new')) { E = { rid: r._id || r.n, p: { id: uid(), n: 'Prova ' + (L.length + 1), i: JSON.parse(JSON.stringify(r.i || [])), v: 0, c: {}, nt: '' }, isNew: true }; return render(host, XL.rec); }
      if (b.dataset.edit) { var p0 = L.filter(function (x) { return x.id === b.dataset.edit; })[0]; if (p0) { E = { rid: r._id || r.n, p: JSON.parse(JSON.stringify(p0)), isNew: false }; render(host, XL.rec); } return; }
      if (b.dataset.cmp) return compare(r, 'base', b.dataset.cmp);
      if (b.dataset.del) { if (!confirm('Eliminare questa prova?')) return; XL.patchRec(r, function (nd) { nd.pv = trials(nd).filter(function (x) { return x.id !== b.dataset.del; }); if (!nd.pv.length) delete nd.pv; }); return render(host, XL.rec); }
      if (b.dataset.apply) {
        var p = L.filter(function (x) { return x.id === b.dataset.apply; })[0]; if (!p) return;
        var ch = changes(r.i, p.i);
        if (!confirm('Applicare «' + p.n + '» alla ricetta?\n\n' + (ch.length ? ch.map(function (c) { return '• ' + c.s; }).join('\n') : 'Nessuna differenza nelle quantità.') + '\n\nLa versione di prima resta nello storico.')) return;
        var ok = XL.patchRec(r, function (nd) {
          nd.i = JSON.parse(JSON.stringify(p.i));
          nd.nt = (nd.nt ? String(nd.nt).replace(/\s+$/, '') + '\n' : '') + '[Prova applicata ' + today() + '] ' + p.n + (p.v ? ' (' + p.v + '/5)' : '') + (ch.length ? ': ' + ch.map(function (c) { return c.s; }).join(' · ') : '') + (p.nt ? ' — ' + p.nt : '');
          nd.pv = trials(nd).map(function (x) { if (x.id === p.id) x.applied = new Date().toISOString(); return x; });
        });
        if (ok) { XL.toast('Prova applicata: la ricetta è aggiornata'); render(host, XL.rec); }
      }
    };
  }
  function renderEdit(host, r) {
    var p = E.p, base = {};
    (r.i || []).forEach(function (g) { base[nk(g[0])] = num(g[1]); });
    var C0 = comp(r.i), C1 = comp(p.i);
    var row = function (g, i) {
      var b = base[nk(g[0])], v = num(g[1]), d = b != null && v != null && b !== v ? (v > b ? '+' : '') + fq(v - b) : b == null ? 'nuovo' : '';
      return '<div class="pv-er' + (d ? ' ch' : '') + '" data-i="' + i + '"><input class="pv-en" value="' + esc(g[0]) + '" aria-label="Ingrediente"><input class="pv-eq mono" inputmode="decimal" value="' + (g[1] == null ? '' : String(g[1]).replace('.', ',')) + '" aria-label="Quantità"><span class="pv-eu">' + esc(g[2] || 'g') + '</span><em class="pv-ed">' + esc(d) + '</em><button type="button" class="pv-rm" data-rm="' + i + '" aria-label="Togli">×</button></div>';
    };
    var dc = function (k, lbl) { if (!C0 || !C1) return ''; var a = C0[k], b = C1[k], dd = b - a; return '<span>' + lbl + ' <b class="mono">' + f1(b) + '%</b>' + (Math.abs(dd) >= 0.05 ? '<em class="' + (dd > 0 ? 'up' : 'down') + '">' + (dd > 0 ? '+' : '') + f1(dd) + '</em>' : '') + '</span>'; };
    host.innerHTML = '<div class="pv"><div class="lb-card pv-edit">' +
      '<div class="lb-h"><span class="lb-eyebrow">' + (E.isNew ? 'Nuova prova' : 'Modifica prova') + '</span><button type="button" class="lb-link" data-cancel>Annulla</button></div>' +
      '<input class="pv-name" id="pvName" value="' + esc(p.n) + '" aria-label="Nome della prova" placeholder="Es. Meno zucchero, burro 82%">' +
      '<div class="pv-rows" id="pvRows">' + (p.i || []).map(row).join('') + '</div>' +
      '<button type="button" class="lb-link" data-addrow>+ Aggiungi ingrediente</button>' +
      '<div class="pv-live">' + dc('s', 'Zuccheri') + dc('f', 'Grassi') + dc('sol', 'Solidi') + '</div>' +
      '<div class="pv-taste"><span class="lb-eyebrow">Assaggio</span><div class="pv-vote">' + stars(p.v || 0, true) + '</div>' +
        CRIT.map(function (k) { var v = (p.c || {})[k[0]] || 0; return '<div class="pv-cr"><span>' + k[1] + '</span><div>' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="' + (n <= v ? 'on' : '') + '" data-c="' + k[0] + '" data-n="' + n + '" aria-label="' + k[1] + ' ' + n + ' su 5"></button>'; }).join('') + '</div></div>'; }).join('') +
        '<textarea id="pvNt" rows="3" placeholder="Note di assaggio: consistenza, dolcezza, taglio, tenuta in vetrina…">' + esc(p.nt || '') + '</textarea></div>' +
      '<div class="pv-acts"><button type="button" class="lb-btn dark" data-save>Salva la prova</button></div></div></div>';
    var sync = function () {
      p.n = $('pvName').value.trim() || p.n; p.nt = $('pvNt').value.trim();
      [].forEach.call(host.querySelectorAll('.pv-er'), function (el) { var i = +el.dataset.i, ins = el.querySelectorAll('input'); if (!p.i[i]) return; p.i[i][0] = ins[0].value.trim(); var q = ins[1].value.trim(); p.i[i][1] = q === '' ? null : num(q); });
    };
    host.oninput = function (e) { if (e.target.classList.contains('pv-eq') || e.target.classList.contains('pv-en')) { sync(); clearTimeout(host._t); host._t = setTimeout(function () { var y = host.closest('.xr-sh-b') ? host.closest('.xr-sh-b').scrollTop : 0, f = document.activeElement, fi = f && f.closest('.pv-er') ? [+f.closest('.pv-er').dataset.i, f.classList.contains('pv-eq') ? 1 : 0, f.selectionStart] : null; renderEdit(host, r); if (host.closest('.xr-sh-b')) host.closest('.xr-sh-b').scrollTop = y; if (fi) { var el = host.querySelector('.pv-er[data-i="' + fi[0] + '"]'); if (el) { var inp = el.querySelectorAll('input')[fi[1]]; inp.focus(); try { inp.setSelectionRange(fi[2], fi[2]); } catch (x) {} } } }, 650); } };
    host.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return; sync();
      if (b.hasAttribute('data-cancel')) { E = null; return render(host, XL.rec); }
      if (b.dataset.rm != null) { p.i.splice(+b.dataset.rm, 1); return renderEdit(host, r); }
      if (b.hasAttribute('data-addrow')) { p.i.push(['', null, 'g']); renderEdit(host, r); var last = host.querySelectorAll('.pv-en'); if (last.length) last[last.length - 1].focus(); return; }
      if (b.dataset.v) { p.v = +b.dataset.v === p.v ? 0 : +b.dataset.v; return renderEdit(host, r); }
      if (b.dataset.c) { p.c = p.c || {}; p.c[b.dataset.c] = +b.dataset.n === p.c[b.dataset.c] ? 0 : +b.dataset.n; return renderEdit(host, r); }
      if (b.hasAttribute('data-save')) {
        p.i = p.i.filter(function (g) { return String(g[0] || '').trim(); });
        if (!p.i.length) { XL.toast('Aggiungi almeno un ingrediente'); return; }
        var me = ''; try { me = (WL.email && WL.email() || '').split('@')[0]; } catch (x) {}
        var rec = { id: p.id, n: p.n, at: p.at || new Date().toISOString(), i: p.i, v: p.v || 0, nt: p.nt || '', by: p.by || me };
        if (p.c && (p.c.dol || p.c.str || p.c.gus)) rec.c = p.c;
        var isNew = E.isNew;
        var ok = XL.patchRec(r, function (nd) { var L = trials(nd).filter(function (x) { return x.id !== rec.id; }); if (isNew) L.push(rec); else { var at = trials(nd).map(function (x) { return x.id; }).indexOf(rec.id); L.splice(at < 0 ? L.length : at, 0, rec); } nd.pv = L; });
        if (ok) { E = null; XL.toast(isNew ? 'Prova salvata' : 'Prova aggiornata'); render(host, XL.rec); }
      }
    };
  }
  /* confronto fianco a fianco: ricetta o una prova contro un'altra */
  function compare(r, a, b) {
    var box = $('pvCmp'); if (!box) return;
    var L = trials(r), opt = function (sel) { return '<option value="base"' + (sel === 'base' ? ' selected' : '') + '>Ricetta attuale</option>' + L.map(function (p) { return '<option value="' + esc(p.id) + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(p.n) + '</option>'; }).join(''); };
    var get = function (k) { if (k === 'base') return { n: 'Ricetta', i: r.i || [] }; return L.filter(function (p) { return p.id === k; })[0] || { n: '?', i: [] }; };
    var A = get(a), B = get(b), names = [], idx = {};
    [A.i, B.i].forEach(function (I) { (I || []).forEach(function (g) { var k = nk(g[0]); if (!(k in idx)) { idx[k] = names.length; names.push(g[0]); } }); });
    var q = function (I, nm) { var g = (I || []).filter(function (x) { return nk(x[0]) === nk(nm); })[0]; return g ? { v: num(g[1]), u: g[2] || 'g' } : null; };
    var CA = comp(A.i), CB = comp(B.i);
    box.innerHTML = '<div class="lb-h"><span class="lb-eyebrow">Confronto</span></div>' +
      '<div class="pv-sel"><select id="pvA" aria-label="Prima versione">' + opt(a) + '</select><span>vs</span><select id="pvB" aria-label="Seconda versione">' + opt(b) + '</select></div>' +
      '<table class="pv-tab"><thead><tr><th>Ingrediente</th><th>' + esc(A.n) + '</th><th>' + esc(B.n) + '</th></tr></thead><tbody>' +
      names.map(function (nm) { var x = q(A.i, nm), y = q(B.i, nm), diff = !x || !y || x.v !== y.v; return '<tr class="' + (diff ? 'd' : '') + '"><td>' + esc(nm) + '</td><td class="mono">' + (x ? fq(x.v) + ' ' + esc(x.u) : '—') + '</td><td class="mono">' + (y ? fq(y.v) + ' ' + esc(y.u) : '—') + '</td></tr>'; }).join('') +
      (CA && CB ? [['tot', 'Totale', ' g'], ['s', 'Zuccheri', '%'], ['f', 'Grassi', '%'], ['sol', 'Solidi', '%']].map(function (k) { return '<tr class="pv-c"><td>' + k[1] + '</td><td class="mono">' + (k[0] === 'tot' ? fq(CA.tot) : f1(CA[k[0]])) + k[2] + '</td><td class="mono">' + (k[0] === 'tot' ? fq(CB.tot) : f1(CB[k[0]])) + k[2] + '</td></tr>'; }).join('') : '') +
      '</tbody></table>' + (B.nt ? '<p class="pv-nt">' + esc(B.n) + ': «' + esc(B.nt) + '»</p>' : '');
    $('pvA').onchange = $('pvB').onchange = function () { compare(r, $('pvA').value, $('pvB').value); };
    box.classList.add('on'); try { box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }
  XL.addPane('analisi', 'prove', 'Prove', function (host, r) { if (E && E.rid !== (r._id || r.n)) E = null; render(host, r); }, 'hist');
  (XL.moreActs = XL.moreActs || []).push({ k: 'prove', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/></svg>', t: 'Prove e varianti', s: 'Cambia le quantità, assaggia, confronta, applica', keep: true, run: function () { XL.openSheet('prove'); } });
  window.PV = { trials: trials, changes: changes };

  var css = document.createElement('style');
  css.textContent = [
    '.pv{display:flex;flex-direction:column;gap:12px}',
    '.pv-intro p{margin:8px 0 12px;font-size:.88rem;line-height:1.5;color:var(--ink2)}.pv-ro{font-size:.8rem;color:var(--smoke)}',
    '.pv-item header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.pv-item header b{display:block;font:600 1rem "DM Sans",sans-serif}.pv-item header small{font-size:.76rem;color:var(--smoke)}',
    '.pv-stars i{font-style:normal;color:var(--cb);font-size:15px}.pv-stars i.on{color:var(--gold2,#B8862F)}',
    '.pv-ch{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:.84rem}.pv-ch li{padding-left:12px;position:relative;color:var(--ink2)}',
    '.pv-ch li::before{content:"";position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--smoke)}.pv-ch li.up::before{background:var(--warn,#C26A2B)}.pv-ch li.down::before{background:#4F7FA8}.pv-ch li.add::before{background:var(--ok,#3F8F4A)}.pv-ch li.del::before{background:#A33}',
    '.pv-same{margin:8px 0 0;font-size:.82rem;color:var(--smoke)}',
    '.pv-crit{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.pv-crit span{padding:3px 9px;border-radius:99px;background:var(--ctrl,rgba(0,0,0,.05));font-size:.76rem;color:var(--ink2)}',
    '.pv-nt{margin:10px 0 0;font:italic 400 1rem/1.45 "Cormorant Garamond",Georgia,serif;color:var(--ink2)}.pv-comp{margin:8px 0 0;font-size:.74rem;color:var(--smoke)}',
    '.pv-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}.pv-del{margin-left:auto;color:var(--warn,#B4532A)!important}',
    '.pv-name{width:100%;height:44px;margin:10px 0;padding:0 12px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 1rem "DM Sans",sans-serif}',
    '.pv-rows{display:flex;flex-direction:column;gap:6px}',
    '.pv-er{display:grid;grid-template-columns:minmax(0,1fr) 84px 26px 52px 28px;gap:6px;align-items:center}',
    '.pv-er input{height:40px;min-width:0;padding:0 10px;border-radius:10px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:400 15px "DM Sans",sans-serif}.pv-eq{text-align:right}',
    '.pv-er.ch .pv-eq{border-color:var(--gold2,#B8862F);background:color-mix(in srgb,var(--gold2,#B8862F) 8%,var(--card))}',
    '.pv-eu{font-size:.8rem;color:var(--smoke)}.pv-ed{font-style:normal;font-size:.74rem;font-weight:600;color:var(--gold3,#8B6408);text-align:right;white-space:nowrap}',
    '.pv-rm{width:28px;height:28px;border:0;border-radius:50%;background:none;color:var(--smoke);font-size:18px;cursor:pointer}',
    '.pv-live{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.pv-live span{padding:6px 10px;border-radius:10px;background:var(--ctrl,rgba(0,0,0,.04));font-size:.8rem;color:var(--ink2)}.pv-live em{font-style:normal;margin-left:5px;font-weight:700;font-size:.74rem}.pv-live em.up{color:var(--warn,#C26A2B)}.pv-live em.down{color:#4F7FA8}',
    '.pv-taste{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--cb)}',
    '.pv-vote{display:flex;gap:2px}.pv-star{width:40px;height:40px;border:0;background:none;color:var(--cb);font-size:28px;line-height:1;cursor:pointer;padding:0}.pv-star.on{color:var(--gold2,#B8862F)}',
    '.pv-cr{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.86rem;color:var(--ink2)}.pv-cr div{display:flex;gap:5px}',
    '.pv-cr button{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--cb);background:none;cursor:pointer;padding:0}.pv-cr button.on{background:var(--ink);border-color:var(--ink)}',
    '.pv-taste textarea{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:400 15px/1.45 "DM Sans",sans-serif;resize:vertical}',
    '.pv-cmp:not(.on){display:none}.pv-sel{display:flex;align-items:center;gap:8px;margin:8px 0 10px}.pv-sel select{flex:1;min-width:0;height:40px;border-radius:10px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 .85rem "DM Sans",sans-serif;padding:0 8px}.pv-sel span{font-size:.8rem;color:var(--smoke)}',
    '.pv-tab{width:100%;border-collapse:collapse;font-size:.86rem}.pv-tab th{text-align:left;font:600 .7rem "DM Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--smoke);padding:6px 4px;border-bottom:1px solid var(--cb)}.pv-tab th+th,.pv-tab td+td{text-align:right}',
    '.pv-tab td{padding:7px 4px;border-bottom:1px solid var(--cb)}.pv-tab tr.d td{background:color-mix(in srgb,var(--gold2,#B8862F) 9%,transparent);font-weight:600}.pv-tab tr.pv-c td{color:var(--ink2);font-size:.8rem}.pv-tab tr.pv-c:first-of-type td{border-top:2px solid var(--cb)}',
    '@media(max-width:420px){.pv-er{grid-template-columns:minmax(0,1fr) 72px 22px 44px 26px;gap:4px}}'
  ].join('\n');
  document.head.appendChild(css);
})();
