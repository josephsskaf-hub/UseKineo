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
// cadastro), e o país do PEDIDO tem de ser CONHECIDO e da lista (paisDaListaConfirmado) e o mesmo da 1ª vez. NÃO É ANUNCIADA (item 4 da E4): nenhum
// texto público fala dela até funcionar em produção.
//
// Módulo PURO (sem env, sem banco): a rota /api/credits (recarga, lib/freeWeeklyFilmGrant.ts) e o cinematic
// (admissão) decidem aqui; scripts/test-e4-saida-b-cota-seedance-2026-09-29.mjs executa as mesmas funções.
import { creditCostForDuration } from './credits/engineCost'
import { paisDaListaConfirmado, REGION_PAID_ONLY_TRIAL_STATUS } from './freeFilmPolicy'

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
/** Nomes que carregam `metadata.country` da 1ª vez que a conta usou a cota (o país fica FIXO a partir dela). */
export const FREE_WEEKLY_FILM_COUNTRY_EVENTS: readonly string[] = [FREE_WEEKLY_FILM_GRANTED_EVENT, FREE_WEEKLY_FILM_ADMITTED_EVENT]

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
  // KINEO-E4-CONSERTO-2026-09-29 (achado 4): país CONHECIDO e na lista — 'XX'/'T1'/sem cabeçalho não passam.
  if (paisDaListaConfirmado(country ?? null) === null) return 'country'
  return 'eligible'
}

/**
 * KINEO-E4-CONSERTO-2026-09-29 (revisão de dinheiro, achado 4) — o país FICA: a 1ª recarga/admissão grava o país do
 * pedido no evento; as seguintes só valem do MESMO país. Conta antiga de fora da lista que entrou uma vez por VPN
 * precisa da VPN no mesmo país para sempre; alternar de rede não reabre nada. `firstRead` false = a leitura do país
 * fixado falhou → não concede (falha fechada: é crédito). Sem 1ª vez (firstCountry null) → este pedido fixa.
 */
export function freeWeeklyCountryMatches(input: { firstRead: boolean; firstCountry: string | null | undefined; country: string | null | undefined }): boolean {
  if (!input.firstRead) return false
  const atual = paisDaListaConfirmado(input.country ?? null)
  if (atual === null) return false
  const primeiro = typeof input.firstCountry === 'string' && input.firstCountry.trim() ? input.firstCountry.trim().toUpperCase() : null
  return primeiro === null || primeiro === atual
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

/**
 * KINEO-E4-CONSERTO-2026-09-29 (revisão de dinheiro, achado 5) — a TRAVA contra pedidos simultâneos. A contagem de
 * `videos` da admissão só enxerga filme que já terminou; dois Seedance de 15 s disparados juntos contavam 0 e passavam.
 * Por isso o cinematic repete a conferência DEPOIS de gravar o próprio claim assinado (o mesmo "inserir e depois
 * auditar" dos holds de crédito): outro render em voo aparece como hold (antes do débito) ou como débito não estornado
 * (depois). `otherActiveHold` = outro claim com crédito reservado; `weekCinematicDebits` = débitos `cinematic-*` não
 * estornados nos últimos 7 dias (null = leitura falhou → recusa). Falha do render estorna → a semana volta.
 */
export function freeWeeklyFilmExclusive(input: { otherActiveHold: boolean; weekCinematicDebits: number | null }): boolean {
  return input.otherActiveHold === false && input.weekCinematicDebits === 0
}
export const FREE_WEEKLY_FILM_EXCLUSIVE_REFUSED_EVENT = 'free_weekly_film_exclusive_refused'
/** Recusa da trava (só chega a quem a cota admitiu): nada cobrado, onde seguir. Sem prometer data de volta. */
export const FREE_WEEKLY_FILM_IN_USE_MESSAGE =
  'Your free film for this week is already in progress or done. Nothing was charged — see the plans to keep creating.'
