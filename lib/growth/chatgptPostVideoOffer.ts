import { acquisitionSource } from '@/lib/acquisitionSource'

export type PostVideoRecurringTier = 'starter' | 'basic'

export type PostVideoOfferDecision = {
  firstTouchSource: string
  variant: 'chatgpt_starter_first_v1' | 'default_creator_first_v1'
  primaryTier: PostVideoRecurringTier
  primaryPlanLabel: 'Starter' | 'Creator'
  secondaryTier: PostVideoRecurringTier
  secondaryPlanLabel: 'Starter' | 'Creator'
  chatgptContext: boolean
}

/**
 * The persisted signup source, not the current URL, owns this decision. A
 * visitor can cross OAuth and several dashboard routes before the first film
 * is delivered; reading only the current query string would silently put most
 * ChatGPT signups back in the generic cohort.
 */
export function decidePostVideoOffer(
  signupUtmSource: string | null | undefined,
): PostVideoOfferDecision {
  const firstTouchSource = acquisitionSource({ utmSource: signupUtmSource })
  if (firstTouchSource === 'chatgpt') {
    return {
      firstTouchSource,
      variant: 'chatgpt_starter_first_v1',
      primaryTier: 'starter',
      primaryPlanLabel: 'Starter',
      secondaryTier: 'basic',
      secondaryPlanLabel: 'Creator',
      chatgptContext: true,
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
  }
}
