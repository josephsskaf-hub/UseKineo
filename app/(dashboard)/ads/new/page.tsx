// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — /ads/new: o assistente do Studio Ads (a empresa faz o próprio anúncio).
//
// Server Component fino (padrão do /autopilot): confere a identidade AQUI porque o layout (dashboard) não redireciona
// e o middleware só protege /history e /library. Sem login → painel anônimo (gate 'anon', 27/09); só ?resume=pass sem
// sessão vai ao /login preservando ?resume=pass&session_id (o success_url do passe cai aqui). Sem acesso e sem voltar
// do checkout → /ads?from=new (a porta, que mostra o plano Starter e o passe — KINEO-ADS-PORTA-PLANO-2026-09-27). Voltando
// do checkout, o webhook pode atrasar: o cliente reconsulta GET /api/ads/orders até o acesso chegar. O noindex vem do
// layout do grupo. lib/ads/serverAccess (chave de serviço) só é importado aqui, nunca no cliente.
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsAutoVisible } from '@/lib/ads/autoBrief' // KINEO-ADS-SEM-LOGIN-2026-09-27
import { writeServerEvent } from '@/lib/serverEvents' // KINEO-ADS-PORTA-MEDIDA-2026-09-27
import { ADS_V2_PUBLIC } from '@/lib/ads/v2Tiers' // KINEO-ADS-V2-VIRADA-2026-09-29
import { cookies } from 'next/headers' // KINEO-ADS-PAREDE-2026-10-06 — a sessão do navegador na negação do visitante
import { EVENT_SESSION_COOKIE, normalizeEventSessionId } from '@/lib/growth/checkoutAuthSessionBridge' // KINEO-ADS-PAREDE-2026-10-06
import AdsWizardClient from './AdsWizardClient'

export const metadata = { title: 'Studio Ads — Kineo' }

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return null
}

/** KINEO-ADS-V2-VIRADA-2026-09-29 — o endereço do montador v2, levando só os utm_* curtos e limpos (a atribuição dos
 *  links do menu, do tile do /studio, do /checkout/success e do rodapé de e-mail não some no redirect). */
function cleanUtmQuery(searchParams?: SearchParams): string {
  const out = new URLSearchParams()
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const v = first(searchParams?.[key])
    if (v && /^[A-Za-z0-9._~-]{1,100}$/.test(v)) out.set(key, v)
  }
  const s = out.toString()
  return s ? `?${s}` : ''
}
function adsV2Href(searchParams?: SearchParams): string {
  return `/ads/v2${cleanUtmQuery(searchParams)}`
}
/** Anônimo vai à porta pública /ads: vê o produto e o preço antes de qualquer login (o v2 exige conta). */
function adsPublicHref(searchParams?: SearchParams): string {
  return `/ads${cleanUtmQuery(searchParams)}`
}

export default async function AdsNewPage({ searchParams }: { searchParams?: SearchParams }) {
  const resume = first(searchParams?.resume)
  const sessionId = first(searchParams?.session_id)
  const resumingPass = resume === 'pass'
  // KINEO-ADS-V2-VIRADA-2026-09-29 — fundador 29/09: "seria legal se a pessoa já entrasse na parte onde ela consegue
  // fazer o produto dela". Com o v2 público, /ads/new é só a PORTA para o montador v2; o assistente antigo (anúncio
  // narrado de 35/60 s) continua inteiro em /ads/new?classic=1. Exceção: ?resume=pass (o success_url do passe cai aqui
  // e o webhook pode atrasar) fica no assistente, que espera o acesso chegar e SÓ ENTÃO leva ao v2 (prop v2Href).
  const classic = first(searchParams?.classic) === '1'
  if (ADS_V2_PUBLIC && !classic && !resumingPass) {
    // Logado vai direto ao montador; anônimo vai à porta pública /ads (o montador exige conta, e uma tela de login sem
    // contexto é parede: a decisão de 27/09 era "o visitante vê antes de entrar").
    const { data: { user: visitante } } = await createClient().auth.getUser()
    redirect(visitante ? adsV2Href(searchParams) : adsPublicHref(searchParams))
  }

  const keep = new URLSearchParams()
  if (classic) keep.set('classic', '1')
  if (resume) keep.set('resume', resume)
  if (sessionId && /^[A-Za-z0-9_]{1,255}$/.test(sessionId)) keep.set('session_id', sessionId)
  const qs = keep.toString()
  const v2Href = ADS_V2_PUBLIC && !classic ? '/ads/v2' : null

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
    // KINEO-ADS-PAREDE-2026-10-06 — a negação do visitante passa a levar a sessão do navegador (o cookie que lib/analytics.ts
    // espelha, só o formato que ele gera): 31 das 39 linhas de 30 dias não tinham user_id nem session_id e não se ligavam a
    // nada (nem ao ads_page_viewed que as precedeu, nem a um cadastro depois). Cookie ausente ou adulterado = null, como antes.
    const anonSession = normalizeEventSessionId(cookies().get(EVENT_SESSION_COOKIE)?.value)
    if (resumingPass || !adsAutoVisible('none')) {
      await writeServerEvent({ name: 'ads_access_denied', path: '/ads/new', metadata: { stage: 'page', who: 'anon' }, sessionId: anonSession })
      redirect(`/login?redirect=${encodeURIComponent('/ads/new' + (qs ? '?' + qs : ''))}`)
    }
    await writeServerEvent({ name: 'ads_access_denied', path: '/ads/new', metadata: { stage: 'page', who: 'anon', outcome: 'anonymous_panel' }, sessionId: anonSession })
    return (
      <Suspense fallback={null}>
        <AdsWizardClient gate="anon" access="none" resumingPass={false} />
      </Suspense>
    )
  }

  const { reason } = await loadAdsAccess(user.id, user.email)
  const gate = adsGate(reason)
  // KINEO-ADS-PORTA-PLANO-2026-09-27 — dado de 27/09: 2 pessoas logadas sem acesso abriram /ads/new e foram devolvidas a
  // /ads sem uma palavra, onde só havia o passe. Agora o destino leva ?from=new (a porta explica e mostra Starter + passe)
  // e o evento grava para onde a pessoa foi.
  if (gate === 'no_access' && !resumingPass) {
    await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/ads/new', metadata: { stage: 'page', who: 'no_access', reason, redirect: '/ads?from=new' } })
    redirect('/ads?from=new')
  }

  return (
    <Suspense fallback={null}>
      <AdsWizardClient gate={gate} access={reason} resumingPass={resumingPass} v2Href={v2Href} />
    </Suspense>
  )
}
