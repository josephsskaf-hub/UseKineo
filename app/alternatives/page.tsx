// Index/hub page for /alternatives — fixes a 404: app/ai-shorts-without-filming/page.tsx
// and app/cheapest-ai-shorts-maker/page.tsx both link to href="/alternatives" but no page
// existed at that route. This page lists every /alternatives/[competitor] comparison page
// (OpusClip, InVideo, Submagic, HeyGen, Pika, Fliki, Revid, Crayo, AutoShorts, Klap, Quso,
// CapCut, Pictory, VEED, Vizard, Descript, Synthesia, Canva, Kapwing, Runway, Synthesys,
// D-ID, SendShort, Luma Dream Machine, BigMotion AI, Faceless.so, Faceless.video) so users
// and search engines can reach them from one
// place. Data is sourced from the same COMPETITORS object the dynamic route uses, so this
// page never drifts out of sync when new competitors are added.
import type { Metadata } from 'next'
import Link from 'next/link'
import StickyFreeShortCTA from '@/components/StickyFreeShortCTA'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import CostCalculatorLink from '@/components/CostCalculatorLink'
import { COMPETITORS, COMPETITOR_SLUGS } from './[competitor]/page'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_MO, STARTER_MONTH } from '@/lib/marketingPrice'
import {
  ALTERNATIVE_JOB_PATHS,
  KINEO_ALTERNATIVES_SIGNUP_HREF,
} from '@/lib/growth/alternativeJobChooser'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Kineo Alternatives — Compare Kineo to Other AI Video Tools',
  description:
    `Compare Kineo with OpusClip, InVideo, HeyGen, Synthesia, CapCut, Runway and more. ${ft(OFFER, 'Try up to 3 watermarked Fast videos every 24h; Starter is ' + STARTER_MONTH + '.', OFFER.copy.headline)}`,
  alternates: { canonical: 'https://www.usekineo.com/alternatives' },
  openGraph: {
    title: 'Kineo Alternatives — Compare Kineo to Other AI Video Tools',
    description:
      'Honest, feature-by-feature comparisons between Kineo and the other AI video/Shorts tools — repurposing tools, avatar generators, text-to-video and generative clip models.',
    url: 'https://www.usekineo.com/alternatives',
    type: 'website',
  },
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }

export default function AlternativesIndexPage() {
  const signupUrl = KINEO_ALTERNATIVES_SIGNUP_HREF
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 64px' }}>
        <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>
          ⚡ Kineo
        </Link>

        {/* Hero */}
        <section style={{ marginTop: 36, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', borderRadius: 999, padding: '6px 14px' }}>
            Alternatives
          </div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>
            Kineo alternatives — compare us to other AI video tools
          </h1>
          <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 660 }}>
            Kineo turns a single topic or idea into a finished, faceless YouTube Short — script, AI voiceover, matched footage and captions — usually in 3–7 minutes. It’s not a re-clipper. Pick a tool below to see an honest, feature-by-feature comparison, including when the other tool is actually the better fit.
          </p>
          <OrganicCtaLink
            href={signupUrl}
            source="push22_alternatives_hub"
            placement="hero"
            style={{ display: 'inline-block', marginTop: 22, background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}
          >
            Try Kineo free →
          </OrganicCtaLink>
          <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '10px 0 0' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · no card · Starter <b style={{ color: '#2997ff' }}>{STARTER_MO}</b>
          </p>
          <CostCalculatorLink
            placement="alternatives_hero"
            style={{ display: 'inline-block', marginTop: 12, color: '#2997ff', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}
          >
            Calculate your real cost per Short →
          </CostCalculatorLink>
        </section>

        {/* Job-first chooser: qualify the visitor before showing 27 brand cards. */}
        <section aria-labelledby="job-chooser-heading" style={{ marginTop: 52 }}>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 22px' }}>
            <div style={{ color: '#a78bfa', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Start with the job
            </div>
            <h2 id="job-chooser-heading" style={{ fontSize: 'clamp(1.45rem, 4vw, 2.05rem)', lineHeight: 1.15, margin: '9px 0 8px' }}>
              Which kind of video are you actually making?
            </h2>
            <p style={{ color: '#909098', lineHeight: 1.6, margin: 0 }}>
              These tools solve different starting points. Pick yours before comparing feature lists.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: 14 }}>
            {ALTERNATIVE_JOB_PATHS.map((job) => (
              <article
                key={job.id}
                style={{
                  ...CARD,
                  borderColor: job.kineoFit === 'best_fit' ? 'rgba(52,211,153,.55)' : '#2a2a2d',
                  background: job.kineoFit === 'best_fit' ? 'linear-gradient(145deg, rgba(52,211,153,.12), #111614 70%)' : CARD.background,
                  borderRadius: 18,
                  padding: '21px 21px 19px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ color: job.kineoFit === 'best_fit' ? '#34d399' : '#a78bfa', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                  {job.eyebrow}
                </div>
                <h3 style={{ fontSize: '1.08rem', lineHeight: 1.3, margin: '8px 0 7px' }}>{job.title}</h3>
                <p style={{ color: '#97979f', fontSize: '0.86rem', lineHeight: 1.58, margin: 0 }}>{job.description}</p>
                <p style={{ color: '#d6d6da', fontSize: '0.86rem', lineHeight: 1.58, margin: '12px 0 17px' }}>
                  <strong>{job.recommendation}</strong>
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {job.kineoFit === 'best_fit' ? (
                    <OrganicCtaLink
                      href={job.primaryHref}
                      source="alternatives_job_chooser"
                      placement={job.id}
                      style={{ display: 'inline-flex', color: '#06130e', background: '#34d399', borderRadius: 999, padding: '10px 15px', fontSize: '0.8rem', fontWeight: 900, textDecoration: 'none' }}
                    >
                      {job.primaryLabel} →
                    </OrganicCtaLink>
                  ) : (
                    <Link href={job.primaryHref} style={{ color: '#c4b5fd', fontSize: '0.82rem', fontWeight: 850, textDecoration: 'none' }}>
                      {job.primaryLabel} →
                    </Link>
                  )}
                  {job.secondaryHref && job.secondaryLabel ? (
                    <Link href={job.secondaryHref} style={{ color: '#9ca3af', fontSize: '0.79rem', fontWeight: 750, textDecoration: 'none' }}>
                      {job.secondaryLabel} →
                    </Link>
                  ) : null}
                </div>
                <a
                  href={job.sourceHref}
                  target={job.sourceHref.startsWith('http') ? '_blank' : undefined}
                  rel={job.sourceHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{ color: '#6f6f78', fontSize: '0.7rem', marginTop: 14, textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  Source: {job.sourceLabel}
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Grid of comparison cards */}
        <section style={{ marginTop: 52 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 20px' }}>
            {COMPETITOR_SLUGS.length} comparisons
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {COMPETITOR_SLUGS.map((slug) => {
              const c = COMPETITORS[slug]
              return (
                <Link
                  key={slug}
                  href={`/alternatives/${slug}`}
                  style={{ ...CARD, display: 'block', borderRadius: 16, padding: '18px 20px', textDecoration: 'none', color: 'inherit', transition: 'border-color .15s' }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2997ff' }}>
                    vs {c.name}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.02rem', margin: '8px 0 6px', color: '#f5f5f7' }}>
                    Kineo alternative to {c.name}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#86868b', lineHeight: 1.55 }}>
                    {c.theyDo}
                  </p>
                  <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#2997ff', fontWeight: 700 }}>
                    Compare →
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ marginTop: 48, textAlign: 'center', ...CARD, borderRadius: 18, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>{ft(OFFER, 'Make a faceless Fast video free', OFFER.copy.ctaHeading)}</h2>
          <p style={{ color: '#86868b', margin: '8px 0 18px', fontSize: '0.95rem' }}>One idea in, a ready-to-post watermarked video out. No editing, no card.</p>
          <OrganicCtaLink
            href={signupUrl}
            source="push22_alternatives_hub"
            placement="final"
            style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}
          >
            Start free →
          </OrganicCtaLink>
        </section>
      </div>
      <StickyFreeShortCTA />
      <Footer />
    </main>
  )
}
