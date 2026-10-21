// KINEO-PAGINAS-CONECTOR-2110
import ConnectorGuidePage from '@/components/ConnectorGuidePage'
import { connectorGuideMetadata } from '@/lib/seo/connectorGuides'

export const dynamic = 'force-static'
export const metadata = connectorGuideMetadata('chatgpt', 'en')

export default function Page() {
  return <ConnectorGuidePage client="chatgpt" lang="en" />
}
