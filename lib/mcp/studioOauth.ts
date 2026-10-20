// ═══ KINEO-MCP-STUDIO-2010 — OAuth 2.1 do conector "Kineo Studio", a parte PURA ════════════════════════════════
//
// A spec de autorização do MCP (modelcontextprotocol.io/specification/2025-06-18/basic/authorization, lida em 20/10)
// e a página "Authentication for connectors" do Claude (claude.com/docs/connectors/building/authentication) pedem:
//   · 401 com `WWW-Authenticate: Bearer resource_metadata="…"` para começar o login (o Claude ignora o cabeçalho num 200);
//   · Protected Resource Metadata (RFC 9728) com `resource` IGUAL à URL colada no Claude e `authorization_servers`;
//   · Authorization Server Metadata (RFC 8414) com registration_endpoint (DCR, RFC 7591 — o Claude registra um cliente
//     público por conexão), `code_challenge_methods_supported: ["S256"]` (PKCE obrigatório) e token_endpoint_auth_methods
//     com "none";
//   · `resource` (RFC 8707) no authorize e no token, e o servidor só aceita token emitido para ele mesmo;
//   · redirect da hospedagem do Claude = https://claude.ai/api/mcp/auth_callback; Claude Code = loopback
//     (http://localhost:<porta>/callback e http://127.0.0.1:<porta>/callback) com a PORTA ignorada na comparação;
//   · token endpoint em application/x-www-form-urlencoded; refresh token ROTACIONADO (cliente público); erro
//     `invalid_grant` quando o refresh morreu; respostas em < 10 s.
//
// Aqui: metadados, validações, PKCE, tokens opacos e seus hashes. Nada de banco (lib/mcp/studioOauthStore.ts) nem
// de HTTP (app/api/mcp/studio/oauth/*). O guardião EXECUTA este arquivo.
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import {
  STUDIO_AS_METADATA_PATH,
  STUDIO_MCP_PATH,
  STUDIO_OAUTH_BASE_PATH,
  STUDIO_SCOPE,
  STUDIO_SCOPES_SUPPORTED,
} from '@/lib/mcp/studioLaunch'

// ─── Prazos ──────────────────────────────────────────────────────────────────
export const CODE_TTL_MS = 10 * 60 * 1000
export const ACCESS_TOKEN_TTL_S = 60 * 60
export const REFRESH_TOKEN_TTL_S = 30 * 24 * 60 * 60
/** Teto de registros DCR por hora (o Claude registra 1 cliente por conexão; acima disto é robô). */
export const DCR_PER_HOUR_CAP = 300

// ─── Metadados ───────────────────────────────────────────────────────────────
/** RFC 8414. `issuer` sem caminho → o documento mora em /.well-known/oauth-authorization-server. */
export function authorizationServerMetadata(origin: string): Record<string, unknown> {
  const base = `${origin}${STUDIO_OAUTH_BASE_PATH}`
  return {
    issuer: origin,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    revocation_endpoint: `${base}/revoke`,
    scopes_supported: [...STUDIO_SCOPES_SUPPORTED],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    service_documentation: `${origin}/claude-connector`,
  }
}

/** RFC 9728. `resource` = a URL exata do servidor MCP (a que a pessoa cola no Claude). */
export function protectedResourceMetadata(origin: string): Record<string, unknown> {
  return {
    resource: `${origin}${STUDIO_MCP_PATH}`,
    authorization_servers: [origin],
    scopes_supported: [...STUDIO_SCOPES_SUPPORTED],
    bearer_methods_supported: ['header'],
    resource_name: 'Kineo Studio',
    resource_documentation: `${origin}/claude-connector`,
  }
}

/** O cabeçalho do 401 que dispara o login no Claude (resource_metadata + o escopo que queremos). */
export function wwwAuthenticateHeader(origin: string, error?: 'invalid_token' | 'insufficient_scope'): string {
  const parts = [
    'Bearer realm="Kineo Studio"',
    `resource_metadata="${origin}/.well-known/oauth-protected-resource${STUDIO_MCP_PATH}"`,
    `scope="${STUDIO_SCOPE}"`,
  ]
  if (error) parts.push(`error="${error}"`)
  return parts.join(', ')
}

export { STUDIO_AS_METADATA_PATH }

// ─── Redirect URIs ───────────────────────────────────────────────────────────
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isLoopbackRedirect(uri: string): boolean {
  try {
    const u = new URL(uri)
    return u.protocol === 'http:' && LOOPBACK_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

/** Redirect aceitável no registro: https absoluto (sem fragmento) ou loopback http. */
export function redirectUriRegistrable(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 2048) return false
  try {
    const u = new URL(uri)
    if (u.hash) return false
    if (u.protocol === 'https:') return u.hostname.length > 0
    return isLoopbackRedirect(uri)
  } catch {
    return false
  }
}

/** Comparação exata — exceto loopback, onde a PORTA é ignorada (RFC 8252 §7.3; o Claude Code usa porta efêmera). */
export function redirectUriMatches(registered: string, candidate: string): boolean {
  if (registered === candidate) return true
  if (!isLoopbackRedirect(registered) || !isLoopbackRedirect(candidate)) return false
  try {
    const a = new URL(registered)
    const b = new URL(candidate)
    return a.hostname === b.hostname && a.pathname === b.pathname && a.search === b.search
  } catch {
    return false
  }
}

export function redirectUriAllowed(registered: readonly string[], candidate: string): boolean {
  return registered.some((r) => redirectUriMatches(r, candidate))
}

// ─── Registro dinâmico (RFC 7591) ────────────────────────────────────────────
export type RegisteredClientInput = {
  client_name: string | null
  redirect_uris: string[]
  token_endpoint_auth_method: 'none' | 'client_secret_post'
  grant_types: string[]
  response_types: string[]
  scope: string
  client_uri: string | null
}
export type RegistrationValidation =
  | { ok: true; value: RegisteredClientInput }
  | { ok: false; error: 'invalid_client_metadata' | 'invalid_redirect_uri'; description: string }

export function validateRegistration(body: unknown): RegistrationValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'invalid_client_metadata', description: 'Body must be a JSON object.' }
  }
  const b = body as Record<string, unknown>
  const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris : []
  if (uris.length === 0 || uris.length > 10) {
    return { ok: false, error: 'invalid_redirect_uri', description: 'redirect_uris must list 1 to 10 URIs.' }
  }
  for (const u of uris) {
    if (!redirectUriRegistrable(u)) {
      return { ok: false, error: 'invalid_redirect_uri', description: `redirect_uri must be https or a loopback http URL without fragment: ${String(u).slice(0, 80)}` }
    }
  }
  const method = b.token_endpoint_auth_method
  if (method !== undefined && method !== 'none' && method !== 'client_secret_post') {
    return { ok: false, error: 'invalid_client_metadata', description: 'token_endpoint_auth_method must be none or client_secret_post.' }
  }
  const grants = Array.isArray(b.grant_types) && b.grant_types.length ? b.grant_types.filter((g): g is string => typeof g === 'string') : ['authorization_code', 'refresh_token']
  if (!grants.includes('authorization_code') || grants.some((g) => g !== 'authorization_code' && g !== 'refresh_token')) {
    return { ok: false, error: 'invalid_client_metadata', description: 'grant_types supported: authorization_code, refresh_token.' }
  }
  const responses = Array.isArray(b.response_types) && b.response_types.length ? b.response_types.filter((r): r is string => typeof r === 'string') : ['code']
  if (responses.some((r) => r !== 'code')) {
    return { ok: false, error: 'invalid_client_metadata', description: 'response_types supported: code.' }
  }
  const name = typeof b.client_name === 'string' ? b.client_name.trim().slice(0, 120) : ''
  const clientUri = typeof b.client_uri === 'string' && /^https:\/\//.test(b.client_uri) ? b.client_uri.slice(0, 300) : null
  return {
    ok: true,
    value: {
      client_name: name || null,
      redirect_uris: uris as string[],
      token_endpoint_auth_method: method === 'client_secret_post' ? 'client_secret_post' : 'none',
      grant_types: grants.includes('refresh_token') ? ['authorization_code', 'refresh_token'] : ['authorization_code'],
      response_types: ['code'],
      scope: STUDIO_SCOPE,
      client_uri: clientUri,
    },
  }
}

// ─── Pedido de autorização ───────────────────────────────────────────────────
export type AuthorizeParams = {
  client_id: string
  redirect_uri: string
  state: string | null
  code_challenge: string
  scope: string
  resource: string | null
}
export type AuthorizeValidation =
  | { ok: true; value: AuthorizeParams }
  /** Erro ANTES de confiar no redirect_uri: mostrar na tela, nunca redirecionar. */
  | { ok: false; redirect: false; error: string; description: string }
  /** redirect_uri já validado: devolver o erro pelo redirect (RFC 6749 §4.1.2.1). */
  | { ok: false; redirect: true; redirectUri: string; state: string | null; error: string; description: string }

export type StoredClient = { client_id: string; redirect_uris: string[] }

/** `resource` (RFC 8707): o cliente MANDA; se mandar, tem de ser este servidor (sem barra final, host sem caixa). */
export function resourceMatches(resource: string, mcpUrl: string): boolean {
  try {
    const a = new URL(resource)
    const b = new URL(mcpUrl)
    if (a.hash) return false
    return a.protocol === b.protocol && a.host.toLowerCase() === b.host.toLowerCase() && a.pathname.replace(/\/$/, '') === b.pathname.replace(/\/$/, '') && a.search === ''
  } catch {
    return false
  }
}

export function validateAuthorizeParams(raw: URLSearchParams, client: StoredClient | null, mcpUrl: string): AuthorizeValidation {
  const clientId = (raw.get('client_id') ?? '').trim()
  if (!clientId || !client || client.client_id !== clientId) {
    return { ok: false, redirect: false, error: 'invalid_client', description: 'Unknown client_id. Add the connector again in Claude so it registers.' }
  }
  const redirectUri = (raw.get('redirect_uri') ?? '').trim()
  if (!redirectUri || !redirectUriAllowed(client.redirect_uris, redirectUri)) {
    return { ok: false, redirect: false, error: 'invalid_request', description: 'redirect_uri is not registered for this client.' }
  }
  const state = raw.get('state')
  const fail = (error: string, description: string): AuthorizeValidation => ({ ok: false, redirect: true, redirectUri, state, error, description })
  if (raw.get('response_type') !== 'code') return fail('unsupported_response_type', 'response_type must be code.')
  const challenge = (raw.get('code_challenge') ?? '').trim()
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) return fail('invalid_request', 'code_challenge (PKCE S256) is required.')
  const method = raw.get('code_challenge_method') ?? 'plain'
  if (method !== 'S256') return fail('invalid_request', 'code_challenge_method must be S256.')
  const scopeRaw = (raw.get('scope') ?? '').trim()
  const scopes = scopeRaw ? scopeRaw.split(/\s+/) : [STUDIO_SCOPE]
  const unknown = scopes.filter((s) => !(STUDIO_SCOPES_SUPPORTED as readonly string[]).includes(s))
  if (unknown.length) return fail('invalid_scope', `Unknown scope: ${unknown.join(' ')}.`)
  const resource = raw.get('resource')
  if (resource !== null && !resourceMatches(resource, mcpUrl)) return fail('invalid_target', `resource must be ${mcpUrl}.`)
  return {
    ok: true,
    value: {
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      scope: Array.from(new Set([STUDIO_SCOPE, ...scopes])).join(' '),
      resource,
    },
  }
}

export function oauthRedirectUrl(redirectUri: string, params: Record<string, string | null | undefined>): string {
  const u = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && v.length) u.searchParams.set(k, v)
  return u.toString()
}

// ─── PKCE, códigos e tokens ──────────────────────────────────────────────────
export function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function pkceChallengeOf(verifier: string): string {
  return base64url(createHash('sha256').update(verifier, 'ascii').digest())
}

export function pkceVerify(verifier: unknown, challenge: string): boolean {
  if (typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false
  const a = Buffer.from(pkceChallengeOf(verifier))
  const b = Buffer.from(challenge)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const CODE_PREFIX = 'ksc_'
export const ACCESS_PREFIX = 'kst_'
export const REFRESH_PREFIX = 'ksr_'

export function newOpaqueToken(prefix: string): string {
  return prefix + base64url(randomBytes(32))
}

/** Só o hash vai ao banco; um vazamento da tabela não dá acesso a ninguém. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function tokenKind(token: string): 'code' | 'access' | 'refresh' | null {
  if (token.startsWith(ACCESS_PREFIX)) return 'access'
  if (token.startsWith(REFRESH_PREFIX)) return 'refresh'
  if (token.startsWith(CODE_PREFIX)) return 'code'
  return null
}

export function bearerFrom(authorization: string | null | undefined): string | null {
  const m = /^Bearer\s+([A-Za-z0-9._~+/=-]+)\s*$/i.exec(authorization ?? '')
  return m ? m[1] : null
}

export function newClientId(): string {
  return 'kineo_' + base64url(randomBytes(18))
}

/** Resposta do token endpoint (RFC 6749 §5.1). */
export function tokenResponse(access: string, refresh: string | null, scope: string): Record<string, unknown> {
  return {
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_S,
    ...(refresh ? { refresh_token: refresh } : {}),
    scope,
  }
}
