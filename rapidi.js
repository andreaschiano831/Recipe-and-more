/* rapidi.js — Comandi rapidi personalizzabili (stesso file in Recipe-and-more e in Chef's Organizer).
   Ogni griglia di tasti rapidi si registra con RAPIDI.register({ key, sel, item, extra }):
   l'app continua a disegnarla come sempre, poi qui si applicano ordine, tasti tolti e tasti aggiunti
   (scelti da un catalogo di funzioni in più). L'ultima tessera «Personalizza» apre l'editor:
   togli, rimetti, aggiungi e riordina. La scelta resta sul dispositivo, per persona e per griglia. */
(function () {
  'use strict';
  if (window.RAPIDI) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var REG = [];
  var PEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
  function uid() {
    try { var raw = JSON.parse(localStorage.getItem('wl_auth') || 'null'), s = raw && raw.currentSession ? raw.currentSession : raw; return (s && s.user && s.user.id) || 'anon'; } catch (e) { return 'anon'; }
  }
  function sk(key) { return 'wl_rapidi:' + uid() + ':' + key; }
  function load(key) { try { var v = JSON.parse(localStorage.getItem(sk(key)) || 'null'); if (v && typeof v === 'object') return { order: v.order || [], hidden: v.hidden || [], added: v.added || [] }; } catch (e) {} return { order: [], hidden: [], added: [] }; }
  function save(key, st) { try { localStorage.setItem(sk(key), JSON.stringify(st)); } catch (e) {} }
  function reset(key) { try { localStorage.removeItem(sk(key)); } catch (e) {} }

  function natives(def, grid) { return [].filter.call(grid.children, function (n) { return n.matches && n.matches(def.item) && !n.classList.contains('rp-x') && !n.classList.contains('rp-edit'); }); }
  function idOf(def, n) { return def.idOf ? def.idOf(n) : (n.getAttribute(def.attr) || ''); }
  function catalog(def) { var L = []; try { L = (typeof def.extra === 'function' ? def.extra() : def.extra) || []; } catch (e) { console.error(e); } return L.filter(function (x) { try { return x && x.id && (!x.show || x.show()); } catch (e) { return false; } }); }
  /* una tessera in più: copia una tessera dell'app e cambia icona, nome, sotto-titolo e colore */
  function makeTile(def, tpl, x, cls) {
    var n = tpl.cloneNode(true);
    n.removeAttribute(def.attr); n.removeAttribute('id'); n.hidden = false;
    n.classList.remove('hot', 'on'); n.classList.add(cls || 'rp-x');
    n.setAttribute('data-rx', x.id);
    var ic = [].filter.call(n.querySelectorAll('span,i,div'), function (e) { return e.querySelector('svg') && !e.querySelector('b'); })[0];
    if (ic) ic.innerHTML = x.icon || PEN;
    var b = n.querySelector('b'); if (b) b.textContent = x.label;
    var sm = n.querySelector('small'); if (sm) { if (x.sub) sm.textContent = x.sub; else sm.remove(); }
    [].forEach.call(n.querySelectorAll('em,.bdg,.badge'), function (e) { e.remove(); });
    var st = tpl.getAttribute('style') || '';
    if (x.color) st.replace(/(--[\w-]+)\s*:\s*#[0-9a-f]{3,8}/gi, function (m, v) { n.style.setProperty(v, x.color); return m; });
    n.type = 'button';
    return n;
  }
  function apply(def, grid) {
    var nat = natives(def, grid); if (!nat.length) return;
    [].forEach.call(grid.querySelectorAll(':scope > .rp-x, :scope > .rp-edit'), function (n) { n.remove(); });
    var st = load(def.key), cat = catalog(def), byId = {}, order = [];
    nat.forEach(function (n) { byId[idOf(def, n)] = n; });
    var tpl = nat[0];
    cat.forEach(function (x) {
      if (st.added.indexOf(x.id) < 0) return;
      var n = makeTile(def, tpl, x); n.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { x.run(); } catch (er) { console.error(er); } });
      byId[x.id] = n;
    });
    st.order.forEach(function (id) { if (byId[id] && st.hidden.indexOf(id) < 0 && order.indexOf(id) < 0) order.push(id); });
    nat.forEach(function (n) { var id = idOf(def, n); if (order.indexOf(id) < 0 && st.hidden.indexOf(id) < 0) order.push(id); });
    st.added.forEach(function (id) { if (byId[id] && order.indexOf(id) < 0) order.push(id); });
    nat.forEach(function (n) { n.hidden = order.indexOf(idOf(def, n)) < 0; });
    order.forEach(function (id, i) { var n = byId[id]; n.style.setProperty('--i', i); grid.appendChild(n); });
    if (def.editable === false || (def.canEdit && !def.canEdit())) { grid.setAttribute('data-rp', '1'); return; }
    var ed = makeTile(def, tpl, { id: 'edit', label: 'Personalizza', sub: 'aggiungi o togli', icon: PEN }, 'rp-edit');
    ed.setAttribute('aria-label', 'Personalizza i comandi rapidi');
    ed.style.setProperty('--i', order.length);
    ed.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); edit(def, grid); });
    grid.appendChild(ed);
    grid.setAttribute('data-rp', '1');
  }
  var scanQ = false;
  function scan() {
    scanQ = false;
    REG.forEach(function (def) {
      [].forEach.call(document.querySelectorAll(def.sel), function (g) {
        var ok = g.getAttribute('data-rp') === '1' && (def.editable === false || g.querySelector(':scope > .rp-edit'));
        if (!ok) try { apply(def, g); } catch (e) { console.error(e); }
      });
    });
  }
  function later() { if (scanQ) return; scanQ = true; (window.queueMicrotask || setTimeout)(scan); }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { later(); return; }
  });
  function start() { mo.observe(document.body, { childList: true, subtree: true }); scan(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  /* ── editor ── */
  function info(def, grid) {
    var nat = natives(def, grid), cat = catalog(def), L = [];
    nat.forEach(function (n) {
      var ic = [].filter.call(n.querySelectorAll('span,i,div'), function (e) { return e.querySelector('svg') && !e.querySelector('b'); })[0];
      var m = (n.getAttribute('style') || '').match(/--[\w-]+\s*:\s*(#[0-9a-f]{3,8})/i), col = m ? m[1] : '';
      if (!col && ic) { var c2 = getComputedStyle(ic).color; if (c2) col = c2; }
      L.push({ id: idOf(def, n), label: (n.querySelector('b') || n).textContent.trim(), sub: (n.querySelector('small') || {}).textContent || '', icon: ic ? ic.innerHTML : '', color: col, nat: true });
    });
    cat.forEach(function (x) { if (!L.some(function (y) { return y.id === x.id; })) L.push({ id: x.id, label: x.label, sub: x.sub || '', icon: x.icon || '', color: x.color || '', group: x.group || 'Altre funzioni' }); });
    return L;
  }
  function edit(def, grid) {
    var old = document.getElementById('rpBg'); if (old) old.remove();
    var cs = getComputedStyle(document.body), tc = getComputedStyle(natives(def, grid)[0] || grid);
    var bg = document.createElement('div'); bg.id = 'rpBg'; bg.className = 'rp-bg';
    bg.style.setProperty('--rp-bg', cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : '#F4F1EA');
    bg.style.setProperty('--rp-ink', cs.color || '#1a1a16');
    bg.style.setProperty('--rp-card', tc.backgroundColor && tc.backgroundColor !== 'rgba(0, 0, 0, 0)' ? tc.backgroundColor : '#fff');
    bg.innerHTML = '<div class="rp-sh" role="dialog" aria-modal="true" aria-labelledby="rpT"><span class="rp-grab"></span><header class="rp-hd"><div><small>' + esc(def.title || 'Comandi rapidi') + '</small><b id="rpT">Personalizza</b></div><button type="button" class="rp-x0" data-close aria-label="Chiudi">×</button></header><div class="rp-body" id="rpBody"></div>' +
      '<footer class="rp-ft"><button type="button" class="rp-b" data-reset>Ripristina</button><button type="button" class="rp-b dark" data-close>Fatto</button></footer></div>';
    document.body.appendChild(bg);
    function cur() {
      var st = load(def.key), L = info(def, grid), byId = {}; L.forEach(function (x) { byId[x.id] = x; });
      var shown = [].filter.call(grid.children, function (n) { return !n.hidden && !n.classList.contains('rp-edit') && (n.matches(def.item) || n.classList.contains('rp-x')); })
        .map(function (n) { return n.getAttribute('data-rx') || idOf(def, n); }).filter(function (id) { return byId[id]; });
      return { st: st, L: L, byId: byId, shown: shown, off: L.filter(function (x) { return shown.indexOf(x.id) < 0; }) };
    }
    function row(x, i, on, n) {
      return '<div class="rp-row"><span class="rp-ic" style="' + (x.color ? '--c:' + esc(x.color) : '') + '">' + (x.icon || PEN) + '</span><span class="rp-t"><b>' + esc(x.label) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' +
        (on ? '<button type="button" class="rp-m" data-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Sposta prima">↑</button><button type="button" class="rp-m" data-dn="' + i + '"' + (i < n - 1 ? '' : ' disabled') + ' aria-label="Sposta dopo">↓</button><button type="button" class="rp-m rm" data-rm="' + esc(x.id) + '" aria-label="Togli ' + esc(x.label) + '">−</button>'
          : '<button type="button" class="rp-m add" data-add="' + esc(x.id) + '" aria-label="Aggiungi ' + esc(x.label) + '">+</button>') + '</div>';
    }
    function paint() {
      var C = cur(), y = bg.querySelector('.rp-sh').scrollTop;
      var groups = {}; C.off.forEach(function (x) { var g = x.nat ? 'Tolti' : (x.group || 'Altre funzioni'); (groups[g] = groups[g] || []).push(x); });
      bg.querySelector('#rpBody').innerHTML = '<p class="rp-l">Nel pannello <em>' + C.shown.length + '</em></p><div class="rp-list">' + (C.shown.length ? C.shown.map(function (id, i) { return row(C.byId[id], i, true, C.shown.length); }).join('') : '<p class="rp-e">Nessun tasto: aggiungine qualcuno qui sotto.</p>') + '</div>' +
        Object.keys(groups).map(function (g) { return '<p class="rp-l">' + esc(g) + '</p><div class="rp-list">' + groups[g].map(function (x, i) { return row(x, i, false); }).join('') + '</div>'; }).join('');
      bg.querySelector('.rp-sh').scrollTop = y;
    }
    function commit(shown) {
      var C = cur(), st = { order: shown.slice(), hidden: [], added: [] };
      C.L.forEach(function (x) { if (x.nat && shown.indexOf(x.id) < 0) st.hidden.push(x.id); if (!x.nat && shown.indexOf(x.id) > -1) st.added.push(x.id); });
      save(def.key, st); grid.removeAttribute('data-rp'); apply(def, grid); paint();
    }
    bg.addEventListener('click', function (e) {
      if (e.target === bg || e.target.closest('[data-close]')) { bg.classList.remove('on'); setTimeout(function () { bg.remove(); }, 220); return; }
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var C = cur(), s = C.shown.slice();
      if (b.hasAttribute('data-reset')) { reset(def.key); grid.removeAttribute('data-rp'); apply(def, grid); paint(); return; }
      if (b.dataset.up != null) { var i = +b.dataset.up; s.splice(i - 1, 0, s.splice(i, 1)[0]); return commit(s); }
      if (b.dataset.dn != null) { var j = +b.dataset.dn; s.splice(j + 1, 0, s.splice(j, 1)[0]); return commit(s); }
      if (b.dataset.rm) { return commit(s.filter(function (x) { return x !== b.dataset.rm; })); }
      if (b.dataset.add) { s.push(b.dataset.add); return commit(s); }
    });
    document.addEventListener('keydown', function esc0(e) { if (e.key === 'Escape' && document.getElementById('rpBg')) { bg.remove(); document.removeEventListener('keydown', esc0); } });
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function editKey(key) {
    for (var i = 0; i < REG.length; i++) { var def = REG[i]; if (def.key !== key) continue; var g = document.querySelector(def.sel); if (g) { edit(def, g); return true; } }
    return false;
  }

  window.RAPIDI = {
    register: function (def) { def.attr = def.attr || 'data-q'; REG = REG.filter(function (d) { return d.key !== def.key; }); REG.push(def); later(); },
    edit: editKey,
    defs: function () { return REG.slice(); },
    refresh: function () { [].forEach.call(document.querySelectorAll('[data-rp]'), function (g) { g.removeAttribute('data-rp'); }); later(); }
  };
  var st = document.createElement('style');
  st.textContent = [
    '.rp-edit{opacity:.8;box-shadow:none!important;background:transparent!important;outline:1.5px dashed color-mix(in srgb,currentColor 28%,transparent);outline-offset:-1.5px}.rp-edit:hover{opacity:1}',
    '.rp-bg{position:fixed;inset:0;z-index:99990;background:rgba(12,10,8,.38);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .22s}.rp-bg.on{opacity:1}',
    '@media(min-width:700px){.rp-bg{align-items:center}}',
    '.rp-sh{width:100%;max-width:520px;max-height:88vh;overflow:auto;background:var(--rp-bg);color:var(--rp-ink);border-radius:24px 24px 0 0;padding:8px 16px 0;transform:translateY(24px);transition:transform .28s cubic-bezier(.2,.8,.2,1);font-family:"DM Sans",system-ui,sans-serif;box-shadow:0 -18px 60px rgba(0,0,0,.22)}',
    '@media(min-width:700px){.rp-sh{border-radius:24px}}.rp-bg.on .rp-sh{transform:none}@media(prefers-reduced-motion:reduce){.rp-sh{transition:none}}',
    '.rp-grab{display:block;width:40px;height:4px;border-radius:9px;background:currentColor;opacity:.18;margin:4px auto 10px}',
    '.rp-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 6px}.rp-hd small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.55}.rp-hd b{font:500 1.6rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.rp-x0{width:38px;height:38px;border-radius:12px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);background:var(--rp-card);color:inherit;font-size:20px;cursor:pointer}',
    '.rp-l{margin:14px 4px 6px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.55}.rp-l em{font-style:normal;margin-left:4px}',
    '.rp-list{border-radius:16px;background:var(--rp-card);border:1px solid color-mix(in srgb,currentColor 9%,transparent);overflow:hidden}',
    '.rp-row{display:flex;align-items:center;gap:10px;min-height:54px;padding:7px 10px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent)}.rp-row:first-child{border-top:0}',
    '.rp-ic{width:34px;height:34px;flex-shrink:0;border-radius:10px;display:grid;place-items:center;color:var(--c,currentColor);background:color-mix(in srgb,var(--c,currentColor) 13%,transparent)}.rp-ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
    '.rp-t{flex:1;min-width:0;display:flex;flex-direction:column}.rp-t b{font-size:.93rem;font-weight:600}.rp-t small{font-size:.76rem;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rp-m{width:34px;height:34px;flex-shrink:0;border-radius:10px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);background:transparent;color:inherit;font:600 1rem system-ui;cursor:pointer}.rp-m:disabled{opacity:.25}',
    '.rp-m.rm{color:#b3261e}.rp-m.add{background:var(--rp-ink);color:var(--rp-bg);border-color:transparent;font-size:1.15rem}',
    '.rp-e{padding:14px;font-size:.86rem;opacity:.6;margin:0}',
    '.rp-ft{position:sticky;bottom:0;display:flex;gap:8px;justify-content:flex-end;padding:12px 0 calc(14px + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--rp-bg) 30%);margin-top:6px}',
    '.rp-b{height:44px;padding:0 18px;border-radius:13px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:var(--rp-card);color:inherit;font:600 .9rem "DM Sans",system-ui,sans-serif;cursor:pointer}.rp-b.dark{background:var(--rp-ink);color:var(--rp-bg);border-color:transparent}'
  ].join('\n');
  document.head.appendChild(st);
})();
