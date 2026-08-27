export type AffiliateActivationState = 'not_affiliate' | 'active' | 'pending' | 'suspended'

export function normalizeAffiliateActivationState(payload: unknown): AffiliateActivationState | null {
  if (!payload || typeof payload !== 'object') return null
  const value = payload as {
    isAffiliate?: unknown
    affiliate?: { status?: unknown }
  }
  if (value.isAffiliate === false) return 'not_affiliate'
  if (value.isAffiliate !== true) return null
  const status = String(value.affiliate?.status ?? '').toLowerCase()
  if (status === 'active' || status === 'pending' || status === 'suspended') return status
  return null
}

export function isAffiliateMomentumEligible(input: {
  completedVideoCount: number
  isStarter: boolean
  isCreator: boolean
  isStudio: boolean
}): boolean {
  return Number.isInteger(input.completedVideoCount) &&
    input.completedVideoCount >= 2 &&
    (input.isStarter || input.isCreator || input.isStudio)
}

export function isHistorySubscriptionOfferEligible(input: {
  completedVideoCount: number
  isStarter: boolean
  isCreator: boolean
  isStudio: boolean
}): boolean {
  return Number.isInteger(input.completedVideoCount) &&
    input.completedVideoCount >= 1 &&
    !input.isStarter && !input.isCreator && !input.isStudio
}
