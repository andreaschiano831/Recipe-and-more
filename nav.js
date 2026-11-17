/* ════════════════════════════════════════════════════════════════════
   NAVIGAZIONE «DA APP» + FILE SALVATI IN MODO SICURO
   · Il gesto indietro (swipe dal bordo su iPhone, tasto indietro su Android)
     chiude la cosa aperta più in alto — pannello, cucina, ricetta, ricerca,
     lettore, biblioteca, sezione — invece di uscire dall'app.
   · I file esportati (Word, backup) su iPhone/iPad passano dal foglio di
     condivisione: niente più pagine «blob» nella cronologia che, tornando
     indietro, davano «Safari non può aprire la pagina».
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var body = document.body;
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ── salvataggio file ── */
  window.saveFile = function (blob, name) {
    function viaLink() {
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); }, 1500);
      setTimeout(function () { URL.revokeObjectURL(url); }, IOS ? 600000 : 60000);
    }
    try {
      if (IOS && navigator.share && typeof File === 'function') {
        var f = new File([blob], name, { type: blob.type || 'application/octet-stream' });
        if (!navigator.canShare || navigator.canShare({ files: [f] })) {
          return navigator.share({ files: [f], title: name }).catch(function (e) { if (!e || e.name !== 'AbortError') viaLink(); });
        }
      }
    } catch (e) {}
    viaLink();
  };

  /* ── livelli che il gesto indietro sa chiudere, dal più alto ── */
  function vis(id) { var e = $(id); return !!e && e.style.display !== 'none' && getComputedStyle(e).display !== 'none'; }
  /* finestre e fogli generici (impostazioni, documenti, menu, conferme…):
     si chiudono come toccando lo sfondo, o con il loro «Chiudi / Annulla» */
  var SKIP = { mBg: 1, recipePanelBg: 1, cucinaBg: 1 };
  function shown(e) { if (!e.getClientRects().length) return false; var cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }
  function topBackdrop() {
    var c = [].slice.call(document.querySelectorAll('.wl-bg,.pd-bg,.pp-bg,[class$="-bg"].on,[id$="Bg"].on,[id$="Bg"][style*="flex"],[id$="Bg"][style*="block"]'))
      .filter(function (e) { return !SKIP[e.id] && !e.closest('#xlView,#sx') && shown(e); });
    return c.length ? c[c.length - 1] : null;
  }
  function closeBackdrop(bg) {
    var before = document.contains(bg) && shown(bg);
    bg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    setTimeout(function () {
      if (document.contains(bg) && shown(bg) && before) {
        var b = [].slice.call(bg.querySelectorAll('button,[role=button]')).filter(function (x) { var t = (x.getAttribute('aria-label') || x.textContent || '').trim().toLowerCase(); return /^(×|✕|chiudi|annulla|fatto|indietro)$/.test(t) || /close|chiudi|\bx\b/.test(x.className); })[0];
        if (b) b.click(); else bg.classList.remove('on');
      }
    }, 30);
  }
  function drawerOpen() { var d = $('MDL_DRW'); return !!d && d.style.display !== 'none' && shown(d); }
  var LAYERS = [
    { open: function () { return !!document.querySelector('.modal-bg.on,#mBg.on'); }, close: null },        /* modifica ricetta: non chiudere, si perderebbero i dati */
    { open: drawerOpen, close: function () { MDL_CLOSE(); } },
    { open: function () { return !!topBackdrop(); }, close: function () { closeBackdrop(topBackdrop()); } },
    { open: function () { return body.classList.contains('sx-open'); }, close: function () { SX.close(); } },
    { open: function () { return body.classList.contains('rd-open'); }, close: function () { window.closeReaderApp && closeReaderApp(); } },
    { open: function () { return body.classList.contains('ck-open'); }, close: function () { closeCucina(); } },
    { open: function () { var c = $('cucinaBg'); return !!c && c.classList.contains('on'); }, close: function () { closeCucina(); } },
    { open: function () { return body.classList.contains('xr-sheet-on'); }, close: function () { XL.closeSheet(); } },
    { open: function () { return !!(window.XL && XL.viewOpen); }, close: function () { XL.close(); } },
    { open: function () { return body.classList.contains('pr-open'); }, close: function () { PR.close(); } },
    { open: function () { return typeof ST !== 'undefined' && ST.open; }, close: function () { closeStudio(); } },
    { open: function () { return vis('recipePanelBg'); }, close: function () { closeRecipePanel(); } },
    { open: function () { return body.classList.contains('lib-open'); }, close: function () { closeLibrary(); try { tbSync(); } catch (e) {} } },
    { open: function () { var a = $('app'); return !!a && a.classList.contains('on'); }, close: function () { tbGoHome(); } }
  ];
  function top() { for (var i = 0; i < LAYERS.length; i++) { try { if (LAYERS[i].open()) return LAYERS[i]; } catch (e) {} } return null; }

  var armed = false;
  function arm() { try { if (!history.state || !history.state.wlGuard) history.pushState({ wlGuard: 1 }, ''); armed = true; } catch (e) {} }
  window.addEventListener('popstate', function () {
    var L = top();
    if (L && L.close) { try { L.close(); } catch (e) {} }
    /* resta sempre dentro l'app: rimette la guardia */
    setTimeout(arm, 0);
  });
  function start() {
    try { history.replaceState({ wlBase: 1 }, ''); } catch (e) {}
    /* la guardia si arma al primo tocco (Safari ignora pushState senza interazione) */
    var once = function () { if (!armed) arm(); window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); };
    window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* ── evita che uno scorrimento orizzontale vicino al bordo diventi «indietro» ──
     Le fasce scorrevoli (chip, timer, filtri) bloccano il rimbalzo laterale. */
  var st = document.createElement('style');
  st.textContent = '.ms-qs,.lb-timers,.xr-seg,.sx-tabs,.cpills,.cat-pills,.hm-row,.rd,.xr-sh-b{overscroll-behavior-x:contain}html,body{overscroll-behavior-x:none}';
  document.head.appendChild(st);
})();

/* ════ «Manca un passaggio su Supabase»: guida con copia dello script e link all'editor ════ */
(function () {
  'use strict';
  function ref() { var m = String((window.WL && WL.url) || '').match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i); return m ? m[1] : ''; }
  function isBoss() { try { return !WL.inTeam || !WL.inTeam() || (WL.isAdmin && WL.isAdmin()); } catch (e) { return true; } }
  window.sqlSetupCard = function (what) {
    var r = ref(), ed = r ? 'https://supabase.com/dashboard/project/' + r + '/sql/new' : 'https://supabase.com/dashboard';
    if (!isBoss()) return '<div class="sq"><b>Funzione non ancora attiva</b><p>Per usare ' + what + ' il titolare della cucina deve aggiornare il database. Avvisalo: ci vuole un minuto.</p></div>';
    return '<div class="sq"><b>Attiva ' + what + '</b><p>Il database della tua cucina va aggiornato una volta sola. Non cancella niente.</p>' +
      '<ol><li><span>1</span><em>Copia lo script</em></li><li><span>2</span><em>Apri l’editor SQL di Supabase</em></li><li><span>3</span><em>Incolla e premi <b>Run</b>, poi torna qui</em></li></ol>' +
      '<div class="sq-a"><button type="button" class="sq-b dark" data-sq="copy">Copia lo script</button><a class="sq-b" href="' + ed + '" target="_blank" rel="noopener">Apri l’editor SQL ↗</a><button type="button" class="sq-b ghost" data-sq="retry">Ho fatto, riprova</button></div><p class="sq-st" aria-live="polite"></p></div>';
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.sq [data-sq]'); if (!b) return;
    var box = b.closest('.sq'), st = box.querySelector('.sq-st');
    if (b.dataset.sq === 'retry') { location.reload(); return; }
    st.textContent = 'Preparo lo script…';
    fetch('/supabase/schema.sql', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (sql) {
      var done = function () { st.textContent = 'Script copiato (' + Math.round(sql.length / 1024) + ' KB). Ora apri l’editor, incolla e premi Run.'; b.textContent = 'Copiato ✓'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(sql).then(done, function () { fallback(sql); done(); });
      else { fallback(sql); done(); }
    }).catch(function () { st.textContent = 'Non riesco a leggere lo script. Lo trovi su GitHub nella cartella supabase, file schema.sql.'; });
    function fallback(t) { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) {} ta.remove(); }
  });
  var css = document.createElement('style');
  css.textContent = '.sq{max-width:460px;margin:24px auto;padding:22px 20px;border-radius:20px;background:var(--card,#fff);border:1px solid var(--cb,rgba(0,0,0,.1));box-shadow:0 18px 40px -30px rgba(0,0,0,.5);text-align:left;font-family:"DM Sans",sans-serif;color:var(--ink)}' +
    '.sq>b{display:block;font:600 24px/1.15 "Cormorant Garamond",Georgia,serif;margin-bottom:6px}.sq>p{margin:0;font-size:14px;line-height:1.5;color:var(--smoke2,#7B796E)}' +
    '.sq ol{list-style:none;margin:16px 0;padding:0;display:flex;flex-direction:column;gap:10px}.sq li{display:flex;align-items:center;gap:10px;font-size:14px}' +
    '.sq li em{font-style:normal}.sq li span{width:26px;height:26px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font:700 12px "DM Sans",sans-serif;background:color-mix(in srgb,var(--gold2,#A8772A) 16%,transparent);color:var(--gold3,#8B6408)}' +
    '.sq-a{display:flex;flex-wrap:wrap;gap:8px}.sq-b{display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 16px;border-radius:12px;border:1px solid var(--cb,rgba(0,0,0,.12));background:var(--card,#fff);color:var(--ink);font:600 14px "DM Sans",sans-serif;text-decoration:none;cursor:pointer}' +
    '.sq-b.dark{background:var(--btn-bg,#1A1A16);color:var(--btn-ink,#fff);border-color:transparent}.sq-b.ghost{border-style:dashed}.sq-st{margin-top:12px!important;font-size:13px!important;color:var(--e-mid,#55623F)!important;min-height:1em}';
  document.head.appendChild(css);
})();
