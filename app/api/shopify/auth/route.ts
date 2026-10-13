// KINEO-SHOPIFY-2026-10-13 — início do OAuth por código (caminho RESERVA; o padrão do app embutido é a instalação gerida pela
// Shopify + troca de token, feita em lib/shopify/server.ts validAccessToken).
//
// ORDEM DAS TRAVAS (o guardião scripts/test-shopify-app-1310.mjs confere):
//   interruptor SHOPIFY_APP_LIVE (desligado = 404, antes de ler qualquer coisa) → credenciais (503) → loja válida pela regex
//   ancorada (400) → se a query veio com `hmac`, ele TEM de bater (401) → nonce novo no cookie httpOnly → 302 para o
//   /admin/oauth/authorize da loja. Dentro do iframe (embedded=1) não dá para gravar cookie nem sair do quadro por 302:
//   devolve uma página mínima que reabre ESTA rota no topo da janela (sem o hmac, que não sobrevive à reabertura).
import { NextRequest, NextResponse } from 'next/server'
import {
  SHOPIFY_CALLBACK_PATH,
  SHOPIFY_STATE_COOKIE,
  buildAuthorizeUrl,
  escapeHtml,
  newNonce,
  normalizeShop,
  readShopifyCreds,
  shopifyAppLive,
  shopifyAppOrigin,
  shopifyNotFound,
  verifyOAuthQueryHmac,
} from '@/lib/shopify/core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const creds = readShopifyCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const q = req.nextUrl.searchParams
  const shop = normalizeShop(q.get('shop'))
  if (!shop) return NextResponse.json({ error: 'invalid_shop' }, { status: 400 })
  if (q.has('hmac') && !verifyOAuthQueryHmac(q, creds.apiSecret)) return NextResponse.json({ error: 'invalid_hmac' }, { status: 401 })

  const origin = shopifyAppOrigin()
  if (q.get('embedded') === '1') {
    const top = `${origin}/api/shopify/auth?${new URLSearchParams({ shop }).toString()}`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Kineo</title></head><body><script>window.top.location.href=${JSON.stringify(top)};</script><a href="${escapeHtml(top)}" target="_top">Continue</a></body></html>`
    return new NextResponse(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': `frame-ancestors https://${shop} https://admin.shopify.com;` } })
  }

  const state = newNonce()
  const res = NextResponse.redirect(buildAuthorizeUrl({ shop, apiKey: creds.apiKey, scopes: creds.scopes, redirectUri: `${origin}${SHOPIFY_CALLBACK_PATH}`, state }), 302)
  res.cookies.set(SHOPIFY_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/shopify/auth', maxAge: 600 })
  res.headers.set('cache-control', 'no-store')
  return res
}
