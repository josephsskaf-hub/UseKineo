import {
  ANNUAL_DISCOUNT_PERCENT, ANNUAL_REFUND_POLICY, INTRO_CREDITS,
  PACK_ADVERTISED_SECONDS, PACK_CREDITS, TIER_CREDITS, formatCheckoutMoney,
  getAnnualPrice, getIntroPrice, getTierPrice, hasIntroOffer, packPriceLabel,
  type CheckoutCurrency, type PriceRegion,
} from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { clipCreditCost } from '@/lib/clips/clipPricing'

// Presentation/attribution only. Prices and entitlements remain server-owned.
export const MRR_CONVERSION_ENABLED = true
export const MRR_CONVERSION_VERSION = 'mrr0610_v1'
export type ConversionSurface = 'upgrade' | 'pricing'
export type ConversionTier = 'starter' | 'basic' | 'pro'
export type ConversionBilling = 'monthly' | 'annual'
export const CONVERSION_TIERS = ['starter', 'basic', 'pro'] as const
export const CONVERSION_NAMES = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }
export const CONVERSION_CLIP_SECONDS = 5
export { ANNUAL_DISCOUNT_PERCENT, ANNUAL_REFUND_POLICY }

export function conversionMetadata(surface: ConversionSurface, offer = 'menu') {
  return { offer_version: MRR_CONVERSION_VERSION, offer_id: offer, offer_surface: surface }
}

/** Existing Stripe routes already carry intent_campaign into both canonical events.
 * This bounded token stores the offer version without editing those routes. */
export function conversionCheckoutHref(href: string, surface: ConversionSurface, offer: string) {
  if (!MRR_CONVERSION_ENABLED) return href
  const url = new URL(href, 'https://www.usekineo.com')
  if (url.pathname !== '/api/stripe/checkout' || !/^(pass|starter|basic|pro)(_(monthly|annual))?$/.test(offer)) return href
  url.searchParams.set('intent_campaign', `${MRR_CONVERSION_VERSION}_${surface}_${offer}`)
  return `${url.pathname}${url.search}`
}

export function conversionCapacity(credits: number) {
  return {
    films: Math.floor(credits / creditCostForDuration('cinematic_ai', true, PACK_ADVERTISED_SECONDS.starter)),
    clips: Math.floor(credits / clipCreditCost('seedance', CONVERSION_CLIP_SECONDS)),
  }
}

export function conversionCapacityLabel(credits: number) {
  const { films, clips } = conversionCapacity(credits)
  return `${films} film${films === 1 ? '' : 's'} of ${PACK_ADVERTISED_SECONDS.starter}s OR ${clips} clips of ${CONVERSION_CLIP_SECONDS}s`
}

/** KINEO-DECISOES-PRECO-3110 — fundador 31/10 ("4 sim"): a economia do anual EM DINHEIRO, por plano — 12 × o mensal − o anual, das tabelas
 *  de lib/checkoutPricing.ts (nenhum número digitado). A MESMA conta do cartão do /pricing ("Save $X a year compared to monthly"). */
export function annualSavingMinor(tier: ConversionTier, currency: CheckoutCurrency, region: PriceRegion = 'standard'): number {
  return Math.max(0, getTierPrice(tier, currency, region) * 12 - getAnnualPrice(tier, currency, region))
}

export function conversionPlan(tier: ConversionTier, billing: ConversionBilling, currency: CheckoutCurrency, region: PriceRegion) {
  const monthly = getTierPrice(tier, currency, region)
  const annual = getAnnualPrice(tier, currency, region)
  const intro = billing === 'monthly' && tier !== 'pro' && hasIntroOffer(tier, currency, region)
  const firstCredits = intro ? INTRO_CREDITS[tier] : TIER_CREDITS[tier]
  return {
    price: formatCheckoutMoney(currency, billing === 'annual' ? annual : intro ? getIntroPrice(tier, currency, region) : monthly),
    period: billing === 'annual' ? '/year' : intro ? 'first month' : '/month',
    /** KINEO-DECISOES-PRECO-3110 — "$X" que o anual economiza contra 12 mensalidades; null no mensal ou sem economia. */
    annualSaving: billing === 'annual' && annualSavingMinor(tier, currency, region) > 0 ? formatCheckoutMoney(currency, annualSavingMinor(tier, currency, region)) : null,
    capacity: `${conversionCapacityLabel(firstCredits)} ${billing === 'annual' ? 'each month' : 'this month'}`,
    renewal: billing === 'annual'
      ? `${formatCheckoutMoney(currency, Math.round(annual / 12))}/mo equivalent. Full year charged now; allowance arrives monthly.`
      : `${formatCheckoutMoney(currency, monthly)}/mo on renewal · ${conversionCapacityLabel(TIER_CREDITS[tier])} each month.`,
  }
}

export function conversionPass() {
  return { price: packPriceLabel(), capacity: conversionCapacityLabel(PACK_CREDITS.starter) }
}

export function paidOnlyEntry(profile: { trial_status?: unknown; has_paid?: unknown; plan?: unknown } | null) {
  return profile?.trial_status === 'region_paid_only' && profile.has_paid === false && profile.plan === 'free'
}
