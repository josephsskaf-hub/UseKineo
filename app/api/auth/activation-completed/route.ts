import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeInternalRedirect } from '@/lib/authRedirect'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  AFFILIATE_ATTRIBUTION_COOKIE_NAMES,
  finalizeAffiliateSignupAttribution,
} from '@/lib/affiliateSignupFinalization'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    // The email/password path already awaits this route before leaving
    // /signup. Use that authoritative hop to finalize affiliate first-touch
    // instead of waiting for a later dashboard mount that may never happen.
    const affiliateFinalization = await finalizeAffiliateSignupAttribution({
      rawCode: req.cookies.get('sf_aff')?.value,
      rawClickId: req.cookies.get('sf_aff_click')?.value,
      user: {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
      },
      source: 'email_activation',
    })

    const body = await req.json().catch(() => ({}))
    const destination = normalizeInternalRedirect(
      typeof body?.destination === 'string' ? body.destination : null,
    ) ?? '/studio'
    const destinationUrl = new URL(destination, 'https://www.usekineo.com')
    const rawIntentCampaign = (destinationUrl.searchParams.get('intent_campaign') ?? '').trim()
    const intentCampaign = /^[A-Za-z0-9._~-]{1,100}$/.test(rawIntentCampaign)
      ? rawIntentCampaign
      : null
    const createdAt = Date.parse(user.created_at ?? '')
    const isRecentSignup = Number.isFinite(createdAt)
      && Date.now() - createdAt >= 0
      && Date.now() - createdAt < 5 * 60 * 1000

    const stored = await writeServerEvent({
      name: 'email_signup_completed',
      userId: user.id,
      path: '/signup',
      metadata: {
        destination_path: destinationUrl.pathname.slice(0, 128),
        has_prompt: destinationUrl.searchParams.has('prompt'),
        is_recent_signup: isRecentSignup,
        intent_campaign: intentCampaign,
      },
    })
    const response = NextResponse.json({ ok: true, stored })
    if (affiliateFinalization.clearCookies) {
      for (const name of AFFILIATE_ATTRIBUTION_COOKIE_NAMES) {
        response.cookies.set(name, '', {
          maxAge: 0,
          path: '/',
          sameSite: 'lax',
          secure: true,
        })
      }
    }
    return response
  } catch (error) {
    console.error('[activation-completed] unexpected failure:', error)
    return NextResponse.json({ ok: true, stored: false })
  }
}
