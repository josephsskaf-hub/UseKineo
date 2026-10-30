// KINEO-CENA-RETRY-3010 [TRAVA 8.2 — pedido do fundador 30/10].
// Serialize the existing idempotent refund with scene retries using their SAME compose PK.
// A lost refund/release response retains a resumable signed lock, never permission for another paid POST.
import { createHmac, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { composeClaimId, signComposeClaim, COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'
import { refundRenderCredits } from '@/lib/credits/refund'
import { authorizeCinematicCompletedUrls, authorizeCinematicTerminalFailures, cinematicJobsAreTerminal, loadVerifiedCinematicClaim, releaseCinematicClaim } from './claim'

// Both callers stop by 300s; reclaim only after that invocation must have ended, using authority CAS.
export const FAILURE_FINALIZER_LEASE_MS = 360_000

export async function finalizeSceneFailure(a: {
  db: SupabaseClient; secret: string; userId: string; generationId: string
  ids: Array<string | null>; models: string[]; allFailed: boolean
  completed?: Array<{ requestId: string; model: string; url: string }>
  failed?: Array<{ requestId: string; model: string }>
}): Promise<{ closed: boolean; refunded: number }> {
  const pending = { closed: false, refunded: 0 }
  const loaded = await loadVerifiedCinematicClaim(a)
  if (!loaded.ok || !loaded.claim) return pending
  const birth = loaded.claim, id = composeClaimId(a.userId, a.generationId)
  const intent = createHmac('sha256', a.secret).update(JSON.stringify(['kineo:scene-failure-finalizer:v1',
    a.userId, a.generationId, birth.quality, birth.creditCost, a.ids, a.models])).digest('hex')
  const signLease = (owner: string, startedAt: string) => createHmac('sha256', a.secret)
    .update(JSON.stringify(['kineo:scene-failure-lease:v1', intent, owner, startedAt])).digest('hex')
  const owner = randomUUID(), startedAt = new Date().toISOString()
  const lease = { intent, owner, started_at: startedAt, authority: signLease(owner, startedAt) }
  const authority = signComposeClaim(a.secret, { claimId: id, userId: a.userId, generationId: a.generationId,
    status: 'pending', quality: birth.quality, cost: birth.creditCost })
  const metadata = { generation_id: a.generationId, status: 'pending', quality: birth.quality, cost: birth.creditCost,
    credit_hold: false, authority, scene_failure_finalizer: lease }
  const inserted = await a.db.from('events').insert({ id, name: COMPOSE_CLAIM_EVENT, path: COMPOSE_CLAIM_PATH,
    user_id: a.userId, session_id: a.generationId, metadata })
  if (inserted.error) {
    if (inserted.error.code !== '23505') return pending
    const existing = await a.db.from('events').select('metadata').eq('id', id).eq('user_id', a.userId)
      .eq('name', COMPOSE_CLAIM_EVENT).eq('path', COMPOSE_CLAIM_PATH).eq('session_id', a.generationId).maybeSingle()
    const prior = existing.data?.metadata?.scene_failure_finalizer
    const elapsed = Date.now() - Date.parse(prior?.started_at ?? '')
    if (existing.error || !existing.data || !prior || prior.intent !== intent || typeof prior.owner !== 'string' ||
      typeof prior.started_at !== 'string' || prior.authority !== signLease(prior.owner, prior.started_at) ||
      !Number.isFinite(elapsed) || elapsed < FAILURE_FINALIZER_LEASE_MS ||
      existing.data.metadata.authority !== authority || existing.data.metadata.status !== 'pending' ||
      existing.data.metadata.render_id || existing.data.metadata.credit_hold !== false) return pending
    const won = await a.db.from('events').update({ metadata }).eq('id', id).eq('user_id', a.userId)
      .eq('name', COMPOSE_CLAIM_EVENT).eq('metadata->>authority', authority)
      .eq('metadata->scene_failure_finalizer->>authority', prior.authority).is('metadata->>render_id', null).select('id').maybeSingle()
    if (won.error || won.data?.id !== id) return pending
  }
  const unlock = async () => { await a.db.from('events').delete().eq('id', id).eq('user_id', a.userId)
    .eq('name', COMPOSE_CLAIM_EVENT).eq('metadata->>authority', authority).eq('metadata->scene_failure_finalizer->>authority', lease.authority) }
  const current = await loadVerifiedCinematicClaim(a)
  if (!current.ok || !current.claim) return pending
  let claim = current.claim
  if (claim.status === 'released') { await unlock(); return { closed: true, refunded: 0 } }
  const matches = claim.falRequestIds.length === a.ids.length && a.ids.every((v, i) => v === claim.falRequestIds[i] && a.models[i] === claim.falModels[i])
  if (claim.status !== 'settled' || !matches) { await unlock(); return pending }
  if (a.completed?.length) {
    const done = await authorizeCinematicCompletedUrls({ ...a, completed: a.completed })
    if (!done.ok) { await unlock(); return pending }; claim = done.claim
  }
  if (a.failed?.length) {
    const failed = await authorizeCinematicTerminalFailures({ ...a, failed: a.failed })
    if (!failed.ok) { await unlock(); return pending }; claim = failed.claim
  }
  const done = claim.authorizedCompletedUrls.filter(Boolean).length
  const submitted = a.ids.filter((id, i) => !!id && !!a.models[i]).length
  if (!cinematicJobsAreTerminal(claim) || (a.allFailed ? done > 0 : done >= Math.ceil(submitted * 0.6))) {
    await unlock(); return pending
  }
  let refunded: number
  try { refunded = await refundRenderCredits(claim.resolutionReference) } catch { return pending }
  if (refunded <= 0) {
    const debit = await a.db.from('credit_debits').select('refunded_at').eq('render_id', claim.resolutionReference).maybeSingle()
    if (debit.error || typeof debit.data?.refunded_at !== 'string' || !debit.data.refunded_at) return pending
  }
  const released = await releaseCinematicClaim({ ...a, reason: a.allFailed ? 'provider_all_failed_refunded' : 'provider_failed_refunded', reference: claim.resolutionReference })
  if (!released.ok) return pending
  await unlock()
  return { closed: true, refunded }
}
