// ═══ KINEO-MCP-STUDIO-2010 — o banco do OAuth do conector "Kineo Studio" ═════════════════════════════════════
//
// Tabelas da migration 20261020150000_mcp_studio_oauth.sql, todas só da chave de serviço. Aqui só leitura e escrita;
// a regra (prazos, PKCE, redirect) mora em lib/mcp/studioOauth.ts e a borda HTTP em app/api/mcp/studio/oauth/*.
// Nenhum token em claro no banco: toda consulta é pelo sha256 (hashToken).
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  ACCESS_TOKEN_TTL_S,
  ACCESS_PREFIX,
  CODE_PREFIX,
  CODE_TTL_MS,
  REFRESH_PREFIX,
  REFRESH_TOKEN_TTL_S,
  hashToken,
  newClientId,
  newOpaqueToken,
  type RegisteredClientInput,
  type StoredClient,
} from '@/lib/mcp/studioOauth'

export function studioAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ─── Clientes (DCR) ──────────────────────────────────────────────────────────
export async function countRecentRegistrations(db: SupabaseClient): Promise<number | null> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await db.from('mcp_oauth_clients').select('client_id', { count: 'exact', head: true }).gte('created_at', since)
  if (error) console.error('[mcp-studio] registrations count failed:', error.message)
  return error || typeof count !== 'number' ? null : count
}

export async function registerClient(db: SupabaseClient, input: RegisteredClientInput): Promise<{ client_id: string; client_secret: string | null; created_at: string } | null> {
  const client_id = newClientId()
  const secret = input.token_endpoint_auth_method === 'client_secret_post' ? newOpaqueToken('kss_') : null
  const { data, error } = await db
    .from('mcp_oauth_clients')
    .insert({
      client_id,
      client_name: input.client_name,
      client_uri: input.client_uri,
      redirect_uris: input.redirect_uris,
      token_endpoint_auth_method: input.token_endpoint_auth_method,
      client_secret_hash: secret ? hashToken(secret) : null,
      grant_types: input.grant_types,
    })
    .select('client_id, created_at')
    .maybeSingle()
  if (error || !data) return null
  return { client_id: String(data.client_id), client_secret: secret, created_at: String(data.created_at) }
}

export type ClientRow = StoredClient & { token_endpoint_auth_method: string; client_secret_hash: string | null; client_name: string | null }

export async function getClient(db: SupabaseClient, clientId: string): Promise<ClientRow | null> {
  if (!clientId || clientId.length > 200) return null
  const { data, error } = await db
    .from('mcp_oauth_clients')
    .select('client_id, client_name, redirect_uris, token_endpoint_auth_method, client_secret_hash')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error || !data) return null
  const uris = Array.isArray(data.redirect_uris) ? (data.redirect_uris as unknown[]).filter((u): u is string => typeof u === 'string') : []
  return {
    client_id: String(data.client_id),
    client_name: typeof data.client_name === 'string' ? data.client_name : null,
    redirect_uris: uris,
    token_endpoint_auth_method: String(data.token_endpoint_auth_method ?? 'none'),
    client_secret_hash: typeof data.client_secret_hash === 'string' ? data.client_secret_hash : null,
  }
}

/** Cliente confidencial tem de provar o segredo; cliente público ('none') passa sem. */
export function clientSecretOk(client: ClientRow, presented: string | null): boolean {
  if (client.token_endpoint_auth_method !== 'client_secret_post') return true
  return Boolean(presented && client.client_secret_hash && hashToken(presented) === client.client_secret_hash)
}

// ─── Códigos ─────────────────────────────────────────────────────────────────
export async function issueCode(db: SupabaseClient, input: { client_id: string; user_id: string; redirect_uri: string; code_challenge: string; scope: string; resource: string | null }): Promise<string | null> {
  const code = newOpaqueToken(CODE_PREFIX)
  const { error } = await db.from('mcp_oauth_codes').insert({
    code_hash: hashToken(code),
    client_id: input.client_id,
    user_id: input.user_id,
    redirect_uri: input.redirect_uri,
    code_challenge: input.code_challenge,
    scope: input.scope,
    resource: input.resource,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  })
  return error ? null : code
}

export type CodeRow = { code_hash: string; client_id: string; user_id: string; redirect_uri: string; code_challenge: string; scope: string; resource: string | null; expires_at: string; used_at: string | null }

/** Uso ÚNICO e atômico: só quem marca used_at (de null para agora) fica com o código. Reuso = null. */
export async function consumeCode(db: SupabaseClient, code: string): Promise<{ row: CodeRow | null; replayed: boolean }> {
  const code_hash = hashToken(code)
  const { data, error } = await db
    .from('mcp_oauth_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code_hash', code_hash)
    .is('used_at', null)
    .select('code_hash, client_id, user_id, redirect_uri, code_challenge, scope, resource, expires_at, used_at')
    .maybeSingle()
  if (error) return { row: null, replayed: false }
  if (data) return { row: data as CodeRow, replayed: false }
  // Já usado? (OAuth 2.1 §4.1.2: reuso de código → revogar o que ele emitiu.)
  const { data: used } = await db.from('mcp_oauth_codes').select('code_hash').eq('code_hash', code_hash).not('used_at', 'is', null).maybeSingle()
  return { row: null, replayed: Boolean(used) }
}

export async function revokeTokensOfCode(db: SupabaseClient, codeHash: string): Promise<void> {
  await db.from('mcp_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('code_hash', codeHash).is('revoked_at', null)
}

// ─── Tokens ──────────────────────────────────────────────────────────────────
export type TokenRow = { id: string; client_id: string; user_id: string; scope: string; access_expires_at: string; refresh_expires_at: string | null; revoked_at: string | null; code_hash: string | null }

export async function issueTokens(db: SupabaseClient, input: { client_id: string; user_id: string; scope: string; code_hash: string | null; withRefresh: boolean }): Promise<{ access: string; refresh: string | null } | null> {
  const access = newOpaqueToken(ACCESS_PREFIX)
  const refresh = input.withRefresh ? newOpaqueToken(REFRESH_PREFIX) : null
  const now = Date.now()
  const { error } = await db.from('mcp_oauth_tokens').insert({
    access_hash: hashToken(access),
    refresh_hash: refresh ? hashToken(refresh) : null,
    code_hash: input.code_hash,
    client_id: input.client_id,
    user_id: input.user_id,
    scope: input.scope,
    access_expires_at: new Date(now + ACCESS_TOKEN_TTL_S * 1000).toISOString(),
    refresh_expires_at: refresh ? new Date(now + REFRESH_TOKEN_TTL_S * 1000).toISOString() : null,
  })
  return error ? null : { access, refresh }
}

const TOKEN_COLUMNS = 'id, client_id, user_id, scope, access_expires_at, refresh_expires_at, revoked_at, code_hash'

export async function findByAccess(db: SupabaseClient, access: string): Promise<TokenRow | null> {
  const { data, error } = await db.from('mcp_oauth_tokens').select(TOKEN_COLUMNS).eq('access_hash', hashToken(access)).maybeSingle()
  return error || !data ? null : (data as TokenRow)
}

export async function findByRefresh(db: SupabaseClient, refresh: string): Promise<TokenRow | null> {
  const { data, error } = await db.from('mcp_oauth_tokens').select(TOKEN_COLUMNS).eq('refresh_hash', hashToken(refresh)).maybeSingle()
  return error || !data ? null : (data as TokenRow)
}

/** Rotação: o par antigo é revogado e um novo nasce (cliente público, OAuth 2.1 §4.3.1). */
export async function rotateRefresh(db: SupabaseClient, old: TokenRow): Promise<{ access: string; refresh: string } | null> {
  const { data: closed, error } = await db
    .from('mcp_oauth_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', old.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()
  if (error || !closed) return null
  const issued = await issueTokens(db, { client_id: old.client_id, user_id: old.user_id, scope: old.scope, code_hash: old.code_hash, withRefresh: true })
  return issued && issued.refresh ? { access: issued.access, refresh: issued.refresh } : null
}

export async function touchToken(db: SupabaseClient, id: string): Promise<void> {
  await db.from('mcp_oauth_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', id)
}

/** Revoga pelo access OU pelo refresh (RFC 7009): o par inteiro morre. Token desconhecido = sucesso silencioso. */
export async function revokeToken(db: SupabaseClient, token: string): Promise<boolean> {
  const h = hashToken(token)
  const now = new Date().toISOString()
  const { error } = await db.from('mcp_oauth_tokens').update({ revoked_at: now }).or(`access_hash.eq.${h},refresh_hash.eq.${h}`).is('revoked_at', null)
  return !error
}

/** Revogação em massa da conta (suporte / "desconectar tudo"). */
export async function revokeAllForUser(db: SupabaseClient, userId: string): Promise<number | null> {
  const { data, error } = await db.from('mcp_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null).select('id')
  return error ? null : (data ?? []).length
}
