/* ════════════════════════════════════════════════════════════════════
   MODALITÀ CUCINA A MANI LIBERE
   · schermo intero scuro, testo grande, leggibile a un metro di distanza
   · Pesata (un ingrediente alla volta) e Passaggi (con le quantità dentro)
   · comandi vocali: «avanti», «indietro», «ripeti», «timer 5 minuti»,
     «ferma», «quanto manca», «pesata», «passaggi», «esci»
   · lettura ad alta voce dei passaggi, timer condivisi con il Laboratorio,
     spunte e passaggio raggiunto condivisi, schermo sempre acceso
   Sostituisce openCucina / closeCucina dell'app (stessa firma).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var K = null;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var TTS = window.speechSynthesis;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtQ(v) { if (v == null || isNaN(v)) return 'q.b.'; var r = Math.round(v * 100) / 100; if (Math.abs(r) >= 100) r = Math.round(r); else if (Math.abs(r) >= 10) r = Math.round(r * 10) / 10; return String(r).replace('.', ','); }
  function fmtX(d) { return '×' + String(Math.round(d * 100) / 100).replace('.', ','); }
  function qty(g) { return g[1] == null ? 'q.b.' : fmtQ(g[1] * K.dose) + ' ' + (g[2] || 'g'); }
  function qtySpoken(g) { if (g[1] == null) return 'quanto basta'; var u = (g[2] || 'g').toLowerCase(); var w = { g: 'grammi', gr: 'grammi', kg: 'chili', ml: 'millilitri', l: 'litri', pz: 'pezzi', n: '' }[u]; return fmtQ(g[1] * K.dose) + ' ' + (w == null ? u : w); }
  function minutesOf(s) { try { return ckMinutes(s) || 0; } catch (e) { return 0; } }
  function tempOf(s) { try { return ckTemp(s) || ''; } catch (e) { return ''; } }
  function key(r) { return String(r._id || r.n); }
  function T() { return window.XL && XL.timers; }
  function vib(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

  /* ── stato condiviso con il Laboratorio (se c'è) ── */
  function state(r) {
    if (window.XL && XL.bench) return XL.bench(r);
    var mem = { w: {}, sd: {} }; return { w: mem.w, sd: mem.sd, save: function () {} };
  }
  function firstOpen(map, n) { for (var i = 0; i < n; i++) if (!map[i]) return i; return -1; }

  /* ══════════ APERTURA / CHIUSURA ══════════ */
  function open(rec, d) {
    if (!rec) return;
    var dd = (typeof d === 'number' && d > 0) ? d : (typeof cardDoseOf === 'function' ? cardDoseOf(rec) : 1);
    var S = ckSteps(rec.p), st = state(rec), ings = rec.i || [];
    K = { rec: rec, dose: dd || 1, steps: S.steps, info: S.info, st: st, mode: 'fasi', step: 0, ing: 0, lock: null, listen: false, rec2: null, speakOn: false, heard: '' };
    var allW = ings.length && firstOpen(st.w, ings.length) === -1;
    K.mode = (!ings.length || allW || firstOpen(st.sd, K.steps.length) > 0) ? 'fasi' : 'pesa';
    K.step = Math.max(0, firstOpen(st.sd, K.steps.length)); if (firstOpen(st.sd, K.steps.length) === -1 && K.steps.length) K.step = K.steps.length; // tutto fatto
    K.ing = Math.max(0, firstOpen(st.w, ings.length));
    var el = $('kc'); if (!el) { el = document.createElement('div'); el.id = 'kc'; el.className = 'kc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Modalità cucina'); document.body.appendChild(el); }
    el.classList.add('on'); document.body.classList.add('kc-open', 'ck-open');
    wake();
    document.addEventListener('keydown', onKey);
    render();
    if (T()) T().render();
  }
  function close() {
    if (!K) return;
    waveOff(); stopListen(); try { TTS && TTS.cancel(); } catch (e) {}
    try { K.lock && K.lock.release(); } catch (e) {}
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    K = null;
    var el = $('kc'); if (el) { el.classList.remove('on'); el.innerHTML = ''; }
    document.body.classList.remove('kc-open', 'ck-open');
    document.removeEventListener('keydown', onKey);
    try { window.XL && XL.refreshLab && XL.refreshLab(); } catch (e) {}
    if (T()) T().render();
  }
  function wake() { try { if (K && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { if (K) K.lock = l; else l.release(); }).catch(function () {}); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { if (K && document.visibilityState === 'visible') { wake(); if (K.listen) startListen(); } });

  /* ══════════ AZIONI ══════════ */
  function next() {
    if (!K) return;
    var ings = K.rec.i || [];
    if (K.mode === 'pesa') {
      if (!ings.length) { setMode('fasi'); return; }
      K.st.w[K.ing] = true; K.st.save(); vib(12);
      var nx = firstOpen(K.st.w, ings.length);
      if (nx === -1) { say('Mise en place completa.'); setMode('fasi'); return; }
      K.ing = nx; render(); sayIng();
    } else {
      if (!K.steps.length || K.step >= K.steps.length) return;
      K.st.sd[K.step] = true; K.st.save(); vib(12);
      var n2 = firstOpen(K.st.sd, K.steps.length);
      K.step = n2 === -1 ? K.steps.length : n2;
      render();
      if (K.step >= K.steps.length) say('Produzione completata. Buon lavoro.'); else sayStep();
    }
  }
  function prev() {
    if (!K) return;
    var ings = K.rec.i || [];
    if (K.mode === 'pesa') {
      if (K.ing > 0) { K.ing--; delete K.st.w[K.ing]; K.st.save(); render(); sayIng(); }
    } else {
      if (K.step > 0) { K.step--; delete K.st.sd[K.step]; K.st.save(); render(); sayStep(); }
      else if (ings.length) { setMode('pesa'); }
    }
  }
  function goStep(i) { if (!K) return; for (var k = 0; k < K.steps.length; k++) { if (k < i) K.st.sd[k] = true; else delete K.st.sd[k]; } K.st.save(); K.step = i; render(); sayStep(); }
  function setMode(m) { if (!K) return; K.mode = m; render(); if (m === 'fasi') sayStep(); else sayIng(); }
  function setDose(d) { if (!K) return; K.dose = Math.max(0.25, Math.min(20, Math.round(d * 100) / 100)); render(); }
  function startTimer(min, label) {
    if (!K || !T()) return;
    var i = K.step, s = K.steps[i] || '', fromStep = !min;
    if (!min) min = minutesOf(s);
    if (!min) { say('In questo passaggio non c\'è un tempo. Di\' per esempio: timer cinque minuti.'); return; }
    var title = label || (fromStep ? (window.XL && XL.stepTitle ? XL.stepTitle(s) : s.slice(0, 50)) : 'Timer ' + spokenMin(min)) || 'Timer';
    T().add({ label: title, sub: K.rec.n, min: min, key: fromStep ? key(K.rec) + ':' + i : '' });
    say('Timer di ' + spokenMin(min) + ' avviato.');
  }
  function spokenMin(m) { if (m >= 60) { var h = Math.floor(m / 60), r = Math.round(m % 60); return (h === 1 ? 'un\'ora' : h + ' ore') + (r ? ' e ' + r + ' minuti' : ''); } return m === 1 ? 'un minuto' : String(m).replace('.', ',') + ' minuti'; }
  function howLong() {
    var L = T() ? T().list() : []; if (!L.length) { say('Nessun timer attivo.'); return; }
    var parts = L.slice(0, 3).map(function (t) { if (t.rang) return t.label + ': finito'; var s = Math.ceil(T().left(t)), m = Math.floor(s / 60), r = s % 60; return t.label + ': ' + (m ? m + (m === 1 ? ' minuto' : ' minuti') : '') + (m && r ? ' e ' : '') + (r || !m ? r + ' secondi' : ''); });
    say(parts.join('. '));
  }

  /* ══════════ VOCE: lettura ══════════ */
  var voice = null;
  function pickVoice() { if (!TTS) return null; var v = TTS.getVoices().filter(function (x) { return /^it/i.test(x.lang); }); return v.filter(function (x) { return /google|alice|federica|luca|elsa/i.test(x.name); })[0] || v[0] || null; }
  if (TTS) { voice = pickVoice(); TTS.onvoiceschanged = function () { voice = pickVoice(); }; }
  function say(text, force) {
    if (!K || !TTS || !(K.speakOn || K.listen || force)) return;
    try {
      TTS.cancel();
      var u = new SpeechSynthesisUtterance(String(text).replace(/°C/g, ' gradi').replace(/×/g, 'per ').replace(/\s+/g, ' '));
      u.lang = 'it-IT'; if (voice) u.voice = voice; u.rate = 1.02;
      var wasListening = K.listen;
      if (wasListening) pauseRec();
      u.onend = u.onerror = function () { if (K && wasListening && K.listen) resumeRec(); };
      TTS.speak(u);
    } catch (e) {}
  }
  function stepPlain(s) { return String(s); }
  function sayStep() { if (!K || K.mode !== 'fasi') return; if (K.step >= K.steps.length) return; say('Passaggio ' + (K.step + 1) + '. ' + stepPlain(K.steps[K.step])); }
  function sayIng() { if (!K || K.mode !== 'pesa') return; var g = (K.rec.i || [])[K.ing]; if (g) say(g[0] + ', ' + qtySpoken(g)); }

  /* ══════════ VOCE: comandi ══════════ */
  var NUM = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20, venticinque: 25, trenta: 30, quaranta: 40, quarantacinque: 45, cinquanta: 50, sessanta: 60, novanta: 90 };
  function parseMinutes(t) {
    if (/mezz'?\s?ora|mezza ora/.test(t)) return 30;
    if (/un quarto d'?\s?ora/.test(t)) return 15;
    if (/\bun'?\s?ora\b/.test(t) && !/\d/.test(t)) return 60;
    var m = /(\d+(?:[.,]\d+)?)\s*(ore|ora|h)\b/.exec(t); if (m) return parseFloat(m[1].replace(',', '.')) * 60;
    m = /(\d+(?:[.,]\d+)?)\s*(secondi|secondo|sec)\b/.exec(t); if (m) return parseFloat(m[1].replace(',', '.')) / 60;
    m = /(\d+(?:[.,]\d+)?)/.exec(t); if (m) return parseFloat(m[1].replace(',', '.'));
    var words = t.split(/[\s']+/);
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (NUM[w] != null) { var v = NUM[w]; if (words[i + 1] && /^or[ae]$/.test(words[i + 1])) return v * 60; if (words[i + 1] && /^second/.test(words[i + 1])) return v / 60; return v; }
      var mm = /^(venti|trenta|quaranta|cinquanta)(uno|due|tre|quattro|cinque|sei|sette|otto|nove)$/.exec(w);
      if (mm) return NUM[mm[1]] + NUM[mm[2]];
    }
    return 0;
  }
  function command(raw) {
    var t = String(raw || '').toLowerCase().trim(); if (!t || !K) return false;
    K.heard = raw; showHeard(raw, true);
    if (/\b(esci|chiudi|termina modalit)/.test(t)) { close(); return true; }
    if (/quanto manca|quanto tempo/.test(t)) { howLong(); return true; }
    /* «quanto burro?», «quanta panna» → quantità di un ingrediente alla dose attuale */
    var qm = /\bquant[oaie]\s+(?:(?:di|del|della|dello|dei|degli|delle)\s+)?(.+)$/.exec(t);
    if (qm) { var g0 = findIng(qm[1]); if (g0) { say(g0[0] + ': ' + qtySpoken(g0), true); return true; } }
    var pm = /\bpassaggio\s+(\d+|\w+)\b/.exec(t);
    if (pm) { var pn = +pm[1] || NUM[pm[1]] || 0; if (pn >= 1 && pn <= K.steps.length) { if (K.mode !== 'fasi') K.mode = 'fasi'; goStep(pn - 1); return true; } }
    if (/\btemperatura\b|\bquanti gradi\b/.test(t)) { var tp = tempOf(K.steps[K.step] || ''); say(tp ? 'Temperatura: ' + tp.replace(/\s*°\s*C?/i, ' gradi') : 'In questo passaggio non c\'è una temperatura.', true); return true; }
    if (/\b(raddoppia|doppia dose|dose doppia)\b/.test(t)) { setDose(K.dose * 2); say('Dose per ' + String(Math.round(K.dose * 100) / 100).replace('.', ' virgola '), true); return true; }
    if (/\b(dimezza|metà dose|mezza dose|meta dose)\b/.test(t)) { setDose(K.dose / 2); say('Dose per ' + String(Math.round(K.dose * 100) / 100).replace('.', ' virgola '), true); return true; }
    var dm = /\bdose\s+(?:per\s+)?(\d+(?:[.,]\d+)?|\w+)\b/.exec(t);
    if (dm) { var dv = parseFloat(String(dm[1]).replace(',', '.')) || NUM[dm[1]] || 0; if (dv > 0) { setDose(dv); say('Dose per ' + String(dv).replace('.', ' virgola '), true); return true; } }
    if (/\b(ferma|stop|basta|zitto|silenzio)\b/.test(t)) {
      var n = T() ? T().ack() : 0; try { TTS && TTS.cancel(); } catch (e) {}
      if (!n && /timer|pausa/.test(t) && T()) { T().pauseAll(); say('Timer in pausa.'); }
      return true;
    }
    if (/\b(timer|sveglia|cronometro|conta)\b/.test(t)) {
      var tail = t.replace(/.*?\b(timer|sveglia|cronometro|conta)\b/, ''), m = parseMinutes(tail);
      /* «timer forno 12 minuti» → timer chiamato «forno» */
      var lb = tail.replace(/(\d+(?:[.,]\d+)?|mezz'?\s?ora|un quarto d'?\s?ora|\bun'?\s?ora\b)/g, ' ').replace(/\b(di|da|per|a|minuti|minuto|min|ore|ora|secondi|secondo|sec)\b/g, ' ').split(/\s+/).filter(function (w) { return w && NUM[w] == null && !/^(venti|trenta|quaranta|cinquanta)\w*$/.test(w); }).join(' ').trim();
      startTimer(m || 0, lb ? lb.charAt(0).toUpperCase() + lb.slice(1) : ''); return true;
    }
    if (/\b(ripeti|rileggi|leggi|cosa devo fare|come)\b/.test(t)) { if (K.mode === 'fasi') sayStep(); else sayIng(); return true; }
    if (/\b(pesata|ingredienti|mise en place|pesare)\b/.test(t)) { setMode('pesa'); return true; }
    if (/\b(passaggi|procedimento|fasi|ricetta)\b/.test(t)) { setMode('fasi'); return true; }
    if (/\b(indietro|precedente|torna|prima)\b/.test(t)) { prev(); return true; }
    if (/\b(avanti|prossim\w*|successiv\w*|fatto|fatta|ok|okay|vai|continua|pesato|next)\b/.test(t)) { next(); return true; }
    showHeard(raw, false);
    return false;
  }
  function findIng(q) {
    var n = function (x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };
    q = n(q).replace(/\b(serve|servono|ci vuole|ci vogliono|ne serve|ne servono|devo mettere|metto)\b/g, '').trim(); if (!q) return null;
    var L = K.rec.i || [], best = null, bs = 0;
    L.forEach(function (g) {
      var k = n(g[0]), sc = 0;
      if (k === q) sc = 100; else if (k.indexOf(q) === 0) sc = 80; else if ((' ' + k + ' ').indexOf(' ' + q + ' ') >= 0) sc = 70;
      else { var w = q.split(' ').filter(function (x) { return x.length > 2; }), hit = w.filter(function (x) { return k.indexOf(x) >= 0 || k.indexOf(x.slice(0, -1)) >= 0; }).length; if (hit && w.length) sc = 40 * hit / w.length; }
      if (sc > bs) { bs = sc; best = g; }
    });
    return bs >= 30 ? best : null;
  }
  var paused = false;
  function startListen() {
    if (!SR || !K) return;
    stopRecOnly();
    var r = new SR(); r.lang = 'it-IT'; r.continuous = true; r.interimResults = false; r.maxAlternatives = 3;
    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        var alts = e.results[i], done = false;
        for (var a = 0; a < alts.length && !done; a++) done = command(alts[a].transcript);
      }
    };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { K && (K.listen = false); micUi('Microfono non consentito: abilitalo nelle impostazioni del browser.'); }
    };
    r.onend = function () { if (K && K.listen && !paused && K.rec2 === r) { setTimeout(function () { if (K && K.listen && !paused) startListen(); }, 250); } };
    K.rec2 = r;
    try { r.start(); } catch (e) {}
    micUi();
  }
  function stopRecOnly() { if (K && K.rec2) { var r = K.rec2; K.rec2 = null; try { r.onend = null; r.abort(); } catch (e) {} } }
  function pauseRec() { paused = true; stopRecOnly(); }
  function resumeRec() { paused = false; if (K && K.listen) startListen(); }
  function stopListen() { if (!K) return; K.listen = false; paused = false; stopRecOnly(); micUi(); }
  function toggleListen() {
    if (!K) return;
    if (!SR) { alert('Questo browser non riconosce la voce. Usa Chrome (Android, Windows, Mac) o Safari aggiornato su iPhone.'); return; }
    K.listen = !K.listen;
    if (K.listen) { startListen(); say('Ti ascolto. Di\' avanti, indietro, ripeti, timer, oppure quanto burro.', true); } else stopListen();
  }
  function micUi(msg) {
    var b = $('kcMic'); if (b) { b.classList.toggle('on', !!(K && K.listen)); b.setAttribute('aria-pressed', String(!!(K && K.listen))); }
    var bar = $('kcVoice'); if (!bar || !K) return;
    bar.hidden = !K.listen && !msg;
    var s = bar.querySelector('span'); if (s) s.textContent = msg || 'In ascolto — «avanti», «indietro», «ripeti», «timer forno 12 minuti», «quanto burro?», «passaggio 3», «temperatura», «raddoppia», «quanto manca», «ferma»';
  }
  var heardT = null;
  function showHeard(t, ok) { var e = $('kcHeard'); if (!e) return; e.textContent = (ok ? '✓ ' : '? ') + '«' + t.trim() + '»'; e.className = 'kc-heard ' + (ok ? 'ok' : 'no'); clearTimeout(heardT); heardT = setTimeout(function () { if (e) e.textContent = ''; }, 2600); }

  /* ══════════ GESTO SENZA TOCCARE: la mano davanti alla fotocamera ══════════
     Il video resta sul telefono: si confrontano fotogrammi piccolissimi (40×30, in grigi);
     un movimento ampio vale come un passaggio: verso sinistra avanti, verso destra indietro. */
  var GW = null;
  function waveOn() {
    if (!K) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Questo browser non può usare la fotocamera.'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 120 }, frameRate: { ideal: 15 } }, audio: false }).then(function (stream) {
      if (!K) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = stream;
      v.className = 'kc-cam'; document.body.appendChild(v);
      try { var pp = v.play(); if (pp && pp.catch) pp.catch(function () {}); } catch (e) {}
      var c = document.createElement('canvas'); c.width = 40; c.height = 30; var x = c.getContext('2d', { willReadFrequently: true });
      GW = { stream: stream, v: v, c: c, x: x, prev: null, burst: [], cool: 0, t: null, calm: 0 };
      GW.t = setInterval(waveTick, 90); waveUi(); say('Gesto attivo: passa la mano davanti allo schermo per andare avanti.', true);
    }).catch(function () { alert('Fotocamera non consentita: abilitala nelle impostazioni del browser per usare il gesto.'); waveUi(); });
  }
  function waveOff() { if (!GW) return; clearInterval(GW.t); try { GW.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} try { GW.v.remove(); } catch (e) {} GW = null; waveUi(); }
  function waveTick() {
    if (!GW || !K) return waveOff();
    if (GW.v.readyState < 2) return;
    try { GW.x.drawImage(GW.v, 0, 0, 40, 30); } catch (e) { return; }
    var d = GW.x.getImageData(0, 0, 40, 30).data, g = new Uint8Array(1200);
    for (var i = 0, j = 0; i < 1200; i++, j += 4) g[i] = (d[j] * 3 + d[j + 1] * 6 + d[j + 2]) / 10;
    var P = GW.prev; GW.prev = g; if (!P) return;
    var n = 0, sx = 0;
    for (var k = 0; k < 1200; k++) if (Math.abs(g[k] - P[k]) > 28) { n++; sx += k % 40; }
    var frac = n / 1200, now = Date.now();
    if (now < GW.cool) { GW.burst = []; return; }
    if (frac > 0.12) { GW.burst.push(sx / n / 39); GW.calm = 0; if (GW.burst.length > 14) GW.burst.shift(); return; }
    if (GW.burst.length && ++GW.calm >= 2) {
      var B = GW.burst; GW.burst = []; GW.calm = 0;
      if (B.length < 2 || B.length > 12) return;
      var dx = B[B.length - 1] - B[0];
      /* la fotocamera frontale non è specchiata: per chi guarda, verso sinistra = dx positivo */
      var dir = dx < -0.18 ? 'indietro' : 'avanti';
      GW.cool = now + 1300; vib(18);
      showHeard('👋 ' + dir, true);
      if (dir === 'avanti') next(); else prev();
    }
  }
  function waveUi() {
    var b = $('kcWave'); if (b) { b.classList.toggle('on', !!GW); b.setAttribute('aria-pressed', String(!!GW)); }
    var bar = $('kcVoice'); if (!bar || !K || K.listen) return;
    bar.hidden = !GW; var s = bar.querySelector('span'); if (s && GW) s.textContent = 'Gesto attivo — passa la mano davanti allo schermo: verso sinistra avanti, verso destra indietro';
  }
  function toggleWave() { if (GW) waveOff(); else waveOn(); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible' && GW) waveOff(); });

  /* ══════════ TASTIERA E GESTI ══════════ */
  function onKey(e) {
    if (!K) return; var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); prev(); }
    else if (e.key === 'm' || e.key === 'M') toggleListen();
    else if (e.key === 't' || e.key === 'T') startTimer();
  }

  /* ══════════ DISEGNO ══════════ */
  var ICON = {
    x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    wave: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.5 7.5-6.5 7.5-2.5 0-4-1.2-5.3-3.1L3.3 14.6a1.5 1.5 0 0 1 2.4-1.7L8 15"/><path d="M19.5 3.5c.9.8 1.5 2 1.5 3.3M3 5.5C3.6 4.3 4.6 3.4 5.8 3"/></svg>',
    spk: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/></svg>',
    therm: '<svg viewBox="0 0 24 24"><path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0z"/></svg>'
  };
  function render() {
    var el = $('kc'); if (!el || !K) return;
    var r = K.rec, ings = r.i || [], n = K.steps.length, nw = 0, ns = 0;
    for (var a = 0; a < ings.length; a++) if (K.st.w[a]) nw++;
    for (var b = 0; b < n; b++) if (K.st.sd[b]) ns++;
    var body = '';
    if (K.mode === 'pesa') {
      var g = ings[K.ing];
      if (!ings.length) body = '<div class="kc-empty"><p>Questa ricetta non ha ingredienti.</p></div>';
      else body =
        '<div class="kc-eyebrow">Ingrediente ' + (K.ing + 1) + ' di ' + ings.length + '</div>' +
        '<div class="kc-weigh' + (K.st.w[K.ing] ? ' done' : '') + '"><div class="kc-qty mono">' + esc(qty(g)) + '</div><div class="kc-ingname">' + esc(g[0]) + '</div></div>' +
        '<div class="kc-list">' + ings.map(function (x, i) { return '<button type="button" class="kc-li' + (K.st.w[i] ? ' done' : '') + (i === K.ing ? ' cur' : '') + '" data-ing="' + i + '"><i></i><span>' + esc(x[0]) + '</span><b class="mono">' + esc(qty(x)) + '</b></button>'; }).join('') + '</div>';
    } else if (!n) {
      body = '<div class="kc-empty"><p>Nessun procedimento scritto per questa ricetta.</p></div>';
    } else if (K.step >= n) {
      body = '<div class="kc-fin"><div class="kc-fin-c">' + ICON_CHECK + '</div><h2>Produzione completata</h2><p>' + esc(r.n) + ' · ' + fmtX(K.dose) + '</p><div class="kc-fin-a"><button type="button" class="kc-b ghost" id="kcRestart">Ricomincia</button><button type="button" class="kc-b gold" id="kcClose2">Chiudi</button></div></div>';
    } else {
      var s = K.steps[K.step], sh = window.XL && XL.stepHtml ? XL.stepHtml(s, ings, K.dose) : { html: esc(s), used: [] };
      var tp = tempOf(s), mn = minutesOf(s), tkey = key(r) + ':' + K.step;
      var running = T() && T().list().filter(function (t) { return t.key === tkey; })[0];
      body =
        '<div class="kc-eyebrow">Passaggio ' + (K.step + 1) + ' di ' + n + (tp ? '<span class="kc-chip t">' + ICON.therm + tp + '</span>' : '') + (mn ? '<span class="kc-chip">' + ICON.clock + spokenMin(mn) + '</span>' : '') + '</div>' +
        '<p class="kc-step" id="kcStep">' + sh.html + '</p>' +
        (sh.used.length ? '<div class="kc-uses">' + sh.used.map(function (j) { return '<span class="' + (K.st.w[j] ? 'ok' : '') + '">' + esc(ings[j][0]) + ' <b class="mono">' + esc(qty(ings[j])) + '</b></span>'; }).join('') + '</div>' : '') +
        (mn ? '<button type="button" class="kc-b timer' + (running ? ' run' : '') + '" id="kcTimerBtn">' + ICON.clock + '<span>' + (running ? 'Timer in corso' : 'Avvia timer ' + spokenMin(mn)) + '</span></button>' : '') +
        '<div class="kc-dots">' + K.steps.map(function (_, i) { return '<button type="button" data-step="' + i + '" class="' + (K.st.sd[i] ? 'past' : '') + (i === K.step ? ' on' : '') + '" aria-label="Passaggio ' + (i + 1) + '"></button>'; }).join('') + '</div>';
    }
    var last = K.mode === 'fasi' && K.step === n - 1;
    el.innerHTML =
      '<header class="kc-top">' +
        '<button type="button" class="kc-ib" id="kcX" aria-label="Esci dalla modalità cucina">' + ICON.x + '</button>' +
        '<div class="kc-tt"><span>Modalità cucina</span><b>' + esc(r.n) + '</b></div>' +
        '<div class="kc-dose"><button type="button" data-dd="-1" aria-label="Dose minore">−</button><span class="mono">' + fmtX(K.dose) + '</span><button type="button" data-dd="1" aria-label="Dose maggiore">+</button></div>' +
        (TTS ? '<button type="button" class="kc-ib' + (K.speakOn ? ' on' : '') + '" id="kcSpk" aria-pressed="' + K.speakOn + '" title="Leggi ad alta voce">' + ICON.spk + '</button>' : '') +
        '<button type="button" class="kc-ib mic" id="kcMic" aria-pressed="false" title="Comandi vocali (M)">' + ICON.mic + '</button>' +
        (navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? '<button type="button" class="kc-ib wave' + (GW ? ' on' : '') + '" id="kcWave" aria-pressed="' + !!GW + '" title="Gesto senza toccare: passa la mano davanti allo schermo">' + ICON.wave + '</button>' : '') +
        (document.documentElement.requestFullscreen ? '<button type="button" class="kc-ib kc-fs" id="kcFs" title="Schermo intero">' + ICON.full + '</button>' : '') +
      '</header>' +
      '<div class="kc-voice" id="kcVoice" hidden><i></i><span></span><em class="kc-heard" id="kcHeard"></em></div>' +
      '<nav class="kc-seg"><button type="button" data-m="pesa" class="' + (K.mode === 'pesa' ? 'on' : '') + '">Pesata <small class="mono">' + nw + '/' + ings.length + '</small></button><button type="button" data-m="fasi" class="' + (K.mode === 'fasi' ? 'on' : '') + '">Passaggi <small class="mono">' + ns + '/' + n + '</small></button></nav>' +
      '<div class="kc-prog"><i style="width:' + (K.mode === 'pesa' ? (ings.length ? nw / ings.length * 100 : 0) : (n ? ns / n * 100 : 0)) + '%"></i></div>' +
      '<main class="kc-body" id="kcBody"><div class="kc-in">' + body + '</div></main>' +
      '<div class="kc-timers" id="kcTimers" hidden></div>' +
      '<footer class="kc-nav">' +
        '<button type="button" class="kc-b ghost big" id="kcPrev"' + ((K.mode === 'pesa' ? K.ing === 0 : (K.step === 0 && !ings.length)) ? ' disabled' : '') + '>← Indietro</button>' +
        '<button type="button" class="kc-b gold big" id="kcNext"' + ((K.mode === 'fasi' && K.step >= n) || (K.mode === 'pesa' && !ings.length) ? ' disabled' : '') + '>' + (K.mode === 'pesa' ? 'Pesato →' : last ? 'Fatto ✓' : 'Fatto, avanti →') + '</button>' +
      '</footer>';
    /* eventi */
    $('kcX').onclick = close;
    $('kcPrev').onclick = prev; $('kcNext').onclick = next;
    $('kcMic').onclick = toggleListen;
    var wv = $('kcWave'); if (wv) wv.onclick = toggleWave;
    var sp = $('kcSpk'); if (sp) sp.onclick = function () { K.speakOn = !K.speakOn; render(); if (K.speakOn) { if (K.mode === 'fasi') sayStep(); else sayIng(); } else try { TTS.cancel(); } catch (e) {} };
    var fs = $('kcFs'); if (fs) fs.onclick = function () { try { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen(); } catch (e) {} };
    [].forEach.call(el.querySelectorAll('.kc-dose button'), function (bt) { bt.onclick = function () { var d = K.dose, up = +bt.dataset.dd > 0; setDose(up ? d + (d < 1 ? 0.25 : 0.5) : d - (d <= 1 ? 0.25 : 0.5)); }; });
    [].forEach.call(el.querySelectorAll('.kc-seg button'), function (bt) { bt.onclick = function () { setMode(bt.dataset.m); }; });
    [].forEach.call(el.querySelectorAll('[data-ing]'), function (bt) { bt.onclick = function () { var i = +bt.dataset.ing; if (i === K.ing) { if (K.st.w[i]) { delete K.st.w[i]; K.st.save(); render(); } else next(); } else { K.ing = i; render(); sayIng(); } }; });
    [].forEach.call(el.querySelectorAll('[data-step]'), function (bt) { bt.onclick = function () { goStep(+bt.dataset.step); }; });
    var tb = $('kcTimerBtn'); if (tb) tb.onclick = function () { startTimer(); render(); };
    var rs = $('kcRestart'); if (rs) rs.onclick = function () { for (var k in K.st.sd) delete K.st.sd[k]; K.st.save(); K.step = 0; render(); };
    var c2 = $('kcClose2'); if (c2) c2.onclick = close;
    /* scorrimento col dito */
    var m = $('kcBody'), sx = 0, sy = 0;
    m.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    m.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else prev(); } });
    if (!calm) { var inn = el.querySelector('.kc-in'); inn.classList.remove('kc-anim'); void inn.offsetWidth; inn.classList.add('kc-anim'); }
    micUi();
    if (T()) T().render();
  }
  var ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ══════════ AGGANCIO ALL'APP ══════════ */
  window.openCucina = open;
  window.closeCucina = close;
  window.openCucinaFromPanel = function () { try { _mgReturn = null; } catch (e) {} var r = window._rpRec, d = window._rpDose; if (r) { try { closeRecipePanel(); } catch (e) {} setTimeout(function () { open(r, d); }, 50); } };
  window.KC = { open: open, close: close, command: command, state: function () { return K; }, parseMinutes: parseMinutes, wave: function () { return !!GW; } };
  (function () { var st = document.createElement('style'); st.textContent = '.kc-cam{position:fixed;right:12px;bottom:104px;width:60px;height:45px;object-fit:cover;border-radius:12px;opacity:.6;transform:scaleX(-1);z-index:10001;pointer-events:none;border:1px solid rgba(255,255,255,.3)}body:not(.kc-open) .kc-cam{display:none}.kc-ib.wave.on{background:var(--gold2,#B8862F)!important;color:#1a1410!important}'; document.head.appendChild(st); })();
})();
