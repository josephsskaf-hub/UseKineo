import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { createLiveCache } from '@/lib/admin/liveCache'
import { MONITOR_LIMIT, reviewerScore, type FilmMonitorSnapshot, type MonitorFilm } from '@/lib/admin/filmMonitor'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const cache = createLiveCache<FilmMonitorSnapshot>(5_000)
const columns = 'id,topic,created_at,engine_used,video_url'
const reviewColumns = 'link,nota,quando,motor,defeitos'
type Video = { id: string; topic: string | null; created_at: string; engine_used: string | null; video_url: string | null }
type Review = { link: string; nota: string | number | null; quando: string; motor: string | null; defeitos: string[] | null }

function view(video?: Video, review?: Review): MonitorFilm {
  const url = video?.video_url || review?.link || ''
  return {
    id: video?.id || createHash('sha256').update(url).digest('hex'),
    title: video?.topic?.replace(/\s+/g, ' ').trim().slice(0, 140) || 'Filme sem título',
    engine: video?.engine_used || review?.motor || null,
    created: video?.created_at || null, reviewed: review?.quando || null,
    score: reviewerScore(review?.nota), defects: Array.isArray(review?.defeitos) ? review.defeitos.filter(x => typeof x === 'string') : null,
    url: /^https:\/\//i.test(url) ? url : null,
  }
}

export async function GET() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers })
  const db = serviceClient()
  if (!db) return NextResponse.json({ error: 'Unavailable' }, { status: 503, headers })
  try {
    const snapshot = await cache.get(async () => {
      const films = () => db.from('videos').select(columns).eq('quality_mode','cinematic_ai').eq('status','completed')
      const notes = () => db.from('film_review_notes').select(reviewColumns).eq('produto','filme').or('fonte.is.null,fonte.neq.auto').not('nota','is',null)
      const [v,n] = await Promise.all([
        films().order('created_at',{ascending:false}).order('id').limit(MONITOR_LIMIT),
        notes().order('quando',{ascending:false,nullsFirst:false}).order('link').limit(MONITOR_LIMIT),
      ])
      if (v.error || n.error) throw Error('read failed')
      const videos: Video[] = v.data ?? [], reviews: Review[] = n.data ?? []
      const links = videos.flatMap(f => f.video_url ? [f.video_url] : [])
      const reviewLinks = reviews.map(r => r.link)
      const [matchedNotes, matchedFilms] = await Promise.all([
        links.length ? notes().in('link',links).order('quando',{ascending:false,nullsFirst:false}) : { data: [], error: null },
        reviewLinks.length ? films().in('video_url',reviewLinks) : { data: [], error: null },
      ])
      if (matchedNotes.error || matchedFilms.error) throw Error('match failed')
      const byVideo = new Map((matchedFilms.data || []).map(f => [f.video_url,f]))
      const byReview = new Map((matchedNotes.data || []).slice().reverse().map(r => [r.link,r]))
      return { recent: videos.map(f => view(f,byReview.get(f.video_url))), reviews: reviews.map(r => view(byVideo.get(r.link),r)), checked: new Date().toISOString() }
    })
    return NextResponse.json(snapshot,{ headers })
  } catch { return NextResponse.json({ error: 'Could not read film scores' }, { status: 502, headers }) }
}
