// KINEO-TRIAL-COHORT-2026-08-11 — /admin/trial-cohort: the 92 trials that are
// still holding credit, segmented by what they ACTUALLY did.
//
// WHY THIS SCREEN EXISTS: /admin/trial-abuse already answers "how many trials
// are in each trial_status and did anyone farm the grant?". It does NOT answer
// the only question that moves MRR this week: of the trials that are ALIVE
// RIGHT NOW, which ones are stuck, on what, and how many hours do I have left
// before their clock runs out? That is a behavioural cut, not a status cut, so
// it gets its own page instead of a fourth column on the abuse table.
//
// READ-ONLY BY CONSTRUCTION: this file only ever SELECTs. It never writes a
// profile, never touches video_credits / plan / trial_* , never sends an
// e-mail. The recovery e-mails it implies live as DRAFTS in
// docs/EMAILS-COORTE-TRIALS-2026-08-11.md and are sent by a human, on purpose —
// the founder approves copy before anything reaches 92 inboxes.
//
// THE FIVE GROUPS (evaluated in this order; first match wins, so every account
// lands in exactly one bucket and the five counts sum to the cohort):
//   1. CAP        — used >= 30 of TRIAL_CREDIT_CAP. Hit the ceiling or nearly.
//   2. ACTIVE     — took a file home AND came back on a second calendar day.
//   3. DL_GONE    — took a file home, never came back.
//   4. GEN_NO_DL  — made a video, never took the file.
//   5. NEVER_GEN  — holds the grant, no video exists.
// Order matters: ACTIVE is checked before DL_GONE so a returning downloader is
// never filed as churned, and CAP outranks everything because a capped account
// cannot generate again regardless of how engaged it looks.
//
// NUMBERS COME FROM lib/reverseTrial (TRIAL_CREDIT_CAP), never typed by hand —
// same rule as app/api/admin/_shared/mrr.ts. If the cap moves to 60, this page
// re-labels itself.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
// NOTE: deliberately NOT importing INTERNAL_ACCOUNTS_LABEL. That constant is
// the badge a surface must show when it FILTERS internal accounts out (see
// lib/internalAccounts). This page counts them in and badges them per row, so
// borrowing the label would assert the opposite of what the numbers do.
import { isInternalEmail } from '@/lib/internalAccounts'
import { fetchAllRows, isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { TRIAL_CREDIT_CAP } from '@/lib/reverseTrial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

/** Used-credit level at which we call a trial "capped or nearly". */
const NEAR_CAP_CREDITS = 30

// ── group vocabulary ────────────────────────────────────────────────────────

type GroupKey = 'cap' | 'active' | 'dl_gone' | 'gen_no_dl' | 'never_gen'

interface GroupMeta {
  key: GroupKey
  label: string
  accent: string
  /** The cause, as evidenced by events — not a guess. Shown on the card. */
  cause: string
}

const GROUPS: GroupMeta[] = [
  {
    key: 'never_gen',
    label: 'Never generated',
    accent: '#f87171',
    cause: 'Most of them DID press generate — they were failed by the render, not uninterested.',
  },
  {
    key: 'gen_no_dl',
    label: 'Generated, never downloaded',
    accent: '#fbbf24',
    cause: 'They saw the video and never clicked Download once. Not a download bug — a wanting bug.',
  },
  {
    key: 'dl_gone',
    label: 'Downloaded, then gone',
    accent: '#fb7185',
    cause: 'Got the file, never came back. No second reason to return was ever given.',
  },
  {
    key: 'active',
    label: 'Active and spending',
    accent: '#34d399',
    cause: 'Returned on another day with the file in hand. This is the shape that pays.',
  },
  {
    key: 'cap',
    label: `Capped or near (${NEAR_CAP_CREDITS}+/${TRIAL_CREDIT_CAP})`,
    accent: '#2997ff',
    cause: 'Out of runway. Cannot generate again without a plan.',
  },
]

const GROUP_BY_KEY = new Map(GROUPS.map((g) => [g.key, g]))

// ── data ────────────────────────────────────────────────────────────────────

interface TrialProfileRow {
  id: string
  email: string | null
  trial_status: string | null
  trial_ends_at: string | null
  trial_credits_used: number | null
  trial_credits_granted: number | null
  trial_variant: string | null
  signup_country: string | null
  last_country: string | null
  signup_utm_source: string | null
  utm_source: string | null
  created_at: string | null
}

interface EventRow {
  user_id: string | null
  name: string | null
  created_at: string | null
}

interface CohortRow {
  id: string
  email: string
  internal: boolean
  group: GroupKey
  country: string | null
  source: string
  creditsUsed: number
  creditsGranted: number
  creditsLeft: number
  videos: number
  downloads: number
  downloadClicks: number
  downloadFailures: number
  generateFailures: number
  stageErrors: number
  activeDays: number
  endsAt: string | null
  hoursLeft: number | null
  lastEventAt: string | null
  lastEventName: string | null
}

interface GroupStat {
  meta: GroupMeta
  count: number
  creditsLeft: number
  avgCreditsUsed: number
  due24: number
}

interface CohortData {
  rows: CohortRow[]
  groups: GroupStat[]
  total: number
  internalCount: number
  due24: number
  due48: number
  due7d: number
  expiredAlready: number
  creditsGrantedTotal: number
  creditsLeftTotal: number
  outageHit: number
  suspectTruncation: boolean
}

/**
 * The 08/09–08/11 compose outage. Any trial that recorded a
 * video_generation_failed inside this window burned trial clock on a product
 * that could not finish a render at all — see docs/COORTE-TRIALS-2026-08-11.md.
 * Kept as a constant (not a magic date in a filter) so it can be deleted in one
 * edit once the window stops being relevant.
 */
const OUTAGE_START = Date.parse('2026-08-09T17:00:00Z')
const OUTAGE_END = Date.parse('2026-08-11T02:00:00Z')

async function loadCohort(): Promise<CohortData | null> {
  const admin = serviceClient()
  if (!admin) return null

  const profiles = await fetchAllRows<TrialProfileRow>(
    admin,
    'profiles',
    'id, email, trial_status, trial_ends_at, trial_credits_used, trial_credits_granted, trial_variant, signup_country, last_country, signup_utm_source, utm_source, created_at',
  )
  const trials = profiles.filter((p) => (p.trial_status ?? '').toLowerCase() === 'active')
  if (trials.length === 0) {
    return {
      rows: [],
      groups: GROUPS.map((meta) => ({ meta, count: 0, creditsLeft: 0, avgCreditsUsed: 0, due24: 0 })),
      total: 0,
      internalCount: 0,
      due24: 0,
      due48: 0,
      due7d: 0,
      expiredAlready: 0,
      creditsGrantedTotal: 0,
      creditsLeftTotal: 0,
      outageHit: 0,
      suspectTruncation: false,
    }
  }

  const ids = trials.map((p) => p.id)

  // Scoping BOTH reads to the cohort keeps this page cheap: ~5k event rows and
  // a few hundred videos, instead of the 46k-row events table.
  const [videos, events] = await Promise.all([
    fetchAllRows<{ user_id: string | null }>(admin, 'videos', 'user_id', { column: 'user_id', values: ids }),
    fetchAllRows<EventRow>(admin, 'events', 'user_id, name, created_at', { column: 'user_id', values: ids }),
  ])

  const videoCount = new Map<string, number>()
  for (const v of videos) {
    if (!v.user_id) continue
    videoCount.set(v.user_id, (videoCount.get(v.user_id) ?? 0) + 1)
  }

  interface Agg {
    completed: number
    downloads: number
    downloadClicks: number
    downloadFailures: number
    failVideo: number
    failGenerate: number
    failStage: number
    days: Set<string>
    lastAt: string | null
    lastName: string | null
    outage: boolean
  }
  const agg = new Map<string, Agg>()
  const blank = (): Agg => ({
    completed: 0,
    downloads: 0,
    downloadClicks: 0,
    downloadFailures: 0,
    failVideo: 0,
    failGenerate: 0,
    failStage: 0,
    days: new Set<string>(),
    lastAt: null,
    lastName: null,
    outage: false,
  })

  for (const e of events) {
    if (!e.user_id) continue
    let a = agg.get(e.user_id)
    if (!a) {
      a = blank()
      agg.set(e.user_id, a)
    }
    // Event names are ALIAS SETS, not single names. The generator emits
    // generate_completed AND video_generation_completed for the same render
    // (see COMPLETE_EVENTS in app/api/admin/send-stalled-rescue), and failure
    // is spread across generate_failed / video_generation_failed /
    // generation_stage_error — /api/admin/funnel already does Math.max over
    // the pair for exactly this reason. Counting only one name here silently
    // undercounted failures by roughly two thirds.
    switch (e.name) {
      case 'video_generation_completed':
      case 'generate_completed':
        a.completed += 1
        break
      case 'video_downloaded':
        a.downloads += 1
        break
      case 'video_download_clicked':
        a.downloadClicks += 1
        break
      case 'video_download_failed':
      case 'video_download_popup_blocked':
        a.downloadFailures += 1
        break
      // video_generation_failed and generate_failed are TWO NAMES FOR ONE
      // event (identical counts in prod), so they are counted separately and
      // reconciled with Math.max below — summing them would double every
      // failure. generation_stage_error is a different granularity (one per
      // failing stage, e.g. compose_not_ok at clips_ready) so it only ever
      // feeds the "did this account hit a failure at all" boolean.
      case 'video_generation_failed':
        a.failVideo += 1
        break
      case 'generate_failed':
        a.failGenerate += 1
        break
      case 'generation_stage_error':
        a.failStage += 1
        break
      default:
        break
    }
    if (e.created_at) {
      a.days.add(e.created_at.slice(0, 10))
      if (!a.lastAt || e.created_at > a.lastAt) {
        a.lastAt = e.created_at
        a.lastName = e.name
      }
      if (
        e.name === 'video_generation_failed' ||
        e.name === 'generate_failed' ||
        e.name === 'generation_stage_error'
      ) {
        const t = Date.parse(e.created_at)
        if (Number.isFinite(t) && t >= OUTAGE_START && t <= OUTAGE_END) a.outage = true
      }
    }
  }

  const now = Date.now()
  const rows: CohortRow[] = trials.map((p) => {
    const a = agg.get(p.id) ?? blank()
    const used = p.trial_credits_used ?? 0
    // trial_credits_granted is `not null default 0`, so `??` would never fire
    // and a legacy/backfilled 0 would render "0/0 · 0 left" and deflate the
    // granted total. Guard the value that actually occurs, like
    // lib/reverseTrial.ts does.
    const granted = (p.trial_credits_granted ?? 0) > 0 ? (p.trial_credits_granted as number) : TRIAL_CREDIT_CAP
    const videosMade = videoCount.get(p.id) ?? 0
    const generated = a.completed > 0 || videosMade > 0

    // "Took the file home" is downloads OR download CLICKS. A mobile user
    // rescued by the manual link (lib/videoDownload.ts) is delivered but never
    // emits video_downloaded — classifying on the raw event alone would file a
    // successful delivery as "generated, never downloaded" and then tell the
    // founder they "never clicked Download once", which is the opposite of
    // what happened.
    const tookFile = a.downloads > 0 || a.downloadClicks > 0

    let group: GroupKey
    if (used >= NEAR_CAP_CREDITS) group = 'cap'
    else if (tookFile && a.days.size >= 2) group = 'active'
    else if (tookFile) group = 'dl_gone'
    else if (generated) group = 'gen_no_dl'
    else group = 'never_gen'

    const endsMs = p.trial_ends_at ? Date.parse(p.trial_ends_at) : NaN
    const hoursLeft = Number.isFinite(endsMs) ? (endsMs - now) / 3_600_000 : null

    return {
      id: p.id,
      email: p.email ?? '(no email)',
      internal: isInternalEmail(p.email),
      group,
      country: p.signup_country ?? p.last_country ?? null,
      source: p.signup_utm_source || p.utm_source || 'direct',
      creditsUsed: used,
      creditsGranted: granted,
      creditsLeft: Math.max(0, granted - used),
      videos: videosMade,
      downloads: a.downloads,
      downloadClicks: a.downloadClicks,
      downloadFailures: a.downloadFailures,
      // Two names, one event — never their sum.
      generateFailures: Math.max(a.failVideo, a.failGenerate),
      stageErrors: a.failStage,
      activeDays: a.days.size,
      endsAt: p.trial_ends_at,
      hoursLeft,
      lastEventAt: a.lastAt,
      lastEventName: a.lastName,
    }
  })

  // Soonest deadline first — this page is a countdown, not a leaderboard.
  rows.sort((x, y) => {
    const a = x.hoursLeft ?? Number.POSITIVE_INFINITY
    const b = y.hoursLeft ?? Number.POSITIVE_INFINITY
    return a - b
  })

  const groups: GroupStat[] = GROUPS.map((meta) => {
    const inGroup = rows.filter((r) => r.group === meta.key)
    const usedSum = inGroup.reduce((s, r) => s + r.creditsUsed, 0)
    return {
      meta,
      count: inGroup.length,
      creditsLeft: inGroup.reduce((s, r) => s + r.creditsLeft, 0),
      avgCreditsUsed: inGroup.length > 0 ? usedSum / inGroup.length : 0,
      due24: inGroup.filter((r) => dueWithin(r, 24)).length,
    }
  })

  const outageHit = trials.filter((p) => agg.get(p.id)?.outage).length

  return {
    rows,
    groups,
    total: rows.length,
    internalCount: rows.filter((r) => r.internal).length,
    due24: rows.filter((r) => dueWithin(r, 24)).length,
    due48: rows.filter((r) => dueWithin(r, 48)).length,
    due7d: rows.filter((r) => dueWithin(r, 24 * 7)).length,
    // Expiry is PASSIVE (lib/reverseTrial): a row can still be
    // trial_status='active' with the clock already run out, and the cron has
    // not downgraded it yet. Those belong in no "due in N hours" bucket, so
    // they are surfaced separately instead of vanishing from every counter.
    expiredAlready: rows.filter((r) => r.hoursLeft !== null && r.hoursLeft <= 0).length,
    creditsGrantedTotal: rows.reduce((s, r) => s + r.creditsGranted, 0),
    creditsLeftTotal: rows.reduce((s, r) => s + r.creditsLeft, 0),
    outageHit,
    // Truncation tripwire: fetchAllRows degrades to a PARTIAL array on any
    // PostgREST error (it warns and breaks). If the events read came back
    // empty while trials exist, every account would silently fall through to
    // "never generated" and this page would render a confident, fabricated
    // diagnosis. Better to refuse than to lie to the person deciding who gets
    // an apology e-mail.
    suspectTruncation: trials.length > 0 && events.length === 0,
  }
}

/**
 * "Expires within N hours" — strictly in the FUTURE. `hoursLeft` is negative
 * for a trial whose clock already ran out (the row is still trial_status
 * 'active' because expiry is passive, see lib/reverseTrial), and `< 24` is
 * true for every negative number, so the naive test inflated the red headline
 * with trials that are already over.
 */
function dueWithin(r: CohortRow, hours: number): boolean {
  return r.hoursLeft !== null && r.hoursLeft > 0 && r.hoursLeft < hours
}

// ── formatting ──────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

/** "3h left" / "2d left" / "expired" — the only number the founder reads first. */
function fmtCountdown(hours: number | null): string {
  if (hours === null) return '—'
  if (hours <= 0) return 'expired'
  if (hours < 48) return `${Math.floor(hours)}h left`
  return `${Math.floor(hours / 24)}d left`
}

function countdownColor(hours: number | null): string {
  if (hours === null) return '#86868b'
  if (hours <= 0) return '#6e6e73'
  if (hours < 24) return '#f87171'
  if (hours < 48) return '#fbbf24'
  return '#86868b'
}

function fmtAgo(iso: string | null): string {
  if (!iso) return 'never'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'never'
  const h = (Date.now() - t) / 3_600_000
  if (h < 1) return 'just now'
  if (h < 48) return `${Math.floor(h)}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── page ────────────────────────────────────────────────────────────────────

export default async function AdminTrialCohortPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center" style={CARD}>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: '#f5f5f7' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: '#86868b' }}>Admin only.</p>
        </div>
      </Shell>
    )
  }

  const data = await loadCohort()
  if (!data) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
          Service role not configured on this environment.
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#fbbf24' }}>
          Admin · Live trial cohort
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#f5f5f7' }}>
          {data.total} trial{data.total === 1 ? '' : 's'} still holding credit
        </h1>
        <p className="text-xs mt-1" style={{ color: '#86868b' }}>
          Every account with trial_status = active, bucketed by what it actually did. Read-only —
          this page sends nothing. Drafts live in docs/EMAILS-COORTE-TRIALS-2026-08-11.md.
          {data.internalCount > 0 &&
            ` Internal accounts are INCLUDED in these counts and badged in the table (${data.internalCount}) — unlike /admin/paying, nothing here is filtered out.`}
        </p>
        <nav className="flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Reverse trial', href: '/admin/trial-abuse' },
            { label: 'Paying', href: '/admin/paying' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Funnel', href: '/admin/funnel' },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ color: '#86868b' }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {data.suspectTruncation && (
        <div
          className="rounded-2xl p-4 mb-6 text-sm"
          style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.5)', color: '#f87171' }}
        >
          <strong>Do not act on these numbers.</strong> {data.total} trials were found but the events
          read came back empty, which means the query failed rather than that nobody did anything.
          Every account below would be mis-filed as &quot;never generated&quot;. Reload; if it persists,
          check the service-role key and the PostgREST logs.
        </div>
      )}

      {/* Clock */}
      <section className="mb-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="rounded-xl p-5" style={{ ...CARD, border: '1px solid rgba(248,113,113,.4)' }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#f87171' }}>
            Expire in 24h
          </div>
          <div className="font-black" style={{ fontSize: '2.4rem', lineHeight: 1.1, color: '#f87171' }}>
            {data.due24}
          </div>
          <p className="text-xs mt-1" style={{ color: '#86868b' }}>
            {data.due48} within 48h · {data.due7d} within 7d (cumulative)
            {data.expiredAlready > 0 && (
              <>
                <br />
                <span style={{ color: '#fbbf24' }}>
                  + {data.expiredAlready} clock already run out, not yet downgraded
                </span>
              </>
            )}
          </p>
        </div>
        <div className="rounded-xl p-4" style={CARD}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#86868b' }}>
            Credits unspent
          </div>
          <div className="font-black" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: '#f5f5f7' }}>
            {data.creditsLeftTotal}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#86868b' }}>
            of {data.creditsGrantedTotal} actually granted · expires with the clock
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ ...CARD, border: '1px solid rgba(251,191,36,.4)' }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#fbbf24' }}>
            Hit the 08/09–08/11 outage
          </div>
          <div className="font-black" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: '#fbbf24' }}>
            {data.outageHit}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#86868b' }}>
            burned trial clock in the ~33h when compose returned zero videos
          </p>
        </div>
      </section>

      {/* Groups */}
      <section className="mb-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {data.groups.map((g) => (
          <div key={g.meta.key} className="rounded-xl p-4" style={{ ...CARD, border: `1px solid ${g.meta.accent}44` }}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: g.meta.accent }}>
              {g.meta.label}
            </div>
            <div className="font-black" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: '#f5f5f7' }}>
              {g.count}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: '#86868b' }}>
              {g.avgCreditsUsed.toFixed(1)} credits avg · {g.creditsLeft} left · {g.due24} expire in 24h
            </p>
            <p className="text-[11px] mt-2" style={{ color: '#6e6e73' }}>{g.meta.cause}</p>
          </div>
        ))}
      </section>

      {/* Table */}
      <section className="rounded-2xl overflow-x-auto" style={CARD}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1d1d1f' }}>
              {['Account', 'Group', 'Clock', 'Credits', 'Videos', 'Downloads', 'Days', 'Last event', 'Country', 'Source'].map((h) => (
                <th
                  key={h}
                  className="font-black uppercase tracking-widest"
                  style={{ fontSize: '0.62rem', color: '#86868b', textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-sm" style={{ color: '#86868b' }}>
                  No active trials right now.
                </td>
              </tr>
            )}
            {data.rows.map((r) => {
              const meta = GROUP_BY_KEY.get(r.group)
              const accent = meta?.accent ?? '#86868b'
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #2a2a2d', opacity: r.internal ? 0.55 : 1 }}>
                  <Td>
                    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.82rem' }}>
                      {r.email}
                      {r.internal && (
                        <span
                          className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-black uppercase"
                          style={{ background: 'rgba(134,134,139,.15)', color: '#86868b', border: '1px solid #3a3a3d' }}
                        >
                          internal
                        </span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: '#6e6e73' }}>{r.id.slice(0, 8)}</div>
                  </Td>
                  <Td>
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}59` }}
                    >
                      {meta?.label ?? r.group}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: countdownColor(r.hoursLeft), fontWeight: 700 }}>
                      {fmtCountdown(r.hoursLeft)}
                    </span>
                    <div className="text-[11px]" style={{ color: '#6e6e73' }}>{fmtDate(r.endsAt)}</div>
                  </Td>
                  <Td>
                    {r.creditsUsed}/{r.creditsGranted}
                    <div className="text-[11px]" style={{ color: '#6e6e73' }}>{r.creditsLeft} left</div>
                  </Td>
                  <Td>
                    {r.videos}
                    {/* Both cuts, because they answer different questions:
                        "failed" is failed RENDERS, "stage err" catches the
                        accounts whose only evidence of trying is a
                        generation_stage_error (compose_not_ok). Showing only
                        the first hides the people we most owe an apology. */}
                    {r.generateFailures > 0 && (
                      <div className="text-[11px]" style={{ color: '#f87171' }}>{r.generateFailures} failed</div>
                    )}
                    {r.generateFailures === 0 && r.stageErrors > 0 && (
                      <div className="text-[11px]" style={{ color: '#fbbf24' }}>{r.stageErrors} stage err</div>
                    )}
                  </Td>
                  <Td>
                    {r.downloads}
                    {r.downloadFailures > 0 && (
                      <div className="text-[11px]" style={{ color: '#f87171' }}>{r.downloadFailures} failed</div>
                    )}
                    {r.downloadFailures === 0 && r.downloadClicks === 0 && r.videos > 0 && (
                      <div className="text-[11px]" style={{ color: '#6e6e73' }}>never clicked</div>
                    )}
                  </Td>
                  <Td>{r.activeDays}</Td>
                  <Td>
                    {fmtAgo(r.lastEventAt)}
                    {r.lastEventName && (
                      <div className="text-[11px]" style={{ color: '#6e6e73' }}>{r.lastEventName}</div>
                    )}
                  </Td>
                  <Td>{r.country ? `${flagEmoji(r.country)} ${r.country}` : '—'}</Td>
                  <Td>{r.source}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <p className="text-[11px] mt-3" style={{ color: '#6e6e73' }}>
        Groups are evaluated in order — capped, then active, then downloaded-and-gone, then
        generated-without-downloading, then never-generated — so the five counts always sum to{' '}
        {data.total}. &quot;Downloads&quot; counts events.video_downloaded, which only fires on the blob
        path: a mobile user rescued by the manual link is delivered but shows 0 here, so treat
        &quot;never clicked&quot; (no video_download_clicked at all) as the honest churn signal, not the
        raw zero. Full write-up: docs/COORTE-TRIALS-2026-08-11.md.
      </p>
    </Shell>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '10px 14px', color: '#f5f5f7', whiteSpace: 'nowrap' }}>{children}</td>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1400px] mx-auto">{children}</div>
    </div>
  )
}
