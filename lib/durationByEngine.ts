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

/** Fala estimada de um texto, em segundos, na régua da guarda (palavras ÷ 2,5 pal/s — a mesma do #442 da rota). */
export function estimarFalaSegundos(narration: string | null | undefined): number {
  const words = String(narration ?? '').split(/\s+/).filter(Boolean).length
  return words / VERBATIM_EST_WORDS_PER_SECOND
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
}): ChecagemDeFalaCurta {
  const estSeconds = estimarFalaSegundos(args.narration)
  const limitSeconds = args.seconds * SHORT_FILM_SPEECH_FACTOR
  if (!args.verbatim || !isSeedance15(args.engine) || !(args.seconds < MIN_DURATION_ALL_ENGINES)) {
    return { ok: true, estSeconds, limitSeconds }
  }
  if (estSeconds > limitSeconds) {
    return { ok: false, recusa: 'script_too_long_for_short_film', estSeconds, limitSeconds, sugestao: MIN_DURATION_ALL_ENGINES }
  }
  return { ok: true, estSeconds, limitSeconds }
}

/** Quantas palavras cabem no filme curto (o teto da guarda acima, na mesma régua de 2,5 pal/s). */
export function maxWordsForShortFilm(seconds: number): number {
  return Math.floor(seconds * SHORT_FILM_SPEECH_FACTOR * VERBATIM_EST_WORDS_PER_SECOND)
}

/**
 * Revisão E2a (29/09): a saída que CABE vem primeiro. O trial de 10 cr não paga 35 s — mandar "pick 35 s" levava o
 * próximo clique ao 402. Encurtar mantém o preço do filme curto; 35 s vem com o custo real (passado pela rota, que o
 * calcula com a mesma creditCostForDuration que debita — nada digitado aqui).
 */
export function scriptTooLongForShortFilmMessage(seconds: number, estSeconds: number, cost35?: number | null): string {
  const custo = typeof cost35 === 'number' && Number.isFinite(cost35) && cost35 > 0 ? ` (${cost35} credits)` : ''
  return `This script reads for about ${Math.round(estSeconds)} seconds — too long for a ${seconds}-second film. Shorten it to about ${maxWordsForShortFilm(seconds)} words to keep the ${seconds}-second price, or pick ${MIN_DURATION_ALL_ENGINES} s${custo}. Nothing was charged.`
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
