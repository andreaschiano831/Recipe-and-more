/* ════════════════════════════════════════════════════════════════════
   IMPORTA DA LINK — legge una pagina e restituisce il testo della ricetta
   · siti di ricette: dati strutturati schema.org (JSON-LD Recipe)
   · TikTok: didascalia del video (oEmbed pubblico)
   · Instagram: didascalia del post/reel (pagina embed pubblica)
   · YouTube: titolo e descrizione del video
   · altro: testo principale della pagina
   Non scarica video né audio: legge solo testi pubblici.
   Protezioni: solo http/https, niente indirizzi interni (SSRF), redirect
   controllati, timeout e limite di dimensione.
   ════════════════════════════════════════════════════════════════════ */
'use strict';
const dns = require('dns').promises;
const net = require('net');

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MAX = 3 * 1024 * 1024;

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
  }
  const s = ip.toLowerCase();
  if (s.startsWith('::ffff:')) return privateIp(s.slice(7));
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb');
}
async function safeUrl(u) {
  let url; try { url = new URL(u); } catch (e) { throw new Error('Link non valido'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Il link deve iniziare con http o https');
  if (url.username || url.password) throw new Error('Link non valido');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error('Link non raggiungibile');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error('Sito non trovato: controlla il link');
  if (addrs.some((a) => privateIp(a.address))) throw new Error('Link non raggiungibile');
  return url;
}
/* scarica seguendo al massimo 5 redirect, ognuno controllato */
async function get(u, accept) {
  let url = await safeUrl(u);
  for (let i = 0; i < 6; i++) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 9000);
    let r;
    try {
      r = await fetch(url.href, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': UA, Accept: accept || 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7' } });
    } catch (e) { clearTimeout(tm); throw new Error(e.name === 'AbortError' ? 'Il sito non risponde' : 'Non riesco a raggiungere il sito'); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { clearTimeout(tm); url = await safeUrl(new URL(r.headers.get('location'), url).href); continue; }
    const reader = r.body && r.body.getReader ? r.body.getReader() : null;
    let buf = '', size = 0; const dec = new TextDecoder('utf-8');
    if (reader) {
      for (;;) { const c = await reader.read().catch(() => ({ done: true })); if (c.done) break; size += c.value.length; if (size > MAX) { ctl.abort(); break; } buf += dec.decode(c.value, { stream: true }); }
    } else buf = await r.text();
    clearTimeout(tm);
    return { status: r.status, url: url.href, body: buf, type: r.headers.get('content-type') || '' };
  }
  throw new Error('Troppi reindirizzamenti');
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', egrave: 'è', eacute: 'é', agrave: 'à', ograve: 'ò', ugrave: 'ù', igrave: 'ì', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', rsquo: '’', lsquo: '‘', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»' };
function decode(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(n); } catch (x) { return m; } }
    return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
  });
}
function strip(html) {
  return decode(String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, ''))
    .replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function meta(html, name) {
  const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + name.replace(/[:.]/g, '\\$&') + '["\'][^>]*>', 'i');
  const m = html.match(re); if (!m) return '';
  const c = m[0].match(/content=["']([\s\S]*?)["']/i); return c ? decode(c[1]).trim() : '';
}

/* JSON-LD schema.org Recipe → testo */
function ldRecipes(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    let j; try { j = JSON.parse(m[1].trim()); } catch (e) { try { j = JSON.parse(decode(m[1].trim())); } catch (x) { continue; } }
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(walk);
      const t = o['@type']; if (t === 'Recipe' || (Array.isArray(t) && t.indexOf('Recipe') >= 0)) out.push(o);
      if (o['@graph']) walk(o['@graph']);
    })(j);
  }
  return out;
}
function steps(ins) {
  const out = [];
  (function walk(x) {
    if (!x) return;
    if (typeof x === 'string') { strip(x).split(/\n+/).forEach((l) => { if (l.trim()) out.push(l.trim()); }); return; }
    if (Array.isArray(x)) return x.forEach(walk);
    if (x['@type'] === 'HowToSection') { if (x.name) out.push('— ' + strip(x.name) + ' —'); return walk(x.itemListElement); }
    if (x.text) out.push(strip(x.text)); else if (x.name) out.push(strip(x.name));
  })(ins);
  return out;
}
function recipeText(r) {
  const L = [];
  if (r.name) L.push(strip(r.name));
  const y = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield; if (y) L.push('Dosi: ' + strip(String(y)));
  const t = [r.prepTime && 'preparazione ' + r.prepTime, r.cookTime && 'cottura ' + r.cookTime].filter(Boolean); if (t.length) L.push('Tempi: ' + t.join(', '));
  const ing = r.recipeIngredient || r.ingredients || [];
  if (ing.length) { L.push('', 'INGREDIENTI'); (Array.isArray(ing) ? ing : [ing]).forEach((i) => L.push('- ' + strip(String(i)))); }
  const st = steps(r.recipeInstructions);
  if (st.length) { L.push('', 'PROCEDIMENTO'); let n = 0; st.forEach((s) => L.push(s.startsWith('—') ? s : (++n) + '. ' + s)); }
  if (r.description) L.push('', 'Note: ' + strip(r.description).slice(0, 600));
  return L.join('\n').trim();
}
function mainText(html) {
  let h = html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const art = h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<main[\s\S]*?<\/main>/i);
  return strip(art ? art[0] : (h.match(/<body[\s\S]*<\/body>/i) || [h])[0]).slice(0, 14000);
}

/* ── social ── */
async function tiktok(url) {
  const r = await get('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), 'application/json');
  let j = null; try { j = JSON.parse(r.body); } catch (e) {}
  if (!j || !j.title) throw new Error('TikTok non mostra la didascalia di questo video (potrebbe essere privato)');
  return { kind: 'tiktok', title: '', author: j.author_name || '', text: decode(j.title), thumb: j.thumbnail_url || '' };
}
async function instagram(url) {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) throw new Error('Link Instagram non riconosciuto: usa il link di un post o di un reel');
  const code = m[2];
  let text = '', author = '', thumb = '';
  try {
    const r = await get('https://www.instagram.com/p/' + code + '/embed/captioned/');
    const cap = r.body.match(/<div class=["']Caption["'][^>]*>([\s\S]*?)<div class=["']CaptionComments/i);
    if (cap) {
      const u = cap[1].match(/class=["']CaptionUsername["'][^>]*>([\s\S]*?)<\/a>/i); if (u) author = strip(u[1]);
      text = strip(cap[1].replace(/<a[^>]+class=["']CaptionUsername["'][\s\S]*?<\/a>/i, ''));
    }
    const im = r.body.match(/class=["']EmbeddedMediaImage["'][^>]+src=["']([^"']+)/i); if (im) thumb = decode(im[1]);
  } catch (e) {}
  if (!text) {
    try {
      const r = await get('https://www.instagram.com/' + (m[1].toLowerCase().startsWith('reel') ? 'reel' : 'p') + '/' + code + '/');
      const d = meta(r.body, 'og:description') || meta(r.body, 'description');
      const q = d.match(/:\s*["“]([\s\S]*)["”]\s*\.?$/); text = q ? q[1] : d;
      const a = d.match(/-\s*([^\s]+)\s+(?:on|il|el)\s/i); if (a) author = a[1];
      thumb = thumb || meta(r.body, 'og:image');
    } catch (e) {}
  }
  if (!text) throw new Error('Instagram non mostra la didascalia di questo post: potrebbe essere privato o richiedere l’accesso');
  return { kind: 'instagram', title: '', author: author, text: text, thumb: thumb };
}
async function youtube(url) {
  const r = await get(url);
  const pr = r.body.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
  let desc = ''; if (pr) { try { desc = JSON.parse('"' + pr[1] + '"'); } catch (e) {} }
  const title = meta(r.body, 'og:title') || meta(r.body, 'title');
  if (!desc) desc = meta(r.body, 'og:description');
  return { kind: 'youtube', title: title, author: '', text: desc, thumb: meta(r.body, 'og:image') };
}

async function readLink(raw) {
  const found = String(raw || '').match(/https?:\/\/[^\s<>"'«»]+/i);
  if (!found) throw new Error('Nel testo condiviso non trovo un link');
  let url = found[0].replace(/[).,;!?]+$/, '');
  /* risolvi i link brevi (vm.tiktok.com, instagr.am, youtu.be…) */
  if (/^(https?:\/\/)?(vm|vt)\.tiktok\.com|instagr\.am|^https?:\/\/(www\.)?tiktok\.com\/t\//i.test(url)) {
    try { const r = await get(url); url = r.url; } catch (e) {}
  }
  const host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  let res;
  if (/(^|\.)tiktok\.com$/.test(host)) res = await tiktok(url);
  else if (/(^|\.)instagram\.com$|^instagr\.am$/.test(host)) res = await instagram(url);
  else if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) res = await youtube(url);
  else {
    const r = await get(url);
    if (r.status >= 400) throw new Error('Il sito ha risposto con errore ' + r.status);
    if (!/html|xml|text/i.test(r.type)) throw new Error('Questo link non è una pagina web (per PDF o foto usa File o Foto)');
    const recs = ldRecipes(r.body);
    if (recs.length) res = { kind: 'recipe', title: strip(recs[0].name || ''), author: '', text: recs.map(recipeText).join('\n\n———\n\n'), thumb: (function (im) { return typeof im === 'string' ? im : Array.isArray(im) ? (typeof im[0] === 'string' ? im[0] : im[0] && im[0].url) : im && im.url; })(recs[0].image) || '' };
    else res = { kind: 'page', title: meta(r.body, 'og:title') || strip((r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''), author: '', text: mainText(r.body), thumb: meta(r.body, 'og:image') };
  }
  res.url = url; res.site = host;
  res.text = String(res.text || '').slice(0, 14000);
  /* una didascalia senza numeri di solito non contiene la ricetta (è detta a voce nel video) */
  res.thin = res.text.replace(/\s+/g, ' ').length < 25 || !/\d/.test(res.text);
  return res;
}
/* foto della ricetta (anteprima del link): scarica solo immagini, massimo 3 MB */
async function getImage(u) {
  let url = await safeUrl(u);
  for (let i = 0; i < 6; i++) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 9000);
    let r;
    try { r = await fetch(url.href, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8' } }); }
    catch (e) { clearTimeout(tm); throw new Error('Foto non raggiungibile'); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { clearTimeout(tm); url = await safeUrl(new URL(r.headers.get('location'), url).href); continue; }
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (r.status >= 400 || !/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) { clearTimeout(tm); throw new Error('Il link non porta a una foto'); }
    const chunks = []; let size = 0; const reader = r.body.getReader();
    for (;;) { const c = await reader.read(); if (c.done) break; size += c.value.length; if (size > 3 * 1024 * 1024) { ctl.abort(); clearTimeout(tm); throw new Error('Foto troppo grande'); } chunks.push(c.value); }
    clearTimeout(tm);
    return 'data:' + type + ';base64,' + Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('base64');
  }
  throw new Error('Troppi reindirizzamenti');
}
module.exports = { readLink, getImage };
