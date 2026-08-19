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
import {
  ANNUAL_PRICES,
  AUTOPILOT_PRICES,
  formatCheckoutMoney,
  TIER_CREDITS,
  TIER_PRICES,
} from '@/lib/checkoutPricing'

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

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V6-2026-08-19 — ESTA TABELA PAROU DE TER NÚMEROS PRÓPRIOS.
// ═══════════════════════════════════════════════════════════════════════════
// Ela era a SEGUNDA tabela de preço do sistema, e estava mentindo há tempos:
// no dia em que foi auditada dizia Creator $24.90/150cr e Studio $37.90/200cr
// enquanto o checkout (lib/checkoutPricing.ts) já cobrava $19.90/140 e
// $39.90/320. Ou seja: a tela de MRR do admin, o PostVideoPaywall e o
// ShortCostCalculator liam preços que a Stripe nunca cobrou.
//
// Não é um bug de digitação — é o defeito estrutural que produziu TRÊS
// superfícies mentirosas em 19/08 (o JSON-LD do ChatGPT, a home e o
// exit-intent). Sempre que existem dois lugares com a mesma verdade, um
// deles fica velho, e nunca dá para saber qual sem conferir os dois.
//
// A partir daqui PLANS é DERIVADO de checkoutPricing.ts. Os rótulos são
// gerados com formatCheckoutMoney(). Um preço novo entra em UM lugar só e
// aparece aqui de graça; não existe mais como divergir.
//
// USD nos rótulos de propósito: PLANS é consumido por telas internas
// (admin/MRR, overview) e por componentes que ainda não resolvem moeda. Quem
// mostra preço ao CLIENTE deve usar getTierPrice() com a moeda do visitante —
// ver components/LandingPlanPrice.tsx.
const usdLabel = (minor: number) => formatCheckoutMoney('usd', minor)

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
  starter: {
    tier: 'starter',
    name: 'Starter',
    price: TIER_PRICES.starter.usd / 100,
    priceLabel: usdLabel(TIER_PRICES.starter.usd),
    periodLabel: '/ month',
    credits: TIER_CREDITS.starter,
    cta: `Start for ${usdLabel(TIER_PRICES.starter.usd)}`,
    href: '/api/stripe/checkout?tier=starter',
    annualPriceLabel: usdLabel(ANNUAL_PRICES.starter.usd),
    annualPerMonthLabel: usdLabel(Math.round(ANNUAL_PRICES.starter.usd / 12)),
    annualHref: '/api/stripe/checkout?tier=starter&billing=annual',
  },
  basic: {
    tier: 'basic',
    name: 'Creator',
    price: TIER_PRICES.basic.usd / 100,
    priceLabel: usdLabel(TIER_PRICES.basic.usd),
    periodLabel: '/ month',
    credits: TIER_CREDITS.basic,
    cta: 'Go Creator',
    href: '/api/stripe/checkout?tier=basic',
    // KINEO-SPRINT-OFFER-2026-07-14 — a marcação de recomendado aponta para o
    // MESMO plano em todas as superfícies (cards, modal de 0 crédito).
    recommended: true,
    annualPriceLabel: usdLabel(ANNUAL_PRICES.basic.usd),
    annualPerMonthLabel: usdLabel(Math.round(ANNUAL_PRICES.basic.usd / 12)),
    annualHref: '/api/stripe/checkout?tier=basic&billing=annual',
  },
  pro: {
    tier: 'pro',
    name: 'Studio',
    price: TIER_PRICES.pro.usd / 100,
    priceLabel: usdLabel(TIER_PRICES.pro.usd),
    periodLabel: '/ month',
    credits: TIER_CREDITS.pro,
    cta: 'Go Studio',
    href: '/api/stripe/checkout?tier=pro',
    annualPriceLabel: usdLabel(ANNUAL_PRICES.pro.usd),
    annualPerMonthLabel: usdLabel(Math.round(ANNUAL_PRICES.pro.usd / 12)),
    annualHref: '/api/stripe/checkout?tier=pro&billing=annual',
  },
  // KINEO-AUTOPILOT-299-2026-07-26 — done-for-you: conectamos o canal do
  // cliente e publicamos um Short por dia. O comparável NÃO é o nosso Studio,
  // é uma agência de edição humana (VidChops $495/mês por 16 shorts).
  autopilot: {
    tier: 'autopilot',
    name: 'Autopilot',
    price: AUTOPILOT_PRICES.usd / 100,
    priceLabel: usdLabel(AUTOPILOT_PRICES.usd),
    periodLabel: '/ month',
    credits: TIER_CREDITS.autopilot,
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
