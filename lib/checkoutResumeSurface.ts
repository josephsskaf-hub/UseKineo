export type CheckoutResumeSurface = 'pricing'

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
