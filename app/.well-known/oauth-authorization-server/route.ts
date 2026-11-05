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
  // KINEO-PLUGIN-SEM-LOGIN-0511 [fundador 05/11: "faz do jeito que a gente vai ter mais chances de ser aprovado"] — o plugin do ChatGPT não pede conta. O portal da OpenAI lê este anúncio e exige o login do conector; no host só do plugin, ele não existe.
  if ((req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(',')[0].trim().toLowerCase().split(':')[0] === 'plugin.usekineo.com') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  if (studioLiveMode() === 'off') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(authorizationServerMetadata(studioPublicOrigin(req.nextUrl.origin)), { headers: HEADERS })
}
