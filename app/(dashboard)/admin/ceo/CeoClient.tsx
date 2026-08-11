'use client'

// Push #298 — CEO Dashboard. One SHORT, dense screen with everything the
// founder checks every morning: MRR, paying customers, signups, activation,
// the 7-day acquisition funnel and the checkout leak.
//
// KINEO-ADMIN-CEO-2026-08-03 — this component is now rendered by BOTH
// /admin (home) and /admin/ceo, from the same computeCeoData(). Added:
//   · MRR broken down per plan at real prices (lib/pricing), internal
//     accounts excluded — it used to invent $9.90/$4.90 and count the
//     founder's own test subscriptions as revenue.
//   · The 7d / 30d / all-time funnel: signed up → 1st video → opened
//     checkout → bought, with the rate at every step.
//   · The checkout leak banner (Stripe customer created, still on free).
//   · Navigation cards, so the home stays short instead of growing into an
//     infinite-scroll page. Long tables live on their own screens.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { CeoData, FunnelWindow } from '@/app/api/admin/ceo/compute'

export type { CeoData }

interface Props {
  data?: CeoData
  viewerEmail?: string
  denied?: boolean
  /** Home mode adds the navigation cards + the black full-page background. */
  home?: boolean
}

const POLL_MS = 60_000

function fmt(v: number): string {
  return v.toLocaleString('en-US')
}
function money(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export default function CeoClient({ data: initialData, viewerEmail, denied, home }: Props) {
  const [data, setData] = useState<CeoData | undefined>(initialData)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [win, setWin] = useState<FunnelWindow['key']>('7d')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    clockRef.current = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [lastUpdated])

  useEffect(() => {
    if (denied) return
    async function poll() {
      setRefreshing(true)
      try {
        const res = await fetch('/api/admin/ceo', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json?.data) {
          setData(json.data as CeoData)
          setLastUpdated(new Date())
          setSecondsAgo(0)
        }
      } catch {
        /* silent — the SSR seed stays on screen */
      } finally {
        setRefreshing(false)
      }
    }
    timerRef.current = setInterval(poll, POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [denied])

  if (denied || !data) {
    return (
      <div className="px-4 sm:px-6 py-10 pb-20 max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>
            {denied ? 'Access denied.' : 'No data.'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted2)' }}>
            {denied ? 'Admin only.' : 'The service role is not configured on this environment.'}
          </p>
        </div>
      </div>
    )
  }

  // Defensive: a stale cached /api/admin/ceo response from an older build would
  // have neither `funnels` nor `checkoutLeak`, and blowing up here would white-
  // screen the founder's main dashboard over a deploy race.
  const funnels = Array.isArray(data.funnels) ? data.funnels : []
  const funnel = funnels.find((f) => f.key === win) ?? funnels[0]
  const leak = data.checkoutLeak

  const body = (
    <div className="px-4 sm:px-6 py-7 pb-20 max-w-5xl mx-auto">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="mb-6">
        <div
          className="font-black uppercase tracking-widest mb-1"
          style={{ fontSize: '0.62rem', color: '#f59e0b' }}
        >
          Admin · CEO View · Live
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-black tracking-tight mb-1" style={{ fontSize: '1.6rem', color: 'var(--text)' }}>
              Morning Briefing
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted2)' }}>
              {data.scopeLabel} ({data.internalExcluded} accounts) · signed in as {viewerEmail ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted2)' }}>
            {refreshing && (
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
            )}
            {lastUpdated && <span>Updated {secondsAgo}s ago</span>}
          </div>
        </div>
        <AdminNav active={home ? 'home' : 'ceo'} />
      </header>

      {/* ── Row 1: Revenue ───────────────────────────────────────────────── */}
      <Section title="💰 Revenue — active paid plans">
        <BigCard
          label="Monthly Recurring Revenue"
          value={money(data.mrr)}
          accent="#34d399"
          sub={`${fmt(data.payingActive)} paying customer${data.payingActive === 1 ? '' : 's'}${
            data.arpu ? ` · ARPU ${money(data.arpu)}` : ''
          }`}
        />
        {data.mrrByPlan.length === 0 ? (
          <Card label="Paying customers" value="0" accent="#86868b" hint="no active paid plan" />
        ) : (
          data.mrrByPlan.map((p) => (
            <Card
              key={p.base}
              label={p.label}
              value={fmt(p.count)}
              accent={p.accent}
              hint={`${money(p.priceUsd)}/mo each → ${money(p.mrrUsd)}`}
            />
          ))
        )}
        <Card
          label="Ever paid (has_paid)"
          value={fmt(data.hasPaidEver)}
          accent="#86868b"
          hint="historical, refunds included — NOT the goal metric"
        />
      </Section>

      {/* ── Row 2: Growth ────────────────────────────────────────────────── */}
      <Section title="📈 Growth">
        <Card
          label="Signed up (total)"
          value={fmt(data.totalUsers)}
          accent="#f5f5f7"
          hint="real accounts, internal excluded"
        />
        <Card label="New today" value={fmt(data.signupsToday)} accent="#2997ff" hint="last 24 h" />
        <Card label="New this week" value={fmt(data.signupsThisWeek)} accent="#2997ff" hint="last 7 days" />
        <Card label="New this month" value={fmt(data.signupsThisMonth)} accent="#2997ff" hint="last 30 days" />
        <RateCard
          label="Signup → Paid"
          value={data.signupToPaidRate}
          sub={`${fmt(data.payingActive)} paying of ${fmt(data.totalUsers)} real users`}
        />
      </Section>

      {/* ── Row 3: Activation ────────────────────────────────────────────── */}
      <Section title="⚡ Activation this week">
        <Card label="New users (7d)" value={fmt(data.newUsersThisWeek)} accent="#fbbf24" hint="signed up" />
        <Card label="Made a video (7d)" value={fmt(data.newActivatedThisWeek)} accent="#fbbf24" hint="of those new users" />
        <RateCard
          label="Activation rate"
          value={data.activationRateWeek}
          sub={`${fmt(data.newActivatedThisWeek)} / ${fmt(data.newUsersThisWeek)} new users`}
        />
        <Card label="Videos today / 7d" value={`${fmt(data.videosToday)} / ${fmt(data.videosThisWeek)}`} accent="#f59e0b" hint="renders started" />
      </Section>

      {/* ── Row 4: THE FUNNEL ────────────────────────────────────────────── */}
      {funnel && (
      <section className="mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2
            className="font-black tracking-tight"
            style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            🎯 Acquisition funnel — {funnel.label}
          </h2>
          <div className="flex gap-1">
            {funnels.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setWin(f.key)}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                style={{
                  background: f.key === win ? '#f59e0b' : 'transparent',
                  color: f.key === win ? '#000' : 'var(--muted2)',
                  border: `1px solid ${f.key === win ? '#f59e0b' : 'var(--border)'}`,
                }}
              >
                {f.key === 'all' ? 'All time' : f.key}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}
        >
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {funnel.steps.map((s, i) => {
              const width = funnel.signups > 0 ? Math.max(2, (s.count / funnel.signups) * 100) : 0
              const last = i === funnel.steps.length - 1
              return (
                <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)' }}>
                  <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>
                    {i > 0 ? '↳ ' : ''}
                    {s.label}
                  </div>
                  <div
                    className="mt-1 font-black"
                    style={{ fontSize: '1.6rem', lineHeight: 1.1, color: last ? '#34d399' : 'var(--text)' }}
                  >
                    {fmt(s.count)}
                  </div>
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                    <div
                      style={{
                        width: `${width}%`,
                        height: '100%',
                        background: last ? '#34d399' : '#2997ff',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <div className="text-[11px] mt-1.5 font-semibold" style={{ color: 'var(--muted2)' }}>
                    {i === 0 ? 'top of funnel' : `${s.pctOfPrev} of prev`}
                    <span style={{ color: 'var(--muted)' }}> · {s.pctOfTop} of signups</span>
                  </div>
                  {i > 0 && s.dropAbs > 0 && (
                    <div className="text-[10.5px] mt-0.5" style={{ color: '#f87171' }}>
                      −{fmt(s.dropAbs)} lost here
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[10.5px]" style={{ color: 'var(--muted)' }}>
            Cohort = accounts created in the window ({data.scopeLabel}). Each step is a milestone that
            cohort reached, not a strict subset — buying without ever generating a video is possible
            and happens ({fmt(funnel.paidWithoutVideo)} in this window), which is why a rate can exceed
            100%. &quot;Opened checkout&quot; = a Stripe customer exists for that account.
          </p>
        </div>
      </section>
      )}

      {/* ── Row 5: THE LEAK ──────────────────────────────────────────────── */}
      {leak && (
      <section className="mb-6">
        <div
          className="rounded-xl p-4 flex items-center gap-5 flex-wrap"
          style={{
            background: 'rgba(248,113,113,0.06)',
            border: `1px solid ${leak.stuckFree > 0 ? 'rgba(248,113,113,.45)' : 'var(--border)'}`,
          }}
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>
              🚨 Checkout leak
            </div>
            <div className="font-black" style={{ fontSize: '2rem', lineHeight: 1.05, color: '#f87171' }}>
              {fmt(leak.stuckFree)}
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted2)' }}>
              reached Stripe and are STILL on free
            </p>
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              {fmt(leak.openedCheckout)} accounts have a Stripe customer, {fmt(leak.payingActive)}{' '}
              actually pay — <strong style={{ color: '#f87171' }}>{leak.conversion}</strong> close rate.
              Every one of the {fmt(leak.stuckFree)} typed their email into a payment page and walked away.
            </p>
            <Link href="/admin/leads" className="text-[12px] font-bold" style={{ color: '#2997ff' }}>
              work the leads →
            </Link>
          </div>
          <div className="flex gap-3">
            <MiniStat label="Abandoned (Stripe)" value={fmt(data.abandonedCount)} accent="#f87171" />
            <MiniStat label="Checkout → paid" value={data.checkoutConversionRate} accent="#fbbf24" />
          </div>
        </div>
      </section>
      )}

      {/* ── At-risk paid users (short: only paid users about to run dry) ─── */}
      {data.atRiskUsers.length > 0 && (
        <section className="mb-6">
          <h2
            className="font-black uppercase tracking-widest mb-3"
            style={{ fontSize: '0.88rem', color: '#f59e0b', letterSpacing: '0.08em' }}
          >
            ⚠️ At-risk paying customers — low credits ({data.atRiskCount})
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f59e0b33' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(245,158,11,0.08)' }}>
                  <th className="text-left px-4 py-2 font-black" style={{ color: '#f59e0b' }}>Email</th>
                  <th className="text-left px-4 py-2 font-black" style={{ color: '#f59e0b' }}>Plan</th>
                  <th className="text-left px-4 py-2 font-black" style={{ color: '#f59e0b' }}>Credits left</th>
                </tr>
              </thead>
              <tbody>
                {data.atRiskUsers.map((u) => (
                  <tr key={u.email} style={{ borderTop: '1px solid rgba(245,158,11,0.1)' }}>
                    <td className="px-4 py-2 font-mono" style={{ color: 'var(--text)' }}>{u.email}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted2)' }}>{u.plan}</td>
                    <td className="px-4 py-2 font-black" style={{ color: u.credits === 0 ? '#f87171' : '#f59e0b' }}>
                      {u.credits === 0 ? '0 ⚠️' : u.credits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Where to go next ─────────────────────────────────────────────── */}
      <NavCards />
    </div>
  )

  if (!home) return body
  return <div style={{ background: '#000', minHeight: '100vh' }}>{body}</div>
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2
        className="font-black tracking-tight mb-3"
        style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        {title}
      </h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {children}
      </div>
    </section>
  )
}

function Card({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: string }) {
  const v = typeof value === 'number' ? value.toLocaleString('en-US') : value
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(11,17,32,0.85)', border: `1px solid ${accent ? `${accent}33` : 'var(--border)'}` }}
    >
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: accent ?? 'var(--muted2)' }}>
        {label}
      </div>
      <div className="font-black" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: accent ?? 'var(--text)' }}>{v}</div>
      {hint && <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted2)' }}>{hint}</p>}
    </div>
  )
}

function BigCard({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(11,17,32,0.95), rgba(11,17,32,0.85))',
        border: `1px solid ${accent ? `${accent}55` : 'var(--border)'}`,
        gridColumn: 'span 2',
      }}
    >
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: accent ?? 'var(--muted2)' }}>
        {label}
      </div>
      <div className="font-black mb-1" style={{ fontSize: '2.4rem', lineHeight: 1.1, color: accent ?? 'var(--text)' }}>
        {value}
      </div>
      {sub && <p className="text-xs" style={{ color: 'var(--muted2)' }}>{sub}</p>}
    </div>
  )
}

function RateCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  const isGood = value !== '—' && parseFloat(value) >= 10
  const accent = value === '—' ? '#86868b' : isGood ? '#34d399' : '#f59e0b'
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(11,17,32,0.85)', border: `1px solid ${accent}33` }}>
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--muted2)' }}>{label}</div>
      <div className="font-black" style={{ fontSize: '1.9rem', lineHeight: 1.1, color: accent }}>{value}</div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted2)' }}>{sub}</p>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
      <div className="text-[9.5px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>{label}</div>
      <div className="font-black" style={{ fontSize: '1.1rem', color: accent }}>{value}</div>
    </div>
  )
}

// ── navigation ───────────────────────────────────────────────────────────────

const NAV = [
  { label: 'CEO', href: '/admin', key: 'home' },
  { label: 'Paying', href: '/admin/paying', key: 'paying' },
  { label: 'Leads', href: '/admin/leads', key: 'leads' },
  { label: 'Users', href: '/admin/users', key: 'users' },
  { label: 'Funnel', href: '/admin/funnel', key: 'funnel' },
  { label: 'Metrics', href: '/admin/metrics', key: 'metrics' },
  { label: 'Overview', href: '/admin/overview', key: 'overview' },
  { label: 'Affiliates', href: '/admin/affiliates', key: 'affiliates' },
  // KINEO-TRIAL-ABUSE-PMP-2026-08-07 — painel read-only do reverse trial.
  { label: 'Trial', href: '/admin/trial-abuse', key: 'trial-abuse' },
  // KINEO-TRIAL-COHORT-2026-08-11 — a coorte VIVA, segmentada por comportamento.
  { label: 'Cohort', href: '/admin/trial-cohort', key: 'trial-cohort' },
  // KINEO-SUPPLIER-ALARM-2026-08-11 — consumo, ritmo e data de estouro por
  // fornecedor. Depois de dois apagões de saldo em 11 dias, esta é a tela que
  // responde "dá para dormir?" sem abrir seis painéis de terceiros.
  { label: 'Suppliers', href: '/admin/supplier-health', key: 'supplier-health' },
]

function AdminNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 mt-4 flex-wrap">
      {NAV.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          style={{
            background: active === t.key ? '#f59e0b' : 'transparent',
            color: active === t.key ? '#000' : 'var(--muted2)',
          }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

const NAV_CARDS = [
  { href: '/admin/paying', icon: '💳', title: 'Paying customers', desc: 'Who pays, which plan, since when, still active' },
  { href: '/admin/leads', icon: '🔥', title: 'Hot leads', desc: 'Heavy free users + abandoned checkouts' },
  { href: '/admin/users', icon: '👥', title: 'All users', desc: 'Full searchable table, every account' },
  { href: '/admin/funnel', icon: '🎯', title: 'Deep funnel', desc: 'Cohorts, leaks, sources, topic performance' },
  { href: '/admin/metrics', icon: '📊', title: 'Metrics', desc: 'Events, clicks, render health' },
  { href: '/admin/overview', icon: '🗂️', title: 'Server overview', desc: 'The #482 overview: retention, health, 14-day chart' },
  { href: '/admin/trial-abuse', icon: '🧪', title: 'Reverse trial', desc: 'Trials by status, credits granted vs used, fingerprint blocks' },
  { href: '/admin/trial-cohort', icon: '⏳', title: 'Live trial cohort', desc: 'Active trials by behaviour, clock left, credits unspent' },
  { href: '/admin/supplier-health', icon: '🛢️', title: 'Supplier health', desc: 'Cycle consumption, daily burn and projected run-out date per supplier' },
]

function NavCards() {
  return (
    <section className="mb-4">
      <h2
        className="font-black tracking-tight mb-3"
        style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        Go deeper
      </h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {NAV_CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl p-4 transition-colors"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', display: 'block' }}
          >
            <div style={{ fontSize: '1.15rem' }}>{c.icon}</div>
            <div className="font-black mt-1" style={{ fontSize: '0.92rem', color: 'var(--text)' }}>{c.title} →</div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted2)' }}>{c.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
