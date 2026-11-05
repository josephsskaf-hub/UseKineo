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

// KINEO-AMOSTRA-QUEIMADA-0311 — a amostra cujo PLANO nunca saiu não conta como usada: a reserva vem antes do planejamento (a
// semente 'planned' só com a marca), e quando o planejamento falha ou a função morre, a pessoa ficava sem amostra e sem vídeo,
// para sempre. Caso real: bloom.boca.llc (02/11 23:43 UTC, link da AliExpress), pedido 8e456a32 parado em 'planned' com a
// semente; a 1ª amostra grátis de anúncio da produção. Vale só com a semente parada há ≥ 5 min (planejamento em curso conta
// como usado), sem débito, sem início, sem geração, sem entrega e sem plano gravado; 'cancelled' só pela faxina de 48 h.
export const AMOSTRA_QUEIMADA_MARCA = 'KINEO-AMOSTRA-QUEIMADA-0311'
export const AMOSTRA_SEMENTE_PARADA_MS = 5 * 60_000
type PedidoSemente = { id?: unknown; status?: unknown; error?: unknown; credits_charged?: unknown; started_at?: unknown; delivered_at?: unknown; generation_id?: unknown; plan?: unknown; assembly_lease_at?: unknown; updated_at?: unknown; created_at?: unknown }
/** PURA: o pedido da amostra é a semente que nunca ganhou plano (e está parado há ≥ 5 min)? */
export function pedidoDeAmostraSemPlano(order: PedidoSemente | null | undefined, nowMs: number): boolean {
  if (!order || typeof order !== 'object') return false
  if (order.status !== 'planned' && !(order.status === 'cancelled' && order.error === 'abandoned_48h')) return false
  if (Number(order.credits_charged ?? 0) !== 0 || order.started_at || order.delivered_at || order.generation_id) return false
  const plan = order.plan as { cena?: { plan?: unknown }; escolhaFlow?: unknown; narration?: unknown } | null | undefined
  const inner = plan && typeof plan === 'object' ? plan.cena?.plan : null
  if (!inner || typeof inner !== 'object' || Object.keys(inner).some(k => k !== 'escolha') || plan!.escolhaFlow || plan!.narration) return false
  const desde = Date.parse(String(order.assembly_lease_at ?? order.updated_at ?? order.created_at ?? ''))
  return Number.isFinite(desde) && nowMs - desde >= AMOSTRA_SEMENTE_PARADA_MS
}
/** A semente parada da pessoa (id + lease atual, para a retomada condicional) — ou null. Qualquer erro = null (conta como usada). */
export async function amostraSemPlano(admin: SupabaseClient, actorId: string, nowMs = Date.now()): Promise<{ orderId: string; lease: string | null } | null> {
  if (!UUID.test(actorId)) return null
  try {
    const r = await admin.from(TABLE).select('order_id, owner_id, delivered_at').eq('actor_id', actorId).maybeSingle()
    const row = (r.data as { order_id?: unknown; owner_id?: unknown; delivered_at?: unknown } | null) ?? null
    if (r.error || !row || row.delivered_at || typeof row.order_id !== 'string' || row.owner_id !== actorId) return null
    const o = await admin.from('ads_v2_orders').select('id, status, error, credits_charged, started_at, delivered_at, generation_id, plan, assembly_lease_at, updated_at, created_at').eq('id', row.order_id).eq('user_id', actorId).maybeSingle()
    const order = (o.data as PedidoSemente | null) ?? null
    if (o.error || !order || !pedidoDeAmostraSemPlano(order, nowMs)) return null
    return { orderId: row.order_id, lease: typeof order.assembly_lease_at === 'string' ? order.assembly_lease_at : null }
  } catch { return null }
}

// KINEO-FLUXO2-D-0411 [fundador 04/11: "recomendações"] — a recusa do plano não pode virar "você já usou sua amostra". A reserva vem antes do planejamento; a
// pessoa recusada (categoria, moderação, roteiro) ficava 5 min com a semente "em curso", a nova tentativa batia em ads_sample_used e a tela dizia uma coisa falsa.
//   · soltarSementeDaAmostra: a recusa antes de qualquer gasto envelhece o lease da semente até a régua de cima (AMOSTRA_SEMENTE_PARADA_MS) e a retomada de sempre
//     vale na hora. Sem migration: é a MESMA semente e a MESMA reserva. A linha de ads_escolha_samples não muda (o papel do servidor nem tem DELETE); 1 amostra por
//     conta e o teto do dia (reserved_cents) seguem intactos, e foto só existe depois do plano gravado, quando a semente deixa de ser semente.
//   · AMOSTRA_SOLTURAS_MAX: o custo da recusa é só o texto (classificador e roteirista). A contagem fica na semente: passou do teto, volta a esperar os 5 min de sempre.
//   · esperaDaSementeMs: semente ainda em curso (duas abas, função que morreu, teto de solturas) responde quanto falta, em vez de "já usou".
export const AMOSTRA_SOLTURAS_MAX = 5
type PlanoDaSemente = { cena?: { plan?: { escolha?: { solturas?: unknown } & Record<string, unknown> } } & Record<string, unknown> } & Record<string, unknown>
/** Recusa antes de gastar: libera a semente para a retomada imediata. Só quem ainda segura o lease; nunca derruba a resposta. Devolve se soltou. */
export async function soltarSementeDaAmostra(admin: SupabaseClient, i: { orderId: string; ownerId: string; lease: string }): Promise<boolean> {
  const lease = Date.parse(i.lease)
  if (!UUID.test(i.orderId) || !UUID.test(i.ownerId) || !Number.isFinite(lease)) return false
  try {
    const r = await admin.from('ads_v2_orders').select('id, status, error, credits_charged, started_at, delivered_at, generation_id, plan, assembly_lease_at, updated_at, created_at').eq('id', i.orderId).eq('user_id', i.ownerId).eq('assembly_lease_at', i.lease).maybeSingle()
    const order = (r.data as PedidoSemente | null) ?? null
    if (r.error || !order || order.status !== 'planned' || !pedidoDeAmostraSemPlano(order, lease + AMOSTRA_SEMENTE_PARADA_MS)) return false
    const plano = order.plan as PlanoDaSemente
    const escolha = plano.cena?.plan?.escolha ?? {}
    const solturas = Number(escolha.solturas ?? 0)
    if (!Number.isFinite(solturas) || solturas >= AMOSTRA_SOLTURAS_MAX) return false
    const novo = { ...plano, cena: { ...plano.cena, plan: { escolha: { ...escolha, solturas: solturas + 1 } } } }
    const u = await admin.from('ads_v2_orders').update({ assembly_lease_at: new Date(lease - AMOSTRA_SEMENTE_PARADA_MS).toISOString(), plan: novo }).eq('id', i.orderId).eq('user_id', i.ownerId).eq('status', 'planned').eq('assembly_lease_at', i.lease).select('id').maybeSingle()
    return !u.error && !!u.data
  } catch { return false }
}
/** A semente desta pessoa ainda está dentro dos 5 min: quanto falta, em ms. null = não há semente em curso (e a reserva decide). Qualquer erro = null. */
export async function esperaDaSementeMs(admin: SupabaseClient, actorId: string, nowMs = Date.now()): Promise<number | null> {
  if (!UUID.test(actorId)) return null
  try {
    const r = await admin.from(TABLE).select('order_id, owner_id, delivered_at').eq('actor_id', actorId).maybeSingle()
    const row = (r.data as { order_id?: unknown; owner_id?: unknown; delivered_at?: unknown } | null) ?? null
    if (r.error || !row || row.delivered_at || typeof row.order_id !== 'string' || row.owner_id !== actorId) return null
    const o = await admin.from('ads_v2_orders').select('id, status, error, credits_charged, started_at, delivered_at, generation_id, plan, assembly_lease_at, updated_at, created_at').eq('id', row.order_id).eq('user_id', actorId).maybeSingle()
    const order = (o.data as PedidoSemente | null) ?? null
    if (o.error || !order || !pedidoDeAmostraSemPlano(order, nowMs + AMOSTRA_SEMENTE_PARADA_MS)) return null
    const falta = AMOSTRA_SEMENTE_PARADA_MS - (nowMs - Date.parse(String(order.assembly_lease_at ?? order.updated_at ?? order.created_at ?? '')))
    return Number.isFinite(falta) && falta > 0 ? falta : null
  } catch { return null }
}

/** Used forever includes failed/deleted orders; an unavailable ledger fails closed. */
export async function escolhaSampleUsed(admin: SupabaseClient, actorId: string): Promise<boolean> {
  if (!UUID.test(actorId)) return true
  try {
    const r = await admin.from(TABLE).select('order_id').eq('actor_id', actorId).maybeSingle()
    if (!r.error && r.data && await amostraSemPlano(admin, actorId)) return false // KINEO-AMOSTRA-QUEIMADA-0311 — o plano nunca saiu: não foi usada
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
