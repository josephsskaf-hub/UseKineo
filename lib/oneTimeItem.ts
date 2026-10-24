// KINEO-COMPRA-AVULSA-2410 — one item, one payment. Prices come from checkoutPricing; grants from the real render billers.
import { ONE_TIME_ITEM_USD_MINOR, ONE_TIME_ITEM_V1_AMOUNTS, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { settlementAmountMinor } from '@/lib/settlementCurrency'

/** Disable NEW sales/UI here; paid sessions must always remain fulfillable. */
export const ONE_TIME_ITEMS_LIVE = true
export const ONE_TIME_ITEM_VERSION = 'one_time_item_v1' as const
export type OneTimeItemId = keyof typeof ONE_TIME_ITEM_USD_MINOR
export type OneTimeItemSurface = 'pricing' | 'post_video_paywall' | 'ads_choice'
export const ONE_TIME_ITEM_EVENTS = { viewed: 'one_time_item_viewed', started: 'checkout_started', purchased: 'one_time_item_purchased' } as const

export function isOneTimeItemId(value: unknown): value is OneTimeItemId {
  return value === 'one_time_ad' || value === 'one_time_film35'
}
export function oneTimeItemSurface(value: unknown): OneTimeItemSurface {
  return value === 'post_video_paywall' || value === 'ads_choice' ? value : 'pricing'
}
export function oneTimeItemOrderId(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null
}
export function getOneTimeItem(id: OneTimeItemId) {
  return id === 'one_time_ad'
    ? { id, usdMinor: ONE_TIME_ITEM_USD_MINOR[id], credits: adsV2Credits('commercial', 15), label: '1 ad without a watermark', description: 'One 15-second Studio Ads ad, Commercial level. Credits for one ad and Studio Ads access. One-time payment, no subscription.', successPath: '/ads/v2?mode=simple' }
    : { id, usdMinor: ONE_TIME_ITEM_USD_MINOR[id], credits: creditCostForDuration('cinematic_ai', true, 35), label: '1 film of 35 s without a watermark', description: 'One 35-second Seedance 1.5 film. Credits for one film. One-time payment, no subscription.', successPath: '/studio?engine=seedance&duration=35&script_mode=ai' }
}
export function oneTimeItemPriceLabel(id: OneTimeItemId): string {
  return formatCheckoutMoney('usd', getOneTimeItem(id).usdMinor)
}
export function oneTimeItemCheckoutHref(id: OneTimeItemId, surface: OneTimeItemSurface, orderId?: string | null): string {
  const query = new URLSearchParams({ pack: id, surface })
  const order = oneTimeItemOrderId(orderId)
  if (id === 'one_time_ad' && order) query.set('order', order)
  return `/api/stripe/checkout?${query}`
}

/** A V1 receipt must keep the quantity it sold even if an engine is repriced later. SQL enforces the same snapshot. */
export function oneTimeItemV1Credits(id: OneTimeItemId): number { return id === 'one_time_ad' ? 41 : 21 }
export function oneTimeItemV1Amount(id: OneTimeItemId, currency: 'usd' | 'brl'): number { return ONE_TIME_ITEM_V1_AMOUNTS[id][currency] }
export function oneTimeItemContractReady(): boolean {
  return (['one_time_ad', 'one_time_film35'] as const).every(id => getOneTimeItem(id).credits === oneTimeItemV1Credits(id)
    && (['usd', 'brl'] as const).every(currency => settlementAmountMinor(getOneTimeItem(id).usdMinor, currency) === oneTimeItemV1Amount(id, currency)))
}
