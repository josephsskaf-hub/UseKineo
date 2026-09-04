export const TRIAL_DOWNGRADE_FIRST_VALUE_VERSION =
  'trial_downgrade_first_value_v1' as const

export const TRIAL_DOWNGRADE_FIRST_VALUE_HREF =
  `/studio/create?engine=fast&intent_campaign=${TRIAL_DOWNGRADE_FIRST_VALUE_VERSION}` as const

export type TrialDowngradeJourneyState =
  | 'first_value'
  | 'delivered'
  | 'unknown'

/**
 * Paying before delivery remains a valid choice. We only reverse the primary
 * action when the owner's completed-film count is exact and equal to zero.
 * Any degraded or malformed history preserves the existing paid-first modal.
 */
export function resolveTrialDowngradeJourney(input: {
  historyReliable?: boolean
  completedCount?: number | null
} | null | undefined): TrialDowngradeJourneyState {
  if (input?.historyReliable !== true) return 'unknown'
  if (!Number.isInteger(input.completedCount) || Number(input.completedCount) < 0) {
    return 'unknown'
  }
  return Number(input.completedCount) === 0 ? 'first_value' : 'delivered'
}

export function trialDowngradeFirstValueClickMetadata() {
  return {
    version: TRIAL_DOWNGRADE_FIRST_VALUE_VERSION,
    journey_state: 'first_value',
    primary_action: 'make_first_film',
    destination: 'studio_create',
    engine: 'fast',
  } as const
}
