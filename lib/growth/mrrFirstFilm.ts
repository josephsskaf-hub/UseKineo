import { creditCostForDuration } from '@/lib/credits/engineCost'
import { SEEDANCE_SHORT_SECONDS } from '@/lib/durationByEngine'

export const MRR_FIRST_FILM_ENABLED = true
export const MRR_FIRST_FILM_VERSION = 'mrr_first_film_20261001_v1'
export const FIRST_FILM_TOPIC = 'A tiny paper boat travels through a rain-soaked city and reaches the sea at sunrise. Tell this fictional story with a beginning, a surprise and a hopeful ending.'

export type FirstFilmFacts = {
  historyEmpty: boolean
  trialActive: boolean | null
  hasPaid: boolean | null
  shortFilmAllowed: boolean
  balance: number | null
}

export function firstFilmOffer(f: FirstFilmFacts) {
  const seconds = SEEDANCE_SHORT_SECONDS
  const cost = creditCostForDuration('cinematic_ai', true, seconds)
  if (!f.historyEmpty || f.trialActive !== true || f.hasPaid !== false || !f.shortFilmAllowed
    || f.balance === null || !Number.isFinite(f.balance) || !Number.isFinite(cost) || cost <= 0 || f.balance < cost) return null
  return { seconds, cost }
}

/** Called only by an explicit Generate button, never by a mount effect or an ordinary link. */
export function firstFilmGenerateHref() {
  const q = new URLSearchParams({ engine: 'seedance', duration: String(SEEDANCE_SHORT_SECONDS),
    prompt: FIRST_FILM_TOPIC, script_mode: 'ai', create_intent: 'trial_best', intent_campaign: MRR_FIRST_FILM_VERSION })
  return `/studio/create?${q}`
}
