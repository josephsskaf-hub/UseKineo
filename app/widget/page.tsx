// KINEO-BACKLINK-ENGINE — /widget: marketing page for the free "Shorts Idea
// of the Day" embed widget and the "Made with Kineo" badge. Every creator who
// pastes a snippet becomes a permanent followed backlink + daily referral
// traffic (utm_source=widget / utm_source=badge). The widget itself lives at
// /widget/embed (deterministic daily rotation, ISR 1h). Style matches
// app/facts/page.tsx: #000 page, #161618 cards, #2a2a2d borders, #2997ff.

import type { Metadata } from 'next'
import CopyButton from '@/components/CopyButton'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const metadata: Metadata = {
  title: 'Free Shorts Idea of the Day Widget — Embed on Your Site | Kineo',
  description:
    'Add a free auto-rotating YouTube Shorts idea widget to your website, blog or Notion page. One copy-paste iframe, a new proven hook every day. By Kineo, the AI Shorts generator.',
  alternates: { canonical: 'https://www.usekineo.com/widget' },
  openGraph: {
    title: 'Free Shorts Idea of the Day Widget — Kineo',
    description:
      'Embed a daily YouTube Shorts idea on your site or Notion page with one copy-paste snippet. Free forever.',
    url: 'https://www.usekineo.com/widget',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Shorts Idea of the Day Widget — Kineo',
    description:
      'Embed a daily YouTube Shorts idea on your site or Notion page with one copy-paste snippet.',
  },
}

const IFRAME_SNIPPET = `<iframe src="https://www.usekineo.com/widget/embed" width="360" height="200" frameborder="0" title="Shorts Idea of the Day — Kineo"></iframe>`

const LINK_SNIPPET = `<a href="https://www.usekineo.com/widget/embed">💡 Shorts Idea of the Day — by Kineo</a>`

const BADGE_SNIPPET = `<a href="https://www.usekineo.com/?utm_source=badge"><img src="https://www.usekineo.com/badge-made-with-kineo.svg" alt="Made with Kineo"/></a>`

const CARD = {
  background: '#161618',
  border: '1px solid #2a2a2d',
  borderRadius: 14,
} as const
const ACCENT = '#2997ff'
const MUTED = '#86868b'

function Snippet({ code }: { code: string }) {
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <pre
        style={{
          margin: '0 0 12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          background: '#0b0b0c',
          border: '1px solid #2a2a2d',
          borderRadius: 10,
          padding: '12px 14px',
        }}
      >
        <code
          style={{
            color: '#d2d2d7',
            fontSize: '0.8rem',
            lineHeight: 1.55,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}
        >
          {code}
        </code>
      </pre>
      <CopyButton text={code} label="Copy snippet" variant="small" />
    </div>
  )
}

export default function WidgetPage() {
  return (
    <main
      style={{
        background: '#000',
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '64px 20px 96px',
      }}
    >
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Free embed — no signup, no key
        </p>
        <h1
          style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            lineHeight: 1.15,
            margin: '0 0 16px',
          }}
        >
          Free Shorts Idea of the Day widget
        </h1>
        <p
          style={{
            color: MUTED,
            fontSize: '1.05rem',
            lineHeight: 1.6,
            margin: '0 0 40px',
          }}
        >
          Paste one snippet into your website, blog or Notion page and your
          readers get a fresh, proven YouTube Shorts hook every single day —
          finance, mystery, history, geography and motivation ideas on a
          30-day rotation. It updates itself. Free forever.
        </p>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 16px' }}>
          Live preview
        </h2>
        <div
          style={{
            ...CARD,
            padding: 16,
            margin: '0 0 32px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <iframe
            src="/widget/embed"
            width={360}
            height={200}
            title="Shorts Idea of the Day — Kineo"
            style={{ border: 0, borderRadius: 10, maxWidth: '100%' }}
          />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px' }}>
          Embed it on your site
        </h2>
        <p style={{ color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }}>
          Works anywhere HTML works: WordPress, Webflow, Ghost, Framer, Carrd,
          Squarespace, your own code.
        </p>
        <div style={{ margin: '0 0 24px' }}>
          <Snippet code={IFRAME_SNIPPET} />
        </div>

        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px' }}>
          Using Notion or somewhere iframes don&rsquo;t paste?
        </h3>
        <p style={{ color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }}>
          In Notion, just paste{' '}
          <span style={{ color: '#d2d2d7' }}>
            https://www.usekineo.com/widget/embed
          </span>{' '}
          and choose <strong style={{ color: '#f5f5f7' }}>Embed</strong> — or
          use this plain link version:
        </p>
        <div style={{ margin: '0 0 48px' }}>
          <Snippet code={LINK_SNIPPET} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px' }}>
          &ldquo;Made with Kineo&rdquo; badge
        </h2>
        <p style={{ color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }}>
          Publishing videos made with Kineo? Drop this badge in your site
          footer, channel page or link-in-bio.
        </p>
        <div
          style={{
            ...CARD,
            padding: 16,
            margin: '0 0 14px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/badge-made-with-kineo.svg"
            alt="Made with Kineo"
            width={180}
            height={36}
          />
        </div>
        <div style={{ margin: '0 0 48px' }}>
          <Snippet code={BADGE_SNIPPET} />
        </div>

        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6 }}>
          Want the video too, not just the idea?{' '}
          <a href="/" style={{ color: ACCENT, textDecoration: 'none' }}>
            Kineo
          </a>{' '}
          turns any of these ideas into a finished faceless Short — script,
          voiceover, visuals and captions — in about 3–7 minutes. {ft(OFFER, 'Up to 3 free watermarked videos every 24 hours, no credit card.', OFFER.copy.headline)}
        </p>
      </div>
    </main>
  )
}
