// KINEO-SHOPIFY-2026-10-13 (etapa 2) — a porta ÚNICA das rotas da tela embutida que agem na conta da loja (/api/shopify/ads,
// /api/shopify/ads/status, /api/shopify/account, /api/shopify/ads/attach).
//
// ORDEM DAS TRAVAS (o guardião scripts/test-shopify-app-1310.mjs confere): credenciais (503) → token de sessão do App Bridge no
// Authorization (401 sem ele ou inválido) → banco (503) → token da loja (guardado, renovado ou trocado; 401 'reauthorize') →
// conta Kineo da loja (criada ou vinculada pela regra de lib/shopify/account.ts; 403 quando a Shopify não prova o e-mail). O
// interruptor SHOPIFY_APP_LIVE é a 1ª linha de cada rota, ANTES desta porta. Nada daqui loga token.
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { bearerFrom, readShopifyCreds, verifySessionToken, type ShopifyCreds } from '@/lib/shopify/core'
import { shopifyAdmin, validAccessToken } from '@/lib/shopify/server'
import { ensureShopAccount, type ShopLink } from '@/lib/shopify/account'

export const SHOPIFY_NO_STORE = { 'cache-control': 'no-store' } as const

export function shopJson(body: object, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: SHOPIFY_NO_STORE })
}

export interface ShopRequestContext {
  creds: ShopifyCreds
  shop: string
  sessionToken: string
  admin: SupabaseClient
  accessToken: string
  userId: string
  email: string | null
  link: ShopLink
}

export async function shopRequestContext(req: NextRequest): Promise<{ ok: true; ctx: ShopRequestContext } | { ok: false; res: NextResponse }> {
  const creds = readShopifyCreds()
  if (!creds) return { ok: false, res: shopJson({ error: 'not_configured' }, 503) }
  const sessionToken = bearerFrom(req.headers.get('authorization'))
  const session = verifySessionToken(sessionToken, creds)
  if (!session.ok || !sessionToken) return { ok: false, res: shopJson({ error: 'invalid_session', reason: session.ok ? 'malformed' : session.reason }, 401) }
  const admin = shopifyAdmin()
  if (!admin) return { ok: false, res: shopJson({ error: 'not_ready' }, 503) }
  const accessToken = await validAccessToken(admin, creds, session.shop, sessionToken)
  if (!accessToken) return { ok: false, res: shopJson({ error: 'reauthorize' }, 401) }
  const acct = await ensureShopAccount(admin, creds, session.shop, sessionToken, accessToken)
  if (!acct.ok) {
    const status = acct.error === 'not_ready' ? 503 : acct.error === 'shopify_unavailable' ? 502 : acct.error === 'account_failed' ? 502 : 403
    return { ok: false, res: shopJson({ error: acct.error }, status) }
  }
  return { ok: true, ctx: { creds, shop: session.shop, sessionToken, admin, accessToken, userId: acct.userId, email: acct.email, link: acct.link } }
}
