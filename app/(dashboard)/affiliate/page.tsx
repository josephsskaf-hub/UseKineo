'use client'

// Affiliate self-serve page. Fetches /api/affiliate/me and renders one of four
// states: not-an-affiliate (apply CTA), pending, active (link + KPIs + recent
// commissions), or suspended. Dark premium styling to match /referral and
// /admin/funnel. Amounts arrive in CENTS and are divided by 100 for display.
//
// PUSH #101 — two changes:
// 1. TELEMETRY. Applying was a completely blind funnel step on the client.
//    app/api/affiliate/apply/route.ts:88-93,117-122 writes
//    `affiliate_application_submitted` server-side, but ONLY when the request
//    reaches the handler AND succeeds — a click that 401s, network-fails or
//    500s left no trace anywhere, so "how many people press Apply and don't
//    end up with a link" was unanswerable. The client events below close that.
// 2. THE MOMENT AFTER APPLY. Since apply/route.ts:110 creates the row as
//    'active', the click that used to buy a "we'll review it" wait now buys a
//    working link. That is peak intent and it was being spent on a KPI grid of
//    zeros. `justApplied` turns it into one concrete next action: send the
//    link to one person, right now, with one tap.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

// KINEO-ORFAOS-CLIQUE-2026-08-14 — este helper era `fetch('/api/events')` cru,
// sem `session_id`, e os quatro helpers desta família nasceram um do outro por
// cópia (o de AutopilotClient diz, no próprio comentário, "mesmo padrão de
// app/(dashboard)/affiliate/page.tsx"). O efeito é o mesmo de 25/07 no
// PostVideoPaywall e o mesmo que as 11h de hoje acharam em /examples: TODO
// funil da operação agrupa por sessão, então estes eventos existem no banco e
// não existem em nenhuma leitura — a superfície aparece como morta e é
// despriorizada. Medido: 22 eventos e 8 pessoas em /affiliate, 100% órfãos, o
// último hoje 18:55Z. `trackEvent` anexa `session_id` (o MESMO id que o route
// handler lê do cookie) mais UTMs de first-touch. Nenhum nome de evento muda.
function trackAffiliateEvent(name: string, metadata?: Record<string, unknown>): void {
  try {
    void trackEvent(name, { source: 'affiliate_dashboard', ...(metadata ?? {}) })
  } catch {
    // ignore — tracking must never throw into the affiliate dashboard
  }
}

interface Commission {
  created_at: string | null
  type: string | null
  amount_gross: number
  commission_amount: number
  currency: string | null
  status: string | null
}

interface AffiliateMe {
  isAffiliate: boolean
  affiliate?: {
    code: string
    status: string
    commission_rate: number
    coupon_code: string | null
  }
  link?: string
  stats?: { clicks: number; signups: number; paid: number }
  earnings?: { pending: number; approved: number; paid: number; total: number }
  recent?: Commission[]
}

const CYAN = '#2997ff'
const TEXT = '#F1F5F9'
const MUTED = '#86868b'
const GREEN = '#2997ff'
const CARD = '#161618'
const BORDER = '1px solid rgba(255,255,255,0.08)'

function dollars(cents: number, currency = 'usd'): string {
  const sym = currency && currency.toLowerCase() !== 'usd' ? '' : '$'
  const amount = (cents / 100).toFixed(2)
  return sym ? `${sym}${amount}` : `${amount} ${currency?.toUpperCase()}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' },
  approved: { bg: 'rgba(41,151,255,0.14)', color: GREEN },
  paid: { bg: 'rgba(41,151,255,0.14)', color: CYAN },
  clawed_back: { bg: 'rgba(239,68,68,0.14)', color: '#ef4444' },
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? '').toLowerCase()
  const style = STATUS_BADGE[s] ?? { bg: 'rgba(148,163,184,0.14)', color: MUTED }
  return (
    <span
      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {status ?? '—'}
    </span>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, border: BORDER }}>
      <div className="text-[10px] font-black uppercase tracking-[.14em] mb-2" style={{ color: accent ?? MUTED }}>
        {label}
      </div>
      <div className="font-black" style={{ fontSize: '1.6rem', lineHeight: 1.1, color: accent ?? TEXT }}>
        {value}
      </div>
    </div>
  )
}

export default function AffiliatePage() {
  const [data, setData] = useState<AffiliateMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [couponCopied, setCouponCopied] = useState(false)
  // PUSH #101 — true only for the render right after a successful apply in
  // THIS session, so the "your link is live, use it now" block is a moment and
  // not permanent dashboard furniture.
  const [justApplied, setJustApplied] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/affiliate/me', { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as AffiliateMe
        setData(json)
        setAuthRequired(false)
      } else if (res.status === 401) {
        setAuthRequired(true)
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function apply() {
    setApplying(true)
    trackAffiliateEvent('affiliate_apply_clicked')
    try {
      const response = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (response.status === 401) {
        trackAffiliateEvent('affiliate_apply_failed', { reason: 'unauthenticated', http_status: 401 })
        setAuthRequired(true)
        return
      }
      if (!response.ok) {
        trackAffiliateEvent('affiliate_apply_failed', { reason: 'http_error', http_status: response.status })
        return
      }
      const json = (await response.json().catch(() => null)) as { status?: string } | null
      trackAffiliateEvent('affiliate_apply_succeeded', { status: json?.status ?? null })
      setJustApplied(true)
      await load()
    } catch {
      trackAffiliateEvent('affiliate_apply_failed', { reason: 'network_error' })
    } finally {
      setApplying(false)
    }
  }

  function copyLink() {
    if (!data?.link) return
    try {
      navigator.clipboard.writeText(data.link)
      setCopied(true)
      trackAffiliateEvent('affiliate_link_copied', { just_applied: justApplied })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const wrap = 'px-4 sm:px-6 py-7 pb-28 md:pb-20 max-w-3xl mx-auto'

  if (loading) {
    return (
      <div className={wrap}>
        <div className="rounded-2xl" style={{ background: CARD, border: BORDER, height: 180 }} />
      </div>
    )
  }

  if (authRequired) {
    return (
      <div className={wrap}>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)' }}
        >
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="font-black tracking-tight mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: TEXT }}>
            Sign in before applying
          </h1>
          <p className="text-sm mb-6 mx-auto" style={{ color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>
            Your Kineo account owns the affiliate link, dashboard and recurring commission history.
          </p>
          <Link
            href="/signup?redirect=%2Faffiliate&utm_source=affiliate_dashboard&utm_medium=organic&utm_campaign=push33_partner_program"
            className="inline-block rounded-xl px-7 py-3 text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg, #2997ff, #2997ff)', textDecoration: 'none' }}
          >
            Create account and continue →
          </Link>
          <div className="mt-3 text-xs" style={{ color: MUTED }}>
            Already have an account? <Link href="/login?redirect=%2Faffiliate" style={{ color: CYAN }}>Sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Not an affiliate → hero + Apply ──────────────────────────────────────
  if (!data || !data.isAffiliate) {
    return (
      <div className={wrap}>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 40px rgba(41,151,255,.08)' }}
        >
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="font-black tracking-tight mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: TEXT }}>
            Become an affiliate —{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #2997ff 0%, #2997ff 60%, #2997ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              earn 40% recurring
            </span>{' '}
            on everyone you bring
          </h1>
          <p className="text-sm mb-6 mx-auto" style={{ color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>
            Share your link, send people to Kineo, and earn 40% of every payment they make — for
            as long as they stay subscribed. No review queue: your link is active the second you
            press the button, and starts tracking clicks immediately.
          </p>
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="rounded-xl px-7 py-3 text-sm font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #2997ff, #2997ff)',
              boxShadow: '0 4px 18px rgba(41,151,255,.35)',
              border: 'none',
              cursor: applying ? 'default' : 'pointer',
              opacity: applying ? 0.7 : 1,
            }}
          >
            {applying ? 'Applying…' : 'Apply to become an affiliate'}
          </button>
        </div>
      </div>
    )
  }

  const a = data.affiliate!
  const status = (a.status ?? '').toLowerCase()

  // ── Pending ──────────────────────────────────────────────────────────────
  // PUSH #101 — LEGACY ONLY. New rows are created 'active'
  // (app/api/affiliate/apply/route.ts:110), so this branch is now only
  // reachable by affiliates who applied before that change and were never
  // approved in /admin/affiliates. The copy stays accurate FOR THEM (their
  // link genuinely is dead until an admin flips the status —
  // app/a/[code]/route.ts:38), so it is deliberately left as-is rather than
  // deleted. Delete this branch only after backfilling those rows to 'active'.
  if (status === 'pending') {
    return (
      <div className={wrap}>
        <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: BORDER }}>
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize: '1.5rem', color: TEXT }}>
            Application received — pending approval.
          </h1>
          <p className="text-sm mx-auto" style={{ color: MUTED, maxWidth: 420, lineHeight: 1.6 }}>
            We&apos;re reviewing your application. You&apos;ll get your share link and dashboard here as soon
            as you&apos;re approved.
          </p>
        </div>
      </div>
    )
  }

  // ── Suspended ────────────────────────────────────────────────────────────
  if (status === 'suspended') {
    return (
      <div className={wrap}>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: CARD, border: '1px solid rgba(239,68,68,.35)' }}
        >
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="font-black tracking-tight mb-2" style={{ fontSize: '1.5rem', color: TEXT }}>
            Your affiliate account is suspended.
          </h1>
          <p className="text-sm mx-auto" style={{ color: MUTED, maxWidth: 420, lineHeight: 1.6 }}>
            Your link is paused and no new commissions are being tracked. Reach out to support if you
            think this is a mistake.
          </p>
        </div>
      </div>
    )
  }

  // ── Active ───────────────────────────────────────────────────────────────
  const stats = data.stats ?? { clicks: 0, signups: 0, paid: 0 }
  const earnings = data.earnings ?? { pending: 0, approved: 0, paid: 0, total: 0 }
  const recent = data.recent ?? []
  const ratePct = `${Math.round((a.commission_rate ?? 0) * 100)}%`

  // PUSH #101 — one-tap first share. Copy-to-clipboard alone still leaves the
  // affiliate to go find somewhere to paste it; these hand them a pre-written
  // message. Plain links, no SDKs, no keys. The pitch only claims things the
  // product actually does (free Fast tier, no card — lib/comparisons.ts:305).
  const link = data.link ?? ''
  const sharePitch =
    'I use Kineo to turn one topic into a finished, voiced and captioned 9:16 Short in minutes. Free to try, no card:'
  const shareTargets = link
    ? [
        {
          label: 'Share on X',
          href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePitch)}&url=${encodeURIComponent(link)}`,
        },
        {
          label: 'WhatsApp',
          href: `https://wa.me/?text=${encodeURIComponent(`${sharePitch} ${link}`)}`,
        },
        {
          label: 'Email',
          href: `mailto:?subject=${encodeURIComponent('A faster way to make Shorts')}&body=${encodeURIComponent(`${sharePitch} ${link}`)}`,
        },
      ]
    : []

  return (
    <div className={wrap}>
      <header className="mb-6">
        <div className="font-black uppercase tracking-[.18em] mb-2" style={{ fontSize: '0.62rem', color: CYAN }}>
          Affiliate
        </div>
        <h1 className="font-black tracking-tight mb-1" style={{ fontSize: 'clamp(1.6rem, 4vw, 2rem)', color: TEXT }}>
          Your affiliate dashboard
        </h1>
        <p className="text-sm" style={{ color: MUTED }}>
          Earning <span style={{ color: GREEN, fontWeight: 800 }}>{ratePct}</span> recurring on everyone you
          refer.
        </p>
      </header>

      {/* PUSH #101 — the moment right after applying. Peak intent, and the
          only thing standing between them and their first tracked click is
          sending the link to one person. */}
      {justApplied ? (
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.35)' }}
        >
          <div className="font-black mb-1" style={{ fontSize: '1.05rem', color: TEXT }}>
            You&apos;re in — your link is already live.
          </div>
          <p className="text-sm" style={{ color: MUTED, lineHeight: 1.6, margin: 0 }}>
            Nothing is pending and nobody has to approve you. The next click on the link below is
            tracked, and it stays attributed to you for 90 days. Send it to one person now — the
            first share is the one nobody gets around to.
          </p>
        </div>
      ) : null}

      {/* Share link */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 30px rgba(41,151,255,.08)' }}
      >
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>
          Your share link
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={data.link ?? ''}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-xl px-3 py-2.5 text-xs"
            style={{
              background: 'rgba(13,13,28,.85)',
              border: '1px solid rgba(41,151,255,.3)',
              color: TEXT,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-xl px-5 py-2.5 text-sm font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #2997ff, #2997ff)',
              boxShadow: '0 4px 18px rgba(41,151,255,.35)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
        {shareTargets.length ? (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
              Send it now
            </span>
            {shareTargets.map((t) => (
              <a
                key={t.label}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAffiliateEvent('affiliate_share_clicked', { channel: t.label, just_applied: justApplied })}
                className="rounded-lg px-3 py-1.5 text-xs font-extrabold"
                style={{
                  background: 'rgba(41,151,255,.12)',
                  border: '1px solid rgba(41,151,255,.28)',
                  color: CYAN,
                  textDecoration: 'none',
                }}
              >
                {t.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {/* KINEO-CUPOM-AFILIADO-2026-08-21 — o cupom deixa de ser rodapé.
          Num vídeo de TikTok/Reels/Shorts não existe link clicável: o criador
          FALA o código e a pessoa digita no checkout. Para quem divulga em
          vídeo — que é exatamente quem queremos — este bloco é a ferramenta
          principal, não o link. Por isso ganha o mesmo destaque visual. */}
      {a.coupon_code ? (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 30px rgba(41,151,255,.08)' }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>
            Your coupon — for video, where links don&apos;t work
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={a.coupon_code}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-xl px-3 py-2.5 text-lg font-black tracking-widest"
              style={{
                background: 'rgba(13,13,28,.85)',
                border: '1px solid rgba(41,151,255,.3)',
                color: GREEN,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => {
                try {
                  void navigator.clipboard.writeText(a.coupon_code ?? '')
                  setCouponCopied(true)
                  trackAffiliateEvent('affiliate_coupon_copied', { code: a.coupon_code })
                  setTimeout(() => setCouponCopied(false), 1800)
                } catch {
                  /* clipboard bloqueado: o input já está selecionável à mão */
                }
              }}
              className="rounded-xl px-5 py-2.5 text-sm font-black"
              style={{
                background: 'linear-gradient(135deg, #2997ff, #2997ff)',
                boxShadow: '0 4px 18px rgba(41,151,255,.35)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: 'none',
                color: '#fff',
              }}
            >
              {couponCopied ? '✓ Copied!' : 'Copy coupon'}
            </button>
          </div>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: MUTED }}>
            Say it out loud in your video:{' '}
            <span style={{ color: TEXT, fontWeight: 800 }}>
              &ldquo;use code {a.coupon_code} for 20% off&rdquo;
            </span>
            . They type it at checkout, get 20% off their first month, and you get credited — no link,
            no bio, no clicking. And it keeps paying: once someone redeems your code, every month they
            stay counts for you, for as long as they stay subscribed.
          </p>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Kpi label="Clicks" value={stats.clicks.toLocaleString('en-US')} accent={CYAN} />
        <Kpi label="Signups" value={stats.signups.toLocaleString('en-US')} accent="#2997ff" />
        <Kpi label="Paid customers" value={stats.paid.toLocaleString('en-US')} accent={GREEN} />
        <Kpi label="Pending $" value={dollars(earnings.pending)} accent="#fbbf24" />
        <Kpi label="Approved $" value={dollars(earnings.approved)} accent={GREEN} />
        <Kpi label="Total earned" value={dollars(earnings.total)} accent={CYAN} />
      </div>

      {/* Recent commissions */}
      <section>
        <h2
          className="font-black tracking-tight mb-3"
          style={{ fontSize: '0.85rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          Recent commissions
        </h2>
        <div className="rounded-2xl overflow-x-auto" style={{ background: CARD, border: BORDER }}>
          <table className="w-full text-left text-xs" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ color: MUTED }}>
                <th className="px-3 py-2 font-bold">Date</th>
                <th className="px-3 py-2 font-bold">Type</th>
                <th className="px-3 py-2 font-bold">Gross</th>
                <th className="px-3 py-2 font-bold">Commission</th>
                <th className="px-3 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c, i) => (
                <tr key={(c.created_at ?? '') + i} style={{ borderTop: BORDER, color: TEXT }}>
                  <td className="px-3 py-2" style={{ color: MUTED }}>{fmtDate(c.created_at)}</td>
                  <td className="px-3 py-2">{c.type ?? '—'}</td>
                  <td className="px-3 py-2">{dollars(c.amount_gross, c.currency ?? 'usd')}</td>
                  <td className="px-3 py-2 font-black" style={{ color: GREEN }}>
                    {dollars(c.commission_amount, c.currency ?? 'usd')}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center" style={{ color: MUTED }}>
                    No commissions yet — share your link to start earning.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
