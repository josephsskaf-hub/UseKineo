import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import RecreateClient from './RecreateClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Recreate | Kineo' }, robots: { index: false, follow: false } }
export default async function Page() {
  const { user } = await recreateSession()
  if (!user) notFound()
  return <RecreateClient />
}
