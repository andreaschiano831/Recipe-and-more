/* review.js — Revisione da chef (scheda «Revisione» nell'Analisi).
   L'AI legge ingredienti, procedimento e composizione come farebbe un executive pastry chef prima del servizio:
   rapporti, dosi di gelificanti, temperature, sicurezza, passaggi mancanti, errori di trascrizione.
   Dà un voto, una sintesi e al massimo 7 punti con la correzione in numeri. Ogni punto si può mandare nelle note.
   La revisione resta salvata sul dispositivo finché la ricetta non cambia. */
(function () {
  'use strict';
  var XL = window.XL; if (!XL || !XL.addPane) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function sig(r) { return hash(JSON.stringify([r.n, r.c, r.i, r.p])); }
  function key(r) { return 'rv_' + (r._id || r.n); }
  function get(r) { try { return JSON.parse(localStorage.getItem(key(r)) || 'null'); } catch (e) { return null; } }
  function put(r, v) { try { localStorage.setItem(key(r), JSON.stringify(v)); } catch (e) {} }
  var LV = { errore: ['lv-err', 'Da correggere'], attenzione: ['lv-warn', 'Attenzione'], ok: ['lv-ok', 'Va bene'] };
  var busy = {};

  function text(r) {
    var t = '';
    try { var A = rcAnalyze(r.i || []), P = rcProfile(r.c, r.s, r.n); t = rcSummaryText(r.n, r.c, r.i, A, P); } catch (e) {
      t = 'Ricetta: ' + r.n + (r.c ? ' (' + r.c + ')' : '') + '\nIngredienti:\n' + (r.i || []).map(function (g) { return '- ' + g[0] + ' ' + (g[1] == null ? 'q.b.' : g[1] + ' ' + (g[2] || 'g')); }).join('\n');
    }
    if (r.piatto) t += '\nFa parte del piatto: ' + r.piatto;
    if (r.resa) t += '\nResa: ' + r.resa;
    t += '\nProcedimento:\n' + (String(r.p || '').trim() || '(nessun procedimento scritto)');
    return t;
  }
  function clean(j) {
    var v = Math.max(1, Math.min(10, Math.round(+j.voto || 0))) || null;
    var P = (Array.isArray(j.punti) ? j.punti : []).slice(0, 7).map(function (p) {
      var l = String(p.livello || '').toLowerCase(); l = /err/.test(l) ? 'errore' : /att|warn/.test(l) ? 'attenzione' : 'ok';
      return { l: l, t: String(p.titolo || '').slice(0, 80), d: String(p.dettaglio || '').slice(0, 400), c: String(p.correzione || '').slice(0, 300) };
    }).filter(function (p) { return p.t || p.d; });
    var ord = { errore: 0, attenzione: 1, ok: 2 }; P.sort(function (a, b) { return ord[a.l] - ord[b.l]; });
    return { v: v, s: String(j.sintesi || '').slice(0, 300), p: P };
  }
  function ring(v) {
    var c = 2 * Math.PI * 26, k = (v || 0) / 10, col = v >= 8 ? '#3f7d4e' : v >= 6 ? '#b8862f' : '#b3261e';
    return '<svg class="cr-ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--cb)" stroke-width="5"/><circle cx="32" cy="32" r="26" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + (c * k).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 32 32)"/><text x="32" y="38" text-anchor="middle" font-size="19" font-weight="700" fill="currentColor" font-family="DM Sans,sans-serif">' + (v || '–') + '</text></svg>';
  }
  function render(host, r) {
    if (!host || !r) return;
    var id = r._id || r.n, R = get(r), stale = R && R.sig !== sig(r), B = busy[id];
    var h = '<div class="cr">';
    if (!R || B) {
      h += '<div class="lb-card cr-intro"><span class="lb-eyebrow">Revisione da chef</span><p>Un executive pastry chef rilegge la ricetta prima del servizio: rapporti, dosi di gelatina e amidi, temperature, sicurezza, passaggi mancanti ed errori di trascrizione. Ti dà un voto e le correzioni in numeri.</p>' +
        (B ? '<div class="cr-wait"><span></span><span></span><span></span><em>Sto rileggendo «' + esc(r.n) + '»…</em></div>' : '<button type="button" class="lb-btn dark" data-go>Fai revisionare la ricetta</button>') +
        (B && B.err ? '' : '') + '</div>';
      if (R && R.err) h += '<p class="cr-err">' + esc(R.err) + '</p>';
    } else if (R.err) {
      h += '<div class="lb-card cr-intro"><span class="lb-eyebrow">Revisione da chef</span><p class="cr-err">' + esc(R.err) + '</p><button type="button" class="lb-btn dark" data-go>Riprova</button></div>';
    } else {
      var n = { errore: 0, attenzione: 0, ok: 0 }; R.p.forEach(function (p) { n[p.l]++; });
      h += '<div class="lb-card cr-head">' + ring(R.v) + '<div><span class="lb-eyebrow">Revisione da chef</span><p class="cr-sum">' + esc(R.s || '—') + '</p><p class="cr-cnt">' +
        (n.errore ? '<span class="lv-err">' + n.errore + ' da correggere</span>' : '') + (n.attenzione ? '<span class="lv-warn">' + n.attenzione + ' attenzione</span>' : '') + (n.ok ? '<span class="lv-ok">' + n.ok + ' ok</span>' : '') + '</p></div></div>';
      if (stale) h += '<div class="cr-stale"><span>La ricetta è cambiata dopo questa revisione.</span><button type="button" class="lb-link" data-go>Rifalla</button></div>';
      h += '<ol class="cr-list">' + R.p.map(function (p, i) {
        var L = LV[p.l];
        return '<li class="lb-card cr-pt ' + L[0] + '"><div class="cr-pth"><span class="cr-badge ' + L[0] + '">' + L[1] + '</span><b>' + esc(p.t) + '</b></div>' +
          (p.d ? '<p>' + esc(p.d) + '</p>' : '') + (p.c ? '<div class="cr-fix"><span>Correzione</span>' + esc(p.c) + '</div>' : '') +
          (p.l !== 'ok' ? '<button type="button" class="lb-link cr-note" data-note="' + i + '"' + (R.saved && R.saved[i] ? ' disabled' : '') + '>' + (R.saved && R.saved[i] ? '✓ Nelle note' : '+ Aggiungi alle note') + '</button>' : '') + '</li>';
      }).join('') + '</ol>';
      h += '<p class="cr-foot">Revisione del ' + esc(new Date(R.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })) + ' · <button type="button" class="lb-link" data-go>Rifai</button></p>';
    }
    host.innerHTML = h + '</div>';
    host.onclick = function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-go')) return run(host, r);
      if (b.dataset.note != null) {
        var p = R.p[+b.dataset.note]; if (!p) return;
        var d = new Date(), dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
        if (XL.addNotes(r, ['[Revisione ' + dd + '] ' + p.t + (p.c ? ': ' + p.c : '')])) { R.saved = R.saved || {}; R.saved[b.dataset.note] = 1; put(r, R); XL.toast('Aggiunto alle note'); render(host, XL.rec || r); }
      }
    };
  }
  function run(host, r) {
    var id = r._id || r.n; if (busy[id]) return;
    if (typeof aiRunTask !== 'function') { put(r, { err: 'AI non disponibile', sig: sig(r), at: Date.now() }); return render(host, r); }
    if (!(r.i || []).length) { XL.toast('Aggiungi prima gli ingredienti'); return; }
    busy[id] = {}; render(host, r);
    aiRunTask('review', text(r)).then(function (j) {
      var R = clean(j); if (!R.p.length && !R.s) throw new Error('La revisione è arrivata vuota: riprova');
      R.sig = sig(r); R.at = Date.now(); put(r, R);
    }).catch(function (e) { put(r, { err: e.message || 'AI non disponibile', sig: sig(r), at: Date.now() }); })
      .then(function () { delete busy[id]; if (XL.rec && (XL.rec._id || XL.rec.n) === id && host.isConnected) render(host, XL.rec); });
  }
  XL.addPane('analisi', 'review', 'Revisione', function (host, r) { render(host, r); }, 'formula');
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>';
  (XL.moreActs = XL.moreActs || []).push({ k: 'review', icon: ICON, t: 'Revisione da chef', s: 'Voto, errori e correzioni in numeri prima del servizio', keep: true, run: function () { XL.openSheet('review'); } });
  window.RV = { text: text, clean: clean, get: get };
  var st = document.createElement('style');
  st.textContent = [
    '.cr{display:grid;gap:12px}.cr-intro p{margin:6px 0 12px;font-size:.9rem;line-height:1.55;color:var(--ink2)}',
    '.cr-wait{display:flex;align-items:center;gap:6px;padding:6px 0}.cr-wait span{width:7px;height:7px;border-radius:50%;background:var(--gold2,#B8862F);animation:rvDot 1s infinite ease-in-out}.cr-wait span:nth-child(2){animation-delay:.15s}.cr-wait span:nth-child(3){animation-delay:.3s}.cr-wait em{font-style:normal;font-size:.86rem;color:var(--ink2);margin-left:6px}',
    '@keyframes rvDot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.cr-wait span{animation:none}}',
    '.cr-err{color:#b3261e;font-size:.88rem}',
    '.cr-head{display:flex;gap:16px;align-items:center}.cr-ring{flex-shrink:0;color:var(--ink)}.cr-sum{margin:4px 0 6px;font:500 1.12rem/1.35 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.cr-cnt{display:flex;flex-wrap:wrap;gap:6px;margin:0}.cr-cnt span,.cr-badge{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:99px;font:700 10.5px "DM Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase}',
    '.lv-err{--rv:#b3261e}.lv-warn{--rv:#9a6a0b}.lv-ok{--rv:#3f7d4e}.cr-cnt span,.cr-badge{color:var(--rv);background:color-mix(in srgb,var(--rv) 11%,transparent)}',
    '.cr-stale{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:color-mix(in srgb,#9a6a0b 10%,transparent);font-size:.85rem}',
    '.cr-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}.cr-pt{border-left:3px solid var(--rv)!important}',
    '.cr-pth{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.cr-pth b{font-size:.98rem}.cr-pt p{margin:6px 0 0;font-size:.88rem;line-height:1.5;color:var(--ink2)}',
    '.cr-fix{margin-top:8px;padding:8px 11px;border-radius:10px;background:var(--bg2,rgba(0,0,0,.04));font-size:.88rem;font-weight:600}.cr-fix span{display:block;font:700 9.5px "DM Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke);margin-bottom:2px}',
    '.cr-note{margin-top:6px}.cr-note:disabled{opacity:.6;cursor:default}.cr-foot{margin:0;font-size:.8rem;color:var(--smoke);text-align:center}'
  ].join('\n');
  document.head.appendChild(st);
})();
