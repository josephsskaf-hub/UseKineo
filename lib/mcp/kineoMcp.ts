// ═══ KINEO-MCP-CLAUDE-2026-09-29 — o conector da Kineo dentro do Claude ═════
//
// O fundador quer a Kineo no Connectors Directory do Claude (a "loja do
// Claude", portal aberto em 25/09/2026), em paralelo à loja do ChatGPT. O
// diretório só aceita servidor MCP REMOTO; este arquivo é o miolo dele, e a
// rota fina é app/api/mcp/route.ts.
//
// O QUE O CONECTOR FAZ É O QUE A AÇÃO DO GPT FAZ, E NADA MAIS:
//   kineo_facts          — lê os fatos vivos (lib/kineoFacts.ts: planos, trial,
//                          motores, anúncios). Só leitura.
//   create_video_handoff — guarda o roteiro aprovado na MESMA caixa postal
//                          `gpt_handoffs` (canal 'claude_connector') e devolve
//                          o link /go/<token>. Não cria conta, não renderiza,
//                          não cobra.
//
// POR QUE NÃO RENDERIZA (e por que a V2 com OAuth está em dúvida): a política
// do diretório (claude.com/docs/connectors/building/review-criteria, "Unsupported
// use cases") recusa conector que "Generate images, video, or audio through AI
// models". Um link que abre o Studio e ESPERA o clique da pessoa não gera mídia;
// uma tool que dispara render geraria. A fronteira é esta, escrita no código.
//
// PURO DE PROPÓSITO: zero banco, zero rede. O protocolo (JSON-RPC do MCP), a
// lista de tools e a despachante moram aqui; o que toca banco e fatos chega
// por `McpDeps`, injetado pela rota. Assim scripts/test-mcp-claude-2026-09-29.mjs
// EXECUTA a despachante com dependências falsas e prova o contrato (anotações
// em toda tool, nenhum preço digitado, erro legível) sem Supabase.
//
// NENHUM PREÇO AQUI. Preço e crédito só existem no resultado de kineo_facts,
// que vem de lib/kineoFacts.ts (que lê lib/checkoutPricing e lib/credits). O
// guardião reprova qualquer "$<número>" neste arquivo.
import {
  ASPECTS,
  DEFAULT_ASPECT,
  DEFAULT_DURATION,
  DEFAULT_ENGINE,
  DEFAULT_LANGUAGE,
  DURATIONS,
  ENGINE_LABELS,
  HANDOFF_ENGINES,
  HANDOFF_TTL_DAYS,
  SCRIPT_MAX_CHARS,
  TOPIC_MAX_CHARS,
  WORDS_PER_SECOND_CLASSIC,
  WORDS_PER_SECOND_HOLLYWOOD,
  engineFamily,
  normalizeEngineHint,
} from '@/lib/gptHandoff'
import { CHATGPT_MCP_INSTRUCTIONS, chatgptCapabilities, chatgptTools } from '@/lib/mcp/chatgptContract'

// ─── Identidade e protocolo ─────────────────────────────────────────────────
export const MCP_SERVER_NAME = 'kineo'
export const MCP_SERVER_TITLE = 'Kineo'
export const MCP_SERVER_VERSION = '1.0.0'
/** Versões do protocolo que este servidor fala, da mais nova para a mais
 *  velha. Cliente que pede outra recebe a mais nova (negociação da spec). */
export const MCP_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const
export const MCP_LATEST_PROTOCOL = MCP_PROTOCOL_VERSIONS[0]

export function negotiateProtocolVersion(requested: unknown): string {
  return typeof requested === 'string' && (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
    ? requested
    : MCP_LATEST_PROTOCOL
}

/** Texto do `initialize`. Descreve o que as tools fazem — nunca diz ao Claude
 *  como se comportar (review-criteria: "Avoid prompt-injection patterns"). */
export const MCP_INSTRUCTIONS =
  'Kineo tools: kineo_facts reads Kineo\'s current plans, trial, credits and video engines; ' +
  'create_video_handoff saves an approved narration script and returns a link that opens it in Kineo Studio. ' +
  'Neither tool renders a video, creates an account or charges money.'

// ─── Rede de saída da Anthropic ─────────────────────────────────────────────
// claude.com/docs/connectors/building/authentication: o tráfego dos conectores
// sai de 160.79.104.0/21. TODAS as pessoas que usam o conector chegam com IPs
// dessa faixa — o teto por IP da ação do GPT (60/h) somaria o Claude inteiro
// num balde só e barraria o 61º usuário da hora. Dentro da faixa vale só o teto
// global; fora dela (alguém batendo direto na rota) o teto por IP continua.
const ANTHROPIC_EGRESS = { base: ipv4ToInt('160.79.104.0') as number, prefix: 21 }

function ipv4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim())
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some((n) => n > 255)) return null
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

export function isAnthropicEgressIp(ip: string | null | undefined): boolean {
  if (!ip) return false
  const n = ipv4ToInt(ip.replace(/^::ffff:/i, ''))
  if (n === null) return false
  const mask = (0xffffffff << (32 - ANTHROPIC_EGRESS.prefix)) >>> 0
  return ((n & mask) >>> 0) === ((ANTHROPIC_EGRESS.base & mask) >>> 0)
}

// ─── Fatos: só as seções que são FATO ───────────────────────────────────────
// getKineoFacts() tem ~44 KB e mistura fato com orientação para assistentes
// (startHere, assistantDeepLink, creationRouter, paidVideoBuyerGuidance,
// citation…). Resultado de tool que diz ao Claude o que fazer é o padrão que o
// diretório recusa ("Direct Claude to pull behavioral instructions from external
// sources"). Aqui entra lista FECHADA de chaves que só descrevem o produto; a
// comparação com concorrentes fica fora (vira propaganda no contexto do Claude).
export const FACTS_TOPICS = {
  overview: ['product', 'afterTheFilm', 'notAFit'],
  plans: ['currency', 'offerEffectiveSince', 'plans', 'trialAccess', 'freeTier'],
  engines: ['engines'],
  business: ['businessVideoService', 'studioAds'],
} as const
export type FactsTopic = keyof typeof FACTS_TOPICS
export const FACTS_TOPIC_ALL = 'all'
const FACTS_ALWAYS = ['lastVerified'] as const

export function selectFacts(facts: Record<string, unknown>, topic: unknown): Record<string, unknown> {
  const keys: readonly string[] =
    typeof topic === 'string' && topic in FACTS_TOPICS
      ? FACTS_TOPICS[topic as FactsTopic]
      : Object.values(FACTS_TOPICS).flat()
  const out: Record<string, unknown> = {}
  for (const k of [...FACTS_ALWAYS, ...keys]) {
    if (k in facts) out[k] = facts[k]
  }
  return out
}

// ─── As tools ───────────────────────────────────────────────────────────────
export const TOOL_FACTS = 'kineo_facts'
export const TOOL_HANDOFF = 'create_video_handoff'

export type McpToolAnnotations = {
  title: string
  readOnlyHint: boolean
  destructiveHint: boolean
  idempotentHint: boolean
  openWorldHint: boolean
}
export type McpTool = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  securitySchemes?: { type: 'noauth' }[]
  _meta?: Record<string, unknown>
  annotations: McpToolAnnotations
}

/** Segundos → palavras faladas na régua do motor, arredondado. Derivado das
 *  constantes da ação do GPT; nenhum número de palavras é digitado aqui. */
function wordsFor(seconds: number, wordsPerSecond: number): number {
  return Math.round(seconds * wordsPerSecond)
}

/** Motores que o conector anuncia: os do handoff menos os pausados agora
 *  (lib/engineLaunch PAUSED_ENGINE_KEYS, passado pela rota). */
export function activeEngines(pausedEngines: readonly string[]): string[] {
  return HANDOFF_ENGINES.filter((e) => !pausedEngines.includes(e))
}

export function buildTools(opts: { pausedEngines: readonly string[] }): McpTool[] {
  const engines = activeEngines(opts.pausedEngines)
  const standard = engines.filter((e) => engineFamily(e as never) === 'classic')
  const premium = engines.filter((e) => engineFamily(e as never) === 'hollywood')
  const label = (ids: string[]) => ids.map((e) => `${e} = ${ENGINE_LABELS[e as keyof typeof ENGINE_LABELS]}`).join(', ')
  const ref = DEFAULT_DURATION

  const factsTitle = 'Get Kineo plans, pricing and engines'
  const handoffTitle = 'Send a script to Kineo Studio'

  return [
    {
      name: TOOL_FACTS,
      title: factsTitle,
      description:
        "Returns Kineo's current product facts as published on usekineo.com: subscription plans with USD prices and monthly credits, " +
        'the free trial for new accounts, video engines with the credits each one costs, business video ad options, and what Kineo is not suited for. ' +
        "Read-only. Use it when the user asks about Kineo's pricing, plans, credits, trial, engines or capabilities. " +
        `The optional topic narrows the result (${Object.keys(FACTS_TOPICS).join(', ')} or ${FACTS_TOPIC_ALL}).`,
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: [...Object.keys(FACTS_TOPICS), FACTS_TOPIC_ALL],
            default: FACTS_TOPIC_ALL,
            description: 'Which facts to return. Defaults to all.',
          },
        },
        additionalProperties: false,
      },
      annotations: { title: factsTitle, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: TOOL_HANDOFF,
      title: handoffTitle,
      description:
        'Saves an approved narration script on Kineo and returns a link (https://www.usekineo.com/go/...) that opens Kineo Studio with the script, duration, frame and engine already filled in. ' +
        'Use it when the user asks to send a finished script to Kineo. ' +
        `This tool does not create an account, render a video or charge anything: the link stays valid for ${HANDOFF_TTL_DAYS} days, and nothing is made until the person opens it and chooses to create the video in their own Kineo account. ` +
        `Script: plain text, up to ${SCRIPT_MAX_CHARS} characters; section labels on their own line (HOOK:, MICRO REWARD:, ESCALATION:, PAYOFF:) are optional and are not narrated. ` +
        `Narration pace is about ${WORDS_PER_SECOND_CLASSIC} spoken words per second on standard engines (${label(standard)}), about ${wordsFor(ref, WORDS_PER_SECOND_CLASSIC)} words for ${ref} seconds, ` +
        `and about ${WORDS_PER_SECOND_HOLLYWOOD} on premium engines (${label(premium)}), about ${wordsFor(ref, WORDS_PER_SECOND_HOLLYWOOD)} words for ${ref} seconds. ` +
        'The response includes words (the server\'s count of spoken words, labels excluded), outcome.kind (at_target or shorter_film) with outcomeMessage, and the link. ' +
        'Invalid input returns an error that names what to change, such as the maximum spoken words for the chosen duration.',
      inputSchema: {
        type: 'object',
        properties: {
          script: {
            type: 'string',
            minLength: 1,
            maxLength: SCRIPT_MAX_CHARS,
            description: 'The narration exactly as the user approved it, plain text, optionally with HOOK:/MICRO REWARD:/ESCALATION:/PAYOFF: labels.',
          },
          durationSec: {
            type: 'integer',
            enum: [...DURATIONS],
            default: DEFAULT_DURATION,
            description: `Target film length in seconds. ${DURATIONS[0]} is available only with engineHint ${DEFAULT_ENGINE}.`,
          },
          aspect: {
            type: 'string',
            enum: [...ASPECTS],
            default: DEFAULT_ASPECT,
            // KINEO-APP-PADRAO-SEEDANCE-VERTICAL-2026-10-05 — o ChatGPT lia "cinematic" e mandava 16:9 + Kling 3.
            description: `Frame: ${DEFAULT_ASPECT} (vertical) for Shorts, TikTok and Reels — use ${DEFAULT_ASPECT} unless the user explicitly asks for widescreen/horizontal, square or a feed post; 16:9 for regular YouTube or websites; 1:1 square; 4:5 tall feed post.`,
          },
          engineHint: {
            type: 'string',
            enum: engines,
            default: DEFAULT_ENGINE,
            // KINEO-APP-PADRAO-SEEDANCE-VERTICAL-2026-10-05 — conta nova tem só o crédito de cadastro; motor premium vira parede.
            description: `Video engine preselected in Studio: ${label(engines)}. Use ${DEFAULT_ENGINE} unless the user explicitly names another engine: it is the only engine a new account's free credits can pay for, and words like "cinematic" or "epic" are not a request for a premium engine. Premium engines cost several times more and need a paid plan. The person can change it in Studio.`,
          },
          language: {
            type: 'string',
            pattern: '^[a-z]{2}(-[A-Z]{2})?$',
            default: DEFAULT_LANGUAGE,
            description: 'Language of the script as a short code, such as en, pt or es.',
          },
          topic: {
            type: 'string',
            maxLength: TOPIC_MAX_CHARS,
            description: 'Optional 3-8 word title shown on the link page.',
          },
        },
        required: ['script'],
        additionalProperties: false,
      },
      // KINEO-OPENWORLD-2026-10-05 — a revisão da OpenAI apontou: a tool grava o roteiro no serviço da Kineo e devolve um link
      // público (/go) que qualquer pessoa com o link lê — isto é interagir com um sistema externo ao ChatGPT. openWorldHint: true.
      annotations: { title: handoffTitle, readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
  ]
}

// ─── Despachante JSON-RPC ───────────────────────────────────────────────────
export type HandoffToolResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; details?: Record<string, unknown> }

export type McpDeps = {
  facts: () => Record<string, unknown>
  createHandoff: (args: Record<string, unknown>, meta?: Record<string, unknown>) => Promise<HandoffToolResult>
  pausedEngines: readonly string[]
  profile?: 'chatgpt'
}

export type JsonRpcId = string | number | null
export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: Record<string, unknown> }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: { code: number; message: string } }

/** O que a rota grava como evento: método, tool, desfecho e cliente. */
export type McpTrace = { method: string | null; tool?: string; ok?: boolean; client?: string; protocol?: string }

export const JSONRPC_PARSE_ERROR = -32700
export const JSONRPC_INVALID_REQUEST = -32600
export const JSONRPC_METHOD_NOT_FOUND = -32601
export const JSONRPC_INVALID_PARAMS = -32602

export function jsonRpcError(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function toolText(result: Record<string, unknown>, isError: boolean, summary?: string): Record<string, unknown> {
  const json = JSON.stringify(result, null, 1)
  return {
    content: [{ type: 'text', text: summary ? `${summary}\n\n${json}` : json }],
    structuredContent: result,
    ...(isError ? { isError: true } : {}),
  }
}

function toolError(message: string, details?: Record<string, unknown>): Record<string, unknown> {
  return toolText({ error: message, ...(details ?? {}) }, true, message)
}

async function callTool(name: string, args: Record<string, unknown>, deps: McpDeps, meta?: Record<string, unknown>): Promise<{ result: Record<string, unknown>; ok: boolean }> {
  if (name === TOOL_FACTS) {
    if (deps.profile === 'chatgpt') {
      if (Object.keys(args).length) return { ok: false, result: toolError('This tool accepts no arguments.') }
      return { ok: true, result: toolText(chatgptCapabilities(deps.pausedEngines), false) }
    }
    const topic = args.topic
    if (topic !== undefined && topic !== FACTS_TOPIC_ALL && !(typeof topic === 'string' && topic in FACTS_TOPICS)) {
      return { ok: false, result: toolError(`topic must be one of ${[...Object.keys(FACTS_TOPICS), FACTS_TOPIC_ALL].join(', ')}.`) }
    }
    let facts: Record<string, unknown>
    try {
      facts = deps.facts()
    } catch {
      return { ok: false, result: toolError("Kineo's facts could not be loaded right now. The pricing page https://www.usekineo.com/pricing has the same information.") }
    }
    return { ok: true, result: toolText(selectFacts(facts, topic), false) }
  }

  // create_video_handoff
  const engine = normalizeEngineHint(args.engineHint)
  if (engine && deps.pausedEngines.includes(engine)) {
    const alternatives = activeEngines(deps.pausedEngines).filter((e) => engineFamily(e as never) === engineFamily(engine)).join(' or ')
    return {
      ok: false,
      result: toolError(`${ENGINE_LABELS[engine]} (${engine}) is temporarily paused. Send engineHint ${alternatives || DEFAULT_ENGINE} instead.`),
    }
  }
  let r: HandoffToolResult
  try {
    r = await deps.createHandoff(args, meta)
  } catch {
    r = { ok: false, error: 'Kineo could not save the script right now. Try again in a minute.' }
  }
  if (!r.ok) return { ok: false, result: toolError(r.error, r.details) }
  const url = typeof r.data.url === 'string' ? r.data.url : ''
  const summary = `Script saved. Kineo Studio link (valid ${HANDOFF_TTL_DAYS} days): ${url}`
  return { ok: true, result: toolText(r.data, false, summary) }
}

/** Uma mensagem JSON-RPC → uma resposta (ou null para notificação/resposta
 *  do cliente, que o transporte responde com 202 sem corpo). */
export async function handleMcpMessage(msg: unknown, deps: McpDeps): Promise<{ response: JsonRpcResponse | null; trace: McpTrace }> {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    return { response: jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Invalid request: expected a JSON-RPC 2.0 object.'), trace: { method: null } }
  }
  const m = msg as Record<string, unknown>
  if (deps.profile === 'chatgpt' && (m.jsonrpc !== '2.0' || ('id' in m && m.id !== null && typeof m.id !== 'string' && typeof m.id !== 'number'))) {
    return { response: jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Invalid JSON-RPC version or request id.'), trace: { method: null } }
  }
  const hasId = 'id' in m && (typeof m.id === 'string' || typeof m.id === 'number' || (deps.profile === 'chatgpt' && m.id === null))
  const id: JsonRpcId = hasId ? (m.id as string | number) : null
  const method = typeof m.method === 'string' ? m.method : null

  // Resposta do cliente a um pedido nosso (não fazemos pedidos) ou notificação.
  if (!method) {
    if ('result' in m || 'error' in m) return { response: null, trace: { method: null } }
    return { response: jsonRpcError(id, JSONRPC_INVALID_REQUEST, 'Invalid request: missing method.'), trace: { method: null } }
  }
  if (!hasId) return { response: null, trace: { method } }
  if (m.jsonrpc !== '2.0') {
    return { response: jsonRpcError(id, JSONRPC_INVALID_REQUEST, 'Invalid request: jsonrpc must be "2.0".'), trace: { method } }
  }
  const params = (m.params && typeof m.params === 'object' ? m.params : {}) as Record<string, unknown>

  switch (method) {
    case 'initialize': {
      const protocolVersion = negotiateProtocolVersion(params.protocolVersion)
      const clientInfo = (params.clientInfo && typeof params.clientInfo === 'object' ? params.clientInfo : {}) as Record<string, unknown>
      const client = [clientInfo.name, clientInfo.version].filter((v) => typeof v === 'string').join('/').slice(0, 80) || undefined
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: MCP_SERVER_NAME, title: MCP_SERVER_TITLE, version: MCP_SERVER_VERSION },
            instructions: deps.profile === 'chatgpt' ? CHATGPT_MCP_INSTRUCTIONS : MCP_INSTRUCTIONS,
          },
        },
        trace: { method, client, protocol: protocolVersion },
      }
    }
    case 'ping':
      return { response: { jsonrpc: '2.0', id, result: {} }, trace: { method } }
    case 'tools/list':
      return { response: { jsonrpc: '2.0', id, result: { tools: deps.profile === 'chatgpt' ? chatgptTools(buildTools({ pausedEngines: deps.pausedEngines })) : buildTools({ pausedEngines: deps.pausedEngines }) } }, trace: { method } }
    case 'tools/call': {
      const name = typeof params.name === 'string' ? params.name : ''
      if (name !== TOOL_FACTS && name !== TOOL_HANDOFF) {
        return { response: jsonRpcError(id, JSONRPC_INVALID_PARAMS, `Unknown tool: ${name.slice(0, 64) || '(none)'}. Available: ${TOOL_FACTS}, ${TOOL_HANDOFF}.`), trace: { method, tool: name.slice(0, 64) } }
      }
      if (deps.profile === 'chatgpt' && params.arguments !== undefined && (!params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments))) {
        return { response: jsonRpcError(id, JSONRPC_INVALID_PARAMS, 'Tool arguments must be an object.'), trace: { method, tool: name, ok: false } }
      }
      const args = (params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments : {}) as Record<string, unknown>
      const meta = params._meta && typeof params._meta === 'object' && !Array.isArray(params._meta) ? params._meta as Record<string, unknown> : undefined
      const { result, ok } = await callTool(name, args, deps, meta)
      return { response: { jsonrpc: '2.0', id, result }, trace: { method, tool: name, ok } }
    }
    // Capacidades que não temos: lista vazia é mais honesta que "method not found"
    // para clientes que listam tudo ao conectar.
    case 'resources/list':
      return { response: { jsonrpc: '2.0', id, result: { resources: [] } }, trace: { method } }
    case 'resources/templates/list':
      return { response: { jsonrpc: '2.0', id, result: { resourceTemplates: [] } }, trace: { method } }
    case 'prompts/list':
      return { response: { jsonrpc: '2.0', id, result: { prompts: [] } }, trace: { method } }
    default:
      return { response: jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, `Method not found: ${method.slice(0, 64)}`), trace: { method: method.slice(0, 64) } }
  }
}
