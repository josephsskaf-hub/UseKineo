// Push #065 — Admin Users List API.
// Server-only endpoint that joins auth.users (via service role) with
// public.videos and public.profiles to produce a sanitised list of
// users for the /admin/users page. Returns ONLY safe fields — no
// password hashes, no refresh tokens, no provider identity payloads.
// Gated to the two admin emails; everyone else gets a 403.
//
// KINEO-ADMIN-HQ-2026-08-03 — two production bugs fixed + Admin HQ summary:
//   1. listUsers was a single { perPage: 500 } call → everyone past user
//      #500 (~875 in prod) silently vanished. Now paginates until a short
//      page (hard cap 4000).
//   2. "paid" was `p === 'pro' || p === 'basic'` → starter/creator/studio/
//      autopilot customers showed as "free" AND as checkout_abandoned.
//      Now PAID_PLANS covers every value the Stripe webhook/checkout writes.
//   Also returns { summary } (paying active, signups/videos/downloads today)
//   so the /admin HQ scoreboard reuses this single query set.

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

// KINEO-ADMIN-HQ-2026-08-03 — every value the Stripe webhook/checkout can
// write to profiles.plan for a PAYING user. Sources: app/api/stripe/webhook
// (`${tier}_trial` | tier for starter/basic/pro/autopilot), checkout route
// ('autopilot_pilot'), lib/plan.ts (legacy creator/studio labels).
const PAID_PLANS = new Set([
  'starter', 'starter_trial',
  'basic', 'basic_trial',
  'creator', 'creator_trial',
  'pro', 'pro_trial',
  'studio', 'studio_trial',
  'autopilot', 'autopilot_trial', 'autopilot_pilot',
])

interface AdminUserRow {
  id: string
  email: string
  name: string | null
  created_at: string
  credits: number | null
  videos_count: number
  last_video_at: string | null
  plan: string | null
  // KINEO-ADMIN-DOWNLOADS-2026-07-10 — how many times this user downloaded a
  // video (events.video_downloaded) + how many times they clicked the $4.90
  // unlock (starter_pack_checkout_clicked). Together with videos_count these
  // tell the InVideo-model story: made videos → hit the lock → clicked → paid?
  downloads_count: number
  unlock_clicks: number
  // KINEO-ADMIN-GEO-2026-07-06 — last known connection IP + country (ISO code).
  last_ip: string | null
  last_country: string | null
  // Push #274 — true when a Stripe customer record was created but the user
  // never completed checkout (plan is still free/null). These are warm leads.
  checkout_abandoned: boolean
  // KINEO-ADMIN-HQ-2026-08-03 — computed server-side so the client never
  // bundles the internal-accounts email list (lib/internalAccounts).
  is_internal: boolean
  is_paid: boolean
}

// KINEO-ADMIN-HQ-2026-08-03 — headline numbers for the /admin HQ scoreboard.
// videos/downloads/signups "today" use the UTC day and EXCLUDE internal
// (founder/test) accounts, same as paying_active.
interface AdminSummary {
  paying_active: number
  signups_today: number
  videos_today: number
  downloads_today: number
}

export async function GET() {
  try {
    const cookieClient = createClient()
    const {
      data: { user },
    } = await cookieClient.auth.getUser()

    const email = user?.email?.toLowerCase() ?? ''
    if (!user || !ADMIN_EMAILS.has(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Service role not configured', users: [] },
        { status: 500 }
      )
    }

    const admin = createServiceClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // KINEO-ADMIN-HQ-2026-08-03 — paginate auth.users. The old single
    // { perPage: 500 } call dropped everyone past #500. Loop until a short
    // page; MAX_USERS is a safety valve against an infinite loop.
    const PER_PAGE = 500
    const MAX_USERS = 4000
    const authUsers: User[] = []
    for (let page = 1; authUsers.length < MAX_USERS; page++) {
      const { data: authData, error: authErr } = await admin.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      })
      if (authErr) {
        console.error(`[admin/users] auth.listUsers error (page ${page}):`, authErr.message)
        if (page === 1) {
          return NextResponse.json(
            { error: 'Failed to list users', users: [] },
            { status: 500 }
          )
        }
        break // keep the pages we already have
      }
      const batch = authData?.users ?? []
      authUsers.push(...batch)
      if (batch.length < PER_PAGE) break
    }

    // Internal (founder/test) account ids — used to keep today's scoreboard
    // numbers honest. KINEO-ADMIN-HQ-2026-08-03
    const internalIds = new Set<string>()
    for (const u of authUsers) {
      if (isInternalEmail(u.email)) internalIds.add(u.id)
    }

    // UTC start of today — matches app/admin (server overview) bucketing.
    const todayStartMs = new Date(
      new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
    ).getTime()

    // Per-user video aggregates. Single round-trip — we collapse client-side.
    const videoCounts = new Map<string, number>()
    const lastVideoAt = new Map<string, string>()
    let videosToday = 0
    try {
      const { data: vids, error: vErr } = await admin
        .from('videos')
        .select('user_id, created_at')
      if (!vErr && Array.isArray(vids)) {
        for (const row of vids as Array<{ user_id: string | null; created_at: string | null }>) {
          if (!row.user_id) continue
          videoCounts.set(row.user_id, (videoCounts.get(row.user_id) ?? 0) + 1)
          const prev = lastVideoAt.get(row.user_id)
          if (row.created_at && (!prev || row.created_at > prev)) {
            lastVideoAt.set(row.user_id, row.created_at)
          }
          if (
            row.created_at &&
            new Date(row.created_at).getTime() >= todayStartMs &&
            !internalIds.has(row.user_id)
          ) {
            videosToday += 1
          }
        }
      }
    } catch (e) {
      // videos table missing — leave maps empty
      console.warn('[admin/users] videos query failed:', e)
    }

    // KINEO-ADMIN-DOWNLOADS-2026-07-10 — per-user download + unlock-click
    // aggregates from public.events. Best-effort: a failure leaves the maps
    // empty (columns show 0), never breaks the page.
    const downloadCounts = new Map<string, number>()
    const unlockClicks = new Map<string, number>()
    let downloadsToday = 0
    try {
      const { data: evts, error: eErr } = await admin
        .from('events')
        .select('user_id, name, created_at')
        .in('name', ['video_downloaded', 'starter_pack_checkout_clicked'])
      if (!eErr && Array.isArray(evts)) {
        for (const row of evts as Array<{
          user_id: string | null
          name: string | null
          created_at: string | null
        }>) {
          if (!row.user_id) continue
          if (row.name === 'video_downloaded') {
            downloadCounts.set(row.user_id, (downloadCounts.get(row.user_id) ?? 0) + 1)
            if (
              row.created_at &&
              new Date(row.created_at).getTime() >= todayStartMs &&
              !internalIds.has(row.user_id)
            ) {
              downloadsToday += 1
            }
          } else if (row.name === 'starter_pack_checkout_clicked') {
            unlockClicks.set(row.user_id, (unlockClicks.get(row.user_id) ?? 0) + 1)
          }
        }
      }
    } catch (e) {
      console.warn('[admin/users] events query failed:', e)
    }

    // Profile metadata (credits + plan + stripe_customer_id). Probe gracefully.
    const credits = new Map<string, number | null>()
    const plans = new Map<string, string | null>()
    const hasStripeCustomer = new Map<string, boolean>()
    const ips = new Map<string, string | null>()
    const countries = new Map<string, string | null>()
    try {
      const { data: profs, error: pErr } = await admin
        .from('profiles')
        .select('id, video_credits, plan, is_pro, stripe_customer_id, last_ip, last_country')
      if (!pErr && Array.isArray(profs)) {
        for (const row of profs as Array<{
          id: string
          video_credits: number | null
          plan: string | null
          is_pro: boolean | null
          stripe_customer_id: string | null
          last_ip: string | null
          last_country: string | null
        }>) {
          if (typeof row.video_credits === 'number') credits.set(row.id, row.video_credits)
          else credits.set(row.id, null)
          const planLabel = row.plan ?? (row.is_pro ? 'pro' : null)
          plans.set(row.id, planLabel)
          hasStripeCustomer.set(row.id, !!row.stripe_customer_id)
          ips.set(row.id, row.last_ip ?? null)
          countries.set(row.id, row.last_country ?? null)
        }
      } else if (pErr) {
        // Retry without optional columns if they're missing
        const { data: profsBasic } = await admin
          .from('profiles')
          .select('id, is_pro')
        if (Array.isArray(profsBasic)) {
          for (const row of profsBasic as Array<{ id: string; is_pro: boolean | null }>) {
            credits.set(row.id, null)
            plans.set(row.id, row.is_pro ? 'pro' : null)
          }
        }
      }
    } catch (e) {
      console.warn('[admin/users] profiles query failed:', e)
    }

    // Whitelist the fields we return. No tokens, no hashes, no raw provider
    // data — only what the admin table needs.
    const users: AdminUserRow[] = authUsers.map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>
      const rawMeta = ((u as unknown as { raw_user_meta_data?: Record<string, unknown> })
        .raw_user_meta_data ?? {}) as Record<string, unknown>
      const name =
        (typeof meta.full_name === 'string' && meta.full_name) ||
        (typeof meta.name === 'string' && meta.name) ||
        (typeof rawMeta.full_name === 'string' && rawMeta.full_name) ||
        (typeof rawMeta.name === 'string' && rawMeta.name) ||
        null
      // KINEO-ADMIN-HQ-2026-08-03 — PAID_PLANS instead of pro/basic only.
      const planLower = (plans.get(u.id) ?? '').toLowerCase()
      const isPaid = PAID_PLANS.has(planLower)
      return {
        id: u.id,
        email: u.email ?? '',
        name: name || null,
        created_at: u.created_at ?? '',
        credits: credits.has(u.id) ? credits.get(u.id) ?? null : null,
        videos_count: videoCounts.get(u.id) ?? 0,
        last_video_at: lastVideoAt.get(u.id) ?? null,
        plan: plans.get(u.id) ?? null,
        downloads_count: downloadCounts.get(u.id) ?? 0,
        unlock_clicks: unlockClicks.get(u.id) ?? 0,
        last_ip: ips.get(u.id) ?? null,
        last_country: countries.get(u.id) ?? null,
        // checkout_abandoned = has Stripe customer but no paid plan
        checkout_abandoned: (hasStripeCustomer.get(u.id) ?? false) && !isPaid,
        is_internal: internalIds.has(u.id),
        is_paid: isPaid,
      }
    })

    // Newest first by created_at.
    users.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))

    // KINEO-ADMIN-HQ-2026-08-03 — scoreboard summary (internal excluded).
    let payingActive = 0
    let signupsToday = 0
    for (const u of users) {
      if (u.is_internal) continue
      if (u.is_paid) payingActive += 1
      if (u.created_at && new Date(u.created_at).getTime() >= todayStartMs) signupsToday += 1
    }
    const summary: AdminSummary = {
      paying_active: payingActive,
      signups_today: signupsToday,
      videos_today: videosToday,
      downloads_today: downloadsToday,
    }

    return NextResponse.json({ users, summary })
  } catch (err) {
    console.error('[admin/users] unexpected:', err)
    return NextResponse.json(
      { error: 'Failed to load users', users: [] },
      { status: 500 }
    )
  }
}
