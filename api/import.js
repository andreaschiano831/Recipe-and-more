// Inserimento ricette con AI dal server (versione bianca multi-account):
// ogni richiesta deve arrivare da un account collegato (token Supabase dell'utente).
// la chiave Groq resta su Vercel (variabile GROQ_API_KEY).
// GET  /api/import            -> { ok, configured }
// POST /api/import  { image } -> { recipes, source }   (una foto, data URL jpeg/png/webp)
// POST /api/import  { text }  -> { recipes }
// POST /api/import  { stt }   -> { text }      (pezzo di audio di un video, WAV base64)
//
// Le foto si analizzano in DUE passaggi per evitare dati inventati:
//   1) il modello visivo TRASCRIVE il testo della foto così com'è (OCR, niente interpretazioni)
//   2) un modello di testo trasforma la trascrizione in ricette, usando solo ciò che c'è scritto
//   3) ogni quantità viene confrontata con la trascrizione: quelle non trovate vengono segnalate
// Il blocco CORE è identico a quello usato nell'app quando la chiave è sul telefono.

/* ===== CORE-START ===== */
var AI_VISION = ['qwen/qwen3.8-27b', 'meta-models/muse-spark-open', 'meta-llama/llama-4-scout-17b-16e-instruct'];
var AI_TEXT = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
var AI_SECTIONS = { colazioni: 'Monoporzioni', 'fine-dining': 'Fine Dining', gelateria: 'Gelateria', torte: 'Torte' };
var AI_CATEGORIES = ['Creme', 'Paste', 'Torte', 'Lievitati', 'Pasticcini', 'Marmellate', 'Ganache', 'Mousse', 'Gelatine', 'Gelati', 'Sorbetti', 'Semifreddi', 'Granite', 'Basi', 'Glasse', 'Biscotti', 'Altro'];

var AI_OCR_PROMPT = 'Sei un sistema OCR di precisione. Trascrivi ESATTAMENTE tutto il testo visibile nell\'immagine, riga per riga, nello stesso ordine.\n' +
  'REGOLE:\n' +
  '- Copia numeri, virgole, punti e unità ESATTAMENTE come sono scritti (es. "450", "1,5", "70 g", "gr 200"). Non arrotondare e non convertire.\n' +
  '- Non tradurre, non correggere, non riassumere, non completare ricette, non aggiungere ingredienti o passaggi che non vedi.\n' +
  '- Mantieni le righe di una tabella sulla stessa riga separando le colonne con " | ".\n' +
  '- Se una parola o un numero non è leggibile scrivi [?] al suo posto: non indovinare.\n' +
  '- Ignora tutto ciò che non è testo (sfondi, riflessi, oggetti).\n' +
  '- Rispondi SOLO con la trascrizione, senza commenti. Se nell\'immagine non c\'è testo leggibile rispondi esattamente: NESSUN TESTO';

function aiRecipePrompt() {
  var secs = Object.keys(AI_SECTIONS).map(function (k) { return '"' + AI_SECTIONS[k] + '"'; }).join(', ');
  return 'Sei l\'assistente di un pastry chef stellato. Ricevi un testo (spesso la trascrizione di una foto) e ne estrai le ricette. Restituisci SOLO un oggetto JSON, senza testo fuori dal JSON, in questo formato:\n' +
    '{"recipes":[{"name":"","section":"","category":"","dish_group":"","yield_note":"","ingredients":[{"name":"","quantity":0,"unit":"g","note":""}],"steps":[{"body":"","duration_min":null,"temperature":""}],"notes":""}]}\n' +
    'REGOLE ASSOLUTE:\n' +
    '1. Usa SOLO informazioni presenti nel testo. NON inventare ingredienti, quantità, passaggi, tempi o temperature. Se una quantità non è scritta o è [?], metti "quantity": null.\n' +
    '2. Ogni quantità deve essere IDENTICA al numero scritto nel testo (usa il punto come decimale: "1,5" diventa 1.5). Non convertire unità, non ricalcolare, non arrotondare.\n' +
    '3. Ogni preparazione con un proprio titolo (es. "Massa macaron", "Cremoso pesca", "Glassa") è una ricetta SEPARATA. Se fanno parte dello stesso dolce, metti il nome del dolce in "dish_group". Se il testo non ha un titolo, dai un nome breve e descrittivo basato sugli ingredienti principali.\n' +
    '4. Unità: g, kg, ml, l, cl, n°, q.b., foglio, bacca, %. Le misure americane (cup, tbsp, tsp, oz, lb, fl oz, stick) copiale così come sono: le converte l\'app. "gr" diventa "g"; uova/tuorli contati diventano "n°". Se il numero non ha unità ma il contesto è una ricetta in grammi, usa "g".\n' +
    '5. Nomi degli ingredienti in italiano professionale (traduci solo se il testo è in un\'altra lingua; mantieni marchi e nomi propri, es. "Ivoire", "Petra").\n' +
    '6. "steps": un passaggio per azione, nell\'ordine del testo. Riporta minuti in "duration_min" e temperature in "temperature" SOLO se scritti.\n' +
    '7. "section": scegli tra ' + secs + '. "category" deve essere una di: ' + AI_CATEGORIES.join(', ') + '.\n' +
    '8. "yield_note": la resa solo se scritta, altrimenti "". "notes": solo note presenti nel testo, altrimenti "".\n' +
    '9. Ignora testo che non fa parte di una ricetta (pubblicità, menu, commenti).';
}

function aiStripThink(t) { return String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); }
function aiGone(m) { return /does not exist|decommissioned|deprecated|not found|do not have access|model_not_found|not supported/i.test(m); }

function aiExtractJson(text) {
  var clean = String(text).replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch (e) {}
  var obj = clean.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch (e) {} }
  var arr = clean.match(/\[[\s\S]*\]/);
  if (arr) { try { return { recipes: JSON.parse(arr[0]) }; } catch (e) {} }
  return null;
}
function aiSectionKey(name) { var k0 = aiSectionKey0(name); return AI_SECTIONS[k0] ? k0 : ''; }
function aiSectionKey0(name) {
  var n = String(name || '').trim().toLowerCase(), k;
  if (!n) return '';
  for (k in AI_SECTIONS) if (k === n || AI_SECTIONS[k].toLowerCase() === n) return k;
  for (k in AI_SECTIONS) { var v = AI_SECTIONS[k].toLowerCase(); if (n.indexOf(v) > -1 || v.indexOf(n) > -1) return k; }
  if (/gelat|sorbett|semifredd|granit/.test(n)) return 'gelateria';
  if (/torta|torte|crostat/.test(n)) return 'torte';
  if (/dining|piatto/.test(n)) return 'fine-dining';
  if (/colazion|monoporz|lievitat|viennois/.test(n)) return 'colazioni';
  return '';
}
function aiCategory(c) {
  var n = String(c || '').trim().toLowerCase();
  return AI_CATEGORIES.filter(function (x) { return x.toLowerCase() === n; })[0] ||
    AI_CATEGORIES.filter(function (x) { return n && (n.indexOf(x.toLowerCase()) > -1 || x.toLowerCase().indexOf(n) > -1); })[0] || 'Altro';
}
function aiNum(q) {
  if (q === null || q === undefined || q === '') return null;
  var v = typeof q === 'number' ? q : parseFloat(String(q).replace(',', '.'));
  return isFinite(v) ? v : null;
}
// numeri presenti nella trascrizione (gestisce 1,5 / 1.5 / 1.000)
function aiNumbersIn(text) {
  var set = {}, m, re = /\d+(?:[.,]\d+)*/g;
  while ((m = re.exec(String(text || ''))) !== null) {
    var s = m[0];
    set[parseFloat(s.replace(',', '.'))] = 1;
    set[parseFloat(s.replace(/\./g, '').replace(',', '.'))] = 1;
    set[parseFloat(s.replace(/,/g, ''))] = 1;
  }
  return set;
}

/* misure americane → grammi (densità per tazza delle voci più comuni in pasticceria) e °F → °C nel procedimento */
var AI_CUP = [
  [/farina di mandorl|almond flour|almond meal/, 96], [/farina|flour/, 125], [/zucchero di canna|brown sugar|muscovad/, 213], [/zucchero a velo|powdered sugar|icing sugar|confectioner/, 120],
  [/zucchero|sugar/, 200], [/burro|butter/, 227], [/panna|cream(?! cheese)/, 238], [/latte condensato|condensed milk/, 306], [/latte|milk/, 242], [/acqua|water|caff|coffee/, 237],
  [/olio|oil/, 218], [/miele|honey/, 340], [/sciroppo d.acero|maple/, 322], [/sciroppo di (mais|glucosio)|corn syrup|glucose/, 328], [/cacao|cocoa/, 85], [/avena|oats/, 90],
  [/gocce di cioccolato|chocolate chips|cioccolato|chocolate/, 170], [/amido|maizena|cornstarch|starch/, 128], [/yogurt/, 245], [/panna acida|sour cream/, 230], [/formaggio cremoso|cream cheese|mascarpone|ricotta/, 232],
  [/burro di arachidi|peanut butter/, 258], [/cocco|coconut/, 85], [/noci|nocciol|mandorl|pistacch|nuts|walnut|pecan|hazelnut|almond/, 120], [/lampon|mirtill|fragol|frutti|berr/, 150],
  [/succo|juice/, 245], [/sale|salt/, 288], [/riso|rice/, 185], [/uvett|raisin/, 150], [/pangrattato|breadcrumb/, 110]
];
var AI_SPOON = [[/bicarbonato|baking soda/, 4.8], [/lievito (per dolci|chimico|in polvere)|baking powder/, 4], [/lievito|yeast/, 3.1], [/sale|salt/, 6], [/vaniglia|vanilla/, 4.2], [/cannella|cinnamon|spezie|spice|zenzero|ginger|noce moscata|nutmeg/, 2.6], [/gelatina|gelatin/, 3.1], [/cacao|cocoa/, 2.5], [/zucchero|sugar/, 4.2], [/farina|flour|amido|cornstarch/, 2.6], [/burro|butter/, 4.7], [/olio|oil/, 4.5], [/miele|honey/, 7], [/acqua|water|latte|milk|succo|juice|liquore|rum|liqueur/, 4.9]];
function aiUsUnit(u) {
  u = String(u || '').toLowerCase().replace(/\.$/, '').trim();
  if (/^(cups?|c|tazz(a|e) (americana|us))$/.test(u)) return 'cup';
  if (/^(tbsp|tbs|tbl|tablespoons?)$/.test(u)) return 'tbsp';
  if (/^(tsp|teaspoons?)$/.test(u)) return 'tsp';
  if (/^(fl ?oz|fluid ounces?)$/.test(u)) return 'floz';
  if (/^(oz|ounces?)$/.test(u)) return 'oz';
  if (/^(lbs?|pounds?)$/.test(u)) return 'lb';
  if (/^sticks?$/.test(u)) return 'stick';
  if (/^(pints?|pt)$/.test(u)) return 'pint';
  if (/^(quarts?|qt)$/.test(u)) return 'quart';
  return '';
}
function aiRoundG(v) { return v >= 100 ? Math.round(v / 5) * 5 : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10; }
function aiUsConvert(ings) {
  var notes = [];
  ings.forEach(function (row) {
    var k = aiUsUnit(row[2]), q = row[1]; if (!k || q == null) return;
    var n = String(row[0] || '').toLowerCase(), g = null, u = 'g', i;
    if (k === 'oz') g = q * 28.35; else if (k === 'lb') g = q * 453.6; else if (k === 'stick') g = q * 113;
    else if (k === 'floz' || k === 'pint' || k === 'quart') { g = q * { floz: 29.57, pint: 473, quart: 946 }[k]; u = 'ml'; for (i = 0; i < AI_CUP.length; i++) if (AI_CUP[i][0].test(n)) { g = g / 237 * AI_CUP[i][1]; u = 'g'; break; } }
    else {
      var cup = null; for (i = 0; i < AI_CUP.length; i++) if (AI_CUP[i][0].test(n)) { cup = AI_CUP[i][1]; break; }
      var sp = null; for (i = 0; i < AI_SPOON.length; i++) if (AI_SPOON[i][0].test(n)) { sp = AI_SPOON[i][1]; break; }
      if (k === 'cup') { if (cup) g = q * cup; else { g = q * 240; u = 'ml'; } }
      else { var tsp = sp || (cup ? cup / 48 : null); if (tsp) g = q * tsp * (k === 'tbsp' ? 3 : 1); else { g = q * (k === 'tbsp' ? 15 : 5); u = 'ml'; } }
    }
    if (g == null) return;
    notes.push(row[0] + ' ' + String(q).replace('.', ',') + ' ' + row[2] + ' → ' + String(aiRoundG(g)).replace('.', ',') + ' ' + u);
    row[1] = aiRoundG(g); row[2] = u;
  });
  return notes;
}
function aiFtoC(text, notes) {
  return String(text || '').replace(/(\d{2,3})\s*(?:°\s*F\b|° ?F\b|degrees? F(?:ahrenheit)?\b|gradi F(?:ahrenheit)?\b|ºF\b|F°)/gi, function (m, f) {
    var c = Math.round((+f - 32) * 5 / 9 / 5) * 5; if (notes && notes.indexOf(f + ' °F → ' + c + ' °C') < 0) notes.push(f + ' °F → ' + c + ' °C'); return c + ' °C';
  });
}
// dal formato "ricco" dell'AI al formato dell'app; se c'è la trascrizione, controlla le quantità
function aiToApp(r, source) {
  if (!r || typeof r !== 'object') return null;
  var n = String(r.name || r.n || '').trim();
  if (!n) return null;
  var nums = source ? aiNumbersIn(source) : null, warn = [];
  var ings = (Array.isArray(r.ingredients) ? r.ingredients : Array.isArray(r.i) ? r.i : []).map(function (x) {
    var row;
    if (Array.isArray(x)) row = [String(x[0] || '').trim(), aiNum(x[1]), String(x[2] || 'g').trim() || 'g'];
    else row = [String((x && x.name) || '').trim() + (x && x.note ? ' (' + String(x.note).trim() + ')' : ''), aiNum(x && x.quantity), String((x && x.unit) || 'g').trim() || 'g'];
    if (nums && row[0] && row[1] !== null && !nums[row[1]]) warn.push(row[0] + ' ' + row[1] + ' ' + row[2]);
    return row;
  }).filter(function (x) { return x[0]; });
  var conv = aiUsConvert(ings);
  var steps = (Array.isArray(r.steps) ? r.steps : []).map(function (s, i) {
    if (typeof s === 'string') return (i + 1) + '. ' + s.trim();
    var extra = [s && s.temperature ? String(s.temperature).trim() : '', s && s.duration_min ? s.duration_min + ' min' : ''].filter(Boolean).join(' · ');
    return (i + 1) + '. ' + String((s && s.body) || '').trim() + (extra ? ' (' + extra + ')' : '');
  }).filter(function (x) { return x.length > 3; });
  var parts = [];
  if (r.yield_note) parts.push('Resa: ' + String(r.yield_note).trim());
  if (steps.length) parts.push(steps.join('\n'));
  else if (r.p) parts.push(String(r.p).trim());
  var out = { n: n, c: aiCategory(r.category || r.c), s: aiSectionKey(r.section || r.s), i: ings };
  var piatto = String(r.dish_group || r.piatto || '').trim();
  if (piatto && piatto.toLowerCase() !== n.toLowerCase()) out.piatto = piatto;
  if (parts.length) out.p = aiFtoC(parts.join('\n\n'), conv);
  if (conv.length) out.nt = 'Convertito dalle misure americane: ' + conv.join('; ') + '.';
  /* le note della fonte non vanno nel procedimento: diventano un suggerimento del Bilanciamento */
  var notes = String(r.notes || '').trim();
  if (notes) out.ai_nt = notes;
  if (warn.length) out._warn = warn;
  return out;
}

// chat(kind, system, user, image, json) -> Promise<{text}|{error,_status}>
// solo lettura fedele di un'immagine (per unire più pagine prima di ordinarle in ricette)
async function aiOcrOnly(chat, image) {
  var o = await chat('vision', AI_OCR_PROMPT, 'Trascrivi il testo di questa immagine.', image, false);
  if (o.error) return o;
  var source = aiStripThink(o.text).replace(/^```[a-z]*\n?|```$/g, '').trim();
  if (/^NESSUN TESTO/i.test(source)) source = '';
  return { source: source };
}
async function aiExtract(chat, payload) {
  var source = '';
  if (payload.image) {
    var o = await chat('vision', AI_OCR_PROMPT, 'Trascrivi il testo di questa immagine.', payload.image, false);
    if (o.error) return o;
    source = aiStripThink(o.text).replace(/^```[a-z]*\n?|```$/g, '').trim();
    if (!source || /^NESSUN TESTO/i.test(source) || source.replace(/\[\?\]|\s/g, '').length < 8) {
      return { error: 'Non riesco a leggere il testo della foto. Prova con una foto più vicina, dritta e ben illuminata.', _status: 422, source: source };
    }
  } else {
    source = String(payload.text || '').slice(0, 24000);
  }
  var r = await chat('text', aiRecipePrompt(), source, null, true);
  if (r.error) return r;
  var parsed = aiExtractJson(r.text);
  var raw = Array.isArray(parsed && parsed.recipes) ? parsed.recipes : Array.isArray(parsed) ? parsed : parsed && (parsed.name || parsed.n) ? [parsed] : [];
  // le quantità si controllano sempre sulla fonte (trascrizione della foto o testo incollato)
  var recipes = raw.map(function (x) { return aiToApp(x, source); }).filter(Boolean);
  return payload.image ? { recipes: recipes, source: source } : { recipes: recipes };
}

// chiamata Groq con modelli di riserva
async function aiGroqChat(url, key, kind, system, user, image, json) {
  var models = kind === 'vision' ? AI_VISION : AI_TEXT, last = '';
  for (var mi = 0; mi < models.length; mi++) {
    var model = models[mi];
    var content = image ? [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: image } }] : user;
    var body = { model: model, temperature: 0, max_completion_tokens: 8000, messages: [{ role: 'system', content: system }, { role: 'user', content: content }] };
    if (json) body.response_format = { type: 'json_object' };
    if (model.indexOf('openai/gpt-oss') === 0) body.reasoning_effort = kind === 'vision' ? 'low' : 'medium';
    else if (model.indexOf('qwen/') === 0) body.reasoning_effort = 'none';
    var send = function (b) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(b) }); };
    var res = await send(body);
    var data = await res.json().catch(function () { return null; });
    var em = (data && data.error && data.error.message) || '';
    if (!res.ok && res.status === 400 && body.reasoning_effort && /reasoning/i.test(em)) {
      delete body.reasoning_effort; res = await send(body); data = await res.json().catch(function () { return null; }); em = (data && data.error && data.error.message) || '';
    }
    var out = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (res.ok && out) return { text: aiStripThink(out) };
    var msg = em || ('Errore Groq ' + res.status);
    if (res.status === 401) return { error: 'Chiave Groq non valida', _status: 401 };
    if (res.status === 429) return { error: 'Troppe richieste all’AI: attendi 30 secondi e riprova.', _status: 429 };
    last = msg;
    if (aiGone(msg) || res.status === 404) continue;
    if (json && /json|response_format/i.test(msg)) { json = false; delete body.response_format; mi--; continue; }
    return { error: msg, _status: res.status || 502 };
  }
  return { error: 'Nessun modello AI disponibile su Groq (' + last + ')', _status: 502 };
}
function aiTranslatePrompt(lang) {
  return 'Sei un traduttore specializzato in pasticceria e cucina professionale. Traduci in ' + lang + ' il testo che ricevi, in modo fedele e naturale, con la terminologia di laboratorio (es. "blind bake" = "cuocere in bianco", "egg wash" = "doratura", "sweet dough" = "pasta frolla", "half-dome molds" = "stampi a semisfera"). ' +
    'Mantieni ESATTAMENTE numeri, quantità, unità e temperature come scritti (non convertire), e la struttura: titoli, elenchi, a capo. Se una parola è illeggibile ([?]) lasciala così. Non aggiungere commenti, note o spiegazioni: rispondi solo con la traduzione.';
}
/* compiti brevi dell'AI su una ricetta già scritta: revisione, varianti, ricerca, traduzione. Rispondono sempre in JSON. */
var AI_TASKS = {
  review: 'Sei un executive pastry chef che rivede la ricetta di un collega prima del servizio. Ricevi ingredienti in grammi, procedimento e una stima di composizione. Controlla: rapporti e bilanciamento (zuccheri, grassi, solidi, acqua; per gelati POD/PAC), quantità di gelificanti e addensanti (gelatina, agar, pectina, amido: dose rispetto al peso), temperature e tempi (cottura crema inglese 82-84 °C, pâte à bombe 118-121 °C, cioccolato temperato, pastorizzazione), sicurezza (uova crude, raffreddamento rapido, abbattimento), passaggi mancanti o ambigui, errori evidenti di trascrizione (zeri in più, unità sbagliate). Sii concreto e severo ma giusto: non inventare problemi e non riscrivere la ricetta. Massimo 7 punti, prima i più gravi. Ogni correzione con quantità o temperatura precisa. Rispondi SOLO con JSON: {"voto":1-10,"sintesi":"una frase","punti":[{"livello":"errore|attenzione|ok","titolo":"massimo 6 parole","dettaglio":"una o due frasi","correzione":"cosa fare, con numeri, oppure stringa vuota"}]}. Scrivi in italiano.',
  subs: 'Sei un pastry chef esperto di sostituzioni tecniche. Ricevi una ricetta (ingredienti in grammi) e un obiettivo (es. senza glutine, senza lattosio, vegana, senza uova, meno zucchero). Riscrivi SOLO gli ingredienti necessari per raggiungere l\'obiettivo mantenendo struttura, resa e gusto il più possibile: usa sostituti professionali reali (es. farina di riso + amido di mais + gomma xantana per il glutine; latte e burro senza lattosio o grassi vegetali con lo stesso tenore di grasso; aquafaba, amidi o proteine vegetali per le uova; agar al posto della gelatina per vegano con dose corretta). Tieni invariati gli ingredienti che vanno già bene. Le quantità devono restare coerenti con il peso totale. Se un ingrediente non ha un sostituto credibile dillo nelle note. Rispondi SOLO con JSON: {"nome":"breve nome della variante","ingredienti":[["nome","quantità numero","unità"]],"cambi":[{"da":"ingrediente originale","a":"sostituto","perche":"massimo 12 parole"}],"note":"accorgimenti di procedimento, massimo 3 frasi"}. Scrivi in italiano.',
  search: 'Sei il motore di ricerca del ricettario di un laboratorio di pasticceria e cucina. Ricevi una DOMANDA in linguaggio naturale e un CATALOGO, una ricetta per riga nel formato id | nome | categoria | piatto | ingredienti principali | tecniche e note. Trova le ricette che rispondono davvero alla domanda (anche per sinonimi, tecniche, temperature, ingredienti presenti o assenti, stagione, uso). Rispetta le esclusioni ("senza uova" = nessun uovo, tuorlo o albume tra gli ingredienti). Ordina dalla più pertinente, massimo 12. Non inventare id: usa solo quelli del catalogo. Se nessuna risponde restituisci la lista vuota. Rispondi SOLO con JSON: {"risultati":[{"id":"id esatto dal catalogo","perche":"massimo 10 parole in italiano"}]}.',
  tr_en: 'You are a bilingual executive pastry chef. Translate the recipe below from Italian into professional kitchen English as used in Michelin-starred brigades (e.g. crème anglaise, pâte à bombe, sablé, glaze, insert, temper, bloom the gelatine, cook to 82 °C, chill in blast chiller). Keep every number, unit and temperature EXACTLY as written; keep grams and °C. Keep French technical names when English kitchens use them. Do not add, remove or reorder ingredients or steps. Reply ONLY with JSON: {"name":"","ingredients":["one translated ingredient name per input ingredient, same order"],"steps":["one translated step per input step, same order"],"notes":""}.'
};
async function aiTask(chat, task, input) {
  var sys = AI_TASKS[task];
  if (!sys) return { error: 'Compito AI sconosciuto', _status: 400 };
  var r = await chat('text', sys, String(input || '').slice(0, task === 'search' ? 16000 : 9000), null, true);
  if (r.error) return r;
  var j = null; try { j = JSON.parse(String(r.text).replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')); } catch (e) {}
  if (!j || typeof j !== 'object') return { error: 'Risposta AI non leggibile', _status: 502 };
  return { data: j };
}
/* ===== CORE-END ===== */

const GROQ_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
if (process.env.GROQ_VISION_MODEL) AI_VISION.unshift(process.env.GROQ_VISION_MODEL);
if (process.env.GROQ_TEXT_MODEL) AI_TEXT.unshift(process.env.GROQ_TEXT_MODEL);

/* trascrizione con Whisper su Groq, con modelli di riserva */
const GROQ_STT_URL = process.env.GROQ_STT_URL || 'https://api.groq.com/openai/v1/audio/transcriptions';
const AI_STT = ['whisper-large-v3-turbo', 'whisper-large-v3'];
if (process.env.GROQ_STT_MODEL) AI_STT.unshift(process.env.GROQ_STT_MODEL);
async function groqStt(key, buf, lang) {
  let last = '';
  for (const model of AI_STT) {
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: 'audio/wav' }), 'audio.wav');
    fd.append('model', model); fd.append('response_format', 'json'); fd.append('temperature', '0');
    fd.append('prompt', 'Ricetta di cucina o pasticceria: ingredienti, grammi, temperature, tempi.');
    if (/^[a-z]{2}$/.test(lang)) fd.append('language', lang);
    let r, d;
    try { r = await fetch(GROQ_STT_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd }); d = await r.json().catch(() => null); }
    catch (e) { return { error: 'Errore di connessione con il servizio di trascrizione', _status: 502 }; }
    if (r.ok && d && typeof d.text === 'string') return { text: d.text.trim() };
    const em = (d && d.error && d.error.message) || ('Errore Groq ' + r.status);
    if (r.status === 401) return { error: 'Chiave Groq non valida', _status: 401 };
    if (r.status === 429) return { error: 'Troppe richieste all’AI: attendi 30 secondi e riprova.', _status: 429 };
    last = em;
    if (aiGone(em) || r.status === 404) continue;
    return { error: em, _status: r.status || 502 };
  }
  return { error: 'Nessun modello di trascrizione disponibile (' + last + ')', _status: 502 };
}

const SB_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/(rest|auth|storage)\/v1.*$/i, '').replace(/\/+$/, '');
const SB_ANON = process.env.SUPABASE_ANON_KEY || '';
// verifica che la richiesta venga da un account collegato (login Google su Supabase)
async function authUser(req) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!tok || !SB_URL || !SB_ANON) return null;
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + tok } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}
// sezioni dell'account che chiede l'analisi: [[chiave, nome], ...]
function useSections(list) {
  const out = {};
  if (Array.isArray(list)) list.slice(0, 40).forEach(function (p) {
    if (Array.isArray(p) && p[0] && p[1]) out[String(p[0]).slice(0, 60)] = String(p[1]).slice(0, 60);
  });
  AI_SECTIONS = Object.keys(out).length ? out : { colazioni: 'Monoporzioni', 'fine-dining': 'Fine Dining', gelateria: 'Gelateria', torte: 'Torte' };
}
function sameOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const extra = String(process.env.IMPORT_ALLOWED_HOSTS || '').split(',').map((x) => x.trim()).filter(Boolean);
    return host === req.headers.host || extra.includes(host) || /^localhost(:\d+)?$/.test(host);
  } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: !!process.env.GROQ_API_KEY, version: 3 });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Richiesta non autorizzata' });
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'Accedi con il tuo account per usare l\u2019AI' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Richiesta non valida' });
  /* importa da link: legge solo testi pubblici, non serve la chiave AI */
  if (body.link) {
    try { return res.status(200).json(await require('./_link.js').readLink(String(body.link).slice(0, 2000))); }
    catch (e) { return res.status(422).json({ error: e.message || 'Non riesco a leggere il link' }); }
  }
  /* foto trovata nel link (anteprima della ricetta) */
  if (body.img) {
    try { return res.status(200).json({ data: await require('./_link.js').getImage(String(body.img).slice(0, 2000)) }); }
    catch (e) { return res.status(422).json({ error: e.message || 'Foto non disponibile' }); }
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: 'GROQ_API_KEY non configurata su Vercel' });
  useSections(body.sections);
  /* video: un pezzo di audio (WAV mono 16 kHz, base64) → testo parlato */
  if (body.stt) {
    const b64 = String(body.stt).replace(/^data:[^,]*,/, '');
    if (b64.length > 3600000) return res.status(413).json({ error: 'Pezzo di audio troppo grande' });
    const r = await groqStt(key, Buffer.from(b64, 'base64'), String(body.lang || ''));
    if (r.error) return res.status(r._status && r._status >= 400 ? r._status : 502).json({ error: r.error });
    return res.status(200).json({ text: r.text });
  }
  /* nella pagina fotografata c'è una foto del piatto? → riquadro da ritagliare */
  if (body.photobox && body.image) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(body.image))) return res.status(400).json({ error: 'Formato immagine non supportato' });
    const sys = 'Guardi la foto di una pagina di un libro di cucina, di un quaderno o di uno schermo. Cerca una FOTOGRAFIA del piatto o del dolce finito (non disegni decorativi, non loghi, non testo, non foto di passaggi piccole). Se c\'è, restituisci il riquadro che la contiene il più stretto possibile, escluso il testo. Coordinate da 0 a 1000 rispetto a larghezza e altezza dell\'immagine. Rispondi SOLO con JSON: {"foto":true,"box":[x1,y1,x2,y2],"cosa":"massimo 5 parole"} oppure {"foto":false}.';
    const r = await aiGroqChat(GROQ_URL, key, 'vision', sys, 'C\'è una foto del piatto finito in questa pagina?', String(body.image), true);
    if (r.error) return res.status(r._status && r._status >= 400 ? r._status : 502).json({ error: r.error });
    let o = null; try { o = JSON.parse(String(r.text).replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')); } catch (e) {}
    const b = o && o.foto && Array.isArray(o.box) && o.box.length === 4 ? o.box.map(Number) : null;
    const ok = b && b.every((x) => isFinite(x) && x >= 0 && x <= 1000) && b[2] - b[0] > 80 && b[3] - b[1] > 80;
    return res.status(200).json(ok ? { box: b, what: String(o.cosa || '').slice(0, 60) } : { box: null });
  }
  if (body.ocr && body.image) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(body.image))) return res.status(400).json({ error: 'Formato immagine non supportato' });
    const chat = (kind, system, user, img, json) => aiGroqChat(GROQ_URL, key, kind, system, user, img, json);
    const o = await aiOcrOnly(chat, String(body.image));
    if (o.error) return res.status(o._status && o._status >= 400 ? o._status : 502).json({ error: o.error });
    return res.status(200).json(o);
  }
  if (body.task) {
    const chat = (kind, system, user, img, json) => aiGroqChat(GROQ_URL, key, kind, system, user, img, json);
    const o = await aiTask(chat, String(body.task), body.input);
    if (o.error) return res.status(o._status && o._status >= 400 ? o._status : 502).json({ error: o.error });
    return res.status(200).json(o);
  }
  if (body.translate) {
    const lang = { it: 'italiano', en: 'inglese', fr: 'francese', es: 'spagnolo', de: 'tedesco' }[body.lang] || 'italiano';
    const r = await aiGroqChat(GROQ_URL, key, 'text', aiTranslatePrompt(lang), String(body.translate).slice(0, 9000), null, false);
    if (r.error) return res.status(r._status && r._status >= 400 ? r._status : 502).json({ error: r.error });
    return res.status(200).json({ text: r.text });
  }
  if (body.ask) {
    const sys = 'Sei il sous-chef di un laboratorio di pasticceria e cucina professionale. Rispondi in italiano, in modo pratico e conciso (massimo 6 frasi o un breve elenco), con quantità in grammi e temperature precise quando servono. Basati sulla ricetta fornita; se un dato manca dillo, non inventarlo.';
    const user = 'RICETTA\n' + String(body.context || '').slice(0, 9000) + '\n\nDOMANDA DELLO CHEF\n' + String(body.ask).slice(0, 1500);
    const r = await aiGroqChat(GROQ_URL, key, 'text', sys, user, null, false);
    if (r.error) return res.status(r._status && r._status >= 400 ? r._status : 502).json({ error: r.error });
    return res.status(200).json({ answer: r.text });
  }
  if (body.algcheck) {
    const sys = 'Sei un esperto di sicurezza alimentare (Reg. UE 1169/2011, allegato II). Ricevi una ricetta professionale. Individua quali dei 14 allergeni sono PRESENTI negli ingredienti, anche nascosti in semilavorati o prodotti composti (es. pralinato o gianduia: frutta a guscio; besciamella: latte e glutine; salsa di soia: soia e glutine; pesto: frutta a guscio e latte; salsa worcester: pesce; vino o aceto: solfiti; pan di spagna: uova e glutine). Non includere tracce ipotetiche. Se non sei sicuro, non includerlo. Rispondi SOLO con JSON: {"allergeni":[{"k":"chiave","perche":"ingrediente che lo contiene, massimo 8 parole"}]}. Chiavi ammesse: glutine, latte, uova, frutta_guscio, arachidi, soia, sesamo, pesce, crostacei, molluschi, sedano, senape, solfiti, lupini.';
    const r = await aiGroqChat(GROQ_URL, key, 'text', sys, String(body.algcheck).slice(0, 8000), null, true);
    if (r.error) return res.status(r._status && r._status >= 400 ? r._status : 502).json({ error: r.error });
    return res.status(200).json({ text: r.text });
  }
  if (body.advice) {
    const sys = 'Sei un pastry chef consulente di alto livello. Ricevi una ricetta con calcoli di composizione stimati. Rispondi in italiano con 3-6 consigli pratici e brevi per migliorarla o bilanciarla (zuccheri, grassi, solidi, struttura, dolcezza; per gelati e sorbetti anche POD/PAC e servizio). Per ogni correzione indica la quantità in grammi. Usa solo i dati forniti, non inventare ingredienti che non servono; se i dati non bastano dillo. Niente premesse, solo elenco puntato.';
    const r = await aiGroqChat(GROQ_URL, key, 'text', sys, String(body.advice).slice(0, 8000), null, false);
    if (r.error) return res.status(r._status && r._status >= 400 ? r._status : 502).json({ error: r.error });
    return res.status(200).json({ advice: r.text });
  }
  const image = body.image ? String(body.image) : '';
  const text = body.text ? String(body.text) : '';
  if (image && !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return res.status(400).json({ error: 'Formato immagine non supportato' });
  if (!image && !text.trim()) return res.status(400).json({ error: 'Nessun contenuto da analizzare' });

  try {
    const chat = (kind, system, user, img, json) => aiGroqChat(GROQ_URL, key, kind, system, user, img, json);
    const out = await aiExtract(chat, image ? { image } : { text });
    if (out.error) return res.status(out._status && out._status >= 400 ? out._status : 502).json({ error: out.error, source: out.source });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Errore AI' });
  }
};
