import { engineLabelFor } from '@/lib/engineLabel'

export const PRICING_JOURNEY_PROOF_VERSION = 'pricing_journey_proof_v1' as const

export type PricingJourneyVideo = {
  id: string
  status: string
  duration: number | null
  quality_mode: string | null
}

export type PricingJourneyProofInput = {
  completedCount: number | null
  hasActivePlan: boolean
  historyReliable: boolean
  recentVideos: readonly PricingJourneyVideo[] | null
  reverseTrial: boolean
  savedCheckoutAvailable: boolean
  signedIn: boolean
}

export type PricingJourneyProofDecision =
  | { state: 'hidden'; reason: 'anonymous' | 'subscriber' | 'saved_checkout' | 'history_unavailable' | 'history_inconsistent' }
  | {
      state: 'before_first_delivery'
      completedCountBucket: '0'
      creationHref: string
      engineLabel: 'Seedance 1.5' | 'Kineo 1'
      duration: 35
      version: typeof PRICING_JOURNEY_PROOF_VERSION
    }
  | {
      state: 'after_delivery'
      completedCountBucket: '1' | '2_4' | '5_plus'
      engineLabel: string | null
      duration: number | null
      version: typeof PRICING_JOURNEY_PROOF_VERSION
    }

function countBucket(count: number): '1' | '2_4' | '5_plus' {
  if (count === 1) return '1'
  if (count <= 4) return '2_4'
  return '5_plus'
}

/**
 * Uses only owner-scoped server evidence already returned by /api/videos.
 * The policy never starts a render, opens checkout, changes an entitlement or
 * serializes customer content into telemetry.
 */
export function decidePricingJourneyProof(input: PricingJourneyProofInput): PricingJourneyProofDecision {
  if (!input.signedIn) return { state: 'hidden', reason: 'anonymous' }
  if (input.hasActivePlan) return { state: 'hidden', reason: 'subscriber' }
  if (input.savedCheckoutAvailable) return { state: 'hidden', reason: 'saved_checkout' }
  if (!input.historyReliable || !Number.isInteger(input.completedCount) || (input.completedCount ?? -1) < 0) {
    return { state: 'hidden', reason: 'history_unavailable' }
  }

  const completedCount = input.completedCount as number

  if (completedCount === 0) {
    const engine = input.reverseTrial ? 'seedance' : 'fast'
    return {
      state: 'before_first_delivery',
      completedCountBucket: '0',
      creationHref:
        `/studio/create?engine=${engine}&duration=35&intent_campaign=${PRICING_JOURNEY_PROOF_VERSION}`,
      engineLabel: input.reverseTrial ? 'Seedance 1.5' : 'Kineo 1',
      duration: 35,
      version: PRICING_JOURNEY_PROOF_VERSION,
    }
  }

  const latestCompleted = input.recentVideos?.find((video) => video.status === 'completed') ?? null
  if (!latestCompleted) return { state: 'hidden', reason: 'history_inconsistent' }

  return {
    state: 'after_delivery',
    completedCountBucket: countBucket(completedCount),
    engineLabel: engineLabelFor(latestCompleted.quality_mode),
    duration: latestCompleted.duration,
    version: PRICING_JOURNEY_PROOF_VERSION,
  }
}
