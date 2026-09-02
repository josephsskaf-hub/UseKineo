import { acquisitionSource } from '@/lib/acquisitionSource'

export type PostVideoRecurringTier = 'starter' | 'basic'
export type PostVideoEngineFit = 'fast' | 'premium' | 'unknown'

export const POST_VIDEO_OFFER_VARIANTS = [
  'engine_fit_starter_first_v1',
  'engine_fit_creator_first_v1',
  'chatgpt_starter_first_v1',
  'default_creator_first_v1',
] as const

export type PostVideoOfferVariant = typeof POST_VIDEO_OFFER_VARIANTS[number]

export const POST_VIDEO_PLAN_COMPARE_VERSION = 'post_video_plan_compare_v1' as const
export const POST_VIDEO_PLAN_COMPARE_HREF =
  `/pricing?intent_campaign=${POST_VIDEO_PLAN_COMPARE_VERSION}#plans` as const

export type PostVideoOfferDecision = {
  firstTouchSource: string
  variant: PostVideoOfferVariant
  primaryTier: PostVideoRecurringTier
  primaryPlanLabel: 'Starter' | 'Creator'
  secondaryTier: PostVideoRecurringTier
  secondaryPlanLabel: 'Starter' | 'Creator'
  chatgptContext: boolean
  offerBasis: 'last_video_engine' | 'first_touch_source' | 'default'
  lastVideoFit: PostVideoEngineFit
}

function engineFitForQuality(lastVideoQuality: string | null | undefined): PostVideoEngineFit {
  if (lastVideoQuality === 'fast') return 'fast'
  if (lastVideoQuality?.startsWith('cinematic_')) return 'premium'
  return 'unknown'
}

/**
 * The persisted signup source, not the current URL, owns this decision. A
 * visitor can cross OAuth and several dashboard routes before the first film
 * is delivered; reading only the current query string would silently put most
 * ChatGPT signups back in the generic cohort.
 */
export function decidePostVideoOffer(
  signupUtmSource: string | null | undefined,
  lastVideoQuality?: string | null,
): PostVideoOfferDecision {
  const firstTouchSource = acquisitionSource({ utmSource: signupUtmSource })
  const chatgptContext = firstTouchSource === 'chatgpt'
  const lastVideoFit = engineFitForQuality(lastVideoQuality)

  // The film that just proved value is a stronger signal than acquisition
  // source. Starter buys a useful Fast habit; Creator buys a useful Seedance
  // habit. Never lead with a plan that cannot repeat the experience on screen.
  if (lastVideoFit === 'fast') {
    return {
      firstTouchSource,
      variant: 'engine_fit_starter_first_v1',
      primaryTier: 'starter',
      primaryPlanLabel: 'Starter',
      secondaryTier: 'basic',
      secondaryPlanLabel: 'Creator',
      chatgptContext,
      offerBasis: 'last_video_engine',
      lastVideoFit,
    }
  }

  if (lastVideoFit === 'premium') {
    return {
      firstTouchSource,
      variant: 'engine_fit_creator_first_v1',
      primaryTier: 'basic',
      primaryPlanLabel: 'Creator',
      secondaryTier: 'starter',
      secondaryPlanLabel: 'Starter',
      chatgptContext,
      offerBasis: 'last_video_engine',
      lastVideoFit,
    }
  }

  if (firstTouchSource === 'chatgpt') {
    return {
      firstTouchSource,
      variant: 'chatgpt_starter_first_v1',
      primaryTier: 'starter',
      primaryPlanLabel: 'Starter',
      secondaryTier: 'basic',
      secondaryPlanLabel: 'Creator',
      chatgptContext: true,
      offerBasis: 'first_touch_source',
      lastVideoFit,
    }
  }
  return {
    firstTouchSource,
    variant: 'default_creator_first_v1',
    primaryTier: 'basic',
    primaryPlanLabel: 'Creator',
    secondaryTier: 'starter',
    secondaryPlanLabel: 'Starter',
    chatgptContext: false,
    offerBasis: 'default',
    lastVideoFit,
  }
}
