import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'
import { CINEMATIC_CLAIM_EVENT, CINEMATIC_CLAIM_PATH } from '@/lib/cinematic/claim'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-RESUME-RENDER-2026-08-04 — READ-ONLY probe: "what is the truth about
// this user's latest render right now?"
//
// WHY: closing the tab during a render used to strand the user. The client's
// resume path depends on a localStorage snapshot; when that snapshot is gone
// (cleared storage, another browser/device) or the restore gate wedges on a
// flaky auth round-trip, /generate showed only the blind red banner "Still
// checking for an in-progress render" — no progress, no link, no exit. Real
// incident (04/08 ~04:54Z): the render had already COMPLETED in `videos`
// while the founder stared at that banner.
//
// This route reads the SAME durable server-side sources the compose lock
// already uses — nothing new is written anywhere:
//   • `events` rows with name=compose_submission_claim (the distributed
//     submission mutex written by /api/compose before any provider POST;
//     metadata carries status pending|done, render_id, quality, duration)
//   • `videos` rows keyed by render_id (written by /api/compose/status on the
//     first successful poll — i.e. "this render is done and persisted")
//
// Decision, scoped to the authenticated user and a 15-minute window:
//   claim without a videos row, newer than any completed video → 'rendering'
//   completed videos row                                       → 'completed'
//   neither                                                    → 'none'
//
// A claim whose render actually FAILED at the provider also reports
// 'rendering' here (we deliberately do NOT poll Creatomate from this probe —
// read-only, zero provider traffic); the client's "Check progress" resumes
// the normal /api/compose/status poll, which surfaces the honest failure.
//
// Auth: session cookie (same as compose/status). Service role only for the
// reads, always filtered to user.id. Degrades to state:'none' on any lookup
// fault so the page never gets a NEW dead end from its dead-end fix.
//
// KINEO-CREDIT-INTEGRITY-2026-08-05 — CINEMATIC RENDERS WERE INVISIBLE HERE.
// A cinematic generation is DEBITED and submitted to fal by
// /api/generate-video-cinematic, and only reaches /api/compose (and therefore
// only writes a compose_submission_claim) AFTER every clip finishes. Between
// those two moments — the `fal_polling` stage, the longest and most expensive
// part of the job — this probe returned state:'none'. Incident 05/08 03:08Z /
// 03:17Z: two paid cinematic renders (110 credits) sat in fal_polling with no
// compose claim and no `videos` row, so the pill said nothing and the user had
// no evidence the render ever existed.
// We now also read the signed cinematic birth claim (name=
// cinematic_submission_claim, status=settled = provider submitted AND debited).
// It carries no Creatomate render id, so it is reported with render_id:null and
// resumable:false — the client must NOT offer "Check progress" for it (there is
// nothing to poll on /api/compose/status yet), only show that it is alive.
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic'

const ACTIVE_WINDOW_MS = 15 * 60 * 1000

export async function GET() {
  try {
    const supabase = createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.warn('[compose/active] service-role env missing — probe degraded')
      return NextResponse.json({ state: 'none', degraded: true })
    }
    const admin = createAdminClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()

    const [claimsResult, videoResult, cinematicResult] = await Promise.all([
      admin
        .from('events')
        .select('id, metadata, session_id, created_at')
        .eq('user_id', user.id)
        .eq('name', COMPOSE_CLAIM_EVENT)
        .eq('path', COMPOSE_CLAIM_PATH)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),
      admin
        .from('videos')
        .select('id, video_url, thumbnail_url, title, render_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // The cinematic birth claim: written (and debited) before the fal
      // submission, settled once the provider accepted the clips. This is the
      // ONLY server-side evidence a cinematic render exists during fal_polling.
      admin
        .from('events')
        .select('id, metadata, session_id, created_at')
        .eq('user_id', user.id)
        .eq('name', CINEMATIC_CLAIM_EVENT)
        .eq('path', CINEMATIC_CLAIM_PATH)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (claimsResult.error) {
      console.warn('[compose/active] claim lookup failed:', claimsResult.error.message)
      return NextResponse.json({ state: 'none', degraded: true })
    }
    const claims = Array.isArray(claimsResult.data) ? claimsResult.data : []
    const recentVideo = videoResult.error ? null : videoResult.data
    if (videoResult.error) {
      console.warn('[compose/active] recent video lookup failed:', videoResult.error.message)
    }

    // Which of the recent claims already produced a persisted video? A claim
    // with a `videos` row is settled and must never render as "in progress".
    const claimRenderIds = claims
      .map((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object'
          ? row.metadata as Record<string, unknown>
          : {}
        return typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      })
      .filter((id) => id.length > 0 && id.length <= 160)
    const settledRenderIds = new Set<string>()
    if (claimRenderIds.length > 0) {
      const { data: settledRows, error: settledError } = await admin
        .from('videos')
        .select('render_id')
        .eq('user_id', user.id)
        .in('render_id', claimRenderIds)
      if (settledError) {
        console.warn('[compose/active] settled-claim lookup failed:', settledError.message)
      } else if (Array.isArray(settledRows)) {
        for (const row of settledRows) {
          if (typeof row.render_id === 'string' && row.render_id) settledRenderIds.add(row.render_id)
        }
      }
    }

    const activeClaim = claims.find((row) => {
      const metadata = row.metadata && typeof row.metadata === 'object'
        ? row.metadata as Record<string, unknown>
        : {}
      const renderId = typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      return !(renderId && settledRenderIds.has(renderId))
    })

    const activeClaimAt = activeClaim ? Date.parse(String(activeClaim.created_at ?? '')) : NaN
    const recentVideoAt = recentVideo ? Date.parse(String(recentVideo.created_at ?? '')) : NaN

    // A live claim that is NEWER than the last completed video wins: the user
    // started another render after that video landed.
    if (activeClaim && Number.isFinite(activeClaimAt) && (!recentVideo || activeClaimAt > recentVideoAt)) {
      const metadata = activeClaim.metadata && typeof activeClaim.metadata === 'object'
        ? activeClaim.metadata as Record<string, unknown>
        : {}
      const renderId = typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      const rawDuration = Number(metadata.duration)
      return NextResponse.json({
        state: 'rendering',
        render_id: renderId && renderId.length <= 160 ? renderId : null,
        resumable: true,
        started_at: activeClaim.created_at,
        elapsed_ms: Math.max(0, Date.now() - activeClaimAt),
        quality: typeof metadata.quality === 'string' && metadata.quality ? metadata.quality : 'fast',
        duration: rawDuration === 60 || rawDuration === 90 ? rawDuration : 45,
      })
    }

    // No compose claim in flight — but a cinematic job may still be generating
    // its clips at fal (the stage that has already been PAID for). Report it so
    // the render is never invisible; it carries no render id, so the client
    // shows presence only and must not attempt a compose/status poll.
    if (!cinematicResult.error && Array.isArray(cinematicResult.data)) {
      const composeSessions = new Set(
        claims
          .map((row) => (typeof row.session_id === 'string' ? row.session_id : ''))
          .filter(Boolean),
      )
      const activeCinematic = cinematicResult.data.find((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object'
          ? row.metadata as Record<string, unknown>
          : {}
        // `settled` = provider accepted the submission AND the credits were
        // debited. `released` was refunded/closed; `pending`/`done` are still
        // inside the birth request and resolve within seconds.
        if (metadata.status !== 'settled') return false
        const sessionId = typeof row.session_id === 'string' ? row.session_id : ''
        return !(sessionId && composeSessions.has(sessionId))
      })
      const cinematicAt = activeCinematic ? Date.parse(String(activeCinematic.created_at ?? '')) : NaN
      if (activeCinematic && Number.isFinite(cinematicAt) && (!recentVideo || cinematicAt > recentVideoAt)) {
        const metadata = activeCinematic.metadata && typeof activeCinematic.metadata === 'object'
          ? activeCinematic.metadata as Record<string, unknown>
          : {}
        return NextResponse.json({
          state: 'rendering',
          render_id: null,
          resumable: false,
          stage: 'ai_scenes',
          started_at: activeCinematic.created_at,
          elapsed_ms: Math.max(0, Date.now() - cinematicAt),
          quality: typeof metadata.quality === 'string' && metadata.quality ? metadata.quality : 'cinematic_ai',
          duration: 45,
        })
      }
    } else if (cinematicResult.error) {
      console.warn('[compose/active] cinematic claim lookup failed:', cinematicResult.error.message)
    }

    if (recentVideo && typeof recentVideo.video_url === 'string' && recentVideo.video_url) {
      return NextResponse.json({
        state: 'completed',
        video_id: recentVideo.id != null ? String(recentVideo.id) : null,
        video_url: recentVideo.video_url,
        thumbnail_url: typeof recentVideo.thumbnail_url === 'string' ? recentVideo.thumbnail_url : null,
        title: typeof recentVideo.title === 'string' ? recentVideo.title : null,
        completed_at: recentVideo.created_at,
        render_id: typeof recentVideo.render_id === 'string' ? recentVideo.render_id : null,
      })
    }

    return NextResponse.json({ state: 'none' })
  } catch (error: unknown) {
    console.error('[compose/active] unexpected error:', error instanceof Error ? error.message : String(error))
    // Degrade to 'none' — this probe must never create a new dead end.
    return NextResponse.json({ state: 'none', degraded: true })
  }
}
