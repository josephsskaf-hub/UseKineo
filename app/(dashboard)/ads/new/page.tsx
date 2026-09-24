// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — /ads/new: o assistente do Studio Ads (a empresa faz o próprio anúncio).
//
// Server Component fino (padrão do /autopilot): confere a identidade AQUI porque o layout (dashboard) não redireciona
// e o middleware só protege /history e /library. Sem login → /login preservando ?resume=pass&session_id (o
// success_url do passe cai aqui). Sem acesso e sem voltar do checkout → /ads (a porta com o botão do passe). Voltando
// do checkout, o webhook pode atrasar: o cliente reconsulta GET /api/ads/orders até o acesso chegar. O noindex vem do
// layout do grupo. lib/ads/serverAccess (chave de serviço) só é importado aqui, nunca no cliente.
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import AdsWizardClient from './AdsWizardClient'

export const metadata = { title: 'Studio Ads — Kineo' }

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return null
}

export default async function AdsNewPage({ searchParams }: { searchParams?: SearchParams }) {
  const resume = first(searchParams?.resume)
  const sessionId = first(searchParams?.session_id)
  const resumingPass = resume === 'pass'

  const keep = new URLSearchParams()
  if (resume) keep.set('resume', resume)
  if (sessionId && /^[A-Za-z0-9_]{1,255}$/.test(sessionId)) keep.set('session_id', sessionId)
  const qs = keep.toString()

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirect=${encodeURIComponent('/ads/new' + (qs ? '?' + qs : ''))}`)

  const { reason } = await loadAdsAccess(user.id, user.email)
  const gate = adsGate(reason)
  if (gate === 'no_access' && !resumingPass) redirect('/ads')

  return (
    <Suspense fallback={null}>
      <AdsWizardClient gate={gate} access={reason} resumingPass={resumingPass} />
    </Suspense>
  )
}
