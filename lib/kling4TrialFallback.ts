import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadVerifiedCinematicClaim, startKling4TrialFallback, switchKling4TrialToSeedanceFallback, type CinematicClaim } from '@/lib/cinematic/claim'

export const KLING4_TRIAL_FALLBACK_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
export type Kling4FallbackInput = { prompt: string; duration: number; resolution: '720p'; aspect_ratio: '9:16'; generate_audio: false }
export type Kling4FallbackResult = { ok: boolean; claim: CinematicClaim; pending: boolean; ambiguous: boolean; noAccepted: boolean }
export class Kling4FallbackSubmitError extends Error {
  constructor(readonly ambiguous: boolean) { super('seedance_fallback_submit_failed') }
}

/** One raw POST, no SDK/retry wrapper. An uncertain receipt never authorizes another submission. */
export async function submitKling4TrialSeedanceFallback(input: Kling4FallbackInput): Promise<string> {
  const key = process.env.FAL_KEY
  if (!key) throw new Kling4FallbackSubmitError(false)
  let response: Response
  try {
    response = await fetch(`https://queue.fal.run/${KLING4_TRIAL_FALLBACK_MODEL}`, {
      method: 'POST', headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, duration: String(input.duration) }),
      cache: 'no-store', signal: AbortSignal.timeout(10_000),
    })
  } catch { throw new Kling4FallbackSubmitError(true) }
  if (!response.ok) throw new Kling4FallbackSubmitError(response.status === 408 || response.status >= 500)
  try {
    const body = await response.json() as { request_id?: unknown }
    if (typeof body.request_id === 'string' && body.request_id.trim() && body.request_id.length <= 512) return body.request_id.trim()
  } catch { /* An accepted POST with an unreadable receipt is ambiguous. */ }
  throw new Kling4FallbackSubmitError(true)
}

/** Called only after a server poll proves failure or the signed eight-minute window has elapsed.
 * Fresh claims wait at most 60s after a worker dies; finalized unknown slots are abandoned, never retried.
 * With no accepted receipt, callers refund/release. Exact-once paid POST and guaranteed delivery cannot both
 * be provided when the process dies between the vendor accepting a POST and the receipt reaching our database. */
export async function ensureKling4TrialFallback(args: {
  db: SupabaseClient; secret: string; userId: string; generationId: string; claim: CinematicClaim
  reason: 'provider_failed' | 'timeout'
  submit?: (input: Kling4FallbackInput) => Promise<string>
}): Promise<Kling4FallbackResult> {
  const pending = (claim = args.claim): Kling4FallbackResult => ({ ok: false, claim, pending: true, ambiguous: false, noAccepted: false })
  let loaded: Awaited<ReturnType<typeof loadVerifiedCinematicClaim>>
  try { loaded = await loadVerifiedCinematicClaim(args) } catch { return pending() }
  if (!loaded.ok || !loaded.claim) return pending()
  let claim = loaded.claim
  const marker = claim.response?.kling4_trial as Record<string, unknown> | undefined
  if (!marker || marker.version !== 'kling4_trial_2810' || !['kling4','seedance15_fallback'].includes(String(marker.engine_used)) ||
      claim.quality !== 'cinematic_ai' || claim.response?.duration !== 15 || claim.response.aspect !== '9:16') return pending(claim)
  if (marker.engine_used === 'seedance15_fallback' && marker.fallback_finalized === true) {
    // Repair the canonical event too if an earlier lambda died after its successful authority CAS.
    try { await args.db.rpc('transition_kling4_trial_fallback', { p_job_id: args.generationId, p_user_id: args.userId }) } catch { /* next poll can repair */ }
    return { ok: true, claim, pending: false, ambiguous: marker.fallback_ambiguous === true, noAccepted: !claim.falRequestIds.some(Boolean) }
  }
  if (claim.authorizedCompletedUrls.some(Boolean)) return { ok: true, claim, pending: false, ambiguous: false, noAccepted: false }
  const original = marker.original_request_id
  const shots = marker.fallback_scenes as Array<{ prompt?: unknown; duration?: unknown }> | undefined
  const fallback = marker.fallback_response as Record<string, unknown> | undefined
  if (typeof original !== 'string' || !original || claim.falRequestIds.length !== 1 || claim.falRequestIds[0] !== original ||
      !Array.isArray(shots) || shots.length !== 3 || !fallback || !Array.isArray(fallback.scenes) || fallback.scenes.length !== 3 ||
      shots.some(s => !s || typeof s.prompt !== 'string' || !s.prompt.trim() || ![6,7,8].includes(Number(s.duration)))) return pending(claim)
  try {
    const started = await startKling4TrialFallback({ ...args, originalRequestId: original, reason: args.reason })
    if (!started.ok) return pending(claim)
    claim = started.claim
  } catch { return pending(claim) }
  const submit = args.submit ?? submitKling4TrialSeedanceFallback
  await Promise.all(shots.map(async (shot, index) => {
    const identity = { p_job_id: args.generationId, p_user_id: args.userId, p_original_request_id: original }
    const token = randomUUID()
    try {
      const reserved = await args.db.rpc('claim_kling4_trial_fallback_scene', { ...identity, p_scene_index: index, p_claim_token: token })
      const row = Array.isArray(reserved.data) ? reserved.data[0] : reserved.data
      if (reserved.error || row?.code !== 'claimed') return
      let state: 'accepted' | 'rejected' | 'ambiguous' = 'ambiguous'
      let requestId: string | null = null
      try {
        const id = await submit({ prompt: String(shot.prompt), duration: Number(shot.duration), resolution: '720p', aspect_ratio: '9:16', generate_audio: false })
        if (typeof id !== 'string' || !id.trim() || id.length > 512) throw new Kling4FallbackSubmitError(true)
        requestId = id.trim(); state = 'accepted'
      } catch (error) { state = error instanceof Kling4FallbackSubmitError && !error.ambiguous ? 'rejected' : 'ambiguous' }
      // Persist each receipt immediately, before awaiting any sibling. Repeating this write is safe; repeating the POST is not.
      const result = { ...identity, p_scene_index: index, p_claim_token: token, p_state: state, p_request_id: requestId }
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const saved = await args.db.rpc('finish_kling4_trial_fallback_scene', result)
          if (!saved.error) break
        } catch { /* Retry only persistence of the SAME receipt. */ }
      }
    } catch { /* A fresh durable slot will expire to ambiguous; never reclaim or resubmit it. */ }
  }))
  try {
    const finalized = await args.db.rpc('finalize_kling4_trial_fallback', {
      p_job_id: args.generationId, p_user_id: args.userId, p_original_request_id: original,
    })
    const row = Array.isArray(finalized.data) ? finalized.data[0] : finalized.data
    if (finalized.error || row?.code !== 'finalized' || !Array.isArray(row.request_ids) || row.request_ids.length !== 3) return pending(claim)
    const changed = await switchKling4TrialToSeedanceFallback({ ...args, originalRequestId: original,
      requestIds: row.request_ids, ambiguous: row.ambiguous === true, reason: args.reason })
    if (!changed.ok) return pending(claim)
    await args.db.rpc('transition_kling4_trial_fallback', { p_job_id: args.generationId, p_user_id: args.userId })
    return { ok: true, claim: changed.claim, pending: false, ambiguous: row.ambiguous === true, noAccepted: !row.request_ids.some(Boolean) }
  } catch { return pending(claim) }
}
