export type HistoryMilestoneMode =
  | 'episode_primary'
  | 'subscription_primary'
  | 'episode_only'

/**
 * Governs the single decision card above the video library.
 *
 * One completed video is evidence of activation, not yet of a repeat habit.
 * Keep the existing Starter offer visible, but make the already-built series
 * continuation the primary action until the creator has completed video two.
 */
export function resolveHistoryMilestoneMode(input: {
  completedVideoCount: number
  subscriptionOfferEligible: boolean
}): HistoryMilestoneMode | null {
  if (!Number.isInteger(input.completedVideoCount) || input.completedVideoCount < 1) return null
  if (!input.subscriptionOfferEligible) return 'episode_only'
  return input.completedVideoCount === 1 ? 'episode_primary' : 'subscription_primary'
}
