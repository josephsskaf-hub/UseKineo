import { NextRequest, NextResponse } from 'next/server'
import { studioLiveMode, studioPublicOrigin } from '@/lib/mcp/studioLaunch'
import { authorizationServerMetadata } from '@/lib/mcp/studioOauth'

// ═══ KINEO-MCP-STUDIO-2010 — RFC 8414: metadados do servidor de autorização (issuer = o site, sem caminho) ═══════
// O cliente do Claude lê isto depois do Protected Resource Metadata. Desligado (MCP_STUDIO_LIVE) = 404.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version' }

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export function GET(req: NextRequest): NextResponse {
  if (studioLiveMode() === 'off') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(authorizationServerMetadata(studioPublicOrigin(req.nextUrl.origin)), { headers: HEADERS })
}
