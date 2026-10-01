// KINEO-PRODUCAO-ADS-2026-10-01 — /ads/producao: "Produção", o fluxo de agência dentro do Ads (lib/ads/producao.ts tem o
// porquê): personagem consistente → planos → prévia das cenas (só imagens) → clipes ou fala para a câmera → montagem com o
// logo da conta no cartão final.
// Portas (servidor, nesta ordem): sem login → /login?redirect=/ads/producao · fora do interruptor (PRODUCAO_PUBLIC=false →
// só a lista EXATA do Ads, isAdsInternalEmail) → 404 · sem acesso ao Studio Ads (adsGate) → /ads?from=producao.
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { PRODUCAO_PUBLIC, producaoVisibleFor } from '@/lib/ads/producao'
import ProducaoClient from './ProducaoClient'

export const metadata = { title: 'Production — Studio Ads — Kineo' }
export const dynamic = 'force-dynamic'

export default async function ProducaoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/ads/producao')}`)
  if (!producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))) notFound()
  const { reason } = await loadAdsAccess(user.id, user.email)
  if (adsGate(reason) !== 'ok') redirect('/ads?from=producao')
  return <ProducaoClient />
}
