// KINEO-AUTOPILOT-UI-2026-07-26 — a superfície do Autopilot.
//
// Server Component fino: resolve a identidade no servidor (igual
// app/(dashboard)/generate/page.tsx) e entrega o resto para o client, que já
// busca /api/autopilot/schedules — a rota é a ÚNICA fonte de verdade sobre
// entitlement, canais e agenda, então duplicar essa leitura aqui só criaria
// duas respostas possíveis para a mesma pergunta.

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import AutopilotClient from './AutopilotClient'

export const dynamic = 'force-dynamic'

export default async function AutopilotPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirect=${encodeURIComponent('/autopilot')}`)

  const sessionId = cookies().get('kineo_event_session_id')?.value ?? null

  // force-dynamic re-executa este componente a cada navegação RSC de volta
  // para /autopilot; sem dedupe o evento contaria renders, não visitas.
  await writeServerEvent({
    name: 'autopilot_page_arrived',
    userId: user.id,
    path: '/autopilot',
    sessionId,
    dedupeMinutes: 30,
  })

  return (
    <Suspense fallback={null}>
      <AutopilotClient />
    </Suspense>
  )
}
