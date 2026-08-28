export const AFFILIATE_COMPARISON_VERIFIED_ISO = '2026-08-28' as const
export const AFFILIATE_COMPARISON_VERIFIED_HUMAN = 'August 28, 2026' as const

export interface AffiliateProgramComparisonRow {
  program: string
  commission: string
  recurrence: string
  activation: string
  distribution: string
  sourceLabel: string
  sourceUrl: string
  kineo: boolean
}

/**
 * Public terms read from each vendor's official program page on the verified
 * date. Keep the language narrow: this compares the published commission
 * shape, not likely earnings, conversion rate, payout reliability or product
 * quality.
 *
 * Pictory is deliberately absent. Its official public pages contradicted each
 * other on the verification date ("up to 50% recurring" vs "40% one-time"),
 * so publishing either value as settled would reproduce the problem this
 * table exists to prevent.
 */
export const AFFILIATE_PROGRAM_COMPARISON: readonly AffiliateProgramComparisonRow[] = [
  {
    program: 'Kineo',
    commission: '40% recurring',
    recurrence: 'Eligible payments while the referred customer stays subscribed',
    activation: 'Instant, self-serve in Kineo',
    distribution: 'Tracked link plus a spoken checkout coupon for linkless video',
    sourceLabel: 'Kineo program terms',
    sourceUrl: 'https://www.usekineo.com/partners',
    kineo: true,
  },
  {
    program: 'OpusClip',
    commission: '25% recurring',
    recurrence: 'Through the first year of each referred subscription',
    activation: 'Application reviewed by OpusClip',
    distribution: 'Affiliate link',
    sourceLabel: 'Official OpusClip FAQ',
    sourceUrl: 'https://help.opus.pro/docs/article/affiliate-program-faq',
    kineo: false,
  },
  {
    program: 'InVideo',
    commission: '50% monthly / 25% annual',
    recurrence: 'First billing cycle only; renewals do not pay commission',
    activation: 'Free to join through Impact',
    distribution: 'Affiliate link with a published 120-day referral window',
    sourceLabel: 'Official InVideo program',
    sourceUrl: 'https://invideo.io/make/affiliate-program/',
    kineo: false,
  },
  {
    program: 'VEED',
    commission: '20% recurring; bonuses up to 50%',
    recurrence: '20% on recurring subscription payments',
    activation: 'Application through Impact',
    distribution: 'Affiliate link plus partner media resources',
    sourceLabel: 'Official VEED program',
    sourceUrl: 'https://www.veed.io/affiliate',
    kineo: false,
  },
] as const

export function affiliateComparisonPrograms(): string[] {
  return AFFILIATE_PROGRAM_COMPARISON.map((row) => row.program)
}

export function kineoAffiliateComparisonRow(): AffiliateProgramComparisonRow {
  const row = AFFILIATE_PROGRAM_COMPARISON.find((candidate) => candidate.kineo)
  if (!row) throw new Error('kineo_affiliate_comparison_row_missing')
  return row
}
