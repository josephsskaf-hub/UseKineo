// KINEO-REGIAO-FILME-199-1011 [fundador 10/11: "1.99 1 filme!"] — checkout do FILME DE 15 s POR US$ 1,99
// (?pack=region_film_199): pagamento ÚNICO, no padrão de compra avulsa da casa (lib/stripe/kitBfCheckout.ts e o pack de
// sempre, buildPackAndRedirect): price_data inline (nenhum Product/Price criado na conta da Stripe), metadata.pack +
// metadata.pack_credits, chave de idempotência por pessoa/valor/contrato.
//
// O QUE ESTE ARQUIVO DECIDE NO SERVIDOR (nada vem do navegador):
//   · o valor = REGIAO_FILME_199_PRICE_MINOR.usd e os créditos = regiaoFilme199Credits() (lib/checkoutPricing.ts);
//   · a moeda = USD SEMPRE (nem o país do IP nem ?currency= mudam a cobrança deste SKU);
//   · quem compra = regiaoFilme199CheckoutAllowed(interruptor, regiaoFilme199Eligible(perfil, compra anterior)) — perfil
//     lido pela chave de serviço (país do PERFIL, has_paid comprovado, plano grátis) + nenhum evento region_film_199_paid;
//   · quem não pode (inclusive com a URL na mão, inclusive com o interruptor em 'internal' ou 'off') vai para o /pricing
//     normal, SEM sessão da Stripe e sem evento de falha de checkout (não é falha: é recusa).
// As funções de evento/idempotência são as da rota (injetadas): os eventos saem com os MESMOS nomes do checkout de sempre.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { REGIAO_FILME_199_PRICE_MINOR, REGIAO_FILME_199_SECONDS, regiaoFilme199Credits } from '@/lib/checkoutPricing'
import {
  REGIAO_FILME_199_CAMPAIGN,
  REGIAO_FILME_199_CANCEL_PATH,
  REGIAO_FILME_199_EVENTS,
  REGIAO_FILME_199_REFUSED_PATH,
  REGIAO_FILME_199_RELEASE,
  REGIAO_FILME_199_SKU,
  REGIAO_FILME_199_SUCCESS_PATH,
  REGIAO_FILME_199_VERSION,
  regiaoFilme199CheckoutAllowed,
  regiaoFilme199Country,
  regiaoFilme199Eligible,
  regiaoFilme199ProvaDe,
  REGIAO_FILME_199_REGION_EVENT,
  type RegiaoFilme199Profile,
  type RegiaoFilme199Prova,
} from '@/lib/growth/regiaoFilme199'

/** KINEO-REGIAO-FILME-199-TRAVA-1111 — a prova de servidor (eventos que o navegador não escreve): o carimbo de região do
 *  cadastro e se já houve QUALQUER pagamento ou compra deste SKU. Lida pela faixa do /pricing e pelo checkout. Leitura que
 *  falha = null = não elegível. */
type EventsReader = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any
export async function lerProvaRegiaoFilme199(db: EventsReader, userId: string): Promise<RegiaoFilme199Prova | null> {
  try {
    const [pagos, regiao] = await Promise.all([
      db.from('events').select('id').eq('user_id', userId).in('name', ['payment_success', REGIAO_FILME_199_EVENTS.paid]).limit(1),
      db.from('events').select('metadata').eq('user_id', userId).eq('name', REGIAO_FILME_199_REGION_EVENT).order('created_at', { ascending: true }).limit(1),
    ])
    if (pagos?.error || regiao?.error) return null
    return regiaoFilme199ProvaDe(Array.isArray(regiao?.data) ? regiao.data[0] : null, pagos?.data)
  } catch {
    return null
  }
}

type CheckoutEventName = 'checkout_attempted' | 'checkout_auth_required' | 'checkout_started' | 'checkout_failed'

export interface RegiaoFilme199CheckoutDeps {
  recordCheckoutEvent: (name: CheckoutEventName, userId: string | null, metadata: Record<string, unknown>, sessionId?: string) => Promise<void>
  browserSessionIdFrom: (req: NextRequest) => string | undefined
  checkoutFailureReason: (msg: string) => string
  oneTimeIdempotencyKey: (parts: Record<string, unknown>) => string
}

/** GET /api/stripe/checkout?pack=region_film_199 → sessão da Stripe (redirect) ou o /pricing normal. */
export async function buildRegiaoFilme199AndRedirect(req: NextRequest, deps: RegiaoFilme199CheckoutDeps): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const refused = () => NextResponse.redirect(new URL(REGIAO_FILME_199_REFUSED_PATH, req.url), 303)
  // Interruptor fechado para compra ('off' ou 'internal'): nem login, nem leitura, nem evento.
  if (REGIAO_FILME_199_RELEASE !== 'public') return refused()

  const browserSessionId = deps.browserSessionIdFrom(req)
  const unitAmount = REGIAO_FILME_199_PRICE_MINOR.usd
  const credits = regiaoFilme199Credits()
  const skuContext: Record<string, unknown> = { sku: REGIAO_FILME_199_SKU, mode: 'payment', currency: 'usd', unit_amount: unitAmount, settlement_currency: 'usd', charge_amount: unitAmount, pack_credits: credits, intent_campaign: REGIAO_FILME_199_CAMPAIGN, version: REGIAO_FILME_199_VERSION }
  let failureUserId: string | null = null
  async function redirectError(msg: string) {
    await deps.recordCheckoutEvent('checkout_failed', failureUserId, { ...skuContext, stage: 'redirect', reason: deps.checkoutFailureReason(msg) }, browserSessionId)
    return NextResponse.redirect(`${appUrl}${REGIAO_FILME_199_CANCEL_PATH}&checkout_error=${encodeURIComponent(msg)}`)
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

  // Elegibilidade SÓ com a chave de serviço (o perfil e o livro de eventos); qualquer leitura que falha = recusa.
  const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcUrl || !svcKey) return refused()
  const db = createAdminClient(svcUrl, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: row, error: rowErr } = await db.from('profiles').select('email, stripe_customer_id, trial_status, has_paid, plan, signup_country, last_country').eq('id', user.id).maybeSingle()
  const prova = await lerProvaRegiaoFilme199(db, user.id) // KINEO-REGIAO-FILME-199-TRAVA-1111 — o perfil sozinho é editável pelo navegador
  const eligible = !rowErr && regiaoFilme199Eligible(row as RegiaoFilme199Profile | null, prova)
  if (!regiaoFilme199CheckoutAllowed(REGIAO_FILME_199_RELEASE, eligible)) return refused()

  const p = row as { email?: string | null; stripe_customer_id?: string | null } & RegiaoFilme199Profile
  skuContext.country = regiaoFilme199Country(p)
  await deps.recordCheckoutEvent('checkout_attempted', user.id, skuContext, browserSessionId)

  const description = `One ${REGIAO_FILME_199_SECONDS}-second film from your idea (${credits} credits). One-time payment, no subscription.`
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Kineo — One film', description }, unit_amount: unitAmount }, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${appUrl}${REGIAO_FILME_199_SUCCESS_PATH}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}${REGIAO_FILME_199_CANCEL_PATH}`,
    metadata: {
      supabase_user_id: user.id,
      // metadata.pack é o que o webhook lê; pack_credits = o que a pessoa viu (o webhook concede pela fonte única).
      pack: REGIAO_FILME_199_SKU,
      pack_credits: String(credits),
      intent_campaign: REGIAO_FILME_199_CAMPAIGN,
      offer_version: REGIAO_FILME_199_VERSION,
    },
  }
  if (p?.stripe_customer_id) sessionParams.customer = p.stripe_customer_id
  else sessionParams.customer_email = p?.email ?? user.email ?? undefined

  // Um clique = no máximo uma sessão (a mesma chave devolve a mesma sessão por 24 h na Stripe).
  const key = deps.oneTimeIdempotencyKey({ sku: REGIAO_FILME_199_SKU, user_id: user.id, currency: 'usd', unit_amount: unitAmount, credits, contract_version: REGIAO_FILME_199_VERSION, success_url: sessionParams.success_url, customer: sessionParams.customer ?? null })
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
  await writeServerEvent({ name: REGIAO_FILME_199_EVENTS.checkoutStarted, userId: user.id, path: '/api/stripe/checkout', metadata: { stripe_session_id: session.id, campaign: REGIAO_FILME_199_CAMPAIGN, credits, unit_amount: unitAmount, currency: 'usd', country: skuContext.country ?? null, version: REGIAO_FILME_199_VERSION } })
  return NextResponse.redirect(session.url!)
}
