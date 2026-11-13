import AdsV2Workspace from './AdsV2Workspace'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Studio Ads — Kineo' }
export default function AdsV2Page(props: { searchParams?: Record<string, string | string[] | undefined> }) { return <AdsV2Workspace {...props} /> }
