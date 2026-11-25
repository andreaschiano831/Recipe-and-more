/* find.js — «Cosa posso fare con…»: cerca le ricette partendo da ciò che hai in laboratorio,
   dalla tecnica (montare, temperare, forno…) e dalla temperatura di lavoro.
   Le tecniche e le temperature si leggono dal procedimento. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }); }
  var sv = function (p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 18) + '" height="' + (w || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var IC = { basket: sv('<path d="M4 9h16l-1.5 10a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M8.5 9l3.5-5 3.5 5M9.5 13v4M14.5 13v4"/>'), x: sv('<path d="M7 7l10 10M17 7L7 17"/>', 13) };

  var BASICS = ['acqua', 'ghiaccio', 'sale', 'sale fino'];
  var TECH = [
    ['montare', 'Montare', /\bmont(a|are|ata|ate|ati|o)\b|planetaria|frusta|semimontat|meringa/],
    ['temperare', 'Temperare', /temper(a|are|ato|ata|aggio)\b|cristallizz/],
    ['forno', 'Forno', /forno|inforn|ventilat|statico|cottura in forno/],
    ['fuoco', 'Sul fuoco', /pentol|casseruol|bollor|sul fuoco|sobboll|fiamma|cuocere a \d|cuocere fino|portare a \d/],
    ['abbattere', 'Abbattere e congelare', /abbatt|congel|surgel|freezer|-18|−18/],
    ['gelificare', 'Gelificare', /gelatin|agar|pectin|gelific|colla di pesce|gellan/],
    ['emulsionare', 'Emulsionare', /emulsion|frull|mixer|minipimer|immersione|blender|thermomix/],
    ['mantecare', 'Mantecare', /mantec|gelatiera|pacojet/],
    ['caramellare', 'Caramellare', /caramell|a secco|zucchero cotto/],
    ['lievitare', 'Lievitare', /lievit|puntata|appretto|biga|poolish|lievito madre/],
    ['friggere', 'Friggere', /fritt|frigg/],
    ['sottovuoto', 'Sottovuoto e bassa T', /sottovuoto|roner|bassa temperatura|sous ?vide/]
  ];
  var TEMPS = [['', 'Tutte'], ['crudo', 'Senza cottura'], ['basso', 'Fino a 90 °C'], ['forno1', 'Forno fino a 170 °C'], ['forno2', 'Forno oltre 170 °C']];

  /* ── analisi di una ricetta (con cache) ── */
  var cache = {};
  function info(r) {
    var key = (r._id || r.n) + '|' + (r.p || '').length + '|' + (r.i || []).length, c = cache[key]; if (c) return c;
    var p = norm(r.p || ''), all = p + ' ' + norm(r.n) + ' ' + (r.i || []).map(function (g) { return norm(g[0]); }).join(' ');
    var tech = TECH.filter(function (t) { return t[2].test(all); }).map(function (t) { return t[0]; });
    var mx = null, m, re = /(\d{2,3})\s*°\s*c?/gi, raw = String(r.p || '');
    while ((m = re.exec(raw))) { var v = +m[1]; if (v >= 20 && v <= 320 && !/[-−]\s*$/.test(raw.slice(Math.max(0, m.index - 2), m.index))) mx = mx == null ? v : Math.max(mx, v); }
    var oven = tech.indexOf('forno') >= 0, fire = tech.indexOf('fuoco') >= 0, tc = '';
    if (raw.trim()) {
      if (oven) tc = mx != null && mx > 170 ? 'forno2' : 'forno1';
      else if ((mx == null || mx < 60) && !fire) tc = 'crudo';
      else if (mx == null || mx <= 90) tc = 'basso';
      else tc = 'alto';
    }
    var ings = (r.i || []).map(function (g) { return { n: String(g[0] || ''), k: norm(g[0]), qb: g[1] == null || g[1] === '' }; }).filter(function (x) { return x.k; });
    return (cache[key] = { tech: tech, max: mx, tc: tc, ings: ings, noProc: !raw.trim() });
  }
  function has(have, k) {
    for (var i = 0; i < have.length; i++) { var h = have[i]; if (k === h || (' ' + k + ' ').indexOf(' ' + h + ' ') >= 0 || k.indexOf(h + ' ') === 0) return true; }
    return false;
  }

  /* ── stato ── */
  var F = { have: [], tech: [], temp: '', full: false, basics: true, q: '' };
  try { var sv0 = JSON.parse(localStorage.getItem('fd_state') || 'null'); if (sv0) { F.have = sv0.have || []; F.tech = sv0.tech || []; F.temp = sv0.temp || ''; F.full = !!sv0.full; F.basics = sv0.basics !== false; } } catch (e) {}
  function save() { try { localStorage.setItem('fd_state', JSON.stringify({ have: F.have, tech: F.tech, temp: F.temp, full: F.full, basics: F.basics })); } catch (e) {} }
  function allIngs() {
    var cnt = {}, label = {};
    recs().forEach(function (r) { (r.i || []).forEach(function (g) { var k = norm(g[0]); if (!k || k.length < 2) return; var base = k.split(' ').slice(0, 2).join(' '); cnt[base] = (cnt[base] || 0) + 1; if (!label[base]) label[base] = String(g[0]).toLowerCase().split(/\s+/).slice(0, 2).join(' '); }); });
    return Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || a.localeCompare(b); }).map(function (k) { return { k: k, t: label[k], n: cnt[k] }; });
  }
  function results() {
    var have = F.have.slice(); if (F.basics) BASICS.forEach(function (b) { if (have.indexOf(b) < 0) have.push(b); });
    var out = [];
    recs().forEach(function (r) {
      var I = info(r);
      if (F.tech.length && !F.tech.every(function (t) { return I.tech.indexOf(t) >= 0; })) return;
      if (F.temp && I.tc !== F.temp) return;
      var need = I.ings.filter(function (x) { return !x.qb || I.ings.length <= 2; }), got = need.filter(function (x) { return has(have, x.k); }), miss = need.filter(function (x) { return !has(have, x.k); });
      var mine = F.have.length ? need.filter(function (x) { return has(F.have, x.k); }).length : 0;
      if (F.have.length && !mine) return;
      if (F.full && miss.length) return;
      out.push({ r: r, I: I, got: got.length, tot: need.length, miss: miss, score: need.length ? got.length / need.length : 0 });
    });
    out.sort(function (a, b) { return F.have.length ? (b.score - a.score || a.miss.length - b.miss.length || a.r.n.localeCompare(b.r.n)) : a.r.n.localeCompare(b.r.n); });
    return out;
  }

  /* ── foglio ── */
  function open() {
    var old = $('fdBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'fdBg'; bg.className = 'fd-bg';
    bg.innerHTML = '<div class="fd-sheet" role="dialog" aria-modal="true" aria-labelledby="fdT"><span class="fd-grab"></span><div class="fd-in" id="fdIn"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick); bg.addEventListener('input', onInput); bg.addEventListener('keydown', onKey); bg.addEventListener('change', onInput);
    paint(true);
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function docKey(e) { if (e.key === 'Escape' && $('fdBg') && !(e.target && e.target.closest && e.target.closest('#fdBg'))) close(); }
  document.addEventListener('keydown', docKey);
  function close() { var bg = $('fdBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'fdBgOut'; setTimeout(function () { bg.remove(); }, 250); }
  function paint(first) {
    var box = $('fdIn'); if (!box) return;
    var sh = box.parentNode, st = sh.scrollTop, R = results(), AI = allIngs();
    var sug = AI.filter(function (x) { return F.have.indexOf(x.k) < 0 && BASICS.indexOf(x.k) < 0; }).slice(0, 14);
    var h = '<header class="fd-hd"><div><span class="fd-k">In laboratorio</span><h3 id="fdT">Cosa posso fare con…</h3></div><button type="button" class="fd-x" data-x aria-label="Chiudi">×</button></header>' +
      '<section class="fd-sec"><div class="fd-have">' + F.have.map(function (k) { return '<button type="button" class="fd-chip on" data-rm="' + esc(k) + '">' + esc(k) + IC.x + '</button>'; }).join('') +
        '<input id="fdIn2" list="fdList" placeholder="' + (F.have.length ? 'Aggiungi…' : 'Scrivi cosa hai: panna, cioccolato, lamponi…') + '" autocomplete="off" enterkeyhint="done"></div>' +
        '<datalist id="fdList">' + AI.slice(0, 300).map(function (x) { return '<option value="' + esc(x.t) + '">'; }).join('') + '</datalist>' +
        (sug.length ? '<div class="fd-sug">' + sug.map(function (x) { return '<button type="button" class="fd-chip" data-add="' + esc(x.k) + '">+ ' + esc(x.t) + '</button>'; }).join('') + '</div>' : '') +
        '<div class="fd-opts"><label class="fd-tg"><input type="checkbox" data-o="basics"' + (F.basics ? ' checked' : '') + '><i></i>Acqua e sale ci sono sempre</label><label class="fd-tg"><input type="checkbox" data-o="full"' + (F.full ? ' checked' : '') + '><i></i>Solo se ho tutto</label></div></section>' +
      '<section class="fd-sec"><h4>Tecnica</h4><div class="fd-row">' + TECH.map(function (t) { var on = F.tech.indexOf(t[0]) >= 0; return '<button type="button" class="fd-chip' + (on ? ' on' : '') + '" data-tech="' + t[0] + '" aria-pressed="' + on + '">' + t[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="fd-sec"><h4>Temperatura</h4><div class="fd-row">' + TEMPS.map(function (t) { var on = F.temp === t[0]; return '<button type="button" class="fd-chip' + (on ? ' on' : '') + '" data-temp="' + t[0] + '" aria-pressed="' + on + '">' + t[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="fd-res"><div class="fd-rh"><b>' + (R.length ? R.length + ' ricett' + (R.length === 1 ? 'a' : 'e') : 'Nessuna ricetta') + '</b>' + (F.have.length || F.tech.length || F.temp ? '<button type="button" class="fd-reset" data-reset>Azzera</button>' : '') + '</div>' +
        (R.length ? R.slice(0, 60).map(function (x) {
          var pc = Math.round(x.score * 100), ok = !x.miss.length;
          return '<button type="button" class="fd-item" data-open="' + esc(x.r._id != null ? x.r._id : x.r.n) + '">' +
            (F.have.length ? '<span class="fd-ring' + (ok ? ' ok' : '') + '" style="--p:' + pc + '"><b>' + x.got + '/' + x.tot + '</b></span>' : '') +
            '<span class="fd-body"><b>' + esc(x.r.n) + '</b><small>' + esc([x.r.c, x.I.max != null ? x.I.max + ' °C' : '', x.I.noProc ? 'senza procedimento' : ''].filter(Boolean).join(' · ')) + '</small>' +
            (F.have.length ? (ok ? '<em class="ok">Hai tutto</em>' : '<em>Manca: ' + esc(x.miss.slice(0, 4).map(function (m) { return m.n.toLowerCase(); }).join(', ')) + (x.miss.length > 4 ? ' e altri ' + (x.miss.length - 4) : '') + '</em>') : '') +
            (x.I.tech.length ? '<span class="fd-tags">' + x.I.tech.slice(0, 4).map(function (t) { var T = TECH.filter(function (z) { return z[0] === t; })[0]; return '<i>' + esc(T ? T[1] : t) + '</i>'; }).join('') + '</span>' : '') +
            '</span><span class="fd-go">›</span></button>';
        }).join('') : '<p class="fd-empty">' + (F.have.length ? 'Con questi ingredienti non trovo ricette: prova a toglierne uno o a disattivare «Solo se ho tutto».' : 'Nessuna ricetta con questi filtri.') + '</p>') + '</section>';
    box.innerHTML = h; sh.scrollTop = first ? 0 : st;
  }
  function add(v) {
    v = norm(v); if (!v) return;
    v.split(/\s*,\s*|\s+e\s+/).forEach(function (x) { x = x.trim(); if (x && F.have.indexOf(x) < 0) F.have.push(x); });
    save(); paint(); var i = $('fdIn2'); if (i) i.focus();
  }
  function onInput(e) {
    var t = e.target;
    if (t.dataset && t.dataset.o) { F[t.dataset.o] = t.checked; save(); return paint(); }
    if (t.id === 'fdIn2' && e.inputType === 'insertReplacementText') add(t.value); /* scelta dal suggerimento */
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); return close(); }
    var t = e.target; if (t.id !== 'fdIn2') return;
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(t.value); }
    else if (e.key === 'Backspace' && !t.value && F.have.length) { F.have.pop(); save(); paint(); var i = $('fdIn2'); if (i) i.focus(); }
  }
  function onClick(e) {
    var bg = $('fdBg'); if (!bg) return;
    if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rm != null) { F.have = F.have.filter(function (k) { return k !== b.dataset.rm; }); save(); return paint(); }
    if (b.dataset.add) { F.have.push(b.dataset.add); save(); return paint(); }
    if (b.dataset.tech) { var i = F.tech.indexOf(b.dataset.tech); if (i >= 0) F.tech.splice(i, 1); else F.tech.push(b.dataset.tech); save(); return paint(); }
    if (b.dataset.temp != null && b.hasAttribute('data-temp')) { F.temp = b.dataset.temp; save(); return paint(); }
    if (b.hasAttribute('data-reset')) { F.have = []; F.tech = []; F.temp = ''; F.full = false; save(); return paint(); }
    if (b.dataset.open != null) {
      var id = b.dataset.open, r = recs().filter(function (x) { return String(x._id) === id || x.n === id; })[0]; if (!r) return;
      close(); setTimeout(function () { try { XL.open(r, 'lab'); } catch (er) { try { openRecipePanel(r); } catch (x) {} } }, 200);
    }
  }
  document.addEventListener('blur', function (e) { if (e.target && e.target.id === 'fdIn2' && e.target.value.trim() && $('fdBg')) add(e.target.value); }, true);

  /* pulsante nella barra della collezione */
  var tries = 0;
  (function mount() {
    var tools = document.querySelector('.fx-tools');
    if (!tools) { if (++tries < 80) setTimeout(mount, 400); return; }
    if ($('fdBtn')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'fdBtn'; b.className = 'fd-btn'; b.innerHTML = IC.basket; b.title = 'Cosa posso fare con…'; b.setAttribute('aria-label', 'Cosa posso fare con gli ingredienti che ho');
    b.onclick = open; tools.insertBefore(b, tools.firstChild);
  })();
  window.FD = { open: open, info: info, results: results, state: F };

  var css = document.createElement('style');
  css.textContent = [
    '#app .fx-tools .fd-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border-radius:12px;border:1px solid var(--cb,rgba(0,0,0,.1));background:var(--card,#fff);color:var(--ink2,#444);cursor:pointer}',
    '.fd-bg{position:fixed;inset:0;z-index:150;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,13,10,0);transition:background .24s}.fd-bg.on{background:rgba(15,13,10,.4)}',
    '.fd-sheet{width:100%;max-width:640px;height:92vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 20px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.fd-bg.on .fd-sheet{transform:none}@media(min-width:760px){.fd-bg{align-items:center}.fd-sheet{height:auto;max-height:86vh;border-radius:24px;opacity:0;transform:translateY(14px);transition:transform .25s,opacity .2s}.fd-bg.on .fd-sheet{opacity:1}}',
    '.fd-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.fd-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fd-k{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}',
    '.fd-hd h3{margin:4px 0 0;font:500 1.65rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}.fd-x{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:20px;cursor:pointer}',
    '.fd-sec{padding:14px 0;border-bottom:1px solid var(--cb)}.fd-sec h4{margin:0 0 9px;font:700 11px "DM Sans",sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--smoke,#888)}',
    '.fd-have{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;border-radius:16px;border:1px solid var(--cb);background:var(--bg2,rgba(0,0,0,.02))}',
    '.fd-have input{flex:1;min-width:160px;height:36px!important;border:0!important;background:none!important;box-shadow:none!important;outline:none!important;border-radius:0!important;font:400 16px "DM Sans",sans-serif!important;color:var(--ink)!important;padding:0 6px!important;margin:0!important}',
    '.fd-have input::-webkit-calendar-picker-indicator{display:none!important;opacity:0}',
    '.fd-have:focus-within{border-color:color-mix(in srgb,var(--ink) 35%,transparent)}',
    '.fd-chip{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:99px;border:1px solid var(--cb);background:var(--card);color:var(--ink2);font:500 13.5px "DM Sans",sans-serif;cursor:pointer;white-space:nowrap}',
    '.fd-chip.on{background:var(--ink);color:var(--bg);border-color:transparent}.fd-chip.on svg{opacity:.7}',
    '.fd-sug{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-top:10px;padding-bottom:2px}.fd-sug .fd-chip{flex-shrink:0;background:none;border-style:dashed;color:var(--smoke)}',
    '.fd-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px 2px}.fd-row::-webkit-scrollbar{display:none}.fd-row .fd-chip{flex-shrink:0}',
    '@media(min-width:760px){.fd-row{flex-wrap:wrap;margin:0;padding:0}}',
    '.fd-opts{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:12px}.fd-tg{display:flex;align-items:center;gap:8px;font-size:.84rem;color:var(--ink2);cursor:pointer}.fd-tg input{position:absolute;opacity:0;pointer-events:none}',
    '.fd-tg i{position:relative;width:36px;height:22px;border-radius:99px;background:var(--cb);transition:background .2s}.fd-tg i::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .2s}',
    '.fd-tg input:checked+i{background:var(--ok,#3F8F4A)}.fd-tg input:checked+i::after{transform:translateX(14px)}',
    '.fd-res{padding-top:14px}.fd-rh{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.fd-rh b{font:600 .95rem "DM Sans",sans-serif}.fd-reset{border:0;background:none;color:var(--gold3,#8B6408);font:600 .88rem "DM Sans",sans-serif;cursor:pointer}',
    '.fd-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 4px;border:0;border-bottom:1px solid var(--cb);background:none;color:var(--ink);text-align:left;cursor:pointer}',
    '.fd-ring{flex-shrink:0;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--gold2,#B8862F) calc(var(--p)*1%),var(--ctrl,rgba(0,0,0,.07)) 0)}',
    '.fd-ring.ok{background:conic-gradient(var(--ok,#3F8F4A) 100%,transparent 0)}.fd-ring b{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--card);font:700 11.5px "DM Sans",sans-serif;font-variant-numeric:tabular-nums}',
    '.fd-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.fd-body b{font:600 .98rem "DM Sans",sans-serif}.fd-body small{font-size:.76rem;color:var(--smoke)}',
    '.fd-body em{font-style:normal;font-size:.8rem;color:var(--warn,#B4532A)}.fd-body em.ok{color:var(--ok,#3F8F4A);font-weight:600}',
    '.fd-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}.fd-tags i{font-style:normal;padding:2px 8px;border-radius:99px;background:var(--ctrl,rgba(0,0,0,.05));font-size:.7rem;color:var(--ink2)}',
    '.fd-go{color:var(--smoke);font-size:20px}.fd-empty{padding:18px 4px;color:var(--smoke);font-size:.9rem;line-height:1.5}'
  ].join('\n');
  document.head.appendChild(css);
})();
