// KINEO-KLING4-TRIAL-2810: reserve before the paid call; uncertainty never replenishes the daily allowance.
import type { SupabaseClient } from '@supabase/supabase-js'

export const KLING4_TRIAL_COST_USD = 2.355
export const KLING4_TRIAL_DAILY_CAP_USD = 60
export type Kling4TrialEngineUsed = 'kling4' | 'seedance15_fallback' | 'seedance15_cap'
type Identity = { jobId: string; userId: string; country?: string | null }
// KINEO-K4-DEVOLUCAO-1111 — 'teto_24h' = a regra das 24 h DENTRO da reserva (migration 20261111_kling4_trial_release: 1 reserva
// por conta e por aparelho em 24 h, decidida depois das travas, fecha os 2 cliques no mesmo segundo). `release` acompanha a
// reserva aceita: o orquestrador a chama SÓ quando a fal recusa o envio com 4xx (nada cobrado) e os US$ 2,355 voltam ao dia.
export type Kling4TrialReservation =
  | { allowed: true; reservedUsd: number; release: () => Promise<boolean> }
  | { allowed: false; reason: 'cap' | 'duplicate' | 'unavailable' | 'teto_24h' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const validIdentity = (i: Identity) => UUID.test(i.userId) && typeof i.jobId === 'string' && i.jobId.trim().length > 0 && i.jobId.length <= 200
const country = (value: string | null | undefined) => typeof value === 'string' && /^[a-z]{2}$/iu.test(value) ? value.toUpperCase() : null

/** Only a NEW atomic reservation permits one Kling submission. Replays must use the existing claim or Seedance. */
export async function reserveKling4Trial(admin: SupabaseClient, i: Identity): Promise<Kling4TrialReservation> {
  if (!validIdentity(i)) return { allowed: false, reason: 'unavailable' }
  try {
    // KINEO-K4-DEVOLUCAO-1111 — a casa fica FORA da regra das 24 h (p_cap_24h=false); o resto chama com os 3 argumentos de
    // sempre (na função nova, p_cap_24h = true por padrão). Assim este código vale ANTES e DEPOIS da migration: antes dela, só a
    // casa perde o Kling 4 (parâmetro desconhecido → 'unavailable' → motor barato); ninguém de fora muda.
    const casa = await contaDaCasa(admin, i.userId)
    const r = await admin.rpc('reserve_kling4_trial', { p_job_id: i.jobId, p_user_id: i.userId, p_country: country(i.country), ...(casa ? { p_cap_24h: false } : {}) })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || !row) return { allowed: false, reason: 'unavailable' }
    if (row.code === 'ok' && row.reserved_milliusd === 2355) return { allowed: true, reservedUsd: KLING4_TRIAL_COST_USD, release: () => releaseKling4Trial(admin, i) }
    if (row.code === 'cap' || row.code === 'duplicate' || row.code === 'teto_24h') return { allowed: false, reason: row.code }
  } catch { /* A missing/unreachable ledger must never authorize a paid request. */ }
  return { allowed: false, reason: 'unavailable' }
}

/** KINEO-K4-DEVOLUCAO-1111 — a conta é da casa? Lê o e-mail AUTORITATIVO (auth, nunca profiles) e a lista exata da casa, por
 *  import dinâmico (o módulo continua sem import de execução no topo — o guardião do plano por seção o carrega sozinho).
 *  Qualquer falha = não é da casa (fica na regra das 24 h: o lado seguro). */
async function contaDaCasa(admin: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    const email = data?.user?.email ?? null
    if (!email) return false
    const { isInternalEmail } = await import('@/lib/internalAccounts')
    return isInternalEmail(email)
  } catch { return false }
}

/** KINEO-K4-DEVOLUCAO-1111 — devolve ao teto do DIA a reserva de um envio que a fal RECUSOU (4xx, nada cobrado). A linha da
 *  tentativa fica (a regra das 24 h continua contando). 'ok' e 'unchanged' = devolvida; qualquer outra coisa (inclusive a
 *  função ainda não existir no banco) = false, e a reserva só fica presa, como antes. Nunca lança. */
export async function releaseKling4Trial(admin: SupabaseClient, i: Identity): Promise<boolean> {
  if (!validIdentity(i)) return false
  try {
    const r = await admin.rpc('release_kling4_trial', { p_job_id: i.jobId, p_user_id: i.userId })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    return !r.error && (row?.code === 'ok' || row?.code === 'unchanged')
  } catch { return false }
}

/** One result/event per film; only the terminal async Kling-to-Seedance transition may correct its engine. */
export async function recordKling4TrialFilm(admin: SupabaseClient, i: Identity & { engineUsed: Kling4TrialEngineUsed; costUsd: number }): Promise<boolean> {
  if (!validIdentity(i) || !['kling4', 'seedance15_fallback', 'seedance15_cap'].includes(i.engineUsed)
      || ![0, KLING4_TRIAL_COST_USD].includes(i.costUsd)) return false
  try {
    const r = await admin.rpc('record_kling4_trial_film', {
      p_job_id: i.jobId, p_user_id: i.userId, p_country: country(i.country),
      p_engine_used: i.engineUsed, p_cost_milliusd: Math.round(i.costUsd * 1000),
    })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || (row?.code !== 'ok' && row?.code !== 'unchanged')) return false
    // A lambda may die after the fallback authority CAS and before correcting its initial Kling event.
    // Common birth/compose replays repair that one-way transition without changing cost or country.
    if (row.code === 'unchanged' && i.engineUsed === 'seedance15_fallback' && i.costUsd === KLING4_TRIAL_COST_USD) {
      const transitioned = await admin.rpc('transition_kling4_trial_fallback', { p_job_id: i.jobId, p_user_id: i.userId })
      const terminal = Array.isArray(transitioned.data) ? transitioned.data[0] : transitioned.data
      return !transitioned.error && (terminal?.code === 'ok' || terminal?.code === 'unchanged')
    }
    return true
  } catch { return false }
}
