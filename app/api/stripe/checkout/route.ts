import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { OFFER_290_ENABLED } from '@/lib/flags'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { paypalFetch } from '@/lib/paypal'
import {
  ANNUAL_PRICES,
  AUTOPILOT_PILOT_CREDITS,
  AUTOPILOT_PILOT_DAYS,
  AUTOPILOT_PILOT_PRICES,
  AUTOPILOT_PRICES,
  BULK_PACKS,
  INTRO_CREDITS,
  INTRO_PRICES,
  PACK_CREDITS,
  TIER_CREDITS,
  TIER_PRICES,
  TOPUP_CREDITS,
  isBulkPackId,
  monthlyPriceMinor,
  resolveCheckoutCurrency,
  type BulkPackId,
  type CheckoutCurrency as Currency,
  type CheckoutIntroTier as IntroTier,
  type CheckoutPlanTier as PlanTier,
} from '@/lib/checkoutPricing'
// KINEO-PILOT-99-2026-07-26 — plan name + expiry math shared with the cron.
import { AUTOPILOT_PILOT_PLAN, isAutopilotEntitled } from '@/lib/autopilot/config'

// Push #175 — force-dynamic so Next.js never tries to statically cache this
// route. Without this, the GET handler could be pre-rendered at build time
// and fail to read Supabase auth cookies on every request.
export const dynamic = 'force-dynamic'

const CHECKOUT_RESUME_SESSION_COOKIE = 'kineo_checkout_session'
const CHECKOUT_RESUME_DISMISSED_COOKIE = 'kineo_checkout_resume_dismissed'
const CHECKOUT_RESUME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function rememberRecurringCheckout(response: NextResponse, sessionId: string): NextResponse {
  // Store only Stripe's opaque Session id. All ownership, price and plan data
  // are reloaded from Stripe by the authenticated resume endpoint.
  response.cookies.set({
    name: CHECKOUT_RESUME_SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: CHECKOUT_RESUME_MAX_AGE_SECONDS,
  })
  // A newly created purchase intent supersedes a previous dismissal.
  response.cookies.set({
    name: CHECKOUT_RESUME_DISMISSED_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

function isPrivatePackPromotion(raw: string): boolean {
  return raw.toUpperCase().startsWith('KINEO5-')
}

function isStripeResourceMissing(error: unknown): boolean {
  const stripeError = error as { code?: string; type?: string; statusCode?: number } | null
  return stripeError?.code === 'resource_missing' ||
    (stripeError?.type === 'StripeInvalidRequestError' && stripeError?.statusCode === 404)
}

function isMissingStripeCustomer(error: unknown): boolean {
  const stripeError = error as { code?: string; param?: string; message?: string; statusCode?: number } | null
  if (!isStripeResourceMissing(error)) return false
  return stripeError?.param === 'customer' || /no such customer/i.test(stripeError?.message ?? '')
}

// KINEO-RECOVERY-2026-07-15 — checkout telemetry is written server-side so
// the immediate navigation to Stripe cannot cancel it. This also records the
// anonymous auth wall, which client-only click tracking could never see.
async function recordCheckoutEvent(
  name:
    | 'checkout_attempted'
    | 'checkout_auth_required'
    | 'checkout_started'
    | 'checkout_failed'
    | 'checkout_prefetch_blocked'
    // KINEO-BULK-2026-07-27 — funil de atacado, nomeado. Server-only (declarado
    // em app/api/events/route.ts): se o sink do browser pudesse cunhá-lo, o
    // denominador do único canal de receita novo viraria ficção.
    | 'bulk_checkout_started',
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
    const eventRow: Record<string, unknown> = {
      name,
      user_id: userId,
      path: '/api/stripe/checkout',
      session_id: sessionId ?? null,
      metadata,
    }
    // Stripe idempotency can return the same Checkout Session to two racing
    // requests. Give checkout_started a deterministic UUID so analytics also
    // remain idempotent instead of counting the same session twice.
    const stripeSessionId = typeof metadata.stripe_session_id === 'string' ? metadata.stripe_session_id : null
    if (name === 'checkout_started' && stripeSessionId) {
      const hex = createHash('sha256').update(`checkout_started:${stripeSessionId}`).digest('hex').slice(0, 32)
      eventRow.id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    const { error } = await admin.from('events').insert(eventRow)
    if (error?.code === '23505' && name === 'checkout_started') return
    if (error) console.error('[stripe/checkout] event insert failed:', name, error.code, error.message)
  } catch (error) {
    console.error('[stripe/checkout] event insert threw:', name, error)
  }
}

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — the browser session id minted by
// lib/analytics.ts (kineo_event_session_id) is mirrored into a cookie so every
// server-side checkout event lands on the SAME session as the client-side
// checkout_click. Without this, checkout_* rows show 0 distinct sessions.
function browserSessionIdFrom(req: NextRequest): string | undefined {
  const raw = req.cookies.get('kineo_event_session_id')?.value ?? ''
  return /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : undefined
}

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — produção mostrou rajadas de
// checkout_auth_required com 2-8 ms entre elas, uma por tier, sem user_id e sem
// session_id: isso é um prefetcher/scanner abrindo TODOS os <a href> de uma
// página (ou de um e-mail de recuperação) de uma vez.
//
// A prefetched request must never create a real Stripe Checkout Session:
// it inflates telemetry, burns Stripe rate limit and produces "abandoned"
// sessions for tiers nobody clicked. A genuine click is always a top-level
// navigation (Sec-Fetch-Mode: navigate), so we only block requests that
// explicitly announce themselves as speculative.
function isSpeculativeRequest(req: NextRequest): boolean {
  const h = req.headers
  const secPurpose = (h.get('sec-purpose') ?? '').toLowerCase()
  if (secPurpose.includes('prefetch') || secPurpose.includes('prerender')) return true
  const purpose = (h.get('purpose') ?? h.get('x-purpose') ?? '').toLowerCase()
  if (purpose === 'prefetch' || purpose === 'preview') return true
  if ((h.get('x-moz') ?? '').toLowerCase() === 'prefetch') return true
  if (h.get('next-router-prefetch') === '1') return true
  return false
}

// A prefetch is not an error for the buyer — nobody is looking at it. Answer
// with a body-less 204 so no Stripe call, no cookie and no redirect happen.
async function speculativeNoop(req: NextRequest, selection: string): Promise<NextResponse> {
  await recordCheckoutEvent(
    'checkout_prefetch_blocked',
    null,
    {
      selection,
      // Header names only — never the visitor's IP, email or cookies.
      signal: req.headers.get('sec-purpose')
        ? 'sec-purpose'
        : req.headers.get('purpose') || req.headers.get('x-purpose')
          ? 'purpose'
          : req.headers.get('x-moz')
            ? 'x-moz'
            : 'next-router-prefetch',
    },
    browserSessionIdFrom(req),
  )
  return new NextResponse(null, { status: 204 })
}

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — one click = at most one Stripe session.
// Subscriptions already had checkoutIdempotencyKeyFor(); the one-time SKUs
// (starter pack, $2.90 offer, credit top-ups) had NOTHING, and production shows
// one user producing 7 pack sessions in 2.8 s. Same 5-minute window: an
// identical purchase intent collapses onto one Session, a different SKU,
// currency, price or destination stays distinct.
function oneTimeIdempotencyKey(parts: Record<string, unknown>): string {
  const signature = JSON.stringify({
    version: 1,
    ...parts,
    window: Math.floor(Date.now() / (5 * 60 * 1000)),
  })
  return `kineo-onetime-v1:${createHash('sha256').update(signature).digest('hex')}`
}

// Turns one of OUR OWN English error strings into a stable snake_case reason
// code. Everything after the first ':' is dropped because that is where the
// raw Stripe message is interpolated — the reason code must never carry a
// customer id, an email or any payment detail.
function checkoutFailureReason(msg: string): string {
  return (msg.split(':')[0] ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'unknown'
}

// Push #273 — multi-currency support.
//   Starter: $2.90 / month  (USD)  |  R$14.90 / month  (BRL)  |  ₹249 / month  (INR)
//   Basic:   $4.90 / month  (USD)  |  R$24.90 / month  (BRL)  |  ₹399 / month  (INR)
//   Pro:     $9.90 / month  (USD)  |  R$49.90 / month  (BRL)  |  ₹799 / month  (INR)
// Currency is auto-detected from the visitor's IP country (Vercel header).
// Payment methods are automatic (Stripe chooses card / UPI / PIX / etc. per country).
// Hosted payment links (direct, no session needed):
//   Basic: https://buy.stripe.com/14A28reRf6jtcev48CgjC0r
//   Pro:   https://buy.stripe.com/00w9AT5gF8rBa6ndJcgjC0q
// KINEO-STRIPE-NAMES-2026-07-01 — checkout line-item names show "Kineo" (era ShortsForgeAI)
// KINEO-INTRO-MONTH-2026-07-13 — Starter/Studio ainda tinham copy+credits
// PRÉ-rebase ("50 Fast videos", 50/400) na TELA DE PAGAMENTO do Stripe — o
// comprador via uma promessa dobrada no momento mais sensível. O webhook
// nunca leu esses valores (usa a própria tabela 25/150/200), então era só
// copy/metadata — mas copy errada no checkout é trust-killer. Agora: 25/150/200.
// KINEO-PRICING-V3D-2026-07-26 — credits now come from TIER_CREDITS in
// lib/checkoutPricing.ts. They used to be typed out here AND in the webhook AND
// in lib/pricing.ts; the three copies drifted at every reprice. One source now.
const TIERS: Record<PlanTier, { name: string; description: string; credits: number }> = {
  starter: {
    name: 'Kineo — Starter',
    description: `${TIER_CREDITS.starter} credits / month — Fast videos (smart stock footage + AI voiceover), watermark-free`,
    credits: TIER_CREDITS.starter,
  },
  basic: {
    name: 'Kineo — Creator',
    // KINEO-PRICING-V3B-2026-07-10 — Creator = 150 credits: 1 Hollywood film
    // every month included (150 cr), or ~7 AI-generated videos. Metadata
    // plan_credits follows this value.
    description: `${TIER_CREDITS.basic} credits / month — 1 Hollywood film included (or ~7 AI-generated videos)`,
    credits: TIER_CREDITS.basic,
  },
  pro: {
    name: 'Kineo — Studio',
    description: `${TIER_CREDITS.pro} credits / month — cinematic Kling engine at 1080p, priority render queue`,
    credits: TIER_CREDITS.pro,
  },
  // KINEO-AUTOPILOT-299-2026-07-26 — done-for-you. The daily Short is produced
  // and published by the cron (app/api/cron/autopilot-generate), engine clamped
  // server-side to fast/basic_ai. The credits are the customer's manual
  // headroom on top of that; the scheduled posts spend from the same balance.
  autopilot: {
    name: 'Kineo — Autopilot',
    description: `Done for you: one Short published to your YouTube channel every day. Includes ${TIER_CREDITS.autopilot} credits / month for videos you make yourself.`,
    credits: TIER_CREDITS.autopilot,
  },
}

// KINEO-AUTOPILOT-299-2026-07-26 — OPTIONAL Stripe Price override.
// IMPORTANT, because the task brief assumed otherwise: this repo has NO
// "existing env-var price pattern". Every line_item in this file — all four
// builders — is built from inline `price_data`. There is not one Stripe Price
// object id or price-id env var anywhere in the codebase. Autopilot therefore
// ships the same way (inline price_data, zero dashboard setup, works the moment
// this deploys), and STRIPE_PRICE_AUTOPILOT_USD exists only as an escape hatch
// for when someone wants Stripe-side reporting/entitlements on this SKU.
// USD only: a single Price object carries a single currency, and swapping in a
// USD price for a BRL visitor would silently charge them the wrong money.
const AUTOPILOT_PRICE_ID_RE = /^price_[A-Za-z0-9]+$/
function autopilotPriceIdOverride(currency: Currency): string | null {
  if (currency !== 'usd') return null
  const raw = (process.env.STRIPE_PRICE_AUTOPILOT_USD || '').trim()
  if (!raw) return null
  if (!AUTOPILOT_PRICE_ID_RE.test(raw)) {
    console.warn('[stripe/checkout] STRIPE_PRICE_AUTOPILOT_USD is not a price_… id — ignoring, using inline price_data')
    return null
  }
  return raw
}

// Amounts in the smallest currency unit (cents / centavos / paise).
// INR: ₹249 = 24900 paise (Starter), ₹399 = 39900 paise (Basic), ₹799 = 79900 paise (Pro).
// Push #401 — new 2-plan pricing. Basic $12.90 (Seedance), Pro $38.90 (Kling).
// BRL ≈ USD×5.0, INR ≈ USD×81 (same ratios as the old plans). starter kept only
// for grandfathered Spark subscribers; not offered to new users.
// Push #404 — 3-tier pricing. Starter $11.90 (Fast), Creator $24.90 (Seedance),
// Studio $37.90 (Kling). BRL ≈ USD×5.0, INR ≈ USD×81.
// KINEO-PRICE-2026-07-06 — competitive repricing: Starter $11.90→$9.90,
// Creator $24.90→$19.90 (Studio unchanged). Margins recompute ≥45% (Seedance/Veo
// forced to 720p). BRL≈USD×5, INR≈USD×80.6 (same ratios as before).
// KINEO-PRICING-V3B-2026-07-10 — Creator monthly USD $19.90 → $24.90 (150
// credits, 1 Hollywood film/month included). BRL/INR and annual left as-is
// pending founder decision on the local-currency ladder. Existing subscribers
// are NOT affected (Stripe keeps the price on active subscriptions).
// #381 — Annual prices = 10× the monthly price (≈2 months free). Smallest unit.
// KINEO-PRICE-2026-07-06 — annual = 10× the new monthly (2 months free).
type Billing = 'monthly' | 'annual'

// KINEO-INTRO-MONTH-2026-07-13 — ROTA DE RECORRÊNCIA. O pack one-time $4.90
// era o beco sem saída do funil: quem pagava, comprava ISSO, gastava e sumia
// (5 pagantes, ~0 assinaturas). Agora os preços de entrada viram o 1º MÊS do
// plano de cima — mesmo "sim" barato, mas o default é recorrente:
//   $4.90 (ex-pack)   → 1º mês do Starter (renova $9.90)
//   $9.90 (ex-Starter)→ 1º mês do Creator (renova $24.90)
// Os valores por moeda REUSAM a escada existente (PACK_PRICES / TIER_PRICES),
// então o desconto fecha exato em USD/BRL/INR. Cupom Stripe amount_off,
// duration 'once' (só a 1ª fatura), criado IDEMPOTENTE em runtime por
// tier+moeda — zero setup manual no dashboard. Fail-safe: qualquer erro de
// cupom segue o checkout a preço cheio (nunca bloqueia venda).
// Anti-abuso: 1 intro por cliente — recusa se o customer já teve QUALQUER
// assinatura com metadata.intro='1' (cancelar/reassinar não repete o desconto).
async function ensureIntroCoupon(
  tier: IntroTier,
  currency: Currency,
  amountOff: number,
): Promise<string | null> {
  const id = `KINEO_INTRO_${tier.toUpperCase()}_${currency.toUpperCase()}`
  try {
    await stripe.coupons.retrieve(id)
    return id
  } catch {
    try {
      await stripe.coupons.create({
        id,
        amount_off: amountOff,
        currency,
        duration: 'once',
        name: `Kineo — first month intro (${tier}/${currency.toUpperCase()})`,
      })
      return id
    } catch (createErr) {
      // Corrida entre requests: outro request pode ter criado entre o retrieve
      // e o create. Confere de novo antes de desistir.
      try {
        await stripe.coupons.retrieve(id)
        return id
      } catch {
        console.warn('[stripe/checkout] intro coupon unavailable — full price:', id, createErr)
        return null
      }
    }
  }
}

// Map Vercel IP-country header → billing currency.
// Everyone not explicitly mapped gets USD.
// #473 — Starter Pack: a one-time, low-commitment entry point.
// Breaks first-purchase hesitation for users who won't commit to a monthly
// subscription — they make the (hardest) first payment, then upsell to a plan
// later. Credited by the webhook via metadata.pack_credits (currency-proof,
// see webhook Path A). No Stripe product needed — inline price_data.
const STARTER_PACK = {
  // KINEO-PACK-25-2026-07-06 — bumped 10→25 Fast Shorts for the same $4.90.
  // KINEO-PRICING-V3C-2026-07-10 — back to 10 credits. With Fast now costing
  // 1 credit for paying accounts, the pack reads as "10 videos for $4.90"
  // (25 was over-generous after the 2:1 rebase: 25 cr ≈ the $9.90 plan).
  // KINEO-PRICING-V3D-2026-07-26 — 10 → 30. 10 credits bought 10 Fast videos
  // and ZERO generative-AI videos (cheapest AI engine, Seedance, costs 20), so
  // the very first payment a customer ever made bought none of the thing the
  // homepage sells. 30 = 1 Seedance + 10 Fast. Worst-case COGS $2.84 against
  // $4.458 net → +$1.62 (36.3%). Grant lives in lib/checkoutPricing.ts.
  credits: PACK_CREDITS.starter,
  name: 'Kineo — Starter Pack',
  description: 'One-time: 30 credits — 1 AI-generated video plus 10 Fast videos. No subscription.',
}
//   USD $4.90 | BRL R$24.90 | INR ₹399  (same ratios as the plans)
const PACK_PRICES: Record<Currency, number> = { usd: 490, brl: 2490, inr: 39900 }

// KINEO-OFFER290-2026-07-07 — first-purchase URGENCY offer. A NEW user in the
// first 24h after their 1st video sees "$4.90 → $2.90, expires in 24h" with a
// live countdown. Same mechanics as the Starter Pack (one-time, inline
// price_data, credited by the webhook via metadata.pack_credits) but a smaller
// 10-Fast-videos entry at a discounted $2.90 to break the very first payment.
// LIMITED to 1 per account (profiles.offer290_used + has_paid guards). Gated
// entirely behind OFFER_290_ENABLED — while that flag is false this SKU returns
// 410 and never creates a Stripe session.
// KINEO-PRICING-V3D-2026-07-26 — 10 → 20 credits, same $2.90. 20 is the exact
// cost of one Seedance render, so the cheapest thing we sell now buys one real
// AI video instead of none. Worst-case COGS $2.34 against $2.516 net →
// +$0.18 (7.0%). Thin, and deliberately so: this SKU exists to convert a first
// payment, not to earn. Anything above 20 goes negative at $2.90.
const STARTER290_PACK = {
  credits: PACK_CREDITS.starter290,
  name: 'Kineo — First Pack (24h offer)',
  description: 'One-time launch offer: 20 credits — enough for 1 AI-generated video. Limited to 1 per account.',
}
//   USD $2.90 | BRL R$14.90 | INR ₹249  (same ratios as the plans)
const PACK290_PRICES: Record<Currency, number> = { usd: 290, brl: 1490, inr: 24900 }

// ─── KINEO-PILOT-99-2026-07-26 — $99 / 7-day Autopilot pilot (one-time) ──────
// The paid filter in front of the $299 tier. One-time PAYMENT, not a
// subscription: nothing renews, nothing to cancel, and the upsell to $299 is
// therefore a decision to NOT interrupt a channel that is already posting.
// Fulfilled by webhook Path A (metadata.pack = 'autopilot_pilot'), which sets
// plan = 'autopilot_pilot' + profiles.plan_expires_at = now + 7 days.
const AUTOPILOT_PILOT_PACK = {
  credits: AUTOPILOT_PILOT_CREDITS,
  name: 'Kineo — Autopilot Pilot (7 days)',
  description:
    `One-time: we publish ${AUTOPILOT_PILOT_DAYS} Shorts to your YouTube channel, one per day, at the time you pick. ` +
    `Includes ${AUTOPILOT_PILOT_CREDITS} credits. No subscription — it ends after ${AUTOPILOT_PILOT_DAYS} days.`,
}

// Same escape hatch as STRIPE_PRICE_AUTOPILOT_USD, and the same USD-only
// restriction for the same reason: a Stripe Price object carries exactly one
// currency, so reusing a USD price for a BRL visitor charges the wrong money.
function autopilotPilotPriceIdOverride(currency: Currency): string | null {
  if (currency !== 'usd') return null
  const raw = (process.env.STRIPE_PRICE_AUTOPILOT_PILOT_USD || '').trim()
  if (!raw) return null
  if (!AUTOPILOT_PRICE_ID_RE.test(raw)) {
    console.warn('[stripe/checkout] STRIPE_PRICE_AUTOPILOT_PILOT_USD is not a price_… id — ignoring, using inline price_data')
    return null
  }
  return raw
}

// KINEO-TOPUP-2026-07-06 — AI credit top-ups for EXISTING subscribers who burn
// through their monthly AI credits before renewal. Sized SMALLER than a full
// plan so heavy users are nudged to upgrade instead of stacking packs. Credited
// by the webhook via metadata.pack_credits (same Path A as the Starter Pack).
// Gated to Creator+. Expire automatically at renewal (the webhook SETS the
// balance to the plan amount rather than adding to it).
//
// KINEO-PRICING-V3D-2026-07-26 — THE COMMENT THAT USED TO BE HERE WAS WRONG.
// It claimed these were "priced ABOVE the plan per-credit rate ($0.104/cr
// Creator)" and that "Seedance costs 40 cr/video". Both statements were true
// when written and both stopped being true at KINEO-PRICING-V3B (Creator went
// 240cr → 150cr, so its rate moved $0.10375 → $0.1660/cr) and at
// KINEO-REBASE-2026-07-10 (Seedance 40 → 20 cr). Nothing recomputed the
// top-ups, so the invariant silently inverted:
//     Creator  $24.90 / 150 = $0.1660 / cr
//     Studio   $37.90 / 200 = $0.1895 / cr   ← cheapest plan rate
//     topup40  $5.90  /  40 = $0.1475 / cr   ← 22% CHEAPER than Studio
//     topup120 $12.90 / 120 = $0.1075 / cr   ← 43% CHEAPER than Studio
// A Studio subscriber's cheapest source of credits was a top-up, which is the
// exact opposite of what a top-up is for. Grants corrected (prices unchanged,
// so no Stripe-side work and no existing subscription is touched):
//     topup40  $5.90  / 30 = $0.1967 / cr  (+3.8% vs Studio, +18.5% vs Creator)
//     topup120 $12.90 / 65 = $0.1985 / cr  (+4.8% vs Studio, +19.6% vs Creator)
// The invariant is now MACHINE-CHECKED in lib/checkoutPricing.ts
// (checkPricingInvariants) so the next reprice cannot silently break it again.
// The SKU ids stay topup40/topup120 — they are the ?pack= URL keys and are
// hard-coded in the Generate screen.
type TopupId = 'topup40' | 'topup120'
const CREDIT_TOPUPS: Record<TopupId, { credits: number; name: string; description: string; prices: Record<Currency, number> }> = {
  topup40:  { credits: TOPUP_CREDITS.topup40,  name: 'Kineo — +30 credits', description: 'One-time: 30 credits (1 AI-generated video plus 10 Fast videos). No subscription.', prices: { usd: 590,  brl: 2990, inr: 49900  } },
  topup120: { credits: TOPUP_CREDITS.topup120, name: 'Kineo — +65 credits', description: 'One-time: 65 credits (3 AI-generated videos plus 5 Fast videos). No subscription.',   prices: { usd: 1290, brl: 6490, inr: 109900 } },
}

// KINEO-AVATAR-PACKS-RETIRED-2026-07-06 — the one-time "AI Avatar packs"
// (avatar1/avatar3/avatar10) sold the SEPARATE profiles.avatar_credits balance.
// Avatar generation now costs 120 UNIVERSAL video_credits, so those avatar
// credits are unspendable and the packs are retired. The AVATAR_PACKS map,
// STUDIO_AVATAR_DISCOUNT, and buildAvatarPackAndRedirect() are removed; the GET
// handler returns a clean 410 for ?pack=avatar1|avatar3|avatar10 instead of
// creating a Stripe session. Existing profiles.avatar_credits balances stay in
// the DB (just unsellable). Subscriptions, Starter Pack, and top-ups untouched.

// ─── Shared checkout-session builder ────────────────────────────────────────

async function buildAndRedirect(
  req: NextRequest,
  // KINEO-AUTOPILOT-299-2026-07-26 — PlanTier, not Tier: 'autopilot' is a
  // subscription like any other here, it just has no annual SKU and no intro.
  tier: PlanTier,
  isGet: boolean,
  billing: Billing = 'monthly',
  promo?: string,
  // KINEO-INTRO-MONTH-2026-07-13 — ?intro=1 pede o desconto de 1º mês
  // (starter/basic, monthly only). Ignorado silenciosamente fora disso.
  intro = false,
): Promise<NextResponse> {
  // KINEO-AUTOPILOT-299-2026-07-26 — normalize before ANY of the metadata,
  // cancel_url or analytics strings are built, so a hand-edited
  // ?tier=autopilot&billing=annual&intro=1 URL cannot produce a session whose
  // metadata disagrees with what Stripe actually charges.
  if (tier === 'autopilot') {
    billing = 'monthly'
    intro = false
  }

  // Always return to the hostname the buyer actually used. The legacy env can
  // still point at shortsforgeai.vercel.app; trusting it adds an unnecessary
  // cross-domain hop and can drop auth/attribution cookies.
  const appUrl = req.nextUrl.origin
  const browserSessionCookie = req.cookies.get('kineo_event_session_id')?.value ?? ''
  const browserSessionId = /^[A-Za-z0-9_-]{8,64}$/.test(browserSessionCookie)
    ? browserSessionCookie
    : null
  const rawIntentCampaign = (req.nextUrl.searchParams.get('intent_campaign') ?? '').trim()
  const intentCampaign = /^[A-Za-z0-9._~-]{1,100}$/.test(rawIntentCampaign)
    ? rawIntentCampaign
    : undefined
  const intentCampaignParam = intentCampaign
    ? `&intent_campaign=${encodeURIComponent(intentCampaign)}`
    : ''

  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — every early return below used to be
  // silent: the buyer landed on /pricing with a banner and we had no event at
  // all. checkout_failed existed in the union since 2026-07-15 but was never
  // emitted, so "checkout_attempted 63 / checkout_started 15" could not be
  // explained. These two helpers now record the drop-off for EVERY exit path.
  // Mutable because the helpers are declared before we know the user or the
  // resolved price (TDZ), and are called from both sides.
  let failureUserId: string | null = null
  let failureContext: Record<string, unknown> = { tier, billing, intro_requested: intro }

  async function redirectError(msg: string) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...failureContext, stage: 'redirect', reason: checkoutFailureReason(msg) },
      browserSessionId ?? undefined,
    )
    return NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(msg)}${intentCampaignParam}`)
  }
  async function jsonError(msg: string, status: number) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...failureContext, stage: 'json', status, reason: checkoutFailureReason(msg) },
      browserSessionId ?? undefined,
    )
    return NextResponse.json({ error: msg }, { status })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set')
    return isGet
      ? redirectError('Payment service is not configured. Please contact support.')
      : jsonError('Payment service is not configured. Please contact support.', 500)
  }

  const country = req.headers.get('x-vercel-ip-country') ?? 'US'
  const currency: Currency = resolveCheckoutCurrency(country)
  const rawPromo = (promo ?? '').trim()
  const requestedPromo = /^[A-Za-z0-9_-]{1,64}$/.test(rawPromo) ? rawPromo : undefined
  const privatePackPromo = isPrivatePackPromotion(rawPromo)
  const plan = TIERS[tier]
  // #381 — annual vs monthly price + billing interval.
  // KINEO-AUTOPILOT-299-2026-07-26 — Autopilot is monthly-only (see the note on
  // ANNUAL_PRICES). ?billing=annual on autopilot silently degrades to monthly
  // rather than 500-ing: a buyer who edits the URL should still be able to buy.
  const isAnnual = billing === 'annual'
  const unitAmount = isAnnual && tier !== 'autopilot'
    ? ANNUAL_PRICES[tier][currency]
    : monthlyPriceMinor(tier, currency)
  const interval: 'month' | 'year' = isAnnual ? 'year' : 'month'
  const returnToWatermark = req.nextUrl.searchParams.get('return') === 'wm'
  const checkoutRecovery = req.nextUrl.searchParams.get('recovery') === '1'
  const checkoutMetadata = {
    tier,
    billing,
    currency,
    intro_requested: intro,
    offer_requested: privatePackPromo ? 'kineo5_pack_upgrade' : null,
    return_to: returnToWatermark ? 'watermark_moment' : 'checkout_success',
    checkout_origin: returnToWatermark ? 'post_video_clean_export' : 'standard',
    checkout_recovery: checkoutRecovery,
    intent_campaign: intentCampaign ?? null,
  }
  // From here on, a failure event carries the full purchase intent.
  failureContext = { ...checkoutMetadata }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await recordCheckoutEvent('checkout_attempted', user?.id ?? null, checkoutMetadata, browserSessionId ?? undefined)

  if (authError || !user) {
    await recordCheckoutEvent('checkout_auth_required', null, checkoutMetadata, browserSessionId ?? undefined)
    console.error('[stripe/checkout] Auth error or no user:', authError?.message)
    // KINEO-CHECKOUT-RESUME-2026-07-07 — 7 buyers hit "Auth session missing" and
    // the old redirect (/signup?redirect=/pricing) silently DROPPED the purchase
    // intent (tier/billing/promo) — one user clicked 7× in 3s and gave up. Now we
    // send them to the create-account screen carrying the FULL checkout URL.
    // Google OAuth works for both new and returning users there, while the email
    // login link preserves the same query. `resumed=1`
    // is a loop guard: if a resumed request STILL has no session, show a visible
    // error on /pricing instead of bouncing login↔checkout forever.
    if (!isGet) return jsonError('You must be signed in to upgrade.', 401)
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/signup?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id, is_pro, plan, stripe_subscription_id, paypal_subscription_id, affiliate_id')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[stripe/checkout] Profile fetch error:', profileError.message, profileError.code)
    return isGet
      ? redirectError('We could not verify your account. Please try again in a moment.')
      : jsonError('We could not verify your account. Please try again in a moment.', 503)
  }
  if (!profile) {
    console.error('[stripe/checkout] Profile missing for authenticated user:', user.id)
    return isGet
      ? redirectError('Your account is still being prepared. Please refresh and try again.')
      : jsonError('Your account is still being prepared. Please refresh and try again.', 503)
  }

  const originalCustomerId = profile.stripe_customer_id as string | null
  let customerId = originalCustomerId
  let linkedStripeCustomerId: string | null = null
  const subscriptionCandidates = new Map<string, Stripe.Subscription>()
  const hadLinkedProvider = Boolean(profile.paypal_subscription_id || profile.stripe_subscription_id)
  let stalePayPalSubscription = false
  let staleStripeSubscription = false
  let staleStripeCustomer = false

  const subscriptionPriority = (sub: Stripe.Subscription): number => {
    if (sub.status === 'active' || sub.status === 'trialing') return 0
    if (sub.status === 'past_due') return 1
    if (sub.status === 'paused') return 2
    if (sub.status === 'incomplete') return 3
    if (sub.status === 'unpaid') return 4
    return 5
  }
  const considerSubscription = (sub: Stripe.Subscription): void => {
    if (sub.status === 'canceled' || sub.status === 'incomplete_expired') return
    if (!subscriptionCandidates.has(sub.id)) subscriptionCandidates.set(sub.id, sub)
  }

  // Inspect every linked provider before mutating the profile. A stale linked
  // id must never downgrade a payer when another live subscription exists.
  if (profile.paypal_subscription_id) {
    const paypalSubscriptionId = String(profile.paypal_subscription_id)
    try {
      const paypalSubscription = await paypalFetch(`/v1/billing/subscriptions/${paypalSubscriptionId}`) as { status?: string } | null
      const paypalStatus = String(paypalSubscription?.status ?? '').toUpperCase()
      stalePayPalSubscription = paypalStatus === 'CANCELLED' || paypalStatus === 'EXPIRED'
      if (!stalePayPalSubscription) {
        return redirectError('You already have a Kineo subscription. Manage that plan before starting another one.')
      }
    } catch (err) {
      console.error('[stripe/checkout] could not verify PayPal subscription; refusing duplicate checkout:', paypalSubscriptionId, err)
      return isGet
        ? redirectError('We could not verify your current subscription. Please try again or contact support.')
        : jsonError('We could not verify your current subscription. Please try again or contact support.', 503)
    }
  }

  if (profile.stripe_subscription_id) {
    const subId = String(profile.stripe_subscription_id)
    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      const linkedSubscriptionOwnerId = sub.metadata?.supabase_user_id
      if (linkedSubscriptionOwnerId && linkedSubscriptionOwnerId !== user.id) {
        console.error('[stripe/checkout] linked Stripe subscription belongs to another user:', user.id, subId)
        return isGet
          ? redirectError('We could not verify your current subscription. Please contact support.')
          : jsonError('We could not verify your current subscription. Please contact support.', 409)
      }
      linkedStripeCustomerId = typeof sub.customer === 'string'
        ? sub.customer
        : sub.customer?.id ?? null
      staleStripeSubscription = sub.status === 'canceled' || sub.status === 'incomplete_expired'
      if (!staleStripeSubscription) {
        // Carry this into the common repair path. Returning here would block a
        // duplicate checkout but leave a mismatched Customer pointer (and stale
        // access state) unrepaired.
        considerSubscription(sub)
      } else {
        console.log('[stripe/checkout] terminal linked Stripe subscription found:', user.id, subId, sub.status)
      }
    } catch (err) {
      if (isStripeResourceMissing(err)) {
        staleStripeSubscription = true
        console.warn('[stripe/checkout] linked Stripe subscription no longer exists; auditing Customer:', user.id, subId)
      } else {
        console.error('[stripe/checkout] could not verify Stripe subscription; refusing duplicate checkout:', subId, err)
        return isGet
          ? redirectError('We could not verify your current subscription. Please try again or contact support.')
          : jsonError('We could not verify your current subscription. Please try again or contact support.', 503)
      }
    }
  }

  const customerIdsToAudit = Array.from(new Set(
    [customerId, linkedStripeCustomerId].filter((id): id is string => Boolean(id)),
  ))
  const validCustomerIds: string[] = []

  // A legacy profile can have a Customer pointer that differs from the
  // Customer attached to its linked subscription. Audit both before clearing
  // access so a live subscription on either Customer cannot be overlooked.
  // Customer ownership is checked before reusing it: a corrupted/malicious
  // profile pointer must never expose or charge another user's saved Customer.
  for (const auditCustomerId of customerIdsToAudit) {
    try {
      const stripeCustomer = await stripe.customers.retrieve(auditCustomerId)
      if ('deleted' in stripeCustomer && stripeCustomer.deleted) {
        if (auditCustomerId === originalCustomerId) staleStripeCustomer = true
        console.warn('[stripe/checkout] deleted Stripe Customer excluded after ownership audit:', user.id, auditCustomerId)
        continue
      }
      if (stripeCustomer.metadata?.supabase_user_id !== user.id) {
        console.error('[stripe/checkout] Stripe Customer ownership mismatch; refusing checkout:', user.id, auditCustomerId)
        return isGet
          ? redirectError('We could not verify your billing account. Please contact support.')
          : jsonError('We could not verify your billing account. Please contact support.', 409)
      }
      const subscriptions = await stripe.subscriptions.list({ customer: auditCustomerId, status: 'all', limit: 100 })
      validCustomerIds.push(auditCustomerId)
      for (const subscription of subscriptions.data) {
        const subscriptionOwnerId = subscription.metadata?.supabase_user_id
        if (subscriptionOwnerId && subscriptionOwnerId !== user.id) {
          console.error('[stripe/checkout] Customer contains subscription for another user; refusing checkout:', user.id, auditCustomerId, subscription.id)
          return isGet
            ? redirectError('We could not verify your current subscription. Please contact support.')
            : jsonError('We could not verify your current subscription. Please contact support.', 409)
        }
        considerSubscription(subscription)
      }
    } catch (err) {
      if (isMissingStripeCustomer(err)) {
        if (auditCustomerId === originalCustomerId) staleStripeCustomer = true
        console.warn('[stripe/checkout] Stripe Customer no longer exists; excluding it after the full audit:', user.id, auditCustomerId)
      } else {
        console.error('[stripe/checkout] could not audit Customer subscriptions; refusing duplicate checkout:', auditCustomerId, err)
        return isGet
          ? redirectError('We could not verify your current subscription. Please try again or contact support.')
          : jsonError('We could not verify your current subscription. Please try again or contact support.', 503)
      }
    }
  }

  const preferredCustomerId = customerId ?? linkedStripeCustomerId
  customerId = preferredCustomerId && validCustomerIds.includes(preferredCustomerId)
    ? preferredCustomerId
    : validCustomerIds[0] ?? null

  const existingCustomerSubscription = Array.from(subscriptionCandidates.values())
    .sort((a, b) => subscriptionPriority(a) - subscriptionPriority(b))[0] ?? null

  if (existingCustomerSubscription) {
    const grantsAccess = existingCustomerSubscription.status === 'active' || existingCustomerSubscription.status === 'trialing'
    const repair: Record<string, unknown> = {
      stripe_subscription_id: existingCustomerSubscription.id,
      is_pro: grantsAccess,
    }
    const subscriptionCustomerId = typeof existingCustomerSubscription.customer === 'string'
      ? existingCustomerSubscription.customer
      : existingCustomerSubscription.customer?.id ?? null
    if (subscriptionCustomerId) repair.stripe_customer_id = subscriptionCustomerId
    if (stalePayPalSubscription) repair.paypal_subscription_id = null
    const activeTier = existingCustomerSubscription.metadata?.tier
    // KINEO-AUTOPILOT-299-2026-07-26 — 'autopilot' added. Without it an
    // Autopilot subscriber whose profile needed repair would be written back
    // to plan='free' and instantly lose Autopilot entitlement.
    if (grantsAccess && (activeTier === 'starter' || activeTier === 'basic' || activeTier === 'pro' || activeTier === 'autopilot')) {
      repair.plan = activeTier
    } else if (!grantsAccess) {
      repair.plan = 'free'
    }
    const { error: repairError } = await supabase.from('profiles').update(repair).eq('id', user.id)
    if (repairError) {
      console.error('[stripe/checkout] active subscription profile repair failed:', user.id, repairError.message)
    }
    console.warn('[stripe/checkout] non-terminal subscription found on Customer; duplicate checkout blocked:', user.id, existingCustomerSubscription.id, existingCustomerSubscription.status)
    return redirectError('You already have a Kineo subscription. Manage that plan before starting another one.')
  }

  // Provider-less Pro may be an admin grant or a legacy payment. Only linked
  // provider ids confirmed terminal/missing authorize a downgrade.
  if (profile.is_pro && !hadLinkedProvider) {
    return isGet
      ? redirectError('Your account already has paid access. Contact support before starting another subscription.')
      : jsonError('Your account already has paid access. Contact support before starting another subscription.', 409)
  }

  const staleProfilePatch: Record<string, unknown> = {}
  if (stalePayPalSubscription) staleProfilePatch.paypal_subscription_id = null
  if (staleStripeSubscription) staleProfilePatch.stripe_subscription_id = null
  if (staleStripeCustomer || (!originalCustomerId && customerId)) {
    staleProfilePatch.stripe_customer_id = customerId
  }
  if (hadLinkedProvider) {
    staleProfilePatch.is_pro = false
    staleProfilePatch.plan = 'free'
  }
  if (Object.keys(staleProfilePatch).length > 0) {
    const { error: staleUpdateError } = await supabase
      .from('profiles')
      .update(staleProfilePatch)
      .eq('id', user.id)
    if (staleUpdateError) {
      console.error('[stripe/checkout] confirmed-stale profile cleanup failed:', user.id, staleUpdateError.message)
      return isGet
        ? redirectError('We could not update your account. Please try again in a moment.')
        : jsonError('We could not update your account. Please try again in a moment.', 503)
    }
  }

  // KINEO-RECOVERY-2026-07-15 — never create a second recurring subscription
  // for an already-active customer. It causes duplicate billing and inflates
  // subscriber counts; credit top-ups remain available through their own route.
  // Only a provider-confirmed terminal state may clear a stale profile. A
  // temporary provider/API error must fail closed, never downgrade a payer.
  if (!customerId) {
    try {
      const customerKey = staleStripeCustomer && originalCustomerId
        ? `kineo-customer-recovery-v1:${user.id}:${createHash('sha256').update(originalCustomerId).digest('hex').slice(0, 20)}`
        : `kineo-customer-v1:${user.id}`
      const customer = await stripe.customers.create(
        {
          email: profile.email ?? user.email ?? '',
          metadata: { supabase_user_id: user.id },
        },
        // Two simultaneous first-checkout requests must converge on the same
        // Customer before the profile update has time to persist. A confirmed
        // deleted Customer gets a new deterministic recovery key.
        { idempotencyKey: customerKey },
      )
      customerId = customer.id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
      if (updateError) {
        console.error('[stripe/checkout] Failed to persist customer ID:', updateError.message)
      }
    } catch (customerErr) {
      const msg = customerErr instanceof Error ? customerErr.message : String(customerErr)
      console.error('[stripe/checkout] Failed to create Stripe customer:', msg)
      return isGet
        ? redirectError('Failed to set up payment. Please try again.')
        : jsonError('Failed to set up payment. Please try again.', 500)
    }
  }

  // Push #273 — multi-currency (USD/BRL/INR).
  // Push #414 — CONVERSION FIX: removed the hard `payment_method_types: ['card']`
  // restriction. 48 abandoned checkouts vs 3 payers, mostly BRL/INR — card-only
  // blocks UPI (India), local wallets and Link. Omitting the field lets Stripe
  // show every dashboard-enabled method that supports subscriptions for the
  // buyer's currency/country (worst case: identical card-only behavior).
  // Credits are granted immediately at checkout completion (no trial).
  // KINEO-AUTOPILOT-299-2026-07-26 — the ONE place in this repo where a Stripe
  // Price object id can be used, and only if the operator opts in by setting
  // STRIPE_PRICE_AUTOPILOT_USD. Absent that env var (the default), Autopilot
  // uses inline price_data exactly like every other SKU here.
  const autopilotPriceId = tier === 'autopilot' ? autopilotPriceIdOverride(currency) : null
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = autopilotPriceId
    ? { price: autopilotPriceId, quantity: 1 }
    : {
        price_data: {
          currency,
          product_data: {
            name: isAnnual ? `${plan.name} (Annual)` : plan.name,
            description: plan.description,
          },
          unit_amount: unitAmount,
          recurring: { interval },
        },
        quantity: 1,
      }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    line_items: [lineItem],
    mode: 'subscription',
    after_expiration: {
      recovery: { enabled: true },
    },
    success_url: `${appUrl}/checkout/success?success=true&currency=${currency}&amount=${unitAmount}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout/cancelled?tier=${tier}&billing=${billing}&currency=${currency}${intro ? '&intro=1' : ''}${requestedPromo ? `&promo=${encodeURIComponent(requestedPromo)}` : ''}${returnToWatermark ? '&return=wm' : ''}${intentCampaignParam}`,
    metadata: {
      supabase_user_id: user.id,
      tier,
      billing,
      plan_credits: String(plan.credits),
      checkout_origin: returnToWatermark ? 'post_video_clean_export' : 'standard',
      checkout_recovery: checkoutRecovery ? '1' : '0',
      ...(intentCampaign ? { intent_campaign: intentCampaign } : {}),
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        tier,
        plan_credits: String(plan.credits),
        checkout_origin: returnToWatermark ? 'post_video_clean_export' : 'standard',
        checkout_recovery: checkoutRecovery ? '1' : '0',
        ...(intentCampaign ? { intent_campaign: intentCampaign } : {}),
      },
    },
  }

  let discountApplied = false

  // KINEO-INTRO-MONTH-2026-07-13 — desconto de 1º mês (vence o ?promo=: o
  // intro é mais fundo que 20%). Só monthly, só starter/basic, 1 por cliente.
  if (intro && !isAnnual && (tier === 'starter' || tier === 'basic')) {
    let introAlreadyUsed = false
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
      introAlreadyUsed = subs.data.some((s) => s.metadata?.intro === '1')
    } catch (listErr) {
      // Se a listagem falhar, seguimos: o cupom é 'once' e o dano máximo é
      // um 1º mês barato repetido — melhor que bloquear a venda.
      console.warn('[stripe/checkout] intro eligibility check failed, allowing:', listErr)
    }
    if (!introAlreadyUsed) {
      const amountOff = TIER_PRICES[tier][currency] - INTRO_PRICES[tier][currency]
      if (amountOff > 0) {
        const couponId = await ensureIntroCoupon(tier, currency, amountOff)
        if (couponId) {
          sessionParams.discounts = [{ coupon: couponId }]
          discountApplied = true
          // Marca a assinatura: é assim que o anti-abuso acima reconhece
          // "este cliente já usou o intro" sem precisar de migração no DB.
          sessionParams.subscription_data!.metadata!.intro = '1'
          // Espelha no Checkout Session para o webhook registrar corretamente
          // payment_success.metadata.intro sem uma chamada extra à API Stripe.
          sessionParams.metadata!.intro = '1'
          // KINEO-PRICING-V3D-2026-07-26 — DEFECT (b). The intro month is a
          // DISCOUNTED month, so it gets a DISCOUNTED grant. $9.90 for the
          // first Creator month nets $9.3129; the full 150-credit grant is
          // worth up to $16.88 of provider spend (7 Seedance + 10 Fast), so
          // month one lost $7.57 and — worse — a 150-credit balance puts a
          // single $8.90–10.20 Hollywood render in reach for $9.90. 50 credits
          // caps the worst case at $5.18 (2 Seedance + 10 Fast) → +$4.13, and
          // no premium engine (Hollywood 150, Avatar 110, Sora 100, Veo 90) is
          // reachable at all. subscription_data.metadata.plan_credits stays at
          // the FULL grant on purpose: that is the recurring entitlement, and
          // every renewal from month two onward pays full price.
          sessionParams.metadata!.plan_credits = String(INTRO_CREDITS[tier])
          sessionParams.metadata!.intro_credits = String(INTRO_CREDITS[tier])
          // Success page mostra o valor realmente cobrado hoje.
          sessionParams.success_url = `${appUrl}/checkout/success?success=true&currency=${currency}&amount=${INTRO_PRICES[tier][currency]}&intro=1&session_id={CHECKOUT_SESSION_ID}`
        }
      }
    }
  }

  // Push #453 — auto-apply a promotion code when ?promo= is present.
  // PUSH #37 — private KINEO5 pack-upgrade links are a promised $5 Creator
  // price, so they fail CLOSED. An expired, mismatched or temporarily
  // unverifiable private code must never become a silent $24.90 checkout.
  const rejectPrivatePromo = async (reason: string, message: string): Promise<NextResponse> => {
    await recordCheckoutEvent(
      'checkout_failed',
      user.id,
      { ...checkoutMetadata, failure_stage: 'private_promo', failure_reason: reason },
      browserSessionId ?? undefined,
    )
    return isGet ? redirectError(message) : jsonError(message, 409)
  }

  if (privatePackPromo && (!requestedPromo || tier !== 'basic' || isAnnual || intro)) {
    return rejectPrivatePromo(
      'invalid_offer_shape',
      'This private $5 link is only valid for the monthly Creator upgrade. You have not been charged. Please reply to Joseph for help.',
    )
  }

  if (!discountApplied && requestedPromo) {
    try {
      const codes = await stripe.promotionCodes.list({ code: requestedPromo, active: true, limit: 1 })
      const pc = codes.data[0]
      if (pc) {
        if (privatePackPromo) {
          const restrictedCustomerId = typeof pc.customer === 'string'
            ? pc.customer
            : pc.customer?.id ?? null
          const expired = Boolean(pc.expires_at && pc.expires_at * 1000 <= Date.now())
          const exhausted = pc.max_redemptions !== null && pc.times_redeemed >= pc.max_redemptions
          if (expired || exhausted || !pc.active) {
            return rejectPrivatePromo(
              'expired_or_redeemed',
              'This private $5 upgrade link has expired or has already been used. You have not been charged. Please reply to Joseph for help.',
            )
          }
          if (restrictedCustomerId && restrictedCustomerId !== customerId) {
            return rejectPrivatePromo(
              'customer_mismatch',
              'This private $5 link belongs to a different account. Sign in with the email that received it or reply to Joseph. You have not been charged.',
            )
          }

          const coupon = typeof pc.coupon === 'string'
            ? await stripe.coupons.retrieve(pc.coupon)
            : pc.coupon
          if ('deleted' in coupon && coupon.deleted) {
            return rejectPrivatePromo(
              'coupon_deleted',
              'We could not verify the $5 price on this private link. You have not been charged. Please reply to Joseph for help.',
            )
          }
          const amountOff = coupon.amount_off
          const firstChargeAmount = typeof amountOff === 'number' ? unitAmount - amountOff : null
          const expectedFirstCharge = currency === 'usd' ? 500 : currency === 'inr' ? 40500 : null
          if (
            !coupon.valid ||
            coupon.duration !== 'once' ||
            coupon.currency !== currency ||
            firstChargeAmount === null ||
            firstChargeAmount !== expectedFirstCharge
          ) {
            return rejectPrivatePromo(
              coupon.currency !== currency ? 'currency_mismatch' : 'price_mismatch',
              coupon.currency !== currency
                ? 'This private $5 link does not match your current billing currency. You have not been charged. Please reply to Joseph before continuing.'
                : 'We could not verify the exact $5 price on this private link. You have not been charged. Please reply to Joseph before continuing.',
            )
          }

          sessionParams.success_url = `${appUrl}/checkout/success?success=true&currency=${currency}&amount=${firstChargeAmount}&offer=kineo5_pack_upgrade&session_id={CHECKOUT_SESSION_ID}`
          sessionParams.metadata!.offer = 'kineo5_pack_upgrade'
          sessionParams.metadata!.first_charge_amount = String(firstChargeAmount)
          sessionParams.subscription_data!.metadata!.offer = 'kineo5_pack_upgrade'
        }
        sessionParams.discounts = [{ promotion_code: pc.id }]
        discountApplied = true
      } else {
        if (privatePackPromo) {
          return rejectPrivatePromo(
            'not_found_or_inactive',
            'This private $5 upgrade link has expired or is not active. You have not been charged. Please reply to Joseph for help.',
          )
        }
        console.warn('[stripe/checkout] promo not found/inactive, skipping:', requestedPromo)
      }
    } catch (promoErr) {
      console.warn(
        '[stripe/checkout] promo lookup failed:',
        privatePackPromo ? 'KINEO5-[redacted]' : requestedPromo,
        promoErr,
      )
      if (privatePackPromo) {
        return rejectPrivatePromo(
          'verification_failed',
          'We could not verify your private $5 price right now. You have not been charged. Please try again or reply to Joseph.',
        )
      }
    }
  }

  if (privatePackPromo && !discountApplied) {
    return rejectPrivatePromo(
      'discount_not_applied',
      'We could not apply your private $5 price. You have not been charged. Please reply to Joseph before continuing.',
    )
  }

  // A recovery banner displays the exact price saved on the abandoned
  // Session. If an intro or supplied promotion can no longer be reproduced,
  // fail closed instead of opening a full-price Checkout behind that promise.
  if (checkoutRecovery && (intro || requestedPromo) && !discountApplied) {
    await recordCheckoutEvent(
      'checkout_failed',
      user.id,
      { ...checkoutMetadata, failure_stage: 'checkout_recovery', failure_reason: 'saved_discount_unavailable' },
      browserSessionId ?? undefined,
    )
    const message = 'We could not restore the exact saved price. You have not been charged. Please choose a current offer on the pricing page.'
    return isGet ? redirectError(message) : jsonError(message, 409)
  }

  // KINEO-PROMO-FIELD-2026-07-08 — manual promo field for loose campaigns.
  // When we did NOT auto-apply a discount via ?promo=, turn on Stripe's built-in
  // "Add promotion code" field so someone can type a code (e.g. KINEO20) by hand —
  // useful for social posts / stories where we can't force the ?promo= link.
  // Stripe forbids combining `discounts` with allow_promotion_codes, so we enable
  // it ONLY when no discount was applied above (never both on the same session).
  if (!discountApplied) {
    sessionParams.allow_promotion_codes = true
  }

  // A recovered Session is an exact Stripe-side copy of this protected
  // purchase intent. Keep the manual promotion field only for undiscounted
  // checkouts; an already-applied intro/private offer must not accept stacking.
  sessionParams.after_expiration = {
    recovery: {
      enabled: true,
      allow_promotion_codes: !discountApplied,
    },
  }

  // The payment page may need its normal amount copy, but a successful
  // post-video purchase must return to the exact saved render for a clean
  // re-composition. Apply this last so intro/promo branches cannot overwrite it.
  if (returnToWatermark) {
    sessionParams.success_url = `${appUrl}/generate?wm_unlock=1&session_id={CHECKOUT_SESSION_ID}`
  }

  // #481 — Rewardful affiliate attribution. The rewardful_referral cookie is set
  // client-side (root layout) when a visitor arrives via an affiliate link. Pass it
  // as client_reference_id so Rewardful attributes the subscription to the affiliate.
  // Only when present — Stripe Checkout errors on a blank client_reference_id.
  const rwReferral = req.cookies.get('rewardful_referral')?.value
  // PUSH #68: only one commission system may own a subscription. Permanent
  // custom first-touch attribution wins; otherwise Rewardful can receive the
  // Checkout reference. Store the choice on the Subscription for renewals.
  const affiliateSystem = profile.affiliate_id ? 'custom' : rwReferral ? 'rewardful' : 'none'
  sessionParams.metadata!.affiliate_system = affiliateSystem
  sessionParams.subscription_data!.metadata!.affiliate_system = affiliateSystem
  if (affiliateSystem === 'rewardful' && rwReferral) {
    sessionParams.client_reference_id = rwReferral
  }

  // KINEO-CHECKOUT-IDEMPOTENCY-2026-07-15 — 19 of 37 historical expired
  // subscription sessions were repeats; one account created eight sessions in
  // three seconds. Deduplicate only identical purchase intent in a five-minute
  // window. The signature includes every value that can change the price,
  // entitlement, attribution or return behaviour, so another tier, currency,
  // intro/promo, billing period or cancel/success destination stays distinct.
  const checkoutWindow = Math.floor(Date.now() / (5 * 60 * 1000))
  // KINEO-FAST-RECOVERY-2026-08-02: sessao expira em ~2h (era 24h default).
  // POR QUE: o cron send-recovery so age sobre sessao EXPIRADA; com 24h o e-mail
  // de resgate chegava no dia seguinte, intencao fria. Com 2h, o resgate chega
  // 2-4h depois do abandono (cron roda a cada 2h) - a janela que recupera 2-3x.
  // Pedido direto do fundador em 02/08 ("mandar em 3 horas no maximo").
  // Derivado do checkoutWindow (bucket de 5 min) para ser DETERMINISTICO dentro
  // da janela de idempotencia - expires_at dinamico com a mesma idempotencyKey
  // seria rejeitado pelo Stripe. Minimo do Stripe e 30min: 2h passa folgado.
  sessionParams.expires_at = checkoutWindow * 300 + 2 * 60 * 60
  const checkoutIdempotencyKeyFor = (finalCustomerId: string): string => {
    const checkoutSignature = JSON.stringify({
      version: 5,
      user_id: user.id,
      customer_id: finalCustomerId,
      tier,
      billing,
      currency,
      unit_amount: unitAmount,
      interval,
      intro_requested: intro,
      discount_applied: discountApplied,
      discounts: sessionParams.discounts ?? null,
      allow_promotion_codes: sessionParams.allow_promotion_codes ?? false,
      success_url: sessionParams.success_url,
      cancel_url: sessionParams.cancel_url,
      client_reference_id: sessionParams.client_reference_id ?? null,
      affiliate_system: sessionParams.metadata?.affiliate_system ?? 'none',
      checkout_origin: sessionParams.metadata?.checkout_origin ?? 'standard',
      checkout_recovery: sessionParams.metadata?.checkout_recovery ?? '0',
      intent_campaign: sessionParams.metadata?.intent_campaign ?? null,
      after_expiration: sessionParams.after_expiration,
      window: checkoutWindow,
    })
    return `kineo-sub-v4:${createHash('sha256').update(checkoutSignature).digest('hex')}`
  }
  const createCheckoutSessionFor = (finalCustomerId: string) => {
    sessionParams.customer = finalCustomerId
    return stripe.checkout.sessions.create(
      sessionParams,
      { idempotencyKey: checkoutIdempotencyKeyFor(finalCustomerId) },
    )
  }

  let session: Stripe.Checkout.Session
  try {
    session = await createCheckoutSessionFor(customerId)
  } catch (sessionErr) {
    const stripeErr = sessionErr as { message?: string; code?: string }
    const isCurrencyMismatch =
      typeof stripeErr?.message === 'string' &&
      stripeErr.message.toLowerCase().includes('cannot combine currencies')

    if (isCurrencyMismatch) {
      console.warn('[stripe/checkout] currency mismatch — creating new customer and retrying')
      try {
        const priorCustomerId = typeof sessionParams.customer === 'string' ? sessionParams.customer : customerId
        const repairCustomerHash = createHash('sha256')
          .update(`${user.id}:${currency}:${priorCustomerId}`)
          .digest('hex')
          .slice(0, 32)
        const newCustomer = await stripe.customers.create(
          {
            email: profile.email ?? user.email ?? '',
            metadata: { supabase_user_id: user.id, currency_repair: currency },
          },
          { idempotencyKey: `kineo-customer-currency-v1:${repairCustomerHash}` },
        )
        const { error: repairPersistError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: newCustomer.id })
          .eq('id', user.id)
        if (repairPersistError) {
          console.error('[stripe/checkout] currency repair Customer persistence failed:', repairPersistError.message)
        }
        // Recompute from the final Customer so concurrent repairs and the next
        // request using the repaired profile all converge on the same Session.
        session = await createCheckoutSessionFor(newCustomer.id)
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.error('[stripe/checkout] currency mismatch retry failed:', msg)
        return isGet
          ? redirectError(`Payment session failed: ${msg || 'Please try again'}`)
          : jsonError(`Payment session failed: ${msg || 'Please try again'}`, 500)
      }
    } else {
      const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr)
      console.error('[stripe/checkout] Session creation error:', msg)
      return isGet
        ? redirectError(`Payment session failed: ${msg || 'Please try again'}`)
        : jsonError(`Payment session failed: ${msg || 'Please try again'}`, 500)
    }
  }

  await recordCheckoutEvent(
    'checkout_started',
    user.id,
    {
      ...checkoutMetadata,
      intro_applied: discountApplied && intro,
      private_offer_applied: privatePackPromo && discountApplied,
      stripe_session_id: session.id,
    },
    browserSessionId ?? undefined,
  )

  const response = isGet
    ? NextResponse.redirect(session.url!)
    : NextResponse.json({ url: session.url })
  return rememberRecurringCheckout(response, session.id)
}

// ─── One-time Starter Pack checkout (mode: 'payment') ────────────────────────
// #473 — $4.90 (USD) one-time. No recurring, no Stripe product: inline
// price_data + metadata.pack_credits that the webhook reads to grant credits
// (currency-proof). client_reference_id kept for the legacy webhook path.
// KINEO-PRICING-V3D-2026-07-26 — grant is now 30 credits (1 AI-generated video
// + 10 Fast), not 10. See PACK_CREDITS in lib/checkoutPricing.ts.
async function buildPackAndRedirect(req: NextRequest, isGet: boolean): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — the one-time SKUs emitted NO server-side
  // telemetry at all, which is why starter_pack_checkout_clicked (40 events)
  // had no matching checkout_attempted/checkout_started to compare against.
  const browserSessionId = browserSessionIdFrom(req)
  let failureUserId: string | null = null
  const skuContext: Record<string, unknown> = { sku: 'starter10', mode: 'payment' }

  async function redirectError(msg: string) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'redirect', reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(msg)}`)
  }
  async function jsonError(msg: string, status: number) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'json', status, reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.json({ error: msg }, { status })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set')
    return isGet
      ? redirectError('Payment service is not configured. Please contact support.')
      : jsonError('Payment service is not configured. Please contact support.', 500)
  }

  const country = req.headers.get('x-vercel-ip-country') ?? 'US'
  const currency: Currency = resolveCheckoutCurrency(country)
  const unitAmount = PACK_PRICES[currency]
  skuContext.currency = currency
  skuContext.unit_amount = unitAmount

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await recordCheckoutEvent('checkout_attempted', user?.id ?? null, skuContext, browserSessionId)
  if (authError || !user) {
    await recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    // KINEO-CHECKOUT-RESUME-2026-07-07 — carry the full pack checkout URL through
    // login so the purchase resumes automatically after sign-in (see buildAndRedirect).
    // `resumed=1` = loop guard (visible error instead of login↔checkout forever).
    if (!isGet) return jsonError('You must be signed in to buy the Starter Pack.', 401)
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // KINEO-WM-CHECKOUT-2026-07-07 — the post-render "remove watermark" CTA sends
  // ?return=wm so Stripe returns the buyer to /generate?wm_unlock=1 (instead of
  // /checkout/success). The generator then re-renders the SAME just-made Fast
  // video WITHOUT the watermark and swaps it into the preview. Any other pack
  // purchase keeps the normal success page.
  const returnTo = req.nextUrl.searchParams.get('return')
  const packSuccessUrl =
    returnTo === 'wm'
      ? `${appUrl}/generate?wm_unlock=1&session_id={CHECKOUT_SESSION_ID}`
      : `${appUrl}/checkout/success?success=true&pack=starter&currency=${currency}&amount=${unitAmount}&session_id={CHECKOUT_SESSION_ID}`

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: STARTER_PACK.name, description: STARTER_PACK.description },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    client_reference_id: user.id,
    success_url: packSuccessUrl,
    cancel_url: `${appUrl}/generate`,
    metadata: {
      supabase_user_id: user.id,
      pack: 'starter10',
      pack_credits: String(STARTER_PACK.credits),
    },
  }
  // Attach the saved customer when present (cleaner receipts); else use email.
  if (profile?.stripe_customer_id) sessionParams.customer = profile.stripe_customer_id
  else sessionParams.customer_email = profile?.email ?? user.email ?? undefined

  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — one click = at most one Stripe session.
  // Production: 7 pack sessions in 2.8 s from one account (button had no
  // pending state, so the buyer kept clicking).
  const packIdempotencyKey = oneTimeIdempotencyKey({
    sku: 'starter10',
    user_id: user.id,
    currency,
    unit_amount: unitAmount,
    success_url: sessionParams.success_url,
    customer: sessionParams.customer ?? null,
  })

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: packIdempotencyKey })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // A prior subscription in another currency can trigger "cannot combine
    // currencies" when attaching the customer — retry with email only so the
    // sale never blocks.
    if (msg.toLowerCase().includes('cannot combine currencies')) {
      delete sessionParams.customer
      sessionParams.customer_email = profile?.email ?? user.email ?? undefined
      try {
        // Different params ⇒ different key, otherwise Stripe rejects the reuse.
        session = await stripe.checkout.sessions.create(sessionParams, {
          idempotencyKey: `${packIdempotencyKey}:email`,
        })
      } catch (retryErr) {
        const rmsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.error('[stripe/checkout] pack retry failed:', rmsg)
        return isGet ? redirectError(`Payment session failed: ${rmsg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
      }
    } else {
      console.error('[stripe/checkout] pack session error:', msg)
      return isGet ? redirectError(`Payment session failed: ${msg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
    }
  }

  await recordCheckoutEvent(
    'checkout_started',
    user.id,
    { ...skuContext, stripe_session_id: session.id },
    browserSessionId,
  )
  return isGet ? NextResponse.redirect(session.url!) : NextResponse.json({ url: session.url })
}

// ─── KINEO-OFFER290-2026-07-07 — first-purchase $2.90 offer (mode: 'payment') ─
// $2.90 (USD) one-time. Gated behind OFFER_290_ENABLED and hard-limited to 1
// per account: rejects if the user already used the offer
// (profiles.offer290_used) OR already paid anything (has_paid). Credited by the
// webhook via metadata.pack_credits; the webhook also sets offer290_used.
// KINEO-PRICING-V3D-2026-07-26 — grant is now 20 credits (exactly one Seedance
// render), not 10. See PACK_CREDITS in lib/checkoutPricing.ts.
async function buildStarter290AndRedirect(req: NextRequest, isGet: boolean): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const browserSessionId = browserSessionIdFrom(req)
  let failureUserId: string | null = null
  const skuContext: Record<string, unknown> = { sku: 'starter290', mode: 'payment' }

  async function redirectError(msg: string) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'redirect', reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.redirect(`${appUrl}/generate?checkout_error=${encodeURIComponent(msg)}`)
  }
  async function jsonError(msg: string, status: number) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'json', status, reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.json({ error: msg }, { status })
  }

  // Feature flag OFF → SKU disabled (410 Gone). Nothing can be purchased.
  if (!OFFER_290_ENABLED) {
    return isGet
      ? redirectError('This offer is not available.')
      : jsonError('Offer disabled.', 410)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set')
    return isGet ? redirectError('Payment service is not configured. Please contact support.') : jsonError('Payment service is not configured. Please contact support.', 500)
  }

  const country = req.headers.get('x-vercel-ip-country') ?? 'US'
  const currency: Currency = resolveCheckoutCurrency(country)
  const unitAmount = PACK290_PRICES[currency]
  skuContext.currency = currency
  skuContext.unit_amount = unitAmount

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await recordCheckoutEvent('checkout_attempted', user?.id ?? null, skuContext, browserSessionId)
  if (authError || !user) {
    await recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    // KINEO-CHECKOUT-RESUME-2026-07-07 — resume the offer checkout after sign-in.
    if (!isGet) return jsonError('You must be signed in to claim this offer.', 401)
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id, has_paid, offer290_used')
    .eq('id', user.id)
    .single()

  // Enforce 1-per-account: already claimed the offer, or already paid anything.
  if (profile?.offer290_used === true || profile?.has_paid === true) {
    return isGet
      ? redirectError('You already claimed this one-time offer.')
      : jsonError('Offer already used.', 409)
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: STARTER290_PACK.name, description: STARTER290_PACK.description },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    client_reference_id: user.id,
    success_url: `${appUrl}/checkout/success?success=true&pack=starter290&currency=${currency}&amount=${unitAmount}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/generate`,
    metadata: {
      supabase_user_id: user.id,
      pack: 'starter290',
      pack_credits: String(STARTER290_PACK.credits),
    },
  }
  if (profile?.stripe_customer_id) sessionParams.customer = profile.stripe_customer_id
  else sessionParams.customer_email = profile?.email ?? user.email ?? undefined

  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — one click = at most one Stripe session.
  const offerIdempotencyKey = oneTimeIdempotencyKey({
    sku: 'starter290',
    user_id: user.id,
    currency,
    unit_amount: unitAmount,
    customer: sessionParams.customer ?? null,
  })

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: offerIdempotencyKey })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('cannot combine currencies')) {
      delete sessionParams.customer
      sessionParams.customer_email = profile?.email ?? user.email ?? undefined
      try {
        session = await stripe.checkout.sessions.create(sessionParams, {
          idempotencyKey: `${offerIdempotencyKey}:email`,
        })
      } catch (retryErr) {
        const rmsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.error('[stripe/checkout] starter290 retry failed:', rmsg)
        return isGet ? redirectError(`Payment session failed: ${rmsg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
      }
    } else {
      console.error('[stripe/checkout] starter290 session error:', msg)
      return isGet ? redirectError(`Payment session failed: ${msg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
    }
  }

  console.log(`[stripe/checkout] starter290 session: user=${user.id.slice(0, 8)} amount=${unitAmount}`)
  await recordCheckoutEvent(
    'checkout_started',
    user.id,
    { ...skuContext, stripe_session_id: session.id },
    browserSessionId,
  )
  return isGet ? NextResponse.redirect(session.url!) : NextResponse.json({ url: session.url })
}

// ─── KINEO-TOPUP-2026-07-06 — AI credit top-up checkout (mode: 'payment') ─────
// Gated to Creator+ (basic/pro). Frees a subscriber who ran out of AI credits
// mid-cycle to buy 1 or 3 more AI videos instead of hitting a wall. Credited by
// the webhook via metadata.pack_credits.
async function buildTopupAndRedirect(req: NextRequest, topupId: TopupId, isGet: boolean): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const browserSessionId = browserSessionIdFrom(req)
  let failureUserId: string | null = null
  const skuContext: Record<string, unknown> = { sku: topupId, mode: 'payment' }

  async function redirectError(msg: string) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'redirect', reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.redirect(`${appUrl}/generate?checkout_error=${encodeURIComponent(msg)}`)
  }
  async function jsonError(msg: string, status: number) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'json', status, reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.json({ error: msg }, { status })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set')
    return isGet ? redirectError('Payment service is not configured. Please contact support.') : jsonError('Payment service is not configured. Please contact support.', 500)
  }

  const country = req.headers.get('x-vercel-ip-country') ?? 'US'
  const currency: Currency = resolveCheckoutCurrency(country)
  const topup = CREDIT_TOPUPS[topupId]
  const unitAmount = topup.prices[currency]
  skuContext.currency = currency
  skuContext.unit_amount = unitAmount

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await recordCheckoutEvent('checkout_attempted', user?.id ?? null, skuContext, browserSessionId)
  if (authError || !user) {
    await recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    // KINEO-CHECKOUT-RESUME-2026-07-07 — resume the top-up checkout after sign-in.
    // `resumed=1` = loop guard (visible error instead of login↔checkout forever).
    if (!isGet) return jsonError('You must be signed in to buy credits.', 401)
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id, plan')
    .eq('id', user.id)
    .single()

  // Gate: AI credit top-ups are a Creator/Studio benefit (the AI engine lives on
  // those plans). Free/Starter users are sent to /pricing to subscribe instead.
  const planVal = (profile?.plan ?? 'free').toLowerCase()
  const isCreatorPlus = planVal === 'basic' || planVal === 'basic_trial' || planVal === 'pro' || planVal === 'pro_trial'
  if (!isCreatorPlus) {
    return isGet
      ? NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent('Credit top-ups are for Creator & Studio plans. Upgrade to unlock the AI engine.')}`)
      : jsonError('Credit top-ups require a Creator or Studio plan.', 403)
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: topup.name, description: topup.description },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    client_reference_id: user.id,
    success_url: `${appUrl}/generate?success=true&topup=${topupId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/generate`,
    metadata: {
      supabase_user_id: user.id,
      pack: topupId,
      pack_credits: String(topup.credits),
    },
  }
  if (profile?.stripe_customer_id) sessionParams.customer = profile.stripe_customer_id
  else sessionParams.customer_email = profile?.email ?? user.email ?? undefined

  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — one click = at most one Stripe session.
  const topupIdempotencyKey = oneTimeIdempotencyKey({
    sku: topupId,
    user_id: user.id,
    currency,
    unit_amount: unitAmount,
    customer: sessionParams.customer ?? null,
  })

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: topupIdempotencyKey })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('cannot combine currencies')) {
      delete sessionParams.customer
      sessionParams.customer_email = profile?.email ?? user.email ?? undefined
      try {
        session = await stripe.checkout.sessions.create(sessionParams, {
          idempotencyKey: `${topupIdempotencyKey}:email`,
        })
      } catch (retryErr) {
        const rmsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.error('[stripe/checkout] topup retry failed:', rmsg)
        return isGet ? redirectError(`Payment session failed: ${rmsg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
      }
    } else {
      console.error('[stripe/checkout] topup session error:', msg)
      return isGet ? redirectError(`Payment session failed: ${msg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
    }
  }

  console.log(`[stripe/checkout] topup session: ${topupId} user=${user.id.slice(0, 8)} amount=${unitAmount}`)
  await recordCheckoutEvent(
    'checkout_started',
    user.id,
    { ...skuContext, stripe_session_id: session.id },
    browserSessionId,
  )
  return isGet ? NextResponse.redirect(session.url!) : NextResponse.json({ url: session.url })
}

// ─── KINEO-PILOT-99-2026-07-26 — $99 / 7-day Autopilot pilot ─────────────────
// Deliberately mode:'payment'. A 7-day subscription that auto-renews at $99
// would be a different (worse) product: the buyer's next decision becomes
// "cancel before I'm charged again" instead of "keep this running".
async function buildAutopilotPilotAndRedirect(req: NextRequest, isGet: boolean): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const browserSessionId = browserSessionIdFrom(req)
  let failureUserId: string | null = null
  const skuContext: Record<string, unknown> = { sku: 'autopilot_pilot', mode: 'payment' }

  async function redirectError(msg: string) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'redirect', reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(msg)}`)
  }
  async function jsonError(msg: string, status: number) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'json', status, reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.json({ error: msg }, { status })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set')
    return isGet ? redirectError('Payment service is not configured. Please contact support.') : jsonError('Payment service is not configured. Please contact support.', 500)
  }

  const country = req.headers.get('x-vercel-ip-country') ?? 'US'
  const currency: Currency = resolveCheckoutCurrency(country)
  const unitAmount = AUTOPILOT_PILOT_PRICES[currency]
  skuContext.currency = currency
  skuContext.unit_amount = unitAmount

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await recordCheckoutEvent('checkout_attempted', user?.id ?? null, skuContext, browserSessionId)
  if (authError || !user) {
    await recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    if (!isGet) return jsonError('You must be signed in to start the Autopilot Pilot.', 401)
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  // ⚠️ THE SKU IS INERT UNTIL THE MIGRATION IS APPLIED, BY DESIGN.
  // profiles.plan_expires_at is created by
  //   migrations_pending/2026-07-26_autopilot_pilot_plan_expiry.sql
  // and is the ONLY thing that ends the pilot. Without it we would be selling
  // a $299/month service once, for $99, forever. So the column is probed here,
  // BEFORE a card is charged, and its absence blocks the sale instead of
  // producing a permanent entitlement. 42703 = undefined_column.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id, plan, plan_expires_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    const code = (profileError as { code?: string }).code ?? ''
    const missingExpiryColumn = code === '42703' || /plan_expires_at/.test(profileError.message ?? '')
    if (missingExpiryColumn) {
      console.error(
        '[stripe/checkout] autopilot_pilot BLOCKED: profiles.plan_expires_at does not exist. ' +
        'Apply migrations_pending/2026-07-26_autopilot_pilot_plan_expiry.sql before selling this SKU.',
      )
      return isGet
        ? redirectError('The Autopilot Pilot is not available yet. Please contact support.')
        : jsonError('Autopilot Pilot is not available yet.', 503)
    }
    console.error('[stripe/checkout] autopilot_pilot profile lookup failed:', profileError.message)
    return isGet
      ? redirectError('We could not load your account. Please try again.')
      : jsonError('Profile lookup failed.', 500)
  }

  const planVal = (profile?.plan ?? 'free').toString().toLowerCase().trim()

  // Already paying $299/month: selling them a $99 downgrade is a refund waiting
  // to happen. Send them to the running Autopilot instead.
  if (planVal === 'autopilot' || planVal === 'autopilot_trial') {
    return isGet
      ? NextResponse.redirect(`${appUrl}/autopilot?already_active=1`)
      : jsonError('Your Autopilot subscription is already active.', 409)
  }

  // A pilot that has not expired yet is still running. Buying a second one
  // would take $99 and change nothing the buyer can see.
  if (planVal === AUTOPILOT_PILOT_PLAN && isAutopilotEntitled(profile)) {
    return isGet
      ? NextResponse.redirect(`${appUrl}/autopilot?already_active=1`)
      : jsonError('Your Autopilot Pilot is already running.', 409)
  }

  const pilotPriceId = autopilotPilotPriceIdOverride(currency)
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      pilotPriceId
        ? { price: pilotPriceId, quantity: 1 }
        : {
            price_data: {
              currency,
              product_data: { name: AUTOPILOT_PILOT_PACK.name, description: AUTOPILOT_PILOT_PACK.description },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
    ],
    client_reference_id: user.id,
    success_url: `${appUrl}/autopilot?success=true&pack=autopilot_pilot&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      supabase_user_id: user.id,
      // `pack` is what webhook Path A branches on. `pack_credits` is the
      // currency-proof grant. `plan_grant` + `plan_days` are read by the same
      // branch so the plan name and the expiry window are never retyped there.
      pack: 'autopilot_pilot',
      pack_credits: String(AUTOPILOT_PILOT_PACK.credits),
      plan_grant: AUTOPILOT_PILOT_PLAN,
      plan_days: String(AUTOPILOT_PILOT_DAYS),
    },
  }
  if (profile?.stripe_customer_id) sessionParams.customer = profile.stripe_customer_id
  else sessionParams.customer_email = profile?.email ?? user.email ?? undefined

  const pilotIdempotencyKey = oneTimeIdempotencyKey({
    sku: 'autopilot_pilot',
    user_id: user.id,
    currency,
    unit_amount: unitAmount,
    price_id: pilotPriceId,
    customer: sessionParams.customer ?? null,
  })

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: pilotIdempotencyKey })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('cannot combine currencies')) {
      delete sessionParams.customer
      sessionParams.customer_email = profile?.email ?? user.email ?? undefined
      try {
        session = await stripe.checkout.sessions.create(sessionParams, {
          idempotencyKey: `${pilotIdempotencyKey}:email`,
        })
      } catch (retryErr) {
        const rmsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.error('[stripe/checkout] autopilot_pilot retry failed:', rmsg)
        return isGet ? redirectError(`Payment session failed: ${rmsg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
      }
    } else {
      console.error('[stripe/checkout] autopilot_pilot session error:', msg)
      return isGet ? redirectError(`Payment session failed: ${msg || 'Please try again'}`) : jsonError('Payment session failed.', 500)
    }
  }

  console.log(`[stripe/checkout] autopilot_pilot session: user=${user.id.slice(0, 8)} amount=${unitAmount} ${currency}`)
  await recordCheckoutEvent(
    'checkout_started',
    user.id,
    { ...skuContext, stripe_session_id: session.id },
    browserSessionId,
  )
  return isGet ? NextResponse.redirect(session.url!) : NextResponse.json({ url: session.url })
}

// ─── KINEO-BULK-2026-07-27 — pacotes de atacado (mode: 'payment') ────────────
// Escada aprovada pelo fundador em 27/07: 10/$99, 20/$179, 30/$249, 50/$379.
// Vende VÍDEO, não ferramenta. Sem gate de plano: o comprador de atacado é
// justamente quem NÃO tem assinatura — exigir plano seria o mesmo laço fechado
// que mantém o Autopilot em 0 canais conectados (docs/PROJECT_STATE.md §3.2).
//
// Só USD. Ver a justificativa em lib/checkoutPricing.ts (BULK_PACKS): o fundador
// aprovou quatro números em dólar e inventar câmbio para um SKU de atacado não é
// decisão de Development.
async function buildBulkPackAndRedirect(
  req: NextRequest,
  bulkId: BulkPackId,
  isGet: boolean,
): Promise<NextResponse> {
  const appUrl = req.nextUrl.origin
  const browserSessionId = browserSessionIdFrom(req)
  const pack = BULK_PACKS[bulkId]
  let failureUserId: string | null = null
  const skuContext: Record<string, unknown> = {
    sku: bulkId,
    mode: 'payment',
    bulk_videos: pack.videos,
    bulk_credits: pack.credits,
  }

  async function redirectError(msg: string) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'redirect', reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(msg)}`)
  }
  async function jsonError(msg: string, status: number) {
    await recordCheckoutEvent(
      'checkout_failed',
      failureUserId,
      { ...skuContext, stage: 'json', status, reason: checkoutFailureReason(msg) },
      browserSessionId,
    )
    return NextResponse.json({ error: msg }, { status })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set')
    return isGet
      ? redirectError('Payment service is not configured. Please contact support.')
      : jsonError('Payment service is not configured. Please contact support.', 500)
  }

  // Preço de atacado é em dólar, sempre — não segue o país do IP como os outros.
  const currency: Currency = 'usd'
  const unitAmount = pack.usdMinor
  skuContext.currency = currency
  skuContext.unit_amount = unitAmount

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  failureUserId = user?.id ?? null
  await recordCheckoutEvent('checkout_attempted', user?.id ?? null, skuContext, browserSessionId)
  if (authError || !user) {
    await recordCheckoutEvent('checkout_auth_required', null, skuContext, browserSessionId)
    if (!isGet) return jsonError('You must be signed in to buy a video pack.', 401)
    // `resumed=1` = trava de laço (erro visível em vez de login↔checkout eterno).
    if (req.nextUrl.searchParams.get('resumed') === '1') {
      return redirectError('We could not confirm your sign-in. Please sign in and try again.')
    }
    const resume = `${req.nextUrl.pathname}${req.nextUrl.search}${req.nextUrl.search ? '&' : '?'}resumed=1`
    return NextResponse.redirect(`${appUrl}/login?reason=checkout&redirect=${encodeURIComponent(resume)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Kineo — ${pack.videos} Shorts`,
            description:
              `One-time: ${pack.videos} ready-to-post vertical Shorts (script, voiceover, captions and footage). ` +
              `No subscription. Credits never expire.`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    client_reference_id: user.id,
    success_url: `${appUrl}/generate?success=true&pack=${bulkId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      supabase_user_id: user.id,
      // ⚠️ metadata.pack é a ÚNICA coisa que distingue bulk10 de autopilot_pilot:
      // os dois custam 9900 em USD. O webhook se RECUSA a resolver esse valor por
      // fallback (AMBIGUOUS_ONE_TIME_USD_AMOUNTS), então esta chave não é
      // conveniência — é o que impede um pacote de 10 vídeos de virar um plano
      // Autopilot de $299/mês.
      pack: bulkId,
      pack_credits: String(pack.credits),
      bulk_videos: String(pack.videos),
    },
  }
  if (profile?.stripe_customer_id) sessionParams.customer = profile.stripe_customer_id
  else sessionParams.customer_email = profile?.email ?? user.email ?? undefined

  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — um clique = no máximo uma sessão Stripe.
  // Produção mostrou 1 usuário gerando 7 sessions em 2,8s quando os SKUs avulsos
  // não tinham chave nenhuma. Nasce com chave.
  const bulkIdempotencyKey = oneTimeIdempotencyKey({
    sku: bulkId,
    user_id: user.id,
    currency,
    unit_amount: unitAmount,
    customer: sessionParams.customer ?? null,
  })

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: bulkIdempotencyKey })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Um customer criado em BRL/INR não aceita uma sessão em USD. Cai para
    // customer_email, exatamente como os outros SKUs one-time fazem.
    if (msg.toLowerCase().includes('cannot combine currencies')) {
      delete sessionParams.customer
      sessionParams.customer_email = profile?.email ?? user.email ?? undefined
      try {
        session = await stripe.checkout.sessions.create(sessionParams, {
          idempotencyKey: `${bulkIdempotencyKey}:email`,
        })
      } catch (retryErr) {
        const rmsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.error('[stripe/checkout] bulk retry failed:', rmsg)
        return isGet
          ? redirectError(`Payment session failed: ${rmsg || 'Please try again'}`)
          : jsonError('Payment session failed.', 500)
      }
    } else {
      console.error('[stripe/checkout] bulk session error:', msg)
      return isGet
        ? redirectError(`Payment session failed: ${msg || 'Please try again'}`)
        : jsonError('Payment session failed.', 500)
    }
  }

  console.log(
    `[stripe/checkout] bulk session: ${bulkId} user=${user.id.slice(0, 8)} amount=${unitAmount} ${currency}`,
  )
  await recordCheckoutEvent(
    'checkout_started',
    user.id,
    { ...skuContext, stripe_session_id: session.id },
    browserSessionId,
  )
  // KINEO-BULK-2026-07-27 — evento nomeado do funil de atacado. `checkout_started`
  // continua sendo emitido (o funil geral não pode ganhar um buraco), mas contar
  // atacado a partir dele exige filtrar metadata.sku. Um nome próprio torna o
  // funil de atacado contável direto.
  await recordCheckoutEvent(
    'bulk_checkout_started',
    user.id,
    { ...skuContext, stripe_session_id: session.id },
    browserSessionId,
  )
  return isGet ? NextResponse.redirect(session.url!) : NextResponse.json({ url: session.url })
}

// KINEO-AVATAR-PACKS-RETIRED-2026-07-06 — buildAvatarPackAndRedirect() removed.
// Avatar packs sold profiles.avatar_credits, now unspendable (avatar generation
// costs 120 universal video_credits). ?pack=avatar* now returns a clean 410 in
// the GET handler below instead of creating a Stripe session.

// ─── GET handler (iOS Safari safe — server-side redirect) ────────────────────
// Buttons set window.location.href = '/api/stripe/checkout?tier=basic' so
// the browser navigates synchronously (no await / no gesture-chain break).
export async function GET(req: NextRequest) {
  try {
    // KINEO-CHECKOUT-TRIAGE-2026-07-25 — a speculative fetch is not a purchase.
    // Bounce it BEFORE any Supabase or Stripe work so link scanners and browser
    // preloading can never mint a Checkout Session for a tier nobody clicked.
    if (isSpeculativeRequest(req)) {
      const selection =
        req.nextUrl.searchParams.get('pack') ?? req.nextUrl.searchParams.get('tier') ?? 'basic'
      return await speculativeNoop(req, selection)
    }

    // #473 — Starter Pack one-time checkout: /api/stripe/checkout?pack=starter
    const packParam = req.nextUrl.searchParams.get('pack')
    if (packParam) {
      // KINEO-AVATAR-PACKS-RETIRED-2026-07-06 — avatar packs are gone. Avatar
      // videos now use universal credits, so avatar_credits packs are unsellable.
      // Return a clean 410 rather than crashing on the removed builder.
      if (packParam === 'avatar1' || packParam === 'avatar3' || packParam === 'avatar10') {
        return NextResponse.json(
          { error: 'Avatar packs retired — avatar videos now use universal credits' },
          { status: 410 },
        )
      }
      // KINEO-TOPUP-2026-07-06 — AI credit top-ups (Creator+).
      if (packParam === 'topup40' || packParam === 'topup120') {
        return await buildTopupAndRedirect(req, packParam, true)
      }
      // KINEO-BULK-2026-07-27 — pacotes de atacado. Precisa vir ANTES do
      // fallback buildPackAndRedirect, que venderia um Starter Pack de $4.90 no
      // lugar de um pacote de $379 sem dar erro nenhum — a mesma armadilha
      // documentada no branch do autopilot_pilot logo abaixo.
      if (isBulkPackId(packParam)) {
        return await buildBulkPackAndRedirect(req, packParam, true)
      }
      // KINEO-PILOT-99-2026-07-26 — sem este branch o ?pack=autopilot_pilot cai
      // no buildPackAndRedirect e vende um Starter Pack de $4.90 no lugar.
      if (packParam === 'autopilot_pilot') {
        return await buildAutopilotPilotAndRedirect(req, true)
      }
      // KINEO-OFFER290-2026-07-07 — first-purchase $2.90 offer (flag-gated).
      if (packParam === 'starter290') {
        return await buildStarter290AndRedirect(req, true)
      }
      return await buildPackAndRedirect(req, true)
    }
    const tierParam = req.nextUrl.searchParams.get('tier') ?? 'basic'
    // KINEO-AUTOPILOT-299-2026-07-26 — ?tier=autopilot added. Unknown values
    // still fall through to 'basic', unchanged.
    const tier: PlanTier =
      tierParam === 'pro' ? 'pro'
        : tierParam === 'starter' ? 'starter'
          : tierParam === 'autopilot' ? 'autopilot'
            : 'basic'
    const billing: Billing = req.nextUrl.searchParams.get('billing') === 'annual' ? 'annual' : 'monthly'
    const promo = req.nextUrl.searchParams.get('promo') ?? undefined
    // KINEO-INTRO-MONTH-2026-07-13 — ?intro=1 → 1º mês com desconto.
    const intro = req.nextUrl.searchParams.get('intro') === '1'
    return await buildAndRedirect(req, tier, true, billing, promo, intro)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[stripe/checkout GET] Unexpected error:', msg)
    const appUrl = req.nextUrl.origin
    return NextResponse.redirect(
      `${appUrl}/pricing?checkout_error=${encodeURIComponent('An unexpected error occurred. Please try again.')}`
    )
  }
}
