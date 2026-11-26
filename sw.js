/* Recipe-and-more — service worker: l'app si apre anche senza rete.
   · pagina: prima la rete (sempre l'ultima versione), se non risponde in fretta la copia salvata
   · file dell'app (js, css, icone): subito dalla copia salvata e intanto si scarica la nuova;
     se è cambiata, l'app mostra «Versione nuova pronta · Aggiorna»
   · librerie esterne e font: dalla copia salvata
   · dati (Supabase, /api): mai salvati qui; le ricette offline le tiene l'app e le invia al ritorno della rete */
var V = 'rm-v2';
function shellFrom(html) {
  var out = ['/', '/index.html', '/config.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'], re = /(?:src|href)="(\/[^"#?]+\.(?:js|css|png|svg|webmanifest))"/g, m;
  while ((m = re.exec(html))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}
self.addEventListener('install', function (e) {
  e.waitUntil(fetch('/index.html', { cache: 'reload' }).then(function (r) { return r.text(); }).then(function (html) {
    return caches.open(V).then(function (c) { return Promise.all(shellFrom(html).map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); })); });
  }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V && k !== 'rc-photos-v1'; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function fresh(req, ms) {
  return new Promise(function (ok) {
    var done = false, fb = function () { return caches.match(req, { ignoreSearch: true }).then(function (c) { return c || caches.match('/index.html'); }); };
    var t = setTimeout(function () { fb().then(function (c) { if (c && !done) { done = true; ok(c); } }); }, ms);
    fetch(req).then(function (r) {
      if (r && r.ok && r.type === 'basic') { var cp = r.clone(); caches.open(V).then(function (c) { c.put(req, cp); }); }
      if (!done) { done = true; clearTimeout(t); ok(r); }
    }).catch(function () { fb().then(function (c) { if (!done) { done = true; clearTimeout(t); ok(c || Response.error()); } }); });
  });
}
var avvisoT = null;
function avvisa() { clearTimeout(avvisoT); avvisoT = setTimeout(function () { self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ tipo: 'rm-aggiornato' }); }); }); }, 800); }
function firma(r) { return r ? [r.headers.get('etag') || '', r.headers.get('last-modified') || '', r.headers.get('content-length') || ''].join('|') : ''; }
function swr(e, req) {
  return caches.open(V).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) {
        if (r && r.ok && r.type === 'basic') { var cambiato = hit && firma(hit) !== firma(r), cp = r.clone(); c.put(req, cp).then(function () { if (cambiato) avvisa(); }); }
        return r;
      });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net.catch(function () { return c.match(req, { ignoreSearch: true }).then(function (x) { return x || Response.error(); }); });
    });
  });
}
function saved(req) {
  return caches.match(req).then(function (c) {
    return c || fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(V).then(function (ca) { ca.put(req, cp); }); } return r; });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin === location.origin) {
    if (u.pathname === '/config.js') { e.respondWith(fresh(req, 3000)); return; }   /* chiavi pubbliche: servono anche offline */
    if (/^\/(api|sb\/)/.test(u.pathname) || u.pathname === '/sw.js') return;
    if (req.mode === 'navigate') { e.respondWith(fresh(req, 3500)); return; }
    if (/\.(js|css|webmanifest|png|svg|woff2?)$/.test(u.pathname)) { e.respondWith(swr(e, req)); return; }
    return;
  }
  if (/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com)$/.test(u.hostname)) { e.respondWith(saved(req)); return; }
});
