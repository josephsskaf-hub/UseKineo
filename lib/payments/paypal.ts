import {
  paypalFetch, grantPackCredits, activateSubscription,
  tierFromPlanId, PAYPAL_PACK, PAYPAL_PLAN_CREDITS,
} from '../paypal'
import {
  type PaymentDb, fulfillAlternativePayment, recordAlternativeOrder, requirePaymentProfile,
  paymentError, paymentWasReversed, reversePayment, updatePaymentProfile,
  GrantNotAppliedError,
} from './alternative'

const PROTECTED_EMAILS = new Set([
  'josephsskaf@gmail.com', 'josephskaf@gmail.com', 'josephskaf@hotmail.com', 'joseph-test@shortsforgeai.com',
])

export async function fetchPaypalResource(path: string): Promise<Record<string, any>> {
  try {
    const data = await paypalFetch(path)
    if (!data) throw paymentError('paypal_resource_missing')
    return data
  } catch { throw paymentError('paypal_resource_unavailable') }
}

export async function fulfillPaypalCapture(db: PaymentDb, captureId: string, eventId: string) {
  if (!captureId) throw paymentError('paypal_capture_id_missing')
  const capture = await fetchPaypalResource(`/v2/payments/captures/${encodeURIComponent(captureId)}`)
  if (capture.id !== captureId) throw paymentError('paypal_capture_identity_mismatch')
  const paymentId = `capture:${captureId}`
  if (['REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED'].includes(capture.status)) {
    await reversePayment(db, 'paypal', paymentId, eventId)
    return 'reversed'
  }
  if (capture.status !== 'COMPLETED') throw paymentError('paypal_capture_not_settled')
  const orderId = String(capture.supplementary_data?.related_ids?.order_id ?? '')
  let userId = String(capture.custom_id ?? '')
  if (!userId && orderId) {
    const order = await fetchPaypalResource(`/v2/checkout/orders/${encodeURIComponent(orderId)}`)
    const unit = order.purchase_units?.find((p: any) => p.payments?.captures?.some((c: any) => c.id === captureId))
    userId = String(unit?.custom_id ?? '')
  }
  if (!userId) throw paymentError('paypal_capture_user_missing')
  if (capture.amount?.currency_code !== 'USD' || Number(capture.amount?.value) !== Number(PAYPAL_PACK.usd)) {
    throw paymentError('paypal_capture_amount_mismatch')
  }
  return fulfillAlternativePayment({ db, provider: 'paypal', eventId, paymentId, userId,
    metadata: { pack: 'starter', currency: 'usd', amount_total: Math.round(Number(PAYPAL_PACK.usd) * 100),
      credits_granted: PAYPAL_PACK.credits, paypal_capture_id: captureId, paypal_order_id: orderId || null },
    grant: () => grantPackCredits(db, userId, PAYPAL_PACK.credits),
    recordOrder: () => recordAlternativeOrder(db, 'paypal_events', { id: paymentId, type: 'pack_capture' }),
  })
}

export async function fulfillPaypalSale(db: PaymentDb, saleId: string, eventId: string) {
  if (!saleId) throw paymentError('paypal_sale_id_missing')
  const sale = await fetchPaypalResource(`/v1/payments/sale/${encodeURIComponent(saleId)}`)
  if (sale.id !== saleId) throw paymentError('paypal_sale_identity_mismatch')
  const subId = String(sale.billing_agreement_id ?? '')
  if (!subId) throw paymentError('paypal_subscription_id_missing')
  const paymentId = `sale:${saleId}`
  if (['refunded', 'partially_refunded', 'reversed'].includes(sale.state)) {
    await reversePayment(db, 'paypal', paymentId, eventId)
    return 'reversed'
  }
  if (sale.state !== 'completed') throw paymentError('paypal_sale_not_settled')
  if (sale.amount?.currency !== 'USD' || !Number.isFinite(Number(sale.amount?.total)) || Number(sale.amount?.total) <= 0) {
    throw paymentError('paypal_sale_amount_invalid')
  }
  if (await paymentWasReversed(db, 'paypal', `subscription:${subId}`)) return 'reversed'
  const sub = await fetchPaypalResource(`/v1/billing/subscriptions/${encodeURIComponent(subId)}`)
  if (sub.status !== 'ACTIVE') {
    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) {
      await reversePayment(db, 'paypal', `subscription:${subId}`, eventId)
      return 'reversed'
    }
    throw paymentError('paypal_subscription_not_active')
  }
  const userId = String(sub.custom_id ?? '')
  if (!userId) throw paymentError('paypal_subscription_user_missing')
  const mapped = await tierFromPlanId(db, String(sub.plan_id ?? ''))
  if (!mapped || !(mapped.tier in PAYPAL_PLAN_CREDITS)) throw paymentError('paypal_plan_unmapped')
  const profile = await requirePaymentProfile(db, userId)
  if (profile.paypal_subscription_id === subId && PROTECTED_EMAILS.has(String(profile.email ?? '').toLowerCase())) return 'protected'
  return fulfillAlternativePayment({ db, provider: 'paypal', eventId, paymentId, userId,
    metadata: { tier: mapped.tier, billing: mapped.billing, currency: String(sale.amount?.currency ?? '').toLowerCase(),
      amount_total: Math.round(Number(sale.amount?.total) * 100), credits_granted: PAYPAL_PLAN_CREDITS[mapped.tier],
      paypal_subscription_id: subId, paypal_sale_id: saleId, checkout_mode: 'subscription' },
    grant: async () => {
      // Cancellation may have arrived while resolving the profile/plan.
      try {
        if (await paymentWasReversed(db, 'paypal', `subscription:${subId}`)) throw paymentError('paypal_subscription_reversed')
      } catch { throw new GrantNotAppliedError('paypal_subscription_pregrant_check_failed') }
      await activateSubscription(db, userId, mapped.tier, subId)
    },
    recordOrder: () => recordAlternativeOrder(db, 'paypal_events', { id: paymentId, type: 'sub_sale' }),
  })
}

export async function revokePaypalSubscription(db: PaymentDb, subId: string, eventId: string) {
  if (!subId) throw paymentError('paypal_subscription_id_missing')
  const sub = await fetchPaypalResource(`/v1/billing/subscriptions/${encodeURIComponent(subId)}`)
  // SUSPENDED is reversible. An old notification cannot revoke an ACTIVE
  // subscription, and resumption must not be blocked by a terminal marker.
  if (sub.status === 'ACTIVE') return
  if (!['CANCELLED', 'SUSPENDED', 'EXPIRED'].includes(sub.status)) throw paymentError('paypal_subscription_state_unknown')
  if (sub.status !== 'SUSPENDED') await reversePayment(db, 'paypal', `subscription:${subId}`, eventId)
  const { data, error } = await db.from('profiles').select('id,email').eq('paypal_subscription_id', subId).maybeSingle()
  if (error) throw paymentError('paypal_revoke_lookup_failed', error)
  if (!data || PROTECTED_EMAILS.has(String(data.email ?? '').toLowerCase())) return
  await updatePaymentProfile(db, data.id, (profile) => profile.paypal_subscription_id === subId
    ? { is_pro: false, plan: 'free', paypal_subscription_id: sub.status === 'SUSPENDED' ? subId : null } : {})
}

// Refund IDs are NOT capture/sale IDs. Parse the documented related ID or
// allowlisted rel=up path; never fetch an event-supplied URL.
export function paypalReversalTarget(resource: Record<string, any>, kind: 'capture' | 'sale') {
  const related = resource.supplementary_data?.related_ids
  const direct = kind === 'capture' ? related?.capture_id : (resource.sale_id ?? related?.sale_id)
  if (typeof direct === 'string' && direct) return direct
  for (const link of resource.links ?? []) {
    if (link.rel !== 'up' || typeof link.href !== 'string') continue
    const url = new URL(link.href)
    if (!['api.paypal.com', 'api-m.paypal.com', 'api.sandbox.paypal.com', 'api-m.sandbox.paypal.com'].includes(url.hostname)) continue
    const pattern = kind === 'capture' ? /^\/v2\/payments\/captures\/([^/]+)$/ : /^\/v1\/payments\/sale\/([^/]+)$/
    const match = url.pathname.match(pattern)
    if (match) return match[1]
  }
  throw paymentError('paypal_refund_parent_missing')
}
