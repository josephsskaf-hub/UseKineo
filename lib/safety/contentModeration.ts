// KINEO-MODERACAO-2026-09-25 — a porta de moderação (servidor). A regra mora em ./moderationPolicy (pura).
//
// Usa o omni-moderation da OpenAI (gratuito, texto E imagem, várias línguas). Uma chamada por imagem (o endpoint aceita
// um texto e uma imagem por pedido). FALHA FECHADA: se a moderação não responde, nada é gerado nem cobrado e a pessoa lê
// "tente de novo em um minuto" — com o risco que motivou isto (menores), um minuto de indisponibilidade custa menos que um
// arquivo que não pode existir.
//
// Revisão adversarial de 25/09 (43 agentes): (1) UMA tentativa de 8 s, sem retry — timeout com retry dobra o pior caso e
// mata a função depois do débito (lib/openai.ts explica); (2) resposta sem as notas de sexual e sexual/minors é tratada como
// FORA DO AR, nunca como limpa; (3) erro 4xx do endpoint (imagem grande, formato, URL que ele não baixa) vira
// 'unprocessable' com frase própria — "tente em um minuto" para algo que nunca vai passar prendia a pessoa num laço;
// (4) toda falha que não é bloqueio grava content_moderation_unavailable, para a falha que se repete ser medida.
//
// Todo bloqueio vira o evento `content_moderation_blocked` (tabela events, só service_role lê): superfície, etapa, motivos,
// notas, conta, o texto truncado e a referência do arquivo quando há (meta.evidence) — é o rastro de que o fundador precisa.
// Nenhum arquivo bloqueado é apagado aqui (decisão de quarentena é do fundador).

import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { decideModeration, type ModerationDecision } from './moderationPolicy'

export type ModerationSurface =
  | 'images' | 'images_edit' | 'images_upscale' | 'animate' | 'gesture' | 'avatar' | 'avatar_scene' | 'clip' | 'character'
  | 'footage' | 'ads_brief' | 'ads_render'
export type ModerationStage = 'input' | 'output' | 'upload'

export type ModerationVerdict =
  | { ok: true }
  | { ok: false; reason: 'blocked'; decision: ModerationDecision }
  | { ok: false; reason: 'unavailable' | 'unprocessable'; error: string }

export const MODERATION_TIMEOUT_MS = 8_000

type ModerationInputPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
type ModerationResult = { flagged?: boolean; categories?: Record<string, boolean>; category_scores?: Record<string, number> }

class ModerationUnprocessable extends Error {}

async function callModeration(input: ModerationInputPart[]): Promise<ModerationResult> {
  let res: { results?: unknown[] }
  try {
    res = await openai.moderations.create(
      { model: 'omni-moderation-latest', input },
      { timeout: MODERATION_TIMEOUT_MS, maxRetries: 0 },
    )
  } catch (error) {
    const status = (error as { status?: unknown })?.status
    if (typeof status === 'number' && status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429) {
      throw new ModerationUnprocessable(`moderation ${status}: ${error instanceof Error ? error.message : String(error)}`)
    }
    throw error
  }
  const result = res.results?.[0] as ModerationResult | undefined
  const scores = result?.category_scores
  // Resposta sem as duas notas que decidem = não conferido. Falha FECHADA (revisão de 25/09: antes, virava "limpo").
  if (!result || typeof scores?.['sexual'] !== 'number' || typeof scores?.['sexual/minors'] !== 'number') {
    throw new Error('moderation returned no usable scores')
  }
  return result
}

/**
 * Confere um texto e/ou imagens. O texto vai numa chamada própria (e junto da 1ª imagem, para o modelo ler os dois juntos);
 * cada imagem extra, noutra. Barra se QUALQUER chamada barrar.
 */
export async function moderateContent(args: {
  surface: ModerationSurface
  stage: ModerationStage
  userId: string | null
  text?: string | null
  imageUrls?: string[]
  meta?: Record<string, unknown>
}): Promise<ModerationVerdict> {
  const text = (args.text ?? '').trim()
  const images = (args.imageUrls ?? []).filter((u) => typeof u === 'string' && u.length > 0)
  if (!text && images.length === 0) return { ok: true }
  const batches: ModerationInputPart[][] = []
  if (images.length === 0) batches.push([{ type: 'text', text: text.slice(0, 8000) }])
  images.forEach((url, i) => {
    const parts: ModerationInputPart[] = []
    if (i === 0 && text) parts.push({ type: 'text', text: text.slice(0, 8000) })
    parts.push({ type: 'image_url', image_url: { url } })
    batches.push(parts)
  })
  let worst: ModerationDecision | null = null
  try {
    for (const batch of batches) {
      const result = await callModeration(batch)
      const hasText = batch.some((p) => p.type === 'text')
      const hasImage = batch.some((p) => p.type === 'image_url')
      const decision = decideModeration(result, hasText ? text : null, { hasImage })
      if (decision.block && (!worst || (decision.minors && !worst.minors))) worst = decision
      if (worst?.minors) break
    }
  } catch (error) {
    // Um bloqueio já achado vale mais que a falha da chamada seguinte: barra (e registra) mesmo assim.
    if (!worst) {
      const unprocessable = error instanceof ModerationUnprocessable
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[moderation] ${unprocessable ? 'unprocessable' : 'unavailable'} surface=${args.surface} stage=${args.stage}:`, message)
      await writeServerEvent({
        name: 'content_moderation_unavailable',
        userId: args.userId,
        path: `/moderation/${args.surface}`,
        metadata: { surface: args.surface, stage: args.stage, reason: unprocessable ? 'unprocessable' : 'unavailable', error: message.slice(0, 200), image_count: images.length },
      }).catch(() => false)
      return { ok: false, reason: unprocessable ? 'unprocessable' : 'unavailable', error: message.slice(0, 200) }
    }
  }
  if (!worst) return { ok: true }
  console.warn(`[moderation] BLOCKED surface=${args.surface} stage=${args.stage} user=${(args.userId ?? 'anon').slice(0, 8)} reasons=${worst.reasons.join(',')}`)
  await writeServerEvent({
    name: 'content_moderation_blocked',
    userId: args.userId,
    path: `/moderation/${args.surface}`,
    metadata: {
      surface: args.surface,
      stage: args.stage,
      reasons: worst.reasons,
      minors: worst.minors,
      sexual_minors_score: Number(worst.sexualMinorsScore.toFixed(4)),
      sexual_score: Number(worst.sexualScore.toFixed(4)),
      text: text ? text.slice(0, 500) : null,
      image_count: images.length,
      // Referência do arquivo barrado (URL ou caminho), para o fundador achar a prova sem que a porta a apague.
      evidence: images.filter((u) => !u.startsWith('data:')).slice(0, 4),
      ...(args.meta ?? {}),
    },
  }).catch(() => false)
  return { ok: false, reason: 'blocked', decision: worst }
}
