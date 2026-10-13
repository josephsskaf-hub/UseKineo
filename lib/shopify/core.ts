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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — conta da loja, planos, crédito do ciclo, uso extra e o pedido do anúncio. Tudo PURO.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Os planos aprovados pelo fundador em 13/10 (Shopify App Pricing). O handle é o do formulário de envio; o crédito cai na conta
 * Kineo da loja UMA vez por ciclo pago. Free = só a amostra grátis do Studio Ads (lib/ads/sample.ts, uma por conta).
 */
export const SHOPIFY_PLANS = {
  free: { handle: 'free', usdMonth: 0, credits: 0 },
  starter: { handle: 'shop-starter', usdMonth: 29, credits: 170 },
  business: { handle: 'shop-business', usdMonth: 84, credits: 500 },
} as const
export type ShopifyPlanId = keyof typeof SHOPIFY_PLANS

/** Anúncio extra além dos créditos do mês (medidor da App Pricing via App Events API). Só nos planos pagos. */
export const SHOPIFY_EXTRA_AD = {
  eventHandle: 'extra_ad',
  usd: 7,
  /** O extra cobre no máximo um Commercial de 15 s (41 cr). Cinema (51 cr) por US$ 7 daria prejuízo de fal. */
  maxCredits: 41,
  /** Teto NOSSO (a App Pricing não tem teto de uso): por loja, por dia UTC e por mês UTC. */
  dailyCap: 3,
  monthlyCap: 20,
} as const

/** Handle (do retorno `plan_handle` ou do item da assinatura) → plano. Desconhecido = null (nunca vira pago por engano). */
export function shopifyPlanFromHandle(handle: unknown): ShopifyPlanId | null {
  if (typeof handle !== 'string') return null
  const h = handle.trim().toLowerCase().replace(/[\s_]+/g, '-')
  if (!h || h.length > 80) return null
  if (h === 'free' || h === 'shop-free') return 'free'
  if (h === SHOPIFY_PLANS.starter.handle || h === 'starter') return 'starter'
  if (h === SHOPIFY_PLANS.business.handle || h === 'business') return 'business'
  return null
}

/** O que a Partner API `activeSubscription` devolve (só os campos que usamos). */
export interface ShopifyActiveSubscription {
  billingPeriod: string | null
  cancelAtEndOfCycle: boolean
  trialEndsAt: string | null
  cycleStart: string | null
  cycleEnd: string | null
  itemHandles: string[]
}

/** Lê o `data` da Partner API (`activeSubscription`). null = sem assinatura ativa (a doc: null quando não há). */
export function parseActiveSubscription(json: unknown): ShopifyActiveSubscription | null {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  const s = o && o.activeSubscription && typeof o.activeSubscription === 'object' ? (o.activeSubscription as Record<string, unknown>) : null
  if (!s) return null
  const cyc = s.currentBillingCycle && typeof s.currentBillingCycle === 'object' ? (s.currentBillingCycle as Record<string, unknown>) : {}
  const items = Array.isArray(s.items) ? s.items : []
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return {
    billingPeriod: str(s.billingPeriod),
    cancelAtEndOfCycle: s.cancelAtEndOfCycle === true,
    trialEndsAt: str(s.trialEndsAt),
    cycleStart: str(cyc.startTime),
    cycleEnd: str(cyc.endTime),
    itemHandles: items.map((i) => (i && typeof i === 'object' ? str((i as Record<string, unknown>).handle) : null)).filter((x): x is string => !!x),
  }
}

/** O plano da assinatura ativa: o 1º item com handle de plano conhecido. Sem assinatura = free; item desconhecido = null. */
export function planFromSubscription(sub: ShopifyActiveSubscription | null): ShopifyPlanId | null {
  if (!sub) return 'free'
  for (const h of sub.itemHandles) {
    const p = shopifyPlanFromHandle(h)
    if (p) return p
  }
  return null
}

export type ShopifyCycleDecision =
  | { grant: true; plan: 'starter' | 'business'; credits: number; cycleKey: string }
  | { grant: false; reason: 'free' | 'unknown_plan' | 'trial' | 'no_cycle' | 'dev_store' | 'cycle_not_started' }

/**
 * Crédito do ciclo: SÓ assinatura ativa de plano pago conhecido, fora do período de teste, com ciclo de cobrança lido. A chave é a
 * LOJA + o início do ciclo (mensal); no anual, um mês por vez (início + meses corridos), para o crédito cair todo mês e não 12 de
 * uma vez. Loja de DESENVOLVIMENTO (plano pago sai a US$ 0) só ganha crédito se estiver na lista do fundador (SHOPIFY_TEST_SHOPS) —
 * senão qualquer um criaria lojas de teste sem fim e gastaria a nossa fal de graça.
 */
export function decideCycleGrant(input: { shop: string; sub: ShopifyActiveSubscription | null; devStore: boolean; testShopAllowed: boolean; now: Date }): ShopifyCycleDecision {
  const plan = planFromSubscription(input.sub)
  if (plan === 'free') return { grant: false, reason: 'free' }
  if (!plan || !input.sub) return { grant: false, reason: 'unknown_plan' }
  if (input.devStore && !input.testShopAllowed) return { grant: false, reason: 'dev_store' }
  const nowMs = input.now.getTime()
  if (input.sub.trialEndsAt && Date.parse(input.sub.trialEndsAt) > nowMs) return { grant: false, reason: 'trial' }
  const start = input.sub.cycleStart ? Date.parse(input.sub.cycleStart) : NaN
  if (!Number.isFinite(start)) return { grant: false, reason: 'no_cycle' }
  if (start > nowMs) return { grant: false, reason: 'cycle_not_started' }
  const annual = /annual|year/i.test(input.sub.billingPeriod ?? '')
  let key = `${input.shop}:${new Date(start).toISOString()}`
  if (annual) {
    const a = new Date(start)
    const n = input.now
    let months = (n.getUTCFullYear() - a.getUTCFullYear()) * 12 + (n.getUTCMonth() - a.getUTCMonth())
    if (n.getUTCDate() < a.getUTCDate()) months -= 1
    key += `:m${Math.max(0, Math.min(11, months))}`
  }
  return { grant: true, plan, credits: SHOPIFY_PLANS[plan].credits, cycleKey: key.slice(0, 200) }
}

/** SHOPIFY_TEST_SHOPS = lista (vírgula) de lojas de desenvolvimento do fundador que podem ganhar o crédito do plano de teste. */
export function testShopAllowed(shop: string, env: Env = process.env): boolean {
  return (env.SHOPIFY_TEST_SHOPS ?? '').split(',').map((s) => normalizeShop(s)).filter(Boolean).includes(shop)
}

export type ShopifyExtraDecision = { ok: true } | { ok: false; reason: 'free_plan' | 'too_expensive' | 'daily_cap' | 'monthly_cap' }

/** O anúncio extra (US$ 7) pode sair? Plano pago, até 41 cr, e abaixo dos tetos do dia e do mês (contando os pendentes). */
export function decideExtraAd(input: { plan: ShopifyPlanId | null; cost: number; usedToday: number; usedMonth: number }): ShopifyExtraDecision {
  if (input.plan !== 'starter' && input.plan !== 'business') return { ok: false, reason: 'free_plan' }
  if (!(input.cost > 0) || input.cost > SHOPIFY_EXTRA_AD.maxCredits) return { ok: false, reason: 'too_expensive' }
  if (input.usedToday >= SHOPIFY_EXTRA_AD.dailyCap) return { ok: false, reason: 'daily_cap' }
  if (input.usedMonth >= SHOPIFY_EXTRA_AD.monthlyCap) return { ok: false, reason: 'monthly_cap' }
  return { ok: true }
}

/** Dia e mês UTC de `now` (as chaves dos tetos do uso extra). */
export function usageWindow(now: Date): { day: string; month: string } {
  const iso = now.toISOString()
  return { day: iso.slice(0, 10), month: iso.slice(0, 7) }
}

/** Corpo do App Events API (POST https://api.shopify.com/app/<versão>/events). idempotency_key ≤ 64; value = quantidade do medidor. */
export function appEventBody(input: { shopGid: string; idempotencyKey: string; now: Date; value?: number }): Record<string, unknown> {
  return {
    shop_id: input.shopGid,
    event_handle: SHOPIFY_EXTRA_AD.eventHandle,
    timestamp: input.now.toISOString(),
    idempotency_key: input.idempotencyKey.slice(0, 64),
    attributes: { value: input.value ?? 1 },
  }
}

// ── Conta Kineo da loja ─────────────────────────────────────────────────────────────────────────────────────────────

/** Troca de token por um token ONLINE (só para saber QUEM abriu: associated_user com e-mail verificado). Nunca é guardado. */
export function onlineTokenExchangeBody(creds: ShopifyCreds, sessionToken: string): URLSearchParams {
  return new URLSearchParams({
    client_id: creds.apiKey,
    client_secret: creds.apiSecret,
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token',
  })
}

export interface ShopifyAssociatedUser {
  email: string | null
  emailVerified: boolean
  accountOwner: boolean
}

/** O `associated_user` da resposta do token online. Sem ele = null. */
export function parseAssociatedUser(json: unknown): ShopifyAssociatedUser | null {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  const u = o && o.associated_user && typeof o.associated_user === 'object' ? (o.associated_user as Record<string, unknown>) : null
  if (!u) return null
  return { email: normalizeEmail(u.email), emailVerified: u.email_verified === true, accountOwner: u.account_owner === true }
}

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}

export type ShopAccountDecision =
  | { action: 'create'; email: string; confirmed: boolean }
  | { action: 'link'; userId: string; email: string }
  | { action: 'refuse'; reason: 'no_shop_email' | 'unverified_owner' }

/**
 * Conta Kineo da loja. E-mail = o do dono da loja (Admin API `shop.email`). A Shopify só PROVA que quem abriu é dono daquele
 * e-mail quando o usuário do token online tem `email_verified` e o MESMO e-mail. Regras:
 *   · já existe conta com o e-mail → VINCULA (nunca duplica) — mas só com a prova; sem ela, recusa: senão quem cria uma loja
 *     com o e-mail de outra pessoa gastaria os créditos e veria os vídeos dela;
 *   · não existe → CRIA (sem senha; entra pela Shopify). Confirmada só com a prova.
 */
export function decideShopAccount(input: { shopEmail: unknown; opener: ShopifyAssociatedUser | null; existingUserId: string | null }): ShopAccountDecision {
  const email = normalizeEmail(input.shopEmail)
  if (!email) return { action: 'refuse', reason: 'no_shop_email' }
  const proven = !!input.opener && input.opener.emailVerified && input.opener.email === email
  if (input.existingUserId) return proven ? { action: 'link', userId: input.existingUserId, email } : { action: 'refuse', reason: 'unverified_owner' }
  return { action: 'create', email, confirmed: proven }
}

// ── O pedido de anúncio da tela embutida ────────────────────────────────────────────────────────────────────────────

export const SHOPIFY_AD_TIERS = ['photo_motion', 'commercial', 'cinema'] as const
export type ShopifyAdTier = (typeof SHOPIFY_AD_TIERS)[number]

export type ShopAdBody =
  | { ok: true; action: 'plan'; productId: string; tier: ShopifyAdTier; style: string | null; extra: boolean }
  | { ok: true; action: 'start'; orderId: string; extra: boolean }
  | { ok: false; error: string }

const SHOP_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Corpo do POST /api/shopify/ads. O estilo só passa pela forma aqui; o contrato do /plan (sanitizePlanBody) decide se existe. */
export function sanitizeShopAdBody(raw: unknown): ShopAdBody {
  const b = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
  if (!b) return { ok: false, error: 'bad_body' }
  const extra = b.extra === true
  if (b.action === 'start') {
    const id = typeof b.order_id === 'string' ? b.order_id.trim().toLowerCase() : ''
    return SHOP_UUID_RE.test(id) ? { ok: true, action: 'start', orderId: id, extra } : { ok: false, error: 'bad_order_id' }
  }
  if (b.action !== undefined && b.action !== 'plan') return { ok: false, error: 'bad_action' }
  const productId = typeof b.product_id === 'string' ? b.product_id.trim() : ''
  if (!/^gid:\/\/shopify\/Product\/\d{1,20}$/.test(productId)) return { ok: false, error: 'invalid_product' }
  const tier = typeof b.tier === 'string' ? b.tier : 'photo_motion'
  if (!(SHOPIFY_AD_TIERS as readonly string[]).includes(tier)) return { ok: false, error: 'bad_tier' }
  let style: string | null = null
  if (b.style !== undefined && b.style !== null && b.style !== '' && b.style !== 'none') {
    if (typeof b.style !== 'string' || !/^[a-z0-9_]{1,40}$/.test(b.style)) return { ok: false, error: 'bad_style' }
    style = b.style
  }
  return { ok: true, action: 'plan', productId, tier: tier as ShopifyAdTier, style, extra }
}

/** Foto do produto: só https no CDN da Shopify (a Admin API só devolve URL de lá; qualquer outra é recusada antes da rede). */
export function isShopifyCdnImage(u: unknown): u is string {
  if (typeof u !== 'string' || u.length > 2000) return false
  try {
    const url = new URL(u)
    return url.protocol === 'https:' && url.hostname === 'cdn.shopify.com' && !url.username && !url.password && (url.port === '' || url.port === '443')
  } catch {
    return false
  }
}

/** Limite da frase do pedido (ADS_V2_SENTENCE_MAX_CHARS em lib/ads/v2Contract.ts — o guardião confere que é o mesmo número). */
export const SHOPIFY_AD_SENTENCE_MAX = 400

/** A frase do anúncio a partir do produto: título + marca + descrição curta (só o que a LOJA escreveu), até 400 caracteres. */
export function productAdSentence(p: { title?: unknown; vendor?: unknown; description?: unknown }): string | null {
  const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '')
  const title = clean(p.title)
  if (!title) return null
  const vendor = clean(p.vendor)
  const desc = clean(p.description)
  let s = vendor && !title.toLowerCase().includes(vendor.toLowerCase()) ? `${title} by ${vendor}` : title
  if (desc) s += `. ${desc}`
  if (s.length > SHOPIFY_AD_SENTENCE_MAX) {
    const cut = s.slice(0, SHOPIFY_AD_SENTENCE_MAX)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    s = end > title.length ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '')
  }
  return s.trim().slice(0, SHOPIFY_AD_SENTENCE_MAX) || null
}

/** Preço do produto para o texto e o cartão: "29.00 USD" → "$29.00" nas moedas comuns; até 60 caracteres (ADS_V2_PRICE_MAX_CHARS). */
export function productPriceLabel(amount: unknown, currency: unknown): string | null {
  const n = typeof amount === 'string' || typeof amount === 'number' ? Number(amount) : NaN
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) return null
  const cur = typeof currency === 'string' ? currency.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : ''
  const sym: Record<string, string> = { USD: '$', CAD: 'CA$', AUD: 'A$', EUR: '€', GBP: '£', BRL: 'R$', INR: '₹', JPY: '¥', MXN: 'MX$' }
  const val = cur === 'JPY' ? String(Math.round(n)) : n.toFixed(2)
  return (sym[cur] ? `${sym[cur]}${val}` : `${val} ${cur}`.trim()).slice(0, 60)
}

/** Página de planos da App Pricing: https://admin.shopify.com/store/<loja>/charges/<app>/pricing_plans. */
export function pricingPlansUrl(shop: string, appHandle: string): string {
  const store = shop.replace(/\.myshopify\.com$/, '')
  const app = /^[a-z0-9][a-z0-9-]{0,60}$/.test(appHandle) ? appHandle : 'kineo-ads'
  return `https://admin.shopify.com/store/${encodeURIComponent(store)}/charges/${app}/pricing_plans`
}

// ── Acréscimos aprovados pelo fundador em 13/10 ("tudo sim") ──────────────────────────────────────────────────────

/** Os escopos OPCIONAIS do "Add to product page" (pedidos SÓ quando o lojista clica; o padrão do app segue read_products). */
export const SHOPIFY_ATTACH_SCOPES = 'write_products,write_files'

/**
 * "Add to product page" (anexar o MP4 à mídia do produto): o BOTÃO existe por padrão (fundador 13/10). SHOPIFY_ATTACH_MEDIA =
 * false|0|off|no desliga (chave de emergência). A permissão é conferida AO VIVO na Shopify antes de anexar (os escopos opcionais
 * concedidos depois da instalação não aparecem no token guardado); sem ela, a tela pede (shopify.scopes.request).
 */
export function attachMediaEnabled(env: Env = process.env): boolean {
  return !['false', '0', 'off', 'no'].includes((env.SHOPIFY_ATTACH_MEDIA ?? '').trim().toLowerCase())
}

/**
 * O que cada plano promete na tela e na listagem (posicionamento aprovado em 13/10). Starter = 170 cr = 4 anúncios Commercial de
 * 15 s (41 cr) → "um anúncio novo por semana"; Business = 500 cr = 12. Nada de "unlimited", nada de depoimento/UGC (regra da FTC:
 * a pessoa de IA não fala como cliente).
 */
export const SHOPIFY_PLAN_PITCH: Record<ShopifyPlanId, string> = {
  free: '1 free sample ad',
  starter: 'A new ad for your product every week',
  business: '12 ads a month',
}

/** Lembrete semanal DENTRO do app (sem e-mail): plano pago, saldo para um Commercial de 15 s e nenhum anúncio começado em 7 dias. */
export function weeklyAdReady(input: { plan: ShopifyPlanId | null; credits: number; lastStartedAt: string | null; now: Date }): boolean {
  if (input.plan !== 'starter' && input.plan !== 'business') return false
  if (!(input.credits >= SHOPIFY_EXTRA_AD.maxCredits)) return false
  if (!input.lastStartedAt) return true
  const t = Date.parse(input.lastStartedAt)
  return !Number.isFinite(t) || input.now.getTime() - t >= 7 * 24 * 3600 * 1000
}

/**
 * Pedido de avaliação: a página do app na App Store (SHOPIFY_APP_STORE_URL). Só https em apps.shopify.com; vazia/torta = null e o
 * cartão NÃO aparece. O texto nunca oferece nada em troca (regra da Shopify: avaliação sem incentivo).
 */
export function appStoreReviewUrl(env: Env = process.env): string | null {
  const raw = (env.SHOPIFY_APP_STORE_URL ?? '').trim()
  if (!raw || raw.length > 300) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname === 'apps.shopify.com' && /^\/[a-z0-9-]+/i.test(u.pathname) ? u.toString() : null
  } catch {
    return null
  }
}

/** O cartão de avaliação aparece logo depois do 1º anúncio ENTREGUE (o grátis, para quem começa no Free), e só com a URL. */
export function showReviewCard(input: { reviewUrl: string | null; deliveredAds: number }): boolean {
  return !!input.reviewUrl && input.deliveredAds === 1
}
