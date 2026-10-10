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
import AdsV2Client from './AdsV2Client'

export const metadata = { title: 'Studio Ads — Kineo' }

export const dynamic = 'force-dynamic'

export default async function AdsV2Page() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/ads/v2')}`)

  // KINEO-EQUIPE-BUSINESS-2026-10-10 — o workspace: o membro de um Business entra com o acesso, o saldo e o kit DO DONO (uid = dono).
  const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
  const uid: string = ws.ownerId ?? user.id
  const gate = adsGate(reason)
  const sample = gate === 'no_access' && (await adsSampleOpen(admin, uid, reason)) // KINEO-ADS-AMOSTRA-2026-10-09
  if (gate !== 'ok') {
    // KINEO-ADS-AMOSTRA-2026-10-09 — quem entra pela amostra grátis passa SEM rastro de negação; o resto, como antes.
    if (!sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/ads/v2', metadata: { stage: 'page', who: gate, reason, redirect: '/ads?from=v2' } })
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

  return <AdsV2Client initialBalance={balance} workspace={workspace} classicCredits={KINEO1_35S_CREDITS} variations={sample ? false : adsVariationsVisible(user.email)} producao={!sample && producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))} sample={sample} />
}
