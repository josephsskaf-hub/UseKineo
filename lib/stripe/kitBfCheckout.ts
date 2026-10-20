// KINEO-KIT-BF-VENDA-2010 — checkout do KIT BLACK FRIDAY (?pack=kit_bf): pagamento ÚNICO, no padrão de compra avulsa da casa (o passe do
// Studio Ads, buildAdsPassAndRedirect em app/api/stripe/checkout/route.ts): price_data inline (nenhum Product/Price criado na conta da
// Stripe), metadata.pack + metadata.pack_credits (o webhook concede pelo que a pessoa viu ao abrir a sessão), chave de idempotência por
// pessoa/valor/contrato, Brasil em reais pela fórmula da casa.
//
// O QUE ESTE ARQUIVO DECIDE NO SERVIDOR (nada vem do navegador além do ?currency= da liquidação, que a casa já aceita):
//   · o valor = KIT_BF_USD_MINOR (lib/ads/kitBfSale.ts) — query string com preço/créditos é ignorada;
//   · a janela: depois de 30/11 (KIT_BF_SALE_ENDS_AT, relógio do servidor) recusa com erro visível, nunca abre sessão;
//   · o Business NÃO compra: o kit já está incluído (os 500 créditos do mês cobrem os 10 anúncios) — recusa com a frase certa;
//   · a coluna do acesso tem de existir (mesma sonda do passe): sem ela o webhook falharia e a pessoa ficaria cobrada sem acesso.
// As funções de evento/idempotência são as da rota (injetadas): os eventos saem com os MESMOS nomes do checkout de sempre.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { resolveSettlementCurrency, settlementAmountMinor } from '@/lib/settlementCurrency'
import { ADS_ACCESS_COLUMN } from '@/lib/ads/offer'
import { KIT_BF_ACCESS_UNTIL, KIT_BF_ADS, KIT_BF_CREDITS, KIT_BF_PACK_ID, KIT_BF_USD_MINOR, KIT_BF_VERSION, kitBfIncludedInPlan, kitBfSaleOpen } from '@/lib/ads/kitBfSale'

type CheckoutEventName = 'checkout_attempted' | 'checkout_auth_required' | 'checkout_started' | 'checkout_failed'

export interface KitBfCheckoutDeps {
  recordCheckoutEvent: (name: CheckoutEventName, userId: string | null, metadata: Record<string, unknown>, sessionId?: string) => Promise<void>
  browserSessionIdFrom: (req: NextRequest) => string | undefined
  checkoutFailureReason: (msg: string) => string
  oneTimeIdempotencyKey: (parts: Record<string, unknown>) => string
  /** Relógio (o guardião congela; produção = Date.now). */
  now?: () => number
}

export const KIT_BF_MSG = {
  closed: 'The Black Friday kit sale ended on Nov 30.',
  included: 'The Black Friday kit is already included in your Business plan: your monthly credits cover it. Nothing to buy.',
  signIn: 'You must be signed in to buy the Black Friday kit.',
  notReady: 'The Black Friday kit opens soon.',
  noStripe: 'Payment service is not configured. Please contact support.',
} as const

/** GET /api/stripe/checkout?pack=kit_bf → sessão da Stripe (redirect) ou erro visível (redirect para /pricing com checkout_error). */
export async function buildKitBfAndRedirect(req: NextRequest, deps: KitBfCheckoutDeps): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const nowMs = (deps.now ?? Date.now)()
  const browserSessionId = deps.browserSessionIdFrom(req)
  let failureUserId: string | null = null
  const surfaceRaw = req.nextUrl.searchParams.get('surface') ?? ''
  // De onde veio o clique (só telemetria; nunca preço): ads | pricing.
  const skuContext: Record<string, unknown> = { sku: KIT_BF_PACK_ID, mode: 'payment', kit_version: KIT_BF_VERSION, pack_credits: KIT_BF_CREDITS, surface: surfaceRaw === 'ads' || surfaceRaw === 'pricing' ? surfaceRaw : null }
  async function redirectError(msg: string) {
    await deps.recordCheckoutEvent('checkout_failed', failureUserId, { ...skuContext, stage: 'redirect', reason: deps.checkoutFailureReason(msg) }, browserSessionId)
    return NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(msg)}#kit-bf`)
  }
  if (!kitBfSaleOpen(nowMs)) {
    skuContext.blocked = 'sale_closed'
    return redirectError(KIT_BF_MSG.closed)
  }
  if (!process.env.STRIPE_SECRET_KEY) return redirectError(KIT_BF_MSG.noStripe)

  const unitAmount = KIT_BF_USD_MINOR
  const settlement = resolveSettlementCurrency({
    ipCountry: req.headers.get('x-vercel-ip-country') ?? 'US',
    acceptLanguage: req.headers.get('accept-language'),
    forced: req.nextUrl.searchParams.get('currency'),
  })
  const chargeCurrency = settlement.currency
  const chargeAmount = settlementAmountMinor(unitAmount, chargeCurrency)
  skuContext.currency = 'usd'
  skuContext.unit_amount = unitAmount
  skuContext.settlement_currency = chargeCurrency
  skuContext.charge_amount = chargeAmount

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await deps.recordCheckoutEvent('checkout_attempted', user?.id ?? null, skuContext, browserSessionId)
  if (authError || !user) {
    await deps.recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    if (req.nextUrl.searchParams.get('resumed') === '1') return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  const { data: profile } = await supabase.from('profiles').select('email, stripe_customer_id, plan').eq('id', user.id).single()
  // O Business já tem o kit: os 500 créditos do mês cobrem os 10 anúncios. Vender de novo seria cobrar duas vezes.
  if (kitBfIncludedInPlan((profile as { plan?: unknown } | null)?.plan)) {
    skuContext.blocked = 'included_in_business'
    return redirectError(KIT_BF_MSG.included)
  }
  // Nunca cobrar antes de a coluna do acesso existir (a mesma sonda do passe, limit 0 com a chave de serviço).
  {
    const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const probe = svcUrl && svcKey
      ? await createAdminClient(svcUrl, svcKey, { auth: { persistSession: false, autoRefreshToken: false } }).from('profiles').select(ADS_ACCESS_COLUMN).limit(0)
      : { error: { code: 'no_service_key', message: 'service key missing' } }
    if (probe.error) {
      skuContext.blocked = 'migration_missing'
      return redirectError(KIT_BF_MSG.notReady)
    }
  }

  const description = `${KIT_BF_CREDITS} credits (${KIT_BF_ADS} Real product close-up ads with your offer at the Photo motion level) and Studio Ads until Dec 31, 2026. One-time payment, no subscription.`
  const p = profile as { email?: string | null; stripe_customer_id?: string | null } | null
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price_data: { currency: chargeCurrency, product_data: { name: 'Kineo — Black Friday Kit', description }, unit_amount: chargeAmount }, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${appUrl}/ads/v2?entry=product&kit=bought&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled#kit-bf`,
    metadata: {
      supabase_user_id: user.id,
      // metadata.pack é o que o webhook lê (isKitBfSession); pack_credits = o que a pessoa viu ao abrir a sessão.
      pack: KIT_BF_PACK_ID,
      pack_credits: String(KIT_BF_CREDITS),
      kit_version: KIT_BF_VERSION,
      kit_access_until: KIT_BF_ACCESS_UNTIL,
    },
  }
  if (p?.stripe_customer_id) sessionParams.customer = p.stripe_customer_id
  else sessionParams.customer_email = p?.email ?? user.email ?? undefined

  const key = deps.oneTimeIdempotencyKey({ sku: KIT_BF_PACK_ID, user_id: user.id, currency: chargeCurrency, unit_amount: chargeAmount, contract_version: KIT_BF_VERSION, description, customer: sessionParams.customer ?? null })
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: key })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.toLowerCase().includes('cannot combine currencies')) return redirectError(`Payment session failed: ${msg || 'Please try again'}`)
    delete sessionParams.customer
    sessionParams.customer_email = p?.email ?? user.email ?? undefined
    try {
      session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: `${key}:email` })
    } catch (retryErr) {
      const rmsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      return redirectError(`Payment session failed: ${rmsg || 'Please try again'}`)
    }
  }
  await deps.recordCheckoutEvent('checkout_started', user.id, { ...skuContext, stripe_session_id: session.id }, browserSessionId)
  return NextResponse.redirect(session.url!)
}
