import { NextRequest, NextResponse } from 'next/server'
import { paypalAdminClient, paypalFetch } from '../../../../lib/paypal'
import { fulfillPaypalCapture, fetchPaypalResource } from '../../../../lib/payments/paypal'
import { reportPaymentFailure, paymentError, type PaymentDb } from '../../../../lib/payments/alternative'
import { PACK_PRICE_MINOR } from '../../../../lib/checkoutPricing'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
const APP_URL = 'https://www.usekineo.com'

export async function GET(req: NextRequest) {
  let db: PaymentDb | undefined
  try {
    const params = req.nextUrl.searchParams
    if (params.get('flow') === 'pack') {
      const orderId = params.get('token')
      if (!orderId) throw paymentError('paypal_order_id_missing')
      let order: Record<string, any> | null
      try {
        order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
          method: 'POST', idempotencyKey: `capture-${orderId}`, body: '{}',
        })
      } catch {
        // Read the actual order after a timeout or already-captured response.
        order = await fetchPaypalResource(`/v2/checkout/orders/${encodeURIComponent(orderId)}`)
      }
      if (order?.status !== 'COMPLETED') throw paymentError('paypal_order_not_settled')
      const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id
      if (!captureId) throw paymentError('paypal_capture_id_missing')
      db = paypalAdminClient()
      const outcome = await fulfillPaypalCapture(db, captureId, `return:${orderId}`)
      if (outcome === 'reversed') throw paymentError('paypal_order_reversed')
      return NextResponse.redirect(`${APP_URL}/checkout/success?success=true&pack=starter&currency=usd&amount=${PACK_PRICE_MINOR.usd}&via=paypal`)
    }
    if (params.get('flow') === 'sub') {
      const subId = params.get('subscription_id')
      if (!subId) throw paymentError('paypal_subscription_id_missing')
      const sub = await fetchPaypalResource(`/v1/billing/subscriptions/${encodeURIComponent(subId)}`)
      if (!['ACTIVE', 'APPROVED'].includes(sub.status)) throw paymentError('paypal_subscription_not_active')
      // No tier/amount from query parameters is trusted. Delivery follows the
      // authenticated paid SALE, independent of whether this tab stays open.
      return NextResponse.redirect(`${APP_URL}/checkout/success?provider=paypal&pending=1`)
    }
    throw paymentError('paypal_flow_invalid')
  } catch (error) {
    await reportPaymentFailure('paypal', null, null, error, db)
    return NextResponse.json({ error: 'PayPal payment could not be confirmed. Please retry or contact support@usekineo.com.' }, { status: 500 })
  }
}
