import { creditCostForDuration } from '@/lib/credits/engineCost'
import { SUPPORTED_DURATIONS } from '@/lib/expandPolicy'

export const TRIAL_REPEAT_BEFORE_CHECKOUT_VERSION = 'trial_repeat_before_checkout_v1' as const
export const TRIAL_REPEAT_ENGINE = 'fast' as const

export type TrialRepeatBeforeCheckoutInput = {
  trialPhase: 'active' | 'ending' | null
  credits: number | null
  bridgeEligible: boolean
  preferredDuration: number
}

export type TrialRepeatBeforeCheckoutDecision = {
  action: 'episode' | 'subscription' | 'bridge'
  reason: 'eligible' | 'bridge_first' | 'not_active' | 'unknown_balance' | 'insufficient_balance'
  creditsBefore: number | null
  creditsAfterSuccess: number | null
  cost: number | null
  duration: (typeof SUPPORTED_DURATIONS)[number] | null
  engine: typeof TRIAL_REPEAT_ENGINE
  version: typeof TRIAL_REPEAT_BEFORE_CHECKOUT_VERSION
}

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
