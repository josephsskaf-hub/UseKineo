// KINEO-E4-SAIDA-B-2026-09-29 — COTA GRÁTIS SEMANAL NOVA: 1 filme Seedance 1.5 de 15 s por semana, com marca d'água,
// SÓ para conta grátis (nunca pagou) de país da lista (lib/freeFilmPolicy.ts). Decisão do fundador (29/09, item b):
// "a cota fica, mas vira 1 Seedance 15 s por semana, só país rico". Substitui a cota de Kineo 1 (limit 0 na E4).
//
// O MECANISMO ESCOLHIDO (e por que não o outro):
//   (1) RECARGA SEMANAL DE CRÉDITO ATÉ O CUSTO DE UM FILME, SEM ACUMULAR — `topUp = max(0, 7 − saldo)`, no máximo
//       uma recarga por 7 dias (evento FREE_WEEKLY_FILM_GRANTED_EVENT é o carimbo), com UPDATE condicional ao saldo
//       lido (compare-and-set: duas abas ao mesmo tempo não somam). O saldo que a recarga produz NUNCA passa de 7:
//       quem não usou na semana não junta 14. Gravada (profiles.video_credits) e com evento de servidor.
//   (2) ADMISSÃO SEMANAL NO CINEMATIC — conta grátis sem trial toma 402 no /api/generate-video-cinematic
//       (`!isPaidUser && !trialActive`); crédito sozinho não abre o Seedance. A admissão é ESTREITA: só
//       quality 'cinematic_ai' (Seedance 1.5), só 15 s, só conta elegível abaixo, só se não houver filme Seedance
//       dessa conta nos últimos 7 dias. O débito é o de sempre (7 cr, estorno de sempre em falha), então o ledger, o
//       claim assinado, o compose (REVERSE_TRIAL_ENABLED && cinematicUpstreamDebited) e a marca d'água
//       (isFreePlanCinematic) seguem o caminho já provado do trial. Motor Studio (Kling/Veo/Hollywood) continua pago.
//   Descartado: "permissão que não debita" — um render de custo 0 atravessa claim/ledger/compose por um ramo que nunca
//   foi exercitado ("ledger zerado em filme entregue"), e a trava 8.2 cresceria muito mais.
//
// NÃO DÁ KINEO 1: o Kineo 1 de conta grátis é recusado pelo portão (lib/kineo1Gate.ts) antes de qualquer fornecedor,
// com crédito ou sem. NÃO VAZA PARA PAÍS FORA DA LISTA: 'region_paid_only' é inelegível para sempre (marca de
// cadastro), e o país do PEDIDO também tem de passar filmeGratisPermitido. NÃO É ANUNCIADA (item 4 da E4): nenhum
// texto público fala dela até funcionar em produção.
//
// Módulo PURO (sem env, sem banco): a rota /api/credits (recarga, lib/freeWeeklyFilmGrant.ts) e o cinematic
// (admissão) decidem aqui; scripts/test-e4-saida-b-cota-seedance-2026-09-29.mjs executa as mesmas funções.
import { creditCostForDuration } from './credits/engineCost'
import { filmeGratisPermitido, REGION_PAID_ONLY_TRIAL_STATUS } from './freeFilmPolicy'

export const FREE_WEEKLY_FILM_ENABLED = true
export const FREE_WEEKLY_FILM_QUALITY = 'cinematic_ai' as const
export const FREE_WEEKLY_FILM_SECONDS = 15
/** 7 cr hoje — a MESMA função que o cinematic cobra; nunca digitado. */
export const FREE_WEEKLY_FILM_CREDITS = creditCostForDuration(FREE_WEEKLY_FILM_QUALITY, true, FREE_WEEKLY_FILM_SECONDS)
export const FREE_WEEKLY_FILM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
/** Conta sem decisão de trial (trial_status NULL) só entra depois disto — não corre contra o grant do cadastro. */
export const FREE_WEEKLY_FILM_MIN_ACCOUNT_AGE_MS = 48 * 60 * 60 * 1000
export const FREE_WEEKLY_FILM_GRANTED_EVENT = 'free_weekly_film_granted'
export const FREE_WEEKLY_FILM_ADMITTED_EVENT = 'free_weekly_film_admitted'

/** Planos pagos + Autopilot: nunca são "conta grátis" (espelho das listas do compose/cinematic e do Autopilot). */
const NON_FREE_PLANS: ReadonlySet<string> = new Set([
  'starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'creator', 'creator_trial',
  'studio', 'studio_trial', 'autopilot', 'autopilot_trial', 'autopilot_pilot', 'autopilot_lite',
])
/** trial_status que PODEM receber a cota. Tudo o mais (active, blocked, region_paid_only, card_required, desconhecido) não. */
const ELIGIBLE_TRIAL_STATUSES: ReadonlySet<string> = new Set(['downgraded', 'expired'])

export type FreeWeeklyFilmReason =
  | 'eligible'
  | 'disabled'
  | 'paid'
  | 'region_paid_only'
  | 'trial_status'
  | 'too_new'
  | 'country'

export interface FreeWeeklyFilmProfile {
  plan?: string | null
  has_paid?: boolean | null
  trial_status?: string | null
  created_at?: string | null
}

/** A conta pode ter a cota semanal? `country` = país do PEDIDO (x-vercel-ip-country), não o do cadastro. */
export function freeWeeklyFilmEligibility(
  profile: FreeWeeklyFilmProfile | null | undefined,
  country: string | null | undefined,
  now: number = Date.now(),
): FreeWeeklyFilmReason {
  if (!FREE_WEEKLY_FILM_ENABLED) return 'disabled'
  if (!profile) return 'trial_status'
  if (profile.has_paid === true) return 'paid'
  const plan = typeof profile.plan === 'string' ? profile.plan.trim().toLowerCase() : ''
  if (plan !== '' && plan !== 'free') return NON_FREE_PLANS.has(plan) ? 'paid' : 'trial_status'
  const status = profile.trial_status ?? null
  if (status === REGION_PAID_ONLY_TRIAL_STATUS) return 'region_paid_only'
  if (status === null) {
    const created = typeof profile.created_at === 'string' ? Date.parse(profile.created_at) : NaN
    if (!Number.isFinite(created) || now - created < FREE_WEEKLY_FILM_MIN_ACCOUNT_AGE_MS) return 'too_new'
  } else if (!ELIGIBLE_TRIAL_STATUSES.has(status)) {
    return 'trial_status'
  }
  if (!filmeGratisPermitido(country ?? null)) return 'country'
  return 'eligible'
}

/** Quanto a recarga soma: completa até o custo de UM filme, nunca além (saldo ≥ 7 → 0). */
export function freeWeeklyTopUp(balance: number | null | undefined): number {
  const b = Math.max(0, Math.floor(Number(balance ?? 0) || 0))
  return Math.max(0, FREE_WEEKLY_FILM_CREDITS - b)
}

/**
 * A admissão semanal no cinematic: Seedance 1.5, 15 s, conta elegível e nenhum filme Seedance (não falho) dela nos
 * últimos 7 dias. `recentSeedanceFilms` null = não consegui contar → NÃO admite (falha fechada: é dinheiro).
 */
export function freeWeeklyFilmAdmissible(input: {
  quality: string
  durationSeconds: number
  eligibility: FreeWeeklyFilmReason
  recentSeedanceFilms: number | null
}): boolean {
  return (
    input.quality === FREE_WEEKLY_FILM_QUALITY &&
    input.durationSeconds === FREE_WEEKLY_FILM_SECONDS &&
    input.eligibility === 'eligible' &&
    input.recentSeedanceFilms === 0
  )
}
