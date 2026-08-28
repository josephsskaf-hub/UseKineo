import type { AffiliateDestinationKey } from '@/lib/affiliateDestinations'

export type AffiliateMissionStage =
  | 'first_click'
  | 'first_signup'
  | 'first_paid_customer'
  | 'scale'

export interface AffiliateMissionStats {
  clicks: number
  signups: number
  paid: number
}

export interface AffiliateNextMission {
  stage: AffiliateMissionStage
  eyebrow: string
  title: string
  description: string
  destination: AffiliateDestinationKey
  action: 'caption' | 'widget'
  cta: string
  steps: readonly [string, string, string]
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

/**
 * Turns the affiliate's existing lifetime counters into one next action.
 * Unknown or malformed counters fail closed so Growth UI never invents a
 * funnel stage. The counters are already returned by /api/affiliate/me; this
 * helper causes no additional database read.
 */
export function resolveAffiliateNextMission(stats: unknown): AffiliateNextMission | null {
  if (!stats || typeof stats !== 'object') return null
  const value = stats as Partial<AffiliateMissionStats>
  if (!isCount(value.clicks) || !isCount(value.signups) || !isCount(value.paid)) return null

  // Prefer the deepest confirmed outcome when legacy/imported counters are
  // inconsistent. A paid customer is stronger evidence than a missing click
  // row; the mission must never send a converting affiliate back to step one.
  if (value.paid > 0) {
    const customerLabel = value.paid === 1 ? '1 paid customer' : `${value.paid} paid customers`
    return {
      stage: 'scale',
      eyebrow: `Scale what works · ${customerLabel}`,
      title: 'Your partner path has converted. Make it durable.',
      description:
        'Install the daily Shorts-idea widget once on a site or resource page. Every click keeps your existing first-touch attribution without requiring another manual post.',
      destination: 'script',
      action: 'widget',
      cta: 'Copy the attributed widget',
      steps: ['Paid customer', 'Install durable traffic', 'Next paid customer'],
    }
  }

  if (value.signups > 0) {
    const signupLabel = value.signups === 1 ? '1 attributed signup' : `${value.signups} attributed signups`
    return {
      stage: 'first_paid_customer',
      eyebrow: `First-customer mission · ${signupLabel}`,
      title: 'You have signups. Show the complete product next.',
      description:
        'Use the full Fast-video test for the next campaign. It lets a creator judge the scripted, voiced and captioned result before deciding whether a paid plan fits.',
      destination: 'video',
      action: 'caption',
      cta: 'Copy the video-test post',
      steps: ['Attributed signup', 'Share the product test', 'First paid customer'],
    }
  }

  if (value.clicks === 0) {
    return {
      stage: 'first_click',
      eyebrow: 'First-click mission · 0 link visits',
      title: 'Get one real person through your link.',
      description:
        'Start with the free script tool: the visitor gets a usable hook, facts and payoff before Kineo asks for an account. One focused post is the only job now.',
      destination: 'script',
      action: 'caption',
      cta: 'Copy the first-click post',
      steps: ['Partner link live', 'Publish the ready post', 'First eligible visit'],
    }
  }

  const visitLabel = value.clicks === 1 ? '1 link visit' : `${value.clicks} link visits`
  return {
    stage: 'first_signup',
    eyebrow: `First-signup mission · ${visitLabel}`,
    title: 'Your link gets attention. Now earn the first signup.',
    description:
      'Do not send the same generic pitch again. Lead with the no-signup script generator so the next visitor receives value before choosing to create an account.',
    destination: 'script',
    action: 'caption',
    cta: 'Copy the no-signup post',
    steps: ['First link visit', 'Publish free value', 'First attributed signup'],
  }
}
