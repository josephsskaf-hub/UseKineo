// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — a porta das contas nascidas de compra sem login (só servidor) ═════════════
// Duas peças que as rotas de entrada (/auth/callback, /auth/guest-link, /api/auth/guest-sessions) e o webhook dividem:
//
//   1. TOMADA DE CONTA. O login de uso único entra sem provar o e-mail: quem pagou pode ter digitado o e-mail de outra
//      pessoa que ainda não tinha conta. Quando alguém entrar nessa conta por um meio que PROVA a caixa (Google/OAuth,
//      link enviado por e-mail, recuperação de senha — lido no claim amr do JWT; senha não prova), as OUTRAS sessões
//      caem — uma única vez por conta — e o fato vira guest_sessions_revoked. A decisão é pura (guestSessionRevocation
//      em lib/growth/guestCheckout.ts); aqui só o I/O. NUNCA LANÇA: entrar na conta nunca pode quebrar por esta trava.
//      Depois disso o login de uso único não abre mais (decideGuestAccess, owner.emailProven).
//   2. LINK DO E-MAIL "SUA CONTA ESTÁ PRONTA". Não é o token do Auth (cada generateLink invalida o anterior, e o login de
//      uso único gera um logo depois do webhook): é um token NOSSO, assinado (HMAC com a chave de serviço, mesma
//      prática de lib/animate/claim.ts), com dono, sessão Stripe e validade. Na hora do clique, /auth/guest-link troca
//      por uma sessão de verdade, uma vez.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  GUEST_CHECKOUT_EVENTS,
  GUEST_CHECKOUT_VERSION,
  GUEST_SESSIONS_REVOKED_AT_KEY,
  GUEST_SESSIONS_REVOKED_VIA_KEY,
  guestSessionRevocation,
  isGuestStripeSessionId,
  type GuestSessionRevocationDecision,
} from '@/lib/growth/guestCheckout'

// ─── Sessão do Auth ──────────────────────────────────────────────────────────────────────────────────────────────────
// O token só é lido DEPOIS de o Auth tê-lo emitido/validado na mesma requisição (verifyOtp, exchangeCodeForSession,
// getUser): aqui não se valida assinatura, só se leem as claims de um token que já veio do Auth.
function accessTokenClaims(accessToken: string | null | undefined): Record<string, unknown> | null {
  const parts = typeof accessToken === 'string' ? accessToken.split('.') : []
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as unknown
    return payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
  } catch {
    return null
  }
}

/** session_id do JWT de acesso (claim que o Auth põe em todo token). Sem ele = null (nada é decidido às cegas). */
export function sessionIdFromAccessToken(accessToken: string | null | undefined): string | null {
  const sessionId = accessTokenClaims(accessToken)?.session_id
  return typeof sessionId === 'string' && /^[0-9a-f-]{8,64}$/i.test(sessionId) ? sessionId : null
}

/** Métodos de entrada da sessão (claim amr: [{ method, timestamp }] no Supabase; aceita também a forma RFC 8176). */
export function amrMethodsFromAccessToken(accessToken: string | null | undefined): string[] {
  const amr = accessTokenClaims(accessToken)?.amr
  if (!Array.isArray(amr)) return []
  return amr
    .map((entry) => (typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? (entry as { method?: unknown }).method : null))
    .filter((method): method is string => typeof method === 'string' && method.length > 0 && method.length <= 32)
}

function deterministicUuid(name: string, key: string): string {
  const hex = createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ─── Link do e-mail "sua conta está pronta" ─────────────────────────────────────────────────────────────────────────
const READY_TOKEN_VERSION = 'g1'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readyKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('kineo-guest-ready-link:v1').digest()
}

export function signGuestReadyToken(input: { userId: string; stripeSessionId: string; expiresAtSeconds: number; secret: string }): string {
  const payload = `${READY_TOKEN_VERSION}.${input.userId}.${input.stripeSessionId}.${Math.floor(input.expiresAtSeconds)}`
  const signature = createHmac('sha256', readyKey(input.secret)).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export type GuestReadyTokenCheck =
  | { ok: true; userId: string; stripeSessionId: string; expiresAtSeconds: number }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

export function verifyGuestReadyToken(token: string | null | undefined, input: { secret: string; nowSeconds: number }): GuestReadyTokenCheck {
  const parts = typeof token === 'string' ? token.trim().split('.') : []
  if (parts.length !== 5 || parts[0] !== READY_TOKEN_VERSION) return { ok: false, reason: 'malformed' }
  const [version, userId, stripeSessionId, expRaw, signature] = parts
  const expiresAtSeconds = Number(expRaw)
  if (!UUID_PATTERN.test(userId) || !isGuestStripeSessionId(stripeSessionId) || !/^\d{9,11}$/.test(expRaw) || !Number.isSafeInteger(expiresAtSeconds)) {
    return { ok: false, reason: 'malformed' }
  }
  const expected = createHmac('sha256', readyKey(input.secret)).update(`${version}.${userId}.${stripeSessionId}.${expRaw}`).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64url')
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }
  if (expiresAtSeconds <= input.nowSeconds) return { ok: false, reason: 'expired' }
  return { ok: true, userId, stripeSessionId, expiresAtSeconds }
}

// ─── A derrubada das outras sessões ─────────────────────────────────────────────────────────────────────────────────
export interface GuestGuardAdmin {
  /** Grava chaves em app_metadata (só o admin escreve; o usuário não forja). */
  updateAppMetadata(userId: string, appMetadata: Record<string, unknown>): Promise<{ error: string | null }>
  /** Linha com id determinístico; 'duplicate' = já existia. */
  insertEventOnce(row: { id: string; name: string; user_id: string; path: string; metadata: Record<string, unknown> }): Promise<'inserted' | 'duplicate' | 'failed'>
}

export function guestGuardAdminFromEnv(): GuestGuardAdmin | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return {
    async updateAppMetadata(userId, appMetadata) {
      const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: appMetadata })
      return { error: error ? error.message : null }
    },
    async insertEventOnce(row) {
      const { error } = await admin.from('events').insert(row)
      if (!error) return 'inserted'
      return error.code === '23505' ? 'duplicate' : 'failed'
    },
  }
}

/**
 * Chame logo depois de uma entrada que PROVA o e-mail (a sessão nova já está no cliente SSR). Conta que não nasceu de
 * compra sem login, conta já tratada, a própria sessão do login de uso único, ou sessão cujo método (amr) não prova a
 * caixa (senha): nada acontece. Senão: signOut das OUTRAS sessões com a sessão nova, carimbo em app_metadata (uma vez
 * por conta) e o evento guest_sessions_revoked. Se o signOut falhar, nada é carimbado: a próxima entrada com prova
 * tenta de novo.
 */
export async function revokeGuestSessionsOnce(input: {
  supabase: { auth: { signOut(options: { scope: 'others' }): Promise<{ error: unknown }> } }
  user: { id: string; app_metadata?: unknown } | null | undefined
  session: { access_token?: string | null } | null | undefined
  method: string
  path: string
  /** Métodos (amr) que valem como prova nesta porta; padrão GUEST_EMAIL_PROVING_AMR. */
  acceptedMethods?: readonly string[]
  admin?: GuestGuardAdmin | null
  now?: () => Date
}): Promise<{ revoked: boolean; decision: GuestSessionRevocationDecision | 'error' }> {
  try {
    const user = input.user
    if (!user?.id) return { revoked: false, decision: 'no_session' }
    const appMetadata = user.app_metadata && typeof user.app_metadata === 'object'
      ? user.app_metadata as Record<string, unknown>
      : {}
    const decision = guestSessionRevocation({
      appMetadata,
      currentSessionId: sessionIdFromAccessToken(input.session?.access_token),
      authMethods: amrMethodsFromAccessToken(input.session?.access_token),
      acceptedMethods: input.acceptedMethods,
    })
    if (decision !== 'revoke') return { revoked: false, decision }

    const { error: signOutError } = await input.supabase.auth.signOut({ scope: 'others' })
    if (signOutError) {
      console.error('[guest-access] other sessions NOT revoked; will retry on the next proven sign-in:', user.id.slice(0, 8))
      return { revoked: false, decision: 'error' }
    }
    const admin = input.admin === undefined ? guestGuardAdminFromEnv() : input.admin
    const at = (input.now ?? (() => new Date()))().toISOString()
    if (admin) {
      const marked = await admin.updateAppMetadata(user.id, {
        ...appMetadata,
        [GUEST_SESSIONS_REVOKED_AT_KEY]: at,
        [GUEST_SESSIONS_REVOKED_VIA_KEY]: input.method,
      })
      if (marked.error) console.error('[guest-access] sessions revoked but not stamped (the next proven sign-in repeats it):', user.id.slice(0, 8), marked.error)
      await admin.insertEventOnce({
        id: deterministicUuid(GUEST_CHECKOUT_EVENTS.sessionsRevoked, user.id),
        name: GUEST_CHECKOUT_EVENTS.sessionsRevoked,
        user_id: user.id,
        path: input.path,
        metadata: { version: GUEST_CHECKOUT_VERSION, method: input.method, at },
      })
    } else {
      console.error('[guest-access] sessions revoked without admin stamp (service role missing):', user.id.slice(0, 8))
    }
    return { revoked: true, decision }
  } catch (error) {
    console.error('[guest-access] session guard threw (sign-in continues):', error instanceof Error ? error.message : String(error))
    return { revoked: false, decision: 'error' }
  }
}
