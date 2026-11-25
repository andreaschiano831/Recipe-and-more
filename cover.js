/* cover.js — la foto del piatto arriva da sola durante l'import.
   · Foto di libri e quaderni: l'AI cerca nella pagina la fotografia del piatto finito e la ritaglia.
   · Link: la foto della ricetta (anteprima del sito, del reel o del video).
   · Video dal rullino: tra gli ultimi fotogrammi, il più nitido.
   Nella revisione la foto compare in cima alla scheda: si tiene, si cambia o si toglie.
   Al salvataggio diventa la copertina della ricetta (archivio privato dell'account). */
(function () {
  'use strict';
  var CACHE = typeof WeakMap === 'function' ? new WeakMap() : null, VCACHE = {};
  function server() { try { return aiCheckServer(); } catch (e) { return Promise.resolve(false); } }
  function api(body) {
    return server().then(function (ok) {
      if (!ok) return {};
      return fetch('/api/import', { method: 'POST', headers: WL.apiH(), body: JSON.stringify(body) }).then(function (r) { return r.json().catch(function () { return {}; }); });
    }).catch(function () { return {}; });
  }
  function loadImg(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }
  /* ritaglio del riquadro trovato dall'AI, con un filo di margine e senza superare la pagina */
  function crop(src, box) {
    return loadImg(src).then(function (im) {
      var W = im.naturalWidth, H = im.naturalHeight, pad = 0.012;
      var x1 = Math.max(0, (box[0] / 1000 - pad) * W), y1 = Math.max(0, (box[1] / 1000 - pad) * H), x2 = Math.min(W, (box[2] / 1000 + pad) * W), y2 = Math.min(H, (box[3] / 1000 + pad) * H);
      var w = x2 - x1, h = y2 - y1; if (w < 120 || h < 90) return '';
      var k = Math.min(1, 2048 / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, x1, y1, w, h, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.9);
    });
  }
  function shrinkForAi(src) { try { return aiResizeImage(src); } catch (e) { return Promise.resolve(src); } }
  function find(job) {
    if (!job) return Promise.resolve(null);
    if (CACHE && CACHE.has(job)) return CACHE.get(job);
    var p;
    if (job.image) p = shrinkForAi(job.image).then(function (small) { return api({ photobox: 1, image: small }); }).then(function (d) {
      if (!d || !d.box) return null;
      return crop(job.image, d.box).then(function (u) { return u ? { url: u, from: 'Foto trovata nella pagina' + (d.what ? ' · ' + d.what : '') } : null; });
    });
    else if (job.thumb) p = api({ img: job.thumb }).then(function (d) { return d && d.data ? { url: d.data, from: 'Foto dal link' } : null; });
    else if (job.video && window.VID && VID.coverFrame && window.ST && ST.video && ST.video.file) {
      var f = ST.video.file, key = f.name + f.size;
      p = VCACHE[key] || (VCACHE[key] = VID.coverFrame(f).then(function (u) { return u ? { url: u, from: 'Fotogramma del video' } : null; }));
    } else p = Promise.resolve(null);
    p = p.catch(function () { return null; });
    if (CACHE) CACHE.set(job, p);
    return p;
  }
  function rerender() { try { if (window.ST && ST._render) ST._render(); } catch (e) {} }
  function attach(it, job) {
    if (!it || it.cov) return;
    if (!job || !(job.image || job.thumb || job.video)) { it.cov = { st: 'none' }; return; }
    it.cov = { st: 'wait' };
    find(job).then(function (c) { if (!it.cov || it.cov.st !== 'wait') return; it.cov = c ? { st: 'ok', url: c.url, from: c.from } : { st: 'none' }; rerender(); });
  }
  function pickFile(it) {
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.style.display = 'none';
    i.onchange = function () {
      var f = i.files && i.files[0]; i.remove(); if (!f) return;
      var fr = new FileReader(); fr.onload = function () { it.cov = { st: 'ok', url: String(fr.result), from: 'La tua foto' }; rerender(); }; fr.readAsDataURL(f);
    };
    document.body.appendChild(i); i.click();
  }
  var ICAM = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  var ISPARK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9l-5.7 1.6L12 16l-1.8-5.4L4.5 9l5.7-1.4z"/></svg>';
  function block(it) {
    var c = it.cov || { st: 'none' }, el = document.createElement('div');
    if (c.st === 'wait') { el.className = 'st-cov wait'; el.innerHTML = '<span class="st-cov-shim"></span><span class="st-cov-msg">' + ISPARK + 'Cerco la foto del piatto…</span>'; return el; }
    if (c.st === 'ok') {
      el.className = 'st-cov ok';
      el.innerHTML = '<img alt="Foto del piatto"><span class="st-cov-tag">' + ISPARK + '<span></span></span><div class="st-cov-a"><button type="button" data-c="chg">Cambia</button><button type="button" data-c="off">Togli</button></div>';
      el.querySelector('img').src = c.url; el.querySelector('.st-cov-tag span').textContent = c.from || 'Foto';
      el.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.c === 'chg') pickFile(it); else { it.cov = { st: 'off', prev: c }; rerender(); } };
      return el;
    }
    el.className = 'st-cov add';
    el.innerHTML = '<button type="button" data-c="add">' + ICAM + '<span>Aggiungi la foto del piatto</span></button>' + (c.st === 'off' && c.prev ? '<button type="button" data-c="back" class="ghost">Rimetti quella trovata</button>' : '');
    el.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.c === 'back') { it.cov = c.prev; rerender(); } else pickFile(it); };
    return el;
  }
  function save(rec, it) {
    var c = it && it.cov; if (!c || c.st !== 'ok' || !c.url || !window.PH || !PH.addBlob) return Promise.resolve();
    if (!rec._id || !/^\d+$/.test(String(rec._id))) return Promise.resolve();
    var live = (window.CU || []).filter(function (r) { return r._id === rec._id; })[0] || rec;
    return fetch(c.url).then(function (r) { return r.blob(); }).then(function (b) { return PH.addBlob(live, b, { src: c.from }); }).catch(function (e) { console.warn('copertina', e); });
  }
  window.COV = { attach: attach, block: block, save: save, find: find };

  var st = document.createElement('style');
  st.textContent = [
    '.st-cov{position:relative;margin:-6px -6px 2px;border-radius:15px;overflow:hidden}',
    '.st-cov.ok,.st-cov.wait{aspect-ratio:16/10;max-height:230px;background:var(--ctrl,#eee)}',
    '.st-cov.ok img{width:100%;height:100%;object-fit:cover;display:block;animation:stCovIn .5s ease}',
    '@keyframes stCovIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}',
    '.st-cov.ok::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28),transparent 34%,transparent 62%,rgba(0,0,0,.38));pointer-events:none}',
    '.st-cov-tag{position:absolute;left:10px;top:10px;z-index:1;display:inline-flex;align-items:center;gap:5px;max-width:calc(100% - 20px);padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.9);color:#1a1410;font:600 11.5px "DM Sans",sans-serif;backdrop-filter:blur(6px)}',
    '.st-cov-tag span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.st-cov-tag svg{color:#B8862F;flex-shrink:0}',
    '.st-cov-a{position:absolute;right:10px;bottom:10px;z-index:1;display:flex;gap:6px}',
    '.st-cov-a button{height:32px;padding:0 12px;border:0;border-radius:99px;background:rgba(20,18,15,.62);color:#fff;font:600 12.5px "DM Sans",sans-serif;cursor:pointer;backdrop-filter:blur(6px)}',
    '.st-cov.wait{display:grid;place-items:center}',
    '.st-cov-shim{position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.45) 50%,transparent 80%) var(--ctrl,#eee);background-size:220% 100%;animation:stShim 1.3s linear infinite}',
    '@keyframes stShim{from{background-position:120% 0}to{background-position:-120% 0}}',
    '.st-cov-msg{position:relative;display:inline-flex;align-items:center;gap:6px;font:600 12.5px "DM Sans",sans-serif;color:var(--smoke)}.st-cov-msg svg{color:var(--gold2,#B8862F);animation:stPulse 1.2s ease-in-out infinite}',
    '@keyframes stPulse{50%{opacity:.35;transform:scale(.8)}}',
    '.st-cov.add{display:flex;gap:8px;flex-wrap:wrap;margin:0}',
    '.st-cov.add button{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:12px;border:1.5px dashed var(--cb);background:none;color:var(--smoke);font:600 .8rem "DM Sans",sans-serif;cursor:pointer}',
    '.st-cov.add button.ghost{border-style:solid}',
    /* scansione: una luce che passa sulla foto che l'AI sta leggendo */
    '.st-thumb.scan{box-shadow:0 0 0 2px var(--gold2,#B8862F)}',
    '.st-thumb.scan::after{content:"";position:absolute;left:0;right:0;top:0;height:28%;background:linear-gradient(180deg,transparent,rgba(232,190,100,.55) 85%,rgba(255,236,190,.95));border-bottom:2px solid #F2C14E;animation:stScan 1.6s cubic-bezier(.45,0,.55,1) infinite alternate;pointer-events:none;z-index:2}',
    '@keyframes stScan{from{transform:translateY(-100%)}to{transform:translateY(360%)}}',
    '@media(prefers-reduced-motion:reduce){.st-thumb.scan::after,.st-cov-shim,.st-cov-msg svg{animation:none}}'
  ].join('\n');
  document.head.appendChild(st);
})();
