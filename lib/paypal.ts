// PAYPAL-2026-07-06 — direct PayPal REST integration (packs one-time +
// subscriptions). Why: Stripe BR accounts cannot enable PayPal (EEA/UK/CH
// only), and PayPal is the #2 payment preference for US buyers — the exact
// segment abandoning USD checkouts (see audit 06/07: rlee34445, kantomerboy).
// This file is self-contained; NOTHING in lib/stripe.ts or the Stripe routes
// is touched. USD-only on purpose (PayPal converts for the buyer).
//
// Env needed (Vercel): PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
// Optional: PAYPAL_ENV=sandbox (defaults to live)
// Everything else (plan ids, webhook id) is auto-created by /api/paypal/setup
// and persisted in the paypal_config table — zero extra env vars.

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { renewalBalance } from './credits/renewalBalance' // KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25
import { TIER_PRICES, ANNUAL_PRICES, TIER_CREDITS, PACK_CREDITS, PACK_PRICE_MINOR } from './checkoutPricing'

import { grantAlternativePack, updatePaymentProfile, paymentError } from './payments/alternative'

export type PayPalTier = 'starter' | 'basic' | 'pro'
export type PayPalBilling = 'monthly' | 'annual'

// ═══ KINEO-PAYPAL-EXPORTS-RESTAURADOS-2026-09-07 (rotina Fechar a Venda) ═══
// Estas três nasceram HOJE na pista de PAGAMENTOS (painel de trilhos: responder
// "ligado/desligado" sem tentar cobrar ninguém) e foram APAGADAS pelo #363, que
// reescreveu este arquivo a partir de uma base velha. Elas continuam importadas
// por app/api/admin/payment-rails/route.ts, então a ponta da main parou de
// compilar e NENHUM deploy do dia subiria. Restauro literal, sem mudar nada do
// que o #363 fez com preço e grant.
export const PAYPAL_ENV_NAMES = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'] as const

/** Envs que faltam para o trilho PayPal funcionar NESTE deploy. Vazio = pronto. */
export function paypalMissingEnv(env: Record<string, string | undefined> = process.env): string[] {
  return PAYPAL_ENV_NAMES.filter((n) => {
    const v = env[n]
    return typeof v !== 'string' || v.trim().length === 0
  })
}

export function isPaypalEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return paypalMissingEnv(env).length === 0
}

export const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

// KINEO-PAYPAL-PRECO-UNICO-2026-09-07 — este arquivo tinha a SUA PRÓPRIA
// tabela de preço ($9.90/$24.90/$37.90, 25/150/200cr, pack de 10cr), copiada à
// mão em julho e nunca mais tocada. A Stripe passou por V3D, V5 e V6 e chegou
// em $7/$15/$29 com 40/90/180cr; o PayPal ficou parado em julho. Se o botão
// fosse ligado, quem pagasse por PayPal pagaria MAIS e receberia MENOS que o
// vizinho da Stripe — e o site anunciaria um preço que o checkout não cobra.
// Agora não existe segunda tabela: preço e grant vêm de lib/checkoutPricing,
// a mesma fonte que a Stripe e a tela de preços leem. Mudou lá, mudou aqui.
const usd = (cents: number) => (cents / 100).toFixed(2)

export const PAYPAL_TIER_USD: Record<PayPalTier, { monthly: string; annual: string; name: string }> = {
  starter: { monthly: usd(TIER_PRICES.starter.usd), annual: usd(ANNUAL_PRICES.starter.usd), name: 'Kineo — Starter' },
  basic:   { monthly: usd(TIER_PRICES.basic.usd),   annual: usd(ANNUAL_PRICES.basic.usd),   name: 'Kineo — Creator' },
  pro:     { monthly: usd(TIER_PRICES.pro.usd),     annual: usd(ANNUAL_PRICES.pro.usd),     name: 'Kineo — Studio' },
}

export const PAYPAL_PLAN_CREDITS: Record<PayPalTier, number> = {
  starter: TIER_CREDITS.starter,
  basic: TIER_CREDITS.basic,
  pro: TIER_CREDITS.pro,
}

// First Pack — mesmo SKU da Stripe (?pack=starter): PACK_PRICE_MINOR por PACK_CREDITS.starter.
// KINEO-PASSE-AVULSO-2026-10-05 — o preço deixou de ser literal ('4.90'): sai da fonte única (US$ 4,99).
export const PAYPAL_PACK = {
  credits: PACK_CREDITS.starter,
  usd: usd(PACK_PRICE_MINOR.usd),
  name: `Kineo — First Pack (${PACK_CREDITS.starter} credits)`,
}

// Planos no PayPal são IMUTÁVEIS no preço: um plano criado a $9.90 cobra $9.90
// para sempre. Por isso a chave de config e a idempotency key ganham versão —
// o /api/paypal/setup cria planos NOVOS com o preço atual em vez de reutilizar
// os de julho. Os antigos continuam no paypal_config (ninguém assinou por eles;
// PAYPAL_ENABLED sempre foi false), e o tierFromPlanId lê os dois formatos.
// KINEO-ANUAL-40OFF-2026-10-05 — v2 → v3: o anual mudou de preço (40% off) e o plano PayPal v2 anual, se já
// foi criado, cobraria o preço antigo para sempre. O /api/paypal/setup cria os v3 com o preço vigente.
// KINEO-ANUAL-30-2026-10-08 — v3 → v4, mesmo motivo: o anual passou a 30% off ($108 / $250 / $460) e um plano v3
// anual já criado cobraria o de 40% ($92,90 / $215 / $395) para sempre. ensurePlan (checkout e setup) cria os v4 na
// primeira chamada; assinaturas v3 existentes seguem mapeadas (tierFromPlanId ignora o sufixo de versão).
const PLAN_VERSION = 'v4'

export function paypalAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
type Admin = ReturnType<typeof paypalAdminClient>

// ── OAuth ────────────────────────────────────────────────────────────────────
let cachedToken: { token: string; exp: number } | null = null

export async function paypalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp - 60_000) return cachedToken.token
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`paypal oauth ${res.status}: ${await res.text()}`)
  const data = await res.json()
  cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return cachedToken.token
}

export async function paypalFetch(path: string, init?: RequestInit & { idempotencyKey?: string }) {
  const token = await paypalAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.idempotencyKey) headers['PayPal-Request-Id'] = init.idempotencyKey
  const res = await fetch(`${PAYPAL_BASE}${path}`, { ...init, headers, cache: 'no-store' })
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }
  if (!res.ok) {
    throw new Error(`paypal ${init?.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 500)}`)
  }
  return json as Record<string, unknown> | null
}

// ── Config store (paypal_config: key text pk, value text) ───────────────────
export async function getPaypalConfig(admin: Admin, key: string): Promise<string | null> {
  const { data } = await admin.from('paypal_config').select('value').eq('key', key).maybeSingle()
  return (data?.value as string | undefined) ?? null
}

export async function setPaypalConfig(admin: Admin, key: string, value: string): Promise<void> {
  await admin.from('paypal_config').upsert({ key, value })
}

// ── Products & Plans (auto-created, ids persisted) ──────────────────────────
async function ensureProduct(admin: Admin, tier: PayPalTier): Promise<string> {
  // Versionado junto com o plano: o product_<tier> de julho pode ser um id de
  // SANDBOX, e criar plano live apontando para produto sandbox devolve 404.
  const cfgKey = `product_${tier}_${PLAN_VERSION}`
  const existing = await getPaypalConfig(admin, cfgKey)
  if (existing) return existing
  const product = await paypalFetch('/v1/catalogs/products', {
    method: 'POST',
    idempotencyKey: `kineo-product-${tier}-${PLAN_VERSION}`,
    body: JSON.stringify({
      name: PAYPAL_TIER_USD[tier].name,
      type: 'SERVICE',
      category: 'SOFTWARE',
      home_url: 'https://www.usekineo.com',
    }),
  })
  const id = String(product?.id)
  await setPaypalConfig(admin, cfgKey, id)
  return id
}

export async function ensurePlan(admin: Admin, tier: PayPalTier, billing: PayPalBilling): Promise<string> {
  const cfgKey = `plan_${tier}_${billing}_${PLAN_VERSION}`
  const existing = await getPaypalConfig(admin, cfgKey)
  if (existing) return existing
  const productId = await ensureProduct(admin, tier)
  const price = billing === 'annual' ? PAYPAL_TIER_USD[tier].annual : PAYPAL_TIER_USD[tier].monthly
  const plan = await paypalFetch('/v1/billing/plans', {
    method: 'POST',
    idempotencyKey: `kineo-plan-${tier}-${billing}-${PLAN_VERSION}-${price}`,
    body: JSON.stringify({
      product_id: productId,
      name: `${PAYPAL_TIER_USD[tier].name} (${billing === 'annual' ? 'Annual' : 'Monthly'})`,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: billing === 'annual' ? 'YEAR' : 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // infinite until cancelled
          pricing_scheme: { fixed_price: { value: price, currency_code: 'USD' } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CANCEL',
        payment_failure_threshold: 2,
      },
    }),
  })
  const id = String(plan?.id)
  await setPaypalConfig(admin, cfgKey, id)
  return id
}

// Reverse lookup: PayPal plan id → { tier, billing } (used by the webhook).
export async function tierFromPlanId(admin: Admin, planId: string): Promise<{ tier: PayPalTier; billing: PayPalBilling } | null> {
  const { data, error } = await admin.from('paypal_config').select('key,value').like('key', 'plan_%')
  if (error) throw paymentError('paypal_plan_lookup_failed', error)
  for (const row of data ?? []) {
    if (row.value === planId) {
      // 'plan_<tier>_<billing>' (julho) ou 'plan_<tier>_<billing>_v2' — o sufixo
      // de versão é ignorado; só tier e billing importam para o grant.
      const [, tier, billing] = String(row.key).split('_')
      return { tier: tier as PayPalTier, billing: billing as PayPalBilling }
    }
  }
  return null
}

// Official verification: https://developer.paypal.com/api/rest/webhooks/rest/
// The configured ID is required before ANY database access. Preserve raw JSON.
export async function verifyPaypalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const fields = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']
  if (fields.some((name) => !headers.get(name))) return false
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) throw paymentError('paypal_webhook_id_missing')
  const envelope = JSON.stringify({
    auth_algo: headers.get('paypal-auth-algo'), cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'), transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'), webhook_id: webhookId,
  })
  let result: Record<string, unknown> | null
  try {
    result = await paypalFetch('/v1/notifications/verify-webhook-signature', {
      method: 'POST', body: envelope.slice(0, -1) + ',"webhook_event":' + rawBody + '}',
    })
  } catch { throw paymentError('paypal_verification_unavailable') }
  if (result?.verification_status === 'FAILURE') return false
  if (result?.verification_status !== 'SUCCESS') throw paymentError('paypal_verification_invalid_response')
  return true
}

// Credit amounts stay in checkoutPricing; renewal carry stays in renewalBalance.
// All grants are one checked UPDATE; no log-and-continue on missing profiles.
export async function grantPackCredits(admin: Admin, userId: string, credits: number): Promise<void> {
  await grantAlternativePack(admin, userId, credits)
}

export async function activateSubscription(admin: Admin, userId: string, tier: PayPalTier, subscriptionId: string): Promise<void> {
  await updatePaymentProfile(admin, userId, (profile) => ({
    is_pro: true, plan: tier, paypal_subscription_id: subscriptionId, has_paid: true,
    // Decide first charge versus renewal from the SAME snapshot guarded by
    // the UPDATE. Concurrent sales cannot both add an activation allowance.
    video_credits: profile.paypal_subscription_id === subscriptionId
      ? renewalBalance(profile.video_credits, PAYPAL_PLAN_CREDITS[tier]).balance
      : (profile.video_credits ?? 0) + PAYPAL_PLAN_CREDITS[tier],
    cinematic_tokens: tier === 'pro' ? 1 : 0,
  }))
}

export async function renewSubscriptionCredits(admin: Admin, userId: string, tier: PayPalTier): Promise<void> {
  await updatePaymentProfile(admin, userId, (profile) => ({
    video_credits: renewalBalance(profile.video_credits, PAYPAL_PLAN_CREDITS[tier]).balance,
    cinematic_tokens: tier === 'pro' ? 1 : 0, is_pro: true, plan: tier, has_paid: true,
  }))
}
