// KINEO-GEO-RODADA3-2026-10-08 — o "Shorts script timer" por FAMÍLIA DE MOTOR (sessão CEO 08/10, item 3 da rodada 3 de GEO).
//
// O PEDIDO: "a pessoa cola um roteiro e vê o número de palavras e os segundos estimados por família de motor … use as constantes
// de régua do PRÓPRIO repo … existe uma divergência conhecida entre essas réguas: use o valor que cada motor de fato aplica e
// escreva 'estimate'. Mostre quantas palavras cabem em 35, 60 e 90 s." A ferramenta já existia (/youtube-shorts-script-timer,
// uma régua só de 2,3 pal/s): ela foi ESTENDIDA, não duplicada.
//
// O QUE CADA MOTOR DE FATO APLICA (lido do código que mede antes de gastar — app/api/generate-video-cinematic, o ensaio de $0
// e o portão da narração):
//   · família CLÁSSICA (Seedance 1.5, Kling 2.5, Veo 3.1 — a voz é o narrador da Kineo): o passo da VOZ que o compose vai usar
//     (lib/speechRate.ts speechRateFor com a persona de selectPersonaForScript, tier 'cinematic', na língua do texto) —
//     2,3 pal/s no narrador de mistério (≈138 palavras para 60 s em inglês) e 2,45 no documental, que é o que roteiro de fatos
//     e quase todo roteiro em português recebe (≈147 palavras);
//   · família HOLLYWOOD (Kling 3, MiniMax H3, Seedance 2.5 — o modelo fala, ou a Kineo narra o 2.5 na régua da família):
//     SPEECH_RATE_BASE.hollywood (2,3 pal/s, a mesma WORDS_PER_SECOND_HOLLYWOOD do conector do ChatGPT/Claude);
//   · o piso de cobertura do cobrador (lib/narrationFit.ts minCoverageFor: 95% acima de 15 s) dá o "mínimo" de cada duração.
// A divergência conhecida: o conector do ChatGPT/Claude (lib/mcp/kineoMcp.ts, WORDS_PER_SECOND_CLASSIC = SPEECH_RATE_BASE.classic,
// 3,1 pal/s) planeja os motores clássicos num passo mais solto que o da voz; a página diz isso e usa o passo da voz.
// Tudo é ESTIMATIVA ('estimate'): nenhuma régua aqui mede áudio.
//
// MÓDULO PURO E SEGURO NO NAVEGADOR: só módulos sem banco/rede/node (narrationFit, speechRate, scriptParser, niche-mapping,
// personas, textLanguage, engineLandingIntent, engineLaunch). Nenhum número de régua digitado aqui.
import { minCoverageFor } from '../narrationFit'
import { SPEECH_RATE_BASE, speechFamilyForQuality, speechRateFor, type SpeechFamily } from '../speechRate'
import { parseSpeed, parseUserScript } from '../scriptParser'
import { selectPersonaForScript } from '../narration/niche-mapping'
import { resolveNarrationLanguage, type NarrationLanguage } from '../textLanguage'
import { ENGINE_LANDING_LABELS, ENGINE_LANDING_PARAMS } from './engineLandingIntent'
import { KINEO1_PUBLIC, enginePaused } from '../engineLaunch'
import { countScriptWords } from './shortsScriptTimer'

export const SCRIPT_TIMER_ENGINES_MARK = 'KINEO-GEO-RODADA3-2026-10-08'
/** As três durações da casa (35/60/90 é norte, não camisa de força: passar do alvo é bom, ficar abaixo do piso é defeito). */
export const FILM_SECONDS = [35, 60, 90] as const
export type FilmSeconds = (typeof FILM_SECONDS)[number]

export interface FamilyCapacity {
  seconds: FilmSeconds
  /** Palavras faladas que enchem a duração no passo do motor (arredondado). */
  words: number
  /** O piso do cobrador: abaixo disto o filme sai mais curto (ou o pedido é recusado). */
  minimum: number
}
export interface EngineFamilyEstimate {
  family: SpeechFamily
  /** Os motores da família que estão no ar hoje (nomes do catálogo, derivados — nunca digitados). */
  engines: string[]
  /** Quem fala: o narrador da Kineo (persona) ou o próprio modelo. */
  voice: string
  wordsPerSecond: number
  /** Segundos de fala estimados para o roteiro colado. */
  seconds: number
  capacity: FamilyCapacity[]
  basis: 'estimate'
}
export interface ScriptTimerEnginesResult {
  rawWords: number
  spokenWords: number
  ignoredWords: number
  narration: string
  language: NarrationLanguage
  families: EngineFamilyEstimate[]
}

/** Os motores de cada família que estão no ar hoje (Kineo 1 só quando público; motor pausado fica de fora). */
export function engineNamesFor(family: SpeechFamily): string[] {
  return ENGINE_LANDING_PARAMS.filter((p) => (p !== 'fast' || KINEO1_PUBLIC) && !enginePaused(p) && speechFamilyForQuality(p) === family).map((p) => ENGINE_LANDING_LABELS[p])
}

/** O passo da voz clássica para um texto: a persona que o compose escolheria (tier cinematic) × velocidade escrita no roteiro. */
export function classicRateFor(script: string, language: NarrationLanguage = 'en'): { wordsPerSecond: number; persona: string } {
  const persona = selectPersonaForScript(script ?? '', undefined, 'cinematic', language)
  const rate = speechRateFor({ family: 'classic', speed: parseSpeed(script ?? ''), language, voice: persona.voice, personaSpeed: persona.defaultSpeed })
  return { wordsPerSecond: rate.wordsPerSecond, persona: persona.name }
}

/** O passo da família hollywood (× velocidade escrita no roteiro). */
export function hollywoodRateFor(script: string): number {
  return speechRateFor({ family: 'hollywood', speed: parseSpeed(script ?? '') }).wordsPerSecond
}

/** Quantas palavras enchem cada duração (e o piso do cobrador) num passo dado. */
export function capacityAt(wordsPerSecond: number): FamilyCapacity[] {
  return FILM_SECONDS.map((seconds) => ({
    seconds,
    words: Math.round(seconds * wordsPerSecond),
    minimum: Math.ceil(seconds * minCoverageFor(seconds) * wordsPerSecond),
  }))
}

/** O roteiro colado → palavras faladas e segundos estimados por família de motor, e a capacidade de 35/60/90 s. */
export function estimateByEngineFamily(rawScript: string): ScriptTimerEnginesResult {
  const raw = (rawScript ?? '').toString()
  const narration = parseUserScript(raw).narration
  const rawWords = countScriptWords(raw)
  const spokenWords = countScriptWords(narration)
  const { language } = resolveNarrationLanguage(null, narration)
  const classic = classicRateFor(raw, language)
  const hollywood = hollywoodRateFor(raw)
  const families: EngineFamilyEstimate[] = [
    {
      family: 'classic',
      engines: engineNamesFor('classic'),
      voice: `Kineo narrator (${classic.persona} voice)`,
      wordsPerSecond: classic.wordsPerSecond,
      seconds: spokenWords / classic.wordsPerSecond,
      capacity: capacityAt(classic.wordsPerSecond),
      basis: 'estimate',
    },
    {
      family: 'hollywood',
      engines: engineNamesFor('hollywood'),
      voice: 'Kling 3 and MiniMax H3 speak in the engine’s own voice; Kineo narrates Seedance 2.5 — all timed at the same pace',
      wordsPerSecond: hollywood,
      seconds: spokenWords / hollywood,
      capacity: capacityAt(hollywood),
      basis: 'estimate',
    },
  ]
  return { rawWords, spokenWords, ignoredWords: Math.max(0, rawWords - spokenWords), narration, language, families }
}

/** O passo de planejamento que o conector do ChatGPT/Claude descreve para os motores clássicos (a divergência conhecida). */
export const CONNECTOR_CLASSIC_PLANNING_PACE = SPEECH_RATE_BASE.classic

/**
 * As frases citáveis da página (FAQ e JSON-LD), montadas das MESMAS funções da ferramenta: o narrador de mistério em inglês,
 * o documental (o que roteiro de fatos e quase todo roteiro em português recebe) e a família hollywood.
 */
export function scriptTimerRulerFacts(): {
  mystery: { wordsPerSecond: number; persona: string; words60: number }
  documentary: { wordsPerSecond: number; persona: string; words60: number }
  hollywood: { wordsPerSecond: number; words60: number; minimum60: number; engines: string[] }
  classicEngines: string[]
  connectorPace: number
  /** O piso de cobertura do cobrador acima de 15 s, em % (lib/narrationFit.ts minCoverageFor). */
  floorPercent: number
  /** As durações da casa, na ordem (35 → 60 → 90). */
  durations: readonly FilmSeconds[]
} {
  const mystery = classicRateFor('mystery', 'en')
  const documentary = classicRateFor('', 'pt')
  const hw = hollywoodRateFor('')
  const sixty = (wps: number) => capacityAt(wps).find((c) => c.seconds === 60) as FamilyCapacity
  return {
    mystery: { ...mystery, words60: sixty(mystery.wordsPerSecond).words },
    documentary: { ...documentary, words60: sixty(documentary.wordsPerSecond).words },
    hollywood: { wordsPerSecond: hw, words60: sixty(hw).words, minimum60: sixty(hw).minimum, engines: engineNamesFor('hollywood') },
    classicEngines: engineNamesFor('classic'),
    connectorPace: CONNECTOR_CLASSIC_PLANNING_PACE,
    floorPercent: Math.round(minCoverageFor(FILM_SECONDS[1]) * 100),
    durations: FILM_SECONDS,
  }
}
