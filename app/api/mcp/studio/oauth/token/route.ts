import { NextRequest, NextResponse } from 'next/server'
import { STUDIO_MCP_PATH, studioLiveMode, studioPublicOrigin } from '@/lib/mcp/studioLaunch'
import { hashToken, pkceVerify, redirectUriMatches, resourceMatches, tokenResponse } from '@/lib/mcp/studioOauth'
import { clientSecretOk, consumeCode, findByRefresh, getClient, issueTokens, revokeTokensOfCode, rotateRefresh, studioAdmin } from '@/lib/mcp/studioOauthStore'
import { STUDIO_TOKEN_EVENT, recordStudioEvent } from '@/lib/mcp/studioTools'

// ═══ KINEO-MCP-STUDIO-2010 — token endpoint (OAuth 2.1) do conector "Kineo Studio" ══════════════════════════
// Entrada em application/x-www-form-urlencoded (o Claude manda assim na troca do código E no refresh; JSON é aceito
// por tolerância). Código de uso único + PKCE S256 + redirect_uri igual ao do pedido + `resource` só este servidor.
// Refresh ROTACIONADO (cliente público): o par antigo morre na mesma resposta que entrega o novo. Refresh morto →
// `invalid_grant` (RFC 6749), que é o código que o Claude entende para pedir login de novo. Responde em < 10 s.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 10

const HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: HEADERS })
const oauthError = (error: string, description: string, status = 400) => json({ error, error_description: description }, status)

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

async function readForm(req: NextRequest): Promise<URLSearchParams | null> {
  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) return null
  const type = (req.headers.get('content-type') ?? '').toLowerCase()
  if (type.includes('application/json')) {
    try {
      const o = JSON.parse(raw)
      if (!o || typeof o !== 'object' || Array.isArray(o)) return null
      const p = new URLSearchParams()
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (typeof v === 'string') p.set(k, v)
      return p
    } catch {
      return null
    }
  }
  return new URLSearchParams(raw)
}

/** client_secret_basic também é aceito (alguns clientes mandam Basic mesmo registrados como 'none'). */
function clientFrom(req: NextRequest, form: URLSearchParams): { id: string; secret: string | null } {
  const auth = req.headers.get('authorization') ?? ''
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(auth)
  if (m) {
    try {
      const [id, ...rest] = Buffer.from(m[1], 'base64').toString('utf8').split(':')
      if (id) return { id: decodeURIComponent(id), secret: rest.length ? decodeURIComponent(rest.join(':')) : null }
    } catch {
      /* cai no corpo */
    }
  }
  return { id: (form.get('client_id') ?? '').trim(), secret: form.get('client_secret') }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (studioLiveMode() === 'off') return json({ error: 'not_found' }, 404)
  const form = await readForm(req)
  if (!form) return oauthError('invalid_request', 'Send application/x-www-form-urlencoded parameters.')
  const db = studioAdmin()
  if (!db) return oauthError('server_error', 'Kineo Studio is not configured on this server.', 503)
  const grant = form.get('grant_type')
  const { id: clientId, secret } = clientFrom(req, form)
  const client = clientId ? await getClient(db, clientId) : null
  if (!client) return oauthError('invalid_client', 'Unknown client_id.', 401)
  if (!clientSecretOk(client, secret)) return oauthError('invalid_client', 'Client authentication failed.', 401)
  const mcpUrl = `${studioPublicOrigin(req.nextUrl.origin)}${STUDIO_MCP_PATH}`
  const resource = form.get('resource')
  if (resource !== null && !resourceMatches(resource, mcpUrl)) return oauthError('invalid_target', `resource must be ${mcpUrl}.`)

  if (grant === 'authorization_code') {
    const code = (form.get('code') ?? '').trim()
    if (!code) return oauthError('invalid_request', 'code is required.')
    const { row, replayed } = await consumeCode(db, code)
    if (!row) {
      if (replayed) await revokeTokensOfCode(db, hashToken(code))
      return oauthError('invalid_grant', replayed ? 'This code was already used; its tokens were revoked.' : 'Unknown or expired code.')
    }
    if (row.client_id !== client.client_id) return oauthError('invalid_grant', 'This code belongs to another client.')
    if (Date.parse(row.expires_at) <= Date.now()) return oauthError('invalid_grant', 'This code expired. Start the connection again.')
    const redirectUri = form.get('redirect_uri')
    if (redirectUri !== null && !redirectUriMatches(row.redirect_uri, redirectUri)) return oauthError('invalid_grant', 'redirect_uri does not match the authorization request.')
    if (!pkceVerify(form.get('code_verifier'), row.code_challenge)) return oauthError('invalid_grant', 'PKCE verification failed (code_verifier).')
    const issued = await issueTokens(db, { client_id: client.client_id, user_id: row.user_id, scope: row.scope, code_hash: row.code_hash, withRefresh: true })
    if (!issued) return oauthError('server_error', 'Could not issue the token. Try again.', 500)
    await recordStudioEvent(STUDIO_TOKEN_EVENT, row.user_id, { grant: 'authorization_code', client_name: client.client_name })
    return json(tokenResponse(issued.access, issued.refresh, row.scope))
  }

  if (grant === 'refresh_token') {
    const refresh = (form.get('refresh_token') ?? '').trim()
    if (!refresh) return oauthError('invalid_request', 'refresh_token is required.')
    const row = await findByRefresh(db, refresh)
    if (!row || row.revoked_at || !row.refresh_expires_at || Date.parse(row.refresh_expires_at) <= Date.now()) return oauthError('invalid_grant', 'The refresh token is invalid, expired or revoked. Sign in again.')
    if (row.client_id !== client.client_id) return oauthError('invalid_grant', 'This refresh token belongs to another client.')
    const rotated = await rotateRefresh(db, row)
    if (!rotated) return oauthError('invalid_grant', 'The refresh token was already rotated. Sign in again.')
    await recordStudioEvent(STUDIO_TOKEN_EVENT, row.user_id, { grant: 'refresh_token', client_name: client.client_name })
    return json(tokenResponse(rotated.access, rotated.refresh, row.scope))
  }

  return oauthError('unsupported_grant_type', 'grant_type must be authorization_code or refresh_token.')
}
