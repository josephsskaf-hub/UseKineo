'use client'

// PUSH #95 — homepage_view was silently dead for ~4 weeks. app/KineoLanding.tsx
// (marker KINEO-LANDING-V3-2026-06-30) replaced app/HomePageClient.tsx as the
// live homepage on 2026-06-30, but KineoLanding is a SERVER component and never
// carried over the old trackEvent('homepage_view', ...) call that HomePageClient
// fired at render. Since then app/api/admin/funnel/route.ts has had a permanent
// 0 for its top-of-funnel step, and Vercel Web Analytics is disabled on this
// project too, so there is currently NO pageview number for the site at all.
// This tiny render-nothing client component restores that signal. Do NOT delete
// it without wiring homepage_view back in some other way first.

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { acquisitionSource, sanitizeAcquisitionReferrer } from '@/lib/acquisitionSource'

type Props = {
  signedIn: boolean
}

export default function LandingViewTracker({ signedIn }: Props) {
  useEffect(() => {
    // One homepage_view per browser tab. Storage and analytics failures must
    // never affect page rendering (Safari private mode can throw on storage).
    try {
      const marker = 'kineo_homepage_view_recorded'
      if (!sessionStorage.getItem(marker)) {
        sessionStorage.setItem(marker, '1')
        let referrerHost: string | null = null
        try {
          const referrer = sanitizeAcquisitionReferrer(document.referrer, window.location.hostname)
          if (referrer) referrerHost = acquisitionSource({ referrer }).slice(0, 120)
        } catch {
          // Referrer is optional.
        }
        void trackEvent('homepage_view', {
          referrer_host: referrerHost,
          signed_in: signedIn,
          variant: 'kineo_landing_v3',
        }, '/')
      }
    } catch {
      // Storage or analytics failures must never affect page rendering.
    }
  }, [signedIn])
  return null
}
