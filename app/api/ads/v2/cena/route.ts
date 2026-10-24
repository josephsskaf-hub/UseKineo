// KINEO-ADS-ESCOLHA-2310 — authenticated Studio Ads entry; the same staged planner as the house admin test.
// KINEO-ADS-ESCOLHA-PUBLICO-2410 — the public switch never bypasses the existing workspace/paywall gate.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { cenaEnabled } from '@/lib/ads/cena/catalog'
import { internalCenaEscolhaFor } from '@/lib/ads/cena/internalEscolha'
import { cenaJson } from '@/lib/ads/cena/runtime'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2StartFor } from '@/lib/ads/v2StartCore'
import { moderateContent } from '@/lib/safety/contentModeration'
import { memoCena95Moderation } from '@/lib/ads/cena/moderation95'
import { v2Fail } from '@/lib/ads/v2Server'
import { ADS_ESCOLHA_SAMPLE_LIVE, isEscolhaSamplePlan } from '@/lib/ads/cena/escolhaSamplePolicy'
import { isEscolhaPersonalOrder } from '@/lib/ads/cena/escolhaPersonalAccess'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return v2Fail('unauthenticated', 401)
  const body = await req.json().catch(() => null)
  let access = await loadAdsAccess(user.id, user.email, { workspace: true })
  const personal = body?.stage === 'plan' && body?.sample === true || await isEscolhaPersonalOrder(access.admin, user.id, body?.order_id)
  if (personal) access = await loadAdsAccess(user.id, user.email)
  let sampleMode = body?.stage === 'plan' && body?.sample === true
  if (personal && !sampleMode) {
    const saved = await access.admin.from('ads_v2_orders').select('plan').eq('id', body?.order_id).eq('user_id', user.id).maybeSingle()
    sampleMode = !saved.error && isEscolhaSamplePlan(saved.data?.plan?.cena?.plan)
  }
  if (sampleMode && !ADS_ESCOLHA_SAMPLE_LIVE && body?.stage !== 'upgrade') return v2Fail('ads_sample_disabled', 403)
  if (!sampleMode && !cenaEnabled(isAdsInternalEmail(user.email))) return v2Fail('cena_internal_only', 403)
  const gate = adsGate(access.reason)
  if (gate !== 'ok' && !sampleMode) return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
  const moderate = memoCena95Moderation(moderateContent)
  return internalCenaEscolhaFor(user, body, {
    json: cenaJson, admin: access.admin, access, sampleMode,
    moderate: text => moderate({ surface: 'ads_render', stage: 'input', userId: user.id, text, meta: { cena: true, escolha: true } }),
    start: orderId => adsV2StartFor(user, access, async () => ({ order_id: orderId }), Date.now(), { moderate, escolhaPersonal: personal }),
  })
}
