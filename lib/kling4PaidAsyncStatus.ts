import type { SupabaseClient } from '@supabase/supabase-js'
import { replaceKling4PaidBinding, type CinematicClaim } from '@/lib/cinematic/claim'
import { KLING4_T2V_MODEL, KLING4_I2V_MODEL, KLING4_TRIAL_TIMEOUT_MS, pollKling4TrialVideo } from '@/lib/kling4Trial'
import { KLING4_TRIAL_FALLBACK_MODEL, Kling4FallbackSubmitError, submitKling4TrialSeedanceFallback,
  type Kling4FallbackInput } from '@/lib/kling4TrialFallback'
import { claimKling4PaidSlot, finishKling4PaidSlot, readKling4PaidSlots } from '@/lib/kling4PaidQueue'
import { ensureKling4PromoBudgetToday } from '@/lib/kling4PromoCarry'

export const KLING4_PAID_FALLBACK_MILLIUSD_PER_15S = 468 // 3 × 6s × $0.026/s; lib/fastAiClips.ts declared tariff.
export type Kling4PaidMarker = {
  version: 'kling4_paid_2810'; promo: boolean; seconds: 15 | 30 | 60
  engine_used: 'kling4' | 'seedance15_fallback'; submitted_at: string
  chunk_scenes: { prompt: string; duration: 15 }[]
  fallback_prompts: string[]
  fallback_budget_reserved?: boolean; fallback_started?: boolean; fallback_finalized?: boolean
  fallback_reason?: 'provider_failed' | 'timeout'; fallback_ambiguous?: boolean
  original_request_ids?: (string | null)[]
}
type Identity = { db: SupabaseClient; secret: string; userId: string; generationId: string; claim: CinematicClaim }
type Clip = { id: string | null; status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }
export type Kling4PaidAdvance = {
  kind: 'ordinary' | 'pending' | 'ready' | 'fallback_empty'; claim: CinematicClaim; clips?: Clip[]
}
type PollResult = { status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }

/** Inspect only a verified owner claim, never client JSON. */
export function kling4PaidMarker(claim: CinematicClaim): Kling4PaidMarker | null {
  const raw = claim.response?.kling4_paid as Record<string, unknown> | undefined
  if (claim.quality !== 'cinematic_hollywood' || !raw || raw.version !== 'kling4_paid_2810' ||
      typeof raw.promo !== 'boolean' || ![15,30,60].includes(Number(raw.seconds)) ||
      raw.seconds !== claim.response?.duration || !['kling4','seedance15_fallback'].includes(String(raw.engine_used)) ||
      typeof raw.submitted_at !== 'string' || !Number.isFinite(Date.parse(raw.submitted_at)) ||
      !Array.isArray(raw.chunk_scenes) || raw.chunk_scenes.length !== Number(raw.seconds) / 15 ||
      raw.chunk_scenes.some(s => !s || typeof s.prompt !== 'string' || !s.prompt.trim() || s.duration !== 15) ||
      !Array.isArray(raw.fallback_prompts) || raw.fallback_prompts.length !== Number(raw.seconds) / 5 ||
      raw.fallback_prompts.some(prompt => typeof prompt !== 'string' || !prompt.trim())) return null
  return raw as unknown as Kling4PaidMarker
}

export function kling4PaidPollIdsMatch(ids: readonly (string | null)[], claim: CinematicClaim): boolean {
  if (ids.length === claim.falRequestIds.length && ids.every((id, n) => id === claim.falRequestIds[n])) return true
  const marker = kling4PaidMarker(claim)
  return marker?.engine_used === 'seedance15_fallback' && marker.fallback_finalized === true &&
    Array.isArray(marker.original_request_ids) && ids.length === marker.original_request_ids.length &&
    ids.every((id, n) => id === marker.original_request_ids![n])
}

/** The frozen backup keeps the original script and narrative order, three 6s sources per 15s finished chunk. */
export function kling4PaidFallbackResponse(claim: CinematicClaim, marker: Kling4PaidMarker,
  ids: (string | null)[], ambiguous: boolean, reason: 'provider_failed' | 'timeout',
): Record<string, unknown> {
  const response = claim.response!
  const narration = typeof response.voiceover_script === 'string' ? response.voiceover_script : ''
  const words = narration.trim().split(/\s+/u).filter(Boolean)
  const count = marker.seconds / 5
  if (!words.length || ids.length !== count || !Array.isArray(marker.fallback_prompts) ||
    marker.fallback_prompts.length !== count || marker.fallback_prompts.some(prompt => typeof prompt !== 'string' || !prompt.trim())) throw new Error('kling4_paid_fallback_invalid_plan')
  const narrations = Array.from({ length: count }, (_, i) => words.slice(Math.round(i * words.length / count), Math.round((i + 1) * words.length / count)).join(' '))
  const scenes = [...marker.fallback_prompts]
  return { ...response,
    scenes, scene_captions: narrations, scene_narrations: narrations, scene_dialogues: ids.map(() => null),
    scene_engines: ids.map(() => 'cinematic'), scene_seconds: ids.map(() => 5),
    scene_prompts: scenes, scene_anchor_urls: ids.map(() => null),
    scene_fal_inputs: scenes.map(prompt => ({ prompt, duration: '6', resolution: '720p', aspect_ratio: '9:16', generate_audio: false })),
    fal_request_ids: ids, fal_model: KLING4_TRIAL_FALLBACK_MODEL, fal_models: ids.map(() => KLING4_TRIAL_FALLBACK_MODEL),
    // The frozen once-only plan excludes missing receipts from the delivery vector.
    submission_uncertain: false, terminal_failed_jobs: [], engine_used: 'seedance15_fallback', engine_label: 'Seedance 1.5',
    kling4_paid: { ...marker, engine_used: 'seedance15_fallback', fallback_started: true, fallback_finalized: true,
      original_request_ids: marker.original_request_ids ?? [...claim.falRequestIds], fallback_reason: reason, fallback_ambiguous: ambiguous },
  }
}

async function ensureFallback(args: Identity, marker: Kling4PaidMarker, reason: 'provider_failed' | 'timeout',
  deps: { submit?: (input: Kling4FallbackInput) => Promise<string> } = {},
): Promise<Kling4PaidAdvance> {
  const pending = (claim = args.claim): Kling4PaidAdvance => ({ kind: 'pending', claim })
  if (marker.fallback_budget_reserved !== true) return pending()
  let claim = args.claim
  if (!marker.fallback_started) {
    const startedResponse = { ...claim.response, kling4_paid: { ...marker, fallback_started: true,
      fallback_reason: reason, original_request_ids: [...claim.falRequestIds] } }
    const started = await replaceKling4PaidBinding({ ...args, expectedAuthority: claim.authority,
      response: startedResponse, falRequestIds: claim.falRequestIds, falModels: claim.falModels,
      authorizedCompletedUrls: claim.authorizedCompletedUrls, reason: 'start_fallback' })
    if (!started.ok) return pending()
    claim = started.claim
    marker = kling4PaidMarker(claim)!
  }
  const count = marker.seconds / 5
  const submit = deps.submit ?? submitKling4TrialSeedanceFallback
  let ledger = await readKling4PaidSlots(args.db, { userId: args.userId, jobId: args.generationId, phase: 'fallback', count })
  // Serial receipt persistence bounds provider work even when a later dispatch fails.
  if (!ledger.finalized) {
  for (let index = 0; index < count; index++) {
    const i = { userId: args.userId, jobId: args.generationId, phase: 'fallback' as const, index }
    // Recheck each dispatch so a multi-scene fallback cannot spend a previous UTC day's allowance.
    // Do this before claiming a slot: a cap refusal must not freeze a slot that never posted.
    if (marker.promo && !await ensureKling4PromoBudgetToday(args.db, { userId: args.userId, jobId: args.generationId })) return pending(claim)
    const slot = await claimKling4PaidSlot(args.db, i)
    if (slot.code === 'unavailable') return pending(claim)
    if (slot.code !== 'claimed') continue
    let state: 'accepted' | 'rejected' | 'ambiguous' = 'ambiguous'
    let requestId: string | null = null
    try {
      const prompt = marker.fallback_prompts[index]
      requestId = await submit({ prompt, duration: 6, resolution: '720p', aspect_ratio: '9:16', generate_audio: false })
      if (!requestId.trim() || requestId.length > 512) throw new Kling4FallbackSubmitError(true)
      state = 'accepted'
    } catch (error) {
      requestId = null
      state = error instanceof Kling4FallbackSubmitError && !error.ambiguous ? 'rejected' : 'ambiguous'
    }
    if (!await finishKling4PaidSlot(args.db, { ...i, token: slot.token, state, requestId, model: KLING4_TRIAL_FALLBACK_MODEL })) return pending(claim)
  }
  ledger = await readKling4PaidSlots(args.db, { userId: args.userId, jobId: args.generationId, phase: 'fallback', count })
  }
  if (!ledger.finalized) return pending(claim)
  const ambiguous = ledger.states.includes('ambiguous')
  const response = kling4PaidFallbackResponse(claim, marker, ledger.ids, ambiguous, reason)
  const changed = await replaceKling4PaidBinding({ ...args, expectedAuthority: claim.authority, response,
    falRequestIds: ledger.ids, falModels: ledger.ids.map(() => KLING4_TRIAL_FALLBACK_MODEL),
    authorizedCompletedUrls: ledger.ids.map(() => null), reason: 'finalize_fallback' })
  if (!changed.ok) return pending(claim)
  return { kind: ledger.ids.some(Boolean) ? 'ordinary' : 'fallback_empty', claim: changed.claim }
}

/** Same trial queue poll/timeout/fallback transport; no Kling retry and no credit debit in status. */
export async function advanceKling4PaidStatus(args: Identity & { now?: number }, deps: {
  poll?: (id: string) => Promise<PollResult>; submit?: (input: Kling4FallbackInput) => Promise<string>
} = {}): Promise<Kling4PaidAdvance> {
  const marker = kling4PaidMarker(args.claim)
  if (!marker) return { kind: 'ordinary', claim: args.claim }
  if (marker.engine_used === 'seedance15_fallback' && marker.fallback_finalized) return {
    kind: args.claim.falRequestIds.some(Boolean) ? 'ordinary' : 'fallback_empty', claim: args.claim,
  }
  const pending: Kling4PaidAdvance = { kind: 'pending', claim: args.claim }
  const count = marker.seconds / 15
  if (args.claim.falRequestIds.length !== count || args.claim.falModels.length !== count ||
      args.claim.falModels.some(model => ![KLING4_T2V_MODEL, KLING4_I2V_MODEL].includes(model))) return pending
  if (args.claim.authorizedCompletedUrls.every(Boolean)) return { kind: 'ready', claim: args.claim,
    clips: args.claim.falRequestIds.map((id, i) => ({ id, status: 'done', url: args.claim.authorizedCompletedUrls[i] })) }
  let reason: 'provider_failed' | 'timeout' | null = marker.fallback_started
    ? marker.fallback_reason ?? 'timeout'
    : (args.now ?? Date.now()) - Date.parse(marker.submitted_at) >= KLING4_TRIAL_TIMEOUT_MS ? 'timeout' : null
  if (!reason) {
    const poll = deps.poll ?? (id => pollKling4TrialVideo(id, { apiKey: process.env.FAL_KEY ?? '' }))
    let clips: Clip[]
    try { clips = await Promise.all(args.claim.falRequestIds.map(async id => id
      ? { id, ...await poll(id) } : { id: null,
        status: args.claim.response?.submission_uncertain === true ? 'processing' as const : 'failed' as const, url: null })) }
    catch { return pending }
    if (clips.every(c => c.status === 'done' && typeof c.url === 'string' && c.url.startsWith('https://'))) return { kind: 'ready', claim: args.claim, clips }
    if (!clips.some(c => c.status === 'failed')) return pending
    reason = 'provider_failed'
  }
  // Never replace clips that another authorized finisher has already accepted.
  if (args.claim.authorizedCompletedUrls.some(Boolean)) return pending
  try { return await ensureFallback(args, marker, reason, deps) } catch { return pending }
}
