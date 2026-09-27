import AdsComparisonPage, { adsComparisonMetadata } from '@/components/AdsComparisonPage'
import { ADS_COMPARISONS } from '@/lib/growth/adsComparisons'
const competitor = ADS_COMPARISONS.find(c => c.slug === 'creatify-alternative')!
export const metadata = adsComparisonMetadata(competitor)
export default function Page() { return <AdsComparisonPage competitor={competitor} /> }
