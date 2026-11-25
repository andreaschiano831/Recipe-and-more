/* video.js — ricette da un video (reel, TikTok, video dal rullino).
   Tutto il lavoro pesante resta sul telefono: si estrae l'audio (mono 16 kHz) e qualche
   fotogramma; al server vanno solo pezzi di audio da trascrivere e immagini da leggere.
   VID.extract(file, { speech, screen, onStep }) → { speech, screen, duration } */
(function () {
  'use strict';
  var SR = 16000, CHUNK = 40, MAX_SEC = 15 * 60;
  var GROQ_STT = 'https://api.groq.com/openai/v1/audio/transcriptions';

  /* ── audio ── */
  function decodeAudio(file) {
    return file.arrayBuffer().then(function (buf) {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error('Questo browser non legge l’audio dei video');
      var ac = new AC();
      return new Promise(function (res, rej) {
        var p; try { p = ac.decodeAudioData(buf, res, rej); } catch (e) { rej(e); }
        if (p && p.then) p.then(res, rej);
      }).then(function (ab) { try { ac.close(); } catch (e) {} return ab; }, function (e) { try { ac.close(); } catch (x) {} throw new Error('Nel video non trovo un audio leggibile'); });
    });
  }
  function toMono16k(ab) {
    var len = Math.max(1, Math.ceil(ab.duration * SR)), OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    function manual() {
      var ch = ab.numberOfChannels, src = ab.getChannelData(0), n = ab.length, out = new Float32Array(len), r = ab.sampleRate / SR, mix = null;
      if (ch > 1) { mix = new Float32Array(n); for (var c = 0; c < ch; c++) { var d = ab.getChannelData(c); for (var j = 0; j < n; j++) mix[j] += d[j] / ch; } src = mix; }
      for (var i = 0; i < len; i++) { var x = i * r, k = Math.floor(x), f = x - k; out[i] = (src[k] || 0) * (1 - f) + (src[k + 1] || 0) * f; }
      return out;
    }
    if (!OAC) return Promise.resolve(manual());
    return new Promise(function (res) {
      var done = false, ok = function (b) { if (!done) { done = true; res(b.getChannelData(0)); } };
      try {
        var oc = new OAC(1, len, SR), s = oc.createBufferSource(); s.buffer = ab; s.connect(oc.destination); s.start(0);
        oc.oncomplete = function (e) { ok(e.renderedBuffer); };
        var p = oc.startRendering(); if (p && p.then) p.then(ok, function () { if (!done) { done = true; res(manual()); } });
      } catch (e) { done = true; res(manual()); }
    });
  }
  function rms(a, from, to) { var s = 0, n = 0; for (var i = from; i < to; i += 4) { s += a[i] * a[i]; n++; } return n ? Math.sqrt(s / n) : 0; }
  function wav(a, from, to) {
    var n = to - from, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    var peak = 0; for (var j = from; j < to; j++) peak = Math.max(peak, Math.abs(a[j]));
    var g = peak > 0.02 && peak < 0.5 ? 0.9 / peak : 1; /* voce bassa: si alza un po' */
    for (var k = 0; k < n; k++) { var x = Math.max(-1, Math.min(1, a[from + k] * g)); v.setInt16(44 + k * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([b], { type: 'audio/wav' });
  }
  function b64(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:[^,]*,/, '')); }; fr.onerror = rej; fr.readAsDataURL(blob); }); }
  function localKey() { var k = ''; try { k = localStorage.getItem('groq_key') || ''; } catch (e) {} if (!k) { var d = document.getElementById('MDL_GROQ'); if (d) k = (d.value || '').trim(); } return k; }
  function sttOne(blob) {
    return aiCheckServer().then(function (srv) {
      if (srv) return b64(blob).then(function (s) {
        return fetch('/api/import', { method: 'POST', headers: WL.apiH(), body: JSON.stringify({ stt: s }) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); });
      });
      var key = localKey(); if (!key) return { error: 'Inserisci la chiave Groq nel menu Altro → AI' };
      var fd = new FormData(); fd.append('file', blob, 'audio.wav'); fd.append('model', 'whisper-large-v3-turbo'); fd.append('response_format', 'json'); fd.append('temperature', '0');
      fd.append('prompt', 'Ricetta di cucina o pasticceria: ingredienti, grammi, temperature, tempi.');
      return fetch(GROQ_STT, { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) return { error: (d.error && d.error.message) || ('Errore ' + r.status), _status: r.status }; return { text: d.text || '' }; }); });
    });
  }
  /* frasi che Whisper «sente» nella musica o nel silenzio */
  var NOISE = /^(sottotitoli( creati)?( a cura)? (di|dalla).*|amara\.org.*|grazie (a tutti )?per (la visione|l'attenzione|aver guardato).*|iscriviti al canale.*|thank you( for watching)?\.?|thanks for watching.*|\[?(musica|music|applausi|risate)\]?|♪.*)$/i;
  function clean(t) {
    return String(t || '').replace(/([.!?])\s+/g, '$1\n').split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x && !NOISE.test(x.replace(/[«»"]/g, '')); }).join(' ').replace(/\s{2,}/g, ' ').trim();
  }
  function speech(file, step) {
    step('audio', 'Estraggo l’audio…');
    return decodeAudio(file).then(function (ab) {
      if (ab.duration > MAX_SEC) throw new Error('Video troppo lungo per il parlato (massimo 15 minuti)');
      return toMono16k(ab);
    }).then(function (pcm) {
      var per = CHUNK * SR, parts = [];
      for (var i = 0; i < pcm.length; i += per) { var to = Math.min(pcm.length, i + per); if (to - i > SR * 0.6 && rms(pcm, i, to) > 0.004) parts.push([i, to]); }
      if (!parts.length) return '';
      var out = new Array(parts.length), next = 0, done = 0, err = null;
      step('stt', 'Ascolto il parlato' + (parts.length > 1 ? ' · 0 di ' + parts.length : '') + '…');
      function worker() {
        if (next >= parts.length || err) return Promise.resolve();
        var k = next++;
        return sttOne(wav(pcm, parts[k][0], parts[k][1])).then(function (d) {
          if (d.error) { err = d; return; }
          out[k] = clean(d.text); done++;
          if (parts.length > 1) step('stt', 'Ascolto il parlato · ' + done + ' di ' + parts.length + '…');
        }).then(worker);
      }
      return Promise.all([worker(), worker()]).then(function () {
        if (err && !out.some(Boolean)) throw new Error(err.error || 'Trascrizione non riuscita');
        return out.filter(Boolean).join('\n');
      });
    });
  }

  /* ── scritte a schermo: fotogrammi in fila, letti con l'OCR ── */
  function grabFrames(file, n) {
    return new Promise(function (res) {
      var v = document.createElement('video'), url = URL.createObjectURL(file), out = [], times = [], i = 0, fin = false;
      v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous';
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
      document.body.appendChild(v);
      function end() { if (fin) return; fin = true; clearTimeout(to); try { v.pause(); } catch (e) {} v.removeAttribute('src'); try { v.load(); } catch (e) {} v.remove(); URL.revokeObjectURL(url); res({ frames: out, duration: v.duration || 0 }); }
      var to = setTimeout(end, 40000);
      function next() { if (i >= times.length) return end(); try { v.currentTime = times[i]; } catch (e) { end(); } }
      v.onseeked = function () {
        try {
          var w = v.videoWidth, h = v.videoHeight;
          if (w && h) { var s = Math.min(1, 640 / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); out.push(c); }
        } catch (e) {}
        i++; next();
      };
      v.onerror = end;
      v.onloadedmetadata = function () {
        var d = v.duration; if (!isFinite(d) || d <= 0) return end();
        for (var k = 0; k < n; k++) times.push(Math.min(d - 0.05, d * (k + 0.5) / n));
        var go = function () { next(); };
        /* Safari disegna i fotogrammi solo dopo che il video è partito una volta */
        var p; try { p = v.play(); } catch (e) {}
        if (p && p.then) p.then(function () { v.pause(); go(); }, go); else go();
      };
      v.src = url; try { v.load(); } catch (e) {}
    });
  }
  function collage(cs) {
    var hgt = Math.max.apply(null, cs.map(function (c) { return c.height; })), wid = cs.reduce(function (a, c) { return a + c.width; }, 0) + (cs.length - 1) * 8;
    var k = Math.min(1, 1600 / wid), c = document.createElement('canvas'); c.width = Math.round(wid * k); c.height = Math.round(hgt * k);
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    var off = 0; cs.forEach(function (f) { x.drawImage(f, off * k, 0, f.width * k, f.height * k); off += f.width + 8; });
    return c.toDataURL('image/jpeg', 0.82);
  }
  function screen(file, dur, step) {
    var n = Math.max(4, Math.min(12, Math.round((dur || 40) / 7)));
    step('frames', 'Guardo il video…');
    return grabFrames(file, n).then(function (g) {
      if (!g.frames.length) return '';
      var groups = []; for (var i = 0; i < g.frames.length; i += 4) groups.push(g.frames.slice(i, i + 4));
      var seen = {}, lines = [], k = 0, err = '';
      step('ocr', 'Leggo le scritte' + (groups.length > 1 ? ' · 0 di ' + groups.length : '') + '…');
      return groups.reduce(function (p, grp) {
        return p.then(function () {
          return aiOcrRun(collage(grp)).then(function (d) {
            k++; if (groups.length > 1) step('ocr', 'Leggo le scritte · ' + k + ' di ' + groups.length + '…');
            if (d && d.error) { err = d.error; return; }
            String((d && d.source) || '').split('\n').forEach(function (l) {
              l = l.replace(/\s*\|\s*/g, ' · ').trim(); var key = l.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, '');
              if (key.length > 1 && !seen[key] && !/^nessun testo/i.test(l)) { seen[key] = 1; lines.push(l); }
            });
          });
        });
      }, Promise.resolve()).then(function () { if (!lines.length && err) throw new Error(err); return lines.join('\n'); });
    });
  }
  function duration(file) {
    return new Promise(function (res) {
      var v = document.createElement('video'), u = URL.createObjectURL(file), t = setTimeout(function () { done(0); }, 8000);
      function done(d) { clearTimeout(t); URL.revokeObjectURL(u); res(isFinite(d) ? d : 0); }
      v.preload = 'metadata'; v.muted = true; v.onloadedmetadata = function () { done(v.duration); }; v.onerror = function () { done(0); }; v.src = u;
    });
  }
  function poster(file) {
    return grabFrames(file, 1).then(function (g) { return g.frames[0] ? g.frames[0].toDataURL('image/jpeg', 0.7) : ''; });
  }
  function extract(file, o) {
    o = o || {}; var step = o.onStep || function () {}, res = { speech: '', screen: '', duration: 0, warn: [] };
    return duration(file).then(function (d) {
      res.duration = d;
      var p = Promise.resolve();
      if (o.speech !== false) p = p.then(function () { return speech(file, step).then(function (t) { res.speech = t; }, function (e) { res.warn.push(e.message || 'Parlato non disponibile'); }); });
      if (o.screen !== false) p = p.then(function () { return screen(file, d, step).then(function (t) { res.screen = t; }, function (e) { res.warn.push('Scritte: ' + (e.message || 'non lette')); }); });
      return p.then(function () { step('done', ''); return res; });
    });
  }
  /* ── guida: salvare dal tasto Condividi (iPhone: Comando rapido · Android: app installata) ── */
  function importUrl() { var p = location.pathname.replace(/index\.html$/, ''); if (!/\/$/.test(p)) p += '/'; return location.origin + p + '?import='; }
  function guide(tab) {
    var old = document.getElementById('vgBg'); if (old) old.remove();
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    tab = tab || (ios || !/Android/i.test(navigator.userAgent) ? 'ios' : 'and');
    var bg = document.createElement('div'); bg.id = 'vgBg'; bg.className = 'vg-bg';
    var u = importUrl();
    var IOS = [
      ['Copia l’indirizzo', 'Ti servirà tra un attimo.', '<div class="vg-url"><code>' + u.replace(/^https?:\/\//, '') + '</code><button type="button" class="vg-copy" data-copy>Copia</button></div>'],
      ['Crea il comando', 'Apri l’app <b>Comandi</b> → <b>+</b> in alto. Tocca il nome e scrivi <b>Salva nel Ricettario</b>.'],
      ['Aggiungi l’azione «URL»', 'Cerca <b>URL</b>, aggiungila e incolla l’indirizzo copiato. Subito dopo il simbolo <b>=</b> tocca <b>Input comando</b> nella barra sopra la tastiera.'],
      ['Aggiungi «Apri URL»', 'Cerca <b>Apri URL</b> e aggiungila sotto. Fine: sono solo due azioni.'],
      ['Mettilo in Condividi', 'Tocca <b>ⓘ</b> in basso e attiva <b>Mostra nel foglio di condivisione</b>. Tocca <b>Fine</b>.'],
      ['Usalo', 'Su Instagram, TikTok, Safari o YouTube: <b>Condividi</b> → scorri in fondo → <b>Salva nel Ricettario</b>. La prima volta l’iPhone chiede il permesso: tocca <b>Consenti sempre</b>.']
    ];
    var AND = [
      ['Installa l’app', 'In Chrome apri il Ricettario, menu <b>⋮</b> → <b>Installa app</b> (o Aggiungi a schermata Home).'],
      ['Condividi', 'Su Instagram, TikTok o YouTube: <b>Condividi</b> → <b>Ricettario</b>. Si apre «Nuova ricetta» con il link già in lettura.']
    ];
    var list = function (L) { return '<ol class="vg-steps">' + L.map(function (x, i) { return '<li><span class="vg-n">' + (i + 1) + '</span><div><b>' + x[0] + '</b><p>' + x[1] + '</p>' + (x[2] || '') + '</div></li>'; }).join('') + '</ol>'; };
    bg.innerHTML = '<div class="vg-sheet" role="dialog" aria-modal="true" aria-labelledby="vgT"><span class="vg-grab"></span>' +
      '<header class="vg-hd"><h3 id="vgT">Salva dal tasto Condividi</h3><button type="button" class="vg-x" data-x aria-label="Chiudi">×</button></header>' +
      '<p class="vg-lead">Un tocco da Instagram, TikTok o dal browser e la ricetta arriva in «Nuova ricetta». Se nella didascalia non c’è la ricetta, salva il video e usa <b>Video</b>.</p>' +
      '<div class="vg-seg" role="tablist"><button type="button" data-t="ios" class="' + (tab === 'ios' ? 'on' : '') + '">iPhone</button><button type="button" data-t="and" class="' + (tab === 'and' ? 'on' : '') + '">Android</button></div>' +
      (tab === 'ios' ? list(IOS) + '<p class="vg-note">Il comando apre il Ricettario in Safari: se lo usi dall’icona sulla schermata Home, accedi una volta anche in Safari.</p>' : list(AND)) +
      '<button type="button" class="vg-ok" data-x>Ho capito</button></div>';
    bg.addEventListener('click', function (e) {
      if (e.target === bg || e.target.closest('[data-x]')) { bg.classList.remove('on'); setTimeout(function () { bg.remove(); }, 240); return; }
      var tb = e.target.closest('[data-t]'); if (tb) { guide(tb.dataset.t); return; }
      if (e.target.closest('[data-copy]')) {
        var b = e.target.closest('[data-copy]'), ok = function () { b.textContent = 'Copiato ✓'; b.classList.add('done'); };
        try { navigator.clipboard.writeText(u).then(ok, function () { prompt('Copia l’indirizzo', u); }); } catch (x) { prompt('Copia l’indirizzo', u); }
      }
    });
    document.body.appendChild(bg);
    requestAnimationFrame(function () { bg.classList.add('on'); });
  }

  var css = document.createElement('style');
  css.textContent = [
    '.st-vdrop .st-drop-ico{color:var(--gold2,#B8862F)}',
    '.st-vhow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
    '.st-vhow div{display:flex;flex-direction:column;gap:3px;padding:10px 11px;border-radius:13px;background:var(--bg2,rgba(0,0,0,.03));border:1px solid var(--cb)}',
    '.st-vhow b{font:600 .78rem "DM Sans",sans-serif;color:var(--ink)}.st-vhow span{font-size:.72rem;line-height:1.35;color:var(--smoke)}',
    '@media(max-width:520px){.st-vhow{grid-template-columns:1fr}.st-vhow div{flex-direction:row;justify-content:space-between;align-items:baseline;gap:10px}}',
    '.st-vsrc{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-radius:12px;background:color-mix(in srgb,var(--gold2,#B8862F) 10%,var(--card));color:var(--ink2);font-size:.8rem}',
    '.st-vsrc span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.st-vsrc-x{width:28px;height:28px;border:0;border-radius:50%;background:none;color:var(--smoke);font-size:18px;cursor:pointer}',
    '.st-vrow{display:flex;gap:14px;align-items:center}',
    '.st-vthumb{position:relative;flex-shrink:0;width:74px;height:104px;border-radius:14px;overflow:hidden;background:var(--bg2,#eee);display:grid;place-items:center;color:var(--smoke)}',
    '.st-vthumb img{width:100%;height:100%;object-fit:cover}',
    '.st-vdur{position:absolute;right:5px;bottom:5px;padding:2px 6px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;font:600 10.5px "DM Sans",sans-serif}',
    '.st-vmeta{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}',
    '.st-vmeta b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 .95rem "DM Sans",sans-serif;color:var(--ink)}',
    '.st-vmeta small{font-size:.78rem;color:var(--smoke)}',
    '.st-vchg{height:34px!important;padding:0 12px!important;margin-top:4px;font-size:.82rem!important}',
    '.st-vopts{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.st-vopt{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;border:1px solid var(--cb);background:var(--card);color:var(--ink2);text-align:left;cursor:pointer;transition:all .15s}',
    '.st-vopt i{flex-shrink:0;width:20px;height:20px;border-radius:7px;border:1.5px solid var(--cb);display:grid;place-items:center;transition:all .15s}',
    '.st-vopt.on{border-color:color-mix(in srgb,var(--ink) 40%,transparent);background:color-mix(in srgb,var(--ink) 4%,var(--card))}',
    '.st-vopt.on i{background:var(--ink);border-color:var(--ink)}',
    '.st-vopt.on i::after{content:"";width:9px;height:5px;border:2px solid var(--bg);border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}',
    '.st-vopt span{display:flex;flex-direction:column;gap:1px;min-width:0}.st-vopt b{font:600 .86rem "DM Sans",sans-serif;color:var(--ink)}.st-vopt small{font-size:.72rem;color:var(--smoke)}',
    '.st-vrun{width:100%;height:50px}',
    '.st-vgo{align-self:flex-start;margin-top:2px}',
    '.st-vsteps{list-style:none;margin:0;padding:12px 14px;border-radius:16px;background:var(--bg2,rgba(0,0,0,.03));display:flex;flex-direction:column;gap:10px}',
    '.st-vsteps li{display:flex;align-items:center;gap:10px;font-size:.86rem;color:var(--smoke)}',
    '.st-vsteps li i{flex-shrink:0;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--cb)}',
    '.st-vsteps li.cur{color:var(--ink);font-weight:600}',
    '.st-vsteps li.cur i{border-color:var(--ink);border-right-color:transparent;animation:vgSpin .8s linear infinite}',
    '.st-vsteps li.ok{color:var(--ink2)}.st-vsteps li.ok i{background:var(--ok,#3F8F4A);border-color:var(--ok,#3F8F4A);position:relative}',
    '.st-vsteps li.ok i::after{content:"";position:absolute;left:5px;top:5px;width:7px;height:4px;border:2px solid #fff;border-top:0;border-right:0;transform:rotate(-45deg)}',
    '@keyframes vgSpin{to{transform:rotate(360deg)}}',
    '.st-vgot{display:flex;gap:6px;flex-wrap:wrap}.st-vgot span{padding:4px 10px;border-radius:99px;font:600 .74rem "DM Sans",sans-serif;background:color-mix(in srgb,var(--ok,#3F8F4A) 14%,var(--card));color:var(--ok,#3F8F4A)}',
    '.st-share-hint{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:16px;border:1px dashed var(--rim,var(--cb));background:none;color:var(--ink);text-align:left;cursor:pointer}',
    '.st-share-hint>span:first-child{flex-shrink:0;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--gold2,#B8862F) 14%,var(--card));color:var(--gold3,#8B6408)}',
    '.st-share-hint>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}.st-share-hint b{font:600 .88rem "DM Sans",sans-serif}.st-share-hint small{font-size:.74rem;color:var(--smoke)}.st-share-hint i{font-style:normal;color:var(--smoke)}',
    '.vg-bg{position:fixed;inset:0;z-index:9300;background:rgba(15,13,10,0);transition:background .24s;display:flex;align-items:flex-end;justify-content:center}',
    '.vg-bg.on{background:rgba(15,13,10,.42)}',
    '.vg-sheet{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card,#fff);color:var(--ink);border-radius:26px 26px 0 0;padding:8px 22px calc(18px + env(safe-area-inset-bottom));font-family:"DM Sans",system-ui,sans-serif;transform:translateY(102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
    '.vg-bg.on .vg-sheet{transform:none}',
    '@media(min-width:700px){.vg-bg{align-items:center}.vg-sheet{border-radius:24px;transform:translateY(16px);opacity:0;transition:transform .25s,opacity .2s}.vg-bg.on .vg-sheet{opacity:1}}',
    '.vg-grab{display:block;width:40px;height:5px;border-radius:99px;background:var(--cb);margin:2px auto 8px}',
    '.vg-hd{display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.vg-hd h3{margin:0;font:500 1.6rem/1.15 "Cormorant Garamond",Georgia,serif;font-style:italic}',
    '.vg-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--cb);background:none;color:var(--ink2);font-size:20px;cursor:pointer}',
    '.vg-lead{margin:8px 0 14px;font-size:.88rem;line-height:1.5;color:var(--ink2)}',
    '.vg-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:var(--ctrl,rgba(0,0,0,.05));margin-bottom:6px}',
    '.vg-seg button{height:38px;border:0;border-radius:11px;background:none;color:var(--smoke);font:600 .88rem "DM Sans",sans-serif;cursor:pointer}',
    '.vg-seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.14)}',
    '.vg-steps{list-style:none;margin:0;padding:0}',
    '.vg-steps>li{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--cb)}.vg-steps>li:last-child{border-bottom:0}',
    '.vg-n{flex-shrink:0;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--ink);color:var(--bg);font:700 .8rem "DM Sans",sans-serif}',
    '.vg-steps>li>div{flex:1;min-width:0}.vg-steps>li b{font-weight:600}.vg-steps>li>div>b{font-size:.95rem}',
    '.vg-steps p{margin:3px 0 0;font-size:.85rem;line-height:1.5;color:var(--ink2)}',
    '.vg-mini{margin:6px 0 0;padding-left:18px;font-size:.84rem;line-height:1.6;color:var(--ink2)}',
    '.vg-url{display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 6px 6px 12px;border-radius:12px;background:var(--ctrl,rgba(0,0,0,.05))}',
    '.vg-url code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 .8rem "JetBrains Mono",ui-monospace,monospace;color:var(--ink)}',
    '.vg-copy{flex-shrink:0;height:34px;padding:0 14px;border:0;border-radius:10px;background:var(--ink);color:var(--bg);font:600 .82rem "DM Sans",sans-serif;cursor:pointer}.vg-copy.done{background:var(--ok,#3F8F4A);color:#fff}',
    '.vg-note{margin:4px 0 12px;font-size:.78rem;line-height:1.45;color:var(--smoke)}',
    '.vg-ok{width:100%;height:50px;margin-top:6px;border:0;border-radius:16px;background:var(--btn-bg,var(--ink));color:var(--btn-ink,var(--bg));font:600 1rem "DM Sans",sans-serif;cursor:pointer}',
    '@media(prefers-reduced-motion:reduce){.vg-sheet,.vg-bg,.st-vsteps li.cur i{transition:none!important;animation:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  window.VID = { extract: extract, duration: duration, poster: poster, guide: guide, importUrl: importUrl, _clean: clean };
})();
