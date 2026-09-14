/**
 * KINEO-S25-RECUSA-NA-TELA-2026-09-14 (Board, MOTORES-ESPECIFICOS-R6).
 * Client presentation only — what the server had already bought when it stopped
 * (accepted scene references, held scenes, POSTs) and which exit the screen
 * offers. Lives outside lib/cinematic/ on purpose: that path is under the
 * founder's 8.2 lock (03/09) and this is UI, not the video engine. The financial
 * authority stays with the server and with lib/cinematic/qualityFailureUi.ts.
 */
import type { VideoQualityFailure } from '@/lib/cinematic/qualityFailureUi'

export interface QualityFailureExit {
  reason: string
  // Accepted scene references are preserved for diagnosis/support ONLY —
  // they are never reused by a new generation (no such system exists).
  acceptedScenes: number
  acceptedRequestIds: string[]
  heldScenes: number[]
  scenePosts: number
  // 'engine_or_format' = THIS ATTEMPT could not give the presenter a voice on
  // this engine (Seedance 2.5 presenter path: the voice was not prepared, so
  // the server stopped instead of buying a silent presenter). Not a universal
  // incapacity — the healthy presenter path on S25 exists (Board R2/R4). The
  // person changes engine or format by themselves; the screen never changes
  // either automatically and never retries.
  guidance: 'engine_or_format' | null
}

/** Reasons whose only honest exit is another engine or another format. */
export const ENGINE_OR_FORMAT_REASONS: ReadonlySet<string> = new Set(['s25_dialogue_without_host'])

const safeRequestId = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Za-z0-9_:-]{1,120}$/.test(value) ? value : null
const safeSceneIndex = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 1000 ? value : null

/**
 * Derives the exit from the raw terminal response. `failure` must be the
 * already-validated parse (same generation, sanitized reason); without it there
 * is no terminal quality response and therefore no exit.
 */
export function parseQualityFailureExit(value: unknown, failure: VideoQualityFailure | null): QualityFailureExit | null {
  if (!failure) return null
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const acceptedRaw = Array.isArray(data.acceptedScenes) ? data.acceptedScenes : []
  const acceptedRequestIds = acceptedRaw
    .map((a) => (a && typeof a === 'object' && !Array.isArray(a) ? safeRequestId((a as Record<string, unknown>).request_id) : null))
    .filter((v): v is string => v !== null)
    .slice(0, 20)
  const heldScenes = (Array.isArray(data.heldScenes) ? data.heldScenes : [])
    .map(safeSceneIndex).filter((v): v is number => v !== null).slice(0, 50)
  const scenePosts = typeof data.scenePosts === 'number' && Number.isInteger(data.scenePosts) && data.scenePosts >= 0 ? data.scenePosts : 0
  return {
    reason: failure.reason,
    acceptedScenes: acceptedRequestIds.length,
    acceptedRequestIds, heldScenes, scenePosts,
    guidance: ENGINE_OR_FORMAT_REASONS.has(failure.reason) ? 'engine_or_format' : null,
  }
}
