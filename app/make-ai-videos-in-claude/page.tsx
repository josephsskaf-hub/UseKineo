// KINEO-PAGINAS-CONECTOR-2110
import ConnectorGuidePage from '@/components/ConnectorGuidePage'
import { connectorGuideMetadata } from '@/lib/seo/connectorGuides'

export const dynamic = 'force-static'
export const metadata = connectorGuideMetadata('claude', 'en')

export default function Page() {
  return <ConnectorGuidePage client="claude" lang="en" />
}
