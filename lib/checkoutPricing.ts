// KINEO-PILOT-99-2026-07-26 — imported so the $99 pilot's credit grant is
// checked against the REAL cost of the engines the Autopilot cron is allowed
// to run, not against a number retyped here that stops being true the next
// time someone reprices an engine. Neither module imports this one, so there
// is no cycle: engineCost.ts imports nothing, autopilot/config.ts imports only
// a type from engineCost.ts.
import { creditCostFor } from '@/lib/credits/engineCost'
import { AUTOPILOT_ALLOWED_ENGINES, AUTOPILOT_PILOT_DAYS } from '@/lib/autopilot/config'

export type CheckoutTier = 'starter' | 'basic' | 'pro'
// KINEO-AUTOPILOT-299-2026-07-26 — Autopilot is a fourth PAID plan, but it is
// deliberately NOT folded into CheckoutTier. CheckoutTier is consumed by
// Record<CheckoutTier, …> maps outside this module (lib/kineoFacts.ts) that
// describe the three self-serve credit plans; widening it there would be a lie
// (Autopilot is a done-for-you service, not a credit bundle) as well as a
// compile break. Anything that must accept all four uses CheckoutPlanTier.
export type CheckoutPlanTier = CheckoutTier | 'autopilot'
export type CheckoutIntroTier = 'starter' | 'basic'
export type CheckoutCurrency = 'usd' | 'brl' | 'inr'

// Single price source for the server-authoritative Stripe route and every
// checkout-facing display. Amounts are in cents, centavos, or paise.
export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 990, brl: 4990, inr: 79900 },
  basic: { usd: 2490, brl: 9990, inr: 159900 },
  pro: { usd: 3790, brl: 18990, inr: 299900 },
}

// KINEO-AUTOPILOT-299-2026-07-26 — $299/mo done-for-you tier. BRL/INR follow
// the same multipliers the rest of the ladder already uses (BRL ≈ 5.0x USD,
// INR ≈ 81x USD) so the three storefronts stay internally consistent.
export const AUTOPILOT_PRICES: Record<CheckoutCurrency, number> = {
  usd: 29900, brl: 149900, inr: 2419900,
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PILOT-99-2026-07-26 — THE $99 AUTOPILOT PILOT (one-time, 7 days).
// ═══════════════════════════════════════════════════════════════════════════
// $299/month is the right price for Autopilot and the wrong ASK for a base of
// 713 signups whose entire paid history is 3 customers. The pilot is the ask
// that fits: "$99. One week. 7 Shorts published to your channel, one per day,
// at the time you pick." It is a one-time PAYMENT, not a subscription — the
// $299 upsell then becomes a decision to NOT interrupt something already
// running on the customer's own channel.
//
// The pilot is NOT a cheaper Autopilot. It is the same machine with a hard
// end date, which is why the plan it grants (autopilot_pilot) carries an
// expiry that the CRON enforces — see lib/autopilot/config.ts.
//
// BRL/INR follow the same multipliers as the rest of the ladder (BRL ≈ 5.0x,
// INR ≈ 80.8x). Do NOT let any two SKU amounts collide across currencies
// without a currency check: the webhook's value-based fallback compares
// amount_total, and topup40 is ₹49,900 while the pilot is R$499,00 — the same
// integer. Every fallback added for this SKU is currency-qualified.
export const AUTOPILOT_PILOT_PRICES: Record<CheckoutCurrency, number> = {
  usd: 9900, brl: 49900, inr: 799900,
}

// Days of Autopilot the pilot buys — and therefore the number of Shorts
// promised. Declared in lib/autopilot/config.ts (the cron reads it there) and
// re-exported here so the pricing page and the invariants below cannot drift
// from what the scheduler actually does.
export { AUTOPILOT_PILOT_DAYS }

// Credit grant. The pilot's 7 daily Shorts are produced by the cron on a
// server-clamped engine (lib/autopilot/config.ts limits Autopilot to
// 'fast' = 1 credit or 'basic_ai' = 8 credits), so the worst case the daily
// job can cost is 7 x 8 = 56 credits. 60 clears that with a little room for
// the customer to press Generate themselves without the pilot silently dying
// on 'insufficient_credits' — which, mid-pilot, reads to the buyer as "the
// product broke", not "I ran out". The invariant below machine-checks it.
export const AUTOPILOT_PILOT_CREDITS = 60

// Monthly price for ANY paid plan, including Autopilot. Prefer this over
// indexing TIER_PRICES directly when the tier can be 'autopilot'.
export function monthlyPriceMinor(tier: CheckoutPlanTier, currency: CheckoutCurrency): number {
  return tier === 'autopilot' ? AUTOPILOT_PRICES[currency] : TIER_PRICES[tier][currency]
}

// Autopilot has no annual SKU on purpose: it is an operational commitment
// (we publish to the customer's channel every day), and a 12-month prepay on a
// service we have never run at scale is a refund liability, not revenue.
export const ANNUAL_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 9900, brl: 49900, inr: 799000 },
  basic: { usd: 19900, brl: 99900, inr: 1599000 },
  pro: { usd: 37900, brl: 189900, inr: 2999000 },
}

export const INTRO_PRICES: Record<CheckoutIntroTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 490, brl: 2490, inr: 39900 },
  basic: { usd: 990, brl: 4990, inr: 79900 },
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V3D-2026-07-26 — CREDIT GRANTS ARE PART OF THE PRICE.
// ═══════════════════════════════════════════════════════════════════════════
// Every grant below used to live as a magic number inside the checkout route,
// the webhook, and the marketing copy independently. They drifted (see the
// three defects fixed in this push). They are declared ONCE here and imported
// everywhere; the invariant assertions at the bottom of this file fail loudly
// in dev if a future edit reintroduces a below-cost or inverted SKU.
//
// COST BASIS (from lib/credits/engineCost.ts + the provider notes in
// app/api/generate-video-cinematic/route.ts):
//   Fast              1 credit  ≈ $0.02 – 0.05 / render  → ≤ $0.050 / credit
//   AI Gen (Seedance) 20 credits ≈ $1.56 – 2.34 / render → ≤ $0.117 / credit
//   Kling             50 credits (cost not repriced here)
//   Hollywood         150 credits ≈ $8.90 – 10.20        → ≤ $0.068 / credit
//   Avatar            110 credits ≈ $9.60                → ≤ $0.087 / credit
// Seedance is the WORST dollar-per-credit engine in the catalog at $0.117/cr.
// Worst-case COGS for a grant of N credits is therefore:
//   floor(N / 20) Seedance renders + (N mod 20) Fast renders.
export const WORST_CASE_USD_PER_CREDIT = 0.117
export const FAST_USD_PER_CREDIT = 0.05

/** Worst-case provider cost (USD) a user can extract from a grant of N credits. */
export function worstCaseCogsUsd(credits: number): number {
  const seedanceRenders = Math.floor(credits / 20)
  const leftoverFast = credits % 20
  return seedanceRenders * 20 * WORST_CASE_USD_PER_CREDIT + leftoverFast * FAST_USD_PER_CREDIT
}

/** Stripe standard card pricing: 2.9% + $0.30. USD only — used for margin math. */
export function netAfterStripeUsd(grossUsd: number): number {
  return grossUsd * 0.971 - 0.30
}

// Recurring monthly credit grant per paid plan. Autopilot's 400 is sized so a
// daily Short (30 Fast renders = 30 credits) leaves the customer plenty of
// manual headroom without ever letting the plan go underwater: even if all 400
// were burned on Seedance the COGS is $46.80 against ~$290 net.
export const TIER_CREDITS: Record<CheckoutPlanTier, number> = {
  starter: 25,
  basic: 150,
  pro: 200,
  autopilot: 400,
}

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (b). The intro coupon sells the FIRST
// month of Creator for $9.90 (net $9.31) but used to hand over the full 150
// credits. 150 credits buys 7 Seedance renders + 10 Fast = $16.88 of provider
// spend, i.e. −$7.57 on month one, and it also puts a 150-credit Hollywood
// render ($8.90–10.20) in reach for $9.90. The intro month now grants 50
// credits: worst case 2 Seedance + 10 Fast = $5.18, leaving +$4.13 (44%), and
// Hollywood/Avatar/Veo/Sora are all structurally out of reach.
// APPLIES TO THE FIRST INVOICE ONLY — renewals grant TIER_CREDITS.
export const INTRO_CREDITS: Record<CheckoutIntroTier, number> = {
  starter: 25,
  basic: 50,
}

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (a). The entry packs used to grant 10
// credits. 10 credits does buy 10 Fast videos (Fast = 1 credit for a paying
// account), so the copy was not lying — but the cheapest GENERATIVE engine
// (Seedance) costs 20, so the first dollar a customer ever spent with us
// bought exactly zero AI videos. Both packs now clear that bar.
//   $2.90 → net $2.516; 20 cr = 1 Seedance ($2.34)            → +$0.18 (7.0%)
//   $4.90 → net $4.458; 30 cr = 1 Seedance + 10 Fast ($2.84)  → +$1.62 (36.3%)
// NOTE FOR THE NEXT PERSON: "two or three AI videos for $4.90" is arithmetically
// impossible. 40 credits = 2 Seedance = $4.68 worst case, which is −$0.22 on a
// $4.90 sale. 30 is the ceiling at this price point.
export const PACK_CREDITS = {
  /** ?pack=starter — the $4.90 First Pack. */
  starter: 30,
  /** ?pack=starter290 — the dormant $2.90 offer (lib/flags.ts OFFER_290_ENABLED). */
  starter290: 20,
} as const

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (c). Top-ups are sold ONLY to existing
// subscribers, so they must cost MORE per credit than the subscription they sit
// on top of; otherwise the rational move for a Creator/Studio subscriber is to
// buy the plan once and then top up forever, and we sell credits below our own
// cheapest shelf price. That invariant was inverted:
//   Creator  $24.90 / 150 = $0.1660 / cr
//   Studio   $37.90 / 200 = $0.1895 / cr   ← cheapest paid plan per credit
//   topup40  $5.90  /  40 = $0.1475 / cr   ← BELOW both
//   topup120 $12.90 / 120 = $0.1075 / cr   ← BELOW both, by 35%
// The SKU IDS ARE PRESERVED — they are the ?pack= URL keys and appear in
// GenerateClient. The grants shrink to restore the invariant:
//   topup40  $5.90  / 30 = $0.1967 / cr  (+3.8% vs Studio, +18.5% vs Creator)
//   topup120 $12.90 / 65 = $0.1985 / cr  (+4.8% vs Studio, +19.6% vs Creator)
// Worst-case margins: +$2.59 (48%) and +$4.96 (41%).
export const TOPUP_CREDITS = {
  topup40: 30,
  topup120: 65,
} as const

export type TopupId = keyof typeof TOPUP_CREDITS

/** USD price per credit of a recurring plan. Lower = better value for the user. */
export function planUsdPerCredit(tier: CheckoutPlanTier): number {
  return monthlyPriceMinor(tier, 'usd') / 100 / TIER_CREDITS[tier]
}

/**
 * The cheapest per-credit rate any subscriber can get from a recurring plan.
 * Autopilot is excluded: its credits are a byproduct of a managed service, not
 * the thing being sold, and including it would make the floor meaningless.
 * Every top-up must price ABOVE this number.
 */
export const CHEAPEST_PLAN_USD_PER_CREDIT: number = Math.min(
  planUsdPerCredit('starter'),
  planUsdPerCredit('basic'),
  planUsdPerCredit('pro'),
)

export const CURRENCY_DISPLAY: Record<CheckoutCurrency, {
  locale: string
  currencyCode: string
  label: string
}> = {
  usd: { locale: 'en-US', currencyCode: 'USD', label: 'USD' },
  brl: { locale: 'pt-BR', currencyCode: 'BRL', label: 'BRL' },
  inr: { locale: 'en-IN', currencyCode: 'INR', label: 'INR' },
}

export function resolveCheckoutCurrency(country: string | null | undefined): CheckoutCurrency {
  const normalized = String(country || '').toUpperCase()
  return normalized === 'BR' ? 'brl' : normalized === 'IN' ? 'inr' : 'usd'
}

export function formatCheckoutMoney(currency: CheckoutCurrency, amountMinor: number): string {
  const config = CURRENCY_DISPLAY[currency]
  const fractionDigits = currency === 'inr' ? 0 : 2
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / 100).replace(/\u00a0/g, ' ')
}

// ═══════════════════════════════════════════════════════════════════════════
// INVARIANTS — checked at import time in dev/test, never in production.
// ═══════════════════════════════════════════════════════════════════════════
// The three defects this push fixed were all "a comment asserted an invariant
// that the numbers stopped satisfying". A comment cannot fail. These can.
export function checkPricingInvariants(): string[] {
  const problems: string[] = []

  // (1) Every top-up costs MORE per credit than the cheapest recurring plan.
  for (const id of Object.keys(TOPUP_CREDITS) as TopupId[]) {
    const usd = TOPUP_USD_PRICES[id] / 100
    const perCredit = usd / TOPUP_CREDITS[id]
    if (perCredit <= CHEAPEST_PLAN_USD_PER_CREDIT) {
      problems.push(
        `${id} is $${perCredit.toFixed(4)}/credit, at or below the cheapest plan rate ` +
        `($${CHEAPEST_PLAN_USD_PER_CREDIT.toFixed(4)}/credit). Top-ups must cost MORE.`,
      )
    }
  }

  // (2) Every one-time entry pack buys at least one real AI video (20 credits)
  //     and still nets positive against worst-case provider cost.
  const packSkus: Array<{ id: string; usdMinor: number; credits: number }> = [
    { id: 'pack:starter', usdMinor: 490, credits: PACK_CREDITS.starter },
    { id: 'pack:starter290', usdMinor: 290, credits: PACK_CREDITS.starter290 },
  ]
  for (const sku of packSkus) {
    if (sku.credits < 20) {
      problems.push(`${sku.id} grants ${sku.credits} credits — below the 20 needed for one AI video.`)
    }
    const net = netAfterStripeUsd(sku.usdMinor / 100)
    if (net - worstCaseCogsUsd(sku.credits) < 0) {
      problems.push(`${sku.id} is below cost in the worst case (net $${net.toFixed(2)} vs COGS $${worstCaseCogsUsd(sku.credits).toFixed(2)}).`)
    }
  }

  // (3) Every recurring plan — and the discounted intro month — survives a
  //     customer who spends the entire grant on the worst engine available.
  const recurring: Array<{ id: string; usdMinor: number; credits: number }> = [
    { id: 'plan:starter', usdMinor: TIER_PRICES.starter.usd, credits: TIER_CREDITS.starter },
    { id: 'plan:basic', usdMinor: TIER_PRICES.basic.usd, credits: TIER_CREDITS.basic },
    { id: 'plan:pro', usdMinor: TIER_PRICES.pro.usd, credits: TIER_CREDITS.pro },
    { id: 'plan:autopilot', usdMinor: AUTOPILOT_PRICES.usd, credits: TIER_CREDITS.autopilot },
    { id: 'intro:starter', usdMinor: INTRO_PRICES.starter.usd, credits: INTRO_CREDITS.starter },
    { id: 'intro:basic', usdMinor: INTRO_PRICES.basic.usd, credits: INTRO_CREDITS.basic },
  ]
  for (const sku of recurring) {
    const net = netAfterStripeUsd(sku.usdMinor / 100)
    const cogs = worstCaseCogsUsd(sku.credits)
    if (net - cogs < 0) {
      problems.push(`${sku.id} is below cost in the worst case (net $${net.toFixed(2)} vs COGS $${cogs.toFixed(2)}).`)
    }
  }

  // (4) KINEO-PILOT-99-2026-07-26 — the $99 / 7-day Autopilot pilot.
  // Three separate ways this SKU can quietly become a loss, all checked:
  //   (4a) the grant must survive the cron itself. The pilot PROMISES 7
  //        published Shorts; if the credit grant cannot pay for 7 renders on
  //        the most expensive engine the server allows Autopilot to use, the
  //        pilot dies on 'insufficient_credits' somewhere around day 4 and we
  //        have taken $99 for a broken promise. This is the invariant that a
  //        future engine reprice is most likely to break, silently.
  //   (4b) the whole grant, spent on the worst engine in the catalog, must
  //        still net positive — same test every other SKU gets.
  //   (4c) the pilot must not be a cheaper way to buy the $299 tier. Per day
  //        it has to cost MORE than the monthly plan does per day, or the
  //        rational move is to re-buy the pilot forever instead of upgrading.
  const pilotWorstEngineCost = Math.max(
    ...AUTOPILOT_ALLOWED_ENGINES.map((engine) => creditCostFor(engine, true)),
  )
  const pilotRunCredits = pilotWorstEngineCost * AUTOPILOT_PILOT_DAYS
  if (pilotRunCredits > AUTOPILOT_PILOT_CREDITS) {
    problems.push(
      `pilot:autopilot grants ${AUTOPILOT_PILOT_CREDITS} credits but its own ${AUTOPILOT_PILOT_DAYS} ` +
      `scheduled Shorts cost up to ${pilotRunCredits} (${pilotWorstEngineCost}/render on the most ` +
      `expensive Autopilot-allowed engine). The pilot would run out before it delivers what it sold.`,
    )
  }
  const pilotNet = netAfterStripeUsd(AUTOPILOT_PILOT_PRICES.usd / 100)
  const pilotCogs = worstCaseCogsUsd(AUTOPILOT_PILOT_CREDITS)
  if (pilotNet - pilotCogs < 0) {
    problems.push(
      `pilot:autopilot is below cost in the worst case (net $${pilotNet.toFixed(2)} vs COGS $${pilotCogs.toFixed(2)}).`,
    )
  }
  const pilotUsdPerDay = AUTOPILOT_PILOT_PRICES.usd / 100 / AUTOPILOT_PILOT_DAYS
  const autopilotUsdPerDay = AUTOPILOT_PRICES.usd / 100 / 30
  if (pilotUsdPerDay <= autopilotUsdPerDay) {
    problems.push(
      `pilot:autopilot costs $${pilotUsdPerDay.toFixed(2)}/day, at or below the $299 plan's ` +
      `$${autopilotUsdPerDay.toFixed(2)}/day. A trial must never be the cheap way to buy the product.`,
    )
  }

  return problems
}

/** USD list price of each top-up SKU, in cents. Mirrors CREDIT_TOPUPS.prices.usd. */
export const TOPUP_USD_PRICES: Record<TopupId, number> = {
  topup40: 590,
  topup120: 1290,
}

if (process.env.NODE_ENV !== 'production') {
  const problems = checkPricingInvariants()
  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('[checkoutPricing] pricing invariant violations:\n  - ' + problems.join('\n  - '))
  }
}
