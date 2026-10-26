import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { SHOWCASE_CONSENT_SOURCE, SHOWCASE_UUID, showcasePath, toShowcaseFilm, type ShowcaseRow } from '@/lib/madeWithKineo'
import { SHOWCASE_VIDEO_COLUMNS, showcaseAdminClient } from '@/lib/madeWithKineoServer'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } })
}

export async function GET(req: NextRequest) {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)
    const videoId = new URL(req.url).searchParams.get('videoId') ?? ''
    if (!SHOWCASE_UUID.test(videoId)) return json({ error: 'invalid' }, 400)
    const admin = showcaseAdminClient()
    if (!admin) return json({ error: 'unavailable' }, 503)
    const { data: row, error } = await admin.from('videos').select(SHOWCASE_VIDEO_COLUMNS)
      .eq('id', videoId).eq('user_id', user.id).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
    if (error) return json({ error: 'unavailable' }, 503)
    if (!row) return json({ error: 'not_found' }, 404)
    const published = row.published_via === SHOWCASE_CONSENT_SOURCE && !!row.published_at
    const film = toShowcaseFilm(row, user.email)
    return json({ ok: true, published, path: film ? showcasePath('en', film.slug) : null })
  } catch { return json({ error: 'unavailable' }, 503) }
}

/** Only an authenticated owner can explicitly opt this one film in or out. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) return json({ error: 'bad_origin' }, 403)
  if (req.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'bad_origin' }, 403)
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)
    const body = await req.json().catch(() => null) as { videoId?: unknown; action?: unknown } | null
    const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : ''
    if (!SHOWCASE_UUID.test(videoId) || (body?.action !== 'publish' && body?.action !== 'unpublish')) return json({ error: 'invalid' }, 400)
    const admin = showcaseAdminClient()
    if (!admin) return json({ error: 'unavailable' }, 503)
    const { data: row, error } = await admin.from('videos').select(SHOWCASE_VIDEO_COLUMNS)
      .eq('id', videoId).eq('user_id', user.id).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
    if (error) return json({ error: 'unavailable' }, 503)
    if (!row) return json({ error: 'not_found' }, 404)
    const undo = body.action === 'unpublish'
    const published = row.published_via === SHOWCASE_CONSENT_SOURCE && !!row.published_at
    const changing = undo ? published : !published
    if (!changing) {
      const film = published ? toShowcaseFilm(row, user.email) : null
      return json({ ok: true, published, changed: false, path: film ? showcasePath('en', film.slug) : null })
    }
    const now = new Date().toISOString()
    const candidate: ShowcaseRow = { ...row, published_at: now, published_via: SHOWCASE_CONSENT_SOURCE }
    const film = toShowcaseFilm(candidate, user.email)
    if (!undo && !film) return json({ error: 'not_ready' }, 409)
    let query = admin.from('videos').update(undo ? { published_at: null, published_via: null } : { published_at: now, published_via: SHOWCASE_CONSENT_SOURCE })
      .eq('id', videoId).eq('user_id', user.id).eq('status', row.status)
    query = row.published_at === null ? query.is('published_at', null) : query.eq('published_at', row.published_at)
    query = row.published_via === null ? query.is('published_via', null) : query.eq('published_via', row.published_via)
    const { data: changed, error: updateError } = await query.select('id,published_at,published_via')
      .abortSignal(AbortSignal.timeout(5000)).maybeSingle()
    if (updateError || !changed || (undo ? changed.published_at !== null : changed.published_via !== SHOWCASE_CONSENT_SOURCE || !changed.published_at)) return json({ error: 'conflict' }, 409)
    await writeServerEvent({ name: undo ? 'video_unpublished_v1' : 'video_published_v1', userId: user.id,
      path: '/api/video/showcase', metadata: { video_id: videoId, source: SHOWCASE_CONSENT_SOURCE, surface: 'owner_showcase', version: 'vitrine_filmes_2610' } })
    return json({ ok: true, published: !undo, changed: true, path: !undo && film ? showcasePath('en', film.slug) : null })
  } catch { return json({ error: 'unavailable' }, 503) }
}
