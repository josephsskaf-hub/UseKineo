import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import { recreateFormat } from '@/lib/recreate/formats'
import { publicRecreatePath, recreateEntryHref } from '@/lib/recreate/entry'
import RecreateClient from '../RecreateClient'
import { createShellVisible } from '@/lib/create/access' // KINEO-TELA-NOVA-1011 — as abas Film · Cartoon · Ads só para quem vê o /create
import { recreateFormatVisible, releaseVisible, visibleRecreateFormats } from '@/lib/recreate/access'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Recreate | Kineo' }, robots: { index: false, follow: false } }
export default async function Page({ params }: { params: { id: string } }) {
  const { user } = await recreateSession()
  const format = recreateFormat(params.id)
  if (!format) notFound()
  if (!user) {
    if (publicRecreatePath(params.id)) redirect(recreateEntryHref(params.id, false)!) // KINEO-RECREATE-TRAVA-1011 — unapproved swaps never invite a signup
    notFound()
  }
  if (!recreateFormatVisible(format, user.email)) notFound() // KINEO-RECREATE-TRAVA-1011
  return <RecreateClient initialId={params.id} internalTools={releaseVisible(user.email, 'internal')} formatIds={visibleRecreateFormats(user.email).map(f => f.id)} createTabs={createShellVisible(user.email)} />
}
