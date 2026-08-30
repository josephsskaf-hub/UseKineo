'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_PLAN_FIT_MONTHLY_FILMS,
  PLAN_FIT_OFFER_VERSION,
  MONTHLY_CADENCES,
  calculatePlanFit,
  engineName,
  planName,
  type PlanFitAccountCohort,
  type PlanFitQuality,
} from '@/lib/growth/planFit'
import {
  formatCheckoutMoney,
  getTierPrice,
  type CheckoutCurrency,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import { CHECKOUT_PAYMENT_GUIDANCE_COMPACT } from '@/lib/growth/checkoutPaymentGuidance'

export interface PlanFitCheckoutMetadata {
  account_cohort: Exclude<PlanFitAccountCohort, 'subscriber' | 'unknown'>
  source_engine: PlanFitQuality
  planned_engine: PlanFitQuality
  monthly_videos: number
  monthly_credits: number
  seconds: number
  recommended_tier: CheckoutTier
  display_currency: CheckoutCurrency | null
  first_delivery: true
  video_id: string
}

export interface PlanFitCardProps {
  quality: PlanFitQuality
  seconds: number
  accountCohort: Exclude<PlanFitAccountCohort, 'subscriber' | 'unknown'>
  /** Canonical checkout display currency; null means no money may be shown. */
  currency: CheckoutCurrency | null
  /** Stable current videos.id. It is also the once-per-tab impression key. */
  exposureKey: string
  checkoutPending: string | null
  checkoutError: string | null
  onEvent?: (name: string, metadata: Record<string, unknown>) => boolean | Promise<boolean>
  /** Re-check exact owner history immediately before an impression or sale. */
  verifyEligibility: () => Promise<boolean>
  onCheckout: (tier: CheckoutTier, metadata: PlanFitCheckoutMetadata) => boolean
}

const IMPRESSION_THRESHOLD = 0.35

function priceLabel(tier: CheckoutTier, currency: CheckoutCurrency): string {
  return formatCheckoutMoney(currency, getTierPrice(tier, currency))
}

function cohortIntro(cohort: PlanFitCardProps['accountCohort']): string {
  if (cohort === 'free') return 'Your free preview stays free.'
  if (cohort === 'trial') return 'Your trial is the test run.'
  return 'You have paid credits, but no active subscription.'
}

export default function PlanFitCard({
  quality,
  seconds,
  accountCohort,
  currency,
  exposureKey,
  checkoutPending,
  checkoutError,
  onEvent,
  verifyEligibility,
  onCheckout,
}: PlanFitCardProps) {
  const [monthlyFilms, setMonthlyFilms] = useState<number>(DEFAULT_PLAN_FIT_MONTHLY_FILMS)
  const [plannedQuality, setPlannedQuality] = useState<PlanFitQuality>(quality)
  const [dismissed, setDismissed] = useState(false)
  const [eligibilityPending, setEligibilityPending] = useState(false)
  const cardRef = useRef<HTMLElement | null>(null)
  const impressionSentRef = useRef(false)
  const impressionPendingRef = useRef(false)
  const eligibilityPendingRef = useRef(false)
  const advancedOpenedRef = useRef(false)
  const eventRef = useRef(onEvent)

  useEffect(() => {
    eventRef.current = onEvent
  }, [onEvent])

  const probe = useMemo(
    () => calculatePlanFit({ quality, seconds, monthlyFilms: 1, currency }),
    [quality, seconds, currency],
  )
  const defaultResult = useMemo(
    () => calculatePlanFit({ quality, seconds, monthlyFilms: DEFAULT_PLAN_FIT_MONTHLY_FILMS, currency }),
    [quality, seconds, currency],
  )
  const result = useMemo(
    () => calculatePlanFit({ quality: plannedQuality, seconds, monthlyFilms, currency }),
    [plannedQuality, seconds, monthlyFilms, currency],
  )

  useEffect(() => {
    if (dismissed || impressionSentRef.current || !cardRef.current) return
    if (typeof IntersectionObserver === 'undefined') return

    const node = cardRef.current
    const observer = new IntersectionObserver(async (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < IMPRESSION_THRESHOLD) return
      if (impressionPendingRef.current) return
      impressionPendingRef.current = true

      const storageKey = `kineo_plan_fit_impression:${exposureKey}`
      try {
        if (sessionStorage.getItem(storageKey) === '1') {
          impressionSentRef.current = true
          impressionPendingRef.current = false
          observer.disconnect()
          return
        }
      } catch {
        // The in-memory latch still protects the uninterrupted browser path.
      }

      // Another tab can complete a video without emitting this tab's custom
      // event. Never label an exposure "first delivery" from a stale snapshot.
      if (!(await verifyEligibility())) {
        impressionPendingRef.current = false
        return
      }

      const recorded = await eventRef.current?.('plan_fit_impression', {
        actor_unit: 'authenticated_user',
        event_unit: 'first_completed_video',
        account_cohort: accountCohort,
        video_id: exposureKey,
        source_engine: quality,
        seconds,
        paid_film_credits: probe.filmCredits,
        offer_version: PLAN_FIT_OFFER_VERSION,
        decision_ready: true,
        default_monthly_videos: DEFAULT_PLAN_FIT_MONTHLY_FILMS,
        default_monthly_credits: defaultResult.monthlyCredits,
        default_recommended_tier: defaultResult.plan?.tier ?? null,
        display_currency: currency,
        currency_resolved: currency !== null,
      })
      // A failed analytics POST must not poison the once-per-session key. The
      // next real viewport entry may retry safely.
      if (recorded !== true) {
        impressionPendingRef.current = false
        return
      }
      impressionSentRef.current = true
      impressionPendingRef.current = false
      try { sessionStorage.setItem(storageKey, '1') } catch { /* in-memory latch remains */ }
      observer.disconnect()
    }, { threshold: [IMPRESSION_THRESHOLD] })

    observer.observe(node)
    return () => observer.disconnect()
  }, [dismissed, exposureKey, accountCohort, quality, seconds, probe.filmCredits, defaultResult.monthlyCredits, defaultResult.plan?.tier, currency, verifyEligibility])

  if (dismissed) return null

  const sourceMotor = engineName(quality)
  const plannedMotor = engineName(plannedQuality)
  const checkoutBusy = checkoutPending !== null || eligibilityPending

  function emit(name: string, metadata: Record<string, unknown>) {
    eventRef.current?.(name, {
      actor_unit: 'authenticated_user',
      event_unit: 'first_completed_video',
      account_cohort: accountCohort,
      video_id: exposureKey,
      ...metadata,
      offer_version: PLAN_FIT_OFFER_VERSION,
    })
  }

  function chooseCadence(
    value: number,
    source: 'preset' | 'same_engine_capacity' | 'lower_plan_capacity' = 'preset',
  ) {
    setMonthlyFilms(value)
    const next = calculatePlanFit({ quality: plannedQuality, seconds, monthlyFilms: value, currency })
    emit('plan_fit_monthly_target_selected', {
      selection_source: source,
      source_engine: quality,
      planned_engine: plannedQuality,
      monthly_videos: next.monthlyFilms,
      paid_film_credits: next.filmCredits,
      monthly_credits: next.monthlyCredits,
      recommended_tier: next.plan?.tier ?? null,
      no_self_serve_plan: next.noSelfServePlan,
      display_currency: currency,
      currency_resolved: currency !== null,
    })
  }

  function chooseFastAlternative() {
    if (!result.fastAlternative) return
    setPlannedQuality('fast')
    emit('plan_fit_engine_alternative_selected', {
      source_engine: quality,
      planned_engine: 'fast',
      monthly_videos: monthlyFilms,
      monthly_credits: result.fastAlternative.monthlyCredits,
      recommended_tier: result.fastAlternative.plan.tier,
      display_currency: currency,
      currency_resolved: currency !== null,
    })
  }

  async function startCheckout(tier: CheckoutTier) {
    if (checkoutBusy || eligibilityPendingRef.current) return
    emit('plan_fit_checkout_clicked', {
      source_engine: quality,
      planned_engine: result.quality,
      monthly_videos: result.monthlyFilms,
      monthly_credits: result.monthlyCredits,
      recommended_tier: tier,
      display_currency: currency,
      currency_resolved: currency !== null,
      presentation: 'direct_checkout_first',
    })
    eligibilityPendingRef.current = true
    setEligibilityPending(true)
    const stillEligible = await verifyEligibility()
    if (!stillEligible) {
      eligibilityPendingRef.current = false
      setEligibilityPending(false)
      return
    }
    const metadata: PlanFitCheckoutMetadata = {
      account_cohort: accountCohort,
      source_engine: quality,
      planned_engine: result.quality,
      monthly_videos: result.monthlyFilms,
      monthly_credits: result.monthlyCredits,
      seconds,
      recommended_tier: tier,
      display_currency: currency,
      first_delivery: true,
      video_id: exposureKey,
    }
    if (!onCheckout(tier, metadata)) {
      eligibilityPendingRef.current = false
      setEligibilityPending(false)
      return
    }
    // The protected checkout hook owns the latch from this point onward. Do
    // not leave this local preflight latch stuck when pageshow restores the tab.
    eligibilityPendingRef.current = false
    setEligibilityPending(false)
    emit('plan_fit_checkout_started', { ...metadata })
  }

  return (
    <section
      ref={cardRef}
      aria-labelledby="plan-fit-title"
      className="gv-card rounded-2xl p-5 sm:p-6 mb-6"
      style={{
        background: 'linear-gradient(145deg, rgba(41,151,255,.12), rgba(17,17,20,.98) 62%)',
        border: '1px solid rgba(92,179,255,.34)',
        boxShadow: '0 18px 48px rgba(0,0,0,.22)',
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] mb-1.5" style={{ color: '#5cb3ff' }}>
            Your first finished video
          </div>
          <h3 id="plan-fit-title" className="font-black text-lg sm:text-xl" style={{ color: 'var(--text)', margin: 0 }}>
            Ready to publish every month?
          </h3>
        </div>
        <button
          type="button"
          disabled={checkoutBusy}
          onClick={() => {
            setDismissed(true)
            emit('plan_fit_dismissed', { source_engine: quality, selected_target: monthlyFilms })
          }}
          aria-label="Dismiss plan recommendation"
          className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: 'var(--muted2)', cursor: checkoutBusy ? 'wait' : 'pointer', opacity: checkoutBusy ? 0.65 : 1 }}
        >
          Not now
        </button>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--muted2)', lineHeight: 1.6, maxWidth: 690 }}>
        {cohortIntro(accountCohort)} You just finished a {seconds}s {sourceMotor} film. Paid exports are clean and watermark-free, so we matched the smallest plan that covers{' '}
        <strong style={{ color: 'var(--text)' }}>one film like this every month</strong>.
      </p>

      {result && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,.09)' }}>
          {plannedQuality !== quality && (
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <span className="text-xs font-bold" style={{ color: '#5cb3ff' }}>
                Comparing the same monthly target with {plannedMotor}
              </span>
              <button
                type="button"
                onClick={() => setPlannedQuality(quality)}
                disabled={checkoutBusy}
                className="text-xs font-bold"
                style={{ background: 'transparent', border: 0, color: 'var(--muted2)', textDecoration: 'underline', cursor: checkoutBusy ? 'wait' : 'pointer' }}
              >
                Back to {sourceMotor}
              </button>
            </div>
          )}

          {result.plan ? (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted2)', lineHeight: 1.65 }}>
                <strong style={{ color: '#5cb3ff' }}>{planName(result.plan.tier)}</strong> includes {result.plan.credits} credits. Your {result.monthlyFilms} {plannedMotor} film{result.monthlyFilms === 1 ? '' : 's'} {result.monthlyFilms === 1 ? 'uses' : 'use'}{' '}
                <strong style={{ color: 'var(--text)' }}>{result.monthlyCredits}</strong> — {currency
                  ? 'this is the least expensive self-serve plan that covers your goal.'
                  : 'enough to cover your goal. Secure checkout confirms the price.'}
              </p>
              <button
                type="button"
                onClick={() => startCheckout(result.plan!.tier)}
                disabled={checkoutBusy}
                className="rounded-xl px-5 py-3 text-sm font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #2997ff, #1d6fe0)',
                  border: 'none',
                  cursor: checkoutBusy ? 'wait' : 'pointer',
                  opacity: checkoutBusy ? 0.68 : 1,
                  boxShadow: '0 8px 24px rgba(41,151,255,.3)',
                }}
              >
                {eligibilityPending
                  ? 'Checking your latest video history…'
                  : checkoutPending === result.plan.tier
                  ? 'Opening secure checkout…'
                  : currency
                    ? `Start ${planName(result.plan.tier)} — ${priceLabel(result.plan.tier, currency)}/month`
                    : `Start ${planName(result.plan.tier)} · See secure checkout`}
              </button>
              <p
                data-plan-fit-checkout-reassurance
                className="mt-2.5 text-xs font-semibold"
                style={{ color: 'var(--muted)', lineHeight: 1.5 }}
              >
                🔒 Secure Stripe checkout · {CHECKOUT_PAYMENT_GUIDANCE_COMPACT} · cancel anytime in one click · 7-day money-back
              </p>
              {result.lowerCostAlternative && (
                <div
                  data-plan-fit-lower-cost-path
                  className="mt-4 pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,.09)' }}
                >
                  <p className="text-xs mb-2" style={{ color: 'var(--muted2)', lineHeight: 1.55 }}>
                    Prefer a lower monthly plan? Keep {plannedMotor} and {seconds}s.{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {result.lowerCostAlternative.monthlyFilms}/month fits {planName(result.lowerCostAlternative.plan.tier)}.
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => chooseCadence(result.lowerCostAlternative!.monthlyFilms, 'lower_plan_capacity')}
                    disabled={checkoutBusy}
                    className="text-xs font-black"
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#5cb3ff',
                      padding: 0,
                      textDecoration: 'underline',
                      cursor: checkoutBusy ? 'wait' : 'pointer',
                    }}
                  >
                    {currency
                      ? `Compare ${planName(result.lowerCostAlternative.plan.tier)} — ${priceLabel(result.lowerCostAlternative.plan.tier, currency)}/month`
                      : `Compare ${planName(result.lowerCostAlternative.plan.tier)} in secure checkout`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--muted2)', lineHeight: 1.65 }}>
                {result.monthlyFilms} {plannedMotor} films need{' '}
                <strong style={{ color: 'var(--text)' }}>{result.monthlyCredits} credits per month</strong>. No self-serve plan includes that much. Studio includes {result.maximumPlan.credits} credits —{' '}
                {result.maximumSameEngineFilms > 0
                  ? `enough for ${result.maximumSameEngineFilms} of these films per month.`
                  : `not enough for one ${seconds}s film on this engine.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {result.maximumSameEngineFilms > 0 && (
                  <button
                    type="button"
                    onClick={() => chooseCadence(result.maximumSameEngineFilms, 'same_engine_capacity')}
                    disabled={checkoutBusy}
                    className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black"
                    style={{ background: '#2997ff', border: '1px solid #5cb3ff', color: '#fff', cursor: checkoutBusy ? 'wait' : 'pointer' }}
                  >
                    Plan for {result.maximumSameEngineFilms}/month on {plannedMotor}
                  </button>
                )}
                {result.fastAlternative && (
                  <button
                    type="button"
                    onClick={chooseFastAlternative}
                    disabled={checkoutBusy}
                    className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black"
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.16)', color: 'var(--text)', cursor: checkoutBusy ? 'wait' : 'pointer' }}
                  >
                    Keep {result.monthlyFilms}/month with Kineo 1
                  </button>
                )}
              </div>
            </div>
          )}

          {checkoutError && (
            <p role="alert" className="text-xs font-bold mt-3" style={{ color: '#ff7b7b', lineHeight: 1.5 }}>
              {checkoutError}
            </p>
          )}

          <details
            data-plan-fit-advanced
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,.09)' }}
            onToggle={(event) => {
              if (!event.currentTarget.open || advancedOpenedRef.current) return
              advancedOpenedRef.current = true
              emit('plan_fit_advanced_opened', {
                source_engine: quality,
                planned_engine: plannedQuality,
                monthly_videos: monthlyFilms,
              })
            }}
          >
            <summary
              className="text-xs font-black"
              style={{ color: '#5cb3ff', cursor: 'pointer', listStylePosition: 'inside' }}
            >
              Need a different rhythm? Compare 1, 4, 8 or 12 videos/month
            </summary>
            <div className="flex flex-wrap gap-2 mt-3" aria-label="Videos per month">
              {MONTHLY_CADENCES.map((cadence) => (
                <button
                  key={cadence}
                  type="button"
                  onClick={() => chooseCadence(cadence)}
                  disabled={checkoutBusy}
                  aria-pressed={monthlyFilms === cadence}
                  className="rounded-full px-4 py-2.5 text-xs sm:text-sm font-black"
                  style={{
                    background: monthlyFilms === cadence ? '#2997ff' : 'rgba(255,255,255,.04)',
                    border: monthlyFilms === cadence ? '1px solid #5cb3ff' : '1px solid rgba(255,255,255,.12)',
                    color: monthlyFilms === cadence ? '#fff' : 'var(--text)',
                    cursor: checkoutBusy ? 'wait' : 'pointer',
                    opacity: checkoutBusy ? 0.65 : 1,
                  }}
                >
                  {cadence} / month
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
