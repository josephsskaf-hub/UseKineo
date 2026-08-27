import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { LIFECYCLE_SKIP_STAMP } from '@/lib/lifecycle/skipStamp'

// send-video-ready — Medida 6 do PLANO-SEMANA-2026-08-03 (Bloco B, gerar→baixar).
//
// The measured funnel (03/08): only 30% of people who generate a video ever
// download it. A big slice closes the tab during the 3-7 min render and never
// comes back — the video sits in /history and nobody tells them. This cron
// runs every 30 min and sends ONE email ("Your video is ready 🎬") with the
// thumbnail and a direct link, for videos completed 30min-24h ago that the
// user never downloaded.
//
// Guard rails (same as the other lifecycle jobs):
// - max 1 per user EVER (profiles.video_ready_sent_at). Pulo por atributo
//   IRREVERSIVEL carimba LIFECYCLE_SKIP_STAMP, que a supressao de 24h ignora.
// - 24h cross-suppression via lib/lifecycle/suppression.ts (fail-closed)
// - KINEO_LIFECYCLE_EMAILS_ENABLED gate, CRON_SECRET fail-closed
// - skips test/founder accounts and opted-out users
// - paid users ARE included: this is delivery, not a sales pitch
//
// Metric: video_ready_sent_at → video_downloaded / video_ready_viewed same day.
// Companion instrumentation: the video_ready_viewed event (MEDIDA 4) tells us
// how big the "never came back" slice really is.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

/** Video must be at least this old — give the in-app flow time to win first. */
const MIN_AGE_MS = 30 * 60 * 1000
/** And no older than this — never email about a stale backlog. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

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

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

interface ReadyVideo {
  id: string | null
  title: string | null
  thumb: string | null
}

function buildEmail(userId: string, video: ReadyVideo) {
  const url = `${APP_URL}/history?utm_source=lifecycle&utm_medium=email&utm_campaign=video_ready`
  const title = (video.title ?? '').trim()
  const titleLine = title ? `"${title}" is done rendering and waiting for you.` : 'Your video is done rendering and waiting for you.'

  const text = `Hey,

${titleLine}

It's saved in your library — watch it and grab the download here: ${url}

Your video is private by default. Download the MP4 if you want to send it directly.

It only took a few minutes to render, so if you closed the tab, no harm done. Everything you generate stays in your library.

Kineo Team
usekineo.com`

  const thumbHtml = video.thumb
    ? `<p style="margin:0 0 14px;"><a href="${url}"><img src="${video.thumb}" alt="Your video" width="180" style="display:block;border-radius:12px;max-width:180px;" /></a></p>`
    : ''

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">${title ? `<strong>&ldquo;${title}&rdquo;</strong> is done rendering and waiting for you.` : '<strong>Your video is done rendering</strong> and waiting for you.'}</p>
  ${thumbHtml}
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Watch &amp; download &rarr;</a></p>
  <p style="margin:0 0 14px;color:#475569;font-size:14px;">Your video is private by default. Download the MP4 if you want to send it directly.</p>
  <p style="margin:0 0 14px;">It only took a few minutes to render, so if you closed the tab, no harm done. Everything you generate stays in your library.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

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
    console.error('[send-video-ready] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // KINEO-LIFECYCLE-FRESH-READ-2026-08-05 — leitura de cron nunca vem de
    // cache. O reenvio triplo do send-cap-hit nasceu disso; este job lia pelo
    // mesmo caminho. Ver lib/lifecycle/freshFetch.ts.
    global: { fetch: freshFetch },
  })

  const now = Date.now()
  const newest = new Date(now - MIN_AGE_MS).toISOString()
  const oldest = new Date(now - MAX_AGE_MS).toISOString()

  // Completed videos in the 30min-24h window (small volume: dozens/day).
  const { data: readyVideos, error: videosErr } = await admin
    .from('videos')
    .select('id, user_id, title, topic, thumbnail_url, thumb_url, created_at')
    .eq('status', 'completed')
    .gte('created_at', oldest)
    .lte('created_at', newest)
    .order('created_at', { ascending: false })

  if (videosErr) {
    console.error('[send-video-ready] videos query error:', videosErr.message)
    return NextResponse.json({ error: videosErr.message }, { status: 500 })
  }

  // Newest ready video per user (for thumbnail/title) + earliest window start
  // (to check downloads AFTER the video existed).
  const perUser = new Map<string, ReadyVideo & { earliest: string }>()
  for (const row of readyVideos ?? []) {
    const id = row.user_id as string | null
    if (!id) continue
    const existing = perUser.get(id)
    if (!existing) {
      perUser.set(id, {
        id: (row.id as string | null) ?? null,
        title: (row.title as string | null) ?? (row.topic as string | null),
        thumb: (row.thumb_url as string | null) ?? (row.thumbnail_url as string | null),
        earliest: row.created_at as string,
      })
    } else if ((row.created_at as string) < existing.earliest) {
      existing.earliest = row.created_at as string
    }
  }

  if (perUser.size === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0 })
  }

  // Anyone who downloaded ANY video since their oldest ready video doesn't
  // need this nudge — they know where the download lives.
  const candidateIds = Array.from(perUser.keys())
  const { data: downloads, error: dlErr } = await admin
    .from('events')
    .select('user_id, created_at')
    .eq('name', 'video_downloaded')
    .in('user_id', candidateIds)
    .gte('created_at', oldest)

  if (dlErr) {
    console.error('[send-video-ready] downloads query error:', dlErr.message)
    return NextResponse.json({ error: dlErr.message }, { status: 500 })
  }

  for (const row of downloads ?? []) {
    const id = row.user_id as string | null
    if (!id) continue
    const entry = perUser.get(id)
    if (entry && (row.created_at as string) >= entry.earliest) {
      perUser.delete(id)
    }
  }

  if (perUser.size === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0, all_downloaded: true })
  }

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('id, email, video_ready_sent_at')
    .in('id', Array.from(perUser.keys()))
    .is('video_ready_sent_at', null)
    .eq('email_opted_out', false)

  if (error) {
    console.error('[send-video-ready] profiles query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const suppression = await loadLifecycleSuppression(
    admin,
    (candidates ?? []).map((u) => u.id as string),
  )

  let sent = 0
  let skipped = 0
  let suppressed = 0

  for (const u of candidates ?? []) {
    // Suppressed = another lifecycle email in the last 24h. NOT stamped — the
    // video is still in their library on the next run.
    if (suppression.isSuppressed(u.id as string)) {
      suppressed++
      continue
    }

    const email = u.email?.trim()

    // Test accounts never get lifecycle mail. Stamp so the row is never
    // reconsidered (same pattern as the other jobs).
    if (!email || isTestEmail(email)) {
      skipped++
      // Sentinela de pulo (KINEO-SKIP-STAMP-2026-08-05): nunca reconsiderada,
      // e sem calar os outros jobs de ciclo de vida por 24h.
      await admin
        .from('profiles')
        .update({ video_ready_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('id', u.id)
      continue
    }

    const video = perUser.get(u.id as string)
    if (!video) continue

    const { text, html } = buildEmail(u.id, video)
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
          subject: 'Your video is ready 🎬',
          text,
          html,
          headers: unsubscribeHeaders(u.id),
        }),
      })

      if (res.ok) {
        sent++
        await admin
          .from('profiles')
          .update({ video_ready_sent_at: new Date().toISOString() })
          .eq('id', u.id)
        console.log(`[send-video-ready] sent to ${email}`)
      } else {
        console.error(`[send-video-ready] resend failed for ${email}:`, await res.text())
        // not stamped — retried on the next half-hour run
      }
    } catch (err) {
      console.error(`[send-video-ready] error for ${email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: (candidates ?? []).length,
    suppressed_recent_lifecycle: suppressed,
    suppression_degraded: suppression.degraded,
  })
}
