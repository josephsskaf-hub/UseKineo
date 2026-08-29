'use client'

// Push #254 — Funnel rebuilt on real DB data (auth.users + profiles + videos).
// #475 — added a cohort growth funnel (period filter), biggest-leak detection,
// Revenue Leaks, PQL Hot Leads, Source/UTM quality, Topic performance and a
// tracking-health note. Existing real-stats / rates / Stripe sections kept.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { FunnelData } from '@/app/api/admin/funnel/route'
import { CHATGPT_QUICKSTART_VARIANT } from '@/lib/growth/chatgptQuickstart'
import { ACTIVATION_HANDOFF_SURFACE_VERSION } from '@/lib/growth/onboardingGoals'

export type { FunnelData }

interface Props {
  data?: FunnelData
  viewerEmail?: string
  denied?: boolean
}

function fmt(v: number): string {
  return v.toLocaleString('en-US')
}
function pct1(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

const POLL_MS = 30_000
const PERIODS: Array<{ label: string; days: string }> = [
  { label: '24h', days: '1' },
  { label: '7d', days: '7' },
  { label: '14d', days: '14' },
  { label: '30d', days: '30' },
  { label: 'All', days: 'all' },
]
const STATUS_COLOR: Record<string, string> = {
  Cold: '#94a3b8', Warm: '#fbbf24', Hot: '#f97316', 'Very Hot': '#ef4444',
}

export default function FunnelClient({ data: initialData, viewerEmail, denied }: Props) {
  const [data, setData] = useState<FunnelData | undefined>(initialData)
  const [days, setDays] = useState<string>('30')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    clockRef.current = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [lastUpdated])

  // #475 — fetch immediately on mount and whenever the period changes, then poll.
  useEffect(() => {
    if (denied) return
    let cancelled = false
    async function load() {
      setRefreshing(true)
      try {
        const res = await fetch(`/api/admin/funnel?days=${days}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled && json?.data) {
          setData(json.data as FunnelData)
          setLastUpdated(new Date())
          setSecondsAgo(0)
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setRefreshing(false)
      }
    }
    load()
    timerRef.current = setInterval(load, POLL_MS)
    return () => { cancelled = true; if (timerRef.current) clearInterval(timerRef.current) }
  }, [denied, days])

  if (denied) {
    return (
      <div className="px-4 sm:px-6 py-10 pb-20 max-w-3xl mx-auto">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Admin only.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 sm:px-6 py-10 pb-20 max-w-3xl mx-auto">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-3xl mb-3">⏳</div>
          <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Loading live funnel…</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Verifying external users, recurring checkouts and active Stripe subscriptions.</p>
        </div>
      </div>
    )
  }

  const s = data.realStats
  const r = data.rates
  const recurringPaidUsers = s.proUsers + s.basicUsers + (s.starterUsers ?? 0) + (s.unknownPaidUsers ?? 0)
  const steps = data.funnelSteps ?? []
  const leak = data.biggestLeak ?? null
  const organic = data.organicRecovery ?? {
    landingSessions: 0, ctaClicks: 0, landingVisitors: 0, handoffOpens: 0,
    intentActors: 0, ctaRate: '—', signups: 0,
    viralNowViews: 0, viralNowClicks: 0, viralNowViewToClickRate: '—',
    signupRate: '—', activated: 0, activationRate: '—', paid: 0,
    topLandingPages: [],
  }
  const acquisition = data.acquisitionAttribution ?? {
    attributedSignups: 0, attributedActivated: 0, attributedPaid: 0,
    directOrUnknownSignups: 0, correctedSelfReferrals: 0,
    topSource: null, topSourceSignups: 0,
  }
  const sourceConversion = data.sourceConversion ?? {
    profilesAvailable: false,
    videosAvailable: false,
    checkoutAvailable: false,
    paymentsAvailable: false,
    rows: [],
  }
  const firstVideoOnboarding = data.firstVideoOnboarding ?? {
    views: 0, primaryClicks: 0, skips: 0, dispatched: 0, completed: 0, failed: 0,
    goalRouterViews: 0, goalRouterClicks: 0, goalSelections: 0,
    goalRouterViewToClickRate: '—', goalBreakdown: [],
    aboveFoldViews: 0, aboveFoldClicks: 0, aboveFoldViewToClickRate: '—',
    viewToClickRate: '—', clickToDispatchRate: '—', dispatchToCompleteRate: '—',
  }
  const repeatCreatorOffer = data.repeatCreatorOffer ?? {
    views: 0, clicks: 0, checkoutStarts: 0, activeSubscribers: 0,
    viewToClickRate: '—', clickToCheckoutRate: '—', checkoutToPaidRate: '—',
  }
  const postVideoOffer = data.postVideoOffer ?? {
    offerViews: 0, watermarkedDownloads: 0, cleanExportClicks: 0,
    checkoutStarts: 0, payments: 0, viewToClickRate: '—',
    clickToCheckoutRate: '—', checkoutToPaidRate: '—',
  }
  const trialPostVideoOffer = data.trialPostVideoOffer ?? {
    views: 0, clicks: 0, checkoutStarts: 0, payments: 0,
    noClickViewers: 0, checkoutAfterViewWithoutClick: 0,
    singlePrimaryViews: 0, singlePrimaryClicks: 0,
    viewToClickRate: '—', clickToCheckoutRate: '—', checkoutToPaidRate: '—',
    sourceBreakdown: [],
  }
  const trialBalanceBridge = data.trialBalanceBridge ?? {
    viewers: 0, clickers: 0, premiumCompleters: 0, checkoutStarters: 0, subscribers: 0,
    viewToClickRate: '—', clickToPremiumRate: '—', premiumToCheckoutRate: '—', checkoutToPaidRate: '—',
  }
  const chatGptQuickstart = data.chatGptQuickstart ?? {
    eventsAvailable: false,
    views: 0, selections: 0, scriptSelections: 0, ideaSelections: 0,
    starts: 0, completions: 0, checkoutStarts: 0, payments: 0,
    viewToSelectionRate: '—', selectionToStartRate: '—', startToCompleteRate: '—',
    completeToCheckoutRate: '—', checkoutToPaidRate: '—',
  }
  const planFitOffer = data.planFitOffer ?? {
    eventsAvailable: false,
    stripeAvailable: false,
    exposedPeople: 0, selectedPeople: 0, checkoutPeople: 0, paidPeople: 0,
    exposureToSelectionRate: '—', selectionToCheckoutRate: '—', checkoutToPaidRate: '—',
  }
  const exampleRemix = data.exampleRemix ?? {
    eventsAvailable: false,
    formViewers: 0, topicSubmitters: 0, attributedSignups: 0, completedCreators: 0,
    viewToSubmitRate: '—', submitToSignupRate: '—', signupToCompleteRate: '—',
  }
  const creatorLoop = data.creatorLoop ?? {
    completedVideos: 0, completedCreators: 0, shareClicks: 0, shareUsers: 0,
    deliveryPromptActors: 0, deliveryClickActors: 0, deliveryShareActors: 0,
    deliveryPromptToClickRate: '—', deliveryClickToShareRate: '—',
    deliveryPublicLandings: 0, deliveryPublicCtaClicks: 0,
    shareRate: '—', sharesCompleted: 0, publicVideoLandings: 0,
    publicVideoCtaClicks: 0, landingToCtaRate: '—', referredSignups: 0,
    remixArrivals: 0, remixScripts: 0, remixSignupClicks: 0,
    ctaToRemixRate: '—', remixToScriptRate: '—', scriptToSignupClickRate: '—',
    ctaToSignupRate: '—', qualifiedReferrals: 0, referredPaid: 0,
    signupToPaidRate: '—',
  }
  const retentionLoop = data.retentionLoop ?? {
    completedCreators: 0, oneAndDoneCreators: 0, repeatCreators: 0,
    secondVideoRate: '—', repeatWithin7dCreators: 0,
    laterDayReturnCreators: 0, laterDayReturnRate: '—',
    continuationClicks: 0, continuationLandings: 0,
    continuationStarts: 0, continuationCompletes: 0,
    clickToStartRate: '—', startToCompleteRate: '—',
  }
  const maxCount = steps.length ? Math.max(...steps.map((x) => x.count), 1) : 1

  return (
    <div className="px-4 sm:px-6 py-7 pb-20 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#c4b5fd' }}>
          Admin · Live
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-black tracking-tight mb-1" style={{ fontSize: '1.6rem', color: 'var(--text)' }}>
              Growth Funnel
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Live from profiles + videos + click_events + checkout. Signed in as {viewerEmail}.
            </p>
          </div>
          <RefreshIndicator refreshing={refreshing} secondsAgo={secondsAgo} lastUpdated={lastUpdated} />
        </div>
        <AdminNav active="funnel" />
        {/* #475 — cohort period filter */}
        <div className="flex gap-1.5 mt-4">
          {PERIODS.map((p) => {
            const active = days === p.days
            return (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(p.days)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{
                  background: active ? '#22d3ee' : 'rgba(255,255,255,0.04)',
                  color: active ? '#0A0A0B' : 'var(--muted)',
                  border: `1px solid ${active ? '#22d3ee' : 'var(--border)'}`,
                }}
              >
                {p.label}
              </button>
            )
          })}
          <span className="ml-2 self-center text-[11px]" style={{ color: 'var(--muted)' }}>
            cohort = signups in period
          </span>
          <span className="self-center rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: '#22d3ee', border: '1px solid rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.08)' }}>
            {data.scopeLabel}
          </span>
        </div>
      </header>

      {/* ── #475 — Cohort funnel visual + biggest leak ────────────────────── */}
      {steps.length > 0 && (
        <section className="mb-7">
          <h2 className="font-black tracking-tight mb-3" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Funnel (cohort)
          </h2>
          {leak && (
            <div className="rounded-xl px-4 py-3 mb-3 text-sm font-bold" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
              🩸 Biggest leak: {leak.label} — lost {fmt(leak.lossAbs)} ({pct1(leak.lossPct)})
            </div>
          )}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}>
            {steps.map((st, i) => {
              const isLeak = leak ? st.label === leak.stepLabel : false
              const widthPct = Math.max(3, Math.round((st.count / maxCount) * 100))
              return (
                <div key={st.label} className="mb-2.5 last:mb-0">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-bold" style={{ color: 'var(--text)' }}>{st.label}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      <b style={{ color: 'var(--text)' }}>{fmt(st.count)}</b>
                      {i > 0 && <> · {pct1(st.pctOfPrev)} of prev · {pct1(st.pctOfSignups)} of signups</>}
                      {i > 0 && st.lossAbs > 0 && <span style={{ color: '#f87171' }}> · −{fmt(st.lossAbs)}</span>}
                    </span>
                  </div>
                  <div className="rounded-md h-7 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: isLeak ? '1.5px solid #ef4444' : '1px solid var(--border)' }}>
                    <div className="h-full rounded-md" style={{ width: `${widthPct}%`, background: isLeak ? 'linear-gradient(90deg,#ef4444,#b91c1c)' : 'linear-gradient(90deg,#22d3ee,#8b5cf6)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── #475 — Revenue leaks ──────────────────────────────────────────── */}
      {data.revenueLeaks && data.revenueLeaks.length > 0 && (
        <Section title="Revenue leaks">
          <div className="col-span-full flex flex-col gap-2">
            {data.revenueLeaks.map((l) => (
              <div key={l.label} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span className="font-black" style={{ fontSize: '1.3rem', color: l.count > 0 ? '#fbbf24' : 'var(--muted)' }}>{fmt(l.count)}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{l.label}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#22d3ee' }}>→ {l.action}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── #475 — Hot leads (PQL) ────────────────────────────────────────── */}
      {data.hotLeads && data.hotLeads.length > 0 && (
        <section className="mb-7">
          <h2 className="font-black tracking-tight mb-3" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Hot leads · closest to paying
          </h2>
          <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs" style={{ minWidth: 640 }}>
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="px-3 py-2 font-bold">Email</th>
                  <th className="px-3 py-2 font-bold">Score</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Videos</th>
                  <th className="px-3 py-2 font-bold">Checkout</th>
                  <th className="px-3 py-2 font-bold">Abandoned</th>
                  <th className="px-3 py-2 font-bold">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.hotLeads.map((h, i) => (
                  <tr key={h.email + i} style={{ borderTop: '1px solid var(--border)', color: 'var(--text2)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--text)' }}>{h.email}</td>
                    <td className="px-3 py-2 font-black" style={{ color: STATUS_COLOR[h.status] }}>{h.score}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: STATUS_COLOR[h.status] + '22', color: STATUS_COLOR[h.status] }}>{h.status}</span></td>
                    <td className="px-3 py-2">{h.videos}</td>
                    <td className="px-3 py-2">{h.checkoutClicked ? '✅' : '—'}</td>
                    <td className="px-3 py-2">{h.abandoned ? '🔴' : '—'}</td>
                    <td className="px-3 py-2">{h.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* First-touch conversion path. The ChatGPT row is the current growth focus. */}
      {sourceConversion.rows.length > 0 && (
        <section className="mb-7">
          <div className="mb-3">
            <h2 className="font-black tracking-tight" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              First-touch source → delivered video → subscription
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              Unique external people. Checkout and paid stay nested inside the completed-video cohort; the ChatGPT row is highlighted.
            </p>
          </div>
          <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs" style={{ minWidth: 860 }}>
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="px-3 py-2 font-bold">Source</th>
                  <th className="px-3 py-2 font-bold">Signups</th>
                  <th className="px-3 py-2 font-bold">Video delivered</th>
                  <th className="px-3 py-2 font-bold">Video + checkout</th>
                  <th className="px-3 py-2 font-bold">Video + paid</th>
                  <th className="px-3 py-2 font-bold">Signup→Video</th>
                  <th className="px-3 py-2 font-bold">Video→Checkout</th>
                  <th className="px-3 py-2 font-bold">Checkout→Paid</th>
                </tr>
              </thead>
              <tbody>
                {sourceConversion.rows.map((src) => {
                  const isChatGpt = src.source === 'chatgpt'
                  return (
                  <tr key={src.source} style={{ borderTop: '1px solid var(--border)', color: 'var(--text2)', background: isChatGpt ? 'rgba(34,211,238,0.07)' : undefined }}>
                    <td className="px-3 py-2 font-bold" style={{ color: isChatGpt ? '#67e8f9' : 'var(--text)' }}>
                      {src.source}{isChatGpt ? ' · FOCUS' : ''}
                    </td>
                    <td className="px-3 py-2">{sourceConversion.profilesAvailable ? fmt(src.signups) : '—'}</td>
                    <td className="px-3 py-2">{sourceConversion.videosAvailable ? fmt(src.completedVideos) : '—'}</td>
                    <td className="px-3 py-2">{sourceConversion.checkoutAvailable ? fmt(src.checkoutAfterVideo) : '—'}</td>
                    <td className="px-3 py-2" style={{ color: src.paidAfterCheckout > 0 ? '#a78bfa' : 'var(--muted)' }}>
                      {sourceConversion.paymentsAvailable ? fmt(src.paidAfterCheckout) : '—'}
                    </td>
                    <td className="px-3 py-2">{sourceConversion.videosAvailable ? src.signupToVideoRate : '—'}</td>
                    <td className="px-3 py-2">{sourceConversion.checkoutAvailable ? src.videoToCheckoutRate : '—'}</td>
                    <td className="px-3 py-2">{sourceConversion.paymentsAvailable ? src.checkoutToPaidRate : '—'}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Section title={`Acquisition attribution · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Known-source signups"
          value={fmt(acquisition.attributedSignups)}
          hint={`${fmt(acquisition.attributedActivated)} activated · ${fmt(acquisition.attributedPaid)} paid`}
          accent="#22d3ee"
        />
        <Card
          label="Direct / unknown"
          value={fmt(acquisition.directOrUnknownSignups)}
          hint="no trustworthy first-touch source"
          accent="#94a3b8"
        />
        <Card
          label="OAuth / checkout refs ignored"
          value={fmt(acquisition.correctedSelfReferrals)}
          hint="historical rows normalized at read time"
          accent={acquisition.correctedSelfReferrals > 0 ? '#fbbf24' : '#22d3ee'}
        />
        <Card
          label="Top known source"
          value={acquisition.topSource ?? '—'}
          hint={`${fmt(acquisition.topSourceSignups)} signups`}
          accent="#a78bfa"
        />
      </Section>

      {/* ── #475 — Topic performance ──────────────────────────────────────── */}
      {data.topicPerformance && data.topicPerformance.length > 0 && (
        <section className="mb-7">
          <h2 className="font-black tracking-tight mb-3" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Topic performance · what gets made
          </h2>
          <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs" style={{ minWidth: 480 }}>
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="px-3 py-2 font-bold">Topic / niche</th>
                  <th className="px-3 py-2 font-bold">Videos</th>
                  <th className="px-3 py-2 font-bold">Users</th>
                </tr>
              </thead>
              <tbody>
                {data.topicPerformance.map((t, i) => (
                  <tr key={t.topic + i} style={{ borderTop: '1px solid var(--border)', color: 'var(--text2)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--text)' }}>{t.topic}</td>
                    <td className="px-3 py-2">{fmt(t.videos)}</td>
                    <td className="px-3 py-2">{fmt(t.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Existing real-stats sections ──────────────────────────────────── */}
      <Section title="Growth (all-time)">
        <Card label="Total users"      value={fmt(s.totalUsers)}    hint="all signups"   accent="#22d3ee" />
        <Card label="New this week"    value={fmt(s.newThisWeek)}   hint="last 7 days"   accent="#a78bfa" />
        <Card label="New this month"   value={fmt(s.newThisMonth)}  hint="last 30 days"  accent="#a78bfa" />
        <Card label="Videos this week" value={fmt(s.videosThisWeek)} hint="last 7 days"  accent="#a78bfa" />
      </Section>

      <Section title="Subscribers">
        <Card label="Starter" value={fmt(s.starterUsers ?? 0)} hint="Stripe active / trialing" accent="#22d3ee" />
        <Card label="Creator" value={fmt(s.basicUsers)} hint="Stripe active / trialing" accent="#a78bfa" />
        <Card label="Studio"  value={fmt(s.proUsers)}   hint="Stripe active / trialing" accent="#a78bfa" />
        <Card label="Free"    value={fmt(s.freeUsers)}  hint="no valid recurring plan" accent="#94a3b8" />
        <Card label="Paid · 0 credits ⚠️" value={fmt(s.paidNoCredits)} hint="check Stripe webhook" accent={s.paidNoCredits > 0 ? '#f87171' : '#a78bfa'} />
      </Section>

      <Section title="Conversion rates (all-time)">
        <RateCard label="Signup → Video"  value={r.signupToVideo} sub={`${s.usersWithVideos} / ${s.totalUsers}`} />
        <RateCard label="Signup → Paid"   value={r.signupToPaid}  sub={`${recurringPaidUsers} / ${s.totalUsers}`} />
        <RateCard label="Video → Paid"    value={r.videoToPaid}   sub={`${recurringPaidUsers} / ${s.usersWithVideos}`} />
        <RateCard label="Creator → Studio" value={r.basicToPro}   sub={`${s.proUsers} / ${s.proUsers + s.basicUsers}`} />
      </Section>

      <Section title={`Activation proof · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="OAuth callbacks completed"
          value={fmt(data.counts.auth_callback_completed ?? 0)}
          hint="authoritative server event"
          accent="#22d3ee"
        />
        <Card
          label="Email signups completed"
          value={fmt(data.counts.email_signup_completed ?? 0)}
          hint="authenticated before redirect"
          accent="#22d3ee"
        />
        <Card
          label="Arrived at generator"
          value={fmt(data.counts.generate_arrived_server ?? 0)}
          hint="authenticated server arrival"
          accent="#a78bfa"
        />
        <Card
          label="Activation session missing"
          value={fmt(data.counts.generate_activation_auth_missing ?? 0)}
          hint="must stay at zero"
          accent={(data.counts.generate_activation_auth_missing ?? 0) > 0 ? '#f87171' : '#22d3ee'}
        />
        <Card
          label="OAuth callbacks failed"
          value={fmt(data.counts.auth_callback_failed ?? 0)}
          hint="no credentials stored"
          accent={(data.counts.auth_callback_failed ?? 0) > 0 ? '#fbbf24' : '#22d3ee'}
        />
      </Section>

      <Section title={`Checkout intent truth · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Qualified intent actors"
          value={fmt(data.counts.checkout_attempted ?? 0)}
          hint={`${fmt(data.counts.checkout_attempted_raw ?? 0)} raw API requests`}
          accent="#22d3ee"
        />
        <Card
          label="Auth wall actors"
          value={fmt(data.counts.checkout_auth_required ?? 0)}
          hint={`${fmt(data.counts.checkout_auth_page_view ?? 0)} reached signup screen`}
          accent="#a78bfa"
        />
        <Card
          label="Auth method selected"
          value={fmt(data.counts.checkout_auth_method_selected ?? 0)}
          hint={`${fmt(data.counts.checkout_auth_confirmation_required ?? 0)} awaiting confirmation`}
          accent="#a78bfa"
        />
        <Card
          label="Checkout auth completed"
          value={fmt(Math.max(
            data.counts.checkout_auth_completed ?? 0,
            data.counts.checkout_auth_callback_completed ?? 0,
          ))}
          hint="client completion or checkout callback"
          accent="#22d3ee"
        />
        <Card
          label="Authenticated attempts"
          value={fmt(data.counts.checkout_authenticated_attempted ?? 0)}
          hint={`${fmt(data.counts.checkout_started ?? 0)} created Stripe session`}
          accent="#22d3ee"
        />
        <Card
          label="Unidentified probes"
          value={fmt(data.counts.checkout_unidentified_requests ?? 0)}
          hint="excluded from buyer conversion rates"
          accent={(data.counts.checkout_unidentified_requests ?? 0) > 0 ? '#fbbf24' : '#22d3ee'}
        />
      </Section>

      <Section title={`B2B agency funnel · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Agency page viewers"
          value={fmt(data.counts.agency_bulk_page_viewed ?? 0)}
          hint="unique people / sessions"
          accent="#34d399"
        />
        <Card
          label="Margin calculator viewers"
          value={fmt(data.counts.agency_margin_calculator_viewed ?? 0)}
          hint="unique people / sessions"
          accent="#5cb3ff"
        />
        <Card
          label="Calculator → pack"
          value={fmt(data.counts.agency_margin_pack_selected ?? 0)}
          hint="selected a production pack"
          accent="#5cb3ff"
        />
        <Card
          label="Pack checkout clicks"
          value={fmt(data.counts.agency_bulk_pack_clicked ?? 0)}
          hint={`${fmt(data.counts.bulk_checkout_started ?? 0)} Stripe sessions created`}
          accent="#34d399"
        />
        <Card
          label="Business brief viewers"
          value={fmt(data.counts.b2b_brief_viewed ?? 0)}
          hint="unique people / sessions"
          accent="#a78bfa"
        />
        <Card
          label="Recorded business briefs"
          value={fmt(data.b2bLeadInbox?.total ?? 0)}
          hint={`${fmt(data.counts.b2b_brief_submitted ?? 0)} client success events`}
          accent="#c4b5fd"
        />
      </Section>

      {(data.b2bLeadInbox?.leads.length ?? 0) > 0 ? (
        <section className="mb-6 rounded-xl p-4" style={{ background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.25)' }}>
          <h3 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#c4b5fd' }}>
            Business brief inbox · {days === 'all' ? 'all time' : `${days}d`}
          </h3>
          <div className="grid gap-2">
            {data.b2bLeadInbox?.leads.slice(0, 20).map((lead) => (
              <div key={lead.email} className="rounded-lg px-3 py-2.5 flex flex-wrap items-center justify-between gap-2" style={{ background: 'rgba(11,17,32,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
                <a href={`mailto:${lead.email}`} className="text-sm font-bold break-all" style={{ color: '#f5f5f7' }}>{lead.email}</a>
                <div className="text-right">
                  <div className="text-xs font-bold" style={{ color: '#a78bfa' }}>{lead.monthlyVolume}</div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'date unavailable'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--muted)' }}>
            Contact is not automatic. Review fit and obtain founder approval before sending any message.
          </p>
        </section>
      ) : null}

      <Section title={`First-video handoff · PUSH #27 · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Compact handoff viewed"
          value={fmt(firstVideoOnboarding.views)}
          hint="unique users / sessions"
          accent="#22d3ee"
        />
        <Card
          label="Primary clicks"
          value={fmt(firstVideoOnboarding.primaryClicks)}
          hint={`${fmt(firstVideoOnboarding.skips)} chose their own idea`}
          accent="#a78bfa"
        />
        <RateCard
          label="View → Click"
          value={firstVideoOnboarding.viewToClickRate}
          sub={`${firstVideoOnboarding.primaryClicks} / ${firstVideoOnboarding.views}`}
        />
        <Card
          label="Above-fold CTA viewers"
          value={fmt(firstVideoOnboarding.aboveFoldViews)}
          hint={ACTIVATION_HANDOFF_SURFACE_VERSION}
          accent="#67e8f9"
        />
        <Card
          label="Above-fold CTA clicks"
          value={fmt(firstVideoOnboarding.aboveFoldClicks)}
          hint="unique people; either CTA position in the new handoff"
          accent="#2997ff"
        />
        <RateCard
          label="Above-fold view → click"
          value={firstVideoOnboarding.aboveFoldViewToClickRate}
          sub={`${firstVideoOnboarding.aboveFoldClicks} / ${firstVideoOnboarding.aboveFoldViews}`}
        />
        <Card
          label="Renders dispatched"
          value={fmt(firstVideoOnboarding.dispatched)}
          hint="analysis reached generation dispatch"
          accent="#22d3ee"
        />
        <RateCard
          label="Click → Dispatch"
          value={firstVideoOnboarding.clickToDispatchRate}
          sub={`${firstVideoOnboarding.dispatched} / ${firstVideoOnboarding.primaryClicks}`}
        />
        <Card
          label="First videos completed"
          value={fmt(firstVideoOnboarding.completed)}
          hint={`${fmt(firstVideoOnboarding.failed)} failed`}
          accent={firstVideoOnboarding.completed > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Dispatch → Complete"
          value={firstVideoOnboarding.dispatchToCompleteRate}
          sub={`${firstVideoOnboarding.completed} / ${firstVideoOnboarding.dispatched}`}
        />
        <Card
          label="Goal router exposed"
          value={fmt(firstVideoOnboarding.goalRouterViews)}
          hint="new creator / business / client variant"
          accent="#22d3ee"
        />
        <Card
          label="Changed default goal"
          value={fmt(firstVideoOnboarding.goalSelections)}
          hint="unique people; channel stays one-click by default"
          accent="#a78bfa"
        />
        <RateCard
          label="Goal router view → click"
          value={firstVideoOnboarding.goalRouterViewToClickRate}
          sub={`${firstVideoOnboarding.goalRouterClicks} / ${firstVideoOnboarding.goalRouterViews}`}
        />
        {firstVideoOnboarding.goalBreakdown.map((goal) => (
          <Card
            key={goal.id}
            label={`Goal · ${goal.label}`}
            value={fmt(goal.clicks)}
            hint={`${fmt(goal.dispatched)} dispatched · ${fmt(goal.completed)} completed`}
            accent={goal.clicks > 0 ? '#4ade80' : '#71717a'}
          />
        ))}
      </Section>

      <Section title={`ChatGPT quick-start · source → right input mode → video · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card label="Banner viewers" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.views) : '—'} hint={chatGptQuickstart.eventsAvailable ? `unique actors · ${CHATGPT_QUICKSTART_VARIANT}` : 'Events unavailable — not zero'} accent="#22d3ee" />
        <Card label="Mode selections" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.selections) : '—'} hint={chatGptQuickstart.eventsAvailable ? `${chatGptQuickstart.scriptSelections} script · ${chatGptQuickstart.ideaSelections} idea` : 'Events unavailable — not zero'} accent="#2997ff" />
        <RateCard label="View → Choice" value={chatGptQuickstart.viewToSelectionRate} sub={`${chatGptQuickstart.selections} / ${chatGptQuickstart.views} people`} />
        <Card label="Studio ready" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.studioReady) : '—'} hint="right field, mode and duration loaded" accent="#67e8f9" />
        <RateCard label="Choice → Studio" value={chatGptQuickstart.selectionToStudioReadyRate} sub={`${chatGptQuickstart.studioReady} / ${chatGptQuickstart.selections} people`} />
        <Card label="Generation starts" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.starts) : '—'} hint="after the same actor's choice" accent="#a78bfa" />
        <RateCard label="Studio → Start" value={chatGptQuickstart.studioReadyToStartRate} sub={`${chatGptQuickstart.starts} / ${chatGptQuickstart.studioReady} people`} />
        <Card label="Completed videos" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.completions) : '—'} hint="after quick-start generation" accent="#22d3ee" />
        <RateCard label="Start → Video" value={chatGptQuickstart.startToCompleteRate} sub={`${chatGptQuickstart.completions} / ${chatGptQuickstart.starts} people`} />
        <Card label="Post-video checkouts" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.checkoutStarts) : '—'} hint="checkout after completed quick-start video" accent="#f97316" />
        <RateCard label="Video → Checkout" value={chatGptQuickstart.completeToCheckoutRate} sub={`${chatGptQuickstart.checkoutStarts} / ${chatGptQuickstart.completions} people`} />
        <Card label="Attributed payments" value={chatGptQuickstart.eventsAvailable ? fmt(chatGptQuickstart.payments) : '—'} hint="payment event after attributed checkout" accent={chatGptQuickstart.payments > 0 ? '#22d3ee' : '#fbbf24'} />
        <RateCard label="Checkout → Paid" value={chatGptQuickstart.checkoutToPaidRate} sub={`${chatGptQuickstart.payments} / ${chatGptQuickstart.checkoutStarts} people`} />
      </Section>

      <Section title={`Plan Fit · first delivery → subscription · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="People exposed"
          value={planFitOffer.eventsAvailable ? fmt(planFitOffer.exposedPeople) : '—'}
          hint={planFitOffer.eventsAvailable ? 'first completed video · card actually visible' : 'Events data unavailable — not zero'}
          accent="#22d3ee"
        />
        <Card
          label="Cadence selected"
          value={planFitOffer.eventsAvailable ? fmt(planFitOffer.selectedPeople) : '—'}
          hint={planFitOffer.eventsAvailable ? 'unique people who chose a monthly target' : 'Events data unavailable — not zero'}
          accent="#4ade80"
        />
        <RateCard
          label="Exposure → Selection"
          value={planFitOffer.exposureToSelectionRate}
          sub={`${planFitOffer.selectedPeople} / ${planFitOffer.exposedPeople} people`}
        />
        <Card
          label="Stripe checkouts"
          value={planFitOffer.stripeAvailable ? fmt(planFitOffer.checkoutPeople) : '—'}
          hint={planFitOffer.stripeAvailable ? 'unique people · verified Stripe sessions' : 'Stripe data unavailable — not zero'}
          accent="#a78bfa"
        />
        <RateCard
          label="Selection → Checkout"
          value={planFitOffer.selectionToCheckoutRate}
          sub={`${planFitOffer.checkoutPeople} / ${planFitOffer.selectedPeople} people`}
        />
        <Card
          label="New subscriptions"
          value={planFitOffer.stripeAvailable ? fmt(planFitOffer.paidPeople) : '—'}
          hint={planFitOffer.stripeAvailable ? 'unique people · completed Stripe checkout' : 'Stripe data unavailable — not zero'}
          accent={planFitOffer.paidPeople > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Checkout → Paid"
          value={planFitOffer.checkoutToPaidRate}
          sub={`${planFitOffer.paidPeople} / ${planFitOffer.checkoutPeople} people`}
        />
      </Section>

      <Section title={`Repeat-creator offer · PUSH #28 · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Offer viewed"
          value={fmt(repeatCreatorOffer.views)}
          hint="free users with 2+ completed videos"
          accent="#22d3ee"
        />
        <Card
          label="Starter clicks"
          value={fmt(repeatCreatorOffer.clicks)}
          hint="primary $4.90 recurring offer"
          accent="#4ade80"
        />
        <RateCard
          label="View → Click"
          value={repeatCreatorOffer.viewToClickRate}
          sub={`${repeatCreatorOffer.clicks} / ${repeatCreatorOffer.views}`}
        />
        <Card
          label="Stripe checkouts"
          value={fmt(repeatCreatorOffer.checkoutStarts)}
          hint="session created after this click"
          accent="#a78bfa"
        />
        <RateCard
          label="Click → Checkout"
          value={repeatCreatorOffer.clickToCheckoutRate}
          sub={`${repeatCreatorOffer.checkoutStarts} / ${repeatCreatorOffer.clicks}`}
        />
        <Card
          label="Active subscribers"
          value={fmt(repeatCreatorOffer.activeSubscribers)}
          hint="verified active / trialing in Stripe"
          accent={repeatCreatorOffer.activeSubscribers > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Checkout → Active"
          value={repeatCreatorOffer.checkoutToPaidRate}
          sub={`${repeatCreatorOffer.activeSubscribers} / ${repeatCreatorOffer.checkoutStarts}`}
        />
      </Section>

      <Section title={`SEO landing pages · organic · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="SEO landing visitors"
          value={fmt(organic.landingVisitors)}
          hint="unique external people"
          accent="#22d3ee"
        />
        <Card
          label="Script handoff opens"
          value={fmt(organic.handoffOpens)}
          hint="unique people who opened the paste form"
          accent="#2997ff"
        />
        <Card
          label="Organic intent people"
          value={fmt(organic.intentActors)}
          hint="unique people who submitted or left for the product"
          accent="#a78bfa"
        />
        <RateCard
          label="Landing → Intent"
          value={organic.ctaRate}
          sub={`${organic.intentActors} / ${organic.landingVisitors}`}
        />
        <Card
          label="Viral Now visitors"
          value={fmt(organic.viralNowViews)}
          hint="unique external actors · PUSH #39"
          accent="#f97316"
        />
        <Card
          label="Viral topic selections"
          value={fmt(organic.viralNowClicks)}
          hint="exact topic preserved through signup"
          accent="#ef4444"
        />
        <RateCard
          label="Viral view → Topic"
          value={organic.viralNowViewToClickRate}
          sub={`${organic.viralNowClicks} / ${organic.viralNowViews}`}
        />
        <Card
          label="Attributed signups"
          value={fmt(organic.signups)}
          hint="seo/organic campaigns; other sources are above"
          accent="#22d3ee"
        />
        <RateCard
          label="Intent → Signup"
          value={organic.signupRate}
          sub={`${organic.signups} / ${organic.intentActors}`}
        />
        <RateCard
          label="Signup → Video"
          value={organic.activationRate}
          sub={`${organic.activated} / ${organic.signups}`}
        />
        <Card
          label="Recurring subscribers"
          value={fmt(organic.paid)}
          hint="verified active / trialing"
          accent={organic.paid > 0 ? '#22d3ee' : '#fbbf24'}
        />
      </Section>

      <Section title={`Example remix · proof → topic → signup · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Remix form viewers"
          value={exampleRemix.eventsAvailable ? fmt(exampleRemix.formViewers) : '—'}
          hint="unique external actors · form 50% visible"
          accent="#22d3ee"
        />
        <Card
          label="Topics submitted"
          value={exampleRemix.eventsAvailable ? fmt(exampleRemix.topicSubmitters) : '—'}
          hint="unique people who entered their own story"
          accent="#2997ff"
        />
        <RateCard
          label="View → Topic"
          value={exampleRemix.viewToSubmitRate}
          sub={`${exampleRemix.topicSubmitters} / ${exampleRemix.formViewers} people`}
        />
        <Card
          label="Attributed signups"
          value={fmt(exampleRemix.attributedSignups)}
          hint="profile campaign example_remix_v1"
          accent="#a78bfa"
        />
        <RateCard
          label="Topic → Signup"
          value={exampleRemix.submitToSignupRate}
          sub={`${exampleRemix.attributedSignups} / ${exampleRemix.topicSubmitters} people`}
        />
        <Card
          label="Completed creators"
          value={fmt(exampleRemix.completedCreators)}
          hint="attributed people with a completed video"
          accent={exampleRemix.completedCreators > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Signup → Video"
          value={exampleRemix.signupToCompleteRate}
          sub={`${exampleRemix.completedCreators} / ${exampleRemix.attributedSignups} people`}
        />
      </Section>

      <Section title={`Post-video export · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Offer actually viewed"
          value={fmt(postVideoOffer.offerViews)}
          hint="50% of export card visible"
          accent="#22d3ee"
        />
        <Card
          label="Watermarked downloads"
          value={fmt(postVideoOffer.watermarkedDownloads)}
          hint="free export delivered"
          accent="#a78bfa"
        />
        <Card
          label="Clean-export clicks"
          value={fmt(postVideoOffer.cleanExportClicks)}
          hint="Starter at the export decision"
          accent="#22d3ee"
        />
        <RateCard
          label="Offer view → Click"
          value={postVideoOffer.viewToClickRate}
          sub={`${postVideoOffer.cleanExportClicks} / ${postVideoOffer.offerViews}`}
        />
        <Card
          label="Post-video checkouts"
          value={fmt(postVideoOffer.checkoutStarts)}
          hint="Stripe session created"
          accent="#a78bfa"
        />
        <RateCard
          label="Click → Checkout"
          value={postVideoOffer.clickToCheckoutRate}
          sub={`${postVideoOffer.checkoutStarts} / ${postVideoOffer.cleanExportClicks}`}
        />
        <Card
          label="Post-video subscribers"
          value={fmt(postVideoOffer.payments)}
          hint="verified payment_success"
          accent={postVideoOffer.payments > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Checkout → Paid"
          value={postVideoOffer.checkoutToPaidRate}
          sub={`${postVideoOffer.payments} / ${postVideoOffer.checkoutStarts}`}
        />
      </Section>

      <Section title={`Trial subscription offer · causal by person · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Offer viewers"
          value={fmt(trialPostVideoOffer.views)}
          hint="unique external actors"
          accent="#22d3ee"
        />
        <Card
          label="Single-primary viewers"
          value={fmt(trialPostVideoOffer.singlePrimaryViews)}
          hint="new post-video layout only"
          accent="#c4b5fd"
        />
        <Card
          label="Offer clicks"
          value={fmt(trialPostVideoOffer.clicks)}
          hint={`${fmt(trialPostVideoOffer.noClickViewers)} viewers did not click`}
          accent="#4ade80"
        />
        <RateCard
          label="View → Click"
          value={trialPostVideoOffer.viewToClickRate}
          sub={`${trialPostVideoOffer.clicks} / ${trialPostVideoOffer.views} people`}
        />
        <Card
          label="Checkout after click"
          value={fmt(trialPostVideoOffer.checkoutStarts)}
          hint="same actor, ordered journey"
          accent="#a78bfa"
        />
        <RateCard
          label="Click → Checkout"
          value={trialPostVideoOffer.clickToCheckoutRate}
          sub={`${trialPostVideoOffer.checkoutStarts} / ${trialPostVideoOffer.clicks} people`}
        />
        <Card
          label="Payment after checkout"
          value={fmt(trialPostVideoOffer.payments)}
          hint={`${fmt(trialPostVideoOffer.checkoutAfterViewWithoutClick)} checkout elsewhere after viewing`}
          accent={trialPostVideoOffer.payments > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Checkout → Paid"
          value={trialPostVideoOffer.checkoutToPaidRate}
          sub={`${trialPostVideoOffer.payments} / ${trialPostVideoOffer.checkoutStarts} people`}
        />
        {trialPostVideoOffer.sourceBreakdown.length > 0 ? (
          <div className="col-span-full rounded-xl overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs" style={{ minWidth: 540 }}>
              <thead style={{ color: 'var(--muted)' }}>
                <tr>
                  <th className="px-3 py-2 font-bold">Source</th>
                  <th className="px-3 py-2 font-bold">Viewed</th>
                  <th className="px-3 py-2 font-bold">Clicked</th>
                  <th className="px-3 py-2 font-bold">Checkout</th>
                  <th className="px-3 py-2 font-bold">Paid</th>
                </tr>
              </thead>
              <tbody>
                {trialPostVideoOffer.sourceBreakdown.map((row) => (
                  <tr key={row.source} style={{ borderTop: '1px solid var(--border)', color: 'var(--text2)' }}>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--text)' }}>{row.source}</td>
                    <td className="px-3 py-2">{fmt(row.views)}</td>
                    <td className="px-3 py-2">{fmt(row.clicks)}</td>
                    <td className="px-3 py-2">{fmt(row.checkoutStarts)}</td>
                    <td className="px-3 py-2">{fmt(row.payments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      <Section title={`Fast balance → Seedance → subscription · causal by person · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Bridge viewers"
          value={fmt(trialBalanceBridge.viewers)}
          hint="Fast trial users with 15–24cr left"
          accent="#c084fc"
        />
        <RateCard
          label="View → Set up Seedance"
          value={trialBalanceBridge.viewToClickRate}
          sub={`${trialBalanceBridge.clickers} / ${trialBalanceBridge.viewers} people`}
        />
        <Card
          label="Premium completers"
          value={fmt(trialBalanceBridge.premiumCompleters)}
          hint="35s Seedance completed after click"
          accent="#22d3ee"
        />
        <RateCard
          label="Set up → Premium complete"
          value={trialBalanceBridge.clickToPremiumRate}
          sub={`${trialBalanceBridge.premiumCompleters} / ${trialBalanceBridge.clickers} people`}
        />
        <Card
          label="Checkout after premium"
          value={fmt(trialBalanceBridge.checkoutStarters)}
          hint="same actor, ordered journey"
          accent="#a78bfa"
        />
        <RateCard
          label="Premium → Checkout"
          value={trialBalanceBridge.premiumToCheckoutRate}
          sub={`${trialBalanceBridge.checkoutStarters} / ${trialBalanceBridge.premiumCompleters} people`}
        />
        <Card
          label="Subscribers"
          value={fmt(trialBalanceBridge.subscribers)}
          hint="payment after the attributed checkout"
          accent={trialBalanceBridge.subscribers > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Checkout → Paid"
          value={trialBalanceBridge.checkoutToPaidRate}
          sub={`${trialBalanceBridge.subscribers} / ${trialBalanceBridge.checkoutStarters} people`}
        />
      </Section>

      <Section title={`Creator loop · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Completed creators"
          value={fmt(creatorLoop.completedCreators)}
          hint={`${fmt(creatorLoop.completedVideos)} completed videos`}
          accent="#22d3ee"
        />
        <Card
          label="PUSH 29 prompts seen"
          value={fmt(creatorLoop.deliveryPromptActors)}
          hint="visible done/history prompts"
          accent="#c4b5fd"
        />
        <RateCard
          label="Prompt → Share click"
          value={creatorLoop.deliveryPromptToClickRate}
          sub={`${creatorLoop.deliveryClickActors} / ${creatorLoop.deliveryPromptActors} unique actors`}
        />
        <RateCard
          label="Click → Link delivered"
          value={creatorLoop.deliveryClickToShareRate}
          sub={`${creatorLoop.deliveryShareActors} / ${creatorLoop.deliveryClickActors} unique actors`}
        />
        <Card
          label="PUSH 29 landings"
          value={fmt(creatorLoop.deliveryPublicLandings)}
          hint={`${creatorLoop.deliveryPublicCtaClicks} public CTA clicks`}
          accent="#22d3ee"
        />
        <Card
          label="Share clicks"
          value={fmt(creatorLoop.shareClicks)}
          hint="done screen + My Videos"
          accent="#a78bfa"
        />
        <RateCard
          label="Creator → Share"
          value={creatorLoop.shareRate}
          sub={`${creatorLoop.shareUsers} / ${creatorLoop.completedCreators} unique creators`}
        />
        <Card
          label="Shares completed"
          value={fmt(creatorLoop.sharesCompleted)}
          hint="native share or copied public link"
          accent="#22d3ee"
        />
        <Card
          label="Public-video landings"
          value={fmt(creatorLoop.publicVideoLandings)}
          hint="visits to /v/[id]"
          accent="#a78bfa"
        />
        <Card
          label="Public CTA clicks"
          value={fmt(creatorLoop.publicVideoCtaClicks)}
          hint="make one like this"
          accent="#22d3ee"
        />
        <RateCard
          label="Landing → CTA"
          value={creatorLoop.landingToCtaRate}
          sub={`${creatorLoop.publicVideoCtaClicks} / ${creatorLoop.publicVideoLandings} unique actors`}
        />
        <Card
          label="Remix tool arrivals"
          value={fmt(creatorLoop.remixArrivals)}
          hint="prefilled · no signup"
          accent="#22d3ee"
        />
        <RateCard
          label="CTA → Remix"
          value={creatorLoop.ctaToRemixRate}
          sub={`${creatorLoop.remixArrivals} / ${creatorLoop.publicVideoCtaClicks} unique actors`}
        />
        <Card
          label="Remix scripts made"
          value={fmt(creatorLoop.remixScripts)}
          hint="useful result delivered"
          accent="#a78bfa"
        />
        <RateCard
          label="Remix → Script"
          value={creatorLoop.remixToScriptRate}
          sub={`${creatorLoop.remixScripts} / ${creatorLoop.remixArrivals} unique actors`}
        />
        <Card
          label="Remix signup intent"
          value={fmt(creatorLoop.remixSignupClicks)}
          hint="script carried into Studio"
          accent="#22d3ee"
        />
        <RateCard
          label="Script → Signup click"
          value={creatorLoop.scriptToSignupClickRate}
          sub={`${creatorLoop.remixSignupClicks} / ${creatorLoop.remixScripts} unique actors`}
        />
        <Card
          label="Referred signups"
          value={fmt(creatorLoop.referredSignups)}
          hint={`${creatorLoop.qualifiedReferrals} qualified rewards`}
          accent="#a78bfa"
        />
        <RateCard
          label="CTA → Signup"
          value={creatorLoop.ctaToSignupRate}
          sub={`${creatorLoop.referredSignups} / ${creatorLoop.remixSignupClicks || creatorLoop.publicVideoCtaClicks}`}
        />
        <Card
          label="Referred subscribers"
          value={fmt(creatorLoop.referredPaid)}
          hint="Stripe active / trialing"
          accent={creatorLoop.referredPaid > 0 ? '#22d3ee' : '#fbbf24'}
        />
        <RateCard
          label="Referral signup → Paid"
          value={creatorLoop.signupToPaidRate}
          sub={`${creatorLoop.referredPaid} / ${creatorLoop.referredSignups}`}
        />
      </Section>

      <Section title={`Retention loop · ${days === 'all' ? 'all time' : `${days}d`}`}>
        <Card
          label="Completed creators"
          value={fmt(retentionLoop.completedCreators)}
          hint="creators active in period"
          accent="#22d3ee"
        />
        <Card
          label="One and done"
          value={fmt(retentionLoop.oneAndDoneCreators)}
          hint="only one completed video"
          accent={retentionLoop.oneAndDoneCreators > 0 ? '#fbbf24' : '#22d3ee'}
        />
        <Card
          label="Repeat creators"
          value={fmt(retentionLoop.repeatCreators)}
          hint={`${retentionLoop.repeatWithin7dCreators} repeated within 7d`}
          accent="#a78bfa"
        />
        <RateCard
          label="Creator → Second video"
          value={retentionLoop.secondVideoRate}
          sub={`${retentionLoop.repeatCreators} / ${retentionLoop.completedCreators}`}
        />
        <Card
          label="Returned another day"
          value={fmt(retentionLoop.laterDayReturnCreators)}
          hint="new UTC day within 7d"
          accent="#22d3ee"
        />
        <RateCard
          label="7d later-day return"
          value={retentionLoop.laterDayReturnRate}
          sub={`${retentionLoop.laterDayReturnCreators} / ${retentionLoop.completedCreators}`}
        />
        <Card
          label="Next-episode clicks"
          value={fmt(retentionLoop.continuationClicks)}
          hint={`${retentionLoop.continuationLandings} reached generator`}
          accent="#a78bfa"
        />
        <Card
          label="Continuation starts"
          value={fmt(retentionLoop.continuationStarts)}
          hint={`${retentionLoop.continuationCompletes} completed`}
          accent="#22d3ee"
        />
        <RateCard
          label="Click → Render"
          value={retentionLoop.clickToStartRate}
          sub={`${retentionLoop.continuationStarts} / ${retentionLoop.continuationClicks}`}
        />
        <RateCard
          label="Render → Complete"
          value={retentionLoop.startToCompleteRate}
          sub={`${retentionLoop.continuationCompletes} / ${retentionLoop.continuationStarts}`}
        />
      </Section>

      {organic.topLandingPages.length > 0 && (
        <section className="mb-6">
          <h2 className="font-black tracking-tight mb-3" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Organic entry pages
          </h2>
          <div className="overflow-x-auto rounded-2xl" style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ color: 'var(--muted)' }}><th className="px-3 py-2 text-left">Path</th><th className="px-3 py-2 text-right">Sessions</th></tr></thead>
              <tbody>
                {organic.topLandingPages.map((page) => (
                  <tr key={page.path} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--text)' }}>{page.path}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#22d3ee' }}>{fmt(page.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.stripePayments && (
        <Section title="💳 Recurring payment funnel · Stripe">
          <Card label="Checkout initiated" value={fmt(data.stripePayments.checkoutCreated)}   hint="external subscription sessions" accent="#a78bfa" />
          <Card label="Completed ✅"        value={fmt(data.stripePayments.checkoutCompleted)} hint="recurring subscription paid"    accent="#a78bfa" />
          <Card label="Abandoned ❌"        value={fmt(data.stripePayments.checkoutAbandoned)} hint="subscription expired unpaid"    accent={data.stripePayments.checkoutAbandoned > 0 ? '#f87171' : '#a78bfa'} />
          <Card label="Still open ⏳"       value={fmt(data.stripePayments.checkoutOpen)}      hint="on checkout page now"    accent="#fbbf24" />
          <RateCard label="Checkout → Payment" value={data.stripePayments.conversionRate} sub={`${data.stripePayments.checkoutCompleted} / ${data.stripePayments.checkoutCompleted + data.stripePayments.checkoutAbandoned}`} />
          <Card label="Failed payments (30d)" value={fmt(data.stripePayments.recentFailedPayments)} hint="invoice.payment_failed" accent={data.stripePayments.recentFailedPayments > 0 ? '#f87171' : '#a78bfa'} />
        </Section>
      )}

      {/* ── #475 — Tracking health note ───────────────────────────────────── */}
      {data.trackingHealth?.eventsTableMissing && (
        <div className="rounded-xl px-4 py-3 mt-2 text-xs" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
          ⚠️ <b>Tracking note:</b> {data.trackingHealth.note}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-black tracking-tight mb-3" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {children}
      </div>
    </section>
  )
}

function Card({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(11,17,32,0.85)', border: `1px solid ${accent ? accent + '33' : 'var(--border)'}` }}>
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: accent ?? 'var(--muted)' }}>
        {label}
      </div>
      <div className="font-black" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: accent ?? 'var(--text)' }}>
        {value}
      </div>
      {hint && <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}

function RateCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  const isGood = value !== '—' && parseFloat(value) >= 10
  const accent = value === '—' ? '#94a3b8' : isGood ? '#a78bfa' : '#f59e0b'
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(11,17,32,0.85)', border: `1px solid ${accent}33` }}>
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="font-black" style={{ fontSize: '1.9rem', lineHeight: 1.1, color: accent }}>
        {value}
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>{sub}</p>
    </div>
  )
}

function RefreshIndicator({ refreshing, secondsAgo, lastUpdated }: { refreshing: boolean; secondsAgo: number; lastUpdated: Date | null }) {
  if (!lastUpdated) return null
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
      {refreshing && <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#22d3ee' }} />}
      <span>Updated {secondsAgo}s ago</span>
    </div>
  )
}

function AdminNav({ active }: { active: string }) {
  const tabs = [
    { label: 'CEO', href: '/admin/ceo', key: 'ceo' },
    { label: 'Metrics', href: '/admin/metrics', key: 'metrics' },
    { label: 'Funnel', href: '/admin/funnel', key: 'funnel' },
    { label: 'Users', href: '/admin/users', key: 'users' },
  ]
  return (
    <nav className="flex gap-1 mt-4">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          style={{ background: active === t.key ? 'var(--accent)' : 'transparent', color: active === t.key ? '#fff' : 'var(--muted)' }}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
