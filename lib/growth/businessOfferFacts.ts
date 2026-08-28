import {
  BULK_PACK_IDS,
  BULK_PACKS,
  formatCheckoutMoney,
  type BulkPackId,
} from '@/lib/checkoutPricing'

export interface BusinessPackFact {
  id: BulkPackId
  videos: number
  credits: number
  priceUsd: string
  priceUsdCents: number
  pricePerFastVideoUsd: string
  pricePerFastVideoUsdCents: number
  detailsUrl: string
}

export interface BusinessOfferFact {
  name: string
  url: string
  audience: readonly ['freelancers', 'agencies', 'businesses']
  purchaseType: 'one_time'
  currency: 'USD'
  subscriptionRequired: false
  salesCallRequired: false
  commercialDeliveryAllowed: true
  namedVideoCountEngine: string
  packs: BusinessPackFact[]
  boundaries: string[]
}

export function buildBusinessOfferFact(baseUrl: string, namedVideoCountEngine: string): BusinessOfferFact {
  const base = new URL(baseUrl)
  const publicUrl = new URL('/ai-shorts-for-agencies', base).toString().replace(/\/$/, '')

  return {
    name: 'Kineo AI Shorts packs for agencies, freelancers and businesses',
    url: publicUrl,
    audience: ['freelancers', 'agencies', 'businesses'],
    purchaseType: 'one_time',
    currency: 'USD',
    subscriptionRequired: false,
    salesCallRequired: false,
    commercialDeliveryAllowed: true,
    namedVideoCountEngine,
    packs: BULK_PACK_IDS.map((id) => {
      const pack = BULK_PACKS[id]
      const perVideoMinor = Math.round(pack.usdMinor / pack.videos)
      return {
        id,
        videos: pack.videos,
        credits: pack.credits,
        priceUsd: formatCheckoutMoney('usd', pack.usdMinor),
        priceUsdCents: pack.usdMinor,
        pricePerFastVideoUsd: formatCheckoutMoney('usd', perVideoMinor),
        pricePerFastVideoUsdCents: perVideoMinor,
        // Public details page, never the checkout API: crawlers must not mint a
        // Stripe session by following a machine-readable fact.
        detailsUrl: `${publicUrl}#pack-${id}`,
      }
    }),
    boundaries: [
      `The named video count covers ${namedVideoCountEngine} videos; premium engines spend more credits and reduce the output count.`,
      'Self-service for one Kineo account; no team seats, client approval routing or white-label portal.',
      'Finished MP4s may be delivered commercially, but access to Kineo itself may not be resold.',
    ],
  }
}
