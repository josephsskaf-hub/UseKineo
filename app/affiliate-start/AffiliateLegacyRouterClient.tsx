'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  AFFILIATE_LEGACY_ROUTER_VERSION,
  affiliateLegacyEventMetadata,
  affiliateLegacyIntentHref,
  type AffiliateLegacyIntent,
  type AffiliateLegacyNextStep,
} from '@/lib/affiliateDestinations'

const VIEW_MARKER = `kineo:${AFFILIATE_LEGACY_ROUTER_VERSION}:viewed`

const CARD = {
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 20,
  background: 'linear-gradient(145deg, rgba(24,25,32,.96), rgba(10,11,15,.96))',
  color: '#f5f5f7',
  textDecoration: 'none',
} as const

function recordSelection(intent: AffiliateLegacyIntent, nextStep: AffiliateLegacyNextStep) {
  void trackEvent(
    'affiliate_legacy_intent_selected',
    affiliateLegacyEventMetadata(intent, nextStep),
  )
}

export default function AffiliateLegacyRouterClient() {
  const creatorHref = affiliateLegacyIntentHref('creator')
  const businessHref = affiliateLegacyIntentHref('business')
  const packsHref = affiliateLegacyIntentHref('business', 'secondary')

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(VIEW_MARKER) === '1') return
      window.sessionStorage.setItem(VIEW_MARKER, '1')
    } catch {
      // Privacy mode can disable storage. Navigation must remain available.
    }
    void trackEvent('affiliate_legacy_router_viewed', affiliateLegacyEventMetadata())
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#050506', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: 'min(900px, calc(100% - 32px))', margin: '0 auto', padding: '28px 0 72px' }}>
        <nav aria-label="Kineo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: '#fff', fontSize: '1.08rem', fontWeight: 950, letterSpacing: '-.03em', textDecoration: 'none' }}>
            Kineo
          </Link>
          <span style={{ color: '#73737c', fontSize: '.78rem' }}>Partner recommendation</span>
        </nav>

        <header style={{ maxWidth: 680, margin: 'clamp(70px, 12vw, 122px) auto 0', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#8b8b94', fontSize: '.73rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            One quick question
          </p>
          <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(2.25rem, 7vw, 4.5rem)', lineHeight: .98, letterSpacing: '-.055em', fontWeight: 950 }}>
            What are you creating for?
          </h1>
          <p style={{ maxWidth: 560, margin: '19px auto 0', color: '#a5a5ae', fontSize: 'clamp(.98rem, 2vw, 1.08rem)', lineHeight: 1.62 }}>
            Choose one path. Your partner recommendation stays credited either way.
          </p>
        </header>

        <section aria-label="Choose your Kineo path" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 15, marginTop: 35 }}>
          <Link
            href={creatorHref}
            onClick={() => recordSelection('creator', 'tool')}
            style={{ ...CARD, display: 'flex', minHeight: 235, padding: 'clamp(22px, 4vw, 30px)', flexDirection: 'column' }}
          >
            <span aria-hidden="true" style={{ display: 'grid', width: 42, height: 42, placeItems: 'center', borderRadius: 13, background: 'rgba(41,151,255,.13)', color: '#72baff', fontSize: '1.2rem' }}>✦</span>
            <h2 style={{ margin: '24px 0 0', fontSize: '1.45rem', letterSpacing: '-.035em' }}>My own channel</h2>
            <p style={{ margin: '10px 0 0', color: '#9d9da7', lineHeight: 1.58 }}>
              Start with the free script tool and turn one topic into a hook, story beats and payoff.
            </p>
            <span style={{ marginTop: 'auto', paddingTop: 22, color: '#72baff', fontWeight: 900 }}>Build my script →</span>
          </Link>

          <article style={{ ...CARD, display: 'flex', minHeight: 235, padding: 'clamp(22px, 4vw, 30px)', flexDirection: 'column' }}>
            <span aria-hidden="true" style={{ display: 'grid', width: 42, height: 42, placeItems: 'center', borderRadius: 13, background: 'rgba(167,139,250,.14)', color: '#c4b5fd', fontSize: '1.1rem' }}>▦</span>
            <h2 style={{ margin: '24px 0 0', fontSize: '1.45rem', letterSpacing: '-.035em' }}>A business or client</h2>
            <p style={{ margin: '10px 0 0', color: '#9d9da7', lineHeight: 1.58 }}>
              Start with a free weekly content plan built around the offer, audience and goal.
            </p>
            <Link
              href={businessHref}
              onClick={() => recordSelection('business', 'planner')}
              style={{ marginTop: 'auto', paddingTop: 22, color: '#c4b5fd', fontWeight: 900, textDecoration: 'none' }}
            >
              Plan business content →
            </Link>
            <Link
              href={packsHref}
              onClick={() => recordSelection('business', 'packs')}
              style={{ marginTop: 13, color: '#83838d', fontSize: '.8rem', fontWeight: 800, textDecoration: 'none' }}
            >
              Already know the volume? See one-time video packs
            </Link>
          </article>
        </section>

        <p style={{ margin: '22px auto 0', color: '#64646d', fontSize: '.76rem', lineHeight: 1.55, textAlign: 'center' }}>
          No form here. Choose a path and continue on Kineo.
        </p>
      </div>
    </main>
  )
}
