// KINEO-ADMIN-CEO-2026-08-03 — the CEO screen's data layer, in ONE place.
//
// Before this file the exact same ~150 lines lived twice (app/api/admin/ceo/
// route.ts for polling + app/(dashboard)/admin/ceo/page.tsx for the SSR seed)
// and had already drifted apart. Now the route, the /admin/ceo page and the
// new /admin home all call computeCeoData().
//
// WHAT CHANGED vs the old copies (all bugs, all confirmed against prod):
//   1. MRR was proUsers*9.90 + basicUsers*4.90. Neither price exists: 'basic'
//      is Creator at $24.90 and 'pro' is Studio at $37.90 ($4.90 is the one-off
//      first-month pack). Starter and Autopilot customers counted as $0.
//      Now every plan is priced from lib/pricing via _shared/mrr.
//   2. Nothing excluded internal accounts, so the founder's own autopilot_trial
//      and his family's test subscriptions showed up as revenue. Now every
//      aggregate runs on external profiles only (lib/internalAccounts).
//   3. The base table was auth.admin.listUsers({ perPage: 1000 }) — a hard cap
//      one bad week away from truncating. profiles has email + plan +
//      created_at + stripe_customer_id in one paged read.
//   4. Added the 7d/30d/all-time acquisition funnel the founder asked for
//      (signed up → first video → opened checkout → paid) and the
//      stripe_customer_id leak, which is the loudest number on the panel.

import { stripe } from '@/lib/stripe'
import { INTERNAL_ACCOUNTS_LABEL, isInternalEmail } from '@/lib/internalAccounts'
import { fetchAllRows, serviceClient } from '../_shared/db'
import {
  formatUsd,
  isPaidPlan,
  mrrForPlan,
  pct,
  planAccent,
  planBase,
  planLabel,
  type PlanBase,
} from '../_shared/mrr'

const DAY_MS = 24 * 60 * 60 * 1000

// ── shapes ──────────────────────────────────────────────────────────────────

export interface FunnelStep {
  label: string
  hint: string
  count: number
  /** % of the previous step. Can exceed 100% — see note in FunnelWindow. */
  pctOfPrev: string
  /** % of the cohort's signups (the top of the funnel). */
  pctOfTop: string
  dropAbs: number
}

export interface FunnelWindow {
  key: '7d' | '30d' | 'all'
  label: string
  signups: number
  steps: FunnelStep[]
  /** Bought without ever generating a video — sold by the landing page, not the product. */
  paidWithoutVideo: number
}

export interface PlanRevenueRow {
  base: PlanBase
  label: string
  count: number
  priceUsd: number
  mrrUsd: number
  accent: string
}

export interface CeoData {
  generatedAt: string
  scopeLabel: string
  internalExcluded: number

  // ── Revenue (official metric: ACTIVE PAID PLAN — docs/METAS.md) ──────────
  mrr: number
  mrrLabel: string
  arpu: number | null
  payingActive: number
  mrrByPlan: PlanRevenueRow[]
  /** Legacy field kept so nothing that already reads CeoData breaks. */
  paidTotal: number
  proUsers: number
  basicUsers: number
  starterUsers: number
  autopilotUsers: number
  /** Ever paid at least once, refunds included. Vanity metric — shown small. */
  hasPaidEver: number

  // ── Growth ───────────────────────────────────────────────────────────────
  totalUsers: number
  signupsToday: number
  signupsThisWeek: number
  signupsThisMonth: number

  // ── Activation ───────────────────────────────────────────────────────────
  newUsersThisWeek: number
  newActivatedThisWeek: number
  activationRateWeek: string
  videosToday: number
  videosThisWeek: number
  signupToPaidRate: string
  signupToVideoRate: string

  // ── Funnel (7d / 30d / all-time) ─────────────────────────────────────────
  funnels: FunnelWindow[]

  // ── The leak: Stripe customer created, still not paying ──────────────────
  checkoutLeak: {
    openedCheckout: number
    stuckFree: number
    payingActive: number
    conversion: string
  }

  // ── At-risk paid users (credits ≤ 2) ─────────────────────────────────────
  atRiskCount: number
  atRiskUsers: Array<{ email: string; plan: string; credits: number }>

  // ── Abandoned Stripe checkouts (hot leads — full table at /admin/leads) ──
  abandonedCount: number
  abandonedLeads: Array<{ email: string; plan: string | null; abandonedAt: string; daysAgo: number }>
  checkoutCreated: number
  checkoutCompleted: number
  checkoutAbandoned: number
  checkoutConversionRate: string
}

// ── row types ───────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  email: string | null
  plan: string | null
  created_at: string | null
  stripe_customer_id: string | null
  video_credits: number | null
  has_paid: boolean | null
}

interface VideoRow {
  user_id: string | null
  created_at: string | null
}

// ── funnel ──────────────────────────────────────────────────────────────────

const WINDOWS: Array<{ key: FunnelWindow['key']; label: string; days: number | null }> = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'all', label: 'All time', days: null },
]

function buildFunnel(
  key: FunnelWindow['key'],
  label: string,
  cohort: ProfileRow[],
  usersWithVideo: Set<string>,
): FunnelWindow {
  const signups = cohort.length
  const madeVideo = cohort.filter((p) => usersWithVideo.has(p.id)).length
  // "Opened checkout" = has a stripe_customer_id. Stripe only creates one when
  // the user actually reaches the payment page, so this is the cleanest
  // server-side proof of intent we have — no client event can be blocked away.
  const openedCheckout = cohort.filter((p) => p.stripe_customer_id).length
  const paid = cohort.filter((p) => isPaidPlan(p.plan)).length

  const raw: Array<{ label: string; hint: string; count: number }> = [
    { label: 'Signed up', hint: 'created an account', count: signups },
    { label: 'Generated 1st video', hint: '≥ 1 video ever', count: madeVideo },
    { label: 'Opened checkout', hint: 'has a Stripe customer', count: openedCheckout },
    { label: 'Bought', hint: 'active paid plan', count: paid },
  ]

  const steps: FunnelStep[] = raw.map((s, i) => {
    const prev = i === 0 ? s.count : raw[i - 1].count
    return {
      label: s.label,
      hint: s.hint,
      count: s.count,
      pctOfPrev: i === 0 ? '100%' : pct(s.count, prev),
      pctOfTop: pct(s.count, signups),
      dropAbs: i === 0 ? 0 : Math.max(0, prev - s.count),
    }
  })

  return {
    key,
    label,
    signups,
    steps,
    paidWithoutVideo: cohort.filter((p) => isPaidPlan(p.plan) && !usersWithVideo.has(p.id)).length,
  }
}

// ── main ────────────────────────────────────────────────────────────────────

export async function computeCeoData(): Promise<CeoData | null> {
  const admin = serviceClient()
  if (!admin) return null

  const [profiles, videos] = await Promise.all([
    fetchAllRows<ProfileRow>(
      admin,
      'profiles',
      'id, email, plan, created_at, stripe_customer_id, video_credits, has_paid',
    ),
    fetchAllRows<VideoRow>(admin, 'videos', 'user_id, created_at'),
  ])
  if (profiles.length === 0) return null

  // Internal accounts (founder + family + test) are excluded from EVERY
  // aggregate. They are 5 of the 6 non-free plans in prod — leaving them in
  // multiplies MRR by ~7x.
  const external = profiles.filter((p) => !isInternalEmail(p.email))
  const internalExcluded = profiles.length - external.length
  const externalIds = new Set(external.map((p) => p.id))

  const now = Date.now()
  const todayAgo = now - DAY_MS
  const weekAgo = now - 7 * DAY_MS
  const monthAgo = now - 30 * DAY_MS

  // ── videos ────────────────────────────────────────────────────────────────
  const usersWithVideo = new Set<string>()
  let videosToday = 0
  let videosThisWeek = 0
  for (const v of videos) {
    if (!v.user_id || !externalIds.has(v.user_id)) continue
    usersWithVideo.add(v.user_id)
    const t = v.created_at ? new Date(v.created_at).getTime() : 0
    if (t >= todayAgo) videosToday += 1
    if (t >= weekAgo) videosThisWeek += 1
  }

  // ── revenue ───────────────────────────────────────────────────────────────
  const byPlan = new Map<PlanBase, PlanRevenueRow>()
  let mrr = 0
  let payingActive = 0
  let hasPaidEver = 0
  const atRiskUsers: CeoData['atRiskUsers'] = []

  for (const p of external) {
    if (p.has_paid) hasPaidEver += 1
    if (!isPaidPlan(p.plan)) continue
    payingActive += 1
    const price = mrrForPlan(p.plan)
    mrr += price
    const base = planBase(p.plan)
    const row = byPlan.get(base)
    if (row) {
      row.count += 1
      row.mrrUsd += price
    } else {
      byPlan.set(base, {
        base,
        label: planLabel(p.plan),
        count: 1,
        priceUsd: price,
        mrrUsd: price,
        accent: planAccent(p.plan),
      })
    }
    if ((p.video_credits ?? 999) <= 2) {
      atRiskUsers.push({
        email: p.email ?? p.id,
        plan: planLabel(p.plan),
        credits: p.video_credits ?? 0,
      })
    }
  }
  atRiskUsers.sort((a, b) => a.credits - b.credits)

  const mrrByPlan = [...byPlan.values()].sort((a, b) => b.mrrUsd - a.mrrUsd)
  const countFor = (b: PlanBase) => byPlan.get(b)?.count ?? 0

  // ── growth ────────────────────────────────────────────────────────────────
  let signupsToday = 0
  let signupsThisWeek = 0
  let signupsThisMonth = 0
  const newThisWeek: ProfileRow[] = []
  for (const p of external) {
    const t = p.created_at ? new Date(p.created_at).getTime() : 0
    if (t >= todayAgo) signupsToday += 1
    if (t >= weekAgo) {
      signupsThisWeek += 1
      newThisWeek.push(p)
    }
    if (t >= monthAgo) signupsThisMonth += 1
  }
  const newActivatedThisWeek = newThisWeek.filter((p) => usersWithVideo.has(p.id)).length

  // ── funnels ───────────────────────────────────────────────────────────────
  const funnels = WINDOWS.map((w) => {
    const cutoff = w.days === null ? 0 : now - w.days * DAY_MS
    const cohort =
      w.days === null
        ? external
        : external.filter((p) => (p.created_at ? new Date(p.created_at).getTime() : 0) >= cutoff)
    return buildFunnel(w.key, w.label, cohort, usersWithVideo)
  })

  // ── the leak ──────────────────────────────────────────────────────────────
  // Everyone who ever reached Stripe vs everyone who actually pays today.
  const openedCheckout = external.filter((p) => p.stripe_customer_id).length
  const stuckFree = external.filter((p) => p.stripe_customer_id && !isPaidPlan(p.plan)).length

  // ── Stripe abandoned checkouts ────────────────────────────────────────────
  let checkoutCreated = 0
  let checkoutCompleted = 0
  let checkoutAbandoned = 0
  const leadMap = new Map<string, CeoData['abandonedLeads'][number]>()
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const sessions = await stripe.checkout.sessions.list({ limit: 100 })
      for (const s of sessions.data) {
        checkoutCreated += 1
        if (s.status === 'complete') {
          checkoutCompleted += 1
          continue
        }
        if (s.status !== 'expired') continue
        checkoutAbandoned += 1
        const custEmail = (s.customer_details?.email ?? '').toLowerCase()
        if (!custEmail || isInternalEmail(custEmail)) continue
        const at = new Date(s.expires_at * 1000).toISOString()
        const lead = {
          email: custEmail,
          plan: (s.metadata?.plan ?? null) as string | null,
          abandonedAt: at,
          daysAgo: Math.floor((now - new Date(at).getTime()) / DAY_MS),
        }
        const existing = leadMap.get(custEmail)
        if (!existing || lead.daysAgo < existing.daysAgo) leadMap.set(custEmail, lead)
      }
    }
  } catch (e) {
    console.warn('[admin/ceo] Stripe query failed:', e instanceof Error ? e.message : String(e))
  }
  // Anyone who has since paid is not a lead any more.
  const paidEmails = new Set(
    external.filter((p) => isPaidPlan(p.plan)).map((p) => (p.email ?? '').toLowerCase()),
  )
  const abandonedLeads = [...leadMap.values()]
    .filter((l) => !paidEmails.has(l.email))
    .sort((a, b) => a.daysAgo - b.daysAgo)

  const totalUsers = external.length

  return {
    generatedAt: new Date().toISOString(),
    scopeLabel: INTERNAL_ACCOUNTS_LABEL,
    internalExcluded,

    mrr,
    mrrLabel: formatUsd(mrr),
    arpu: payingActive > 0 ? mrr / payingActive : null,
    payingActive,
    mrrByPlan,
    paidTotal: payingActive,
    proUsers: countFor('studio'),
    basicUsers: countFor('creator'),
    starterUsers: countFor('starter'),
    autopilotUsers: countFor('autopilot'),
    hasPaidEver,

    totalUsers,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,

    newUsersThisWeek: newThisWeek.length,
    newActivatedThisWeek,
    activationRateWeek: pct(newActivatedThisWeek, newThisWeek.length),
    videosToday,
    videosThisWeek,
    signupToPaidRate: pct(payingActive, totalUsers),
    signupToVideoRate: pct(usersWithVideo.size, totalUsers),

    funnels,

    checkoutLeak: {
      openedCheckout,
      stuckFree,
      payingActive,
      conversion: pct(payingActive, openedCheckout),
    },

    atRiskCount: atRiskUsers.length,
    atRiskUsers: atRiskUsers.slice(0, 10),

    abandonedCount: abandonedLeads.length,
    abandonedLeads: abandonedLeads.slice(0, 15),
    checkoutCreated,
    checkoutCompleted,
    checkoutAbandoned,
    checkoutConversionRate: pct(checkoutCompleted, checkoutCompleted + checkoutAbandoned),
  }
}
