// ═══ [TRAVA 8.2] VEO-PLANOS-2026-09-29 — Veo 3.1 em planos de 4 / 6 / 8 s ═══════════════════════════════════════════
// Palavra do fundador (29/09 00:30 BRT): "quero foco total hoje para arrumar o Veo, que é um motor que temos que ter a
// partir de agora". Até aqui o Veo 3.1 Fast rodava planos de 8 s FIXOS (buildFalInput: duration '8s' no t2v e no i2v;
// clipes = ⌈s/8⌉ + 1): 6 planos para 35 s, 9 para 60 s — cada plano cobria 2-3 frases e a imagem não acompanhava a fala.
// O Kling 2.5 acabou de ganhar planos que cabem a própria fala (lib/cinematic/klingShots.ts, KINEO-KLING25-PLANOS-5S);
// este módulo faz o MESMO para o Veo, com a tabela de passos do fornecedor.
//
// Schema da fal (fal-ai/veo3.1/fast e fal-ai/veo3.1/fast/image-to-video, lido em 29/09): duration '4s' | '6s' | '8s',
// resolution 720p | 1080p ao MESMO preço, US$ 0,10 por segundo (docs/PRECOS-MOTORES-V4.md). 4 s = US$ 0,40 · 6 s = 0,60 ·
// 8 s = 0,80: dois planos de 4 s custam o mesmo que um de 8 s — a variedade não custa mais por segundo.
//
// A régua é a do Kling (revisão adversarial de 28/09): CADA plano cabe a sua fala no passo conservador (min(voz, 2,3)
// pal/s), medido no ÚTIL (o compose tira 0,16 s de cada plano) e com folga de 0,3 s contra voz mais lenta que o passo;
// o divisor escolhe cortes e segundos juntos; o compose corta cada plano na 1ª palavra da própria cena (claim assinado
// com clip_seconds + clip_word_starts — os mesmos campos do Kling; lib/compose planCappedClipTimeline não filtra por
// motor). Passar do alvo é bom; ficar abaixo é defeito; nada amputa a fala.
//
// O que é COMUM ao compose (perda de 0,16 s, passo ≤ 2,3, piso TikTok 61,5 s, teto 90 s, início da fala de cada cena,
// eixo de variedade prefixado e o seu inverso para o juiz) é IMPORTADO de klingShots — sem duplicar; nenhuma função de
// lá muda. Só o Veo 3.1 (route.ts: wantsVeo) chama este arquivo: Seedance 1.5, Kling 2.5, Sora e a família hollywood
// nem sabem que ele existe. Guardião: scripts/test-veo-planos-2026-09-29.mjs.

import {
  kling25FilmSeconds,
  kling25PlanPace,
  kling25UsefulSeconds,
  kling25WordsFit,
  kling25SceneWordStarts,
  kling25ApplyShotAxis,
  kling25StripShotAxis,
  KLING25_SHORT_FIT_SLACK_SECONDS,
} from './klingShots'

/** Os únicos valores que o schema da fal do Veo 3.1 Fast aceita (t2v e i2v). Ordem crescente. */
export const VEO_SHOT_STEPS: ReadonlyArray<number> = [4, 6, 8]
export const VEO_SHORT_SHOT_SECONDS = 4
export const VEO_LONG_SHOT_SECONDS = 8
/** Preço do fornecedor por segundo de clipe — docs/PRECOS-MOTORES-V4.md (fal-ai/veo3.1/fast, 720p = 1080p). */
export const VEO_USD_PER_SECOND = 0.1
/**
 * Teto de planos por filme no roteiro pronto: ⌈útil ÷ 3,84⌉ + 1 entre 12 e 18 (35 s → 12-13 · 60 s → 17 · 90 s → 18).
 * 18 é o teto físico do caminho clássico (90 s de filme; despacho do Veo é paralelo em pool de 3, cabe nos 300 s da
 * rota; supervisor fala×imagem e descritor recebem todas as cenas numa chamada, como o Kling a 18). Modo IA: 12 — o
 * escritor de cenas (lib/runway generateScenes, safeCount) corta em 12 (KLING25-60S-TETO 860b8485).
 */
export const VEO_MAX_SHOTS = 18
export const VEO_MAX_SHOTS_AI = 12
/** Folga por plano contra voz mais lenta que o passo (a mesma do plano curto do Kling): 4 s → 8 palavras a 2,3 pal/s. */
export const VEO_FIT_SLACK_SECONDS = KLING25_SHORT_FIT_SLACK_SECONDS

const round1 = (v: number): number => Math.round(v * 10) / 10
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const splitWords = (text: string | null | undefined): string[] => String(text ?? '').trim().split(/\s+/).filter(Boolean)

export function veoMaxShots(input: { verbatim: boolean; footageSeconds?: number | null }): number {
  if (!input.verbatim) return VEO_MAX_SHOTS_AI
  const need = positive(input.footageSeconds) ? input.footageSeconds : 0
  const porImagem = Math.ceil(need / kling25UsefulSeconds(VEO_SHORT_SHOT_SECONDS) - 1e-9) + 1
  return Math.max(VEO_MAX_SHOTS_AI, Math.min(VEO_MAX_SHOTS, porImagem))
}

/** Palavras que cabem em cada passo (4/6/8 s), no útil e com a folga, no passo `pace`. */
export function veoFitWords(pace: number): number[] {
  return VEO_SHOT_STEPS.map((s) => kling25WordsFit(s - VEO_FIT_SLACK_SECONDS, pace))
}

/** O menor passo (4|6|8) em que `words` cabem no passo `pace`; acima de tudo → 8 (a fala transborda, o compose corta na próxima). */
export function veoStepFor(words: number, pace: number): number {
  const fit = veoFitWords(pace)
  for (let k = 0; k < VEO_SHOT_STEPS.length; k++) if (words <= fit[k]) return VEO_SHOT_STEPS[k]
  return VEO_LONG_SHOT_SECONDS
}

/** O passo seguinte da tabela (4 → 6 → 8); 8 fica 8. */
function veoNextStep(seconds: number): number {
  const i = VEO_SHOT_STEPS.indexOf(seconds)
  return i < 0 ? VEO_LONG_SHOT_SECONDS : VEO_SHOT_STEPS[Math.min(VEO_SHOT_STEPS.length - 1, i + 1)]
}

/**
 * Segundos de cada plano dadas as palavras ATRIBUÍDAS a cada cena (do início dela ao início da próxima na narração): o
 * menor passo em que a fala cabe; cobertura que ainda faltar (a cauda do TIKTOK-61 mora no FIM do filme) promove do
 * último plano para trás, um degrau por vez, até cobrir `footageSeconds` úteis. Nunca outro valor além de 4, 6 e 8.
 */
export function veoSceneSeconds(wordCounts: ReadonlyArray<number>, footageSeconds: number, pace: number): number[] {
  const n = wordCounts.length
  if (n === 0) return []
  const seconds = wordCounts.map((w) => veoStepFor(Number.isFinite(w) && w > 0 ? Math.trunc(w) : 0, pace))
  const need = positive(footageSeconds) ? footageSeconds : 0
  const useful = () => seconds.reduce((a, s) => a + kling25UsefulSeconds(s), 0)
  // um degrau por plano, do fim para o início; só depois de todos subirem um degrau a rodada seguinte sobe outro
  for (let rodada = 0; rodada < VEO_SHOT_STEPS.length - 1 && useful() + 1e-6 < need; rodada++) {
    for (let i = n - 1; i >= 0 && useful() + 1e-6 < need; i--) {
      if (seconds[i] < VEO_LONG_SHOT_SECONDS) seconds[i] = veoNextStep(seconds[i])
    }
  }
  return seconds
}

// ═══ Divisor do verbatim em prosa: cortes E segundos decididos juntos (a mesma máquina do Kling, com 3 passos) ═══════
// Cada bloco cabe no menor plano que o comporta (≤ fit4 → 4 s; ≤ fit6 → 6 s; ≤ fit8 → 8 s). Entre os divisores que
// cabem, o mais barato; no mesmo preço, o que corta em fim de frase; depois vírgula dentro de frase que não cabe num
// plano de 4 s; palavra só quando não há outro jeito. Nenhuma palavra some, nenhuma muda de ordem.

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
 * Régua de custo do Kling ("um plano a mais = 4"); plano mais longo = uma troca de cena a menos: 6 s +2, 8 s +4,5.
 * Calibrado para a variedade que o fundador pediu: um plano de 8 s (8,5) perde para dois de 4 s em fim de frase (8) ou
 * em vírgula de frase longa (8,3) e só ganha quando o corte seria no meio de palavra (9,5); um de 6 s (6) ganha de 4 + 4
 * (8). Com [0, 1,5, 3] o roteiro de 35 s saía em 6 planos de 8 s — o mesmo filme de antes com outro nome.
 */
const COST_PER_SHOT = 4
const COST_LONGER_STEP: ReadonlyArray<number> = [0, 2, 4.5]
const COST_CLAUSE_IN_LONG_SENTENCE = 0.3
const COST_WORD_IN_LONG_SENTENCE = 1.5
const COST_CLAUSE_IN_SHORT_SENTENCE = 2.5
const COST_WORD_IN_SHORT_SENTENCE = 8
const COST_TINY_BLOCK = 3
const COST_OVERFLOW = 40
/** Promoção de cobertura (um degrau = +2 s): 0,8 por segundo, a mesma régua de 4 por plano de 5 s. */
const COST_PROMOTED_SECOND = 0.8

export interface VeoVerbatimPlan {
  chunks: string[]
  seconds: number[]
  pace: number
  /** Palavras que cabem em 4 / 6 / 8 s no passo. */
  fit: number[]
  /** Imagem útil que o filme pede (kling25FilmSeconds — a mesma régua do compose). */
  needSeconds: number
}

export function veoVerbatimPlan(
  narration: string,
  opts: { durationSeconds: number; wordsPerSecond?: number; maxShots?: number },
): VeoVerbatimPlan {
  const words = String(narration ?? '').trim().replace(/\s+/gu, ' ').split(' ').filter(Boolean)
  const W = words.length
  const pace = kling25PlanPace(opts.wordsPerSecond, W)
  const fit = veoFitWords(pace)
  const fitShort = fit[0]
  const fitLong = fit[fit.length - 1]
  const needSeconds = W > 0 ? kling25FilmSeconds({ durationSeconds: opts.durationSeconds, verbatimWords: W, wordsPerSecond: opts.wordsPerSecond }) : 0
  const empty: VeoVerbatimPlan = { chunks: [], seconds: [], pace, fit, needSeconds }
  if (W === 0) return empty
  const tetoDoFilme = veoMaxShots({ verbatim: true, footageSeconds: needSeconds })
  const maxShots = Math.max(1, Math.min(tetoDoFilme, Math.trunc(opts.maxShots ?? tetoDoFilme) || tetoDoFilme))

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
  const stepIndex = (len: number): number => { for (let k = 0; k < fit.length; k++) if (len <= fit[k]) return k; return fit.length - 1 }
  const blockCost = (len: number): number => {
    const k = stepIndex(len)
    const overflow = len > fitLong ? COST_OVERFLOW + 4 * (len - fitLong) : 0
    return COST_PER_SHOT + COST_LONGER_STEP[k] + overflow + (len < 3 && W >= 6 ? COST_TINY_BLOCK : 0)
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
    const lens = cuts.map((c, k) => c - (k === 0 ? 0 : cuts[k - 1]))
    const base = lens.map((l) => veoStepFor(l, pace))
    const secs = veoSceneSeconds(lens, needSeconds, pace)
    const promotedSeconds = secs.reduce((acc, s, k) => acc + (s - base[k]), 0)
    const falta = Math.max(0, needSeconds - secs.reduce((acc, s) => acc + kling25UsefulSeconds(s), 0))
    const total = cost[n][W] + promotedSeconds * COST_PROMOTED_SECOND + (falta > 1e-6 ? COST_OVERFLOW + COST_PER_SHOT * Math.ceil(falta / kling25UsefulSeconds(VEO_SHORT_SHOT_SECONDS)) : 0)
    // no mesmo custo, mais planos (a variedade que o fundador pediu)
    if (!best || total < best.cost - 1e-9 || Math.abs(total - best.cost) <= 1e-9) best = { cost: total, cuts }
  }
  if (!best) return empty
  const chunks: string[] = []
  const lens: number[] = []
  let a = 0
  for (const c of best.cuts) { chunks.push(words.slice(a, c).join(' ')); lens.push(c - a); a = c }
  const seconds = veoSceneSeconds(lens, needSeconds, pace)
  return { chunks, seconds, pace, fit, needSeconds }
}

/** Pista visual da cena no verbatim do Veo: a fala inteira sem pontuação (até 60 palavras — nada se perde). */
export function veoVisualHint(voiceover: string, maxWords = 60): string {
  const visualWords = String(voiceover ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, maxWords)
  return visualWords.join(' ') || 'cinematic documentary scene'
}

/** `duration` do payload da fal do Veo 3.1 (t2v e i2v). Sem segundos planejados = '8s', exatamente como sempre foi. */
export function veoFalDuration(seconds?: number | null): '4s' | '6s' | '8s' {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '8s'
  return seconds <= 4 ? '4s' : seconds <= 6 ? '6s' : '8s'
}

/** Custo estimado do fornecedor para os planos (só clipes; stills FLUX e TTS à parte). */
export function veoClipsUsd(seconds: ReadonlyArray<number>): number {
  return Math.round(seconds.reduce((a, s) => a + s, 0) * VEO_USD_PER_SECOND * 100) / 100
}

/** Onde a fala de cada cena começa na narração (o mesmo localizador do Kling — o compose lê os dois igual). */
export const veoSceneWordStarts = kling25SceneWordStarts

/** Teto de caracteres do prompt que a casa manda ao Veo (o eixo entra na frente; a cauda de proteção nunca sai). */
export const VEO_PROMPT_MAX_CHARS = 2500

/** Eixo de variedade prefixado ao prompt do plano `index` (a rotação de 12 eixos do Kling; vizinhos nunca repetem). */
export function veoApplyShotAxis(prompt: string, index: number): string {
  return kling25ApplyShotAxis(prompt, index, VEO_PROMPT_MAX_CHARS)
}

/** O inverso exato para quem LÊ o prompt (juiz de coerência): o prompt sem o eixo. */
export const veoStripShotAxis = kling25StripShotAxis

/** Palavras atribuídas a cada cena a partir dos inícios (do início dela ao início da seguinte). */
export function veoAssignedWords(narration: string, voiceovers: ReadonlyArray<string | null | undefined>): { starts: number[]; words: number[]; total: number } {
  const total = splitWords(narration).length
  const starts = kling25SceneWordStarts(narration, voiceovers)
  const words = starts.map((a, i) => (i + 1 < starts.length ? starts[i + 1] : total) - a)
  return { starts, words, total }
}

export const veoRound1 = round1

/** O relógio do filme (a mesma régua do Kling e do compose: passo, piso TikTok 61,5 s, teto 90 s). */
export const veoFilmSeconds = kling25FilmSeconds

/**
 * O plano assinado do Veo para o compose (`clip_seconds` 4|6|8 + `clip_word_starts`), alinhado às URLs completas — o
 * mesmo contrato de alignSignedClipPlan (klingShots), que só aceita 5|10 e por isso devolveria null para o Veo. Qualquer
 * coisa fora do contrato → null = montagem de hoje, byte a byte. Só /api/compose chama, e só quando fal_model é o Veo.
 */
export function veoAlignSignedClipPlan(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): { seconds: number[]; wordStarts: number[] | null; narrationWords: string[] } | null {
  const raw = response ? response.clip_seconds : undefined
  if (!response || !Array.isArray(raw) || raw.length !== authorizedUrls.length) return null
  const seconds: number[] = []
  for (let i = 0; i < authorizedUrls.length; i++) {
    const url = authorizedUrls[i]
    if (typeof url !== 'string' || url.length === 0) continue
    const s = raw[i]
    if (!VEO_SHOT_STEPS.includes(s as number)) return null
    if (clipUrls[seconds.length] !== url) return null
    seconds.push(s as number)
  }
  if (seconds.length === 0 || seconds.length !== clipUrls.length) return null
  const narrationWords = splitWords(typeof response.voiceover_script === 'string' ? response.voiceover_script : '')
  const starts = response.clip_word_starts
  let wordStarts: number[] | null = null
  if (
    narrationWords.length > 0 && Array.isArray(starts) && starts.length === authorizedUrls.length &&
    starts.every((x, i) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= narrationWords.length && (i === 0 || (x as number) >= (starts[i - 1] as number)))
  ) {
    wordStarts = []
    for (let i = 0; i < authorizedUrls.length; i++) {
      const url = authorizedUrls[i]
      if (typeof url === 'string' && url.length > 0) wordStarts.push(starts[i] as number)
    }
    if (wordStarts.length !== seconds.length) wordStarts = null
  }
  return { seconds, wordStarts, narrationWords }
}

/** O claim é do Veo 3.1 quando o modelo que rodou é o veo3.1/fast (t2v ou i2v). */
export function isVeoClaim(response: Record<string, unknown> | null | undefined): boolean {
  const m = response ? response.fal_model : undefined
  return typeof m === 'string' && m.startsWith('fal-ai/veo3.1/')
}
