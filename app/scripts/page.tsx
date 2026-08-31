// KINEO-SCRIPT-LIBRARY-2026-08-03 — /scripts, the hub that de-orphans /v/[id].
//
// The problem this page solves, stated plainly: 575 `/v/[id]` pages are already
// live, indexable, and carry a full script plus VideoObject JSON-LD — and NOT
// ONE of them has an internal link pointing at it. Google has crawled them
// (they are in /video-sitemap.xml) but a sitemap only announces a URL; it does
// not give it any internal authority. Search Console has logged 8 web-search
// clicks in the entire history of the domain. Orphans do not rank.
//
// So this hub exists to do exactly three things, in priority order:
//   1. Give every script page a real parent, one click from the site root.
//   2. Split the collection into VERTICALS that match how people actually
//      search ("youtube shorts script about money"), reusing the slugs that
//      already exist in /free-ai-shorts/[niche] instead of inventing new ones.
//   3. Send the traffic somewhere: every script has a "Generate a Short from
//      this script" CTA on the existing /signup?prompt=… contract.
//
// ISR, not force-dynamic: rendered once an hour, so a crawl never touches
// Supabase and the page is served from the edge cache.
import ExitIntentOffer from '@/components/ExitIntentOffer'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import {
  getScriptLibrary,
  generateFromScriptHref,
  getScriptVertical,
  HUB_RECENT_COUNT,
  MIN_SCRIPTS_TO_INDEX,
  PUBLIC_BASE_URL,
  SCRIPT_VERTICALS,
  type LibraryScript,
} from '@/lib/scriptLibrary'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED } from '@/lib/publicSurfacePolicy'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const revalidate = 3600

const BLUE = '#2997ff'
const MUTED = '#86868b'
const CARD = { background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(255,255,255,0.08)' }
const CAMPAIGN = 'script_library_hub'
const PRIVATE_FORM_CAMPAIGN = 'script_library_private_topic_v1'

export const metadata: Metadata = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED ? {
  metadataBase: new URL(PUBLIC_BASE_URL),
  title: 'Free YouTube Shorts Scripts — the Kineo Shorts Script Library',
  description:
    'Hundreds of complete YouTube Shorts scripts you can read and reuse for free — money, mystery, history, countries, space, animals and more. Every script is the full narration of a Short that was actually produced, hook to payoff.',
  alternates: { canonical: '/scripts' },
  openGraph: {
    title: 'Free YouTube Shorts Scripts — Kineo Shorts Script Library',
    description:
      'Hundreds of complete, ready-to-record YouTube Shorts scripts, sorted by topic. Free to read, free to reuse.',
    url: `${PUBLIC_BASE_URL}/scripts`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free YouTube Shorts Scripts — Kineo',
    description: 'Hundreds of complete YouTube Shorts scripts, sorted by topic. Free to read and reuse.',
  },
} : {
  metadataBase: new URL(PUBLIC_BASE_URL),
  title: 'Create an original YouTube Shorts script | Kineo',
  description: 'Generate your own original Short with a hook, middle beats and payoff. Customer scripts are private by default.',
  alternates: { canonical: '/scripts' },
  robots: { index: false, follow: true, noarchive: true },
}

function ScriptCard({ script }: { script: LibraryScript }) {
  const vertical = getScriptVertical(script.vertical)
  return (
    <article style={{ ...CARD, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: '0.72rem', color: BLUE, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {vertical?.label ?? 'Shorts script'}
        {script.isStructuredScript ? ' · beat-by-beat' : ''}
      </div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, lineHeight: 1.35 }}>
        <Link href={script.href} style={{ color: '#f5f5f7', textDecoration: 'none' }}>
          {script.title}
        </Link>
      </h3>
      <p style={{ margin: 0, color: MUTED, fontSize: '0.86rem', lineHeight: 1.55 }}>{script.excerpt}</p>
      <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={script.href} style={{ color: BLUE, fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none' }}>
          Read the full script →
        </Link>
        <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>{script.wordCount} words</span>
      </div>
    </article>
  )
}

export default async function ScriptsHubPage() {
  if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) {
    return (
      <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 18px 72px' }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 34 }}>
            <Link href="/" style={{ color: BLUE, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>Kineo</Link>
            <span style={{ color: MUTED, fontSize: '0.85rem' }}> / Scripts</span>
          </nav>
          <section
            data-customer-script-library="private"
            style={{ textAlign: 'center', padding: '42px 22px', borderRadius: 20, ...CARD }}
          >
            <p style={{ color: BLUE, fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Private by default
            </p>
            <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.7rem)', fontWeight: 900, lineHeight: 1.15, margin: '14px 0 0' }}>
              Create an original Shorts script
            </h1>
            <p style={{ fontSize: '1rem', color: '#CBD5E1', lineHeight: 1.65, margin: '18px auto 0', maxWidth: 600 }}>
              Customer videos and scripts are not published to a shared library. Start with your own idea and Kineo will build the hook, middle beats and payoff for you.
            </p>
            <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'left' }}>
              <TopicGeneratorForm
                campaign={PRIVATE_FORM_CAMPAIGN}
                source="script_library_private"
                placement="private_topic_form"
                formId="script-library-original-topic"
                scriptMode="ai"
                duration={35}
                creationIntent="fast"
                preserveHandoffForSignedIn
                analyticsVariant={PRIVATE_FORM_CAMPAIGN}
                marginTop={24}
                copy={{
                  label: 'What should your original Short be about?',
                  placeholder: 'Paste one topic, fact, story or hook',
                  submit: 'Build my original Short →',
                  examplesLabel: 'Try an original direction',
                  note: 'Your idea stays attached through signup and arrives editable in Studio. Nothing renders until you review and continue.',
                }}
              />
            </div>
            <p style={{ margin: '16px 0 0', fontSize: '0.86rem' }}>
              <Link href="/examples" style={{ color: '#CBD5E1', textDecoration: 'none' }}>
                Watch Kineo-owned examples instead →
              </Link>
            </p>
          </section>
        </div>
        <Footer />
      </main>
    )
  }
  const lib = await getScriptLibrary()
  const recent = lib.scripts.slice(0, HUB_RECENT_COUNT)
  // Only verticals with enough substance to be worth a click are promoted; the
  // thin ones are still linked from the full nav below so nothing is orphaned.
  const populated = SCRIPT_VERTICALS.filter((v) => (lib.counts[v.slug] ?? 0) > 0)
  const featured = populated.filter((v) => (lib.counts[v.slug] ?? 0) >= MIN_SCRIPTS_TO_INDEX)

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Kineo Shorts Script Library',
    description: `Free YouTube Shorts scripts, sorted by topic. ${lib.total} complete scripts across ${featured.length} categories.`,
    url: `${PUBLIC_BASE_URL}/scripts`,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', name: 'Kineo', url: PUBLIC_BASE_URL },
    // The ItemList enumerates the CATEGORIES, not all 575 scripts: a list that
    // large is noise to a parser and the per-vertical pages carry their own
    // ItemList of the actual scripts.
    mainEntity: {
      '@type': 'ItemList',
      name: 'Shorts script categories',
      numberOfItems: featured.length,
      itemListElement: featured.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: v.label,
        url: `${PUBLIC_BASE_URL}/scripts/${v.slug}`,
      })),
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: PUBLIC_BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shorts Script Library', item: `${PUBLIC_BASE_URL}/scripts` },
    ],
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 28 }}>
          <Link href="/" style={{ color: BLUE, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>
            Kineo
          </Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / Shorts Script Library</span>
        </nav>

        <header style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.7rem)', fontWeight: 900, lineHeight: 1.15, margin: 0 }}>
            Free YouTube Shorts scripts
          </h1>
          <p style={{ fontSize: '1.02rem', color: '#CBD5E1', lineHeight: 1.65, margin: '18px auto 0', maxWidth: 680 }}>
            {lib.total > 0 ? (
              <>
                <b style={{ color: '#f5f5f7' }}>{lib.total} complete Shorts scripts</b>, free to read and free to
                reuse. Every one of them is the real narration of a vertical Short that was actually produced with
                Kineo — the hook, the middle beats and the payoff, in the order they were spoken. No sign-up to read
                them.
              </>
            ) : (
              <>
                Complete Shorts scripts, free to read and free to reuse — the hook, the middle beats and the payoff of
                real vertical videos produced with Kineo.
              </>
            )}
          </p>
          <p style={{ fontSize: '0.85rem', color: MUTED, margin: '12px 0 0' }}>
            Sorted into {featured.length} topics · updated as new Shorts are published
          </p>
          <OrganicCtaLink
            href={generateFromScriptHref('A viral YouTube Short about a surprising fact', CAMPAIGN)}
            source={CAMPAIGN}
            placement="hero"
            style={{
              display: 'inline-block',
              marginTop: 22,
              background: BLUE,
              color: '#000',
              fontWeight: 900,
              padding: '15px 32px',
              borderRadius: 14,
              textDecoration: 'none',
              fontSize: '1.03rem',
            }}
          >
            Generate your own Short free →
          </OrganicCtaLink>
        </header>

        {/* ── Browse by topic ─────────────────────────────────────────────── */}
        <section style={{ marginTop: 52 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 6px' }}>Browse scripts by topic</h2>
          <p style={{ color: MUTED, fontSize: '0.9rem', margin: '0 0 18px' }}>
            Each topic page lists the full scripts for that vertical, newest first.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {featured.map((v) => (
              <Link
                key={v.slug}
                href={`/scripts/${v.slug}`}
                style={{ ...CARD, borderRadius: 14, padding: 16, textDecoration: 'none', color: '#f5f5f7', display: 'block' }}
              >
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{v.label}</div>
                <div style={{ color: BLUE, fontWeight: 800, fontSize: '0.82rem', marginBottom: 8 }}>
                  {lib.counts[v.slug]} script{lib.counts[v.slug] === 1 ? '' : 's'}
                </div>
                <p style={{ margin: 0, color: MUTED, fontSize: '0.84rem', lineHeight: 1.5 }}>
                  {v.intro.split('.')[0]}.
                </p>
              </Link>
            ))}
          </div>
          {/* Topics too small to earn a card still get a link. A thin category
              is rendered `noindex` (see /scripts/[vertical]), but leaving it
              unlinked would orphan it — and orphaning pages is the exact
              problem this whole hub exists to fix. */}
          {populated.length > featured.length && (
            <p style={{ margin: '14px 0 0', fontSize: '0.85rem', color: MUTED, lineHeight: 1.9 }}>
              Just getting started:{' '}
              {populated
                .filter((v) => (lib.counts[v.slug] ?? 0) < MIN_SCRIPTS_TO_INDEX)
                .map((v, i) => (
                  <span key={v.slug}>
                    {i > 0 && <span style={{ color: '#374151' }}> · </span>}
                    <Link href={`/scripts/${v.slug}`} style={{ color: '#CBD5E1', textDecoration: 'none' }}>
                      {v.label}
                    </Link>
                    <span style={{ color: '#4b5563' }}> ({lib.counts[v.slug]})</span>
                  </span>
                ))}
            </p>
          )}
        </section>

        {/* ── Newest scripts ──────────────────────────────────────────────── */}
        {recent.length > 0 && (
          <section style={{ marginTop: 52 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 6px' }}>Newest scripts</h2>
            <p style={{ color: MUTED, fontSize: '0.9rem', margin: '0 0 18px' }}>
              The {recent.length} most recent Shorts published from the library.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {recent.map((s) => (
                <ScriptCard key={s.id} script={s} />
              ))}
            </div>
          </section>
        )}

        {/* ── How to use a script ─────────────────────────────────────────── */}
        <section style={{ marginTop: 52 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 14px' }}>How to use a script from this library</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              {
                n: '1',
                t: 'Read the whole thing',
                d: 'Open any script page. The full narration is on the page — hook, middle beats, payoff — next to the Short it produced, so you can see how the words land on screen.',
              },
              {
                n: '2',
                t: 'Take the structure, change the facts',
                d: 'The retention comes from the shape: a hook in the first two seconds, a reward every few seconds, an escalation, then a payoff worth saving. Swap in your own topic and keep the shape.',
              },
              {
                n: '3',
                t: 'Let the generator build the video',
                d: `Hand the idea to Kineo and it writes the script, records the voiceover, burns in the captions and matches footage to every beat. ${ft(OFFER, 'Up to 3 watermarked Fast videos every 24h, no card.', OFFER.copy.headline)}`,
              },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 14, padding: 16 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'rgba(41,151,255,0.12)',
                    color: BLUE,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  {s.n}
                </div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.86rem', color: MUTED, lineHeight: 1.55 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section style={{ marginTop: 52, textAlign: 'center', ...CARD, borderRadius: 18, padding: '30px 20px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, margin: 0 }}>Turn any of these ideas into a video</h2>
          <p style={{ color: '#CBD5E1', margin: '10px 0 20px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Type a topic, get a 9:16 Short with script, voiceover, captions and footage in a few minutes. {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours, no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href={generateFromScriptHref('A viral YouTube Short about a surprising fact', CAMPAIGN)}
            source={CAMPAIGN}
            placement="final"
            style={{
              display: 'inline-block',
              background: BLUE,
              color: '#000',
              fontWeight: 900,
              padding: '14px 30px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: '1.02rem',
            }}
          >
            Start free →
          </OrganicCtaLink>
        </section>

        {/* ── Cross-links into the niche cluster that already ranks ───────── */}
        <section style={{ marginTop: 46 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 12px' }}>Generators by niche</h2>
          <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 12px' }}>
            Want the tool rather than the script? Each topic here has a matching free generator page.
          </p>
          <p style={{ fontSize: '0.88rem', lineHeight: 2, margin: 0 }}>
            {populated
              .filter((v) => v.hasNichePage)
              .map((v, i) => (
                <span key={v.slug}>
                  {i > 0 && <span style={{ color: '#374151' }}> · </span>}
                  <Link href={`/free-ai-shorts/${v.slug}`} style={{ color: BLUE, textDecoration: 'none' }}>
                    {v.label} generator
                  </Link>
                </span>
              ))}
          </p>
        </section>

        <nav style={{ marginTop: 36, fontSize: '0.85rem', lineHeight: 2 }}>
          <span style={{ color: MUTED }}>More from Kineo: </span>
          {[
            ['/examples', 'Example Shorts'],
            ['/free-script-generator', 'Free script generator'],
            ['/free-hook-generator', 'Free hook generator'],
            ['/youtube-shorts-from-topic', 'Topic to Short'],
            ['/faceless-video-generator', 'Faceless video generator'],
            ['/faceless-channel-ideas', 'Faceless channel ideas'],
            ['/niche-picker', 'Niche picker'],
            ['/pricing', 'Pricing'],
          ].map(([href, label], i) => (
            <span key={href}>
              {i > 0 && <span style={{ color: '#374151' }}> · </span>}
              <Link href={href} style={{ color: BLUE, textDecoration: 'none' }}>
                {label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
      <Footer />
          {/* AQUISICAO 4 (14/08) — exit-intent de cadastro no hub de scripts. */}
      <ExitIntentOffer variant="free" />
    </main>
  )
}
