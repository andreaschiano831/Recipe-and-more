// Tiene sveglio il database Supabase (il piano gratuito va in pausa dopo 7 giorni senza attività).
// Vercel lo chiama ogni giorno da solo (vedi "crons" in vercel.json); si può aprire anche a mano: /api/keepalive
// Esegue la funzione public.keepalive(): una lettura minima, non legge né cambia dati degli account.
const SB_URL = process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_ANON_KEY || '';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret && req.query && req.query.key !== secret) {
    return res.status(401).json({ ok: false, error: 'Non autorizzato' });
  }
  if (!SB_URL || !SB_KEY) return res.status(503).json({ ok: false, error: 'SUPABASE_URL / SUPABASE_ANON_KEY non configurate su Vercel' });
  const out = { ok: false, at: new Date().toISOString() };
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/keepalive', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, body: '{}' });
    out.status = r.status; out.ok = r.ok;
  } catch (e) { out.error = String(e && e.message || e); }
  return res.status(out.ok ? 200 : 502).json(out);
};
