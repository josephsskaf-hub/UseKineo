// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// /create/film · /create/cartoon · /create/ads — a moldura do Recreate como porta dos geradores que já existem.
// Porta: lib/create/access.ts createShellDecision (interruptor CREATE_SHELL_RELEASE em lib/create/release.ts). Nunca indexada.
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createShellDecision, filmNaMoldura } from '@/lib/create/access'
import { CREATE_FILM_CAMPAIGN, type CreateTab } from '@/lib/create/tabs'
import CreateShell from '@/components/create/CreateShell'
import StudioNaMoldura from '@/components/create/StudioNaMoldura' // KINEO-STUDIO-NA-MOLDURA-1011
import { campanhaDaCaixa, motorDaCaixa } from '@/lib/growth/studioSimples' // KINEO-STUDIO-NA-MOLDURA-1011 · KINEO-ENTRADAS-TELA-NOVA-1011: campanhaDaCaixa
import { ideiaDoLink } from '@/lib/growth/ideiaDaPagina' // KINEO-ENTRADAS-TELA-NOVA-1011
import { adsArrivalSupported, cartoonArrivalSupported, destinoDaChegada, filmParamsSupported, queryDaChegada } from '@/lib/create/entry' // KINEO-ENTRADAS-TELA-NOVA-1011 · KINEO-ENTRADAS-CARTOES-1011: ads/cartoon
import AbaComChegada from './AbaComChegada' // KINEO-ENTRADAS-CARTOES-1011
import StudioIdeaArrival from '@/components/StudioIdeaArrival' // KINEO-ENTRADAS-TELA-NOVA-1011

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Create | Kineo' }, robots: { index: false, follow: false } }

export default async function Page({ params, searchParams = {} }: { params: { tab: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — a aba Film só fica com o que ela trata IGUAL
  // ao /studio (filmParamsSupported, a MESMA régua das entradas em lib/create/entry.ts). Qualquer outro dado (motor, prompt, série, retomada…)
  // vai ao /studio com a query intacta: nada se perde.
  const query = queryDaChegada(searchParams)
  if (params.tab === 'film' && !filmParamsSupported(searchParams, { arrival: true })) redirect(`/studio?${query}`)
  // KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11: "Make my ad", "Make my UGC ad" e "Make my cartoon" abriram a tela ANTIGA] — Ads e Cartoon
  // guardam a chegada que sabem repassar (a MESMA régua da entrada: entry + atribuição); qualquer outro dado volta ao destino de hoje intacto.
  if (query && params.tab === 'ads' && !adsArrivalSupported(searchParams)) redirect(`/ads/v2?${query}`)
  if (query && params.tab === 'cartoon' && !cartoonArrivalSupported(searchParams)) redirect(`/kids-cartoon?${query}`)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const decision = createShellDecision(params.tab, user, undefined, query) // KINEO-ENTRADAS-TELA-NOVA-1011 — o visitante volta para a aba COM a query
  if (decision.kind === 'signup') redirect(decision.href)
  if (decision.kind !== 'show') notFound()
  // KINEO-STUDIO-NA-MOLDURA-1011 — o Studio real na moldura (interruptor CREATE_FILM_INPLACE). A campanha é a MESMA que o "Continue" leva.
  // KINEO-ENTRADAS-TELA-NOVA-1011 — lido como o /studio lê: ideia (ideiaDoLink) e intent_campaign (campanhaDaCaixa); sem intent_campaign, a
  // campanha de sempre da aba (create_film). StudioIdeaArrival = a mesma chegada do cadastro do /studio (?signup=1 / ?welcome=1: conversão do Ads).
  const campanha = searchParams.intent_campaign === undefined ? CREATE_FILM_CAMPAIGN : campanhaDaCaixa(searchParams.intent_campaign)
  if (filmNaMoldura(params.tab, user?.email)) return <><StudioIdeaArrival /><StudioNaMoldura showRecreate={decision.showRecreate} motor={motorDaCaixa(undefined)} campanha={campanha} ideiaInicial={ideiaDoLink(searchParams.ideia)} /></>
  const destino = params.tab === 'ads' || params.tab === 'cartoon' ? destinoDaChegada(params.tab, query) : null // KINEO-ENTRADAS-CARTOES-1011
  if (destino && (params.tab === 'ads' || params.tab === 'cartoon')) return <><StudioIdeaArrival /><AbaComChegada tab={params.tab} showRecreate={decision.showRecreate} destino={destino} /></> // KINEO-ENTRADAS-VISITANTE-1111 — a conta nova chega com ?signup=1 (callback): a conversão e a origem do cadastro contam aqui, como no Film
  return <CreateShell tab={params.tab as CreateTab} signedIn showRecreate={decision.showRecreate} />
}
