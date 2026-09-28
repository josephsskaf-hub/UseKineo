// KINEO-ADS-V2-2026-09-28 — envio e acompanhamento de cada plano do anúncio v2 na fal (etapa 2, servidor).
//
// ENVIO (especificação, seção 4, armadilha 6): um POST por plano, pelo lib/falQueue.ts (submitFalQueueOnce — dono
// único do retry, só repete 429). Corrida de 25 s: sem resposta nesse prazo o plano fica AMBÍGUO (a fal pode ter
// aceitado e cobrado). Ambíguo NUNCA é reenviado às cegas: o avanço espera até 20 min (se o POST responder tarde
// ainda nesta lambda, o request_id é gravado) e só então trata como falha. A disposição de toda falha vem de
// classifyProviderFailure (lib/cinematic/sceneDisposition.ts — só import; o arquivo mora na trava 8.2).
//
// ACOMPANHAMENTO: espelho de checkFalClip (app/api/cinematic-clip-status/route.ts): COMPLETED com erro = failed;
// 400/422 no result de um job COMPLETED confirmado = failed; qualquer outra dúvida = processing (nunca falha por
// erro de consulta — o job pago pode estar rodando).
//
// CÓPIA: o clipe pronto vai para o bucket renders (persistRenderAssets, renderId 'adsv2-<order>-p<i>-a<n>'); a URL
// da fal expira. Se a cópia devolver a própria URL da fal, a cópia FALHOU (não é sucesso). Duração MEDIDA no mvhd do
// MP4 (lib/mp4Duration.ts): o montador recusa trecho que passe do clipe medido.
import { fal } from '@fal-ai/client'
import { FalQueueSubmitError, submitFalQueueOnce } from '@/lib/falQueue'
import { classifyProviderFailure, type ReasonClass } from '@/lib/cinematic/sceneDisposition'
import { persistRenderAssets } from '@/lib/renderAssets'
import { probeMp4DurationSeconds } from '@/lib/mp4Duration'
import { alertFalExhausted, falErrorText, looksExhausted } from '@/lib/falAlert'

/** Prazo da corrida do POST à fal: passou disto sem request_id = ambíguo. */
export const ADS_V2_SUBMIT_RACE_MS = 25_000
/** Ambíguo (ou carimbo de envio sem desfecho) vira falha depois disto — nunca antes, nunca reenviando às cegas. */
export const ADS_V2_AMBIGUOUS_MAX_MS = 20 * 60 * 1000
/** Plano aceito sem ficar pronto depois disto = preso (lib/stuckScene.ts usa 20 min sem progresso). */
export const ADS_V2_SHOT_STUCK_MS = 20 * 60 * 1000
/** Clipe pronto na fal cuja cópia para o bucket não sai depois disto = falha de cópia. */
export const ADS_V2_COPY_MAX_MS = 30 * 60 * 1000
/** Concorrência moderada: Kling em série com pausa curta; os demais (Seedance, H3, Nano Banana) em lotes de 3. */
export const ADS_V2_KLING_GAP_MS = 450
export const ADS_V2_BATCH_SIZE = 3

export type AdsV2SubmitOutcome =
  | { kind: 'accepted'; requestId: string; posts: number }
  | { kind: 'ambiguous'; reasonClass: ReasonClass; posts: number; late: Promise<string | null> }
  | { kind: 'rejected'; reasonClass: ReasonClass; status: number | null; posts: number }

/** Um POST à fila da fal, com corrida de 25 s. Nunca lança. */
export async function submitShotOnce(
  model: string,
  input: Record<string, unknown>,
  ctx: { userId: string; orderId: string },
): Promise<AdsV2SubmitOutcome> {
  let posts = 0
  const settled = submitFalQueueOnce(model, input, () => { posts += 1 }).then(
    (id) => ({ ok: true as const, id }),
    (err: unknown) => ({ ok: false as const, err }),
  )
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), ADS_V2_SUBMIT_RACE_MS) })
  const first = await Promise.race([settled, timeout])
  if (timer) clearTimeout(timer)
  if (first === 'timeout') {
    // AMBÍGUO: o POST pode ter sido aceito. Se ele responder tarde (ainda nesta lambda), o chamador grava o id.
    return { kind: 'ambiguous', reasonClass: 'transport_timeout_5xx', posts, late: settled.then((r) => (r.ok ? r.id : null)) }
  }
  if (first.ok) return { kind: 'accepted', requestId: first.id, posts }
  const err = first.err
  if (err instanceof FalQueueSubmitError && err.status === null && !err.ambiguous) {
    // FAL_KEY ausente: nada saiu daqui (falha local, sem POST).
    return { kind: 'rejected', reasonClass: 'auth_model_access', status: null, posts }
  }
  const status = err instanceof FalQueueSubmitError ? err.status : null
  // Erro que não é da fila (rede do Node, bug) = ambíguo: o lado seguro é o que NÃO cria job duplicado.
  const ambiguous = err instanceof FalQueueSubmitError ? err.ambiguous : true
  const falLike = err as { status?: number | null; message?: string; providerBody?: unknown }
  const message = falErrorText(falLike)
  const c = classifyProviderFailure({ status, ambiguous, message })
  if (c.disposition === 'ambiguous') {
    return { kind: 'ambiguous', reasonClass: c.reason_class, posts, late: Promise.resolve(null) }
  }
  if (looksExhausted(falLike)) {
    await alertFalExhausted({ source: 'ads', engine: model, userId: ctx.userId, generationId: ctx.orderId, context: 'anúncio v2: a fal recusou o plano por saldo' })
  }
  return { kind: 'rejected', reasonClass: c.reason_class, status, posts }
}

export type AdsV2PollState = 'pending' | 'processing' | 'done' | 'failed'
export interface AdsV2Poll {
  state: AdsV2PollState
  url: string | null
}

function pollMessageSignal(detail: unknown): 'explicit_exhausted_balance' | 'other' {
  return typeof detail === 'string' && /\breason:\s*exhausted balance\b/i.test(detail) ? 'explicit_exhausted_balance' : 'other'
}

/** Espelho de checkFalClip. `pick` = onde está a URL no resultado (vídeo: video.url; imagem: images[0].url). */
export async function pollFalJob(model: string, requestId: string, pick: 'video' | 'image', ctx: { userId: string; orderId: string }): Promise<AdsV2Poll> {
  const falKey = process.env.FAL_KEY
  if (!falKey) return { state: 'processing', url: null }
  let stage: 'status' | 'result' = 'status'
  let idMatches = false
  try {
    fal.config({ credentials: falKey })
    const st = await fal.queue.status(model, { requestId })
    const status = (st as { status?: string }).status
    const finished = st as unknown as { request_id?: unknown; error?: unknown }
    idMatches = finished.request_id === requestId
    if (status === 'IN_QUEUE') return { state: 'pending', url: null }
    if (status === 'IN_PROGRESS') return { state: 'processing', url: null }
    if (status === 'COMPLETED') {
      const hasError = typeof finished.error === 'string' && finished.error.trim().length > 0
      if (idMatches && hasError) {
        if (pollMessageSignal(finished.error) === 'explicit_exhausted_balance') {
          await alertFalExhausted({ source: 'ads', engine: model, userId: ctx.userId, generationId: ctx.orderId, countRow: false })
        }
        return { state: 'failed', url: null }
      }
      if (!idMatches) return { state: 'processing', url: null }
      stage = 'result'
      const result = await fal.queue.result(model, { requestId })
      const data = ((result as { data?: unknown }).data ?? result) as {
        video?: { url?: string }
        output?: { video?: { url?: string } }
        images?: { url?: string }[]
      }
      const url = pick === 'video'
        ? (data?.video?.url ?? data?.output?.video?.url ?? null)
        : (Array.isArray(data?.images) ? data.images[0]?.url ?? null : null)
      return typeof url === 'string' && /^https:\/\//i.test(url) ? { state: 'done', url } : { state: 'processing', url: null }
    }
    if (status === 'FAILED' && idMatches) return { state: 'failed', url: null }
    return { state: 'processing', url: null }
  } catch (error) {
    const body = (error as { body?: { detail?: unknown } } | null)?.body
    if (pollMessageSignal(body?.detail) === 'explicit_exhausted_balance') {
      await alertFalExhausted({ source: 'ads', engine: model, userId: ctx.userId, generationId: ctx.orderId, countRow: false })
    }
    const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : null
    // Só um job COMPLETED com a identidade confirmada fecha por 400/422 no result. O resto é dúvida de consulta.
    if (stage === 'result' && idMatches && (status === 422 || status === 400)) return { state: 'failed', url: null }
    return { state: 'processing', url: null }
  }
}

/** Caminho do clipe no bucket renders: '<uid>/adsv2-<order>-p<i>-a<n>.mp4'. */
export function adsV2ShotRenderId(orderId: string, idx: number, attempt: number): string {
  return `adsv2-${orderId}-p${idx}-a${attempt}`
}

/** Mede um MP4 público pelo cabeçalho mvhd (sem ffprobe). null = não deu para medir. */
export async function measureRemoteMp4(url: string, timeoutMs = 30_000): Promise<number | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    if (!res.ok) return null
    const secs = probeMp4DurationSeconds(await res.arrayBuffer())
    return typeof secs === 'number' && Number.isFinite(secs) && secs > 0 ? secs : null
  } catch {
    return null
  }
}

/**
 * Copia o clipe pronto da fal para o bucket renders e mede. null = a cópia FALHOU (URL devolvida igual à da fal, ou
 * sem medida) — o avanço tenta de novo na próxima volta; passado ADS_V2_COPY_MAX_MS, o plano falha.
 */
export async function persistShotClip(args: { userId: string; orderId: string; idx: number; attempt: number; falUrl: string }): Promise<{ storedUrl: string; measuredSeconds: number } | null> {
  const res = await persistRenderAssets({
    userId: args.userId,
    renderId: adsV2ShotRenderId(args.orderId, args.idx, args.attempt),
    videoUrl: args.falUrl,
    snapshotUrl: null,
    downloadTimeoutMs: 60_000,
  })
  if (!res.videoUrl || res.videoUrl === args.falUrl) return null
  const measured = res.measuredSeconds ?? (await measureRemoteMp4(res.videoUrl))
  if (!(typeof measured === 'number' && measured > 0)) return null
  return { storedUrl: res.videoUrl, measuredSeconds: Math.round(measured * 1000) / 1000 }
}
