import {
  CARD_TRIAL_DAYS,
  CARD_TRIAL_ENTRY_FEE_MINOR,
  CARD_TRIAL_GRANT_CREDITS,
  CARD_TRIAL_LIVE,
  TIER_PRICES,
  formatCheckoutMoney,
} from '@/lib/checkoutPricing'

export const POST_FILM_CREATOR_VERSION = 'pista3_next_film_v1'
export type CreatorOfferSurface = 'gpt_handoff' | 'history_film'

// A successful owner-scoped profile read is required. Unknown is not unpaid.
export function isPostFilmCreatorEligible(profile: unknown): boolean {
  if (!CARD_TRIAL_LIVE) return false // KINEO-RESTAURACAO-2026-09-09 — trial de $1 desligado
  if (!profile || typeof profile !== 'object') return false
  const p = profile as Record<string, unknown>
  return p.has_paid === false && p.plan === 'free' && p.is_pro === false
    && p.stripe_subscription_id === null && p.paypal_subscription_id === null
}

export const CREATOR_OFFER_PROFILE_COLUMNS =
  'has_paid,plan,is_pro,stripe_subscription_id,paypal_subscription_id'

export function postFilmCreatorFacts() {
  return {
    fee: formatCheckoutMoney('usd', CARD_TRIAL_ENTRY_FEE_MINOR),
    monthly: formatCheckoutMoney('usd', TIER_PRICES.basic.usd),
    days: CARD_TRIAL_DAYS,
    credits: CARD_TRIAL_GRANT_CREDITS,
  }
}

export function postFilmCreatorCheckoutHref(surface: CreatorOfferSurface): string {
  return `/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=${POST_FILM_CREATOR_VERSION}_${surface}`
}
