// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — a porta das contas nascidas de compra sem login (só servidor) ═════════════
// Duas peças que as rotas de entrada (/auth/callback, /auth/guest-link, /api/auth/guest-sessions) e o webhook dividem:
//
//   1. TOMADA DE CONTA. O login de uso único entra sem provar o e-mail: quem pagou pode ter digitado o e-mail de outra
//      pessoa que ainda não tinha conta. Quando alguém entrar nessa conta por um meio que PROVA a caixa (Google/OAuth,
//      link enviado por e-mail, recuperação de senha — lido no claim amr do JWT; senha não prova), as OUTRAS sessões
//      caem e a senha vira uma aleatória forte que ninguém conhece (a que a sessão sem prova possa ter posto direto na
//      API do Auth deixa de valer) — uma única vez por conta — e o fato vira guest_sessions_revoked
//      (password_scrambled). A decisão é pura (guestSessionRevocation em lib/growth/guestCheckout.ts); aqui só o I/O.
//      NUNCA LANÇA: entrar na conta nunca pode quebrar por esta trava. Depois disso o login de uso único não abre mais
//      (decideGuestAccess, owner.emailProven).
//   2. LINK DO E-MAIL "SUA CONTA ESTÁ PRONTA". Não é o token do Auth (cada generateLink invalida o anterior, e o login de
//      uso único gera um logo depois do webhook): é um token NOSSO, assinado (HMAC com a chave de serviço, mesma
//      prática de lib/animate/claim.ts), com dono, sessão Stripe e validade. Na hora do clique, /auth/guest-link troca
//      por uma sessão de verdade, uma vez.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  GUEST_CHECKOUT_EVENTS,
  GUEST_CHECKOUT_VERSION,
  GUEST_PASSWORD_SCRAMBLED_AT_KEY,
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

// ─── A derrubada das outras sessões (e da senha) ────────────────────────────────────────────────────────────────────
export interface GuestGuardAdmin {
  /** Grava chaves em app_metadata (só o admin escreve; o usuário não forja). */
  updateAppMetadata(userId: string, appMetadata: Record<string, unknown>): Promise<{ error: string | null }>
  /** Linha com id determinístico; 'duplicate' = já existia. */
  insertEventOnce(row: { id: string; name: string; user_id: string; path: string; metadata: Record<string, unknown> }): Promise<'inserted' | 'duplicate' | 'failed'>
  /**
   * Troca a senha pelo admin. No Auth (supabase/auth, internal/api/admin.go → UpdatePassword(tx, nil)) isso encerra
   * TODAS as sessões da conta — inclusive a que acabou de provar o e-mail — e apaga os tokens de uso único pendentes.
   */
  setPassword(userId: string, password: string): Promise<{ error: string | null }>
  /** Token de uso único (magic link) gerado pelo admin — nunca sai do servidor; serve para religar a sessão da dona. */
  signInTokenFor(email: string): Promise<{ tokenHash: string | null; error: string | null }>
}

/** Código curto do erro (nunca a mensagem inteira; nada que ecoe dados). */
function errorCode(error: unknown): string {
  const e = error as { code?: unknown; name?: unknown; status?: unknown } | null
  if (typeof e?.code === 'string' && e.code) return e.code.slice(0, 64)
  if (typeof e?.status === 'number') return `http_${e.status}`
  if (typeof e?.name === 'string' && e.name) return e.name.slice(0, 64)
  return typeof error === 'string' ? error.slice(0, 64) : 'error'
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
    async setPassword(userId, password) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      return { error: error ? errorCode(error) : null }
    },
    async signInTokenFor(email) {
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      const tokenHash = (data?.properties as { hashed_token?: string } | undefined)?.hashed_token ?? null
      return { tokenHash: error ? null : tokenHash, error: error ? errorCode(error) : tokenHash ? null : 'token_missing' }
    },
  }
}

/** Senha que ninguém conhece: 256 bits aleatórios + as quatro classes que qualquer política de senha do Auth pede. */
export function strongRandomPassword(): string {
  return `${randomBytes(32).toString('base64url')}aZ7!`
}

/**
 * Como a senha vira aleatória:
 *   · 'admin_then_reenter' (padrão; /auth/guest-link e /auth/callback, onde a sessão nova mora nos cookies desta
 *     resposta): troca pelo admin — que derruba TODAS as sessões — e religa a da dona na mesma requisição (token de uso
 *     único do admin trocado aqui pelo cliente SSR);
 *   · 'own_session' (/api/auth/guest-sessions, recuperação de senha, sessão que mora no navegador): troca pela PRÓPRIA
 *     sessão de recuperação (o Auth faz LogoutAllExceptMe e uma sessão de recuperação nunca precisa da senha atual) —
 *     pelo admin ela morreria no meio da troca de senha que a pessoa está fazendo.
 */
export type GuestPasswordStrategy = 'admin_then_reenter' | 'own_session'

/**
 * Chame logo depois de uma entrada que PROVA o e-mail (a sessão nova já está no cliente SSR). Conta que não nasceu de
 * compra sem login, conta já tratada, a própria sessão do login de uso único, ou sessão cujo método (amr) não prova a
 * caixa (senha): nada acontece. Senão, uma vez por conta: signOut das OUTRAS sessões com a sessão nova, a senha vira
 * uma aleatória forte (a que a sessão sem prova possa ter posto deixa de valer), carimbo em app_metadata e o evento
 * guest_sessions_revoked (password_scrambled). Se a troca da senha falhar, a derrubada segue e o motivo vai no evento.
 * Se o signOut falhar, nada é carimbado: a próxima entrada com prova tenta de novo.
 */
export async function revokeGuestSessionsOnce(input: {
  supabase: {
    auth: {
      signOut(options: { scope: 'others' }): Promise<{ error: unknown }>
      verifyOtp(params: { token_hash: string; type: 'magiclink' }): Promise<{ data: { session: unknown } | null; error: unknown }>
      updateUser(attributes: { password: string }): Promise<{ error: unknown }>
    }
  }
  user: { id: string; email?: string | null; app_metadata?: unknown } | null | undefined
  session: { access_token?: string | null } | null | undefined
  method: string
  path: string
  /** Métodos (amr) que valem como prova nesta porta; padrão GUEST_EMAIL_PROVING_AMR. */
  acceptedMethods?: readonly string[]
  passwordStrategy?: GuestPasswordStrategy
  admin?: GuestGuardAdmin | null
  now?: () => Date
}): Promise<{ revoked: boolean; decision: GuestSessionRevocationDecision | 'error'; passwordScrambled: boolean }> {
  try {
    const user = input.user
    if (!user?.id) return { revoked: false, decision: 'no_session', passwordScrambled: false }
    const appMetadata = user.app_metadata && typeof user.app_metadata === 'object'
      ? user.app_metadata as Record<string, unknown>
      : {}
    const decision = guestSessionRevocation({
      appMetadata,
      currentSessionId: sessionIdFromAccessToken(input.session?.access_token),
      authMethods: amrMethodsFromAccessToken(input.session?.access_token),
      acceptedMethods: input.acceptedMethods,
    })
    if (decision !== 'revoke') return { revoked: false, decision, passwordScrambled: false }

    const { error: signOutError } = await input.supabase.auth.signOut({ scope: 'others' })
    if (signOutError) {
      console.error('[guest-access] other sessions NOT revoked; will retry on the next proven sign-in:', user.id.slice(0, 8))
      return { revoked: false, decision: 'error', passwordScrambled: false }
    }
    const admin = input.admin === undefined ? guestGuardAdminFromEnv() : input.admin
    const scramble = await scramblePassword({
      supabase: input.supabase,
      admin,
      userId: user.id,
      email: typeof user.email === 'string' ? user.email : null,
      strategy: input.passwordStrategy ?? 'admin_then_reenter',
    })
    if (!scramble.password_scrambled) console.error('[guest-access] sessions revoked but password NOT scrambled:', user.id.slice(0, 8), scramble.password_scramble_error)
    const at = (input.now ?? (() => new Date()))().toISOString()
    if (admin) {
      const marked = await admin.updateAppMetadata(user.id, {
        ...appMetadata,
        [GUEST_SESSIONS_REVOKED_AT_KEY]: at,
        [GUEST_SESSIONS_REVOKED_VIA_KEY]: input.method,
        ...(scramble.password_scrambled ? { [GUEST_PASSWORD_SCRAMBLED_AT_KEY]: at } : {}),
      })
      if (marked.error) console.error('[guest-access] sessions revoked but not stamped (the next proven sign-in repeats it):', user.id.slice(0, 8), marked.error)
      await admin.insertEventOnce({
        id: deterministicUuid(GUEST_CHECKOUT_EVENTS.sessionsRevoked, user.id),
        name: GUEST_CHECKOUT_EVENTS.sessionsRevoked,
        user_id: user.id,
        path: input.path,
        metadata: { version: GUEST_CHECKOUT_VERSION, method: input.method, at, ...scramble },
      })
    } else {
      console.error('[guest-access] sessions revoked without admin stamp (service role missing):', user.id.slice(0, 8))
    }
    return { revoked: true, decision, passwordScrambled: scramble.password_scrambled }
  } catch (error) {
    console.error('[guest-access] session guard threw (sign-in continues):', error instanceof Error ? error.message : String(error))
    return { revoked: false, decision: 'error', passwordScrambled: false }
  }
}

/** Troca a senha por uma aleatória (nunca guardada, nunca registrada). Não lança: o desfecho vai para o evento. */
async function scramblePassword(input: {
  supabase: Parameters<typeof revokeGuestSessionsOnce>[0]['supabase']
  admin: GuestGuardAdmin | null
  userId: string
  email: string | null
  strategy: GuestPasswordStrategy
}): Promise<{ password_scrambled: boolean; password_scramble_error?: string; session_reentered?: boolean }> {
  try {
    if (input.strategy === 'own_session') {
      const { error } = await input.supabase.auth.updateUser({ password: strongRandomPassword() })
      return error ? { password_scrambled: false, password_scramble_error: errorCode(error) } : { password_scrambled: true }
    }
    if (!input.admin) return { password_scrambled: false, password_scramble_error: 'service_role_missing' }
    const changed = await input.admin.setPassword(input.userId, strongRandomPassword())
    if (changed.error) return { password_scrambled: false, password_scramble_error: changed.error }
    // A troca pelo admin encerrou TODAS as sessões, inclusive a que acabou de provar o e-mail: religa só ela.
    let reentered = false
    if (input.email) {
      const link = await input.admin.signInTokenFor(input.email)
      if (link.tokenHash) {
        const { data, error } = await input.supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: 'magiclink' })
        reentered = !error && Boolean(data?.session)
      }
    }
    if (!reentered) console.error('[guest-access] password scrambled but the proven session could not be re-entered:', input.userId.slice(0, 8))
    return { password_scrambled: true, session_reentered: reentered }
  } catch (error) {
    return { password_scrambled: false, password_scramble_error: errorCode(error) }
  }
}
