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
import { cenaSemReferencia, referenciaDaCenaNoClaim } from '@/lib/cinematic/elencoTrava' // KINEO-ELENCO-TRAVA-0311 — a cena sem referência e a folha da cena, lidas do claim assinado
import { postarStillComFolha, lerStillComFolha } from '@/lib/cinematic/personagemAjusteServer' // KINEO-ELENCO-TRAVA-0311 — o MESMO edit, formato e moderação do still com folha da rota
import { CLASSIC_I2V } from '@/lib/classicSceneRetry' // KINEO-ELENCO-TRAVA-0311
import { kling4TrialEngineFromClaim } from '@/lib/kling4TrialClaim' // KINEO-GRATIS-REFAZ-CENA-0311 — o marcador do 1º filme grátis (nasce com 0 filmes e 0 débitos)
import { filmeGratisPermitido } from '@/lib/freeFilmPolicy' // KINEO-GRATIS-REFAZ-CENA-0311 — a lista de países do filme grátis (sem lista nova)
import { corrigirPrompt0311, TETO_PROMPT_STILL_0311, type RefazCena0311 } from '@/lib/free15RefazCena0311' // KINEO-GRATIS-REFAZ-CENA-0311

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

/**
 * KINEO-GRATIS-REFAZ-CENA-0311 [TRAVA 8.2 — fundador 03/11: "As 2 sim" — refazer a cena reprovada no 1º filme grátis]
 * A conta é a do 1º filme grátis de país rico? (1) o claim assinado traz o marcador kling4_trial — a rota só o grava quando a conta
 * NÃO paga, foi admitida ao filme grátis (trial/cota/região, todos já filtrados pela lista PAISES_FILME_GRATIS) e tinha 0 filmes e
 * 0 débitos cinematic (kling4TrialEligible); (2) o país do pedido gravado no marcador está na lista (filmeGratisPermitido: país
 * desconhecido = vale a admissão que já liberou o filme); (3) agora, no portão (antes do histórico deste render), a conta continua
 * com 0 vídeos não falhos. Qualquer erro de leitura = false (nunca refaz no escuro).
 */
export async function primeiroFilmeGratis0311(a: { db: SupabaseClient; userId: string; renderId: string; claim: Pick<CinematicClaim, 'response'> }): Promise<boolean> {
  if (kling4TrialEngineFromClaim(a.claim.response) === null) return false
  const marcador = a.claim.response?.kling4_trial as { country?: unknown } | undefined
  if (!filmeGratisPermitido(typeof marcador?.country === 'string' ? marcador.country : null)) return false
  const { count, error } = await a.db.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', a.userId).neq('status', 'failed').neq('render_id', a.renderId)
  return !error && count === 0
}

/** KINEO-GRATIS-REFAZ-CENA-0311 — a referência do still com a correção de época no prompt (sem relato: a referência de sempre). */
export const comCorrecaoNoStill0311 = (ref: { folhas: string[]; prompt: string } | null, refaz0311?: RefazCena0311) =>
  ref && refaz0311 ? { ...ref, prompt: corrigirPrompt0311(ref.prompt, refaz0311, TETO_PROMPT_STILL_0311) } : ref

/** KINEO-JUIZ-PERGUNTAS-0311 — o prompt completo de cada cena do claim assinado (Kling 4 grátis: o plano; clássico: o payload da fal). */
export function promptsDoClaim0311(response: unknown): string[] | null {
  const r = response && typeof response === 'object' ? response as Record<string, unknown> : null
  if (!r) return null
  const trial = r.kling4_trial && typeof r.kling4_trial === 'object' ? (r.kling4_trial as Record<string, unknown>).scene_plan : null
  const lista = Array.isArray(trial) && trial.length ? trial : Array.isArray(r.scene_fal_inputs) ? r.scene_fal_inputs : null
  if (!lista) return null
  const prompts = lista.map(x => x && typeof x === 'object' && typeof (x as Record<string, unknown>).prompt === 'string' ? (x as Record<string, unknown>).prompt as string : '')
  return prompts.some(Boolean) ? prompts : null
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
      // KINEO-JUIZ-PERGUNTAS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]
      // o prompt assinado de cada cena (época, sem gente, estilo) + as perguntas novas na MESMA chamada de visão. Um teto novo (época,
      // pessoa inventada, plano parado) cai em 'other_pixel_cap' do decideFree15Gate (falha honesta, sem refazer cena nova).
      ...(promptsDoClaim0311(a.claim.response) ? { promptByScene: promptsDoClaim0311(a.claim.response) as string[], perguntasHonestas: true } : {}), // sem as cenas assinadas: o contexto de sempre
      // KINEO-PORTAO-FREE15-2910 — causa do 'pixel_evidence_unverified' (22x desde 27/10): com 15 s o extrator de 8 quadros da fal
      // (nth-frame) estourava em vídeo mais pesado (Kling 4.0/1080p, ~20 s); caía na reserva de 3 quadros e o juiz não fechava as
      // 2 leituras (evidência 'incomplete', judged_frames 3/8, valid_readings 0/2, 22-32 s). Os completos levam 12-19 s. 25 s por etapa
      // (extração + juiz = no máximo 50 s) cabe no maxDuration 60 da rota de entrega.
      }, { timeoutMs: 25_000, fps: typeof state.source.frame_rate === 'number' ? state.source.frame_rate : undefined, exactFrameTimes: true })
    },
    scenes: source => cenasDoFilme(a.claim, a.userId, source),
    submitScene: (scene, imageUrl?: string) => { // KINEO-ELENCO-TRAVA-0311 — + o still refeito com a folha
      // Preserve signed I2V reference, scene duration, resolution and voice-free input.
      const instruction = 'Repair this shot: keep the exact reference character and subject. No readable text, letters, signs or captions in the image. '
      const input = { ...scene.input, prompt: instruction + sanitizarObjetos15(String(scene.input.prompt), true).slice(0, 6000 - instruction.length), ...(imageUrl && CLASSIC_I2V.has(scene.model) ? { image_url: imageUrl } : {}) } // KINEO-ELENCO-TRAVA-0311 — o still refeito com a folha vira o 1º quadro; o resto do payload assinado (e o prompt com a ficha) fica
      return submitFalQueueOnce(scene.model, input)
    },
    semReferencia: () => cenaSemReferencia(a.claim.response?.elenco_trava), // KINEO-ELENCO-TRAVA-0311
    submitStill: async (scene, refaz0311?: RefazCena0311) => { // KINEO-ELENCO-TRAVA-0311 — só cena i2v com folha no claim; sem folha = null (o portão refaz como sempre)
      const ref = comCorrecaoNoStill0311(referenciaDaCenaNoClaim(a.claim.response?.elenco_trava, scene.index), refaz0311) // KINEO-GRATIS-REFAZ-CENA-0311 — sem relato: a referência de sempre
      return ref && CLASSIC_I2V.has(scene.model) ? postarStillComFolha({ prompt: ref.prompt, imageUrls: ref.folhas, aspect: a.claim.response?.aspect }) : null
    },
    pollStill: async (scene, requestId, refaz0311?: RefazCena0311) => { // KINEO-ELENCO-TRAVA-0311
      const ref = comCorrecaoNoStill0311(referenciaDaCenaNoClaim(a.claim.response?.elenco_trava, scene.index), refaz0311) // KINEO-GRATIS-REFAZ-CENA-0311 — o MESMO prompt do envio
      return ref ? lerStillComFolha({ requestId, prompt: ref.prompt, imageUrls: ref.folhas, aspect: a.claim.response?.aspect, userId: a.userId }) : { status: 'failed' }
    },
    primeiroFilmeGratis0311: () => primeiroFilmeGratis0311(a), // KINEO-GRATIS-REFAZ-CENA-0311 — só chamado quando o juiz deu um teto novo com cena para refazer
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
