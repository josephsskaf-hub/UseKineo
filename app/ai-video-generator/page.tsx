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
import CitationAnswerLinks from '@/components/CitationAnswerLinks'
import { getEngineRenders, getHouseEngineExamples } from '@/lib/engineWall'
import { enginePaused, KINEO1_PUBLIC } from '@/lib/engineLaunch'
import { ENGINES, ENGINE_SLUGS, engineOfferName, engineOfferPath } from '@/lib/growth/enginePageCatalog'
import { buildProductSurfaceSignupHref } from '@/lib/growth/productSurfaceIntent'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
import { ShowcaseStrip } from '@/app/claude-connector/ShowcaseGrid' // KINEO-VITRINE-PAGINAS-1011
import { VITRINE_MOTOR_LABEL, VITRINE_PAGINAS, vitrineDaPagina } from '@/lib/seo/vitrinePaginas1011' // KINEO-VITRINE-PAGINAS-1011

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ENGINE_HUB_SIGNUP_HREF = buildProductSurfaceSignupHref({
  surface: 'fast',
  campaign: 'seo_engine_hub',
  utmSource: 'seo',
})

// Revisão da E2b (texto, achado 7): o título e o parágrafo seguem o interruptor do Kineo 1 (fora do catálogo público
// desde a E1), como o /arena — antes o hub ainda publicava "Seedance, Kling, Veo & Kineo 1" e "its own Kineo 1".
const HUB_TITLE = KINEO1_PUBLIC ? 'AI Video Generator — Seedance, Kling & Kineo 1 | Kineo' : 'AI Video Generator — Seedance, Kling & MiniMax H3 | Kineo' // KINEO-MOTORES-SAEM-0511
const HUB_ENGINE_LIST = KINEO1_PUBLIC ? 'Seedance 1.5, MiniMax H3, Kling 4.0 and its own Kineo 1' : 'Seedance 1.5, MiniMax H3 and Kling 4.0' // KINEO-MOTORES-SAEM-0511

const HUB_DESCRIPTION = 'Compare Kineo video engines for finished vertical Shorts with narration and captions. Open each engine page for credit costs, limits and current availability.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: HUB_TITLE,
  description: HUB_DESCRIPTION,
  alternates: { canonical: `${BASE}/ai-video-generator` },
  openGraph: {
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    url: `${BASE}/ai-video-generator`,
    type: 'website',
  },
}

export default async function EngineHubPage() {
  // Um render real por motor — a mesma prova das páginas filhas, em miniatura.
  // KINEO-HUB-VITRINE-2026-09-21 (auditoria do Cowork): com a superfície pública de vídeo de cliente desligada,
  // getEngineRenders devolve [] e os 7 cards viravam retângulos pretos numa landing de SEO. Sem render de cliente,
  // a miniatura vem da vitrine da CASA daquele motor (mesma regra das páginas filhas, opção B do fundador).
  const vitrine = vitrineDaPagina('/ai-video-generator') // KINEO-VITRINE-PAGINAS-1011
  const perEngine = await Promise.all(
    ENGINE_SLUGS.map(async (slug) => {
      const videos = await getEngineRenders(ENGINES[slug].qualityMode, 1)
      // KINEO-VITRINE-PAGINAS-1011 — o card do slug kling-3 se chama "Kling 4.0" (engineOfferName) e levava um filme do Kling 3:
      // selo errado. Agora leva o 1º filme Kling 4.0 da casa (mesmo acervo da página do Kling 4.0).
      const k4 = VITRINE_PAGINAS['/ai-video-generator/kling-4'].clipes[0]
      const house = videos.length > 0 ? [] : slug === 'kling-3' && engineOfferName(slug) === VITRINE_MOTOR_LABEL.kling4
        ? [{ videoUrl: k4.src, posterUrl: k4.poster }]
        : getHouseEngineExamples(ENGINES[slug].qualityMode, 1)
      return { slug, videos, house, pause: enginePaused(ENGINES[slug].param) }
    }),
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
      name: `${engineOfferName(slug)} AI video generator`,
      url: `${BASE}/ai-video-generator/${slug}`,
    })),
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
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
            {ENGINE_SLUGS.length} engines · one pipeline
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>
            Every AI video engine, finishing the whole Short for you
          </h1>
          <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 700 }}>
            Most AI video tools hand you a silent 5-second clip and leave the rest to you. Kineo runs the same
            engines — {HUB_ENGINE_LIST} — and returns a finished
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
              {CARD_ENTRY_COPY.ctaLong}
            </OrganicCtaLink>
          </div>
        </section>

        {/* KINEO-VITRINE-PAGINAS-1011 — os filmes prontos da casa logo abaixo da resposta, cada um com o selo do motor que o fez */}
        {vitrine && <ShowcaseStrip titulo={vitrine.titulo} linha={vitrine.linha} clipes={vitrine.clipes} href={ENGINE_HUB_SIGNUP_HREF} source="seo_engine_hub" tone="dark" />}

        <section style={{ marginTop: 48, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {perEngine.map(({ slug, videos, house, pause }) => {
            const e = ENGINES[slug]
            return (
              <Link
                key={slug}
                href={engineOfferPath(slug)}
                style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, ...CARD, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ position: 'relative', flex: '0 0 84px', aspectRatio: '9 / 16', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                  {videos[0] ? <WallMedia src={videos[0].videoUrl} /> : house[0] ? (
                    <video src={house[0].videoUrl} poster={house[0].posterUrl} muted playsInline preload="none" aria-label={`Kineo-owned sample made with ${engineOfferName(slug)}`} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.02rem' }}>{engineOfferName(slug)}</div>
                  <div style={{ fontSize: '0.78rem', color: pause ? '#f0c264' : e.tier === 'Studio' ? '#86868b' : '#2997ff', fontWeight: 700, margin: '2px 0 6px' }}>
                    {pause ? `Temporarily paused · ${pause.alternative.label} covers it` : e.tier === 'Free' ? 'Free · watermarked' : `${e.creditCost} credits / 60s · ${e.tier}`}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#86868b', lineHeight: 1.5 }}>{e.bestFor}</p>
                </div>
              </Link>
            )
          })}
        </section>

        <CitationAnswerLinks />

        <nav style={{ marginTop: 44, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73', lineHeight: 2 }}>
          <Link href="/made-with-kineo" style={{ color: '#86868b', textDecoration: 'none' }}>Real examples</Link>
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
