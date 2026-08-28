// KINEO-VS-2026-07-26 — /vs, the hub for the comparison cluster.
//
// Its structural job is internal linking: every comparison page links here and
// this page links to every comparison. It also states the editorial rules of
// the cluster in public — how facts were verified, what we refused to publish,
// and why Kineo appears where it does — because a comparison hub that does not
// say who is writing it is not worth reading.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import {
  ALTERNATIVES_SLUG,
  PAIRS,
  TOOLS,
  TOOLS_IN_PAIRS,
  VERIFIED_ON,
  VERIFIED_ON_ISO,
  otherTool,
  pairsForTool,
} from '@/lib/comparisons'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'vs_comparison_hub'
const FORM_ID = 'vs-hub-generator'
const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

const TITLE = 'AI Video Tool Comparisons (2026) — Verified Prices, Honest Verdicts'
const DESCRIPTION =
  'Head-to-head comparisons of the AI video tools people actually shortlist — OpusClip, Submagic, HeyGen, Synthesia, Pictory, Descript, Captions, Klap, quso.ai, Creatify. Every price read off the vendor’s own page and dated.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/vs` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE}/vs`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Tool Comparisons | Kineo',
    description: 'Verified 2026 pricing and a plain verdict on each pair. Most of these do not involve us at all.',
  },
}

const NEUTRAL = PAIRS.filter((x) => x.a !== 'kineo' && x.b !== 'kineo')
const HEAD_TO_HEAD = PAIRS.filter((x) => x.a === 'kineo' || x.b === 'kineo')

const HUB_FAQ: readonly { q: string; a: string }[] = [
  {
    q: 'Why do most of these comparisons not include Kineo?',
    a: 'Because a page where the publisher is one of the contestants is worth less to you, and you already know that. Most of the pairs here are two other tools judged against each other, with Kineo disclosed at the end as one option among several. The pages where Kineo is a contestant say so in the URL, every time.',
  },
  {
    q: 'How were the prices verified?',
    a: 'Every figure was read off the vendor’s own live pricing page on ' + VERIFIED_ON + ', and each page links the exact URL it came from. Where a vendor renders its tier table in a way we could not read, we say so and link out instead of publishing a number we are not sure of.',
  },
  {
    q: 'Are these affiliate links?',
    a: 'No. Nothing on these pages is sponsored, paid for, or an affiliate placement. Links to competitors go directly to their own pricing pages with no tracking added by us.',
  },
  {
    q: 'Why are some well-known tools missing?',
    a: 'A few widely-searched tools render their pricing client-side in a way we could not read from their own site. Rather than repeat a third-party figure, we left them out. Publishing a wrong competitor price is worse than publishing no page.',
  },
  {
    q: 'Why ' + PAIRS.length + ' comparisons and not all 55?',
    a: 'Eleven tools make 55 possible pairs. We publish ' + PAIRS.length + '. The nine we refused all involve Klap, whose full tier table is rendered client-side and did not resolve to readable prices when we checked, so any Klap page beyond the one we already have could only repeat that one observation. Every pair we did publish required complete verified data on both tools — full tier list, free-tier terms, watermark policy and export limits — plus at least one difference between them that is not made on any other page here.',
  },
  {
    q: 'How often is this updated?',
    a: 'Prices are re-checked when we touch the cluster, and every page carries the date it was last verified so you can judge for yourself how stale it is. If a figure is wrong, the date tells you how much to trust the rest.',
  },
]

export default function ComparisonsHubPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI video tool comparisons',
    numberOfItems: PAIRS.length,
    itemListElement: PAIRS.map((pair, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${TOOLS[pair.a].name} vs ${TOOLS[pair.b].name}`,
      url: `${BASE}/vs/${pair.slug}`,
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE}/vs` },
    ],
  }
  // KINEO-AEO-PAIRS-2026-08-03 — the hub had no dateModified, so the one page
  // whose entire pitch is "these prices are dated" carried no machine-readable
  // date. VERIFIED_ON_ISO is the day the competitor facts were checked, not a
  // build timestamp; if the human string is ever reworded past the parser, the
  // helper returns '' and the fields are omitted rather than emitted wrong.
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${BASE}/vs`,
    url: `${BASE}/vs`,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'Kineo', url: BASE },
    ...(VERIFIED_ON_ISO ? { dateModified: VERIFIED_ON_ISO, datePublished: VERIFIED_ON_ISO } : {}),
    publisher: { '@type': 'Organization', name: 'Kineo', url: BASE },
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HUB_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }

  const cardFor = (slug: string, aName: string, bName: string, why: string, badge: string) => (
    <Link
      key={slug}
      href={`/vs/${slug}`}
      style={{ ...CARD, padding: '18px 20px', textDecoration: 'none', color: '#f5f5f7', display: 'block' }}
    >
      <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>
        {badge}
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{aName} vs {bName}</div>
      <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.9rem', margin: '9px 0 0' }}>{why}</p>
      <div style={{ color: ACCENT, fontSize: '0.85rem', fontWeight: 800, marginTop: 11 }}>Read the comparison →</div>
    </Link>
  )

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>Comparisons</span>
        </nav>

        <span
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: ACCENT,
            border: '1px solid rgba(41,151,255,0.4)',
            background: 'rgba(41,151,255,0.12)',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          {PAIRS.length} comparisons — prices verified {VERIFIED_ON}
        </span>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          AI video tools, compared honestly
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 820 }}>
          Most comparison pages on the internet are written by one of the two companies being compared, which is why
          nobody believes them. {NEUTRAL.length} of the {PAIRS.length} pages below do not involve us at all — they judge two
          other tools against each other and mention Kineo once, at the end, clearly labelled. The other {HEAD_TO_HEAD.length}{' '}
          put Kineo up against a competitor and say so in the URL.
        </p>
        <p style={{ ...small, margin: '14px 0 0', maxWidth: 820 }}>
          Every price, free-tier detail and export limit was read off the vendor&rsquo;s own live pricing page on{' '}
          {VERIFIED_ON}, and each page links the exact URL. Nothing here is sponsored and there are no affiliate links.
        </p>

        <h2 style={h2}>Comparisons that do not involve us</h2>
        <p style={p}>
          These are the useful ones. Two competitors, judged on what each actually does, with the verdict stated at the
          top instead of buried under a feature grid.
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {NEUTRAL.map((pair) => cardFor(pair.slug, TOOLS[pair.a].name, TOOLS[pair.b].name, pair.whyItExists, 'Neutral'))}
        </div>

        <h2 style={h2}>Comparisons where we are one of the two</h2>
        <p style={p}>
          Declared in the slug so nobody is ambushed. On each of these we have tried to make the competitor&rsquo;s case as
          strongly as they would, and to say plainly where Kineo is the worse choice — which, on most of these pages, it
          is for at least some readers.
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {HEAD_TO_HEAD.map((pair) => cardFor(pair.slug, TOOLS[pair.a].name, TOOLS[pair.b].name, pair.whyItExists, 'Head-to-head'))}
        </div>

        {/* KINEO-AEO-PAIRS-2026-08-03 — browse by tool.
            Two flat grids worked at twelve pages and stop working at {PAIRS.length}: nobody
            scans forty cards looking for one product name. This index is the
            navigable view — pick the tool you are actually shopping for and see
            every comparison it appears in, plus its /alternatives page where one
            exists. It is also the internal-linking layer: without it the pages
            added last would sit at the bottom of one long grid with a single
            inbound link each. */}
        <h2 style={h2}>Browse by tool</h2>
        <p style={p}>
          Every comparison each tool appears in, and its single-tool page where one exists. If you already know what you
          are replacing, start here rather than scrolling the grids above.
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {TOOLS_IN_PAIRS.map((tool) => {
            const list = pairsForTool(tool.id)
            const altSlug = ALTERNATIVES_SLUG[tool.id]
            return (
              <section key={tool.id} style={{ ...CARD, padding: '18px 20px' }}>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '0 0 4px' }}>{tool.name}</h3>
                <p style={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.5, margin: '0 0 10px' }}>
                  {tool.kind} · {list.length} comparison{list.length === 1 ? '' : 's'} · verified {tool.verified}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#d2d2d7', lineHeight: 1.75, fontSize: '0.9rem' }}>
                  {list.map((pair) => {
                    const other = TOOLS[otherTool(pair, tool.id)]
                    return (
                      <li key={pair.slug}>
                        <Link href={`/vs/${pair.slug}`} style={link}>
                          vs {other.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                {altSlug && (
                  <p style={{ margin: '10px 0 0', fontSize: '0.85rem' }}>
                    <Link href={`/alternatives/${altSlug}`} style={{ ...link, fontWeight: 700 }}>
                      {tool.name} alternatives →
                    </Link>
                  </p>
                )}
              </section>
            )
          })}
        </div>

        <h2 style={h2}>How these pages are written</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 750, margin: '0 0 8px' }}>Every fact came from the vendor, not from a roundup</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
              Third-party articles about AI video pricing disagree with each other constantly, because they copy each
              other and nobody re-checks. Each figure on these pages was read off the vendor&rsquo;s own published pricing
              page on {VERIFIED_ON}, and the page links that URL so you can check us.
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 750, margin: '0 0 8px' }}>Where we could not verify, we say so</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
              Several well-known tools render their tier tables in a way we could not read from their own site. Those are
              either left out entirely or marked as unverified with a link to check yourself. A wrong competitor price is
              worse than a missing one, and it is the single fastest way for a comparison site to lose the right to be
              believed.
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 750, margin: '0 0 8px' }}>{PAIRS.length} pages, not a generated grid</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
              Eleven tools make fifty-five possible pairs. We publish {PAIRS.length}. A pair only gets a page if we hold
              complete verified data on <em>both</em> tools — full tier list, free-tier terms, watermark policy and export
              limits — and if there is a real difference between them we can point at from those numbers. Nine pairs were
              refused outright because one side&rsquo;s pricing was not readable on its own site, and every card above
              carries the specific reason that pair earned a page.
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 750, margin: '0 0 8px' }}>The Kineo section sits at the bottom, labelled</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
              On a neutral comparison, the mention of our own product is an advertisement and is marked as one. It never
              appears in the verdict, the table or the recommendation. If we cannot win the argument above the line, we
              have not earned the click below it.
            </p>
          </section>
        </div>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {HUB_FAQ.map((item) => (
            <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{item.a}</p>
            </section>
          ))}
        </div>

        <h2 style={h2}>Or skip the shopping</h2>
        <p style={p}>
          If you got here because you have no footage and no script, that is the situation Kineo was built for. Type a
          topic and it returns a finished faceless 9:16 Short — script, AI voiceover, footage matched line by line,
          captions. {ft(OFFER, 'Three watermarked videos every 24 hours, no card.', OFFER.copy.headline)}
        </p>
        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          formId={FORM_ID}
          examples={[
            'Why the Door to Hell is still burning',
            'The money mistake most people repeat',
            'Three facts that make the ocean terrifying',
          ]}
        />

        <div
          style={{
            marginTop: 44,
            textAlign: 'center',
            background: 'radial-gradient(circle at 50% 0%, rgba(41,151,255,0.14), #0c0c0e 70%)',
            border: '1px solid rgba(41,151,255,0.25)',
            borderRadius: 18,
            padding: '34px 22px',
          }}
        >
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>Stop comparing. Make one and look at it.</div>
          <p style={{ color: MUTED, margin: '8px 0 18px' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours — no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href={`#${FORM_ID}`}
            source={CAMPAIGN}
            placement="final"
            analyticsEvent="organic_handoff_opened"
            focusTargetId={FORM_ID}
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Make my first video →
          </OrganicCtaLink>
        </div>

        <h2 style={h2}>Keep reading</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#d2d2d7', lineHeight: 1.9, fontSize: '0.95rem' }}>
          <li><Link href="/best-ai-shorts-generators" style={link}>Best AI Shorts generators</Link> — the wider landscape, including tools not compared here.</li>
          <li><Link href="/alternatives" style={link}>Alternatives to specific tools</Link> — the single-tool pages, if you already know what you are replacing.</li>
          <li><Link href="/youtube-automation" style={link}>YouTube automation, honestly</Link> — which pipeline steps genuinely automate and which do not.</li>
          <li><Link href="/how-much-do-youtube-shorts-pay" style={link}>How much do YouTube Shorts pay?</Link> — the number that decides whether any of this pays for itself.</li>
          <li><Link href="/faceless-video-generator" style={link}>Faceless video generator</Link> — the production layer itself.</li>
        </ul>

        <p style={{ ...small, marginTop: 32, marginBottom: 0 }}>
          All competitor prices, free-tier terms and limits across this cluster were verified on {VERIFIED_ON} from each
          vendor&rsquo;s own published pricing page and may have changed since. Nothing here is sponsored, affiliated or
          paid for, and no link on these pages carries affiliate tracking. Kineo is a product of the company that
          publishes this site, which is disclosed on every comparison whether or not Kineo is one of the tools judged.
        </p>
      </div>
      <Footer />
    </main>
  )
}
