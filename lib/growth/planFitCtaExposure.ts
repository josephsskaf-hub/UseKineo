import type { CheckoutCurrency, CheckoutTier } from '@/lib/checkoutPricing'
import type { PlanFitAccountCohort, PlanFitQuality } from '@/lib/growth/planFit'

export const PLAN_FIT_CTA_VIEW_EVENT = 'plan_fit_checkout_cta_viewed' as const
export const PLAN_FIT_CTA_VISIBLE_RATIO = 0.6

export function createBooleanSingleFlight() {
  let inFlight: Promise<boolean> | null = null

  return {
    run(task: () => Promise<boolean>): Promise<boolean> {
      if (inFlight) return inFlight

      const current = Promise.resolve()
        .then(task)
        .catch(() => false)
        .finally(() => {
          if (inFlight === current) inFlight = null
        })
      inFlight = current
      return current
    },
  }
}

type PlanFitCtaExposureInput = {
  accountCohort: Exclude<PlanFitAccountCohort, 'subscriber' | 'unknown'>
  sourceEngine: PlanFitQuality
  plannedEngine: PlanFitQuality
  monthlyVideos: number
  monthlyCredits: number
  recommendedTier: CheckoutTier
  displayCurrency: CheckoutCurrency | null
  videoId: string
  offerVersion: string
}

export function isPlanFitCtaVisible(
  entry: Pick<IntersectionObserverEntry, 'isIntersecting' | 'intersectionRatio'> | null | undefined,
): boolean {
  return Boolean(
    entry?.isIntersecting
      && entry.intersectionRatio >= PLAN_FIT_CTA_VISIBLE_RATIO,
  )
}

export function buildPlanFitCtaExposureMetadata(input: PlanFitCtaExposureInput) {
  return {
    actor_unit: 'authenticated_user',
    event_unit: 'first_completed_video',
    account_cohort: input.accountCohort,
    video_id: input.videoId,
    source_engine: input.sourceEngine,
    planned_engine: input.plannedEngine,
    monthly_videos: input.monthlyVideos,
    monthly_credits: input.monthlyCredits,
    recommended_tier: input.recommendedTier,
    display_currency: input.displayCurrency,
    currency_resolved: input.displayCurrency !== null,
    presentation: 'direct_checkout_first',
    measurement_unit: 'authenticated_user_first_video_cta',
    visible_ratio: PLAN_FIT_CTA_VISIBLE_RATIO,
    offer_version: input.offerVersion,
  } as const
}
