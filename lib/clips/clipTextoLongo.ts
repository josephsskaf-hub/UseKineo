// KINEO-CENA-PEDIDO-3010 — pedido do revisor de vídeos (29/10): 2 primeiros vídeos de brasileiros vieram como clipe de 12 s
// de um homem real de terno, porque a pessoa colou um ROTEIRO de filme ("Crie um vídeo animado 1080x1920 em terceira pessoa…")
// na tela do Clipe. A tela não avisava que aquilo vira UM clipe curto, e o "animado" do pedido não chegava ao prompt.
// Lib pura: o aviso de roteiro longo (com a porta para o Filme narrado, texto preenchido) e o estilo pedido no texto.

/** Referência antiga (até 14/11 o texto com mais de 60 palavras já era filme). Desde a v2 de
 *  KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 o tamanho SOZINHO não decide nada: precisa de um sinal de filme. */
export const CLIP_ROTEIRO_PALAVRAS = 60

/** v2.1 — o teto quando quem chama não diz o motor: o MENOR dos tetos dos motores de clipe na oferta (lib/clips/clipCatalog.ts
 *  offeredSecondsFor, sem os aposentados de lib/engineLaunch.ts OFFER_RETIRED_ENGINE_KEYS): hoje o MiniMax H3 Turbo, 12 s.
 *  Fica copiado aqui para a lib seguir sem import (os guardiões a carregam sozinha); o guardião
 *  scripts/test-clipe-roteiro-qualquer-lingua-1411.mjs lê o catálogo REAL e fica vermelho se os dois se separarem.
 *  (Na v2 era 15 s, o MAIOR teto: uma história de "15-second" virou clipe e entrou num motor de 12 s, sem 3 s e sem o enredo.) */
export const CLIP_MAX_SEGUNDOS_PADRAO = 12

/** Opções: `maxSegundos` = o maior tempo que o MOTOR do pedido faz (a tela /clips: max(offeredSecondsFor(motor)); o Studio:
 *  o teto do modo clipe). Sem ela, CLIP_MAX_SEGUNDOS_PADRAO. */
export interface OpcoesDoRoteiro { maxSegundos?: number }
function tetoDoClipe(opcoes?: OpcoesDoRoteiro): number {
  const n = opcoes?.maxSegundos
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : CLIP_MAX_SEGUNDOS_PADRAO
}

/** O texto tem cara de roteiro de filme? (KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 v2: sinal de filme decide; sem sinal de
 *  filme, um sinal de clipe — plano descrito com câmera, foto como quadro inicial, blocos de tempo dentro do clipe — tira o
 *  peso do número de frases; sobra o conto de 5+ frases.) */
export function pareceRoteiroDeFilme(texto: string, opcoes?: OpcoesDoRoteiro): boolean {
  const t = String(texto ?? '').trim()
  if (!t) return false
  const max = tetoDoClipe(opcoes)
  if (temSinalDeFilme(t, max)) return true
  if (temSinalDeClipe(t, max)) return false
  return frasesDoTexto(t) >= CLIP_CONTO_FRASES // KINEO-CLIPE-CONTO-3010
}

// ═══ KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 v2 [ensaio no corpus real, 49 pedidos de 30 dias] ═══
// Dos 17 pedidos que a regra antiga chamava de filme, 9 eram UMA cena longa de clipe (urso, coelho em 10 s, homem no palco,
// navio na tempestade, vila de pescadores, 3 Pompeias com "use the uploaded image as the exact starting frame" e blocos
// 0–3 s / 3–6 s / 6–10 s) — e foram os 3 únicos downloads. Só passavam de 60 palavras. Agora o tamanho não decide sozinho.
/** Sinais de filme: qualquer um basta. */
export function temSinalDeFilme(t: string, max: number = CLIP_MAX_SEGUNDOS_PADRAO): boolean {
  if (PEDE_FALA_RE.test(t) || FALA_DE_PERSONAGEM_RE.test(t)) return true // KINEO-REVISOR-RESTO-3010
  if (FALA_PARA_A_CAMERA_RE.test(t)) return true // v2.1
  if (duracaoPedida(t) > max) return true
  if (falasEntreAspas(t) >= CLIP_FALAS_ENTRE_ASPAS) return true
  if (PEDE_NARRACAO_RE.test(t)) return true
  if (MARCA_DE_ROTEIRO_RE.test(t)) return true
  if (ENREDO_RE.test(t)) return true // v2.1
  if (cenasNumeradasDeFilme(t, max)) return true
  return PASSA_O_TEMPO_RE.test(t)
}
/** Sinais de clipe: a foto enviada como quadro inicial, blocos de tempo que cabem no clipe, ou o plano descrito com 2+ termos
 *  de câmera/luz/lente. Só pesam quando não há sinal de filme. */
export function temSinalDeClipe(t: string, max: number = CLIP_MAX_SEGUNDOS_PADRAO): boolean {
  if (FOTO_COMO_QUADRO_RE.test(t)) return true
  const blocos = fimDosBlocosDeTempo(t)
  if (blocos.length > 0 && Math.max(...blocos) <= max) return true
  return termosDeCamera(t) >= CLIP_TERMOS_DE_CAMERA
}

// v2.1 [corpus real 14/11] — dois monólogos dos EUA só eram filme por terem 16 frases: quem fala para a câmera ou conta uma
// história pede FALA. Formas que não aparecem num pedido de plano mudo; nas 4 outras línguas do site, só as formas certas.
const FALA_PARA_A_CAMERA_RE = /(?<![\p{L}])(?:(?:speaks?|speaking|talks?|talking|says?) (?:directly )?(?:to|into) (?:the )?camera|tell(?:s|ing)? (?:this|the|a|his|her|their|my|our) story|fala(?:ndo)? (?:direto )?(?:para|pra|com) a c[âa]mera|conta(?:ndo)? (?:a|sua|esta|essa|uma) hist[óo]ria|habla(?:ndo)? (?:a|hacia) (?:la )?c[áa]mara|cuenta(?:ndo)? (?:la|su|esta|una) historia|contando (?:la|su|esta|una) historia|parle (?:face )?(?:à|a) la cam[ée]ra|raconte (?:l'|son |sa |cette |une )histoire|spricht (?:direkt )?in die kamera|erz[äa]hlt (?:die|seine|ihre|diese|eine) geschichte)(?![\p{L}])/iu
// v2.1 [corpus real 14/11] — a história de "15-second" com "Plot:" e "In the finale" virou clipe na v2. Marca EXPLÍCITA de
// enredo é sinal de filme (o cliente quer a história contada, não um plano), mesmo quando o tempo cabe no motor. Só rótulo
// com dois-pontos ou expressão de enredo: "grand finale" de fogos de artifício não conta.
const ENREDO_RE = /(?<![\p{L}])(?:(?:plot|storyline|synopsis|sinopse|sinopsis|enredo|trama|handlung|intrigue)\s*:|in the finale|plot twist|reviravolta final|giro final|rebondissement final)(?![\p{L}])/iu

// KINEO-REVISOR-RESTO-3010 — revisões de 30/10: 6 de 19 filmes eram clipe MUDO para quem pediu fala (urdu, espanhol, PT),
// e um anúncio de 30 s virou clipe de 10 s. Texto curto também é roteiro quando pede voz, fala ou mais tempo do que o clipe tem.
// (A duração passou para duracaoPedida, em qualquer língua e com o teto lido do catálogo — era 13 s fixo.)
const PEDE_FALA_RE = /\b(?:narrat(?:or|ion|ed)|voice[\s-]?over|voiceover|dialogues?|speaking|talking to (?:the )?camera|says to the camera|narrador|narra[çc][aã]o|narrado|locu[çc][aã]o|locutor|di[aá]logos?|falando|fala para a c[aâ]mera|hablando|voz en off|narraci[oó]n)\b/i
const MARCA_DE_ROTEIRO_RE = /\b(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF)\b|\[Pexels:/

// Cenas numeradas ("Scene 1", "Cena 2", "Shot 3"): 3 ou mais, e o tempo que elas pedem passa do clipe (ou não dizem tempo).
// Uma ou duas marcas sozinhas não bastam (até 14/11, "Scene 1" sozinho já era filme).
const CENA_NUMERADA_RE = /(?<![\p{L}])(?:scene|cena|escena|szene|scène|shot|plano|tomada)\s*#?\s*(\d{1,2})(?!\d)/giu
export const CLIP_CENAS_DE_FILME = 3
function cenasNumeradasDeFilme(t: string, max: number): boolean {
  const cenas = new Set(Array.from(t.matchAll(CENA_NUMERADA_RE), (m) => m[1]))
  if (cenas.size < CLIP_CENAS_DE_FILME) return false
  const blocos = fimDosBlocosDeTempo(t)
  const total = blocos.length > 0 ? Math.max(...blocos) : temposPedidos(t).reduce((s, n) => s + n, 0)
  return total === 0 || total > max
}

// Passagem de tempo dentro da história (um plano de clipe não atravessa o dia): 5 línguas do site.
const PASSA_O_TEMPO_RE = /(?<![\p{L}])(?:(?:no|ao) fim do dia|no dia seguinte|na manh[aã] seguinte|(?:dias|semanas|meses|anos) depois|at the end of the day|the next (?:day|morning)|(?:days|weeks|months|years) later|later that (?:day|night)|al final del d[ií]a|al d[ií]a siguiente|(?:d[ií]as|semanas|meses|a[ñn]os) despu[ée]s|am (?:n[äa]chsten|folgenden) (?:tag|morgen)|(?:tage|wochen|monate|jahre) sp[äa]ter|am ende des tages|le lendemain|(?:quelques )?(?:jours|semaines|mois|ann[ée]es) plus tard|[àa] la fin de la journ[ée]e)(?![\p{L}])/iu

// Sinais de clipe.
const FOTO_COMO_QUADRO_RE = /(?<![\p{L}])(?:(?:starting|start|first|opening|initial) frame|uploaded (?:image|photo|picture)|frame inicial|quadro inicial|primeiro quadro|imagem enviada|foto enviada|primer (?:fotograma|cuadro)|imagen (?:subida|cargada)|image de d[ée]part|premi[èe]re image|startbild)(?![\p{L}])/iu
const TERMO_DE_CAMERA_RE = /(?<![\p{L}])(?:camera|c[âa]mera|c[áa]mara|kamera|cam[ée]ra|close[\s-]?up|primeiro plano|primer plano|gros plan|nahaufnahme|wide shot|plano (?:geral|aberto|general)|plan large|slow[\s-]?motion|c[âa]mera lenta|c[áa]mara lenta|ralenti|zeitlupe|dolly|tracking shot|travelling|pan(?:s|ning)?|zoom(?:s|ing)?|tilt|orbit(?:s|ing)?|drone|aerial|a[ée]re[ao]|lighting|ilumina[çc][ãa]o|iluminaci[óo]n|[ée]clairage|beleuchtung|golden hour|hora dourada|backlight|backlit|contraluz|volumetric|cinematic|cinematogr[áa]fic[oa]|cin[ée]matographique|filmisch|4k|8k|depth of field|profundidade de campo|bokeh|lens|lente|objectif|objektiv|\d{2,3}\s?mm|photorealistic|fotorrealista|hyper[\s-]?realistic|ultra[\s-]?realistic|realistic|realista|r[ée]aliste|realistisch)(?![\p{L}])/giu
export const CLIP_TERMOS_DE_CAMERA = 2
/** Quantos termos DIFERENTES de câmera/luz/lente o texto usa (plano descrito, não história contada). */
export function termosDeCamera(texto: string): number {
  return new Set(Array.from(String(texto ?? '').matchAll(TERMO_DE_CAMERA_RE), (m) => m[0].toLowerCase().replace(/\s+/g, ' '))).size
}
// KINEO-CLIPE-CONTO-3010 — revisão de 30/10 (15:45): o conto das 3:33 (~12 frases, BR) e 7 contos de espelho/porta do mesmo
// cliente (ES) viraram clipe que acaba no susto, 0 downloads — prosa curta sem as palavras de fala passava sem aviso.
/** Com tantas frases, o texto é um conto (começo, meio e fim), não um plano de 5–12 s. */
export const CLIP_CONTO_FRASES = 5
/** Frases do texto: termina em . ! ? … (reticências contam uma vez); linha não vazia sem pontuação também conta. */
export function frasesDoTexto(texto: string): number {
  return String(texto ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
    .reduce((n, linha) => n + Math.max(1, (linha.match(FIM_DE_FRASE_RE) ?? []).length), 0)
}
// KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 — também o ponto árabe (؟), o danda (।) e o ponto chinês/japonês (。！？, que vem
// grudado na frase seguinte, sem espaço).
const FIM_DE_FRASE_RE = /[.!?…؟।]+(?=\s|$)|[。！？]+/g

// ═══ KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 [revisor 14/11 12:21] ═══
// 1º vídeo de um cliente dos EUA, nota 5, não baixou: um roteiro de desenho 3D de 30 s em ÁRABE (três falas entre «», contagem,
// narração) virou um clipe de 5 s. As regras de cima só conheciam as 5 línguas do site (en/de/es/pt/fr) e a contagem de palavras
// por espaço (japonês, chinês e tailandês não têm espaço). Aqui, sinais que não dependem da língua, decididos por código:
//   · duração maior que a do clipe, em qualquer algarismo (٠-٩ ۰-۹ ०-९ ０-９) e com a palavra de segundo/minuto de 15 línguas;
//   · duas ou mais FALAS entre aspas de qualquer tipo (« » “ ” „ “ " " 「 」 『 』), com 3+ palavras (ou 5+ ideogramas) cada;
//   · pedido de narração/locução nas línguas que dá para cobrir sem falso positivo;
//   · (v1 tinha "texto longo em escrita sem espaço"; saiu na v2: tamanho sozinho não decide — o conto em japonês ou chinês
//     é pego pelas frases, que agora contam 。！？).
// "16:9", "9:16" e "1080x1920" não são duração: o número precisa da palavra de tempo logo depois.
/** Algarismos de outras escritas viram 0-9 (só para medir duração). */
function algarismosLatinos(t: string): string {
  return t.replace(/[٠-٩۰-۹०-९０-９]/g, (c) => {
    const n = c.charCodeAt(0)
    for (const base of [0x0660, 0x06f0, 0x0966, 0xff10]) if (n >= base && n <= base + 9) return String(n - base)
    return c
  })
}
// Número + palavra de segundo/minuto. Unidades com fronteira à direita (palavra inteira; turco aceita sufixo: "30 saniyelik")
// e unidades de escritas sem espaço (CJK, coreano, tailandês), sem fronteira.
const UNIDADE_SEGUNDO = '(?:s|secs?|seconds?|secondes?|secondi|segundos?|sekunden?|sek|секунд[аы]?|сек|ثاني[ةه]|ثانیه|ثوان[يى]?|saniye\\p{L}*|detik|giây|सेकंड|सेकेंड|सेकण्ड)'
const UNIDADE_MINUTO = '(?:min(?:s|utes?|utos?|uten|uti)?|минут[аы]?|мин|دقيق[ةه]|دقائق|dakika\\p{L}*|menit|phút|मिनट)'
const UNIDADE_SEM_ESPACO_SEG = '(?:秒|초|วินาที)'
const UNIDADE_SEM_ESPACO_MIN = '(?:分钟|分間|分(?!の)|분|นาที)'
const ANTES_DO_NUMERO = '(?<![\\d:.,x×/])'
const FIM_DA_UNIDADE = '[\\p{M}]*(?![\\p{L}\\p{M}])'
const TEMPO_RE = new RegExp(
  `${ANTES_DO_NUMERO}(\\d{1,3})(?!\\d)[\\s-]*(?:(${UNIDADE_SEGUNDO})${FIM_DA_UNIDADE}|(${UNIDADE_SEM_ESPACO_SEG})|(${UNIDADE_MINUTO})${FIM_DA_UNIDADE}|(${UNIDADE_SEM_ESPACO_MIN}))`, 'giu')
/** Cada tempo escrito no texto, em segundos ("30 ثانية" → 30, "2 minutes" → 120, "٣٠ ثانية" → 30). */
export function temposPedidos(texto: string): number[] {
  return Array.from(algarismosLatinos(String(texto ?? '')).matchAll(TEMPO_RE), (m) => Number(m[1]) * (m[4] || m[5] ? 60 : 1))
}
/** A duração que o texto pede: o MAIOR tempo escrito (blocos 0–3 s / 3–6 s / 6–10 s pedem 10 s, não a soma). */
export function duracaoPedida(texto: string): number {
  return Math.max(0, ...temposPedidos(texto))
}
/** Pede mais tempo do que o clipe tem, em qualquer língua e algarismo. */
export function pedeDuracaoDeFilme(texto: string, opcoes?: OpcoesDoRoteiro): boolean {
  return duracaoPedida(texto) > tetoDoClipe(opcoes)
}
// Blocos de tempo de UM plano: "0–3 s", "3-6 sec", "(6–10 seconds)", "first 2 seconds", "últimos 3 segundos".
const BLOCO_DE_TEMPO_RE = new RegExp(
  `${ANTES_DO_NUMERO}\\d{1,3}\\s*(?:${UNIDADE_SEGUNDO})?\\s*[–—-]\\s*(\\d{1,3})\\s*(?:${UNIDADE_SEGUNDO}${FIM_DA_UNIDADE}|${UNIDADE_SEM_ESPACO_SEG})` +
  `|(?<![\\p{L}])(?:first|last|final|primeiros|[úu]ltimos|primeros|ersten|letzten|premi[èe]res|derni[èe]res)\\s+(\\d{1,3})\\s*(?:${UNIDADE_SEGUNDO})${FIM_DA_UNIDADE}`, 'giu')
/** O fim de cada bloco de tempo (segundos). Vazio = o texto não divide o plano em blocos. */
export function fimDosBlocosDeTempo(texto: string): number[] {
  return Array.from(algarismosLatinos(String(texto ?? '')).matchAll(BLOCO_DE_TEMPO_RE), (m) => Number(m[1] ?? m[2]))
}

// Falas entre aspas: cada par de abre/fecha; o miolo precisa ter cara de fala (3+ palavras ou 5+ ideogramas) — o letreiro
// "OPEN" ou o nome "Happy Birthday" não contam.
const FALA_ENTRE_ASPAS_RE = /«([^«»\n]+)»|“([^“”\n]+)”|„([^„“”\n]+)[“”]|"([^"\n]+)"|「([^「」\n]+)」|『([^『』\n]+)』|‹([^‹›\n]+)›|”([^”\n]+)”/gu
const IDEOGRAMA_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/gu
/** Quantas falas (trechos entre aspas com cara de frase) o texto traz. */
export function falasEntreAspas(texto: string): number {
  let n = 0
  for (const m of String(texto ?? '').matchAll(FALA_ENTRE_ASPAS_RE)) {
    const miolo = (m.slice(1).find((g) => g !== undefined) ?? '').trim()
    if (miolo.split(/\s+/).filter(Boolean).length >= 3 || (miolo.match(IDEOGRAMA_RE) ?? []).length >= 5) n++
  }
  return n
}
export const CLIP_FALAS_ENTRE_ASPAS = 2

// Narração/locução fora das 5 línguas (as 5 já estão em PEDE_FALA_RE). Só palavras que não aparecem num pedido de imagem.
const PEDE_NARRACAO_RE = /(?:تعليق[\s\p{M}]*صوت|التعليق الصوتي|الراوي|راوٍ|سرد صوتي|озвучк|закадров|рассказчик|диктор|ナレーション|語り手|旁白|画外音|配音|解说|解說|내레이션|나레이션|seslendirme|anlatıcı|dış ses|वॉइसओवर|वॉयसओवर|वॉयस ओवर|कथावाचक|नैरेशन|सूत्रधार|sulih suara|narasi|lồng tiếng|thuyết minh|người dẫn chuyện|การบรรยาย|ผู้บรรยาย|erzähler|erzählstimme|narratore|voce fuori campo|narrateur|voix off)/iu

/** Fala de personagem no formato de roteiro: `Nome: "…"` numa linha. */
const FALA_DE_PERSONAGEM_RE = /(?:^|\n)\s*\p{Lu}[\p{L}'’ -]{0,30}:\s*["“«]/u

/** O link do Studio com o texto do cliente preenchido (o Studio lê ?prompt=). */
export function hrefDoFilmeComTexto(texto: string): string {
  return `/studio?${new URLSearchParams({ prompt: String(texto ?? '').trim().slice(0, 4000), intent_campaign: 'clips_long_script' }).toString()}`
}

const ESTILOS: ReadonlyArray<{ re: RegExp; frase: string }> = [
  { re: /\banime\b/i, frase: 'anime style animation, not live action' },
  { re: /\b(?:animad[oa]s?|anima[çc][aã]o|desenho animado|desenho|cartoon|animated|animation|pixar|3d animado|animado em 3d|dibujo animado|dessin anim[ée])\b/i, frase: '3D animated cartoon style, not live action' },
  { re: /\b(?:ilustra[çc][aã]o|illustration|illustrated|aquarela|watercolou?r)\b/i, frase: 'illustrated storybook style, not live action' },
]

/** O estilo visual que o texto pede ("animado", "anime", "ilustração"); null = o texto não pede estilo. */
export function estiloPedidoNoTexto(texto: string): string | null {
  const t = String(texto ?? '')
  return ESTILOS.find((e) => e.re.test(t))?.frase ?? null
}

/** O prompt que vai ao servidor: o texto do cliente + o estilo pedido em inglês, dentro do limite de 1000 da tela. */
export function promptDoClipeComEstilo(texto: string, max = 1000): string {
  const t = String(texto ?? '').trim()
  const estilo = estiloPedidoNoTexto(t)
  if (!estilo || t.toLowerCase().includes(estilo.split(',')[0].toLowerCase())) return t
  const sufixo = ` Visual style: ${estilo}.`
  return `${Array.from(t).slice(0, Math.max(0, max - sufixo.length - 1)).join('').replace(/[\s.]+$/, '')}.${sufixo}`
}

// KINEO-CLIPE-OU-FILME-3010 [vai do fundador 30/10 "A, B, C e D … estão todos autorizados"] — o aviso de roteiro longo
// existia desde 29/10, mas o botão principal seguia "Gerar": na rodada de 30/10 (15:45) 4 de 6 vídeos eram CONTOS colados no
// Clipe (o colombiano fez 7), 0 downloads. Agora, com texto de filme, o botão principal é o Filme narrado e o clipe vira a
// opção pequena. E o aviso passa a ser MEDIDO (antes não gravava nada): visto, clicou no filme, fez o clipe mesmo assim.
export const CLIPE_ROTEIRO_EVENTOS = {
  shown: 'clip_long_script_shown',
  film: 'clip_long_script_film_clicked',
  clipAnyway: 'clip_long_script_clip_anyway',
} as const

// KINEO-CLIPE-LOGO-3010 [vai do fundador 30/10] — revisor 30/10: anúncio da Trans Web Internet ("young guy wearing your
// company shirt") saiu com camisa sem marca e nada de internet: sem foto/logo o motor não tem como pôr a marca. A tela pede o
// logo quando o texto cita marca/empresa e não há foto. Nota, nunca bloqueio.
const CITA_MARCA_RE = /\b(?:company|brand|logo|business|store|shop|our (?:product|service)|empresa|marca|logotipo|loja|neg[oó]cio|nosso produto|tienda|negocio|compa[ñn][ií]a|nuestra (?:marca|tienda)|unternehmen|firma|entreprise|marque|azienda|negozio|şirket|marka)\b/i
/** O texto cita marca/empresa (o motor precisa do logo ou da foto do produto para mostrá-la). */
export function citaMarcaNoClipe(texto: string): boolean {
  return CITA_MARCA_RE.test(String(texto ?? ''))
}
export const CLIPE_LOGO_EVENTOS = { shown: 'clip_logo_hint_shown', clicked: 'clip_logo_hint_clicked' } as const
