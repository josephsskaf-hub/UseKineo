import { NextRequest, NextResponse } from 'next/server'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { handoffPublicOrigin } from '@/lib/gptHandoffStore'
import { createConnectorHandoff } from '@/lib/mcp/connectorHandoff'
import { chatgptRateIdentity } from '@/lib/mcp/chatgptIdentity'
import { handleMcpMessage, jsonRpcError, MCP_PROTOCOL_VERSIONS, type McpDeps, type McpTrace } from '@/lib/mcp/kineoMcp'
import { moderateContent } from '@/lib/safety/contentModeration'
import { writeServerEvent } from '@/lib/serverEvents'

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

// ═══ KINEO-CHATGPT-ADOCAO-2026-10-06 — a porta do ChatGPT passa a contar quem bate ═══════════════════════
// Até aqui só o handoff gravava evento nesta rota: os 26 mcp_tool_called de 30 dias (medidos em 06/10) são TODOS do
// Claude (/api/mcp). Quando o app sair da revisão, "o ChatGPT nunca chama a Kineo" e "chama, mas ninguém salva
// roteiro" seriam o mesmo zero. Mesmos nomes da rota do Claude, separados por path + channel; um evento por
// initialize e por tools/call (tools/list e ping o cliente repete). Sem roteiro, sem argumentos, sem IP, sem
// openai/subject: só método, tool, desfecho, cliente e a família do user-agent (openai-mcp = o ChatGPT; o resto é
// sonda). Nenhuma resposta muda — o que a OpenAI revisa é a resposta, e ela sai igual.
const EVENT_PATH = '/api/mcp/chatgpt'

async function record(trace: McpTrace, userAgent: string | null): Promise<void> {
  const ua = (userAgent ?? '').split('/')[0].trim().slice(0, 40) || null
  try {
    if (trace.method === 'initialize') {
      await writeServerEvent({ name: 'mcp_initialized', path: EVENT_PATH, metadata: { channel: 'chatgpt_plugin', client: trace.client ?? null, protocol: trace.protocol ?? null, ua } })
    } else if (trace.method === 'tools/call') {
      await writeServerEvent({ name: 'mcp_tool_called', path: EVENT_PATH, metadata: { channel: 'chatgpt_plugin', tool: trace.tool ?? null, ok: trace.ok ?? false, ua } })
    }
  } catch {
    // a medição nunca derruba a resposta ao ChatGPT
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
    // Commercial facts are deliberately not loaded by this endpoint.
    facts: () => ({}),
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
  await record(trace, req.headers.get('user-agent'))
  return response ? reply(response) : new NextResponse(null, { status: 202, headers })
}
