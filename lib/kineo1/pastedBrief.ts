// ═══ KINEO1-IMAGEM-V2-2026-09-28 — instrução colada não é fala (peça PURA; a rota liga no commit [TRAVA 8.2]) ═══
//
// Caso (taxonomia das 136 cenas reprovadas em 40 filmes nota 40, 21-27/09): 2 filmes NARRARAM as instruções que a
// pessoa escreveu para a IA. Os dois vieram por "Use my script as is" em prosa (script_mode 'verbatim', sem [Pexels:]):
// lib/proseBlocks corta a prosa por frase e cada linha de instrução virou uma cena, com a busca de stock feita das 4
// primeiras palavras ("comece nos primeiros segundos", "estilo visual ilustración minimalista").
//   · 2ff93c15 (24/09, PT, a Lua que some): o texto INTEIRO era um briefing — "Crie um vídeo vertical 9:16…", "Comece
//     nos primeiros 2 segundos com um gancho muito forte. Use narração natural em inglês americano…", "Mostre
//     consequências…", "Troque as cenas a cada 2–3 segundos…", "Não use avatar…", "O vídeo deve parecer profissional…".
//     O parser (lib/scriptParser.ts) tirou só a 1ª linha (verbo "Crie" + "vídeo"); as outras 5 viraram as 6 cenas.
//   · b3b3e101 (23/09, ES, os gêmeos Jim): a fala entre aspas ficou nas cenas 1-2 e "Estilo visual: ilustración
//     minimalista… Sin personas reales ni caras detalladas.", "Subtítulos: grandes, blancos…" e "Sin logos ni marcas
//     de agua." viraram as cenas 3-4 (só "Música:" já caía no parser).
// O parser já tira rótulos de produção em inglês e o "crie/faça um vídeo"; não tira "Estilo visual:", "Subtítulos:" nem
// o imperativo ao editor ("Comece nos primeiros 2 segundos", "Use narração", "Não use avatar", "Troque as cenas").
//
// REVISÃO PÓS-AUDITORIA (28/09, os dois defeitos que o revisor provou executando esta peça):
//   D1 — briefing com SOBRA de instrução virava filme cobrado lendo instrução. 17dd0c7a/2fa42114 (24/09, PT, a mesma
//     pessoa da Lua, 1ª tentativa): 15 linhas, 284 palavras, "Use my script as is" a 60 s. Em 22c8e70e: 108 s de fala →
//     422 script_too_long_for_engine, nada cobrado. Com a v1 desta peça saíam 11 linhas e FICAVAM 102 palavras — o gancho
//     e o fecho entre aspas + "Conte a história aumentando progressivamente as consequências: …; depois mostre…" ("Conte"
//     não era verbo de editor) + "O resultado final deve parecer um YouTube Short…" (não é "O vídeo deve") → 39 s → a
//     duração descia 60→35 e o filme SAÍA, cobrado, narrando dois parágrafos de instrução. A mesma sobra existia num
//     filme real entregue: 8b23d27a (ES, tênis) — 6 linhas de fala + "Estilo documental… Utiliza imágenes o vídeos de
//     stock…", "La narración debe…", "El primer segundo debe mostrar… No incluyas una introducción…" e "No inventes
//     escenas…"; a v1 tirava só "La narración debe…" e narrava as outras três.
//   D2 — roteiro de UM parágrafo lido como briefing. A v1 classificava a LINHA inteira: um roteiro em parágrafo único é
//     uma linha só; o substantivo de produção valia em qualquer lugar da linha ("segundos", "vídeo", "imagens") e "Este
//     vídeo vai…" contava como frase sobre o filme. Uma linha forte → sobra 0 palavra → 'brief_only' → a rota trocava
//     para "a IA estrutura" e o escritor REESCREVIA o roteiro de quem pediu "Use my script as is" ("Este vídeo vai mudar a
//     forma como você enxerga o dinheiro…", "Evite estes três erros com dinheiro. Em poucos segundos…", "Change your life
//     in 30 seconds a day…", "Este video va a cambiar…"). Raro (0 de 30 textos verbatim do Kineo 1 recentes), mas mudo.
//
// REGRA (v1 + revisão) — por LINHA inteira; nenhuma palavra da fala é tocada, nem reordenada:
//   · linha FORTE (instrução sem ambiguidade): rótulo de produção com dois-pontos ("Estilo visual:", "Subtítulos:",
//     "Música:", "Formato:", "Duração:"…); imperativo ao editor com substantivo de produção NA 1ª FRASE ("Use narração…",
//     "Não use avatar", "Comece nos primeiros 2 segundos…", "Troque as cenas…", "Start with a strong hook"); ou frase
//     sobre o próprio filme com verbo de OBRIGAÇÃO ("O vídeo deve…", "El video debe…", "The video should…" — "vai/va a"
//     saiu: é abertura de narração, D2). "segundos/seconds" só conta como especificação ("a cada 2–3 segundos", "nos
//     primeiros 2 segundos", "35 a 45 segundos"), nunca solto ("em poucos segundos", "in 30 seconds a day");
//   · PARÁGRAFO de fala nunca é classificado pela linha inteira: mais de 40 palavras em mais de uma frase = prosa (D2);
//   · linha FRACA — só sai quando o texto já tem 2+ FORTES (aí ele é um briefing): imperativo ao editor sem substantivo
//     de produção ("Mostre consequências…") e negação de elemento de produção ("Sin logos ni marcas de agua.");
//   · SOBRA DE INSTRUÇÃO (D1) — só em texto que já fala COM O EDITOR (1+ linha forte imperativa ou sobre o filme; texto
//     só com rótulos, tipo "Title:/Hashtags:" do ChatGPT, fica de fora): linha que sobrou e, frase a frase, tem forma de
//     instrução — verbo de direção com história/produção ("Conte a história…", "Keep … every scene", "Make … footage"),
//     verbo de editor depois de ";"/":" ("…; depois mostre o efeito"), obrigação do resultado ("O resultado final deve",
//     "Every visual MUST", "El primer segundo debe"), plano de câmera ("Close-up of…", "Camera slowly…", "CUT TO BLACK"),
//     "Para X, mostre…", negação com produção ("Do NOT repeat the same footage", "No incluyas una introducción…"), ficha
//     técnica ("1080x1920.", "Designed for TikTok, YouTube Shorts and Instagram Reels."). Parágrafo longo só sai se a
//     MAIORIA das frases for instrução;
//   · linha que abre com aspas é fala, sempre; texto com rótulo de FALA ("Narração:", "Voiceover:"…) fica inteiro com
//     o parser (ele tem regras próprias para roteiro rotulado — contrato de 03/09 e 12/09).
// SAÍDA: 'none' (nada a tirar) · 'narration_kept' (as linhas de instrução saem; sobra fala de verdade, ≥ 12 palavras,
// que continua narrada como está) · 'brief_only' (o texto é um BRIEFING — a rota o trata como "a IA estrutura", e quem
// escreve a fala é o escritor de cenas, lendo o briefing inteiro, com as falas entre aspas do autor dentro dele). É
// 'brief_only' quando: (a) sobra menos de 12 palavras; ou (b) o texto fala com o editor (2+ linhas dirigidas) e o que
// sobra são SÓ falas entre aspas curtas demais para o filme mais curto do Kineo 1 — o gancho e o fecho que a pessoa quer
// ouvir (17dd0c7a: "…o seguinte gancho: “Se a Lua…”" / "Termine com: “And the strangest…”", 26 palavras).
// UMA linha forte sozinha nunca vira 'brief_only' (D2): ela só sai se sobrar fala; senão nada muda.
//
// REVISÃO 2 (28/09, FIX-REVISAO-2 — KINEO1-BRIEF-PORTAO-2026-09-28): imperativo SOZINHO nunca prova briefing.
//   O caso: roteiro próprio de dicas para criador, UMA dica por linha — "Start every video with a hook. The first two
//   seconds decide…", "Use captions on every clip…", "Add trending music at low volume…", "Show your face in the first
//   3 seconds…". Cada linha abre com verbo de editor e fala de vídeo/legenda/música/TikTok → 'imperative'; com 2+ fortes
//   o texto passava por briefing e o revisor provou pelo bloco REAL da rota: (a) 60 s, 201 palavras → 5 dicas cortadas,
//   122 palavras, a duração descia 60→35 e o filme dizia "Here they are…" e dava UMA; (b) 7 regras → 'brief_only' → a
//   IA REESCREVIA o roteiro de quem pediu "Use my script as is"; (c) 116 palavras → 63 → 422 narration_too_short. E o
//   fecho de narração "This video must be shared with everyone who…" saía como about_film. A D2 só fechava o parágrafo.
//   REGRA: antes de qualquer linha imperativa, fraca, de sobra ou sobre o filme sair, o texto precisa de UM sinal que
//   roteiro nenhum tem (briefSignal — os 5 briefings reais da amostra de 60 dias têm pelo menos um):
//     · rótulo de PRODUÇÃO ("Estilo visual:", "Subtítulos:", "Visual style:", "Música:"…). Rótulo de METADADO (Title:,
//       Hashtags:, Tema:, CTA:, Caption:, Legenda:…) não conta: o roteiro do ChatGPT vem com eles em volta da fala;
//     · frase sobre ESTE filme com obrigação ("O vídeo deve…", "La narración debe…", "The video should…"). "Every
//       video should…"/"Cada vídeo deve…" é dica ao ouvinte, e "This video must be shared…" é fala (ação do espectador);
//     · pedido de filme com formato ou duração ("Crie um vídeo vertical 9:16 de 45–60 segundos", "Create a 40–45 second
//       vertical video", "Crea un vídeo de 60 segundos") — "Create videos every single day" é dica;
//     · linha ao EDITOR sobre narração, subtítulo, avatar/apresentador, formato (9:16, 1080x1920), marca d'água ou texto
//       na tela ("Use narração natural…", "Não use avatar", "Termine mostrando… na tela") — sem "every video / your
//       videos / todos os seus vídeos": quem fala dos vídeos DO OUVINTE está dando dica, não ordem.
//   Sem sinal: só os rótulos (de metadado) saem, como antes; tudo o mais fica na fala — sem rótulo, 'none' e a narração
//   não é tocada. Com sinal, a regra de antes vale inteira.

export const PASTED_BRIEF_EVENT = 'pasted_brief_detected'
export const PASTED_BRIEF_VERSION = 'kineo1_brief_colado_v2' // v2 = KINEO1-BRIEF-PORTAO-2026-09-28 (o portão do briefing)
/** Fala que sobra abaixo disto não é roteiro: é o resto de um briefing (a rota passa a IA a escrever). */
export const PASTED_BRIEF_MIN_NARRATION_WORDS = 12
/** Linha com mais palavras que isto E mais de uma frase é um PARÁGRAFO de fala: nunca é classificada inteira (D2). */
export const PASTED_BRIEF_PROSE_LINE_WORDS = 40
/** Falas entre aspas abaixo disto não enchem o filme mais curto do Kineo 1: 35 s × 95% (MIN_COVERAGE de
 *  lib/narrationFit) × 2,5 pal/s (a voz clássica mais lenta medida, lib/speechRate) ≈ 83 → 80. Num briefing, são o
 *  gancho e o fecho que o escritor de cenas usa — não o filme inteiro. */
export const PASTED_BRIEF_QUOTED_FILM_MIN_WORDS = 80

export type PastedBriefLineKind = 'label' | 'imperative' | 'about_film' | 'imperative_weak' | 'negation_weak' | 'residual'
export type PastedBriefSplit = {
  mode: 'none' | 'narration_kept' | 'brief_only'
  /** o texto sem as linhas de instrução — as linhas que ficaram, na ordem, intocadas ('none' = o texto inteiro) */
  narration: string
  /** as linhas de instrução, como a pessoa escreveu (vão para o escritor de cenas / o planejador de buscas) */
  brief: string[]
  kinds: PastedBriefLineKind[]
  narrationWords: number
  linesTotal: number
  /** KINEO1-BRIEF-PORTAO-2026-09-28 — o sinal que provou BRIEFING (null = nenhum: só rótulo de metadado pode ter saído) */
  signal: PastedBriefSignal | null
}

// Fronteira de palavra que entende acento ("não use": o \b do JS não vê fronteira depois de "ã").
const NW = '(?![\\p{L}\\p{N}])'

/** Tira a decoração do começo da linha (markdown, citação, bullet, emoji) — espelho de unwrapLabelHead em lib/scriptParser.ts. */
export function unwrapHead(line: string): string {
  let t = (line ?? '').toString()
  for (let i = 0; i < 2; i++) {
    t = t.replace(/^[\s>*_`~#•·\-–—]+/, '')
    t = t.replace(/^(?:[←-⯿☀-➿️‍\uD800-\uDFFF]+\s*)+/, '')
  }
  return t.trim()
}

const LABEL_RE = new RegExp(
  '^(?:estilo visual|estilo|visual style|style|visuais?|visuales|visuals?|subt[íi]tulos?|subtitles?|legendas?|captions?|' +
    'm[úu]sica|music|trilha sonora|banda sonora|soundtrack|efeitos sonoros|sound effects|formato|format|dura[çc][ãa]o|duraci[óo]n|duration|' +
    'tono|tone|c[âa]mera|c[áa]mara|camera|transi[çc][õo]es|transiciones|transitions|efeitos|efectos|effects|ritmo|pacing|idioma|language|' +
    'propor[çc][ãa]o|aspect ratio|resolu[çc][ãa]o|resoluci[óo]n|resolution|paleta(?: de cores| de colores)?|colou?r palette|cores|colores|colou?rs|' +
    'ilumina[çc][ãa]o|iluminaci[óo]n|lighting|p[úu]blico(?:[- ]alvo)?|audiencia|audience|plataforma|platform|t[íi]tulo|title|hashtags?|thumbnail|miniatura|' +
    'cta|call to action|objetivo|goal|instru[çc][õo]es|instrucciones|instructions|regras|reglas|rules|observa[çc][õo]es|observaciones|notas?|notes?|' +
    'imagens|im[áa]genes|images|b-?roll|footage|edi[çc][ãa]o|edici[óo]n|editing|montagem|montaje|tema|theme|topic|assunto|t[óo]pico)' +
    '\\s*(?:\\([^)]{0,40}\\))?\\s*[:：]',
  'iu',
)
// Verbos que falam com o EDITOR, no imperativo (PT/ES/EN). "Tom", "keep", "open", "make" ficam de fora: são aberturas
// comuns de narração ("Tom: …" é fala de personagem; "Keep watching", "Make no mistake").
const VERB_STRONG =
  'use|usar|utilize|coloque|inclua|adicione|acrescente|mostre|comece|inicie|termine|finalize|encerre|evite|fa[çc]a|crie|gere|troque|mude|alterne|mantenha|destaque|insira|narre|escreva|aplique|priorize|' +
  'usa|utiliza|utilice|incluye|incluya|a[ñn]ade|agrega|muestra|muestre|empieza|empiece|comienza|comience|termina|finaliza|evita|haz|haga|crea|genera|cambia|mant[ée]n|mantenga|destaca|inserta|narra|escribe|aplica|prioriza|' +
  'include|add|show|start|begin|finish|avoid|create|generate|switch|change|highlight|insert|narrate|write|apply'
// KINEO1-IMAGEM-V2-2026-09-28 (D1) — verbos de DIREÇÃO que só contam na sobra de um texto que já fala com o editor, e
// só com história/produção na mesma frase ("Conte a história…" de 17dd0c7a; "Keep Daniel's appearance… every scene",
// "Make everything look like real live-action footage", "Speak slowly… with increasing tension" de 801d0adf).
const VERB_DIRECTION =
  'conte|contar|explique|descreva|apresente|fale|diga|divida|repita|revele|corte|continue|preserve|aumente|construa|reproduza|siga|' +
  'cuente|cuenta|explica|describe|describa|presenta|divide|repite|revela|corta|contin[úu]a|contin[úu]e|preserva|aumenta|construye|reproduce|sigue|' +
  'tell|explain|present|split|repeat|reveal|cut|keep|make|preserve|increase|build|follow|end|open|speak|let|film|shoot|animate|zoom|pan|fade'
const VERB_HEAD_RE = new RegExp(`^(?:(?:n[ãa]o|no|nunca|never|do not|don['’]t)\\s+)?(?:${VERB_STRONG})${NW}`, 'iu')
// "segundos/seconds" só como ESPECIFICAÇÃO (D2): "a cada 2–3 segundos", "nos primeiros 2 segundos", "35 a 45 segundos",
// "every 2–4 seconds", "40–45 second". Solto ("em poucos segundos", "in 30 seconds a day") é narração.
const TEMPO_SPEC_RE_SRC = `(?:(?:a cada|cada|every|each|primeiros|primeros|first|[úu]ltimos|last)\\s+\\d+(?:[.,]\\d+)?(?:\\s*(?:[–—-]|a|to|e|y|and|ou|or|o)\\s*\\d+(?:[.,]\\d+)?)?\\s*(?:segundos?|seconds?|secs?|s)|\\d+(?:[.,]\\d+)?\\s*(?:[–—-]|a|to)\\s*\\d+(?:[.,]\\d+)?\\s*(?:segundos?|seconds?|secs?|s))`
const PRODUCTION_NOUN_SRC =
  `(?<![\\p{L}\\p{N}])(?:narra[çc][ãa]o|narraci[óo]n|narration|narrador(?:a)?|narrator|voice-?over|locu[çc][ãa]o|legendas?|subt[íi]tulos?|subtitles?|captions?|` +
  `avatar(?:es|s)?|b-?roll|footage|trilha(?: sonora)?|m[úu]sica|music|soundtrack|efeitos sonoros|sound effects?|cortes?|cuts|transi[çc][ãa]o|transi[çc][õo]es|transici[óo]n|transiciones|transitions?|` +
  `c[âa]mera|c[áa]mara|camera|gancho|hook|cta|call to action|like and subscribe|inscreva-se|logos?|marcas? d['’]?[áa]gua|marcas? de agua|watermarks?|thumbnail|miniatura|` +
  `formato|format|resolu[çc][ãa]o|resoluci[óo]n|resolution|efeitos visuais|efectos visuales|visual effects|texto na tela|texto en pantalla|on-screen text|na tela|en (?:la )?pantalla|on[- ]screen|` +
  `estilo visual|visual style|imagens|im[áa]genes|images|visuals|clipes?|clips?|cenas?|escenas?|scenes?|introdu[çc][ãa]o|introducci[óo]n|intro|pacing|aspect ratio|` +
  `v[íi]deos?|videos?|shorts|reels?|tiktok|youtube|instagram|${TEMPO_SPEC_RE_SRC})${NW}|9:16|16:9|1080p|4k|\\d{3,4}\\s*[x×]\\s*\\d{3,4}`
const PRODUCTION_NOUN_RE = new RegExp(PRODUCTION_NOUN_SRC, 'iu')
const PRODUCTION_NOUN_ALL_RE = new RegExp(PRODUCTION_NOUN_SRC, 'giu')
// Obrigação sobre o próprio filme. "vai/vão/va a/van a" SAÍRAM (D2): "Este vídeo vai mudar a forma como você enxerga o
// dinheiro" e "Este video va a cambiar…" são aberturas de narração, não instrução.
const ABOUT_FILM_RE = new RegExp(
  `^(?:o|a|el|la|the|este|esta|this|cada|each|todo|toda|every)\\s+(?:v[íi]deo|video|clipe?|clip|short|reel|cena|escena|scene|filme|film|narra[çc][ãa]o|narraci[óo]n|narration|roteiro|gui[óo]n|script|legendas?|subt[íi]tulos?|captions?|m[úu]sica|music)s?\\s+` +
    `(?:deve|devem|debe|deben|should|must|tem que|t[êe]m que|tiene que|tienen que|needs? to|precisa|precisam|necesita|necesitan|has to|have to)${NW}`,
  'iu',
)
const NEGATION_RE = new RegExp(
  `^(?:sin|sem|no|without|nada de|nenhum(?:a)?|ning[úu]n(?:a)?|zero)\\s+(?:logos?|marcas? de agua|marcas? d['’]?[áa]gua|watermarks?|avatar(?:es|s)?|m[úu]sica|music|textos?|text|` +
    `subt[íi]tulos|legendas|captions|subtitles|introdu[çc][ãa]o|introducci[óo]n|intro|personas reales|pessoas reais|real people|caras|rostos|faces|narrador|narrator|narra[çc][ãa]o|narraci[óo]n|narration|` +
    `di[áa]logos?|dialogues?|voice-?over|efeitos|efectos|effects|transi[çc][õo]es|transiciones|transitions)${NW}`,
  'iu',
)
// Rótulo de FALA com conteúdo: o texto é roteiro rotulado — quem decide é o parser, não esta peça.
const SPEECH_LABEL_RE = /^(?:narra[çc][ãa]o|narraci[óo]n|narration|narrador(?:a)?|narrator|voice\s?-?\s?over|voiceover|vo|locu[çc][ãa]o|locutor(?:a)?|fala|falas|texto falado|di[áa]logo|dialogue|speech)\s*(?:\([^)]{0,60}\))?\s*[:：]\s*\S/iu
// O mesmo rótulo de FALA sozinho na linha ("Narração:" com a fala na linha de baixo, e90a2f9c): marca a fala, não é instrução.
const SPEECH_LABEL_ALONE_RE = /^(?:narra[çc][ãa]o|narraci[óo]n|narration|narrador(?:a)?|narrator|voice\s?-?\s?over|voiceover|vo|locu[çc][ãa]o|locutor(?:a)?|fala|falas|texto falado|di[áa]logo|dialogue|speech|script|roteiro|gui[óo]n)\s*(?:\([^)]{0,60}\))?\s*[:：]\s*$/iu

// ── KINEO1-BRIEF-PORTAO-2026-09-28 (FIX-REVISAO-2): o sinal que prova BRIEFING (ver REVISÃO 2 no topo) ──
// Rótulo de METADADO: vem em volta da fala do roteiro do ChatGPT (Title:/Hashtags:/Caption:) — não prova briefing.
const METADATA_LABEL_RE = new RegExp(
  '^(?:t[íi]tulo|title|hashtags?|thumbnail|miniatura|caption|legenda|cta|call to action|objetivo|goal|tema|theme|topic|assunto|t[óo]pico)' +
    '\\s*(?:\\([^)]{0,40}\\))?\\s*[:：]',
  'iu',
)
// Frase sobre ESTE filme com obrigação: artigo definido/demonstrativo, sem adjetivo no meio ("The first video should…" é
// dica), e só o que é do filme — vídeo, narração/narrador/voz, roteiro, animação, o resultado final. "Every video
// should…"/"Cada vídeo deve…" e "The music should…" (assunto das dicas) não entram.
const ABOUT_THIS_FILM_RE = new RegExp(
  `^(?:o|a|el|la|the|este|esta|this)\\s+(?:v[íi]deo|video|clipe?|clip|short|reel|filme|film|narra[çc][ãa]o|narraci[óo]n|narration|narrador(?:a)?|narrator|` +
    `voz|voice|voice-?over|locu[çc][ãa]o|locutor(?:a)?|roteiro|gui[óo]n|script|anima[çc][ãa]o|animaci[óo]n|animation|resultado final|final result|end result|` +
    `produto final|final product|final video|v[íi]deo final)\\s+` +
    `(?:deve|devem|debe|deben|should|must|tem que|t[êe]m que|tiene que|tienen que|needs? to|precisa|precisam|necesita|necesitan|has to|have to)${NW}`,
  'iu',
)
// Obrigação que é AÇÃO DO ESPECTADOR ("This video must be shared…", "Este vídeo precisa ser visto…", "must go viral").
const VIEWER_ACTION_RE = new RegExp(
  `(?:deve|devem|debe|deben|should|must|tem que|t[êe]m que|tiene que|tienen que|needs? to|precisa|precisam|necesita|necesitan|has to|have to)\\s+` +
    `(?:(?:be|ser|get)\\s+(?:\\p{L}+\\s+)?(?:shared|watched|seen|viewed|heard|saved|sent|forwarded|remembered|compartilhad[oa]s?|vist[oa]s?|assistid[oa]s?|` +
    `salv[oa]s?|enviad[oa]s?|lembrad[oa]s?|ouvid[oa]s?|compartid[oa]s?|guardad[oa]s?|escuchad[oa]s?|recordad[oa]s?)|(?:go|ir)\\s+viral|viralizar|reach|chegar|llegar)${NW}`,
  'iu',
)
// Pedido de filme: verbo de criação + artigo ou "este/this" ("Create a funny 60–90 second 3D story", "Crie um vídeo
// vertical 9:16…", "Create this YouTube Short…"); só prova com formato ou duração na frase (FORMAT_SPEC_RE).
const CREATE_REQUEST_RE = new RegExp(
  `^(?:(?:please|por favor)[,\\s]+)?(?:create|make|generate|produce|crie|cria|fa[çc]a|gere|produza|crea|haz|haga|genera|produzca|quero|quiero|i want|i need|preciso de|necesito)\\s+` +
    `(?:a|an|um|uma|un|una|one|this|este|esta|esse|essa|ese|esa)${NW}`,
  'iu',
)
const FORMAT_SPEC_RE = new RegExp(
  `9:16|16:9|1:1|4:5|(?<![\\p{L}\\p{N}])(?:vertical|horizontal|youtube shorts?|reels|tiktok)${NW}|` +
    `\\d+(?:[.,]\\d+)?\\s*(?:(?:[–—-]|a|to|e|y|and|ou|or|o)\\s*\\d+(?:[.,]\\d+)?\\s*)?-?\\s*(?:segundos?|seconds?|secs?|s|minutos?|minutes?|mins?|min)${NW}`,
  'iu',
)
// Linha ao EDITOR: o que só quem monta o filme decide (narração, subtítulo, avatar, formato, marca d'água, texto na tela,
// a imagem de referência anexada). "captions/legendas" e "música" ficam de fora: são assunto de metade das dicas.
const EDITOR_NOUN_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:narra[çc][ãa]o|narraci[óo]n|narration|narrador(?:a)?|narrator|voice-?over|voz em off|voz en off|locu[çc][ãa]o|locutor(?:a)?|` +
    `subt[íi]tulos?|subtitles?|avatar(?:es|s)?|apresentador(?:a)?|presentador(?:a)?|presenter|marcas? d['’]?[áa]gua|marcas? de agua|watermarks?|` +
    `aspect ratio|propor[çc][ãa]o|resolu[çc][ãa]o|resoluci[óo]n|resolution|texto na tela|texto en (?:la )?pantalla|on-screen text|na tela|en (?:la )?pantalla|on[- ]screen|` +
    `(?:provided|uploaded|attached|reference|given)\\s+(?:image|photo|picture)s?|imagens? (?:enviadas?|anexadas?|fornecidas?|de refer[êe]ncia)|` +
    `im[áa]gen(?:es)? (?:adjuntas?|proporcionadas?|de referencia))${NW}|9:16|16:9|1080p|4k|\\d{3,4}\\s*[x×]\\s*\\d{3,4}`,
  'iu',
)
// Os vídeos DO OUVINTE ("every video", "your videos", "todos os seus vídeos", "tus videos"): é dica, não ordem ao editor.
const OUVINTE_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:every|each|all|your|todos|todas|cada|seus?|suas?|teus?|tuas?|tus?|sus?)\\s+` +
    `(?:(?:os|as|los|las|of|the|seus|suas|teus|tuas|tus|sus|your|single|new|next|pr[óo]xim[oa]s?)\\s+){0,2}` +
    `(?:v[íi]deos?|videos?|clips?|clipes?|shorts|reels?|posts?|tiktoks?|conte[úu]dos?|content|canal|channel)${NW}`,
  'iu',
)

// ── KINEO1-IMAGEM-V2-2026-09-28 (D1): a SOBRA de instrução, frase a frase ──
const STORY_NOUN_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:hist[óo]rias?|story|stories|roteiro|gui[óo]n|script|narrativa|conte[úu]do|content|fatos|facts|hechos|consequ[êe]ncias|consecuencias|consequences|` +
    `ritmo|tens[ãa]o|tensi[óo]n|tension|suspense|suspenso|personagens?|personajes?|characters?|atmosfera|atm[óo]sfera|atmosphere|apar[êe]ncia|apariencia|appearance|frases|sentences|words|palavras|palabras)${NW}`,
  'iu',
)
const ADVERBIO = `(?:\\p{L}+(?:ly|mente)\\s+)?`
const NEGA = `(?:(?:n[ãa]o|no|nunca|never|do not|don['’]t)\\s+)?`
const DIRECTION_HEAD_RE = new RegExp(`^${ADVERBIO}${NEGA}(?:${VERB_STRONG}|${VERB_DIRECTION})${NW}`, 'iu')
const AFTER_SEPARATOR_VERB_RE = new RegExp(
  `(?:[;:]|,(?=\\s*(?:depois|ent[ãa]o|then|luego|despu[ée]s)\\s))\\s*(?:(?:e|y|and|depois|ent[ãa]o|then|luego|despu[ée]s)\\s+)?(?:${VERB_STRONG}|${VERB_DIRECTION})${NW}`,
  'iu',
)
const ABOUT_RESULT_RE = new RegExp(
  `^(?:o|a|os|as|el|la|los|las|the|este|esta|estes|estas|this|these|cada|each|todo|toda|todos|todas|every|all)\\s+(?:[\\p{L}-]+\\s+){0,2}?` +
    `(?:resultados?|results?|produto|product|edi[çc][ãa]o|edici[óo]n|edit|visuais|visuales|visuals?|imagens|im[áa]genes|images|tomadas|shots?|planos?|legendas|subt[íi]tulos|subtitles|captions|` +
    `cenas|escenas|scenes|clipes|clips|m[úu]sica|music|narra[çc][ãa]o|narraci[óo]n|narration|voz|voice|c[âa]mera|c[áa]mara|camera|segundos?|seconds?|quadros?|frames?|` +
    `frases|sentences|words|palavras|palabras|v[íi]deos?|videos?|filmes?|films?)\\s+(?:[\\p{L}-]+\\s+){0,2}?` +
    `(?:deve|devem|debe|deben|should|must|tem que|t[êe]m que|tiene que|tienen que|needs? to|precisa|precisam|necesita|necesitan|has to|have to)${NW}`,
  'iu',
)
const SHOT_HEAD_RE = new RegExp(
  `^(?:(?:(?:extreme|big|medium|wide)\\s+)?close-?ups?${NW}|(?:wide|medium|long|establishing|aerial|tracking|over[- ]the[- ]shoulder|pov|drone|final|opening)\\s+shots?${NW}|` +
    `(?:camera|c[âa]mera|c[áa]mara)\\s+(?:\\p{L}+\\s+)?(?:moves?|pushes|pulls|pans?|turns?|zooms?|tilts?|tracks?|follows?|cuts?|se move|move|gira|segue|sigue|aproxima|afasta|aleja)${NW}|` +
    `(?:instant\\s+)?cut(?:\\s+to${NW}|\\s*[.!]?\\s*$)|corte (?:para|a)${NW}|fade (?:to|in|out)${NW})`,
  'iu',
)
const PARA_X_RE = new RegExp(
  `^(?:for|para|in|on|at|during|durante|na|no|nas|nos|en|em|with|com|con|after|before|antes de|depois de|despu[ée]s de)\\s+[^,.;:!?]{1,60},\\s*${ADVERBIO}${NEGA}(?:(${VERB_STRONG})|(?:${VERB_DIRECTION}))${NW}`,
  'iu',
)
const NEG_HEAD_RE = /^(?:do not|don['’]t|never|n[ãa]o|nunca|no|sin|sem|without|nada de|nenhum(?:a)?|ning[úu]n(?:a)?)\s+/iu

const wordsOf = (s: string) => (s ?? '').trim().split(/\s+/).filter(Boolean).length
/** Frases da linha (fronteira = . ! ? … seguido de espaço; aspa fechando depois do "?" não corta). */
const frasesDe = (u: string) => u.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean)
const abreComAspas = (u: string) => /^["“”„«»‘’'「『]/u.test(u)
const forte = (k: PastedBriefLineKind | null) => k === 'label' || k === 'imperative' || k === 'about_film'
const fraca = (k: PastedBriefLineKind | null) => k === 'imperative_weak' || k === 'negation_weak'

/** Classe de UMA frase (a 1ª da linha): o substantivo de produção só vale nela (D2). */
function classifySentence(s: string): PastedBriefLineKind | null {
  if (ABOUT_FILM_RE.test(s)) return 'about_film'
  if (VERB_HEAD_RE.test(s)) return PRODUCTION_NOUN_RE.test(s) ? 'imperative' : 'imperative_weak'
  if (NEGATION_RE.test(s)) return 'negation_weak'
  return null
}

/** Classe da linha (já desembrulhada): forte, fraca ou fala (null). Exportado para o guardião. */
export function classifyPastedLine(line: string): PastedBriefLineKind | null {
  const u = unwrapHead(line)
  // Linha que abre com aspas nunca casa: toda regra ancora no começo da linha e unwrapHead não desembrulha aspa.
  if (!u || u.length > 600) return null
  if (LABEL_RE.test(u)) return 'label'
  const frases = frasesDe(u)
  // D2: parágrafo de fala (várias frases, > 40 palavras) nunca é lido como instrução pela linha inteira.
  if (frases.length > 1 && wordsOf(u) > PASTED_BRIEF_PROSE_LINE_WORDS) return null
  return classifySentence(frases[0] ?? u)
}

/** A frase tem forma de instrução ao editor (regra larga — só roda na sobra de um texto que já fala com o editor). */
function fraseDeInstrucao(s: string): boolean {
  const k = classifySentence(s)
  if (k === 'imperative' || k === 'about_film') return true
  const producao = PRODUCTION_NOUN_RE.test(s)
  const assunto = producao || STORY_NOUN_RE.test(s)
  if (DIRECTION_HEAD_RE.test(s) && assunto) return true
  if (AFTER_SEPARATOR_VERB_RE.test(s) && assunto) return true
  if (ABOUT_RESULT_RE.test(s)) return true
  if (SHOT_HEAD_RE.test(s)) return true
  const px = PARA_X_RE.exec(s)
  if (px && (px[1] || assunto)) return true
  if (NEG_HEAD_RE.test(s) && producao) return true
  const palavras = wordsOf(s)
  if (producao && palavras <= 4) return true // ficha técnica: "1080x1920.", "16:9 cinematic aspect ratio."
  if (palavras <= 15 && (s.match(PRODUCTION_NOUN_ALL_RE) ?? []).length >= 2) return true // "Designed for TikTok, YouTube Shorts and Instagram Reels."
  return false
}

/** Linha que sobrou e ainda é instrução (D1). Linha com aspas nunca; parágrafo longo só pela MAIORIA das frases. */
export function isResidualInstruction(line: string): boolean {
  const u = unwrapHead(line)
  if (!u || abreComAspas(u) || SPEECH_LABEL_ALONE_RE.test(u) || u.length > 1200) return false
  const frases = frasesDe(u)
  // Cadeia de ordens: 2+ frases e a MAIORIA abre com verbo de direção, mesmo sem substantivo de produção (801d0adf:
  // "Keep the horror suspenseful… Do not reveal the entity too early. Keep the staircase… Make the final whisper feel…").
  const ordens = frases.filter((f) => DIRECTION_HEAD_RE.test(f)).length
  if (frases.length >= 2 && ordens * 2 > frases.length) return true
  const n = frases.filter(fraseDeInstrucao).length
  if (n === 0) return false
  if (frases.length > 1 && wordsOf(u) > PASTED_BRIEF_PROSE_LINE_WORDS) return n * 2 >= frases.length
  return true
}

// KINEO1-BRIEF-PORTAO-2026-09-28 (FIX-REVISAO-2) — aspas não contam: "Você já sabia disso?" é a fala citada, não a ordem.
const semAspas = (s: string) => s.replace(/[“"«„][^“”"«»„]{0,400}[”"»“]/gu, ' ')

export type PastedBriefSignal = 'production_label' | 'about_film' | 'create_request' | 'editor_line'

function sinalDasLinhas(lines: string[], kinds: Array<PastedBriefLineKind | null>): PastedBriefSignal | null {
  for (let i = 0; i < lines.length; i++) {
    const u = unwrapHead(lines[i])
    if (!u || abreComAspas(u)) continue
    const k = kinds[i]
    if (k === 'label') {
      if (!METADATA_LABEL_RE.test(u)) return 'production_label'
      continue
    }
    const f = semAspas(frasesDe(u)[0] ?? u)
    if (ABOUT_THIS_FILM_RE.test(f) && !VIEWER_ACTION_RE.test(f)) return 'about_film'
    if (OUVINTE_RE.test(f)) continue // "Crie um gancho de 3 segundos em cada vídeo" / "Use subtitles in every video": dica
    if (CREATE_REQUEST_RE.test(f) && FORMAT_SPEC_RE.test(f)) return 'create_request'
    if ((k === 'imperative' || k === 'imperative_weak') && EDITOR_NOUN_RE.test(f)) return 'editor_line'
  }
  return null
}

/** O sinal que prova que o texto é um BRIEFING (o 1º achado, na ordem das linhas) — null = roteiro. Exportado para o guardião. */
export function briefSignal(text: string | null | undefined): PastedBriefSignal | null {
  const lines = (text ?? '').toString().replace(/\r\n?/g, '\n').split('\n')
  return sinalDasLinhas(lines, lines.map((l) => (l.trim() ? classifyPastedLine(l) : null)))
}

/** Separa as linhas de instrução à IA da fala do autor. Puro; nunca muda uma palavra da fala. */
export function splitPastedBrief(text: string | null | undefined): PastedBriefSplit {
  const raw = (text ?? '').toString().replace(/\r\n?/g, '\n')
  const lines = raw.split('\n')
  const linesTotal = lines.filter((l) => l.trim()).length
  const nada: PastedBriefSplit = { mode: 'none', narration: raw, brief: [], kinds: [], narrationWords: wordsOf(raw), linesTotal, signal: null }
  if (!raw.trim()) return nada
  if (lines.some((l) => SPEECH_LABEL_RE.test(unwrapHead(l)))) return nada
  const lidas = lines.map((l) => (l.trim() ? classifyPastedLine(l) : null))
  if (!lidas.some(forte)) return nada
  // KINEO1-BRIEF-PORTAO-2026-09-28 (FIX-REVISAO-2) — sem sinal de BRIEFING, imperativo, frase sobre o filme, fraca e sobra
  // são FALA (a dica "Start every video with a hook"); só o rótulo — de metadado, o único que chega aqui sem sinal — sai.
  const signal = sinalDasLinhas(lines, lidas)
  const kinds = signal ? lidas : lidas.map((k) => (k === 'label' ? k : null))
  const fortes = kinds.filter(forte).length
  if (fortes === 0) return nada
  // D1: só um texto que fala COM O EDITOR (imperativo ou frase sobre o filme) tem a sobra examinada; rótulos sozinhos não.
  const falaComEditor = kinds.some((k) => k === 'imperative' || k === 'about_film')
  const finais: Array<PastedBriefLineKind | null> = lines.map((l, i) => {
    const k = kinds[i]
    if (forte(k) || (fortes >= 2 && fraca(k))) return k
    if (!falaComEditor || !l.trim()) return null
    return isResidualInstruction(l) ? 'residual' : null
  })
  const brief: string[] = []
  const tiradas: PastedBriefLineKind[] = []
  const ficam: string[] = []
  lines.forEach((l, i) => {
    const k = finais[i]
    if (k) { brief.push(l.trim()); tiradas.push(k) } else ficam.push(l)
  })
  const narration = ficam.join('\n').replace(/^\n+|\n+$/g, '')
  const narrationWords = wordsOf(narration)
  let mode: PastedBriefSplit['mode']
  if (fortes < 2) {
    // D2: UMA linha forte nunca troca o texto para "a IA estrutura" — ela (e a sobra de instrução) sai se sobrar fala.
    mode = narrationWords >= PASTED_BRIEF_MIN_NARRATION_WORDS ? 'narration_kept' : 'none'
  } else if (narrationWords < PASTED_BRIEF_MIN_NARRATION_WORDS) {
    mode = 'brief_only'
  } else {
    // D1: num briefing que fala com o editor, o que sobra só entre aspas e curto demais para um filme é o gancho/fecho
    // que o autor quer ouvir — o escritor de cenas escreve o filme em volta, lendo o briefing inteiro (aspas dentro).
    const cheias = ficam.map((l) => unwrapHead(l)).filter(Boolean)
    const soAspas = cheias.length > 0 && cheias.every(abreComAspas)
    const dirigidas = tiradas.filter((k) => k === 'imperative' || k === 'about_film' || k === 'residual').length
    mode = soAspas && dirigidas >= 2 && narrationWords < PASTED_BRIEF_QUOTED_FILM_MIN_WORDS ? 'brief_only' : 'narration_kept'
  }
  if (mode === 'none') return nada
  return { mode, narration, brief, kinds: tiradas, narrationWords, linesTotal, signal }
}
