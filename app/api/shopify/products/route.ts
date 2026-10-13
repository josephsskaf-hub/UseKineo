// KINEO-SHOPIFY-2026-10-13 — a lista de produtos da loja para a tela embutida (/shopify/app).
//
// ORDEM DAS TRAVAS (o guardião scripts/test-shopify-app-1310.mjs confere):
//   interruptor (404) → credenciais (503) → token de sessão do App Bridge no Authorization (401 sem ele ou inválido) → token
//   de acesso da loja (guardado, renovado ou trocado a partir do token de sessão; 401 'reauthorize' se não houver caminho) →
//   Admin GraphQL (só leitura: read_products) → até 25 produtos, mais recentes primeiro, com a foto de capa.
import { NextRequest, NextResponse } from 'next/server'
import { bearerFrom, readShopifyCreds, shopifyAppLive, shopifyNotFound, verifySessionToken } from '@/lib/shopify/core'
import { adminGraphql, shopifyAdmin, validAccessToken } from '@/lib/shopify/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRODUCTS_QUERY = `query KineoProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
    edges { node { id title status onlineStoreUrl featuredMedia { preview { image { url altText } } } } }
    pageInfo { hasNextPage endCursor }
  }
}`

interface ProductsData {
  products: {
    edges: { node: { id: string; title: string; status: string; onlineStoreUrl: string | null; featuredMedia: { preview: { image: { url: string; altText: string | null } | null } | null } | null } }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const creds = readShopifyCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const sessionToken = bearerFrom(req.headers.get('authorization'))
  const session = verifySessionToken(sessionToken, creds)
  if (!session.ok) return NextResponse.json({ error: 'invalid_session', reason: session.reason }, { status: 401 })
  const admin = shopifyAdmin()
  if (!admin) return NextResponse.json({ error: 'not_ready' }, { status: 503 })
  const token = await validAccessToken(admin, creds, session.shop, sessionToken)
  if (!token) return NextResponse.json({ error: 'reauthorize' }, { status: 401 })

  const after = (req.nextUrl.searchParams.get('after') ?? '').slice(0, 200) || null
  const search = (req.nextUrl.searchParams.get('q') ?? '').replace(/[^\p{L}\p{N} \-_.]/gu, '').trim().slice(0, 60)
  const data = await adminGraphql<ProductsData>(session.shop, token, PRODUCTS_QUERY, { first: 25, after, query: search ? `title:*${search}*` : null })
  if (!data) return NextResponse.json({ error: 'shopify_unavailable' }, { status: 502 })
  const products = data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    status: node.status,
    published: Boolean(node.onlineStoreUrl),
    image: node.featuredMedia?.preview?.image?.url ?? null,
    alt: node.featuredMedia?.preview?.image?.altText ?? null,
  }))
  return NextResponse.json({ products, next: data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null }, { headers: { 'cache-control': 'no-store' } })
}
