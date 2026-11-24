/* ════════════════════════════════════════════════════════════════════
   NUTRIZIONE E ALLERGENI (NUT)
   · valori nutrizionali stimati dagli ingredienti: energia (kcal/kJ), grassi,
     saturi, carboidrati, zuccheri, fibre, proteine, sale — per 100 g, per
     porzione e totali, con calo di cottura e peso della porzione
   · i 14 allergeni del Reg. UE 1169/2011 riconosciuti dagli ingredienti,
     più «può contenere» (cioccolato, preparati); correggibili a mano
   · filtro della collezione: «senza glutine, senza lattosio…»
   Valori indicativi (tabelle CREA/USDA): non sostituiscono un'analisi di laboratorio.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var NUT_AI = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f1(v) { return (Math.round(v * 10) / 10).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 1 }); }
  function f0(v) { return Math.round(v).toLocaleString('it-IT'); }

  /* per 100 g: [kcal, proteine, carboidrati, di cui zuccheri, grassi, di cui saturi, fibre, sale] */
  var T = [
    [/burro di cacao/, [884, 0, 0, 0, 100, 60, 0, 0]],
    [/burro di arachid/, [588, 25, 20, 9, 50, 10, 6, .4]],
    [/arachid|noccioline/, [567, 26, 16, 4, 49, 7, 8.5, 0]],
    [/gianduia/, [540, 7, 50, 47, 34, 9, 3, .05]],
    [/pralin/, [550, 9, 50, 45, 35, 4, 4, 0]],
    [/marzapane|pasta di mandorl/, [450, 8, 60, 55, 20, 1.6, 4, 0]],
    [/tant pour tant|t\.?p\.?t\b/, [490, 10.5, 52, 50, 25, 2, 6, 0]],
    [/pistacch/, [560, 20, 28, 8, 45, 5.6, 10, 0]],
    [/nocciol/, [628, 15, 17, 4, 61, 4.5, 10, 0]],
    [/latte di mandorl|bevanda.*mandorl/, [24, .5, .3, .1, 2, .2, .4, .1]],
    [/mandorl/, [600, 22, 6, 4.4, 53, 4, 12, 0]],
    [/pecan/, [690, 9, 14, 4, 72, 6, 10, 0]],
    [/noce moscata/, [525, 6, 49, 3, 36, 26, 21, 0]],
    [/latte di cocco/, [197, 2, 3, 2, 21, 19, 0, .03]],
    [/cocco/, [660, 7, 24, 7, 64, 57, 16, 0]],
    [/\bnoci\b|\bnoce\b|gherigl/, [654, 15, 7, 2.6, 65, 6, 6.7, 0]],
    [/anacard/, [553, 18, 30, 6, 44, 8, 3.3, 0]],
    [/macadamia/, [718, 8, 14, 4.6, 76, 12, 8.6, 0]],
    [/sesamo|tahin/, [573, 18, 23, .3, 50, 7, 12, .03]],
    [/cioccolato bianco|ivoire|zephyr|opalys|dulcey/, [540, 6, 59, 59, 32, 19, 0, .2]],
    [/cioccolato al latte|jivara|lact[eé]e/, [535, 8, 57, 55, 30, 18, 2, .2]],
    [/cioccolato|fondente|guanaja|manjari|caraibe|copertura/, [550, 7, 45, 30, 38, 23, 10, .02]],
    [/cacao/, [380, 20, 13, 1, 22, 13, 33, .05]],
    [/latte in polvere|lps|latte magro in polvere/, [360, 35, 52, 52, 1, .6, 0, 1.3]],
    [/latte condensato/, [321, 8, 54, 54, 8.7, 5.5, 0, .3]],
    [/latte di soia|bevanda.*soia/, [33, 3.3, .5, .5, 1.8, .3, .5, .1]],
    [/latte di (riso|avena)|bevanda.*(riso|avena)/, [45, .5, 7, 4, 1, .1, .8, .1]],
    [/latte scremato/, [35, 3.5, 5, 5, .2, .1, 0, .1]],
    [/latte/, [64, 3.3, 4.9, 4.9, 3.6, 2.3, 0, .1]],
    [/panna/, [337, 2.2, 3.3, 3.3, 35, 22, 0, .08]],
    [/mascarpone/, [435, 4.5, 4, 4, 44, 30, 0, .1]],
    [/ricotta/, [146, 9, 3.5, 3.5, 11, 7, 0, .25]],
    [/philadelphia|formaggio spalmabile|cream cheese|robiola/, [250, 6, 4, 4, 23, 15, 0, .8]],
    [/mozzarell|fior di latte/, [253, 18.7, .7, .7, 19.5, 13, 0, .5]],
    [/parmigian|grana/, [392, 33, 0, 0, 28, 18, 0, 1.6]],
    [/pecorino/, [387, 26, 0, 0, 32, 20, 0, 2.7]],
    [/gorgonzola/, [324, 19, 0, 0, 27, 17, 0, 1.5]],
    [/burrata|stracciatella/, [300, 15, 2, 2, 26, 17, 0, .6]],
    [/formagg|fontina|provola|scamorza|caciocavallo|taleggio|asiago/, [350, 25, 1, .5, 28, 18, 0, 1.5]],
    [/yogurt greco|yoghurt greco/, [115, 9, 4, 4, 7, 5, 0, .1]],
    [/yogurt|yoghurt|kefir/, [66, 3.8, 4.3, 4.3, 3.9, 2.5, 0, .1]],
    [/burro chiarificato|ghee/, [876, .3, 0, 0, 99.5, 62, 0, 0]],
    [/burro|beurre/, [748, .8, .6, .6, 83, 52, 0, .03]],
    [/margarina/, [720, .2, .4, 0, 80, 30, 0, 1]],
    [/olio/, [899, 0, 0, 0, 99.9, 15, 0, 0]],
    [/lardo|strutto/, [891, 0, 0, 0, 99, 40, 0, 0]],
    [/maionese/, [680, 1, 1, 1, 75, 6, 0, 1.2]],
    [/tuorl/, [325, 16, .6, .3, 29, 8.8, 0, .12]],
    [/album|chiar(?!ific)/, [43, 11, .7, .7, .2, 0, 0, .4]],
    [/savoiard/, [390, 8, 82, 46, 3.5, 1, 1, .2]],
    [/amarett/, [430, 8, 80, 70, 10, 1, 2, .1]],
    [/biscott|frolla|sabl[eé]/, [450, 7, 70, 25, 16, 7, 2.5, .6]],
    [/pasta sfoglia|sfoglia/, [400, 6, 40, 2, 25, 12, 1.5, 1]],
    [/pasta all'uovo|pasta fresca|tagliatell|fettuccin|lasagn|tortell|ravioli/, [370, 14, 69, 2, 4, 1, 3, .1]],
    [/uov/, [128, 12.4, .7, .7, 8.7, 3, 0, .35]],
    [/zucchero invertito|trimolin|invertito/, [320, 0, 80, 80, 0, 0, 0, 0]],
    [/glucosio atomizzato|glucosio disidratato|dry glucose/, [380, 0, 95, 40, 0, 0, 0, 0]],
    [/sciroppo di glucosio|glucosio/, [316, 0, 79, 40, 0, 0, 0, 0]],
    [/destrosio/, [365, 0, 91.5, 91.5, 0, 0, 0, 0]],
    [/miele/, [304, .6, 80, 80, 0, 0, 0, 0]],
    [/sciroppo d'acero|acero/, [260, 0, 67, 60, 0, 0, 0, .02]],
    [/eritritolo/, [0, 0, 100, 0, 0, 0, 0, 0]],
    [/isomalt|maltitolo|sorbitolo/, [240, 0, 99, 0, 0, 0, 0, 0]],
    [/fruttosio|trealosio/, [390, 0, 98, 98, 0, 0, 0, 0]],
    [/zucchero|saccarosio|muscovado|velo|zucchero di canna|cassonade/, [400, 0, 100, 100, 0, 0, 0, 0]],
    [/maltodestrin/, [380, 0, 95, 10, 0, 0, 0, 0]],
    [/inulin|fibra/, [150, 0, 5, 5, 0, 0, 90, 0]],
    [/amido|maizena|fecola|frumina|tapioca/, [350, .3, 87, 0, .1, 0, .9, 0]],
    [/farina di riso|riso in polvere/, [366, 6, 80, .1, 1.4, .4, 2.4, 0]],
    [/farina di mais|polenta|fioretto/, [360, 7, 77, .6, 1.8, .3, 7, 0]],
    [/farina di ceci/, [387, 22, 58, 11, 6.7, .7, 11, .05]],
    [/farina di castagn/, [365, 6, 77, 20, 3.7, .7, 8, .03]],
    [/farina di grano saraceno|grano saraceno/, [340, 13, 71, 2, 3.4, .7, 10, 0]],
    [/integrale/, [340, 12.5, 63, .4, 2.5, .4, 10, 0]],
    [/semola(?!t)|rimacinat/, [360, 12.7, 72, 3, 1.5, .3, 3.9, 0]],
    [/manitoba/, [360, 13.5, 71, 1, 1.5, .3, 3, 0]],
    [/farina|petra|buonpane|tipo 0|tipo 00|w\d{3}|frumento/, [345, 11, 72, 1.5, 1.2, .2, 2.5, 0]],
    [/pangrattato|panko/, [395, 13, 72, 6, 5, 1, 4.5, 1.2]],
    [/pane|focaccia|brioche|pan brioche/, [270, 9, 52, 3, 3, .7, 3, 1.3]],
    [/spaghett|penne|rigaton|fusill|linguin|pacch|maccheron|bucatin|mezze maniche|orecchiette|\bpasta\b/, [355, 12.5, 72, 3, 1.5, .3, 3, 0]],
    [/riso|carnaroli|arborio|vialone/, [355, 7, 79, .2, .6, .2, 1.3, 0]],
    [/couscous|bulgur|farro|orzo perlato/, [350, 12, 72, 1, 1.5, .3, 6, 0]],
    [/fiocchi d'avena|avena/, [372, 13, 59, 1, 7, 1.2, 10, 0]],
    [/patat/, [80, 2, 17.5, .8, .1, 0, 2, 0]],
    [/ceci|lenticch|fagiol|cicerch|piselli|fave/, [120, 8, 18, 1, .8, .1, 6, .01]],
    [/tofu/, [80, 8, 2, .6, 4.5, .7, .3, .02]],
    [/salsa di soia|shoyu|tamari/, [60, 10, 5, 1, .1, 0, .8, 14]],
    [/pelati|passata|polpa di pomodoro/, [24, 1.2, 4, 3.5, .2, 0, 1.2, .3]],
    [/concentrato di pomodoro/, [82, 4.3, 18, 12, .5, .1, 4, .1]],
    [/aglio/, [149, 6.4, 33, 1, .5, .1, 2, .04]],
    [/cipoll|scalogn|porro/, [40, 1.1, 9, 4, .1, 0, 1.7, 0]],
    [/olive/, [145, 1, 4, 0, 15, 2, 3, 2]],
    [/capperi/, [23, 2.4, 5, .4, .9, .2, 3, 2.8]],
    [/avocado/, [160, 2, 9, .7, 15, 2, 6.7, 0]],
    [/pomodor|zucchin|melanzan|peperon|carot|sedano|spinac|insalat|lattug|rucola|cavol|broccol|asparag|finocch|funghi|porcini|zucca|carciof|bietol|cetriol|ravanell|barbabietol|verdur/, [25, 1.2, 4, 3, .2, 0, 2, .02]],
    [/uvetta|uva passa|sultanina/, [300, 3, 72, 70, .5, .1, 4, .03]],
    [/datter|fichi secchi|albicocche secche|prugne secche|frutta secca/, [270, 3, 63, 55, .5, 0, 7, .03]],
    [/banana/, [90, 1.1, 21, 17, .3, .1, 2, 0]],
    [/succo di limone|limone|lime|yuzu|bergamotto/, [25, .4, 8, 2.5, .2, 0, .3, 0]],
    [/purea|polpa|succo|frutta|fragol|lampon|mirtill|ribes|mora|pesca|albicocc|mango|passion|arancia|mandarin|ananas|ciliegi|amarena|mela|pera|frutti di bosco|melone|anguria|kiwi|fico|uva\b|cassis/, [50, .6, 11, 9.5, .2, 0, 1.8, 0]],
    [/gelatina|colla di pesce|fogli/, [340, 86, 0, 0, 0, 0, 0, .5]],
    [/agar|pectin|carragen|neutro|stabilizzant|farina di semi|carrube|guar|xantan|prosorbet|procrema|base gelato/, [180, 1, 10, 0, 0, 0, 80, .5]],
    [/lievito chimico|lievito per dolci|baking|bicarbonato|cremor/, [100, 0, 25, 0, 0, 0, 0, 20]],
    [/lievito/, [100, 12, 7, 0, 1.5, .2, 7, .05]],
    [/\bsale\b|maldon|fleur de sel/, [0, 0, 0, 0, 0, 0, 0, 100]],
    [/manzo|bovino|vitellone|filetto|controfiletto|costata|guancia/, [180, 20, 0, 0, 11, 4.5, 0, .15]],
    [/vitell/, [110, 20.5, 0, 0, 3, 1, 0, .2]],
    [/guanciale|pancetta|bacon/, [655, 8, 0, 0, 69, 25, 0, 3]],
    [/prosciutto cotto/, [215, 19.8, 1, 1, 14.7, 5, 0, 2]],
    [/prosciutto|speck|bresaola/, [270, 26, 0, 0, 18, 6, 0, 5.5]],
    [/salame|salsicc|mortadella|nduja/, [330, 17, 1, .5, 28, 10, 0, 3]],
    [/maial|suino|lonza|capocollo/, [200, 19, 0, 0, 14, 5, 0, .15]],
    [/agnell|capretto/, [230, 17, 0, 0, 18, 8, 0, .15]],
    [/anatra|piccione|faraona/, [200, 19, 0, 0, 14, 4, 0, .2]],
    [/pollo|tacchin|gallina|cappone/, [120, 21, 0, 0, 4, 1, 0, .2]],
    [/salmone/, [185, 20, 0, 0, 12, 2.5, 0, .1]],
    [/tonno in scatola|tonno sott'olio/, [190, 25, 0, 0, 10, 2, 0, 1]],
    [/tonno/, [110, 23, 0, 0, 1.5, .4, 0, .1]],
    [/baccal|stoccafisso/, [95, 21, 0, 0, .7, .1, 0, 1.5]],
    [/acciug|alic/, [210, 29, 0, 0, 10, 2, 0, 9]],
    [/colatura/, [50, 10, 0, 0, 0, 0, 0, 25]],
    [/gamber|scamp|astice|aragost|mazzancoll|granchi|canoc/, [85, 18, .5, 0, 1, .2, 0, .5]],
    [/cozz|vongol|tellin|fasolar/, [75, 11, 3, 0, 2, .4, 0, .7]],
    [/calamar|seppi|polp|totan/, [80, 16, 1.5, 0, 1.2, .3, 0, .5]],
    [/capesant|ostric/, [80, 14, 3, 0, 1, .2, 0, .6]],
    [/branzino|spigola|orata|merluzz|nasello|rombo|sogliola|trota|ricciola|dentice|cernia|pescatrice|rana pescatrice|pesce/, [100, 19, 0, 0, 2.5, .6, 0, .2]],
    [/senape|mostarda/, [70, 4, 6, 3, 4, .2, 4, 3]],
    [/aceto balsamico/, [88, .5, 17, 15, 0, 0, 0, .05]],
    [/aceto/, [20, 0, .6, .4, 0, 0, 0, 0]],
    [/vino|marsala|porto|sherry/, [90, 0, 3, 3, 0, 0, 0, 0]],
    [/grand marnier|cointreau|liquore|amaretto|limoncello/, [300, 0, 25, 25, 0, 0, 0, 0]],
    [/rum|cognac|brandy|whisky|vodka|gin|kirsch|grappa/, [230, 0, 0, 0, 0, 0, 0, 0]],
    [/brodo|fondo|fumetto|court bouillon/, [5, .5, .5, 0, .2, .1, 0, .8]],
    [/caff[eè]|espresso|t[eè]\b|infuso|tisana/, [2, .1, 0, 0, 0, 0, 0, 0]],
    [/vaniglia|cannella|pepe|zenzero|cardamom|anice|chiodi|curcuma|paprika|zafferano|basilic|prezzemol|timo|rosmarin|menta|maggiorana|origano|salvia|alloro|erba cipollina|aneto|dragoncello|coriandol|finocchietto/, [250, 10, 40, 2, 5, 1, 30, .05]],
    [/acqua|ghiaccio/, [0, 0, 0, 0, 0, 0, 0, 0]]
  ];
  function nut(name) { var n = String(name || '').toLowerCase(); for (var i = 0; i < T.length; i++) if (T[i][0].test(n)) return T[i][1]; return null; }

  /* ── allergeni (Reg. UE 1169/2011, allegato II) ── */
  var AL = [
    ['glutine', 'Glutine', '🌾', '#C98A2B'], ['latte', 'Latte e lattosio', '🥛', '#3E7CB1'], ['uova', 'Uova', '🥚', '#D9A86C'], ['frutta_guscio', 'Frutta a guscio', '🌰', '#8A5A35'],
    ['arachidi', 'Arachidi', '🥜', '#B5763A'], ['soia', 'Soia', '🫘', '#5E8C3A'], ['sesamo', 'Sesamo', '🥯', '#A8873F'], ['pesce', 'Pesce', '🐟', '#2F6F9F'], ['crostacei', 'Crostacei', '🦐', '#D0553A'],
    ['molluschi', 'Molluschi', '🦑', '#7A5BA6'], ['sedano', 'Sedano', '🥬', '#3F8F4A'], ['senape', 'Senape', '🫙', '#C9A227'], ['solfiti', 'Solfiti', '🍷', '#8E2B3A'], ['lupini', 'Lupini', '🫛', '#6E9A2E']
  ];
  var ALN = {}; AL.forEach(function (a) { ALN[a[0]] = a; });
  var AR = {
    glutine: /farina(?! di (mandorl|cocco|riso|mais|ceci|castagn|nocciol|pistacch|grano saraceno|tapioca|semi|carrube|guar|lupin))|semola(?!t)|rimacinat|manitoba|frumento|\bgrano\b(?! saraceno)|orzo|segale|farro|kamut|avena|\bpane\b|pangrattato|panko|biscott|savoiard|pasta(?! di (pistacch|nocciol|mandorl|zucchero|cacao|arachid))|couscous|bulgur|seitan|malto|lievito madre|pan di spagna|frolla|sfoglia|brioche|cracker|grissin|gnocch|tagliatell|spaghett|penne|lasagn|birra|w\d{3}|tipo 0|tipo 00|buonpane|petra|crumble|cialda|wafer|amarett/,
    latte: /latte(?! di (cocco|mandorl|soia|riso|avena))|panna|burro(?! di (cacao|arachid|karit))|mascarpone|ricotta|formagg|parmigian|grana|pecorino|mozzarell|fior di latte|yogurt|yoghurt|cioccolato bianco|cioccolato al latte|ivoire|jivara|lact[eé]e|zephyr|opalys|dulcey|siero|caseina|lattosio|stracciatella|gorgonzola|fontina|burrata|philadelphia|cream cheese|robiola|kefir|ghee|besciamella|\blps\b|cr[eè]me fra[iî]che|provola|scamorza|caciocavallo|taleggio|asiago|brioche|gianduia/,
    uova: /uov|tuorl|album|chiar(?!ific)|maionese|meringa|savoiard|pasta all'uovo|pan di spagna|tagliatell|fettuccin|tortell|ravioli|lasagn/,
    frutta_guscio: /mandorl|nocciol|\bnoci\b|\bnoce\b(?! moscata| di cocco)|gherigl|pistacch|anacard|pecan|macadamia|brasile|tant pour tant|gianduia|pralin|marzapane|amarett|frangipan/,
    arachidi: /arachid|noccioline/,
    soia: /soia|soja|lecitina(?! di girasole)|tofu|edamame|miso|tempeh|shoyu|tamari/,
    sesamo: /sesamo|tahin|gomasio/,
    pesce: /pesce|salmone|tonno|merluzz|baccal|stoccafisso|acciug|alic|sardin|branzino|orata|spigola|sgombro|trota|colatura|ricciola|rombo|nasello|sogliola|dentice|cernia|pescatrice|bottarga|fumetto/,
    crostacei: /gamber|scamp|aragost|astice|granchi|mazzancoll|crostace|canoc/,
    molluschi: /cozz|vongol|calamar|seppi|polp|ostric|capesant|lumach|totan|mollusch|tellin|fasolar/,
    sedano: /sedano/,
    senape: /senape|mostarda/,
    solfiti: /vino|aceto|marsala|porto|sherry|uvetta|uva passa|sultanina|albicocche secche|solfit|anidride solforosa|e22[0-8]/,
    lupini: /lupin/
  };
  /* «può contenere»: tracce tipiche nei semilavorati */
  var MAY = [
    [/cioccolato|fondente|copertura|cacao in polvere|guanaja|manjari|caraibe/, ['latte', 'soia', 'frutta_guscio']],
    [/biscott|amarett|savoiard|cialda|wafer|crumble/, ['frutta_guscio', 'soia']],
    [/base gelato|procrema|prosorbet|neutro/, ['latte', 'soia']]
  ];
  function detect(r) {
    var on = {}, may = {};
    (r.i || []).forEach(function (g) {
      var n = String(g[0] || '').toLowerCase();
      for (var k in AR) if (AR[k].test(n)) on[k] = 1;
      MAY.forEach(function (m) { if (m[0].test(n)) m[1].forEach(function (k) { may[k] = 1; }); });
    });
    var add = r.alg || [], rem = r.algNo || [];
    add.forEach(function (k) { on[k] = 1; });
    rem.forEach(function (k) { delete on[k]; delete may[k]; });
    for (var k in on) delete may[k];
    return { on: Object.keys(on), may: Object.keys(may) };
  }

  /* ── calcolo nutrizionale ── */
  function grams(g) { try { return rcGrams(g[1], g[2], g[0]); } catch (e) { return null; } }
  function analyze(r) {
    var tot = 0, known = 0, S = [0, 0, 0, 0, 0, 0, 0, 0], unk = [], qb = 0;
    (r.i || []).forEach(function (g) {
      var gr = grams(g);
      if (gr == null || !(gr > 0)) { if (g[1] == null || g[1] === '') qb++; else unk.push(g[0]); return; }
      tot += gr; var v = nut(g[0]);
      if (!v) { unk.push(g[0]); return; }
      known += gr; for (var i = 0; i < 8; i++) S[i] += gr * v[i] / 100;
    });
    return { tot: tot, known: known, sum: S, unknown: unk, qb: qb, cov: tot ? known / tot : 0 };
  }
  function prefs(r) { var k = 'nu_' + (r._id || r.n); try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } }
  function savePrefs(r, p) { try { localStorage.setItem('nu_' + (r._id || r.n), JSON.stringify(p)); } catch (e) {} }

  var ROWS = [['Energia', -1], ['Grassi', 4], ['di cui saturi', 5, 1], ['Carboidrati', 2], ['di cui zuccheri', 3, 1], ['Fibre', 6], ['Proteine', 1], ['Sale', 7]];
  function alChips(r, D, editable) {
    if (!D.on.length && !D.may.length) return '<span class="nu-none">Nessun allergene riconosciuto</span>';
    return D.on.map(function (k) { return '<span class="nu-al on" data-k="' + k + '" style="--a:' + ALN[k][3] + '"><b>' + ALN[k][2] + '</b>' + esc(ALN[k][1]) + (editable ? '<i data-rm="' + k + '" aria-label="Togli">×</i>' : '') + '</span>'; }).join('') +
      D.may.map(function (k) { return '<span class="nu-al may" title="Può contenere tracce" data-k="' + k + '"><b>' + ALN[k][2] + '</b>Tracce: ' + esc(ALN[k][1]) + '</span>'; }).join('');
  }


  /* ── controllo allergeni con l'AI: trova quelli nascosti e chiede conferma ── */
  var ALG_SYS = 'Sei un esperto di sicurezza alimentare (Reg. UE 1169/2011, allegato II). Ricevi una ricetta professionale. Individua quali dei 14 allergeni sono PRESENTI negli ingredienti, anche nascosti in semilavorati o prodotti composti (es. pralinato o gianduia: frutta a guscio; besciamella: latte e glutine; salsa di soia: soia e glutine; pesto: frutta a guscio e latte; salsa worcester: pesce; vino o aceto: solfiti; pan di spagna: uova e glutine). Non includere tracce ipotetiche. Se non sei sicuro, non includerlo. Rispondi SOLO con JSON: {"allergeni":[{"k":"chiave","perche":"ingrediente che lo contiene, massimo 8 parole"}]}. Chiavi ammesse: glutine, latte, uova, frutta_guscio, arachidi, soia, sesamo, pesce, crostacei, molluschi, sedano, senape, solfiti, lupini.';
  function recText(r) {
    return 'RICETTA: ' + (r.n || '') + (r.c ? ' (' + r.c + ')' : '') + '\nINGREDIENTI:\n' + (r.i || []).map(function (g) { return '- ' + g[0] + (g[1] != null && g[1] !== '' ? ' ' + g[1] + ' ' + (g[2] || '') : ''); }).join('\n') +
      (r.p ? '\nPROCEDIMENTO:\n' + String(r.p).slice(0, 2500) : '') + (r.nt ? '\nNOTE:\n' + String(r.nt).slice(0, 600) : '');
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); }
  function aiKey(r) { return 'nu_ai_' + (r._id || r.n); }
  function aiGet(r) { try { return JSON.parse(localStorage.getItem(aiKey(r)) || 'null'); } catch (e) { return null; } }
  function aiSet(r, v) { try { localStorage.setItem(aiKey(r), JSON.stringify(v)); } catch (e) {} }
  var inflight = {}, failed = {};
  function aiAsk(text) {
    var srv = typeof aiCheckServer === 'function' ? aiCheckServer() : Promise.resolve(false);
    return srv.then(function (ok) {
      if (ok) return fetch('/api/import', { method: 'POST', headers: WL.apiH(), body: JSON.stringify({ algcheck: text }) }).then(function (r) { return r.json().catch(function () { return {}; }); });
      var key = ''; try { key = localStorage.getItem('groq_key') || ''; } catch (e) {}
      if (!key || typeof aiGroqChat !== 'function') return { error: 'nokey' };
      return aiGroqChat('https://api.groq.com/openai/v1/chat/completions', key, 'text', ALG_SYS, text, null, true);
    }).then(function (d) {
      if (!d || d.error) throw new Error(d && d.error || 'AI non disponibile');
      var m = String(d.text || '').match(/\{[\s\S]*\}/); var j = m ? JSON.parse(m[0]) : {};
      return (j.allergeni || []).filter(function (a) { return a && ALN[a.k]; }).map(function (a) { return { k: a.k, why: String(a.perche || '').slice(0, 80) }; });
    });
  }
  /* risultati ancora da confermare: visti dall'AI, non segnati, non tolti a mano, non ignorati */
  function pending(r, D) {
    var c = aiGet(r), h = hash(recText(r)); if (!c || c.h !== h) return null;
    var no = r.algNo || [], dis = c.dis || [];
    return (c.found || []).filter(function (a) { return D.on.indexOf(a.k) < 0 && no.indexOf(a.k) < 0 && dis.indexOf(a.k) < 0; });
  }
  function aiRun(r, force, done) {
    var text = recText(r), h = hash(text), c = aiGet(r);
    if (!force && ((c && c.h === h) || failed[h])) return;
    if (inflight[h]) return; inflight[h] = 1;
    aiAsk(text).then(function (found) {
      var keep = c && c.h === h ? (c.dis || []) : [];
      aiSet(r, { h: h, found: found, dis: keep, t: Date.now() }); delete inflight[h]; if (done) done(null, found);
    }, function (e) { delete inflight[h]; failed[h] = 1; if (done) done(e); });
  }
  NUT_AI = { run: aiRun, pending: pending, text: recText };

  /* scheda espandibile nella pagina ricetta */
  function mount(host, r, dose) {
    if (!host || !r) return;
    dose = dose || 1;
    var A = analyze(r), D = detect(r), P = prefs(r), canEdit = !!(window.WL && WL.canEdit && WL.canEdit());
    var loss = Math.max(0, Math.min(80, +P.loss || 0)), pw = +P.pw || 0;
    var raw = A.tot * dose, cooked = raw * (1 - loss / 100);
    var k100 = function (i) { return A.known ? A.sum[i] / A.known * 100 / (1 - loss / 100) : 0; };
    var kcal100 = k100(0), por = pw > 0 ? pw : 0, nPor = por ? cooked / por : 0;
    var prot = k100(1) * 4, carb = k100(2) * 4, fat = k100(4) * 9, en = prot + carb + fat || 1;
    var open = host.querySelector('details') ? host.querySelector('details').open : !!P.open;
    var cell = function (i, mult) { if (i < 0) { var kc = kcal100 * mult; return '<b>' + f0(kc) + '</b> kcal<small>' + f0(kc * 4.184) + ' kJ</small>'; } return f1(k100(i) * mult) + ' g'; };
    var cols = [['100 g', 1]].concat(por ? [['Porzione ' + f0(por) + ' g', por / 100]] : []).concat([['Totale', cooked / 100]]);
    host.innerHTML =
      '<details class="lb-card nu"' + (open ? ' open' : '') + '><summary>' +
        '<span class="lb-eyebrow">Nutrizione e allergeni</span>' +
        '<span class="nu-sum"><b class="mono">' + (A.known ? f0(kcal100) : '—') + '</b><small>kcal/100 g</small></span>' +
      '</summary>' +
      '<div class="nu-als" id="nuAls">' + alChips(r, D, canEdit) + '</div>' +
      (function () { var pd = canEdit ? pending(r, D) : null; if (!pd || !pd.length) return ''; return '<div class="nu-ai" id="nuAi"><div class="nu-ai-h"><span>✨</span><b>L’AI vede ' + (pd.length === 1 ? 'un allergene non segnato' : pd.length + ' allergeni non segnati') + '</b></div>' +
        pd.map(function (a) { return '<div class="nu-ai-r" style="--a:' + ALN[a.k][3] + '"><b>' + ALN[a.k][2] + '</b><span><em>' + esc(ALN[a.k][1]) + '</em>' + (a.why ? '<small>' + esc(a.why) + '</small>' : '') + '</span><button type="button" class="nu-ai-no" data-ai-no="' + a.k + '">Ignora</button><button type="button" class="nu-ai-ok" data-ai-ok="' + a.k + '">Aggiungi</button></div>'; }).join('') +
        (pd.length > 1 ? '<button type="button" class="nu-ai-all" data-ai-all>Aggiungi tutti</button>' : '') + '</div>'; })() +
      (A.known ? '<div class="nu-bar" aria-hidden="true"><i style="flex:' + prot / en + ';background:#7F8F5A"></i><i style="flex:' + carb / en + ';background:#C9A86A"></i><i style="flex:' + fat / en + ';background:#A67B5B"></i></div>' +
        '<div class="nu-leg"><span><i style="background:#7F8F5A"></i>Proteine ' + f0(prot / en * 100) + '%</span><span><i style="background:#C9A86A"></i>Carboidrati ' + f0(carb / en * 100) + '%</span><span><i style="background:#A67B5B"></i>Grassi ' + f0(fat / en * 100) + '%</span></div>' +
        '<div class="nu-tw"><table class="nu-t"><thead><tr><th></th>' + cols.map(function (c) { return '<th>' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        ROWS.map(function (rw) { return '<tr' + (rw[2] ? ' class="sub"' : '') + '><td>' + rw[0] + '</td>' + cols.map(function (c) { return '<td class="mono">' + cell(rw[1], c[1]) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>'
        : '<p class="lb-empty sm">Non riconosco abbastanza ingredienti per calcolare i valori.</p>') +
      '<div class="nu-in"><label><span>Calo di cottura</span><span class="ms-in"><input id="nuLoss" inputmode="decimal" value="' + (loss || '') + '" placeholder="0"><em>%</em></span></label>' +
        '<label><span>Peso porzione</span><span class="ms-in"><input id="nuPw" inputmode="decimal" value="' + (pw || '') + '" placeholder="—"><em>g</em></span></label></div>' +
      '<p class="nu-note">' + (por ? f1(nPor) + ' porzioni da ' + f0(por) + ' g · ' : '') + 'Peso ' + (loss ? 'dopo cottura ' + f0(cooked) + ' g (crudo ' + f0(raw) + ' g)' : f0(raw) + ' g') + '. ' +
        'Riconosciuto il ' + f0(A.cov * 100) + '% del peso' + (A.unknown.length ? ' · senza dati: ' + esc(A.unknown.slice(0, 6).join(', ')) + (A.unknown.length > 6 ? '…' : '') : '') + (A.qb ? ' · ' + A.qb + ' q.b. esclusi' : '') + '. Valori indicativi.</p>' +
      '<div class="nu-acts">' + (canEdit ? '<button type="button" class="lb-link" id="nuAdd">+ Allergene</button><button type="button" class="lb-link" id="nuAiGo">✨ Controlla con l’AI</button>' : '') + '<button type="button" class="lb-link" id="nuCopy">Copia etichetta</button></div>' +
      '</details>';
    var det = host.querySelector('details');
    if (host.querySelector('#nuAi')) det.open = true;
    det.addEventListener('toggle', function () { var p = prefs(r); p.open = det.open; savePrefs(r, p); });
    function num(v) { return parseFloat(String(v).replace(',', '.')); }
    var t = null;
    function upd() { clearTimeout(t); t = setTimeout(function () { var p = prefs(r); p.loss = num($('nuLoss').value) || 0; p.pw = num($('nuPw').value) || 0; p.open = true; savePrefs(r, p); var f = document.activeElement && document.activeElement.id; mount(host, r, dose); if (f && $(f)) { var e = $(f); e.focus(); try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) {} } }, 450); }
    $('nuLoss').oninput = upd; $('nuPw').oninput = upd;
    [].forEach.call(host.querySelectorAll('[data-rm]'), function (x) {
      x.onclick = function (e) { e.preventDefault(); var k = x.dataset.rm; if (!confirm('Togliere «' + ALN[k][1] + '» dagli allergeni di questa ricetta?')) return; patch(r, function (nd) { nd.alg = (nd.alg || []).filter(function (y) { return y !== k; }); if ((nd.algNo || []).indexOf(k) < 0) nd.algNo = (nd.algNo || []).concat(k); }); };
    });
    var ad = $('nuAdd'); if (ad) ad.onclick = function () { picker(r, D); };
    /* AI: conferma o ignora i suggerimenti */
    function addKeys(ks) { patch(r, function (nd) { nd.algNo = (nd.algNo || []).filter(function (y) { return ks.indexOf(y) < 0; }); ks.forEach(function (k) { if ((nd.alg || []).indexOf(k) < 0) nd.alg = (nd.alg || []).concat(k); }); }); toast(ks.length === 1 ? ALN[ks[0]][1] + ' aggiunto agli allergeni' : ks.length + ' allergeni aggiunti'); }
    [].forEach.call(host.querySelectorAll('[data-ai-ok]'), function (b) { b.onclick = function () { if (confirm('Aggiungere «' + ALN[b.dataset.aiOk][1] + '» agli allergeni di questa ricetta?')) addKeys([b.dataset.aiOk]); }; });
    [].forEach.call(host.querySelectorAll('[data-ai-no]'), function (b) { b.onclick = function () { var c = aiGet(r); if (c) { c.dis = (c.dis || []).concat(b.dataset.aiNo); aiSet(r, c); } mount(host, r, dose); }; });
    var aa = host.querySelector('[data-ai-all]'); if (aa) aa.onclick = function () { var pd = pending(r, D) || []; if (confirm('Aggiungere ' + pd.map(function (a) { return ALN[a.k][1]; }).join(', ') + '?')) addKeys(pd.map(function (a) { return a.k; })); };
    var ag = $('nuAiGo'); if (ag) ag.onclick = function () {
      ag.textContent = 'Controllo…'; ag.disabled = true;
      aiRun(r, true, function (err, found) {
        if (err) { toast(/nokey/.test(err.message) ? 'AI non configurata: aggiungi la chiave Groq o configurala su Vercel' : 'AI non disponibile: ' + err.message); mount(host, r, dose); return; }
        var p = prefs(r); p.open = true; savePrefs(r, p); mount(host, r, dose);
        var pd = pending(r, detect(r)) || []; if (!pd.length) toast(found.length ? 'L’AI conferma gli allergeni segnati' : 'L’AI non trova allergeni');
      });
    };
    /* controllo automatico in background quando la ricetta cambia (solo chi può modificarla) */
    if (canEdit && !host._aiAuto) { host._aiAuto = 1; setTimeout(function () { host._aiAuto = 0; aiRun(r, false, function (err) { if (!err && document.contains(host) && host.querySelector('.nu')) { var pd = pending(r, detect(r)) || []; if (pd.length) mount(host, r, dose); } }); }, 900); }
    $('nuCopy').onclick = function () {
      var L = ['Valori nutrizionali medi — ' + r.n, ''];
      L.push(['', ' '].concat(cols.map(function (c) { return c[0]; })).join('\t'));
      ROWS.forEach(function (rw) { L.push([rw[0], ''].concat(cols.map(function (c) { return cell(rw[1], c[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); })).join('\t')); });
      L.push('', 'Allergeni: ' + (D.on.length ? D.on.map(function (k) { return ALN[k][1]; }).join(', ') : 'nessuno riconosciuto'));
      if (D.may.length) L.push('Può contenere: ' + D.may.map(function (k) { return ALN[k][1]; }).join(', '));
      var txt = L.join('\n');
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Etichetta copiata'); }, function () { prompt('Copia il testo', txt); });
    };
  }
  function toast(m) { try { XL.toast(m); } catch (e) { try { libToast(m, 'ok'); } catch (x) {} } }
  function patch(r, fn) { if (window.XL && XL.patchRec) XL.patchRec(r, fn); }
  function picker(r, D) {
    var old = $('nuPick'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'nuPick'; m.className = 'nu-pick';
    m.innerHTML = '<div class="nu-pbg"></div><div class="nu-pbox" role="dialog" aria-label="Aggiungi allergene"><b>Aggiungi un allergene</b><p>Per quelli che l’app non riconosce dal nome (per esempio un semilavorato).</p><div class="nu-pl">' +
      AL.map(function (a) { var has = D.on.indexOf(a[0]) >= 0; return '<button type="button" data-k="' + a[0] + '"' + (has ? ' disabled' : '') + ' style="--a:' + a[3] + '"><b>' + a[2] + '</b>' + a[1] + '</button>'; }).join('') + '</div><button type="button" class="lb-btn" data-x>Chiudi</button></div>';
    document.body.appendChild(m);
    m.querySelector('.nu-pbg').onclick = m.querySelector('[data-x]').onclick = function () { m.remove(); };
    [].forEach.call(m.querySelectorAll('[data-k]'), function (b) { b.onclick = function () { var k = b.dataset.k; m.remove(); patch(r, function (nd) { nd.algNo = (nd.algNo || []).filter(function (y) { return y !== k; }); if ((nd.alg || []).indexOf(k) < 0) nd.alg = (nd.alg || []).concat(k); }); }; });
  }

  /* ── filtro della collezione ── */
  var EX = []; try { EX = JSON.parse(localStorage.getItem('nu_excl') || '[]'); } catch (e) {}
  var EXMAY = false; try { EXMAY = localStorage.getItem('nu_excl_may') === '1'; } catch (e) {}
  function pass(r) {
    if (!EX.length) return true;
    var D = detect(r);
    return !EX.some(function (k) { return D.on.indexOf(k) >= 0 || (EXMAY && D.may.indexOf(k) >= 0); });
  }
  function btnSync() {
    var b = $('algBtn'); if (!b) return;
    b.classList.toggle('on', EX.length > 0);
    b.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>' + (EX.length ? 'Senza · ' + EX.length : 'Allergeni');
  }
  function openFilter() {
    var old = $('nuPick'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'nuPick'; m.className = 'nu-pick';
    function draw() {
      m.innerHTML = '<div class="nu-pbg"></div><div class="nu-pbox" role="dialog" aria-label="Filtra per allergeni"><b>Mostra solo ricette senza…</b><p>Allergie e intolleranze: tocca quelli da escludere.</p><div class="nu-pl">' +
        AL.map(function (a) { return '<button type="button" data-k="' + a[0] + '" class="' + (EX.indexOf(a[0]) >= 0 ? 'on' : '') + '" style="--a:' + a[3] + '"><b>' + a[2] + '</b>' + a[1] + '</button>'; }).join('') + '</div>' +
        '<label class="nu-may"><input type="checkbox" id="nuMay"' + (EXMAY ? ' checked' : '') + '> Escludi anche «può contenere tracce»</label>' +
        '<div class="nu-pa"><button type="button" class="lb-btn" data-clear>Azzera</button><button type="button" class="lb-btn dark" data-x>Mostra ricette</button></div>' +
        '<p class="nu-note">Riconoscimento dal nome degli ingredienti: per allergie gravi controlla sempre le etichette dei prodotti.</p></div>';
      m.querySelector('.nu-pbg').onclick = m.querySelector('[data-x]').onclick = function () { m.remove(); };
      m.querySelector('[data-clear]').onclick = function () { EX = []; save(); draw(); };
      m.querySelector('#nuMay').onchange = function () { EXMAY = this.checked; save(); };
      [].forEach.call(m.querySelectorAll('[data-k]'), function (b) { b.onclick = function () { var k = b.dataset.k, i = EX.indexOf(k); if (i >= 0) EX.splice(i, 1); else EX.push(k); save(); draw(); }; });
    }
    function save() { try { localStorage.setItem('nu_excl', JSON.stringify(EX)); localStorage.setItem('nu_excl_may', EXMAY ? '1' : '0'); } catch (e) {} btnSync(); try { renderGrid(); } catch (e) {} }
    draw(); document.body.appendChild(m);
  }
  function addButton() {
    if ($('algBtn')) return;
    var sel = $('selBtn'); if (!sel) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'algBtn'; b.className = 'sel-btn alg-btn'; b.title = 'Filtra per allergie e intolleranze';
    b.onclick = openFilter; sel.parentNode.insertBefore(b, sel); btnSync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();

  /* sigle degli allergeni per le card della collezione */
  function badges(r) { var D = detect(r); return D.on.map(function (k) { return '<i style="--a:' + ALN[k][3] + '" title="' + ALN[k][1] + '">' + ALN[k][2] + '</i>'; }); }

  window.NUT = { ai: function () { return NUT_AI; }, analyze: analyze, detect: detect, mount: mount, pass: pass, badges: badges, ALLERGENI: AL, nut: nut, openFilter: openFilter };

  var css = document.createElement('style');
  css.textContent =
    '.nu{min-width:0;max-width:100%;box-sizing:border-box;overflow:hidden}.nu-tw{max-width:100%}.nu-in .ms-in{min-width:0}.nu-in input{width:100%}' +
    '.nu summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;list-style:none}.nu summary::-webkit-details-marker{display:none}' +
    '.nu summary::after{content:"";width:8px;height:8px;border:solid var(--smoke2,#7B796E);border-width:0 1.5px 1.5px 0;transform:rotate(45deg);transition:transform .25s;flex-shrink:0;margin-left:4px}.nu[open] summary::after{transform:rotate(-135deg)}' +
    '.nu-sum{margin-left:auto;display:flex;align-items:baseline;gap:5px}.nu-sum b{font-size:17px;color:var(--ink)}.nu-sum small{font-size:11px;color:var(--smoke2,#7B796E)}' +
    '.nu-als{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.nu:not([open]) .nu-als{margin-bottom:0}' +
    '.nu-al{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 10px 0 3px;border-radius:99px;font:600 12.5px "DM Sans",sans-serif;background:color-mix(in srgb,var(--a) 10%,var(--card,#fff));color:color-mix(in srgb,var(--a) 70%,var(--ink));border:1px solid color-mix(in srgb,var(--a) 28%,transparent)}' +
    '.nu-al b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:15px;line-height:1;background:color-mix(in srgb,var(--a) 20%,var(--card,#fff));box-shadow:inset 0 0 0 1.5px var(--a)}' +
    '.nu-al.may{background:none;border:1px dashed color-mix(in srgb,var(--a) 35%,transparent);color:var(--smoke2,#7B796E);font-weight:500}.nu-al.may b{filter:grayscale(.5);opacity:.75;box-shadow:inset 0 0 0 1.5px var(--smoke3,#A9A699)}' +
    '.nu-al i{font-style:normal;margin-left:2px;padding:0 3px;cursor:pointer;opacity:.6;font-size:15px}.nu-al i:hover{opacity:1}' +
    '.nu-none{font-size:12.5px;color:var(--smoke2,#7B796E)}' +
    '.nu-bar{display:flex;height:8px;border-radius:5px;overflow:hidden;gap:2px;margin:16px 0 8px}.nu-bar i{display:block}' +
    '.nu-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--ink2)}.nu-leg span{display:inline-flex;align-items:center;gap:6px}.nu-leg i{width:9px;height:9px;border-radius:3px;display:block}' +
    '.nu-tw{overflow-x:auto;margin:12px -4px 0}.nu-t{width:100%;border-collapse:collapse;font-size:13px}.nu-t th{font:600 10px "DM Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--smoke2,#7B796E);text-align:right;padding:6px 4px;white-space:nowrap}.nu-t th:first-child{text-align:left}' +
    '.nu-t td{padding:7px 4px;border-top:1px solid var(--cb,rgba(0,0,0,.08));text-align:right;white-space:nowrap;color:var(--ink)}.nu-t td:first-child{text-align:left;font-family:"DM Sans",sans-serif}.nu-t tr.sub td{color:var(--smoke2,#7B796E);font-size:12px}.nu-t tr.sub td:first-child{padding-left:14px}' +
    '.nu-t td small{display:block;font-size:10.5px;color:var(--smoke2,#7B796E)}.nu-t td b{font-weight:600}' +
    '.nu-in{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.nu-in label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--smoke2,#7B796E)}' +
    '.nu-in .ms-in{display:flex;align-items:center;border:1px solid var(--cb);border-radius:10px;background:var(--ctrl,#F7F5EF);padding:0 10px}.nu-in input{flex:1;min-width:0;height:38px;border:0;background:none;font:500 15px "JetBrains Mono",monospace;color:var(--ink);outline:none}.nu-in em{font-style:normal;color:var(--smoke2)}' +
    '.nu-note{font-size:11.5px;line-height:1.5;color:var(--smoke2,#7B796E);margin:10px 0 0}' +
    '.nu-acts{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px}' +
    '.nu-ai{margin-top:12px;padding:12px;border-radius:14px;background:color-mix(in srgb,#A8772A 9%,var(--card,#fff));border:1px solid color-mix(in srgb,#A8772A 30%,transparent);animation:nuUp .35s cubic-bezier(.2,.8,.2,1)}' +
    '.nu-ai-h{display:flex;align-items:center;gap:8px;font:600 13.5px "DM Sans",sans-serif;color:var(--ink);margin-bottom:8px}' +
    '.nu-ai-r{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid color-mix(in srgb,#A8772A 18%,transparent)}' +
    '.nu-ai-r>b{width:32px;height:32px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font-size:17px;background:color-mix(in srgb,var(--a) 16%,var(--card,#fff));box-shadow:inset 0 0 0 1.5px var(--a)}' +
    '.nu-ai-r>span{flex:1;min-width:0;display:flex;flex-direction:column}.nu-ai-r em{font:600 13.5px "DM Sans",sans-serif;font-style:normal;color:var(--ink)}.nu-ai-r small{font-size:11.5px;color:var(--smoke2,#7B796E);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.nu-ai-r button,.nu-ai-all{height:32px;padding:0 11px;border-radius:9px;font:600 12.5px "DM Sans",sans-serif;cursor:pointer;flex-shrink:0}' +
    '.nu-ai-no{border:1px solid var(--cb);background:var(--card,#fff);color:var(--ink2)}.nu-ai-ok,.nu-ai-all{border:0;background:var(--btn-bg,#1A1A16);color:var(--btn-ink,#fff)}.nu-ai-all{width:100%;margin-top:6px;height:38px}' +
    '.nu-pick{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-end;justify-content:center}.nu-pbg{position:absolute;inset:0;background:rgba(12,11,8,.42)}' +
    '.nu-pbox{position:relative;width:min(520px,100%);max-height:88vh;overflow:auto;background:var(--bg,#F5EFE0);border-radius:22px 22px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));animation:nuUp .32s cubic-bezier(.2,.8,.2,1);font-family:"DM Sans",sans-serif;color:var(--ink)}' +
    '@media(min-width:700px){.nu-pick{align-items:center}.nu-pbox{border-radius:22px}}@keyframes nuUp{from{transform:translateY(30px);opacity:0}}' +
    '.nu-pbox>b{font:600 22px "Cormorant Garamond",Georgia,serif;display:block}.nu-pbox>p{font-size:13px;color:var(--smoke2);margin:4px 0 12px}' +
    '.nu-pl{display:grid;grid-template-columns:1fr 1fr;gap:6px}.nu-pl button{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border-radius:12px;border:1px solid var(--cb);background:var(--card,#fff);color:var(--ink);font:500 13.5px "DM Sans",sans-serif;text-align:left;cursor:pointer}' +
    '.nu-pl button{min-height:52px!important}.nu-pl button b{width:36px;height:36px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font-size:19px;line-height:1;background:color-mix(in srgb,var(--a) 14%,var(--card,#fff));box-shadow:inset 0 0 0 2px var(--a)}' +
    '.nu-pl button.on{background:var(--a);border-color:var(--a);color:#fff;font-weight:600}.nu-pl button.on b{background:#fff;box-shadow:none}.nu-pl button.on::after{content:"✕";margin-left:auto;font-size:12px;opacity:.8}.nu-pl button:disabled{opacity:.4}' +
    '.nu-may{display:flex;align-items:center;gap:8px;margin:14px 0 4px;font-size:13.5px}.nu-may input{width:18px;height:18px;accent-color:#9B2C3C}' +
    '.nu-pa{display:flex;gap:8px;margin-top:12px}.nu-pa .lb-btn,.nu-pbox>.lb-btn{flex:1;height:44px;border-radius:12px;border:1px solid var(--cb);background:var(--card,#fff);color:var(--ink);font:600 14px "DM Sans",sans-serif;cursor:pointer;margin-top:12px}.nu-pa .lb-btn{margin-top:0}.nu-pa .lb-btn.dark{background:var(--btn-bg,#1A1A16);color:var(--btn-ink,#fff);border-color:transparent}' +
    '#app .alg-btn{display:inline-flex!important;gap:5px}#app .alg-btn.on{background:#9B2C3C;color:#fff;border-color:#9B2C3C}' +
    '.card-alg{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px}.card-alg i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12.5px;line-height:1;background:color-mix(in srgb,var(--a) 14%,var(--card,#fff));box-shadow:inset 0 0 0 1.5px var(--a)}' +
    '@media(max-width:520px){.nu-t{font-size:11.5px;letter-spacing:-.02em}.nu-t td,.nu-t th{padding-left:2px;padding-right:2px}.nu-t td small{display:none}.nu-t th{font-size:9px;letter-spacing:.02em}.nu-t td:first-child{white-space:normal}}';
  document.head.appendChild(css);
})();
