import { dfyPaymentLink, dfyPriceLabel, liveDfyTiers } from './dfyOffer'

// GPT-5H A/C: public description of the EXISTING operated service, not agency credits.
// Sources: dfyOffer.ts; COWORK-STRIPE-LINK-EMPRESAS-2026-09-23.md (scope/refund).
export const BUSINESS_ADS_PATH = '/business-video-ads'
export { BUSINESS_ADS_VERSION } from './businessAdsAttribution'
export const DFY_SERVICE_FACT = {
  name: 'Kineo Empresas',
  url: `https://www.usekineo.com${BUSINESS_ADS_PATH}`,
  kind: 'dfy',
  recurring: false,
  humanOperated: true,
  description: 'A human-operated service: Kineo prepares a business video ad from your brief using AI tools. It is not an instant self-service ad generator or a subscription.',
  requirements: ['Your business, audience, language and call to action', 'Your logo and authorized photos or footage', 'The exact contact details and factual claims you approve'],
  refund: 'If the brief cannot be fulfilled within the offered scope, Kineo issues a full refund within 24 hours.',
  delivery: 'A finished MP4 video with narration, captions and music; your logo and photos where the format allows. No automatic social posting or advertising spend is included.',
  tiers: liveDfyTiers().map(tier => ({
    tier: tier.tier, name: tier.name, priceUsdMinor: tier.priceMinor,
    priceLabel: dfyPriceLabel(tier.priceMinor), hours: tier.hours,
    revisions: tier.revisions, engines: tier.engines, detail: tier.detail,
    paymentUrl: dfyPaymentLink({ tier: tier.tier, userId: null, source: 'page_business_ads' }),
  })),
} as const
