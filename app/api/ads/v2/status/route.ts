// KINEO-ADS-V2-2026-09-28 — estado do anúncio v2 para a TELA (GET ?order_id=…). Se o pedido está em andamento, chama o
// motor de avanço (lib/ads/v2Advance.ts) — o mesmo do cron; os dois podem rodar juntos (toda transição é condicional).
// É isso que entrega o anúncio mesmo com a aba aberta e o cron parado, e o cron entrega com a aba fechada.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { adsV2View, advanceAdsV2Order, loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

/** Prazo de envios novos por chamada da tela (a montagem e as cópias podem passar disto, dentro do teto de 300 s). */
const ADVANCE_BUDGET_MS = 60_000

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const orderId = (req.nextUrl.searchParams.get('order_id') ?? '').toLowerCase()
    if (!isUuid(orderId)) return v2Fail('bad_order_id', 400)
    const { admin } = await loadAdsAccess(user.id, user.email)
    const { order, error } = await loadAdsV2Order(admin, orderId, user.id)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('status_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    const view = order.status === 'generating' || order.status === 'assembling'
      ? await advanceAdsV2Order(admin, order.id, { deadlineMs: Date.now() + ADVANCE_BUDGET_MS })
      : adsV2View(order, (await loadAdsV2Shots(admin, order.id)) ?? [])
    if (!view) return v2Fail('order_not_found', 404)
    let video: { id: string; video_url: string | null; thumbnail_url: string | null } | null = null
    if (view.video_id) {
      const v = await admin.from('videos').select('id, video_url, thumbnail_url').eq('id', view.video_id).eq('user_id', user.id).maybeSingle()
      video = (v.data as typeof video) ?? null
    }
    return v2Json({ ...view, video })
  } catch (e) {
    console.warn('[ads/v2/status] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('status_failed', 502)
  }
}
