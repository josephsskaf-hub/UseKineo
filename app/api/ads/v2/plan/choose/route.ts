// KINEO-ADS-ROTEIROS-2026-10-13 — POST { order_id, script_id } → troca o roteiro do plano por um dos 2 a 3 que o /plan
// guardou. Sem cobrar, sem modelo. O corpo mora em lib/ads/v2ChooseCore.ts (adsV2ChooseFor); esta rota só lê o cookie
// (login) e o acesso do workspace, como /api/ads/v2/plan.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { v2Fail } from '@/lib/ads/v2Server'
import { adsV2ChooseFor } from '@/lib/ads/v2ChooseCore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const access = await loadAdsAccess(user.id, user.email, { workspace: true })
    return await adsV2ChooseFor(user, access, () => req.json().catch(() => null))
  } catch (e) {
    console.warn('[ads/v2/plan/choose] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('choose_failed', 502)
  }
}
