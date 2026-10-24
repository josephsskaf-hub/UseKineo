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

export const metadata = { title: 'Studio Ads — Kineo' }

export const dynamic = 'force-dynamic'

// KINEO-HOME-3-CARDS-1910 — ?entry=product|ugc (os cards "AI Product Ads" / "AI UGC Ads" da home): validado aqui (lib/ads/sampleEntry.ts) e entregue à tela,
// KINEO-HOME-3-CARDS-1910 — que abre no formato do card (Close real / Apresentador) e, na amostra, manda a entrada ao /plan — quem decide o formato da amostra é o servidor.
// KINEO-HOME-3-CARDS-1910 — sem login, o redirect do login devolve a MESMA entrada (o visitante que veio do card não perde o formato).
export default async function AdsV2Page({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) { // KINEO-HOME-3-CARDS-1910 — era: export default async function AdsV2Page() {
  const rawEntry = searchParams?.entry // KINEO-HOME-3-CARDS-1910
  const entry: AdsSampleEntry | null = adsSampleEntryOf(Array.isArray(rawEntry) ? rawEntry[0] : rawEntry) // KINEO-HOME-3-CARDS-1910
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(entry ? `/ads/v2?entry=${entry}` : '/ads/v2')}`) // KINEO-HOME-3-CARDS-1910 — era: encodeURIComponent('/ads/v2')

  // KINEO-EQUIPE-BUSINESS-2026-10-10 — o workspace: o membro de um Business entra com o acesso, o saldo e o kit DO DONO (uid = dono).
  const { admin, reason: reasonOwn, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true }) // KINEO-UGC-AJUSTES-2010 — era: { admin, reason, ...ws } (o reason passa pelo probe abaixo)
  const rawProbe = searchParams?.[ADS_SAMPLE_PROBE_PARAM] // KINEO-UGC-AJUSTES-2010
  const sampleProbe = adsSampleProbeOn(reasonOwn, Array.isArray(rawProbe) ? rawProbe[0] : rawProbe) // KINEO-UGC-AJUSTES-2010 — SÓ a conta que o servidor resolveu como 'internal'; de fora, o parâmetro não faz nada
  const reason = sampleProbe ? 'none' : reasonOwn // KINEO-UGC-AJUSTES-2010 — a interna com o probe entra pela amostra (as mesmas travas de quem é de fora)
  const uid: string = ws.ownerId ?? user.id
  const gate = adsGate(reason)
  const sample = gate === 'no_access' && (await adsSampleOpen(admin, uid, reason)) // KINEO-ADS-AMOSTRA-2026-10-09
  if (gate !== 'ok') {
    // KINEO-ADS-AMOSTRA-2026-10-09 — quem entra pela amostra grátis passa SEM rastro de negação; o resto, como antes.
    if (!sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/ads/v2', metadata: { stage: 'page', who: gate, reason, redirect: '/ads?from=v2', ...(entry ? { entry } : {}) } }) // KINEO-HOME-3-CARDS-1910 — + a entrada do card (a porta explica e oferece o plano)
      redirect('/ads?from=v2')
    }
  }
  if (!adsV2Visible(user.email)) redirect('/ads/new')

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
  return <AdsPresenterAllProvider all={isAdsInternalEmail(user.email) && !sampleProbe}><AdsV2Client initialBalance={balance} workspace={workspace} classicCredits={KINEO1_35S_CREDITS} variations={sample ? false : adsVariationsVisible(user.email)} producao={!sample && producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))} sample={sample} business={sample ? businessAdsOffer() : null} sampleProbe={sampleProbe} entry={entry} escolhaInternal={gate === 'ok' && !sample && cenaEnabled(isAdsInternalEmail(user.email)) && !sampleProbe} escolhaTestControls={isAdsInternalEmail(user.email) && !sampleProbe} escolhaOwnerKey={`${user.id}:${uid}`} /></AdsPresenterAllProvider> // KINEO-ADS-ESCOLHA-PUBLICO-2410 — existing access/paywall gate first; free sample remains on its original path, internal test controls stay internal. Storage is scoped to authenticated user and workspace owner.
}
