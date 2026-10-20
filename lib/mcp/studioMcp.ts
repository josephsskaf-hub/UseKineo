// ═══ KINEO-MCP-STUDIO-2010 — as tools do conector "Kineo Studio" e a despachante JSON-RPC (PURO) ══════════════
//
// Diferente do conector do diretório (lib/mcp/kineoMcp.ts, que NÃO renderiza), este é o conector que a pessoa adiciona
// por URL e que faz o filme de verdade na conta dela. Quatro tools:
//   kineo_account       — plano, saldo, motores com o preço em créditos por duração (read-only).
//   kineo_create_video  — pede o filme: valida aqui, confere o saldo, e o caminho REAL (deps.createVideo, em
//                         lib/mcp/studioTools.ts) chama o MESMO /api/generate-video-cinematic do site, autenticado como
//                         a pessoa — mesmas regras de plano, moderação, régua de voz, contrato de cena e cobrança.
//   kineo_video_status  — estado do pedido e, pronto, o link do filme.
//   kineo_list_videos   — os últimos filmes da pessoa.
//
// PURO: zero banco, zero rede, zero env. Tudo que toca o mundo chega por `StudioDeps`. Assim o guardião
// (scripts/test-mcp-studio-2010.mjs) executa a despachante com dependências falsas e prova: escopo do usuário,
// recusa sem saldo ANTES de chamar o caminho pago, teto por usuário, idempotência pela chave do cliente, anotações.
//
// NENHUM PREÇO DIGITADO: crédito por motor/duração vem de creditCostForDuration (a função que COBRA no site).
import { ENGINE_LABELS } from '@/lib/gptHandoff'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { supportedDurationsFor } from '@/lib/durationByEngine'
import { NARRATION_LANGUAGE_CODES } from '@/lib/textLanguage'
import {
  JSONRPC_INVALID_PARAMS,
  JSONRPC_INVALID_REQUEST,
  JSONRPC_METHOD_NOT_FOUND,
  jsonRpcError,
  negotiateProtocolVersion,
  type JsonRpcId,
  type JsonRpcResponse,
  type McpToolAnnotations,
} from '@/lib/mcp/kineoMcp'

export const STUDIO_SERVER_NAME = 'kineo-studio'
export const STUDIO_SERVER_TITLE = 'Kineo Studio'
export const STUDIO_SERVER_VERSION = '1.0.0'

export const STUDIO_INSTRUCTIONS =
  'Kineo Studio tools act on the signed-in person\'s own Kineo account. kineo_account shows the plan, credit balance and the credits each engine costs; ' +
  'kineo_create_video starts a real video render and spends that account\'s credits; it returns a job_id, and the film takes a few minutes, so call kineo_video_status with the job_id afterwards (about once a minute) until it is completed; ' +
  'kineo_list_videos lists recent films. Confirm the engine, length and credit cost with the person before calling kineo_create_video.'

// ─── Motores, formatos, durações ─────────────────────────────────────────────
export const STUDIO_ENGINES = ['seedance', 'kling', 'veo', 'hollywood', 'h3'] as const
export type StudioEngine = (typeof STUDIO_ENGINES)[number]
export const STUDIO_ENGINE_QUALITY: Readonly<Record<StudioEngine, Quality>> = {
  seedance: 'cinematic_ai',
  kling: 'cinematic_kling',
  veo: 'cinematic_veo',
  hollywood: 'cinematic_hollywood',
  h3: 'cinematic_h3',
}
export const STUDIO_DEFAULT_ENGINE: StudioEngine = 'seedance'
export const STUDIO_DURATIONS = [15, 30, 35, 60, 90] as const
export const STUDIO_DEFAULT_DURATION = 35
export const STUDIO_FORMATS = ['film', 'product_ad', 'ugc_ad', 'kids_cartoon'] as const
export type StudioFormat = (typeof STUDIO_FORMATS)[number]
export const STUDIO_ASPECTS = ['9:16', '16:9', '1:1', '4:5'] as const
export const STUDIO_SCRIPT_MAX_CHARS = 6000
export const STUDIO_IDEA_MAX_CHARS = 2000
export const STUDIO_LIST_MAX = 20

export function studioEngineLabel(engine: StudioEngine): string {
  return ENGINE_LABELS[engine]
}

export function activeStudioEngines(pausedEngines: readonly string[]): StudioEngine[] {
  return STUDIO_ENGINES.filter((e) => !pausedEngines.includes(e))
}

export function durationsFor(engine: StudioEngine): number[] {
  const allowed = supportedDurationsFor(engine)
  return STUDIO_DURATIONS.filter((d) => allowed.includes(d))
}

/** Créditos que o site cobra deste motor nesta duração (conta paga/trial pagam igual). Sem número digitado. */
export function estimateCredits(engine: StudioEngine, seconds: number): number {
  return creditCostForDuration(STUDIO_ENGINE_QUALITY[engine], true, seconds)
}

/** Catálogo que kineo_account devolve: cada motor com o preço por duração. */
export function engineCatalog(pausedEngines: readonly string[]): { engine: StudioEngine; label: string; family: 'standard' | 'premium'; durations: { seconds: number; credits: number }[] }[] {
  return activeStudioEngines(pausedEngines).map((engine) => ({
    engine,
    label: studioEngineLabel(engine),
    family: engine === 'hollywood' || engine === 'h3' ? 'premium' : 'standard',
    durations: durationsFor(engine).map((seconds) => ({ seconds, credits: estimateCredits(engine, seconds) })),
  }))
}

/** Minutos que a pessoa deve esperar (ordem de grandeza medida no site: clássico ~3-6 min, premium ~8-15). */
export function estimatedMinutes(engine: StudioEngine, seconds: number): number {
  const premium = engine === 'hollywood' || engine === 'h3'
  const base = premium ? 8 : 3
  return base + Math.ceil(seconds / 20)
}

// ─── Tetos por usuário (o IP não serve: todo o Claude sai de 160.79.104.0/21) ─
export const TOOL_CALLS_PER_HOUR = 120
export const CREATES_PER_HOUR = 8
export const MAX_ACTIVE_JOBS = 2
/** Um job conta como "ativo" por até este tempo sem desfecho (o resgate do servidor fecha ou estorna antes disso). */
export const ACTIVE_JOB_WINDOW_MS = 30 * 60 * 1000

export type StudioCounts = { toolCallsLastHour: number; createsLastHour: number; activeJobs: number }
export type LimitDecision = { ok: true } | { ok: false; reason: 'tool_rate' | 'create_rate' | 'too_many_active'; message: string }

export function limitDecision(tool: string, counts: StudioCounts): LimitDecision {
  if (counts.toolCallsLastHour >= TOOL_CALLS_PER_HOUR) {
    return { ok: false, reason: 'tool_rate', message: `This Kineo account made ${TOOL_CALLS_PER_HOUR} connector calls in the last hour. Wait a few minutes and try again.` }
  }
  if (tool === TOOL_CREATE) {
    if (counts.createsLastHour >= CREATES_PER_HOUR) {
      return { ok: false, reason: 'create_rate', message: `This Kineo account already started ${CREATES_PER_HOUR} videos in the last hour from the connector. Wait before starting another one.` }
    }
    if (counts.activeJobs >= MAX_ACTIVE_JOBS) {
      return { ok: false, reason: 'too_many_active', message: `${MAX_ACTIVE_JOBS} videos from this connector are still rendering. Call kineo_video_status on them and start a new one when one finishes.` }
    }
  }
  return { ok: true }
}

// ─── Entrada de kineo_create_video ───────────────────────────────────────────
export type CreateVideoInput = {
  format: StudioFormat
  prompt: string
  scriptMode: 'verbatim' | 'ai'
  engine: StudioEngine
  duration: number
  language: string
  aspect: (typeof STUDIO_ASPECTS)[number]
  idempotencyKey: string | null
  title: string | null
}
export type CreateValidation = { ok: true; value: CreateVideoInput } | { ok: false; error: string }

export function validateCreateInput(args: Record<string, unknown>, pausedEngines: readonly string[]): CreateValidation {
  const idea = typeof args.idea === 'string' ? args.idea.trim() : ''
  const script = typeof args.script === 'string' ? args.script.trim() : ''
  if (!idea && !script) return { ok: false, error: 'Send either idea (a topic or one-line brief) or script (the full narration).' }
  if (idea && script) return { ok: false, error: 'Send idea OR script, not both.' }
  if (idea.length > STUDIO_IDEA_MAX_CHARS) return { ok: false, error: `idea must be at most ${STUDIO_IDEA_MAX_CHARS} characters.` }
  if (script.length > STUDIO_SCRIPT_MAX_CHARS) return { ok: false, error: `script must be at most ${STUDIO_SCRIPT_MAX_CHARS} characters.` }
  const format = args.format === undefined ? 'film' : args.format
  if (typeof format !== 'string' || !(STUDIO_FORMATS as readonly string[]).includes(format)) {
    return { ok: false, error: `format must be one of ${STUDIO_FORMATS.join(', ')}.` }
  }
  const engineRaw = args.engine === undefined ? STUDIO_DEFAULT_ENGINE : args.engine
  if (typeof engineRaw !== 'string' || !(STUDIO_ENGINES as readonly string[]).includes(engineRaw)) {
    return { ok: false, error: `engine must be one of ${STUDIO_ENGINES.join(', ')}.` }
  }
  const engine = engineRaw as StudioEngine
  if (pausedEngines.includes(engine)) {
    const alt = activeStudioEngines(pausedEngines)
    return { ok: false, error: `${studioEngineLabel(engine)} (${engine}) is temporarily paused. Use ${alt.join(' or ')} instead.` }
  }
  const duration = args.duration === undefined ? STUDIO_DEFAULT_DURATION : Number(args.duration)
  const allowed = durationsFor(engine)
  if (!Number.isInteger(duration) || !allowed.includes(duration)) {
    return { ok: false, error: `duration for ${studioEngineLabel(engine)} must be one of ${allowed.join(', ')} seconds.` }
  }
  const languageRaw = args.language === undefined ? 'en' : args.language
  const language = typeof languageRaw === 'string' ? languageRaw.trim().toLowerCase().slice(0, 2) : ''
  if (!(NARRATION_LANGUAGE_CODES as readonly string[]).includes(language)) {
    return { ok: false, error: `language must be one of ${NARRATION_LANGUAGE_CODES.join(', ')}.` }
  }
  const aspect = args.aspect === undefined ? '9:16' : args.aspect
  if (typeof aspect !== 'string' || !(STUDIO_ASPECTS as readonly string[]).includes(aspect)) {
    return { ok: false, error: `aspect must be one of ${STUDIO_ASPECTS.join(', ')}.` }
  }
  const modeRaw = args.script_mode
  if (modeRaw !== undefined && modeRaw !== 'verbatim' && modeRaw !== 'ai') return { ok: false, error: 'script_mode must be verbatim or ai.' }
  const scriptMode: 'verbatim' | 'ai' = modeRaw === 'verbatim' || modeRaw === 'ai' ? modeRaw : script ? 'verbatim' : 'ai'
  const keyRaw = args.idempotency_key
  if (keyRaw !== undefined && (typeof keyRaw !== 'string' || !/^[A-Za-z0-9_.:-]{8,120}$/.test(keyRaw))) {
    return { ok: false, error: 'idempotency_key must be 8-120 characters (letters, digits, - _ . :).' }
  }
  const titleRaw = args.title
  if (titleRaw !== undefined && (typeof titleRaw !== 'string' || titleRaw.length > 120)) return { ok: false, error: 'title must be at most 120 characters.' }
  return {
    ok: true,
    value: {
      format: format as StudioFormat,
      prompt: script || idea,
      scriptMode,
      engine,
      duration,
      language,
      aspect: aspect as (typeof STUDIO_ASPECTS)[number],
      idempotencyKey: typeof keyRaw === 'string' ? keyRaw : null,
      title: typeof titleRaw === 'string' && titleRaw.trim() ? titleRaw.trim() : null,
    },
  }
}

// ─── As tools ────────────────────────────────────────────────────────────────
export const TOOL_ACCOUNT = 'kineo_account'
export const TOOL_CREATE = 'kineo_create_video'
export const TOOL_STATUS = 'kineo_video_status'
export const TOOL_LIST = 'kineo_list_videos'
export const STUDIO_TOOL_NAMES = [TOOL_ACCOUNT, TOOL_CREATE, TOOL_STATUS, TOOL_LIST] as const

export type StudioTool = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: McpToolAnnotations
}

export function buildStudioTools(opts: { pausedEngines: readonly string[] }): StudioTool[] {
  const catalog = engineCatalog(opts.pausedEngines)
  const engines = catalog.map((c) => c.engine)
  const priceLine = catalog
    .map((c) => `${c.engine} = ${c.label} (${c.durations.map((d) => `${d.seconds}s: ${d.credits} cr`).join(', ')})`)
    .join('; ')
  const accountTitle = 'Get my Kineo plan, credits and engines'
  const createTitle = 'Create a video in my Kineo account'
  const statusTitle = 'Check a Kineo video job'
  const listTitle = 'List my recent Kineo videos'
  return [
    {
      name: TOOL_ACCOUNT,
      title: accountTitle,
      description:
        "Returns the signed-in person's Kineo plan, credit balance, whether they can render right now, and every available engine with the credits it costs per film length. " +
        'Read-only; call it before kineo_create_video to confirm the balance covers the chosen engine and length.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { title: accountTitle, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: TOOL_CREATE,
      title: createTitle,
      description:
        'Starts a REAL video render in the person\'s own Kineo account and spends their credits — the same rules, moderation and price as pressing Generate in Kineo Studio. ' +
        `Credits per engine and length: ${priceLine}. ` +
        'Send idea (a topic; Kineo writes the narration) or script (the exact narration, read verbatim). ' +
        'The call returns a job_id in under two minutes; the film itself takes several minutes, so tell the person it is rendering and call kineo_video_status with the job_id about once a minute until status is completed. ' +
        'If the account has no plan or not enough credits, nothing is charged and the response carries a link to the plans page. ' +
        'Pass the same idempotency_key when retrying the same request so the person is never charged twice. ' +
        `Formats: film renders now; product_ad, ugc_ad and kids_cartoon are not available through the connector yet and return a Kineo Studio link instead of charging.`,
      inputSchema: {
        type: 'object',
        properties: {
          idea: { type: 'string', maxLength: STUDIO_IDEA_MAX_CHARS, description: 'Topic or one-line brief. Kineo writes a narration sized for the length and engine.' },
          script: { type: 'string', maxLength: STUDIO_SCRIPT_MAX_CHARS, description: 'The full narration, read exactly as written. Use idea OR script.' },
          format: { type: 'string', enum: [...STUDIO_FORMATS], default: 'film', description: 'film = narrated short film (available now). Other formats return a Studio link without charging.' },
          engine: { type: 'string', enum: engines, default: STUDIO_DEFAULT_ENGINE, description: `Video engine: ${catalog.map((c) => `${c.engine} = ${c.label}`).join(', ')}. Use ${STUDIO_DEFAULT_ENGINE} unless the person names another.` },
          duration: { type: 'integer', enum: [...STUDIO_DURATIONS], default: STUDIO_DEFAULT_DURATION, description: `Film length in seconds. Allowed per engine: ${catalog.map((c) => `${c.engine}: ${c.durations.map((d) => d.seconds).join('/')}`).join('; ')}.` },
          language: { type: 'string', enum: [...NARRATION_LANGUAGE_CODES], default: 'en', description: 'Narration language code.' },
          aspect: { type: 'string', enum: [...STUDIO_ASPECTS], default: '9:16', description: '9:16 vertical for Shorts/TikTok/Reels unless the person asks for widescreen (16:9), square (1:1) or feed (4:5).' },
          script_mode: { type: 'string', enum: ['verbatim', 'ai'], description: 'verbatim = narrate the script word for word (default when script is sent); ai = let Kineo structure the text (default for idea).' },
          title: { type: 'string', maxLength: 120, description: 'Optional short title for the person\'s library.' },
          idempotency_key: { type: 'string', minLength: 8, maxLength: 120, description: 'Client-chosen key for this request. Repeating it returns the same job instead of charging again.' },
        },
        additionalProperties: false,
      },
      annotations: { title: createTitle, readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    {
      name: TOOL_STATUS,
      title: statusTitle,
      description:
        'Returns the state of a video job started with kineo_create_video: processing (with elapsed minutes), completed (with the video URL and the library link), failed (credits returned) or refunded. ' +
        'Poll about once a minute; most films finish within 3 to 15 minutes depending on the engine.',
      inputSchema: {
        type: 'object',
        properties: { job_id: { type: 'string', minLength: 8, maxLength: 100, description: 'The job_id returned by kineo_create_video.' } },
        required: ['job_id'],
        additionalProperties: false,
      },
      annotations: { title: statusTitle, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: TOOL_LIST,
      title: listTitle,
      description: `Lists the person's most recent Kineo videos (newest first, up to ${STUDIO_LIST_MAX}) with status, length, engine and video URL when ready. Read-only.`,
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: STUDIO_LIST_MAX, default: 5, description: 'How many videos to return.' } },
        additionalProperties: false,
      },
      annotations: { title: listTitle, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
  ]
}

// ─── Despachante ─────────────────────────────────────────────────────────────
export type StudioToolResult =
  | { ok: true; data: Record<string, unknown>; summary?: string }
  | { ok: false; error: string; details?: Record<string, unknown> }

export type StudioBalance = { credits: number; plan: string; canRender: boolean; reason?: string }

export type StudioDeps = {
  user: { id: string; email: string | null }
  pausedEngines: readonly string[]
  plansUrl: string
  /** Contagens para o teto por usuário; null = não deu para contar (create falha fechado, leituras seguem). */
  counts: (tool: string) => Promise<StudioCounts | null>
  balance: () => Promise<StudioBalance | null>
  account: () => Promise<StudioToolResult>
  createVideo: (input: CreateVideoInput, estimate: number) => Promise<StudioToolResult>
  videoStatus: (jobId: string) => Promise<StudioToolResult>
  listVideos: (limit: number) => Promise<StudioToolResult>
}

export type StudioTrace = { method: string | null; tool?: string; ok?: boolean; client?: string; protocol?: string; refused?: string; credits?: number }

function toolText(result: Record<string, unknown>, isError: boolean, summary?: string): Record<string, unknown> {
  const json = JSON.stringify(result, null, 1)
  return { content: [{ type: 'text', text: summary ? `${summary}\n\n${json}` : json }], structuredContent: result, ...(isError ? { isError: true } : {}) }
}
function toolError(message: string, details?: Record<string, unknown>): Record<string, unknown> {
  return toolText({ error: message, ...(details ?? {}) }, true, message)
}

async function callStudioTool(name: string, args: Record<string, unknown>, deps: StudioDeps): Promise<{ result: Record<string, unknown>; ok: boolean; refused?: string; credits?: number }> {
  const counts = await deps.counts(name)
  if (counts) {
    const limit = limitDecision(name, counts)
    if (!limit.ok) return { ok: false, refused: limit.reason, result: toolError(limit.message) }
  } else if (name === TOOL_CREATE) {
    return { ok: false, refused: 'counts_unavailable', result: toolError('Kineo could not check this account\'s limits right now. Try again in a minute; nothing was charged.') }
  }

  if (name === TOOL_ACCOUNT) {
    if (Object.keys(args).length) return { ok: false, result: toolError('kineo_account accepts no arguments.') }
    const r = await safe(() => deps.account())
    return r.ok ? { ok: true, result: toolText(r.data, false, r.summary) } : { ok: false, result: toolError(r.error, r.details) }
  }
  if (name === TOOL_LIST) {
    const raw = args.limit === undefined ? 5 : Number(args.limit)
    if (!Number.isInteger(raw) || raw < 1 || raw > STUDIO_LIST_MAX) return { ok: false, result: toolError(`limit must be an integer from 1 to ${STUDIO_LIST_MAX}.`) }
    const r = await safe(() => deps.listVideos(raw))
    return r.ok ? { ok: true, result: toolText(r.data, false, r.summary) } : { ok: false, result: toolError(r.error, r.details) }
  }
  if (name === TOOL_STATUS) {
    const jobId = typeof args.job_id === 'string' ? args.job_id.trim() : ''
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(jobId)) return { ok: false, result: toolError('job_id is required (the value returned by kineo_create_video).') }
    const r = await safe(() => deps.videoStatus(jobId))
    return r.ok ? { ok: true, result: toolText(r.data, false, r.summary) } : { ok: false, result: toolError(r.error, r.details) }
  }

  // kineo_create_video
  const v = validateCreateInput(args, deps.pausedEngines)
  if (!v.ok) return { ok: false, refused: 'invalid_input', result: toolError(v.error) }
  const input = v.value
  const estimate = estimateCredits(input.engine, input.duration)
  if (input.format !== 'film') {
    const studio = `${deps.plansUrl.replace(/\/pricing.*$/, '')}/studio?utm_source=claude_studio_connector&format=${input.format}`
    return {
      ok: false,
      refused: 'format_not_available',
      result: toolError(`${input.format} is not available through the connector yet. Nothing was charged. The person can make it in Kineo Studio: ${studio}`, { open_in_studio: studio, format: input.format }),
    }
  }
  const bal = await deps.balance()
  if (!bal) return { ok: false, refused: 'balance_unavailable', result: toolError('Kineo could not read this account\'s balance right now. Try again in a minute; nothing was charged.') }
  if (!bal.canRender || bal.credits < estimate) {
    const why = !bal.canRender && bal.reason ? bal.reason : `This film costs ${estimate} credits and the account has ${bal.credits}.`
    return {
      ok: false,
      refused: 'no_balance',
      result: toolError(`${why} Nothing was charged. Plans with more credits: ${deps.plansUrl}`, { plans_url: deps.plansUrl, credits_needed: estimate, credits_available: bal.credits, plan: bal.plan }),
    }
  }
  const r = await safe(() => deps.createVideo(input, estimate))
  if (!r.ok) return { ok: false, refused: typeof r.details?.reason === 'string' ? r.details.reason : 'create_failed', result: toolError(r.error, r.details) }
  const charged = typeof r.data.credits_charged === 'number' ? r.data.credits_charged : estimate
  return { ok: true, credits: charged, result: toolText(r.data, false, r.summary) }
}

async function safe(fn: () => Promise<StudioToolResult>): Promise<StudioToolResult> {
  try {
    return await fn()
  } catch {
    return { ok: false, error: 'Kineo could not complete this request right now. Try again in a minute.' }
  }
}

/** Uma mensagem JSON-RPC → uma resposta (null = notificação, a rota devolve 202). A autenticação já aconteceu na rota. */
export async function handleStudioMessage(msg: unknown, deps: StudioDeps): Promise<{ response: JsonRpcResponse | null; trace: StudioTrace }> {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    return { response: jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Invalid request: expected a JSON-RPC 2.0 object.'), trace: { method: null } }
  }
  const m = msg as Record<string, unknown>
  const hasId = 'id' in m && (typeof m.id === 'string' || typeof m.id === 'number')
  const id: JsonRpcId = hasId ? (m.id as string | number) : null
  const method = typeof m.method === 'string' ? m.method : null
  if (!method) {
    if ('result' in m || 'error' in m) return { response: null, trace: { method: null } }
    return { response: jsonRpcError(id, JSONRPC_INVALID_REQUEST, 'Invalid request: missing method.'), trace: { method: null } }
  }
  if (!hasId) return { response: null, trace: { method } }
  if (m.jsonrpc !== '2.0') return { response: jsonRpcError(id, JSONRPC_INVALID_REQUEST, 'Invalid request: jsonrpc must be "2.0".'), trace: { method } }
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
            serverInfo: { name: STUDIO_SERVER_NAME, title: STUDIO_SERVER_TITLE, version: STUDIO_SERVER_VERSION },
            instructions: STUDIO_INSTRUCTIONS,
          },
        },
        trace: { method, client, protocol: protocolVersion },
      }
    }
    case 'ping':
      return { response: { jsonrpc: '2.0', id, result: {} }, trace: { method } }
    case 'tools/list':
      return { response: { jsonrpc: '2.0', id, result: { tools: buildStudioTools({ pausedEngines: deps.pausedEngines }) } }, trace: { method } }
    case 'tools/call': {
      const name = typeof params.name === 'string' ? params.name : ''
      if (!(STUDIO_TOOL_NAMES as readonly string[]).includes(name)) {
        return { response: jsonRpcError(id, JSONRPC_INVALID_PARAMS, `Unknown tool: ${name.slice(0, 64) || '(none)'}. Available: ${STUDIO_TOOL_NAMES.join(', ')}.`), trace: { method, tool: name.slice(0, 64) } }
      }
      if (params.arguments !== undefined && (!params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments))) {
        return { response: jsonRpcError(id, JSONRPC_INVALID_PARAMS, 'Tool arguments must be an object.'), trace: { method, tool: name, ok: false } }
      }
      const args = (params.arguments ?? {}) as Record<string, unknown>
      const { result, ok, refused, credits } = await callStudioTool(name, args, deps)
      return { response: { jsonrpc: '2.0', id, result }, trace: { method, tool: name, ok, refused, credits } }
    }
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
