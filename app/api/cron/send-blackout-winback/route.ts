import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

// KINEO-BLACKOUT-WINBACK-2026-07-31 — the second half of the blackout playbook.
//
// The 31/07 OpenAI quota blackout burned 15 external users (196 dead clicks,
// 5h) during the biggest TAAFT signup wave in the company's history. The alarm
// (lib/openaiAlert.ts) fixed DETECTION; this cron fixes RECOVERY: the moment
// the service is verifiably healthy again, every victim gets ONE honest e-mail
// — "it was us, it's fixed, your credits are untouched, come back". Without
// this, a burned first-day user simply never returns, and TAAFT traffic is the
// most expensive traffic we have ever had.
//
// How it decides (all read-only until the send):
//   1. Find `openai_quota_dead` markers in the last 48h (written by the routes
//      wired to openaiAlert). None → no blackout → exit.
//   2. Recovery = last marker is >= 45 min old AND at least one video COMPLETED
//      after it. Until both are true, do nothing (never e-mail "we're back"
//      while we're down — that would be worse than silence).
//   3. Victims = distinct users with `generation_stage_error` between
//      (first marker − 6h) and the last marker. The 6h lookback exists because
//      the alarm code can be deployed MID-blackout (exactly what happened on
//      31/07: dead at 11:07Z, markers only exist from 15:40Z). Client-side
//      gate reasons (not provider failures) are excluded.
//   4. One e-mail per user per blackout, deduped via a `blackout_winback_sent`
//      event (7-day window — also protects against back-to-back blackouts
//      double-mailing the same person).
//
// Deliberate decisions, documented so nobody "fixes" them later:
//   - PAID users are INCLUDED. This is a service-recovery notice, not a sales
//     e-mail — the paying victim is precisely who we most need to win back.
//   - The 24h lifecycle cross-suppression (lib/lifecycle/suppression.ts) is
//     NOT applied: an outage apology must not queue behind a marketing nudge.
//     It still respects email_opted_out and ships unsubscribe headers.
//   - No discount in the copy. Apology + proof of fix. Discounts teach users
//     that outages are coupons.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const MAX_PER_RUN = 60
const HOUR_MS = 60 * 60 * 1000
const MARKER_LOOKBACK_MS = 48 * HOUR_MS
const PRE_MARKER_WINDOW_MS = 6 * HOUR_MS
const RECOVERY_QUIET_MS = 45 * 60 * 1000
const DEDUPE_WINDOW_MS = 7 * 24 * HOUR_MS
// Client-side gate noise — not provider failures, not blackout victims.
const NON_PROVIDER_REASONS = new Set(['analyze_blocked_active_render_gate'])

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') ||
    e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') ||
    e.startsWith('test') ||
    e.includes('mailinator') ||
    e.startsWith('smoketest')
  )
}

// KINEO-CRON-FAILCLOSED-2026-07-27 — fail closed when CRON_SECRET is missing.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

function buildEmail(userId: string) {
  const makeUrl = `${APP_URL}/generate`
  const text = `Hey,

This is the Kineo team.

Earlier today you tried to generate a video and it failed. That was NOT you and NOT your idea — our AI provider ran out of capacity on our side. The failure was ours.

It's fixed now, and we've verified videos are rendering again. Your free videos and credits were never touched by any of those failed attempts.

Pick up exactly where you left off: ${makeUrl}

If anything still looks off, just reply to this e-mail — a real person reads every message and will make your video happen.

Kineo Team
usekineo.com`

  const html =
    text
      .split('\n')
      .map((line) =>
        line.trim() === ''
          ? '<br/>'
          : `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.55;">${line.replace(
              /(https?:\/\/[^\s]+)/g,
              (m) => `<a href="${m}" style="color:#2997ff;font-weight:bold;">${m}</a>`
            )}</p>`
      )
      .join('') + emailFooterHtml(userId)

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!RESEND_API_KEY) {
    console.error('[blackout-winback] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = Date.now()

  // 1) Blackout markers in the last 48h.
  const { data: markers, error: markersError } = await admin
    .from('events')
    .select('created_at')
    .eq('name', 'generation_stage_error')
    .eq('metadata->>reason', 'openai_quota_dead')
    .gte('created_at', new Date(now - MARKER_LOOKBACK_MS).toISOString())
    .order('created_at', { ascending: true })
    .limit(2000)
  if (markersError) {
    console.error('[blackout-winback] markers query error:', markersError.message)
    return NextResponse.json({ error: markersError.message }, { status: 500 })
  }
  if (!markers || markers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_blackout_in_window' })
  }

  const firstDead = new Date(markers[0].created_at as string).getTime()
  const lastDead = new Date(markers[markers.length - 1].created_at as string).getTime()

  // 2) Recovery check: quiet for 45 min AND a video completed after the last marker.
  if (now - lastDead < RECOVERY_QUIET_MS) {
    return NextResponse.json({ sent: 0, reason: 'blackout_still_active_or_too_fresh' })
  }
  const { count: healthyCount } = await admin
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gt('created_at', new Date(lastDead).toISOString())
  if (!healthyCount || healthyCount < 1) {
    return NextResponse.json({ sent: 0, reason: 'no_completed_video_since_blackout' })
  }

  // 3) Victims inside the window.
  const windowStart = new Date(firstDead - PRE_MARKER_WINDOW_MS).toISOString()
  const windowEnd = new Date(lastDead).toISOString()
  const { data: errs, error: errsError } = await admin
    .from('events')
    .select('user_id, metadata')
    .eq('name', 'generation_stage_error')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .limit(5000)
  if (errsError) {
    console.error('[blackout-winback] victims query error:', errsError.message)
    return NextResponse.json({ error: errsError.message }, { status: 500 })
  }

  const victimIds = new Set<string>()
  for (const e of (errs ?? []) as Array<{ user_id?: string | null; metadata?: { reason?: string } | null }>) {
    if (!e.user_id) continue
    if (e.metadata?.reason && NON_PROVIDER_REASONS.has(e.metadata.reason)) continue
    victimIds.add(e.user_id)
  }
  if (victimIds.size === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_victims_in_window' })
  }

  // 4) Dedupe: already winbacked in the last 7 days.
  const { data: already } = await admin
    .from('events')
    .select('user_id')
    .eq('name', 'blackout_winback_sent')
    .gte('created_at', new Date(now - DEDUPE_WINDOW_MS).toISOString())
    .limit(2000)
  for (const a of (already ?? []) as Array<{ user_id?: string | null }>) {
    if (a.user_id) victimIds.delete(a.user_id)
  }
  if (victimIds.size === 0) {
    return NextResponse.json({ sent: 0, reason: 'all_victims_already_winbacked' })
  }

  // 5) Profiles (respect opt-out; paid users deliberately INCLUDED).
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', Array.from(victimIds))
    .eq('email_opted_out', false)
  if (profilesError) {
    console.error('[blackout-winback] profiles query error:', profilesError.message)
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0
  for (const p of (profiles ?? []) as Array<{ id: string; email?: string | null }>) {
    if (sent >= MAX_PER_RUN) break
    const email = p.email?.trim()
    if (!email || isTestEmail(email)) {
      skipped++
      continue
    }
    const { text, html } = buildEmail(p.id)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          reply_to: 'hello@usekineo.com',
          subject: 'That failed video was our fault — fixed, and your credits are untouched',
          text,
          html,
          headers: unsubscribeHeaders(p.id),
        }),
      })
      if (res.ok) {
        sent++
        await admin.from('events').insert({
          user_id: p.id,
          name: 'blackout_winback_sent',
          metadata: { email: email.toLowerCase(), window_start: windowStart, window_end: windowEnd },
        })
        console.log(`[blackout-winback] sent to ${email}`)
      } else {
        console.error(`[blackout-winback] resend failed for ${email}:`, await res.text())
        // not marked — retried next run
      }
    } catch (err) {
      console.error(`[blackout-winback] error for ${email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    victims_in_window: victimIds.size,
    window_start: windowStart,
    window_end: windowEnd,
  })
}
