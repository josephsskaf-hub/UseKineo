'use client'

// KINEO-ADMIN-CEO-2026-08-03 — Hot Leads, moved off the /admin home.
//
// Reuses the two endpoints that already exist instead of adding a third:
//   · /api/admin/users — per-user downloads + unlock clicks + is_paid
//     (keeps the f812f06 fixes: pagination past 500 users, real PAID_PLANS).
//   · /api/admin/ceo   — abandoned Stripe checkouts, already deduped by email
//     and already filtered against people who have since paid.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { CeoData } from '@/app/api/admin/ceo/compute'

interface AdminUserRow {
  id: string
  email: string
  name: string | null
  created_at: string
  videos_count: number
  last_video_at: string | null
  plan: string | null
  downloads_count: number
  unlock_clicks: number
  last_country: string | null
  checkout_abandoned: boolean
  is_internal: boolean
  is_paid: boolean
}

const CARD: React.CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }
const POLL_MS = 60_000

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

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

export default function LeadsClient({ denied }: { denied?: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [ceo, setCeo] = useState<CeoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (denied) return
    let cancelled = false
    async function load() {
      try {
        const [uRes, cRes] = await Promise.all([
          fetch('/api/admin/users', { cache: 'no-store' }),
          fetch('/api/admin/ceo', { cache: 'no-store' }),
        ])
        if (cancelled) return
        if (uRes.ok) {
          const json = await uRes.json()
          if (Array.isArray(json.users)) setUsers(json.users as AdminUserRow[])
        }
        if (cRes.ok) {
          const json = await cRes.json()
          if (json?.data) setCeo(json.data as CeoData)
        }
        setError(null)
      } catch (e) {
        console.error('[admin-leads] fetch failed:', e)
        if (!cancelled) setError('Failed to load leads.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [denied])

  const hotLeads = useMemo(() => {
    return (users ?? [])
      .filter((u) => !u.is_internal && !u.is_paid && (u.downloads_count >= 5 || u.unlock_clicks > 0))
      .sort(
        (a, b) =>
          b.downloads_count - a.downloads_count ||
          b.unlock_clicks - a.unlock_clicks ||
          b.videos_count - a.videos_count,
      )
  }, [users])

  const stuckAtCheckout = useMemo(() => {
    return (users ?? [])
      .filter((u) => !u.is_internal && u.checkout_abandoned)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [users])

  if (denied) {
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

  return (
    <Shell>
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#fbbf24' }}>
          Admin · Hot leads
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#f5f5f7' }}>
          People who want to pay and haven&apos;t
        </h1>
        <p className="text-xs mt-1" style={{ color: '#86868b' }}>
          Internal accounts excluded. Reach out within 24 h — that window converts best.
        </p>
        <nav className="flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Paying', href: '/admin/paying' },
            { label: 'Users', href: '/admin/users' },
            { label: 'Funnel', href: '/admin/funnel' },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: '#86868b' }}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {loading && !users && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
          Loading leads…
        </div>
      )}
      {error && !users && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* 1 — stuck at checkout (has a Stripe customer, still free) */}
      {users && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>
            🚨 Reached checkout and did not buy ({stuckAtCheckout.length})
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            A Stripe customer exists for these accounts and the plan is still free. Highest-intent list
            we have.
          </p>
          <Table
            head={['Email', 'Name', 'Signed up', 'Videos', 'Downloads', 'Last video', 'Country']}
            border="rgba(248,113,113,.4)"
            empty="Nobody stuck at checkout."
            rows={stuckAtCheckout.slice(0, 60).map((u) => [
              <Mono key="e" text={u.email} badge="checkout" badgeColor="#f87171" />,
              u.name || '—',
              fmtDate(u.created_at),
              fmt(u.videos_count),
              fmt(u.downloads_count),
              fmtDate(u.last_video_at),
              u.last_country ? `${flagEmoji(u.last_country)} ${u.last_country}` : '—',
            ])}
          />
        </section>
      )}

      {/* 2 — heavy free users */}
      {users && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#fbbf24' }}>
            🔥 Heavy free users ({hotLeads.length})
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            Free users with ≥5 downloads or ≥1 unlock click. The free tier is 3 videos/day, so these are
            people using the product hard without paying for it.
          </p>
          <Table
            head={['Email', 'Name', 'Downloads', 'Unlock clicks', 'Videos', 'Last video', 'Country']}
            border="rgba(251,191,36,.4)"
            empty="No heavy free users right now."
            rows={hotLeads.slice(0, 60).map((u) => [
              <Mono key="e" text={u.email} badge="hot" badgeColor="#fbbf24" />,
              u.name || '—',
              `⬇ ${fmt(u.downloads_count)}`,
              u.unlock_clicks > 0 ? `🔓 ${fmt(u.unlock_clicks)}` : '—',
              fmt(u.videos_count),
              fmtDate(u.last_video_at),
              u.last_country ? `${flagEmoji(u.last_country)} ${u.last_country}` : '—',
            ])}
          />
        </section>
      )}

      {/* 3 — abandoned Stripe sessions */}
      {ceo && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>
            💸 Abandoned Stripe checkouts ({ceo.abandonedCount})
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            Expired Stripe sessions, freshest first. Anyone who has since paid is already filtered out.
          </p>
          <Table
            head={['Email', 'Plan tried', 'Abandoned', 'Heat']}
            border="rgba(248,113,113,.4)"
            empty="No abandoned checkouts in the last 100 Stripe sessions."
            rows={ceo.abandonedLeads.map((l) => [
              <Mono key="e" text={l.email} />,
              l.plan ?? '—',
              l.daysAgo === 0 ? 'today' : `${l.daysAgo}d ago`,
              l.daysAgo === 0 ? '🔥🔥🔥' : l.daysAgo <= 1 ? '🔥🔥' : l.daysAgo <= 3 ? '🔥' : '·',
            ])}
          />
        </section>
      )}
    </Shell>
  )
}

// ── atoms ───────────────────────────────────────────────────────────────────

function Mono({ text, badge, badgeColor }: { text: string; badge?: string; badgeColor?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.82rem' }}>
        {text || '—'}
      </span>
      {badge && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase"
          style={{ background: `${badgeColor}1f`, color: badgeColor, border: `1px solid ${badgeColor}59` }}
        >
          {badge}
        </span>
      )}
    </span>
  )
}

function Table({
  head,
  rows,
  border,
  empty,
}: {
  head: string[]
  rows: React.ReactNode[][]
  border: string
  empty: string
}) {
  return (
    <div className="rounded-2xl overflow-x-auto" style={{ ...CARD, border: `1px solid ${border}` }}>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: '#86868b' }}>{empty}</div>
      ) : (
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1d1d1f' }}>
              {head.map((h) => (
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
            {rows.map((cells, i) => (
              <tr key={i} style={{ borderTop: '1px solid #2a2a2d' }}>
                {cells.map((c, j) => (
                  <td key={j} style={{ padding: '10px 14px', color: '#f5f5f7', whiteSpace: 'nowrap' }}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1400px] mx-auto">{children}</div>
    </div>
  )
}
