/* fx.js — barra di ricerca e filtri della collezione, in stile app.
   Riordina gli elementi esistenti (stessi id e stessi comandi) senza toglierne:
   ricerca + «Filtri» · categorie in una riga che scorre · contatore, filtri attivi e comandi rapidi.
   Ordine, allergeni, dose per tutte le schede, vista e percentuali stanno nel foglio «Filtri». */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var sv = function (p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 18) + '" height="' + (w || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var IC = {
    sliders: sv('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>'),
    sel: sv('<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>', 17),
    x: sv('<path d="M7 7l10 10M17 7L7 17"/>', 13),
    pen: sv('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 15),
    ins: sv('<path d="M5 6h10M5 12h10M5 18h6"/><path d="M19 14v6M16 17h6"/>'),
    neu: sv('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
    az: sv('<path d="M4 17l3.5-10L11 17M5.3 13.5h4.4"/><path d="M14 7h6l-6 10h6"/>'),
    za: sv('<path d="M4 7h6l-6 10h6"/><path d="M13 17l3.5-10L20 17M14.3 13.5h4.4"/>'),
    grid: sv('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>', 16),
    list: sv('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>', 16),
    globe: sv('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z"/>', 15),
    shield: sv('<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>', 17)
  };
  var SORT = [['ins', 'Inserimento', IC.ins], ['new', 'Più recenti', IC.neu], ['az', 'A → Z', IC.az], ['za', 'Z → A', IC.za]];
  var SORTN = { ins: 'Inserimento', new: 'Più recenti', az: 'A → Z', za: 'Z → A' };
  var PRESET = [[0.5, '½'], [1, '1'], [2, '2'], [3, '3'], [5, '5']];

  function g(n, d) { try { var v = window[n]; return v === undefined ? d : v; } catch (e) { return d; } }
  function curDose() { var d = g('dose', 1); return typeof d === 'number' && d > 0 ? d : 1; }
  function fmtX(d) { return '×' + String(Math.round(d * 100) / 100).replace('.', ','); }
  function excl() { try { return window.NUT && NUT.getExcl ? NUT.getExcl() : { list: [], may: false }; } catch (e) { return { list: [], may: false }; } }
  function setDoseAll(d) { d = Math.max(0.1, Math.round(d * 100) / 100); try { window.dose = d; updDose(); } catch (e) {} sync(); }
  function counts() {
    var t = (($('cnt') || {}).textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
    return t ? { shown: +t[1], all: +t[2] } : { shown: 0, all: 0 };
  }
  function nActive() { var n = 0; if (g('_sortMode', 'ins') !== 'ins') n++; if (excl().list.length) n++; if (Math.abs(curDose() - 1) > 1e-9) n++; return n; }

  /* ── montaggio: sposta gli elementi esistenti nella nuova struttura ── */
  var built = false;
  function build() {
    if (built) return; var shell = document.querySelector('#app .ctrl-shell'), row = shell && shell.querySelector('.ctrl-row'), meta = document.querySelector('#app .sort-row');
    if (!shell || !row || !meta || !$('srch')) return;
    built = true;
    shell.classList.add('fx2'); meta.classList.add('fx-meta');
    /* la riga sotto le categorie sta nello stesso riquadro della ricerca (su schermi larghi usciva dai margini) */
    shell.appendChild(meta);
    var fb = document.createElement('button'); fb.type = 'button'; fb.id = 'fxBtn'; fb.className = 'fx-btn'; fb.setAttribute('aria-label', 'Filtri, ordine e vista'); fb.setAttribute('aria-haspopup', 'dialog');
    fb.innerHTML = IC.sliders + '<span class="fx-btn-l">Filtri</span><i class="fx-badge"></i>';
    fb.onclick = function () { $('fxBg') ? close() : open(); };
    row.appendChild(fb);
    /* riga sotto le categorie: contatore · filtri attivi · comandi rapidi */
    var cnt = document.createElement('div'); cnt.className = 'fx-cnt'; cnt.setAttribute('aria-live', 'polite');
    var on = document.createElement('div'); on.className = 'fx-on';
    var tools = document.createElement('div'); tools.className = 'fx-tools';
    meta.insertBefore(on, meta.firstChild); meta.insertBefore(cnt, on);
    meta.appendChild(tools);
    var alg = $('algBtn'), sel = $('selBtn'), vb = row.querySelector('.vbtns');
    if (alg) { tools.appendChild(alg); alg.setAttribute('aria-label', 'Allergeni e intolleranze'); }
    if (sel) { tools.appendChild(sel); sel.setAttribute('aria-label', 'Seleziona più ricette'); }
    if (vb) {
      tools.appendChild(vb); vb.classList.add('fx-view');
      if ($('vGrid')) { $('vGrid').innerHTML = IC.grid; $('vGrid').setAttribute('aria-label', 'Vista a schede'); }
      if ($('vList')) { $('vList').innerHTML = IC.list; $('vList').setAttribute('aria-label', 'Vista a elenco'); }
      vb.addEventListener('click', function () { setTimeout(sync, 0); });
    }
    on.addEventListener('click', function (e) {
      var b = e.target.closest('[data-off]'); if (!b) return;
      var k = b.dataset.off;
      if (k === 'sort') setSortMode('ins');
      else if (k === 'alg') { try { NUT.setExcl([]); } catch (x) {} }
      else if (k === 'dose') setDoseAll(1);
      else if (k === 'q') { var s = $('srch'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); try { renderGrid(); } catch (x) {} }
      sync();
    });
    $('srch').addEventListener('input', function () { setTimeout(sync, 0); });
    sync();
  }

  /* ── stato visibile: contatore, chip dei filtri attivi, badge ── */
  function sync() {
    if (!built) return;
    var sa = $('sxAll'); if (sa && !sa._fx) { sa._fx = 1; sa.innerHTML = IC.globe + '<span>Ovunque</span>'; }
    var c = counts(), cnt = document.querySelector('.fx-cnt'), on = document.querySelector('.fx-on');
    if (cnt) cnt.innerHTML = c.shown === c.all ? '<b>' + c.all + '</b> ricett' + (c.all === 1 ? 'a' : 'e') : '<b>' + c.shown + '</b> di ' + c.all;
    var h = '', E = excl(), q = (($('srch') || {}).value || '').trim();
    if (q) h += '<button type="button" class="fx-chip" data-off="q" aria-label="Togli la ricerca">«' + esc(q.length > 14 ? q.slice(0, 13) + '…' : q) + '»' + IC.x + '</button>';
    if (E.list.length) {
      var em = E.list.map(function (k) { var a = (NUT.ALLERGENI || []).filter(function (x) { return x[0] === k; })[0]; return a ? a[2] : ''; }).join('');
      h += '<button type="button" class="fx-chip" data-off="alg" aria-label="Togli il filtro allergeni">Senza <span class="fx-em">' + em + '</span>' + IC.x + '</button>';
    }
    if (g('_sortMode', 'ins') !== 'ins') h += '<button type="button" class="fx-chip" data-off="sort" aria-label="Ordine predefinito">' + SORTN[g('_sortMode')] + IC.x + '</button>';
    if (Math.abs(curDose() - 1) > 1e-9) h += '<button type="button" class="fx-chip fx-chip-d" data-off="dose" aria-label="Riporta la dose a ×1">Tutte ' + fmtX(curDose()) + IC.x + '</button>';
    if (on) { on.innerHTML = h; on.classList.toggle('has', !!h); }
    var n = nActive(), fb = $('fxBtn');
    if (fb) { fb.classList.toggle('on', n > 0); fb.querySelector('.fx-badge').textContent = n || ''; }
    var a = $('algBtn'); if (a) a.classList.toggle('on', E.list.length > 0);
    if ($('fxBg')) paint();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ── foglio «Filtri» ── */
  function open() {
    close(true);
    var bg = document.createElement('div'); bg.id = 'fxBg'; bg.className = 'fx-bg';
    bg.innerHTML = '<div class="fx-sheet" role="dialog" aria-modal="true" aria-label="Filtri, ordine e vista"><span class="fx-grab"></span><div class="fx-in"></div></div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    place(); paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
    var sh = bg.querySelector('.fx-sheet'), y0 = null, dy = 0;
    sh.addEventListener('touchstart', function (e) { if (sh.scrollTop > 0 || innerWidth >= 760) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    sh.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = dy ? 'translateY(' + dy + 'px)' : ''; }, { passive: true });
    sh.addEventListener('touchend', function () { if (y0 == null) return; y0 = null; sh.style.transform = ''; if (dy > 90) close(); });
    document.addEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape' && $('fxBg')) { e.stopPropagation(); close(); } }
  function close(now) {
    var bg = $('fxBg'); if (!bg) return;
    document.removeEventListener('keydown', onKey);
    if (now) { bg.remove(); return; }
    bg.classList.remove('on'); bg.id = 'fxBgOut'; setTimeout(function () { bg.remove(); }, 260);
    var fb = $('fxBtn'); if (fb) try { fb.focus({ preventScroll: true }); } catch (e) {}
  }
  function place() {
    var bg = $('fxBg'), fb = $('fxBtn'); if (!bg || !fb) return;
    var sh = bg.querySelector('.fx-sheet');
    if (innerWidth >= 760) { var r = fb.getBoundingClientRect(); sh.style.top = Math.round(r.bottom + 8) + 'px'; sh.style.right = Math.max(12, Math.round(innerWidth - r.right)) + 'px'; }
    else { sh.style.top = ''; sh.style.right = ''; }
  }
  function sec(t, body, extra) { return '<section class="fx-sec"><h4>' + t + (extra || '') + '</h4>' + body + '</section>'; }
  function paint() {
    var bg = $('fxBg'); if (!bg) return; var box = bg.querySelector('.fx-in'), st = bg.querySelector('.fx-sheet').scrollTop;
    var sm = g('_sortMode', 'ins'), E = excl(), d = curDose(), c = counts(), list = !!($('grid') && $('grid').classList.contains('list')), pct = !!g('_showPct', true);
    var h = '<header class="fx-hd"><b>Filtri e vista</b>' + (nActive() ? '<button type="button" class="fx-reset" data-reset>Azzera</button>' : '') + '</header>';
    h += sec('Ordina', '<div class="fx-sort">' + SORT.map(function (o) { return '<button type="button" data-sort="' + o[0] + '" class="' + (sm === o[0] ? 'on' : '') + '" aria-pressed="' + (sm === o[0]) + '">' + o[2] + '<span>' + o[1] + '</span></button>'; }).join('') + '</div>');
    if (window.NUT && NUT.ALLERGENI) {
      h += sec('Senza allergeni',
        '<div class="fx-alg">' + NUT.ALLERGENI.map(function (a) { var o = E.list.indexOf(a[0]) >= 0; return '<button type="button" data-alg="' + a[0] + '" class="' + (o ? 'on' : '') + '" aria-pressed="' + o + '" style="--a:' + a[3] + '"><b>' + a[2] + '</b>' + a[1] + '</button>'; }).join('') + '</div>' +
        '<label class="fx-sw"><span>Escludi anche «può contenere tracce»</span><input type="checkbox" data-may' + (E.may ? ' checked' : '') + '><i></i></label>',
        E.list.length ? '<small>' + E.list.length + ' esclus' + (E.list.length === 1 ? 'o' : 'i') + '</small>' : '');
    }
    h += sec('Dose per tutte le schede',
      '<div class="fx-dose"><div class="fx-step"><button type="button" data-dm aria-label="Meno">−</button><output>' + fmtX(d) + '</output><button type="button" data-dp aria-label="Più">+</button></div>' +
      '<div class="fx-pre">' + PRESET.map(function (p) { var o = Math.abs(p[0] - d) < 1e-9; return '<button type="button" data-d="' + p[0] + '" class="' + (o ? 'on' : '') + '">×' + p[1] + '</button>'; }).join('') + '</div></div>' +
      '<p class="fx-note">Ogni scheda può poi avere la sua dose.</p>');
    h += sec('Vista',
      '<div class="fx-seg"><button type="button" data-view="grid" class="' + (list ? '' : 'on') + '">' + IC.grid + 'Schede</button><button type="button" data-view="list" class="' + (list ? 'on' : '') + '">' + IC.list + 'Elenco</button></div>' +
      '<label class="fx-sw"><span>Percentuali degli ingredienti</span><input type="checkbox" data-pct' + (pct ? ' checked' : '') + '><i></i></label>');
    h += '<footer class="fx-ft"><button type="button" class="fx-go" data-close>' + (c.shown === 0 ? 'Nessuna ricetta' : 'Mostra ' + c.shown + ' ricett' + (c.shown === 1 ? 'a' : 'e')) + '</button></footer>';
    box.innerHTML = h; bg.querySelector('.fx-sheet').scrollTop = st;
  }
  document.addEventListener('click', function (e) {
    var bg = $('fxBg'); if (!bg || !bg.contains(e.target)) return;
    var b = e.target.closest('button,input'); if (!b) return;
    if (b.hasAttribute('data-close')) return close();
    if (b.hasAttribute('data-reset')) { setSortMode('ins'); try { NUT.setExcl([], false); } catch (x) {} setDoseAll(1); return sync(); }
    if (b.dataset.sort) { setSortMode(b.dataset.sort); return sync(); }
    if (b.dataset.alg) { var E = excl(), i = E.list.indexOf(b.dataset.alg); if (i >= 0) E.list.splice(i, 1); else E.list.push(b.dataset.alg); try { NUT.setExcl(E.list); } catch (x) {} return sync(); }
    if (b.hasAttribute('data-may')) { try { NUT.setExcl(excl().list, b.checked); } catch (x) {} return sync(); }
    if (b.hasAttribute('data-pct')) { if (!!g('_showPct', true) !== b.checked) togglePct(); return sync(); }
    if (b.dataset.view) { var t = $(b.dataset.view === 'list' ? 'vList' : 'vGrid'); if (t) t.click(); return sync(); }
    if (b.hasAttribute('data-dm')) { var d = curDose(); return setDoseAll(d - (d <= 1 ? 0.25 : 0.5)); }
    if (b.hasAttribute('data-dp')) { var d2 = curDose(); return setDoseAll(d2 + (d2 < 1 ? 0.25 : 0.5)); }
    if (b.dataset.d) return setDoseAll(+b.dataset.d);
  });
  addEventListener('resize', function () { place(); });

  /* ogni ridisegno della griglia aggiorna contatore e filtri attivi */
  if (typeof window.renderGrid === 'function') {
    var _rg = window.renderGrid;
    window.renderGrid = function () { var r = _rg.apply(this, arguments); try { build(); sync(); } catch (e) {} return r; };
  }
  if (typeof window.updDose === 'function') {
    var _ud = window.updDose;
    window.updDose = function () { var r = _ud.apply(this, arguments); try { sync(); } catch (e) {} return r; };
  }
  function init() { build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); }); else setTimeout(init, 0);
  window.FX = { open: open, close: close, sync: sync };

  var css = document.createElement('style');
  css.textContent = [
    /* guscio */
    '#app .ctrl-shell.fx2{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}',
    '#app .fx2 .ctrl-row{display:flex!important;flex-wrap:nowrap!important;align-items:center;gap:8px!important;padding:12px 16px 4px!important}',
    '#app .fx2 .dose-box{display:none!important}',
    '#app .fx2 .srch-wrap{flex:1;min-width:0;height:48px;position:relative;display:flex;align-items:center;border-radius:16px!important;background:var(--card,#fff)!important;border:1px solid var(--cb,rgba(0,0,0,.1))!important;box-shadow:0 1px 2px rgba(0,0,0,.04),0 6px 18px -14px rgba(0,0,0,.35)!important;transition:border-color .15s,box-shadow .15s}',
    '#app .fx2 .srch-wrap:focus-within{border-color:var(--ink2,#555)!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--ink,#1A1A16) 8%,transparent)!important}',
    '#app .fx2 .srch-ico{position:absolute;left:15px;width:18px!important;height:18px!important;color:var(--smoke,#888)}',
    '#app .fx2 .srch-inp{width:100%;height:100%;border:0!important;background:none!important;box-shadow:none!important;padding:0 14px 0 44px!important;font:400 16px "DM Sans",system-ui,sans-serif!important;color:var(--ink)!important;outline:none;border-radius:16px}',
    '#app .fx2 .srch-inp::placeholder{color:var(--smoke,#999);opacity:.85}',
    '#app .fx2 #sxAll{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:inline-flex!important;align-items:center;gap:6px;height:36px;padding:0 11px!important;border-radius:11px!important;border:0!important;background:var(--ctrl,rgba(0,0,0,.05))!important;color:var(--ink2,#444)!important;font:600 13px "DM Sans",sans-serif!important;box-shadow:none!important;cursor:pointer}',
    '#app .fx2 #sxAll span{display:inline!important}',
    '#app .fx2 .srch-inp{padding-right:110px!important}',
    '.fx-btn{position:relative;flex-shrink:0;display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-radius:16px;border:1px solid var(--cb,rgba(0,0,0,.1));background:var(--card,#fff);color:var(--ink);font:600 14px "DM Sans",system-ui,sans-serif;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.04),0 6px 18px -14px rgba(0,0,0,.35);transition:background .15s,transform .12s;-webkit-tap-highlight-color:transparent}',
    '.fx-btn:active{transform:scale(.96)}.fx-btn.on{background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));border-color:transparent}',
    '.fx-badge{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:99px;background:var(--gold2,#B8862F);color:#fff;font:700 11px/19px "DM Sans",sans-serif;font-style:normal;text-align:center;box-shadow:0 0 0 2.5px var(--bg,#F4F1EA);display:none}',
    '.fx-btn.on .fx-badge{display:block}',
    '@media(max-width:520px){.fx-btn{width:48px;padding:0;justify-content:center}.fx-btn-l{display:none}}',
    /* categorie */
    '#app .fx2 .cat-bar{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;gap:7px!important;padding:10px 16px 6px!important;scroll-padding:0 16px;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}',
    '#app .fx2 .cat-bar::after{content:"";flex:0 0 12px;order:100}',
    '#app .fx2 .cpill{flex-shrink:0;display:inline-flex!important;align-items:center;gap:6px;height:36px;padding:0 14px!important;border-radius:99px!important;border:1px solid var(--cb,rgba(0,0,0,.1))!important;background:var(--card,#fff)!important;color:var(--ink2,#444)!important;font:500 14px "DM Sans",system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important;white-space:nowrap;box-shadow:none!important;transition:background .15s,color .15s,transform .12s}',
    '#app .fx2 .cpill:active{transform:scale(.95)}',
    '#app .fx2 .cpill .cnt{margin:0!important;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:var(--ctrl,rgba(0,0,0,.06));color:var(--smoke,#888);font:600 11.5px/20px "DM Sans",sans-serif!important;text-align:center;opacity:1!important}',
    '#app .fx2 .cpill.cpill-on{background:var(--ink)!important;color:var(--bg)!important;border-color:transparent!important}',
    '#app .fx2 .cpill.cpill-on .cnt{background:color-mix(in srgb,var(--bg) 22%,transparent);color:var(--bg)}',
    '#app .fx2 .cpill.cpill-mgr{order:99;width:36px;padding:0!important;justify-content:center;font-size:0!important;border-style:dashed!important;color:var(--smoke,#888)!important;background:transparent!important}',
    '#app .fx2 .cpill.cpill-mgr::before{content:"";width:15px;height:15px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z%27/%3E%3Cpath d=%27M13.5 6.5l4 4%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z%27/%3E%3Cpath d=%27M13.5 6.5l4 4%27/%3E%3C/svg%3E") center/contain no-repeat}',
    /* riga sotto */
    '#app .sort-row.fx-meta{display:flex!important;align-items:center;gap:8px!important;padding:6px 16px 4px!important;margin:0!important;flex-wrap:wrap!important;min-width:0;border:0!important;background:none!important}',
    '#app .fx-meta .fx-on{order:3;flex:1 1 100%;display:none}#app .fx-meta .fx-on.has{display:flex}',
    '#app .fx-meta #cnt,#app .fx-meta #pctToggle,#app .fx-meta .sort-wrap{display:none!important}',
    '.fx-cnt{flex-shrink:0;font:500 13px "DM Sans",system-ui,sans-serif;color:var(--smoke,#888);white-space:nowrap}.fx-cnt b{color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums;margin-right:2px}',
    '.fx-on{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.fx-on::-webkit-scrollbar{display:none}',
    '.fx-chip{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 8px 0 11px;border-radius:99px;border:0;background:color-mix(in srgb,var(--gold2,#B8862F) 15%,var(--card,#fff));color:var(--ink);font:600 12.5px "DM Sans",sans-serif;cursor:pointer;white-space:nowrap}',
    '.fx-chip svg{opacity:.55}.fx-em{letter-spacing:1px}',
    '.fx-tools{display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:auto}',
    '#app .fx-tools .sel-btn,#app .fx-tools #algBtn{position:relative;display:inline-flex!important;align-items:center;justify-content:center;width:38px;height:38px;padding:0!important;margin:0!important;border-radius:12px!important;border:1px solid var(--cb,rgba(0,0,0,.1))!important;background:var(--card,#fff)!important;color:var(--ink2,#444)!important;font-size:0!important;cursor:pointer;box-shadow:none!important}',
    '#app .fx-tools #algBtn svg{width:18px;height:18px}',
    '#app .fx-tools #algBtn.on{background:color-mix(in srgb,var(--gold2,#B8862F) 18%,var(--card,#fff))!important;color:var(--ink)!important;border-color:color-mix(in srgb,var(--gold2,#B8862F) 45%,transparent)!important}',
    '#app .fx-tools #algBtn.on::after{content:"";position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--gold2,#B8862F);box-shadow:0 0 0 2px var(--card,#fff)}',
    '#app .fx-tools #selBtn::before{content:"";width:18px;height:18px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.8%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%274%27 y=%274%27 width=%2716%27 height=%2716%27 rx=%274.5%27/%3E%3Cpath d=%27M8.5 12.2l2.4 2.4 4.6-4.8%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.8%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%274%27 y=%274%27 width=%2716%27 height=%2716%27 rx=%274.5%27/%3E%3Cpath d=%27M8.5 12.2l2.4 2.4 4.6-4.8%27/%3E%3C/svg%3E") center/contain no-repeat}',
    '#app .fx-tools #selBtn.on{width:auto;padding:0 12px!important;background:var(--btn-bg,var(--ink))!important;color:var(--btn-ink,var(--bg))!important;border-color:transparent!important}',
    '#app .fx-tools #selBtn.on::before{display:none}#app .fx-tools #selBtn.on::after{content:"Fine";font:600 13px "DM Sans",sans-serif}',
    '#app .fx-tools .vbtns.fx-view{display:flex!important;gap:2px;padding:3px;margin:0!important;border-radius:12px;background:var(--ctrl,rgba(0,0,0,.06))!important;border:0!important}',
    '#app .fx-tools .fx-view .vbtn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0!important;border:0!important;border-radius:9px!important;background:none!important;color:var(--smoke,#888)!important;cursor:pointer;box-shadow:none!important}',
    '#app .fx-tools .fx-view .vbtn.vbtn-on{background:var(--card,#fff)!important;color:var(--ink)!important;box-shadow:0 1px 3px rgba(0,0,0,.14)!important}',
    /* intestazioni dei gruppi nella griglia */
    '#app .grid .group-hd{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:nowrap}',
    '#app .grid .group-hd span{min-width:0;font-size:clamp(1.35rem,4.6vw,1.6rem)!important;line-height:1.1!important}',
    '#app .grid .group-hd small{flex-shrink:0;white-space:nowrap;padding:3px 10px!important;border:0!important;border-radius:99px!important;background:var(--ctrl,rgba(0,0,0,.06))!important;color:var(--smoke,#888)!important;font:600 11.5px "DM Sans",sans-serif!important;letter-spacing:0!important;text-transform:none!important}',
    '@media(max-width:520px){#app .grid .group-hd::after{display:none!important}}',
    /* foglio */
    '.fx-bg{position:fixed;inset:0;z-index:140;background:rgba(15,13,10,0);transition:background .24s}',
    '.fx-bg.on{background:rgba(15,13,10,.38)}',
    '.fx-sheet{position:fixed;left:0;right:0;bottom:0;max-height:88vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;box-shadow:0 -18px 50px -20px rgba(0,0,0,.45);transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1);padding-bottom:env(safe-area-inset-bottom)}',
    '.fx-bg.on .fx-sheet{transform:none}',
    '.fx-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb,rgba(0,0,0,.15));margin:9px auto 0}',
    '@media(min-width:760px){.fx-bg.on{background:rgba(15,13,10,.12)}.fx-sheet{left:auto;bottom:auto;width:400px;max-height:min(78vh,720px);border-radius:22px;border:1px solid var(--cb,rgba(0,0,0,.1));box-shadow:0 30px 60px -24px rgba(0,0,0,.45);transform:translateY(-6px) scale(.98);opacity:0;transform-origin:top right;transition:transform .2s cubic-bezier(.2,.85,.25,1),opacity .16s}.fx-bg.on .fx-sheet{opacity:1}.fx-grab{display:none}}',
    '.fx-in{padding:6px 20px 0;font-family:"DM Sans",system-ui,sans-serif}',
    '.fx-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 0 4px}',
    '.fx-hd b{font:500 1.6rem/1.1 "Cormorant Garamond",Georgia,serif;font-style:italic;color:var(--ink)}',
    '.fx-reset{border:0;background:none;color:var(--gold3,#8B6408);font:600 14px "DM Sans",sans-serif;cursor:pointer;padding:6px 2px}',
    '.fx-sec{padding:14px 0;border-bottom:1px solid var(--cb,rgba(0,0,0,.08))}.fx-sec:last-of-type{border-bottom:0}',
    '.fx-sec h4{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 10px;font:700 11px "DM Sans",sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--smoke,#888)}',
    '.fx-sec h4 small{font:600 12px "DM Sans",sans-serif;letter-spacing:0;text-transform:none;color:var(--gold3,#8B6408)}',
    '.fx-sort{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.fx-sort button{display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;border-radius:14px;border:1px solid var(--cb,rgba(0,0,0,.1));background:none;color:var(--ink2,#444);font:500 14px "DM Sans",sans-serif;cursor:pointer;text-align:left;transition:all .15s}',
    '.fx-sort button svg{flex-shrink:0;opacity:.7}',
    '.fx-sort button.on{background:var(--ink);color:var(--bg);border-color:transparent;font-weight:600}.fx-sort button.on svg{opacity:1}',
    '.fx-alg{display:flex;flex-wrap:wrap;gap:7px}',
    '.fx-alg button{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px 0 5px;border-radius:99px;border:1px solid var(--cb,rgba(0,0,0,.1));background:none;color:var(--ink2,#444);font:500 13.5px "DM Sans",sans-serif;cursor:pointer;transition:all .15s}',
    '.fx-alg button b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,var(--a) 14%,transparent);font-size:15px;font-weight:400}',
    '.fx-alg button.on{background:color-mix(in srgb,var(--a) 15%,var(--card,#fff));border-color:color-mix(in srgb,var(--a) 60%,transparent);color:var(--ink);font-weight:600}',
    '.fx-alg button b{position:relative}',
    '.fx-alg button.on b::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--a);background:linear-gradient(135deg,transparent calc(50% - 1px),var(--a) calc(50% - 1px),var(--a) calc(50% + 1px),transparent calc(50% + 1px))}',
    '.fx-sw{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px;font:500 14px "DM Sans",sans-serif;color:var(--ink2,#444);cursor:pointer}',
    '.fx-sw input{position:absolute;opacity:0;pointer-events:none}',
    '.fx-sw i{flex-shrink:0;position:relative;width:46px;height:28px;border-radius:99px;background:var(--cb,rgba(0,0,0,.18));transition:background .2s}',
    '.fx-sw i::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .22s cubic-bezier(.2,.85,.25,1)}',
    '.fx-sw input:checked+i{background:var(--ok,#3F8F4A)}.fx-sw input:checked+i::after{transform:translateX(18px)}',
    '.fx-sw input:focus-visible+i{outline:2px solid var(--ink);outline-offset:2px}',
    '.fx-dose{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.fx-step{display:flex;align-items:center;height:44px;border-radius:14px;background:var(--ctrl,rgba(0,0,0,.05))}',
    '.fx-step button{width:44px;height:44px;border:0;background:none;color:var(--ink);font-size:20px;cursor:pointer}',
    '.fx-step output{min-width:50px;text-align:center;font:700 16px "DM Sans",sans-serif;font-variant-numeric:tabular-nums;color:var(--ink)}',
    '.fx-pre{display:flex;gap:6px;flex:1;min-width:200px}',
    '.fx-pre button{flex:1;height:40px;border-radius:12px;border:1px solid var(--cb,rgba(0,0,0,.1));background:none;color:var(--ink2,#444);font:600 14px "DM Sans",sans-serif;cursor:pointer}',
    '.fx-pre button.on{background:var(--ink);color:var(--bg);border-color:transparent}',
    '.fx-note{margin:8px 0 0;font:400 12.5px "DM Sans",sans-serif;color:var(--smoke,#888)}',
    '.fx-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:var(--ctrl,rgba(0,0,0,.05))}',
    '.fx-seg button{display:flex;align-items:center;justify-content:center;gap:8px;height:40px;border:0;border-radius:11px;background:none;color:var(--smoke,#888);font:600 14px "DM Sans",sans-serif;cursor:pointer}',
    '.fx-seg button.on{background:var(--card,#fff);color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.14)}',
    '.fx-ft{position:sticky;bottom:0;margin:0 -20px;padding:12px 20px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--card,#fff) 30%)}',
    '.fx-go{width:100%;height:52px;border:0;border-radius:16px;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));font:600 16px "DM Sans",sans-serif;cursor:pointer;transition:transform .12s}.fx-go:active{transform:scale(.98)}',
    '.fx-sheet button:focus-visible,.fx-btn:focus-visible,.cpill:focus-visible,.fx-chip:focus-visible{outline:2px solid var(--ink);outline-offset:2px}',
    '@media(prefers-reduced-motion:reduce){.fx-sheet,.fx-bg,.fx-sw i::after{transition:none!important}}'
  ].join('\n');
  document.head.appendChild(css);
})();
