import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import CreateClient from './CreateClient'
import { createClient } from '@/lib/supabase/server'
import { createShellVisible } from '@/lib/create/access'

// sprint-ui #11 (2026-08-30) — titulo de aba proprio. Sem isto, a aba
// mostrava o title SEO da landing ('Kineo — AI YouTube Shorts Generator
// (Official Site)') em toda tela do produto sem metadata — cliente com 3
// abas abertas nao achava a certa. Padrao das telas irmas (Library/Studio).
export const metadata = { title: 'Create — Kineo' }

export default async function CreatePage() {
  // KINEO-TELA-NOVA-1011 — quem vê a tela nova (CREATE_SHELL_RELEASE) vai a /create/film; os demais seguem nesta tela, como sempre.
  const { data: { user } } = await createClient().auth.getUser()
  if (createShellVisible(user?.email)) redirect('/create/film')
  return (
    <Suspense fallback={null}>
      <CreateClient />
    </Suspense>
  )
}
