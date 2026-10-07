// KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — a moldura comum das 4 páginas citáveis (lib/seo/citableHubPages.ts).
// Componente de SERVIDOR (sem 'use client'): o texto sai no HTML estático — é o que o OAI-SearchBot e o Bing leem.
// A FAQ é VISÍVEL e o FAQPage JSON-LD repete exatamente o que está na tela (guardião test-faq-schema-so-onde-visivel).
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { BRAND_DISAMBIGUATION } from '@/lib/brandIdentity'
import { HUB_PAGES, breadcrumbJsonLd, faqJsonLd, ldJson } from '@/lib/seo/citableHubPages'

export const HUB_CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d' }
export const HUB_MUTED = '#86868b'
export const HUB_TH: CSSProperties = { textAlign: 'left', padding: '11px 10px', fontWeight: 700, color: HUB_MUTED, whiteSpace: 'nowrap' }
export const HUB_TD: CSSProperties = { padding: '11px 10px', verticalAlign: 'top', lineHeight: 1.45, color: '#d2d2d7' }
export const HUB_LINK: CSSProperties = { color: '#2997ff', textDecoration: 'none', fontWeight: 700 }
export const HUB_PRIMARY: CSSProperties = { display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }
export const HUB_SECONDARY: CSSProperties = { display: 'inline-block', border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 24px', borderRadius: 980, textDecoration: 'none' }

export function HubSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ marginTop: 44 }}>
      <h2 id={id} style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 14px' }}>{title}</h2>
      {children}
    </section>
  )
}

export function HubTable({ minWidth = 620, children }: { minWidth?: number; children: ReactNode }) {
  return (
    <div style={{ ...HUB_CARD, borderRadius: 16, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth }}>{children}</table>
    </div>
  )
}

export function HubSmall({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: '0.78rem', color: '#6e6e73', margin: '10px 0 0', lineHeight: 1.55 }}>{children}</p>
}

export default function CitableHubShell({
  path,
  crumb,
  badge,
  h1,
  lead,
  faqs,
  children,
}: {
  path: string
  crumb: string
  badge: string
  h1: string
  /** A PRIMEIRA frase depois do H1: a resposta citável. */
  lead: ReactNode
  faqs: { q: string; a: string }[]
  children: ReactNode
}) {
  const related = Object.values(HUB_PAGES).filter((p) => p.path !== path)
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqJsonLd(faqs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbJsonLd(crumb, path)) }} />
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: HUB_MUTED, fontSize: 13 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <span style={{ color: '#d2d2d7' }}>{crumb}</span>
        </nav>

        <header style={{ marginTop: 30 }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', borderRadius: 999, padding: '6px 14px' }}>
            {badge}
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 900, lineHeight: 1.15, margin: '14px 0 0' }}>{h1}</h1>
          <div data-kineo="hub-answer" style={{ fontSize: '1.06rem', color: '#d2d2d7', lineHeight: 1.6, margin: '14px 0 0', maxWidth: 780 }}>{lead}</div>
        </header>

        {children}

        <section aria-labelledby="hub-faq" style={{ marginTop: 48 }}>
          <h2 id="hub-faq" style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 14px' }}>Questions, answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map((f) => (
              <div key={f.q} style={{ ...HUB_CARD, borderRadius: 12, padding: '16px 18px' }}>
                <h3 style={{ fontWeight: 800, margin: '0 0 6px', fontSize: '0.98rem' }}>{f.q}</h3>
                <p style={{ margin: 0, color: HUB_MUTED, lineHeight: 1.6, fontSize: '0.92rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p style={{ marginTop: 36, fontSize: '0.82rem', color: '#6e6e73', lineHeight: 1.6 }}>{BRAND_DISAMBIGUATION}</p>
        <nav aria-label="Related" style={{ marginTop: 18, fontSize: '0.86rem', color: '#6e6e73', lineHeight: 2 }}>
          {related.map((p, i) => (
            <span key={p.path}>
              {i > 0 ? ' · ' : ''}
              <Link href={p.path} style={{ color: HUB_MUTED, textDecoration: 'none' }}>{p.label}</Link>
            </span>
          ))}
          {' · '}
          <Link href="/ai-video-generator" style={{ color: HUB_MUTED, textDecoration: 'none' }}>Every engine</Link>
          {' · '}
          <Link href="/pricing" style={{ color: HUB_MUTED, textDecoration: 'none' }}>Pricing</Link>
          {' · '}
          <Link href="/trust" style={{ color: HUB_MUTED, textDecoration: 'none' }}>Trust Center</Link>
        </nav>
      </div>
      <Footer />
    </main>
  )
}
