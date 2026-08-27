'use client'

// #479 — Fires affiliate attribution once per session on any authenticated page.
// The sf_aff cookie is httpOnly (server-only), so we can't pre-check it client-
// side; we just POST once and the route no-ops cheaply if there's no cookie or
// the user is already attributed. Mirrors ReferralAutoTrigger.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const TERMINAL_WITHOUT_ATTRIBUTION = new Set([
  // `no_cookie` is deliberately NOT terminal. A logged-in person may visit
  // the dashboard before later following an affiliate link in the same tab;
  // marking that empty moment done would suppress attribution.
  'invalid_code', 'invalid_click_proof', 'ineligible_existing_account', 'unknown_code', 'inactive_affiliate', 'self_referral',
])
const SESSION_KEY = 'sf_aff_attr'

function affiliateHintPresent(): boolean {
  try {
    return /(?:^|;\s*)sf_aff_hint=1(?:;|$)/.test(document.cookie)
  } catch {
    return false
  }
}

function clearAffiliateHint(): void {
  try {
    document.cookie = 'sf_aff_hint=; Max-Age=0; Path=/; SameSite=Lax; Secure'
  } catch {
    /* ignore */
  }
}

export default function AffiliateAutoTrigger() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const state = sessionStorage.getItem(SESSION_KEY)
      const hasFreshLinkHint = affiliateHintPresent()
      // Both a prior success/terminal result and an empty probe stay quiet
      // until a later `/a/[code]` visit sets a fresh boolean hint. This lets a
      // newly verified link recover a session that once held an invalid cookie.
      if ((state === '1' || state === 'no_cookie') && !hasFreshLinkHint) return
    } catch {
      /* sessionStorage blocked — fall through and just fire */
    }
    fetch('/api/affiliate/attribute', { method: 'POST', keepalive: true })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null
        if (response.ok && result?.reason === 'no_cookie') {
          try {
            sessionStorage.setItem(SESSION_KEY, 'no_cookie')
            clearAffiliateHint()
          } catch {
            /* ignore */
          }
          return
        }
        // Do not mark transient failures (401, DB/profile race, 5xx) as done.
        // The next authenticated mount must retry so a real affiliate signup
        // cannot be lost because one request arrived too early.
        if (!response.ok || (!result?.ok && !TERMINAL_WITHOUT_ATTRIBUTION.has(result?.reason ?? ''))) return
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
          clearAffiliateHint()
        } catch {
          /* ignore */
        }
      })
      .catch(() => {})
  }, [pathname])

  return null
}
