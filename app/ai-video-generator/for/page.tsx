// PROJETO 1 — GOOGLE — o hub das páginas de intenção (o caminho de rastreio: toda página de
// intenção está a um clique daqui, e daqui a um clique da home via /ai-video-generator).
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { INTENT_FAMILY_LABEL, INTENT_HUB_PATH, INTENT_PAGES, intentPagePath, type IntentFamily } from '@/lib/seo/intentPages'

const BASE = 'https://www.usekineo.com'
export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'AI Video Generator for Every Channel, Format and Language | Kineo',
  description: 'Pick your use case: faceless YouTube channels, TikTok, true crime, history, real estate, product demos, Shorts in Spanish, Hindi or French, and honest comparisons. One idea in, a finished narrated film out.',
  alternates: { canonical: `${BASE}${INTENT_HUB_PATH}` },
}

const ORDER: IntentFamily[] = ['niche', 'format', 'language', 'alternative']

export default function IntentHubPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: '#86868b', fontSize: 13 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <Link href="/ai-video-generator" style={{ color: '#2997ff', textDecoration: 'none' }}>AI video generator</Link>
          <span aria-hidden> / </span>
          <span style={{ color: '#d2d2d7' }}>Use cases</span>
        </nav>
        <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', fontWeight: 900, lineHeight: 1.15, margin: '26px 0 0' }}>AI video generator, by what you need</h1>
        <p style={{ color: '#86868b', lineHeight: 1.6, margin: '12px 0 0', maxWidth: 680 }}>Every page below shows real films made with the engine it names, the exact text that produced them, and a button that opens the Studio with that idea already in the box.</p>
        {ORDER.map((fam) => (
          <section key={fam} style={{ marginTop: 34 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 10px' }}>{INTENT_FAMILY_LABEL[fam]}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INTENT_PAGES.filter((p) => p.family === fam).map((p) => (
                <Link key={p.slug} href={intentPagePath(p.slug)} style={{ fontSize: '0.88rem', color: '#2997ff', textDecoration: 'none', border: '1px solid #2a2a2d', borderRadius: 980, padding: '7px 13px' }}>{p.h1}</Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Footer showStats={false} />
    </main>
  )
}
