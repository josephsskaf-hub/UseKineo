// PUSH #96 — Aesthetic re-ranker for stock B-roll candidates.
//
// WHY THIS EXISTS
// Candidate selection was relevance-only. Two clips that are equally on-topic
// were indistinguishable to the picker, so a flat, grey, badly-lit, 2-second
// green-screen filler shot won as often as a cinematic 4K vertical aerial. This
// module scores how good a clip is likely to LOOK, from metadata the Pexels /
// Pixabay search responses already return — no ML model, no extra npm package,
// no paid API, no per-clip network fetch.
//
// WHAT IT IS NOT
// It is NOT a relevance score. Callers must combine it so that it can only ever
// separate clips that are already equally relevant (see AESTHETIC_MAX_SWING and
// `aestheticRankPoints` below). An irrelevant-but-pretty clip must never beat a
// relevant one.
//
// FIELDS ACTUALLY AVAILABLE (verified against both providers' documented
// response shapes — nothing here assumes a field that does not exist):
//   Pexels  /videos/search → id, width, height, duration, url (slug), image,
//                            user, video_files[{id, quality, file_type, width,
//                            height, fps, link}], video_pictures[]
//   Pixabay /api/videos/   → id, pageURL, type, tags, duration,
//                            videos{large,medium,small,tiny{url,width,height,
//                            size,thumbnail}}, views, downloads, likes,
//                            comments, user_id, user, userImageURL
// The Pexels VIDEO object has NO `avg_color` (that field belongs to the Photo
// object only), and Pixabay returns no colour data at all, so the "near-grey /
// blown-out luminance" idea is deliberately NOT implemented — there is no field
// to read it from without downloading a frame, which this module must not do.
//
// SAFETY CONTRACT
// Every accessor is defensive. A missing or malformed field makes its signal
// UNKNOWN, and unknown signals are dropped from the weighted average rather
// than scored as zero — so an absent field never drags a clip down. A candidate
// with no usable field at all scores exactly neutral. Nothing in here can throw.

/** Output frame the pipeline renders to (9:16 Shorts master). */
export const TARGET_WIDTH_PX = 1080
export const TARGET_HEIGHT_PX = 1920

/** Target aspect ratio (w/h) the crop is judged against — 1080/1920 = 0.5625. */
const TARGET_ASPECT = TARGET_WIDTH_PX / TARGET_HEIGHT_PX

/**
 * Per-signal weights. Exported so the ranking can be tuned WITHOUT touching the
 * scoring logic. They do not need to sum to 1 — the score is a weighted average
 * over whichever signals had real data.
 */
export const AESTHETIC_WEIGHTS = {
  /** Highest weight: an upscaled crop is soft on every single frame — the most
   *  visible, least recoverable quality defect a stock pick can have. */
  resolution: 0.25,
  /** Equal top weight: a 16:9 master loses ~68% of its frame to an untracked
   *  9:16 centre-crop, which routinely crops the subject out of shot entirely. */
  framing: 0.25,
  /** A clip that cannot cover the scene loops visibly; an 80s clip is almost
   *  always a slow establishing pan with no motion energy. Very visible, but
   *  recoverable by trimming, so ranked below resolution/framing. */
  duration: 0.2,
  /** Title/tag vocabulary is the only direct read on CONTENT style we get for
   *  free ("green screen"/"mockup" vs "aerial"/"golden hour"). Strong signal,
   *  but keyword-based and therefore noisier than the geometric ones. */
  vocabulary: 0.2,
  /** Weak: exposed by Pexels only, and a sane frame rate is table stakes rather
   *  than a mark of quality. Enough to break a tie, not to decide one. */
  frameRate: 0.05,
  /** Weakest: a crowd proxy, exposed by Pixabay only. Downloads correlate with
   *  "editors actually used this", but also with over-used stock, so it is
   *  deliberately kept at a whisper. */
  popularity: 0.05,
} as const

export type AestheticSignal = keyof typeof AESTHETIC_WEIGHTS

/**
 * Thresholds, exported for the same reason as the weights. Every value carries
 * the reason it has that number — no magic constants.
 */
export const AESTHETIC_THRESHOLDS = {
  /** Scale factor of exactly 1 = the source covers 1080x1920 natively. */
  UPSCALE_NONE: 1.0,
  /** 2.0x = the crop is being blown up to double size; below DVD-grade detail
   *  on a phone screen. Treated as the floor of the resolution signal. */
  UPSCALE_WORST: 2.0,
  /** Retention (fraction of the source frame surviving the 9:16 crop) at which
   *  framing is considered neither good nor bad. 0.60 sits between a 4:5 source
   *  (0.70, still comfortable) and a 1:1 source (0.56, already tight). */
  FRAMING_NEUTRAL_RETENTION: 0.6,
  /** Under 3s a clip cannot fill any Shorts scene without an obvious loop. */
  DURATION_MIN_USABLE_SEC: 3,
  /** Assumed scene length when the caller does not pass one — a sane Shorts
   *  pacing floor, matching the 6s default already used by the Pixabay ranker. */
  DURATION_DEFAULT_SCENE_SEC: 6,
  /** Above 30s a stock clip is nearly always a long ambient/establishing take;
   *  usable, but we only ever show a slice of it, so it stops earning credit. */
  DURATION_IDEAL_MAX_SEC: 30,
  /** Above 60s it is an ambient loop or a slow drone pan — low motion energy,
   *  the classic "nothing happens" filler shot. */
  DURATION_LONG_SEC: 60,
  /** Below 20fps the encode stutters on motion — a real, visible defect. */
  FPS_STUTTER: 20,
  /** 23-31fps is film / broadcast cadence: the "cinematic" motion look. */
  FPS_CINEMA_MIN: 23,
  FPS_CINEMA_MAX: 31,
  /** 32-61fps is clean and slow-motion capable, but has no film cadence. */
  FPS_HIGH_MAX: 61,
  /** Downloads at which the crowd signal saturates. 5k downloads on a free
   *  stock site is a well-used clip; beyond that the extra signal is noise. */
  POPULARITY_SATURATION: 5000,
  /** Max vocabulary hits counted per side. Three "aerial/cinematic/golden hour"
   *  tags already say everything; a fourth is the same clip shouting. */
  VOCAB_HIT_CAP: 3,
  /** Ceiling applied to a clip too short to cover the scene. A visible loop is
   *  not a matter of taste — no amount of resolution or styling compensates for
   *  it — so such a clip can be neutral at best, never a positive pick. */
  UNUSABLE_DURATION_SCORE_CAP: 0.5,
} as const

/**
 * How many ranking points the aesthetic score is allowed to move a candidate,
 * end to end. MUST stay strictly BELOW the caller's per-topic-match weight (4
 * in lib/pixabay.ts) so that a clip matching one more query token can never be
 * outranked by a prettier but less relevant clip. See `aestheticRankPoints`.
 */
export const AESTHETIC_MAX_SWING = 3

/**
 * Words that mark a clip as stock FILLER rather than footage: motion-graphics
 * assets, keying plates, seamless loops and "designed to be a backdrop" clips.
 * These are exactly the flat, low-information shots the picker could not see.
 */
export const FILLER_VOCABULARY: readonly string[] = [
  'green screen', 'greenscreen', 'chroma key', 'chromakey', 'blue screen',
  'seamless loop', 'looping', 'loop',
  'background', 'backdrop', 'wallpaper', 'screensaver',
  'abstract', 'template', 'mockup', 'mock up', 'copy space', 'copyspace',
  'motion graphics', 'motion graphic', 'animation', 'animated', 'cartoon',
  'render', '3d render', 'cgi', 'vector', 'clipart', 'clip art',
  'gradient', 'particles', 'overlay', 'transition', 'intro', 'lower third',
  'watermark', 'sample', 'placeholder', 'stock footage',
]

/**
 * Words that mark deliberate, produced camera work — the shots that read as
 * "someone directed this" rather than "someone pointed a phone at something".
 */
export const CINEMATIC_VOCABULARY: readonly string[] = [
  'aerial', 'drone', 'cinematic', 'slow motion', 'slowmotion', 'slow mo',
  'close up', 'closeup', 'macro', 'golden hour', 'timelapse', 'time lapse',
  'hyperlapse', 'sunset', 'sunrise', 'dusk', 'dawn', 'blue hour',
  'silhouette', 'dramatic', 'moody', 'atmospheric', 'fog', 'mist', 'haze',
  'epic', 'panoramic', 'tracking shot', 'dolly', 'crane shot', 'establishing',
  'neon', 'volumetric', 'backlit', 'rim light', 'anamorphic', 'shallow depth',
]

/** Normalised, provider-agnostic view of one search result. All optional. */
export interface AestheticCandidate {
  /** Native master width in px (Pexels `width`, Pixabay largest rendition). */
  widthPx?: number | null
  /** Native master height in px. */
  heightPx?: number | null
  /** Clip length in seconds (both providers expose `duration`). */
  durationSec?: number | null
  /** Frames per second — Pexels `video_files[].fps` only; Pixabay omits it. */
  fps?: number | null
  /** Free text to mine for style vocabulary: Pexels URL slug / Pixabay tags. */
  text?: string | null
  /** Pixabay `downloads` — preferred crowd proxy. */
  downloads?: number | null
  /** Pixabay `likes` — fallback crowd proxy when downloads is absent. */
  likes?: number | null
  /** Pixabay `type` ('film' | 'animation'); animation is off-brand filler. */
  mediaType?: string | null
  /** Planned scene length in seconds, when the caller knows it. */
  sceneDurationSec?: number | null
}

/** Per-signal sub-scores in [-1, 1]; null means the field was unavailable. */
export type AestheticBreakdown = Record<AestheticSignal, number | null>

export interface AestheticResult {
  /** 0..1, where 0.5 is neutral / unknown. */
  score: number
  /** Ranking points, symmetric around 0, bounded by AESTHETIC_MAX_SWING / 2. */
  points: number
  breakdown: AestheticBreakdown
  /** How many signals had real data behind them (0 = fully neutral result). */
  knownSignals: number
}

// ── Defensive accessors ────────────────────────────────────────────────────
// Nothing below may throw: providers occasionally return null renditions,
// string numbers, or omit fields entirely.

/**
 * Coerce to a finite number, else null.
 *
 * Deliberately NOT `Number(value)`: JS coerces null, '', [] and false all to 0,
 * so `likes: null` would have been read as "zero likes" — a real data point —
 * and dragged the clip's crowd signal to its floor. Only an actual number, or a
 * non-empty numeric string, counts as data. Everything else is UNKNOWN.
 */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Strictly positive number, else null. For px / seconds / fps. */
function positive(value: unknown): number | null {
  const n = toNumber(value)
  return n !== null && n > 0 ? n : null
}

/** Non-negative number, else null. For counts, where a genuine 0 is meaningful. */
function count(value: unknown): number | null {
  const n = toNumber(value)
  return n !== null && n >= 0 ? n : null
}

function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

/**
 * Lowercase the text and reduce every non-alphanumeric run to a single space,
 * with leading/trailing padding. Pexels slugs are hyphen-separated and Pixabay
 * tags are comma-separated, so this makes one matcher work for both, and the
 * padding turns `includes(' word ')` into a real word-boundary test.
 * Exported so callers never re-implement it (the repo has a history of helpers
 * being copy-pasted because they were not exported).
 */
export function normalizeVocabularyText(text: string | null | undefined): string {
  if (typeof text !== 'string' || text.length === 0) return ''
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

/** Word-boundary phrase test over text already run through the normaliser. */
export function containsPhrase(normalized: string, phrase: string): boolean {
  if (normalized.length === 0) return false
  const needle = ` ${phrase.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
  return needle.length > 2 && normalized.includes(needle)
}

// ── Individual signals — each returns [-1, 1] or null when unknowable ───────

/**
 * Does the highest available rendition clear 1080x1920 without upscaling?
 * `cover` fit scales by max(targetW/w, targetH/h); <= 1 means every output
 * pixel comes from a real source pixel.
 */
function resolutionSignal(widthPx: number | null, heightPx: number | null): number | null {
  if (widthPx === null || heightPx === null) return null
  const coverScale = Math.max(TARGET_WIDTH_PX / widthPx, TARGET_HEIGHT_PX / heightPx)
  const { UPSCALE_NONE, UPSCALE_WORST } = AESTHETIC_THRESHOLDS
  if (coverScale <= UPSCALE_NONE) return 1
  // Linear from +1 at no upscaling down to -1 at 2x upscaling (and clamped
  // below that, so a 480p tiny-only clip cannot score worse than the floor).
  const ramp = (coverScale - UPSCALE_NONE) / (UPSCALE_WORST - UPSCALE_NONE)
  return clamp(1 - 2 * ramp, -1, 1)
}

/**
 * How much of the source frame survives the untracked 9:16 centre-crop.
 * Retention is 1.0 at exactly 9:16 and ~0.32 for a 16:9 master.
 */
function framingSignal(widthPx: number | null, heightPx: number | null): number | null {
  if (widthPx === null || heightPx === null) return null
  const aspect = widthPx / heightPx
  const retention = aspect > TARGET_ASPECT ? TARGET_ASPECT / aspect : aspect / TARGET_ASPECT
  const neutral = AESTHETIC_THRESHOLDS.FRAMING_NEUTRAL_RETENTION
  return clamp((retention - neutral) / (1 - neutral), -1, 1)
}

/** Duration sanity against the scene the clip has to fill. */
function durationSignal(durationSec: number | null, sceneSec: number | null): number | null {
  if (durationSec === null) return null
  const t = AESTHETIC_THRESHOLDS
  const needed = sceneSec !== null ? sceneSec : t.DURATION_DEFAULT_SCENE_SEC
  // Under 3s: an unavoidable, obvious loop or freeze on any Shorts scene.
  if (durationSec < t.DURATION_MIN_USABLE_SEC) return -1
  // Long enough to be watchable but shorter than the scene: one visible loop.
  if (durationSec < needed) return -0.4
  // Covers the scene and is still a shot rather than an ambient take.
  if (durationSec <= t.DURATION_IDEAL_MAX_SEC) return 1
  // 30-60s: fine, but we only ever use a slice — no credit, no penalty.
  if (durationSec <= t.DURATION_LONG_SEC) return 0
  // Over 60s: ambient loop or slow establishing pan, i.e. low motion energy.
  return -0.5
}

/** Frame rate, where the provider exposes it (Pexels only today). */
function frameRateSignal(fps: number | null): number | null {
  if (fps === null) return null
  const t = AESTHETIC_THRESHOLDS
  // Visibly stuttery on any camera movement.
  if (fps < t.FPS_STUTTER) return -1
  // Film / broadcast cadence — the motion look the channel is going for.
  if (fps >= t.FPS_CINEMA_MIN && fps <= t.FPS_CINEMA_MAX) return 1
  // 32-61fps: clean and slow-motion capable, just not a cinematic tell.
  if (fps <= t.FPS_HIGH_MAX) return 0.25
  // 20-22fps, or specialty high-speed above 61 — neither good nor bad.
  return 0
}

/** Weak crowd proxy: downloads (preferred) or likes, log-scaled and saturated. */
function popularitySignal(downloads: number | null, likes: number | null): number | null {
  const n = downloads !== null ? downloads : likes
  if (n === null) return null
  const saturation = Math.log10(1 + AESTHETIC_THRESHOLDS.POPULARITY_SATURATION)
  if (saturation <= 0) return 0
  // Log scale because stock download counts are heavily long-tailed: the gap
  // between 10 and 100 says far more than the gap between 4000 and 4090.
  return clamp(2 * (Math.log10(1 + n) / saturation) - 1, -1, 1)
}

/** Title/tag vocabulary: cinematic hits minus filler hits, each capped. */
function vocabularySignal(text: string | null, mediaType: string | null): number | null {
  const normalized = normalizeVocabularyText(text)
  const normalizedType = normalizeVocabularyText(mediaType)
  if (normalized.length === 0 && normalizedType.length === 0) return null

  let filler = 0
  for (const phrase of FILLER_VOCABULARY) {
    if (containsPhrase(normalized, phrase)) filler++
  }
  // Pixabay's `type` is 'film' or 'animation'; animation is off-brand for a
  // documentary/facts channel, so it counts as one filler hit on its own.
  if (containsPhrase(normalizedType, 'animation')) filler++

  let cinematic = 0
  for (const phrase of CINEMATIC_VOCABULARY) {
    if (containsPhrase(normalized, phrase)) cinematic++
  }

  const cap = AESTHETIC_THRESHOLDS.VOCAB_HIT_CAP
  if (cap <= 0) return 0
  return clamp((Math.min(cinematic, cap) - Math.min(filler, cap)) / cap, -1, 1)
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Score how good a stock clip is likely to LOOK, from search metadata only.
 *
 * Signals with no data are excluded from the weighted average (they do not
 * count as zero), so a provider that exposes fewer fields is not systematically
 * punished. A candidate with nothing usable scores exactly neutral (0.5 / 0pts).
 *
 * Never throws: a malformed candidate object degrades to the neutral result.
 */
export function scoreAesthetics(candidate: AestheticCandidate | null | undefined): AestheticResult {
  const neutral: AestheticResult = {
    score: 0.5,
    points: 0,
    breakdown: {
      resolution: null, framing: null, duration: null,
      vocabulary: null, frameRate: null, popularity: null,
    },
    knownSignals: 0,
  }
  if (!candidate || typeof candidate !== 'object') return neutral

  try {
    const widthPx = positive(candidate.widthPx)
    const heightPx = positive(candidate.heightPx)
    const durationSec = positive(candidate.durationSec)
    const sceneSec = positive(candidate.sceneDurationSec)
    const fps = positive(candidate.fps)
    const text = typeof candidate.text === 'string' ? candidate.text : null
    const mediaType = typeof candidate.mediaType === 'string' ? candidate.mediaType : null

    const breakdown: AestheticBreakdown = {
      resolution: resolutionSignal(widthPx, heightPx),
      framing: framingSignal(widthPx, heightPx),
      duration: durationSignal(durationSec, sceneSec),
      vocabulary: vocabularySignal(text, mediaType),
      frameRate: frameRateSignal(fps),
      popularity: popularitySignal(count(candidate.downloads), count(candidate.likes)),
    }

    // An UNKNOWN signal contributes 0 (= neutral in [-1, 1] space) while still
    // counting toward the denominator. That is the point of "unknown scores
    // neutral, not zero": a missing field pulls the clip TOWARD the middle, it
    // neither punishes it (which excluding-and-renormalising would have done to
    // whichever provider exposes fewer fields) nor rewards it (which dropping
    // the weight entirely DID do — an untagged clip could out-score a fully
    // described one purely by having less evidence against it).
    let weighted = 0
    let totalWeight = 0
    let knownSignals = 0
    for (const key of Object.keys(AESTHETIC_WEIGHTS) as AestheticSignal[]) {
      const weight = AESTHETIC_WEIGHTS[key]
      if (!Number.isFinite(weight) || weight <= 0) continue
      totalWeight += weight
      const sub = breakdown[key]
      if (sub === null || !Number.isFinite(sub)) continue
      weighted += clamp(sub, -1, 1) * weight
      knownSignals++
    }

    if (totalWeight <= 0) return { ...neutral, breakdown }

    // Weighted mean in [-1, 1] → [0, 1].
    const normalized = clamp(weighted / totalWeight, -1, 1)
    let score = (normalized + 1) / 2

    // A clip that cannot cover the scene will visibly loop; cap it at neutral
    // so a gorgeous 2-second clip can never be PROMOTED over a usable one.
    if (breakdown.duration === -1) {
      score = Math.min(score, AESTHETIC_THRESHOLDS.UNUSABLE_DURATION_SCORE_CAP)
    }

    return {
      score,
      points: aestheticRankPoints(score),
      breakdown,
      knownSignals,
    }
  } catch {
    // A scorer that throws would take generation down entirely — never do that.
    return neutral
  }
}

/**
 * Convert a 0..1 aesthetic score into ranking points centred on 0.
 *
 * The full end-to-end swing is AESTHETIC_MAX_SWING (3), i.e. points land in
 * [-1.5, +1.5]. Callers add this to their relevance score. Because the total
 * possible aesthetic difference between two candidates (3) is strictly less
 * than the weight of a single extra topic-token match in the relevance score
 * (4 in lib/pixabay.ts), a clip that is MORE relevant can never be outranked by
 * a clip that merely looks better. Aesthetics decides only among clips that are
 * equally on-topic — which is exactly the coin flip this module exists to fix.
 */
export function aestheticRankPoints(score: number, maxSwing = AESTHETIC_MAX_SWING): number {
  if (!Number.isFinite(score)) return 0
  return (clamp(score, 0, 1) - 0.5) * maxSwing
}

/** Compact one-line breakdown for the pipeline logs. */
export function formatAestheticBreakdown(result: AestheticResult): string {
  const parts: string[] = []
  for (const key of Object.keys(AESTHETIC_WEIGHTS) as AestheticSignal[]) {
    const sub = result.breakdown[key]
    parts.push(`${key}=${sub === null ? 'n/a' : sub.toFixed(2)}`)
  }
  return parts.join(' ')
}
