import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { AUTOPILOT_PILOT_PRICES } from '@/lib/checkoutPricing'
import { AUTOPILOT_PILOT_DAYS, isAutopilotEntitled } from '@/lib/autopilot/config'
import {
  AUTOPILOT_PILOT_DISMISSED_COOKIE,
  AUTOPILOT_PILOT_RESUME_HINT_COOKIE,
  AUTOPILOT_PILOT_RESUME_VERSION,
  AUTOPILOT_PILOT_SESSION_COOKIE,
  decideAutopilotPilotResume,
} from '@/lib/growth/autopilotPilotResume'

export const dynamic = 'force-dynamic'

const SESSION_ID_PATTERN = /^cs_(?:test_|live_)?[A-Za-z0-9]{10,200}$/
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
const DISMISS_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

type DestinationKind = 'open_session' | 'stripe_recovery' | 'internal_retry'

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  return response
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTOPILOT_PILOT_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set({
    name: AUTOPILOT_PILOT_RESUME_HINT_COOKIE,
    value: '',
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

function unavailableResponse(
  req: NextRequest,
  go: boolean,
  reason: string,
  options: { clearSession?: boolean; status?: number } = {},
): NextResponse {
  const response = go
    ? NextResponse.redirect(new URL('/pricing#autopilot', req.url))
    : NextResponse.json({ available: false, reason }, { status: options.status ?? 200 })
  if (options.clearSession) clearSessionCookie(response)
  return noStore(response)
}

function isMissingStripeResource(error: unknown): boolean {
  const stripeError = error as { code?: string; type?: string; statusCode?: number } | null
  return stripeError?.code === 'resource_missing' ||
    (stripeError?.type === 'StripeInvalidRequestError' && stripeError?.statusCode === 404)
}

async function retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    if (!isMissingStripeResource(error)) {
      console.warn('[stripe/checkout/pilot-resume] Stripe Session lookup failed')
    }
    return null
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const go = req.nextUrl.searchParams.get('go') === '1'

  if (!process.env.STRIPE_SECRET_KEY) {
    return unavailableResponse(req, go, 'billing_unavailable', { status: go ? undefined : 503 })
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (go) {
      const redirect = encodeURIComponent('/api/stripe/checkout/pilot-resume?go=1')
      return noStore(NextResponse.redirect(new URL(`/login?reason=checkout&redirect=${redirect}`, req.url)))
    }
    return unavailableResponse(req, false, 'signed_out', { status: 401 })
  }

  if (!go && req.cookies.get(AUTOPILOT_PILOT_DISMISSED_COOKIE)?.value === '1') {
    return unavailableResponse(req, false, 'dismissed')
  }

  const rawSessionId = req.cookies.get(AUTOPILOT_PILOT_SESSION_COOKIE)?.value ?? ''
  if (!SESSION_ID_PATTERN.test(rawSessionId)) {
    // The public hint may outlive a missing/private cookie after a browser or
    // deployment transition. Clear both so it cannot trigger a request on
    // every navigation forever.
    return unavailableResponse(req, go, 'none', { clearSession: true })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) {
    return unavailableResponse(req, go, 'profile_unavailable')
  }

  const session = await retrieveSession(rawSessionId)
  if (!session) {
    return unavailableResponse(req, go, 'session_unavailable')
  }

  const currency = (session.currency ?? '').toLowerCase()
  const decision = decideAutopilotPilotResume({
    mode: session.mode,
    pack: session.metadata?.pack ?? null,
    ownerUserId: session.metadata?.supabase_user_id ?? session.client_reference_id ?? null,
    expectedUserId: user.id,
    status: session.status,
    paymentStatus: session.payment_status,
    alreadyEntitled: isAutopilotEntitled(profile),
    currency,
    amountTotal: session.amount_total,
    canonicalCurrency: 'usd',
    canonicalAmount: AUTOPILOT_PILOT_PRICES.usd,
  })
  if (!decision.eligible) {
    return unavailableResponse(req, go, decision.reason, { clearSession: true })
  }

  let destination: string | null = null
  let destinationKind: DestinationKind | null = null
  if (session.status === 'open' && session.url) {
    destination = session.url
    destinationKind = 'open_session'
  } else if (session.status === 'expired') {
    const recovery = session.after_expiration?.recovery
    const now = Math.floor(Date.now() / 1000)
    if (
      recovery?.enabled &&
      recovery.url &&
      (!recovery.expires_at || recovery.expires_at > now)
    ) {
      destination = recovery.url
      destinationKind = 'stripe_recovery'
    } else if (
      decision.canCreateInternalRetry &&
      now - session.expires_at <= SESSION_MAX_AGE_SECONDS
    ) {
      destination = new URL('/api/stripe/checkout?pack=autopilot_pilot&recovery=1', req.url).toString()
      destinationKind = 'internal_retry'
    }
  }

  if (!destination || !destinationKind) {
    return unavailableResponse(req, go, 'stale', { clearSession: true })
  }

  if (go) return noStore(NextResponse.redirect(destination))

  return noStore(NextResponse.json({
    available: true,
    productKind: 'autopilot_pilot',
    variant: AUTOPILOT_PILOT_RESUME_VERSION,
    resumeUrl: '/api/stripe/checkout/pilot-resume?go=1',
    destinationKind,
    currency,
    amountTotal: session.amount_total,
    days: AUTOPILOT_PILOT_DAYS,
  }))
}

export async function POST(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return noStore(NextResponse.json({ ok: false }, { status: 401 }))
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: AUTOPILOT_PILOT_DISMISSED_COOKIE,
    value: '1',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DISMISS_MAX_AGE_SECONDS,
  })
  return noStore(response)
}
