// KINEO-ADS-V2-2026-09-28 — ETAPA 3: /ads/v2, o montador do anúncio v2 (Studio Ads com as fotos reais do negócio).
//
// Server Component fino, no padrão do /ads/new: confere a identidade AQUI (o layout do grupo não redireciona).
// Ordem das portas (o guardião scripts/test-ads-v2-tela-2026-09-28.mjs confere):
//   sem login                         → /login?redirect=/ads/v2
//   sem acesso ao Studio Ads (adsGate) → /ads?from=v2 (a porta mostra plano e passe), com rastro ads_access_denied
//   sem o v2 (adsV2Visible: ADS_V2_PUBLIC=false → só contas internas pela lista EXATA) → /ads/new (o assistente v1)
// O saldo é lido aqui com a chave de serviço (a mesma de loadAdsAccess) só para o primeiro desenho; a tela relê em
// /api/credits. Leitura que falha = null ("não sei"), nunca 0. lib/ads/serverAccess só é importado aqui, nunca no cliente.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { writeServerEvent } from '@/lib/serverEvents'
import AdsV2Client from './AdsV2Client'

export const metadata = { title: 'Studio Ads — Kineo' }

export const dynamic = 'force-dynamic'

export default async function AdsV2Page() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/ads/v2')}`)

  const { admin, reason } = await loadAdsAccess(user.id, user.email)
  const gate = adsGate(reason)
  if (gate !== 'ok') {
    await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/ads/v2', metadata: { stage: 'page', who: gate, reason, redirect: '/ads?from=v2' } })
    redirect('/ads?from=v2')
  }
  if (!adsV2Visible(user.email)) redirect('/ads/new')

  let balance: number | null = null
  try {
    const prof = await admin.from('profiles').select('video_credits').eq('id', user.id).maybeSingle()
    const n = Number((prof.data as { video_credits?: unknown } | null)?.video_credits)
    balance = !prof.error && prof.data && Number.isFinite(n) ? n : null
  } catch {
    balance = null
  }

  return <AdsV2Client initialBalance={balance} />
}
