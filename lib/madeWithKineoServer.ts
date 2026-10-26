import 'server-only'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SHOWCASE_CONSENT_SOURCE, SHOWCASE_PAGE_SIZE, showcaseIdFromSlug, toShowcaseFilm,
  type ShowcaseFilm, type ShowcaseRow,
} from '@/lib/madeWithKineo'

// Narrow production columns. No script/prompt, no profile name, no SELECT *.
export const SHOWCASE_VIDEO_COLUMNS = 'id,user_id,title,topic,status,video_url,thumbnail_url,quality_mode,duration,created_at,render_id,published_at,published_via'

export function showcaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

function publicQuery(admin: SupabaseClient) {
  return admin.from('videos').select(SHOWCASE_VIDEO_COLUMNS)
    .eq('status', 'completed').eq('published_via', SHOWCASE_CONSENT_SOURCE).not('published_at', 'is', null)
}

async function projectRows(admin: SupabaseClient, rows: ShowcaseRow[]): Promise<ShowcaseFilm[]> {
  if (!rows.length) return []
  const ownerIds = [...new Set(rows.map(row => row.user_id).filter((id): id is string => !!id))]
  if (!ownerIds.length) return []
  const renderIds = [...new Set(rows.map(row => row.render_id).filter((id): id is string => !!id))]
  const ids = rows.map(row => row.id)
  // Owner classification is mandatory. Missing optional measurements remain unknown.
  const [profiles, measurements, jobs] = await Promise.all([
    admin.from('profiles').select('id,email').in('id', ownerIds).abortSignal(AbortSignal.timeout(5000)),
    admin.from('events').select('metadata').eq('name', 'render_delivered_measured')
      .in('metadata->>video_id', ids).order('created_at', { ascending: false }).limit(ids.length * 2)
      .abortSignal(AbortSignal.timeout(5000)),
    renderIds.length ? admin.from('render_jobs').select('render_id,created_at').in('render_id', renderIds)
      .abortSignal(AbortSignal.timeout(5000)) : Promise.resolve({ data: [], error: null }),
  ])
  if (profiles.error || !profiles.data) { console.error('[showcase] owner classification unavailable'); return [] }
  const owners = new Map(profiles.data.map(row => [String(row.id), typeof row.email === 'string' ? row.email : null]))
  const measured = new Map<string, Record<string, unknown>>()
  if (!measurements.error) for (const event of measurements.data ?? []) {
    const metadata = event.metadata as Record<string, unknown> | null
    if (metadata && typeof metadata.video_id === 'string' && !measured.has(metadata.video_id)) measured.set(metadata.video_id, metadata)
  }
  const starts = new Map<string, string>()
  if (!jobs.error) for (const job of jobs.data ?? []) starts.set(String(job.render_id), String(job.created_at))
  return rows.flatMap(row => {
    const start = row.render_id ? starts.get(row.render_id) : null
    const elapsed = start && row.created_at ? (Date.parse(row.created_at) - Date.parse(start)) / 1000 : null
    const film = toShowcaseFilm(row, owners.get(row.user_id ?? ''), { language: measured.get(row.id)?.language, generationSeconds: elapsed })
    return film ? [film] : []
  })
}

export async function getShowcaseFilms(page = 1): Promise<{ films: ShowcaseFilm[]; hasNext: boolean }> {
  const safePage = Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1
  const admin = showcaseAdminClient()
  if (!admin) return { films: [], hasNext: false }
  try {
    const offset = (safePage - 1) * SHOWCASE_PAGE_SIZE
    const { data, error } = await publicQuery(admin).order('published_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + SHOWCASE_PAGE_SIZE).abortSignal(AbortSignal.timeout(5000))
    if (error || !data) { console.error('[showcase] public listing unavailable'); return { films: [], hasNext: false } }
    return { films: await projectRows(admin, data.slice(0, SHOWCASE_PAGE_SIZE)), hasNext: data.length > SHOWCASE_PAGE_SIZE }
  } catch { console.error('[showcase] public listing unavailable'); return { films: [], hasNext: false } }
}

export async function getShowcaseFilm(slug: string): Promise<ShowcaseFilm | null> {
  const id = showcaseIdFromSlug(slug), admin = showcaseAdminClient()
  if (!id || !admin) return null
  try {
    const { data, error } = await publicQuery(admin).eq('id', id).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
    if (error || !data) return null
    const [film] = await projectRows(admin, [data])
    return film?.slug === slug ? film : null
  } catch { console.error('[showcase] public lookup unavailable'); return null }
}

/** Same projection and privacy gates as watch pages, bounded below sitemap limit. */
export async function listShowcaseSitemapFilms(): Promise<ShowcaseFilm[]> {
  const films: ShowcaseFilm[] = []
  for (let page = 1; page <= Math.ceil(5000 / SHOWCASE_PAGE_SIZE) && films.length < 5000; page++) {
    const result = await getShowcaseFilms(page)
    films.push(...result.films.slice(0, 5000 - films.length))
    if (!result.hasNext) break
  }
  return films
}
