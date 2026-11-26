/* timeline.js — Timeline a ritroso.
   Scegli quando la preparazione deve essere pronta: dal procedimento legge i tempi di ogni passaggio
   (cotture, riposi, abbattimento, lievitazioni, «una notte»…), distingue il lavoro di mani dalle attese
   e calcola a ritroso l'ora d'inizio di ogni passaggio. I tempi si correggono a mano (restano sul dispositivo)
   e le attese diventano timer con un tocco. Il Menù usa lo stesso calcolo per dire entro quando iniziare. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l-2.5 2.5M9 2h6"/><path d="M4.5 6.5 3 5"/></svg>';
  var PASSIVE = /ripos|frigo|frigorifero|abbatt|congel|surgel|cuoc|cottura|forno|inforn|lievit|raffredd|intiepid|infus|marin|asciug|cristallizz|rassod|maturaz|rapprend|gelific|stabilizz|bollire|sobboll|tostare/i;

  /* minuti scritti in un passaggio («20-25 min», «2 ore», «1 h 30», «una notte», «mezz'ora»…) */
  function minutesIn(t) {
    var s = String(t || '').toLowerCase(), tot = 0, m, re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|a|o)\s*(\d+(?:[.,]\d+)?))?\s*(ore|ora|h|hr|hours?|minuti|minuto|min|mins|'|giorni|giorno|gg|notti|notte|secondi|sec)(?![a-zà-ù])/g;
    while ((m = re.exec(s))) {
      var v = Math.max(num(m[1]), m[2] ? num(m[2]) : 0), u = m[3];
      if (/^(ore|ora|h|hr|hour)/.test(u)) { v *= 60; var after = s.slice(re.lastIndex).match(/^\s*(?:e\s*)?(\d{1,2})\s*(?:min|minuti|')?\b/); if (after && /h$/.test(u) && +after[1] < 60) { v += +after[1]; re.lastIndex += after[0].length; } }
      else if (/^(giorn|gg)/.test(u)) v *= 1440;
      else if (/^nott/.test(u)) v *= 720;
      else if (/^sec/.test(u)) v /= 60;
      tot += v;
    }
    if (/(una|tutta la|per la|durante la) notte|overnight/.test(s)) tot += 720;
    if (/mezz.?ora/.test(s)) tot += 30;
    if (/\bun.?ora\b/.test(s)) tot += 60;
    if (/\bun giorno\b/.test(s)) tot += 1440;
    return Math.round(tot);
  }
  function steps(r) { return String(r.p || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^(resa|note?)\s*:/i.test(x); }); }
  function key(r) { return 'tl:' + (r._id || r.n); }
  function edits(r) { try { return JSON.parse(localStorage.getItem(key(r)) || '{}') || {}; } catch (e) { return {}; } }
  function plan(r) {
    var E = edits(r), L = steps(r).map(function (t, i) {
      var found = minutesIn(t), pas = PASSIVE.test(t), min = E[i] != null ? E[i] : found || (pas ? 15 : 8);
      return { i: i, t: t.replace(/^\d+[.)]\s*/, ''), min: min, guessed: E[i] == null && !found, edited: E[i] != null, kind: pas ? 'wait' : 'hands' };
    });
    if (!L.length) L = [{ i: 0, t: 'Preparazione', min: 30, guessed: true, kind: 'hands' }];
    var total = L.reduce(function (a, x) { return a + x.min; }, 0), hands = L.filter(function (x) { return x.kind === 'hands'; }).reduce(function (a, x) { return a + x.min; }, 0);
    return { steps: L, total: total, hands: hands };
  }
  function dur(min) { min = Math.round(min); if (min < 60) return min + ' min'; var h = Math.floor(min / 60), m = min % 60; if (h >= 24 && !m) return (h / 24 === 1 ? '1 giorno' : h / 24 + ' giorni'); return h + ' h' + (m ? ' ' + m + ' min' : ''); }
  function clock(d, ref) {
    var t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var a = new Date(d); a.setHours(0, 0, 0, 0); var b = new Date(ref || Date.now()); b.setHours(0, 0, 0, 0);
    var dd = Math.round((a - b) / 864e5);
    if (dd === 0) return t; if (dd === -1) return 'ieri ' + t; if (dd === 1) return 'domani ' + t;
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }) + ' ' + t;
  }
  function localInput(d) { var p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function defaultAt() { var d = new Date(); d.setHours(19, 30, 0, 0); if (d < Date.now() + 30 * 6e4) d.setDate(d.getDate() + 1); return d; }
  function latestStart(r, at) { return new Date(+at - plan(r).total * 6e4); }

  var S = null;
  function open(r, o) {
    if (!r) return; o = o || {};
    var at = o.at ? new Date(o.at) : null; if (!at || isNaN(at)) { try { var sv = localStorage.getItem('tl_at'); if (sv && new Date(sv) > Date.now()) at = new Date(sv); } catch (e) {} }
    S = { r: r, at: at && !isNaN(at) ? at : defaultAt() };
    var old = $('tlBg'); if (old) old.remove();
    var bg = document.createElement('div'); bg.id = 'tlBg'; bg.className = 'scl-bg';
    bg.innerHTML = '<div class="scl-sheet tl-sheet" role="dialog" aria-modal="true" aria-labelledby="tlT"><span class="scl-grab"></span>' +
      '<header class="scl-hd"><div><span class="scl-k">Timeline a ritroso</span><h3 id="tlT">' + esc(r.n) + '</h3></div><button type="button" class="scl-x" data-x aria-label="Chiudi">×</button></header>' +
      '<label class="tl-at"><span>Deve essere pronta</span><input type="datetime-local" id="tlAt" value="' + localInput(S.at) + '"></label><div id="tlBody"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', onClick); bg.addEventListener('input', onInput); bg.addEventListener('change', onInput);
    paint();
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }
  function close() { var bg = $('tlBg'); if (!bg) return; bg.classList.remove('on'); bg.id = 'tlOut'; setTimeout(function () { bg.remove(); }, 240); }
  function paint() {
    var P = plan(S.r), end = +S.at, t = end - P.total * 6e4, start = new Date(t), late = start < Date.now();
    var rows = '', cur = t;
    P.steps.forEach(function (x) {
      var st = new Date(cur); cur += x.min * 6e4;
      rows += '<li class="tl-s ' + x.kind + (cur < Date.now() ? ' past' : '') + '"><span class="tl-t mono">' + esc(clock(st, end)) + '</span><span class="tl-dot"></span><div class="tl-b"><p>' + esc(x.t) + '</p>' +
        '<div class="tl-m"><span class="tl-k">' + (x.kind === 'wait' ? 'Attesa' : 'Lavoro') + '</span><label class="tl-d"><input inputmode="numeric" data-min="' + x.i + '" value="' + x.min + '" aria-label="Minuti del passaggio"><em>min</em></label>' +
        (x.guessed ? '<small>stimato</small>' : x.edited ? '<button type="button" class="tl-rs" data-reset="' + x.i + '">dal testo</button>' : '') +
        (x.kind === 'wait' && x.min >= 1 && window.XL && XL.timers ? '<button type="button" class="tl-tm" data-timer="' + x.i + '">Timer ' + esc(dur(x.min)) + '</button>' : '') + '</div></div></li>';
    });
    rows += '<li class="tl-s end"><span class="tl-t mono">' + esc(clock(new Date(end), end)) + '</span><span class="tl-dot"></span><div class="tl-b"><p><b>Pronta</b></p></div></li>';
    $('tlBody').innerHTML = '<div class="tl-sum' + (late ? ' late' : '') + '"><div><span>Inizia</span><b class="mono">' + esc(clock(start)) + '</b></div><div><span>In tutto</span><b>' + esc(dur(P.total)) + '</b></div><div><span>Di lavoro</span><b>' + esc(dur(P.hands)) + '</b></div></div>' +
      (late ? '<p class="tl-late">Per essere pronta a quell\'ora avresti dovuto iniziare ' + (Date.now() - start < 864e5 ? 'alle ' + esc(clock(start)) : esc(clock(start))) + ': mancano ' + esc(dur((Date.now() - start) / 6e4)) + '.</p>' : '') +
      '<ol class="tl-list">' + rows + '</ol><p class="tl-note">I tempi vengono dal procedimento; dove non sono scritti sono stimati. Correggili: restano per la prossima volta.</p>';
  }
  function setEdit(i, v) { var E = edits(S.r); if (v == null) delete E[i]; else E[i] = v; try { localStorage.setItem(key(S.r), JSON.stringify(E)); } catch (e) {} }
  function onInput(e) {
    var t = e.target;
    if (t.id === 'tlAt') { var d = new Date(t.value); if (!isNaN(d)) { S.at = d; try { localStorage.setItem('tl_at', d.toISOString()); } catch (x) {} paint(); } return; }
    if (t.dataset.min != null) { var v = Math.max(0, Math.round(num(t.value))); setEdit(+t.dataset.min, v); clearTimeout(S._t); var i = t.dataset.min; S._t = setTimeout(function () { var y = $('tlBg').querySelector('.scl-sheet').scrollTop; paint(); $('tlBg').querySelector('.scl-sheet').scrollTop = y; var n = document.querySelector('#tlBg [data-min="' + i + '"]'); if (n) { n.focus(); var L = n.value.length; try { n.setSelectionRange(L, L); } catch (x) {} } }, 500); }
  }
  function onClick(e) {
    var bg = $('tlBg'); if (e.target === bg || e.target.closest('[data-x]')) return close();
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.reset != null) { setEdit(+b.dataset.reset, null); return paint(); }
    if (b.dataset.timer != null) { var x = plan(S.r).steps[+b.dataset.timer]; if (x) XL.timers.add({ min: x.min, label: S.r.n, sub: x.t.slice(0, 60), key: 'tl:' + (S.r._id || S.r.n) + ':' + x.i }); }
  }

  var item = { k: 'timeline', icon: ICON, label: 'Timeline a ritroso', t: 'Timeline a ritroso', s: 'Dall\'ora del servizio: quando iniziare ogni passaggio', run: function (r) { open(r); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(item);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(item);
  window.TL = { open: open, plan: plan, minutesIn: minutesIn, latestStart: latestStart, dur: dur, clock: clock, icon: ICON };
  var st = document.createElement('style');
  st.textContent = [
    '.tl-sheet{max-width:600px!important}',
    '.tl-at{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0 4px;font-size:.88rem;color:var(--ink2)}.tl-at input{height:42px;padding:0 10px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:600 15px "DM Sans",sans-serif;min-width:0}',
    '.tl-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.tl-sum div{padding:10px 12px;border-radius:14px;background:var(--bg2,rgba(0,0,0,.04));display:flex;flex-direction:column;gap:2px}.tl-sum span{font-size:.72rem;color:var(--smoke);text-transform:uppercase;letter-spacing:.08em;font-weight:700}.tl-sum b{font:700 1.05rem/1.25 "DM Sans",sans-serif}',
    '.tl-sum.late div:first-child{background:color-mix(in srgb,#b3261e 10%,transparent)}.tl-sum.late div:first-child b{color:#b3261e}.tl-late{margin:0 0 8px;font-size:.85rem;color:#9b2018}',
    '.tl-list{list-style:none;margin:8px 0 0;padding:0}.tl-s{display:grid;grid-template-columns:74px 18px 1fr;gap:0 8px;position:relative}',
    '.tl-s::before{content:"";position:absolute;left:88px;top:16px;bottom:-4px;width:2px;background:var(--cb)}.tl-s.end::before{display:none}',
    '.tl-t{padding-top:2px;font-size:.84rem;font-weight:700;text-align:right;white-space:nowrap}.tl-dot{width:12px;height:12px;margin:4px 0 0 1px;border-radius:50%;background:var(--card);border:2.5px solid var(--gold2,#B8862F);position:relative;z-index:1}',
    '.tl-s.wait .tl-dot{border-color:#5b7fa8}.tl-s.end .tl-dot{background:var(--ink);border-color:var(--ink)}.tl-s.past{opacity:.55}',
    '.tl-b{padding-bottom:16px;min-width:0}.tl-b p{margin:0;font-size:.9rem;line-height:1.45}',
    '.tl-m{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin-top:6px}.tl-k{font:700 9.5px "DM Sans",sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--gold3,#8B6408)}.tl-s.wait .tl-k{color:#4a6b90}',
    '.tl-d{display:flex;align-items:center;gap:3px;height:30px;padding:0 8px;border-radius:9px;border:1px solid var(--cb)}.tl-d input{width:42px;border:0!important;background:none!important;box-shadow:none!important;outline:none!important;padding:0!important;height:auto!important;font:600 14px "DM Sans",sans-serif;color:var(--ink);text-align:right}.tl-d em{font-style:normal;font-size:.74rem;color:var(--smoke)}',
    '.tl-m small{font-size:.72rem;color:var(--smoke)}.tl-rs{border:0;background:none;color:var(--gold3,#8B6408);font:600 .74rem "DM Sans",sans-serif;cursor:pointer;padding:0}',
    '.tl-tm{height:30px;padding:0 10px;border-radius:99px;border:1px solid color-mix(in srgb,#5b7fa8 40%,transparent);background:color-mix(in srgb,#5b7fa8 8%,transparent);color:#3d5f87;font:600 .76rem "DM Sans",sans-serif;cursor:pointer}',
    '.tl-note{font-size:.78rem;color:var(--smoke);line-height:1.5}'
  ].join('\n');
  document.head.appendChild(st);
})();
