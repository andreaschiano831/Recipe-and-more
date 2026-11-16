# Ricettario · versione bianca (multi-account)

Stessa app di PastryRecipe, con tutte le sue funzioni, ma **bianca**:

- **Login con Google** (Supabase Auth), con la possibilità di **cambiare account**
- **Dati separati per ogni account**: ricette, documenti di stampa, piatti, categorie, tema, biblioteca (libri, segnalibri, note, file) e chiave AI. Sul database lo garantiscono le regole RLS; sul dispositivo ogni account ha il suo spazio di memoria
- **Logo, nome e sottotitolo personalizzabili per account**, mostrati in home, nel menu, nei documenti di stampa e nella **pagina d'accesso**
- **Indirizzo personale della pagina d'accesso**: `https://tuaapp.vercel.app/?a=nome-account` mostra il logo e il nome di quell'account prima del login
- **Sezioni del ricettario personalizzabili**: rinomina, riordina, aggiungi o togli; quando togli una sezione, le sue ricette vengono spostate
- Nessuna ricetta precaricata: ogni account parte vuoto
- AI (Groq): la chiave sul server Vercel vale per tutti gli account; la chiave personale dell'account, se presente, **ha la precedenza**. L'API accetta solo account collegati

Tutto il resto è identico all'originale: studio d'inserimento con l'AI (foto, testo, PDF/Word, a mano) con il controllo anti-invenzione, moltiplicatore di dosi, percentuali, calcoli e bilanciamento con i consigli dell'AI, modalità cucina, documenti di stampa con PDF e Word, biblioteca EPUB/PDF con traduzione, duplicati, temi, funzionamento offline con coda di sincronizzazione, backup, PWA e keepalive.

## Messa online (una volta sola)

### 1. Supabase
1. Crea un nuovo progetto su [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: incolla tutto `supabase/schema.sql` e premi **Run**.
3. **Project Settings → API**: copia il *Project URL* e la chiave *anon public*.

### 2. Login con Google
1. [Google Cloud Console](https://console.cloud.google.com) → *APIs & Services → Credentials* → **Create credentials → OAuth client ID** (tipo *Web application*).
   - *Authorized redirect URIs*: `https://<il-tuo-progetto>.supabase.co/auth/v1/callback`
2. Supabase → **Authentication → Sign In / Providers → Google**: attivalo e incolla *Client ID* e *Client Secret*.
3. Supabase → **Authentication → URL Configuration**:
   - *Site URL*: `https://<la-tua-app>.vercel.app`
   - *Redirect URLs*: `https://<la-tua-app>.vercel.app/**`

### 3. Vercel
1. *Add New → Project* → importa questo repository (nessun build: è un sito statico con le API in `api/`).
2. **Settings → Environment Variables**:
   | Variabile | Valore |
   |---|---|
   | `SUPABASE_URL` | Project URL di Supabase |
   | `SUPABASE_ANON_KEY` | chiave anon public |
   | `GROQ_API_KEY` | (facoltativa) la tua chiave Groq, valida per tutti gli account |
   | `CRON_SECRET` | (facoltativa) protegge `/api/keepalive` |
3. **Redeploy**.

Facoltativo: in GitHub → *Settings → Secrets and variables → Actions → Variables* aggiungi `APP_URL` (l'indirizzo dell'app) per il keepalive di riserva.

## File
- `index.html`: l'app (stessa struttura dell'originale)
- `white.js`: lo strato account (login, separazione dei dati, logo, sezioni, sincronizzazione delle impostazioni)
- `api/import.js`: l'AI sul server · `api/config.js`: serve `/config.js` con URL e chiave pubblica · `api/keepalive.js`
- `supabase/schema.sql`: il database completo, con le regole di sicurezza
