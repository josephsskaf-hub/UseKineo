// ═══ KINEO-KLING25-PLANOS-5S-2026-09-28 — Kling 2.5 em planos de 5 s ═══════════════════════════════════════════════
// Fundador, 28/09, depois do canário do Kling 2.5 (c83074b6, "The Mystery of Moving Rocks", 98 palavras verbatim, 35 s
// pedidos, 37,7 s entregues): "gostei muito… a única coisa é mais variedade de cenas". Até aqui o Kling 2.5 rodava
// planos de 10 s (clipCountForDuration = ⌈d/9⌉ e duration '10' fixo no payload): 4 planos para 35 s, cada um cobrindo
// ~2,5 frases — a imagem não conseguia acompanhar a narração.
//
// O fornecedor cobra POR SEGUNDO (fal-ai/kling-video/v2.5-turbo/pro, US$ 0,07/s — docs/PRECOS-MOTORES-V4.md, linha
// "Kling 2.5 Turbo | atual | $0.07/s"): 5 s = US$ 0,35 e 10 s = US$ 0,70. Dois planos de 5 s custam o MESMO que um de
// 10 s. O schema da fal para o 2.5 turbo aceita duration '5' ou '10'.
//
// REVISÃO ADVERSARIAL (28/09, 30 filmes verbatim reais de 13 a 28/09, duração exata do MP4 e compose real):
//   · a 1ª versão dava 5 s a cenas de 15-20 palavras (6-8 s de fala) e o compose cortava por nível d'água, cego à
//     fronteira da cena: no 06fe798a a frase final tocava sobre a ABERTURA e 5 de 12 planos mostravam menos de 25 % da
//     própria fala (a base, 0 de 8). Regra nova, verbatim: CADA plano cabe a sua fala no passo conservador
//     (palavras ÷ 2,3 ≤ segundos − 0,16); o divisor escolhe cortes e segundos juntos (kling25VerbatimPlan) e o compose
//     corta no instante da 1ª palavra de cada cena (lib/compose clipSpeechAnchors + planCappedClipTimeline).
//   · a imagem se media em segundos BRUTOS; o compose tira 0,16 s de cada plano (trim 0,1 + overlap 0,06). Toda conta
//     daqui usa o ÚTIL (kling25UsefulSeconds).
//   · roteiro de 60 s com mais de 225 palavras: o filme é cortado em 90 s (lib/compose) — o passo nunca supõe fala além
//     de 90 s (kling25PlanPace), e o custo a mais que sobra é declarado, não escondido.
//
// Módulo PURO (sem import): a rota de geração, o ensaio de $0, o /api/compose e os guardiões
// scripts/test-kling25-planos-5s-2026-09-28.mjs e scripts/test-kling25-60s-teto-2026-09-28.mjs leem daqui a mesma régua.
// Só o Kling 2.5 passa por aqui: Seedance 1.5, Veo 3.1, Sora e a família hollywood não chamam nenhuma função deste arquivo.

/** Plano padrão novo e plano longo. Os únicos valores que o schema da fal aceita. */
export const KLING25_SHOT_SECONDS = 5
export const KLING25_LONG_SHOT_SECONDS = 10
/**
 * Teto de planos por filme.
 * [TRAVA 8.2] KLING25-60S-TETO (28/09) — ensaio de $0 em produção (203 palavras, 60 s, roteiro pronto): o divisor bateu
 * no teto de 12 e encheu com planos de 10 s ([5,10,10,10,10,10,10,5,5,5,10,5] = 95 s de imagem para 88 s de fala).
 * Fundador: "mais variedade" — num filme de 60 s com 65-70 s de fala o ideal é ~13-14 planos de 5 s, não 7 de 10 s.
 * Custo por segundo IGUAL: a fal cobra por segundo (US$ 0,07/s) — dois planos de 5 s = um de 10 s. O filme paga, em
 * média, uma unidade de 5 s a mais (medido nos guardiões: +US$ 0,40/filme nos 30 filmes reais e +US$ 0,44 em 240
 * aleatórios contra o teto 12; nunca mais de 3 unidades): granularidade de blocos menores + a folga de 0,3 s abaixo.
 *  · ROTEIRO PRONTO (verbatim): o teto acompanha a imagem que o filme pede — ⌈útil ÷ 4,84⌉ + 1, entre 12 e 18
 *    (kling25MaxShots: 60 s → 14 · 65-70 s de fala → 15-16 · 90 s → 18). 18 é o teto FÍSICO (90 s ÷ 4,84 s úteis): o
 *    despacho do Kling é SERIAL (450 ms entre POSTs — o alias da fal limita por usuário; 18 POSTs ≈ 8 s de espera mais
 *    a latência de cada POST, dentro dos 300 s da rota) e o descritor e o supervisor fala×imagem fazem UMA chamada com
 *    todas as cenas (supervisor com orçamento proporcional em kling25AlignBudget; descritor cabe em 1.000 tokens:
 *    18 × 24 palavras ≈ 700).
 *  · MODO IA: continua 12 — o escritor de cenas (lib/runway generateScenes, safeCount) corta em 12 e é o MESMO escritor
 *    de Seedance/Veo (fora do ramo do Kling): pedir 14 ali devolveria 12 cenas dimensionadas para 14.
 */
export const KLING25_MAX_SHOTS = 18
export const KLING25_MAX_SHOTS_AI = 12
/**
 * Folga que o divisor do roteiro pronto reserva em CADA plano de 5 s (o bloco cabe em 5 − 0,3 s): 5 s → até 10 palavras
 * a 2,3 pal/s (eram 11). Medido no guardião com os 30 filmes reais ao subir o teto: com blocos de 11 palavras (4,78 s de
 * fala em 4,84 s úteis) uma voz a 2,14 pal/s (c589a6a5) acumulava 3,1 s de atraso entre o plano entrar e a fala começar
 * — 16 planos cheios em fila, sem um plano com folga para a voz alcançar (com o teto 12 os planos de 10 s davam essa
 * folga: 1,65 s). Com 10 palavras (4,35 s) a voz pode ir até 10 ÷ 4,84 = 2,07 pal/s sem atrasar. Só o bloco curto: o de
 * 10 s continua em 22 palavras (9,57 s em 9,84 — a mesma folga da base).
 */
export const KLING25_SHORT_FIT_SLACK_SECONDS = 0.3

/**
 * Teto de planos do filme: modo IA = 12 (o escritor); roteiro pronto = ⌈útil ÷ 4,84⌉ + 1 entre 12 e 18. O piso 12
 * mantém byte a byte todo filme que hoje cabe em 12 planos (35/45 s: o divisor escolhe 8-10 e o teto não morde).
 */
export function kling25MaxShots(input: { verbatim: boolean; footageSeconds?: number | null }): number {
  if (!input.verbatim) return KLING25_MAX_SHOTS_AI
  const need = positive(input.footageSeconds) ? input.footageSeconds : 0
  const porImagem = Math.ceil(need / kling25UsefulSeconds(KLING25_SHOT_SECONDS) - 1e-9) + 1
  return Math.max(KLING25_MAX_SHOTS_AI, Math.min(KLING25_MAX_SHOTS, porImagem))
}
/** Preço do fornecedor por segundo de clipe — docs/PRECOS-MOTORES-V4.md (fal-ai/kling-video/v2.5-turbo/pro). */
export const KLING25_USD_PER_SECOND = 0.07
/**
 * Passo de PLANEJAMENTO da fala, em palavras por segundo: nunca mais rápido que a voz, nunca acima de 2,3. Medido pela
 * revisão de 28/09 nos 30 filmes verbatim reais: 2,10 a 2,90 pal/s (06fe798a 2,35 · 630e3f64 2,42 · c589a6a5 2,14);
 * cerca de metade abaixo de 2,5, a régua antiga do #442. Mais lento = mais imagem por palavra = nada falta.
 */
export const KLING25_PLAN_WPS = 2.3
/** O que o compose tira de CADA plano: CLIP_TRIM_START 0,1 + CLIP_GAP_OVERLAP 0,06 (lib/compose). Útil = segundos − 0,16. */
export const KLING25_CLIP_LOSS_SECONDS = 0.16
/**
 * Folga de imagem ÚTIL no modo IA: a fala do escritor não é a falada (o compose reescala o texto e acerta a voz para o
 * botão). 3 s cabem dentro dos planos que o botão já pede (35 s → 8 × 4,84 = 38,7 s úteis) sem comprar plano a mais.
 */
export const KLING25_AI_SLACK_SECONDS = 3
/** O compose nunca monta além de 90 s (clamp de lib/compose) e estica pedidos ≥ 60 s até 61,5 s (TIKTOK-61). */
export const KLING25_FILM_MAX_SECONDS = 90
export const KLING25_TIKTOK_FLOOR_SECONDS = 61.5

const round1 = (v: number): number => Math.round(v * 10) / 10
const splitWords = (text: string | null | undefined): string[] => String(text ?? '').trim().split(/\s+/).filter(Boolean)
const wordsIn = (text: string | null | undefined): number => splitWords(text).length
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

/** Segundos que o compose realmente mostra de um plano (segundos − 0,16). */
export function kling25UsefulSeconds(seconds: number): number {
  return Math.max(0, seconds - KLING25_CLIP_LOSS_SECONDS)
}

/**
 * Passo de planejamento: min(voz, 2,3). Roteiro que nesse passo passaria de 90 s é cortado em 90 s pelo compose — ali
 * o passo sobe até caber em 90 s (a fala além do corte nunca vira imagem, e plano para ela é dinheiro jogado fora).
 */
export function kling25PlanPace(voiceWordsPerSecond?: number | null, words?: number | null): number {
  let pace = Math.min(KLING25_PLAN_WPS, positive(voiceWordsPerSecond) ? voiceWordsPerSecond : KLING25_PLAN_WPS)
  const w = positive(words) ? words : 0
  if (w > 0 && w / pace > KLING25_FILM_MAX_SECONDS) pace = w / KLING25_FILM_MAX_SECONDS
  return Math.round(pace * 1000) / 1000
}

/** Quantas palavras cabem na parte útil de um plano de `seconds`, no passo `pace`. */
export function kling25WordsFit(seconds: number, pace: number): number {
  return Math.max(1, Math.floor(kling25UsefulSeconds(seconds) * (positive(pace) ? pace : KLING25_PLAN_WPS) + 1e-6))
}

/**
 * Duração do filme que a imagem precisa cobrir, em segundos ÚTEIS:
 *  · verbatim: o relógio do filme é o áudio (lib/compose) — o roteiro no passo de planejamento; pedido ≥ 60 s é
 *    esticado a 61,5 s (TIKTOK-61); nunca além de 90 s;
 *  · modo IA: o botão (61,5 s acima de 60) — o compose reescala o texto e acerta a voz para ele.
 */
export function kling25FilmSeconds(input: { durationSeconds: number; verbatimWords?: number; wordsPerSecond?: number }): number {
  const d = positive(input.durationSeconds) ? input.durationSeconds : 45
  const words = positive(input.verbatimWords) ? input.verbatimWords : 0
  if (words > 0) {
    const fala = words / kling25PlanPace(input.wordsPerSecond, words)
    return round1(Math.min(KLING25_FILM_MAX_SECONDS, Math.max(fala, d >= 60 ? KLING25_TIKTOK_FLOOR_SECONDS : 0)))
  }
  return round1(Math.min(KLING25_FILM_MAX_SECONDS, d >= 60 ? Math.max(d, KLING25_TIKTOK_FLOOR_SECONDS) : d))
}

/**
 * Imagem ÚTIL necessária. Verbatim: o próprio filme (cada plano já carrega a sua fala no passo conservador, que é a
 * folga). Modo IA: o filme + 3 s de folga (a fala do escritor ainda vai ser reescalada pelo compose).
 */
export function kling25FootageNeeded(input: { durationSeconds: number; verbatimWords?: number; wordsPerSecond?: number }): number {
  const film = kling25FilmSeconds(input)
  return round1(positive(input.verbatimWords) ? film : Math.min(KLING25_FILM_MAX_SECONDS + KLING25_AI_SLACK_SECONDS, film + KLING25_AI_SLACK_SECONDS))
}

/**
 * Planos de 5 s (4,84 s úteis cada) que cobrem `footageSeconds` úteis, entre 2 e o teto (kling25MaxShots: 12 no modo
 * IA — o padrão, sem opção — e 12-18 no roteiro pronto). No roteiro pronto este número é provisório (o plano real sai de
 * kling25VerbatimPlan), mas é o que resolveVerbatimSegments recebe para roteiro COM marcadores: abaixo dos blocos do
 * autor ele descarta blocos — 16 blocos num teto de 12 perdiam 4 falas.
 */
export function kling25ShotCount(footageSeconds: number, options?: { verbatim?: boolean }): number {
  const need = positive(footageSeconds) ? footageSeconds : 0
  const teto = kling25MaxShots({ verbatim: options?.verbatim === true, footageSeconds: need })
  return Math.max(2, Math.min(teto, Math.ceil(need / kling25UsefulSeconds(KLING25_SHOT_SECONDS) - 1e-9)))
}

/** Ordem de espalhamento (van der Corput): empate de narração → planos longos distribuídos pelo filme, não colados. */
function spreadRank(n: number): number[] {
  const rank = new Array<number>(n).fill(-1)
  let next = 0
  for (let m = 1; next < n && m <= 12; m++) {
    const den = 2 ** m
    for (let num = 1; num < den && next < n; num += 2) {
      const idx = Math.min(n - 1, Math.floor((num / den) * n))
      if (rank[idx] === -1) rank[idx] = next++
    }
  }
  for (let i = 0; i < n; i++) if (rank[i] === -1) rank[i] = next++
  return rank
}

/**
 * Segundos de cada plano, depois que as cenas existem. Nunca outro valor além de 5 e 10.
 *  · `fitFirst` (verbatim): a cena cuja fala não cabe em 4,84 s no passo de planejamento (`fitWords` = palavras que
 *    cabem num plano de 5 s) já nasce com 10 s — a imagem acompanha a própria frase. Cobertura que ainda faltar (a cauda
 *    do TIKTOK-61 mora no FIM do filme) promove do último plano para trás.
 *  · modo IA: todos 5 s; se não cobre a imagem necessária, os planos com MAIS fala passam a 10 s (empate: espalhados).
 * `wordCounts` (quando vem) é a fala ATRIBUÍDA a cada cena — do início dela até o início da próxima na narração.
 */
export function kling25SceneSeconds(
  voiceovers: ReadonlyArray<string | null | undefined>,
  footageSeconds: number,
  options?: { wordCounts?: ReadonlyArray<number>; fitFirst?: boolean; fitWords?: number },
): number[] {
  const n = voiceovers.length
  if (n === 0) return []
  const words = options?.wordCounts && options.wordCounts.length === n
    ? options.wordCounts.map((w) => (Number.isFinite(w) && w > 0 ? Math.trunc(w) : 0))
    : voiceovers.map(wordsIn)
  const seconds = new Array<number>(n).fill(KLING25_SHOT_SECONDS)
  const fitFirst = options?.fitFirst === true && positive(options.fitWords)
  if (fitFirst) for (let i = 0; i < n; i++) if (words[i] > (options!.fitWords as number)) seconds[i] = KLING25_LONG_SHOT_SECONDS
  const need = positive(footageSeconds) ? footageSeconds : 0
  const useful = () => seconds.reduce((a, s) => a + kling25UsefulSeconds(s), 0)
  if (useful() + 1e-6 < need) {
    const rank = spreadRank(n)
    const order = fitFirst
      ? Array.from({ length: n }, (_, k) => n - 1 - k)
      : Array.from({ length: n }, (_, i) => i).sort((a, b) => words[b] - words[a] || rank[a] - rank[b])
    for (const i of order) {
      if (useful() + 1e-6 >= need) break
      if (seconds[i] === KLING25_SHOT_SECONDS) seconds[i] = KLING25_LONG_SHOT_SECONDS
    }
  }
  return seconds
}

/** Segundos médios por plano para `count` cenas uniformes (o "~X-second scene" que o escritor do modo IA recebe). */
export function kling25AverageShotSeconds(count: number, footageSeconds: number): number {
  const n = Math.max(1, Math.trunc(count) || 1)
  const s = kling25SceneSeconds(new Array<string>(n).fill(''), footageSeconds)
  return Math.round(s.reduce((a, b) => a + b, 0) / n)
}

// ═══ Divisor do verbatim em prosa: cortes E segundos decididos juntos ══════════════════════════════════════════════
// Cada bloco precisa caber no seu plano (≤ palavras de um plano de 5 s → 5 s; senão ≤ palavras de 10 s → 10 s). Entre
// os divisores que cabem, o mais barato; no mesmo preço, o que corta em fim de frase; depois vírgula dentro de frase que
// não cabe num plano; palavra só quando não há outro jeito. Nenhuma palavra some, nenhuma muda de ordem.

const SENTENCE_END = /[.!?…]["'”’)\]]*$/u
const CLAUSE_END = /[,;:—–]["'”’)\]]*$/u
const ABBREVIATION = /^(mr|mrs|ms|dr|st|jr|sr|vs|etc|e\.g|i\.e|u\.s|u\.k|mt|ft|approx)\.$/iu
const INITIAL = /^\p{Lu}\.$/u

function boundaryKind(word: string, next: string | undefined): 'sentence' | 'clause' | 'word' {
  if (SENTENCE_END.test(word) && !ABBREVIATION.test(word) && !INITIAL.test(word)) return 'sentence'
  if (CLAUSE_END.test(word) || next === '—' || next === '–') return 'clause'
  return 'word'
}

/**
 * Custo de cada coisa que o divisor pode fazer, na régua "um plano de 5 s a mais = 4". Um plano de 10 s custa o mesmo
 * dinheiro que dois de 5 s, mas é uma troca de cena a menos (o pedido do fundador): +3. Calibrado nos 30 roteiros reais da
 * revisão — com +3 o canário sai em 9 planos; sem ele, em 5 (a variedade que o fundador pediu se perdia).
 */
const COST_PER_SHOT = 4
const COST_LONG_SHOT = 3
const COST_CLAUSE_IN_LONG_SENTENCE = 0.3
const COST_WORD_IN_LONG_SENTENCE = 1.5
const COST_CLAUSE_IN_SHORT_SENTENCE = 2.5
// palavra no meio de frase curta ("When | the sun…") custa mais que um plano de 10 s a mais (4 + 3): nunca compensa
const COST_WORD_IN_SHORT_SENTENCE = 8
const COST_TINY_BLOCK = 3
const COST_OVERFLOW = 40

export interface Kling25VerbatimPlan {
  chunks: string[]
  seconds: number[]
  pace: number
  fitShort: number
  fitLong: number
  /** Imagem útil que o filme pede (kling25FilmSeconds). */
  needSeconds: number
}

export function kling25VerbatimPlan(
  narration: string,
  opts: { durationSeconds: number; wordsPerSecond?: number; maxShots?: number },
): Kling25VerbatimPlan {
  const words = String(narration ?? '').trim().replace(/\s+/gu, ' ').split(' ').filter(Boolean)
  const W = words.length
  const pace = kling25PlanPace(opts.wordsPerSecond, W)
  const fitShort = kling25WordsFit(KLING25_SHOT_SECONDS - KLING25_SHORT_FIT_SLACK_SECONDS, pace) // [TRAVA 8.2] KLING25-60S-TETO: folga contra voz mais lenta que o passo
  const fitLong = kling25WordsFit(KLING25_LONG_SHOT_SECONDS, pace)
  const needSeconds = W > 0 ? kling25FilmSeconds({ durationSeconds: opts.durationSeconds, verbatimWords: W, wordsPerSecond: opts.wordsPerSecond }) : 0
  const empty: Kling25VerbatimPlan = { chunks: [], seconds: [], pace, fitShort, fitLong, needSeconds }
  if (W === 0) return empty
  // [TRAVA 8.2] KLING25-60S-TETO: sem opção, o teto é o da imagem que o filme pede (12-18); a opção só pode APERTAR.
  const tetoDoFilme = kling25MaxShots({ verbatim: true, footageSeconds: needSeconds })
  const maxShots = Math.max(1, Math.min(tetoDoFilme, Math.trunc(opts.maxShots ?? tetoDoFilme) || tetoDoFilme))

  // tamanho da frase que contém cada fronteira interna (fronteira b = entre a palavra b-1 e a b)
  const sentenceLenAt = new Array<number>(W + 1).fill(0)
  let start = 0
  for (let i = 0; i < W; i++) {
    if (i === W - 1 || boundaryKind(words[i], words[i + 1]) === 'sentence') {
      for (let b = start + 1; b <= i; b++) sentenceLenAt[b] = i + 1 - start
      start = i + 1
    }
  }
  const cutCost = (b: number): number => {
    if (b >= W) return 0
    const kind = boundaryKind(words[b - 1], words[b])
    if (kind === 'sentence') return 0
    const long = sentenceLenAt[b] > fitShort
    if (kind === 'clause') return long ? COST_CLAUSE_IN_LONG_SENTENCE : COST_CLAUSE_IN_SHORT_SENTENCE
    return long ? COST_WORD_IN_LONG_SENTENCE : COST_WORD_IN_SHORT_SENTENCE
  }
  const blockCost = (len: number): number => {
    const shots = len <= fitShort ? 1 : 2
    const overflow = len > fitLong ? COST_OVERFLOW + 4 * (len - fitLong) : 0
    return shots * COST_PER_SHOT + (shots === 2 ? COST_LONG_SHOT : 0) + overflow + (len < 3 && W >= 6 ? COST_TINY_BLOCK : 0)
  }
  const maxLen = Math.max(fitLong + 8, 12)

  type Best = { cost: number; cuts: number[] }
  let best: Best | null = null
  const lo = Math.max(1, Math.min(maxShots, W, W >= 2 ? 2 : 1))
  for (let n = lo; n <= Math.min(maxShots, W); n++) {
    const INF = Number.POSITIVE_INFINITY
    const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(W + 1).fill(INF))
    const from: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(W + 1).fill(-1))
    cost[0][0] = 0
    for (let j = 1; j <= n; j++) {
      for (let b = j; b <= W - (n - j); b++) {
        const cb = cutCost(b)
        for (let a = Math.max(j - 1, b - maxLen); a < b; a++) {
          const prev = cost[j - 1][a]
          if (prev === INF) continue
          const c = prev + blockCost(b - a) + cb
          if (c < cost[j][b] - 1e-9) { cost[j][b] = c; from[j][b] = a }
        }
      }
    }
    if (cost[n][W] === INF) continue
    const cuts: number[] = []
    let b = W
    for (let j = n; j >= 1; j--) { cuts.push(b); b = from[j][b] }
    cuts.reverse()
    // cobertura: a cauda (TIKTOK-61) — promoções do fim para trás, pagas como plano a mais
    const lens = cuts.map((c, k) => c - (k === 0 ? 0 : cuts[k - 1]))
    const secs = kling25SceneSeconds(lens.map(() => ''), needSeconds, { wordCounts: lens, fitFirst: true, fitWords: fitShort })
    const promoted = secs.filter((s, k) => s === KLING25_LONG_SHOT_SECONDS && lens[k] <= fitShort).length
    // imagem que nem com todos os planos em 10 s cobre o filme: esse número de planos não serve (mais planos cobrem)
    const falta = Math.max(0, needSeconds - secs.reduce((acc, s) => acc + kling25UsefulSeconds(s), 0))
    const total = cost[n][W] + promoted * COST_PER_SHOT + (falta > 1e-6 ? COST_OVERFLOW + COST_PER_SHOT * Math.ceil(falta / kling25UsefulSeconds(KLING25_SHOT_SECONDS)) : 0)
    // no mesmo custo, mais planos (a variedade que o fundador pediu)
    if (!best || total < best.cost - 1e-9 || Math.abs(total - best.cost) <= 1e-9) best = { cost: total, cuts }
  }
  if (!best) return empty
  const chunks: string[] = []
  const lens: number[] = []
  let a = 0
  for (const c of best.cuts) { chunks.push(words.slice(a, c).join(' ')); lens.push(c - a); a = c }
  const seconds = kling25SceneSeconds(chunks, needSeconds, { wordCounts: lens, fitFirst: true, fitWords: fitShort })
  return { chunks, seconds, pace, fitShort, fitLong, needSeconds }
}

/** Pista visual da cena no verbatim do Kling: a fala inteira sem pontuação (até 60 palavras — nada se perde). */
export function kling25VisualHint(voiceover: string, maxWords = 60): string {
  const visualWords = String(voiceover ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, maxWords)
  return visualWords.join(' ') || 'cinematic documentary scene'
}

/**
 * Onde a fala de cada cena COMEÇA na narração do filme (índice de palavra, separando por espaço como o compose). A
 * cena é localizada pelas suas primeiras palavras a partir do fim da anterior; cena que não se acha (texto reescrito)
 * começa onde a anterior terminou. Nunca decresce. Vai assinado no claim (`clip_word_starts`): o compose corta cada
 * plano no instante em que a SUA fala começa.
 */
export function kling25SceneWordStarts(narration: string, voiceovers: ReadonlyArray<string | null | undefined>): number[] {
  const norm = (w: string) => w.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const raw = splitWords(narration)
  const tokens: { at: number; w: string }[] = []
  raw.forEach((w, at) => { const n = norm(w); if (n) tokens.push({ at, w: n }) })
  const starts: number[] = []
  let cursor = 0
  for (const vo of voiceovers) {
    const ws = splitWords(vo).map(norm).filter(Boolean)
    let hit = -1
    if (ws.length > 0) {
      const probe = ws.slice(0, Math.min(4, ws.length))
      for (let q = cursor; q + probe.length <= tokens.length && hit < 0; q++) {
        if (probe.every((w, k) => tokens[q + k].w === w)) hit = q
      }
    }
    const at = hit >= 0 ? tokens[hit].at : cursor < tokens.length ? tokens[cursor].at : raw.length
    starts.push(Math.max(starts.length ? starts[starts.length - 1] : 0, at))
    cursor = hit >= 0 ? Math.min(tokens.length, hit + ws.length) : Math.min(tokens.length, cursor + ws.length)
  }
  return starts
}

/** `duration` do payload da fal do Kling 2.5 (t2v e i2v). Sem segundos planejados = '10', exatamente como sempre foi. */
export function kling25FalDuration(seconds?: number | null): '5' | '10' {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 && seconds <= KLING25_SHOT_SECONDS ? '5' : '10'
}

/** Custo estimado do fornecedor para os planos (só clipes; stills FLUX e TTS à parte). */
export function kling25ClipsUsd(seconds: ReadonlyArray<number>): number {
  return Math.round(seconds.reduce((a, s) => a + s, 0) * KLING25_USD_PER_SECOND * 100) / 100
}

/**
 * Orçamento do escritor de cenas (gpt-4o, 9 campos por cena ≈ 150 tokens) acima de 9 cenas: o teto fixo de 1.800 tokens
 * cortaria o JSON de 12 cenas no meio. Só o Kling 2.5 pede; Seedance/Veo seguem com o objeto de sempre.
 */
export function kling25WriterBudget(sceneCount: number): { maxTokens: number; timeoutMs: number } {
  const n = Math.max(1, Math.trunc(sceneCount) || 1)
  return { maxTokens: Math.max(1800, 180 * n + 200), timeoutMs: n > 9 ? 50_000 : 35_000 }
}

/** Orçamento do supervisor fala×imagem (gpt-4o-mini, uma chamada por filme) com o dobro de cenas. */
export function kling25AlignBudget(sceneCount: number): { maxTokens: number; timeoutMs: number } {
  const n = Math.max(1, Math.trunc(sceneCount) || 1)
  return { maxTokens: Math.max(1400, 150 * n + 200), timeoutMs: Math.max(9_000, 9_000 + 900 * (n - 4)) }
}

/**
 * `clip_seconds` do claim ASSINADO → alinhado aos clipes que o compose recebeu. O claim é índice-alinhado às cenas
 * (URL null onde a cena não completou); o compose recebe só as URLs completas, na mesma ordem (a igualdade URL a URL já
 * foi conferida contra authorized_completed_urls). Qualquer coisa fora do contrato → null = montagem de hoje, byte a byte.
 */
export function alignSignedClipSeconds(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): number[] | null {
  const raw = response ? response.clip_seconds : undefined
  if (!Array.isArray(raw) || raw.length !== authorizedUrls.length) return null
  const out: number[] = []
  for (let i = 0; i < authorizedUrls.length; i++) {
    const url = authorizedUrls[i]
    if (typeof url !== 'string' || url.length === 0) continue
    const s = raw[i]
    if (s !== KLING25_SHOT_SECONDS && s !== KLING25_LONG_SHOT_SECONDS) return null
    if (clipUrls[out.length] !== url) return null
    out.push(s)
  }
  return out.length > 0 && out.length === clipUrls.length ? out : null
}

/**
 * O plano assinado inteiro para o compose: segundos de cada clipe e onde a fala de cada um começa na narração assinada
 * (`clip_word_starts` sobre `voiceover_script`, as duas no claim). Início inválido (tamanho, não inteiro, fora da
 * narração, decrescente) → `wordStarts` null: o compose ainda respeita o comprimento de cada clipe, só não sabe onde
 * cada fala começa. Sem `clip_seconds` válido → null (montagem de hoje).
 */
export function alignSignedClipPlan(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): { seconds: number[]; wordStarts: number[] | null; narrationWords: string[] } | null {
  const seconds = alignSignedClipSeconds(response, authorizedUrls, clipUrls)
  if (!seconds || !response) return null
  const narrationWords = splitWords(typeof response.voiceover_script === 'string' ? response.voiceover_script : '')
  const raw = response.clip_word_starts
  let wordStarts: number[] | null = null
  if (
    narrationWords.length > 0 && Array.isArray(raw) && raw.length === authorizedUrls.length &&
    raw.every((x, i) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= narrationWords.length && (i === 0 || (x as number) >= (raw[i - 1] as number)))
  ) {
    wordStarts = []
    for (let i = 0; i < authorizedUrls.length; i++) {
      const url = authorizedUrls[i]
      if (typeof url === 'string' && url.length > 0) wordStarts.push(raw[i] as number)
    }
    if (wordStarts.length !== seconds.length) wordStarts = null
  }
  return { seconds, wordStarts, narrationWords }
}
