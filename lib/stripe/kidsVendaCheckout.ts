// KINEO-KIDS-VENDA-2010 — o checkout das 2 formas PAGAS do AI Kids Cartoon Stories, no padrão da casa:
//   · ?pack=kids_pack      → pagamento ÚNICO (mode 'payment', price_data inline, metadata.pack = 'kids_pack') — o trilho do Kit BF
//                            (lib/stripe/kitBfCheckout.ts); o webhook (Path A) grava o pedido e NÃO concede crédito nenhum;
//   · ?pack=kids_autopilot → ASSINATURA mensal (mode 'subscription', price_data inline com `recurring`, como todo plano da casa:
//                            nenhum Product/Price criado no painel da Stripe) com metadata.kids_product na sessão E na assinatura
//                            (subscription_data.metadata), que é o que invoice.payment_succeeded / subscription.* leem depois.
// O QUE O SERVIDOR DECIDE: o valor (lib/kidsVenda/kidsVenda.ts KIDS_PRICES — a query string com preço é ignorada), a moeda
// (Brasil em reais pela fórmula da casa), o interruptor (KIDS_SALES_LIVE; a conta da casa passa para testar), a série
// (personagem/língua/tema validados; tema fere a regra infantil = recusa) e "um piloto por conta" (2ª assinatura recusada).
// As funções de evento/idempotência são as da rota (injetadas, como no Kit BF): os eventos saem com os nomes do checkout de sempre.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { isInternalEmail } from '@/lib/internalAccounts'
import { resolveSettlementCurrency, settlementAmountMinor } from '@/lib/settlementCurrency'
import type { KitBfCheckoutDeps } from '@/lib/stripe/kitBfCheckout'
import { KIDS_CARTOON_TEMPLATE_PATH, kidsCharacter } from '@/lib/kidsCartoon/kidsCartoon'
import {
  KIDS_AUTOPILOT_ID, KIDS_PACK_ID, KIDS_PRICES, KIDS_PRODUCT_META_KEY, KIDS_SALES_OPEN_FOR_PUBLIC, KIDS_VENDA_DURATION, KIDS_VENDA_VERSION, KIDS_VIDEOS,
  kidsSalesOpen, validateKidsSeriesRequest,
} from '@/lib/kidsVenda/kidsVenda'
import { kidsActiveAutopilotExists, kidsServiceClient } from '@/lib/kidsVenda/server'

export type KidsVendaCheckoutDeps = KitBfCheckoutDeps

export const KIDS_CHECKOUT_MSG = {
  closed: 'Kids cartoon plans open soon.',
  signIn: 'You must be signed in to buy a kids cartoon plan.',
  notReady: 'Kids cartoon plans open soon.',
  noStripe: 'Payment service is not configured. Please contact support.',
  hasAutopilot: 'You already have a kids cartoon channel on autopilot. Manage it from the kids cartoon page.',
} as const

/** GET /api/stripe/checkout?pack=kids_pack|kids_autopilot&character=&language=&theme= → sessão da Stripe (redirect) ou erro visível. */
export async function buildKidsVendaAndRedirect(req: NextRequest, deps: KidsVendaCheckoutDeps): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const browserSessionId = deps.browserSessionIdFrom(req)
  const packParam = req.nextUrl.searchParams.get('pack')
  const kind: 'autopilot' | 'pack' = packParam === KIDS_AUTOPILOT_ID ? 'autopilot' : 'pack'
  const sku = kind === 'autopilot' ? KIDS_AUTOPILOT_ID : KIDS_PACK_ID
  const price = KIDS_PRICES[kind]
  let failureUserId: string | null = null
  const skuContext: Record<string, unknown> = { sku, mode: kind === 'autopilot' ? 'subscription' : 'payment', kids_version: KIDS_VENDA_VERSION, videos: KIDS_VIDEOS[kind] }
  async function redirectError(msg: string) {
    await deps.recordCheckoutEvent('checkout_failed', failureUserId, { ...skuContext, stage: 'redirect', reason: deps.checkoutFailureReason(msg) }, browserSessionId)
    return NextResponse.redirect(`${appUrl}${KIDS_CARTOON_TEMPLATE_PATH}?checkout_error=${encodeURIComponent(msg)}#plans`)
  }
  if (!process.env.STRIPE_SECRET_KEY) return redirectError(KIDS_CHECKOUT_MSG.noStripe)

  // a série vem da URL mas é VALIDADA aqui (lista fechada + regra infantil); o preço nunca vem da URL
  const series = validateKidsSeriesRequest({ character: req.nextUrl.searchParams.get('character') ?? '', language: req.nextUrl.searchParams.get('language') ?? '', theme: req.nextUrl.searchParams.get('theme') ?? '' })
  if (!series.ok) { skuContext.blocked = `series_${series.field}`; return redirectError(series.error) }

  const unitAmount = price.usdMinor
  const settlement = resolveSettlementCurrency({ ipCountry: req.headers.get('x-vercel-ip-country') ?? 'US', acceptLanguage: req.headers.get('accept-language'), forced: req.nextUrl.searchParams.get('currency') })
  const chargeCurrency = settlement.currency
  const chargeAmount = settlementAmountMinor(unitAmount, chargeCurrency)
  Object.assign(skuContext, { currency: price.currency, unit_amount: unitAmount, settlement_currency: chargeCurrency, charge_amount: chargeAmount, character: series.value.character, language: series.value.language })

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
  // o interruptor: desligado, só a conta da casa passa (para o fundador testar o checkout antes de virar)
  if (!kidsSalesOpen(KIDS_SALES_OPEN_FOR_PUBLIC, isInternalEmail(user.email))) { skuContext.blocked = 'sales_closed'; return redirectError(KIDS_CHECKOUT_MSG.closed) }

  const { data: profile } = await supabase.from('profiles').select('email, stripe_customer_id').eq('id', user.id).single()
  const p = profile as { email?: string | null; stripe_customer_id?: string | null } | null
  // a tabela precisa existir (migration 2026-10-20_kids_venda.sql): sem ela o webhook falharia e a pessoa ficaria cobrada sem pedido
  const svc = kidsServiceClient()
  const probe = svc ? await svc.from('kids_orders').select('id').limit(0) : { error: { message: 'service key missing' } }
  if (probe.error) { skuContext.blocked = 'migration_missing'; return redirectError(KIDS_CHECKOUT_MSG.notReady) }
  if (kind === 'autopilot' && svc) {
    const has = await kidsActiveAutopilotExists(svc, user.id)
    if (has === null) { skuContext.blocked = 'read_failed'; return redirectError(KIDS_CHECKOUT_MSG.notReady) }
    if (has) { skuContext.blocked = 'has_autopilot'; return redirectError(KIDS_CHECKOUT_MSG.hasAutopilot) }
  }

  const character = kidsCharacter(series.value.character)
  const who = `${character?.name ?? 'Leo'}${series.value.theme ? ` · ${series.value.theme}` : ''}`
  const description = kind === 'autopilot'
    ? `AI Kids Cartoon channel on autopilot: 1 narrated 3D cartoon episode a day (${KIDS_VIDEOS.autopilot}/month from your sign-up date, ${KIDS_VENDA_DURATION}s each) with the same character — ${who}. Title, caption and hashtags included. Cancel anytime.`
    : `AI Kids Cartoon pack: ${KIDS_VIDEOS.pack} narrated 3D cartoon episodes (${KIDS_VENDA_DURATION}s each) with the same character — ${who}, made in a queue over a few hours. One-time payment, no subscription.`
  const metadata: Record<string, string> = {
    supabase_user_id: user.id,
    [KIDS_PRODUCT_META_KEY]: sku,
    kids_version: KIDS_VENDA_VERSION,
    kids_character: series.value.character,
    kids_language: series.value.language,
    kids_theme: series.value.theme.slice(0, 120),
    kids_videos: String(KIDS_VIDEOS[kind]),
  }
  if (kind === 'pack') metadata.pack = KIDS_PACK_ID // metadata.pack é o que o Path A lê (isKidsPackSession); pack_credits NÃO vai: nada é creditado
  const success = `${appUrl}${KIDS_CARTOON_TEMPLATE_PATH}?bought=${kind}&session_id={CHECKOUT_SESSION_ID}#my-episodes`
  const cancel = `${appUrl}${KIDS_CARTOON_TEMPLATE_PATH}?checkout=cancelled#plans`
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    price_data: {
      currency: chargeCurrency,
      product_data: { name: kind === 'autopilot' ? 'Kineo — Kids Cartoon Channel (autopilot)' : 'Kineo — Kids Cartoon Pack (30 episodes)', description },
      unit_amount: chargeAmount,
      ...(kind === 'autopilot' ? { recurring: { interval: 'month' as const } } : {}),
    },
    quantity: 1,
  }
  const sessionParams: Stripe.Checkout.SessionCreateParams = kind === 'autopilot'
    ? { mode: 'subscription', line_items: [lineItem], client_reference_id: user.id, success_url: success, cancel_url: cancel, metadata, subscription_data: { metadata } }
    : { mode: 'payment', line_items: [lineItem], client_reference_id: user.id, success_url: success, cancel_url: cancel, metadata }
  if (p?.stripe_customer_id) sessionParams.customer = p.stripe_customer_id
  else sessionParams.customer_email = p?.email ?? user.email ?? undefined

  const key = deps.oneTimeIdempotencyKey({ sku, user_id: user.id, currency: chargeCurrency, unit_amount: chargeAmount, contract_version: KIDS_VENDA_VERSION, description, customer: sessionParams.customer ?? null, character: series.value.character, language: series.value.language, theme: series.value.theme })
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
