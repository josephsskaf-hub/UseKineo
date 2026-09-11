import type { SupabaseClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH, composeClaimId, verifyComposeClaim } from '@/lib/composeClaim'
import { cinematicClaimId, loadVerifiedCinematicClaim, releaseCinematicClaim } from '@/lib/cinematic/claim'
import { refundRenderCredits } from '@/lib/credits/refund'

export type CinematicQualityReason =
  | 'cinematic_timeline_too_short'
  | 'scene_speech_exceeds_footage'
  | 'cinematic_scene_metadata_invalid'
  | 'cinematic_timeline_too_long'
  | 'native_dialogue_unverified'
  | 'scene_narration_missing'
  | 'scene_narration_failed'

const REASONS: ReadonlySet<string> = new Set([
  'cinematic_timeline_too_short', 'scene_speech_exceeds_footage',
  'cinematic_scene_metadata_invalid', 'cinematic_timeline_too_long',
  'native_dialogue_unverified', 'scene_narration_missing', 'scene_narration_failed',
])
const RELEASE_REASON = 'provider_failed_refunded'

export interface CinematicQualityRejection {
  outcome: 'quality_rejected_refunded' | 'quality_rejection_support_pending'
  reason: CinematicQualityReason
  refunded: boolean
  refundConfirmed: boolean
  claimReleased: boolean
  composeClaimRetained: boolean
  retryable: false
  /** Safe class only: never a provider body, script, URL or ledger identifier. */
  supportReason: string | null
}

type Input = {
  db: SupabaseClient
  secret: string
  /** Authenticated server identity, never request-body identity. */
  userId: string
  generationId: string
  /** Must refer to this invocation's successful unique compose INSERT. */
  ownsComposeClaim: boolean
  /** Explicit false only. Set true BEFORE entering the Creatomate fetch. */
  composeProviderAttempted: boolean
  reason: CinematicQualityReason
}

type Row = { id?: unknown; name?: unknown; path?: unknown; user_id?: unknown; session_id?: unknown; metadata?: unknown }
type OwnedRow = { id: string; metadata: Record<string, unknown>; authority: string }
type Identity = Pick<Input, 'db' | 'secret' | 'userId' | 'generationId'>
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

function intentSignature(args: Identity, mutex: OwnedRow, reason: string): string {
  return createHmac('sha256', args.secret).update(JSON.stringify([
    'kineo-quality-rejection-v1', mutex.id, mutex.authority, args.userId, args.generationId, reason, false,
  ])).digest('hex')
}
function verifiedIntent(args: Identity, mutex: OwnedRow): Record<string, unknown> | null {
  const marker = record(mutex.metadata.quality_rejection)
  if (!marker || marker.version !== 1 || typeof marker.reason !== 'string' || !REASONS.has(marker.reason) ||
    marker.final_provider_attempted !== false || !['resolving', 'resolved'].includes(String(marker.phase)) ||
    typeof marker.intent_authority !== 'string' || !/^[a-f0-9]{64}$/.test(marker.intent_authority)) return null
  try {
    return timingSafeEqual(Buffer.from(marker.intent_authority, 'hex'), Buffer.from(intentSignature(args, mutex, marker.reason), 'hex')) ? marker : null
  } catch { return null }
}
async function markIntent(args: Identity, mutex: OwnedRow, marker: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await args.db.from('events').update({ metadata: { ...mutex.metadata, quality_rejection: marker } })
    .eq('id', mutex.id).eq('user_id', args.userId).eq('name', COMPOSE_CLAIM_EVENT)
    .eq('metadata->>generation_id', args.generationId).eq('metadata->>status', 'pending')
    .eq('metadata->>authority', mutex.authority).is('metadata->>render_id', null)
    .select('id').maybeSingle()
  return !error && data?.id === mutex.id
}

async function loadOwnedPending(args: Identity): Promise<OwnedRow | null> {
  const id = composeClaimId(args.userId, args.generationId)
  const { data, error } = await args.db.from('events')
    .select('id,name,path,user_id,session_id,metadata')
    .eq('id', id).eq('user_id', args.userId).eq('name', COMPOSE_CLAIM_EVENT).maybeSingle()
  const row = data as Row | null
  const meta = record(row?.metadata)
  if (error || !row || !meta || row.id !== id || row.path !== COMPOSE_CLAIM_PATH ||
    row.user_id !== args.userId || row.name !== COMPOSE_CLAIM_EVENT || row.session_id !== args.generationId ||
    meta.generation_id !== args.generationId || meta.status !== 'pending' ||
    (meta.render_id !== undefined && meta.render_id !== null && meta.render_id !== '') ||
    typeof meta.quality !== 'string' || typeof meta.cost !== 'number' || !Number.isFinite(meta.cost) || meta.cost < 0 ||
    !verifyComposeClaim(args.secret, {
      claimId: id, userId: args.userId, generationId: args.generationId,
      status: 'pending', quality: meta.quality, cost: meta.cost,
    }, meta.authority)) return null
  return { id, metadata: meta, authority: meta.authority as string }
}

/** Read-only replay, also usable BEFORE the route's settled-birth status guard.
 * A mutable JSON marker is not proof of money: verify mutex HMAC, released birth
 * HMAC and exact refunded ledger row again before returning financial copy. */
export async function readVerifiedQualityRejection(args: Identity): Promise<CinematicQualityRejection | null> {
  if (!args.secret || !args.userId || !/^[A-Za-z0-9_-]{8,100}$/.test(args.generationId)) return null
  let intent: CinematicQualityRejection | null = null
  try {
    const mutex = await loadOwnedPending(args)
    const marker = mutex ? verifiedIntent(args, mutex) : null
    if (!mutex || !marker) return null
    intent = {
      outcome: 'quality_rejection_support_pending', reason: marker.reason as CinematicQualityReason,
      refunded: false, refundConfirmed: false, claimReleased: false, composeClaimRetained: true,
      retryable: false, supportReason: 'birth_unverified',
    }
    const birth = await loadVerifiedCinematicClaim(args)
    const billingReference = `cinematic-${cinematicClaimId(args.userId, args.generationId)}`
    if (!birth.ok || !birth.claim ||
      birth.claim.resolutionReference !== billingReference || birth.claim.quality !== mutex.metadata.quality ||
      birth.claim.creditCost !== mutex.metadata.cost ||
      (birth.claim.status !== 'settled' && !(birth.claim.status === 'released' && birth.claim.resolutionReason === RELEASE_REASON))) return intent
    intent.supportReason = 'refund_unconfirmed'
    const { data, error } = await args.db.from('credit_debits').select('render_id,user_id,kind,amount,refunded_at')
      .eq('render_id', billingReference).eq('user_id', args.userId).eq('kind', 'video').maybeSingle()
    if (error || !data || data.render_id !== billingReference || data.user_id !== args.userId || data.kind !== 'video' ||
      data.amount !== birth.claim.creditCost || typeof data.refunded_at !== 'string' || !Number.isFinite(Date.parse(data.refunded_at))) return intent
    intent.refunded = intent.refundConfirmed = true
    if (birth.claim.status !== 'released') { intent.supportReason = 'birth_release_unconfirmed'; return intent }
    intent.claimReleased = true
    intent.outcome = 'quality_rejected_refunded'
    intent.supportReason = null
    return intent
  } catch { return intent }
}

/**
 * Terminal quality rejection BEFORE final-provider submission, with an already
 * acquired compose mutex. This is not a general refund or orphan recovery API.
 *
 * Ordering: owned pending mutex -> verified birth/ledger -> signed intent -> idempotent refund ->
 * ledger confirmation -> verified birth release -> terminal mutex annotation.
 * Keep the mutex EVEN ON SUCCESS: another invocation may have read the old
 * settled birth before our refund and acquire a deleted mutex afterwards. A
 * retained row prevents that stale request from submitting a free final render.
 * Callers must not call releaseGenerationClaim() after this helper. A fresh,
 * user-initiated generation uses a new generationId, never retries this one.
 *
 * The route owns the pre-fetch flag and unique INSERT. These are necessary in
 * addition to the DB row: a pending row alone never proves no provider job.
 * Unknown outcomes retain the mutex and return support_pending, not "refunded"
 * or automatic retry. No schema change, raw error logging or provider calls.
 */
export async function rejectCinematicQuality(args: Input): Promise<CinematicQualityRejection> {
  let refunded = false
  let released = false
  let mutexRetained = false
  const result = (supportReason: string | null): CinematicQualityRejection => ({
    outcome: supportReason ? 'quality_rejection_support_pending' : 'quality_rejected_refunded',
    reason: REASONS.has(args.reason) ? args.reason : 'cinematic_scene_metadata_invalid',
    refunded, refundConfirmed: refunded, claimReleased: released,
    composeClaimRetained: mutexRetained, retryable: false, supportReason,
  })
  if (!args.ownsComposeClaim || args.composeProviderAttempted !== false || !args.secret ||
    !args.userId || !/^[A-Za-z0-9_-]{8,100}$/.test(args.generationId) || !REASONS.has(args.reason)) {
    return result('unsafe_rejection_context')
  }
  try {
    const owned = await loadOwnedPending(args)
    if (!owned) return result('compose_ownership_unverified')
    mutexRetained = true
    const birth = await loadVerifiedCinematicClaim(args)
    if (!birth.ok || !birth.claim) return result('birth_unverified')
    const claim = birth.claim
    const billingReference = `cinematic-${cinematicClaimId(args.userId, args.generationId)}`
    if (claim.resolutionReference !== billingReference || claim.quality !== owned.metadata.quality ||
      claim.creditCost !== owned.metadata.cost || claim.creditCost <= 0 ||
      (claim.status !== 'settled' && !(claim.status === 'released' && claim.resolutionReason === RELEASE_REASON))) {
      return result('birth_debit_binding_unverified')
    }
    // This caller's unique mutex excludes new submissions. The legacy replay
    // path is also checked explicitly; a past render is never refunded here.
    const legacy = await args.db.from('broll_metrics').select('render_id')
      .eq('user_id', args.userId).eq('generation_id', args.generationId).maybeSingle()
    if (legacy.error || legacy.data?.render_id) return result('prior_render_not_excluded')

    const readDebit = async () => args.db.from('credit_debits')
      .select('render_id,user_id,kind,amount,refunded_at')
      .eq('render_id', billingReference).eq('user_id', args.userId).eq('kind', 'video').maybeSingle()
    const exactDebit = (row: Record<string, unknown> | null): boolean => !!row &&
      row.render_id === billingReference && row.user_id === args.userId && row.kind === 'video' &&
      row.amount === claim.creditCost
    const debit = await readDebit()
    if (debit.error || !debit.data || !exactDebit(debit.data)) return result('debit_unverified')
    const beforeRefund = await loadOwnedPending(args)
    if (!beforeRefund || beforeRefund.authority !== owned.authority) {
      mutexRetained = !!beforeRefund
      return result('compose_changed_before_refund')
    }
    const intent = {
      version: 1, phase: 'resolving', reason: args.reason, final_provider_attempted: false,
      intent_authority: intentSignature(args, beforeRefund, args.reason),
      recorded_at: new Date().toISOString(),
    }
    // Durable BEFORE money. Reload can distinguish a quality rejection waiting
    // for financial reconciliation from an ordinary in-flight compose claim.
    if (!await markIntent(args, beforeRefund, intent)) return result('rejection_intent_unconfirmed')
    if (!debit.data.refunded_at) {
      // refundRenderCredits returns zero for BOTH a prior refund and a failure.
      // Its amount alone therefore cannot authorize claim release or UI copy.
      try { await refundRenderCredits(billingReference) } catch { /* confirm below */ }
    }
    const confirmed = await readDebit()
    refunded = !confirmed.error && !!confirmed.data && exactDebit(confirmed.data) &&
      typeof confirmed.data.refunded_at === 'string' && Number.isFinite(Date.parse(confirmed.data.refunded_at))
    if (!refunded) return result('refund_unconfirmed')

    // A concurrent change is not permission to delete/overwrite another state.
    const stillOwned = await loadOwnedPending(args)
    if (!stillOwned || stillOwned.authority !== owned.authority) {
      mutexRetained = !!stillOwned
      return result('compose_changed_after_refund')
    }
    const close = await releaseCinematicClaim({
      ...args, reason: RELEASE_REASON, reference: billingReference,
    })
    if (!close.ok) return result('birth_release_unconfirmed')
    const closed = await loadVerifiedCinematicClaim(args)
    released = closed.ok && closed.claim?.status === 'released' &&
      closed.claim.resolutionReason === RELEASE_REASON && closed.claim.resolutionReference === billingReference
    if (!released) return result('birth_release_unconfirmed')

    // Reuse the existing allowed financial release reason; distinguish quality
    // in the compose tombstone rather than inventing a reason older readers reject.
    if (!await markIntent(args, stillOwned, {
      ...intent, phase: 'resolved', refund_confirmed: true, birth_released: true,
      resolved_at: new Date().toISOString(),
    })) return result('terminal_marker_unconfirmed')
    return result(null)
  } catch {
    return result('rejection_resolution_unavailable')
  }
}
