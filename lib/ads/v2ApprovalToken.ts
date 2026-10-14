// KINEO-ADS-POS-ENTREGA-1510 — o TOKEN do link de aprovação do cliente da agência (lib/ads/v2PostDelivery.ts tem o porquê).
// Forma: 'a1.<nonce>.<assinatura>' — nonce de 24 bytes aleatórios (base64url) e HMAC-SHA256 com chave DERIVADA da chave de serviço
// (a prática de lib/ads/teamInvite.ts). O link NÃO carrega id de conta, de pedido nem de vídeo: o banco guarda só o sha256 do
// token (ads_v2_approvals.token_hash, único) e é esse hash que aponta UMA aprovação → UM pedido → UM vídeo (o escopo).
// Adivinhar = acertar 192 bits de nonce E a assinatura; assinatura errada é recusada antes de qualquer leitura do banco.
// Só servidor (node:crypto).
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const ADS_V2_APPROVAL_TOKEN_VERSION = 'a1'
const NONCE_BYTES = 24
const TOKEN_RE = /^a1\.[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/

function approvalKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('kineo-ads-approval:v1').digest()
}

function sign(nonce: string, secret: string): string {
  return createHmac('sha256', approvalKey(secret)).update(`${ADS_V2_APPROVAL_TOKEN_VERSION}.${nonce}`).digest('base64url')
}

/** Token novo + o hash que o banco guarda (o token em si nunca é gravado). */
export function mintApprovalToken(secret: string, random: (n: number) => Buffer = randomBytes): { token: string; hash: string } {
  if (!secret) throw new Error('approval_token_no_secret')
  const nonce = random(NONCE_BYTES).toString('base64url')
  const token = `${ADS_V2_APPROVAL_TOKEN_VERSION}.${nonce}.${sign(nonce, secret)}`
  return { token, hash: approvalTokenHash(token) }
}

export type ApprovalTokenCheck = { ok: true; hash: string } | { ok: false; reason: 'malformed' | 'bad_signature' }

/** Confere forma e assinatura (tempo constante). ok = o hash para buscar a aprovação. */
export function verifyApprovalToken(token: unknown, secret: string): ApprovalTokenCheck {
  if (typeof token !== 'string' || !secret || !TOKEN_RE.test(token)) return { ok: false, reason: 'malformed' }
  const [, nonce, signature] = token.split('.')
  const expected = Buffer.from(sign(nonce, secret), 'base64url')
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }
  return { ok: true, hash: approvalTokenHash(token) }
}

/** O que o banco guarda do token. */
export function approvalTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
