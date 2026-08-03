// KINEO-ADMIN-CEO-2026-08-03 — /admin/paying: who actually pays us.
//
// The founder asked for "uma página onde mostra os usuários pagos e que tipo
// de plano eles têm". This is that page, and it is deliberately a server
// component: the list is 5 rows, it needs zero interactivity, and rendering it
// on the server means the service-role client never gets anywhere near the
// browser bundle.
//
// PRICES COME FROM lib/pricing VIA app/api/admin/_shared/mrr — never typed by
// hand here. Stored plan → product name → price:
//   starter → Starter $9.90 · basic → Creator $24.90 · pro → Studio $37.90 ·
//   autopilot → Autopilot $299 · autopilot_pilot → $0 (one-off $99, not MRR).
//
// INTERNAL ACCOUNTS (founder + family + test, lib/internalAccounts) are shown
// with an "internal" badge and are EXCLUDED from the MRR totals — they are 2 of
// the 5 non-free plans in prod, so counting them would roughly triple the
// headline number.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { INTERNAL_ACCOUNTS_LABEL, isInternalEmail } from '@/lib/internalAccounts'
import { fetchAllRows, isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import {
  formatUsd,
  isPaidPlan,
  isTrialPlan,
  mrrForPlan,
  planAccent,
  planBase,
  planLabel,
  type PlanBase,
} from '@/app/api/admin/_shared/mrr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

// ── data ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  email: string | null
  name: string | null
  plan: string | null
  created_at: string | null
  plan_expires_at: string | null
  signup_country: string | null
  video_credits: number | null
  stripe_subscription_id: string | null
  billing_provider: string | null
}

interface PayingRow {
  email: string
  name: string | null
  plan: string
  planLabelText: string
  accent: string
  trial: boolean
  priceUsd: number
  createdAt: string | null
  paidAt: string | null
  country: string | null
  videos: number
  lastVideoAt: string | null
  credits: number | null
  active: boolean
  expiresAt: string | null
  provider: string | null
  internal: boolean
}

interface PayingData {
  rows: PayingRow[]
  mrrUsd: number
  payingActive: number
  internalCount: number
  byPlan: Array<{ base: PlanBase; label: string; count: number; priceUsd: number; mrrUsd: number; accent: string }>
}

async function loadPaying(): Promise<PayingData | null> {
  const admin = serviceClient()
  if (!admin) return null

  const [profiles, videos, payEvents] = await Promise.all([
    fetchAllRows<ProfileRow>(
      admin,
      'profiles',
      'id, email, name, plan, created_at, plan_expires_at, signup_country, video_credits, stripe_subscription_id, billing_provider',
    ),
    fetchAllRows<{ user_id: string | null; created_at: string | null }>(admin, 'videos', 'user_id, created_at'),
    // events.payment_success is the only per-user payment timestamp we store;
    // Stripe would need one API call per customer to beat it.
    fetchAllRows<{ user_id: string | null; created_at: string | null }>(
      admin,
      'events',
      'user_id, created_at',
      { column: 'name', values: ['payment_success'] },
    ),
  ])

  const videoCount = new Map<string, number>()
  const lastVideo = new Map<string, string>()
  for (const v of videos) {
    if (!v.user_id) continue
    videoCount.set(v.user_id, (videoCount.get(v.user_id) ?? 0) + 1)
    const prev = lastVideo.get(v.user_id)
    if (v.created_at && (!prev || v.created_at > prev)) lastVideo.set(v.user_id, v.created_at)
  }

  const firstPayment = new Map<string, string>()
  for (const e of payEvents) {
    if (!e.user_id || !e.created_at) continue
    const prev = firstPayment.get(e.user_id)
    if (!prev || e.created_at < prev) firstPayment.set(e.user_id, e.created_at)
  }

  const now = Date.now()
  const rows: PayingRow[] = profiles
    .filter((p) => isPaidPlan(p.plan))
    .map((p) => {
      const expires = p.plan_expires_at
      const active = !expires || new Date(expires).getTime() > now
      return {
        email: p.email ?? '(no email)',
        name: p.name,
        plan: (p.plan ?? '').toLowerCase(),
        planLabelText: planLabel(p.plan),
        accent: planAccent(p.plan),
        trial: isTrialPlan(p.plan),
        priceUsd: mrrForPlan(p.plan),
        createdAt: p.created_at,
        paidAt: firstPayment.get(p.id) ?? null,
        country: p.signup_country,
        videos: videoCount.get(p.id) ?? 0,
        lastVideoAt: lastVideo.get(p.id) ?? null,
        credits: p.video_credits,
        active,
        expiresAt: expires,
        provider: p.billing_provider ?? (p.stripe_subscription_id ? 'stripe' : null),
        internal: isInternalEmail(p.email),
      }
    })
    .sort((a, b) => {
      if (a.internal !== b.internal) return a.internal ? 1 : -1
      return (b.paidAt ?? b.createdAt ?? '').localeCompare(a.paidAt ?? a.createdAt ?? '')
    })

  const byPlanMap = new Map<PlanBase, PayingData['byPlan'][number]>()
  let mrrUsd = 0
  let payingActive = 0
  for (const r of rows) {
    if (r.internal || !r.active) continue
    payingActive += 1
    mrrUsd += r.priceUsd
    const base = planBase(r.plan)
    const existing = byPlanMap.get(base)
    if (existing) {
      existing.count += 1
      existing.mrrUsd += r.priceUsd
    } else {
      byPlanMap.set(base, {
        base,
        label: r.planLabelText.replace(' · trial', '').replace(' · pilot', ''),
        count: 1,
        priceUsd: r.priceUsd,
        mrrUsd: r.priceUsd,
        accent: r.accent,
      })
    }
  }

  return {
    rows,
    mrrUsd,
    payingActive,
    internalCount: rows.filter((r) => r.internal).length,
    byPlan: [...byPlanMap.values()].sort((a, b) => b.mrrUsd - a.mrrUsd),
  }
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

// ── page ────────────────────────────────────────────────────────────────────

export default async function AdminPayingPage() {
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

  const data = await loadPaying()
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
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#34d399' }}>
          Admin · Paying customers
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#f5f5f7' }}>
          Who pays us
        </h1>
        <p className="text-xs mt-1" style={{ color: '#86868b' }}>
          Active paid plan is the official goal metric (docs/METAS.md). Prices come from lib/pricing.
          MRR excludes internal accounts ({INTERNAL_ACCOUNTS_LABEL}: {data.internalCount} shown below,
          badged).
        </p>
        <nav className="flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Users', href: '/admin/users' },
            { label: 'Funnel', href: '/admin/funnel' },
            { label: 'Overview', href: '/admin/overview' },
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

      {/* MRR per plan */}
      <section className="mb-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="rounded-xl p-5" style={{ ...CARD, border: '1px solid rgba(52,211,153,.4)', gridColumn: 'span 2' }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#34d399' }}>
            MRR — active paid plans
          </div>
          <div className="font-black" style={{ fontSize: '2.4rem', lineHeight: 1.1, color: '#34d399' }}>
            {formatUsd(data.mrrUsd)}
          </div>
          <p className="text-xs mt-1" style={{ color: '#86868b' }}>
            {data.payingActive} paying customer{data.payingActive === 1 ? '' : 's'} ·{' '}
            {data.payingActive > 0 ? `ARPU ${formatUsd(data.mrrUsd / data.payingActive)}` : 'no ARPU yet'}
          </p>
        </div>
        {data.byPlan.length === 0 ? (
          <div className="rounded-xl p-4" style={CARD}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#86868b' }}>
              No active plan
            </div>
          </div>
        ) : (
          data.byPlan.map((p) => (
            <div key={p.base} className="rounded-xl p-4" style={{ ...CARD, border: `1px solid ${p.accent}44` }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: p.accent }}>
                {p.label}
              </div>
              <div className="font-black" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: '#f5f5f7' }}>
                {p.count}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: '#86868b' }}>
                {formatUsd(p.priceUsd)}/mo each → {formatUsd(p.mrrUsd)}
              </p>
            </div>
          ))
        )}
      </section>

      {/* Table */}
      <section className="rounded-2xl overflow-x-auto" style={CARD}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1d1d1f' }}>
              {['Customer', 'Plan', 'MRR', 'Signed up', 'Paid on', 'Country', 'Videos', 'Last video', 'Status'].map((h) => (
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
                <td colSpan={9} className="px-5 py-10 text-center text-sm" style={{ color: '#86868b' }}>
                  No paying customers yet.
                </td>
              </tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.email} style={{ borderTop: '1px solid #2a2a2d', opacity: r.internal ? 0.55 : 1 }}>
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
                  {r.name && <div className="text-[11px]" style={{ color: '#86868b' }}>{r.name}</div>}
                </Td>
                <Td>
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: `${r.accent}1f`, color: r.accent, border: `1px solid ${r.accent}59` }}
                  >
                    {r.planLabelText}
                  </span>
                </Td>
                <Td>
                  <span style={{ color: r.internal || !r.active ? '#86868b' : '#34d399', fontWeight: 700 }}>
                    {r.internal ? `(${formatUsd(r.priceUsd)})` : formatUsd(r.priceUsd)}
                  </span>
                </Td>
                <Td>{fmtDate(r.createdAt)}</Td>
                <Td>{fmtDate(r.paidAt)}</Td>
                <Td>
                  {r.country ? `${flagEmoji(r.country)} ${r.country}` : '—'}
                </Td>
                <Td>{r.videos}</Td>
                <Td>{fmtDate(r.lastVideoAt)}</Td>
                <Td>
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={
                      r.active
                        ? { background: 'rgba(52,211,153,.12)', color: '#34d399', border: '1px solid rgba(52,211,153,.35)' }
                        : { background: 'rgba(248,113,113,.12)', color: '#f87171', border: '1px solid rgba(248,113,113,.35)' }
                    }
                  >
                    {r.active ? 'active' : `expired ${fmtDate(r.expiresAt)}`}
                  </span>
                  {r.trial && (
                    <span className="ml-2 text-[10.5px]" style={{ color: '#86868b' }}>
                      trial · card on file
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-[11px] mt-3" style={{ color: '#6e6e73' }}>
        &quot;Paid on&quot; is the first events.payment_success for that account — blank means the plan was
        set by a webhook we did not log an event for (older rows). Trials are priced at full plan
        value because the card is already on file. autopilot_pilot is a one-off $99 and counts as $0 MRR.
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
