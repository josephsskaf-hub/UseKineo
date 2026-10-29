import type { SupabaseClient } from '@supabase/supabase-js'
import type { CinematicClaim } from '@/lib/cinematic/claim'
import { KLING4_T2V_MODEL, KLING4_I2V_MODEL, KLING4_TRIAL_TIMEOUT_MS, pollKling4TrialVideo } from '@/lib/kling4Trial'
import { kling4TrialEngineFromClaim, kling4TrialVideoUrlFromClaim } from '@/lib/kling4TrialClaim'
import { ensureKling4TrialFallback } from '@/lib/kling4TrialFallback'

export const KLING4_TRIAL_FALLBACK_AFTER_MS = KLING4_TRIAL_TIMEOUT_MS
type Identity = { db: SupabaseClient; secret: string; userId: string; generationId: string; claim: CinematicClaim }
type PollResult = { status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }
export type Kling4TrialAdvance = {
  kind: 'ordinary' | 'pending' | 'kling_done' | 'fallback_empty'
  claim: CinematicClaim
  url?: string
}

/** Call only with a verified owner claim. A former Kling ID authorizes only its signed fallback generation. */
export function kling4TrialPollIdsMatch(ids: readonly (string | null)[], claim: CinematicClaim): boolean {
  if (ids.length === claim.falRequestIds.length && ids.every((id, i) => id === claim.falRequestIds[i])) return true
  if (kling4TrialEngineFromClaim(claim.response) !== 'seedance15_fallback') return false
  const marker = claim.response!.kling4_trial as Record<string, unknown>
  return marker.fallback_finalized === true && ids.length === 1 && typeof marker.original_request_id === 'string' &&
    marker.original_request_id.length > 0 && ids[0] === marker.original_request_id
}

/** Shared by the browser poller and orphan rescue. Never submits or resubmits Kling. */
export async function advanceKling4TrialStatus(
  args: Identity & { now?: number },
  deps: {
    poll?: (requestId: string) => Promise<PollResult>
    fallback?: typeof ensureKling4TrialFallback
  } = {},
): Promise<Kling4TrialAdvance> {
  const engine = kling4TrialEngineFromClaim(args.claim.response)
  const storedMarker = args.claim.response?.kling4_trial as Record<string, unknown> | undefined
  if (engine === 'seedance15_fallback' && storedMarker?.fallback_finalized === true) {
    // Retry event persistence after a successful fallback CAS; never buy scenes again.
    let current = args.claim
    try {
      const saved = await (deps.fallback ?? ensureKling4TrialFallback)({ ...args,
        reason: storedMarker.fallback_reason === 'timeout' ? 'timeout' : 'provider_failed' })
      if (saved.ok) current = saved.claim
    } catch { /* The signed frozen fallback is already authoritative. */ }
    return { kind: current.falRequestIds.some(Boolean) ? 'ordinary' : 'fallback_empty', claim: current }
  }
  if (engine !== 'kling4') return { kind: 'ordinary', claim: args.claim }
  const claim = args.claim
  if (claim.falRequestIds.length !== 1 || !claim.falRequestIds[0] ||
      ![KLING4_T2V_MODEL, KLING4_I2V_MODEL].includes(claim.falModels[0])) return { kind: 'pending', claim }
  const requestId = claim.falRequestIds[0]
  // Old synchronous births already proved their result and must remain deliverable.
  const completed = claim.authorizedCompletedUrls[0] || kling4TrialVideoUrlFromClaim(claim.response)
  if (completed) return { kind: 'kling_done', claim, url: completed }
  const marker = claim.response!.kling4_trial as Record<string, unknown>
  const submittedAt = typeof marker.submitted_at === 'string' ? Date.parse(marker.submitted_at) : NaN
  if (marker.original_request_id !== requestId || !Number.isFinite(submittedAt)) return { kind: 'pending', claim }
  const now = args.now ?? Date.now()
  let reason: 'provider_failed' | 'timeout' | null = storedMarker?.fallback_started === true
    ? storedMarker.fallback_reason === 'timeout' ? 'timeout' : 'provider_failed'
    : now - submittedAt >= KLING4_TRIAL_FALLBACK_AFTER_MS ? 'timeout' : null
  if (!reason) {
    let result: PollResult
    try { result = await (deps.poll ?? (id => pollKling4TrialVideo(id, { apiKey: process.env.FAL_KEY ?? '' })))(requestId) }
    catch { return { kind: 'pending', claim } }
    if (result.status === 'done' && typeof result.url === 'string' && result.url.startsWith('https://')) {
      return { kind: 'kling_done', claim, url: result.url }
    }
    if (result.status !== 'failed') return { kind: 'pending', claim }
    reason = 'provider_failed'
  }
  let fallback: Awaited<ReturnType<typeof ensureKling4TrialFallback>>
  try { fallback = await (deps.fallback ?? ensureKling4TrialFallback)({ ...args, reason }) }
  catch { return { kind: 'pending', claim } }
  if (!fallback.ok || fallback.pending) return { kind: 'pending', claim: fallback.claim }
  if (fallback.noAccepted && !fallback.claim.authorizedCompletedUrls.some(Boolean)) return { kind: 'fallback_empty', claim: fallback.claim }
  // A simultaneous completed-URL authorization can win the fallback CAS.
  if (kling4TrialEngineFromClaim(fallback.claim.response) === 'kling4') {
    const url = fallback.claim.authorizedCompletedUrls[0] || kling4TrialVideoUrlFromClaim(fallback.claim.response)
    return url ? { kind: 'kling_done', claim: fallback.claim, url } : { kind: 'pending', claim: fallback.claim }
  }
  return { kind: 'ordinary', claim: fallback.claim }
}
