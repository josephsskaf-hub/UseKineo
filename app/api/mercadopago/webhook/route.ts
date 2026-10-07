import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMpPayment, MP_PACKS, verifyMpWebhook } from '../../../../lib/mercadopago'
import {
  paymentWasProcessed, markPaymentProcessed, reversePayment, reportPaymentFailure, paymentError,
  grantAlternativePack, fulfillAlternativePayment, recordAlternativeOrder, type PaymentDb,
} from '../../../../lib/payments/alternative'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  let db: PaymentDb | undefined
  let eventId: string | null = null
  let userId: string | null = null
  try {
    if (!verifyMpWebhook(req.headers, req.nextUrl.searchParams)) {
      await reportPaymentFailure('mercadopago', null, null, paymentError('invalid_signature'))
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
    const paymentId = req.nextUrl.searchParams.get('data.id')!.toLowerCase()
    const body = await req.json()
    if (body.data?.id == null || String(body.data.id).toLowerCase() !== paymentId) {
      await reportPaymentFailure('mercadopago', null, null, paymentError('signed_resource_mismatch'))
      return NextResponse.json({ error: 'invalid signature resource' }, { status: 401 })
    }
    // The HMAC binds the resource, not body.id/type/action. Never dedupe by an
    // unauthenticated notification ID: it could suppress the later approval.
    const payment = await getMpPayment(paymentId)
    eventId = `${paymentId}:${payment.status}`
    db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } })
    if (await paymentWasProcessed(db, 'mercadopago', eventId)) return NextResponse.json({ received: true, duplicate: true })
    if (['refunded', 'charged_back', 'cancelled'].includes(payment.status)) {
      await reversePayment(db, 'mercadopago', paymentId, eventId)
    } else if (payment.status === 'approved') {
      const ref = payment.externalReference ?? ''
      const sep = ref.lastIndexOf(':')
      userId = sep > 0 ? ref.slice(0, sep) : null
      const packId = sep > 0 ? ref.slice(sep + 1) : ''
      const pack = MP_PACKS[packId]
      if (!userId || !pack) throw paymentError('mp_payment_owner_or_pack_missing')
      if (payment.currency !== 'BRL' || payment.amount !== pack.brl) throw paymentError('mp_payment_amount_mismatch')
      const owner = userId
      await fulfillAlternativePayment({ db, provider: 'mercadopago', eventId, paymentId, userId: owner,
        metadata: { pack: packId, credits_granted: pack.credits, amount_total: Math.round(pack.brl * 100), currency: 'brl' },
        grant: () => grantAlternativePack(db!, owner, pack.credits),
        recordOrder: () => recordAlternativeOrder(db!, 'mp_payments', {
          payment_id: paymentId, user_id: owner, pack: packId, credits: pack.credits, amount_brl: pack.brl,
        }),
      })
    }
    await markPaymentProcessed(db, 'mercadopago', eventId)
    return NextResponse.json({ received: true })
  } catch (error) {
    await reportPaymentFailure('mercadopago', eventId, userId, error, db)
    return NextResponse.json({ error: 'payment processing failed, retry' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true }) }
