import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RECREATE_FLOW_ENABLED } from '@/lib/recreate/flowRelease'
import RecreateFlowPage from '../RecreateFlowPage'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Recreate with your video | Kineo' }, robots: { index: false, follow: false } }
export default async function Page({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  if (!RECREATE_FLOW_ENABLED) notFound()
  return RecreateFlowPage({ id: 'your-video', searchParams, basePath: '/recreate' })
}
