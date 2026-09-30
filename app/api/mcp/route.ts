import { NextRequest, NextResponse } from 'next/server'
import { getKineoFacts } from '@/lib/kineoFacts'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { writeServerEvent } from '@/lib/serverEvents'
import { clientIp, handoffPublicOrigin } from '@/lib/gptHandoffStore'
import { createConnectorHandoff } from '@/lib/mcp/connectorHandoff'
import {
  JSONRPC_INVALID_REQUEST,
  JSONRPC_PARSE_ERROR,
  MCP_PROTOCOL_VERSIONS,
  handleMcpMessage,
  isAnthropicEgressIp,
  jsonRpcError,
  type McpDeps,
  type McpTrace,
} from '@/lib/mcp/kineoMcp'

// ═══ KINEO-MCP-CLAUDE-2026-09-29 — servidor MCP remoto da Kineo ═════════════
//
// URL pública: https://www.usekineo.com/api/mcp (a do Connectors Directory do
// Claude e a de "Add custom connector"). Registrar SEMPRE com www: o apex
// redireciona, e redirect derruba cabeçalhos no cliente de conectores.
//
// Transporte Streamable HTTP, SEM ESTADO (o padrão de referência da própria
// Anthropic, claude.com/docs/connectors/building/quickstart): cada POST traz
// uma mensagem JSON-RPC e recebe application/json; sem Mcp-Session-Id, sem
// stream SSE. GET e DELETE respondem 405 (a spec permite; a doc de
// troubleshooting diz que "a 401 or 405 is fine").
//
// Sem autenticação: as duas tools não agem na conta de ninguém (lib/mcp/
// kineoMcp.ts). Sem checagem estrita de Origin: a doc de testing avisa que
// ela derruba o initialize do Claude.
//
// O miolo (protocolo, tools, despachante) é PURO e mora em lib/mcp/kineoMcp.ts;
// aqui só a borda HTTP, as dependências reais e a medição.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 20

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
}

function reply(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } })
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. This MCP server is stateless: send JSON-RPC messages with POST.' }, id: null },
    { status: 405, headers: { ...CORS_HEADERS, Allow: 'POST, OPTIONS', 'Cache-Control': 'no-store' } },
  )
}

export function GET(): NextResponse {
  return methodNotAllowed()
}

export function DELETE(): NextResponse {
  return methodNotAllowed()
}

/** Adoção do conector: um evento por initialize e por tools/call (não por
 *  tools/list/ping, que o cliente repete). Sem roteiro, sem IP cru. */
async function record(trace: McpTrace, viaAnthropic: boolean): Promise<void> {
  if (trace.method === 'initialize') {
    await writeServerEvent({ name: 'mcp_initialized', path: '/api/mcp', metadata: { client: trace.client ?? null, protocol: trace.protocol ?? null, via_anthropic: viaAnthropic } })
  } else if (trace.method === 'tools/call') {
    await writeServerEvent({ name: 'mcp_tool_called', path: '/api/mcp', metadata: { tool: trace.tool ?? null, ok: trace.ok ?? false, via_anthropic: viaAnthropic } })
  }
}

export async function POST(req: NextRequest) {
  const version = req.headers.get('mcp-protocol-version')
  if (version && !(MCP_PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
    return reply(jsonRpcError(null, JSONRPC_INVALID_REQUEST, `Unsupported MCP-Protocol-Version ${version.slice(0, 20)}. Supported: ${MCP_PROTOCOL_VERSIONS.join(', ')}.`), 400)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return reply(jsonRpcError(null, JSONRPC_PARSE_ERROR, 'Parse error: the body must be a JSON-RPC 2.0 message.'), 400)
  }

  const ip = clientIp(req.headers)
  const viaAnthropic = isAnthropicEgressIp(ip)
  const origin = handoffPublicOrigin(req.nextUrl.origin)
  const deps: McpDeps = {
    facts: () => getKineoFacts() as unknown as Record<string, unknown>,
    createHandoff: (args) => createConnectorHandoff(args, { ip, userAgent: req.headers.get('user-agent'), origin }),
    pausedEngines: PAUSED_ENGINE_KEYS,
  }

  try {
    // Lote (versões 2025-03-26 e anteriores): cada item respondido; se só
    // houver notificações, 202 sem corpo.
    if (Array.isArray(body)) {
      if (body.length === 0) return reply(jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Invalid request: empty batch.'), 400)
      const out = []
      for (const msg of body) {
        const { response, trace } = await handleMcpMessage(msg, deps)
        await record(trace, viaAnthropic)
        if (response) out.push(response)
      }
      return out.length ? reply(out) : new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    }
    const { response, trace } = await handleMcpMessage(body, deps)
    await record(trace, viaAnthropic)
    if (!response) return new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    return reply(response)
  } catch (e) {
    console.error('[mcp] unexpected failure:', e instanceof Error ? e.message : String(e))
    const id = body && typeof body === 'object' && !Array.isArray(body) && 'id' in body ? ((body as { id?: string | number }).id ?? null) : null
    return reply(jsonRpcError(id, -32603, 'Kineo could not process this request right now. Try again in a minute.'), 500)
  }
}
