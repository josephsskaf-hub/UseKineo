// KINEO-COMPRA-AVULSA-2410 — Stripe-hosted, server-priced one-time item checkout. Never accepts a browser price/grant.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { adsPassLive } from '@/lib/ads/offer'
import { resolveSettlementCurrency, settlementAmountMinor } from '@/lib/settlementCurrency'
import { getOneTimeItem, isOneTimeItemId, ONE_TIME_ITEMS_LIVE, ONE_TIME_ITEM_VERSION, oneTimeItemContractReady, oneTimeItemOrderId, oneTimeItemSurface } from '@/lib/oneTimeItem'
import type { KitBfCheckoutDeps } from '@/lib/stripe/kitBfCheckout'

export async function buildOneTimeItemAndRedirect(req: NextRequest, deps: KitBfCheckoutDeps): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const pack = req.nextUrl.searchParams.get('pack')
  const browserSessionId = deps.browserSessionIdFrom(req)
  let userId: string | null = null
  const context: Record<string, unknown> = { sku: pack, mode: 'payment', one_time_item_version: ONE_TIME_ITEM_VERSION, surface: oneTimeItemSurface(req.nextUrl.searchParams.get('surface')) }
  async function fail(message: string, reason: string) {
    await deps.recordCheckoutEvent('checkout_failed', userId, { ...context, reason }, browserSessionId)
    return NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(message)}#one-time-items`)
  }
  if (!isOneTimeItemId(pack)) return fail('This single item is unavailable. Please choose an item again.', 'invalid_one_time_item')
  if (!ONE_TIME_ITEMS_LIVE || !oneTimeItemContractReady()) return fail('Single-item purchases are temporarily unavailable. Nothing was charged.', 'one_time_item_unavailable')
  if (pack === 'one_time_ad' && !adsPassLive()) return fail('Studio Ads is temporarily unavailable. Nothing was charged.', 'ads_unavailable')
  if (!process.env.STRIPE_SECRET_KEY) return fail('Payment service is not configured. Please contact support.', 'stripe_unavailable')
  const item = getOneTimeItem(pack)
  const settlement = resolveSettlementCurrency({ ipCountry: req.headers.get('x-vercel-ip-country'), acceptLanguage: req.headers.get('accept-language'), forced: req.nextUrl.searchParams.get('currency') })
  const amount = settlementAmountMinor(item.usdMinor, settlement.currency)
  Object.assign(context, { currency: 'usd', unit_amount: item.usdMinor, settlement_currency: settlement.currency, charge_amount: amount, pack_credits: item.credits })
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  userId = user?.id ?? null
  await deps.recordCheckoutEvent('checkout_attempted', userId, context, browserSessionId)
  if (authError || !user) {
    await deps.recordCheckoutEvent('checkout_auth_required', null, context, browserSessionId)
    if (req.nextUrl.searchParams.get('resumed') === '1') return fail('We could not confirm your sign-in. Please sign in and try again.', 'auth_unconfirmed')
    const resumeUrl = new URL(req.url)
    resumeUrl.searchParams.set('resumed', '1')
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resumeUrl.pathname + resumeUrl.search)}`)
  }
  const profileResult = await supabase.from('profiles').select('email, stripe_customer_id').eq('id', user.id).single()
  if (profileResult.error || !profileResult.data) return fail('We could not load your account. Please try again. Nothing was charged.', 'profile_unavailable')
  const profile = profileResult.data as { email?: string | null; stripe_customer_id?: string | null }
  // The migration is atomic: its receipt table and RPC become available together. Never sell before the grant exists.
  const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcUrl || !svcKey) return fail('Single-item purchases open soon. Nothing was charged.', 'grant_unavailable')
  const admin = createAdminClient(svcUrl, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const probes = await Promise.all([
    admin.from('one_time_item_purchases').select('stripe_session_id').limit(0),
    admin.from('profiles').select('id,video_credits,has_paid,ads_access_until').limit(0),
    admin.from('events').select('name,user_id,session_id,path,metadata').limit(0),
    admin.from('stripe_events').select('id').limit(0),
  ])
  if (probes.some(probe => probe.error)) return fail('Single-item purchases open soon. Nothing was charged.', 'grant_unavailable')
  const orderRaw = req.nextUrl.searchParams.get('order')
  const orderId = oneTimeItemOrderId(orderRaw)
  if (orderRaw && (pack !== 'one_time_ad' || !orderId)) return fail('Please return to your ad and try again. Nothing was charged.', 'invalid_order')
  if (orderId) {
    const order = await admin.from('ads_v2_orders').select('id, tier, seconds').eq('id', orderId).eq('user_id', user.id).maybeSingle()
    if (order.error || !order.data || order.data.tier !== 'commercial' || order.data.seconds !== 15) return fail('We could not confirm this ad belongs to your account. Nothing was charged.', 'order_unavailable')
  }
  // The browser may return before the webhook. Wait for THIS user's receipt before entering a gated studio.
  const success = new URL('/checkout/item', appUrl)
  success.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')
  const metadata: Record<string, string> = { supabase_user_id: user.id, pack: pack, pack_credits: String(item.credits), one_time_item_version: ONE_TIME_ITEM_VERSION, surface: String(context.surface) }
  if (browserSessionId) metadata.browser_session_id = browserSessionId.slice(0, 64)
  if (orderId) metadata.order_id = orderId
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price_data: { currency: settlement.currency, unit_amount: amount, product_data: { name: `Kineo — ${item.label}`, description: item.description } }, quantity: 1 }],
    client_reference_id: user.id,
    success_url: success.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}'),
    cancel_url: `${appUrl}${orderId ? `/ads/v2?mode=simple&order=${orderId}&checkout=cancelled` : '/pricing?checkout=cancelled#one-time-items'}`,
    metadata,
  }
  if (profile.stripe_customer_id) params.customer = profile.stripe_customer_id
  else params.customer_email = user.email ?? profile.email ?? undefined
  const key = deps.oneTimeIdempotencyKey({ sku: pack, user_id: user.id, currency: settlement.currency, unit_amount: amount, credits: item.credits, contract_version: ONE_TIME_ITEM_VERSION, order_id: orderId, surface: context.surface, browser_session_id: metadata.browser_session_id ?? null, customer: params.customer ?? null, email: params.customer_email ?? null, success_url: params.success_url, cancel_url: params.cancel_url })
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(params, { idempotencyKey: key })
  } catch (error) {
    // Same currency-recovery policy as Kit BF. Raw provider errors never become public messages or analytics.
    if (!(error instanceof Error) || !error.message.toLowerCase().includes('cannot combine currencies')) return fail('We could not open payment. Please try again. Nothing was charged.', 'session_failed')
    delete params.customer
    params.customer_email = user.email ?? profile.email ?? undefined
    try { session = await stripe.checkout.sessions.create(params, { idempotencyKey: `${key}:email` }) }
    catch { return fail('We could not open payment. Please try again. Nothing was charged.', 'session_failed') }
  }
  if (!session.url) return fail('We could not open payment. Please try again. Nothing was charged.', 'session_url_missing')
  await deps.recordCheckoutEvent('checkout_started', user.id, { ...context, stripe_session_id: session.id }, browserSessionId)
  return NextResponse.redirect(session.url)
}
