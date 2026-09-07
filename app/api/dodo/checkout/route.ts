// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DODO-2026-09-07 — /api/dodo/checkout: a porta de pagamento UPI/Pix
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE (medido 07/09, 30d, por pessoa): 40 pessoas de Índia/Nigéria/
// Paquistão/Bangladesh/Quênia abriram a página da Stripe e 0 pagaram; nos
// EUA+BR+GB foram 17 no checkout e 3 pagamentos. Cartão indiano recusa mandato
// recorrente internacional; a Stripe não faz UPI para comerciante fora da
// Índia. Esta rota cria uma sessão hospedada na Dodo Payments (merchant of
// record) e manda a pessoa para lá — a Dodo mostra UPI/RuPay na Índia, Pix no
// Brasil, cartão em todo lugar, cobrando INR/BRL na tela e USD para nós.
//
// NASCE DESLIGADA. Sem `DODO_API_KEY(_TEST)` ou sem o id do produto, responde
// 503 com o NOME da env que falta (nunca o valor) e grava
// `dodo_checkout_unavailable`. Nunca 500, nunca toca a Stripe.
//
// MODO DE TESTE = SÓ CONTAS INTERNAS. Chave de teste aceita cartão de teste e
// paga com dinheiro de brinquedo; se o público pudesse usar, ganharia crédito
// de graça. Com `DODO_MODE=live` + `DODO_API_KEY`, abre para todo mundo.
//
// Uso: GET /api/dodo/checkout?tier=starter|creator|studio  (link direto,
//      redirect 307 para a página hospedada — mesmo padrão iOS-safe da Stripe)
//      GET /api/dodo/checkout?pack=first_pack             (pacote único $4,90)
//      POST idem no corpo JSON → { url, session_id }
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  DodoCheckoutError,
  createDodoCheckout,
  dodoMissingEnvFor,
  dodoMode,
  isDodoEnabled,
  isDodoSku,
  type DodoSku,
} from '@/lib/dodo'
import {
  DODO_SKU_TO_TIER,
  dodoSkuCheckoutMode,
  dodoSkuCredits,
  dodoSkuPriceMinorUsd,
  isDodoSubscriptionSku,
} from '@/lib/dodoCatalog'
import { isInternalEmail } from '@/lib/internalAccounts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DodoCheckoutEventName =
  | 'dodo_checkout_unavailable'
  | 'dodo_checkout_started'
  | 'dodo_checkout_failed'

async function recordDodoEvent(
  name: DodoCheckoutEventName,
  userId: string | null,
  metadata: Record<string, unknown>,
  sessionId?: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    const admin = createAdminClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await admin.from('events').insert({
      name,
      user_id: userId,
      path: '/api/dodo/checkout',
      session_id: sessionId ?? null,
      metadata,
    })
    if (error) console.error('[dodo/checkout] event insert failed:', name, error.code, error.message)
  } catch (error) {
    console.error('[dodo/checkout] event insert threw:', name, error)
  }
}

function browserSessionIdFrom(req: NextRequest): string | undefined {
  const raw = req.cookies.get('kineo_event_session_id')?.value ?? ''
  return /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : undefined
}

/** Espelho reduzido de isSpeculativeRequest da rota Stripe: prefetch não é compra. */
function isSpeculativeRequest(req: NextRequest): boolean {
  const h = req.headers
  const secPurpose = (h.get('sec-purpose') ?? '').toLowerCase()
  if (secPurpose.includes('prefetch') || secPurpose.includes('prerender')) return true
  if ((h.get('purpose') ?? '').toLowerCase() === 'prefetch') return true
  if ((h.get('x-purpose') ?? '').toLowerCase() === 'preview') return true
  if ((h.get('x-moz') ?? '').toLowerCase() === 'prefetch') return true
  return false
}

/** `?tier=` aceita os nomes da Dodo E os da casa (basic→creator, pro→studio). */
function resolveSku(tierRaw: string | null, packRaw: string | null): DodoSku | null {
  if (packRaw) {
    return packRaw === 'first_pack' || packRaw === 'starter' ? 'first_pack' : null
  }
  if (!tierRaw) return null
  if (tierRaw === 'basic') return 'creator'
  if (tierRaw === 'pro') return 'studio'
  return isDodoSku(tierRaw) && tierRaw !== 'first_pack' ? tierRaw : null
}

async function readPostSelection(req: NextRequest): Promise<{ tier: string | null; pack: string | null }> {
  try {
    const body = (await req.json()) as Record<string, unknown> | null
    return {
      tier: typeof body?.tier === 'string' ? body.tier : null,
      pack: typeof body?.pack === 'string' ? body.pack : null,
    }
  } catch {
    return { tier: null, pack: null }
  }
}

async function handle(req: NextRequest, isGet: boolean): Promise<NextResponse> {
  const selection = isGet
    ? { tier: req.nextUrl.searchParams.get('tier'), pack: req.nextUrl.searchParams.get('pack') }
    : await readPostSelection(req)
  const sku = resolveSku(selection.tier, selection.pack)
  const country = req.headers.get('x-vercel-ip-country') ?? 'US'
  const mode = dodoMode()
  const browserSessionId = browserSessionIdFrom(req)
  const appUrl = req.nextUrl.origin

  if (isSpeculativeRequest(req)) {
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!sku) {
    return NextResponse.json(
      { error: 'Unknown product. Use tier=starter|creator|studio or pack=first_pack' },
      { status: 400 },
    )
  }

  // ── Portão 1: o trilho existe? (a ÚNICA pergunta é isDodoEnabled) ─────────
  // Sem chave para o modo corrente, ou sem o id do produto, o trilho está
  // desligado. 503 (não 500): é estado esperado, não defeito; a resposta diz
  // QUAL env falta pelo nome, para o fundador colar na Vercel.
  const enabled = isDodoEnabled()
  const missingEnv = dodoMissingEnvFor(sku)
  if (!enabled || missingEnv.length > 0) {
    await recordDodoEvent(
      'dodo_checkout_unavailable',
      null,
      { sku, mode, ip_country: country, reason: enabled ? 'product_env_missing' : 'api_key_missing', missing_env: missingEnv },
      browserSessionId,
    )
    return NextResponse.json(
      {
        error: 'This payment method is not available yet.',
        rail: 'dodo',
        mode,
        missing_env: missingEnv,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // ── Portão 2: quem compra ──────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (!isGet) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
    // Espelho do checkout da Stripe: manda para o cadastro carregando a URL
    // inteira da compra, com trava anti-loop `resumed=1`.
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return NextResponse.redirect(`${appUrl}/pricing?error=auth`)
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/signup?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  // ── Portão 3: modo de teste é só para contas internas ─────────────────────
  if (mode === 'test' && !isInternalEmail(user.email)) {
    await recordDodoEvent(
      'dodo_checkout_unavailable',
      user.id,
      { sku, mode, ip_country: country, reason: 'test_mode_internal_only', missing_env: [] },
      browserSessionId,
    )
    return NextResponse.json(
      { error: 'This payment method is not available yet.', rail: 'dodo', mode, missing_env: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const tier = isDodoSubscriptionSku(sku) ? DODO_SKU_TO_TIER[sku] : null
  const credits = dodoSkuCredits(sku)
  const priceMinor = dodoSkuPriceMinorUsd(sku)

  try {
    const session = await createDodoCheckout({
      sku,
      customer: { email: user.email ?? '', name: (user.user_metadata?.full_name as string | undefined) ?? null },
      returnUrl: `${appUrl}/checkout/success?success=true&rail=dodo&sku=${sku}${tier ? `&tier=${tier}` : '&pack=starter'}&currency=usd&amount=${priceMinor}`,
      cancelUrl: `${appUrl}/checkout/cancelled?rail=dodo${tier ? `&tier=${tier}` : '&pack=starter'}&billing=monthly&currency=usd`,
      // SÓ strings: a Dodo devolve isto no webhook e é por aqui que o crédito
      // acha a conta certa. `pack_credits` é informativo — o webhook concede
      // pelo catálogo (lib/dodoCatalog → checkoutPricing), nunca pelo metadata.
      metadata: {
        supabase_user_id: user.id,
        sku,
        tier: tier ?? '',
        pack: tier ? '' : 'starter',
        pack_credits: String(credits),
        ip_country: country,
        mode,
        browser_session_id: browserSessionId ?? '',
      },
    })

    await recordDodoEvent(
      'dodo_checkout_started',
      user.id,
      {
        sku,
        tier,
        pack: tier ? null : 'starter',
        session_id: session.sessionId,
        dodo_session_id: session.sessionId,
        ip_country: country,
        mode,
        checkout_mode: dodoSkuCheckoutMode(sku),
        amount_total: priceMinor,
        currency: 'usd',
        credits,
      },
      browserSessionId,
    )

    if (isGet) {
      return NextResponse.redirect(session.checkoutUrl, { status: 307 })
    }
    return NextResponse.json({ url: session.checkoutUrl, session_id: session.sessionId, mode })
  } catch (error) {
    const typed = error instanceof DodoCheckoutError ? error : null
    // O corpo de erro do fornecedor pode ecoar dados do cliente: só código e status.
    console.error('[dodo/checkout] session creation failed:', typed?.code ?? 'unknown', typed?.status ?? 0)
    await recordDodoEvent(
      'dodo_checkout_failed',
      user.id,
      { sku, tier, mode, ip_country: country, reason: typed?.code ?? 'unexpected', provider_status: typed?.status ?? null },
      browserSessionId,
    )
    if (isGet) {
      return NextResponse.redirect(`${appUrl}/pricing?error=dodo_unavailable`)
    }
    return NextResponse.json(
      { error: 'Could not start the payment. Please try again.', rail: 'dodo' },
      { status: typed?.status && typed.status >= 500 ? 502 : 503 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handle(req, true)
  } catch (error) {
    console.error('[dodo/checkout GET] unexpected error', error instanceof Error ? error.message : '')
    return NextResponse.redirect(`${req.nextUrl.origin}/pricing?error=dodo_unavailable`)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req, false)
  } catch (error) {
    console.error('[dodo/checkout POST] unexpected error', error instanceof Error ? error.message : '')
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 503 })
  }
}
