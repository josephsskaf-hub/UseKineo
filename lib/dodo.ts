// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DODO-2026-09-07 — o trilho de pagamento que aceita UPI / RuPay / Pix
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE EXISTE (medido 07/09, 30 dias, por pessoa): Índia 47 cadastros /
// 21 no checkout / 0 pagos · Nigéria 22 / 12 / 0 · Paquistão 10 / 3 / 0 ·
// Bangladesh 3 / 2 / 0 · Quênia 4 / 2 / 0. Quarenta pessoas abriram a página
// de pagamento da Stripe e NENHUMA pagou. Cartão indiano recusa mandato
// recorrente internacional (e-mandate do RBI) e a Stripe não faz UPI para
// comerciante fora da Índia. A Dodo Payments é "merchant of record": cobra em
// INR/BRL na tela da pessoa, nos paga em USD, e os preços continuam sendo os
// de lib/checkoutPricing.ts — este arquivo NÃO conhece preço nenhum.
//
// NASCE DESLIGADO POR ENV. Nenhuma chave existe hoje (07/09). Tudo aqui
// consulta `isDodoEnabled()`; sem chave, a rota de checkout responde 503 com o
// NOME da env que falta e o webhook responde 503 sem conceder nada.
//
// ⛔ CORRIGIDO EM 07/09 (rotação #11) — A FRASE ANTERIOR ERA FALSA. Estava
// escrito aqui que, colada a chave na Vercel, o trilho "liga sozinho — sem
// deploy novo". NÃO LIGA. A documentação da Vercel é literal: "Any change you
// make to environment variables are not applied to previous deployments, they
// only apply to new deployments" (vercel.com/docs/environment-variables), e a
// linha de Production diz que a variável vale para "your NEXT Production
// Deployment". O bundle da função serverless carrega as envs do deploy que a
// construiu; colar a chave no painel não toca no deploy que já está servindo.
//
// CONSEQUÊNCIA PRÁTICA, e é a razão desta correção existir: o fundador colaria
// DODO_API_KEY às 21h, abriria o site, não veria botão nenhum, e NÃO HAVERIA
// ERRO EM LUGAR ALGUM — `isDodoEnabled()` continuaria false para sempre. A
// ordem urgente de 07/09 morreria em silêncio, parecendo "ainda não ligou".
//
// O QUE LIGA DE VERDADE: colar as envs E DEPOIS um deploy novo (Redeploy no
// painel da Vercel, ou o próximo push). Nenhuma linha de código muda.
// Quem responde "o trilho está vivo NESTE deploy?" é /api/admin/payment-rails.
//
// REGRAS DESTE ARQUIVO:
//  · ZERO imports com alias `@/` — o guardião scripts/test-dodo-trilho.mjs
//    importa este arquivo DE VERDADE (node 24 tira os tipos) e executa a
//    verificação de assinatura com fixtures. Um `@/` aqui mata o guardião.
//  · Nunca lê valor de chave para log. Nunca imprime segredo nem corpo cru.
//  · Toda função recebe `env` opcional (default process.env) para que o
//    guardião prove "sem chave → desligado" contra a VARIÁVEL que decide.
//
// CONTRATO DA API (docs.dodopayments.com, lido 07/09):
//  · base: test https://test.dodopayments.com · live https://live.dodopayments.com
//  · auth: `Authorization: Bearer <api key>`
//  · POST {base}/checkouts → { session_id, checkout_url } (single-use, 24h)
//  · webhooks = Standard Webhooks: headers webhook-id / webhook-timestamp /
//    webhook-signature; string assinada `${id}.${ts}.${rawBody}`, HMAC-SHA256
//    base64; segredo com prefixo `whsec_` que se tira e decodifica em base64;
//    o header pode trazer vários `v1,<b64>` separados por espaço.
import { createHmac, timingSafeEqual } from 'node:crypto'

export type DodoMode = 'test' | 'live'
export type DodoSku = 'starter' | 'creator' | 'studio' | 'first_pack'

type EnvLike = Record<string, string | undefined>

/** Nomes EXATOS das envs que o fundador cola na Vercel. Só nomes, nunca valores. */
export const DODO_ENV_NAMES = [
  'DODO_MODE',
  'DODO_API_KEY',
  'DODO_API_KEY_TEST',
  'DODO_WEBHOOK_SECRET',
  'DODO_PRODUCT_STARTER',
  'DODO_PRODUCT_CREATOR',
  'DODO_PRODUCT_STUDIO',
  'DODO_PRODUCT_FIRST_PACK',
  'DODO_PRODUCT_STARTER_TEST',
  'DODO_PRODUCT_CREATOR_TEST',
  'DODO_PRODUCT_STUDIO_TEST',
  'DODO_PRODUCT_FIRST_PACK_TEST',
] as const

export const DODO_SKUS: readonly DodoSku[] = ['starter', 'creator', 'studio', 'first_pack']

export function isDodoSku(raw: string | null | undefined): raw is DodoSku {
  return raw === 'starter' || raw === 'creator' || raw === 'studio' || raw === 'first_pack'
}

/** `DODO_MODE=live` liga o modo ao vivo; QUALQUER outra coisa (inclusive ausente) é `test`. */
export function dodoMode(env: EnvLike = process.env): DodoMode {
  return env.DODO_MODE === 'live' ? 'live' : 'test'
}

export function dodoApiKeyEnvName(mode: DodoMode): 'DODO_API_KEY' | 'DODO_API_KEY_TEST' {
  return mode === 'live' ? 'DODO_API_KEY' : 'DODO_API_KEY_TEST'
}

/** Chave do modo corrente, ou null. O valor NUNCA sai daqui para log. */
export function dodoApiKey(env: EnvLike = process.env): string | null {
  const raw = env[dodoApiKeyEnvName(dodoMode(env))]
  const key = typeof raw === 'string' ? raw.trim() : ''
  return key.length > 0 ? key : null
}

/** A ÚNICA pergunta que liga o trilho: existe chave para o modo corrente? */
export function isDodoEnabled(env: EnvLike = process.env): boolean {
  return dodoApiKey(env) !== null
}

export function dodoBaseUrl(env: EnvLike = process.env): string {
  return dodoMode(env) === 'live'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com'
}

const PRODUCT_ENV_STEM: Record<DodoSku, string> = {
  starter: 'DODO_PRODUCT_STARTER',
  creator: 'DODO_PRODUCT_CREATOR',
  studio: 'DODO_PRODUCT_STUDIO',
  first_pack: 'DODO_PRODUCT_FIRST_PACK',
}

export function dodoProductEnvName(sku: DodoSku, mode: DodoMode): string {
  return mode === 'live' ? PRODUCT_ENV_STEM[sku] : `${PRODUCT_ENV_STEM[sku]}_TEST`
}

/**
 * Id do produto na Dodo, lido por env conforme o modo. NUNCA hardcoded: os ids
 * de teste do handoff de 07/09 vão mudar quando o KYC liberar a conta ao vivo.
 */
export function dodoProductId(sku: DodoSku, env: EnvLike = process.env): string | null {
  const raw = env[dodoProductEnvName(sku, dodoMode(env))]
  const id = typeof raw === 'string' ? raw.trim() : ''
  return id.length > 0 ? id : null
}

/** Envs que faltam para vender ESTE sku agora. Vazio = pode vender. */
export function dodoMissingEnvFor(sku: DodoSku, env: EnvLike = process.env): string[] {
  const mode = dodoMode(env)
  const missing: string[] = []
  if (!dodoApiKey(env)) missing.push(dodoApiKeyEnvName(mode))
  if (!dodoProductId(sku, env)) missing.push(dodoProductEnvName(sku, mode))
  return missing
}

// ── Método local por país (a fonte ÚNICA dos dois portões) ──────────────────

// ⛔ SÓ ENTRAM PAÍSES ONDE O DODO FAZ ALGO QUE A STRIPE NÃO FAZ:
//   · IN → UPI / RuPay. É o pedido do fundador e a razão do ciclo: cartão
//     indiano em recorrência internacional esbarra no e-mandate do RBI, e UPI
//     pela Stripe não existe para comerciante fora da Índia.
//   · BR → Pix. Métodos confirmados pelo Cowork em 07/09.
// Nigéria, Paquistão, Bangladesh e Quênia ficam FORA de propósito: lá o Dodo
// seria só mais um processador do MESMO cartão — a mesma porta com outra placa.
// Para esses quatro a saída continua sendo a compra ÚNICA de US$ 4,90.
export const METODO_LOCAL_POR_PAIS: Record<string, 'upi' | 'pix'> = {
  IN: 'upi',
  BR: 'pix',
}

/**
 * Os DOIS portões do método local numa função só: (a) a chave do Dodo existe,
 * (b) o país tem método que a Stripe não faz. `null` = a tela não pinta botão.
 *
 * Isto mora aqui, e não dentro de `/api/geo`, porque o painel de trilhos
 * precisa responder a MESMA pergunta. Duas cópias do mapa divergiriam no dia
 * em que um país entrasse — e a tela e o painel passariam a discordar sobre
 * quem vê o botão, sem ninguém notar.
 */
export function localMethodFor(
  country: string | null | undefined,
  env: EnvLike = process.env,
): 'upi' | 'pix' | null {
  if (!isDodoEnabled(env)) return null
  const uf = typeof country === 'string' ? country.toUpperCase() : ''
  return METODO_LOCAL_POR_PAIS[uf] ?? null
}

// ── Checkout ────────────────────────────────────────────────────────────────

export class DodoCheckoutError extends Error {
  readonly code: 'disabled' | 'product_missing' | 'http' | 'bad_response' | 'network'
  readonly status: number
  constructor(code: DodoCheckoutError['code'], status: number, message: string) {
    super(message)
    this.name = 'DodoCheckoutError'
    this.code = code
    this.status = status
  }
}

export type CreateDodoCheckoutInput = {
  sku: DodoSku
  customer: { email: string; name?: string | null }
  returnUrl: string
  cancelUrl: string
  /** Só strings: a Dodo devolve o metadata no webhook exatamente como foi. */
  metadata: Record<string, string>
}

export type DodoCheckoutSession = { sessionId: string; checkoutUrl: string }

/**
 * POST {base}/checkouts. Não restringe `allowed_payment_method_types` DE
 * PROPÓSITO: a Dodo mostra UPI na Índia, Pix no Brasil e cartão em todo lugar
 * conforme o IP do comprador. `billing_currency: 'USD'` mantém o preço da
 * casa; a "moeda adaptativa" da conta converte só na tela da pessoa.
 */
export async function createDodoCheckout(
  input: CreateDodoCheckoutInput,
  env: EnvLike = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<DodoCheckoutSession> {
  const apiKey = dodoApiKey(env)
  if (!apiKey) {
    throw new DodoCheckoutError('disabled', 503, `missing env ${dodoApiKeyEnvName(dodoMode(env))}`)
  }
  const productId = dodoProductId(input.sku, env)
  if (!productId) {
    throw new DodoCheckoutError(
      'product_missing',
      503,
      `missing env ${dodoProductEnvName(input.sku, dodoMode(env))}`,
    )
  }

  const body = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: input.customer.email,
      ...(input.customer.name ? { name: input.customer.name } : {}),
    },
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    billing_currency: 'USD',
    metadata: input.metadata,
  }

  let res: Response
  try {
    res = await fetchImpl(`${dodoBaseUrl(env)}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (err) {
    throw new DodoCheckoutError('network', 502, err instanceof Error ? err.message : 'fetch failed')
  }

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    // O corpo de erro do fornecedor pode ecoar e-mail do cliente; guardamos só
    // o status e um trecho curto, nunca o corpo inteiro.
    const snippet = typeof text === 'string' ? text.slice(0, 200) : ''
    throw new DodoCheckoutError('http', res.status, `dodo /checkouts ${res.status}: ${snippet}`)
  }
  const obj = (json ?? {}) as Record<string, unknown>
  const sessionId = typeof obj.session_id === 'string' ? obj.session_id : ''
  const checkoutUrl = typeof obj.checkout_url === 'string' ? obj.checkout_url : ''
  if (!sessionId || !/^https:\/\//.test(checkoutUrl)) {
    throw new DodoCheckoutError('bad_response', 502, 'dodo /checkouts returned no checkout_url')
  }
  return { sessionId, checkoutUrl }
}

// ── Webhook (Standard Webhooks) ─────────────────────────────────────────────

/** Janela de tolerância do timestamp (segundos). Standard Webhooks sugere 5 min. */
export const DODO_WEBHOOK_TOLERANCE_SEC = 5 * 60

export type HeaderReader = { get(name: string): string | null | undefined } | Record<string, string | undefined>

function readHeader(headers: HeaderReader, name: string): string | null {
  if (typeof (headers as { get?: unknown }).get === 'function') {
    const v = (headers as { get(name: string): string | null | undefined }).get(name)
    return typeof v === 'string' ? v : null
  }
  const rec = headers as Record<string, string | undefined>
  const v = rec[name] ?? rec[name.toLowerCase()]
  return typeof v === 'string' ? v : null
}

/** `whsec_<b64>` → bytes da chave. Sem prefixo, decodifica o valor inteiro. */
export function dodoWebhookKeyBytes(secret: string): Buffer {
  const trimmed = secret.trim()
  const b64 = trimmed.startsWith('whsec_') ? trimmed.slice('whsec_'.length) : trimmed
  return Buffer.from(b64, 'base64')
}

/** Assina como a Dodo assina — exportado para o guardião montar fixtures válidas. */
export function signDodoWebhook(secret: string, id: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', dodoWebhookKeyBytes(secret))
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')
}

/**
 * Verificação PURA: sem rede, sem banco, sem log. Aceita se QUALQUER entrada
 * `v1,<b64>` do header bater com o HMAC do corpo cru. Comparação em tempo
 * constante com buffers de tamanho igual — tamanho diferente reprova antes.
 */
export function verifyDodoWebhook(
  rawBody: string,
  headers: HeaderReader,
  secret: string | null | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (typeof rawBody !== 'string') return false
  if (!secret || !secret.trim()) return false
  const id = readHeader(headers, 'webhook-id')
  const ts = readHeader(headers, 'webhook-timestamp')
  const sigHeader = readHeader(headers, 'webhook-signature')
  if (!id || !ts || !sigHeader) return false
  if (!/^\d{1,12}$/.test(ts)) return false
  const tsNum = Number(ts)
  if (Math.abs(nowSec - tsNum) > DODO_WEBHOOK_TOLERANCE_SEC) return false

  const keyBytes = dodoWebhookKeyBytes(secret)
  if (keyBytes.length === 0) return false

  const expected = createHmac('sha256', keyBytes).update(`${id}.${ts}.${rawBody}`).digest()

  const entries = sigHeader.split(' ').map((s) => s.trim()).filter(Boolean)
  let matched = false
  for (const entry of entries) {
    const comma = entry.indexOf(',')
    if (comma < 0) continue
    const version = entry.slice(0, comma)
    const sigB64 = entry.slice(comma + 1)
    if (version !== 'v1') continue
    let candidate: Buffer
    try {
      candidate = Buffer.from(sigB64, 'base64')
    } catch {
      continue
    }
    if (candidate.length !== expected.length) continue
    if (timingSafeEqual(candidate, expected)) matched = true
  }
  return matched
}

// ── Envelope do webhook ─────────────────────────────────────────────────────

export type DodoWebhookEnvelope = {
  business_id?: string
  type: string
  timestamp?: string
  data: Record<string, unknown> & { payload_type?: string; metadata?: Record<string, unknown> }
}

/** Parse defensivo do envelope. null = não é um envelope da Dodo. */
export function parseDodoEnvelope(rawBody: string): DodoWebhookEnvelope | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  if (typeof obj.type !== 'string' || !obj.type) return null
  const data = obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
    ? (obj.data as DodoWebhookEnvelope['data'])
    : ({} as DodoWebhookEnvelope['data'])
  return {
    business_id: typeof obj.business_id === 'string' ? obj.business_id : undefined,
    type: obj.type,
    timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : undefined,
    data,
  }
}

/** Metadata que NÓS mandamos no checkout, de volta como strings. */
export function dodoMetadataString(data: DodoWebhookEnvelope['data'], key: string): string | null {
  const md = data.metadata
  if (!md || typeof md !== 'object') return null
  const v = (md as Record<string, unknown>)[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}
