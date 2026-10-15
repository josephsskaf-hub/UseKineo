// KINEO-VS-NOVOS-1610 — Arcads no MESMO molde do Ads (AdsComparisonPage); fatos com fonte e data em lib/seo/vsNovos1610.ts.
import AdsComparisonPage, { adsComparisonMetadata } from '@/components/AdsComparisonPage'
import { ADS_COMPARISONS_1610 } from '@/lib/growth/adsComparisons'
const competitor = ADS_COMPARISONS_1610.find(c => c.slug === 'arcads-alternative')!
export const metadata = adsComparisonMetadata(competitor)
export default function Page() { return <AdsComparisonPage competitor={competitor} /> }
