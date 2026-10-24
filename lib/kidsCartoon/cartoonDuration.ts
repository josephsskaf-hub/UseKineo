// KINEO-CARTOON-CONSISTENCIA-2210 — o desenho de 15 s contratado termina com imagem em movimento por pelo menos 15 s.
// Só recebe o claim já verificado pelo compose. Pedido do navegador não decide o piso nem o comprimento dos clipes.
import type { CinematicClaim } from '@/lib/cinematic/claim'
import { alignSignedClipSecondsWith } from '@/lib/cinematic/klingShots'
import { isSeedanceShortClaim, SEEDANCE_SHORT_CLIP_STEPS } from '@/lib/durationByEngine'
import { planCappedClipTimeline } from '@/lib/compose'
import { desenhoDoClaim } from '@/lib/kidsCartoon/kidsCartoon'

type Element = Record<string, unknown>
type VerifiedDurationClaim = Pick<CinematicClaim, 'quality' | 'response' | 'authorizedCompletedUrls'>
const round3 = (n: number) => Math.round(n * 1000) / 1000
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0
const TRIM_START = 0.1
const OVERLAP = 0.06
const MINIMUM_SECONDS = 15

export class CartoonDurationError extends Error {
  constructor(readonly availableSeconds: number, readonly requestedSeconds: number, detail: string) {
    super(`Kids cartoon needs ${requestedSeconds}s of signed moving footage (${detail}; ${availableSeconds}s available).`)
    this.name = 'CartoonDurationError'
  }
}

/** Correct the FINAL RenderScript, after captions/music/format transforms. The narration is never stretched or rewritten.
 * Existing clips are redistributed by the house's bounded timeline planner: no loop, frozen last frame, extra render or provider call.
 * Non-Kids and 35 s cartoons return the identical source object. Insufficient signed footage fails before provider submission.
 */
export function enforceCartoonDurationFloor<T extends Record<string, unknown>>(
  source: T,
  input: { verifiedClaim: VerifiedDurationClaim | null | undefined; clipUrls: readonly string[] },
): { source: T; applied: boolean; beforeSeconds: number; seconds: number } {
  const claim = input.verifiedClaim
  const before = number(source.duration)
  if (!claim || claim.quality !== 'cinematic_ai' || !isSeedanceShortClaim(claim.response) || !desenhoDoClaim(claim.response)) {
    return { source, applied: false, beforeSeconds: before, seconds: before }
  }
  const minimum = MINIMUM_SECONDS
  const target = Math.max(minimum, before)
  const clipSeconds = alignSignedClipSecondsWith(claim.response, claim.authorizedCompletedUrls, input.clipUrls, SEEDANCE_SHORT_CLIP_STEPS)
  if (!clipSeconds || !(before > 0) || new Set(input.clipUrls).size !== input.clipUrls.length) throw new CartoonDurationError(0, minimum, 'missing unique signed clip plan or timeline')
  const available = round3(clipSeconds.reduce((sum, seconds) => sum + Math.floor((seconds - TRIM_START - OVERLAP) * 1000 + 1e-6) / 1000, 0))
  if (available + 0.001 < target) throw new CartoonDurationError(available, target, 'footage shorter than the final timeline')
  const elements = Array.isArray(source.elements) ? source.elements as Element[] : []
  const videos = elements.filter((e) => e.type === 'video' && Number(e.track) === 2)
  if (!videos.length || videos.some((e) => !input.clipUrls.includes(String(e.source ?? '')))) {
    throw new CartoonDurationError(available, target, 'timeline contains unsigned video')
  }
  const inBounds = videos.every((e) => {
    const index = input.clipUrls.indexOf(String(e.source))
    return e.loop === false && number(e.time) >= 0 && number(e.trim_start) >= 0 && number(e.duration) > 0 && number(e.trim_start) + number(e.duration) <= clipSeconds[index] + 0.001
  })
  const ordered = [...videos].sort((a, b) => number(a.time) - number(b.time))
  let coveredUntil = 0
  for (const video of ordered) {
    if (number(video.time) > coveredUntil + 0.001) break
    coveredUntil = Math.max(coveredUntil, number(video.time) + number(video.duration))
  }
  if (before >= minimum && inBounds && coveredUntil + 0.001 >= before) {
    return { source, applied: false, beforeSeconds: before, seconds: before }
  }
  const firstOf = (url: string) => ordered.find((e) => e.source === url)
  const anchors = input.clipUrls.map((url, index) => number(firstOf(url)?.time) || (index * before) / input.clipUrls.length)
  const slots = planCappedClipTimeline({ totalDuration: target, clipSeconds, anchors, trimStart: TRIM_START, overlap: OVERLAP })
  // The planner may reuse footage for other products; this product never fills its contracted floor by repeating it.
  if (slots.length !== clipSeconds.length || slots.some((s, index) => s.clip !== index || s.trimStart + s.len + OVERLAP > clipSeconds[index] + 0.001) ||
      !slots.length || slots[slots.length - 1].time + slots[slots.length - 1].len + 0.001 < target) {
    throw new CartoonDurationError(available, target, 'bounded timeline did not cover the full film')
  }
  const nextVideos = slots.map((slot, index) => {
    const element = { ...(firstOf(input.clipUrls[slot.clip]) ?? ordered[0]), source: input.clipUrls[slot.clip], time: slot.time,
      duration: round3(slot.len + OVERLAP), trim_start: slot.trimStart, loop: false }
    if (index > 0) delete (element as Element).enter_transition
    return element
  })
  const firstVideo = elements.findIndex((e) => e.type === 'video' && Number(e.track) === 2)
  const next: Element[] = []
  elements.forEach((element, index) => {
    if (index === firstVideo) next.push(...nextVideos)
    if (element.type === 'video' && Number(element.track) === 2) return
    const track = Number(element.track)
    const fillsTimeline = number(element.time) === 0 && Math.abs(number(element.duration) - before) <= 0.001
    // Voice (track 4), spoken captions and SFX retain their exact source/timing. Only the existing bed/full-film overlays grow.
    const extend = fillsTimeline && (element.type === 'shape' || (element.type === 'text' && track === 9) || (element.type === 'audio' && track === 8))
    next.push(extend ? { ...element, duration: target } : element)
  })
  return { source: { ...source, duration: target, elements: next }, applied: true, beforeSeconds: before, seconds: target }
}
