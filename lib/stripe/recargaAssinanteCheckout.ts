// KINEO-RECARGA-ASSINANTE-1111 [fundador 11/11: "Aprovado pode fazer" — 60 créditos por US$ 9, só para assinante que zerou]
// Checkout da RECARGA DO ASSINANTE (?pack=recarga_assinante_1111): pagamento ÚNICO pelo MESMO caminho da recarga antiga
// (buildTopupAndRedirect, desligada em KINEO-PRECO-MERCADO-0411) e do pack de sempre: price_data inline (nenhum
// Product/Price criado na Stripe), metadata.pack + metadata.pack_credits, a mesma chave de idempotência da rota, e a
// concessão no Path A do webhook (guard por sessão). Arquivo próprio porque a recarga antiga é amarrada aos SKUs velhos
// (CREDIT_TOPUPS, canPurchaseCreditTopup = fora de venda) — religá-la religaria os SKUs antigos, o que não foi pedido.
//
// O QUE ESTE ARQUIVO DECIDE NO SERVIDOR (nada vem do navegador além da volta, que é saneada):
//   · o valor e os créditos = RECARGA_ASSINANTE_1111 (lib/checkoutPricing.ts); moeda USD SEMPRE (nem IP nem ?currency=);
//   · quem compra = recargaAssinanteCheckoutAllowed(interruptor, recargaAssinanteEligible(perfil, filme mais barato)) —
//     perfil lido pela chave de serviço (plano pago sem _trial, assinatura da Stripe, saldo abaixo do filme mais barato);
//   · quem não pode (inclusive com a URL na mão, com o interruptor em 'internal' ou 'off') volta para onde estava, SEM
//     sessão da Stripe e sem evento de falha (não é falha: é recusa);
//   · a sessão vence em 30 min (o mínimo da Stripe): duas sessões abertas e pagas viram duas recargas pagas — nunca crédito
//     sem pagamento —, e a janela para isso fica curta (achado da revisão do filme de US$ 1,99, 11/11).
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { RECARGA_ASSINANTE_1111, recargaAssinanteMinFilmCredits } from '@/lib/checkoutPricing'
import {
  RECARGA_ASSINANTE_CAMPAIGN,
  RECARGA_ASSINANTE_EVENTS,
  RECARGA_ASSINANTE_1111_RELEASE,
  RECARGA_ASSINANTE_SKU,
  RECARGA_ASSINANTE_VERSION,
  recargaAssinanteBack,
  recargaAssinanteCheckoutAllowed,
  recargaAssinanteEligible,
  recargaAssinanteWithParam,
  type RecargaAssinanteProfile,
} from '@/lib/billing/recargaAssinante'

type CheckoutEventName = 'checkout_attempted' | 'checkout_auth_required' | 'checkout_started' | 'checkout_failed'

export interface RecargaAssinanteCheckoutDeps {
  recordCheckoutEvent: (name: CheckoutEventName, userId: string | null, metadata: Record<string, unknown>, sessionId?: string) => Promise<void>
  browserSessionIdFrom: (req: NextRequest) => string | undefined
  checkoutFailureReason: (msg: string) => string
  oneTimeIdempotencyKey: (parts: Record<string, unknown>) => string
}

/** Validade da sessão da Stripe: 30 min (o mínimo aceito). */
export const RECARGA_ASSINANTE_SESSION_TTL_SECONDS = 30 * 60

/** GET /api/stripe/checkout?pack=recarga_assinante_1111&back=… → sessão da Stripe (redirect) ou de volta, sem cobrança. */
export async function buildRecargaAssinanteAndRedirect(req: NextRequest, deps: RecargaAssinanteCheckoutDeps): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const back = recargaAssinanteBack(req.nextUrl.searchParams.get('back'))
  const refused = () => NextResponse.redirect(new URL(back, req.url), 303)
  // Interruptor fechado para compra ('off' ou 'internal'): nem login, nem leitura, nem evento.
  if (RECARGA_ASSINANTE_1111_RELEASE !== 'public') return refused()

  const browserSessionId = deps.browserSessionIdFrom(req)
  const unitAmount = RECARGA_ASSINANTE_1111.usdMinor
  const credits = RECARGA_ASSINANTE_1111.credits
  const skuContext: Record<string, unknown> = { sku: RECARGA_ASSINANTE_SKU, mode: 'payment', currency: 'usd', unit_amount: unitAmount, settlement_currency: 'usd', charge_amount: unitAmount, pack_credits: credits, intent_campaign: RECARGA_ASSINANTE_CAMPAIGN, version: RECARGA_ASSINANTE_VERSION }
  let failureUserId: string | null = null
  async function redirectError(msg: string) {
    await deps.recordCheckoutEvent('checkout_failed', failureUserId, { ...skuContext, stage: 'redirect', reason: deps.checkoutFailureReason(msg) }, browserSessionId)
    return NextResponse.redirect(`${appUrl}${recargaAssinanteWithParam(back, 'checkout_error', encodeURIComponent(msg))}`)
  }
  if (!process.env.STRIPE_SECRET_KEY) return redirectError('Payment service is not configured. Please contact support.')

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    await deps.recordCheckoutEvent('checkout_attempted', null, skuContext, browserSessionId)
    await deps.recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    if (req.nextUrl.searchParams.get('resumed') === '1') return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }
  failureUserId = user.id

  // Elegibilidade SÓ com a chave de serviço; qualquer leitura que falha = recusa.
  const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcUrl || !svcKey) return refused()
  const db = createAdminClient(svcUrl, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: row, error: rowErr } = await db.from('profiles').select('email, stripe_customer_id, stripe_subscription_id, plan, video_credits').eq('id', user.id).maybeSingle()
  const eligible = !rowErr && recargaAssinanteEligible(row as RecargaAssinanteProfile | null, recargaAssinanteMinFilmCredits())
  if (!recargaAssinanteCheckoutAllowed(RECARGA_ASSINANTE_1111_RELEASE, eligible)) return refused()

  const p = row as { email?: string | null; stripe_customer_id?: string | null } & RecargaAssinanteProfile
  skuContext.plan = typeof p.plan === 'string' ? p.plan : null
  skuContext.balance = typeof p.video_credits === 'number' ? p.video_credits : null
  await deps.recordCheckoutEvent('checkout_attempted', user.id, skuContext, browserSessionId)

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price_data: { currency: 'usd', product_data: { name: `Kineo — +${credits} credits`, description: `One-time payment: ${credits} credits added to your balance. Your plan stays the same.` }, unit_amount: unitAmount }, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${appUrl}${recargaAssinanteWithParam(recargaAssinanteWithParam(back, 'recarga', 'paid'), 'session_id', '{CHECKOUT_SESSION_ID}')}`,
    cancel_url: `${appUrl}${back}`,
    expires_at: Math.floor(Date.now() / 1000) + RECARGA_ASSINANTE_SESSION_TTL_SECONDS,
    metadata: {
      supabase_user_id: user.id,
      // metadata.pack é o que o webhook lê; pack_credits = o que a pessoa viu (o webhook concede pela fonte única).
      pack: RECARGA_ASSINANTE_SKU,
      pack_credits: String(credits),
      intent_campaign: RECARGA_ASSINANTE_CAMPAIGN,
      offer_version: RECARGA_ASSINANTE_VERSION,
    },
  }
  if (p?.stripe_customer_id) sessionParams.customer = p.stripe_customer_id
  else sessionParams.customer_email = p?.email ?? user.email ?? undefined

  // Um clique = no máximo uma sessão (a mesma chave devolve a mesma sessão na mesma janela de 5 min da rota).
  const key = deps.oneTimeIdempotencyKey({ sku: RECARGA_ASSINANTE_SKU, user_id: user.id, currency: 'usd', unit_amount: unitAmount, credits, contract_version: RECARGA_ASSINANTE_VERSION, success_url: sessionParams.success_url, customer: sessionParams.customer ?? null })
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
  await writeServerEvent({ name: RECARGA_ASSINANTE_EVENTS.checkoutStarted, userId: user.id, path: '/api/stripe/checkout', metadata: { stripe_session_id: session.id, campaign: RECARGA_ASSINANTE_CAMPAIGN, credits, unit_amount: unitAmount, currency: 'usd', plan: skuContext.plan ?? null, balance: skuContext.balance ?? null, version: RECARGA_ASSINANTE_VERSION } })
  return NextResponse.redirect(session.url!)
}
