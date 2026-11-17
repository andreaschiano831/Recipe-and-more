/* ════════════════════════════════════════════════════════════════════
   STORICO E NOTE DI BRIGATA (scheda «Storico» del Laboratorio)
   · Note di brigata: osservazioni di produzione su una ricetta, che
     tutti i membri possono scrivere («oggi ci ha messo 20 min in più»)
   · Storico: chi ha creato, modificato o eliminato la ricetta e quando,
     con le differenze (ingredienti, quantità, procedimento, note…) e
     «Ripristina questa versione» per chi può modificare.
   Lo storico è scritto dal database stesso a ogni salvataggio.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var XL = window.XL; if (!XL) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fq(v) { if (v == null || v === '') return 'q.b.'; return String(Math.round(+v * 100) / 100).replace('.', ','); }
  var MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  function when(t) { var d = new Date(t), m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'adesso'; if (m < 60) return m + ' min fa'; var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' ora fa' : ' ore fa'); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function canEdit() { return !(window.WL && WL.canEdit) || WL.canEdit(); }
  function rid(r) { return r && r._id != null && /^\d+$/.test(String(r._id)) ? String(r._id) : null; }
  function setupErr(e) { return e && (e.status === 404 || /ricette_storia|ricette_note|schema cache|does not exist|Could not find/i.test(e.message || '')); }

  /* ── differenze tra due versioni ── */
  function ingKey(g) { return String(g[0] || '').trim().toLowerCase(); }
  function diff(o, n) {
    o = o || {}; n = n || {}; var out = [];
    if ((o.n || '') !== (n.n || '')) out.push(['nome', 'Nome: «' + (o.n || '') + '» → «' + (n.n || '') + '»']);
    if ((o.s || '') !== (n.s || '')) out.push(['sez', 'Sezione: ' + (WL.secLabel(o.s) || '—') + ' → ' + (WL.secLabel(n.s) || '—')]);
    if ((o.c || '') !== (n.c || '')) out.push(['cat', 'Categoria: ' + (o.c || '—') + ' → ' + (n.c || '—')]);
    if ((o.piatto || '') !== (n.piatto || '')) out.push(['pia', 'Piatto: ' + (o.piatto || '—') + ' → ' + (n.piatto || '—')]);
    var A = {}, B = {}; (o.i || []).forEach(function (g) { A[ingKey(g)] = g; }); (n.i || []).forEach(function (g) { B[ingKey(g)] = g; });
    Object.keys(B).forEach(function (k) {
      var b = B[k], a = A[k];
      if (!a) out.push(['add', '+ ' + b[0] + ' ' + fq(b[1]) + ' ' + (b[2] || 'g')]);
      else if (String(a[1]) !== String(b[1]) || (a[2] || 'g') !== (b[2] || 'g')) out.push(['qty', b[0] + ': ' + fq(a[1]) + ' ' + (a[2] || 'g') + ' → ' + fq(b[1]) + ' ' + (b[2] || 'g')]);
    });
    Object.keys(A).forEach(function (k) { if (!B[k]) out.push(['del', '− ' + A[k][0] + ' ' + fq(A[k][1]) + ' ' + (A[k][2] || 'g')]); });
    if ((o.p || '').trim() !== (n.p || '').trim()) {
      var lo = (o.p || '').split(/\n+/).filter(Boolean).length, ln = (n.p || '').split(/\n+/).filter(Boolean).length;
      out.push(['proc', !o.p ? 'Procedimento aggiunto' : !n.p ? 'Procedimento tolto' : 'Procedimento modificato' + (ln !== lo ? ' (' + (ln > lo ? '+' : '') + (ln - lo) + (Math.abs(ln - lo) === 1 ? ' riga)' : ' righe)') : '')]);
    }
    if ((o.nt || '').trim() !== (n.nt || '').trim()) out.push(['nt', !o.nt ? 'Note aggiunte' : !n.nt ? 'Note tolte' : 'Note modificate']);
    return out;
  }

  /* ── vista ── */
  var S = { r: null, notes: [], hist: [], open: {} };
  function render() {
    var host = $('xlHist'), r = XL.rec; if (!host || !r) return;
    S.r = r;
    var id = rid(r);
    if (!id) { host.innerHTML = '<div class="lb-card hs-empty">Questa ricetta non è ancora salvata nel database: lo storico e le note compaiono appena viene sincronizzata.</div>'; return; }
    host.innerHTML = '<div class="hs"><section class="lb-card hs-notes"><div class="lb-h"><span class="lb-eyebrow">Note di brigata</span><span class="lb-count" id="hsNN"></span></div>' +
      '<form class="hs-add" id="hsAdd"><textarea id="hsBody" rows="2" maxlength="2000" placeholder="Un’osservazione per la brigata: tempi, resa, fornitore, cosa migliorare…"></textarea><button type="submit" class="lb-btn dark">Aggiungi</button></form>' +
      '<div id="hsNotes" class="hs-list"><p class="lb-empty sm">Carico…</p></div></section>' +
      '<section class="lb-card hs-hist"><div class="lb-h"><span class="lb-eyebrow">Storico delle modifiche</span><span class="lb-count" id="hsHN"></span></div><div id="hsHist" class="hs-tl"><p class="lb-empty sm">Carico…</p></div></section></div>';
    $('hsAdd').onsubmit = function (e) {
      e.preventDefault(); var b = $('hsBody').value.trim(); if (!b) return;
      var btn = this.querySelector('button'); btn.disabled = true;
      WL.rest('ricette_note', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner_id: WL.ws, recipe_id: +id, author_name: myName(), body: b } })
        .then(function (x) { $('hsBody').value = ''; if (x && x[0]) S.notes.unshift(x[0]); drawNotes(); XL.toast('Nota aggiunta'); })
        .catch(function (er) { alert('Nota non salvata: ' + er.message); }).then(function () { btn.disabled = false; });
    };
    load(id);
  }
  function myName() { try { var u = WL.user(); return (u && u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || String(WL.email()).split('@')[0]; } catch (e) { return ''; } }
  function load(id) {
    var q = '&owner_id=eq.' + WL.ws + '&recipe_id=eq.' + id;
    Promise.all([
      WL.rest('ricette_note?select=*' + q + '&order=created_at.desc&limit=100'),
      WL.rest('ricette_storia?select=*' + q + '&order=created_at.desc&limit=60')
    ]).then(function (res) { S.notes = res[0] || []; S.hist = res[1] || []; drawNotes(); drawHist(); }, function (e) {
      var msg = setupErr(e) ? (window.sqlSetupCard ? sqlSetupCard('storico e note di brigata') : 'Esegui supabase/schema.sql nel SQL Editor di Supabase.') : 'Non riesco a caricare: ' + esc(e.message);
      if (setupErr(e) && window.sqlSetupCard) { var n = $('hsNotes'), hh = $('hsHist'); if (n) n.innerHTML = msg; if (hh) hh.innerHTML = ''; return; }
      ['hsNotes', 'hsHist'].forEach(function (k) { var b = $(k); if (b) b.innerHTML = '<p class="lb-empty sm">' + msg + '</p>'; });
    });
  }
  function drawNotes() {
    var box = $('hsNotes'); if (!box) return;
    $('hsNN').textContent = S.notes.length ? S.notes.length + (S.notes.length === 1 ? ' nota' : ' note') : '';
    box.innerHTML = S.notes.length ? S.notes.map(function (n) {
      var mine = n.author_id === WL.uid;
      return '<article class="hs-note' + (mine ? ' mine' : '') + '"><div class="hs-nh"><b>' + esc(n.author_name || '—') + '</b><span>' + when(n.created_at) + '</span>' + (mine || WL.isAdmin() ? '<button type="button" class="hs-x" data-del="' + esc(n.id) + '" aria-label="Elimina nota">×</button>' : '') + '</div><p>' + esc(n.body).replace(/\n/g, '<br>') + '</p></article>';
    }).join('') : '<p class="lb-empty sm">Nessuna nota ancora. Le note di brigata le vedono tutti i membri e restano sulla ricetta.</p>';
    [].forEach.call(box.querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () { if (!confirm('Eliminare questa nota?')) return; WL.rest('ricette_note?id=eq.' + b.dataset.del, { method: 'DELETE' }).then(function () { S.notes = S.notes.filter(function (n) { return n.id !== b.dataset.del; }); drawNotes(); }); };
    });
  }
  var ACT = { create: 'ha creato la ricetta', update: 'ha modificato', delete: 'ha eliminato la ricetta' };
  function drawHist() {
    var box = $('hsHist'); if (!box) return;
    $('hsHN').textContent = S.hist.length ? S.hist.length + (S.hist.length === 1 ? ' evento' : ' eventi') : '';
    if (!S.hist.length) { box.innerHTML = '<p class="lb-empty sm">Nessuna modifica registrata. Da ora ogni salvataggio compare qui con chi l’ha fatto.</p>'; return; }
    box.innerHTML = S.hist.map(function (h, i) {
      var d = h.action === 'update' ? diff(h.old_data, h.new_data) : [], ver = h.new_data || h.old_data || {};
      var open = !!S.open[h.id];
      return '<article class="hs-ev a-' + h.action + '"><i class="hs-dot"></i><div class="hs-eb"><div class="hs-eh"><b>' + esc(h.user_name || 'Qualcuno') + '</b> ' + ACT[h.action] + '<span>' + when(h.created_at) + '</span></div>' +
        (d.length ? '<ul class="hs-diff">' + d.slice(0, open ? 99 : 5).map(function (x) { return '<li class="k-' + x[0] + '">' + esc(x[1]) + '</li>'; }).join('') + (!open && d.length > 5 ? '<li class="more">+ altre ' + (d.length - 5) + '</li>' : '') + '</ul>' : '') +
        '<div class="hs-ea"><button type="button" class="hs-link" data-open="' + h.id + '">' + (open ? 'Nascondi la versione' : 'Vedi la versione') + '</button>' +
        (canEdit() && i > 0 && h.action !== 'delete' && h.new_data ? '<button type="button" class="hs-link strong" data-restore="' + i + '">Ripristina questa versione</button>' : '') + '</div>' +
        (open ? '<div class="hs-ver"><b>' + esc(ver.n || '') + '</b><table>' + (ver.i || []).map(function (g) { return '<tr><td>' + esc(g[0]) + '</td><td>' + fq(g[1]) + ' ' + esc(g[2] || 'g') + '</td></tr>'; }).join('') + '</table>' + (ver.p ? '<p>' + esc(ver.p).replace(/\n/g, '<br>') + '</p>' : '') + '</div>' : '') +
        '</div></article>';
    }).join('');
    [].forEach.call(box.querySelectorAll('[data-open]'), function (b) { b.onclick = function () { S.open[b.dataset.open] = !S.open[b.dataset.open]; drawHist(); }; });
    [].forEach.call(box.querySelectorAll('[data-restore]'), function (b) {
      b.onclick = function () {
        var h = S.hist[+b.dataset.restore], v = JSON.parse(JSON.stringify(h.new_data)), r = S.r;
        if (!confirm('Ripristinare la versione salvata da ' + (h.user_name || 'qualcuno') + ' (' + when(h.created_at) + ')? La versione attuale resta nello storico.')) return;
        delete v._id; delete v._c;
        try { updateRec(r, v); } catch (e) { alert('Non riesco a ripristinare: ' + e.message); return; }
        XL.toast('Versione ripristinata');
        setTimeout(function () { var f = (window.CU || []).filter(function (x) { return String(x._id) === String(r._id); })[0]; if (f) XL.rec = f; render(); }, 900);
      };
    });
  }
  XL.renderHist = render;
  XL.diff = diff;

  /* ── nella scheda ricetta: note di brigata e ultima modifica ── */
  if (typeof window.openRecipePanel === 'function') {
    var _orp = window.openRecipePanel;
    window.openRecipePanel = function (r) {
      var out = _orp.apply(this, arguments);
      try {
        var name = $('rpName'), box = $('hsRp');
        if (name && !box) { box = document.createElement('button'); box.type = 'button'; box.id = 'hsRp'; box.className = 'hs-rp'; name.parentNode.appendChild(box); }
        if (box) {
          box.hidden = true; var id = rid(r);
          box.onclick = function () { var rr = window._rpRec; closeRecipePanel(); if (rr) XL.open(rr, 'hist'); };
          if (id && window.WL && WL.signedIn()) {
            var q = '&owner_id=eq.' + WL.ws + '&recipe_id=eq.' + id;
            Promise.all([WL.rest('ricette_note?select=id' + q), WL.rest('ricette_storia?select=user_name,created_at,action' + q + '&order=created_at.desc&limit=1')]).then(function (res) {
              if (window._rpRec !== r) return;
              var n = (res[0] || []).length, h = (res[1] || [])[0], bits = [];
              if (n) bits.push('<b>' + n + (n === 1 ? ' nota' : ' note') + ' di brigata</b>');
              if (h) bits.push((h.action === 'create' ? 'creata' : 'modificata') + ' da ' + esc(h.user_name || '—') + ', ' + when(h.created_at));
              if (bits.length) { box.innerHTML = bits.join(' · ') + ' <i>›</i>'; box.hidden = false; }
            }).catch(function () {});
          }
        }
      } catch (e) {}
      return out;
    };
  }
})();
