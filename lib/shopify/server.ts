// KINEO-SHOPIFY-2026-10-13 — o lado servidor do app da Shopify: banco (shopify_shops), troca/renovação de token e Admin GraphQL.
//
// Só a chave de serviço toca a tabela (RLS ligado e nenhuma policy: anon/authenticated não leem nem escrevem). O token da
// loja entra CIFRADO (lib/shopify/core.ts encryptToken, chave SHOPIFY_TOKEN_ENC_KEY) e só é decifrado aqui, na memória,
// para a chamada à Shopify. Nada daqui loga token: os avisos passam por redactForLog().
//
// Tabela ausente (migration ainda não aplicada) = as funções devolvem null/false e a rota responde 503 'not_ready'.
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SHOPIFY_API_VERSION,
  accessTokenUrl,
  decryptToken,
  encryptToken,
  parseTokenResponse,
  readTokenKey,
  redactForLog,
  refreshTokenBody,
  tokenExchangeBody,
  type ShopifyCreds,
  type ShopifyTokenSet,
} from '@/lib/shopify/core'

export const SHOPIFY_SHOPS_TABLE = 'shopify_shops'
export const SHOPIFY_WEBHOOK_TABLE = 'shopify_webhook_receipts'

export function shopifyAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export interface ShopRow {
  shop_domain: string
  access_token_enc: string | null
  access_token_expires_at: string | null
  refresh_token_enc: string | null
  refresh_token_expires_at: string | null
  scopes: string | null
  owner_user_id: string | null
  plan_handle: string | null
  status: string
}

const SHOP_COLUMNS = 'shop_domain, access_token_enc, access_token_expires_at, refresh_token_enc, refresh_token_expires_at, scopes, owner_user_id, plan_handle, status'

export async function loadShop(admin: SupabaseClient, shop: string): Promise<ShopRow | null> {
  const r = await admin.from(SHOPIFY_SHOPS_TABLE).select(SHOP_COLUMNS).eq('shop_domain', shop).maybeSingle()
  if (r.error) {
    console.warn('[shopify] leitura da loja falhou', redactForLog({ shop, code: r.error.code ?? null }))
    return null
  }
  return (r.data as ShopRow | null) ?? null
}

/** Grava (ou renova) os tokens CIFRADOS da loja e marca 'installed'. Sem chave de cifra = false (nunca grava em claro). */
export async function saveShopTokens(admin: SupabaseClient, shop: string, t: ShopifyTokenSet): Promise<boolean> {
  const key = readTokenKey()
  if (!key) return false
  const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : null)
  const row = {
    shop_domain: shop,
    access_token_enc: encryptToken(t.accessToken, key),
    access_token_expires_at: iso(t.accessExpiresAt),
    refresh_token_enc: t.refreshToken ? encryptToken(t.refreshToken, key) : null,
    refresh_token_expires_at: iso(t.refreshExpiresAt),
    scopes: t.scope || null,
    status: 'installed',
    uninstalled_at: null,
    updated_at: new Date().toISOString(),
  }
  const r = await admin.from(SHOPIFY_SHOPS_TABLE).upsert(row, { onConflict: 'shop_domain' })
  if (r.error) console.warn('[shopify] gravação da loja falhou', redactForLog({ shop, code: r.error.code ?? null }))
  return !r.error
}

async function postToken(shop: string, body: URLSearchParams): Promise<ShopifyTokenSet | null> {
  try {
    const res = await fetch(accessTokenUrl(shop), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: body.toString(),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn('[shopify] token recusado', redactForLog({ shop, status: res.status }))
      return null
    }
    return parseTokenResponse(await res.json().catch(() => null))
  } catch (e) {
    console.warn('[shopify] token falhou', redactForLog({ shop, error: e instanceof Error ? e.message : 'unknown' }))
    return null
  }
}

export function exchangeCode(shop: string, body: URLSearchParams): Promise<ShopifyTokenSet | null> {
  return postToken(shop, body)
}

/**
 * Um token de acesso VÁLIDO para a loja: o guardado (se ainda vale por > 60 s) → renovado pelo refresh token → trocado a
 * partir do token de sessão do App Bridge (instalação gerida pela Shopify). null = sem caminho (a tela pede para reabrir).
 */
export async function validAccessToken(admin: SupabaseClient, creds: ShopifyCreds, shop: string, sessionToken: string | null): Promise<string | null> {
  const key = readTokenKey()
  if (!key) return null
  const row = await loadShop(admin, shop)
  const now = Date.now()
  if (row && row.status === 'installed' && row.access_token_enc) {
    const exp = row.access_token_expires_at ? Date.parse(row.access_token_expires_at) : Infinity
    if (exp - now > 60_000) {
      const tok = decryptToken(row.access_token_enc, key)
      if (tok) return tok
    }
    const rexp = row.refresh_token_expires_at ? Date.parse(row.refresh_token_expires_at) : 0
    const refresh = rexp > now ? decryptToken(row.refresh_token_enc, key) : null
    if (refresh) {
      const t = await postToken(shop, refreshTokenBody(creds, refresh))
      if (t && (await saveShopTokens(admin, shop, t))) return t.accessToken
    }
  }
  if (!sessionToken) return null
  const t = await postToken(shop, tokenExchangeBody(creds, sessionToken))
  if (!t) return null
  return (await saveShopTokens(admin, shop, t)) ? t.accessToken : null
}

/** Admin GraphQL (a única API que app público novo pode usar). Erro = null; o token nunca aparece no log. */
export async function adminGraphql<T>(shop: string, accessToken: string, query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    })
    const json = (await res.json().catch(() => null)) as { data?: T; errors?: unknown } | null
    if (!res.ok || !json || json.errors || !json.data) {
      console.warn('[shopify] graphql falhou', redactForLog({ shop, status: res.status }))
      return null
    }
    return json.data
  } catch (e) {
    console.warn('[shopify] graphql exceção', redactForLog({ shop, error: e instanceof Error ? e.message : 'unknown' }))
    return null
  }
}

/** Idempotência do webhook: grava X-Shopify-Webhook-Id; repetido = false (a rota responde 200 sem refazer). Erro = true (processa). */
export async function firstWebhookDelivery(admin: SupabaseClient, webhookId: string, topic: string, shop: string): Promise<boolean> {
  if (!webhookId) return true
  const r = await admin.from(SHOPIFY_WEBHOOK_TABLE).insert({ webhook_id: webhookId.slice(0, 120), topic, shop_domain: shop })
  if (r.error && r.error.code === '23505') return false
  return true
}

/** Ação falhou: o recibo sai, para o REENVIO da Shopify (mesmo id) ser processado de verdade. */
export async function forgetWebhookDelivery(admin: SupabaseClient, webhookId: string): Promise<void> {
  if (!webhookId) return
  await admin.from(SHOPIFY_WEBHOOK_TABLE).delete().eq('webhook_id', webhookId.slice(0, 120))
}

/** app/uninstalled: o token morre na hora (apagado), a linha fica 'uninstalled' até o shop/redact (48 h depois). */
export async function markUninstalled(admin: SupabaseClient, shop: string): Promise<boolean> {
  const r = await admin
    .from(SHOPIFY_SHOPS_TABLE)
    .update({ status: 'uninstalled', access_token_enc: null, refresh_token_enc: null, access_token_expires_at: null, refresh_token_expires_at: null, uninstalled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('shop_domain', shop)
  return !r.error
}

/** shop/redact: apaga a linha da loja e os recibos de webhook dela. O que a conta Kineo vinculada gerou NÃO é da Shopify. */
export async function redactShop(admin: SupabaseClient, shop: string): Promise<boolean> {
  const a = await admin.from(SHOPIFY_SHOPS_TABLE).delete().eq('shop_domain', shop)
  await admin.from(SHOPIFY_WEBHOOK_TABLE).delete().eq('shop_domain', shop)
  return !a.error
}
