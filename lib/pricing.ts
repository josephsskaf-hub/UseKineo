// Push #404 — current 3-tier pricing.
// KINEO-REBASE-2026-07-10 — CREDIT REBASE 2:1: USD prices UNCHANGED, every
// credit number divided by 2 (1 new credit = 2 old credits). Engine costs
// halved in lockstep (Seedance 20, Kling 45, Veo 90, Hollywood 150, Avatar 110)
// so plan purchasing power is identical — just smaller, simpler numbers.
// Starter = $9.90/month (25 credits)
// KINEO-PRICING-V3B-2026-07-10 — Creator repriced $19.90/120cr → $24.90/150cr:
// 150 credits = 1 Hollywood film every month included (150 cr) OR ~7 AI Gen
// videos (20 cr each). Kling repriced 45 → 50 cr in the same push.
// Creator = $24.90/month (150 credits — 1 Hollywood film/month included)
// Studio  = $37.90/month (200 credits, premium engines, ~10 Seedance or ~4 Kling videos;
//           1080p; priority queue)
//
// All checkout buttons on every surface link to /api/stripe/checkout?tier=...
// The server route handles currency detection (BRL for BR users) and creates
// the Stripe session. No Stripe payment-link URLs live here.

// KINEO-AUTOPILOT-299-2026-07-26 — 'autopilot' added. It is a PLANS entry (so
// the webhook, the admin revenue table and the entitlement checks can resolve
// it by name) but it is deliberately NOT in PLAN_LIST: PLAN_LIST drives the
// 3-card self-serve grid, and Autopilot is a done-for-you service sold in its
// own section against agency pricing, not against our own $37.90 tier.
export type PlanTier = 'free' | 'starter' | 'basic' | 'pro' | 'autopilot'

export interface PlanConfig {
  tier: PlanTier
  name: string
  price: number         // numeric, for logic comparisons
  priceLabel: string    // display string shown in UI
  periodLabel: string   // e.g. "/ month" or "forever"
  credits: number
  cta: string
  href: string
  recommended?: boolean
  // #381 — annual billing (≈2 months free). Optional: only paid plans have it.
  annualPriceLabel?: string
  annualPerMonthLabel?: string
  annualHref?: string
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    periodLabel: 'forever',
    credits: 3,
    cta: 'Run Free',
    href: '/signup',
  },
  // Push #404 — STARTER: Fast engine (stock, relevance-gated). High volume,
  // cheap entry to compete with InVideo/AutoShorts.
  // KINEO-REBASE-2026-07-10 — 50 → 25 credits (2:1 rebase, USD unchanged).
  starter: {
    tier: 'starter',
    name: 'Starter',
    price: 9.90,
    priceLabel: '$9.90',
    periodLabel: '/ month',
    credits: 25,
    cta: 'Start for $9.90',
    href: '/api/stripe/checkout?tier=starter',
    annualPriceLabel: '$99',
    annualPerMonthLabel: '$8.25',
    annualHref: '/api/stripe/checkout?tier=starter&billing=annual',
  },
  // Push #404 — CREATOR: Seedance AI engine. 20 credits/video → 6 videos.
  // KINEO-REBASE-2026-07-10 — 240 → 120 credits (2:1 rebase, USD unchanged).
  // KINEO-PRICING-V3B-2026-07-10 — $19.90/120cr → $24.90/150cr. Positioning:
  // 1 Hollywood film every month included (150 cr), or ~7 AI Gen videos.
  // Existing subscribers keep their old price (Stripe keeps the subscription's
  // original unit_amount) — this only affects NEW checkouts.
  basic: {
    tier: 'basic',
    name: 'Creator',
    price: 24.90,
    priceLabel: '$24.90',
    periodLabel: '/ month',
    credits: 150,
    cta: 'Go Creator',
    href: '/api/stripe/checkout?tier=basic',
    // KINEO-SPRINT-OFFER-2026-07-14 — recommended flag moved Studio → Creator:
    // every surface (pricing cards, 0-credit modal) now points at the same
    // primary plan. Creator is what /pricing already calls "Most Popular".
    recommended: true,
    annualPriceLabel: '$199',
    annualPerMonthLabel: '$16.58',
    annualHref: '/api/stripe/checkout?tier=basic&billing=annual',
  },
  // Push #404 — STUDIO: Kling premium engine (fallback Seedance). 60 cr/video → 6 videos (or 9 on Seedance).
  pro: {
    tier: 'pro',
    name: 'Studio',
    price: 37.90,
    priceLabel: '$37.90',
    periodLabel: '/ month',
    // KINEO-STUDIO-400-2026-07-06 — was inconsistent (360 here vs 600 in the
    // Stripe/PayPal webhooks). Aligned everywhere.
    // KINEO-REBASE-2026-07-10 — 400 → 200 credits (2:1 rebase, USD unchanged):
    // ~10 Seedance videos or ~4 Kling. No credit rollover between months.
    credits: 200,
    cta: 'Go Studio',
    href: '/api/stripe/checkout?tier=pro',
    // KINEO-SPRINT-OFFER-2026-07-14 — no longer the recommended plan (see basic).
    annualPriceLabel: '$379',
    annualPerMonthLabel: '$31.58',
    annualHref: '/api/stripe/checkout?tier=pro&billing=annual',
  },
  // KINEO-AUTOPILOT-299-2026-07-26 — AUTOPILOT: done-for-you. We connect the
  // customer's YouTube channel and publish one Short per day, every day. The
  // customer does nothing after onboarding.
  //
  // The comparable is NOT our own Studio tier — it is a human editing agency:
  // VidChops charges $495/mo for 16 shorts, Tasty Edits $2,400/mo for 30.
  // Autopilot ships 30/mo for $299 with no briefs, no revisions, no Slack.
  //
  // MARGIN (see lib/checkoutPricing.ts for the shared cost basis):
  //   Gross                       $299.00
  //   Stripe (2.9% + $0.30)       −$ 8.97
  //   Net                         $290.03
  //   30 Fast renders @ $0.02–0.05 −$ 0.60 to 1.50
  //   YouTube Data API upload      $  0.00  (1 upload/day vs 10,000-unit quota)
  //   Storage + egress            −$ 0.50  (generous)
  //   Service-level gross margin  ≈$288    (96.3%)
  // Absolute worst case, if the customer manually burns all 400 credits on
  // Seedance instead: 20 renders × $2.34 = $46.80 → +$243.23 (81.3% of gross).
  // The 'fast'/'basic_ai' clamp in lib/autopilot/config.ts is what keeps the
  // scheduled half of that from ever drifting.
  autopilot: {
    tier: 'autopilot',
    name: 'Autopilot',
    price: 299,
    priceLabel: '$299',
    periodLabel: '/ month',
    credits: 400,
    cta: 'Start Autopilot',
    href: '/api/stripe/checkout?tier=autopilot',
  },
}

// Push #276 — remove free card from all surfaces. Only paid plans shown.
// Push #401 — 2-plan structure: Basic (Seedance) + Pro (Kling). Spark/starter
// is retired from all surfaces but kept in PLANS for back-compat so existing
// Spark subscribers are grandfathered (their webhook/portal still resolve).
// Push #404 — 3-tier structure: Starter (Fast) · Creator (Seedance) · Studio (Kling).
// KINEO-AUTOPILOT-299-2026-07-26 — Autopilot is intentionally ABSENT here.
// Every consumer of PLAN_LIST renders a self-serve credit-plan card grid
// (GenerateClient's paywall, the pricing grid). Dropping a $299 managed
// service into that row would anchor it against $37.90 and make it look
// absurd; it renders in its own section, anchored against agencies.
export const PLAN_LIST: PlanConfig[] = [PLANS.starter, PLANS.basic, PLANS.pro]

/** The done-for-you tier. Not part of PLAN_LIST — see the note above. */
export const AUTOPILOT_PLAN: PlanConfig = PLANS.autopilot
