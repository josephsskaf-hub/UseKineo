// KINEO-MCP-CLAUDE-2026-09-29 — a tool create_video_handoff do conector do
// Claude. É a MESMA sequência de app/api/gpt/handoff/route.ts (a ação do GPT),
// com três diferenças, e só três:
//   1. canal 'claude_connector' (etiquetas próprias, linha e hash próprios);
//   2. o teto por IP não vale para a rede de saída da Anthropic
//      (lib/mcp/kineoMcp.ts isAnthropicEgressIp) — todo usuário do Claude chega
//      por ela; o teto global continua valendo para todos;
//   3. devolve { ok, data | error } em vez de HTTP — quem vira resposta MCP é
//      a despachante.
// Mesma validação (validateHandoffInput), mesma régua e mesmo veredito
// (estimateHandoff/handoffOutcome), mesma recusa por motor
// (handoffEngineRefusal), mesmos eventos (gpt_handoff_created/_refused com
// channel). Nada aqui cria conta, debita crédito ou chama fornecedor.
import { randomBytes } from 'crypto'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  GO_PATH_PREFIX,
  HANDOFF_TTL_MS,
  RATE_LIMIT_GLOBAL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
  STUDIO_PROMPT_MAX_CHARS,
  describeFit,
  describeOutcome,
  estimateHandoff,
  handoffOutcome,
  handoffPayloadHash,
  validateHandoffInput,
  type HandoffChannel,
} from '@/lib/gptHandoff'
import {
  countRecentHandoffs,
  findHandoffByPayloadHash,
  hashIp,
  insertHandoff,
  refreshHandoffExpiry,
} from '@/lib/gptHandoffStore'
import { describeEngineRefusal, handoffEngineRefusal } from '@/lib/gptHandoffEngineGuard'
import { isAnthropicEgressIp, type HandoffToolResult } from '@/lib/mcp/kineoMcp'

export type ConnectorContext = {
  ip: string | null
  userAgent: string | null
  /** Origem pública (handoffPublicOrigin) — o link sai no domínio canônico. */
  origin: string
  channel?: Extract<HandoffChannel, 'claude_connector' | 'chatgpt_plugin'>
  rateLimitKey?: string
  checkContent?: (script: string) => Promise<string | null>
}

export async function createConnectorHandoff(args: Record<string, unknown>, ctx: ConnectorContext): Promise<HandoffToolResult> {
  const CHANNEL = ctx.channel ?? 'claude_connector'
  const chatgpt = CHANNEL === 'chatgpt_plugin'
  const EVENT_PATH = chatgpt ? '/api/mcp/chatgpt' : '/api/mcp'
  const validated = validateHandoffInput(args)
  if (!validated.ok) return { ok: false, error: validated.error }
  const input = validated.value

  const ipHash = hashIp(chatgpt ? ctx.rateLimitKey ?? 'chatgpt:unknown' : ctx.ip)
  const viaAnthropic = !chatgpt && isAnthropicEgressIp(ctx.ip)
  const counts = await countRecentHandoffs(viaAnthropic ? null : ipHash)
  if (chatgpt && !counts) return { ok: false, error: 'Kineo could not check script limits. Try again in a minute.' }
  if (counts && !viaAnthropic && ipHash && counts.ip >= RATE_LIMIT_PER_IP_PER_HOUR) {
    return { ok: false, error: 'Too many scripts from this connection in the last hour. Try again in a few minutes.' }
  }
  if (counts && counts.global >= RATE_LIMIT_GLOBAL_PER_HOUR) {
    return { ok: false, error: 'Kineo is receiving a lot of scripts right now. Try again in a few minutes.' }
  }

  const est = estimateHandoff(input.script, input.durationSec, input.engineHint)
  const outcome = handoffOutcome(input.script, input.durationSec, input.engineHint)
  if (outcome.kind === 'too_short') {
    return { ok: false, error: describeOutcome(outcome), details: { outcome, words: est.words } }
  }
  const engineRefusal = handoffEngineRefusal({ script: input.script, engineHint: input.engineHint, language: input.language })
  if (engineRefusal) {
    await writeServerEvent({ name: 'gpt_handoff_refused', path: EVENT_PATH, metadata: { channel: CHANNEL, ...engineRefusal, engine_hint: input.engineHint, duration_sec: input.durationSec } })
    return { ok: false, error: describeEngineRefusal(engineRefusal), details: { refusal: engineRefusal } }
  }

  if (chatgpt) {
    if (!ctx.checkContent) return { ok: false, error: 'Script safety review is unavailable. Try again in a minute.' }
    const refusal = await ctx.checkContent(input.topic ? `${input.topic}\n\n${input.script}` : input.script)
    if (refusal) return { ok: false, error: refusal }
  }

  const payloadHash = handoffPayloadHash(input, CHANNEL)
  let token: string
  let expiresAt: string
  let reused = false
  const existing = await findHandoffByPayloadHash(payloadHash)
  if (existing) {
    token = existing.token
    expiresAt = existing.expires_at
    reused = true
    const fresh = new Date(Date.now() + HANDOFF_TTL_MS).toISOString()
    if (await refreshHandoffExpiry(token, fresh)) expiresAt = fresh
  } else {
    token = randomBytes(18).toString('base64url')
    expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString()
    const inserted = await insertHandoff({
      token,
      script: input.script,
      duration_sec: input.durationSec,
      aspect: input.aspect,
      engine_hint: input.engineHint,
      language: input.language,
      topic: input.topic,
      words: est.words,
      seconds: est.seconds,
      fit: est.fit,
      expires_at: expiresAt,
      ip_hash: ipHash,
      user_agent: (ctx.userAgent ?? '').slice(0, 400) || null,
      channel: CHANNEL,
      payload_hash: payloadHash,
    })
    if (!inserted.ok) {
      const again = inserted.duplicate ? await findHandoffByPayloadHash(payloadHash) : null
      if (!again) {
        console.error('[mcp-handoff] insert failed:', inserted.error)
        return { ok: false, error: 'Kineo could not save the script right now. Try again in a minute.' }
      }
      token = again.token
      expiresAt = again.expires_at
      reused = true
      const freshAgain = new Date(Date.now() + HANDOFF_TTL_MS).toISOString()
      if (await refreshHandoffExpiry(token, freshAgain)) expiresAt = freshAgain
    }
  }

  await writeServerEvent({
    name: 'gpt_handoff_created',
    path: EVENT_PATH,
    metadata: {
      words: est.words,
      seconds: est.seconds,
      fit: est.fit,
      family: est.family,
      duration_sec: input.durationSec,
      engine_hint: input.engineHint,
      aspect: input.aspect,
      language: input.language,
      has_topic: Boolean(input.topic),
      script_chars: input.script.length,
      markers_found: est.markersFound,
      outcome: outcome.kind,
      effective_seconds: outcome.effectiveSeconds,
      over_studio_limit: input.script.length > STUDIO_PROMPT_MAX_CHARS,
      bot: false,
      channel: CHANNEL,
      via_anthropic: viaAnthropic,
      reused,
    },
  })

  return {
    ok: true,
    data: {
      url: `${ctx.origin}${GO_PATH_PREFIX}${token}`,
      expiresAt,
      ...(chatgpt ? { script: input.script } : {}),
      words: est.words,
      seconds: est.seconds,
      fitMessage: describeFit(est, input.durationSec),
      outcome,
      outcomeMessage: describeOutcome(outcome),
      durationSec: input.durationSec,
      engineHint: input.engineHint,
      aspect: input.aspect,
      language: input.language,
      overStudioLimit: input.script.length > STUDIO_PROMPT_MAX_CHARS,
      studioLimitChars: STUDIO_PROMPT_MAX_CHARS,
    },
  }
}
