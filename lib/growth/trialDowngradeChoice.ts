import type { CheckoutTier } from '@/lib/checkoutPricing'

export const TRIAL_DOWNGRADE_CHOICE_VERSION = 'trial_downgrade_choice_v1' as const

// Measurement gate: preserve this version until 10 external people receive a
// versioned modal impression. Stop the experiment if the selected tier or any
// displayed price diverges from the Stripe checkout it opens. A click is not
// revenue; the terminal metric remains payment_success per exposed person.

export const TRIAL_DOWNGRADE_PLAN_CHOICES = {
  starter: {
    label: 'Starter',
    pace: 'For a lighter monthly rhythm',
    tier: 'starter',
  },
  creator: {
    label: 'Creator',
    pace: 'For a higher monthly rhythm',
    tier: 'basic',
  },
} as const satisfies Record<string, {
  label: string
  pace: string
  tier: CheckoutTier
}>

export const TRIAL_DOWNGRADE_CHOICES = ['starter', 'creator', 'compare'] as const

export type TrialDowngradeChoice = (typeof TRIAL_DOWNGRADE_CHOICES)[number]
export type CompletedCountBucket = '0' | '1' | '2_3' | '4_plus' | 'unknown'
export type CreditsUsedBucket = '0' | '1_9' | '10_19' | '20_plus' | 'unknown'

export type TrialDowngradeChoiceMetadata = {
  version: typeof TRIAL_DOWNGRADE_CHOICE_VERSION
  choice: TrialDowngradeChoice
  completed_count_bucket: CompletedCountBucket
  credits_used_bucket: CreditsUsedBucket
}

export function isTrialDowngradeChoice(value: unknown): value is TrialDowngradeChoice {
  return typeof value === 'string' && (TRIAL_DOWNGRADE_CHOICES as readonly string[]).includes(value)
}

export function completedCountBucket(count: number | null | undefined): CompletedCountBucket {
  if (!Number.isInteger(count) || (count ?? -1) < 0) return 'unknown'
  if (count === 0) return '0'
  if (count === 1) return '1'
  if ((count as number) <= 3) return '2_3'
  return '4_plus'
}

export function creditsUsedBucket(used: number | null | undefined): CreditsUsedBucket {
  if (!Number.isFinite(used) || (used ?? -1) < 0) return 'unknown'
  if (used === 0) return '0'
  if ((used as number) <= 9) return '1_9'
  if ((used as number) <= 19) return '10_19'
  return '20_plus'
}

/**
 * Privacy-safe, bounded metadata for the downgrade choice experiment.
 * Unknown choices fail closed instead of creating unbounded analytics values.
 */
export function trialDowngradeChoiceMetadata(input: {
  choice: unknown
  completedCount: number | null | undefined
  creditsUsed: number | null | undefined
}): TrialDowngradeChoiceMetadata | null {
  if (!isTrialDowngradeChoice(input.choice)) return null
  return {
    version: TRIAL_DOWNGRADE_CHOICE_VERSION,
    choice: input.choice,
    completed_count_bucket: completedCountBucket(input.completedCount),
    credits_used_bucket: creditsUsedBucket(input.creditsUsed),
  }
}
