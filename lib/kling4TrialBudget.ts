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
  | { allowed: false; reason: 'cap' | 'duplicate' | 'unavailable' | 'teto_24h' | 'chave_reserva' /* KINEO-TOMADA-DO-MOTOR-2511 */ }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const validIdentity = (i: Identity) => UUID.test(i.userId) && typeof i.jobId === 'string' && i.jobId.trim().length > 0 && i.jobId.length <= 200
// KINEO-K4-TETO-FILME-LONGO-1711 — o razão do teto diário conta o preço do clipe: 15 s = 2355 milésimos (hoje); 16 a 20 s = 0,157/s
// (2512 a 3140). A migration 20261117180000 aceita reserva entre 2355 e 3140. A voz é medida ANTES da reserva (na rota), então a reserva
// é o preço exato do clipe; o acerto (record_kling4_trial_film) grava esse mesmo valor como custo.
export const KLING4_TRIAL_MAX_RESERVE_MILLIUSD = 3140
/** 0,157 US$/s em milésimos (o mesmo KLING4_TRIAL_USD_PER_SECOND de lib/kling4TrialPolicy; sem import: os guardiões carregam este módulo sozinho). */
export const KLING4_TRIAL_MILLIUSD_PER_SECOND = 157
/** Milésimos de US$ que o filme ocupa no teto do dia; null = clipe fora da faixa (sem reserva → motor barato). Sem clipe ou 15 = 2355. */
export function kling4TrialReserveMilliusd(clipSeconds?: number | null): number | null {
  if (clipSeconds === undefined || clipSeconds === null || clipSeconds === 15) return 2355
  if (!Number.isInteger(clipSeconds) || clipSeconds < 15) return null
  const m = clipSeconds * KLING4_TRIAL_MILLIUSD_PER_SECOND
  return m >= 2355 && m <= KLING4_TRIAL_MAX_RESERVE_MILLIUSD ? m : null
}
const country = (value: string | null | undefined) => typeof value === 'string' && /^[a-z]{2}$/iu.test(value) ? value.toUpperCase() : null

/** Only a NEW atomic reservation permits one Kling submission. Replays must use the existing claim or Seedance. */
export async function reserveKling4Trial(admin: SupabaseClient, i: Identity & { clipSeconds?: number | null }): Promise<Kling4TrialReservation> {
  if (!validIdentity(i)) return { allowed: false, reason: 'unavailable' }
  const reserva = kling4TrialReserveMilliusd(i.clipSeconds) // KINEO-K4-TETO-FILME-LONGO-1711
  // KINEO-TOMADA-DO-MOTOR-2511 [CEO 25/11 16:25] a chave 'reserva' (sem deploy): o Kling 4 grátis nem reserva e o filme vai à reserva de hoje (o mesmo caminho
  // de 'unavailable', com o motivo próprio no marcador). Sem a chave, tabela ausente ou erro = o código. Import dinâmico: este módulo segue sem import no topo.
  try { const { motorDoFilmeGratis2511 } = await import('@/lib/cinematic/chaveDoMotor2511'); if ((await motorDoFilmeGratis2511(admin)) === 'reserva') return { allowed: false, reason: 'chave_reserva' } } catch { /* o código */ }
  if (reserva === null) return { allowed: false, reason: 'unavailable' }
  try {
    // KINEO-K4-DEVOLUCAO-1111 — a casa fica FORA da regra das 24 h (p_cap_24h=false); o resto chama com os 3 argumentos de
    // sempre (na função nova, p_cap_24h = true por padrão). Assim este código vale ANTES e DEPOIS da migration: antes dela, só a
    // casa perde o Kling 4 (parâmetro desconhecido → 'unavailable' → motor barato); ninguém de fora muda.
    const casa = await contaDaCasa(admin, i.userId)
    // KINEO-K4-TETO-FILME-LONGO-1711 — clipe de 15 s: os mesmos argumentos de hoje (vale antes e depois da migration). Clipe maior:
    // + p_reserve_milliusd; antes da migration o parâmetro é desconhecido → 'unavailable' → motor barato, nunca gasto sem reserva.
    const r = await admin.rpc('reserve_kling4_trial', { p_job_id: i.jobId, p_user_id: i.userId, p_country: country(i.country), ...(casa ? { p_cap_24h: false } : {}), ...(reserva !== 2355 ? { p_reserve_milliusd: reserva } : {}) })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || !row) return { allowed: false, reason: 'unavailable' }
    if (row.code === 'ok' && row.reserved_milliusd === reserva) return { allowed: true, reservedUsd: reserva / 1000, release: () => releaseKling4Trial(admin, i) }
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
    const { contaDaCasaExata } = await import('@/lib/internalAccounts')
    return contaDaCasaExata(email)
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
      || !(i.costUsd === 0 || (i.costUsd >= KLING4_TRIAL_COST_USD && i.costUsd <= KLING4_TRIAL_MAX_RESERVE_MILLIUSD / 1000))) return false // KINEO-K4-TETO-FILME-LONGO-1711: 0 ou 2,355 a 3,14
  try {
    const r = await admin.rpc('record_kling4_trial_film', {
      p_job_id: i.jobId, p_user_id: i.userId, p_country: country(i.country),
      p_engine_used: i.engineUsed, p_cost_milliusd: Math.round(i.costUsd * 1000),
    })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || (row?.code !== 'ok' && row?.code !== 'unchanged')) return false
    // A lambda may die after the fallback authority CAS and before correcting its initial Kling event.
    // Common birth/compose replays repair that one-way transition without changing cost or country.
    if (row.code === 'unchanged' && i.engineUsed === 'seedance15_fallback' && i.costUsd >= KLING4_TRIAL_COST_USD) { // KINEO-K4-TETO-FILME-LONGO-1711: >=
      const transitioned = await admin.rpc('transition_kling4_trial_fallback', { p_job_id: i.jobId, p_user_id: i.userId })
      const terminal = Array.isArray(transitioned.data) ? transitioned.data[0] : transitioned.data
      return !transitioned.error && (terminal?.code === 'ok' || terminal?.code === 'unchanged')
    }
    return true
  } catch { return false }
}

// ═══ KINEO-GEMINI-NA-ESTEIRA-2511 · o selo honesto no /admin e no relato de custo [revisora 25/11, conserto 1] ═══
// O razão do teto (kling4_trial_films, record_kling4_trial_film) só conhece 'kling4'/'seedance15_*' e custo de 2,355 a 3,14: ele CONTINUA reservando o pior
// caso (2,355), sem migration. O que o /admin e o relato de custo leem é o evento free_film_engine_used ("o evento do filme grátis manda",
// lib/admin/motorEntregue.ts): este passo, chamado logo depois de cada gravação, escreve nele o motor e o custo de QUEM ENTREGOU:
//   · o Gemini no ar (motor_do_clipe 'gemini_omni_flash'): engine_used 'omni' ("Omni Flash, filme grátis"), cost_usd = o estimado do Gemini (sem os tokens,
//     que a fal não informa), cost_basis 'estimado_gemini_sem_tokens' e teto_reservado_usd = o que o razão reservou;
//   · a queda (reserva_de 'gemini_omni_flash'): engine_used = o motor do marcador ("Kling 4.0" ou a reserva de hoje), o custo dele como sempre, e ao lado os
//     dois motores e o estimado do Gemini (gemini_cobrado 'nao' só na recusa do envio, quando nada foi aceito).
// Filme que não passou pelo Gemini: nada é lido nem escrito (byte a byte). Nunca lança; falha = o evento de antes.
/** KINEO-FALA-DOS-PERSONAGENS-2511 — o selo diz também a VOZ real do filme (falado só quando o Gemini entregou o pedido falado; queda = narrado, motivo gemini_caiu).
 *  Sem o marcador da fala = o selo de antes, byte a byte. */
export function seloDoFilmeGratis2511(marker: unknown, atual: Record<string, unknown>): Record<string, unknown> | null {
  const base = seloBaseDoFilmeGratis2511(marker, atual)
  const m = marker && typeof marker === 'object' ? (marker as Record<string, unknown>) : null
  const f = m?.fala_2511 as { modo?: unknown; motivo?: unknown } | undefined
  if (!base || !f || typeof f !== 'object') return base
  const caiu = m!.motor_do_clipe !== 'gemini_omni_flash' || !!m!.gemini_queda || m!.engine_used !== 'kling4'
  const falado = f.modo === 'falado' && !caiu
  return { ...base, voz: falado ? 'falado' : 'narrado', voz_motivo: falado ? null : f.modo === 'falado' ? 'gemini_caiu' : (typeof f.motivo === 'string' ? f.motivo : null) }
}
function seloBaseDoFilmeGratis2511(marker: unknown, atual: Record<string, unknown>): Record<string, unknown> | null {
  const m = marker && typeof marker === 'object' ? (marker as Record<string, unknown>) : null
  if (!m) return null
  const noGemini = m.motor_do_clipe === 'gemini_omni_flash', queda = m.reserva_de === 'gemini_omni_flash'
  if (!noGemini && !queda) return null
  const est = typeof m.gemini_est_usd === 'number' && Number.isFinite(m.gemini_est_usd) && m.gemini_est_usd > 0 ? m.gemini_est_usd : null
  if (est === null) return null
  // [revisora 25/11, volta 2] o desfecho D: o Gemini caiu, o Kling 4 NÃO saiu e a reserva de hoje entrega. O marcador continua com motor_do_clipe 'gemini_omni_flash'
  // (o sem_kling4 não o tira) e a RPC de transição não troca um evento em 'omni': o selo e o custo passam a ser os da RESERVA, com os dois motores ao lado.
  const reservaDoGemini = noGemini && (m.engine_used === 'seedance15_fallback' || m.fallback_started === true || (m.gemini_queda as { estado?: unknown } | undefined)?.estado === 'sem_kling4')
  if (reservaDoGemini) {
    const teto = typeof atual.teto_reservado_usd === 'number' ? atual.teto_reservado_usd : (typeof m.cost_usd === 'number' ? m.cost_usd : (atual.cost_usd ?? null))
    const { teto_reservado_usd: _t0, motor_do_clipe: _m0, ...resto0 } = atual
    return { ...resto0, engine_used: 'seedance15_fallback', cost_usd: teto, cost_basis: 'reserved_upper_bound', motores: ['gemini_omni_flash', 'seedance15_fallback'],
      gemini_est_usd: est, gemini_cobrado: (m.gemini_queda as { estado?: unknown } | undefined)?.estado === 'no_envio' ? 'nao' : 'possivel' }
  }
  if (noGemini) {
    if (atual.engine_used !== 'kling4' && atual.engine_used !== 'omni') return null // o razão já foi para a reserva de hoje: o evento de sempre fica
    return { ...atual, engine_used: 'omni', motor_do_clipe: 'gemini_omni_flash', cost_usd: est, cost_basis: 'estimado_gemini_sem_tokens',
      teto_reservado_usd: typeof m.cost_usd === 'number' ? m.cost_usd : (atual.teto_reservado_usd ?? atual.cost_usd ?? null), seconds: 15 }
  }
  const motor = typeof m.engine_used === 'string' ? m.engine_used : null
  if (motor !== 'kling4' && motor !== 'seedance15_fallback') return null
  const recusaNoEnvio = (m.gemini_queda as { estado?: unknown } | undefined)?.estado === 'no_envio'
  const custoDoMotor = atual.engine_used === 'omni' ? (typeof atual.teto_reservado_usd === 'number' ? atual.teto_reservado_usd : (typeof m.cost_usd === 'number' ? m.cost_usd : null)) : (atual.cost_usd ?? null)
  const { teto_reservado_usd: _t, motor_do_clipe: _mc, ...resto } = atual
  return { ...resto, engine_used: motor, cost_usd: custoDoMotor, cost_basis: 'reserved_upper_bound', motores: ['gemini_omni_flash', motor],
    gemini_est_usd: est, gemini_cobrado: recusaNoEnvio ? 'nao' : 'possivel' }
}
/** O id do evento que a RPC grava: md5('free_film_engine_used:' || user || ':' || job)::uuid. */
export async function idDoEventoDoFilmeGratis(userId: string, jobId: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  const h = createHash('md5').update(`free_film_engine_used:${userId}:${jobId}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
export async function gravarSeloDoFilmeGratis2511(admin: SupabaseClient, i: { jobId: string; userId: string; marker: unknown }): Promise<boolean> {
  try {
    const m = i.marker && typeof i.marker === 'object' ? (i.marker as Record<string, unknown>) : null
    if (!m || (m.motor_do_clipe !== 'gemini_omni_flash' && m.reserva_de !== 'gemini_omni_flash') || !UUID.test(i.userId)) return false
    const id = await idDoEventoDoFilmeGratis(i.userId, i.jobId)
    const r = await admin.from('events').select('metadata').eq('id', id).eq('name', 'free_film_engine_used').eq('user_id', i.userId).maybeSingle()
    const atual = (r.data as { metadata?: Record<string, unknown> } | null)?.metadata
    if (r.error || !atual || typeof atual !== 'object') return false
    const novo = seloDoFilmeGratis2511(m, atual)
    if (!novo || JSON.stringify(novo) === JSON.stringify(atual)) return !!novo
    const u = await admin.from('events').update({ metadata: novo }).eq('id', id).eq('name', 'free_film_engine_used').eq('user_id', i.userId)
    return !u.error
  } catch { return false }
}
