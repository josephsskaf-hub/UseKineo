import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creditsForBRL, verifyHottok, HOTMART_APPROVED_EVENTS, HOTMART_REVERSED_EVENTS, type HotmartEvent } from '../../../../lib/hotmart'
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
    if (!verifyHottok(req.headers.get('x-hotmart-hottok'))) {
      await reportPaymentFailure('hotmart', null, null, paymentError('invalid_signature'))
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const body: HotmartEvent = await req.json()
    eventId = body.id ?? null
    const event = (body.event ?? '').toUpperCase()
    const purchase = body.data?.purchase
    const transaction = purchase?.transaction?.trim() ?? ''
    if (!eventId || !event) throw paymentError('hotmart_event_identity_missing')
    if (!HOTMART_APPROVED_EVENTS.has(event) && !HOTMART_REVERSED_EVENTS.has(event)) return NextResponse.json({ received: true })
    if (!transaction) throw paymentError('hotmart_transaction_missing')
    db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } })
    if (await paymentWasProcessed(db, 'hotmart', eventId)) return NextResponse.json({ received: true, duplicate: true })
    if (HOTMART_REVERSED_EVENTS.has(event) || ['REFUNDED', 'PARTIALLY_REFUNDED', 'CHARGEBACK', 'CANCELED', 'CANCELLED', 'DISPUTE'].includes(purchase?.status ?? '')) {
      await reversePayment(db, 'hotmart', transaction, eventId)
    } else {
      if (purchase?.status && !['APPROVED', 'COMPLETE', 'COMPLETED'].includes(purchase.status)) throw paymentError('hotmart_purchase_not_settled')
      const email = body.data?.buyer?.email?.trim().toLowerCase() ?? ''
      if (!email) throw paymentError('hotmart_buyer_missing')
      const credits = creditsForBRL(purchase?.price?.value)
      if (!Number.isSafeInteger(credits) || credits <= 0 || purchase?.price?.currency_value !== 'BRL') throw paymentError('hotmart_purchase_amount_invalid')
      const { data, error } = await db.from('profiles').select('id').eq('email', email).maybeSingle()
      if (error) throw paymentError('hotmart_profile_lookup_failed', error)
      userId = data?.id ?? null
      if (!userId) throw paymentError('hotmart_account_missing_retry')
      const owner = userId
      await fulfillAlternativePayment({ db, provider: 'hotmart', eventId, paymentId: transaction, userId: owner,
        metadata: { credits_granted: credits, amount_total: Math.round(purchase!.price!.value! * 100), currency: 'brl', hotmart_transaction: transaction },
        grant: () => grantAlternativePack(db!, owner, credits),
        recordOrder: () => recordAlternativeOrder(db!, 'hotmart_payments', {
          transaction, user_id: owner, email, credits, amount_brl: purchase!.price!.value, event,
        }),
      })
    }
    await markPaymentProcessed(db, 'hotmart', eventId)
    return NextResponse.json({ received: true })
  } catch (error) {
    await reportPaymentFailure('hotmart', eventId, userId, error, db)
    return NextResponse.json({ error: 'payment processing failed, retry' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true }) }
