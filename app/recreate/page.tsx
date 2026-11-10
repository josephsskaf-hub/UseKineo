import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import { RECREATE_RELEASE } from '@/lib/recreate/release'
import RecreateClient from './RecreateClient'
import { createShellVisible } from '@/lib/create/access' // KINEO-TELA-NOVA-1011 — as abas Film · Cartoon · Ads só para quem vê o /create
import { releaseVisible, visibleRecreateFormats } from '@/lib/recreate/access'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Recreate | Kineo' }, robots: { index: false, follow: false } }
export default async function Page() {
  const { user } = await recreateSession()
  if (!user) {
    if (RECREATE_RELEASE === 'public') redirect('/signup?' + new URLSearchParams({ redirect: '/recreate' }).toString())
    notFound()
  }
  return <RecreateClient internalTools={releaseVisible(user.email, 'internal')} formatIds={visibleRecreateFormats(user.email).map(f => f.id)} createTabs={createShellVisible(user.email)} />
}
