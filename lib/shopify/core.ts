// KINEO-SHOPIFY-2026-10-13 — o núcleo PURO do app da Shopify (Studio Ads para lojistas).
//
// Por que um arquivo só e sem `@/`: o guardião scripts/test-shopify-app-1310.mjs IMPORTA este módulo de verdade (o node 24
// tira os tipos sozinho) e executa as verificações com assinaturas reais feitas pelo crypto do node — a mesma conta que a
// Shopify faz. Nada aqui fala com banco, rede ou Next: só conta, texto e Response.
//
// O QUE MORA AQUI:
//   · o INTERRUPTOR (SHOPIFY_APP_LIVE, desligado por padrão) e a leitura das credenciais (SHOPIFY_API_KEY/SHOPIFY_API_SECRET)
//     — sempre de process.env, nunca de arquivo;
//   · as 3 provas de origem: HMAC da query do OAuth (hex), HMAC do corpo do webhook (base64) e o token de sessão do App Bridge
//     (JWT HS256, aud = client id, iss e dest do mesmo host, exp/nbf);
//   · a cifra do token da loja (AES-256-GCM com SHOPIFY_TOKEN_ENC_KEY — o token nunca vai ao banco em texto);
//   · o redator de log (nenhum token, segredo, code ou hmac sai em console).
//
// REGRA: nenhuma função daqui escreve em console. Quem loga usa redactForLog().
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Versão da Admin API (trimestral; 2026-07 é estável e suportada por 12 meses). Trocar aqui troca em todo lugar. */
export const SHOPIFY_API_VERSION = '2026-07'

/** Escopos mínimos: ler produtos (lista + fotos). Anexar o vídeo ao produto exige 'write_products,write_files' (ETAPA 2). */
export const SHOPIFY_DEFAULT_SCOPES = 'read_products'

/** Os 3 webhooks de privacidade obrigatórios + a desinstalação. Qualquer outro tópico = 200 e ignora. */
export const SHOPIFY_COMPLIANCE_TOPICS = ['customers/data_request', 'customers/redact', 'shop/redact'] as const
export const SHOPIFY_WEBHOOK_TOPICS = [...SHOPIFY_COMPLIANCE_TOPICS, 'app/uninstalled'] as const

/** Cookie do nonce do OAuth (só no caminho de instalação por código; o caminho padrão é a troca de token). */
export const SHOPIFY_STATE_COOKIE = 'kineo_shopify_state'

type Env = Record<string, string | undefined>

// ── Interruptor e credenciais ─────────────────────────────────────────────────────────────────────────────────────────

/** true só com SHOPIFY_APP_LIVE = true|1|yes|on. Ausente, vazio ou qualquer outra coisa = DESLIGADO. */
export function shopifyAppLive(env: Env = process.env): boolean {
  return ['true', '1', 'yes', 'on'].includes((env.SHOPIFY_APP_LIVE ?? '').trim().toLowerCase())
}

export interface ShopifyCreds {
  apiKey: string
  apiSecret: string
  scopes: string
}

/** Credenciais do app. Falta qualquer uma = null (a rota responde 503 — nunca tenta seguir sem segredo). */
export function readShopifyCreds(env: Env = process.env): ShopifyCreds | null {
  const apiKey = (env.SHOPIFY_API_KEY ?? '').trim()
  const apiSecret = (env.SHOPIFY_API_SECRET ?? '').trim()
  if (!apiKey || !apiSecret) return null
  // KINEO-SHOPIFY-CHAVE-1310 — o Client ID vai PÚBLICO na página do app (meta shopify-api-key). Em 13/10 a chave secreta
  // (prefixo shpss_) foi colada no lugar dele e saiu na página: com segredo no campo do Client ID, o app recusa subir
  // (503 not_configured) em vez de publicar o segredo. Módulo puro: sem console aqui.
  if (/^shp[a-z]{2}_/i.test(apiKey) || apiKey === apiSecret) {
    return null
  }
  const scopes = (env.SHOPIFY_SCOPES ?? '').trim() || SHOPIFY_DEFAULT_SCOPES
  return { apiKey, apiSecret, scopes }
}

/** Origem pública do app (App URL e redirect do OAuth precisam bater EXATAMENTE com o painel da Shopify). */
export function shopifyAppOrigin(env: Env = process.env): string {
  const raw = (env.SHOPIFY_APP_URL ?? '').trim().replace(/\/+$/, '')
  return /^https:\/\/[a-z0-9.-]+$/i.test(raw) ? raw : 'https://www.usekineo.com'
}

export const SHOPIFY_CALLBACK_PATH = '/api/shopify/auth/callback'

/** A resposta de quem chega com o interruptor desligado: 404 seco, sem corpo que revele o app. */
export function shopifyNotFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}

// ── Domínio da loja ───────────────────────────────────────────────────────────────────────────────────────────────────

/** A regex da doc da Shopify, ancorada nas DUAS pontas (sem o $ final, "loja.myshopify.com.atacante.com" passaria). */
const SHOP_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/

export function isValidShopDomain(shop: unknown): shop is string {
  return typeof shop === 'string' && shop.length <= 255 && SHOP_RE.test(shop)
}

export function normalizeShop(shop: unknown): string | null {
  if (typeof shop !== 'string') return null
  const s = shop.trim().toLowerCase()
  return isValidShopDomain(s) ? s : null
}

// ── Comparação em tempo constante ─────────────────────────────────────────────────────────────────────────────────────

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length || ba.length === 0) return false
  return timingSafeEqual(ba, bb)
}

export function newNonce(): string {
  return randomBytes(24).toString('base64url')
}

// ── Prova 1: HMAC da query (instalação, callback do OAuth, abertura do app) ──────────────────────────────────────────

/**
 * A mensagem que a Shopify assina: todos os parâmetros MENOS `hmac` (e o legado `signature`), em ordem alfabética,
 * `chave=valor` unidos por `&`. HMAC-SHA256 com o client secret, em hex.
 */
export function oauthHmacMessage(params: URLSearchParams): string {
  const pairs: [string, string][] = []
  params.forEach((value, key) => {
    if (key === 'hmac' || key === 'signature') return
    pairs.push([key, value])
  })
  pairs.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0))
  return pairs.map(([k, v]) => `${k}=${v}`).join('&')
}

export function signOAuthQuery(params: URLSearchParams, secret: string): string {
  return createHmac('sha256', secret).update(oauthHmacMessage(params)).digest('hex')
}

/** true só com `hmac` presente, em hex, e igual à conta com o segredo. Sem hmac = false. */
export function verifyOAuthQueryHmac(params: URLSearchParams, secret: string): boolean {
  const given = (params.get('hmac') ?? '').trim().toLowerCase()
  if (!secret || !/^[0-9a-f]{64}$/.test(given)) return false
  return safeEqual(signOAuthQuery(params, secret), given)
}

// ── Prova 2: HMAC do corpo do webhook ─────────────────────────────────────────────────────────────────────────────────

export function signWebhookBody(rawBody: string | Uint8Array, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64')
}

/** X-Shopify-Hmac-Sha256 = base64(HMAC-SHA256(corpo CRU, client secret)). Corpo re-serializado NÃO serve. */
export function verifyWebhookHmac(rawBody: string | Uint8Array, header: string | null | undefined, secret: string): boolean {
  const given = (header ?? '').trim()
  if (!secret || !given || given.length > 128) return false
  return safeEqual(signWebhookBody(rawBody, secret), given)
}

// ── Prova 3: token de sessão do App Bridge (JWT HS256) ───────────────────────────────────────────────────────────────

export type SessionTokenResult =
  | { ok: true; shop: string; sub: string | null; sid: string | null; exp: number }
  | { ok: false; reason: 'malformed' | 'alg' | 'signature' | 'expired' | 'not_yet_valid' | 'audience' | 'issuer' | 'shop' }

function b64urlJson(part: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function hostOf(u: unknown): string | null {
  if (typeof u !== 'string') return null
  try {
    const url = new URL(u)
    return url.protocol === 'https:' ? url.hostname.toLowerCase() : null
  } catch {
    return null
  }
}

/**
 * Valida o token do App Bridge (vida de 1 minuto): assinatura HS256 com o client secret, exp no futuro e nbf no passado
 * (folga de 10 s para relógio), aud = client id, iss e dest com o MESMO host, e o host é uma loja *.myshopify.com.
 * Devolve a loja (de `dest`). Qualquer falha = recusa (a rota responde 401 antes de qualquer chamada à Shopify).
 */
export function verifySessionToken(
  token: string | null | undefined,
  creds: { apiKey: string; apiSecret: string },
  nowSec: number = Math.floor(Date.now() / 1000),
): SessionTokenResult {
  const raw = (token ?? '').trim()
  const parts = raw.split('.')
  if (parts.length !== 3 || raw.length > 4096) return { ok: false, reason: 'malformed' }
  const header = b64urlJson(parts[0])
  const payload = b64urlJson(parts[1])
  if (!header || !payload) return { ok: false, reason: 'malformed' }
  if (header.alg !== 'HS256') return { ok: false, reason: 'alg' }
  const expected = createHmac('sha256', creds.apiSecret).update(`${parts[0]}.${parts[1]}`).digest('base64url')
  if (!safeEqual(expected, parts[2])) return { ok: false, reason: 'signature' }
  const LEEWAY = 10
  const exp = Number(payload.exp)
  const nbf = Number(payload.nbf ?? payload.iat ?? 0)
  if (!Number.isFinite(exp) || exp + LEEWAY < nowSec) return { ok: false, reason: 'expired' }
  if (Number.isFinite(nbf) && nbf - LEEWAY > nowSec) return { ok: false, reason: 'not_yet_valid' }
  const aud = payload.aud
  const audOk = Array.isArray(aud) ? aud.includes(creds.apiKey) : aud === creds.apiKey
  if (!audOk) return { ok: false, reason: 'audience' }
  const destHost = hostOf(payload.dest)
  const issHost = hostOf(payload.iss)
  if (!destHost || !issHost || destHost !== issHost) return { ok: false, reason: 'issuer' }
  if (!isValidShopDomain(destHost)) return { ok: false, reason: 'shop' }
  return {
    ok: true,
    shop: destHost,
    sub: typeof payload.sub === 'string' ? payload.sub : null,
    sid: typeof payload.sid === 'string' ? payload.sid : null,
    exp,
  }
}

/** "Authorization: Bearer <jwt>" → o jwt. Qualquer outra forma = null. */
export function bearerFrom(header: string | null | undefined): string | null {
  const m = /^Bearer\s+([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)$/.exec((header ?? '').trim())
  return m ? m[1] : null
}

// ── OAuth: URLs e corpos ──────────────────────────────────────────────────────────────────────────────────────────────

export function buildAuthorizeUrl(input: { shop: string; apiKey: string; scopes: string; redirectUri: string; state: string }): string {
  const q = new URLSearchParams({ client_id: input.apiKey, scope: input.scopes, redirect_uri: input.redirectUri, state: input.state })
  return `https://${input.shop}/admin/oauth/authorize?${q.toString()}`
}

export function accessTokenUrl(shop: string): string {
  return `https://${shop}/admin/oauth/access_token`
}

/** Troca do `code` (instalação por código). `expiring=1`: app público novo precisa de token offline que expira. */
export function codeGrantBody(creds: ShopifyCreds, code: string): URLSearchParams {
  return new URLSearchParams({ client_id: creds.apiKey, client_secret: creds.apiSecret, code, expiring: '1' })
}

/** Troca de token (instalação gerida pela Shopify): o token de sessão vira token OFFLINE que expira. */
export function tokenExchangeBody(creds: ShopifyCreds, sessionToken: string): URLSearchParams {
  return new URLSearchParams({
    client_id: creds.apiKey,
    client_secret: creds.apiSecret,
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
    expiring: '1',
  })
}

export function refreshTokenBody(creds: ShopifyCreds, refreshToken: string): URLSearchParams {
  return new URLSearchParams({ client_id: creds.apiKey, client_secret: creds.apiSecret, grant_type: 'refresh_token', refresh_token: refreshToken })
}

export interface ShopifyTokenSet {
  accessToken: string
  scope: string
  /** epoch ms; null = token sem validade (legado). */
  accessExpiresAt: number | null
  refreshToken: string | null
  refreshExpiresAt: number | null
}

/** Lê a resposta do /admin/oauth/access_token. Sem access_token = null. */
export function parseTokenResponse(json: unknown, nowMs: number = Date.now()): ShopifyTokenSet | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  const accessToken = typeof o.access_token === 'string' ? o.access_token : ''
  if (!accessToken) return null
  const exp = Number(o.expires_in)
  const rexp = Number(o.refresh_token_expires_in)
  return {
    accessToken,
    scope: typeof o.scope === 'string' ? o.scope : '',
    accessExpiresAt: Number.isFinite(exp) && exp > 0 ? nowMs + exp * 1000 : null,
    refreshToken: typeof o.refresh_token === 'string' && o.refresh_token ? o.refresh_token : null,
    refreshExpiresAt: Number.isFinite(rexp) && rexp > 0 ? nowMs + rexp * 1000 : null,
  }
}

/** Os escopos concedidos cobrem os pedidos? (write_x implica read_x, como na Shopify.) */
export function scopesCover(granted: string, required: string): boolean {
  const g = new Set(granted.split(',').map((s) => s.trim()).filter(Boolean))
  return required
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .every((s) => g.has(s) || (s.startsWith('read_') && g.has(`write_${s.slice(5)}`)))
}

// ── Cifra do token da loja ────────────────────────────────────────────────────────────────────────────────────────────

/** SHOPIFY_TOKEN_ENC_KEY = 32 bytes em base64 (ou 64 hex). Ausente/torta = null → a rota NÃO grava token (falha fechada). */
export function readTokenKey(env: Env = process.env): Buffer | null {
  const raw = (env.SHOPIFY_TOKEN_ENC_KEY ?? '').trim()
  if (!raw) return null
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  return buf.length === 32 ? buf : null
}

/** "v1.<iv>.<tag>.<cifra>" em base64url. AES-256-GCM: trocar um bit da cifra = decifra falha. */
export function encryptToken(plain: string, key: Buffer): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.')
}

export function decryptToken(sealed: string | null | undefined, key: Buffer): string | null {
  try {
    const [v, iv, tag, ct] = String(sealed ?? '').split('.')
    if (v !== 'v1' || !iv || !tag || !ct) return null
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    d.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

// ── Log sem segredo ───────────────────────────────────────────────────────────────────────────────────────────────────

const SECRET_KEY_RE = /token|secret|hmac|code|signature|password|authorization|cookie|state|enc/i
const SECRET_VALUE_RE = /(shp(at|ca|pa|ss|rt)_[A-Za-z0-9]+)|(eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/g

/** Copia rasa para log: chave com cara de segredo vira "[redacted]"; valor com cara de token (shpat_…, JWT) também. */
export function redactForLog(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (SECRET_KEY_RE.test(k)) out[k] = '[redacted]'
    else if (typeof v === 'string') out[k] = v.replace(SECRET_VALUE_RE, '[redacted]').slice(0, 300)
    else if (typeof v === 'number' || typeof v === 'boolean' || v === null) out[k] = v
    else out[k] = '[object]'
  }
  return out
}

// ── HTML ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** frame-ancestors da página embutida: SÓ a loja e o admin da Shopify (exigência da Shopify para app embutido). */
export function frameAncestors(shop: string | null): string {
  return shop ? `frame-ancestors https://${shop} https://admin.shopify.com;` : 'frame-ancestors https://admin.shopify.com;'
}

/** O link do produto que o Studio Ads lê ("paste your product link"): só https, só host público, até 500 caracteres. */
export function productLinkForAd(onlineStoreUrl: unknown): string | null {
  if (typeof onlineStoreUrl !== 'string') return null
  const s = onlineStoreUrl.trim()
  if (s.length > 500) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'https:' || !u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

/** O caminho de entrega no site (/shopify/open?link=…): a porta confere o login e cai no /ads/v2 com o link já no campo. */
export function adHandoffPath(link: string): string {
  return `/shopify/open?${new URLSearchParams({ link }).toString()}`
}
