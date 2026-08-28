import { buildBlankStudioSignupHref } from '@/lib/growth/publicCreationIntent'

export const REAL_ESTATE_VIDEO_CAMPAIGN = 'growth_real_estate_video_maker_20260828'

export const REAL_ESTATE_SHORT_FORMATS = [
  {
    id: 'market_update',
    title: 'Local market update',
    hook: 'What changed in your market this month?',
    inputs: 'City or area, reporting period, inventory, median price, days on market and the source for every number.',
    boundary: 'Kineo can shape supplied figures into a Short. It does not research or verify market data.',
  },
  {
    id: 'neighborhood_guide',
    title: 'Neighborhood guide',
    hook: 'Three things buyers should know before moving here',
    inputs: 'Neighborhood name, three verified local facts, the audience and one practical call to action.',
    boundary: 'Use verified public facts. Generated or stock visuals are illustrative, not a depiction of a listed property.',
  },
  {
    id: 'buyer_seller_tip',
    title: 'Buyer or seller tip',
    hook: 'Answer one question clients ask every week',
    inputs: 'The exact question, your jurisdiction, the answer, a source and any limitation a viewer must hear.',
    boundary: 'The agent owns factual, legal and regulatory review before publishing.',
  },
] as const

export function buildRealEstateStudioHref(): string {
  return buildBlankStudioSignupHref({
    campaign: REAL_ESTATE_VIDEO_CAMPAIGN,
    utmSource: 'seo',
    utmMedium: 'organic',
  })
}
