// Finalize custom affiliate attribution after signup. The same idempotent
// first-touch primitive is also called by Stripe checkout, so a buyer who goes
// straight from the public homepage to payment cannot outrun a client effect.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  attributeAffiliateForUser,
  normalizeAffiliateCode,
  normalizeAffiliateClickId,
} from '@/lib/affiliateAttribution'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COOKIE = 'sf_aff'
const CLICK_COOKIE = 'sf_aff_click'
const COOKIE_HINT = 'sf_aff_hint'

const TERMINAL_WITHOUT_OWNER = new Set([
  'invalid_code',
  'invalid_click_proof',
  'ineligible_existing_account',
  'unknown_code',
  'inactive_affiliate',
  'self_referral',
])

function clearAttributionCookies(response: NextResponse): NextResponse {
  for (const name of [COOKIE, CLICK_COOKIE, COOKIE_HINT]) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  }
  return response
}

export async function POST() {
  try {
    const rawCode = cookies().get(COOKIE)?.value
    if (!rawCode) return NextResponse.json({ ok: false, reason: 'no_cookie' })
    if (!normalizeAffiliateCode(rawCode)) {
      return clearAttributionCookies(NextResponse.json({ ok: false, reason: 'invalid_code' }))
    }
    const clickId = normalizeAffiliateClickId(cookies().get(CLICK_COOKIE)?.value)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })

    const result = await attributeAffiliateForUser(
      rawCode,
      { id: user.id, email: user.email, createdAt: user.created_at },
      { allowNewAttribution: true, clickId },
    )
    if (result.ok) {
      return clearAttributionCookies(NextResponse.json({ ok: true, already: result.already }))
    }
    const response = NextResponse.json({ ok: false, reason: result.reason })
    return TERMINAL_WITHOUT_OWNER.has(result.reason)
      ? clearAttributionCookies(response)
      : response
  } catch {
    return NextResponse.json({ ok: false, reason: 'unexpected_failure' })
  }
}
