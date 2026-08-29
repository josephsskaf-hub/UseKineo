import type { PlanFitQuality } from '@/lib/growth/planFit'

export type CheckoutResumeSurface = 'pricing'

export type CheckoutResumePlanFit = {
  engine: PlanFitQuality
  engineLabel: string
  monthlyVideos: number
  seconds: number
  selectedTierMatches: boolean
}

export type CheckoutResumeOffer = {
  available: true
  resumeUrl: string
  destinationKind: 'open_session' | 'stripe_recovery' | 'internal_retry'
  planName: string
  tier: 'starter' | 'basic' | 'pro' | 'autopilot'
  billing: 'monthly' | 'annual'
  currency: string
  firstChargeAmount: number
  renewalAmount: number
  planFit: CheckoutResumePlanFit | null
}

export function parseCheckoutResumeSurface(value: unknown): CheckoutResumeSurface | null {
  return value === 'pricing' ? 'pricing' : null
}

export function shouldBlockDismissedCheckoutResume(input: {
  go: boolean
  dismissed: boolean
  surface: CheckoutResumeSurface | null
}): boolean {
  if (input.go || !input.dismissed) return false
  return input.surface !== 'pricing'
}

/**
 * A passive checkout reminder must not compete with the included first film.
 * An explicit resume remains stronger: the user already chose to continue
 * paying, so this policy never intercepts go=1.
 */
export function shouldDeferPassiveCheckoutResumeForTrial(input: {
  go: boolean
  firstDeliveryEligible: boolean
}): boolean {
  return !input.go && input.firstDeliveryEligible
}

export function formatCheckoutResumeMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`
  }
}

export function formatCheckoutResumePlanFitGoal(planFit: CheckoutResumePlanFit): string {
  return `${planFit.monthlyVideos} × ${planFit.seconds}s ${planFit.engineLabel} video${planFit.monthlyVideos === 1 ? '' : 's'}/month`
}
