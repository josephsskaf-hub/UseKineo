import { getTierPrice, formatCheckoutMoney } from '../checkoutPricing'
import { KINEO1_35S_CREDITS, adsPassPriceLabel } from '../ads/offer'
import { ADS_MODELS } from '../ads/models'
import { AD_FORMATS } from '../ads/adStyle'
import type { AdsSegment } from './adsSegments'
// KINEO-ADS-V2-VIRADA-2026-09-29 — o anúncio v2 (~15 s, fotos reais em movimento) é o produto principal das páginas /ads/for.
import { ADS_V2_TIER_IDS, adsV2Credits } from '../ads/v2Tiers'
import { ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from '../ads/v2Screen'

export function adsSegmentOffer() {
  return {
    starterPrice: formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard')),
    credits: KINEO1_35S_CREDITS,
    seconds: Math.min(...ADS_MODELS.map((model) => model.seconds)),
    durations: Array.from(new Set(ADS_MODELS.map((model) => model.seconds))).sort((a, b) => a - b).join(' / '),
    formats: AD_FORMATS.map(({ id }) => id).join(', '),
    passPrice: adsPassPriceLabel(),
    // KINEO-ADS-V2-VIRADA-2026-09-29 — preço por nível do v2 (decisão do fundador 28/09), sempre de adsV2Credits.
    v2Seconds: ADS_V2_SCREEN_SECONDS,
    v2Credits: Math.min(...ADS_V2_TIER_IDS.map((id) => adsV2Credits(id, ADS_V2_SCREEN_SECONDS))),
    v2Levels: ADS_V2_TIER_IDS.map((id) => `${ADS_V2_TIER_COPY[id].name} ${adsV2Credits(id, ADS_V2_SCREEN_SECONDS)}`).join(', '),
  }
}

export function adsSegmentFaq(segment: AdsSegment) {
  const offer = adsSegmentOffer()
  return [
    { question: 'What should I provide?', answer: segment.materials },
    { question: 'What does Studio Ads make?', answer: `A vertical ad of about ${offer.v2Seconds} seconds in which your real photos get movement, with music, a short voice-over you can turn off and your logo at the end. You see every shot and the words on screen before anything is charged; download the finished video to post yourself. Prefer a longer narrated ad from your photos and clips? The classic maker still makes one of ${offer.durations} seconds.` },
    { question: 'Do I need a subscription?', answer: `Studio Ads is included in any paid plan, from ${offer.starterPrice} USD per month. A ${offer.v2Seconds}-second ad uses ${offer.v2Levels} credits, depending on the level; a classic ${offer.seconds}-second ad uses ${offer.credits}. A one-time pass without a subscription is also available at ${offer.passPrice}; see Studio Ads for its current terms.` },
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
