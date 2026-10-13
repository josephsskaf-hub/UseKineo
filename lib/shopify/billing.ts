// KINEO-SHOPIFY-2026-10-13 (etapa 2) — a cobrança do app da Shopify (Shopify App Pricing, cobrança GERIDA pela Shopify).
//
// O QUE A SHOPIFY COBRA: o plano do mês (Shop Starter US$ 29 / Shop Business US$ 84, cadastrados no formulário de envio — aqui
// não há código de assinatura) e o medidor `extra_ad` (US$ 7 por anúncio extra), que recebe UM evento por anúncio pelo App Events
// API. A Stripe fica fora deste app (requisito 1.2.1).
//
// O QUE NÓS FAZEMOS:
//   · syncShopPlan: lê a assinatura ATIVA na Partner API (`activeSubscription`; apps novos não recebem o webhook de assinatura),
//     grava o plano na loja e concede os créditos do ciclo pela função shopify_grant_credits — recibo (loja + ciclo) e crédito na
//     MESMA transação: tela, retorno da página de planos e o cron diário podem chamar juntos, o ciclo soma UMA vez. A decisão é
//     pura (lib/shopify/core.ts decideCycleGrant): só plano pago ativo, fora do teste grátis, fora de loja de desenvolvimento
//     (salvo SHOPIFY_TEST_SHOPS). O plano NUNCA vem da URL (`plan_handle` do retorno só dispara a releitura).
//   · chargeExtraAd: o anúncio extra. Reserva a linha (chave = o pedido, única) ANTES da rede, confere os tetos do dia e do mês
//     contando a própria reserva (corrida = a reserva sai e recusa), manda o evento com a mesma chave de idempotência e só com o 202
//     concede os créditos do anúncio (chave 'extra:<pedido>', idempotente). Daí o /start de sempre (adsV2StartFor) debita esses
//     créditos como qualquer anúncio — nenhum caminho paralelo de dinheiro. Evento recusado = linha 'failed' (não conta no teto) e
//     nenhum crédito. Evento aceito e crédito que falhou = a linha fica 'sent'; repetir o mesmo pedido reconcede (idempotente).
// Sem as envs da Partner API (SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_API_TOKEN, SHOPIFY_APP_GID) nada é concedido (falha fechada).
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SHOPIFY_EXTRA_AD,
  appEventBody,
  decideCycleGrant,
  decideExtraAd,
  parseActiveSubscription,
  planFromSubscription,
  readShopifyCreds,
  redactForLog,
  testShopAllowed,
  usageWindow,
  type ShopifyActiveSubscription,
  type ShopifyPlanId,
} from '@/lib/shopify/core'
import { SHOPIFY_SHOPS_TABLE } from '@/lib/shopify/server'
import { loadShopLink, type ShopLink } from '@/lib/shopify/account'
import { writeServerEvent } from '@/lib/serverEvents'

/** Versões das APIs fora da Admin API (Partner API e App Events API são versionadas à parte). */
export const SHOPIFY_PARTNER_API_VERSION = '2026-07'
export const SHOPIFY_APP_EVENTS_VERSION = '2026-10'
export const SHOPIFY_USAGE_TABLE = 'shopify_usage_charges'

const ACTIVE_SUBSCRIPTION_QUERY = `query KineoActiveSubscription($appId: ID!, $shopId: ID!) {
  activeSubscription(appId: $appId, shopId: $shopId) {
    billingPeriod
    cancelAtEndOfCycle
    trialEndsAt
    currentBillingCycle { startTime endTime }
    items { handle }
  }
}`

/** A assinatura ativa da loja na Partner API. ok:false = não configurado ou erro (o chamador não mexe em nada). */
export async function fetchActiveSubscription(shopGid: string): Promise<{ ok: true; sub: ShopifyActiveSubscription | null } | { ok: false; reason: 'not_configured' | 'unavailable' }> {
  const org = (process.env.SHOPIFY_PARTNER_ORG_ID ?? '').trim()
  const token = (process.env.SHOPIFY_PARTNER_API_TOKEN ?? '').trim()
  const appId = (process.env.SHOPIFY_APP_GID ?? '').trim()
  if (!/^\d{1,20}$/.test(org) || !token || !/^gid:\/\/partners\/App\/\d{1,20}$|^gid:\/\/shopify\/App\/\d{1,20}$/.test(appId)) return { ok: false, reason: 'not_configured' }
  try {
    const res = await fetch(`https://partners.shopify.com/${org}/api/${SHOPIFY_PARTNER_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query: ACTIVE_SUBSCRIPTION_QUERY, variables: { appId, shopId: shopGid } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await res.json().catch(() => null)) as { data?: unknown; errors?: unknown } | null
    if (!res.ok || !json || json.errors || !json.data) {
      console.warn('[shopify] partner api falhou', redactForLog({ status: res.status }))
      return { ok: false, reason: 'unavailable' }
    }
    return { ok: true, sub: parseActiveSubscription(json.data) }
  } catch (e) {
    console.warn('[shopify] partner api exceção', redactForLog({ error: e instanceof Error ? e.message : 'unknown' }))
    return { ok: false, reason: 'unavailable' }
  }
}

/** plan_status da loja a partir da assinatura (null = a doc diz: sem assinatura ativa). */
function planStatusOf(sub: ShopifyActiveSubscription | null, now: Date): 'none' | 'trial' | 'active' {
  if (!sub) return 'none'
  return sub.trialEndsAt && Date.parse(sub.trialEndsAt) > now.getTime() ? 'trial' : 'active'
}

/** O RPC de concessão (recibo + crédito numa transação). true = somou agora; false = o recibo já existia; null = erro. */
async function grantCredits(admin: SupabaseClient, args: { shop: string; cycleKey: string; userId: string; credits: number; reason: 'plan_cycle' | 'extra_ad'; plan: string | null }): Promise<boolean | null> {
  const r = await admin.rpc('shopify_grant_credits', { p_shop: args.shop, p_cycle: args.cycleKey, p_user: args.userId, p_amount: args.credits, p_reason: args.reason, p_plan: args.plan })
  if (r.error) {
    console.warn('[shopify] concessão falhou', redactForLog({ shop: args.shop, reason: args.reason, code: r.error.code ?? null }))
    return null
  }
  return r.data === true
}

export type ShopPlanSync =
  | { state: 'not_linked' | 'unavailable' | 'not_configured' }
  | { state: 'synced'; plan: ShopifyPlanId | null; status: 'none' | 'trial' | 'active'; granted: boolean; credits: number; reason: string | null; link: ShopLink }

/** Relê o plano da loja na Partner API, grava e concede o crédito do ciclo (idempotente por loja + ciclo). */
export async function syncShopPlan(admin: SupabaseClient, shop: string, now: Date = new Date()): Promise<ShopPlanSync> {
  const { row, error } = await loadShopLink(admin, shop)
  if (error || !row || !row.owner_user_id || !row.shop_gid) return { state: 'not_linked' }
  const got = await fetchActiveSubscription(row.shop_gid)
  if (!got.ok) return { state: got.reason === 'not_configured' ? 'not_configured' : 'unavailable' }
  const plan = planFromSubscription(got.sub)
  const status = planStatusOf(got.sub, now)
  const upd = await admin.from(SHOPIFY_SHOPS_TABLE).update({ plan_handle: plan, plan_status: status, plan_checked_at: now.toISOString(), updated_at: now.toISOString() }).eq('shop_domain', shop)
  if (upd.error) return { state: 'unavailable' }
  const link: ShopLink = { ...row, plan_handle: plan, plan_status: status, plan_checked_at: now.toISOString() }
  const d = decideCycleGrant({ shop, sub: got.sub, devStore: row.partner_development === true, testShopAllowed: testShopAllowed(shop), now })
  if (!d.grant) return { state: 'synced', plan, status, granted: false, credits: 0, reason: d.reason, link }
  const granted = await grantCredits(admin, { shop, cycleKey: d.cycleKey, userId: row.owner_user_id, credits: d.credits, reason: 'plan_cycle', plan: d.plan })
  if (granted === null) return { state: 'unavailable' }
  if (granted) await writeServerEvent({ name: 'shopify_credits_granted', userId: row.owner_user_id, path: '/api/shopify', metadata: { shop, plan: d.plan, credits: d.credits, cycle_key: d.cycleKey, reason: 'plan_cycle' } })
  return { state: 'synced', plan, status, granted, credits: granted ? d.credits : 0, reason: null, link }
}

/** Token do App Events API (client credentials, vale 60 min). Só em memória, por chamada. */
async function appEventsToken(): Promise<string | null> {
  const creds = readShopifyCreds()
  if (!creds) return null
  try {
    const res = await fetch('https://api.shopify.com/auth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ client_id: creds.apiKey, client_secret: creds.apiSecret, grant_type: 'client_credentials' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await res.json().catch(() => null)) as { access_token?: unknown } | null
    return res.ok && typeof json?.access_token === 'string' && json.access_token ? json.access_token : null
  } catch {
    return null
  }
}

/** Manda UM evento do medidor `extra_ad`. 202 = recebido (a validação de cobrança da Shopify é assíncrona). */
async function sendExtraAdEvent(shopGid: string, idempotencyKey: string, now: Date): Promise<'accepted' | 'busy' | 'refused'> {
  const token = await appEventsToken()
  if (!token) return 'refused'
  try {
    const res = await fetch(`https://api.shopify.com/app/${SHOPIFY_APP_EVENTS_VERSION}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(appEventBody({ shopGid, idempotencyKey, now })),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 202 || res.status === 200) return 'accepted'
    if (res.status === 409 || res.status === 429) return 'busy'
    console.warn('[shopify] evento de uso recusado', redactForLog({ status: res.status }))
    return 'refused'
  } catch (e) {
    console.warn('[shopify] evento de uso exceção', redactForLog({ error: e instanceof Error ? e.message : 'unknown' }))
    return 'busy'
  }
}

export type ExtraAdResult =
  | { ok: true; credits: number }
  | { ok: false; error: 'free_plan' | 'too_expensive' | 'daily_cap' | 'monthly_cap' | 'billing_busy' | 'billing_failed' | 'not_ready' }

/** A chave do uso extra = o pedido (um anúncio extra por pedido, nunca dois eventos para o mesmo anúncio). ≤ 64 caracteres. */
export function extraUsageKey(orderId: string): string {
  return `extra-${orderId.toLowerCase()}`
}

/** O anúncio extra de US$ 7: reserva → tetos → evento → crédito (ver o cabeçalho). */
export async function chargeExtraAd(admin: SupabaseClient, input: { link: ShopLink; plan: ShopifyPlanId | null; userId: string; orderId: string; credits: number; now?: Date }): Promise<ExtraAdResult> {
  const now = input.now ?? new Date()
  const shop = input.link.shop_domain
  if (!input.link.shop_gid) return { ok: false, error: 'not_ready' }
  const pre = decideExtraAd({ plan: input.plan, cost: input.credits, usedToday: 0, usedMonth: 0 })
  if (!pre.ok) return { ok: false, error: pre.reason }
  const key = extraUsageKey(input.orderId)
  const { day, month } = usageWindow(now)
  const grant = async (): Promise<ExtraAdResult> => {
    const g = await grantCredits(admin, { shop, cycleKey: `extra:${input.orderId.toLowerCase()}`, userId: input.userId, credits: input.credits, reason: 'extra_ad', plan: input.plan })
    if (g === null) return { ok: false, error: 'billing_failed' }
    if (g) await writeServerEvent({ name: 'shopify_credits_granted', userId: input.userId, path: '/api/shopify/ads', metadata: { shop, credits: input.credits, order_id: input.orderId, reason: 'extra_ad', usd: SHOPIFY_EXTRA_AD.usd } })
    return { ok: true, credits: input.credits }
  }

  // 1. Reserva (chave única). Já existia: 'sent' = já cobrado → só reconcede (idempotente); 'pending' = outra chamada no meio.
  const ins = await admin.from(SHOPIFY_USAGE_TABLE).insert({ shop_domain: shop, usage_key: key, user_id: input.userId, order_id: input.orderId, credits: input.credits, usd: SHOPIFY_EXTRA_AD.usd, status: 'pending', day, month }).select('id').maybeSingle()
  if (ins.error) {
    if (ins.error.code !== '23505') return { ok: false, error: 'not_ready' }
    const cur = await admin.from(SHOPIFY_USAGE_TABLE).select('status').eq('usage_key', key).maybeSingle()
    const st = (cur.data as { status?: string } | null)?.status
    if (st === 'sent') return grant()
    if (st === 'pending') return { ok: false, error: 'billing_busy' }
    const retry = await admin.from(SHOPIFY_USAGE_TABLE).update({ status: 'pending', day, month, updated_at: now.toISOString() }).eq('usage_key', key).eq('status', 'failed').select('id').maybeSingle()
    if (retry.error || !retry.data) return { ok: false, error: 'billing_busy' }
  }
  const release = async (status: 'failed' | null) => {
    if (status) await admin.from(SHOPIFY_USAGE_TABLE).update({ status, updated_at: new Date().toISOString() }).eq('usage_key', key).eq('status', 'pending')
    else await admin.from(SHOPIFY_USAGE_TABLE).delete().eq('usage_key', key).eq('status', 'pending')
  }

  // 2. Tetos contando a PRÓPRIA reserva (pending + sent): passou = a reserva sai e recusa (corrida resolvida no banco).
  const count = async (col: 'day' | 'month', val: string) => {
    const r = await admin.from(SHOPIFY_USAGE_TABLE).select('id', { count: 'exact', head: true }).eq('shop_domain', shop).eq(col, val).in('status', ['pending', 'sent'])
    return r.error || typeof r.count !== 'number' ? null : r.count
  }
  const today = await count('day', day)
  const inMonth = await count('month', month)
  if (today === null || inMonth === null) {
    await release(null)
    return { ok: false, error: 'not_ready' }
  }
  const caps = decideExtraAd({ plan: input.plan, cost: input.credits, usedToday: today - 1, usedMonth: inMonth - 1 })
  if (!caps.ok) {
    await release(null)
    return { ok: false, error: caps.reason }
  }

  // 3. O evento do medidor (mesma chave de idempotência: reenvio nunca cobra duas vezes).
  const sent = await sendExtraAdEvent(input.link.shop_gid, key, now)
  if (sent !== 'accepted') {
    await release(sent === 'busy' ? null : 'failed')
    return { ok: false, error: sent === 'busy' ? 'billing_busy' : 'billing_failed' }
  }
  await admin.from(SHOPIFY_USAGE_TABLE).update({ status: 'sent', updated_at: new Date().toISOString() }).eq('usage_key', key)
  await writeServerEvent({ name: 'shopify_extra_ad_billed', userId: input.userId, path: '/api/shopify/ads', metadata: { shop, order_id: input.orderId, usd: SHOPIFY_EXTRA_AD.usd, credits: input.credits } })
  // 4. O crédito do anúncio (o /start de sempre debita).
  return grant()
}

/** Quantos anúncios extra a loja usou hoje e no mês (pending + sent), para a tela. Falha = null. */
export async function extraAdUsage(admin: SupabaseClient, shop: string, now: Date = new Date()): Promise<{ today: number; month: number } | null> {
  const { day, month } = usageWindow(now)
  const a = await admin.from(SHOPIFY_USAGE_TABLE).select('id', { count: 'exact', head: true }).eq('shop_domain', shop).eq('day', day).in('status', ['pending', 'sent'])
  const b = await admin.from(SHOPIFY_USAGE_TABLE).select('id', { count: 'exact', head: true }).eq('shop_domain', shop).eq('month', month).in('status', ['pending', 'sent'])
  if (a.error || b.error) return null
  return { today: a.count ?? 0, month: b.count ?? 0 }
}
