// «Resta connesso»: copia del token di rinnovo della sessione in un cookie protetto del sito.
// Safari svuota la memoria dei siti dopo 7 giorni senza visite; i cookie impostati dal server restano.
// Il cookie è HttpOnly (gli script non lo leggono), Secure, SameSite=Strict e viaggia solo verso /api/keep.
// POST {rt} salva · GET restituisce il token alla pagina dello stesso sito · DELETE lo cancella.
const NAME = 'wl_rt';
const MAX_AGE = 400 * 24 * 3600; // il massimo che i browser accettano

function cookie(value, maxAge) {
  return `${NAME}=${value}; Path=/api/keep; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}
function read(req) {
  const raw = String(req.headers.cookie || '');
  const m = raw.split(/;\s*/).filter((c) => c.indexOf(NAME + '=') === 0)[0];
  if (!m) return null;
  try { return JSON.parse(Buffer.from(m.slice(NAME.length + 1), 'base64url').toString('utf8')); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // solo dalla pagina dell'app: un altro sito non può mandare JSON con questa intestazione senza permesso (CORS)
  if (req.headers['x-wl'] !== '1') return res.status(403).json({ error: 'Richiesta non valida' });
  if (req.method === 'GET') {
    const v = read(req);
    return res.status(200).json(v && v.rt ? { rt: v.rt, uid: v.uid || null } : {});
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookie('', 0));
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'POST') {
    if (!/application\/json/i.test(String(req.headers['content-type'] || ''))) return res.status(415).json({ error: 'Serve JSON' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const rt = String((body && body.rt) || '').trim();
    if (!rt || rt.length > 512 || /[\s;,]/.test(rt)) return res.status(400).json({ error: 'Token non valido' });
    const uid = String((body && body.uid) || '').slice(0, 64);
    const v = Buffer.from(JSON.stringify({ rt, uid, at: Date.now() }), 'utf8').toString('base64url');
    res.setHeader('Set-Cookie', cookie(v, MAX_AGE));
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Metodo non consentito' });
};
