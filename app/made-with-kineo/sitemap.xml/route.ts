import { showcasePath, type ShowcaseLocale } from '@/lib/madeWithKineo'
import { listShowcaseSitemapFilms } from '@/lib/madeWithKineoServer'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
const BASE = 'https://www.usekineo.com'
const LOCALES: ShowcaseLocale[] = ['en', 'pt', 'es']
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export async function GET() {
  // The same per-row consent and identity boundary as the gallery and watch page.
  // No CDN/Data Cache: revocation must affect the next request.
  const films = await listShowcaseSitemapFilms()
  const entries = LOCALES.map(locale => `<url><loc>${BASE}${showcasePath(locale)}</loc><lastmod>2026-10-26T00:00:00.000Z</lastmod></url>`)
  for (const film of films) for (const locale of LOCALES) {
    entries.push(`<url><loc>${xml(BASE + showcasePath(locale, film.slug))}</loc><lastmod>${xml(film.publishedAt)}</lastmod><video:video><video:thumbnail_loc>${xml(film.thumbnailUrl)}</video:thumbnail_loc><video:title>${xml(film.title)}</video:title><video:description>${xml(film.theme)}</video:description><video:content_loc>${xml(film.playbackUrl)}</video:content_loc><video:publication_date>${xml(film.publishedAt)}</video:publication_date></video:video></url>`)
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${entries.join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' } })
}
