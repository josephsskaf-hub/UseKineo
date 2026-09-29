export const TRIAL_DOWNGRADE_FIRST_VALUE_VERSION =
  'trial_downgrade_first_value_v1' as const

export const TRIAL_DOWNGRADE_FIRST_VALUE_HREF =
  `/studio/create?engine=fast&intent_campaign=${TRIAL_DOWNGRADE_FIRST_VALUE_VERSION}` as const

// KINEO-ENTRADA-SEEDANCE15-2026-09-29 (revisão da E2b, M4 do cético) — o modal só abre para trial VENCIDO sem
// pagamento. Com a entrada nova (SEEDANCE_15S_PUBLIC; o chamador passa o interruptor) NÃO existe "primeiro filme" para
// oferecer a essa conta: o Seedance de 15 s é recusado pela rota do cinematic a quem não paga e não está em trial ativo
// (motivo trial_ended) e o saldo não gasto do trial foi estornado no downgrade; o Kineo 1 (o destino antigo, grátis
// pela cota) some para conta nova — o Studio troca ?engine=fast pelo Seedance. O botão "Make your first film" levava
// a uma recusa. Então, com a entrada nova, o modal volta ao caminho do plano (texto honesto de conta sem filme); sem
// ela, tudo como antes. Sem import: o guardião executa este módulo cru.
export function trialDowngradeOffersFirstFilm(entrada15: boolean): boolean {
  return entrada15 !== true
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

export function trialDowngradeFirstValueClickMetadata() {
  return {
    version: TRIAL_DOWNGRADE_FIRST_VALUE_VERSION,
    journey_state: 'first_value',
    primary_action: 'make_first_film',
    destination: 'studio_create',
    engine: 'fast',
  } as const
}
