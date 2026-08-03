'use client'

// KINEO-ADMIN-HQ-2026-08-03 — Admin HQ client (single consolidated screen).
//
// Replaces screen-hopping between /admin/users, /admin/ceo, /admin/metrics
// and /admin/funnel with one page, top to bottom:
//   1. SCOREBOARD — active payers (internal accounts excluded, real
//      PAID_PLANS), signups / videos / downloads today (UTC, server-side).
//   2. 🔥 HOT LEADS — free users with ≥5 downloads or ≥1 unlock click.
//      Free plan = 3 videos/day, so 21 downloads is an addicted user who
//      still hasn't paid. These are the people to convert first.
//   3. COMPACT FUNNEL — signup → generated → downloaded → opened checkout
//      → paid, derived from the same rows the table shows (internal
//      excluded). Full cohort funnel stays at /admin/funnel.
//   4. USERS TABLE — every user (now paginated past 500 server-side),
//      searchable, sortable, plan-filterable, colored plan badges +
//      "abandoned checkout" badge.
// Data source: ONE endpoint — /api/admin/users — which also returns the
// scoreboard summary so this page costs a single request per refresh.
// Old screens remain linked in the footer.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

const POLL_MS = 60_000

interface AdminUserRow {
  id: string
  email: string
  name: string | null
  created_at: string
  credits: number | null
  videos_count: number
  last_video_at: string | null
  plan: string | null
  downloads_count: number
  unlock_clicks: number
  last_ip: string | null
  last_country: string | null
  checkout_abandoned: boolean
  is_internal: boolean
  is_paid: boolean
}

interface AdminSummary {
  paying_active: number
  signups_today: number
  videos_today: number
  downloads_today: number
}

interface Props {
  viewerEmail?: string
  denied?: boolean
}

type SortKey = 'created_at' | 'downloads_count' | 'videos_count'
type PlanFilter = 'all' | 'paid' | 'free' | string

const CARD: React.CSSProperties = {
  background: '#161618',
  border: '1px solid #2a2a2d',
  borderRadius: 20,
}

// ── formatting helpers ──────────────────────────────────────────────────────

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-US')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function pctOf(n: number, d: number): string {
  if (!d || d <= 0) return '—'
  return `${((n / d) * 100).toFixed(1)}%`
}

// ISO country code → flag emoji (🇧🇷, 🇺🇸, …).
function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

// ── plan badge (colors requested by the founder) ────────────────────────────
// free gray · starter blue · creator purple · studio amber · basic/pro green
// · autopilot rose. "_trial" renders as a small suffix, autopilot_pilot as
// "autopilot · pilot".

function planColors(base: string): { bg: string; fg: string; border: string } {
  switch (base) {
    case 'starter':
      return { bg: 'rgba(41,151,255,.12)', fg: '#2997ff', border: 'rgba(41,151,255,.35)' }
    case 'creator':
      return { bg: 'rgba(167,139,250,.12)', fg: '#a78bfa', border: 'rgba(167,139,250,.35)' }
    case 'studio':
      return { bg: 'rgba(251,191,36,.12)', fg: '#fbbf24', border: 'rgba(251,191,36,.35)' }
    case 'basic':
    case 'pro':
      return { bg: 'rgba(52,211,153,.12)', fg: '#34d399', border: 'rgba(52,211,153,.35)' }
    case 'autopilot':
      return { bg: 'rgba(251,113,133,.12)', fg: '#fb7185', border: 'rgba(251,113,133,.35)' }
    default:
      return { bg: 'rgba(134,134,139,.1)', fg: '#86868b', border: 'rgba(134,134,139,.3)' }
  }
}

function planBase(plan: string | null): string {
  const p = (plan ?? 'free').toLowerCase()
  return p.replace('_trial', '').replace('_pilot', '')
}

function PlanBadge({ plan, credits, isPaid }: { plan: string | null; credits: number | null; isPaid: boolean }) {
  const p = (plan ?? 'free').toLowerCase()
  const base = planBase(plan)
  const c = planColors(base)
  const suffix = p.endsWith('_trial') ? 'trial' : p.endsWith('_pilot') ? 'pilot' : null
  const noCredits = isPaid && (credits === null || credits <= 0)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold capitalize"
        style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
      >
        {base}
        {suffix ? <span style={{ marginLeft: 4, opacity: 0.75, textTransform: 'none' }}>· {suffix}</span> : null}
      </span>
      {noCredits && (
        <span title="Paid plan with 0 credits — check the Stripe webhook" style={{ color: '#f87171', fontSize: 12 }}>
          ⚠️
        </span>
      )}
    </span>
  )
}

// ── shared atoms ────────────────────────────────────────────────────────────

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ ...CARD, border: `1px solid ${accent ? `${accent}44` : '#2a2a2d'}` }}>
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: accent ?? '#86868b' }}>
        {label}
      </div>
      <div className="font-semibold" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: '#f5f5f7' }}>
        {value}
      </div>
      {hint && (
        <p className="text-[11px] mt-1.5" style={{ color: '#86868b' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function Th({
  children,
  align = 'left',
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  onClick?: () => void
  active?: boolean
  dir?: 'asc' | 'desc'
}) {
  return (
    <th
      className="font-black uppercase tracking-widest"
      onClick={onClick}
      style={{
        fontSize: '0.62rem',
        color: active ? '#2997ff' : '#86868b',
        textAlign: align,
        padding: '10px 14px',
        cursor: onClick ? 'pointer' : undefined,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      {onClick ? <span style={{ marginLeft: 4 }}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span> : null}
    </th>
  )
}

function Td({
  children,
  align = 'left',
  mono,
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  mono?: boolean
}) {
  return (
    <td
      style={{
        padding: '10px 14px',
        color: '#f5f5f7',
        textAlign: align,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
        fontSize: mono ? '0.82rem' : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </td>
  )
}

// ── main component ──────────────────────────────────────────────────────────

export default function AdminHqClient({ viewerEmail, denied }: Props) {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (denied) return
    async function load(isInitial: boolean) {
      if (isInitial) setLoading(true)
      else setRefreshing(true)
      try {
        const r = await fetch('/api/admin/users', { cache: 'no-store' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json = await r.json()
        if (Array.isArray(json.users)) {
          setUsers(json.users)
          setSummary(json.summary ?? null)
          setError(null)
        }
      } catch (e) {
        console.error('[admin-hq] fetch failed:', e)
        if (isInitial) setError('Failed to load admin data.')
      } finally {
        if (isInitial) setLoading(false)
        else setRefreshing(false)
      }
    }
    load(true)
    timerRef.current = setInterval(() => load(false), POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [denied])

  // External = everything a real customer could be (internal accounts out).
  const external = useMemo(() => (users ?? []).filter((u) => !u.is_internal), [users])

  // 🔥 Hot leads: free users burning through the free tier (3 videos/day) —
  // ≥5 downloads or ≥1 unlock click and still not paying.
  const hotLeads = useMemo(() => {
    return external
      .filter((u) => !u.is_paid && (u.downloads_count >= 5 || u.unlock_clicks > 0))
      .sort(
        (a, b) =>
          b.downloads_count - a.downloads_count ||
          b.unlock_clicks - a.unlock_clicks ||
          b.videos_count - a.videos_count
      )
  }, [external])

  // Compact funnel derived from the exact rows shown below (internal excluded).
  const funnel = useMemo(() => {
    const signups = external.length
    const generated = external.filter((u) => u.videos_count > 0).length
    const downloaded = external.filter((u) => u.downloads_count > 0).length
    const openedCheckout = external.filter(
      (u) => u.is_paid || u.checkout_abandoned || u.unlock_clicks > 0
    ).length
    const paid = external.filter((u) => u.is_paid).length
    return [
      { label: 'Signups', count: signups },
      { label: 'Generated a video', count: generated },
      { label: 'Downloaded', count: downloaded },
      { label: 'Opened checkout', count: openedCheckout },
      { label: 'Paid', count: paid },
    ]
  }, [external])

  // Plan filter options actually present in the data.
  const planOptions = useMemo(() => {
    const bases = new Set<string>()
    for (const u of users ?? []) bases.add(planBase(u.plan))
    bases.delete('free')
    return ['all', 'paid', 'free', ...[...bases].sort()]
  }, [users])

  const filtered = useMemo(() => {
    if (!users) return []
    const q = query.trim().toLowerCase()
    let rows = users
    if (q) {
      rows = rows.filter(
        (u) => u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q)
      )
    }
    if (planFilter === 'paid') rows = rows.filter((u) => u.is_paid)
    else if (planFilter === 'free') rows = rows.filter((u) => !u.is_paid)
    else if (planFilter !== 'all') rows = rows.filter((u) => planBase(u.plan) === planFilter)
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortKey === 'created_at') {
        return a.created_at < b.created_at ? -dir : a.created_at > b.created_at ? dir : 0
      }
      return (a[sortKey] - b[sortKey]) * dir
    })
  }, [users, query, planFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (denied) {
    return (
      <div className="px-4 sm:px-6 py-10 pb-20 max-w-3xl mx-auto">
        <div className="rounded-2xl p-8 text-center" style={CARD}>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: '#f5f5f7' }}>
            Admin access required.
          </h1>
          <p className="text-sm" style={{ color: '#86868b' }}>
            Please sign in with an authorized account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#2997ff' }}>
            Admin
          </div>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <h1
              className="font-semibold tracking-tight"
              style={{
                fontSize: '1.6rem',
                background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Admin HQ
            </h1>
            <div className="text-[11px]" style={{ color: '#86868b' }}>
              {refreshing ? 'Refreshing…' : viewerEmail ? `Signed in as ${viewerEmail}` : ''}
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: '#86868b' }}>
            One screen: scoreboard → hot leads → funnel → all users. Internal accounts excluded from
            every aggregate number.
          </p>
        </header>

        {loading && !users && (
          <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
            Loading Admin HQ…
          </div>
        )}
        {error && !users && (
          <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#f87171' }}>
            {error}
          </div>
        )}

        {users && (
          <>
            {/* 1 — SCOREBOARD */}
            <section className="mb-6">
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <Kpi
                  label="Active payers"
                  value={fmt(summary?.paying_active ?? external.filter((u) => u.is_paid).length)}
                  hint="paid plan · internal excluded"
                  accent="#34d399"
                />
                <Kpi label="Signups today" value={fmt(summary?.signups_today ?? null)} hint="UTC day" accent="#2997ff" />
                <Kpi label="Videos today" value={fmt(summary?.videos_today ?? null)} hint="UTC day" accent="#2997ff" />
                <Kpi
                  label="Downloads today"
                  value={fmt(summary?.downloads_today ?? null)}
                  hint="events.video_downloaded"
                  accent="#2997ff"
                />
              </div>
            </section>

            {/* 2 — 🔥 HOT LEADS */}
            <section className="mb-6">
              <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#fbbf24' }}>
                🔥 Hot leads — heavy free users
              </h2>
              <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
                Free users with ≥5 downloads or ≥1 unlock click. Free tier is 3 videos/day — these are
                addicted users who haven't paid yet. {hotLeads.length} found.
              </p>
              <div
                className="rounded-2xl overflow-x-auto"
                style={{ ...CARD, border: '1px solid rgba(251,191,36,.4)' }}
              >
                {hotLeads.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: '#86868b' }}>
                    No hot leads right now.
                  </div>
                ) : (
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1d1d1f' }}>
                        <Th>Email</Th>
                        <Th>Name</Th>
                        <Th align="right">Downloads</Th>
                        <Th align="right">Unlock clicks</Th>
                        <Th align="right">Videos</Th>
                        <Th>Last video</Th>
                        <Th>Country</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotLeads.slice(0, 30).map((u) => (
                        <tr key={u.id} style={{ borderTop: '1px solid #2a2a2d' }}>
                          <Td mono>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {u.email || '—'}
                              <span
                                className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase"
                                style={{
                                  background: 'rgba(251,191,36,.12)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(251,191,36,.35)',
                                }}
                              >
                                hot
                              </span>
                            </span>
                          </Td>
                          <Td>{u.name || '—'}</Td>
                          <Td align="right">
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>⬇ {fmt(u.downloads_count)}</span>
                          </Td>
                          <Td align="right">{u.unlock_clicks > 0 ? `🔓 ${fmt(u.unlock_clicks)}` : '—'}</Td>
                          <Td align="right">{fmt(u.videos_count)}</Td>
                          <Td>{fmtDate(u.last_video_at)}</Td>
                          <Td>
                            {u.last_country ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '1.05rem' }}>{flagEmoji(u.last_country)}</span>
                                <span>{u.last_country}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* 3 — COMPACT FUNNEL */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#86868b' }}>
                  Funnel
                </h2>
                <Link href="/admin/funnel" className="text-[12px] font-bold" style={{ color: '#2997ff' }}>
                  full funnel →
                </Link>
              </div>
              <div className="rounded-2xl p-4" style={CARD}>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  {funnel.map((s, i) => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)' }}>
                      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#86868b' }}>
                        {i > 0 ? '↳ ' : ''}
                        {s.label}
                      </div>
                      <div
                        className="mt-1 text-xl font-semibold"
                        style={{ color: i === funnel.length - 1 ? '#34d399' : '#f5f5f7' }}
                      >
                        {fmt(s.count)}
                      </div>
                      <div className="text-[11px] font-semibold" style={{ color: '#6e6e73' }}>
                        {i === 0 ? 'external, all-time' : `${pctOf(s.count, funnel[i - 1].count)} of prev`}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10.5px]" style={{ color: '#6e6e73' }}>
                  Opened checkout = paid ∪ abandoned Stripe checkout ∪ unlock click. Computed from the
                  same rows as the table below.
                </p>
              </div>
            </section>

            {/* 4 — USERS TABLE */}
            <section className="rounded-2xl" style={CARD}>
              <div
                className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap"
                style={{ borderBottom: '1px solid #2a2a2d' }}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by email or name…"
                  className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
                  style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', color: '#f5f5f7', outline: 'none' }}
                />
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', color: '#f5f5f7', outline: 'none' }}
                >
                  {planOptions.map((p) => (
                    <option key={p} value={p}>
                      {p === 'all' ? 'All plans' : p === 'paid' ? 'Any paid' : p === 'free' ? 'Free' : p}
                    </option>
                  ))}
                </select>
                <div className="text-[11px]" style={{ color: '#86868b' }}>
                  {`${filtered.length} / ${users.length}`}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: '#86868b' }}>
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1d1d1f' }}>
                        <Th>Email</Th>
                        <Th>Name</Th>
                        <Th>Plan</Th>
                        <Th
                          onClick={() => toggleSort('created_at')}
                          active={sortKey === 'created_at'}
                          dir={sortDir}
                        >
                          Joined
                        </Th>
                        <Th align="right">Credits</Th>
                        <Th
                          align="right"
                          onClick={() => toggleSort('videos_count')}
                          active={sortKey === 'videos_count'}
                          dir={sortDir}
                        >
                          Videos
                        </Th>
                        <Th
                          align="right"
                          onClick={() => toggleSort('downloads_count')}
                          active={sortKey === 'downloads_count'}
                          dir={sortDir}
                        >
                          Downloads
                        </Th>
                        <Th align="right">Unlocks</Th>
                        <Th>Last video</Th>
                        <Th>Country</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <tr key={u.id} style={{ borderTop: '1px solid #2a2a2d' }}>
                          <Td mono>{u.email || '—'}</Td>
                          <Td>{u.name || '—'}</Td>
                          <Td>
                            <PlanBadge plan={u.plan} credits={u.credits} isPaid={u.is_paid} />
                          </Td>
                          <Td>{fmtDate(u.created_at)}</Td>
                          <Td align="right">{fmt(u.credits)}</Td>
                          <Td align="right">{fmt(u.videos_count)}</Td>
                          <Td align="right">{u.downloads_count > 0 ? `⬇ ${fmt(u.downloads_count)}` : '—'}</Td>
                          <Td align="right">{u.unlock_clicks > 0 ? `🔓 ${fmt(u.unlock_clicks)}` : '—'}</Td>
                          <Td>{fmtDate(u.last_video_at)}</Td>
                          <Td>
                            {u.last_country ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '1.05rem' }}>{flagEmoji(u.last_country)}</span>
                                <span>{u.last_country}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </Td>
                          <Td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {u.checkout_abandoned && (
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase"
                                  style={{
                                    background: 'rgba(248,113,113,.1)',
                                    color: '#f87171',
                                    border: '1px solid rgba(248,113,113,.3)',
                                  }}
                                  title="Stripe customer created but never completed checkout"
                                >
                                  abandoned checkout
                                </span>
                              )}
                              {u.is_internal && (
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase"
                                  style={{
                                    background: 'rgba(134,134,139,.1)',
                                    color: '#86868b',
                                    border: '1px solid rgba(134,134,139,.3)',
                                  }}
                                  title="Internal (founder/test) account — excluded from aggregates"
                                >
                                  internal
                                </span>
                              )}
                              {!u.checkout_abandoned && !u.is_internal && '—'}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Footer — old screens stay alive */}
            <footer className="mt-6 text-[11px]" style={{ color: '#6e6e73' }}>
              Old screens:{' '}
              {[
                ['/admin/overview', 'Overview'],
                ['/admin/users', 'Users'],
                ['/admin/ceo', 'CEO'],
                ['/admin/metrics', 'Metrics'],
                ['/admin/funnel', 'Funnel'],
                ['/admin/affiliates', 'Affiliates'],
              ].map(([href, label], i) => (
                <span key={href}>
                  {i > 0 ? ' · ' : ''}
                  <Link href={href} style={{ color: '#86868b' }}>
                    {label}
                  </Link>
                </span>
              ))}
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
