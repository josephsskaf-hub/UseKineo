export const CHECKOUT_RESUME_DELIVERY_GUARD_VERSION = 'checkout_resume_delivery_guard_v1'
export const CHECKOUT_RESUME_DELIVERY_POLL_MS = 15_000
export const CHECKOUT_RESUME_IDLE_RECHECKS = 2

export type CheckoutResumeDeliveryState = 'checking' | 'clear' | 'rendering'

export type CheckoutResumeDeliveryProbe = {
  state: Exclude<CheckoutResumeDeliveryState, 'checking'>
  resumable: boolean
}

/**
 * The active-render endpoint is owner-scoped. Unknown or degraded responses
 * fail open so checkout recovery never disappears because an optional probe
 * failed.
 */
export function readCheckoutResumeDeliveryProbe(payload: unknown): CheckoutResumeDeliveryProbe {
  if (!payload || typeof payload !== 'object') return { state: 'clear', resumable: false }
  const record = payload as Record<string, unknown>
  if (record.state !== 'rendering') return { state: 'clear', resumable: false }
  return {
    state: 'rendering',
    resumable: record.resumable === true && typeof record.render_id === 'string' && record.render_id.length > 0,
  }
}

export function nextCheckoutResumeDeliveryDelay(input: {
  state: CheckoutResumeDeliveryProbe['state']
  idleChecks: number
  wasRendering: boolean
}): number | null {
  if (input.state === 'rendering') return CHECKOUT_RESUME_DELIVERY_POLL_MS
  if (input.wasRendering) return null
  return input.idleChecks < CHECKOUT_RESUME_IDLE_RECHECKS
    ? CHECKOUT_RESUME_DELIVERY_POLL_MS
    : null
}
