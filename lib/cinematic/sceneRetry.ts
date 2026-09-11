import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH, composeClaimId, signComposeClaim, validComposeGenerationId, verifyComposeClaim } from '@/lib/composeClaim'

type Identity = { db: SupabaseClient; secret: string; userId: string; generationId: string }
type Phase = 'submitting' | 'ambiguous' | 'retarget_failed' | 'release_unconfirmed'
type Marker = {
  version: 1; owner: string; phase: Phase; startedAt: string; sceneIndex: number; model: string
  oldRequestId: string | null; newRequestId: string | null; authority: string
}
export type SceneRetryMutex = {
  id: string; authority: string; metadata: Record<string, unknown>; marker: Marker
}
export type SceneRetryHold = {
  generationId: string; reason: 'scene_retry_unresolved'; phase: Phase; startedAt: string
  retryable: false; refunded: false; refundConfirmed: false; claimReleased: false
}
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const requestId = (value: unknown) => value === null || (typeof value === 'string' && value.length > 0 && value.length <= 512)
function signMarker(args: Identity, id: string, authority: string, marker: Omit<Marker, 'authority'>): string {
  return createHmac('sha256', args.secret).update(JSON.stringify([
    'kineo-scene-retry-v1', id, authority, args.userId, args.generationId,
    marker.version, marker.owner, marker.phase, marker.startedAt, marker.sceneIndex, marker.model, marker.oldRequestId, marker.newRequestId,
  ])).digest('hex')
}

/** Read-only, fail-closed support state. Mutable JSON is not proof that a paid
 * submit happened. Bind the whole marker to the authenticated compose mutex.
 * Provider ids are deliberately excluded from the returned UI contract. */
export async function readVerifiedSceneRetryHold(args: Identity): Promise<SceneRetryHold | null> {
  if (!args.secret || !args.userId || !validComposeGenerationId(args.generationId)) return null
  try {
    const id = composeClaimId(args.userId, args.generationId)
    const { data, error } = await args.db.from('events').select('id,name,path,user_id,session_id,metadata')
      .eq('id', id).eq('user_id', args.userId).eq('name', COMPOSE_CLAIM_EVENT).maybeSingle()
    const row = record(data), meta = record(row?.metadata), marker = record(meta?.scene_retry)
    if (error || !row || !meta || !marker || row.id !== id || row.path !== COMPOSE_CLAIM_PATH ||
      row.name !== COMPOSE_CLAIM_EVENT || row.user_id !== args.userId || row.session_id !== args.generationId ||
      meta.generation_id !== args.generationId || meta.status !== 'pending' || meta.credit_hold !== false ||
      (meta.render_id !== undefined && meta.render_id !== null && meta.render_id !== '') ||
      typeof meta.quality !== 'string' || typeof meta.cost !== 'number' || !Number.isFinite(meta.cost) || meta.cost <= 0 ||
      !verifyComposeClaim(args.secret, { claimId: id, userId: args.userId, generationId: args.generationId,
        status: 'pending', quality: meta.quality, cost: meta.cost }, meta.authority) ||
      marker.version !== 1 || typeof marker.owner !== 'string' || !/^[a-f0-9-]{36}$/.test(marker.owner) ||
      typeof marker.startedAt !== 'string' || !Number.isFinite(Date.parse(marker.startedAt)) ||
      !['submitting', 'ambiguous', 'retarget_failed', 'release_unconfirmed'].includes(String(marker.phase)) ||
      !Number.isInteger(marker.sceneIndex) || (marker.sceneIndex as number) < 0 ||
      typeof marker.model !== 'string' || !/^[a-z0-9._:/-]{1,300}$/i.test(marker.model) ||
      !requestId(marker.oldRequestId) || !requestId(marker.newRequestId) ||
      typeof marker.authority !== 'string' || !/^[a-f0-9]{64}$/.test(marker.authority)) return null
    const expected = signMarker(args, id, meta.authority as string, marker as unknown as Marker)
    if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(marker.authority, 'hex'))) return null
    return { generationId: args.generationId, reason: 'scene_retry_unresolved', phase: marker.phase as Phase, startedAt: marker.startedAt,
      retryable: false, refunded: false, refundConfirmed: false, claimReleased: false }
  } catch { return null }
}

/** Same PK as final compose: no OpenAI/Fal POST is allowed before INSERT wins.
 * A per-invocation owner nonce prevents a stale request deleting another lock. */
export async function acquireSceneRetryMutex(args: Identity & {
  quality: string; cost: number; sceneIndex: number; model: string; oldRequestId: string | null
}): Promise<{ kind: 'acquired'; mutex: SceneRetryMutex } | { kind: 'collision' | 'unavailable' }> {
  const id = composeClaimId(args.userId, args.generationId)
  const authority = signComposeClaim(args.secret, { claimId: id, userId: args.userId,
    generationId: args.generationId, status: 'pending', quality: args.quality, cost: args.cost })
  const unsigned: Omit<Marker, 'authority'> = { version: 1, owner: randomUUID(), phase: 'submitting', startedAt: new Date().toISOString(),
    sceneIndex: args.sceneIndex, model: args.model, oldRequestId: args.oldRequestId, newRequestId: null }
  const marker: Marker = { ...unsigned, authority: signMarker(args, id, authority, unsigned) }
  const metadata = { generation_id: args.generationId, status: 'pending', quality: args.quality,
    cost: args.cost, credit_hold: false, authority, scene_retry: marker }
  try {
    const { error } = await args.db.from('events').insert({ id, user_id: args.userId,
      name: COMPOSE_CLAIM_EVENT, path: COMPOSE_CLAIM_PATH, session_id: args.generationId, metadata })
    if (error) return { kind: error.code === '23505' ? 'collision' : 'unavailable' }
    return { kind: 'acquired', mutex: { id, authority, metadata, marker } }
  } catch { return { kind: 'unavailable' } }
}

function ownedQuery(args: Identity, mutex: SceneRetryMutex, query: any) {
  return query.eq('id', mutex.id).eq('user_id', args.userId).eq('name', COMPOSE_CLAIM_EVENT)
    .eq('path', COMPOSE_CLAIM_PATH).eq('session_id', args.generationId)
    .eq('metadata->>status', 'pending').eq('metadata->>authority', mutex.authority)
    .eq('metadata->scene_retry->>owner', mutex.marker.owner)
    .eq('metadata->scene_retry->>authority', mutex.marker.authority).is('metadata->>render_id', null)
}

/** Best-effort phase annotation. Even if unavailable, the already signed
 * submitting marker survives; it never authorizes another paid attempt. */
export async function markSceneRetryHold(args: Identity, mutex: SceneRetryMutex, phase: Phase, newRequestId: string | null = null): Promise<void> {
  const unsigned = { ...mutex.marker, phase, newRequestId }
  const marker = { ...unsigned, authority: signMarker(args, mutex.id, mutex.authority, unsigned) }
  const metadata = { ...mutex.metadata, scene_retry: marker }
  try {
    const { data, error } = await ownedQuery(args, mutex, args.db.from('events').update({ metadata })).select('id').maybeSingle()
    if (!error && data?.id === mutex.id) { mutex.marker = marker; mutex.metadata = metadata }
  } catch { /* Retain the original signed lock on uncertain writes. */ }
}

export async function releaseSceneRetryMutex(args: Identity, mutex: SceneRetryMutex): Promise<boolean> {
  try {
    const { data, error } = await ownedQuery(args, mutex, args.db.from('events').delete()).select('id').maybeSingle()
    return !error && data?.id === mutex.id
  } catch { return false }
}
