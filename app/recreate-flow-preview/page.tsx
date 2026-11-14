import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RECREATE_FLOW_PREVIEW_ENABLED } from '@/lib/recreate/flowRelease'
import RecreateFlowPage from '../recreate/RecreateFlowPage'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Recreate flow preview | Kineo' }, robots: { index: false, follow: false } }
export default async function Page() {
  if (!RECREATE_FLOW_PREVIEW_ENABLED) notFound()
  return RecreateFlowPage({ basePath: '/recreate-flow-preview' })
}
