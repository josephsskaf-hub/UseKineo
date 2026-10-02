import { NextRequest, NextResponse } from 'next/server'
import { getKineoFacts } from '@/lib/kineoFacts'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { writeServerEvent } from '@/lib/serverEvents'
import { handoffPublicOrigin } from '@/lib/gptHandoffStore'
import { createConnectorHandoff } from '@/lib/mcp/connectorHandoff'
import { chatgptRateIdentity } from '@/lib/mcp/chatgptIdentity'
import { CHATGPT_MCP_COMMERCIAL_FACTS_LIVE } from '@/lib/mcp/chatgptContract'
import { handleMcpMessage, jsonRpcError, MCP_PROTOCOL_VERSIONS, type McpDeps, type McpTrace } from '@/lib/mcp/kineoMcp'
import { moderateContent } from '@/lib/safety/contentModeration'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 20

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version',
  'Cache-Control': 'no-store',
}
const allowedOrigins = new Set(['https://chatgpt.com', 'https://chat.openai.com', 'https://www.usekineo.com'])
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
export function OPTIONS() { return new NextResponse(null, { status: 204, headers }) }
export function GET() { return NextResponse.json(jsonRpcError(null, -32000, 'Use POST for this stateless MCP endpoint.'), { status: 405, headers: { ...headers, Allow: 'POST, OPTIONS' } }) }
export const DELETE = GET

/** KINEO-MCP-CHATGPT-FATOS-2026-10-02 — adoção do app no ChatGPT, no MESMO padrão da rota do Claude (app/api/mcp/route.ts
 *  record): um evento por initialize e por tools/call (não por tools/list/ping, que o cliente repete), com
 *  client='chatgpt' fixo pelo endpoint (a origem é a rota, não um campo que o cliente manda). O clientInfo cru vai em
 *  client_info. Sem roteiro, sem IP, sem o openai/subject. */
async function record(trace: McpTrace): Promise<void> {
  if (trace.method === 'initialize') {
    await writeServerEvent({ name: 'mcp_initialized', path: '/api/mcp/chatgpt', metadata: { client: 'chatgpt', client_info: trace.client ?? null, protocol: trace.protocol ?? null } })
  } else if (trace.method === 'tools/call') {
    await writeServerEvent({ name: 'mcp_tool_called', path: '/api/mcp/chatgpt', metadata: { client: 'chatgpt', tool: trace.tool ?? null, ok: trace.ok ?? false } })
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && !allowedOrigins.has(origin)) return reply(jsonRpcError(null, -32600, 'Origin is not allowed.'), 403)
  const version = req.headers.get('mcp-protocol-version')
  if (version && !(MCP_PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
    return reply(jsonRpcError(null, -32600, 'Unsupported MCP protocol version.'), 400)
  }
  let body: unknown
  try {
    const raw = await req.text()
    if (Buffer.byteLength(raw, 'utf8') > 32_768) return reply(jsonRpcError(null, -32600, 'Request is too large.'), 413)
    body = JSON.parse(raw)
  } catch {
    return reply(jsonRpcError(null, -32700, 'Body must be a JSON-RPC message.'), 400)
  }
  if (Array.isArray(body)) return reply(jsonRpcError(null, -32600, 'Send one JSON-RPC message per request.'), 400)
  const deps: McpDeps = {
    profile: 'chatgpt',
    // KINEO-MCP-CHATGPT-FATOS-2026-10-02 — os fatos comerciais vêm da MESMA fonte do conector do Claude (getKineoFacts).
    // Só aparecem para o ChatGPT com CHATGPT_MCP_COMMERCIAL_FACTS_LIVE ligado (lib/mcp/chatgptContract.ts, hoje false:
    // o perfil foi submetido à revisão da OpenAI sem ofertas). Desligado, kineo_facts nem chama esta função.
    facts: () => getKineoFacts() as unknown as Record<string, unknown>,
    commercialFacts: CHATGPT_MCP_COMMERCIAL_FACTS_LIVE,
    pausedEngines: PAUSED_ENGINE_KEYS,
    createHandoff: (args, meta) => {
      const identity = chatgptRateIdentity(req.headers, meta, process.env.VERCEL === '1')
      return createConnectorHandoff(args, {
        ip: identity.ip, rateLimitKey: identity.key, channel: 'chatgpt_plugin',
        origin: handoffPublicOrigin(req.nextUrl.origin), userAgent: req.headers.get('user-agent'),
        checkContent: async (script) => {
          const verdict = await moderateContent({
            surface: 'chatgpt_plugin', stage: 'input', userId: null, text: script, omitEvidenceText: true,
          })
          if (verdict.ok) return null
          return verdict.reason === 'blocked'
            ? 'This script cannot be saved on Kineo.'
            : 'The script could not be checked for safety. Please try again later.'
        },
      })
    },
  }
  const { response, trace } = await handleMcpMessage(body, deps)
  await record(trace) // writeServerEvent engole o próprio erro: a medição nunca derruba a resposta
  return response ? reply(response) : new NextResponse(null, { status: 202, headers })
}
