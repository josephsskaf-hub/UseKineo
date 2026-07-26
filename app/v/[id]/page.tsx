import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PublicVideoCtaLink from '@/components/PublicVideoCtaLink'
import {
  getPublicVideoResult,
  metaDescriptionFor,
  PUBLIC_BASE_URL,
  type PublicVideo,
} from '@/lib/publicVideos'

// #459 — Public shareable video page (/v/[id]). Every generated video gets a
// public landing: the 9:16 player + a "make your own free" CTA. When a user
// shares their video, each share is a landing that brings a NEW visitor who has
// already SEEN the product working (warmer than cold traffic).
//
// PUSH #96+ — the page was a player and a button, and 564 of them were in no
// sitemap at all. Two problems, one fix:
//   1. Multiplying a player-plus-button template 564 times is precisely the
//      shape Google's scaled-content-abuse policy (updated 2026-05-15) demotes —
//      it applies "no matter how it's created" and has no user-generated
//      carve-out. So the page now carries the video's OWN script as readable
//      prose, its runtime, its description and hashtags: substance unique to
//      each URL that a human would actually read.
//   2. It was `force-dynamic`, so every crawl hit Supabase. It is now ISR
//      (revalidate below), rendered once per hour per id.
//
// Which videos are public, and which are indexable, is decided ONLY in
// lib/publicVideos.ts — shared with app/video-sitemap.xml/route.ts so the
// sitemap can never advertise a page that renders `noindex`.
export const revalidate = 3600

const BLUE = '#2997ff'
const MUTED = '#86868b'

function signupHrefFor(v: PublicVideo | null): string {
  const query = new URLSearchParams({
    utm_source: 'public_video',
    utm_medium: 'share',
    utm_campaign: 'make_one_like_this',
  })
  // Signup already accepts `prompt` and carries it through email/OAuth to the
  // local /generate activation URL. URLSearchParams encodes untrusted text and
  // a short title-sized cap keeps the CTA URL bounded.
  // Remix the idea, not the entire stored script: seeding the whole script
  // would create a duplicate instead of a fresh episode.
  const prompt = v ? v.title.trim().slice(0, 160) : ''
  if (prompt) query.set('prompt', prompt)
  return `/signup?${query.toString()}`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getPublicVideoResult(params.id)
  const v = result.status === 'ok' ? result.video : null
  const title = v?.title ?? 'AI YouTube Short'
  const desc = v
    ? metaDescriptionFor(v)
    : 'Made with Kineo — type any topic and AI writes the script, voiceover, captions and footage. Create up to 3 watermarked Fast videos every 24 hours with no card.'

  return {
    metadataBase: new URL(PUBLIC_BASE_URL),
    title: `${title} · Kineo`,
    description: desc,
    // PUSH #92 — P0 canonical bug: this route had no canonical of its own, so
    // every shared video page shallow-merged the root layout's canonical
    // (the homepage), telling Google every `/v/[id]` page duplicates `/`.
    alternates: { canonical: `/v/${params.id}` },
    // A page that fails the quality gate still renders (the owner shared this
    // link and must see their video) but is never offered to the index.
    robots: v?.isIndexable ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description: desc,
      videos: v?.playbackUrl ? [{ url: v.playbackUrl }] : undefined,
      type: 'video.other',
    },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m} min ${s} s` : `${m} min`
}

/** schema.org VideoObject — the structured data that makes the page eligible
 *  for a video result in Search. Only emitted for indexable pages. */
function videoJsonLd(v: PublicVideo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.title,
    description: metaDescriptionFor(v),
    thumbnailUrl: [v.thumbnailUrl],
    uploadDate: v.publishedAt,
    contentUrl: v.playbackUrl ?? undefined,
    embedUrl: v.pageUrl,
    duration: v.isoDuration ?? undefined,
    isFamilyFriendly: true,
    publisher: {
      '@type': 'Organization',
      name: 'Kineo',
      url: PUBLIC_BASE_URL,
    },
  }
}

function breadcrumbJsonLd(v: PublicVideo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: PUBLIC_BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Examples', item: `${PUBLIC_BASE_URL}/examples` },
      { '@type': 'ListItem', position: 3, name: v.title, item: v.pageUrl },
    ],
  }
}

export default async function PublicVideoPage({ params }: { params: { id: string } }) {
  const result = await getPublicVideoResult(params.id)
  // A genuinely absent id is a real 404, not a 200 "not available" template.
  // A Supabase outage falls through to the friendly noindex render below so an
  // incident can't 404 the entire public surface.
  if (result.status === 'missing') notFound()

  const v = result.status === 'ok' ? result.video : null
  const ready = !!v?.playbackUrl
  const title = v?.title ?? 'AI YouTube Short'
  const signupHref = signupHrefFor(v)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        padding: '24px 16px 56px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {v?.isIndexable && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(v)).replace(/</g, '\\u003c') }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(v)).replace(/</g, '\\u003c') }}
          />
        </>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 18 }}>
          <Link href="/" style={{ color: BLUE, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>
            Kineo
          </Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <Link href="/examples" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>
            Examples
          </Link>
        </nav>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.28, margin: '0 0 10px' }}>{title}</h1>

        <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 20px' }}>
          A faceless AI Short generated with Kineo
          {v?.durationSeconds ? ` · ${formatDuration(v.durationSeconds)}` : ''}
          {v?.publishedAt ? ` · ${new Date(v.publishedAt).toISOString().slice(0, 10)}` : ''}
        </p>

        <div style={{ maxWidth: 380 }}>
          {ready ? (
            <video
              src={v!.playbackUrl!}
              poster={v!.posterUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              style={{
                width: '100%',
                aspectRatio: '9 / 16',
                borderRadius: 18,
                background: '#000',
                border: '1px solid rgba(41,151,255,0.25)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '9 / 16',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 20,
                color: MUTED,
              }}
            >
              This video isn&apos;t available right now.
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 22,
            padding: 18,
            borderRadius: 16,
            background: 'rgba(41,151,255,0.08)',
            border: '1px solid rgba(41,151,255,0.3)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Made in a few minutes with AI 🤯</p>
          <p style={{ margin: '6px 0 14px', color: '#CBD5E1', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Use this idea as your starting point. Create, share and download up to 3 watermarked Fast videos every 24
            hours — upgrade only when you want a clean export.
          </p>
          <PublicVideoCtaLink
            href={signupHref}
            videoId={params.id}
            style={{
              display: 'inline-block',
              background: BLUE,
              color: '#000',
              fontWeight: 900,
              padding: '13px 26px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: '1rem',
            }}
          >
            Make one like this →
          </PublicVideoCtaLink>
        </div>

        {v && v.paragraphs.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px' }}>
              {v.isStructuredScript ? 'Full script' : 'The brief behind this video'}
            </h2>
            {/* Honest labelling: only rows carrying HOOK/MICRO REWARD/PAYOFF
                markers hold a real beat-by-beat script. The rest store the
                creator's own brief, which is still text unique to this URL. */}
            {v.paragraphs.map((p, i) => (
              <p key={i} style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
                {p}
              </p>
            ))}
          </section>
        )}

        {v?.youtubeDescription && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px' }}>Video description</h2>
            <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>
              {v.youtubeDescription}
            </p>
          </section>
        )}

        {v && v.hashtags.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 10px' }}>Hashtags</h2>
            <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{v.hashtags.join(' ')}</p>
          </section>
        )}

        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px' }}>How this Short was made</h2>
          <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 12px' }}>
            Kineo turned a single topic line into this vertical video: it wrote the script, generated the voiceover,
            burned in the captions and matched stock footage to every beat. No camera, no editing timeline, no
            voice recording — the render finishes in a few minutes.
          </p>
          {/* Internal links so these pages are not orphan leaves: each one
              points back into the acquisition cluster that already ranks. */}
          <ul style={{ color: MUTED, fontSize: '0.92rem', lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
            <li>
              <Link href="/examples" style={{ color: BLUE, textDecoration: 'none' }}>
                See more example Shorts made with Kineo
              </Link>
            </li>
            <li>
              <Link href="/youtube-shorts-from-topic" style={{ color: BLUE, textDecoration: 'none' }}>
                Turn any topic into a YouTube Short
              </Link>
            </li>
            <li>
              <Link href="/faceless-video-generator" style={{ color: BLUE, textDecoration: 'none' }}>
                Faceless video generator
              </Link>
            </li>
            <li>
              <Link href="/free-ai-shorts-generator" style={{ color: BLUE, textDecoration: 'none' }}>
                Free AI Shorts generator
              </Link>
            </li>
            <li>
              <Link href="/faceless-channel-ideas" style={{ color: BLUE, textDecoration: 'none' }}>
                Faceless channel ideas
              </Link>
            </li>
            <li>
              <Link href="/pricing" style={{ color: BLUE, textDecoration: 'none' }}>
                Pricing
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
