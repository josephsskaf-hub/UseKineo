// KINEO-EQUIPE-BUSINESS-2026-10-10 — o TOKEN do link do convite da equipe Business (lib/ads/team.ts tem o porquê).
// Assinado (HMAC com chave derivada da chave de serviço, a prática de lib/auth/guestAccess.ts), preso ao convite E ao dono que
// convidou, com validade. O uso único vem do banco: o aceite (/api/ads/team, action 'accept') é um UPDATE condicional
// pending → active que exige o MESMO hash e o apaga. Só servidor (node:crypto).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const TEAM_TOKEN_VERSION = 't1'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function teamKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('kineo-ads-team-invite:v1').digest()
}

/** Token do link: versão.convite.dono.validade.assinatura — preso ao convite E ao dono que convidou. */
export function signTeamInviteToken(input: { inviteId: string; ownerId: string; expiresAtSeconds: number; secret: string }): string {
  if (!UUID_RE.test(input.inviteId) || !UUID_RE.test(input.ownerId) || !input.secret) throw new Error('team_token_bad_input')
  const payload = `${TEAM_TOKEN_VERSION}.${input.inviteId.toLowerCase()}.${input.ownerId.toLowerCase()}.${Math.floor(input.expiresAtSeconds)}`
  const signature = createHmac('sha256', teamKey(input.secret)).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export type TeamInviteTokenCheck =
  | { ok: true; inviteId: string; ownerId: string; expiresAtSeconds: number }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

export function verifyTeamInviteToken(token: unknown, input: { secret: string; nowSeconds: number }): TeamInviteTokenCheck {
  const parts = typeof token === 'string' ? token.trim().split('.') : []
  if (parts.length !== 5 || parts[0] !== TEAM_TOKEN_VERSION || !input.secret) return { ok: false, reason: 'malformed' }
  const [version, inviteId, ownerId, expRaw, signature] = parts
  const expiresAtSeconds = Number(expRaw)
  if (!UUID_RE.test(inviteId) || !UUID_RE.test(ownerId) || !/^\d{9,11}$/.test(expRaw) || !Number.isSafeInteger(expiresAtSeconds)) return { ok: false, reason: 'malformed' }
  const expected = createHmac('sha256', teamKey(input.secret)).update(`${version}.${inviteId}.${ownerId}.${expRaw}`).digest()
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }
  if (expiresAtSeconds <= input.nowSeconds) return { ok: false, reason: 'expired' }
  return { ok: true, inviteId, ownerId, expiresAtSeconds }
}

/** O que o banco guarda do token (nunca o token). */
export function teamTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
