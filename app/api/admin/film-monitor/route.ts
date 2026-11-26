import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { createLiveCache } from '@/lib/admin/liveCache'
import { MONITOR_LIMIT, filmEngineProfile, reviewerScore, type FilmMonitorSnapshot, type MonitorFilm } from '@/lib/admin/filmMonitor'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const cache = createLiveCache<FilmMonitorSnapshot>(5_000)
const columns = 'id,topic,title,created_at,engine_used,video_url,render_id'
const reviewColumns = 'link,nota,quando,motor,defeitos'
type EngineEvent = { engine_used?: unknown; motores?: unknown }
type Video = { title: string | null; render_id: string | null; id: string; topic: string | null; created_at: string; engine_used: string | null; video_url: string | null }
type Review = { link: string; nota: string | number | null; quando: string; motor: string | null; defeitos: string[] | null }

function view(video?: Video, review?: Review, event?: EngineEvent): MonitorFilm {
  const url = video?.video_url || review?.link || ''
  return {
    id: video?.id || createHash('sha256').update(url).digest('hex'),
    title: (video?.title || video?.topic)?.replace(/\s+/g, ' ').trim().slice(0, 140) || 'Filme sem título',
    ...filmEngineProfile(video?.engine_used, event),
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
      const films = () => db.from('videos').select(columns).like('quality_mode','cinematic%').eq('status','completed')
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
      const renderIds = [...new Set([...videos, ...(matchedFilms.data ?? [])].map(f => f.render_id).filter((v): v is string => !!v))]
      const receipts = new Map<string, EngineEvent>()
      if (renderIds.length) {
        const claims = await db.from('events')
          .select('render:metadata->>render_id,generation:metadata->>generation_id')
          .eq('name','compose_submission_claim').in('metadata->>render_id',renderIds)
        if (claims.error) throw Error('could not read render receipts')
        const ids = [...new Set((claims.data ?? []).map(c => c.generation).filter(Boolean))]
        if (ids.length) {
          const events = await db.from('events')
            .select('generation:metadata->>generation_id,engine_used:metadata->>engine_used,motores:metadata->motores')
            .eq('name','free_film_engine_used').in('metadata->>generation_id',ids)
          if (events.error) throw Error('could not read renderer history')
          const byGeneration = new Map((events.data ?? []).map(e => [e.generation,e]))
          for (const c of claims.data ?? []) {
            const event = byGeneration.get(c.generation)
            if (event && c.render) receipts.set(c.render,event)
          }
        }
      }
      const render = (film?: Video, review?: Review) => view(film, review, film?.render_id ? receipts.get(film.render_id) : undefined)
      return { recent: videos.map(f => render(f,byReview.get(f.video_url))), reviews: reviews.map(r => render(byVideo.get(r.link),r)), checked: new Date().toISOString() }
    })
    return NextResponse.json(snapshot,{ headers })
  } catch { return NextResponse.json({ error: 'Could not read film scores' }, { status: 502, headers }) }
}
