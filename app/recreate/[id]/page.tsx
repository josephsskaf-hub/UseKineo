import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import { recreateFormat } from '@/lib/recreate/formats'
import { RECREATE_RELEASE } from '@/lib/recreate/release'
import { recreateEntryHref } from '@/lib/recreate/entry'
import RecreateClient from '../RecreateClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Recreate | Kineo' }, robots: { index: false, follow: false } }
export default async function Page({ params }: { params: { id: string } }) {
  const { user } = await recreateSession()
  if (!recreateFormat(params.id)) notFound()
  if (!user) {
    if (RECREATE_RELEASE === 'public') redirect(recreateEntryHref(params.id, false)!)
    notFound()
  }
  return <RecreateClient initialId={params.id} />
}
