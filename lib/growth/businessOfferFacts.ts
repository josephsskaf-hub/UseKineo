import {
  BULK_PACK_IDS,
  BULK_PACKS,
  formatCheckoutMoney,
  type BulkPackId,
} from '@/lib/checkoutPricing'
import {
  B2B_FIT_REVIEW_CAMPAIGN,
  B2B_FIT_REVIEW_UTM_MEDIUM,
  B2B_FIT_REVIEW_UTM_SOURCE,
  B2B_LEAD_INTENT,
  B2B_VOLUME_OPTIONS,
} from '@/lib/growth/b2bLead'

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
  volumeFitReview: {
    available: true
    url: string
    intent: typeof B2B_LEAD_INTENT
    workEmailRequired: true
    automaticMailingList: false
    monthlyVolumeBands: string[]
  }
  boundaries: string[]
}

export function buildBusinessOfferFact(baseUrl: string, namedVideoCountEngine: string): BusinessOfferFact {
  const base = new URL(baseUrl)
  const publicUrl = new URL('/ai-shorts-for-agencies', base).toString().replace(/\/$/, '')
  const volumeFitUrl = new URL(publicUrl)
  volumeFitUrl.searchParams.set('utm_source', B2B_FIT_REVIEW_UTM_SOURCE)
  volumeFitUrl.searchParams.set('utm_medium', B2B_FIT_REVIEW_UTM_MEDIUM)
  volumeFitUrl.searchParams.set('utm_campaign', B2B_FIT_REVIEW_CAMPAIGN)
  volumeFitUrl.hash = 'agency-brief-heading'

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
    volumeFitReview: {
      available: true,
      url: volumeFitUrl.toString(),
      intent: B2B_LEAD_INTENT,
      workEmailRequired: true,
      automaticMailingList: false,
      monthlyVolumeBands: B2B_VOLUME_OPTIONS.map((option) => option.id),
    },
    boundaries: [
      `The named video count covers ${namedVideoCountEngine} videos; premium engines spend more credits and reduce the output count.`,
      'Self-service for one Kineo account; no team seats, client approval routing or white-label portal.',
      'Finished MP4s may be delivered commercially, but access to Kineo itself may not be resold.',
    ],
  }
}
