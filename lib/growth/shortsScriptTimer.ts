import { MIN_COVERAGE, WORDS_PER_SECOND, narrationFit } from '../narrationFit'
import { parseUserScript } from '../scriptParser'

export const SCRIPT_TIMER_TARGETS = [35, 60] as const

export type ScriptTimerTarget = (typeof SCRIPT_TIMER_TARGETS)[number]
export type ScriptTimerStatus = 'empty' | 'no_narration' | 'short' | 'on_target' | 'long'

export interface ShortsScriptTiming {
  rawWords: number
  spokenWords: number
  ignoredWords: number
  narration: string
  estimatedSeconds: number
  targetSeconds: ScriptTimerTarget
  coverage: number
  missingWords: number
  excessWords: number
  minimumWords: number
  targetWords: number
  status: ScriptTimerStatus
}

export function countScriptWords(value: string): number {
  const normalized = (value ?? '').trim()
  return normalized ? normalized.split(/\s+/u).filter(Boolean).length : 0
}

/**
 * Browser-safe planner for the public script timer.
 *
 * The important part is not the arithmetic: it is that the public tool uses
 * the same parser and narration rate as the verbatim render guard. Production
 * directions, section labels and [Pexels: ...] markers therefore do not get
 * presented as spoken time to a visitor.
 */
export function timeShortsScript(
  rawScript: string,
  targetSeconds: ScriptTimerTarget,
): ShortsScriptTiming {
  const raw = (rawScript ?? '').toString()
  const rawWords = countScriptWords(raw)
  const narration = parseUserScript(raw).narration
  const spokenWords = countScriptWords(narration)
  const ignoredWords = Math.max(0, rawWords - spokenWords)
  const fit = narrationFit(narration, targetSeconds)
  const minimumWords = Math.ceil(targetSeconds * MIN_COVERAGE * WORDS_PER_SECOND)
  const targetWords = Math.round(targetSeconds * WORDS_PER_SECOND)
  const excessWords = Math.max(0, spokenWords - targetWords)

  let status: ScriptTimerStatus = 'on_target'
  if (!raw.trim()) status = 'empty'
  else if (!narration.trim()) status = 'no_narration'
  else if (!fit.ok) status = 'short'
  else if (fit.speech > targetSeconds * 1.05) status = 'long'

  return {
    rawWords,
    spokenWords,
    ignoredWords,
    narration,
    estimatedSeconds: fit.speech,
    targetSeconds,
    coverage: fit.coverage,
    missingWords: fit.missingWords,
    excessWords,
    minimumWords,
    targetWords,
    status,
  }
}
