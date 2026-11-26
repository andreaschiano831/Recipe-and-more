/* scale.js — «Ho solo…»: scrivi quanto hai di uno o più ingredienti e la ricetta si ricalcola
   sull'ingrediente che finisce per primo. Mostra anche quanto avanza degli altri. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fq(v) { var r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10; return r.toLocaleString('it-IT'); }
  function fx(d) { return '×' + (Math.round(d * 100) / 100).toLocaleString('it-IT'); }
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/></svg>';
  var S = null;
  function open(r, dose, apply) {
    if (!r) return;
    S = { r: r, dose: dose || 1, have: {}, apply: apply };
    var old = $('sclBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'sclBg'; bg.className = 'scl-bg';
    bg.innerHTML = '<div class="scl-sheet" role="dialog" aria-modal="true" aria-labelledby="sclT"><span class="scl-grab"></span>' +
      '<header class="scl-hd"><div><span class="scl-k">Ho solo…</span><h3 id="sclT">' + esc(r.n) + '</h3></div><button type="button" class="scl-x" data-x aria-label="Chiudi">×</button></header>' +
      '<p class="scl-lead">Scrivi quanto hai degli ingredienti che mancano o che vuoi finire: la ricetta si ricalcola su quello che finisce per primo.</p>' +
      '<div class="scl-list" id="sclList"></div><div class="scl-res" id="sclRes"></div></div>';
    document.body.appendChild(bg);
    var L = $('sclList');
    (r.i || []).forEach(function (g, i) {
      var b = num(g[1]); if (!(b > 0)) return;
      var row = document.createElement('label'); row.className = 'scl-row';
      row.innerHTML = '<span class="scl-n">' + esc(g[0]) + '<small>ricetta: ' + fq(b * S.dose) + ' ' + esc(g[2] || 'g') + '</small></span><span class="scl-in"><input inputmode="decimal" data-i="' + i + '" placeholder="ne ho…" aria-label="Quanto hai di ' + esc(g[0]) + '"><em>' + esc(g[2] || 'g') + '</em></span>';
      L.appendChild(row);
    });
    bg.addEventListener('input', function (e) { var t = e.target; if (t.dataset.i == null) return; var v = num(t.value); if (v > 0) S.have[t.dataset.i] = v; else delete S.have[t.dataset.i]; paint(); });
    bg.addEventListener('click', function (e) {
      if (e.target === bg || e.target.closest('[data-x]')) return close();
      var b = e.target.closest('[data-use]'); if (b) { var d = +b.dataset.use; close(); if (S.apply) S.apply(d); else if (window.XL) XL.open(S.r, 'lab'), setTimeout(function () { XL.setDose(d, true); }, 500); }
    });
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); var f = bg.querySelector('input'); if (f && matchMedia('(hover:hover)').matches) f.focus(); });
  }
  function close() { var bg = $('sclBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'sclOut'; setTimeout(function () { bg.remove(); }, 240); }
  function paint() {
    var r = S.r, keys = Object.keys(S.have), box = $('sclRes');
    [].forEach.call(document.querySelectorAll('#sclList .scl-row'), function (row) { row.classList.remove('lim'); });
    if (!keys.length) { box.innerHTML = ''; return; }
    var d = Infinity, lim = null;
    keys.forEach(function (i) { var k = S.have[i] / num(r.i[i][1]); if (k < d) { d = k; lim = i; } });
    d = Math.floor(d * 1000) / 1000;
    var tot = 0; (r.i || []).forEach(function (g) { var v = num(g[1]); if (v > 0 && /^(g|gr|ml)?$/i.test(g[2] || 'g')) tot += v; });
    var limRow = document.querySelector('#sclList input[data-i="' + lim + '"]'); if (limRow) limRow.closest('.scl-row').classList.add('lim');
    var left = keys.filter(function (i) { return i !== lim; }).map(function (i) { var rest = S.have[i] - num(r.i[i][1]) * d; return rest > 0.5 ? '<li>' + esc(r.i[i][0]) + ': avanzano <b>' + fq(rest) + ' ' + esc(r.i[i][2] || 'g') + '</b></li>' : ''; }).join('');
    box.innerHTML = '<div class="scl-big"><span>Puoi fare</span><b>' + fx(d) + '</b>' + (tot ? '<small>' + fq(tot * d) + ' g in tutto</small>' : '') + '</div>' +
      '<p class="scl-why">Finisce per primo: <b>' + esc(r.i[lim][0]) + '</b></p>' + (left ? '<ul class="scl-left">' + left + '</ul>' : '') +
      '<button type="button" class="scl-go" data-use="' + d + '">Usa ' + fx(d) + ' nella ricetta</button>';
  }
  var item = { k: 'have', icon: ICON, label: 'Ho solo…', t: 'Ho solo…', s: 'Ricalcola su quello che hai di un ingrediente', run: function (r, d) { open(r, d, window.XL && XL.viewOpen ? function (x) { XL.setDose(x, true); } : function (x) { try { XL.open(r, 'lab'); setTimeout(function () { XL.setDose(x, true); }, 500); } catch (e) {} }); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(item);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(item);
  window.SCL = { open: open, icon: ICON };
  var st = document.createElement('style');
  st.textContent = [
    '.scl-bg{position:fixed;inset:0;z-index:9300;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,13,10,0);transition:background .24s}.scl-bg.on{background:rgba(15,13,10,.42)}',
    '.scl-sheet{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 20px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.scl-bg.on .scl-sheet{transform:none}@media(min-width:760px){.scl-bg{align-items:center}.scl-sheet{border-radius:24px}}',
    '.scl-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.scl-hd{display:flex;justify-content:space-between;gap:10px}.scl-k{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}.scl-hd h3{margin:4px 0 0;font:500 1.5rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.scl-x{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:20px;cursor:pointer}',
    '.scl-lead{margin:8px 0 12px;font-size:.86rem;line-height:1.5;color:var(--ink2)}',
    '.scl-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--cb);transition:background .2s}',
    '.scl-row.lim{background:color-mix(in srgb,var(--gold2,#B8862F) 10%,transparent);margin:0 -10px;padding:9px 10px;border-radius:12px}',
    '.scl-n{display:flex;flex-direction:column;gap:2px;font-size:.95rem;min-width:0}.scl-n small{font-size:.74rem;color:var(--smoke)}',
    '.scl-in{display:flex;align-items:center;gap:6px;flex-shrink:0}.scl-in input{width:96px;height:42px;padding:0 10px;border-radius:11px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 16px "DM Sans",sans-serif;text-align:right}.scl-in em{font-style:normal;font-size:.8rem;color:var(--smoke);width:22px}',
    '.scl-res{position:sticky;bottom:0;background:linear-gradient(transparent,var(--card) 18%);padding-top:12px}',
    '.scl-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.scl-big span{font-size:.85rem;color:var(--smoke)}.scl-big b{font:700 2rem "DM Sans",sans-serif;font-variant-numeric:tabular-nums}.scl-big small{font-size:.85rem;color:var(--ink2)}',
    '.scl-why{margin:2px 0 6px;font-size:.84rem;color:var(--ink2)}.scl-left{margin:0 0 8px;padding-left:18px;font-size:.82rem;color:var(--ink2)}',
    '.scl-go{width:100%;height:52px;border:0;border-radius:16px;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));font:600 1rem "DM Sans",sans-serif;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(st);
})();
