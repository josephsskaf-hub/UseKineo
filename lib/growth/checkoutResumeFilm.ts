export const CHECKOUT_RESUME_FILM_VERSION = 'checkout_resume_own_film_v1' as const

type UnknownVideo = Record<string, unknown>

export interface CheckoutResumeFilmProof {
  title: string
  playbackUrl: string
  posterUrl: string | null
  durationSeconds: number | null
  createdAtMs: number
}

function secureUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function safeTitle(value: unknown): string {
  if (typeof value !== 'string') return 'Your latest film'
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return compact ? compact.slice(0, 72) : 'Your latest film'
}

function durationSeconds(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 3600 ? Math.round(parsed) : null
}

function createdAtMs(value: unknown): number {
  if (typeof value !== 'string') return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function selectCheckoutResumeFilm(input: unknown): CheckoutResumeFilmProof | null {
  if (!Array.isArray(input)) return null
  return input
    .map((candidate): CheckoutResumeFilmProof | null => {
      if (!candidate || typeof candidate !== 'object') return null
      const row = candidate as UnknownVideo
      if (row.status !== 'completed') return null
      const playbackUrl = secureUrl(row.enhanced_url) ?? secureUrl(row.video_url)
      if (!playbackUrl) return null
      return {
        title: safeTitle(row.title),
        playbackUrl,
        posterUrl: secureUrl(row.thumbnail_url),
        durationSeconds: durationSeconds(row.duration),
        createdAtMs: createdAtMs(row.created_at),
      }
    })
    .filter((candidate): candidate is CheckoutResumeFilmProof => candidate !== null)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)[0] ?? null
}

function durationBucket(seconds: number | null): 'short' | 'medium' | 'long' | 'unknown' {
  if (seconds === null) return 'unknown'
  if (seconds <= 35) return 'short'
  if (seconds <= 60) return 'medium'
  return 'long'
}

export function checkoutResumeFilmTelemetry(film: CheckoutResumeFilmProof | null) {
  return {
    personal_film_version: CHECKOUT_RESUME_FILM_VERSION,
    has_personal_film: film !== null,
    film_has_thumbnail: Boolean(film && film.posterUrl),
    film_duration_bucket: durationBucket(film ? film.durationSeconds : null),
  } as const
}
