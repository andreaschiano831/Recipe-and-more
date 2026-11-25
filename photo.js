/* photo.js — foto delle ricette: risultato e passaggi.
   · Le foto si rimpiccioliscono sul telefono (grande 1600 px + miniatura 480 px) e vanno
     nell'archivio privato dell'account su Supabase (lo stesso della biblioteca), cartella
     <account>/photos/<ricetta>/. Le vede solo la brigata.
   · Nella ricetta restano solo i riferimenti (campo «ph», copertina in «phc»).
   · Copertina sulla scheda della collezione, galleria nella pagina ricetta, foto dentro
     i passaggi, visore a tutto schermo. */
(function () {
  'use strict';
  var BUCKET = 'library';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { try { if (window.XL && XL.toast) return XL.toast(m); libToast(m, ''); } catch (e) {} }
  function canEdit() { return !(window.WL && WL.canEdit) || WL.canEdit(); }
  function rid(r) { return r && r._id != null && /^\d+$/.test(String(r._id)) ? String(r._id) : null; }
  function list(r) { return Array.isArray(r && r.ph) ? r.ph : []; }
  function cover(r) { var L = list(r); if (!L.length) return null; return L.filter(function (p) { return p.id === r.phc; })[0] || L.filter(function (p) { return p.k !== 'step'; })[0] || L[0]; }
  function sorted(r) { var c = cover(r), L = list(r).slice(); L.sort(function (a, b) { if (a === c) return -1; if (b === c) return 1; if ((a.k === 'step') !== (b.k === 'step')) return a.k === 'step' ? 1 : -1; return (a.s || 0) - (b.s || 0) || String(a.at).localeCompare(String(b.at)); }); return L; }
  var I = {
    cam: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    l: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    r: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>'
  };

  /* ── archivio ── */
  function ws() { return (window.WL && WL.ws) || ''; }
  function path(r, p, thumb) { return ws() + '/photos/' + rid(r) + '/' + p.id + (thumb ? '_t' : '') + '.jpg'; }
  function surl(p) { return SB_URL + '/storage/v1/object/' + BUCKET + '/' + p.split('/').map(encodeURIComponent).join('/'); }
  function hdr(x) { var h = { apikey: SB_KEY, Authorization: 'Bearer ' + WL_TOKEN() }; for (var k in x || {}) h[k] = x[k]; return h; }
  function upload(p, blob) {
    return fetch(surl(p), { method: 'POST', headers: hdr({ 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '31536000' }), body: blob }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(/bucket|not found/i.test(t) ? 'manca l’archivio «library» su Supabase (esegui il codice SQL)' : res.status === 403 ? 'permesso negato dall’archivio' : 'errore ' + res.status); });
    });
  }
  function remove(paths) { return fetch(SB_URL + '/storage/v1/object/' + BUCKET, { method: 'DELETE', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: paths }) }).catch(function () {}); }
  var MEM = {}, PEND = {};
  function ckey(p) { return 'https://rc-photo.local/' + p; }
  function load(p) {
    if (MEM[p]) return Promise.resolve(MEM[p]);
    if (PEND[p]) return PEND[p];
    var fromCache = window.caches ? caches.open('rc-photos-v1').then(function (c) { return c.match(ckey(p)); }).catch(function () { return null; }) : Promise.resolve(null);
    PEND[p] = fromCache.then(function (hit) {
      if (hit) return hit.blob();
      return fetch(surl(p), { headers: hdr() }).then(function (res) {
        if (!res.ok) throw new Error('foto non trovata');
        return res.blob().then(function (b) { if (window.caches) caches.open('rc-photos-v1').then(function (c) { c.put(ckey(p), new Response(b, { headers: { 'Content-Type': 'image/jpeg' } })); }).catch(function () {}); return b; });
      });
    }).then(function (b) { var u = URL.createObjectURL(b); MEM[p] = u; delete PEND[p]; return u; }, function (e) { delete PEND[p]; throw e; });
    return PEND[p];
  }
  function put(p, blob) { var u = URL.createObjectURL(blob); MEM[p] = u; if (window.caches) caches.open('rc-photos-v1').then(function (c) { c.put(ckey(p), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } })); }).catch(function () {}); }
  function sharp(el, r, p) {
    /* prima la miniatura (veloce), poi la foto grande se lo schermo ne ha bisogno */
    img(el, r, p, true);
    var need = (el.clientWidth || el.parentNode.clientWidth || 300) * (window.devicePixelRatio || 1);
    if (need > 560) load(path(r, p, false)).then(function (u) { var pre = new Image(); pre.onload = function () { el.src = u; el.classList.remove('ph-wait'); }; pre.src = u; }, function () {});
  }
  function img(el, r, p, thumb) {
    var key = path(r, p, thumb); el.classList.add('ph-wait');
    load(key).then(function (u) { el.src = u; el.classList.remove('ph-wait'); }, function () { if (thumb) load(path(r, p, false)).then(function (u) { el.src = u; el.classList.remove('ph-wait'); }, function () { el.classList.add('ph-err'); }); else el.classList.add('ph-err'); });
  }

  /* ── ridimensionare sul telefono ── */
  function bitmap(file) {
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); }).catch(function () { return viaImg(file); });
    return viaImg(file);
  }
  function viaImg(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('Immagine non leggibile')); }; im.src = u; }); }
  function shrink(src, max, q) {
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, k = Math.min(1, max / Math.max(w, h));
    var tw = Math.round(w * k), th = Math.round(h * k), cur = src, cw = w, ch = h;
    /* si dimezza a passi: un salto unico da 4000 a 500 px rende la foto sgranata */
    while (cw / 2 >= tw * 1.05) {
      var t = document.createElement('canvas'); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2);
      var tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high'; tx.drawImage(cur, 0, 0, t.width, t.height);
      cur = t; cw = t.width; ch = t.height;
    }
    var c = document.createElement('canvas'); c.width = tw; c.height = th;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, tw, th);
    return new Promise(function (res) { c.toBlob(function (b) { res({ b: b, w: c.width, h: c.height }); }, 'image/jpeg', q); });
  }

  /* ── salvare i riferimenti nella ricetta ── */
  function patch(r, fn) {
    if (window.XL && XL.rec && XL.viewOpen && (XL.rec === r || XL.rec._id === r._id)) return XL.patchRec(XL.rec, fn);
    if (!canEdit()) { toast('Solo admin e pastry chef possono modificare la ricetta'); return false; }
    var nd = JSON.parse(JSON.stringify(r)); delete nd._id; fn(nd);
    try { updateRec(r, nd); Object.keys(nd).forEach(function (k) { r[k] = nd[k]; }); if (!('phc' in nd)) delete r.phc; if (!('ph' in nd)) delete r.ph; return true; } catch (e) { toast('Non riesco a salvare'); return false; }
  }
  function steps(r) { try { return ckSteps(r.p || '').steps; } catch (e) { return []; } }
  function stepTitle(s) { try { return XL.stepTitle ? XL.stepTitle(s) : String(s).slice(0, 40); } catch (e) { return String(s).slice(0, 40); } }

  /* ── aggiungere: scelta del file, poi «Risultato» o «Passaggio» ── */
  function pick(r, preStep) {
    if (!rid(r)) { toast('Salva prima la ricetta online, poi aggiungi le foto'); return; }
    if (!canEdit()) { toast('Solo admin e pastry chef aggiungono foto'); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
    inp.onchange = function () { var fs = [].slice.call(inp.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name); }); inp.remove(); if (fs.length) chooser(r, fs, preStep); };
    document.body.appendChild(inp); inp.click();
  }
  function chooser(r, files, preStep) {
    var S = steps(r), st = { k: preStep != null ? 'step' : 'res', s: preStep != null ? preStep : 0 };
    var bg = document.createElement('div'); bg.id = 'phAddBg'; bg.className = 'ph-bg';
    var prevs = files.slice(0, 8).map(function (f) { return URL.createObjectURL(f); });
    function paint(busy) {
      bg.innerHTML = '<div class="ph-sheet" role="dialog" aria-modal="true"><span class="ph-grab"></span>' +
        '<header class="ph-hd"><div><span class="ph-k">Nuove foto</span><h3>' + files.length + (files.length === 1 ? ' foto' : ' foto') + ' · ' + esc(r.n) + '</h3></div><button type="button" class="ph-x" data-x aria-label="Chiudi">' + I.x + '</button></header>' +
        '<div class="ph-prev">' + prevs.map(function (u) { return '<img src="' + u + '" alt="">'; }).join('') + (files.length > 8 ? '<span>+' + (files.length - 8) + '</span>' : '') + '</div>' +
        '<p class="ph-l">Cosa mostrano?</p><div class="ph-seg"><button type="button" data-k="res" class="' + (st.k === 'res' ? 'on' : '') + '">Il risultato</button><button type="button" data-k="step" class="' + (st.k === 'step' ? 'on' : '') + '"' + (S.length ? '' : ' disabled') + '>Un passaggio</button></div>' +
        (st.k === 'step' && S.length ? '<select class="ph-sel" id="phStep">' + S.map(function (s, i) { return '<option value="' + i + '"' + (i === st.s ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(stepTitle(s)) + '</option>'; }).join('') + '</select>' : '') +
        '<button type="button" class="ph-go" data-go' + (busy ? ' disabled' : '') + '>' + (busy ? '<span class="ph-spin"></span>' + esc(busy) : 'Carica') + '</button>' +
        '<p class="ph-note">Le foto vengono rimpicciolite e salvate nell’archivio privato del tuo account: le vede solo la brigata.</p></div>';
    }
    paint(); document.body.appendChild(bg); requestAnimationFrame(function () { bg.classList.add('on'); });
    var busy = false;
    bg.addEventListener('change', function (e) { if (e.target.id === 'phStep') st.s = +e.target.value; });
    bg.addEventListener('click', function (e) {
      if (busy) return;
      if (e.target === bg || e.target.closest('[data-x]')) { bg.classList.remove('on'); setTimeout(function () { bg.remove(); prevs.forEach(URL.revokeObjectURL); }, 240); return; }
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k) { st.k = b.dataset.k; return paint(); }
      if (b.hasAttribute('data-go')) {
        busy = true; var done = [], i = 0;
        var nextOne = function () {
          if (i >= files.length) return Promise.resolve();
          var f = files[i++], p = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), k: st.k, at: new Date().toISOString() };
          if (st.k === 'step') p.s = st.s;
          paint('Carico ' + i + ' di ' + files.length + '…');
          return bitmap(f).then(function (bm) { return Promise.all([shrink(bm, 2048, 0.86), shrink(bm, 720, 0.8)]).then(function (o) { try { bm.close && bm.close(); } catch (x) {} return o; }); })
            .then(function (o) { p.w = o[0].w; p.h = o[0].h; return Promise.all([upload(path(r, p, false), o[0].b), upload(path(r, p, true), o[1].b)]).then(function () { put(path(r, p, false), o[0].b); put(path(r, p, true), o[1].b); done.push(p); }); })
            .then(nextOne);
        };
        nextOne().then(function () {
          var ok = patch(r, function (nd) { nd.ph = list(nd).concat(done); if (!nd.phc && st.k === 'res' && done[0]) nd.phc = done[0].id; });
          bg.remove(); prevs.forEach(URL.revokeObjectURL);
          if (ok) { toast(done.length === 1 ? 'Foto aggiunta' : done.length + ' foto aggiunte'); refresh(r); }
        }).catch(function (er) {
          busy = false; paint();
          if (done.length) patch(r, function (nd) { nd.ph = list(nd).concat(done); });
          alert('Foto non caricata: ' + (er && er.message || er));
        });
      }
    });
  }

  /* foto già pronta (dall'import: libro, link, video) → archivio e copertina */
  function addBlob(r, blob, meta) {
    if (!rid(r)) return Promise.reject(new Error('ricetta non ancora salvata online'));
    var p = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), k: 'res', at: new Date().toISOString() };
    if (meta && meta.src) p.src = String(meta.src).slice(0, 40);
    return bitmap(blob).then(function (bm) { return Promise.all([shrink(bm, 2048, 0.86), shrink(bm, 720, 0.8)]); })
      .then(function (o) { p.w = o[0].w; p.h = o[0].h; return Promise.all([upload(path(r, p, false), o[0].b), upload(path(r, p, true), o[1].b)]).then(function () { put(path(r, p, false), o[0].b); put(path(r, p, true), o[1].b); }); })
      .then(function () { var ok = patch(r, function (nd) { nd.ph = list(nd).concat([p]); if (!nd.phc) nd.phc = p.id; }); if (ok) refresh(r); return p; });
  }
  /* ── visore a tutto schermo ── */
  function viewer(r, startId) {
    var L = sorted(r); if (!L.length) return;
    var at = Math.max(0, L.map(function (p) { return p.id; }).indexOf(startId));
    var el = document.createElement('div'); el.id = 'phLbBg'; el.className = 'ph-lb on'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Foto di ' + r.n);
    document.body.appendChild(el); document.body.classList.add('ph-lb-open');
    var S = steps(r);
    function cap(p) { return p.k === 'step' ? 'Passaggio ' + ((p.s || 0) + 1) + (S[p.s] ? ' · ' + stepTitle(S[p.s]) : '') : 'Risultato'; }
    function paint() {
      var p = L[at], isC = cover(r) === p, ed = canEdit();
      el.innerHTML = '<header class="ph-lbh"><button type="button" class="ph-lbb" data-x aria-label="Chiudi">' + I.x + '</button><span>' + esc(cap(p)) + ' · ' + (at + 1) + ' di ' + L.length + '</span>' +
        (ed ? '<button type="button" class="ph-lbb' + (isC ? ' on' : '') + '" data-cover title="Usa come copertina" aria-label="Usa come copertina">' + I.star + '</button><button type="button" class="ph-lbb" data-del aria-label="Elimina la foto">' + I.trash + '</button>' : '') + '</header>' +
        '<div class="ph-stage"><img id="phBig" alt="' + esc(cap(p)) + '"></div>' +
        (L.length > 1 ? '<button type="button" class="ph-nav l" data-d="-1" aria-label="Precedente">' + I.l + '</button><button type="button" class="ph-nav r" data-d="1" aria-label="Successiva">' + I.r + '</button>' : '') +
        '<div class="ph-dots">' + L.map(function (_, i) { return '<i class="' + (i === at ? 'on' : '') + '"></i>'; }).join('') + '</div>';
      var big = $('phBig'); var t = MEM[path(r, p, true)]; if (t) big.src = t; img(big, r, p, false);
    }
    function close() { el.remove(); document.body.classList.remove('ph-lb-open'); document.removeEventListener('keydown', key); }
    function go(d) { at = (at + d + L.length) % L.length; paint(); }
    function key(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); }
    document.addEventListener('keydown', key);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { if (e.target === el || e.target.classList.contains('ph-stage')) close(); return; }
      if (b.hasAttribute('data-x')) return close();
      if (b.dataset.d) return go(+b.dataset.d);
      var p = L[at];
      if (b.hasAttribute('data-cover')) { if (patch(r, function (nd) { nd.phc = p.id; })) { r = (window.XL && XL.rec && XL.rec._id === r._id) ? XL.rec : r; toast('Copertina aggiornata'); paint(); refresh(r); } return; }
      if (b.hasAttribute('data-del')) {
        if (!confirm('Eliminare questa foto?')) return;
        if (patch(r, function (nd) { nd.ph = list(nd).filter(function (x) { return x.id !== p.id; }); if (nd.phc === p.id) delete nd.phc; if (!nd.ph.length) delete nd.ph; })) {
          remove([path(r, p, false), path(r, p, true)]);
          r = (window.XL && XL.rec && XL.rec._id === r._id) ? XL.rec : r; L = sorted(r); refresh(r); toast('Foto eliminata');
          if (!L.length) return close(); at = Math.min(at, L.length - 1); paint();
        }
      }
    });
    var sx = null; el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50 && L.length > 1) go(dx < 0 ? 1 : -1); });
    paint();
  }

  /* ── nella pagina ricetta ── */
  function labCard(r, host) {
    var box = host && host.querySelector('#xlPhotos'); if (!box) return;
    var L = sorted(r), ed = canEdit() && rid(r);
    if (!L.length) {
      box.innerHTML = ed ? '<button type="button" class="ph-empty" data-add>' + I.cam + '<span><b>Aggiungi foto</b><small>Il risultato e i passaggi: aiutano la brigata a rifarla uguale</small></span></button>' : '';
    } else {
      box.innerHTML = '<div class="lb-card ph-card"><div class="lb-h"><span class="lb-eyebrow">Foto</span><span class="lb-count mono">' + L.length + '</span></div>' +
        '<div class="ph-strip">' + L.map(function (p, i) { return '<button type="button" class="ph-th' + (i === 0 ? ' big' : '') + '" data-open="' + esc(p.id) + '"><img alt="">' + (p.k === 'step' ? '<em>P' + ((p.s || 0) + 1) + '</em>' : '') + (i === 0 && cover(r) === p ? '<i class="ph-star">' + I.star + '</i>' : '') + '</button>'; }).join('') +
        (ed ? '<button type="button" class="ph-th add" data-add aria-label="Aggiungi foto">' + I.plus + '</button>' : '') + '</div></div>';
      [].forEach.call(box.querySelectorAll('[data-open] img'), function (im) { var p = L.filter(function (x) { return x.id === im.parentNode.dataset.open; })[0]; if (im.parentNode.classList.contains('big')) sharp(im, r, p); else img(im, r, p, true); });
    }
    box.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-add')) pick(XL.rec || r); else if (b.dataset.open) viewer(XL.rec || r, b.dataset.open); };
    /* foto dentro i passaggi */
    var byStep = {}; list(r).forEach(function (p) { if (p.k === 'step') (byStep[p.s || 0] = byStep[p.s || 0] || []).push(p); });
    [].forEach.call(host.querySelectorAll('.lb-step[data-i]'), function (st) {
      var i = +st.dataset.i, P = byStep[i] || [], inner = st.querySelector('.lb-step-more > div'); if (!inner) return;
      var old = inner.querySelector('.ph-step'); if (old) old.remove();
      if (!P.length && !ed) return;
      var w = document.createElement('div'); w.className = 'ph-step';
      w.innerHTML = P.map(function (p) { return '<button type="button" class="ph-sth" data-open="' + esc(p.id) + '"><img alt=""></button>'; }).join('') + (ed ? '<button type="button" class="ph-sth add" data-add="' + i + '" aria-label="Foto di questo passaggio">' + I.cam + '</button>' : '');
      var acts = inner.querySelector('.lb-step-a'); inner.insertBefore(w, acts || null);
      [].forEach.call(w.querySelectorAll('[data-open] img'), function (im) { var p = P.filter(function (x) { return x.id === im.parentNode.dataset.open; })[0]; img(im, r, p, true); });
      w.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.add != null) pick(XL.rec || r, +b.dataset.add); else viewer(XL.rec || r, b.dataset.open); });
    });
  }
  function refresh(r) {
    try { if (window.XL && XL.viewOpen && XL.rec) labCard(XL.rec, $('xlLab')); } catch (e) {}
    try { [].forEach.call(document.querySelectorAll('#grid .card'), function (c) { if (c._r && (c._r === r || (r._id != null && c._r._id === r._id))) cardCover(c, c._r); }); } catch (e) {}
  }
  (window.XL ? (XL.labHooks = XL.labHooks || []) : []).push(labCard);

  /* ── copertina sulla scheda della collezione ── */
  var IO = window.IntersectionObserver ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { if (!en.isIntersecting) return; var im = en.target; IO.unobserve(im); var c = im.closest('.card'); if (c && c._r && c._pc) sharp(im, c._r, c._pc); });
  }, { rootMargin: '300px' }) : null;
  function cardCover(c, r) {
    c._r = r; var old = c.querySelector('.rc2-cover'); var p = cover(r);
    if (!p || !rid(r)) { if (old) old.remove(); c.classList.remove('has-cover'); return; }
    c._pc = p;
    var d = old || document.createElement('div'); d.className = 'rc2-cover'; d.innerHTML = '<img alt="" loading="lazy">' + (list(r).length > 1 ? '<span>' + list(r).length + '</span>' : '');
    if (!old) c.insertBefore(d, c.firstChild);
    c.classList.add('has-cover');
    var im = d.querySelector('img'); im.style.objectPosition = '50% ' + (p.h > p.w * 1.15 ? '30%' : '50%'); if (IO) IO.observe(im); else sharp(im, r, p);
    d.onclick = function (e) { e.stopPropagation(); viewer(r, p.id); };
  }
  (window.RC2_HOOKS = window.RC2_HOOKS || []).push(cardCover);
  var addItem = { k: 'photo', icon: I.cam, label: 'Aggiungi foto', t: 'Foto della ricetta', s: 'Risultato e passaggi, copertina sulla scheda', show: function (r) { return canEdit() && !!rid(r); }, run: function (r) { pick(r); } };
  (window.RC2_MENU = window.RC2_MENU || []).push(addItem);
  if (window.XL) (XL.moreActs = XL.moreActs || []).push(addItem);
  window.PH = { addBlob: addBlob, pick: pick, viewer: viewer, cover: cover, list: list, load: load, path: path };

  var css = document.createElement('style');
  css.textContent = [
    '.ph-empty{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border-radius:16px;border:1.5px dashed var(--cb);background:none;color:var(--ink);text-align:left;cursor:pointer;font-family:"DM Sans",sans-serif}',
    '.ph-empty>svg{flex-shrink:0;width:38px;height:38px;padding:9px;border-radius:12px;background:color-mix(in srgb,var(--gold2,#B8862F) 12%,var(--card));color:var(--gold3,#8B6408)}.ph-empty span{display:flex;flex-direction:column;gap:2px}.ph-empty b{font-size:.92rem}.ph-empty small{font-size:.78rem;color:var(--smoke)}',
    '.ph-card .ph-strip{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:12px -18px 0;padding:0 18px 2px}.ph-strip::-webkit-scrollbar{display:none}',
    '.ph-th{position:relative;flex-shrink:0;width:92px;height:92px;padding:0;border:0;border-radius:14px;overflow:hidden;background:var(--ctrl,#eee);cursor:pointer}',
    '.ph-th.big{width:150px}.ph-th img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .3s}',
    '.ph-th em{position:absolute;left:6px;bottom:6px;padding:2px 7px;border-radius:8px;background:rgba(0,0,0,.55);color:#fff;font:700 10.5px "DM Sans",sans-serif;font-style:normal}',
    '.ph-star{position:absolute;right:6px;top:6px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.45);color:#F2C14E}.ph-star svg{width:13px;height:13px}',
    '.ph-th.add{display:grid;place-items:center;border:1.5px dashed var(--cb);background:none;color:var(--smoke)}',
    'img.ph-wait{opacity:0}img.ph-err{opacity:.15}',
    '.ph-step{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 4px}.ph-sth{width:64px;height:64px;padding:0;border:0;border-radius:11px;overflow:hidden;background:var(--ctrl,#eee);cursor:pointer}.ph-sth img{width:100%;height:100%;object-fit:cover;display:block}',
    '.ph-sth.add{display:grid;place-items:center;border:1.5px dashed var(--cb);background:none;color:var(--smoke)}.ph-sth.add svg{width:18px;height:18px}',
    '.rc2-cover{position:relative;flex-shrink:0;aspect-ratio:16/10;max-height:230px;margin:10px 10px 2px;border-radius:14px;background:var(--ctrl,#eee);cursor:zoom-in;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}',
    '.rc2-cover::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);background:linear-gradient(180deg,transparent 65%,rgba(0,0,0,.14));pointer-events:none}',
    '.rc2-cover img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .35s,transform .5s}.rc2-cover:hover img{transform:scale(1.03)}',
    '.rc2-cover span{position:absolute;right:10px;bottom:10px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.5);color:#fff;font:600 11.5px "DM Sans",sans-serif}',
    '#app .grid.list .rc2-cover{display:none}',
    '.ph-bg{position:fixed;inset:0;z-index:9400;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,13,10,0);transition:background .24s}.ph-bg.on{background:rgba(15,13,10,.45)}',
    '.ph-sheet{width:100%;max-width:480px;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 20px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.ph-bg.on .ph-sheet{transform:none}@media(min-width:700px){.ph-bg{align-items:center}.ph-sheet{border-radius:24px}}',
    '.ph-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.ph-hd{display:flex;justify-content:space-between;gap:10px}.ph-k{font:700 10.5px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold3,#8B6408)}.ph-hd h3{margin:4px 0 0;font:500 1.3rem/1.2 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.ph-x{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);display:grid;place-items:center;cursor:pointer}',
    '.ph-prev{display:flex;gap:6px;overflow-x:auto;margin:14px 0}.ph-prev img{width:72px;height:72px;object-fit:cover;border-radius:12px;flex-shrink:0}.ph-prev span{display:grid;place-items:center;width:72px;border-radius:12px;background:var(--ctrl);font-weight:700}',
    '.ph-l{margin:0 0 8px;font:600 .9rem "DM Sans",sans-serif}',
    '.ph-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:var(--ctrl,rgba(0,0,0,.05))}.ph-seg button{height:42px;border:0;border-radius:11px;background:none;color:var(--smoke);font:600 .9rem "DM Sans",sans-serif;cursor:pointer}.ph-seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.14)}.ph-seg button:disabled{opacity:.4}',
    '.ph-sel{width:100%;height:46px;margin-top:10px;border-radius:12px;border:1px solid var(--cb);background:var(--card);color:var(--ink);font:500 .92rem "DM Sans",sans-serif;padding:0 10px}',
    '.ph-go{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;margin-top:16px;border:0;border-radius:16px;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));font:600 1rem "DM Sans",sans-serif;cursor:pointer}.ph-go:disabled{opacity:.85}',
    '.ph-spin{width:18px;height:18px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:phSpin .8s linear infinite}@keyframes phSpin{to{transform:rotate(360deg)}}',
    '.ph-note{margin:10px 0 0;font-size:.76rem;line-height:1.45;color:var(--smoke)}',
    'body.ph-lb-open{overflow:hidden}',
    '.ph-lb{position:fixed;inset:0;z-index:9600;display:flex;flex-direction:column;background:#0c0b09;color:#f3f0e8;font-family:"DM Sans",system-ui,sans-serif}',
    '.ph-lbh{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px}.ph-lbh span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.88rem;color:rgba(243,240,232,.8)}',
    '.ph-lbb{width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#f3f0e8;display:grid;place-items:center;cursor:pointer}.ph-lbb.on{color:#F2C14E}',
    '.ph-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 8px}.ph-stage img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}',
    '.ph-nav{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer}.ph-nav.l{left:10px}.ph-nav.r{right:10px}@media(hover:none){.ph-nav{display:none}}',
    '.ph-dots{display:flex;justify-content:center;gap:6px;padding:12px 0 calc(14px + env(safe-area-inset-bottom))}.ph-dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3)}.ph-dots i.on{background:#fff}'
  ].join('\n');
  document.head.appendChild(css);
})();
