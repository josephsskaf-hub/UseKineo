// KINEO-ENGINE-SEO-2026-08-15 — hub do cluster por MOTOR.
//
// As 5 páginas /ai-video-generator/[engine] precisam de uma cabeça: sem hub,
// elas ficariam órfãs como as ~572 páginas /v/[id] ficaram até 03/08 (8 cliques
// de busca em toda a história do site). Esta página é a cabeça e o único lugar
// do site onde a pergunta "qual motor eu uso?" é respondida numa tela só.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import WallMedia from '@/components/WallMedia'
import { getEngineRenders } from '@/lib/engineWall'
import { ENGINES, ENGINE_SLUGS } from './[engine]/page'
import { buildProductSurfaceSignupHref } from '@/lib/growth/productSurfaceIntent'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ENGINE_HUB_SIGNUP_HREF = buildProductSurfaceSignupHref({
  surface: 'fast',
  campaign: 'seo_engine_hub',
  utmSource: 'seo',
})

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'AI Video Generator — Seedance, Kling, Veo & Kineo 1 | Kineo',
  description:
    'Pick the AI video engine and get a finished vertical Short: Kineo 1, Seedance 1.5, Kling 2.5, MiniMax H3, Veo 3.1 and Kling 3 — with script, AI voiceover and captions assembled for you. Real user renders, not a demo reel.',
  alternates: { canonical: `${BASE}/ai-video-generator` },
  openGraph: {
    title: 'AI Video Generator — Seedance, Kling, Veo & Kineo 1 | Kineo',
    description: 'Every engine Kineo runs, what each one costs, and real Shorts rendered by each.',
    url: `${BASE}/ai-video-generator`,
    type: 'website',
  },
}

export default async function EngineHubPage() {
  // Um render real por motor — a mesma prova das páginas filhas, em miniatura.
  const perEngine = await Promise.all(
    ENGINE_SLUGS.map(async (slug) => ({ slug, videos: await getEngineRenders(ENGINES[slug].qualityMode, 1) })),
  )

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'AI video generator', item: `${BASE}/ai-video-generator` },
    ],
  }
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ENGINE_SLUGS.map((slug, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${ENGINES[slug].name} AI video generator`,
      url: `${BASE}/ai-video-generator/${slug}`,
    })),
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: '#86868b', fontSize: 13 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <span style={{ color: '#d2d2d7' }}>AI video generator</span>
        </nav>

        <section style={{ marginTop: 34, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', borderRadius: 999, padding: '6px 14px' }}>
            5 engines · one pipeline
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>
            Every AI video engine, finishing the whole Short for you
          </h1>
          <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 700 }}>
            Most AI video tools hand you a silent 5-second clip and leave the rest to you. Kineo runs the same
            engines — Seedance 1.5, Kling 2.5, MiniMax H3, Veo 3.1, Kling 3 and its own Kineo 1 — and returns a finished
            vertical Short: hook-first script, AI voiceover, matched or generated scenes, burned-in captions.
            One idea in, a ready-to-post 9:16 MP4 out.
          </p>
          <div style={{ marginTop: 22 }}>
            <OrganicCtaLink
              href={ENGINE_HUB_SIGNUP_HREF}
              source="seo_engine_hub"
              placement="hero"
              style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}
            >
              Start free →
            </OrganicCtaLink>
          </div>
        </section>

        <section style={{ marginTop: 48, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {perEngine.map(({ slug, videos }) => {
            const e = ENGINES[slug]
            return (
              <Link
                key={slug}
                href={`/ai-video-generator/${slug}`}
                style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, ...CARD, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ position: 'relative', flex: '0 0 84px', aspectRatio: '9 / 16', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                  {videos[0] ? <WallMedia src={videos[0].videoUrl} /> : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.02rem' }}>{e.name}</div>
                  <div style={{ fontSize: '0.78rem', color: e.tier === 'Studio' ? '#86868b' : '#2997ff', fontWeight: 700, margin: '2px 0 6px' }}>
                    {e.tier === 'Free' ? 'Free · watermarked' : `${e.creditCost} credits / 60s · ${e.tier}`}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#86868b', lineHeight: 1.5 }}>{e.bestFor}</p>
                </div>
              </Link>
            )
          })}
        </section>

        <nav style={{ marginTop: 44, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73', lineHeight: 2 }}>
          <Link href="/examples" style={{ color: '#86868b', textDecoration: 'none' }}>Real examples</Link>
          {' · '}
          <Link href="/pricing" style={{ color: '#86868b', textDecoration: 'none' }}>Pricing</Link>
          {' · '}
          <Link href="/alternatives" style={{ color: '#86868b', textDecoration: 'none' }}>Tool alternatives</Link>
          {' · '}
          <Link href="/free-ai-shorts-generator" style={{ color: '#86868b', textDecoration: 'none' }}>Free AI Shorts generator</Link>
        </nav>
      </div>

      <Footer />
    </main>
  )
}
