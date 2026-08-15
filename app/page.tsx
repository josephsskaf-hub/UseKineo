import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import KineoLanding from './KineoLanding'
import { getEngineHero, getTrending } from '@/lib/engineWall'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.usekineo.com/' },
}

// Push #066 — homepage auth hydration fix.
//
// The landing page lives outside the (dashboard) route group, so it does
// not inherit the dashboard layout's server-side auth check. Before this
// change the page was a "use client" component that only learned about
// the user via supabase.auth.getUser() on mount — meaning the Sidebar
// rendered with isLoggedIn=false on first paint and would stick on
// "Guest User — Not signed in" whenever the browser-client call didn't
// resolve cleanly (cold cache after middleware refresh, etc.), even
// though /generate would show the same user as signed in.
//
// This wrapper reads the session from cookies via the server Supabase
// client and forwards the resolved user/email/is_pro into the client
// component as initial state, mirroring app/(dashboard)/layout.tsx.

// KINEO-TYPO-BRAND-2026-07-31 — "cineo" is the single biggest brand query in
// Search Console (14 impressions/7d, more than "kineo ai") and today those
// searches surface nothing we control. alternateName is schema.org's official
// slot for "other names people use for this thing" — common misspellings
// included. This is the free version of buying cineo.com (which stays in the
// queue as a paid gate). Homepage-only; server-rendered, zero client cost.
const BRAND_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.usekineo.com/#org',
      name: 'Kineo',
      alternateName: ['Kineo AI', 'UseKineo', 'Cineo', 'Cineo AI'],
      url: 'https://www.usekineo.com',
      logo: 'https://www.usekineo.com/apple-touch-icon.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.usekineo.com/#website',
      name: 'Kineo — AI YouTube Shorts Generator',
      alternateName: ['Kineo AI', 'Cineo'],
      url: 'https://www.usekineo.com',
      publisher: { '@id': 'https://www.usekineo.com/#org' },
    },
  ],
}

export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let email = ''
  let isPro = false
  if (user) {
    email = user.email ?? ''
    const { data } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single()
    isPro = data?.is_pro ?? false
  }

  const [engineWall, trending] = await Promise.all([getEngineHero(), getTrending()])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BRAND_JSON_LD) }}
      />
      <KineoLanding
        initialUser={user ? { id: user.id } : null}
        engineWall={engineWall}
        trending={trending}
        initialEmail={email}
        initialIsPro={isPro}
      />
    </>
  )
}
