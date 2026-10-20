import { NextRequest, NextResponse } from 'next/server'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { isAnthropicEgressIp, MCP_PROTOCOL_VERSIONS, JSONRPC_INVALID_REQUEST, JSONRPC_PARSE_ERROR, jsonRpcError } from '@/lib/mcp/kineoMcp'
import { studioAllowsEmail, studioLiveMode, studioPublicOrigin } from '@/lib/mcp/studioLaunch'
import { bearerFrom, wwwAuthenticateHeader } from '@/lib/mcp/studioOauth'
import { findByAccess, revokeToken, studioAdmin, touchToken } from '@/lib/mcp/studioOauthStore'
import { handleStudioMessage, type StudioDeps } from '@/lib/mcp/studioMcp'
import {
  STUDIO_INIT_EVENT,
  STUDIO_TOOL_EVENT,
  recordStudioEvent,
  studioAccount,
  studioBalance,
  studioCounts,
  studioCreateVideo,
  studioListVideos,
  studioVideoStatus,
  type StudioCtx,
} from '@/lib/mcp/studioTools'
import { clientIp } from '@/lib/gptHandoffStore'

// ═══ KINEO-MCP-STUDIO-2010 — o servidor MCP "Kineo Studio" (conector personalizado por URL) ══════════════════
//
// URL que a pessoa cola no Claude: https://www.usekineo.com/api/mcp/studio (Customize → Connectors → Add custom
// connector). É um servidor SEPARADO do /api/mcp do diretório (que não renderiza e segue intocado).
//
// Transporte Streamable HTTP sem estado (igual ao /api/mcp): POST com uma mensagem JSON-RPC → application/json;
// GET 405; DELETE revoga o token apresentado (fim de sessão = desconectar). OPTIONS para CORS.
//
// AUTENTICAÇÃO (spec MCP de autorização + claude.com/docs/connectors/building/authentication): sem Bearer, ou com
// token inválido/vencido/revogado → 401 com `WWW-Authenticate: Bearer resource_metadata="…"`, que é o que faz o Claude
// começar o OAuth (discovery em /.well-known, DCR, PKCE, consentimento em /api/mcp/studio/oauth/authorize com o login
// Kineo de sempre). O token identifica a pessoa; toda tool roda SÓ na conta dela.
//
// INTERRUPTOR: MCP_STUDIO_LIVE (lib/mcp/studioLaunch.ts) — desligado = 404 aqui e em todo o OAuth; 'internal' = só
// contas da casa; 'true' = todo mundo. TETOS por usuário (não por IP: o Claude inteiro sai de 160.79.104.0/21).
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate',
  'Access-Control-Max-Age': '86400',
}
const BODY_MAX_BYTES = 64 * 1024

function reply(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store', ...extra } })
}

function notFound(): NextResponse {
  return reply({ error: 'not_found' }, 404)
}

function unauthorized(origin: string, error?: 'invalid_token'): NextResponse {
  return reply(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: error === 'invalid_token' ? 'The Kineo Studio token is invalid, expired or revoked. Sign in again.' : 'Sign in to your Kineo account to use Kineo Studio.' } },
    401,
    { 'WWW-Authenticate': wwwAuthenticateHeader(origin, error) },
  )
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export function GET(): NextResponse {
  if (studioLiveMode() === 'off') return notFound()
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. This MCP server is stateless: send JSON-RPC messages with POST.' }, id: null },
    { status: 405, headers: { ...CORS_HEADERS, Allow: 'POST, DELETE, OPTIONS', 'Cache-Control': 'no-store' } },
  )
}

type AuthOk = { ok: true; ctx: StudioCtx; tokenId: string }
type AuthFail = { ok: false; response: NextResponse }

async function authenticate(req: NextRequest): Promise<AuthOk | AuthFail> {
  const publicOrigin = studioPublicOrigin(req.nextUrl.origin)
  const mode = studioLiveMode()
  if (mode === 'off') return { ok: false, response: notFound() }
  const bearer = bearerFrom(req.headers.get('authorization'))
  if (!bearer) return { ok: false, response: unauthorized(publicOrigin) }
  const db = studioAdmin()
  if (!db) return { ok: false, response: reply({ error: 'Kineo Studio is not configured on this server.' }, 503) }
  const row = await findByAccess(db, bearer)
  if (!row || row.revoked_at || Date.parse(row.access_expires_at) <= Date.now()) return { ok: false, response: unauthorized(publicOrigin, 'invalid_token') }
  const { data: profile } = await db.from('profiles').select('email').eq('id', row.user_id).maybeSingle()
  const email = typeof profile?.email === 'string' ? profile.email : null
  if (!studioAllowsEmail(mode, email)) {
    return { ok: false, response: reply({ jsonrpc: '2.0', id: null, error: { code: -32003, message: 'Kineo Studio inside Claude is not open to this account yet. The /claude-connector page says when it opens.' } }, 403) }
  }
  const ctx: StudioCtx = { db, userId: row.user_id, email, origin: process.env.MCP_STUDIO_INTERNAL_ORIGIN || req.nextUrl.origin, publicOrigin }
  return { ok: true, ctx, tokenId: row.id }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (studioLiveMode() === 'off') return notFound()
  const bearer = bearerFrom(req.headers.get('authorization'))
  const db = studioAdmin()
  if (bearer && db) await revokeToken(db, bearer)
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req)
  if (!auth.ok) return auth.response
  const { ctx } = auth

  const version = req.headers.get('mcp-protocol-version')
  if (version && !(MCP_PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
    return reply(jsonRpcError(null, JSONRPC_INVALID_REQUEST, `Unsupported MCP-Protocol-Version ${version.slice(0, 20)}. Supported: ${MCP_PROTOCOL_VERSIONS.join(', ')}.`), 400)
  }
  let body: unknown
  try {
    const raw = await req.text()
    if (Buffer.byteLength(raw, 'utf8') > BODY_MAX_BYTES) return reply(jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Request is too large.'), 413)
    body = JSON.parse(raw)
  } catch {
    return reply(jsonRpcError(null, JSONRPC_PARSE_ERROR, 'Parse error: the body must be a JSON-RPC 2.0 message.'), 400)
  }
  if (Array.isArray(body)) return reply(jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Send one JSON-RPC message per request.'), 400)

  const viaAnthropic = isAnthropicEgressIp(clientIp(req.headers))
  const deps: StudioDeps = {
    user: { id: ctx.userId, email: ctx.email },
    pausedEngines: PAUSED_ENGINE_KEYS,
    plansUrl: `${ctx.publicOrigin}/pricing?utm_source=claude_studio_connector`,
    counts: () => studioCounts(ctx),
    balance: () => studioBalance(ctx),
    account: () => studioAccount(ctx, PAUSED_ENGINE_KEYS),
    createVideo: (input, estimate) => studioCreateVideo(ctx, input, estimate),
    videoStatus: (jobId) => studioVideoStatus(ctx, jobId),
    listVideos: (limit) => studioListVideos(ctx, limit),
  }

  try {
    const { response, trace } = await handleStudioMessage(body, deps)
    void touchToken(ctx.db, auth.tokenId)
    if (trace.method === 'initialize') {
      await recordStudioEvent(STUDIO_INIT_EVENT, ctx.userId, { client: trace.client ?? null, protocol: trace.protocol ?? null, via_anthropic: viaAnthropic })
    } else if (trace.method === 'tools/call') {
      await recordStudioEvent(STUDIO_TOOL_EVENT, ctx.userId, { tool: trace.tool ?? null, ok: trace.ok ?? false, refused: trace.refused ?? null, credits: trace.credits ?? null, charged: typeof trace.credits === 'number', via_anthropic: viaAnthropic })
    }
    if (!response) return new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    return reply(response)
  } catch (e) {
    console.error('[mcp-studio] unexpected failure:', e instanceof Error ? e.message : String(e))
    const id = body && typeof body === 'object' && 'id' in body ? ((body as { id?: string | number }).id ?? null) : null
    return reply(jsonRpcError(id, -32603, 'Kineo Studio could not process this request right now. Try again in a minute.'), 500)
  }
}
