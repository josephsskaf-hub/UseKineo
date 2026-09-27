import snapshot from './adsCompetitorSnapshot.json'
import { adsSegmentOffer } from './adsSegmentPresentation'

export const ADS_COMPARISONS = snapshot.competitors
export const ADS_COMPARISON_ACCESS = `${snapshot.accessWindow}/${snapshot.year}`
export type AdsCompetitor = typeof ADS_COMPARISONS[number]
export const adsComparisonCta = (id: string) => `/ads?utm_source=seo&utm_medium=comparison&utm_campaign=gpt24h&utm_content=vs-${id}`
export const adsComparisonPath = (slug: string) => `/vs/${slug}`

function officialFeature(mark: string): string {
  if (mark.includes('*')) return 'Not confirmed by the official-source snapshot (third-party report only).'
  if (mark.startsWith('✓')) return `✓ Listed on the official page${mark.includes('(') ? ` ${mark.slice(mark.indexOf('('))}` : ''}`
  if (mark === '✗') return '✗ Not offered in this snapshot'
  return 'Not confirmed in this snapshot'
}

export function adsComparisonRows(c: AdsCompetitor) {
  const offer = adsSegmentOffer()
  return [
    { id: 'input', label: 'Starting material', kineo: 'Your website link or brief, logo, photos and clips.', competitor: c.linkToAd.startsWith('✓') ? 'A website or product link; other input requirements not recorded.' : 'Input requirements not confirmed.' },
    { id: 'link', label: 'Link → ad', kineo: '✓ Extract the details, then check the facts before rendering.', competitor: officialFeature(c.linkToAd) },
    { id: 'formats', label: 'Formats', kineo: offer.formats, competitor: `${officialFeature(c.formats)} — square and landscape in the research table; full format list not recorded.` },
    { id: 'captions', label: 'Captions & soundtrack', kineo: '✓ Captions and music in the finished ad.', competitor: 'Not confirmed in this snapshot.' },
    { id: 'translation', label: 'Language & translation', kineo: 'Narration in supported languages; check the script. Not automatic dubbing of an existing ad.', competitor: officialFeature(c.translation) },
    { id: 'avatar', label: 'Avatar / actor', kineo: '✗ Not included in Studio Ads.', competitor: officialFeature(c.avatar) },
    { id: 'publishing-analytics', label: 'Direct publishing & analytics', kineo: '✗ Direct publishing. ✗ Ad-performance analytics. Download and publish yourself.', competitor: `Publishing: ${officialFeature(c.publishing)}. Analytics: ${officialFeature(c.analytics)}.` },
    { id: 'price', label: 'Entry price', kineo: `From ${offer.starterPrice} USD/month on Starter; Studio Ads is included. ${offer.credits} credits per ${offer.seconds}-second ad.`, competitor: `${c.price.replace('(anual)', '(annual billing)')} — as recorded in the official-source snapshot; check billing terms and allowances on the official page.` },
  ]
}
