/* offline.js — l'app funziona anche senza rete.
   · registra il service worker (che tiene una copia dell'app sul dispositivo)
   · mostra quando si è senza rete e quante modifiche aspettano di partire
   · al ritorno della rete invia le modifiche in coda e ricarica le ricette
   · avvisa quando c'è una versione nuova dell'app */
(function () {
  'use strict';
  var inCO = /^\/ricette(\/|$)/.test(location.pathname); /* in Chef's Organizer ci pensa il suo service worker */
  if ('serviceWorker' in navigator && !inCO && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
  function q() { try { return (window._syncQueue || []).length; } catch (e) { return 0; } }
  function pill() {
    var p = document.getElementById('offPill');
    if (navigator.onLine) { if (p) { p.classList.add('back'); p.querySelector('span').textContent = q() ? 'Rete tornata · invio le modifiche…' : 'Rete tornata'; setTimeout(function () { p.remove(); }, 2200); } return; }
    if (!p) { p = document.createElement('div'); p.id = 'offPill'; p.setAttribute('role', 'status'); p.innerHTML = '<i></i><span></span>'; document.body.appendChild(p); }
    p.classList.remove('back');
    var n = q(); p.querySelector('span').textContent = 'Senza rete · lavori lo stesso' + (n ? ' · ' + n + (n === 1 ? ' modifica' : ' modifiche') + ' in attesa' : '');
  }
  addEventListener('offline', pill);
  addEventListener('online', function () {
    pill();
    setTimeout(function () { try { if (typeof flushQueue === 'function') flushQueue(); } catch (e) {} try { if (typeof loadRecipes === 'function') loadRecipes(); } catch (e) {} }, 600);
  });
  setInterval(function () { if (!navigator.onLine) pill(); }, 5000);
  if (document.readyState !== 'loading') setTimeout(function () { if (!navigator.onLine) pill(); }, 500); else document.addEventListener('DOMContentLoaded', function () { if (!navigator.onLine) pill(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) {
    if (!e.data || e.data.tipo !== 'rm-aggiornato' || document.getElementById('updPill')) return;
    var d = document.createElement('div'); d.id = 'updPill'; d.innerHTML = '<span>Versione nuova pronta</span><button type="button">Aggiorna</button><button type="button" aria-label="Più tardi">×</button>';
    var b = d.querySelectorAll('button'); b[0].onclick = function () { location.reload(); }; b[1].onclick = function () { d.remove(); };
    document.body.appendChild(d);
  });
  var st = document.createElement('style');
  st.textContent = '#offPill,#updPill{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:9800;display:flex;align-items:center;gap:9px;padding:9px 15px;border-radius:99px;background:#1f1b16;color:#f3efe6;font:600 13px "DM Sans",system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);animation:offIn .3s ease}' +
    '#offPill i{width:8px;height:8px;border-radius:50%;background:#E0A13A;box-shadow:0 0 0 4px rgba(224,161,58,.2)}#offPill.back i{background:#4CAF6A;box-shadow:0 0 0 4px rgba(76,175,106,.2)}' +
    '#updPill button{border:0;background:#f3efe6;color:#1f1b16;border-radius:99px;height:28px;padding:0 12px;font:700 12.5px "DM Sans",sans-serif;cursor:pointer}#updPill button+button{background:none;color:#f3efe6;padding:0 4px;font-size:18px}' +
    '@keyframes offIn{from{opacity:0;transform:translate(-50%,-10px)}}';
  document.head.appendChild(st);
})();
