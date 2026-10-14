// KINEO-ADS-POS-ENTREGA-1510 — as VERSÕES do anúncio entregue (GET ?order_id=…): a original (v1, o vídeo da entrega) e cada edição
// ou formato montado depois. A tela chama a cada poucos segundos enquanto há montagem em andamento: esta rota consulta o
// Creatomate, copia o MP4 para o nosso bucket e grava a linha em `videos` (lib/ads/v2PostDeliveryServer.ts advanceAdsV2Versions).
// Nada aqui cobra, estorna ou chama a fal.
import { NextRequest } from 'next/server'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { loadAdsV2Order } from '@/lib/ads/v2Advance'
import { adsV2PlanFormat } from '@/lib/ads/v2ShotLists'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { posEntregaAuth } from '@/lib/ads/v2PostDeliveryAuth'
import { advanceAdsV2Versions, adsV2VersionView, isMissingPosEntregaTable, loadAdsV2Versions } from '@/lib/ads/v2PostDeliveryServer'
import { posErr } from '@/lib/ads/v2PostDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  try {
    const auth = await posEntregaAuth()
    if (!auth.ok) return v2Fail(auth.error, auth.status)
    const { admin, uid } = auth
    const orderId = (req.nextUrl.searchParams.get('order_id') ?? '').toLowerCase()
    if (!isUuid(orderId)) return v2Fail('bad_order_id', 400)
    const { order, error } = await loadAdsV2Order(admin, orderId, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('versions_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    let original: { id: string; version: 1; kind: 'original'; format: string; status: 'delivered'; video_id: string; video_url: string | null } | null = null
    if (order.status === 'delivered' && order.video_id) {
      const v = await admin.from('videos').select('video_url').eq('id', order.video_id).eq('user_id', uid).maybeSingle()
      original = { id: 'original', version: 1, kind: 'original', format: adsV2PlanFormat(order.plan), status: 'delivered', video_id: order.video_id, video_url: (v.data as { video_url?: string } | null)?.video_url ?? null }
    }
    const first = await loadAdsV2Versions(admin, order.id, uid)
    if (first.error) return isMissingPosEntregaTable(first.error.code) ? v2Json({ original, versions: [], ready: false }) : v2Fail('versions_failed', 502)
    if (first.rows.some((r) => r.status === 'rendering')) await advanceAdsV2Versions(admin, order, uid)
    const { rows } = first.rows.some((r) => r.status === 'rendering') ? await loadAdsV2Versions(admin, order.id, uid) : first
    return v2Json({ original, versions: rows.map(adsV2VersionView), ready: true })
  } catch (e) {
    console.warn('[ads/v2/versions] falhou:', posErr(e))
    return v2Fail('versions_failed', 502)
  }
}
