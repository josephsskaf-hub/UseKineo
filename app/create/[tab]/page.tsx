// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// /create/film · /create/cartoon · /create/ads — a moldura do Recreate como porta dos geradores que já existem.
// Porta: lib/create/access.ts createShellDecision (interruptor CREATE_SHELL_RELEASE em lib/create/release.ts). Nunca indexada.
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createShellDecision, filmNaMoldura } from '@/lib/create/access'
import { CREATE_FILM_CAMPAIGN, type CreateTab } from '@/lib/create/tabs'
import CreateShell from '@/components/create/CreateShell'
import PessoaFalandoPainel from '@/components/ads/PessoaFalandoPainel' // KINEO-ADS-PESSOA-FALANDO-TELA-1211
import { KINEO_ADS_PESSOA_FALANDO, pessoaFalandoLigado } from '@/lib/ads/pessoaFalando/formatos' // KINEO-ADS-PESSOA-FALANDO-TELA-1211
import { isAdsInternalEmail } from '@/lib/ads/access' // KINEO-PF-COBRA-NAS-FOTOS-1211 [CEO 12/11 15:15] — a MESMA lista das rotas (isInternalEmail deixava ver a tela e levar 404)
import StudioNaMoldura from '@/components/create/StudioNaMoldura' // KINEO-STUDIO-NA-MOLDURA-1011
import { campanhaDaCaixa, motorDaCaixa } from '@/lib/growth/studioSimples' // KINEO-STUDIO-NA-MOLDURA-1011 · KINEO-ENTRADAS-TELA-NOVA-1011: campanhaDaCaixa
import { ideiaDoLink } from '@/lib/growth/ideiaDaPagina' // KINEO-ENTRADAS-TELA-NOVA-1011
import { adsArrivalSupported, cartoonArrivalSupported, destinoDaChegada, filmParamsSupported, queryDaChegada } from '@/lib/create/entry' // KINEO-ENTRADAS-TELA-NOVA-1011 · KINEO-ENTRADAS-CARTOES-1011: ads/cartoon
import AbaComChegada from './AbaComChegada' // KINEO-ENTRADAS-CARTOES-1011
import StudioIdeaArrival from '@/components/StudioIdeaArrival' // KINEO-ENTRADAS-TELA-NOVA-1011
import ClipNaMoldura from '@/components/create/ClipNaMoldura' // KINEO-CLIP-NA-MOLDURA-1011
import { clipNaMolduraVisivel } from '@/lib/create/clipNaMoldura' // KINEO-CLIP-NA-MOLDURA-1011
import { recreateVisible } from '@/lib/recreate/access' // KINEO-CLIP-NA-MOLDURA-1011
import { recreateFormat } from '@/lib/recreate/formats' // KINEO-CLIP-NA-MOLDURA-1011

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Create | Kineo' }, robots: { index: false, follow: false } }

export default async function Page({ params, searchParams = {} }: { params: { tab: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — a aba Film só fica com o que ela trata IGUAL
  // ao /studio (filmParamsSupported, a MESMA régua das entradas em lib/create/entry.ts). Qualquer outro dado (motor, prompt, série, retomada…)
  // vai ao /studio com a query intacta: nada se perde.
  const query = queryDaChegada(searchParams)
  // KINEO-CLIP-NA-MOLDURA-1011 [fundador 10/11: "quero a tela nova"] — /create/clip É o /clips de hoje na moldura (interruptor CREATE_CLIP_INPLACE).
  // Mesma porta do /clips: efeito que o Recreate faz vai ao Recreate; quem não tem a aba (ou visitante) volta ao /clips com a query intacta.
  if (params.tab === 'clip') {
    const { data: { user: u } } = await createClient().auth.getUser()
    if (!clipNaMolduraVisivel(u?.email)) redirect('/clips' + (query ? '?' + query : ''))
    if (recreateVisible(u?.email) && typeof searchParams.effect === 'string') {
      const id = `effect-${searchParams.effect.replaceAll('_', '-')}`
      if (recreateFormat(id)) redirect(`/recreate/${id}`)
    }
    return <ClipNaMoldura measurementActor={u?.id ?? null} showRecreate={recreateVisible(u?.email)} />
  }
  if (params.tab === 'film' && !filmParamsSupported(searchParams, { arrival: true })) redirect(`/studio?${query}`)
  // KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11: "Make my ad", "Make my UGC ad" e "Make my cartoon" abriram a tela ANTIGA] — Ads e Cartoon
  // guardam a chegada que sabem repassar (a MESMA régua da entrada: entry + atribuição); qualquer outro dado volta ao destino de hoje intacto.
  // KINEO-ADS-PESSOA-FALANDO-TELA-1211 [dono 12/11: "não adianta ter os vídeos e o cara não conseguir fazer"] — o anúncio com a pessoa FALANDO, na aba Ads
  // da moldura nova: /create/ads?formato=pessoa_falando. Só para quem o interruptor deixa (hoje 'internal' = conta da casa); os outros seguem o
  // caminho de sempre (o mesmo redirect de antes). A tela é o painel; o servidor é da Div. 5 (lib/ads/pessoaFalando/telaContrato.ts).
  if (params.tab === 'ads' && searchParams.formato === 'pessoa_falando') {
    const { data: { user: quem } } = await createClient().auth.getUser()
    if (quem && pessoaFalandoLigado(KINEO_ADS_PESSOA_FALANDO, isAdsInternalEmail(quem.email))) return <CreateShell tab="ads" signedIn showRecreate={recreateVisible(quem.email)} showClip={clipNaMolduraVisivel(quem.email)} painel={<PessoaFalandoPainel />} />
  }
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
  const showClip = clipNaMolduraVisivel(user?.email) // KINEO-CLIP-NA-MOLDURA-1011 — a aba Clip só para quem a abre
  if (filmNaMoldura(params.tab, user?.email)) return <><StudioIdeaArrival /><StudioNaMoldura showRecreate={decision.showRecreate} showClip={showClip} motor={motorDaCaixa(undefined)} campanha={campanha} ideiaInicial={ideiaDoLink(searchParams.ideia)} /></>
  const destino = params.tab === 'ads' || params.tab === 'cartoon' ? destinoDaChegada(params.tab, query) : null // KINEO-ENTRADAS-CARTOES-1011
  if (destino && (params.tab === 'ads' || params.tab === 'cartoon')) return <><StudioIdeaArrival /><AbaComChegada tab={params.tab} showRecreate={decision.showRecreate} showClip={showClip} destino={destino} /></> // KINEO-ENTRADAS-VISITANTE-1111 — a conta nova chega com ?signup=1 (callback): a conversão e a origem do cadastro contam aqui, como no Film
  return <CreateShell tab={params.tab as CreateTab} signedIn showRecreate={decision.showRecreate} showClip={showClip} />
}
