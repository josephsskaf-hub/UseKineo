// KINEO-SCRIPT-LIBRARY-2026-08-03 — /scripts/[vertical].
//
// The category layer of the library. Its job is to answer the query a human
// actually types ("youtube shorts script about money") with a page that both
// ANSWERS it and passes internal authority down to the individual /v/[id]
// script pages, which until now had no parent at all.
//
// Design decisions worth stating:
//
//  • The slug set is NOT new taxonomy. Every slug here is a slug that already
//    exists in app/free-ai-shorts/[niche]/page.tsx, so each vertical page can
//    cross-link to its matching generator page and vice versa. The verticals in
//    lib/viralTopics.ts (billionaire / country / crime / nature / technology)
//    are folded in via `viralVerticals` rather than duplicated.
//
//  • `dynamicParams = false`. The slug list is a static constant, so anything
//    outside it must 404 rather than render an empty category — an infinite
//    space of empty pages is exactly the low-value pattern the /v/[id] gate was
//    built to avoid.
//
//  • Payload is bounded. Up to CARDS_PER_VERTICAL rich cards, then the REMAINING
//    scripts degrade to a plain link list. That keeps the HTML small on the big
//    verticals while guaranteeing that every single script in the category is
//    reachable by one click from this page — no orphans, no "load more" that a
//    crawler cannot execute.
//
//  • A category with fewer than MIN_SCRIPTS_TO_INDEX scripts still RENDERS (the
//    links still flow) but is marked `noindex`. Same philosophy as the /v/[id]
//    quality gate in lib/publicVideos.ts: render for humans, index only with
//    substance.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import CopyButton from '@/components/CopyButton'
import {
  CARDS_PER_VERTICAL,
  generateFromScriptHref,
  getScriptLibrary,
  getScriptVertical,
  MIN_SCRIPTS_TO_INDEX,
  PUBLIC_BASE_URL,
  SCRIPT_VERTICALS,
  SCRIPT_VERTICAL_SLUGS,
  type LibraryScript,
} from '@/lib/scriptLibrary'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED } from '@/lib/publicSurfacePolicy'
import { toolActivationHref } from '@/lib/toolActivationHref'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const revalidate = 3600
export const dynamicParams = false

const BLUE = '#2997ff'
const MUTED = '#86868b'
const CARD = { background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(255,255,255,0.08)' }

// EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026; janela
// 30/07–26/08): esta URL apareceu 44 vezes para a consulta exata
// "youtube shorts exoplanet life script 40 seconds", posição média 5,5, e
// recebeu zero clique. A resposta abaixo é deliberadamente específica: entrega
// primeiro o que a pessoa procurou e só depois oferece o produto.
const SPACE_EXOPLANET_CAMPAIGN = 'script_library_space_exoplanet_40s'
const SPACE_EXOPLANET_TITLE = '40-Second Exoplanet Life Script (Free) | Kineo'
const SPACE_EXOPLANET_DESCRIPTION = 'Copy a complete 90-word YouTube Shorts script about exoplanet life, written for about 40 seconds, or open the exact draft in Kineo.'
const SPACE_EXOPLANET_SCRIPT = `HOOK: The first message from alien life may not be a message at all.
MICRO REWARD: When a planet crosses its star, a thin ring of starlight passes through the atmosphere and leaves chemical fingerprints.
ESCALATION: NASA says Webb can study gases such as water, carbon dioxide, oxygen, and methane. But one gas is not proof. Scientists need several clues, repeat observations, and years of modeling to rule out lifeless chemistry.
PAYOFF: So the first evidence of life beyond Earth may arrive as a suspicious recipe in light from a world we can never touch.`
const SPACE_EXOPLANET_SPOKEN_WORDS = SPACE_EXOPLANET_SCRIPT
  .replace(/^(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF):\s*/gm, '')
  .trim()
  .split(/\s+/)
  .length

function SpaceSearchIntentSpotlight() {
  const createHref = toolActivationHref({
    prompt: SPACE_EXOPLANET_SCRIPT,
    campaign: SPACE_EXOPLANET_CAMPAIGN,
    scriptMode: 'verbatim',
    duration: 45,
  })

  return (
    <section
      aria-labelledby="exoplanet-script-title"
      style={{
        marginTop: 34,
        padding: 'clamp(20px, 4vw, 30px)',
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(19,35,65,.96), rgba(8,12,24,.96))',
        border: '1px solid rgba(92,179,255,.32)',
        boxShadow: '0 18px 60px rgba(0,0,0,.28)',
      }}
    >
      <div style={{ color: '#5cb3ff', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Exact 40-second example · free to use
      </div>
      <h2 id="exoplanet-script-title" style={{ margin: '8px 0 8px', fontSize: 'clamp(1.25rem, 3.5vw, 1.7rem)', lineHeight: 1.2 }}>
        YouTube Shorts exoplanet life script (about 40 seconds)
      </h2>
      <p style={{ margin: 0, color: '#b8c4d8', lineHeight: 1.65, fontSize: '0.92rem' }}>
        {SPACE_EXOPLANET_SPOKEN_WORDS} spoken words. The hook opens a mystery, the middle gives the mechanism, and the payoff closes on the idea that alien life may first appear as chemistry—not a signal.
      </p>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          margin: '18px 0 14px',
          padding: 18,
          borderRadius: 13,
          background: 'rgba(0,0,0,.38)',
          border: '1px solid rgba(255,255,255,.09)',
          color: '#f5f5f7',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.86rem',
          lineHeight: 1.72,
        }}
      >
        {SPACE_EXOPLANET_SCRIPT}
      </pre>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <CopyButton text={SPACE_EXOPLANET_SCRIPT} label="Copy the 40-second script" />
        <OrganicCtaLink
          href={createHref}
          source={SPACE_EXOPLANET_CAMPAIGN}
          placement="exact_answer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 38,
            background: BLUE,
            color: '#000',
            fontWeight: 900,
            padding: '8px 15px',
            borderRadius: 9,
            textDecoration: 'none',
            fontSize: '0.82rem',
          }}
        >
          Turn this exact script into a video →
        </OrganicCtaLink>
      </div>
      <p style={{ margin: '12px 0 0', color: MUTED, lineHeight: 1.55, fontSize: '0.78rem' }}>
        The video handoff keeps the words unchanged and opens the closest supported preset (45 seconds) so there is room for natural pacing. Review before generating; nothing renders from this page.
      </p>
      <p style={{ margin: '14px 0 0', color: '#657087', lineHeight: 1.55, fontSize: '0.75rem' }}>
        Fact basis:{' '}
        <a href="https://science.nasa.gov/exoplanets/can-we-find-life/" target="_blank" rel="noreferrer" style={{ color: '#8cc8ff' }}>
          NASA on atmospheric biosignatures
        </a>{' '}
        and{' '}
        <a href="https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-would-earths-atmosphere-look-like-from-the-james-webb-space-telescope/" target="_blank" rel="noreferrer" style={{ color: '#8cc8ff' }}>
          Webb transmission spectroscopy
        </a>
        . NASA cautions that one signal is not a discovery; confirmation needs multiple lines of evidence.
      </p>
    </section>
  )
}

export function generateStaticParams() {
  return SCRIPT_VERTICAL_SLUGS.map((vertical) => ({ vertical }))
}

export async function generateMetadata({ params }: { params: { vertical: string } }): Promise<Metadata> {
  const v = getScriptVertical(params.vertical)
  if (!v) return {}
  const customerLibraryEnabled = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean
  const isStaticSpaceAnswer = v.slug === 'space'
  const url = `${PUBLIC_BASE_URL}/scripts/${v.slug}`

  // The privacy lockdown disables enumeration of customer scripts, not
  // founder-authored editorial answers. /scripts/space remains public with one
  // static script and zero database reads; every other shelf stays fail-closed.
  if (!customerLibraryEnabled && !isStaticSpaceAnswer) {
    return {
      title: `Create an original ${v.label} Short | Kineo`,
      description: `Generate your own original ${v.noun} Short. Customer scripts are private by default.`,
      robots: { index: false, follow: true, noarchive: true },
    }
  }
  const lib = customerLibraryEnabled ? await getScriptLibrary() : null
  const count = lib?.counts[v.slug] ?? 0

  // The title is written to match the search, not to be clever: the head term
  // ("free youtube shorts scripts about X") plus the number, which is the thing
  // that earns the click in a SERP full of listicles.
  const title = isStaticSpaceAnswer
    ? SPACE_EXOPLANET_TITLE
    : count
    ? `Free YouTube Shorts scripts about ${v.noun} — ${count} full scripts you can use`
    : `Free YouTube Shorts scripts about ${v.noun} — Kineo`
  const description = isStaticSpaceAnswer
    ? SPACE_EXOPLANET_DESCRIPTION
    : count
    ? `${count} complete ${v.noun} Shorts scripts, free to read and reuse. Each one is the full narration of a real vertical video — hook, middle beats and payoff — with the finished Short next to it.`
    : `Complete ${v.noun} Shorts scripts, free to read and reuse — hook, middle beats and payoff, with the finished Short next to each one.`

  return {
    metadataBase: new URL(PUBLIC_BASE_URL),
    title,
    description,
    alternates: { canonical: `/scripts/${v.slug}` },
    // Thin category → rendered, linked, but never offered to the index.
    robots: isStaticSpaceAnswer || count >= MIN_SCRIPTS_TO_INDEX ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function ScriptCard({ script, campaign }: { script: LibraryScript; campaign: string }) {
  return (
    <article style={{ ...CARD, borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, lineHeight: 1.35 }}>
        <Link href={script.href} style={{ color: '#f5f5f7', textDecoration: 'none' }}>
          {script.title}
        </Link>
      </h3>
      <p style={{ margin: 0, color: MUTED, fontSize: '0.88rem', lineHeight: 1.6 }}>{script.excerpt}</p>
      <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={script.href} style={{ color: BLUE, fontWeight: 800, fontSize: '0.86rem', textDecoration: 'none' }}>
          Read the full script →
        </Link>
        <OrganicCtaLink
          href={generateFromScriptHref(script.title, campaign)}
          source={campaign}
          placement="card"
          style={{ color: '#CBD5E1', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}
        >
          Generate a Short from it
        </OrganicCtaLink>
        <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>
          {script.wordCount} words
          {script.isStructuredScript ? ' · beat-by-beat' : ''}
        </span>
      </div>
    </article>
  )
}

export default async function ScriptVerticalPage({ params }: { params: { vertical: string } }) {
  const v = getScriptVertical(params.vertical)
  if (!v) notFound()
  const customerLibraryEnabled = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean
  const isStaticSpaceAnswer = v.slug === 'space'
  if (!customerLibraryEnabled && !isStaticSpaceAnswer) redirect('/scripts')

  // Privacy invariant: the static answer path does not even invoke the
  // customer-library loader while public customer surfaces are disabled.
  const lib = customerLibraryEnabled ? await getScriptLibrary() : null
  const all = lib?.byVertical[v.slug] ?? []
  const cards = all.slice(0, CARDS_PER_VERTICAL)
  const rest = all.slice(CARDS_PER_VERTICAL)
  const campaign = `script_library_${v.slug}`
  const others = lib
    ? SCRIPT_VERTICALS.filter((o) => o.slug !== v.slug && (lib.counts[o.slug] ?? 0) >= MIN_SCRIPTS_TO_INDEX)
    : []

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Free YouTube Shorts scripts about ${v.noun}`,
    description: v.intro,
    url: `${PUBLIC_BASE_URL}/scripts/${v.slug}`,
    numberOfItems: all.length,
    // Capped at the rendered cards: an ItemList must describe what is actually
    // on the page, and 200 entries of markup for links a user cannot see is
    // noise a parser will discount anyway.
    itemListElement: cards.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.title,
      url: `${PUBLIC_BASE_URL}${s.href}`,
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: PUBLIC_BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shorts Script Library', item: `${PUBLIC_BASE_URL}/scripts` },
      { '@type': 'ListItem', position: 3, name: v.label, item: `${PUBLIC_BASE_URL}/scripts/${v.slug}` },
    ],
  }

  const exactScriptJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: '40-second YouTube Shorts script about exoplanet life',
    description: SPACE_EXOPLANET_DESCRIPTION,
    text: SPACE_EXOPLANET_SCRIPT,
    inLanguage: 'en',
    url: `${PUBLIC_BASE_URL}/scripts/space`,
    author: { '@type': 'Organization', name: 'Kineo', url: PUBLIC_BASE_URL },
    isBasedOn: [
      'https://science.nasa.gov/exoplanets/can-we-find-life/',
      'https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-would-earths-atmosphere-look-like-from-the-james-webb-space-telescope/',
    ],
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {all.length >= MIN_SCRIPTS_TO_INDEX && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      {isStaticSpaceAnswer && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(exactScriptJsonLd).replace(/</g, '\\u003c') }}
        />
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 26 }}>
          <Link href="/" style={{ color: BLUE, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>
            Kineo
          </Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <Link href="/scripts" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>
            Shorts Script Library
          </Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / {v.label}</span>
        </nav>

        <header>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4.6vw, 2.4rem)', fontWeight: 900, lineHeight: 1.18, margin: 0 }}>
            {v.slug === 'space' ? 'Free space scripts for YouTube Shorts' : v.h1}
          </h1>
          <p style={{ fontSize: '1rem', color: '#CBD5E1', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 660 }}>
            {v.intro}
          </p>
          <p style={{ fontSize: '0.86rem', color: MUTED, margin: '12px 0 0' }}>
            {lib ? `${all.length} script${all.length === 1 ? '' : 's'} in this topic` : '1 editorial script'} · free to read, no sign-up
            {v.hasNichePage && (
              <>
                {' · '}
                <Link href={`/free-ai-shorts/${v.slug}`} style={{ color: BLUE, textDecoration: 'none' }}>
                  {v.label} generator
                </Link>
              </>
            )}
          </p>
          {lib && (
            <OrganicCtaLink
              href={generateFromScriptHref(cards[0]?.title ?? v.h1, campaign)}
              source={campaign}
              placement="hero"
              style={{
                display: 'inline-block',
                marginTop: 20,
                background: BLUE,
                color: '#000',
                fontWeight: 900,
                padding: '14px 28px',
                borderRadius: 13,
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              Generate a {v.label} Short free →
            </OrganicCtaLink>
          )}
        </header>

        {v.slug === 'space' && <SpaceSearchIntentSpotlight />}

        {lib && (cards.length > 0 ? (
          <section style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 16px' }}>
              {rest.length > 0 ? `The ${cards.length} newest ${v.noun} scripts` : `All ${cards.length} ${v.noun} scripts`}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {cards.map((s) => (
                <ScriptCard key={s.id} script={s} campaign={campaign} />
              ))}
            </div>
          </section>
        ) : (
          <section style={{ marginTop: 44, ...CARD, borderRadius: 16, padding: 22 }}>
            <p style={{ margin: 0, color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.6 }}>
              No {v.noun} script has been published to the library yet — the ones being produced right now land here
              first. In the meantime, the{' '}
              <Link href="/scripts" style={{ color: BLUE, textDecoration: 'none' }}>
                full library
              </Link>{' '}
              has {lib.total} scripts across every other topic.
            </p>
          </section>
        ))}

        {/* Every remaining script in this vertical, as plain links. Bounded HTML,
            zero orphans: a crawler reaches all of them from this one page. */}
        {rest.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 6px' }}>
              Every other {v.noun} script ({rest.length})
            </h2>
            <p style={{ color: MUTED, fontSize: '0.86rem', margin: '0 0 12px' }}>
              The rest of the topic, oldest to newest. Each link opens the full script.
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, columns: '2 260px', columnGap: 28 }}>
              {rest.map((s) => (
                <li key={s.id} style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.75, breakInside: 'avoid' }}>
                  <Link href={s.href} style={{ color: '#CBD5E1', textDecoration: 'none' }}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lib && <section style={{ marginTop: 48, textAlign: 'center', ...CARD, borderRadius: 18, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>Make a {v.label} Short from any of these</h2>
          <p style={{ color: '#CBD5E1', margin: '10px 0 18px', fontSize: '0.94rem', lineHeight: 1.6 }}>
            Kineo writes the script, records the voiceover, burns in the captions and matches footage to every beat.
            {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours, no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href={generateFromScriptHref(cards[0]?.title ?? v.h1, campaign)}
            source={campaign}
            placement="final"
            style={{
              display: 'inline-block',
              background: BLUE,
              color: '#000',
              fontWeight: 900,
              padding: '14px 30px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: '1.01rem',
            }}
          >
            Start free →
          </OrganicCtaLink>
        </section>}

        {/* Cross-links: sideways to the other verticals, and across to the
            matching /free-ai-shorts/[niche] generator pages. */}
        {lib && <section style={{ marginTop: 42 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 10px' }}>Other script topics</h2>
          <p style={{ fontSize: '0.88rem', lineHeight: 2, margin: 0 }}>
            {others.map((o, i) => (
              <span key={o.slug}>
                {i > 0 && <span style={{ color: '#374151' }}> · </span>}
                <Link href={`/scripts/${o.slug}`} style={{ color: BLUE, textDecoration: 'none' }}>
                  {o.label}
                </Link>
                <span style={{ color: '#4b5563' }}> ({lib.counts[o.slug]})</span>
              </span>
            ))}
          </p>
        </section>}

        <nav style={{ marginTop: 30, fontSize: '0.85rem', lineHeight: 2 }}>
          <span style={{ color: MUTED }}>Also useful: </span>
          {lib && (
            <Link href="/scripts" style={{ color: BLUE, textDecoration: 'none' }}>
              All {lib.total} scripts
            </Link>
          )}
          {v.hasNichePage && (
            <>
              {lib && <span style={{ color: '#374151' }}> · </span>}
              <Link href={`/free-ai-shorts/${v.slug}`} style={{ color: BLUE, textDecoration: 'none' }}>
                Free {v.label} Shorts generator
              </Link>
            </>
          )}
          <span style={{ color: '#374151' }}> · </span>
          <Link href="/free-script-generator" style={{ color: BLUE, textDecoration: 'none' }}>
            Free script generator
          </Link>
          <span style={{ color: '#374151' }}> · </span>
          <Link href="/free-hook-generator" style={{ color: BLUE, textDecoration: 'none' }}>
            Free hook generator
          </Link>
          <span style={{ color: '#374151' }}> · </span>
          <Link href="/examples" style={{ color: BLUE, textDecoration: 'none' }}>
            Example Shorts
          </Link>
          <span style={{ color: '#374151' }}> · </span>
          <Link href="/pricing" style={{ color: BLUE, textDecoration: 'none' }}>
            Pricing
          </Link>
        </nav>
      </div>
      <Footer />
    </main>
  )
}
