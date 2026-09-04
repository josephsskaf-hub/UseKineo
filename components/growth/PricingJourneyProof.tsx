'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useFreeTierOffer } from '@/components/FreeTierOfferProvider'
import {
  decidePricingJourneyProof,
  pricingJourneyEmailFilmCampaign,
  PRICING_JOURNEY_EMAIL_FILM_VERSION,
  type PricingJourneyProofDecision,
  type PricingJourneyVideo,
} from '@/lib/growth/pricingJourneyProof'
import {
  checkoutResumeFilmTelemetry,
  selectCheckoutResumeFilm,
  type CheckoutResumeFilmProof,
} from '@/lib/growth/checkoutResumeFilm'

type VideosResponse = {
  videos?: PricingJourneyVideo[]
  completedCount?: number | null
  historyReliable?: boolean
}

type PlanResponse = { plan?: string; isPro?: boolean }
type ResumeResponse = { available?: boolean }

export default function PricingJourneyProof({
  signedIn,
  intentCampaign,
}: {
  signedIn: boolean | null
  intentCampaign: string | null
}) {
  const offer = useFreeTierOffer()
  const [decision, setDecision] = useState<PricingJourneyProofDecision | null>(null)
  const [emailFilm, setEmailFilm] = useState<CheckoutResumeFilmProof | null>(null)
  const viewedKey = useRef<string | null>(null)
  const emailFilmLoadedKey = useRef<string | null>(null)

  useEffect(() => {
    if (signedIn !== true) {
      setDecision(null)
      setEmailFilm(null)
      return
    }

    const controller = new AbortController()
    const options: RequestInit = {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    }

    void Promise.all([
      fetch('/api/videos', options),
      fetch('/api/me/plan', options),
      fetch('/api/stripe/checkout/resume?surface=pricing', options),
    ])
      .then(async ([videosResponse, planResponse, resumeResponse]) => {
        if (!videosResponse.ok || !planResponse.ok) return null
        const [videos, plan, resume] = await Promise.all([
          videosResponse.json() as Promise<VideosResponse>,
          planResponse.json() as Promise<PlanResponse>,
          resumeResponse.ok
            ? resumeResponse.json() as Promise<ResumeResponse>
            : Promise.resolve({ available: false }),
        ])
        const planName = typeof plan.plan === 'string' ? plan.plan.trim().toLowerCase() : ''
        const recentVideos = Array.isArray(videos.videos) ? videos.videos : null
        const nextDecision = decidePricingJourneyProof({
          completedCount: typeof videos.completedCount === 'number' ? videos.completedCount : null,
          hasActivePlan: Boolean(plan.isPro) || (planName !== '' && planName !== 'free'),
          historyReliable: videos.historyReliable === true,
          recentVideos,
          reverseTrial: offer.reverseTrial,
          savedCheckoutAvailable: resume.available === true,
          signedIn: true,
        })
        const emailCampaign = pricingJourneyEmailFilmCampaign(intentCampaign)
        return {
          decision: nextDecision,
          emailFilm:
            emailCampaign && nextDecision.state === 'after_delivery'
              ? selectCheckoutResumeFilm(recentVideos)
              : null,
        }
      })
      .then((next) => {
        if (controller.signal.aborted) return
        setDecision(next?.decision ?? null)
        setEmailFilm(next?.emailFilm ?? null)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDecision(null)
          setEmailFilm(null)
        }
      })

    return () => controller.abort()
  }, [intentCampaign, offer.reverseTrial, signedIn])

  useEffect(() => {
    if (!decision || decision.state === 'hidden') return
    const key = `${decision.version}:${decision.state}:${decision.completedCountBucket}`
    if (viewedKey.current === key) return
    try {
      if (sessionStorage.getItem(`kineo:${key}`) === '1') return
      sessionStorage.setItem(`kineo:${key}`, '1')
    } catch {
      // The in-memory key still deduplicates the uninterrupted tab.
    }
    viewedKey.current = key
    void trackEvent('pricing_journey_proof_viewed', {
      version: decision.version,
      journey_state: decision.state,
      completed_count_bucket: decision.completedCountBucket,
      engine: decision.engineLabel,
      duration_seconds: decision.duration,
    })
  }, [decision])

  if (!decision || decision.state === 'hidden') return null

  const eventMetadata = {
    version: decision.version,
    journey_state: decision.state,
    completed_count_bucket: decision.completedCountBucket,
    engine: decision.engineLabel,
    duration_seconds: decision.duration,
  }
  const emailCampaign = pricingJourneyEmailFilmCampaign(intentCampaign)

  if (decision.state === 'before_first_delivery') {
    return (
      <section
        aria-labelledby="pricing-proof-first-title"
        className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#62b3ff]/35 bg-gradient-to-br from-[#111d2c] via-[#111820] to-[#141416] px-5 py-5 shadow-[0_20px_65px_-35px_rgba(41,151,255,.75)] sm:px-6"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[.15em] text-[#62b3ff]">
              Proof before payment
            </div>
            <h2 id="pricing-proof-first-title" className="text-xl font-black tracking-[-.02em] text-white">
              See your own finished video before choosing a plan.
            </h2>
            <p className="mt-2 max-w-xl text-[13px] font-semibold leading-relaxed text-[#a9b4c5]">
              Your account has not completed a video yet. Build a {decision.duration}s {decision.engineLabel} episode, review it, then decide. Nothing renders until you press Generate.
            </p>
          </div>
          <div className="flex flex-none flex-col gap-2 sm:items-center">
            <Link
              href={decision.creationHref}
              onClick={() => void trackEvent('pricing_journey_proof_creation_clicked', eventMetadata)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2997ff] px-5 py-3 text-center text-[13px] font-black text-white no-underline shadow-[0_12px_30px_-15px_rgba(41,151,255,.95)] hover:bg-[#4aa8ff]"
            >
              Build my proof video →
            </Link>
            <a
              href="#plans"
              onClick={() => void trackEvent('pricing_journey_proof_subscribe_now_clicked', eventMetadata)}
              className="text-center text-[11.5px] font-extrabold text-[#9ccfff] underline underline-offset-4"
            >
              I already want to subscribe
            </a>
          </div>
        </div>
      </section>
    )
  }

  const deliveredLabel = decision.duration && decision.engineLabel
    ? `${decision.duration}s ${decision.engineLabel} video`
    : decision.engineLabel
      ? `${decision.engineLabel} video`
      : 'finished video'

  return (
    <section
      aria-labelledby="pricing-owned-proof-title"
      className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#34d399]/30 bg-gradient-to-br from-[#0e211c] via-[#111916] to-[#141416] px-5 py-5 shadow-[0_20px_65px_-35px_rgba(52,211,153,.55)] sm:px-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {emailCampaign && emailFilm ? (
          <video
            data-pricing-email-film-proof={PRICING_JOURNEY_EMAIL_FILM_VERSION}
            src={emailFilm.playbackUrl}
            poster={emailFilm.posterUrl ?? undefined}
            controls
            muted
            playsInline
            preload="metadata"
            aria-label={`Your film: ${emailFilm.title}`}
            className="mx-auto h-44 w-[99px] flex-none rounded-xl border border-[#34d399]/30 bg-black object-cover shadow-[0_14px_35px_-18px_rgba(52,211,153,.75)] sm:mx-0"
            onLoadedData={() => {
              if (emailFilmLoadedKey.current === emailFilm.playbackUrl) return
              emailFilmLoadedKey.current = emailFilm.playbackUrl
              void trackEvent('pricing_journey_email_film_loaded', {
                version: PRICING_JOURNEY_EMAIL_FILM_VERSION,
                intent_campaign: emailCampaign,
                ...checkoutResumeFilmTelemetry(emailFilm),
              })
            }}
          />
        ) : null}
        <div className="min-w-0">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[.15em] text-[#6ee7b7]">
            {emailCampaign && emailFilm ? 'The film from your email' : 'Your result is the proof'}
          </div>
          <h2 id="pricing-owned-proof-title" className="text-xl font-black tracking-[-.02em] text-white">
            {emailCampaign && emailFilm
              ? `Watch “${emailFilm.title}” before you choose.`
              : `You already completed a ${deliveredLabel}.`}
          </h2>
          <p className="mt-2 max-w-xl text-[13px] font-semibold leading-relaxed text-[#a9b4c5]">
            {emailCampaign && emailFilm
              ? 'This is the result that brought you back. Review it here, then choose the monthly plan that lets you repeat the workflow and export clean, watermark-free MP4s.'
              : 'You are not buying an unseen promise. Choose the monthly plan that lets you repeat the workflow and export clean, watermark-free MP4s.'}
          </p>
        </div>
        <div className="flex flex-none flex-col gap-2 sm:items-center">
          <a
            href="#plans"
            onClick={() => void trackEvent('pricing_journey_proof_plans_clicked', eventMetadata)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2997ff] px-5 py-3 text-center text-[13px] font-black text-white no-underline shadow-[0_12px_30px_-15px_rgba(41,151,255,.95)] hover:bg-[#4aa8ff]"
          >
            Choose how often to create →
          </a>
          <Link
            href="/my-videos"
            onClick={() => void trackEvent('pricing_journey_proof_review_clicked', eventMetadata)}
            className="text-center text-[11.5px] font-extrabold text-[#9ccfff] underline underline-offset-4"
          >
            Review my video
          </Link>
        </div>
      </div>
    </section>
  )
}
