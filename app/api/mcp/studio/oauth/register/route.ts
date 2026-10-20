import { NextRequest, NextResponse } from 'next/server'
import { studioLiveMode } from '@/lib/mcp/studioLaunch'
import { DCR_PER_HOUR_CAP, validateRegistration } from '@/lib/mcp/studioOauth'
import { countRecentRegistrations, registerClient, studioAdmin } from '@/lib/mcp/studioOauthStore'

// ═══ KINEO-MCP-STUDIO-2010 — Dynamic Client Registration (RFC 7591) do conector "Kineo Studio" ═══════════════
// O Claude registra um cliente PÚBLICO por conexão ("Register automatically"); o Claude Code registra o dele com
// redirect loopback. JSON entra, JSON sai (o token endpoint, ao contrário, é form-urlencoded). Sem autenticação —
// por isso o teto global por hora (DCR_PER_HOUR_CAP) e o tamanho do corpo.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 10

const HEADERS = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: HEADERS })

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (studioLiveMode() === 'off') return json({ error: 'not_found' }, 404)
  let body: unknown
  try {
    const raw = await req.text()
    if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) return json({ error: 'invalid_client_metadata', error_description: 'Request is too large.' }, 413)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'invalid_client_metadata', error_description: 'Body must be JSON.' }, 400)
  }
  const v = validateRegistration(body)
  if (!v.ok) return json({ error: v.error, error_description: v.description }, 400)
  const db = studioAdmin()
  if (!db) return json({ error: 'server_error', error_description: 'Kineo Studio is not configured on this server.' }, 503)
  const recent = await countRecentRegistrations(db)
  if (recent === null || recent >= DCR_PER_HOUR_CAP) return json({ error: 'temporarily_unavailable', error_description: 'Too many registrations right now. Try again later.' }, 429)
  const created = await registerClient(db, v.value)
  if (!created) return json({ error: 'server_error', error_description: 'Could not register the client. Try again.' }, 500)
  return json(
    {
      client_id: created.client_id,
      client_id_issued_at: Math.floor(Date.parse(created.created_at) / 1000),
      ...(created.client_secret ? { client_secret: created.client_secret, client_secret_expires_at: 0 } : {}),
      client_name: v.value.client_name ?? undefined,
      client_uri: v.value.client_uri ?? undefined,
      redirect_uris: v.value.redirect_uris,
      token_endpoint_auth_method: v.value.token_endpoint_auth_method,
      grant_types: v.value.grant_types,
      response_types: v.value.response_types,
      scope: v.value.scope,
    },
    201,
  )
}
