// KINEO-FILME15-PERFEITO-2610. Durable pre-delivery gate; no providers or database here.
import type { PixelResult } from '@/lib/regua95/pixelScore'
import type { CaptionEvidenceAssessment } from '@/lib/captionEvidenceGuard'
import { trocarClipe, type CenaRefazivel } from '@/lib/freeRedo/core'

export const FREE15_GATE_EVENT = 'free15_delivery_gate'
export const FREE15_GATE_FAILED_EVENT = 'free15_gate_failed'
export const FREE15_GATE_VERSION = 'free15-gate-v1'
export type GateMedia = { url: string; snapshotUrl: string | null; durationSeconds: number | null }
export type GateState = {
  version: typeof FREE15_GATE_VERSION
  status: 'ready' | 'checking' | 'scene_submitting' | 'scene' | 'render_submitting' | 'render' | 'passed' | 'failed'
  source: Record<string, unknown>
  captionElements: unknown[]
  captionTiming?: 'approximate'
  captionEvidence: CaptionEvidenceAssessment | null
  /** Only signed first-free-film Kling4 trial claims opt into the 15s output contract. */
  minimumSeconds?: 15
  context?: { asked: string; narration: string; language: string }
  attempted: boolean
  captionsRepaired?: boolean
  reason: string
  updatedAt: number
  media?: GateMedia
  mediaSource?: Record<string, unknown>
  sceneIndex?: number
  requestId?: string
  repairRenderId?: string
  pixel?: PixelResult | null
}
export type GateDecision = { kind: 'pass' | 'fail' | 'caption' | 'scene'; reason: string; sceneIndex?: number }
export const isCaptionElement = (el: unknown): boolean => !!el && typeof el === 'object' &&
  (el as { type?: unknown }).type === 'text' && [5, 7].includes(Number((el as { track?: unknown }).track))

/** Replace caption tracks only: retain audio, clips/cuts, logo, hook, watermark and music. */
export function repairGateCaptions(source: Record<string, unknown>, captions: unknown[]): Record<string, unknown> | null {
  if (!Array.isArray(source.elements) || !captions.length || !captions.every(isCaptionElement)) return null
  return { ...source, elements: [...source.elements.filter(el => !isCaptionElement(el)), ...captions] }
}

function culpritAt(source: Record<string, unknown>, seconds: number | null, scenes: CenaRefazivel[]): number | undefined {
  if (seconds === null || !Number.isFinite(seconds)) return undefined
  const hits: Array<{ index: number; start: number }> = []
  const walk = (els: unknown, offset: number) => {
    if (!Array.isArray(els)) return
    for (const raw of els) {
      if (!raw || typeof raw !== 'object') continue
      const el = raw as Record<string, unknown>
      const start = offset + (typeof el.time === 'number' ? el.time : 0)
      const duration = Number(el.duration)
      if (el.type === 'video' && Number.isFinite(duration) && seconds >= start && seconds < start + duration) {
        const scene = scenes.find(s => s.clipUrl === el.source)
        if (scene) hits.push({ index: scene.index, start })
      }
      walk(el.elements, start)
    }
  }
  walk(source.elements, 0)
  // The signed classic builder overlaps each old shot by 0.06s. The next
  // full-frame video is appended above it on the same track: a defect at a cut
  // belongs to the newly visible shot, not the still-active tail underneath.
  return hits.reduce<{ index: number; start: number } | undefined>((visible, hit) =>
    !visible || hit.start >= visible.start ? hit : visible, undefined)?.index
}

/** Only complete pixel evidence can pass. Scores alone never trigger a scene reshoot. */
export function decideFree15Gate(state: GateState, media: GateMedia, pixel: PixelResult | null, scenes: CenaRefazivel[]): GateDecision {
  if (media.durationSeconds === null || !Number.isFinite(media.durationSeconds)) return { kind: 'fail', reason: 'duration_unverified' }
  const minimumSeconds = state.minimumSeconds === 15 ? 15 : 14
  if (media.durationSeconds < minimumSeconds) return { kind: 'fail', reason: `duration_below_${minimumSeconds}` }
  // Replacing visual text does not create new evidence of the unchanged audio.
  // Preserve the disagreement without asserting whether TTS or ASR was wrong.
  if (state.captionEvidence?.status === 'mismatch' && state.captionsRepaired) return { kind: 'fail', reason: 'caption_evidence_unresolved_after_repair' }
  if (!pixel || pixel.evidence_status !== 'complete' || pixel.score === null) {
    // A known caption mismatch still gets its one local repair when vision is
    // unavailable. Missing pixel evidence can never certify the repaired film.
    if (state.captionEvidence?.status === 'mismatch' && !state.captionsRepaired) return { kind: 'caption', reason: 'caption_evidence_mismatch' }
    return { kind: 'fail', reason: 'pixel_evidence_unverified' }
  }
  const capped = pixel.cap_limit < 100 && pixel.caps.length > 0
  const frames = pixel.defect_frames ?? pixel.frames
  const identityBad = pixel.gate_evidence?.identity_changed ?? pixel.identity_consistent === false
  const caption = state.captionEvidence?.status === 'mismatch' && !state.captionsRepaired || capped &&
    (pixel.gate_evidence?.caption_language_wrong || pixel.gate_evidence?.caption_illegible || pixel.caption_language_ok === false || pixel.caption_legible === false || frames.some(f => f.issues.includes('caption_broken') || f.issues.includes('caption_illegible')))
  const bad = capped ? frames.filter(f => f.issues.some(i => ['invented_text', 'subject_missing', 'off_topic'].includes(i))) : []
  // Identity changes are located by the reviewer in chronological frames. Choose the changed scene, not a random clip.
  const identityFrames = capped && identityBad ? (pixel.identity_changes ?? []).flatMap(change => pixel.frames.filter(f => f.i === change.to)) : []
  const located = [...bad, ...identityFrames].map(f => culpritAt(state.source, f.t, scenes)).filter((i): i is number => i !== undefined)
  if (bad.length || capped && identityBad) {
    const sceneIndex = located.find(i => i > 0) ?? located[0]
    return sceneIndex === undefined ? { kind: 'fail', reason: 'scene_defect_not_located' } : { kind: 'scene', reason: 'pixel_scene_cap', sceneIndex }
  }
  if (caption) return { kind: 'caption', reason: state.captionEvidence?.status === 'mismatch' ? 'caption_evidence_mismatch' : 'pixel_caption_cap' }
  // Other pixel ceilings (black frame, anatomy etc.) must not be labelled perfect either.
  if (capped) return { kind: 'fail', reason: 'other_pixel_cap' }
  return { kind: 'pass', reason: 'gate_passed' }
}

export interface Free15GateDeps {
  now(): number
  read(): Promise<GateState | null>
  /** Compare-and-swap of the signed previous version. False includes conflicts/errors. */
  move(previous: GateState, next: GateState): Promise<boolean>
  judge(media: GateMedia, state: GateState): Promise<PixelResult | null>
  scenes(source: Record<string, unknown>): CenaRefazivel[]
  submitScene(scene: CenaRefazivel): Promise<string>
  pollScene(scene: CenaRefazivel, requestId: string): Promise<{ status: 'pending' | 'done' | 'failed'; url?: string | null }>
  submitRender(source: Record<string, unknown>): Promise<string>
  pollRender(id: string): Promise<{ status: string; url: string | null; snapshotUrl: string | null; durationSeconds?: number | null }>
}
export type GateOutcome = { status: 'pending' } | { status: 'passed' | 'failed'; media: GateMedia; reason: string; source?: Record<string, unknown> }
const pending: GateOutcome = { status: 'pending' }
const STALE = 5 * 60_000
const PROVIDER_STALE = 30 * 60_000

/** One provider action per durable phase. An ambiguous/stale submission is NEVER resubmitted. */
export async function advanceFree15Gate(d: Free15GateDeps, original: GateMedia): Promise<GateOutcome> {
  let state = await d.read()
  let finalPixel: PixelResult | null | undefined
  if (!state) return { status: 'failed', media: original, reason: 'gate_context_missing' }
  const move = async (patch: Partial<GateState>): Promise<boolean> => {
    const next = { ...state!, ...patch, updatedAt: d.now() }
    if (!await d.move(state!, next)) return false
    state = next
    return true
  }
  const finish = async (status: 'passed' | 'failed', reason: string, media = state?.media ?? original): Promise<GateOutcome> =>
    await move({ status, reason, media, ...(finalPixel === undefined ? {} : { pixel: finalPixel }) }) ? { status, reason, media, source: state?.mediaSource ?? state?.source } : pending
  if (state.status === 'passed' || state.status === 'failed') return { status: state.status, reason: state.reason, media: state.media ?? original, source: state.mediaSource ?? state.source }
  const age = d.now() - state.updatedAt
  if (['checking', 'scene_submitting', 'render_submitting'].includes(state.status)) {
    return age > STALE ? finish('failed', 'gate_action_stale') : pending
  }
  if (state.status === 'scene') {
    const scene = d.scenes(state.source).find(s => s.index === state!.sceneIndex)
    if (!scene || !state.requestId) return finish('failed', 'repair_scene_missing')
    let result
    try { result = await d.pollScene(scene, state.requestId) } catch { return age > PROVIDER_STALE ? finish('failed', 'scene_poll_timeout') : pending }
    if (result.status === 'pending') return age > PROVIDER_STALE ? finish('failed', 'scene_timeout') : pending
    if (result.status !== 'done' || !result.url) return finish('failed', 'scene_repair_failed')
    const swapped = trocarClipe(state.source, scene.clipUrl, result.url)
    if (!swapped.trocados) return finish('failed', 'scene_not_in_source')
    if (!await move({ status: 'render_submitting', source: swapped.source })) return pending
    try {
      const repairRenderId = await d.submitRender(state.source)
      await move({ status: 'render', repairRenderId })
      return pending
    } catch { return finish('failed', 'repair_render_submit_failed') }
  }
  let media = state.media ?? original
  if (state.status === 'render') {
    if (!state.repairRenderId) return finish('failed', 'repair_render_missing')
    let result
    try { result = await d.pollRender(state.repairRenderId) } catch { return age > PROVIDER_STALE ? finish('failed', 'render_poll_timeout') : pending }
    if (['failed', 'cancelled'].includes(result.status)) return finish('failed', 'repair_render_failed')
    if (result.status !== 'succeeded' || !result.url) return age > PROVIDER_STALE ? finish('failed', 'render_timeout') : pending
    media = { url: result.url, snapshotUrl: result.snapshotUrl, durationSeconds: result.durationSeconds ?? null }
  }
  if (!await move({ status: 'checking', media, mediaSource: state.source })) return pending
  let pixel: PixelResult | null = null
  try { pixel = await d.judge(media, state) } catch { /* explicit failed/unverified, never pass on exception */ }
  finalPixel = pixel
  const decision = decideFree15Gate(state, media, pixel, d.scenes(state.source))
  if (decision.kind === 'pass') return finish('passed', decision.reason, media)
  if (state.attempted || decision.kind === 'fail') return finish('failed', decision.reason, media)
  // Persist attempted=true BEFORE spending. Two polls cannot buy two attempts.
  if (decision.kind === 'caption') {
    const repaired = repairGateCaptions(state.source, state.captionElements)
    if (!repaired) return finish('failed', 'canonical_captions_unavailable', media)
    if (!await move({ status: 'render_submitting', attempted: true, captionsRepaired: true, reason: decision.reason, pixel, source: repaired })) return pending
    try {
      const repairRenderId = await d.submitRender(repaired)
      await move({ status: 'render', repairRenderId })
      return pending
    } catch { return finish('failed', 'caption_repair_submit_failed', media) }
  }
  const scene = d.scenes(state.source).find(s => s.index === decision.sceneIndex)
  if (!scene) return finish('failed', 'repair_scene_missing', media)
  if (!await move({ status: 'scene_submitting', attempted: true, sceneIndex: scene.index, reason: decision.reason, pixel })) return pending
  try {
    const requestId = await d.submitScene(scene)
    await move({ status: 'scene', requestId })
    return pending
  } catch { return finish('failed', 'scene_repair_submit_failed', media) }
}
