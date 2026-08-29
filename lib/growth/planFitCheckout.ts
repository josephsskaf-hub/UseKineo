import {
  MONTHLY_CADENCES,
  calculatePlanFit,
  engineName,
  supportsPlanFitQuality,
  type PlanFitQuality,
} from '@/lib/growth/planFit'
import type { CheckoutCurrency, CheckoutTier } from '@/lib/checkoutPricing'

export const PLAN_FIT_CHECKOUT_ORIGIN = 'plan_fit_first_delivery' as const

export interface PlanFitCheckoutInput {
  planned_engine: PlanFitQuality
  monthly_videos: number
  seconds: number
  recommended_tier: CheckoutTier
  video_id: string
}

export interface VerifiedPlanFitCheckoutContext {
  checkout_origin: typeof PLAN_FIT_CHECKOUT_ORIGIN
  plan_fit_planned_engine: PlanFitQuality
  plan_fit_monthly_videos: string
  plan_fit_monthly_credits: string
  plan_fit_seconds: string
  plan_fit_recommended_tier: CheckoutTier
  plan_fit_selected_tier_matches: '0' | '1'
  plan_fit_video_id: string
}

export interface PlanFitCheckoutReturnSummary {
  context: VerifiedPlanFitCheckoutContext
  engineLabel: string
  monthlyVideos: number
  seconds: number
  selectedTierMatches: boolean
}

const PLAN_FIT_QUALITIES = new Set<PlanFitQuality>([
  'fast',
  'basic',
  'basic_ai',
  'pro',
  'cinematic_ai',
  'cinematic_kling',
  'cinematic_veo',
  'cinematic_hollywood',
  'cinematic_h3',
  'cinematic_omni',
])
const PLAN_FIT_DURATIONS = new Set([35, 45, 60, 90])
const VIDEO_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Only transports a purchase explanation. Every commercial number is
 * recalculated by the checkout server before it can reach Stripe metadata.
 */
export function withPlanFitCheckoutContext(url: string, input: PlanFitCheckoutInput): string {
  const params = new URLSearchParams({
    checkout_origin: PLAN_FIT_CHECKOUT_ORIGIN,
    pf_engine: input.planned_engine,
    pf_monthly_videos: String(input.monthly_videos),
    pf_seconds: String(input.seconds),
    pf_tier: input.recommended_tier,
    pf_video_id: input.video_id,
  })
  return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`
}

/**
 * Fail closed: a partial, stale or hand-edited context becomes ordinary
 * checkout attribution. It never changes price, entitlement or discount.
 */
export function verifyPlanFitCheckoutContext(
  params: URLSearchParams,
  actualTier: string,
  currency: CheckoutCurrency,
): VerifiedPlanFitCheckoutContext | null {
  if (params.get('checkout_origin') !== PLAN_FIT_CHECKOUT_ORIGIN) return null
  if (actualTier !== 'starter' && actualTier !== 'basic' && actualTier !== 'pro') return null

  const plannedEngine = params.get('pf_engine') as PlanFitQuality | null
  const requestedTier = params.get('pf_tier') as CheckoutTier | null
  const monthlyVideos = Number(params.get('pf_monthly_videos'))
  const seconds = Number(params.get('pf_seconds'))
  const videoId = params.get('pf_video_id') ?? ''

  if (!plannedEngine || !PLAN_FIT_QUALITIES.has(plannedEngine) || !supportsPlanFitQuality(plannedEngine)) return null
  if (!MONTHLY_CADENCES.includes(monthlyVideos as (typeof MONTHLY_CADENCES)[number])) return null
  if (!Number.isInteger(seconds) || !PLAN_FIT_DURATIONS.has(seconds)) return null
  if (requestedTier !== 'starter' && requestedTier !== 'basic' && requestedTier !== 'pro') return null
  if (!VIDEO_ID_RE.test(videoId)) return null

  const result = calculatePlanFit({
    quality: plannedEngine,
    seconds,
    monthlyFilms: monthlyVideos,
    currency,
  })
  if (!result.plan || result.plan.tier !== requestedTier) return null

  return {
    checkout_origin: PLAN_FIT_CHECKOUT_ORIGIN,
    plan_fit_planned_engine: result.quality,
    plan_fit_monthly_videos: String(result.monthlyFilms),
    plan_fit_monthly_credits: String(result.monthlyCredits),
    plan_fit_seconds: String(result.seconds),
    plan_fit_recommended_tier: result.plan.tier,
    plan_fit_selected_tier_matches: result.plan.tier === actualTier ? '1' : '0',
    plan_fit_video_id: videoId,
  }
}

/**
 * Display-only recovery contract for the Stripe cancellation page. Query
 * parameters are untrusted, so the summary exists only after the same closed
 * validation and canonical Plan Fit recalculation used by checkout. It never
 * changes price, entitlement, discount or the retry destination.
 */
export function readPlanFitCheckoutReturn(
  params: URLSearchParams,
  actualTier: string,
  currency: CheckoutCurrency,
): PlanFitCheckoutReturnSummary | null {
  const context = verifyPlanFitCheckoutContext(params, actualTier, currency)
  if (!context) return null

  return {
    context,
    engineLabel: engineName(context.plan_fit_planned_engine),
    monthlyVideos: Number(context.plan_fit_monthly_videos),
    seconds: Number(context.plan_fit_seconds),
    selectedTierMatches: context.plan_fit_selected_tier_matches === '1',
  }
}

/** Rehydrates only the same allowlisted request fields for a retry URL. */
export function planFitRetrySearchParams(context: VerifiedPlanFitCheckoutContext): string {
  return new URLSearchParams({
    checkout_origin: PLAN_FIT_CHECKOUT_ORIGIN,
    pf_engine: context.plan_fit_planned_engine,
    pf_monthly_videos: context.plan_fit_monthly_videos,
    pf_seconds: context.plan_fit_seconds,
    pf_tier: context.plan_fit_recommended_tier,
    pf_video_id: context.plan_fit_video_id,
  }).toString()
}

/** Stripe metadata is untrusted on recovery; only rehydrate the closed shape. */
export function planFitRetrySearchParamsFromMetadata(
  metadata: Record<string, string> | null | undefined,
): string | null {
  if (metadata?.checkout_origin !== PLAN_FIT_CHECKOUT_ORIGIN) return null
  const plannedEngine = metadata.plan_fit_planned_engine as PlanFitQuality | undefined
  const monthlyVideos = Number(metadata.plan_fit_monthly_videos)
  const seconds = Number(metadata.plan_fit_seconds)
  const tier = metadata.plan_fit_recommended_tier as CheckoutTier | undefined
  const videoId = metadata.plan_fit_video_id ?? ''
  if (!plannedEngine || !PLAN_FIT_QUALITIES.has(plannedEngine)) return null
  if (!MONTHLY_CADENCES.includes(monthlyVideos as (typeof MONTHLY_CADENCES)[number])) return null
  if (!PLAN_FIT_DURATIONS.has(seconds)) return null
  if (tier !== 'starter' && tier !== 'basic' && tier !== 'pro') return null
  if (!VIDEO_ID_RE.test(videoId)) return null
  return new URLSearchParams({
    checkout_origin: PLAN_FIT_CHECKOUT_ORIGIN,
    pf_engine: plannedEngine,
    pf_monthly_videos: String(monthlyVideos),
    pf_seconds: String(seconds),
    pf_tier: tier,
    pf_video_id: videoId,
  }).toString()
}
