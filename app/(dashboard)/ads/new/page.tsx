// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — /ads/new: o assistente do Studio Ads (a empresa faz o próprio anúncio).
//
// Server Component fino (padrão do /autopilot): confere a identidade AQUI porque o layout (dashboard) não redireciona
// e o middleware só protege /history e /library. Sem login → painel anônimo (gate 'anon', 27/09); só ?resume=pass sem
// sessão vai ao /login preservando ?resume=pass&session_id (o success_url do passe cai aqui). Sem acesso e sem voltar
// do checkout → /ads (a porta com o botão do passe). Voltando
// do checkout, o webhook pode atrasar: o cliente reconsulta GET /api/ads/orders até o acesso chegar. O noindex vem do
// layout do grupo. lib/ads/serverAccess (chave de serviço) só é importado aqui, nunca no cliente.
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsAutoVisible } from '@/lib/ads/autoBrief' // KINEO-ADS-SEM-LOGIN-2026-09-27
import { writeServerEvent } from '@/lib/serverEvents' // KINEO-ADS-PORTA-MEDIDA-2026-09-27
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

  // KINEO-ADS-PORTA-MEDIDA-2026-09-27 — quem bate na porta e é mandado embora deixa rastro (antes: redirect mudo).
  // KINEO-ADS-SEM-LOGIN-2026-09-27 — fundador 27/09: /ads/new abre SEM login. O visitante vê o painel da IA (link, logo,
  // fotos e caixa de texto) com gate 'anon'; na PRIMEIRA ação de rede o cliente guarda texto+link em sessionStorage
  // ('kineo:ads:draft:v1') e vai ao /login?redirect=/ads/new, que volta para cá. Nenhuma chamada de API sem sessão (o GET
  // /api/ads/orders responde 401 e o cliente não o chama no modo 'anon'). Continuam indo ao /login só quem volta do
  // checkout sem sessão (?resume=pass precisa da conta para destravar o passe) e o caso do modo IA fechado (o painel
  // anônimo É o painel da IA). Sem acesso ao voltar (trial): o gate no_access abaixo leva a /ads e o rascunho fica no
  // sessionStorage por 1 h. O rastro continua sendo ads_access_denied who:'anon' (mesma população de antes), agora com
  // outcome:'anonymous_panel' para separar quem viu o painel de quem foi mandado ao /login.
  if (!user) {
    if (resumingPass || !adsAutoVisible('none')) {
      await writeServerEvent({ name: 'ads_access_denied', path: '/ads/new', metadata: { stage: 'page', who: 'anon' } })
      redirect(`/login?redirect=${encodeURIComponent('/ads/new' + (qs ? '?' + qs : ''))}`)
    }
    await writeServerEvent({ name: 'ads_access_denied', path: '/ads/new', metadata: { stage: 'page', who: 'anon', outcome: 'anonymous_panel' } })
    return (
      <Suspense fallback={null}>
        <AdsWizardClient gate="anon" access="none" resumingPass={false} />
      </Suspense>
    )
  }

  const { reason } = await loadAdsAccess(user.id, user.email)
  const gate = adsGate(reason)
  if (gate === 'no_access' && !resumingPass) {
    await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/ads/new', metadata: { stage: 'page', who: 'no_access', reason } })
    redirect('/ads')
  }

  return (
    <Suspense fallback={null}>
      <AdsWizardClient gate={gate} access={reason} resumingPass={resumingPass} />
    </Suspense>
  )
}
