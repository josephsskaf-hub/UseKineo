import type { CreationIntent } from '@/lib/creationHandoff'

export type ActivationRenderEngine = 'fast' | 'seedance'
type ActivationMode = 'fast' | 'cinematic_ai' | string

/**
 * Resolves the engine behind an explicit public creation handoff.
 *
 * `trial_best` is deliberately conditional: it may spend the full trial only
 * when the server-confirmed trial entitlement is active and the balance can
 * cover the canonical Seedance cost. Every uncertain or ineligible state
 * falls back to Fast, so this growth rail cannot manufacture a 402.
 */
export function resolveActivationRenderEngine(input: {
  createIntent: CreationIntent
  trialActive: boolean
  credits: number | null
  seedanceCreditCost: number
}): ActivationRenderEngine {
  if (
    input.createIntent === 'trial_best' &&
    input.trialActive === true &&
    typeof input.credits === 'number' &&
    Number.isFinite(input.credits) &&
    input.credits >= input.seedanceCreditCost
  ) {
    return 'seedance'
  }
  return 'fast'
}

/** One readiness predicate governs both the pre-analysis and pre-dispatch gates. */
export function activationRenderEngineIsReady(input: {
  engine: ActivationRenderEngine | null
  mode: ActivationMode
  aiEngine: string
}): boolean {
  if (input.engine === 'seedance') {
    return input.mode === 'cinematic_ai' && input.aiEngine === 'seedance'
  }
  return input.engine === 'fast' && input.mode === 'fast'
}
