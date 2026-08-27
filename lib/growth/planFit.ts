import {
  TIER_CREDITS,
  TIER_PRICES,
  type CheckoutCurrency,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import {
  creditCostForDuration,
  type Quality,
} from '@/lib/credits/engineCost'

/**
 * Plan Fit turns the first delivered film into a monthly, self-serve plan
 * projection. It deliberately does not include Autopilot (a managed service),
 * one-time packs, or top-ups (subscriber-only add-ons).
 */

export const MONTHLY_CADENCES = [1, 4, 8, 12] as const
export type MonthlyCadencePreset = (typeof MONTHLY_CADENCES)[number]

export type PlanFitAccountCohort =
  | 'free'
  | 'trial'
  | 'pack'
  | 'subscriber'
  | 'unknown'

export interface PlanFitAccountInput {
  entitlementsResolved: boolean
  commercialPlan: string | null
  hasPaid: boolean
  /** Active trial or an ending trial with a proven grant. */
  trialParticipant: boolean
}

/**
 * Commercial state, not engine entitlement. A non-free plan always wins over
 * trial/hasPaid so an active subscriber is never invited to buy a duplicate
 * subscription. Unknown entitlement state fails closed.
 */
export function classifyPlanFitAccount(input: PlanFitAccountInput): PlanFitAccountCohort {
  if (!input.entitlementsResolved || typeof input.commercialPlan !== 'string') return 'unknown'
  const plan = input.commercialPlan.trim().toLowerCase()
  if (!plan) return 'unknown'
  if (plan !== 'free') return 'subscriber'
  if (input.hasPaid) return 'pack'
  if (input.trialParticipant) return 'trial'
  return 'free'
}

export interface CompletedVideoEvidence {
  id: string
  status: string
}

export interface FirstDeliveryEvidence {
  historyReliable: boolean
  evidenceForVideoId: string | null
  completedCount: number | null
  recentVideos: readonly CompletedVideoEvidence[] | null
  currentVideoId: string | null
}

/**
 * Server evidence for the first completed delivery.
 *
 * A videos.id is returned only after persistence, so count=0 after that ID is
 * contradictory, not a race to forgive. Evidence is accepted only when it was
 * fetched for the current ID, reports exactly one completion, and that sole
 * completion is the current video. Everything uncertain fails closed.
 */
export function isConfirmedFirstDelivery(evidence: FirstDeliveryEvidence): boolean {
  if (!evidence.historyReliable || !evidence.currentVideoId) return false
  if (evidence.evidenceForVideoId !== evidence.currentVideoId) return false
  if (!Number.isInteger(evidence.completedCount) || (evidence.completedCount ?? -1) < 0) return false
  if (evidence.completedCount !== 1 || !evidence.recentVideos) return false
  return evidence.recentVideos.some(
    (video) => video.status === 'completed' && video.id === evidence.currentVideoId,
  )
}

export interface PlanFitRecurringSlotInput {
  candidate: boolean
  eligible: boolean
  historyCheckedForVideoId: string | null
  currentVideoId: string | null
}

/**
 * Prevents a legacy recurring card from flashing and recording an impression
 * while the exact first-delivery lookup for a new persisted video is pending.
 * A failed/completed lookup records the checked ID; if it is not eligible,
 * legacy behavior resumes immediately.
 */
export function shouldReservePlanFitRecurringSlot(input: PlanFitRecurringSlotInput): boolean {
  if (input.eligible) return true
  return Boolean(
    input.candidate &&
    input.currentVideoId &&
    input.historyCheckedForVideoId !== input.currentVideoId,
  )
}

export type PlanFitQuality = Exclude<Quality, 'avatar' | 'presenter' | 'cinematic_sora'>

export function supportsPlanFitQuality(quality: Quality): quality is PlanFitQuality {
  return quality !== 'avatar' && quality !== 'presenter' && quality !== 'cinematic_sora'
}

export interface PlanProjection {
  tier: CheckoutTier
  credits: number
  filmsPerMonth: number
  creditsLeft: number
}

export interface EngineAlternative {
  quality: PlanFitQuality
  filmCredits: number
  monthlyCredits: number
  plan: PlanProjection
}

export interface PlanFitResult {
  quality: PlanFitQuality
  seconds: number
  monthlyFilms: number
  filmCredits: number
  monthlyCredits: number
  plan: PlanProjection | null
  noSelfServePlan: boolean
  maximumPlan: PlanProjection
  maximumSameEngineFilms: number
  fastAlternative: EngineAlternative | null
}

export interface PlanFitInput {
  quality: PlanFitQuality
  seconds: number
  monthlyFilms: number
  /** null while the canonical display currency is unresolved. */
  currency: CheckoutCurrency | null
}

const SELF_SERVE_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']

export function tiersByPrice(currency: CheckoutCurrency | null): CheckoutTier[] {
  // With no display currency there is no honest price comparison yet. The
  // grant ladder still provides a useful capacity answer; once currency
  // resolves, the same calculation re-runs in actual displayed-price order.
  if (!currency) {
    return [...SELF_SERVE_TIERS].sort(
      (left, right) => TIER_CREDITS[left] - TIER_CREDITS[right],
    )
  }
  return [...SELF_SERVE_TIERS].sort(
    (left, right) => TIER_PRICES[left][currency] - TIER_PRICES[right][currency],
  )
}

function safeMonthlyFilms(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(60, Math.floor(value)))
}

function projectionFor(tier: CheckoutTier, filmCredits: number, monthlyCredits: number): PlanProjection {
  const credits = TIER_CREDITS[tier]
  return {
    tier,
    credits,
    filmsPerMonth: Math.floor(credits / filmCredits),
    creditsLeft: credits - monthlyCredits,
  }
}

function recommendationFor(
  quality: PlanFitQuality,
  seconds: number,
  monthlyFilms: number,
  currency: CheckoutCurrency | null,
): Omit<PlanFitResult, 'fastAlternative'> {
  // Always project the paid cost. A free Kineo 1 preview costs zero today, but
  // the question answered here is what the same monthly workflow costs after
  // subscribing. This never claims that the delivered preview was debited.
  const filmCredits = creditCostForDuration(quality, true, seconds)
  const monthlyCredits = filmCredits * monthlyFilms
  const projections = tiersByPrice(currency).map((tier) =>
    projectionFor(tier, filmCredits, monthlyCredits),
  )
  const plan = projections.find((candidate) => candidate.creditsLeft >= 0) ?? null
  const maximumPlan = [...projections].sort((left, right) => right.credits - left.credits)[0]

  return {
    quality,
    seconds,
    monthlyFilms,
    filmCredits,
    monthlyCredits,
    plan,
    noSelfServePlan: plan === null,
    maximumPlan,
    maximumSameEngineFilms: maximumPlan.filmsPerMonth,
  }
}

export function calculatePlanFit(input: PlanFitInput): PlanFitResult {
  const monthlyFilms = safeMonthlyFilms(input.monthlyFilms)
  const result = recommendationFor(input.quality, input.seconds, monthlyFilms, input.currency)

  if (result.plan || input.quality === 'fast') {
    return { ...result, fastAlternative: null }
  }

  const fast = recommendationFor('fast', input.seconds, monthlyFilms, input.currency)
  return {
    ...result,
    fastAlternative: fast.plan
      ? {
          quality: 'fast',
          filmCredits: fast.filmCredits,
          monthlyCredits: fast.monthlyCredits,
          plan: fast.plan,
        }
      : null,
  }
}

export function engineName(quality: PlanFitQuality): string {
  switch (quality) {
    case 'fast': return 'Kineo 1'
    case 'cinematic_ai': return 'Seedance 1.5'
    case 'cinematic_kling': return 'Kling 2.5'
    case 'cinematic_hollywood': return 'Kling 3'
    case 'cinematic_veo': return 'Veo 3.1'
    case 'cinematic_h3': return 'MiniMax H3'
    case 'cinematic_omni': return 'Omni Flash'
    case 'basic': return 'Basic'
    case 'basic_ai': return 'AI Video'
    case 'pro': return 'Cinematic'
  }
}

export function planName(tier: CheckoutTier): string {
  return tier === 'starter' ? 'Starter' : tier === 'basic' ? 'Creator' : 'Studio'
}
