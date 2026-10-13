// KINEO-SHOPIFY-2026-10-13 — "Add to product page": anexar o anúncio pronto à mídia do produto (aprovado pelo fundador em 13/10).
//
// O botão existe por padrão; SHOPIFY_ATTACH_MEDIA=false é a chave de emergência. Os escopos OPCIONAIS write_products,write_files
// são pedidos SÓ quando o lojista clica (a tela usa shopify.scopes.request; o escopo padrão do app continua read_products —
// requisito 3.2). A permissão é conferida AO VIVO (currentAppInstallation.accessScopes) antes de qualquer upload: sem ela, 403
// 'scope_missing' e a tela pede de novo. Os escopos lidos são gravados na loja.
// Fluxo da doc "product media": stagedUploadsCreate (VIDEO, mp4) → upload do MP4 do NOSSO storage → productUpdate com a mídia
// (a Shopify processa; o vídeo aparece no produto quando fica READY). Limites da Shopify: 1 GB, 10 min, 1.000 vídeos/loja/semana.
// Só o MP4 de um pedido ENTREGUE da conta da loja e só de URL do nosso storage (nunca uma URL vinda do cliente). Nada cobra aqui.
// ⚠ Ainda NÃO exercitado numa loja de desenvolvimento: validar lá antes do envio à revisão (mutação productUpdate + media).
import { NextRequest } from 'next/server'
import { SHOPIFY_ATTACH_SCOPES, attachMediaEnabled, redactForLog, scopesCover, shopifyAppLive, shopifyNotFound } from '@/lib/shopify/core'
import { shopJson, shopRequestContext } from '@/lib/shopify/request'
import { SHOPIFY_SHOPS_TABLE, adminGraphql } from '@/lib/shopify/server'
import { isUuid } from '@/lib/ads/v2Contract'
import { loadAdsV2Order } from '@/lib/ads/v2Advance'
import { writeServerEvent } from '@/lib/serverEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 120

const MAX_VIDEO_BYTES = 200 * 1024 * 1024

const SCOPES = `query KineoScopes { currentAppInstallation { accessScopes { handle } } }`
interface ScopesData { currentAppInstallation: { accessScopes: { handle: string }[] } | null }

const STAGE = `mutation KineoStage($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } }
}`
const ATTACH = `mutation KineoAttach($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
  productUpdate(product: $product, media: $media) { product { id } userErrors { field message } }
}`

interface StageData { stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] } }
interface AttachData { productUpdate: { product: { id: string } | null; userErrors: { message: string }[] } }

export async function POST(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const gateIn = await shopRequestContext(req)
  if (!gateIn.ok) return gateIn.res
  const { ctx } = gateIn
  if (!attachMediaEnabled()) return shopJson({ error: 'attach_disabled' }, 403)
  const body = (await req.json().catch(() => null)) as { order_id?: unknown; product_id?: unknown } | null
  const orderId = typeof body?.order_id === 'string' ? body.order_id.trim().toLowerCase() : ''
  const productId = typeof body?.product_id === 'string' ? body.product_id.trim() : ''
  if (!isUuid(orderId) || !/^gid:\/\/shopify\/Product\/\d{1,20}$/.test(productId)) return shopJson({ error: 'bad_body' }, 400)
  const live = await adminGraphql<ScopesData>(ctx.shop, ctx.accessToken, SCOPES)
  const granted = (live?.currentAppInstallation?.accessScopes ?? []).map((s) => s.handle).join(',')
  if (!live) return shopJson({ error: 'shopify_unavailable' }, 502)
  if (granted && granted !== ctx.link.scopes) await ctx.admin.from(SHOPIFY_SHOPS_TABLE).update({ scopes: granted, updated_at: new Date().toISOString() }).eq('shop_domain', ctx.shop)
  if (!scopesCover(granted, SHOPIFY_ATTACH_SCOPES)) return shopJson({ error: 'scope_missing', scopes: SHOPIFY_ATTACH_SCOPES.split(',') }, 403)
  const { order } = await loadAdsV2Order(ctx.admin, orderId, ctx.userId)
  if (!order || order.status !== 'delivered' || !order.video_id) return shopJson({ error: 'not_delivered' }, 409)
  const v = await ctx.admin.from('videos').select('video_url').eq('id', order.video_id).eq('user_id', ctx.userId).maybeSingle()
  const url = (v.data as { video_url?: string | null } | null)?.video_url ?? ''
  const ours = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !url.startsWith(ours) || /\.\.|%2e/i.test(url)) return shopJson({ error: 'video_not_ours' }, 409)

  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) }).catch(() => null)
  if (!res?.ok) return shopJson({ error: 'video_unreadable' }, 502)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_VIDEO_BYTES) return shopJson({ error: 'video_too_big' }, 413)

  const stage = await adminGraphql<StageData>(ctx.shop, ctx.accessToken, STAGE, { input: [{ resource: 'VIDEO', filename: `kineo-ad-${orderId.slice(0, 8)}.mp4`, mimeType: 'video/mp4', fileSize: String(bytes.byteLength), httpMethod: 'POST' }] })
  const target = stage?.stagedUploadsCreate.stagedTargets[0]
  if (!target || stage?.stagedUploadsCreate.userErrors.length) return shopJson({ error: 'shopify_unavailable' }, 502)
  const form = new FormData()
  for (const p of target.parameters) form.append(p.name, p.value)
  form.append('file', new Blob([bytes], { type: 'video/mp4' }), 'kineo-ad.mp4')
  const up = await fetch(target.url, { method: 'POST', body: form, signal: AbortSignal.timeout(90_000) }).catch(() => null)
  if (!up || !(up.ok || up.status === 201 || up.status === 204)) {
    console.warn('[shopify] upload do vídeo recusado', redactForLog({ shop: ctx.shop, status: up?.status ?? null }))
    return shopJson({ error: 'upload_failed' }, 502)
  }
  const att = await adminGraphql<AttachData>(ctx.shop, ctx.accessToken, ATTACH, { product: { id: productId }, media: [{ originalSource: target.resourceUrl, mediaContentType: 'VIDEO', alt: 'Video ad made with Kineo' }] })
  if (!att?.productUpdate.product || att.productUpdate.userErrors.length) return shopJson({ error: 'attach_failed' }, 502)
  await writeServerEvent({ name: 'shopify_ad_attached', userId: ctx.userId, path: '/api/shopify/ads/attach', metadata: { shop: ctx.shop, order_id: orderId, product_id: productId } })
  return shopJson({ ok: true, status: 'processing' })
}
