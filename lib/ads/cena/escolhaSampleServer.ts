// KINEO-AMOSTRA-ANUNCIO-2410 — personal, irrevocable sample allowance and authoritative person-level measurement.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { ADS_ESCOLHA_SAMPLE_LIVE, ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS, ADS_ESCOLHA_SAMPLE_KLING4_ESTIMATE_CENTS, escolhaSampleEstimateCents } from './escolhaSamplePolicy'
import { adsSampleCountryAllowed } from '../eligibilityPure' // KINEO-ADS-SIMPLES-2810 — só países do filme grátis; país desconhecido = fechado

const TABLE = 'ads_escolha_samples'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
type Identity = { orderId: string; actorId: string; ownerId: string; route?: string }
type SampleResult = { ok: true } | { ok: false; error: string; status: number; reset_at?: string }
const unavailable = (): SampleResult => ({ ok: false, error: 'ads_sample_unavailable', status: 503 })
const personal = (i: Identity): boolean => [i.orderId, i.actorId, i.ownerId].every(id => UUID.test(id)) && i.actorId === i.ownerId

// KINEO-ADS-SIMPLES-2810 — `country` = o país do PEDIDO (x-vercel-ip-country, lido pela rota); o perfil completa (last/signup). Nenhum sinal = sem amostra.
async function verifiedAccount(admin: SupabaseClient, actorId: string, country?: string | null) {
  try {
    const auth = await admin.auth.admin.getUserById(actorId)
    const user = auth.error ? null : auth.data?.user
    if (!user?.email || typeof user.email_confirmed_at !== 'string' || !Number.isFinite(Date.parse(user.email_confirmed_at))) return null
    // Same disposable-email/trial antifarm as Close real. Imported only at this boundary, never in unrelated render tests.
    const { adsSampleAccountOk } = await import('../serverAccess')
    if (!await adsSampleAccountOk(admin, actorId)) return null
    const { loadAdsSampleCountry } = await import('../eligibility') // KINEO-ADS-SIMPLES-2810 — pedido atual → last_country → signup_country (import dinâmico, como o de cima)
    if (!adsSampleCountryAllowed(await loadAdsSampleCountry(admin, actorId, country))) return null // KINEO-ADS-SIMPLES-2810 — fundador 28/10: amostra só na lista de países; desconhecido = NÃO
    return user
  } catch { return null }
}

/** Every logged-in account can qualify; paid entitlement is deliberately unrelated to this one personal sample. */
export async function escolhaSampleAccountOk(admin: SupabaseClient, actorId: string, country?: string | null): Promise<boolean> { // KINEO-ADS-SIMPLES-2810 — + country (opcional)
  return ADS_ESCOLHA_SAMPLE_LIVE && UUID.test(actorId) && !!await verifiedAccount(admin, actorId, country)
}

/** The database fixes cost from its persisted route (150c Kling3 / 186c Kling4), locks the person and UTC day,
 * and commits claim+counter+started event together. Never send a caller-supplied amount to the RPC. */
export async function reserveEscolhaSample(admin: SupabaseClient, i: Identity & { leaseAt: string; country?: string | null }): Promise<SampleResult> { // KINEO-ADS-SIMPLES-2810 — + country (opcional)
  const estimate = escolhaSampleEstimateCents(i.route)
  if (!ADS_ESCOLHA_SAMPLE_LIVE || ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS !== 150 || ADS_ESCOLHA_SAMPLE_KLING4_ESTIMATE_CENTS !== 186 || estimate === null || !personal(i)) return unavailable()
  const user = await verifiedAccount(admin, i.actorId, i.country)
  if (!user) return { ok: false, error: 'ads_sample_account_required', status: 403 }
  try {
    const result = await admin.rpc('reserve_ads_escolha_sample', {
      p_order_id: i.orderId, p_actor_id: i.actorId, p_owner_id: i.ownerId, p_lease_at: i.leaseAt, p_is_internal: isInternalEmail(user.email),
    })
    const row = Array.isArray(result.data) ? result.data[0] : result.data
    if (result.error || !row) return unavailable()
    if (row.code === 'ok' && row.estimate_cents === estimate) return { ok: true }
    if (row.code === 'ads_sample_used') return { ok: false, error: row.code, status: 409 }
    if (row.code === 'ads_sample_cap') return { ok: false, error: row.code, status: 429, ...(typeof row.reset_at === 'string' ? { reset_at: row.reset_at } : {}) }
    return unavailable()
  } catch { return unavailable() }
}

/** A draft cannot bypass reservation by posting directly to the paid-render start endpoint. */
export async function hasEscolhaSampleReservation(admin: SupabaseClient, i: Identity): Promise<boolean> {
  const estimate = escolhaSampleEstimateCents(i.route)
  if (!personal(i) || estimate === null) return false
  try {
    const r = await admin.from(TABLE).select('order_id,estimate_cents').eq('actor_id', i.actorId).eq('owner_id', i.ownerId).eq('order_id', i.orderId).maybeSingle()
    return !r.error && r.data?.order_id === i.orderId && r.data.estimate_cents === estimate
  } catch { return false }
}

/** Used forever includes failed/deleted orders; an unavailable ledger fails closed. */
export async function escolhaSampleUsed(admin: SupabaseClient, actorId: string): Promise<boolean> {
  if (!UUID.test(actorId)) return true
  try {
    const r = await admin.from(TABLE).select('order_id').eq('actor_id', actorId).maybeSingle()
    return !!r.error || !!r.data
  } catch { return true }
}

async function mark(admin: SupabaseClient, i: Identity, kind: 'delivered' | 'upsell'): Promise<boolean> {
  if (!personal(i)) return false
  try {
    const r = await admin.rpc(`mark_ads_escolha_sample_${kind}`, { p_order_id: i.orderId, p_actor_id: i.actorId, p_owner_id: i.ownerId })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    return !r.error && ['ok', 'unchanged'].includes(row?.code)
  } catch { return false }
}
/** Optional repair call; the DB delivery trigger is the normal emitter and does not depend on browser polling. */
export const markEscolhaSampleDelivered = (admin: SupabaseClient, i: Identity) => mark(admin, i, 'delivered')
export const markEscolhaSampleUpsell = (admin: SupabaseClient, i: Identity) => mark(admin, i, 'upsell')

/** Reuses the existing scheduled Ads cron and Resend alarm transport. This function never sends during a local test. */
export async function checkEscolhaSampleConversionAlert(admin: SupabaseClient, deadlineMs: number): Promise<boolean> {
  if (Date.now() + 12_000 >= deadlineMs) return false
  try {
    const reconciled = await admin.rpc('reconcile_ads_escolha_sample_purchases')
    if (reconciled.error) return false
    const token = crypto.randomUUID()
    const r = await admin.rpc('claim_ads_escolha_sample_alert', { p_claim_token: token })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || row?.code !== 'ok' || row.claim_token !== token || row.people !== 50) return false
    const { notifyFounder } = await import('@/lib/supplier/notify')
    const text = `50 pessoas externas receberam a amostra grátis do anúncio com apresentadora e completaram 7 dias de observação sem nenhuma compra real confirmada na Stripe em até 7 dias da entrega.\n\nPrimeira entrega: ${row.first_delivered_at}\nÚltima entrega: ${row.last_delivered_at}\nMedição: ${row.measured_at}\n\nContas internas excluídas. Uma pessoa por conta; sessões e cliques não contam como compra.\nRecomendação: pausar ADS_ESCOLHA_SAMPLE_LIVE e revisar os resultados antes de ampliar o gasto.`
    const sent = await notifyFounder('Kineo: 50 amostras entregues, 0 compras em 7 dias', text, { emailOnly: true, idempotencyKey: 'ads-escolha-sample-50-no-purchase-7d-v1' })
    await admin.rpc('finish_ads_escolha_sample_alert', { p_claim_token: token, p_sent: sent.email === 'sent' })
    return sent.email === 'sent'
  } catch { return false }
}
