// KINEO-ADS-SIMPLES-2810 — GET /api/ads/v2/eligibility: o estado da régua ÚNICA do Studio Ads para a conta logada
// (lib/ads/eligibility.ts). Quem usa: os cards de anúncio da home e o botão das páginas do UGC (componentes de navegador
// em páginas estáticas, que só sabem se há sessão) — o rótulo "grátis" passa a ser verdade por pessoa, não por interruptor.
// Só leitura, nenhum efeito; sem sessão responde 401 (o visitante segue pelo cadastro).
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { loadAdsEligibility } from '@/lib/ads/eligibility'
import { paisDoRequest } from '@/lib/freeFilmPolicy'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const { admin, reason } = await loadAdsAccess(user.id, user.email, { workspace: true })
    const e = await loadAdsEligibility(admin, user, reason, { requestCountry: paisDoRequest(req.headers) })
    return v2Json({ state: e.state, reason: e.reason, reset_at: e.resetAt, sample_order_id: e.sampleOrderId, sample_delivered: e.sampleDelivered })
  } catch (err) {
    console.warn('[ads/v2/eligibility] falhou:', err instanceof Error ? err.message : String(err))
    return v2Fail('unavailable', 503)
  }
}
