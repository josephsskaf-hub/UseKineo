export const AUTOPILOT_CHECKOUT_SUCCESS_VERSION = 'autopilot_checkout_success_v1' as const

export type CheckoutSuccessFlow =
  | {
      kind: 'self_serve'
      destination: string
    }
  | {
      kind: 'autopilot'
      destination: string
    }

type SearchParamsReader = Pick<URLSearchParams, 'get'>

const STRIPE_SESSION_ID = /^cs_(?:live|test)_[A-Za-z0-9]{1,255}$/

function safeStripeSessionId(value: string | null): string | null {
  const normalized = value?.trim() ?? ''
  return STRIPE_SESSION_ID.test(normalized) ? normalized : null
}

export function readCheckoutSuccessFlow(params: SearchParamsReader): CheckoutSuccessFlow {
  if (params.get('tier') !== 'autopilot') {
    const sampleId = params.get('ads_sample_order')
    return {
      kind: 'self_serve',
      destination: sampleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sampleId) ? `/ads/v2?order=${sampleId.toLowerCase()}&upgrade=1` : '/studio',
    }
  }

  const sessionId = safeStripeSessionId(params.get('session_id'))
  const query = new URLSearchParams({ success: 'true', tier: 'autopilot' })
  if (sessionId) query.set('session_id', sessionId)

  return {
    kind: 'autopilot',
    destination: `/autopilot?${query.toString()}`,
  }
}

export function buildSubscriptionCheckoutSuccessUrl(input: {
  appUrl: string
  tier: string
  currency: string
  amount: number
  adsSampleOrder?: string | null
}): string {
  const autopilotTier = input.tier === 'autopilot' ? '&tier=autopilot' : ''
  const sample = input.tier !== 'autopilot' && input.adsSampleOrder && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.adsSampleOrder) ? `&ads_sample_order=${input.adsSampleOrder.toLowerCase()}` : ''
  return `${input.appUrl}/checkout/success?success=true&currency=${input.currency}&amount=${input.amount}${autopilotTier}${sample}&session_id={CHECKOUT_SESSION_ID}`
}

export function isAutopilotEntitlementReady(plan: unknown): boolean {
  return plan === 'autopilot'
}

export function readyCheckoutSuccessDestination(
  flow: CheckoutSuccessFlow,
  plan: unknown,
): string | null {
  if (flow.kind === 'self_serve') return flow.destination
  return isAutopilotEntitlementReady(plan) ? flow.destination : null
}
