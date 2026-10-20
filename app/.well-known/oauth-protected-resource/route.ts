import { NextRequest, NextResponse } from 'next/server'
import { studioLiveMode, studioPublicOrigin } from '@/lib/mcp/studioLaunch'
import { protectedResourceMetadata } from '@/lib/mcp/studioOauth'

// ═══ KINEO-MCP-STUDIO-2010 — RFC 9728 na RAIZ (o 2º caminho que o cliente do Claude tenta) ═══════════════════
// Descreve o /api/mcp/studio. O /api/mcp (diretório) não tem autenticação e nunca devolve 401, logo nunca chega aqui.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version' }

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export function GET(req: NextRequest): NextResponse {
  if (studioLiveMode() === 'off') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(protectedResourceMetadata(studioPublicOrigin(req.nextUrl.origin)), { headers: HEADERS })
}
