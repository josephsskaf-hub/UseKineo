// KINEO-SHOPIFY-2026-10-13 — volta do OAuth por código.
//
// ORDEM DAS TRAVAS (o guardião scripts/test-shopify-app-1310.mjs confere):
//   interruptor (404) → credenciais (503) → HMAC da query OBRIGATÓRIO (401) → loja pela regex ancorada (400) → state = nonce
//   do cookie, em tempo constante (403) → code presente (400) → troca do code por token offline que expira (502) → escopos
//   concedidos cobrem os pedidos (403) → token CIFRADO no banco (503 sem chave de cifra; nunca grava em claro) → evento sem
//   token → 302 para a tela do app DENTRO do admin da loja (exigência 2.3.3: depois das permissões, a UI do app).
import { NextRequest, NextResponse } from 'next/server'
import {
  SHOPIFY_STATE_COOKIE,
  codeGrantBody,
  normalizeShop,
  readShopifyCreds,
  safeEqual,
  scopesCover,
  shopifyAppLive,
  shopifyNotFound,
  verifyOAuthQueryHmac,
} from '@/lib/shopify/core'
import { exchangeCode, saveShopTokens, shopifyAdmin } from '@/lib/shopify/server'
import { writeServerEvent } from '@/lib/serverEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clearState(res: NextResponse): NextResponse {
  res.cookies.set(SHOPIFY_STATE_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/shopify/auth', maxAge: 0 })
  res.headers.set('cache-control', 'no-store')
  return res
}

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const creds = readShopifyCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const q = req.nextUrl.searchParams
  if (!verifyOAuthQueryHmac(q, creds.apiSecret)) return clearState(NextResponse.json({ error: 'invalid_hmac' }, { status: 401 }))
  const shop = normalizeShop(q.get('shop'))
  if (!shop) return clearState(NextResponse.json({ error: 'invalid_shop' }, { status: 400 }))
  const state = q.get('state') ?? ''
  const cookie = req.cookies.get(SHOPIFY_STATE_COOKIE)?.value ?? ''
  if (!state || !cookie || !safeEqual(state, cookie)) return clearState(NextResponse.json({ error: 'invalid_state' }, { status: 403 }))
  const code = q.get('code') ?? ''
  if (!code) return clearState(NextResponse.json({ error: 'missing_code' }, { status: 400 }))

  const tokens = await exchangeCode(shop, codeGrantBody(creds, code))
  if (!tokens) return clearState(NextResponse.json({ error: 'token_exchange_failed' }, { status: 502 }))
  if (!scopesCover(tokens.scope, creds.scopes)) return clearState(NextResponse.json({ error: 'scopes_missing' }, { status: 403 }))
  const admin = shopifyAdmin()
  if (!admin || !(await saveShopTokens(admin, shop, tokens))) return clearState(NextResponse.json({ error: 'not_ready' }, { status: 503 }))

  await writeServerEvent({ name: 'shopify_app_installed', path: '/api/shopify/auth/callback', metadata: { shop, via: 'code_grant', scopes: tokens.scope } })
  return clearState(NextResponse.redirect(`https://${shop}/admin/apps/${encodeURIComponent(creds.apiKey)}`, 302))
}
