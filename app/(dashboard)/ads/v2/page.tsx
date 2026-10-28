// KINEO-ADS-V2-2026-09-28 — ETAPA 3: /ads/v2, o montador do anúncio v2 (Studio Ads com as fotos reais do negócio).
//
// Server Component fino, no padrão do /ads/new: confere a identidade AQUI (o layout do grupo não redireciona).
// Ordem das portas (o guardião scripts/test-ads-v2-tela-2026-09-28.mjs confere):
//   sem login                         → /login?redirect=/ads/v2
//   sem acesso ao Studio Ads (adsGate) → /ads?from=v2 (a porta mostra plano e passe), com rastro ads_access_denied
//   sem o v2 (adsV2Visible: ADS_V2_PUBLIC=false → só contas internas pela lista EXATA) → /ads/new (o assistente v1)
// KINEO-ADS-V2-VIRADA-2026-09-29 — com ADS_V2_PUBLIC=true a 3ª porta nunca fecha; /ads/new sem ?classic=1 manda para cá
// (sem laço: o /ads/new só redireciona quando ADS_V2_PUBLIC, e aí adsV2Visible é sempre true). O clássico é /ads/new?classic=1.
// O saldo é lido aqui com a chave de serviço (a mesma de loadAdsAccess) só para o primeiro desenho; a tela relê em
// /api/credits. Leitura que falha = null ("não sei"), nunca 0. lib/ads/serverAccess só é importado aqui, nunca no cliente.
// KINEO-ADS-AMOSTRA-2026-10-09 — a 2ª porta abre para a conta free/trial que ainda não usou a AMOSTRA GRÁTIS (adsSampleOpen):
// ela entra com sample={true} (um nível, 15 s, sem 3 variações), SEM rastro ads_access_denied. Quem já usou a dela segue
// para /ads?from=v2 como antes.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { adsVariationsVisible } from '@/lib/ads/v2VariationsAccess' // KINEO-ADS-3-VARIACOES-2026-09-30 — a opção "3 variações"
import { writeServerEvent } from '@/lib/serverEvents'
import { KINEO1_35S_CREDITS } from '@/lib/ads/offer' // KINEO-ADS-V2-VIRADA-2026-09-29 — o preço do link "classic maker"
import { isAdsInternalEmail } from '@/lib/ads/access' // KINEO-PRODUCAO-ADS-2026-10-01 — o atalho da Produção
import { PRODUCAO_PUBLIC, producaoVisibleFor } from '@/lib/ads/producao' // KINEO-PRODUCAO-ADS-2026-10-01
import { adsSampleOpen } from '@/lib/ads/serverAccess' // KINEO-ADS-AMOSTRA-2026-10-09
import { loadAdsWorkspaceLabel } from '@/lib/ads/workspace' // KINEO-EQUIPE-BUSINESS-2026-10-10
import { isTeamOwnerPlan, type AdsWorkspaceView } from '@/lib/ads/team' // KINEO-EQUIPE-BUSINESS-2026-10-10
import { businessAdsOffer } from '@/lib/businessPlan' // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a oferta que a tela mostra quando a amostra já foi usada
import { adsSampleEntryOf, type AdsSampleEntry } from '@/lib/ads/sampleEntry' // KINEO-HOME-3-CARDS-1910 — a entrada dos cards da home (?entry=product|ugc)
import { AdsPresenterAllProvider } from '@/components/ads/AdsPresenterPicker' // KINEO-APRESENTADOR-OLHOS-1910 — conta interna vê os 12 apresentadores (os 8 "em teste"); cliente, só os aprovados
import { ADS_SAMPLE_PROBE_PARAM, adsSampleProbeOn } from '@/lib/ads/sampleEntry' // KINEO-UGC-AJUSTES-2010 — ?sample_probe=1: a conta interna vê (e faz) a amostra grátis de verdade
import AdsV2Client from './AdsV2Client'
import { cenaEnabled } from '@/lib/ads/cena/catalog' // KINEO-ADS-ESCOLHA-2310 — share the existing rollout switch.
import { ADS_ESCOLHA_SAMPLE_LIVE } from '@/lib/ads/cena/escolhaSamplePolicy'
import { isEscolhaPersonalOrder } from '@/lib/ads/cena/escolhaPersonalAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { headers } from 'next/headers' // KINEO-ADS-SIMPLES-2810 — o país do pedido (x-vercel-ip-country)
import { paisDoRequest } from '@/lib/freeFilmPolicy' // KINEO-ADS-SIMPLES-2810
import { loadAdsEligibility } from '@/lib/ads/eligibility' // KINEO-ADS-SIMPLES-2810 — a régua ÚNICA: paid · free_sample_available · free_sample_used · not_eligible
import AdsEligibilityNotice from '@/components/ads/AdsEligibilityNotice' // KINEO-ADS-SIMPLES-2810 — o aviso honesto no lugar da parede (componente de navegador: a língua da interface mora no localStorage)
import { adsV2Credits } from '@/lib/ads/v2Tiers' // KINEO-ADS-SIMPLES-2810 — o preço do anúncio completo no aviso (a mesma conta do débito)

export const metadata = { title: 'Studio Ads — Kineo' }

export const dynamic = 'force-dynamic'

// KINEO-HOME-3-CARDS-1910 — ?entry=product|ugc (os cards "AI Product Ads" / "AI UGC Ads" da home): validado aqui (lib/ads/sampleEntry.ts) e entregue à tela,
// KINEO-HOME-3-CARDS-1910 — que abre no formato do card (Close real / Apresentador) e, na amostra, manda a entrada ao /plan — quem decide o formato da amostra é o servidor.
// KINEO-HOME-3-CARDS-1910 — sem login, o redirect do login devolve a MESMA entrada (o visitante que veio do card não perde o formato).
export default async function AdsV2Page({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) { // KINEO-HOME-3-CARDS-1910 — era: export default async function AdsV2Page() {
  const rawEntry = searchParams?.entry // KINEO-HOME-3-CARDS-1910
  const entry: AdsSampleEntry | null = adsSampleEntryOf(Array.isArray(rawEntry) ? rawEntry[0] : rawEntry) // KINEO-HOME-3-CARDS-1910
  const rawResume = searchParams?.order
  const resumeOrder = Array.isArray(rawResume) ? rawResume[0] : rawResume
  const resumeQuery = new URLSearchParams()
  if (entry) resumeQuery.set('entry', entry)
  if (isUuid(resumeOrder)) { resumeQuery.set('order', resumeOrder.toLowerCase()); if (searchParams?.upgrade === '1') resumeQuery.set('upgrade', '1') }
  const loginTarget = `/ads/v2${resumeQuery.size ? `?${resumeQuery}` : ''}`
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(loginTarget)}`) // KINEO-AMOSTRA-ANUNCIO-2410 — preserve the owned result and explicit upgrade intent through login.

  // KINEO-EQUIPE-BUSINESS-2026-10-10 — o workspace: o membro de um Business entra com o acesso, o saldo e o kit DO DONO (uid = dono).
  const { admin, reason: reasonOwn, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true }) // KINEO-UGC-AJUSTES-2010 — era: { admin, reason, ...ws } (o reason passa pelo probe abaixo)
  const rawProbe = searchParams?.[ADS_SAMPLE_PROBE_PARAM] // KINEO-UGC-AJUSTES-2010
  const sampleProbe = adsSampleProbeOn(reasonOwn, Array.isArray(rawProbe) ? rawProbe[0] : rawProbe) // KINEO-UGC-AJUSTES-2010 — SÓ a conta que o servidor resolveu como 'internal'; de fora, o parâmetro não faz nada
  const reason = sampleProbe ? 'none' : reasonOwn // KINEO-UGC-AJUSTES-2010 — a interna com o probe entra pela amostra (as mesmas travas de quem é de fora)
  const uid: string = ws.ownerId ?? user.id
  const gate = adsGate(reason)
  const rawOrder = searchParams?.order
  const personalResume = await isEscolhaPersonalOrder(admin, user.id, Array.isArray(rawOrder) ? rawOrder[0] : rawOrder)
  // KINEO-ADS-SIMPLES-2810 — a régua ÚNICA (lib/ads/eligibility.ts): paid · free_sample_available · free_sample_used · not_eligible(+motivo).
  // KINEO-ADS-SIMPLES-2810 — NINGUÉM logado é devolvido à parede /ads?from=v2 (26-27/10: 15 pessoas de fora batiam aqui e sumiam): quem pode criar
  // KINEO-ADS-SIMPLES-2810 — cria; quem já usou a amostra reabre o resultado dela (+ a versão completa com plano); quem não é elegível vê o motivo
  // KINEO-ADS-SIMPLES-2810 — e o preço em créditos (AdsEligibilityNotice) na própria tela de criação. O rastro ads_access_denied do /ads/v2 morreu com a parede.
  const elegibilidade = await loadAdsEligibility(admin, { id: user.id }, reason, { requestCountry: paisDoRequest(headers()) }) // KINEO-ADS-SIMPLES-2810
  const sampleAvailable = gate !== 'ok' && elegibilidade.state === 'free_sample_available' // KINEO-ADS-SIMPLES-2810 — a amostra ainda aberta para ESTA pessoa
  const sample = gate !== 'ok' // KINEO-ADS-SIMPLES-2810 — era: gate !== 'ok' && (ADS_ESCOLHA_SAMPLE_LIVE || personalResume || gate === 'no_access' && await adsSampleOpen(admin, uid, reason)) — a tela da conta sem plano é sempre a da amostra (sem variações/Produção/lote)
  if (gate !== 'ok' && !personalResume && elegibilidade.state === 'free_sample_used' && elegibilidade.sampleOrderId && await isEscolhaPersonalOrder(admin, user.id, elegibilidade.sampleOrderId)) { // KINEO-ADS-SIMPLES-2810 — amostra já usada: reabre o resultado dela (vídeo + "versão completa · N créditos" + planos)
    await writeServerEvent({ name: 'ads_door_state', userId: user.id, path: '/ads/v2', metadata: { state: elegibilidade.state, reason: elegibilidade.reason, redirect: 'own_sample', ...(entry ? { entry } : {}) } }) // KINEO-ADS-SIMPLES-2810
    redirect(`/ads/v2?order=${elegibilidade.sampleOrderId}${entry ? `&entry=${entry}` : ''}`) // KINEO-ADS-SIMPLES-2810
  }
  if (gate !== 'ok') await writeServerEvent({ name: 'ads_door_state', userId: user.id, path: '/ads/v2', metadata: { state: elegibilidade.state, reason: elegibilidade.reason, country: elegibilidade.country, resume: personalResume, ...(entry ? { entry } : {}) } }) // KINEO-ADS-SIMPLES-2810 — a medição que substitui a negação: quem entrou sem plano, em que estado
  if (!adsV2Visible(user.email) && !ADS_ESCOLHA_SAMPLE_LIVE && !personalResume) redirect('/ads/new')

  let balance: number | null = null
  try {
    const prof = await admin.from('profiles').select('video_credits').eq('id', uid).maybeSingle() // KINEO-EQUIPE-BUSINESS-2026-10-10 — o saldo do workspace (do dono)
    const n = Number((prof.data as { video_credits?: unknown } | null)?.video_credits)
    balance = !prof.error && prof.data && Number.isFinite(n) ? n : null
  } catch {
    balance = null
  }

  // KINEO-EQUIPE-BUSINESS-2026-10-10 — membro vê o aviso "Working in X's workspace"; o dono do Business vê o link da equipe.
  const member = ws.role === 'member'
  const workspace: AdsWorkspaceView = {
    role: member ? 'member' : 'owner',
    ownerLabel: member ? await loadAdsWorkspaceLabel(admin, uid) : null,
    teamOwner: !member && isTeamOwnerPlan(ws.ownerPlan),
  }

  // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — quem entra pela amostra leva a oferta do Business pronta (números de lib/businessPlan.ts): a tela a mostra quando a
  // amostra já foi usada (403 'no_access') e no aviso do teto do dia. Assinante/passe/interna: null (a tela de sempre).
  // KINEO-ADS-SIMPLES-2810 — o aviso honesto só para quem entrou sem plano e sem a amostra aberta (e não está reabrindo um pedido próprio).
  const aviso = gate !== 'ok' && !sampleAvailable && !personalResume ? <AdsEligibilityNotice decision={{ state: elegibilidade.state, reason: elegibilidade.reason }} credits={adsV2Credits('commercial', 15)} resetIso={elegibilidade.resetAt} sampleOrderId={elegibilidade.sampleOrderId} /> : null // KINEO-ADS-SIMPLES-2810
  return <AdsPresenterAllProvider all={isAdsInternalEmail(user.email) && !sampleProbe}>{aviso}<AdsV2Client initialBalance={balance} workspace={workspace} classicCredits={KINEO1_35S_CREDITS} variations={sample ? false : adsVariationsVisible(user.email)} producao={!sample && producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))} sample={sample} business={sample ? businessAdsOffer() : null} sampleProbe={sampleProbe} entry={entry} escolhaInternal={gate === 'ok' && !sample && cenaEnabled(isAdsInternalEmail(user.email)) && !sampleProbe} escolhaSample={ADS_ESCOLHA_SAMPLE_LIVE || personalResume} escolhaSampleAvailable={sampleAvailable} advancedModes={isAdsInternalEmail(user.email) && !sampleProbe} escolhaTestControls={isAdsInternalEmail(user.email) && !sampleProbe} escolhaOwnerKey={`${user.id}:${uid}`} /></AdsPresenterAllProvider> // KINEO-ADS-ESCOLHA-PUBLICO-2410 — existing access/paywall gate first; free sample remains on its original path, internal test controls stay internal. Storage is scoped to authenticated user and workspace owner. // KINEO-ADS-SIMPLES-2810 — + {aviso} antes do montador, escolhaSampleAvailable (a amostra desta pessoa) e advancedModes (lote/completo/clássico só para a casa)
}
