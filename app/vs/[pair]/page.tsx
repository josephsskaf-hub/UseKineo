// KINEO-VS-2026-07-26 — /vs/[a]-vs-[b], the comparison cluster.
//
// THE BET: comparison queries are the highest purchase-intent searches in SaaS
// and are badly served, because vendors only publish "us vs them" pages that
// readers correctly discount. Eight of the twelve pages this route renders are
// NEUTRAL — two competitors judged against each other with Kineo absent from
// the argument and disclosed at the end as a third option. The other four are
// Kineo head-to-heads, declared in the slug so nobody is ambushed.
//
// Every competitor fact rendered here comes from lib/comparisons.ts, which is
// the single source of truth: each price and limit was read off the vendor's
// own live page on the date in VERIFIED_ON, with the exact URL recorded. Facts
// we could not verify are stated as unverified and linked out, never guessed.
//
// SLUG CANONICALISATION: the canonical slug puts the two tool slugs in
// alphabetical order, so there is exactly one indexable URL per pair. The
// reverse order (/vs/submagic-vs-opus-clip) also resolves, so a reader who
// types it or links it does not hit a 404 — but it serves a small pointer stub
// that forwards to the canonical URL, never a second copy of the article.
//
// Why a stub and not redirect(): on Next 14.2.5, redirect() inside a
// prerendered App Router page is broken. next/dist/export/routes/app-page.js
// builds the .meta headers from `metadata.headers` only and never merges the
// mocked response headers unless PPR is enabled, so the export writes
// `status: 307` with no Location header. Verified against a production build
// and `next start`: the alias returned 307 and the browser had nowhere to go.
// The stub below is fully static and does the same job by three independent
// mechanisms — a zero-delay meta refresh (which Google documents as a redirect
// it follows), rel=canonical pointing at the real URL, and noindex/follow — so
// the duplicate never competes in the index and a human always lands right.
// If these ever need to become true 3xx redirects, that belongs in
// next.config.js, which is outside this agent's file surface.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { buildBlankStudioSignupHref } from '@/lib/growth/publicCreationIntent'
import {
  ALL_PAIR_SLUGS,
  ALTERNATIVES_SLUG,
  CANONICAL_SLUGS,
  SPEC_ROWS,
  TOOLS,
  VERIFIED_ON,
  VERIFIED_ON_ISO,
  canonicalFor,
  getPair,
  isCanonical,
  relatedPairs,
} from '@/lib/comparisons'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_MO } from '@/lib/marketingPrice'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'
export const dynamicParams = false

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'vs_comparison_cluster'
const START_FREE_URL = buildBlankStudioSignupHref({ campaign: CAMPAIGN })
const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

export function generateStaticParams() {
  return ALL_PAIR_SLUGS.map((pair) => ({ pair }))
}

export function generateMetadata({ params }: { params: { pair: string } }): Metadata {
  const canonical = canonicalFor(params.pair)
  if (!canonical) return { title: 'Comparison not found' }
  const pair = getPair(canonical)
  if (!pair) return { title: 'Comparison not found' }
  const url = `${BASE}/vs/${canonical}`

  // A reverse-order slug is a real URL people type and link, so it resolves —
  // but it must never compete with the canonical one in the index.
  if (!isCanonical(params.pair)) {
    return {
      title: pair.title,
      description: pair.description,
      alternates: { canonical: url },
      robots: { index: false, follow: true },
    }
  }

  return {
    title: pair.title,
    description: pair.description,
    alternates: { canonical: url },
    openGraph: {
      title: pair.title,
      description: pair.description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: pair.title,
      description: pair.description,
    },
  }
}

export default function ComparisonPage({ params }: { params: { pair: string } }) {
  const canonical = canonicalFor(params.pair)
  if (!canonical) notFound()

  const pair = getPair(canonical)
  if (!pair) notFound()

  // Reverse-order slug: forward, do not duplicate. See the note at the top.
  if (canonical !== params.pair) {
    const target = `/vs/${canonical}`
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#000',
          color: '#f5f5f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <meta httpEquiv="refresh" content={`0; url=${target}`} />
        <div style={{ ...CARD, padding: '28px 30px', maxWidth: 520, textAlign: 'center' }}>
          <p style={{ color: MUTED, fontSize: '0.9rem', margin: '0 0 10px' }}>
            This comparison has one address, and it is not this one.
          </p>
          <Link href={target} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 800, fontSize: '1.15rem' }}>
            {TOOLS[pair.a].name} vs {TOOLS[pair.b].name} →
          </Link>
          <p style={{ color: MUTED, fontSize: '0.85rem', margin: '14px 0 0' }}>
            Taking you there now. If nothing happens, use the link above.
          </p>
        </div>
      </main>
    )
  }

  const a = TOOLS[pair.a]
  const b = TOOLS[pair.b]
  const url = `${BASE}/vs/${canonical}`
  const kineoIsInvolved = pair.a === 'kineo' || pair.b === 'kineo'

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pair.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE}/vs` },
      { '@type': 'ListItem', position: 3, name: `${a.name} vs ${b.name}`, item: url },
    ],
  }
  // The two products being compared, as an ItemList. Deliberately no `offers`
  // node: our verified prices are tiered strings ("$19/member/month, or $12
  // billed yearly"), and flattening one of them into a single machine-readable
  // number would assert something narrower than what we actually checked.
  // KINEO-AEO-PAIRS-2026-08-03 — freshness, stated in a field a machine reads.
  // The page already printed "prices verified <date>" in the badge and in the
  // footnote, but only to humans. `dateModified` is the field answer engines
  // and Google both use to decide whether a comparison is current enough to
  // quote, and an undated comparison loses to a dated one every time. The value
  // is VERIFIED_ON_ISO — the date the competitor facts were actually checked —
  // not a build timestamp, which would claim freshness we did not earn.
  // If VERIFIED_ON is ever reworded into a shape isoDateFor() cannot parse, the
  // helper returns '' and both fields are dropped rather than emitted empty.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: pair.title,
    description: pair.description,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'Kineo', url: BASE },
    about: [a, b].map((t) => ({ '@type': 'SoftwareApplication', name: t.name, url: t.homepage })),
    ...(VERIFIED_ON_ISO ? { dateModified: VERIFIED_ON_ISO, datePublished: VERIFIED_ON_ISO } : {}),
    publisher: { '@type': 'Organization', name: 'Kineo', url: BASE },
    citation: [a.source, b.source],
  }
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${a.name} vs ${b.name}`,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    numberOfItems: 2,
    itemListElement: [a, b].map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: t.name,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        url: t.homepage,
        description: t.category,
      },
    })),
  }

  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const h3: CSSProperties = { fontSize: '1.02rem', fontWeight: 750, margin: '0 0 8px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }
  const th: CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    color: MUTED,
    fontWeight: 600,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }
  const cell: CSSProperties = { padding: '13px 16px', color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.9rem', verticalAlign: 'top' }

  // KINEO-AEO-PAIRS-2026-08-03 — with 46 pages, "the first six in the array"
  // pointed every page at the same six and left the rest of the cluster with no
  // inbound internal links at all. relatedPairs() ranks by shared tool, so a
  // reader on HeyGen vs Synthesia is offered the other HeyGen and Synthesia
  // pages — which is both better for them and the reason the deeper pages get
  // crawled.
  const others = relatedPairs(pair, 6)

  // The single-tool /alternatives pages that exist for these two tools. Not
  // every tool has one (Captions and Creatify do not), so this is filtered
  // rather than assumed — see ALTERNATIVES_SLUG in lib/comparisons.ts.
  const altLinks = [a, b]
    .map((t) => ({ name: t.name, slug: ALTERNATIVES_SLUG[t.id] }))
    .filter((x): x is { name: string; slug: string } => Boolean(x.slug))

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <Link href="/vs" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Comparisons</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>{a.name} vs {b.name}</span>
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
          {kineoIsInvolved ? 'Head-to-head' : 'Neutral comparison'} — prices verified {VERIFIED_ON}
        </span>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          {a.name} vs {b.name}
        </h1>

        {/* The verdict goes first. Nobody should have to scroll for it. */}
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 800 }}>
          {pair.verdictLead}
        </p>

        {!kineoIsInvolved && (
          <p style={{ ...small, margin: '16px 0 0', maxWidth: 800 }}>
            <strong style={{ color: '#d2d2d7' }}>Disclosure:</strong> this page is published by Kineo, which is not one of
            the two tools compared here and does not compete with either on the job they do. There is a short, clearly
            labelled note about Kineo at the bottom. Everything above it is written as if we had nothing at stake, because
            on this comparison we do not.
          </p>
        )}

        <h2 style={h2}>The verdict</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {pair.verdict.map((v) => (
            <section key={v.h} style={{ ...CARD, padding: '18px 20px' }}>
              <h3 style={h3}>{v.h}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{v.p}</p>
            </section>
          ))}
        </div>

        <h2 style={h2}>Side by side</h2>
        <p style={p}>
          Every figure below was read off each vendor&rsquo;s own pricing page on {VERIFIED_ON}. Where a tier table did not
          resolve to readable prices, the cell says so rather than guessing — a wrong competitor price is worse than no
          price at all.
        </p>
        <div style={{ ...CARD, padding: 4, margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 680 }}>
            <caption style={{ padding: '14px 16px', color: MUTED, fontSize: '0.82rem', textAlign: 'left' }}>
              {a.name} and {b.name} compared on the {SPEC_ROWS.length} things that decide it for a faceless-channel
              operator, each cell dated with the day it was read off the vendor&rsquo;s own page.
            </caption>
            <thead>
              <tr>
                <th style={th}>&nbsp;</th>
                <th style={th}>{a.name}</th>
                <th style={th}>{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {SPEC_ROWS.map((row) => (
                <tr key={row.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ ...cell, fontWeight: 700, color: '#f5f5f7', width: 170 }}>{row.label}</td>
                  <td style={cell}>{row.get(a)}</td>
                  <td style={cell}>{row.get(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={small}>
          Sources:{' '}
          <a href={a.source} target="_blank" rel="noopener noreferrer" style={link}>{a.name} pricing</a>
          {' · '}
          <a href={b.source} target="_blank" rel="noopener noreferrer" style={link}>{b.name} pricing</a>
          {' — '}both checked on {VERIFIED_ON}. Vendors change tiers without notice, so confirm on their site before you
          pay. If you find something here that is out of date, we would rather fix it than keep the click.
        </p>
        {a.note && <p style={small}><strong style={{ color: '#d2d2d7' }}>{a.name}:</strong> {a.note}</p>}
        {b.note && <p style={small}><strong style={{ color: '#d2d2d7' }}>{b.name}:</strong> {b.note}</p>}

        <h2 style={h2}>Which one you should pick</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <h3 style={{ ...h3, color: ACCENT }}>Pick {a.name} if…</h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.93rem' }}>
              {pair.pickA.map((item) => (
                <li key={item} style={{ margin: '0 0 8px' }}>{item}</li>
              ))}
            </ul>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <h3 style={{ ...h3, color: ACCENT }}>Pick {b.name} if…</h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.93rem' }}>
              {pair.pickB.map((item) => (
                <li key={item} style={{ margin: '0 0 8px' }}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <h2 style={h2}>The differences that actually matter</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {pair.differences.map((d) => (
            <section key={d.h} style={{ ...CARD, padding: '18px 20px' }}>
              <h3 style={h3}>{d.h}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{d.p}</p>
            </section>
          ))}
        </div>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {pair.faq.map((item) => (
            <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{item.a}</p>
            </section>
          ))}
        </div>

        {/* The Kineo section. On a neutral page this is a disclosed third
            option at the end, never a thumb on the scale further up. */}
        <h2 style={h2}>{kineoIsInvolved ? 'Where we stand' : 'One disclosed third option'}</h2>
        <section
          style={{
            ...CARD,
            padding: '20px 22px',
            borderColor: 'rgba(41,151,255,0.35)',
            background: 'radial-gradient(circle at 0% 0%, rgba(41,151,255,0.10), #161618 65%)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>
            {kineoIsInvolved ? 'Our own product · declared' : 'Advertisement for our own product'}
          </div>
          <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: '0 0 16px' }}>{pair.kineo}</p>
          <OrganicCtaLink
            href={START_FREE_URL}
            source={CAMPAIGN}
            placement={canonical}
            style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '12px 24px', borderRadius: 980, textDecoration: 'none' }}
          >
            Make one free →
          </OrganicCtaLink>
          <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · No card · Starter {STARTER_MO}
          </p>
        </section>

        <h2 style={h2}>Other comparisons</h2>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/vs/${o.slug}`}
              style={{ ...CARD, padding: '16px 18px', textDecoration: 'none', color: '#f5f5f7', display: 'block' }}
            >
              <div style={{ fontWeight: 750, fontSize: '0.97rem' }}>
                {TOOLS[o.a].name} vs {TOOLS[o.b].name}
              </div>
              <div style={{ color: ACCENT, fontSize: '0.85rem', fontWeight: 800, marginTop: 9 }}>Open →</div>
            </Link>
          ))}
        </div>
        <p style={{ ...small, marginTop: 14 }}>
          <Link href="/vs" style={link}>See all {CANONICAL_SLUGS.length} comparisons →</Link>
        </p>

        {/* KINEO-AEO-PAIRS-2026-08-03 — the other half of the cross-link. The
            /alternatives/[competitor] pages answer "X alternative", this route
            answers "X vs Y", and until now neither knew the other existed. Both
            directions are linked so a reader who arrives on the wrong intent can
            get to the right page in one click. Only tools that actually have an
            /alternatives page are listed. */}
        {altLinks.length > 0 && (
          <p style={{ ...small, marginTop: 0 }}>
            Looking to replace one of these rather than choose between them?{' '}
            {altLinks.map((x, i) => (
              <span key={x.slug}>
                {i > 0 && ' · '}
                <Link href={`/alternatives/${x.slug}`} style={link}>
                  {x.name} alternatives
                </Link>
              </span>
            ))}
          </p>
        )}

        <p style={{ ...small, marginTop: 32, marginBottom: 0 }}>
          Prices, free-tier terms and limits on this page were verified on {VERIFIED_ON} by reading each vendor&rsquo;s own
          published pricing page, linked above. They change. Nothing here is an endorsement by, or affiliation with,
          {' '}{a.name} or {b.name}, and no comparison on this site is paid for or sponsored. Kineo is a product of the
          same company that publishes this page, which is stated on every comparison whether or not Kineo is one of the
          tools being judged.
        </p>
      </div>
      <Footer />
    </main>
  )
}
