import 'server-only'

import {
  attributeAffiliateForUser,
  normalizeAffiliateClickId,
} from '@/lib/affiliateAttribution'
import { writeServerEvent } from '@/lib/serverEvents'

export const AFFILIATE_ATTRIBUTION_COOKIE_NAMES = [
  'sf_aff',
  'sf_aff_click',
  'sf_aff_hint',
] as const

const TERMINAL_WITHOUT_OWNER = new Set([
  'invalid_code',
  'invalid_click_proof',
  'ineligible_existing_account',
  'unknown_code',
  'inactive_affiliate',
  'self_referral',
])

type AffiliateSignupSource = 'auth_callback' | 'email_activation'

type AffiliateSignupUser = {
  id: string
  email?: string | null
  createdAt?: string | null
}

export type AffiliateSignupFinalization = {
  attempted: boolean
  clearCookies: boolean
  outcome: string
}

// Finalize the protected first-touch while the account creation request still
// owns both the authenticated user and the affiliate cookies. The dashboard
// trigger remains as a retry path; it is no longer the first point at which a
// successful signup can become visible to the partner.
export async function finalizeAffiliateSignupAttribution(input: {
  rawCode: string | null | undefined
  rawClickId: string | null | undefined
  user: AffiliateSignupUser
  source: AffiliateSignupSource
}): Promise<AffiliateSignupFinalization> {
  if (!(input.rawCode ?? '').trim()) {
    return { attempted: false, clearCookies: false, outcome: 'no_cookie' }
  }

  const result = await attributeAffiliateForUser(
    input.rawCode,
    input.user,
    {
      allowNewAttribution: true,
      clickId: normalizeAffiliateClickId(input.rawClickId),
    },
  )
  const outcome = result.ok
    ? (result.already ? 'already_attributed' : 'attributed')
    : result.reason

  // This event deliberately contains neither the affiliate code nor the click
  // UUID. It is enough to prove which signup surface finalized (or failed to
  // finalize) attribution without copying financial proof into analytics.
  await writeServerEvent({
    name: 'affiliate_signup_attribution_result',
    userId: input.user.id,
    path: input.source === 'auth_callback' ? '/auth/callback' : '/signup',
    metadata: {
      source: input.source,
      outcome,
      already_attributed: result.ok ? result.already : false,
    },
  })

  return {
    attempted: true,
    clearCookies: result.ok || TERMINAL_WITHOUT_OWNER.has(result.reason),
    outcome,
  }
}
