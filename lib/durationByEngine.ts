// ═══ KINEO-SEEDANCE-15S-2026-09-29 — a duração de 15 s existe SÓ no Seedance 1.5 ('cinematic_ai') ═══
// "Vai" nominal do fundador para o 15 s (29/09). O Seedance a 15 s custa creditCostForDuration('cinematic_ai', true, 15)
// = 7 créditos — o primeiro filme de IA que cabe no trial de 10. Os outros motores continuam em 35/60/90:
//   · Kling 3 / H3 / Omni / Seedance 2.5 (estrada hollywood) planejam no mínimo ~34 s (Math.max(30, …)+4); um pedido
//     de 15 s cobrava 15 s e entregava 34 — o furo que a rota do cinematic passa a recusar;
//   · Kling 2.5 / Veo / Sora não têm prova a 15 s.
// Regra da casa (M1 do cético): NUNCA subir 15 → 35 em silêncio depois de a tela mostrar o preço de 15 s — é
// cobrança-surpresa (lib/credits/engineCost.ts: "preço que muda depois do clique"). Fora do Seedance, 15 s (ou
// qualquer alvo abaixo de 35) é RECUSA honesta, antes de qualquer débito.
// Revisão E2a (29/09): no Seedance, alvo abaixo de 15 (ou não finito) também é recusa ('duration_not_offered') — sem
// isso um POST com duration 10 (ou 1-9, ou negativo) pagava 5 cr pelo piso de 10 s da conta e levava 2 clipes de IA.
// Escopo honesto: esta checagem vale para o PEDIDO. O degrau KINEO-DEGRAU (allow_shorter_duration) roda depois e
// ainda pode DESCER o alvo até o piso da estrada (20 s clássico / 30 s hollywood, lib/narrationFit.ts) — descida que só
// barateia, com o custo calculado depois dela; não é subida silenciosa nem 15 s fora do Seedance.
//
// Módulo PURO (sem import): lido pela rota, pelo /studio, pelo /generate e executado pelo guardião
// scripts/test-seedance-15s-2026-09-29.mjs via transpile.

/** O menor alvo que todo motor aceita. Abaixo disto, só o Seedance 1.5. */
export const MIN_DURATION_ALL_ENGINES = 35
/** O alvo curto do Seedance 1.5. */
export const SEEDANCE_SHORT_SECONDS = 15
/** Botões de duração do Seedance 1.5 (o 15 só aparece para quem o interruptor SEEDANCE_15S_PUBLIC deixa). */
export const SEEDANCE_DURATIONS = [15, 35, 60, 90] as const
/** Botões de duração dos demais motores (mesma lista global de lib/expandPolicy.ts SUPPORTED_DURATIONS). */
export const DEFAULT_ENGINE_DURATIONS = [35, 60, 90] as const

/**
 * É o Seedance 1.5? Aceita as chaves da UI ('seedance'), a quality do biller ('cinematic_ai') e a ausência de motor
 * (a rota do cinematic trata `engine` ausente/desconhecido como Seedance — ver o `: 'cinematic_ai'` do costQuality).
 */
export function isSeedance15(engine: string | null | undefined): boolean {
  const k = typeof engine === 'string' ? engine.trim().toLowerCase() : ''
  if (k === '' || k === 'seedance' || k === 'cinematic_ai') return true
  const outros = ['kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25', 'fast', 'creator', 'avatar', 'presenter']
  const qualidades = ['cinematic_kling', 'cinematic_veo', 'cinematic_sora', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25']
  return !outros.includes(k) && !qualidades.includes(k)
}

/** As durações que o seletor oferece para este motor. */
export function supportedDurationsFor(engine: string | null | undefined): readonly number[] {
  return isSeedance15(engine) ? SEEDANCE_DURATIONS : DEFAULT_ENGINE_DURATIONS
}

export type ChecagemDeDuracao =
  | { ok: true }
  | { ok: false; recusa: 'only_seedance_15s' | 'duration_not_offered'; sugestao: number }

/**
 * 15 s (ou qualquer alvo abaixo de 35) fora do Seedance = recusa; no Seedance, abaixo de 15 (ou não finito) = recusa.
 * Nunca troca a duração em silêncio.
 */
export function checarDuracao(engine: string | null | undefined, seconds: number): ChecagemDeDuracao {
  const seedance = isSeedance15(engine)
  if (!Number.isFinite(seconds)) {
    return { ok: false, recusa: 'duration_not_offered', sugestao: seedance ? SEEDANCE_SHORT_SECONDS : MIN_DURATION_ALL_ENGINES }
  }
  if (seconds < MIN_DURATION_ALL_ENGINES && !seedance) {
    return { ok: false, recusa: 'only_seedance_15s', sugestao: MIN_DURATION_ALL_ENGINES }
  }
  if (seconds < SEEDANCE_SHORT_SECONDS && seedance) {
    return { ok: false, recusa: 'duration_not_offered', sugestao: SEEDANCE_SHORT_SECONDS }
  }
  return { ok: true }
}

export const ONLY_SEEDANCE_15S_MESSAGE = '15-second films are available on Seedance 1.5; pick 35 s for this engine.'
export const SEEDANCE_DURATION_NOT_OFFERED_MESSAGE = `Seedance 1.5 films are ${SEEDANCE_DURATIONS.join(', ')} seconds long; pick one of those. Nothing was charged.`

/** A frase da recusa de duração, pela razão (a rota não escolhe texto). */
export function mensagemDaRecusaDeDuracao(checagem: ChecagemDeDuracao): string {
  if (checagem.ok) return ''
  return checagem.recusa === 'duration_not_offered' ? SEEDANCE_DURATION_NOT_OFFERED_MESSAGE : ONLY_SEEDANCE_15S_MESSAGE
}

// ─── B4 do cético: roteiro longo pedido como filme curto ────────────────────────────────────────────────────────
// Em verbatim, o nº de clipes segue a FALA (route.ts #442, até 9) e o compose deixa o áudio mandar até 90 s, mas o
// preço fica selado na duração pedida. Sem esta guarda, 150 palavras "a 15 s" viravam um filme de ~60 s por 7 cr.
// A estimativa é a MESMA do #442 da rota (palavras ÷ 2,5 pal/s — o guardião confere que a rota ainda usa 2,5).
export const VERBATIM_EST_WORDS_PER_SECOND = 2.5
/** Folga de fala sobre o alvo curto: 15 s × 1,5 = 22,5 s (≈ 56 palavras, o teto do roteirista para 15 s). */
export const SHORT_FILM_SPEECH_FACTOR = 1.5

// ═══ KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] — a régua do filme de 15 s fala a língua ═══
// Defeito no ar (29/09 09:27 UTC): cadastro novo da Turquia, 1º filme = Seedance 15 s ("Let AI structure it", language 'tr').
// O escritor devolveu 27 palavras em turco (≈ 204 caracteres falados, estimado dos 411 do pedido) e o portão da rota recusou com
// 'narration_too_short' "speech=11s target=15s" (27 ÷ 2,45 pal/s da persona documentary = 11,0 s < 14,25 s). Tentou de novo e desistiu.
// A causa: o escritor (faixa 36–41, lib/scriptWriterRate), a guarda de roteiro longo (22,5 s), o plano 3x6 e o portão de
// 95 % contam PALAVRAS numa régua de 2,5 pal/s calibrada em inglês. Em turco, alemão, russo, polonês… a palavra é mais
// longa — a mesma fala tem MENOS palavras: o portão subestima a fala (recusa em falso), o escritor pede palavras demais
// (41 palavras turcas ≈ 20 s: o plano 3x6 as põe em 3 × 6 s e a montagem recicla o 1º clipe) e a guarda deixa passar
// ~28 s de fala num filme de 3 × 8 s.
// A régua por idioma, UMA fonte para os quatro (escritor, guarda, plano 3x6, portão):
//   · A duração da fala do TTS acompanha o nº de LETRAS (≈ sons), não o de palavras. Não há medida da voz por idioma na
//     casa: `render_delivered_measured` grava language = null em 100 % das 265 linhas e nenhuma delas é de filme turco.
//     A única língua de palavra longa medida é o russo (2 filmes do Kineo 1, língua lida do `videos.script`): 2,52 pal/s
//     contra 2,96 do inglês no mesmo motor (165 filmes) = 0,853.
//   · Calibração: LETRAS POR PALAVRA do mesmo conteúdo nas 13 línguas das páginas de idioma (texto PARALELO da casa:
//     lib/seo/freeShortsGeneratorLangs.ts + lib/seo/enginePageLangs.ts, 577–842 palavras por língua, medido em 29/09).
//     Âncora = francês (4,60): na narração entregue, fr e en têm as mesmas letras por palavra (5,07–5,18 × 5,03–5,18) e o
//     mesmo passo. Fator da língua = 4,60 ÷ letras por palavra dela (≤ 1). Conferência: o russo dá 4,60 ÷ 5,37 = 0,857 —
//     o medido foi 0,853.
//   · en, pt e es ficam em 1 (a régua de hoje, byte a byte — ordem do fundador). Diferença < 3 % da âncora também fica em 1
//     (it: 0,985 — ruído: en × fr já diferem 1–2 %). Árabe, urdu (abjad: a vogal curta não é escrita), hindi (abugida) e
//     vietnamita (monossilábico) não têm letra comparável: ficam em 1 até existir medida — nunca SOBEM (a régua por idioma só
//     desce onde a palavra é mais longa; subir recusaria mais).
//   · Ritmo do filme curto = 2,5 × fator, arredondado para BAIXO em centésimos (o mesmo princípio da voz do 15 s: o passo
//     estimado nunca fica acima do real): tr 2,03 · de 2,12 · ru 2,14 · uk 2,15 · id 2,15 · pl 2,23 · nl 2,37 · demais 2,5.
// Só o filme de 15 s do Seedance 1.5 passa a língua; 35/60/90 e os outros motores chamam sem ela (2,5, como sempre).
/** Letras por palavra no texto paralelo das páginas de idioma (29/09) — só as línguas de alfabeto em que a letra é som. */
export const LETRAS_POR_PALAVRA_DO_IDIOMA: Readonly<Record<string, number>> = { fr: 4.6, it: 4.67, nl: 4.84, pl: 5.14, uk: 5.33, id: 5.33, ru: 5.37, de: 5.4, tr: 5.65 }
/** A língua âncora: letras por palavra iguais às do inglês na narração entregue, mesmo passo. */
export const IDIOMA_ANCORA_DO_RITMO = 'fr'
/** Abaixo desta diferença da âncora, a língua fica na régua da casa (ruído de medida). */
export const RUIDO_DO_RITMO = 0.03

/** Fator (0 < f ≤ 1) sobre a régua da casa para a língua. 1 = régua de hoje (en/pt/es, desconhecida, sem medida, ruído). */
export function fatorDoRitmoDoIdioma(language: string | null | undefined): number {
  const code = typeof language === 'string' ? language.trim().toLowerCase() : ''
  const letras = LETRAS_POR_PALAVRA_DO_IDIOMA[code]
  const ancora = LETRAS_POR_PALAVRA_DO_IDIOMA[IDIOMA_ANCORA_DO_RITMO]
  if (!(typeof letras === 'number' && letras > 0) || !(ancora > 0)) return 1
  const fator = ancora / letras
  return fator >= 1 - RUIDO_DO_RITMO ? 1 : fator
}

/** Palavras por segundo do filme curto na língua: 2,5 × fator, para baixo em centésimos. Sem língua (ou fator 1) = 2,5. */
export function ritmoDoFilmeCurto(language?: string | null): number {
  const fator = fatorDoRitmoDoIdioma(language)
  if (fator === 1) return VERBATIM_EST_WORDS_PER_SECOND
  return Math.floor(VERBATIM_EST_WORDS_PER_SECOND * fator * 100 + 1e-9) / 100
}

/**
 * O passo de uma VOZ na língua (portão de 95 % e plano 3x6 do filme de 15 s): o passo da voz × (ritmo ÷ 2,5), para baixo
 * em centésimos. Voz a 2,5 dá exatamente ritmoDoFilmeCurto(língua). Fator 1: a própria voz, sem arredondar nada.
 */
export function ritmoDaVozNoIdioma(voiceWordsPerSecond: number, language?: string | null): number {
  const ritmo = ritmoDoFilmeCurto(language)
  if (ritmo === VERBATIM_EST_WORDS_PER_SECOND || !(Number.isFinite(voiceWordsPerSecond) && voiceWordsPerSecond > 0)) return voiceWordsPerSecond
  return Math.floor(voiceWordsPerSecond * (ritmo / VERBATIM_EST_WORDS_PER_SECOND) * 100 + 1e-9) / 100
}

/** Fala estimada de um texto, em segundos, na régua da guarda (palavras ÷ 2,5 pal/s — a mesma do #442 da rota; no 15 s, o ritmo da língua). */
export function estimarFalaSegundos(narration: string | null | undefined, language?: string | null): number {
  const words = String(narration ?? '').split(/\s+/).filter(Boolean).length
  return words / ritmoDoFilmeCurto(language)
}

export type ChecagemDeFalaCurta =
  | { ok: true; estSeconds: number; limitSeconds: number }
  | { ok: false; recusa: 'script_too_long_for_short_film'; estSeconds: number; limitSeconds: number; sugestao: number }

/**
 * Seedance a menos de 35 s em verbatim: a fala estimada não pode passar de alvo × 1,5. Acima disso, recusa ANTES
 * do débito sugerindo 35 s. Fora do Seedance, ou a partir de 35 s, ou fora do verbatim, não se aplica (ok).
 */
export function checarFalaDoFilmeCurto(args: {
  engine: string | null | undefined
  seconds: number
  verbatim: boolean
  narration: string
  /** KINEO-RITMO-POR-IDIOMA-15S: a língua da narração (só o 15 s do Seedance passa; ausente = 2,5 pal/s). */
  language?: string | null
}): ChecagemDeFalaCurta {
  const estSeconds = estimarFalaSegundos(args.narration, args.language)
  const limitSeconds = args.seconds * SHORT_FILM_SPEECH_FACTOR
  if (!args.verbatim || !isSeedance15(args.engine) || !(args.seconds < MIN_DURATION_ALL_ENGINES)) {
    return { ok: true, estSeconds, limitSeconds }
  }
  if (estSeconds > limitSeconds) {
    return { ok: false, recusa: 'script_too_long_for_short_film', estSeconds, limitSeconds, sugestao: MIN_DURATION_ALL_ENGINES }
  }
  return { ok: true, estSeconds, limitSeconds }
}

/** Quantas palavras cabem no filme curto (o teto da guarda acima, na mesma régua de 2,5 pal/s; com a língua, no ritmo dela). */
export function maxWordsForShortFilm(seconds: number, language?: string | null): number {
  return Math.floor(seconds * SHORT_FILM_SPEECH_FACTOR * ritmoDoFilmeCurto(language))
}

// ═══ KINEO-PONTAS-15S-IDIOMA-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] — o que o cinematic ACEITA no 15 s ═══
// A faixa de palavras faladas que a rota do cinematic aceita no filme de 15 s do Seedance 1.5, na língua:
//   · piso = o portão de 95 % (a cobertura vem do chamador — MIN_COVERAGE de lib/narrationFit; este módulo não importa nada)
//     medido na voz MAIS RÁPIDA que o 15 s pode ter: a régua da casa no ritmo da língua (lib/vozDoFilmeCurto limita a voz a
//     2,5 pal/s e a rota aplica ritmoDaVozNoIdioma). Com esse tanto de palavras o portão passa com qualquer voz do 15 s;
//   · teto = a guarda de roteiro longo na língua (maxWordsForShortFilm).
// tr 29–45 · de 31–47 · en/pt/es 36–56. Caso de 29/09 09:27 UTC (Turquia): entre 27 palavras (o portão recusa) e ~40 (a guarda
// aceita), o escritor ficava com as 27 — ver app/api/generate-script (notaDoFilmeCurto).
export function faixaAceitaNoFilmeCurto(seconds: number, coverage: number, language?: string | null): { min: number; max: number } {
  const max = maxWordsForShortFilm(seconds, language)
  return { min: Math.min(max, Math.ceil(seconds * coverage * ritmoDoFilmeCurto(language) - 1e-9)), max }
}

/**
 * Revisão E2a (29/09): a saída que CABE vem primeiro. O trial de 10 cr não paga 35 s — mandar "pick 35 s" levava o
 * próximo clique ao 402. Encurtar mantém o preço do filme curto; 35 s vem com o custo real (passado pela rota, que o
 * calcula com a mesma creditCostForDuration que debita — nada digitado aqui).
 */
export function scriptTooLongForShortFilmMessage(seconds: number, estSeconds: number, cost35?: number | null, language?: string | null): string {
  const custo = typeof cost35 === 'number' && Number.isFinite(cost35) && cost35 > 0 ? ` (${cost35} credits)` : ''
  return `This script reads for about ${Math.round(estSeconds)} seconds — too long for a ${seconds}-second film. Shorten it to about ${maxWordsForShortFilm(seconds, language)} words to keep the ${seconds}-second price, or pick ${MIN_DURATION_ALL_ENGINES} s${custo}. Nothing was charged.`
}

// ═══ KINEO-SEEDANCE-15S-3X6-2026-09-29 [TRAVA 8.2 — "vai" do 3x6] — o filme de 15 s são 3 clipes de 6 s ═══════════
// Fundador, 29/09: "3x6 gostei dessa opção bora fazer". Canário real de 29/09 04:34 UTC (conta interna, verbatim de 45
// palavras): saiu 17,8 s com 2 clipes de 10 s e a montagem REPETIU o 1º clipe nos últimos 2,9 s — o corte clássico do
// compose (slotLen = min(CLIP_LEN, total/clipes), encaixe no início de frase) encurtou o 1º trecho para 7,2 s e, sem
// saber o tamanho real dos clipes, reciclou o clipe 0 no fim, embora o clipe 1 ainda tivesse ~2 s gravados.
// Agora: 3 clipes, cada um pedido à fal com duration EXPLÍCITA (o schema do Seedance 1.5 aceita inteiros de 4 a 12), e
// os segundos de cada clipe + o início da fala de cada cena ASSINADOS no claim (os mesmos campos do Kling 2.5 e do Veo),
// para o compose montar pela linha do tempo por nível d'água, sem reciclar enquanto houver imagem não usada.
// Segundos por clipe = o menor s de {6, 7, 8} cuja imagem útil (3 × (s − perda); perda = trim 0,1 + overlap 0,06 —
// KLING25_CLIP_LOSS_SECONDS, passado pelo chamador: este módulo não importa nada) cobre a fala estimada COM folga
// (× 1,04 + o décimo do arredondamento do compose — ver seedanceShortSpeechCapacity).
// A fal cobra POR SEGUNDO (720p sem áudio, tokens = w×h×fps×s/1024 a US$ 1,20/M ≈ US$ 0,026/s — lib/fastAiClips
// SEEDANCE_720P_USD_PER_SECOND): 3 × 6 = 18 s ≈ US$ 0,47 contra 2 × 10 = 20 s ≈ US$ 0,52 de antes. O preço em créditos
// NÃO muda (creditCostForDuration('cinematic_ai', true, 15) = 7). A guarda de roteiro longo (22,5 s) continua antes do
// débito; o teto 8 s × 3 = 24 s cobre toda fala que ela deixa passar, com a folga ((3 × 7,84 − 0,1) ÷ 1,04 = 22,52 s).

/** Clipes do filme de 15 s no Seedance 1.5 — nem mais, nem menos. */
export const SEEDANCE_SHORT_CLIPS = 3
/** Segundos por clipe que o filme de 15 s pode pedir à fal, do mais barato ao mais longo. */
export const SEEDANCE_SHORT_CLIP_STEPS = [6, 7, 8] as const

// REVISÃO ADVERSARIAL (29/09, montagem): com margem zero (3 × s ≥ fala + 3 × perda) a fala REAL 2 % mais lenta que a
// estimativa já devolvia o clipe 0 no fim — montagem real, [6,6,6]: fala 17,50 s limpa, 17,53 s → 0,1,2,0. E a estimativa
// contava "1986" como 1 palavra (falada: "nineteen eighty-six"); o próprio roteiro do canário tinha "1986" e "1,700".
// Agora o passo só é escolhido com folga: a fala estimada (palavras FALADAS) × 1,04 + o décimo que o compose arredonda
// para cima (totalDuration = ⌈fala × 10⌉ ÷ 10) tem de caber na imagem útil. Com 41 palavras sem número (16,4 s a 2,5
// pal/s) a voz pode sair 6,7 % mais lenta sem reuso em 3 × 6 s; 42+ palavras vão a 3 × 7 s (+ US$ 0,08), nunca ao reuso.
// O teto não muda: toda fala que a guarda de 22,5 s deixa passar ainda cabe em 3 × 8 s com a folga (22,52 s).
/** Folga multiplicativa sobre a fala estimada na escolha do passo (voz real até 4 % mais lenta que a estimativa). */
export const SEEDANCE_SHORT_SPEECH_BAND = 1.04
/** Arredondamento da linha do tempo do compose: ⌈fala × 10⌉ ÷ 10 (lib/compose buildCreatomateSource) — até 0,1 s a mais. */
export const SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS = 0.1

/**
 * Palavras FALADAS de um texto: cada palavra conta 1; um número conta pelos dígitos (até 4 — "45" = "forty-five",
 * "1986" = "nineteen eighty-six", "1,700" = "one thousand seven hundred"), +1 com símbolo lido em voz alta (% $ € £).
 */
export function palavrasFaladas(narration: string | null | undefined): number {
  let total = 0
  for (const w of String(narration ?? '').split(/\s+/).filter(Boolean)) {
    const digitos = (w.match(/[0-9]/g) ?? []).length
    total += digitos > 0 ? Math.min(4, digitos) + (/[%$€£]/.test(w) ? 1 : 0) : 1
  }
  return total
}

/**
 * Fala do filme de 15 s para escolher o passo: palavras faladas ÷ a régua MAIS LENTA entre a da guarda (2,5 pal/s) e a
 * da voz que vai falar (persona mais lenta, ex. onyx 2,3, pede mais imagem).
 * KINEO-RITMO-POR-IDIOMA-15S: no 15 s a voz chega JÁ no ritmo da língua (a rota aplica ritmoDaVozNoIdioma ao passo da voz), e
 * toda voz do 15 s fica ≤ 2,5 × fator — logo, sem `speed:` no roteiro, o mínimo é a voz na língua (tr: 2,03), a mesma régua da
 * guarda e do escritor. Borda: com `speed:` > 1 no roteiro de uma língua de palavra longa, o plano mede na voz acelerada (a
 * fala real), sem a folga de min(2,5, voz) que o inglês ganha — o escritor do 15 s não escreve `speed:`.
 */
export function seedanceShortSpeechSeconds(narration: string | null | undefined, voiceWordsPerSecond: number): number {
  const voz = Number.isFinite(voiceWordsPerSecond) && voiceWordsPerSecond > 0 ? voiceWordsPerSecond : VERBATIM_EST_WORDS_PER_SECOND
  return palavrasFaladas(narration) / Math.min(VERBATIM_EST_WORDS_PER_SECOND, voz)
}

/** Fala estimada (s) que o passo cobre COM folga: (3 × (s − perda) − arredondamento do compose) ÷ 1,04. */
export function seedanceShortSpeechCapacity(stepSeconds: number, clipLossSeconds: number): number {
  const perda = Number.isFinite(clipLossSeconds) && clipLossSeconds > 0 ? clipLossSeconds : 0
  return (SEEDANCE_SHORT_CLIPS * (stepSeconds - perda) - SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS) / SEEDANCE_SHORT_SPEECH_BAND
}

/**
 * Segundos de CADA um dos 3 clipes: o menor passo s cuja capacidade com folga (seedanceShortSpeechCapacity) cobre a
 * fala estimada. Fala acima do que 8 s cobrem (só com voz mais lenta que a régua) fica no passo mais longo: o compose
 * reusa dentro do teto do clipe, nunca além dele.
 */
export function seedanceShortClipSeconds(speechSeconds: number, clipLossSeconds: number): number {
  const fala = Number.isFinite(speechSeconds) && speechSeconds > 0 ? speechSeconds : 0
  for (const s of SEEDANCE_SHORT_CLIP_STEPS) {
    if (seedanceShortSpeechCapacity(s, clipLossSeconds) >= fala - 1e-9) return s
  }
  return SEEDANCE_SHORT_CLIP_STEPS[SEEDANCE_SHORT_CLIP_STEPS.length - 1]
}

/**
 * O claim assinado é de um filme de 15 s no Seedance 1.5 (fal_model da família bytedance/seedance e duration 15)?
 * Só então o /api/compose alinha `clip_seconds` em {6, 7, 8}. Todo outro claim: false (montagem de sempre).
 */
export function isSeedanceShortClaim(response: Record<string, unknown> | null | undefined): boolean {
  if (!response) return false
  const model = response.fal_model
  return response.duration === SEEDANCE_SHORT_SECONDS && typeof model === 'string' && model.includes('/seedance/')
}

// ═══ KINEO-CONTAGEM-FALA-15S-2026-09-29 [TRAVA 8.2 — "vai" do 15 s] — nenhum bloco do roteiro some das 3 cenas ═══
// Medido em produção (d8bbbd6f, 29/09 ~08:05 UTC): o filme grátis de 15 s ("Let AI structure it") nasce com 4 blocos
// (HOOK, MICRO REWARD 1, MICRO REWARD 2, PAYOFF) e vira 3 clipes. A rota montava as cenas com resolveVerbatimSegments
// (lib/cinematic/verbatimBeats), que SORTEIA 3 dos 4 blocos por índice (round(i × 3 ÷ 2) = 0, 2, 3): o MICRO REWARD 1
// saía das cenas. A voz ainda o lia (voiceover_script é a narração inteira do autor), mas o ensaio de $0 contava 29 das
// 40 palavras ("FAIL — narração de 11.8s … 29 palavras contra 37"), a pista visual do bloco nunca virava imagem e o
// clipe do HOOK cobria a fala dele. Aqui os blocos VIZINHOS se juntam, em ordem, até sobrarem `clips` cenas: a fala de
// cada cena é a soma exata dos seus blocos (nenhuma palavra muda, nenhuma sai) e as pistas visuais viajam juntas.
// O corte escolhido: nenhuma cena sem fala; a maior cena o menor possível (os 3 clipes têm os MESMOS segundos, e fala acima
// do clipe faz a imagem correr na frente da voz); depois o PAYOFF sozinho no último clipe e o HOOK sozinho no 1º (a
// política do #369); depois o mais equilibrado. Fala antes do 1º marcador vai para a 1ª cena. Com `clips` blocos ou
// menos, devolve os blocos como estão (a rota nem chama). Puro, sem import (executado por
// scripts/test-contagem-fala-15s-2026-09-29.mjs).
// [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-SEEDANCE-BLOCOS-2026-09-29 — `alinharFatias` (só o Seedance de
// 35/60/90 s liga): esse filme NÃO assina clip_word_starts, então o compose mostra a cena k na fatia igual k·T/N do tempo
// da voz. Entre cortes empatados (mesma maior cena, mesmo HOOK/PAYOFF), vence o que põe o início da fala de cada cena mais
// perto do início da sua fatia (|N·início − k·W|, em palavras) — sem isto o empate ia para o 1º corte achado e empurrava as
// junções para o fim (90 s, 12 blocos: a imagem do bloco 6 chegava ~29 palavras depois da fala). Desligado (o 15 s, que
// entra cada clipe na própria fala), o critério vale 0 para todos e a escolha é a de sempre, byte a byte.
export interface SeedanceShortBeat { voiceover: string; pexelsQuery: string }
export function seedanceShortMarkedScenes(
  parsed: { segments: ReadonlyArray<SeedanceShortBeat>; narration: string },
  clips: number = SEEDANCE_SHORT_CLIPS,
  opcoes: { alinharFatias?: boolean } = {},
): SeedanceShortBeat[] {
  const norm = (t: string) => String(t ?? '').trim().replace(/\s+/gu, ' ')
  const segs = parsed.segments.map((s) => ({ voiceover: norm(s.voiceover), pexelsQuery: norm(s.pexelsQuery) }))
  const count = Math.max(1, Math.trunc(Number.isFinite(clips) ? clips : SEEDANCE_SHORT_CLIPS))
  const n = segs.length
  if (n <= count) return segs
  const words = segs.map((s) => s.voiceover.split(' ').filter(Boolean).length)
  const soma = (a: number, b: number) => { let t = 0; for (let i = a; i < b; i++) t += words[i]; return t }
  const narradas = norm(parsed.narration).split(' ').filter(Boolean).length
  const antesDoMarcador = Math.max(0, narradas - soma(0, n)) // fala antes do 1º marcador (vai para a 1ª cena)
  const totalFalado = antesDoMarcador + soma(0, n)
  const desvioDasFatias = (limites: number[]): number => {
    if (!opcoes.alinharFatias) return 0
    let pior = 0
    for (let g = 1; g < count; g++) pior = Math.max(pior, Math.abs(count * (antesDoMarcador + soma(0, limites[g])) - g * totalFalado))
    return pior
  }
  const chaveDe = (limites: number[]): number[] => {
    const somas = limites.slice(0, -1).map((a, g) => soma(a, limites[g + 1]))
    return [
      somas.filter((x) => x === 0).length,
      Math.max(...somas),
      limites[count - 1] === n - 1 ? 0 : 1, // PAYOFF sozinho no último clipe
      limites[1] === 1 ? 0 : 1, // HOOK sozinho no 1º
      desvioDasFatias(limites), // KINEO-SEEDANCE-BLOCOS: início da cena perto da sua fatia (só com alinharFatias)
      somas.reduce((a, x) => a + x * x, 0),
    ]
  }
  const melhorQue = (k: number[], atual: number[]): boolean => {
    if (atual.length === 0) return true
    for (let i = 0; i < k.length; i++) if (k[i] !== atual[i]) return k[i] < atual[i]
    return false
  }
  let escolhidos: number[] = []
  let chave: number[] = []
  let combinacoes = 1
  for (let i = 1; i < count; i++) combinacoes = (combinacoes * (n - i)) / i
  if (combinacoes <= 20000) {
    const visita = (cortes: number[], de: number): void => {
      if (cortes.length === count - 1) {
        const limites = [0, ...cortes, n]
        const k = chaveDe(limites)
        if (melhorQue(k, chave)) { chave = k; escolhidos = limites }
        return
      }
      const faltam = count - 1 - cortes.length - 1
      for (let c = de; c <= n - 1 - faltam; c++) visita([...cortes, c], c + 1)
    }
    visita([], 1)
  } else {
    // Blocos demais para comparar todos os cortes: corta onde a fala acumulada cruza cada fatia igual.
    const total = soma(0, n)
    escolhidos = [0]
    for (let g = 1; g < count; g++) {
      let c = escolhidos[g - 1] + 1
      while (c < n - (count - g) && soma(0, c) < (total * g) / count) c++
      escolhidos.push(c)
    }
    escolhidos.push(n)
  }
  const cenas = escolhidos.slice(0, -1).map((a, g) => {
    const grupo = segs.slice(a, escolhidos[g + 1])
    const pistas = grupo.map((s) => s.pexelsQuery).filter((q, i, todas) => q && todas.indexOf(q) === i)
    return { voiceover: grupo.map((s) => s.voiceover).filter(Boolean).join(' '), pexelsQuery: pistas.join(', ') }
  })
  const narracao = norm(parsed.narration)
  const blocos = norm(segs.map((s) => s.voiceover).join(' '))
  if (blocos && narracao !== blocos && narracao.endsWith(' ' + blocos)) {
    const antes = narracao.slice(0, narracao.length - blocos.length).trim()
    if (antes) cenas[0] = { ...cenas[0], voiceover: norm(`${antes} ${cenas[0].voiceover}`) }
  }
  return cenas
}
