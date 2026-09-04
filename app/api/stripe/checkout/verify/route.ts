import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { isInternalEmail } from '@/lib/internalAccounts'
import { CHECKOUT_SESSION_PATTERN, inspectCheckoutPurchase } from '@/lib/growth/verifiedCheckoutPurchase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function reply(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' },
  })
}

// Read-only. No entitlement grants, Checkout creation, or database writes.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? ''
  if (!CHECKOUT_SESSION_PATTERN.test(sessionId)) return reply({ state: 'unavailable' }, 400)
  try {
    const { data: { user }, error } = await createClient().auth.getUser()
    if (error || !user) return reply({ state: 'unavailable' }, 401)
    if (isInternalEmail(user.email)) return reply({ state: 'ineligible' })
    if (!process.env.STRIPE_SECRET_KEY) return reply({ state: 'unavailable' }, 503)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { timeout: 5_000, maxNetworkRetries: 0 })
    const result = inspectCheckoutPurchase(session, sessionId, user.id)
    return reply(result, result.state === 'unavailable' ? 404 : 200)
  } catch (error) {
    // No Stripe body, session object, payment identifiers, or PII in logs/response.
    const missing = error instanceof Error && 'code' in error && error.code === 'resource_missing'
    return reply({ state: 'unavailable' }, missing ? 404 : 503)
  }
}
