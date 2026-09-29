import { creditCostForDuration } from '@/lib/credits/engineCost'
import { SUPPORTED_DURATIONS } from '@/lib/expandPolicy'

export const TRIAL_REPEAT_BEFORE_CHECKOUT_VERSION = 'trial_repeat_before_checkout_v1' as const
export const TRIAL_REPEAT_ENGINE = 'fast' as const

export type TrialRepeatBeforeCheckoutInput = {
  trialPhase: 'active' | 'ending' | null
  credits: number | null
  bridgeEligible: boolean
  preferredDuration: number
  /**
   * KINEO-ENTRADA-SEEDANCE15-2026-09-29 (E2b) — com a entrada nova ligada para a conta (flag seedance15) e sem Kineo 1
   * (flag kineo1 !== true), o "repita antes de pagar" é o Seedance 1.5 de `shortFilm.seconds` (15), no custo que o
   * servidor cobra. Ausente = como antes (Kineo 1).
   */
  shortFilm?: { seconds: number } | null
}

export type TrialRepeatBeforeCheckoutDecision = {
  action: 'episode' | 'subscription' | 'bridge'
  reason: 'eligible' | 'bridge_first' | 'not_active' | 'unknown_balance' | 'insufficient_balance'
  creditsBefore: number | null
  creditsAfterSuccess: number | null
  cost: number | null
  duration: (typeof SUPPORTED_DURATIONS)[number] | number | null
  engine: typeof TRIAL_REPEAT_ENGINE | typeof TRIAL_REPEAT_SHORT_ENGINE
  version: typeof TRIAL_REPEAT_BEFORE_CHECKOUT_VERSION
}

/** KINEO-ENTRADA-SEEDANCE15 — o motor do "repita" da entrada nova (quality do cobrador; a tela usa 'seedance'). */
export const TRIAL_REPEAT_SHORT_ENGINE = 'cinematic_ai' as const

/**
 * Uses already-owned trial balance to earn another successful creation before
 * asking for a subscription. The policy never grants, reserves or spends a
 * credit and never calls a provider. `true` is intentional: an active trial is
 * billed like a paid account by /api/compose, so Fast must use the same 5cr/60s
 * table the submit button and server use.
 */
export function decideTrialRepeatBeforeCheckout(
  input: TrialRepeatBeforeCheckoutInput,
): TrialRepeatBeforeCheckoutDecision {
  const base = {
    creditsBefore: input.credits,
    creditsAfterSuccess: null,
    cost: null,
    duration: null,
    engine: TRIAL_REPEAT_ENGINE,
    version: TRIAL_REPEAT_BEFORE_CHECKOUT_VERSION,
  } as const

  if (input.bridgeEligible) return { ...base, action: 'bridge', reason: 'bridge_first' }
  if (input.trialPhase !== 'active') return { ...base, action: 'subscription', reason: 'not_active' }
  if (input.credits === null || !Number.isFinite(input.credits) || input.credits < 0) {
    return { ...base, action: 'subscription', reason: 'unknown_balance' }
  }

  // KINEO-ENTRADA-SEEDANCE15-2026-09-29 — conta nova sem Kineo 1: o episódio que o saldo paga é o Seedance curto.
  if (input.shortFilm && Number.isFinite(input.shortFilm.seconds) && input.shortFilm.seconds > 0) {
    const seconds = input.shortFilm.seconds
    const shortCost = creditCostForDuration(TRIAL_REPEAT_SHORT_ENGINE, true, seconds)
    const shortBase = { ...base, engine: TRIAL_REPEAT_SHORT_ENGINE }
    if (!(shortCost > 0) || shortCost > input.credits) {
      return { ...shortBase, action: 'subscription', reason: 'insufficient_balance' }
    }
    return {
      ...shortBase,
      action: 'episode',
      reason: 'eligible',
      duration: seconds,
      cost: shortCost,
      creditsAfterSuccess: input.credits - shortCost,
    }
  }

  const preferred = Number.isFinite(input.preferredDuration) && input.preferredDuration > 0
    ? input.preferredDuration
    : Math.max(...SUPPORTED_DURATIONS)
  const affordable = [...SUPPORTED_DURATIONS]
    .filter((seconds) => seconds <= preferred)
    .filter((seconds) => creditCostForDuration(TRIAL_REPEAT_ENGINE, true, seconds) <= input.credits!)
    .sort((a, b) => b - a)[0]

  if (affordable === undefined) {
    return { ...base, action: 'subscription', reason: 'insufficient_balance' }
  }

  const cost = creditCostForDuration(TRIAL_REPEAT_ENGINE, true, affordable)
  return {
    ...base,
    action: 'episode',
    reason: 'eligible',
    duration: affordable,
    cost,
    creditsAfterSuccess: input.credits - cost,
  }
}
