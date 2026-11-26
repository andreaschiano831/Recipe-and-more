/* scan.js — scansione continua di quaderni e libri.
   La fotocamera resta aperta: sfogli, e appena la pagina è ferma scatta da sola (a piena
   risoluzione), ritaglia la pagina dallo sfondo e aspetta che tu giri pagina. Le foto vanno
   in «Nuova ricetta → Foto», pronte per l'AI. C'è anche lo scatto manuale. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/></svg>';
  function ok() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  var S = null;
  function open(done) {
    if (!ok()) { alert('Questo browser non può usare la fotocamera.'); return; }
    var el = document.createElement('div'); el.id = 'scanBg'; el.className = 'sc-v';
    el.innerHTML = '<video playsinline muted autoplay></video><div class="sc-frame"><i></i><i></i><i></i><i></i></div><div class="sc-flash"></div>' +
      '<header class="sc-top"><button type="button" class="sc-x" data-x aria-label="Annulla">×</button><span class="sc-st" id="scSt">Avvicina la pagina</span><button type="button" class="sc-auto on" id="scAuto" aria-pressed="true">Auto</button></header>' +
      '<footer class="sc-bot"><div class="sc-strip" id="scStrip"></div><button type="button" class="sc-shot" id="scShot" aria-label="Scatta ora"><i></i></button><button type="button" class="sc-done" id="scDone" disabled>Fine</button></footer>';
    document.body.appendChild(el); document.body.classList.add('sc-open');
    S = { el: el, v: el.querySelector('video'), files: [], prev: null, still: 0, moved: true, auto: true, cool: 0, t: null, done: done, small: document.createElement('canvas') };
    S.small.width = 64; S.small.height = 48;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false }).then(function (st) {
      if (!S) { st.getTracks().forEach(function (t) { t.stop(); }); return; }
      S.stream = st; S.v.srcObject = st; var p = S.v.play(); if (p && p.catch) p.catch(function () {});
      S.t = setInterval(tick, 140);
    }).catch(function () { close(); alert('Fotocamera non consentita: abilitala nelle impostazioni del browser.'); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) return close(true);
      if (b.id === 'scShot') return shoot(true);
      if (b.id === 'scAuto') { S.auto = !S.auto; b.classList.toggle('on', S.auto); b.setAttribute('aria-pressed', String(S.auto)); status(S.auto ? 'Automatico: tieni ferma la pagina' : 'Manuale: tocca il pulsante per scattare'); return; }
      if (b.id === 'scDone') return close(false);
    });
  }
  function status(t) { var s = $('scSt'); if (s) s.textContent = t; }
  function tick() {
    if (!S || S.v.readyState < 2) return;
    var x = S.small.getContext('2d', { willReadFrequently: true }); x.drawImage(S.v, 0, 0, 64, 48);
    var d = x.getImageData(0, 0, 64, 48).data, g = new Uint8Array(3072), sum = 0;
    for (var i = 0, j = 0; i < 3072; i++, j += 4) { g[i] = (d[j] * 3 + d[j + 1] * 6 + d[j + 2]) / 10; sum += g[i]; }
    var P = S.prev; S.prev = g; if (!P) return;
    var diff = 0; for (var k = 0; k < 3072; k++) diff += Math.abs(g[k] - P[k]); diff /= 3072;
    var now = Date.now(), lum = sum / 3072;
    if (diff > 6) { S.still = 0; if (!S.moved) { S.moved = true; status('Pagina nuova: tienila ferma…'); } S.el.classList.remove('steady'); return; }
    if (!S.auto || now < S.cool || !S.moved) return;
    if (lum < 35) { status('Poca luce: avvicinati a una finestra'); return; }
    S.still += 140; S.el.classList.toggle('steady', S.still > 300);
    if (S.still >= 900) shoot(false);
  }
  /* la pagina è più chiara dello sfondo: si cerca il riquadro chiaro e si taglia il resto */
  function pageBox(c) {
    var w = 160, h = Math.round(160 * c.height / c.width), t = document.createElement('canvas'); t.width = w; t.height = h;
    var x = t.getContext('2d'); x.drawImage(c, 0, 0, w, h); var d = x.getImageData(0, 0, w, h).data, L = new Uint8Array(w * h), hist = new Array(256).fill(0);
    for (var i = 0, j = 0; i < w * h; i++, j += 4) { L[i] = (d[j] * 3 + d[j + 1] * 6 + d[j + 2]) / 10; hist[L[i]]++; }
    var tot = w * h, sumB = 0, wB = 0, best = 0, th = 128, sum1 = 0; for (var k = 0; k < 256; k++) sum1 += k * hist[k];
    for (k = 0; k < 256; k++) { wB += hist[k]; if (!wB) continue; var wF = tot - wB; if (!wF) break; sumB += k * hist[k]; var mB = sumB / wB, mF = (sum1 - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = k; } }
    var rows = [], cols = []; for (var y = 0; y < h; y++) { var n = 0; for (var xx = 0; xx < w; xx++) if (L[y * w + xx] > th) n++; rows.push(n / w); }
    for (xx = 0; xx < w; xx++) { var m = 0; for (y = 0; y < h; y++) if (L[y * w + xx] > th) m++; cols.push(m / h); }
    var y0 = rows.findIndex(function (v) { return v > 0.35; }), y1 = h - 1 - rows.slice().reverse().findIndex(function (v) { return v > 0.35; });
    var x0 = cols.findIndex(function (v) { return v > 0.35; }), x1 = w - 1 - cols.slice().reverse().findIndex(function (v) { return v > 0.35; });
    if (y0 < 0 || x0 < 0) return null;
    var bw = x1 - x0, bh = y1 - y0; if (bw * bh < 0.22 * w * h || bw * bh > 0.97 * w * h) return null;
    var k2 = c.width / w, pad = 4; return { x: Math.max(0, (x0 - pad) * k2), y: Math.max(0, (y0 - pad) * k2), w: Math.min(c.width, (bw + 2 * pad) * k2), h: Math.min(c.height, (bh + 2 * pad) * k2) };
  }
  function shoot(manual) {
    if (!S || S.v.readyState < 2) return;
    var vw = S.v.videoWidth, vh = S.v.videoHeight; if (!vw) return;
    var c = document.createElement('canvas'); c.width = vw; c.height = vh; c.getContext('2d').drawImage(S.v, 0, 0, vw, vh);
    var b = pageBox(c), out = c;
    if (b) { out = document.createElement('canvas'); out.width = Math.round(b.w); out.height = Math.round(b.h); out.getContext('2d').drawImage(c, b.x, b.y, b.w, b.h, 0, 0, out.width, out.height); }
    S.moved = false; S.still = 0; S.cool = Date.now() + 1200; S.el.classList.remove('steady');
    var fl = S.el.querySelector('.sc-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    out.toBlob(function (bl) {
      if (!S || !bl) return;
      var f = new File([bl], 'pagina-' + (S.files.length + 1) + '.jpg', { type: 'image/jpeg' }); S.files.push(f);
      var im = document.createElement('img'); im.src = URL.createObjectURL(bl); im.alt = 'Pagina ' + S.files.length; $('scStrip').appendChild(im); $('scStrip').scrollLeft = 1e5;
      $('scDone').disabled = false; $('scDone').textContent = 'Fine · ' + S.files.length;
      status(S.files.length + (S.files.length === 1 ? ' pagina' : ' pagine') + (b ? ' · pagina ritagliata' : '') + ' · gira pagina');
    }, 'image/jpeg', 0.9);
  }
  function close(cancel) {
    if (!S) return;
    clearInterval(S.t); try { S.stream && S.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    var files = S.files, done = S.done; S.el.remove(); document.body.classList.remove('sc-open'); S = null;
    if (!cancel && files.length && done) done(files);
  }
  document.addEventListener('keydown', function (e) { if (S && e.key === 'Escape') close(true); });
  window.SCAN = { open: open, ok: ok, icon: ICON, _shoot: function () { shoot(true); }, _box: pageBox };
  var st = document.createElement('style');
  st.textContent = [
    'body.sc-open{overflow:hidden}',
    '.sc-v{position:fixed;inset:0;z-index:9700;background:#000;color:#fff;font-family:"DM Sans",system-ui,sans-serif}',
    '.sc-v video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.sc-frame{position:absolute;inset:14% 7% 22%;pointer-events:none}.sc-frame i{position:absolute;width:34px;height:34px;border:3px solid rgba(255,255,255,.85);transition:border-color .2s}',
    '.sc-frame i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0;border-radius:12px 0 0 0}.sc-frame i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0;border-radius:0 12px 0 0}.sc-frame i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 12px}.sc-frame i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 12px 0}',
    '.sc-v.steady .sc-frame i{border-color:#F2C14E}',
    '.sc-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.sc-flash.go{animation:scFl .45s ease-out}@keyframes scFl{0%{opacity:.85}100%{opacity:0}}',
    '.sc-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;background:linear-gradient(rgba(0,0,0,.55),transparent)}',
    '.sc-x{width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:24px;cursor:pointer}',
    '.sc-st{flex:1;text-align:center;font:600 14px "DM Sans",sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.6)}',
    '.sc-auto{height:36px;padding:0 14px;border-radius:99px;border:1.5px solid rgba(255,255,255,.6);background:none;color:#fff;font:700 12.5px "DM Sans",sans-serif;cursor:pointer}.sc-auto.on{background:#F2C14E;border-color:#F2C14E;color:#1a1410}',
    '.sc-bot{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:16px 16px calc(18px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(0,0,0,.65))}',
    '.sc-strip{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;min-width:0}.sc-strip img{flex-shrink:0;width:42px;height:56px;object-fit:cover;border-radius:7px;border:2px solid #fff;animation:scIn .35s ease}@keyframes scIn{from{transform:scale(1.6);opacity:0}}',
    '.sc-shot{width:72px;height:72px;border-radius:50%;border:4px solid #fff;background:none;display:grid;place-items:center;cursor:pointer}.sc-shot i{width:56px;height:56px;border-radius:50%;background:#fff;transition:transform .12s}.sc-shot:active i{transform:scale(.88)}',
    '.sc-done{justify-self:end;height:44px;padding:0 18px;border-radius:99px;border:0;background:#fff;color:#1a1410;font:700 14px "DM Sans",sans-serif;cursor:pointer}.sc-done:disabled{opacity:.4}',
    '.st-scanbtn{border-style:dashed!important}'
  ].join('\n');
  document.head.appendChild(st);
})();
