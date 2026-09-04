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
  reopenedAfterDeliveryDismissal: boolean
}

export const CHECKOUT_RESUME_DISMISS_UNTIL_DELIVERY = 'until_delivery' as const

export type CheckoutResumeDismissalMode = 'none' | 'until_delivery' | 'persistent'

export function parseCheckoutResumeDismissalMode(value: unknown): CheckoutResumeDismissalMode {
  if (value === null || value === undefined || value === '') return 'none'
  if (value === CHECKOUT_RESUME_DISMISS_UNTIL_DELIVERY) return 'until_delivery'
  // Existing `1` cookies and any unknown non-empty value keep the buyer's
  // dismissal. New code must never turn a malformed cookie into more prompts.
  return 'persistent'
}

export function shouldResolveDismissalAgainstDelivery(input: {
  go: boolean
  surface: CheckoutResumeSurface | null
  dismissalMode: CheckoutResumeDismissalMode
}): boolean {
  return !input.go
    && input.surface !== 'pricing'
    && input.dismissalMode === 'until_delivery'
}

export function shouldReleaseDismissalAfterDelivery(input: {
  dismissalMode: CheckoutResumeDismissalMode
  historyReliable: boolean
  completedCount: number | null
}): boolean {
  return input.dismissalMode === 'until_delivery'
    && input.historyReliable
    && Number.isInteger(input.completedCount)
    && (input.completedCount ?? 0) >= 1
}

export function checkoutResumeDismissalCookieValue(input: {
  historyReliable: boolean
  completedCount: number | null
}): '1' | typeof CHECKOUT_RESUME_DISMISS_UNTIL_DELIVERY {
  return input.historyReliable
    && input.completedCount === 0
    ? CHECKOUT_RESUME_DISMISS_UNTIL_DELIVERY
    : '1'
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
