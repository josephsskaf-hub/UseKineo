import { creditCostForDuration } from '@/lib/credits/engineCost'

export const TRIAL_BALANCE_BRIDGE_VERSION = 'trial_balance_seedance_35s_v2' as const
export const TRIAL_FIRST_DELIVERY_VERSION = 'trial_first_seedance_35s_v2' as const
export const TRIAL_BALANCE_BRIDGE_ENGINE = 'cinematic_ai' as const
export const TRIAL_BALANCE_BRIDGE_ENGINE_LABEL = 'Seedance' as const
export const TRIAL_BALANCE_BRIDGE_DURATION = 35 as const
export const TRIAL_FIRST_DELIVERY_DURATION = 35 as const
export const TRIAL_FIRST_FAST_REPEAT_DURATION = 60 as const
export const TRIAL_BALANCE_BRIDGE_COST = creditCostForDuration(
  TRIAL_BALANCE_BRIDGE_ENGINE,
  true,
  TRIAL_BALANCE_BRIDGE_DURATION,
)
export const FULL_SEEDANCE_COST = creditCostForDuration('cinematic_ai', true, 60)
export const TRIAL_FIRST_DELIVERY_COST = creditCostForDuration(
  TRIAL_BALANCE_BRIDGE_ENGINE,
  true,
  TRIAL_FIRST_DELIVERY_DURATION,
)
export const TRIAL_FIRST_FAST_REPEAT_COST = creditCostForDuration(
  'fast',
  true,
  TRIAL_FIRST_FAST_REPEAT_DURATION,
)
export type TrialFirstDeliveryStudioIntentInput = {
  intentCampaign: string
  engine: string
}

/**
 * Converts the reviewed Studio submit into the explicit trial_best contract.
 *
 * The banner click itself remains non-spending: it only opens the Studio with
 * an editable idea. The contract is attached later, when the person presses
 * Generate with Seedance still selected. A manual engine change must win, so
 * every other engine returns null and follows the ordinary Studio path.
 */
export function trialFirstDeliveryStudioIntent(
  input: TrialFirstDeliveryStudioIntentInput,
): 'trial_best' | null {
  return input.intentCampaign === TRIAL_FIRST_DELIVERY_VERSION && input.engine === 'seedance'
    ? 'trial_best'
    : null
}


export type TrialFirstDeliveryInput = {
  trialPhase: 'active' | 'ending' | null
  credits: number | null
  creditsUsed: number | null
}

export type TrialFirstDeliveryDecision = {
  eligible: boolean
  reason: 'eligible' | 'not_active' | 'unknown_usage' | 'already_used' | 'unknown_balance' | 'insufficient_balance'
  creditsBefore: number | null
  creditsAfterSuccess: number | null
  cost: number
  fastRepeatCost: number
  fastRepeatDuration: typeof TRIAL_FIRST_FAST_REPEAT_DURATION
  fastRepeatsAfterSuccess: number
  duration: typeof TRIAL_FIRST_DELIVERY_DURATION
  engine: typeof TRIAL_BALANCE_BRIDGE_ENGINE
  engineLabel: typeof TRIAL_BALANCE_BRIDGE_ENGINE_LABEL
  version: typeof TRIAL_FIRST_DELIVERY_VERSION
}

/**
 * Keeps a brand-new trial user in the value loop before asking for a card.
 *
 * Production evidence on 30/08/2026: the fresh external signup cohort repeated
 * after shorter Seedance deliveries, while the full 60-second/25-credit first
 * delivery produced no repeat. The decision therefore recommends a 35-second
 * premium first episode and preserves enough of the canonical 25-credit grant
 * for two 60-second Fast repetitions. Full 60-second Seedance remains available
 * as a manual choice in Studio.
 * It only prepares the existing Seedance setup route: no render, provider call,
 * credit mutation, price change or checkout is allowed here.
 */
export function decideTrialFirstDelivery(input: TrialFirstDeliveryInput): TrialFirstDeliveryDecision {
  const base = {
    creditsBefore: input.credits,
    creditsAfterSuccess: null,
    cost: TRIAL_FIRST_DELIVERY_COST,
    fastRepeatCost: TRIAL_FIRST_FAST_REPEAT_COST,
    fastRepeatDuration: TRIAL_FIRST_FAST_REPEAT_DURATION,
    fastRepeatsAfterSuccess: 0,
    duration: TRIAL_FIRST_DELIVERY_DURATION,
    engine: TRIAL_BALANCE_BRIDGE_ENGINE,
    engineLabel: TRIAL_BALANCE_BRIDGE_ENGINE_LABEL,
    version: TRIAL_FIRST_DELIVERY_VERSION,
  } as const

  if (input.trialPhase !== 'active') return { ...base, eligible: false, reason: 'not_active' }
  if (input.creditsUsed === null || !Number.isFinite(input.creditsUsed)) {
    return { ...base, eligible: false, reason: 'unknown_usage' }
  }
  if (input.creditsUsed > 0) return { ...base, eligible: false, reason: 'already_used' }
  if (input.credits === null || !Number.isFinite(input.credits)) {
    return { ...base, eligible: false, reason: 'unknown_balance' }
  }
  if (input.credits < TRIAL_FIRST_DELIVERY_COST) {
    return { ...base, eligible: false, reason: 'insufficient_balance' }
  }

  return {
    ...base,
    eligible: true,
    reason: 'eligible',
    creditsAfterSuccess: input.credits - TRIAL_FIRST_DELIVERY_COST,
    fastRepeatsAfterSuccess: Math.floor(
      (input.credits - TRIAL_FIRST_DELIVERY_COST) / TRIAL_FIRST_FAST_REPEAT_COST,
    ),
  }
}

export type TrialBalanceBridgeInput = {
  trialPhase: 'active' | 'ending' | null
  credits: number | null
  deliveredQuality: string | null | undefined
}

export type TrialBalanceBridgeDecision = {
  eligible: boolean
  reason: 'eligible' | 'not_active' | 'not_fast' | 'unknown_balance' | 'too_few_credits' | 'full_seedance_already_fits'
  creditsBefore: number | null
  creditsAfterSuccess: number | null
  cost: number
  duration: typeof TRIAL_BALANCE_BRIDGE_DURATION
  engine: typeof TRIAL_BALANCE_BRIDGE_ENGINE
  engineLabel: typeof TRIAL_BALANCE_BRIDGE_ENGINE_LABEL
  version: typeof TRIAL_BALANCE_BRIDGE_VERSION
}

export type TrialReturnLadderInput = {
  trialPhase: 'active' | 'ending' | null
  credits: number | null
}

export type TrialReturnLadderDecision = Omit<TrialBalanceBridgeDecision, 'reason'> & {
  reason: 'eligible' | 'not_active' | 'unknown_balance' | 'too_few_credits' | 'full_seedance_already_fits'
}

/**
 * Turns the measured 20–21 credit post-Fast remainder into one supported
 * 35-second Seedance experience. The bridge never grants credits or starts a
 * render: it only prepares a choice the current balance already covers.
 */
export function decideTrialBalanceBridge(input: TrialBalanceBridgeInput): TrialBalanceBridgeDecision {
  const base = {
    creditsBefore: input.credits,
    creditsAfterSuccess: null,
    cost: TRIAL_BALANCE_BRIDGE_COST,
    duration: TRIAL_BALANCE_BRIDGE_DURATION,
    engine: TRIAL_BALANCE_BRIDGE_ENGINE,
    engineLabel: TRIAL_BALANCE_BRIDGE_ENGINE_LABEL,
    version: TRIAL_BALANCE_BRIDGE_VERSION,
  } as const

  if (input.trialPhase !== 'active') return { ...base, eligible: false, reason: 'not_active' }
  if (input.deliveredQuality !== 'fast') return { ...base, eligible: false, reason: 'not_fast' }
  if (input.credits === null || !Number.isFinite(input.credits)) {
    return { ...base, eligible: false, reason: 'unknown_balance' }
  }
  if (input.credits < TRIAL_BALANCE_BRIDGE_COST) {
    return { ...base, eligible: false, reason: 'too_few_credits' }
  }
  if (input.credits >= FULL_SEEDANCE_COST) {
    return { ...base, eligible: false, reason: 'full_seedance_already_fits' }
  }

  return {
    ...base,
    eligible: true,
    reason: 'eligible',
    creditsAfterSuccess: input.credits - TRIAL_BALANCE_BRIDGE_COST,
  }
}

/**
 * Re-exposes the same safe 35-second Seedance step after the user leaves the
 * result screen. Unlike the result-only bridge, this decision cannot prove the
 * last delivered engine, so it is governed only by active-trial truth and the
 * current server balance. It never grants, reserves or spends credits.
 */
export function decideTrialReturnLadder(input: TrialReturnLadderInput): TrialReturnLadderDecision {
  const base = {
    creditsBefore: input.credits,
    creditsAfterSuccess: null,
    cost: TRIAL_BALANCE_BRIDGE_COST,
    duration: TRIAL_BALANCE_BRIDGE_DURATION,
    engine: TRIAL_BALANCE_BRIDGE_ENGINE,
    engineLabel: TRIAL_BALANCE_BRIDGE_ENGINE_LABEL,
    version: TRIAL_BALANCE_BRIDGE_VERSION,
  } as const

  if (input.trialPhase !== 'active') return { ...base, eligible: false, reason: 'not_active' }
  if (input.credits === null || !Number.isFinite(input.credits)) {
    return { ...base, eligible: false, reason: 'unknown_balance' }
  }
  if (input.credits < TRIAL_BALANCE_BRIDGE_COST) {
    return { ...base, eligible: false, reason: 'too_few_credits' }
  }
  if (input.credits >= FULL_SEEDANCE_COST) {
    return { ...base, eligible: false, reason: 'full_seedance_already_fits' }
  }

  return {
    ...base,
    eligible: true,
    reason: 'eligible',
    creditsAfterSuccess: input.credits - TRIAL_BALANCE_BRIDGE_COST,
  }
}
