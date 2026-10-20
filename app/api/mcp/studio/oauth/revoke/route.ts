import { NextRequest, NextResponse } from 'next/server'
import { studioLiveMode } from '@/lib/mcp/studioLaunch'
import { revokeToken, studioAdmin } from '@/lib/mcp/studioOauthStore'

// ═══ KINEO-MCP-STUDIO-2010 — revogação (RFC 7009) do conector "Kineo Studio" ═════════════════════════════════
// `token` = access ou refresh; o par inteiro morre. Token desconhecido responde 200 do mesmo jeito (a RFC manda).
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 10

const HEADERS = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (studioLiveMode() === 'off') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS })
  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > 8 * 1024) return NextResponse.json({ error: 'invalid_request' }, { status: 413, headers: HEADERS })
  const form = new URLSearchParams(raw)
  const token = (form.get('token') ?? '').trim()
  if (!token) return NextResponse.json({ error: 'invalid_request', error_description: 'token is required.' }, { status: 400, headers: HEADERS })
  const db = studioAdmin()
  if (db) await revokeToken(db, token)
  return new NextResponse(null, { status: 200, headers: HEADERS })
}
