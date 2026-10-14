// KINEO-MODERACAO-1410 [TRAVA 8.2 — vai do fundador 14/10] — a porta ÚNICA da régua completa do texto do cliente (servidor).
// A regra mora em ./topicPolicy (pura). Quem chama (as 5 portas de texto):
//   app/api/generate-script (a ideia, antes do escritor) · app/api/analyze-idea (a ideia ou o roteiro, antes do plano de cenas;
//   todo filme do /generate e do /studio passa aqui antes de /api/generate-video-cinematic) · app/api/ads/v2/orders (a frase e a
//   cena do Studio Ads, ao criar o rascunho) · lib/clips/clipServer (o pedido dos Clipes) · app/api/generate-clip ("só este clipe").
//
// FORA DO AR = FALHA ABERTA, de propósito: estas portas não tinham esta checagem até hoje, e a régua sexual que já existia
// (lib/safety/contentModeration, falha FECHADA) continua onde estava, intocada. A falha vira content_moderation_unavailable
// (layer 'topic') para ser medida. UMA tentativa de 8 s, sem retry (a mesma razão da porta de 25/09).
//
// Rastro: bloqueio = content_moderation_blocked (layer 'topic', categorias, notas, modo, texto truncado);
// modo log_only = content_moderation_would_block (o mesmo conteúdo, nada barrado).

import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { resolveNarrationLanguage } from '@/lib/textLanguage'
import {
  decideTopicModeration,
  topicBlockedMessage,
  topicModerationMode,
  MODERACAO_1410_VERSAO,
  TOPIC_BLOCKED_REASON,
  TOPIC_BLOCKED_STATUS,
  type TopicCategory,
  type TopicModerationMode,
} from './topicPolicy'

export type TopicEntry = 'generate-script' | 'analyze-idea' | 'ads-v2-orders' | 'clips' | 'generate-clip'

export type TopicVerdict =
  | { ok: true; mode: TopicModerationMode; wouldBlock: TopicCategory[]; unavailable: boolean }
  | { ok: false; status: number; reason: typeof TOPIC_BLOCKED_REASON; category: TopicCategory; categories: TopicCategory[]; message: string }

export const TOPIC_MODERATION_TIMEOUT_MS = 8_000

export async function moderateTopic(args: {
  entry: TopicEntry
  userId: string | null
  text: string | null | undefined
  language?: string | null
  meta?: Record<string, unknown>
}): Promise<TopicVerdict> {
  const mode = topicModerationMode(process.env.KINEO_MODERACAO_COMPLETA)
  const text = (args.text ?? '').trim()
  if (mode === 'off' || !text) return { ok: true, mode, wouldBlock: [], unavailable: false }
  const base = { entry: args.entry, layer: 'topic', version: MODERACAO_1410_VERSAO, mode }
  let result: { category_scores?: Record<string, number> } | undefined
  try {
    const res = await openai.moderations.create(
      { model: 'omni-moderation-latest', input: text.slice(0, 8000) },
      { timeout: TOPIC_MODERATION_TIMEOUT_MS, maxRetries: 0 },
    )
    result = res.results?.[0] as unknown as { category_scores?: Record<string, number> } | undefined
    if (!result || typeof result.category_scores?.['violence/graphic'] !== 'number') throw new Error('moderation returned no usable scores')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[moderation] topic unavailable entry=${args.entry} (fail open):`, message)
    await writeServerEvent({
      name: 'content_moderation_unavailable',
      userId: args.userId,
      path: `/moderation/topic/${args.entry}`,
      metadata: { ...base, surface: args.entry, stage: 'input', reason: 'unavailable', fail: 'open', error: message.slice(0, 200) },
    }).catch(() => false)
    return { ok: true, mode, wouldBlock: [], unavailable: true }
  }
  const decision = decideTopicModeration(result, text)
  if (decision.categories.length === 0) return { ok: true, mode, wouldBlock: [], unavailable: false }
  const metadata = { ...base, surface: args.entry, stage: 'input', reasons: decision.categories, minors: decision.categories.includes('sexual_minors'), scores: decision.scores, text: text.slice(0, 500), ...(args.meta ?? {}) }
  if (mode === 'log_only') {
    console.warn(`[moderation] topic WOULD BLOCK entry=${args.entry} user=${(args.userId ?? 'anon').slice(0, 8)} reasons=${decision.categories.join(',')}`)
    await writeServerEvent({ name: 'content_moderation_would_block', userId: args.userId, path: `/moderation/topic/${args.entry}`, metadata }).catch(() => false)
    return { ok: true, mode, wouldBlock: decision.categories, unavailable: false }
  }
  console.warn(`[moderation] topic BLOCKED entry=${args.entry} user=${(args.userId ?? 'anon').slice(0, 8)} reasons=${decision.categories.join(',')}`)
  await writeServerEvent({ name: 'content_moderation_blocked', userId: args.userId, path: `/moderation/topic/${args.entry}`, metadata }).catch(() => false)
  const category = decision.categories[0]
  return {
    ok: false,
    status: TOPIC_BLOCKED_STATUS,
    reason: TOPIC_BLOCKED_REASON,
    category,
    categories: decision.categories,
    // A língua pedida vence; sem ela (ou en), a do próprio texto quando é clara — quem escreve em português lê em português.
    message: topicBlockedMessage(category, resolveNarrationLanguage(args.language, text).language),
  }
}
