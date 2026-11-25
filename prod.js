/* ════════════════════════════════════════════════════════════════════
   PRODUZIONE E COMUNICAZIONI
   · Foglio base: il foglio standard con nome, preparazioni fisse,
     quantità, responsabili e note. Le modifiche restano nel foglio base.
   · Foglio del giorno: si crea dal foglio base, si compila (quantità,
     responsabile, stato da fare / in corso / fatto, note), le righe si
     collegano alle ricette. Spuntando le righe si crea il documento
     (Word o stampa/PDF) con il foglio e le ricette alle quantità giuste.
   · Comunicazioni: a tutta la brigata o personali, con il foglio del
     giorno allegato; chi apre l'app vede subito quelle non lette e chi
     scrive vede chi le ha lette.
   Permessi: titolare, admin, pastry chef e chef de partie compilano e
   scrivono a tutti; gli altri segnano le righe assegnate a loro e
   mandano messaggi personali (regole applicate dal database).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fq(v) { if (v == null) return ''; var r = Math.round(v * 100) / 100; return String(r).replace('.', ','); }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function rest(path, opt) { return WL.rest(path, opt); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'], MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function dayLabel(s) { var d = fromIso(s), t = iso(new Date()), y = iso(new Date(Date.now() - 864e5)), tm = iso(new Date(Date.now() + 864e5)); var l = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; return s === t ? 'Oggi, ' + l : s === y ? 'Ieri, ' + l : s === tm ? 'Domani, ' + l : l.charAt(0).toUpperCase() + l.slice(1); }
  function when(t) { var d = new Date(t), m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'adesso'; if (m < 60) return m + ' min fa'; if (m < 1440 && d.getDate() === new Date().getDate()) return 'oggi alle ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function lead() { return !!(WL.canLead && WL.canLead()); }
  function me() { return WL.uid; }
  function myName() { try { var u = WL.user(), n = u && u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name); return n || String(WL.email()).split('@')[0]; } catch (e) { return ''; } }
  function recs() { return (window.CU || []).filter(function (r) { return r && r.n && !r._cfg; }); }
  function recById(id, name) { var a = recs(); return a.filter(function (r) { return id != null && String(r._id) === String(id); })[0] || a.filter(function (r) { return name && r.n === name; })[0] || null; }
  function totOf(r) { try { return rcAnalyze(r.i || []).tot; } catch (e) { return 0; } }
  var STATI = { todo: 'Da fare', doing: 'In corso', done: 'Fatto' };
  var NEXT = { todo: 'doing', doing: 'done', done: 'todo' };
  var IC = {
    doc: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-3-6z"/></svg>',
    clip: '<svg viewBox="0 0 24 24"><path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L12 6.3"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    msg: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ══════════ DATI ══════════ */
  var P = { open: false, tab: 'day', day: iso(new Date()), sheet: null, base: null, people: [], msgs: [], reads: {}, sel: {}, dirty: false, err: '' };
  function loadPeople() {
    return rest('rpc/brigata_people', { method: 'POST', body: { p_owner: WL.ws } }).then(function (r) { P.people = r || []; }).catch(function () { P.people = [{ user_id: me(), name: myName(), email: WL.email(), role: WL.role() }]; });
  }
  function personName(id) { var p = P.people.filter(function (x) { return x.user_id === id; })[0]; return p ? p.name : ''; }
  function setupErr(e) { return e && (e.status === 404 || /produzione|messaggi|schema cache|does not exist|Could not find/i.test(e.message || '')); }
  function loadDay() {
    return rest('produzione?select=*&owner_id=eq.' + WL.ws + '&giorno=eq.' + P.day + '&order=created_at.asc&limit=1').then(function (r) { P.sheet = r && r[0] || null; });
  }
  function loadBase() {
    return rest('produzione?select=*&owner_id=eq.' + WL.ws + '&giorno=is.null&order=created_at.asc&limit=1').then(function (r) { P.base = r && r[0] || null; });
  }
  function loadMsgs() {
    return rest('messaggi?select=*&owner_id=eq.' + WL.ws + '&order=created_at.desc&limit=80').then(function (r) {
      P.msgs = r || [];
      var ids = P.msgs.map(function (m) { return m.id; }); if (!ids.length) { P.reads = {}; return; }
      return rest('messaggi_letti?select=*&msg_id=in.(' + ids.join(',') + ')').then(function (l) { P.reads = {}; (l || []).forEach(function (x) { (P.reads[x.msg_id] = P.reads[x.msg_id] || []).push(x); }); });
    });
  }
  function unread() { return P.msgs.filter(function (m) { return m.author_id !== me() && !(P.reads[m.id] || []).some(function (x) { return x.user_id === me(); }); }); }
  function markRead(list) {
    list = list.filter(function (m) { return m.author_id !== me() && !(P.reads[m.id] || []).some(function (x) { return x.user_id === me(); }); });
    if (!list.length) return Promise.resolve();
    return rest('messaggi_letti?on_conflict=msg_id,user_id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: list.map(function (m) { return { msg_id: m.id, user_id: me() }; }) })
      .then(function () { list.forEach(function (m) { (P.reads[m.id] = P.reads[m.id] || []).push({ msg_id: m.id, user_id: me(), read_at: new Date().toISOString() }); }); badge(); })
      .catch(function () {});
  }
  var saveT = null;
  function saveSheet(sh, now) {
    if (!lead() || !sh) return Promise.resolve();
    clearTimeout(saveT);
    var go = function () {
      var body = { titolo: sh.titolo, data: sh.data, updated_by: me(), updated_at: new Date().toISOString() };
      setSaved('Salvataggio…');
      var p = sh.id ? rest('produzione?id=eq.' + sh.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: body })
        : rest('produzione', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner_id: WL.ws, giorno: sh.giorno || null, titolo: sh.titolo, data: sh.data } });
      return p.then(function (r) { if (r && r[0]) { sh.id = r[0].id; sh.updated_at = r[0].updated_at; } setSaved('Salvato'); }).catch(function (e) { setSaved('Non salvato: ' + e.message, true); });
    };
    if (now) return go();
    return new Promise(function (res) { saveT = setTimeout(function () { go().then(res); }, 700); });
  }
  function setSaved(t, bad) { var e = $('prSaved'); if (e) { e.textContent = t; e.classList.toggle('bad', !!bad); } }

  /* ══════════ VISTA ══════════ */
  function open(tab, day) {
    if (!window.WL || !WL.signedIn()) return;
    P.tab = tab || P.tab || 'day'; if (day) P.day = day;
    var el = $('pr');
    if (!el) {
      el = document.createElement('div'); el.id = 'pr'; el.className = 'pr'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Produzione e comunicazioni');
      document.body.appendChild(el);
    }
    el.innerHTML = '<div class="pr-sh"><header class="pr-hd"><button type="button" class="pr-x" id="prX" aria-label="Chiudi">' + IC.x + '</button><div class="pr-tt"><span>Produzione</span><b>' + esc(WL.brand().name || 'Il mio ricettario') + '</b></div><span class="pr-saved" id="prSaved"></span></header>' +
      '<nav class="pr-tabs" role="tablist">' + [['day', 'Foglio del giorno'], ['base', 'Foglio base'], ['msg', 'Comunicazioni']].map(function (t) { return '<button type="button" role="tab" data-t="' + t[0] + '" class="' + (P.tab === t[0] ? 'on' : '') + '">' + t[1] + (t[0] === 'msg' ? '<b class="pr-badge" id="prBadge"></b>' : '') + '</button>'; }).join('') + '</nav>' +
      '<main class="pr-body" id="prBody"><div class="pr-wait">Carico…</div></main></div>';
    el.classList.add('on'); document.body.classList.add('pr-open'); P.open = true;
    $('prX').onclick = close;
    [].forEach.call(el.querySelectorAll('.pr-tabs button'), function (b) { b.onclick = function () { P.tab = b.dataset.t; [].forEach.call(el.querySelectorAll('.pr-tabs button'), function (x) { x.classList.toggle('on', x === b); }); render(); }; });
    document.addEventListener('keydown', escK);
    Promise.all([loadPeople(), loadDay(), loadBase(), loadMsgs()]).then(function () { P.err = ''; render(); badge(); }, function (e) { P.err = setupErr(e) ? 'setup' : (e && e.message || 'Errore'); render(); });
  }
  function escK(e) { if (e.key === 'Escape' && P.open && !document.querySelector('.pr-pop')) close(); }
  function close() { var el = $('pr'); if (el) el.classList.remove('on'); document.body.classList.remove('pr-open'); P.open = false; document.removeEventListener('keydown', escK); clearTimeout(saveT); if (P.sheet && P.dirty) saveSheet(P.sheet, true); try { HM.soon(); } catch (e) {} }
  function render() {
    var b = $('prBody'); if (!b) return;
    if (P.err === 'setup') { b.innerHTML = window.sqlSetupCard ? sqlSetupCard('produzione e comunicazioni') : '<div class="pr-empty"><b>Manca un passaggio su Supabase</b><p>Esegui supabase/schema.sql nel SQL Editor.</p></div>'; return; }
    if (P.err) { b.innerHTML = '<div class="pr-empty"><b>Non riesco a caricare</b><p>' + esc(P.err) + '</p></div>'; return; }
    if (P.tab === 'msg') return renderMsgs(b);
    if (P.tab === 'base') return renderSheet(b, true);
    return renderSheet(b, false);
  }

  /* ── foglio (giorno o base) ── */
  function newData(fromBase) {
    var rows = fromBase && fromBase.data && fromBase.data.rows ? fromBase.data.rows.map(function (r) { return { id: uid(), t: r.t, r: r.r, q: r.q, u: r.u || 'g', who: r.who || '', note: r.note || '', sez: r.sez || '', st: 'todo' }; }) : [];
    return { rows: rows, note: '', from: fromBase ? fromBase.titolo : '' };
  }
  function renderSheet(b, isBase) {
    var sh = isBase ? P.base : P.sheet, L = lead();
    var head = isBase
      ? '<div class="pr-dayhd"><div><span class="pr-k">Foglio standard</span><p class="pr-hint">Le preparazioni fisse con quantità e responsabili. Ogni foglio del giorno parte da qui; le modifiche restano nel foglio base.</p></div></div>'
      : '<div class="pr-dayhd"><button type="button" class="pr-nav" data-d="-1" aria-label="Giorno prima">' + IC.left + '</button><label class="pr-day"><b>' + esc(dayLabel(P.day)) + '</b><input type="date" id="prDate" value="' + P.day + '"></label><button type="button" class="pr-nav" data-d="1" aria-label="Giorno dopo">' + IC.right + '</button>' + (P.day !== iso(new Date()) ? '<button type="button" class="pr-today" id="prToday">Oggi</button>' : '') + '</div>';
    if (!sh) {
      b.innerHTML = head + '<div class="pr-empty">' + (isBase
        ? '<b>Non hai ancora un foglio base</b><p>Crealo con le preparazioni che fai ogni giorno: diventa il modello per tutti i fogli.</p>' + (L ? '<div class="pr-acts"><button type="button" class="pr-b dark" id="prMkBase">' + IC.plus + 'Crea il foglio base</button></div>' : '<p>Lo crea chi guida la produzione.</p>')
        : '<b>Nessun foglio per questo giorno</b>' + (L ? '<p>Parti dal foglio base o da un foglio vuoto.</p><div class="pr-acts">' + (P.base ? '<button type="button" class="pr-b dark" id="prFromBase">Crea da «' + esc(P.base.titolo) + '»</button>' : '') + '<button type="button" class="pr-b" id="prEmpty">Foglio vuoto</button></div>' : '<p>Il foglio lo compila lo chef. Quando c’è, lo trovi qui.</p>')) + '</div>';
      bindDayNav();
      var mb = $('prMkBase'); if (mb) mb.onclick = function () { P.base = { giorno: null, titolo: 'Foglio di produzione', data: newData(null) }; saveSheet(P.base, true).then(render); };
      var fb = $('prFromBase'); if (fb) fb.onclick = function () { P.sheet = { giorno: P.day, titolo: P.base.titolo, data: newData(P.base) }; saveSheet(P.sheet, true).then(render); };
      var em = $('prEmpty'); if (em) em.onclick = function () { P.sheet = { giorno: P.day, titolo: 'Produzione', data: newData(null) }; saveSheet(P.sheet, true).then(render); };
      return;
    }
    var rows = sh.data.rows || [], done = rows.filter(function (r) { return r.st === 'done'; }).length;
    var opts = '<option value="">—</option>' + P.people.map(function (p) { return '<option value="' + esc(p.user_id) + '">' + esc(p.name) + ' · ' + esc(WL.roleLabel(p.role)) + '</option>'; }).join('');
    var recOpts = recs().map(function (r) { return '<option value="' + esc(r.n) + '"></option>'; }).join('');
    var nsel = rows.filter(function (r) { return P.sel[r.id]; }).length;
    b.innerHTML = head +
      '<div class="pr-sheet"><div class="pr-sh-top">' + (L ? '<input class="pr-title" id="prTitle" value="' + esc(sh.titolo) + '" aria-label="Nome del foglio">' : '<h2 class="pr-title">' + esc(sh.titolo) + '</h2>') +
        (!isBase && rows.length ? '<div class="pr-prog"><span class="mono">' + done + '/' + rows.length + '</span><i><b style="width:' + (rows.length ? done / rows.length * 100 : 0) + '%"></b></i></div>' : '') + '</div>' +
        (!isBase && rows.length ? '<div class="pr-selbar"><label class="pr-chk"><input type="checkbox" id="prAll"' + (nsel && nsel === rows.length ? ' checked' : '') + '><span></span>Tutte</label><span class="pr-hint">' + (nsel ? nsel + ' spuntate per il documento' : 'Spunta le preparazioni per creare il documento') + '</span></div>' : '') +
        '<div class="pr-rows" id="prRows">' + rows.map(function (r, i) {
          var rec = recById(r.r, r.t), mine = r.who === me(), can = L || mine, st = r.st || 'todo';
          var tot = rec ? totOf(rec) : 0, qtxt = r.q == null ? '' : (r.u === '×' ? '×' + fq(r.q) + (tot ? ' · ' + fq(Math.round(tot * r.q)) + ' g' : '') : fq(r.q) + ' ' + (r.u || 'g') + (tot && r.u === 'g' ? ' · ×' + fq(Math.round(r.q / tot * 100) / 100) : ''));
          return '<div class="pr-row st-' + st + (mine ? ' mine' : '') + '" data-i="' + i + '">' +
            (!isBase ? '<label class="pr-chk"><input type="checkbox" data-sel="' + esc(r.id) + '"' + (P.sel[r.id] ? ' checked' : '') + '><span></span></label>' : '') +
            '<div class="pr-main">' +
              (L ? '<input class="pr-name" data-f="t" list="prRecs" value="' + esc(r.t) + '" placeholder="Preparazione o ricetta">' : '<b class="pr-name">' + esc(r.t) + '</b>') +
              '<div class="pr-meta">' + (rec ? '<button type="button" class="pr-rec" data-open="' + i + '">' + IC.link + 'Ricetta</button>' : (r.t ? '<span class="pr-free">voce libera</span>' : '')) +
                (L ? '<span class="pr-q"><input data-f="q" inputmode="decimal" value="' + (r.q == null ? '' : fq(r.q)) + '" placeholder="qtà"><select data-f="u"><option value="g"' + (r.u !== '×' && r.u !== 'pz' ? ' selected' : '') + '>g</option><option value="×"' + (r.u === '×' ? ' selected' : '') + '>× dose</option><option value="pz"' + (r.u === 'pz' ? ' selected' : '') + '>pz</option></select></span>' : (qtxt ? '<span class="pr-qt mono">' + esc(qtxt) + '</span>' : '')) +
                (L ? '<select class="pr-who" data-f="who">' + opts.replace('value="' + esc(r.who) + '"', 'value="' + esc(r.who) + '" selected') + '</select>' : (r.who ? '<span class="pr-whot">' + esc(personName(r.who) || '—') + (mine ? ' (tu)' : '') + '</span>' : '')) +
              '</div>' +
              (L ? '<input class="pr-note" data-f="note" value="' + esc(r.note || '') + '" placeholder="Nota (es. per stasera, abbattere)">' : (r.note ? '<p class="pr-notet">' + esc(r.note) + '</p>' : '')) +
            '</div>' +
            (!isBase ? '<button type="button" class="pr-st st-' + st + '" data-st="' + i + '"' + (can ? '' : ' disabled title="Assegnata a un altro membro"') + '>' + (st === 'done' ? IC.check : '') + STATI[st] + '</button>' : '') +
            (L ? '<button type="button" class="pr-del" data-del="' + i + '" aria-label="Togli riga">' + IC.x + '</button>' : '') +
          '</div>';
        }).join('') + (!rows.length ? '<p class="pr-hint pad">Nessuna preparazione. ' + (L ? 'Aggiungine una qui sotto.' : '') + '</p>' : '') + '</div>' +
        (L ? '<datalist id="prRecs">' + recOpts + '</datalist><form class="pr-add" id="prAdd"><input id="prAddT" list="prRecs" placeholder="Aggiungi una preparazione: scrivi il nome o scegli una ricetta"><button type="submit" class="pr-b dark">' + IC.plus + 'Aggiungi</button></form>' : '') +
        (!isBase ? '<label class="pr-daynote"><span class="pr-k">Note del giorno</span>' + (L ? '<textarea id="prDayNote" rows="3" placeholder="Coperti, eventi, temperature, ordini…">' + esc(sh.data.note || '') + '</textarea>' : '<p>' + esc(sh.data.note || '—') + '</p>') + '</label>' : '') +
      '</div>' +
      '<div class="pr-foot">' +
        (!isBase ? '<button type="button" class="pr-b dark" id="prDoc"' + (rows.length ? '' : ' disabled') + '>' + IC.doc + 'Documento' + (nsel ? ' (' + nsel + ')' : '') + '</button>' : '') +
        (!isBase && window.SHOP ? '<button type="button" class="pr-b" id="prShop"' + (rows.length ? '' : ' disabled') + '>' + SHOP.icon + 'Lista della spesa' + (nsel ? ' (' + nsel + ')' : '') + '</button>' : '') +
        (!isBase && L ? '<button type="button" class="pr-b" id="prSend">' + IC.send + 'Invia alla brigata</button>' : '') +
        (!isBase && L ? '<button type="button" class="pr-b ghost" id="prToBase">Salva come foglio base</button>' : '') +
        (!isBase && L ? '<button type="button" class="pr-b ghost danger" id="prDelSheet">Elimina il foglio</button>' : '') +
        (isBase && L ? '<button type="button" class="pr-b dark" id="prUseToday">Crea il foglio di oggi da questo</button>' : '') +
      '</div>';
    bindDayNav();
    var mutate = function () { P.dirty = true; saveSheet(sh); };
    var t = $('prTitle'); if (t) t.oninput = function () { sh.titolo = t.value.trim() || 'Foglio'; mutate(); };
    [].forEach.call(b.querySelectorAll('.pr-row'), function (row) {
      var i = +row.dataset.i, r = rows[i];
      [].forEach.call(row.querySelectorAll('[data-f]'), function (inp) {
        var ev = inp.tagName === 'SELECT' ? 'onchange' : 'oninput';
        inp[ev] = function () {
          var f = inp.dataset.f, v = inp.value;
          if (f === 'q') r.q = num(v); else if (f === 't') { r.t = v; var rec = recs().filter(function (x) { return x.n === v.trim(); })[0]; r.r = rec ? rec._id : null; } else r[f] = v;
          mutate();
          if (f === 'u' || f === 'who' || (f === 't' && inp.tagName !== 'INPUT')) render();
        };
        if (inp.dataset.f === 't') inp.onchange = function () { render(); };
      });
      var o = row.querySelector('[data-open]'); if (o) o.onclick = function () { var rec = recById(r.r, r.t); if (!rec) return; close(); var tot = totOf(rec), d = r.q == null ? 1 : r.u === '×' ? r.q : r.u === 'g' && tot ? r.q / tot : 1; XL.open(rec, 'lab'); if (d && d !== 1) XL.setDose(d, true); };
      var sb = row.querySelector('[data-st]'); if (sb) sb.onclick = function () {
        var ns = NEXT[r.st || 'todo'], old = r.st; r.st = ns; render();
        try { if (window.MOTION) MOTION.vib(ns === 'done' ? [12, 40, 12] : 10); } catch (e) {}
        if (L) { mutate(); return; }
        rest('rpc/prod_set_status', { method: 'POST', body: { p_id: sh.id, p_row: r.id, p_status: ns } }).then(function () { setSaved('Salvato'); }).catch(function (e) { r.st = old; render(); setSaved(e.message, true); });
      };
      var dl = row.querySelector('[data-del]'); if (dl) dl.onclick = function () { rows.splice(i, 1); mutate(); render(); };
      var sc = row.querySelector('[data-sel]'); if (sc) sc.onchange = function () { P.sel[r.id] = sc.checked; render(); };
    });
    var all = $('prAll'); if (all) all.onchange = function () { rows.forEach(function (r) { P.sel[r.id] = all.checked; }); render(); };
    var add = $('prAdd'); if (add) add.onsubmit = function (e) {
      e.preventDefault(); var v = $('prAddT').value.trim(); if (!v) return;
      var rec = recs().filter(function (x) { return norm(x.n) === norm(v); })[0];
      rows.push({ id: uid(), t: rec ? rec.n : v, r: rec ? rec._id : null, q: rec ? Math.round(totOf(rec)) || null : null, u: 'g', who: '', note: '', st: 'todo' });
      sh.data.rows = rows; mutate(); render(); var inp = $('prAddT'); if (inp) inp.focus();
    };
    var dn = $('prDayNote'); if (dn) dn.oninput = function () { sh.data.note = dn.value; mutate(); };
    var doc = $('prDoc'); if (doc) doc.onclick = function () { docMenu(sh); };
    var shp = $('prShop'); if (shp) shp.onclick = function () { shopOpen(sh); };
    var sd = $('prSend'); if (sd) sd.onclick = function () { P.tab = 'msg'; P.compose = { attach: { day: sh.giorno, titolo: sh.titolo } }; syncTabs(); render(); };
    var tb = $('prToBase'); if (tb) tb.onclick = function () {
      if (!confirm('Il foglio base diventa uguale a questo (righe, quantità, responsabili e note delle righe; gli stati no). Continuare?')) return;
      var base = P.base || { giorno: null, titolo: sh.titolo, data: {} };
      base.titolo = sh.titolo; base.data = { rows: rows.map(function (r) { return { id: uid(), t: r.t, r: r.r, q: r.q, u: r.u, who: r.who, note: r.note }; }) };
      P.base = base; saveSheet(base, true).then(function () { XL.toast && XL.toast('Foglio base aggiornato'); });
    };
    var ds = $('prDelSheet'); if (ds) ds.onclick = function () { if (!confirm('Eliminare il foglio di ' + dayLabel(P.day).toLowerCase() + '?')) return; rest('produzione?id=eq.' + sh.id, { method: 'DELETE' }).then(function () { P.sheet = null; render(); }); };
    var ut = $('prUseToday'); if (ut) ut.onclick = function () { P.day = iso(new Date()); P.tab = 'day'; syncTabs(); loadDay().then(function () { if (!P.sheet) { P.sheet = { giorno: P.day, titolo: P.base.titolo, data: newData(P.base) }; saveSheet(P.sheet, true).then(render); } else render(); }); };
  }
  function syncTabs() { [].forEach.call(document.querySelectorAll('#pr .pr-tabs button'), function (x) { x.classList.toggle('on', x.dataset.t === P.tab); }); }
  function bindDayNav() {
    [].forEach.call(document.querySelectorAll('#pr .pr-nav'), function (b) { b.onclick = function () { var d = fromIso(P.day); d.setDate(d.getDate() + (+b.dataset.d)); goDay(iso(d)); }; });
    var di = $('prDate'); if (di) di.onchange = function () { if (di.value) goDay(di.value); };
    var td = $('prToday'); if (td) td.onclick = function () { goDay(iso(new Date())); };
  }
  function goDay(d) { if (P.sheet && P.dirty) saveSheet(P.sheet, true); P.dirty = false; P.day = d; P.sel = {}; $('prBody').innerHTML = '<div class="pr-wait">Carico…</div>'; loadDay().then(render, render); }

  /* ── documento: foglio + ricette spuntate alle quantità del foglio ── */
  function buildDoc(sh) {
    var rows = sh.data.rows || [], chosen = rows.filter(function (r) { return P.sel[r.id]; });
    if (!chosen.length) chosen = rows;
    var items = [];
    chosen.forEach(function (r) {
      var rec = recById(r.r, r.t); if (!rec) return;
      var tot = totOf(rec), d = r.q == null ? 1 : r.u === '×' ? r.q : r.u === 'g' && tot ? r.q / tot : 1;
      items.push(pdSnap(rec, Math.round(d * 1000) / 1000));
    });
    var dd = fromIso(sh.giorno || iso(new Date())), name = sh.titolo + ' · ' + dd.getDate() + ' ' + MONTHS[dd.getMonth()] + ' ' + dd.getFullYear();
    var table = '<section class="rec prodtab"><h2>Preparazioni</h2><table><thead><tr><th>Preparazione</th><th class="qty">Quantità</th><th>Responsabile</th><th>Stato</th><th>Note</th></tr></thead><tbody>' +
      chosen.map(function (r) { return '<tr><td class="ing">' + esc(r.t) + '</td><td class="qty">' + (r.q == null ? '' : (r.u === '×' ? '×' + fq(r.q) : fq(r.q) + ' ' + esc(r.u || 'g'))) + '</td><td>' + esc(personName(r.who) || '') + '</td><td>' + esc(STATI[r.st || 'todo']) + '</td><td>' + esc(r.note || '') + '</td></tr>'; }).join('') +
      '</tbody></table>' + (sh.data.note ? '<div class="proc"><h3>Note del giorno</h3><p>' + esc(sh.data.note).replace(/\n/g, '<br>') + '</p></div>' : '') + '</section>';
    return { doc: { name: name, onePerPage: false, items: items }, table: table, n: chosen.length };
  }
  /* lista della spesa: ricette collegate alle righe (spuntate o tutte), alle quantità del foglio */
  function shopOpen(sh) {
    if (P.dirty) { try { saveSheet(sh, true); } catch (e) {} }
    var rows = sh.data.rows || [], chosen = rows.filter(function (r) { return P.sel[r.id]; }); if (!chosen.length) chosen = rows;
    var items = [], loose = [];
    chosen.forEach(function (r) {
      var rec = recById(r.r, r.t); if (!rec) { loose.push(r.t); return; }
      var tot = totOf(rec), d = r.q == null ? 1 : r.u === '×' ? r.q : r.u === 'g' && tot ? r.q / tot : 1;
      items.push({ rec: rec, d: Math.round(d * 1000) / 1000, row: r.t });
    });
    var dd = fromIso(sh.giorno || iso(new Date()));
    SHOP.open({ title: sh.titolo, day: sh.giorno || iso(new Date()), when: dayLabel(sh.giorno || iso(new Date())), items: items, loose: loose });
  }
  function docMenu(sh) {
    var B = buildDoc(sh);
    var pop = document.createElement('div'); pop.className = 'pr-pop';
    pop.innerHTML = '<div class="pr-pop-in"><span class="pr-k">Documento</span><b>' + esc(B.doc.name) + '</b><p class="pr-hint">' + B.n + ' preparazioni · ' + B.doc.items.length + ' ricette collegate, alle quantità del foglio.</p>' +
      '<button type="button" class="pr-b dark wide" data-a="word">' + IC.doc + 'Scarica Word (.doc)</button><button type="button" class="pr-b wide" data-a="print">Stampa o salva PDF</button>' +
      (lead() ? '<button type="button" class="pr-b wide" data-a="docs">Aggiungi ai Documenti di stampa</button>' : '') +
      '<button type="button" class="pr-b ghost wide" data-a="x">Annulla</button></div>';
    document.body.appendChild(pop);
    var shut = function () { pop.remove(); };
    pop.onclick = function (e) { if (e.target === pop) shut(); };
    pop.querySelector('[data-a=x]').onclick = shut;
    pop.querySelector('[data-a=word]').onclick = function () { shut(); word(B); };
    pop.querySelector('[data-a=print]').onclick = function () { shut(); print(B); };
    var dd = pop.querySelector('[data-a=docs]'); if (dd) dd.onclick = function () {
      shut(); var docs = pdLoad(); docs.unshift({ id: 'd' + Date.now(), name: B.doc.name, created: Date.now(), updated: Date.now(), onePerPage: false, items: B.doc.items }); if (pdSave(docs)) XL.toast && XL.toast('Aggiunto ai Documenti di stampa');
    };
  }
  function docHTML(B) { return pdDocHTML(B.doc).replace('</header>', '</header>' + B.table); }
  function word(B) {
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(B.doc.name) + '</title><style>body{font-family:Georgia,serif;color:#222}' + pdCss('') + '.prodtab td{font-size:10pt}</style></head><body>' + docHTML(B) + '</body></html>';
    var blob = new Blob(['﻿', html], { type: 'application/msword' });
    saveFile(blob, B.doc.name.replace(/[\\\/:*?"<>|,]+/g, '_') + '.doc');
    P.lastWord = html;
  }
  function print(B) {
    var area = $('printArea'); if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); }
    area.innerHTML = '<style>' + pdCss('#printArea ') + '</style>' + docHTML(B);
    document.body.classList.add('pd-printing');
    var done = function () { document.body.classList.remove('pd-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); setTimeout(function () { window.print(); }, 80);
  }

  /* ── comunicazioni ── */
  function renderMsgs(b) {
    var L = lead(), others = P.people.filter(function (p) { return p.user_id !== me(); });
    var c = P.compose || {};
    var to = '<select id="prTo">' + (L ? '<option value="">Tutta la brigata</option>' : '') + others.map(function (p) { return '<option value="' + esc(p.user_id) + '"' + (c.to === p.user_id ? ' selected' : '') + '>' + esc(p.name) + ' · ' + esc(WL.roleLabel(p.role)) + '</option>'; }).join('') + '</select>';
    var att = c.attach ? '<span class="pr-att">' + IC.clip + esc(c.attach.titolo + ' · ' + dayLabel(c.attach.day)) + '<button type="button" id="prAttX" aria-label="Togli allegato">×</button></span>' : '';
    var list = P.msgs.map(function (m) {
      var mine = m.author_id === me(), rd = P.reads[m.id] || [], isNew = !mine && !rd.some(function (x) { return x.user_id === me(); });
      var dest = m.to_id ? (m.to_id === me() ? 'a te' : 'a ' + (personName(m.to_id) || 'un membro')) : 'a tutta la brigata';
      var readers = mine ? rd.filter(function (x) { return x.user_id !== me(); }) : [];
      var total = m.to_id ? 1 : Math.max(0, P.people.length - 1);
      return '<article class="pr-msg' + (mine ? ' mine' : '') + (isNew ? ' new' : '') + (m.to_id ? ' pers' : '') + '" data-id="' + esc(m.id) + '"><div class="pr-msg-h"><b>' + esc(m.author_name || personName(m.author_id) || '—') + '</b><span>' + esc(dest) + ' · ' + when(m.created_at) + '</span>' + (isNew ? '<em>Nuovo</em>' : '') + '</div>' +
        '<p>' + esc(m.body).replace(/\n/g, '<br>') + '</p>' +
        (m.attach && m.attach.day ? '<button type="button" class="pr-att open" data-day="' + esc(m.attach.day) + '">' + IC.clip + esc((m.attach.titolo || 'Foglio') + ' · ' + dayLabel(m.attach.day)) + '</button>' : '') +
        (mine ? '<div class="pr-reads" title="' + esc(readers.map(function (x) { return personName(x.user_id); }).join(', ')) + '">' + (readers.length ? 'Letto da ' + readers.length + (total ? ' di ' + total : '') + ': ' + esc(readers.map(function (x) { return personName(x.user_id) || '—'; }).join(', ')) : 'Non ancora letto') + '</div>' : '') +
        (mine || WL.isAdmin() ? '<button type="button" class="pr-mdel" data-del="' + esc(m.id) + '" aria-label="Elimina messaggio">' + IC.x + '</button>' : '') + '</article>';
    }).join('');
    b.innerHTML = (P.people.length > 1
      ? '<form class="pr-comp" id="prComp"><div class="pr-comp-h"><span class="pr-k">Nuova comunicazione</span>' + to + '</div><textarea id="prBodyT" rows="3" maxlength="4000" placeholder="' + (L ? 'Briefing, cambi di servizio, avvisi…' : 'Scrivi un messaggio…') + '">' + esc(c.body || '') + '</textarea>' +
        '<div class="pr-comp-f">' + att + (!c.attach && P.sheet ? '<button type="button" class="pr-b ghost" id="prAttDay">' + IC.clip + 'Allega il foglio del ' + esc(dayLabel(P.day).replace(/^Oggi, /, '').toLowerCase()) + '</button>' : '') + '<button type="submit" class="pr-b dark" id="prSendMsg">' + IC.send + 'Invia</button></div></form>'
      : '<div class="pr-empty"><b>Comunicazioni con la brigata</b><p>Invita i membri della brigata da Account e personalizzazione → Brigata: qui potrai mandare briefing a tutti e messaggi personali.</p></div>') +
      '<div class="pr-msgs">' + (list || (P.people.length > 1 ? '<p class="pr-hint pad">Nessuna comunicazione ancora.</p>' : '')) + '</div>';
    var f = $('prComp');
    if (f) {
      $('prBodyT').oninput = function () { P.compose = P.compose || {}; P.compose.body = this.value; };
      $('prTo').onchange = function () { P.compose = P.compose || {}; P.compose.to = this.value; };
      var ax = $('prAttX'); if (ax) ax.onclick = function () { P.compose.attach = null; render(); };
      var ad = $('prAttDay'); if (ad) ad.onclick = function () { P.compose = P.compose || {}; P.compose.attach = { day: P.sheet.giorno, titolo: P.sheet.titolo }; P.compose.body = $('prBodyT').value; render(); };
      f.onsubmit = function (e) {
        e.preventDefault(); var body = $('prBodyT').value.trim(); if (!body) { $('prBodyT').focus(); return; }
        var toId = $('prTo').value || null, btn = $('prSendMsg'); btn.disabled = true;
        rest('messaggi', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner_id: WL.ws, author_name: myName(), to_id: toId, body: body, attach: P.compose && P.compose.attach || null } })
          .then(function (r) { P.compose = null; if (r && r[0]) P.msgs.unshift(r[0]); render(); XL.toast && XL.toast(toId ? 'Messaggio inviato' : 'Comunicazione inviata a tutta la brigata'); })
          .catch(function (er) { btn.disabled = false; alert('Non inviato: ' + er.message); });
      };
    }
    [].forEach.call(b.querySelectorAll('.pr-att.open'), function (x) { x.onclick = function () { P.tab = 'day'; syncTabs(); goDay(x.dataset.day); }; });
    [].forEach.call(b.querySelectorAll('.pr-mdel'), function (x) { x.onclick = function () { if (!confirm('Eliminare questo messaggio per tutti?')) return; rest('messaggi?id=eq.' + x.dataset.del, { method: 'DELETE' }).then(function () { P.msgs = P.msgs.filter(function (m) { return m.id !== x.dataset.del; }); render(); }); }; });
    setTimeout(function () { if (P.open && P.tab === 'msg') markRead(P.msgs); }, 1200);
  }
  function badge() { var n = unread().length, b = $('prBadge'); if (b) b.textContent = n || ''; try { HM.soon(); } catch (e) {} }

  /* ══════════ BRIEFING ALL'APERTURA ══════════ */
  function briefing() {
    if (!window.WL || !WL.signedIn() || !WL.ws) return;
    Promise.all([loadPeople(), loadMsgs(), rest('produzione?select=*&owner_id=eq.' + WL.ws + '&giorno=eq.' + iso(new Date()) + '&limit=1').then(function (r) { P.todaySheet = r && r[0] || null; }, function () { P.todaySheet = null; })]).then(function () {
      var U = unread().filter(function (m) { return Date.now() - Date.parse(m.created_at) < 7 * 864e5; });
      try { HM.soon(); } catch (e) {}
      if (!U.length || $('prBrief') || P.open) return;
      var el = document.createElement('div'); el.id = 'prBrief'; el.className = 'pr-pop brief';
      el.innerHTML = '<div class="pr-pop-in"><span class="pr-k">' + (U.length === 1 ? 'Una comunicazione' : U.length + ' comunicazioni') + ' per te</span>' +
        U.slice(0, 5).map(function (m) { return '<article class="pr-msg new"><div class="pr-msg-h"><b>' + esc(m.author_name || personName(m.author_id)) + '</b><span>' + (m.to_id ? 'a te' : 'a tutta la brigata') + ' · ' + when(m.created_at) + '</span></div><p>' + esc(m.body).replace(/\n/g, '<br>') + '</p>' + (m.attach && m.attach.day ? '<button type="button" class="pr-att open" data-day="' + esc(m.attach.day) + '">' + IC.clip + esc((m.attach.titolo || 'Foglio') + ' · ' + dayLabel(m.attach.day)) + '</button>' : '') + '</article>'; }).join('') +
        (U.length > 5 ? '<p class="pr-hint">… e altre ' + (U.length - 5) + '</p>' : '') +
        '<div class="pr-acts"><button type="button" class="pr-b dark" id="prBriefOk">' + IC.check + 'Ho letto</button><button type="button" class="pr-b" id="prBriefAll">Apri le comunicazioni</button></div></div>';
      document.body.appendChild(el);
      var done = function () { markRead(U); el.remove(); };
      $('prBriefOk').onclick = done;
      $('prBriefAll').onclick = function () { done(); open('msg'); };
      [].forEach.call(el.querySelectorAll('.pr-att.open'), function (x) { x.onclick = function () { done(); open('day', x.dataset.day); }; });
    }).catch(function () {});
  }
  window.PR = { open: open, close: close, unread: function () { return unread(); }, msgs: function () { return P.msgs; }, today: function () { return loadDay().then(function () { return P.day === iso(new Date()) ? P.sheet : null; }); }, briefing: briefing, state: P };

  /* ══════════ PUNTI D'ACCESSO ══════════ */
  if (typeof window.boot === 'function') { var _b = window.boot; window.boot = function () { var r = _b.apply(this, arguments); setTimeout(briefing, 1500); return r; }; }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && window.WL && WL.signedIn() && !P.open) { var t = Date.now(); if (!P._lastB || t - P._lastB > 5 * 60000) { P._lastB = t; briefing(); } } });
})();
