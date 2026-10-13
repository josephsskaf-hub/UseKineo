// KINEO-SHOPIFY-2026-10-13 — o andamento do anúncio para a tela embutida (GET ?order_id=…), na conta Kineo da loja.
// O MESMO caminho do /api/ads/v2/status: pedido em andamento chama o motor de avanço (lib/ads/v2Advance.ts advanceAdsV2Order, o
// mesmo do cron; transições condicionais, tela e cron juntos são seguros). Pronto = o MP4 do NOSSO storage (videos.video_url da
// conta da loja), que a tela toca e baixa dentro do admin. Só leitura e o avanço de sempre: nada cobra, nada estorna aqui.
import { NextRequest } from 'next/server'
import { shopifyAppLive, shopifyNotFound } from '@/lib/shopify/core'
import { shopJson, shopRequestContext } from '@/lib/shopify/request'
import { isUuid } from '@/lib/ads/v2Contract'
import { adsV2View, advanceAdsV2Order, loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

/** Prazo de envios novos por chamada da tela (igual ao /api/ads/v2/status). */
const ADVANCE_BUDGET_MS = 60_000

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const gateIn = await shopRequestContext(req)
  if (!gateIn.ok) return gateIn.res
  const { ctx } = gateIn
  const orderId = (req.nextUrl.searchParams.get('order_id') ?? '').toLowerCase()
  if (!isUuid(orderId)) return shopJson({ error: 'bad_order_id' }, 400)
  const { order, error } = await loadAdsV2Order(ctx.admin, orderId, ctx.userId)
  if (error) return shopJson({ error: 'not_ready' }, 503)
  if (!order) return shopJson({ error: 'order_not_found' }, 404)
  const view = order.status === 'generating' || order.status === 'assembling'
    ? await advanceAdsV2Order(ctx.admin, order.id, { deadlineMs: Date.now() + ADVANCE_BUDGET_MS })
    : adsV2View(order, (await loadAdsV2Shots(ctx.admin, order.id)) ?? [])
  if (!view) return shopJson({ error: 'order_not_found' }, 404)
  let video: { id: string; video_url: string | null; thumbnail_url: string | null } | null = null
  if (view.video_id) {
    const v = await ctx.admin.from('videos').select('id, video_url, thumbnail_url').eq('id', view.video_id).eq('user_id', ctx.userId).maybeSingle()
    video = (v.data as typeof video) ?? null
  }
  const shots = view.shots ?? []
  return shopJson({
    order_id: view.order_id,
    status: view.status,
    credits: view.credits,
    error: view.error,
    progress: { ready: shots.filter((s) => s.state === 'ready').length, total: shots.length },
    video,
  })
}
