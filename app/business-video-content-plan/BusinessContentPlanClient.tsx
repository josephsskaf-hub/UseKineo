'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AffiliateLandingContext from '@/components/AffiliateLandingContext'
import { agencyPacksHref } from '@/lib/agencyDistribution'
import { trackEvent } from '@/lib/analytics'
import type { AffiliateLandingContextCopy } from '@/lib/growth/affiliateLandingContext'
import {
  createReliableViewRecorder,
  type ReliableViewStorage,
} from '@/lib/growth/reliablePageView'
import {
  BUSINESS_CADENCES,
  BUSINESS_GOALS,
  BUSINESS_PLAN_CAMPAIGN,
  BUSINESS_PLAN_SHARE_CAMPAIGN,
  buildBusinessContentPlan,
  buildBusinessPlanActivationHref,
  buildBusinessPlanEmptyActivationHref,
  businessContentPlanAsText,
  businessContentPlanEntryMetadata,
  businessContentPlanViewMarker,
  businessCadenceDetails,
  normalizeBusinessAudience,
  normalizeBusinessOffer,
  recommendedBusinessPack,
  type BusinessCadenceId,
  type BusinessContentPlanEntry,
  type BusinessContentPlanItem,
  type BusinessGoalId,
} from '@/lib/growth/businessContentPlan'

type PlanResult = {
  offer: string
  audience: string
  goal: BusinessGoalId
  cadence: BusinessCadenceId
  items: BusinessContentPlanItem[]
}

const EXAMPLES = [
  { label: 'SaaS', offer: 'an invoicing app for independent professionals', audience: 'freelancers with late-paying clients', goal: 'leads' as const },
  { label: 'Local service', offer: 'a residential solar installation service', audience: 'homeowners comparing energy costs', goal: 'trust' as const },
  { label: 'E-commerce', offer: 'a rechargeable desk lamp that folds flat', audience: 'remote workers with small desks', goal: 'explain' as const },
] as const

const CARD = {
  background: 'rgba(15,18,26,.9)',
  border: '1px solid rgba(255,255,255,.1)',
} as const
const businessPlanViewRecorder = createReliableViewRecorder()

export default function BusinessContentPlanClient({
  affiliateContext = null,
  entry = 'direct_or_other',
}: {
  affiliateContext?: AffiliateLandingContextCopy | null
  entry?: BusinessContentPlanEntry
}) {
  const [offer, setOffer] = useState('')
  const [audience, setAudience] = useState('')
  const [goal, setGoal] = useState<BusinessGoalId>('leads')
  const [cadence, setCadence] = useState<BusinessCadenceId>('five')
  const [result, setResult] = useState<PlanResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const attributionMetadata = businessContentPlanEntryMetadata(entry)

  useEffect(() => {
    const marker = businessContentPlanViewMarker(entry)
    let storage: ReliableViewStorage | null = null
    try {
      storage = window.sessionStorage
    } catch {
      // Privacy mode can block storage. The reliable recorder still uses its memory latch.
    }
    const controller = new AbortController()
    void businessPlanViewRecorder.record({
      marker,
      storage,
      signal: controller.signal,
      send: () => trackEvent('business_content_plan_viewed', {
        version: BUSINESS_PLAN_SHARE_CAMPAIGN,
        surface: 'business_video_content_plan',
        ...businessContentPlanEntryMetadata(entry),
      }),
    })
    return () => controller.abort()
  }, [entry])

  function createPlan(input?: { offer: string; audience: string; goal: BusinessGoalId }) {
    const cleanOffer = normalizeBusinessOffer(input?.offer ?? offer)
    const cleanAudience = normalizeBusinessAudience(input?.audience ?? audience)
    const selectedGoal = input?.goal ?? goal
    if (cleanOffer.length < 8) {
      setError('Describe what the business sells or delivers first.')
      return
    }
    setOffer(cleanOffer)
    setAudience(cleanAudience)
    setGoal(selectedGoal)
    setError('')
    const nextResult = {
      offer: cleanOffer,
      audience: cleanAudience,
      goal: selectedGoal,
      cadence,
      items: buildBusinessContentPlan({ offer: cleanOffer, audience: cleanAudience, goal: selectedGoal, cadence }),
    }
    setResult(nextResult)
    setCopied(false)
    void trackEvent('business_content_plan_generated', {
      version: BUSINESS_PLAN_SHARE_CAMPAIGN,
      surface: 'business_video_content_plan',
      goal: selectedGoal,
      cadence,
      item_count: nextResult.items.length,
      ...attributionMetadata,
    })
  }

  async function copyPlan() {
    if (!result) return
    const text = businessContentPlanAsText(result)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      void trackEvent('business_content_plan_copied', {
        version: BUSINESS_PLAN_SHARE_CAMPAIGN,
        surface: 'business_video_content_plan',
        goal: result.goal,
        cadence: result.cadence,
        item_count: result.items.length,
        ...attributionMetadata,
      })
    } catch {
      setCopied(false)
    }
  }

  const cadenceDetails = result ? businessCadenceDetails(result.cadence) : null
  const recommendedPack = result ? recommendedBusinessPack(result.cadence) : null
  const packHref = recommendedPack
    ? agencyPacksHref('content_plan').replace('#agency-pack-heading', `#pack-${recommendedPack}`)
    : agencyPacksHref('content_plan')
  const activationHref = result?.items[0]
    ? buildBusinessPlanActivationHref({
        offer: result.offer,
        audience: result.audience,
        goal: result.goal,
        firstItem: result.items[0],
        entry,
      })
    : buildBusinessPlanEmptyActivationHref(entry)

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    minHeight: 50,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.15)',
    background: '#06070a',
    color: '#f5f5f7',
    padding: '0 14px',
    fontSize: 15,
    fontFamily: 'inherit',
    outlineColor: '#2997ff',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#030405', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 78px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 900, textDecoration: 'none', fontSize: '1.05rem' }}>Kineo</Link>
          <Link href="/ai-shorts-for-agencies" style={{ color: '#9a9aa1', textDecoration: 'none', fontSize: '.8rem' }}>Business video packs</Link>
        </div>

        <section style={{ marginTop: 46, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', color: '#c4b5fd', background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.3)', borderRadius: 999, padding: '6px 13px', fontSize: '.72rem', fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Free · no signup · planning only
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3.9rem)', lineHeight: 1.02, letterSpacing: '-.045em', fontWeight: 950, margin: '17px auto 0', maxWidth: 900 }}>
            Build a weekly video content plan for your business
          </h1>
          <p style={{ color: '#b1b1b8', fontSize: 'clamp(.98rem, 2.2vw, 1.12rem)', lineHeight: 1.65, margin: '17px auto 0', maxWidth: 730 }}>
            Choose the business goal and publishing cadence. Get concrete video angles, evidence boundaries and the first idea ready to carry into Kineo.
          </p>
        </section>

        {affiliateContext ? (
          <div style={{ marginTop: 28 }}>
            <AffiliateLandingContext context={affiliateContext} targetId="business-plan-tool" />
          </div>
        ) : null}

        <section id="business-plan-tool" style={{ ...CARD, marginTop: 30, borderRadius: 20, padding: 'clamp(17px, 4vw, 26px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
            <label style={{ display: 'grid', gap: 8, color: '#e4e4e7', fontSize: '.8rem', fontWeight: 850 }}>
              What does the business sell or deliver?
              <input
                value={offer}
                onChange={(event) => setOffer(event.target.value)}
                maxLength={140}
                placeholder="e.g. invoicing software for freelancers"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 8, color: '#e4e4e7', fontSize: '.8rem', fontWeight: 850 }}>
              Who needs it? <span style={{ color: '#777780', fontWeight: 650 }}>(optional)</span>
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                maxLength={100}
                placeholder="e.g. freelancers with late-paying clients"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 8, color: '#e4e4e7', fontSize: '.8rem', fontWeight: 850 }}>
              Business goal
              <select value={goal} onChange={(event) => setGoal(event.target.value as BusinessGoalId)} style={inputStyle}>
                {BUSINESS_GOALS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 8, color: '#e4e4e7', fontSize: '.8rem', fontWeight: 850 }}>
              Publishing cadence
              <select value={cadence} onChange={(event) => setCadence(event.target.value as BusinessCadenceId)} style={inputStyle}>
                {BUSINESS_CADENCES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => createPlan()}
            style={{ width: '100%', minHeight: 51, marginTop: 14, border: 0, borderRadius: 12, background: '#a78bfa', color: '#130d24', fontWeight: 920, fontSize: '1rem', cursor: 'pointer' }}
          >
            Build the weekly plan →
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => createPlan(example)}
                style={{ borderRadius: 999, padding: '7px 11px', border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.045)', color: '#bdbdc4', fontSize: '.76rem', cursor: 'pointer' }}
              >
                {example.label}
              </button>
            ))}
          </div>
          {error ? <p role="alert" style={{ color: '#fda4af', fontSize: '.87rem', margin: '13px 0 0' }}>{error}</p> : null}
        </section>

        {result && cadenceDetails && recommendedPack ? (
          <section aria-live="polite" style={{ marginTop: 20 }}>
            <div style={{ ...CARD, borderRadius: 20, padding: 'clamp(18px, 4vw, 26px)' }}>
              <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#a78bfa', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>Your weekly content map</div>
                  <h2 style={{ margin: '7px 0 0', fontSize: 'clamp(1.45rem, 4vw, 2.1rem)' }}>{cadenceDetails.weeklyVideos} business Shorts with a job to do</h2>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 9 }}>
                  <div style={{ color: '#92929a', fontSize: '.8rem' }}>Four-week production target: {cadenceDetails.fourWeekVideos} videos</div>
                  <button type="button" onClick={() => void copyPlan()} style={{ minHeight: 39, borderRadius: 10, border: '1px solid rgba(167,139,250,.4)', background: 'rgba(167,139,250,.1)', color: '#ddd6fe', padding: '0 13px', fontSize: '.78rem', fontWeight: 900, cursor: 'pointer' }}>
                    {copied ? 'Plan copied ✓' : 'Copy plan for your team →'}
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 11, marginTop: 20 }}>
                {result.items.map((item, index) => (
                  <article key={`${item.day}-${item.angle}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(68px, .25fr) minmax(0, 2fr)', gap: 14, padding: 16, borderRadius: 15, background: index === 0 ? 'rgba(41,151,255,.09)' : 'rgba(255,255,255,.035)', border: index === 0 ? '1px solid rgba(41,151,255,.3)' : '1px solid rgba(255,255,255,.075)' }}>
                    <div>
                      <div style={{ color: index === 0 ? '#5cb3ff' : '#8b8b94', fontSize: '.7rem', fontWeight: 900, textTransform: 'uppercase' }}>{item.day}</div>
                      <div style={{ color: '#d4d4d8', fontSize: '.75rem', marginTop: 5 }}>{item.angle}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#f5f5f7', fontSize: '.95rem', lineHeight: 1.45 }}>{item.hook}</strong>
                      <p style={{ color: '#aaaab1', fontSize: '.82rem', lineHeight: 1.55, margin: '6px 0 0' }}>{item.brief}</p>
                      <p style={{ color: '#7dd3fc', fontSize: '.75rem', lineHeight: 1.5, margin: '7px 0 0' }}>Evidence: {item.evidence}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 13, marginTop: 13 }}>
              <div style={{ ...CARD, borderRadius: 17, padding: 20 }}>
                <div style={{ color: '#5cb3ff', fontSize: '.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em' }}>Start with one</div>
                <h3 style={{ margin: '8px 0 7px', fontSize: '1.08rem' }}>Carry Monday into the faceless workflow</h3>
                <p style={{ color: '#96969e', fontSize: '.84rem', lineHeight: 1.58, margin: '0 0 14px' }}>The brief and evidence boundary travel through signup. You review them before any credit can be spent.</p>
                <Link href={activationHref} onClick={() => void trackEvent('business_content_plan_activation_clicked', { version: BUSINESS_PLAN_SHARE_CAMPAIGN, campaign: BUSINESS_PLAN_CAMPAIGN, surface: 'business_video_content_plan', goal: result.goal, cadence: result.cadence, ...attributionMetadata })} style={{ display: 'inline-flex', minHeight: 46, alignItems: 'center', justifyContent: 'center', padding: '0 17px', borderRadius: 11, background: '#2997ff', color: '#fff', fontSize: '.86rem', fontWeight: 900, textDecoration: 'none' }}>
                  Create the first Short →
                </Link>
              </div>
              <div style={{ ...CARD, borderRadius: 17, padding: 20 }}>
                <div style={{ color: '#34d399', fontSize: '.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em' }}>Produce the batch</div>
                <h3 style={{ margin: '8px 0 7px', fontSize: '1.08rem' }}>The closest one-time fit is the {recommendedPack === 'bulk20' ? '20' : '30'}-video pack</h3>
                <p style={{ color: '#96969e', fontSize: '.84rem', lineHeight: 1.58, margin: '0 0 14px' }}>This is a four-week planning fit, not a promise that every month has four weeks. Credits do not expire.</p>
                <Link href={packHref} onClick={() => void trackEvent('business_content_plan_packs_clicked', { version: BUSINESS_PLAN_SHARE_CAMPAIGN, campaign: BUSINESS_PLAN_CAMPAIGN, surface: 'business_video_content_plan', goal: result.goal, cadence: result.cadence, recommended_pack: recommendedPack, ...attributionMetadata })} style={{ display: 'inline-flex', minHeight: 46, alignItems: 'center', justifyContent: 'center', padding: '0 17px', borderRadius: 11, background: '#34d399', color: '#04110c', fontSize: '.86rem', fontWeight: 900, textDecoration: 'none' }}>
                  See the {recommendedPack === 'bulk20' ? '20' : '30'}-video pack →
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section style={{ marginTop: 34, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 12 }}>
          <article style={{ ...CARD, borderRadius: 16, padding: 19 }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 7px' }}>What this planner does</h2>
            <p style={{ color: '#92929a', fontSize: '.84rem', lineHeight: 1.6, margin: 0 }}>It turns your offer, audience, goal and cadence into reusable content angles and evidence requirements.</p>
          </article>
          <article style={{ ...CARD, borderRadius: 16, padding: 19 }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 7px' }}>What it does not do</h2>
            <p style={{ color: '#92929a', fontSize: '.84rem', lineHeight: 1.6, margin: 0 }}>It does not research your claims, schedule posts, publish to social platforms or guarantee leads.</p>
          </article>
        </section>
      </div>
    </main>
  )
}
