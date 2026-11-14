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
  | 'chatgpt_plugin'
  | 'images' | 'images_edit' | 'images_upscale' | 'animate' | 'gesture' | 'avatar' | 'avatar_scene' | 'clip' | 'character'
  | 'footage' | 'ads_brief' | 'ads_render' | 'images_reference'
  | 'spaces' // KINEO-ESPACOS-2026-09-30 — pedido do "Espaços" (o que vai dentro do espaço vazio)
  | 'estrela' // KINEO-ESTRELA-DO-FILME-2026-09-29 — still da estrela (Nano Banana Pro edit) conferido ANTES de virar âncora de cena
  | 'script' // KINEO-PRIMEIRO-FILME-2026-10-13 — o texto colado, antes da nova tentativa do roteirista que recusou (/api/generate-script)
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

// ═══ KINEO-MODERACAO-DOWNLOAD-1411 [CEO 14/11, pedido 5] — o moderador não conseguiu BAIXAR a foto: tenta mais uma vez antes de recusar ═════
// Caso: 14/11 04:12:17 UTC, POST /api/recreate/seu-video → 422 moderation_unprocessable, "moderation 400: 400 Failed to download image". A
// mesma foto tinha passado 25 s antes e passou depois: a falha era do download DELES, não da foto. Em 7 dias, 2 eventos (1 de cliente).
// Agora, SÓ nesse erro (4xx com "failed to download"): UMA segunda chamada, com a imagem baixada por NÓS e mandada em base64 (o endpoint aceita
// `image_url.url` como URL ou como data URL — o mesmo formato que outras superfícies já mandam). Só baixamos de onde a casa guarda mídia (o
// nosso Storage) ou do fornecedor (fal.media), até 8 MB e em 4 s; fora disso, a 2ª chamada repete a URL. Falhou de novo por download = FORA DO
// AR (unavailable, "tente de novo"), não "esta imagem não serve" (unprocessable). Timeout, 5xx e os outros 4xx seguem como antes: uma chamada,
// sem retry (a regra da revisão de 25/09). Pior caso a mais: 4 s do nosso download + 8 s da 2ª chamada, só depois de um 400 de download.
export const MODERATION_DOWNLOAD_ERROR = /fail(?:ed|ure)? to download|could ?n[o']t download|unable to download|error (?:while )?downloading|timed? ?out (?:while )?downloading/i
export const MODERATION_RESCUE_MAX_BYTES = 8 * 1024 * 1024
export const MODERATION_RESCUE_FETCH_MS = 4_000
class ModerationDownloadFailed extends Error {}

/** O erro é o moderador dizendo que não conseguiu baixar a imagem? */
export function moderationDownloadFailure(error: unknown): boolean {
  return error instanceof ModerationUnprocessable && MODERATION_DOWNLOAD_ERROR.test(error.message)
}

/** Só baixamos para resgate o que já é mídia da casa: o nosso Storage ou a entrega do fornecedor. */
export function moderationRescueHost(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const nosso = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname } catch { return '' } })()
    return (nosso !== '' && u.hostname === nosso) || u.hostname === 'fal.media' || u.hostname.endsWith('.fal.media')
  } catch {
    return false
  }
}

async function imageAsDataUrl(url: string): Promise<string | null> {
  if (!moderationRescueHost(url)) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(MODERATION_RESCUE_FETCH_MS), cache: 'no-store' })
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!res.ok || !/^image\/(?:jpeg|png|webp|gif)$/.test(type)) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > MODERATION_RESCUE_MAX_BYTES) return null
    return `data:${type};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

/** Uma chamada; se o moderador não baixou a imagem, UMA segunda (em base64 quando dá). `onRescue` avisa o desfecho para o evento. */
async function callModerationWithRescue(input: ModerationInputPart[], onRescue?: (outcome: 'ok' | 'failed', inline: number) => Promise<void>): Promise<ModerationResult> {
  try {
    return await callModeration(input)
  } catch (error) {
    if (!moderationDownloadFailure(error)) throw error
    let inline = 0
    const again = await Promise.all(input.map(async (part): Promise<ModerationInputPart> => {
      if (part.type !== 'image_url' || part.image_url.url.startsWith('data:')) return part
      const data = await imageAsDataUrl(part.image_url.url)
      if (data) inline += 1
      return data ? { type: 'image_url', image_url: { url: data } } : part
    }))
    try {
      const result = await callModeration(again)
      await onRescue?.('ok', inline).catch(() => {})
      return result
    } catch (second) {
      await onRescue?.('failed', inline).catch(() => {})
      if (moderationDownloadFailure(second)) throw new ModerationDownloadFailed(`moderation image download failed twice: ${second instanceof Error ? second.message : String(second)}`)
      throw second
    }
  }
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
  omitEvidenceText?: boolean
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
      const result = await callModerationWithRescue(batch, (outcome, inline) => writeServerEvent({ name: 'content_moderation_download_retry', userId: args.userId, path: `/moderation/${args.surface}`, metadata: { surface: args.surface, stage: args.stage, outcome, inline_images: inline } }).then(() => undefined)) // KINEO-MODERACAO-DOWNLOAD-1411 — era: await callModeration(batch)
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
      text: args.omitEvidenceText ? null : text ? text.slice(0, 500) : null,
      image_count: images.length,
      // Referência do arquivo barrado (URL ou caminho), para o fundador achar a prova sem que a porta a apague.
      evidence: images.filter((u) => !u.startsWith('data:')).slice(0, 4),
      ...(args.meta ?? {}),
    },
  }).catch(() => false)
  return { ok: false, reason: 'blocked', decision: worst }
}
