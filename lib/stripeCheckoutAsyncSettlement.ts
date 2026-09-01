import { createHash } from 'node:crypto'

export const STRIPE_ASYNC_CHECKOUT_VERSION = 'stripe_async_checkout_v1'

export type StripeAsyncCheckoutOutcome = 'pending' | 'failed'

type StripeAsyncCheckoutInput = {
  sessionId: string
  outcome: StripeAsyncCheckoutOutcome
  paymentStatus?: string | null
  checkoutMode?: string | null
  amountMinor?: number | null
  currency?: string | null
  tier?: string | null
  billing?: string | null
  pack?: string | null
  checkoutOrigin?: string | null
  intentCampaign?: string | null
}

const normalizeToken = (value?: string | null, max = 64): string | null => {
  const token = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .slice(0, max)
  return token || null
}

const normalizeCurrency = (value?: string | null): string | null => {
  const token = (value ?? '').trim().toLowerCase()
  return /^[a-z]{3}$/.test(token) ? token : null
}

const normalizeAmount = (value?: number | null): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null

export function checkoutPaymentIsSettled(paymentStatus?: string | null): boolean {
  return paymentStatus === 'paid' || paymentStatus === 'no_payment_required'
}

export function stripeCheckoutSessionReference(sessionId: string): string {
  return createHash('sha256')
    .update(`kineo:stripe-checkout-session:${sessionId}`)
    .digest('hex')
    .slice(0, 24)
}

export function buildStripeAsyncCheckoutMetadata(
  input: StripeAsyncCheckoutInput,
): Record<string, unknown> {
  return {
    version: STRIPE_ASYNC_CHECKOUT_VERSION,
    source: 'stripe_webhook',
    object: 'checkout_session',
    settlement_state: input.outcome,
    session_ref: stripeCheckoutSessionReference(input.sessionId),
    payment_status: normalizeToken(input.paymentStatus),
    checkout_mode: normalizeToken(input.checkoutMode),
    amount_minor: normalizeAmount(input.amountMinor),
    currency: normalizeCurrency(input.currency),
    tier: normalizeToken(input.tier),
    billing: normalizeToken(input.billing),
    pack: normalizeToken(input.pack),
    checkout_origin: normalizeToken(input.checkoutOrigin),
    intent_campaign: normalizeToken(input.intentCampaign),
  }
}
