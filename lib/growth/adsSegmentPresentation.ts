import { getTierPrice, formatCheckoutMoney } from '../checkoutPricing'
import { KINEO1_35S_CREDITS, adsPassPriceLabel } from '../ads/offer'
import { ADS_MODELS } from '../ads/models'
import { AD_FORMATS } from '../ads/adStyle'
import type { AdsSegment } from './adsSegments'

export function adsSegmentOffer() {
  return {
    starterPrice: formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard')),
    credits: KINEO1_35S_CREDITS,
    seconds: Math.min(...ADS_MODELS.map((model) => model.seconds)),
    durations: Array.from(new Set(ADS_MODELS.map((model) => model.seconds))).sort((a, b) => a - b).join(' / '),
    formats: AD_FORMATS.map(({ id }) => id).join(', '),
    passPrice: adsPassPriceLabel(),
  }
}

export function adsSegmentFaq(segment: AdsSegment) {
  const offer = adsSegmentOffer()
  return [
    { question: 'What should I provide?', answer: segment.materials },
    { question: 'What does Studio Ads make?', answer: `A narrated ${offer.durations}-second ad with a script, captions, music and a final card using your supplied materials. Available formats: ${offer.formats}. Check the facts and script before rendering; download the finished video to post yourself.` },
    { question: 'Do I need a subscription?', answer: `Studio Ads is included in any paid plan, from ${offer.starterPrice} USD per month. A ${offer.seconds}-second ad uses ${offer.credits} credits. A one-time pass without a subscription is also available at ${offer.passPrice}; see Studio Ads for its current terms.` },
    { question: 'What should I check before making my ad?', answer: `${segment.caution} Generation time can vary. Kineo does not publish to your social accounts or guarantee advertising results.` },
  ]
}

export function adsSegmentFaqSchema(segment: AdsSegment) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: adsSegmentFaq(segment).map(({ question, answer }) => ({
      '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}
