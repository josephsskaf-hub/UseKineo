import { NextRequest, NextResponse } from 'next/server'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { handoffPublicOrigin } from '@/lib/gptHandoffStore'
import { createConnectorHandoff } from '@/lib/mcp/connectorHandoff'
import { chatgptRateIdentity } from '@/lib/mcp/chatgptIdentity'
import { handleMcpMessage, jsonRpcError, MCP_PROTOCOL_VERSIONS, type McpDeps } from '@/lib/mcp/kineoMcp'
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
  const { response } = await handleMcpMessage(body, deps)
  return response ? reply(response) : new NextResponse(null, { status: 202, headers })
}
