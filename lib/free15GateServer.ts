// KINEO-FILME15-PERFEITO-2610: provider adapters and signed CAS persistence.
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { cinematicValueHash, type CinematicClaim } from '@/lib/cinematic/claim'
import { cenasDoFilme, uuidFrom, filmSourceMetadata, FILM_SOURCE_EVENT } from '@/lib/freeRedo/core'
import { submitFalQueueOnce } from '@/lib/falQueue'
import { pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { scorePixel } from '@/lib/regua95/pixelScore'
import { refundRenderCredits } from '@/lib/credits/refund'
import { sanitizarObjetos15 } from '@/lib/cinematic/objetosSemTexto15'
import { FREE15_GATE_EVENT, FREE15_GATE_FAILED_EVENT, FREE15_GATE_VERSION, advanceFree15Gate, type GateState, type GateMedia, type GateOutcome } from '@/lib/free15Gate'

type Context = { db: SupabaseClient; secret: string; userId: string; renderId: string }
const gateId = (a: Context) => uuidFrom(`kineo:free15-gate:v1:${a.userId}:${a.renderId}`)
// Sign the JSON transport value, not optional undefined properties discarded by JSONB.
const sign = (a: Context, state: GateState) => createHmac('sha256', a.secret).update(cinematicValueHash([a.userId, a.renderId, JSON.parse(JSON.stringify(state))])).digest('hex')
type SignedState = { state: GateState; authority: string }
function verified(a: Context, raw: unknown): SignedState | null {
  const m = raw as Partial<SignedState> | null
  if (!m?.state || m.state.version !== FREE15_GATE_VERSION || typeof m.authority !== 'string' || !/^[a-f0-9]{64}$/.test(m.authority)) return null
  return timingSafeEqual(Buffer.from(sign(a, m.state), 'hex'), Buffer.from(m.authority, 'hex')) ? m as SignedState : null
}

export async function storeFree15Gate(a: Context & { state: GateState }): Promise<boolean> {
  const { error } = await a.db.from('events').insert({ id: gateId(a), name: FREE15_GATE_EVENT, user_id: a.userId, path: '/api/compose', session_id: a.renderId, metadata: { state: a.state, authority: sign(a, a.state) } })
  if (!error) return true
  if (error.code !== '23505') return false
  const old = await a.db.from('events').select('metadata').eq('id', gateId(a)).eq('user_id', a.userId).eq('name', FREE15_GATE_EVENT).maybeSingle()
  return !old.error && verified(a, old.data?.metadata) !== null
}

async function pollScene(model: string, requestId: string) {
  const key = process.env.FAL_KEY
  if (!key) throw new Error('fal_unconfigured')
  fal.config({ credentials: key })
  const st = await fal.queue.status(model, { requestId }) as unknown as { status?: string; request_id?: string; error?: unknown }
  if (st.request_id !== requestId) return { status: 'pending' as const }
  if (st.status === 'FAILED' || st.status === 'COMPLETED' && st.error) return { status: 'failed' as const }
  if (st.status !== 'COMPLETED') return { status: 'pending' as const }
  const result = await fal.queue.result(model, { requestId })
  const data = ((result as { data?: unknown }).data ?? result) as { video?: { url?: string }; output?: { video?: { url?: string } } }
  const url = data.video?.url ?? data.output?.video?.url
  return url?.startsWith('https://') ? { status: 'done' as const, url } : { status: 'failed' as const }
}

export async function runFree15Gate(a: Context & { claim: CinematicClaim; media: GateMedia }): Promise<GateOutcome> {
  let checked = false
  const outcome = await advanceFree15Gate({
    now: Date.now,
    read: async () => {
      const { data, error } = await a.db.from('events').select('metadata').eq('id', gateId(a)).eq('user_id', a.userId).eq('name', FREE15_GATE_EVENT).maybeSingle()
      if (error) throw new Error('gate_read_unavailable')
      const old = verified(a, data?.metadata)
      if (data && !old) throw new Error('gate_signature_invalid')
      return old?.state ?? null
    },
    move: async (previous, next) => {
      const { data, error } = await a.db.from('events').update({ metadata: { state: next, authority: sign(a, next) } })
        .eq('id', gateId(a)).eq('user_id', a.userId).eq('name', FREE15_GATE_EVENT).eq('metadata->>authority', sign(a, previous)).select('id').maybeSingle()
      return !error && data?.id === gateId(a)
    },
    judge: (media, state) => {
      checked = true
      return scorePixel(media.url, media.durationSeconds, {
      product: 'filme', engine: a.claim.engine, asked: state.context?.asked ?? '',
      narration: state.context?.narration ?? '', language: state.context?.language ?? '',
      ...(Array.isArray(state.source.elements) && state.source.elements.some(raw => {
        const el = raw as Record<string, unknown> | null
        return el?.type === 'text' && Number(el.track) === 9 && el.text === 'usekineo.com/free'
      }) ? { expectedKineoWatermark: true } : {}),
      }, { timeoutMs: 15_000, fps: typeof state.source.frame_rate === 'number' ? state.source.frame_rate : undefined, exactFrameTimes: true })
    },
    scenes: source => cenasDoFilme(a.claim, a.userId, source),
    submitScene: scene => {
      // Preserve signed I2V reference, scene duration, resolution and voice-free input.
      const instruction = 'Repair this shot: keep the exact reference character and subject. No readable text, letters, signs or captions in the image. '
      const input = { ...scene.input, prompt: instruction + sanitizarObjetos15(String(scene.input.prompt), true).slice(0, 6000 - instruction.length) }
      return submitFalQueueOnce(scene.model, input)
    },
    pollScene: (scene, requestId) => pollScene(scene.model, requestId),
    submitRender: submitCreatomateRender,
    pollRender: async id => {
      const result = await pollCreatomateRender(id)
      return { ...result, durationSeconds: result.exactDurationSeconds ?? null }
    },
  }, a.media)
  // Vision and asset migration each have their own request budget. Read the stored
  // terminal verdict on the NEXT poll instead of spending both budgets in one GET.
  if (checked) return { status: 'pending' }
  if (outcome.status !== 'pending' && outcome.source && outcome.media.url !== a.media.url) {
    const metadata = filmSourceMetadata({ ...a, generationId: a.claim.generationId, quality: a.claim.quality, source: outcome.source })
    if (!metadata) return { status: 'pending' }
    const saved = await a.db.from('events').upsert({
      id: uuidFrom(`kineo:free15-approved-source:v1:${a.userId}:${a.renderId}`), name: FILM_SOURCE_EVENT, user_id: a.userId,
      path: '/api/compose', session_id: a.claim.generationId, metadata,
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (saved.error) return { status: 'pending' }
  }
  return outcome
}

/** Confirm the idempotent refund in the ledger before exposing a failed film.
 * The birth claim stays attached to this compose: release would make retries look unpaid.
 */
export async function refundFailedFree15Gate(a: Context & { claim: CinematicClaim; reason: string }): Promise<number | null> {
  const reference = a.claim.resolutionReference
  if (!reference?.startsWith('cinematic-')) return null
  await refundRenderCredits(reference)
  const ledger = await a.db.from('credit_debits').select('amount, refunded_at').eq('render_id', reference).eq('user_id', a.userId).maybeSingle()
  if (ledger.error || !ledger.data?.refunded_at) return null
  const amount = Number(ledger.data.amount)
  if (!Number.isFinite(amount) || amount < 0) return null
  const event = await a.db.from('events').upsert({
    id: uuidFrom(`kineo:free15-gate-failed:v1:${a.userId}:${a.renderId}`), name: FREE15_GATE_FAILED_EVENT,
    user_id: a.userId, path: '/api/compose/status', session_id: a.renderId,
    metadata: { render_id: a.renderId, generation_id: a.claim.generationId, reason: a.reason, credits_refunded: amount, date: new Date().toISOString() },
  }, { onConflict: 'id', ignoreDuplicates: true })
  return event.error ? null : amount
}
