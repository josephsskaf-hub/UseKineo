import { creditCostForDuration } from '@/lib/credits/engineCost'

export const TRIAL_BALANCE_BRIDGE_VERSION = 'trial_balance_seedance_35s_v2' as const
export const TRIAL_BALANCE_BRIDGE_ENGINE = 'cinematic_ai' as const
export const TRIAL_BALANCE_BRIDGE_ENGINE_LABEL = 'Seedance' as const
export const TRIAL_BALANCE_BRIDGE_DURATION = 35 as const
export const TRIAL_BALANCE_BRIDGE_COST = creditCostForDuration(
  TRIAL_BALANCE_BRIDGE_ENGINE,
  true,
  TRIAL_BALANCE_BRIDGE_DURATION,
)
export const FULL_SEEDANCE_COST = creditCostForDuration('cinematic_ai', true, 60)

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
