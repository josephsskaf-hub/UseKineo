import { PUBLIC_EXAMPLES } from '@/lib/publicExamples'
import {
  listIndexablePublicVideos,
  metaDescriptionFor,
  PUBLIC_BASE_URL,
  SITEMAP_MAX_VIDEOS,
  type PublicVideo,
} from '@/lib/publicVideos'

// PUSH #96+ — Real video sitemap.
//
// Before: this route listed only the 4 hardcoded PUBLIC_EXAMPLES, so Google had
// never been offered a single one of the 564 real `/v/[id]` pages — the largest
// untapped indexable surface the product has.
//
// Now it emits the examples PLUS every `/v/[id]` page that clears the quality
// gate in lib/publicVideos.ts. The page imports the SAME module, so the sitemap
// can never advertise a URL that renders `noindex`.
//
// Thumbnails: `<video:thumbnail_loc>` is REQUIRED by Google, and no row in the
// table has one (`thumbnail_url` and `thumb_url` are null across all 568). The
// existing `/v/[id]/opengraph-image` route is used instead — verified live at
// 200 / image/png / 1200x630, comfortably over Google's 160x90 minimum.
const BASE = PUBLIC_BASE_URL
const EXAMPLES_PUBLICATION_DATE = '2026-07-16T00:00:00.000Z'

// Rendered per request, but cached at the CDN for 24h by the Cache-Control
// header below — so Supabase is read roughly once a day per edge region, never
// once per crawl. Deliberately NOT build-time prerendered: if the build-time
// query ever failed, an examples-only sitemap would be frozen in for 24h.
export const dynamic = 'force-dynamic'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Escape for XML, after dropping control characters that are illegal in XML 1.0
 * even when escaped. User-authored `topic` text reaches this string, so an
 * unnoticed control byte would make the whole file unparseable for Google.
 */
function xmlSafe(value: string): string {
  // eslint-disable-next-line no-control-regex
  return escapeXml(value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')).trim()
}

/** Google caps <video:title> at 100 chars and <video:description> at 2048. */
function clamp(value: string, max: number): string {
  const s = value.replace(/\s+/g, ' ').trim()
  return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

function exampleEntries(): string[] {
  return PUBLIC_EXAMPLES.map(
    (example) => `  <url>
    <loc>${xmlSafe(`${BASE}/examples/${example.slug}`)}</loc>
    <video:video>
      <video:thumbnail_loc>${xmlSafe(`${BASE}${example.posterPath}`)}</video:thumbnail_loc>
      <video:title>${xmlSafe(clamp(example.title, 100))}</video:title>
      <video:description>${xmlSafe(clamp(example.description, 2048))}</video:description>
      <video:content_loc>${xmlSafe(`${BASE}${example.videoPath}`)}</video:content_loc>
      <video:duration>${example.previewDurationSeconds}</video:duration>
      <video:publication_date>${EXAMPLES_PUBLICATION_DATE}</video:publication_date>
    </video:video>
  </url>`,
  )
}

function videoEntry(v: PublicVideo): string {
  const parts = [
    `      <video:thumbnail_loc>${xmlSafe(v.thumbnailUrl)}</video:thumbnail_loc>`,
    `      <video:title>${xmlSafe(clamp(v.title, 100))}</video:title>`,
    `      <video:description>${xmlSafe(clamp(metaDescriptionFor(v), 2048))}</video:description>`,
  ]
  if (v.playbackUrl) parts.push(`      <video:content_loc>${xmlSafe(v.playbackUrl)}</video:content_loc>`)
  parts.push(`      <video:player_loc>${xmlSafe(v.pageUrl)}</video:player_loc>`)
  // Google rejects a video whose duration falls outside 1–28800 seconds, so an
  // unknown or out-of-range runtime is omitted rather than guessed. `duration`
  // is the working source — `duration_seconds` is null on every row today.
  if (v.durationSeconds != null) parts.push(`      <video:duration>${v.durationSeconds}</video:duration>`)
  parts.push(`      <video:publication_date>${xmlSafe(v.publishedAt)}</video:publication_date>`)
  parts.push('      <video:family_friendly>yes</video:family_friendly>')

  return `  <url>
    <loc>${xmlSafe(v.pageUrl)}</loc>
    <video:video>
${parts.join('\n')}
    </video:video>
  </url>`
}

export async function GET() {
  // This route must NEVER throw: if Supabase is unreachable we still serve the
  // static PUBLIC_EXAMPLES portion so Google receives valid XML rather than a
  // 500, which would cost the sitemap its standing.
  let videoEntries: string[] = []
  try {
    const videos = await listIndexablePublicVideos(SITEMAP_MAX_VIDEOS)
    videoEntries = videos.map(videoEntry)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[video-sitemap] falling back to static examples only:', err)
    videoEntries = []
  }

  const entries = [...exampleEntries(), ...videoEntries]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.join('\n')}
</urlset>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // One Supabase read per day at the edge, not one per crawl.
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
      'X-Video-Sitemap-Count': String(entries.length),
    },
  })
}
