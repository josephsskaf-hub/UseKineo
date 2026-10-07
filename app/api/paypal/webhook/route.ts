import { NextRequest, NextResponse } from 'next/server'
import { paypalAdminClient, verifyPaypalWebhook } from '../../../../lib/paypal'
import {
  paymentWasProcessed, markPaymentProcessed, reversePayment, reportPaymentFailure, paymentError,
  type PaymentDb,
} from '../../../../lib/payments/alternative'
import {
  fulfillPaypalCapture, fulfillPaypalSale, revokePaypalSubscription, paypalReversalTarget,
} from '../../../../lib/payments/paypal'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  let db: PaymentDb | undefined
  let eventId: string | null = null
  try {
    const rawBody = await req.text()
    if (!await verifyPaypalWebhook(req.headers, rawBody)) {
      await reportPaymentFailure('paypal', null, null, paymentError('invalid_signature'))
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
    const event = JSON.parse(rawBody)
    eventId = typeof event.id === 'string' ? event.id : null
    if (!eventId || !event.event_type) throw paymentError('paypal_event_identity_missing')
    db = paypalAdminClient()
    if (await paymentWasProcessed(db, 'paypal', eventId)) return NextResponse.json({ received: true, duplicate: true })
    const resource = event.resource ?? {}
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await fulfillPaypalCapture(db, String(resource.id ?? ''), eventId)
        break
      case 'PAYMENT.SALE.COMPLETED':
        await fulfillPaypalSale(db, String(resource.id ?? ''), eventId)
        break
      case 'PAYMENT.CAPTURE.REFUNDED':
        await reversePayment(db, 'paypal', `capture:${paypalReversalTarget(resource, 'capture')}`, eventId)
        break
      case 'PAYMENT.CAPTURE.REVERSED':
        if (!resource.id) throw paymentError('paypal_capture_id_missing')
        await reversePayment(db, 'paypal', `capture:${resource.id}`, eventId)
        break
      case 'PAYMENT.SALE.REFUNDED':
        await reversePayment(db, 'paypal', `sale:${paypalReversalTarget(resource, 'sale')}`, eventId)
        break
      case 'PAYMENT.SALE.REVERSED':
        if (!resource.id) throw paymentError('paypal_sale_id_missing')
        await reversePayment(db, 'paypal', `sale:${resource.id}`, eventId)
        break
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await revokePaypalSubscription(db, String(resource.id ?? ''), eventId)
        break
      // Activation is not proof of a settled charge. The first verified SALE
      // activates and grants once, even if it arrives before ACTIVATED.
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      default:
        break
    }
    await markPaymentProcessed(db, 'paypal', eventId)
    return NextResponse.json({ received: true })
  } catch (error) {
    await reportPaymentFailure('paypal', eventId, null, error, db)
    return NextResponse.json({ error: 'payment processing failed, retry' }, { status: 500 })
  }
}
