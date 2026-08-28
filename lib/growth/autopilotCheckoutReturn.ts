export type AutopilotCheckoutReturn =
  | { kind: 'monthly'; selection: 'autopilot'; retryHref: '/api/stripe/checkout?tier=autopilot' }
  | { kind: 'pilot'; selection: 'autopilot_pilot'; retryHref: '/api/stripe/checkout?pack=autopilot_pilot' }

type SearchParamsReader = Pick<URLSearchParams, 'get'>

/**
 * Recognize only the two paid Autopilot products. Unknown query parameters
 * must fall back to the existing self-serve cancellation flow.
 */
export function readAutopilotCheckoutReturn(params: SearchParamsReader): AutopilotCheckoutReturn | null {
  if (params.get('pack') === 'autopilot_pilot') {
    return {
      kind: 'pilot',
      selection: 'autopilot_pilot',
      retryHref: '/api/stripe/checkout?pack=autopilot_pilot',
    }
  }

  if (params.get('tier') === 'autopilot') {
    return {
      kind: 'monthly',
      selection: 'autopilot',
      retryHref: '/api/stripe/checkout?tier=autopilot',
    }
  }

  return null
}

/** Exact return destination for the one-time Autopilot pilot checkout. */
export function buildAutopilotPilotCancelUrl(appUrl: string): string {
  const url = new URL('/checkout/cancelled', appUrl)
  url.searchParams.set('pack', 'autopilot_pilot')
  return url.toString()
}
