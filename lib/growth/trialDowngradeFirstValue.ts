export const TRIAL_DOWNGRADE_FIRST_VALUE_VERSION =
  'trial_downgrade_first_value_v1' as const

export const TRIAL_DOWNGRADE_FIRST_VALUE_HREF =
  `/studio/create?engine=fast&intent_campaign=${TRIAL_DOWNGRADE_FIRST_VALUE_VERSION}` as const

// KINEO-ENTRADA-SEEDANCE15-2026-09-29 (E2b, M4 do cético) — com a entrada nova (SEEDANCE_15S_PUBLIC; o chamador passa
// o interruptor) o primeiro valor é o Seedance 1.5 de 15 s, não o Kineo 1 (que some para conta nova). O link antigo
// continua sendo o de antes com o interruptor desligado. Sem import: o guardião executa este módulo cru.
export const TRIAL_DOWNGRADE_FIRST_VALUE_SHORT_HREF =
  `/studio/create?engine=seedance&duration=15&intent_campaign=${TRIAL_DOWNGRADE_FIRST_VALUE_VERSION}` as const

export function trialDowngradeFirstValueHref(entrada15: boolean): string {
  return entrada15 ? TRIAL_DOWNGRADE_FIRST_VALUE_SHORT_HREF : TRIAL_DOWNGRADE_FIRST_VALUE_HREF
}

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

export function trialDowngradeFirstValueClickMetadata(entrada15 = false) {
  return {
    version: TRIAL_DOWNGRADE_FIRST_VALUE_VERSION,
    journey_state: 'first_value',
    primary_action: 'make_first_film',
    destination: 'studio_create',
    engine: entrada15 ? 'seedance' : 'fast',
  } as const
}
