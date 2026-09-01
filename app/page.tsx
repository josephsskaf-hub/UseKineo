import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import KineoLanding from './KineoLanding'
import { extractShortTitle } from '@/lib/resumeStrip'
import type { ResumeStripData } from '@/lib/resumeStrip'
import { getEngineHero, getTrending } from '@/lib/engineWall'
import { homeReferralBridgeSource } from '@/lib/growth/homeReferralBridge'
import { BRAND_ALIASES, BRAND_NAME, BRAND_URL } from '@/lib/brandIdentity'

export const metadata: Metadata = {
  // UX10 #10 (15/08) — o title/description agora vendem o que a pagina VIROU:
  // a vitrine de motores. Antes vendiam o composer, que saiu da home.
  title: 'Kineo — AI Shorts Engines: Veo 3.1, Kling 3, Seedance | Faceless YouTube Shorts',
  description:
    'Pick an engine — Veo 3.1, Kling 3, Kling 2.5, Seedance 1.5 or Kineo 1 — type a topic and get a finished faceless YouTube Short with script, voice and captions. Real renders on every card.',
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
      '@id': `${BRAND_URL}/#org`,
      name: BRAND_NAME,
      alternateName: BRAND_ALIASES,
      url: BRAND_URL,
      logo: 'https://www.usekineo.com/apple-touch-icon.png',
    },
    {
      '@type': 'WebSite',
      '@id': `${BRAND_URL}/#website`,
      name: 'Kineo — AI YouTube Shorts Generator',
      alternateName: BRAND_ALIASES,
      url: BRAND_URL,
      publisher: { '@id': `${BRAND_URL}/#org` },
    },
  ],
}

function firstSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | null {
  const value = searchParams?.[key]
  return typeof value === 'string'
    ? value
    : Array.isArray(value) && typeof value[0] === 'string'
      ? value[0]
      : null
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const supabase = createClient()
  // Recommendation engines do not consistently append UTMs. The request
  // referrer lets a normal ChatGPT/TAAFT click receive the same value-first
  // bridge while the canonical acquisition policy keeps self-referrals out.
  const initialAcquisitionSource = homeReferralBridgeSource(
    searchParams,
    headers().get('referer'),
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let email = ''
  let isPro = false
  // KINEO-FAIXA-CONTINUAR-2026-09-01 — quem ja fez um Short e volta ao site cai HOJE nesta
  // mesma pagina de VENDAS. Medido em 01/09: 29 das 66 pessoas com 1 video
  // voltaram, 8 acharam o Studio sozinhas, 0 comecaram um segundo video.
  let resume: ResumeStripData | null = null
  if (user) {
    email = user.email ?? ''
    const { data } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single()
    isPro = data?.is_pro ?? false

    // Duas leituras baratas, SO para logado. Qualquer falha => faixa some
    // e a home fica exatamente como era (falha invisivel de proposito).
    try {
      const { data: ultimos } = await supabase
        .from('videos')
        .select('id, topic')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
      const linhas = (ultimos ?? []) as unknown as Array<{ id: string; topic: string | null }>
      const ultimo = linhas[0]
      const titulo = extractShortTitle(ultimo?.topic ?? null)
      if (ultimo && titulo) {
        const { count } = await supabase
          .from('videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed')
        resume = { title: titulo, episode: (count ?? 1) + 1, videoId: ultimo.id }
      }
    } catch {
      resume = null
    }
  }

  const [engineWall, trending] = await Promise.all([getEngineHero(), getTrending()])
  // The founder-approved post-signup destination is the engine showroom. Keep
  // its four hero videos untouched, then expose the existing creator/business/
  // agency router only to authenticated signup handoffs. Email uses
  // `?welcome=1`; OAuth and modal signup can arrive with `?signup=1`.
  const showWelcomeGoalRouter = Boolean(
    user && (
      firstSearchParam(searchParams, 'welcome') === '1' ||
      firstSearchParam(searchParams, 'signup') === '1'
    )
  )

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
        resume={resume}
        initialAcquisitionSource={initialAcquisitionSource}
        showWelcomeGoalRouter={showWelcomeGoalRouter}
      />
    </>
  )
}
