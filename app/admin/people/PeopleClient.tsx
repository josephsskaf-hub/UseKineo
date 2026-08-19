'use client'

// KINEO-ADMIN-PEOPLE-2026-08-18 — pedido do fundador: UMA tela com todas as
// pessoas (entraram / compraram), créditos recebidos, usados, restantes, em
// quê usaram e as datas. Números vêm do /api/admin/people, que deriva
// "recebeu" pela identidade usado+restante (imune ao drift que deixava as
// telas antigas "com informações erradas").
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { PersonRow } from '@/app/api/admin/people/route'

const CARD: React.CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

interface Summary {
  total: number
  active_subs: number
  churned: number
  one_time: number
  credits_in_circulation: number
  credits_used_total: number
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

// KINEO-PAIDKIND-2026-08-19 — 'sub' = assinatura ativa (o que o Stripe
// mostra) · 'left' = assinou e cancelou (coorte nº1 de win-back: já confiou o
// cartão uma vez) · 'pack' = pagamento avulso, nunca assinou.
function kindBadge(k: PersonRow['paid_kind']): { label: string; color: string } | null {
  if (k === 'active') return { label: 'sub', color: '#34d399' }
  if (k === 'churned') return { label: 'left', color: '#f87171' }
  if (k === 'one_time') return { label: 'pack', color: '#fbbf24' }
  return null
}

function usageLabel(p: PersonRow): string {
  const parts: string[] = []
  if (p.used_video > 0) parts.push(`🎬 ${p.used_video}`)
  if (p.used_image > 0) parts.push(`🖼 ${p.used_image}`)
  if (p.used_audio > 0) parts.push(`🎙 ${p.used_audio}`)
  if (p.used_enhance > 0) parts.push(`✨ ${p.used_enhance}`)
  if (p.used_other > 0) parts.push(`• ${p.used_other}`)
  return parts.length ? parts.join(' · ') : '—'
}

export default function PeopleClient({ denied }: { denied?: boolean }) {
  const [people, setPeople] = useState<PersonRow[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (denied) return
    let cancelled = false
    void fetch('/api/admin/people', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed')
        return r.json() as Promise<{ people: PersonRow[]; summary: Summary }>
      })
      .then((json) => {
        if (cancelled) return
        setPeople(json.people)
        setSummary(json.summary)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load people.')
      })
    return () => {
      cancelled = true
    }
  }, [denied])

  const filtered = useMemo(() => {
    const base = (people ?? []).filter((p) => !p.is_internal) // fundador/teste fora
    const needle = q.trim().toLowerCase()
    if (!needle) return base
    return base.filter(
      (p) => p.email.toLowerCase().includes(needle) || (p.name ?? '').toLowerCase().includes(needle) || (p.country ?? '').toLowerCase() === needle,
    )
  }, [people, q])

  const KIND_ORDER: Record<string, number> = { active: 0, churned: 1, one_time: 2 }
  const buyers = useMemo(
    () => filtered.filter((p) => p.paid_kind).sort((a, b) => (KIND_ORDER[a.paid_kind!] ?? 9) - (KIND_ORDER[b.paid_kind!] ?? 9)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered],
  )
  const everyone = useMemo(() => (showAll ? filtered : filtered.slice(0, 250)), [filtered, showAll])

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
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#34d399' }}>
          Admin · People
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#f5f5f7' }}>
          Everyone — credits in, credits out
        </h1>
        <p className="text-xs mt-1" style={{ color: '#86868b' }}>
          &quot;Granted&quot; = used + left (accounting identity, can&apos;t drift). &quot;Spent on&quot; comes from the
          credit ledger: 🎬 video · 🖼 image · 🎙 voice · ✨ HD enhance (numbers are credits, not counts).
        </p>
        <nav className="flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Paying', href: '/admin/paying' },
            { label: 'Users', href: '/admin/users' },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: '#86868b' }}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            ['Signups', summary.total, '#f5f5f7'],
            // KINEO-PAIDKIND-2026-08-19 — o placar espelha o Stripe: ativos
            // = assinatura pagando AGORA (era 'Paying' com has_paid cru, que
            // somava cancelados + packs e mostrava 10 quando o Stripe tem 6).
            ['Active subs', summary.active_subs, '#34d399'],
            ['Churned', summary.churned, '#f87171'],
            ['One-time', summary.one_time, '#fbbf24'],
            ['Credits in wallets', summary.credits_in_circulation, '#2997ff'],
            ['Credits spent', summary.credits_used_total, '#a1a1a8'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-2xl px-4 py-3" style={CARD}>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#86868b' }}>{label}</div>
              <div className="text-xl font-black" style={{ color: color as string }}>{(value as number).toLocaleString('en-US')}</div>
            </div>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search email, name, or country code…"
        className="w-full rounded-xl px-4 py-2.5 mb-6 text-sm"
        style={{ background: '#131316', border: '1px solid #2a2a2d', color: '#f5f5f7', outline: 'none' }}
      />

      {!people && !error && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>Loading…</div>
      )}
      {error && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#f87171' }}>{error}</div>
      )}

      {people && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#34d399' }}>
            💰 Bought ({buyers.length}) — {buyers.filter((b) => b.paid_kind === 'active').length} active · {buyers.filter((b) => b.paid_kind === 'churned').length} left · {buyers.filter((b) => b.paid_kind === 'one_time').length} pack
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            <b style={{ color: '#34d399' }}>sub</b> = paying now (mirrors Stripe) · <b style={{ color: '#f87171' }}>left</b> = subscribed and cancelled (hottest win-back cohort) · <b style={{ color: '#fbbf24' }}>pack</b> = paid once, never subscribed.
          </p>
          <Table
            head={['Email', 'Type', 'Plan', 'First paid', 'Granted', 'Used', 'Left', 'Spent on', 'Last activity']}
            border="rgba(52,211,153,.4)"
            empty="No paying customers match."
            rows={buyers.map((p) => [
              <Mono key="e" text={p.email} badge={kindBadge(p.paid_kind)?.label} badgeColor={kindBadge(p.paid_kind)?.color} />,
              kindBadge(p.paid_kind)?.label ?? '—',
              p.plan ?? '—',
              fmtDate(p.first_paid),
              p.credits_granted?.toLocaleString('en-US') ?? '—',
              p.credits_used.toLocaleString('en-US'),
              <b key="l" style={{ color: (p.credits_left ?? 0) <= 5 ? '#fb923c' : '#2997ff' }}>{p.credits_left?.toLocaleString('en-US') ?? '—'}</b>,
              usageLabel(p),
              fmtDate(p.last_use),
            ])}
          />
        </section>
      )}

      {people && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#f5f5f7' }}>
            👥 Everyone ({filtered.length}{!showAll && filtered.length > 250 ? ' — showing 250' : ''})
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            Every signup, newest first, with the full credit story per person.
          </p>
          <Table
            head={['Email', 'Signed up', 'Country', 'Plan', 'Granted', 'Used', 'Left', 'Spent on', 'Last activity']}
            border="rgba(255,255,255,.14)"
            empty="No one matches."
            rows={everyone.map((p) => [
              <Mono key="e" text={p.email} badge={kindBadge(p.paid_kind)?.label} badgeColor={kindBadge(p.paid_kind)?.color} />,
              fmtDate(p.signup),
              p.country ? `${flagEmoji(p.country)} ${p.country}` : '—',
              p.plan ?? '—',
              p.credits_granted?.toLocaleString('en-US') ?? '—',
              p.credits_used.toLocaleString('en-US'),
              <b key="l" style={{ color: (p.credits_left ?? 0) <= 5 ? '#fb923c' : '#2997ff' }}>{p.credits_left?.toLocaleString('en-US') ?? '—'}</b>,
              usageLabel(p),
              fmtDate(p.last_use),
            ])}
          />
          {!showAll && filtered.length > 250 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: '#131316', border: '1px solid #2a2a2d', color: '#86868b', cursor: 'pointer' }}
            >
              Show all {filtered.length} →
            </button>
          )}
        </section>
      )}
    </Shell>
  )
}

function Mono({ text, badge, badgeColor }: { text: string; badge?: string; badgeColor?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.82rem' }}>{text || '—'}</span>
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

function Table({ head, rows, border, empty }: { head: string[]; rows: React.ReactNode[][]; border: string; empty: string }) {
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
                  <td key={j} style={{ padding: '10px 14px', color: '#f5f5f7', whiteSpace: 'nowrap' }}>{c}</td>
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
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1500px] mx-auto">{children}</div>
    </div>
  )
}
