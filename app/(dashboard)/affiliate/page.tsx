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

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import {
  AFFILIATE_DESTINATIONS,
  RECOMMENDED_AFFILIATE_DESTINATION,
  buildAffiliateShareLink,
  getAffiliateDestination,
  type AffiliateDestinationKey,
} from '@/lib/affiliateDestinations'
import {
  buildAffiliateWidgetEmbedUrl,
  buildAffiliateWidgetSnippet,
} from '@/lib/growth/affiliateWidget'

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
  const [copiedAsset, setCopiedAsset] = useState<'caption' | 'spoken' | 'widget' | null>(null)
  const [selectedDestinationKey, setSelectedDestinationKey] =
    useState<AffiliateDestinationKey>(RECOMMENDED_AFFILIATE_DESTINATION)
  // PUSH #101 — true only for the render right after a successful apply in
  // THIS session, so the "your link is live, use it now" block is a moment and
  // not permanent dashboard furniture.
  const [justApplied, setJustApplied] = useState(false)
  const firstClickMissionTracked = useRef(false)

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

  useEffect(() => {
    const active = data?.affiliate?.status?.toLowerCase() === 'active'
    const zeroClicks = data?.stats?.clicks === 0
    if (!active || !zeroClicks || firstClickMissionTracked.current) return
    firstClickMissionTracked.current = true
    trackAffiliateEvent('affiliate_first_click_mission_viewed', {
      link_visits: 0,
      just_applied: justApplied,
    })
  }, [data, justApplied])

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

  async function copyLink() {
    const link = buildAffiliateShareLink(data?.link ?? '', selectedDestinationKey)
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      trackAffiliateEvent('affiliate_link_copied', {
        just_applied: justApplied,
        destination: selectedDestinationKey,
        first_click_mission: data?.stats?.clicks === 0,
      })
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
            on eligible payments
          </h1>
          <p className="text-sm mb-6 mx-auto" style={{ color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>
            Share your link, send people to Kineo, and earn 40% recurring on eligible subscription
            payments from customers you bring. No review queue: your link is active the second you
            press the button, and starts tracking link visits immediately.
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
  const needsFirstClick = stats.clicks === 0

  // PUSH #101 — one-tap first share. Copy-to-clipboard alone still leaves the
  // affiliate to go find somewhere to paste it; these hand them a pre-written
  // message. Plain links, no SDKs, no keys. The pitch only claims things the
  // product actually does (free Fast tier, no card — lib/comparisons.ts:305).
  const selectedDestination =
    getAffiliateDestination(selectedDestinationKey) ?? AFFILIATE_DESTINATIONS[0]
  const link = buildAffiliateShareLink(data.link ?? '', selectedDestinationKey)
  const sharePitch = selectedDestination.sharePitch
  const couponLine = a.coupon_code
    ? ` Use code ${a.coupon_code} for 20% off the first month.`
    : ''
  const readyCaption = `${sharePitch} ${link}${couponLine}`.trim()
  const spokenScript = `${selectedDestination.spokenPitch}${couponLine}`.trim()
  const widgetEmbedUrl = buildAffiliateWidgetEmbedUrl(data.link ?? '')
  const widgetSnippet = buildAffiliateWidgetSnippet(data.link ?? '')
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
          href: `mailto:?subject=${encodeURIComponent(selectedDestination.emailSubject)}&body=${encodeURIComponent(`${sharePitch} ${link}`)}`,
        },
      ]
    : []

  async function copyCampaignAsset(asset: 'caption' | 'spoken' | 'widget', value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedAsset(asset)
      trackAffiliateEvent('affiliate_campaign_asset_copied', {
        asset,
        destination: selectedDestinationKey,
        coupon_attached: Boolean(a.coupon_code),
        first_click_mission: needsFirstClick,
      })
      setTimeout(() => setCopiedAsset(null), 1800)
    } catch {
      // The readonly text stays selectable when clipboard access is blocked.
    }
  }

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
          Earning <span style={{ color: GREEN, fontWeight: 800 }}>{ratePct}</span> recurring on eligible
          referred subscription payments.
        </p>
      </header>

      {/* PUSH #101 — the moment right after applying. Peak intent, and the
          only thing standing between them and their first tracked click is
          sending the link to one person. */}
      {justApplied || needsFirstClick ? (
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.35)' }}
        >
          <div className="text-[10px] font-black uppercase tracking-[.16em] mb-2" style={{ color: CYAN }}>
            First-click mission · 0 link visits
          </div>
          <div className="font-black mb-1" style={{ fontSize: '1.05rem', color: TEXT }}>
            {justApplied ? 'You\'re in — your link is already live.' : 'Get one real person through your link.'}
          </div>
          <p className="text-sm" style={{ color: MUTED, lineHeight: 1.6, margin: 0 }}>
            Nothing is pending. Choose the closest audience below, copy the prepared post and place it
            where that audience already asks about AI video. This mission closes after the first eligible
            link visit; a visitor who arrives before signup can stay attributed to you for up to 90 days.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-xs font-bold">
            <div className="rounded-lg px-3 py-2" style={{ color: '#86efac', background: 'rgba(16,185,129,.1)' }}>✓ Partner link live</div>
            <div className="rounded-lg px-3 py-2" style={{ color: CYAN, background: 'rgba(41,151,255,.12)' }}>2 · Publish the ready post</div>
            <div className="rounded-lg px-3 py-2" style={{ color: MUTED, background: 'rgba(255,255,255,.035)' }}>3 · First eligible visit</div>
          </div>
        </div>
      ) : null}

      {/* Campaign selector. Competitor programs hand partners generic brand
          assets; this keeps attribution first-party and gives each audience a
          useful pre-signup destination instead. */}
      <div
        id="partner-campaign-kit"
        className="rounded-2xl p-5 mb-5"
        style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 30px rgba(41,151,255,.08)' }}
      >
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: CYAN }}>
          Partner campaign kit
        </div>
        <h2 className="font-black tracking-tight mb-1" style={{ color: TEXT, fontSize: '1.08rem' }}>
          Choose who you are sending
        </h2>
        <p className="text-xs mb-4" style={{ color: MUTED, lineHeight: 1.55 }}>
          Every option keeps your 90-day first-touch attribution. Only the useful page and the ready-made message change.
        </p>
        <div
          role="group"
          aria-label="Affiliate campaign audience"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5"
        >
          {AFFILIATE_DESTINATIONS.map((destination) => {
            const selected = destination.key === selectedDestinationKey
            return (
              <button
                key={destination.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSelectedDestinationKey(destination.key)
                  setCopied(false)
                  setCopiedAsset(null)
                  trackAffiliateEvent('affiliate_campaign_selected', {
                    destination: destination.key,
                  })
                }}
                className="rounded-xl p-3 text-left"
                style={{
                  background: selected ? 'rgba(41,151,255,.14)' : 'rgba(255,255,255,.035)',
                  border: selected ? '1px solid rgba(41,151,255,.52)' : BORDER,
                  color: TEXT,
                  cursor: 'pointer',
                }}
              >
                <span className="block text-xs font-black mb-1">{destination.label}</span>
                <span className="block text-[10px] leading-relaxed" style={{ color: MUTED }}>
                  {destination.audience}
                </span>
              </button>
            )
          })}
        </div>
        <label
          htmlFor="affiliate-campaign-share-link"
          className="block text-[10px] font-black uppercase tracking-widest mb-2"
          style={{ color: MUTED }}
        >
          Your {selectedDestination.label.toLowerCase()} link
        </label>
        <div
          className="inline-block rounded-full px-2.5 py-1 mb-2 text-[9px] font-black uppercase tracking-widest"
          style={{ color: CYAN, background: 'rgba(41,151,255,.12)', border: '1px solid rgba(41,151,255,.28)' }}
        >
          Free value before signup
        </div>
        <div className="text-xs mb-3" style={{ color: MUTED, lineHeight: 1.5 }}>
          <strong style={{ color: TEXT }}>{selectedDestination.label}.</strong>{' '}
          Visitors can generate a useful script before signup instead of landing on the generic homepage.{' '}
          {selectedDestination.description}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="affiliate-campaign-share-link"
            readOnly
            value={link}
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
            aria-live="polite"
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
                onClick={() =>
                  trackAffiliateEvent('affiliate_share_clicked', {
                    channel: t.label,
                    just_applied: justApplied,
                    destination: selectedDestinationKey,
                    first_click_mission: needsFirstClick,
                  })
                }
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

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" aria-label="Ready-made affiliate promotion copy">
        {[
          { key: 'caption' as const, eyebrow: 'Ready-to-post caption', value: readyCaption },
          { key: 'spoken' as const, eyebrow: 'Short speaking script', value: spokenScript },
        ].map((asset) => (
          <div key={asset.key} className="rounded-2xl p-4" style={{ background: CARD, border: BORDER }}>
            <label
              htmlFor={`affiliate-${asset.key}-copy`}
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: MUTED }}
            >
              {asset.eyebrow}
            </label>
            <textarea
              id={`affiliate-${asset.key}-copy`}
              readOnly
              value={asset.value}
              onFocus={(event) => event.currentTarget.select()}
              rows={5}
              className="w-full rounded-xl p-3 text-xs leading-relaxed resize-none"
              style={{ background: 'rgba(13,13,28,.85)', border: BORDER, color: TEXT, outline: 'none' }}
            />
            <button
              type="button"
              onClick={() => void copyCampaignAsset(asset.key, asset.value)}
              aria-live="polite"
              className="w-full rounded-xl px-4 py-2.5 mt-2 text-xs font-black"
              style={{ background: 'rgba(41,151,255,.14)', border: '1px solid rgba(41,151,255,.3)', color: CYAN }}
            >
              {copiedAsset === asset.key ? '✓ Copied' : `Copy ${asset.key === 'caption' ? 'caption' : 'speaking script'}`}
            </button>
          </div>
        ))}
      </section>

      {widgetSnippet ? (
        <section
          className="rounded-2xl p-5 mb-5"
          aria-labelledby="affiliate-widget-heading"
          style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 30px rgba(41,151,255,.08)' }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: CYAN }}>
            Website traffic that keeps working
          </div>
          <h2 id="affiliate-widget-heading" className="font-black tracking-tight mb-1" style={{ color: TEXT, fontSize: '1.08rem' }}>
            Put your affiliate link inside a daily Shorts idea
          </h2>
          <p className="text-xs mb-4" style={{ color: MUTED, lineHeight: 1.55 }}>
            Paste this once into a blog, resource page or creator site. The idea rotates daily; when a reader clicks Kineo,
            your existing partner attribution sends them to the free script generator.
          </p>
          <div
            className="rounded-xl p-3 mb-3 flex justify-center"
            style={{ background: '#000', border: BORDER }}
          >
            <iframe
              src={widgetEmbedUrl}
              width={360}
              height={200}
              title="Your attributed Shorts Idea of the Day widget"
              style={{ border: 0, borderRadius: 10, maxWidth: '100%' }}
            />
          </div>
          <label
            htmlFor="affiliate-widget-snippet"
            className="block text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: MUTED }}
          >
            Your attributed embed code
          </label>
          <textarea
            id="affiliate-widget-snippet"
            readOnly
            value={widgetSnippet}
            onFocus={(event) => event.currentTarget.select()}
            rows={4}
            className="w-full rounded-xl p-3 text-xs leading-relaxed resize-none"
            style={{ background: 'rgba(13,13,28,.85)', border: BORDER, color: TEXT, outline: 'none' }}
          />
          <button
            type="button"
            onClick={() => void copyCampaignAsset('widget', widgetSnippet)}
            aria-live="polite"
            className="w-full rounded-xl px-4 py-2.5 mt-2 text-xs font-black"
            style={{ background: 'rgba(41,151,255,.14)', border: '1px solid rgba(41,151,255,.3)', color: CYAN }}
          >
            {copiedAsset === 'widget' ? '✓ Embed code copied' : 'Copy attributed widget'}
          </button>
          <p className="text-[10px] mt-3 mb-0" style={{ color: MUTED, lineHeight: 1.5 }}>
            No secret is included. The public partner code already used by your share links is the only identifier in the snippet.
          </p>
        </section>
      ) : null}

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
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(a.coupon_code ?? '')
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
            . An eligible new customer types it at checkout and gets 20% off their first month. When
            that customer is attributed through your code, eligible subscription payments are credited
            to you while they remain subscribed — no link in the video required.
          </p>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Kpi label="Link visits" value={stats.clicks.toLocaleString('en-US')} accent={CYAN} />
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
