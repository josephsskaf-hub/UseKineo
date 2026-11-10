// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// /create/film · /create/cartoon · /create/ads — a moldura do Recreate como porta dos geradores que já existem.
// Porta: lib/create/access.ts createShellDecision (interruptor CREATE_SHELL_RELEASE em lib/create/release.ts). Nunca indexada.
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createShellDecision } from '@/lib/create/access'
import type { CreateTab } from '@/lib/create/tabs'
import CreateShell from '@/components/create/CreateShell'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Create | Kineo' }, robots: { index: false, follow: false } }

export default async function Page({ params }: { params: { tab: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const decision = createShellDecision(params.tab, user)
  if (decision.kind === 'signup') redirect(decision.href)
  if (decision.kind !== 'show') notFound()
  return <CreateShell tab={params.tab as CreateTab} signedIn showRecreate={decision.showRecreate} />
}
