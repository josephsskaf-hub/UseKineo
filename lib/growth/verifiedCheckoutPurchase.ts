// Purchase attribution is not entitlement and is never inferred from a URL.
export const VERIFIED_CHECKOUT_VERSION = 'verified_checkout_purchase_v1'
export const CHECKOUT_SESSION_PATTERN = /^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/

export type CheckoutSessionEvidence = {
  id: string
  metadata: { [key: string]: string } | null
  status: string | null
  payment_status: string
  mode: string
  livemode: boolean
  amount_total: number | null
  currency: string | null
}

export type VerifiedCheckoutPurchase = {
  sessionId: string
  mode: 'subscription' | 'payment'
  amountMinor: number
  currency: 'USD' | 'BRL'
  value: number
}

export type CheckoutPurchaseResult =
  | { state: 'verified'; purchase: VerifiedCheckoutPurchase }
  | { state: 'pending' | 'ineligible' | 'unavailable' }

export function inspectCheckoutPurchase(
  session: CheckoutSessionEvidence,
  requestedId: string,
  userId: string,
): CheckoutPurchaseResult {
  // client_reference_id is Rewardful attribution for subscriptions, NOT owner.
  // Every supported Checkout creator writes supabase_user_id server-side.
  if (session.id !== requestedId || !userId || session.metadata?.supabase_user_id !== userId) {
    return { state: 'unavailable' }
  }
  if (!session.livemode || (session.mode !== 'subscription' && session.mode !== 'payment')) {
    return { state: 'ineligible' }
  }
  if (session.status === 'expired') return { state: 'ineligible' }
  // A free trial or a zero-value checkout is not a paid purchase conversion.
  if (session.payment_status === 'no_payment_required') return { state: 'ineligible' }
  if (session.status !== 'complete' || session.payment_status !== 'paid') return { state: 'pending' }
  // USD is current; BRL preserves existing historical sessions. Both have two
  // minor digits. Fail closed on unknown currencies, never guess their exponent.
  const currency = session.currency?.toUpperCase()
  if ((currency !== 'USD' && currency !== 'BRL') ||
      !Number.isSafeInteger(session.amount_total) || (session.amount_total ?? 0) <= 0) {
    return { state: 'ineligible' }
  }
  const amountMinor = session.amount_total as number
  return {
    state: 'verified',
    purchase: { sessionId: session.id, mode: session.mode, amountMinor, currency, value: amountMinor / 100 },
  }
}
