// Push #116 — branded 404 page. Replaces the default Next.js fallback
// so users who land on a stale link still see the product, not a bare
// system page.
// PUSH #92 — P0 fixes: (a) render <Footer /> so the site's crawl hub is
// reachable from every dead link instead of a dead end; (b) the second CTA
// pointed at /generate, which app/robots.ts disallows for crawlers — repoint
// to /signup?utm_source=404 so at least the funnel entry stays crawlable and
// consistent with other dead-end -> signup redirects (see app/start); (c)
// add its own metadata (this page previously inherited the root layout's
// canonical, telling Google it duplicated the homepage) with robots:
// noindex since a 404 should never be indexed regardless of canonical.

import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Page not found — Kineo',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: 'var(--font-inter), Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px',
      }}
    >
      <div style={{ marginBottom: 56, marginTop: 8 }}>
        <Link
          href="/"
          style={{
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg, #2997ff, #2997ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
          }}
        >
          Kineo
        </Link>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
          maxWidth: 520,
        }}
      >
        <div
          aria-hidden
          style={{
            fontSize: '4.5rem',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            background: 'linear-gradient(135deg, #2997ff, #2997ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 16,
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: 10,
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#86868b',
            lineHeight: 1.55,
            margin: 0,
            marginBottom: 28,
          }}
        >
          This page doesn&apos;t exist or was moved.
        </p>
        {/* Push #117 — CTAs stack on mobile (full-width) and sit
            side-by-side on sm+. Inline media query via a scoped style
            tag keeps the page server-renderable. */}
        <div className="nf-cta-row">
          <style>{`
            .nf-cta-row {
              display: flex;
              flex-direction: column;
              gap: 10px;
              width: 100%;
              max-width: 320px;
            }
            .nf-cta-row a {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 48px;
              padding: 12px 22px;
              border-radius: 12px;
              font-size: 0.95rem;
              font-weight: 800;
              text-decoration: none;
              box-sizing: border-box;
            }
            @media (min-width: 480px) {
              .nf-cta-row { flex-direction: row; max-width: none; }
            }
          `}</style>
          <Link
            href="/"
            style={{
              background: 'linear-gradient(135deg, #2997ff, #2997ff)',
              color: '#FFFFFF',
              boxShadow: '0 8px 26px rgba(41,151,255,.35)',
            }}
          >
            ← Back to Home
          </Link>
          <Link
            href="/signup?utm_source=404"
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.10)',
              color: '#f5f5f7',
              fontWeight: 700,
            }}
          >
            Go to Generator
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  )
}
