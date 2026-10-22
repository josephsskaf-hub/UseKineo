// KINEO-ADS-CENA-95-2110 — unidades observadas e lacunas; nunca chamar reserva/tempo de rede de fatura.
import type { Cena95State } from './pipeline95'
export function cena95UsageObservation(s: Cena95State) {
  const done = s.jobs.filter(j => j.status === 'done')
  return {
    actualTotalUsd: null, invoicedUsd: null, basis: 'observed_units_with_unconfirmed_account_tariffs',
    completedKeyframes: done.filter(j => j.kind === 'image').length,
    completedPeopleRequestedSeconds: done.filter(j => j.kind === 'video' && j.family !== 'close').reduce((n, j) => n + j.seconds, 0),
    completedCloseRequestedSeconds: done.filter(j => j.family === 'close').reduce((n, j) => n + j.seconds, 0),
    planning: s.plan.quality95.planningUsage, judge: s.videoTokens,
    voiceSeconds: s.voiceSeconds ?? null, music: s.musicState ?? 'not_attempted',
    pendingOrUnknownModelIntents: s.jobs.filter(j => j.status === 'submitting' || j.status === 'pending').length,
    frameExtractionComputeSeconds: null, creatomateActualCredits: null,
    missing: ['account_tariffs_and_invoice', 'provider_compute_usage', 'actual_creatomate_credits', ...(s.plan.quality95.planningUsage.calls !== s.plan.quality95.planningUsage.measuredCalls ? ['planning_usage'] : []), ...(s.jobs.some(j => j.status === 'submitting') ? ['ambiguous_model_intent'] : [])],
  }
}
