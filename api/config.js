// /config.js → configurazione pubblica dell'app (URL e chiave pubblica "anon" di Supabase).
// Si imposta una volta sola su Vercel: Settings → Environment Variables → SUPABASE_URL, SUPABASE_ANON_KEY.
// La chiave anon è pubblica per natura: i dati sono protetti dalle regole RLS del database.
module.exports = function handler(req, res) {
  const cfg = { supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '' };
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send('window.WL_CONFIG=' + JSON.stringify(cfg) + ';');
};
