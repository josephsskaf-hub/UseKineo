import { engineLabelFor } from '@/lib/engineLabel'
import { isInternalEmail } from '@/lib/internalAccounts'

// KINEO-VITRINE-FILMES-2610: old public links are NOT showcase consent.
export const SHOWCASE_CONSENT_SOURCE = 'vitrine_filmes_2610'
export const SHOWCASE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const SHOWCASE_PAGE_SIZE = 24
export const SHOWCASE_BASE = 'https://www.usekineo.com'
export type ShowcaseLocale = 'en' | 'pt' | 'es'

/** Private server input. Never serialize a database row to a public component. */
export type ShowcaseRow = {
  id: string
  user_id?: string | null
  title?: string | null
  topic?: string | null
  status?: string | null
  video_url?: string | null
  final_video_url?: string | null
  thumbnail_url?: string | null
  quality_mode?: string | null
  duration?: number | null
  created_at?: string | null
  render_id?: string | null
  published_at?: string | null
  published_via?: string | null
}

/** The complete public allow-list: no owner identity, raw prompt or job state. */
export type ShowcaseFilm = {
  id: string
  slug: string
  title: string
  theme: string
  language: string | null
  engine: string | null
  /** Count of words in the SAVED topic, not a claim about a truncated original. */
  inputWordCount: number | null
  /** Measured server render interval; null when no matching render job exists. */
  generationSeconds: number | null
  durationSeconds: number | null
  playbackUrl: string
  posterUrl: string | null
  thumbnailUrl: string
  publishedAt: string
  isInternal: boolean
}

function displayText(raw: string | null | undefined, max: number): string {
  return (raw ?? '').replace(/\b[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\b/g, '[redacted]')
    .replace(/https?:\/\/\S+/gi, '').replace(/\[(?:Pexels|Pixabay|Visual)[^\]]*\]/gi, '')
    .replace(/[*_`#<>]/g, '').replace(/^(?:HOOK|GANCHO|TITLE|TÍTULO)\s*(?:\([^)]*\))?\s*[:—–-]\s*/i, '')
    .replace(/\s+/g, ' ').trim().slice(0, max)
}

export function showcaseSlug(id: string, title: string): string {
  const stem = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72).replace(/-+$/g, '') || 'film'
  return `${stem}-${id.toLowerCase()}`
}

export function showcaseIdFromSlug(slug: string): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f-]{36}$/.test(slug) || slug.length > 109) return null
  const id = slug.slice(-36)
  return SHOWCASE_UUID.test(id) && slug.endsWith(`-${id}`) ? id.toLowerCase() : null
}

export function showcasePath(locale: ShowcaseLocale = 'en', slug?: string): string {
  return `${locale === 'en' ? '' : `/${locale}`}/made-with-kineo${slug ? `/${encodeURIComponent(slug)}` : ''}`
}

/** Strict host/path allow-list: missing config never permits arbitrary hosts. */
export function isShowcaseMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return false
    if ([...url.searchParams.keys()].some(key => /token|signature|expires|credential|^sig$|^_jwt$/i.test(key))) return false
    if (url.host === 'www.usekineo.com') return url.pathname.startsWith('/videos/')
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
    return !!configured && url.host === new URL(configured).host && url.pathname.startsWith('/storage/v1/object/public/')
  } catch { return false }
}

export function toShowcaseFilm(
  row: ShowcaseRow,
  ownerEmail: string | null | undefined,
  enrichment: { language?: unknown; generationSeconds?: unknown } = {},
): ShowcaseFilm | null {
  // Profile lookup must positively identify internal/external before publication.
  if (typeof ownerEmail !== 'string' || !ownerEmail.trim() || typeof row.id !== 'string' || !SHOWCASE_UUID.test(row.id) || row.status !== 'completed'
    || row.published_via !== SHOWCASE_CONSENT_SOURCE || typeof row.published_at !== 'string' || !row.published_at.trim()
    || !Number.isFinite(Date.parse(row.published_at))) return null
  const playbackUrl = row.final_video_url || row.video_url
  if (!isShowcaseMediaUrl(playbackUrl)) return null
  const title = displayText(row.title, 140) || displayText(row.topic?.split(/\r?\n/)[0], 140)
  if (!title || /next episode in the same short series|keep the topic and format recognizable/i.test(title)) return null
  const theme = displayText(row.topic?.split(/\r?\n/)[0], 180) || title
  const words = (row.topic ?? '').trim().split(/\s+/).filter(Boolean).length
  const language = typeof enrichment.language === 'string' && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(enrichment.language)
    ? enrichment.language : null
  const generationSeconds = typeof enrichment.generationSeconds === 'number' && Number.isFinite(enrichment.generationSeconds)
    && enrichment.generationSeconds > 0 && enrichment.generationSeconds <= 86400 ? enrichment.generationSeconds : null
  const durationSeconds = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration > 0 && row.duration <= 28800
    ? row.duration : null
  const posterUrl = isShowcaseMediaUrl(row.thumbnail_url) ? row.thumbnail_url : null
  return {
    id: row.id.toLowerCase(), slug: showcaseSlug(row.id, title), title, theme, language,
    engine: engineLabelFor(row.quality_mode), inputWordCount: words || null, generationSeconds, durationSeconds,
    playbackUrl, posterUrl, thumbnailUrl: posterUrl || `${SHOWCASE_BASE}/v/${row.id.toLowerCase()}/opengraph-image`,
    publishedAt: new Date(row.published_at).toISOString(), isInternal: isInternalEmail(ownerEmail),
  }
}

export function buildShowcaseSchema(film: ShowcaseFilm, locale: ShowcaseLocale = 'en') {
  return {
    '@context': 'https://schema.org', '@type': 'VideoObject', name: film.title,
    description: film.theme, thumbnailUrl: [film.thumbnailUrl], uploadDate: film.publishedAt,
    contentUrl: film.playbackUrl, url: `${SHOWCASE_BASE}${showcasePath(locale, film.slug)}`,
    ...(film.language ? { inLanguage: film.language } : {}),
    ...(film.durationSeconds ? { duration: `PT${Math.round(film.durationSeconds)}S` } : {}),
    publisher: { '@type': 'Organization', name: 'Kineo', url: SHOWCASE_BASE },
  }
}
