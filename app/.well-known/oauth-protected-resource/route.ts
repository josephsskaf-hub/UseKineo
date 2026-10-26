import { NextRequest, NextResponse } from 'next/server'
import { studioLiveMode, studioPublicOrigin } from '@/lib/mcp/studioLaunch'
import { protectedResourceMetadata } from '@/lib/mcp/studioOauth'

// ═══ KINEO-MCP-STUDIO-2010 — RFC 9728 na RAIZ (o 2º caminho que o cliente do Claude tenta) ═══════════════════
// Descreve o /api/mcp/studio. O /api/mcp (diretório) não tem autenticação e nunca devolve 401, logo nunca chega aqui.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version' }

const RAIZ_SEM_OAUTH = true // KINEO-MCP-RAIZ-2610 — false devolve o anúncio de OAuth na raiz (como era até 26/10)
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export function GET(req: NextRequest): NextResponse {
  if (studioLiveMode() === 'off') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  // KINEO-MCP-RAIZ-2610 — a RAIZ não anuncia mais OAuth. Ela fazia o portal de plugins da OpenAI achar que o
  // KINEO-MCP-RAIZ-2610 — /api/mcp/chatgpt (sem login) exige login ("Authorization required"). O Claude acha o login
  // KINEO-MCP-RAIZ-2610 — do Studio pelo resource_metadata do 401 (caminho próprio, intacto). Desfazer = apagar estas linhas.
  if (RAIZ_SEM_OAUTH) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } }) // KINEO-MCP-RAIZ-2610
  return NextResponse.json(protectedResourceMetadata(studioPublicOrigin(req.nextUrl.origin)), { headers: HEADERS })
}
