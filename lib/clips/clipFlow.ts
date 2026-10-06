// KINEO-CLIPES-2026-09-29 — o FLUXO do clipe, com as dependências injetadas (banco, fal, moderação, débito, bucket).
//
// Por que injetado: a ordem é o contrato de dinheiro, e o guardião (scripts/test-clipes-2026-09-29.mjs) EXECUTA este
// arquivo com dependências falsas para provar a ordem — não procura texto. As rotas (app/api/clips/*) só ligam os fios
// reais (lib/clips/clipServer.ts).
//
// CONTRATO DO PEDIDO (submitClip):
//   1. forma (motor, modo, duração oferecida, formato, texto, posse da foto) — nada custa;
//   2. motor visível para a conta (pausa, lançamento, plano) — nada custa;
//   3. replay pela chave de idempotência: o mesmo pedido devolve a MESMA linha, nunca um segundo débito;
//   4. teto de clipes em andamento por conta;
//   5. a foto existe e é JPG/PNG de verdade (a URL própria sozinha não prova os bytes);
//   6. MODERAÇÃO do texto e da foto — ANTES de qualquer débito;
//   7. saldo;
//   8. a linha nasce `pending` (UNIQUE user_id+idempotency_key é a trava contra dois débitos do mesmo pedido);
//   9. débito com chave determinística clips-<uuid> (o RPC é idempotente por chave). NÃO é o clip-<uuid> do Modo Clipe
//      do Studio (/api/generate-clip), que grava em `videos` e fica na varredura genérica;
//  10. envio à fila da fal (uma tentativa, sem retry do POST pago);
//  11. qualquer falha depois do débito ESTORNA (refund_render_credits é idempotente: UPDATE … WHERE refunded_at IS NULL)
//      e fecha a linha como `failed`.
//
// CONTRATO DA ENTREGA (settleClip): o MP4 vai para o NOSSO bucket ANTES de a linha virar `done` (a URL da fal expira —
// CLAUDE.md 17/08); falha terminal do fornecedor, envio perdido ou prazo vencido ESTORNAM e fecham `failed`; toda
// mudança de estado é condicional (só quem move a linha grava o evento), então duas abas e o cron juntos nunca
// entregam nem estornam duas vezes.
import {
  CLIP_ENGINES,
  validateClipRequest,
  buildClipFalInput,
  type ClipEngineKey,
  type ClipEngineAccess,
  type ClipRequest,
  type ClipRequestInput,
} from './clipCatalog'
import { clipCreditCost, clipFalUsd } from './clipPricing'
import { clipEffectEventMetadata, clipEffectForRow } from './clipEffects'

/** Pedido sem request_id da fal há mais que isto = o envio morreu no meio; estorna. */
export const CLIP_PENDING_STALE_MS = 10 * 60 * 1000
/** Clipe único leva minutos; acima disto o fornecedor não entrega mais (e a URL já teria expirado). */
export const CLIP_EXPIRE_MS = 6 * 60 * 60 * 1000
/** Clipes em andamento por conta. */
export const CLIP_MAX_ACTIVE = 3

export type ClipStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface ClipRow {
  id: string
  user_id: string
  idempotency_key: string
  fingerprint: string
  billing_reference: string
  engine: ClipEngineKey
  mode: 'text' | 'image'
  model: string
  seconds: number
  aspect: string
  prompt: string
  image_url: string | null
  credits: number
  fal_usd: number
  status: ClipStatus
  fal_request_id: string | null
  video_url: string | null
  failure_reason: string | null
  credits_refunded: number
  created_at: string
}

export type ModerationOutcome = { ok: true } | { ok: false; reason: 'blocked' | 'unavailable' | 'unprocessable'; status: number; message: string }

export interface ClipSubmitDeps {
  supabaseUrl: string
  engineAccess(engine: ClipEngineKey): ClipEngineAccess
  findByKey(userId: string, key: string): Promise<ClipRow | null>
  countActive(userId: string): Promise<number>
  verifyImage(url: string): Promise<void>
  moderate(args: { text: string; imageUrls: string[] }): Promise<ModerationOutcome>
  getBalance(userId: string): Promise<number>
  newId(): string
  insertPending(row: ClipRow): Promise<{ ok: true } | { ok: false; conflict: boolean; error?: string }>
  debit(billingReference: string, credits: number): Promise<{ ok: true; balance: number } | { ok: false; error: string }>
  refund(billingReference: string): Promise<number>
  submit(model: string, input: Record<string, unknown>): Promise<{ ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }>
  markSubmitted(id: string, requestId: string): Promise<boolean>
  markFailed(id: string, reason: string, refunded: number): Promise<boolean>
  event(name: 'clip_requested' | 'clip_failed', metadata: Record<string, unknown>): Promise<void>
  now(): number
}

export type ClipSubmitResult =
  | { ok: true; status: number; clip: ClipRow; replay: boolean; balance: number | null }
  | { ok: false; status: number; code: string; error: string; balance?: number; clip?: ClipRow }

export const VALID_CLIP_KEY = /^[A-Za-z0-9._:-]{8,100}$/

/** Impressão digital do pedido: mesma chave com outro conteúdo = conflito, não replay. */
export function clipFingerprint(req: ClipRequest): string {
  return JSON.stringify([req.engine, req.mode, req.seconds, req.aspect, req.prompt, req.imageUrl ?? ''])
}

export function clipTelemetry(row: Pick<ClipRow, 'engine' | 'seconds' | 'mode' | 'credits' | 'id'>): Record<string, unknown> {
  // Sem dado pessoal: nada de texto, foto ou e-mail — só a forma do pedido.
  return { clip_id: row.id, engine: row.engine, seconds: row.seconds, with_image: row.mode === 'image', credits: row.credits }
}

export async function submitClip(
  deps: ClipSubmitDeps,
  args: { userId: string; idempotencyKey: string; body: ClipRequestInput },
): Promise<ClipSubmitResult> {
  if (!VALID_CLIP_KEY.test(args.idempotencyKey)) {
    return { ok: false, status: 400, code: 'idempotency', error: 'A valid request key is required. Please try again.' }
  }
  const checked = validateClipRequest(args.body, { userId: args.userId, supabaseUrl: deps.supabaseUrl })
  if (!checked.ok) return { ok: false, status: checked.status, code: checked.code, error: checked.error }
  const req = checked.request

  const access = deps.engineAccess(req.engine)
  if (!access.ok) {
    const label = CLIP_ENGINES[req.engine].label
    const error = access.reason === 'paused'
      ? `${label} is temporarily paused for maintenance. Nothing was charged.`
      : access.reason === 'plan'
        ? `${label} clips are part of the Studio plan. Nothing was charged.`
        // KINEO-S25-CLIPES-2026-10-06 — mesma frase da recusa do filme do 2.5: o que falta (qualquer plano pago) e que nada foi cobrado.
        : access.reason === 'paid'
          ? `${label} is available on paid plans. Pick any plan to use it — nothing was charged.`
          : 'Choose one of the listed engines.'
    return { ok: false, status: access.status, code: `engine_${access.reason}`, error }
  }

  const fingerprint = clipFingerprint(req)
  const existing = await deps.findByKey(args.userId, args.idempotencyKey)
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return { ok: false, status: 409, code: 'idempotency_conflict', error: 'This request key was already used for a different clip.' }
    }
    return { ok: true, status: 200, clip: existing, replay: true, balance: null }
  }

  if ((await deps.countActive(args.userId)) >= CLIP_MAX_ACTIVE) {
    return { ok: false, status: 429, code: 'too_many_active', error: `You already have ${CLIP_MAX_ACTIVE} clips in progress. Wait for one to finish.` }
  }

  if (req.imageUrl) {
    try {
      await deps.verifyImage(req.imageUrl)
    } catch {
      return { ok: false, status: 400, code: 'image', error: 'We could not read your photo. Upload a JPG or PNG again.' }
    }
  }

  const safety = await deps.moderate({ text: req.prompt, imageUrls: req.imageUrl ? [req.imageUrl] : [] })
  if (!safety.ok) {
    return { ok: false, status: safety.status, code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, error: safety.message }
  }

  const credits = clipCreditCost(req.engine, req.seconds, req.mode === 'i2v')
  const balance = await deps.getBalance(args.userId)
  if (balance < credits) {
    return { ok: false, status: 402, code: 'credits', error: `This clip costs ${credits} credits. You have ${balance}. Not enough credits.`, balance }
  }

  const id = deps.newId()
  const row: ClipRow = {
    id,
    user_id: args.userId,
    idempotency_key: args.idempotencyKey,
    fingerprint,
    billing_reference: `clips-${id}`,
    engine: req.engine,
    mode: req.mode === 'i2v' ? 'image' : 'text',
    model: req.model,
    seconds: req.seconds,
    aspect: req.aspect,
    prompt: req.prompt,
    image_url: req.imageUrl,
    credits,
    fal_usd: clipFalUsd(req.engine, req.seconds, req.mode === 'i2v'),
    status: 'pending',
    fal_request_id: null,
    video_url: null,
    failure_reason: null,
    credits_refunded: 0,
    created_at: new Date(deps.now()).toISOString(),
  }
  const inserted = await deps.insertPending(row)
  if (!inserted.ok) {
    if (inserted.conflict) {
      const winner = await deps.findByKey(args.userId, args.idempotencyKey)
      if (winner && winner.fingerprint === fingerprint) return { ok: true, status: 200, clip: winner, replay: true, balance: null }
      return { ok: false, status: 409, code: 'idempotency_conflict', error: 'This request key was already used for a different clip.' }
    }
    return { ok: false, status: 503, code: 'storage', error: 'We could not start your clip right now. Nothing was charged — please try again.' }
  }

  const closeWithRefund = async (reason: string, status: number, error: string): Promise<ClipSubmitResult> => {
    const refunded = await deps.refund(row.billing_reference)
    await deps.markFailed(row.id, reason, refunded)
    await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'submit' })
    return {
      ok: false,
      status,
      code: reason,
      error: refunded > 0 ? `${error} Your ${refunded} credits were refunded.` : `${error} You were not charged.`,
      clip: { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded },
    }
  }

  const debit = await deps.debit(row.billing_reference, credits)
  if (!debit.ok) {
    // O RPC pode ter gravado o débito e perdido a resposta: o estorno pela mesma chave cobre os dois casos.
    const out = await closeWithRefund('debit_failed', 402, 'Not enough credits to start this clip.')
    return out
  }

  const sent = await deps.submit(req.model, buildClipFalInput(req))
  if (!sent.ok) {
    return closeWithRefund(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected', 502, 'The engine could not accept this clip.')
  }

  let saved = await deps.markSubmitted(row.id, sent.requestId)
  if (!saved) saved = await deps.markSubmitted(row.id, sent.requestId)
  await deps.event('clip_requested', { ...clipTelemetry(row), request_id: sent.requestId, tracking_saved: saved })
  const clip: ClipRow = saved ? { ...row, status: 'processing', fal_request_id: sent.requestId } : row
  return { ok: true, status: 202, clip, replay: false, balance: debit.balance }
}

// ─── Entrega ─────────────────────────────────────────────────────────────────
export type ProviderState =
  | { state: 'queued' | 'running' | 'unknown' }
  | { state: 'done'; url: string }
  | { state: 'failed'; error: string }

export interface ClipSettleDeps {
  poll(model: string, requestId: string): Promise<ProviderState>
  /** Copia o MP4 para o nosso bucket e devolve a URL pública NOSSA. Lança se falhar. */
  persist(row: ClipRow, providerUrl: string): Promise<string>
  refund(billingReference: string): Promise<number>
  markDone(id: string, videoUrl: string): Promise<boolean>
  markFailed(id: string, reason: string, refunded: number): Promise<boolean>
  event(name: 'clip_delivered' | 'clip_failed' | 'clip_effect_ready', metadata: Record<string, unknown>): Promise<void>
  now(): number
}

export async function settleClip(deps: ClipSettleDeps, row: ClipRow): Promise<ClipRow> {
  if (row.status === 'done' || row.status === 'failed') return row
  const age = deps.now() - Date.parse(row.created_at)

  const fail = async (reason: string): Promise<ClipRow> => {
    const refunded = await deps.refund(row.billing_reference)
    const moved = await deps.markFailed(row.id, reason, refunded)
    if (moved) await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'settle' })
    return { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded }
  }

  if (row.status === 'pending' || !row.fal_request_id) {
    return Number.isFinite(age) && age >= CLIP_PENDING_STALE_MS ? fail('submit_lost') : row
  }

  const state = await deps.poll(row.model, row.fal_request_id)
  if (state.state === 'failed') return fail('provider_failed')
  if (state.state === 'done') {
    let ours: string
    try {
      ours = await deps.persist(row, state.url)
    } catch {
      // Nunca marca pronto com a URL da fal. Tenta de novo no próximo poll; passou do prazo, estorna.
      return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('persist_failed') : row
    }
    const moved = await deps.markDone(row.id, ours)
    if (moved) {
      await deps.event('clip_delivered', { ...clipTelemetry(row), age_ms: Math.max(0, age) })
      // KINEO-CLIP-EFEITOS-2026-10-05 — clipe de um efeito de 1 clique ficou pronto. Mesmo ponto e mesma condição do
      // clip_delivered (só quem MOVEU a linha para `done` grava): duas abas + o cron nunca contam o mesmo clipe duas vezes.
      const effect = clipEffectForRow(row)
      if (effect) await deps.event('clip_effect_ready', { ...clipEffectEventMetadata(effect, row), age_ms: Math.max(0, age) })
    }
    return { ...row, status: 'done', video_url: ours }
  }
  return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('expired') : row
}
