import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'

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

    const [claimsResult, videoResult] = await Promise.all([
      admin
        .from('events')
        .select('id, metadata, created_at')
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
        started_at: activeClaim.created_at,
        elapsed_ms: Math.max(0, Date.now() - activeClaimAt),
        quality: typeof metadata.quality === 'string' && metadata.quality ? metadata.quality : 'fast',
        duration: rawDuration === 60 || rawDuration === 90 ? rawDuration : 45,
      })
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
