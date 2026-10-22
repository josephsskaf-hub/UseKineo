// KINEO-ADS-CENA-2110 — teste interno 5 produtos × 3 rotas; publicação/execução real exigem rodada posterior.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { cenaEnabled } from '@/lib/ads/cena/catalog'
import { internalCenaFor } from '@/lib/ads/cena/internal'
import { cenaJson } from '@/lib/ads/cena/runtime'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2StartFor } from '@/lib/ads/v2StartCore'
import { moderateContent } from '@/lib/safety/contentModeration'
import { v2Fail } from '@/lib/ads/v2Server'
import { isAdminEmail } from '../_shared/db'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return v2Fail('unauthenticated', 401)
  if (!isAdminEmail(user.email) || !cenaEnabled(isAdsInternalEmail(user.email))) return v2Fail('cena_internal_only', 403)
  const access = await loadAdsAccess(user.id, user.email)
  return internalCenaFor(user, await req.json().catch(() => null), {
    json: cenaJson, admin: access.admin,
    moderate: async text => (await moderateContent({ surface: 'ads_render', stage: 'input', userId: user.id, text, meta: { cena: true } })).ok,
    start: orderId => adsV2StartFor(user, access, async () => ({ order_id: orderId }), Date.now()),
  })
}
