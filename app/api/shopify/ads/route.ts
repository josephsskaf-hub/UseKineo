// KINEO-SHOPIFY-2026-10-13 — "Make a 15-second ad": o produto escolhido na tela embutida vira o link que o Studio Ads lê.
//
// ETAPA 1 (esta): NÃO cria pedido, NÃO cobra crédito, NÃO chama a fal. Confere a sessão, lê o produto na loja e devolve o
// endereço de entrega no site (/shopify/open?link=<página pública do produto>). Lá a porta confere o login da Kineo e abre o
// /ads/v2 com o link no campo "paste your product link" — o fluxo de sempre (/api/ads/v2/link-import → /plan → /start, com
// moderação, cota, saldo e a amostra grátis valendo como para qualquer conta).
// ETAPA 2 (docs/SHOPIFY-APP-PLANO-2026-10-13.md): o pedido nasce aqui, na conta Kineo vinculada à loja, e o MP4 volta para a tela.
//
// ORDEM DAS TRAVAS: interruptor (404) → credenciais (503) → token de sessão (401) → corpo com id de produto da Shopify (400) →
// token da loja (401 'reauthorize') → produto lido (404) → produto publicado na loja online (422 'product_not_public').
import { NextRequest, NextResponse } from 'next/server'
import { adHandoffPath, bearerFrom, productLinkForAd, readShopifyCreds, redactForLog, shopifyAppLive, shopifyAppOrigin, shopifyNotFound, verifySessionToken } from '@/lib/shopify/core'
import { adminGraphql, shopifyAdmin, validAccessToken } from '@/lib/shopify/server'
import { writeServerEvent } from '@/lib/serverEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRODUCT_QUERY = `query KineoProduct($id: ID!) { product(id: $id) { id title status onlineStoreUrl } }`

interface ProductData {
  product: { id: string; title: string; status: string; onlineStoreUrl: string | null } | null
}

export async function POST(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const creds = readShopifyCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const sessionToken = bearerFrom(req.headers.get('authorization'))
  const session = verifySessionToken(sessionToken, creds)
  if (!session.ok) {
    console.warn('[shopify] invalid_session', redactForLog({ reason: session.reason })) // KINEO-SHOPIFY-DIAG-1310
    return NextResponse.json({ error: 'invalid_session', reason: session.reason }, { status: 401 })
  }
  const body = (await req.json().catch(() => null)) as { product_id?: unknown } | null
  const productId = typeof body?.product_id === 'string' ? body.product_id.trim() : ''
  if (!/^gid:\/\/shopify\/Product\/\d{1,20}$/.test(productId)) return NextResponse.json({ error: 'invalid_product' }, { status: 400 })
  const admin = shopifyAdmin()
  if (!admin) return NextResponse.json({ error: 'not_ready' }, { status: 503 })
  const token = await validAccessToken(admin, creds, session.shop, sessionToken)
  if (!token) return NextResponse.json({ error: 'reauthorize' }, { status: 401 })

  const data = await adminGraphql<ProductData>(session.shop, token, PRODUCT_QUERY, { id: productId })
  if (!data) return NextResponse.json({ error: 'shopify_unavailable' }, { status: 502 })
  if (!data.product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 })
  const link = productLinkForAd(data.product.onlineStoreUrl)
  if (!link) return NextResponse.json({ error: 'product_not_public' }, { status: 422 })

  await writeServerEvent({ name: 'shopify_ad_handoff', path: '/api/shopify/ads', metadata: { shop: session.shop, product_id: productId } })
  return NextResponse.json({ url: `${shopifyAppOrigin()}${adHandoffPath(link)}` }, { headers: { 'cache-control': 'no-store' } })
}
