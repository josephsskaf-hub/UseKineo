// KINEO-S25-ABRE-2026-10-06 — /ai-video-generator/seedance-2-5: a ISCA da aposta A do fundador (06/10). Quem procura
// "Seedance 2.5" acha esta página; para usar, precisa de um plano pago (o portão do servidor mora em lib/s25Access.ts).
//
// ROTA PRÓPRIA, de propósito: a página genérica (app/ai-video-generator/[engine]/page.tsx) diz "Start free" no CTA final e
// carrega a faixa "free short" — verdade para os outros motores, não para um motor só de plano pago — e o corpo dela é
// travado byte a byte por guardiões. Um segmento estático vence o dinâmico no roteamento (os irmãos
// complete-60-second-shorts-cost/, for/ … já fazem isso), e o [engine] tira 'seedance-2-5' do generateStaticParams.
//
// KINEO-MOTORES-GEO-2026-10-06 (TAREFA 12) — a página segue o MESMO padrão citável das outras páginas de motor: a primeira
// frase depois do H1 responde onde usar e quanto custa por vídeo (EngineAnswerLead), a tabela de preço por vídeo com quantos
// cabem em cada plano e a comparação com usar o modelo direto com fonte oficial datada (EnginePriceCard), o CTA leva ao
// cadastro → Studio com o motor e seo_engine_seedance-2-5, a frase da marca e a FAQ citável no FAQPage. A camada vem de
// ENGINE_GEO['seedance-2-5'] na versão "só plano pago, sem clipe avulso" (lib/seo/engineCitation.ts). Motor pausado:
// sem camada citável e robots noindex — a mesma régua (isIndexableEngineSlug) do layout do [engine].
//
// Texto da sessão CEO (06/10): todo número sai de lib/growth/s25EnginePage.ts (TIER_PRICES, TIER_CREDITS, ANNUAL_PRICES,
// creditCostForDuration do 2.5 e do Seedance 1.5); os fatos da Pika são de terceiro e vão SEMPRE com a data da consulta.
// Sem promessa de resolução e sem "Enhance incluso": o Enhance é o botão do filme pronto (fundador, 06/10).
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { EngineAnswerLead, EnginePriceCard, engineGeoFor } from '@/components/EngineCitationAnswer'
import { ENGINES, isIndexableEngineSlug } from '@/lib/growth/enginePageCatalog'
import { buildEngineLandingSignupHref } from '@/lib/growth/engineLandingIntent'
import { S25_PUBLIC, enginePaused } from '@/lib/engineLaunch'
import {
  PIKA_CHECKED_ON,
  PIKA_PRICING_URL,
  S25_PAGE_SLUG,
  s25PageCopy,
  s25PageFacts,
  s25PikaRows,
} from '@/lib/growth/s25EnginePage'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const PATH = `/ai-video-generator/${S25_PAGE_SLUG}`
const CAMPAIGN = `seo_engine_${S25_PAGE_SLUG}`
/** Os planos, com a mesma campanha da página (seo_engine_<slug>) — é o intent_campaign que mede a origem da compra. */
const PLANS_HREF = `/pricing?intent_campaign=${CAMPAIGN}#plans`
const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const TH = { textAlign: 'left' as const, padding: '12px 14px', fontWeight: 700, color: '#86868b' }
const TD = { padding: '12px 14px', color: '#f5f5f7', lineHeight: 1.55, verticalAlign: 'top' as const }

export function generateMetadata(): Metadata {
  if (!S25_PUBLIC || !ENGINES[S25_PAGE_SLUG]) return {}
  const copy = s25PageCopy()
  const url = `${BASE}${PATH}`
  return {
    metadataBase: new URL(BASE),
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: copy.metaTitle, description: copy.metaDescription, url, type: 'website' },
    twitter: { card: 'summary_large_image', title: copy.metaTitle, description: copy.metaDescription },
    // KINEO-MOTORES-GEO-2026-10-06 — motor desligado não tem página indexável (a mesma régua do layout do [engine]).
    ...(isIndexableEngineSlug(S25_PAGE_SLUG) ? {} : { robots: { index: false, follow: true } }),
  }
}

export default function Seedance25Page() {
  const e = ENGINES[S25_PAGE_SLUG]
  if (!S25_PUBLIC || !e) notFound()
  const pause = enginePaused(e.param)
  const geo = engineGeoFor(S25_PAGE_SLUG) // null = motor pausado (sem camada citável)
  const facts = s25PageFacts()
  const copy = s25PageCopy(facts)
  const pika = s25PikaRows(facts)
  const signupHref = buildEngineLandingSignupHref({ engine: e.param, campaign: CAMPAIGN })
  const ctaLabel = geo ? geo.ctaLabel : `Make a ${e.name} video on a paid plan →`

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: e.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'AI video generator', item: `${BASE}/ai-video-generator` },
      { '@type': 'ListItem', position: 3, name: e.name, item: `${BASE}${PATH}` },
    ],
  }

  const primaryButton = { display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }
  const secondaryButton = { display: 'inline-block', border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 24px', borderRadius: 980, textDecoration: 'none' }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: '#86868b', fontSize: 13 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <Link href="/ai-video-generator" style={{ color: '#86868b', textDecoration: 'none' }}>AI video generator</Link>
          <span aria-hidden> / </span>
          <span style={{ color: '#d2d2d7' }}>{e.name}</span>
        </nav>

        {/* Hero */}
        <section style={{ marginTop: 34, textAlign: 'center' }} data-kineo="s25-hero">
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', borderRadius: 999, padding: '6px 14px' }}>
            {e.name} · paid plans
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>{copy.h1}</h1>
          {/* KINEO-MOTORES-GEO-2026-10-06 — a PRIMEIRA frase depois do H1: onde usar o motor online e quanto custa por vídeo. */}
          {geo && <EngineAnswerLead geo={geo} />}
          {pause && (
            <div role="status" style={{ margin: '14px 0 0', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,180,84,.45)', background: 'rgba(255,180,84,.10)', color: '#ffd9a3', fontSize: 14.5, lineHeight: 1.6 }}>
              <strong>Temporarily paused for maintenance.</strong> {pause.message}{' '}
              <Link href={`/studio?engine=${pause.alternative.key}&intent_campaign=engine_paused`} style={{ color: '#ffb454', fontWeight: 700 }}>Open {pause.alternative.label} →</Link>
            </div>
          )}
          <p style={{ fontSize: '1.02rem', color: '#a1a1a8', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 700 }}>{copy.lead}</p>
          <p data-kineo="s25-availability" style={{ fontSize: '0.9rem', color: '#86868b', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 680 }}>{copy.availability}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 22 }}>
            <OrganicCtaLink href={signupHref} source={CAMPAIGN} placement="hero" style={primaryButton}>
              {ctaLabel}
            </OrganicCtaLink>
            <OrganicCtaLink href={PLANS_HREF} source={CAMPAIGN} placement="hero_plans" style={secondaryButton}>
              See paid plans →
            </OrganicCtaLink>
          </div>
          {geo && <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '12px 0 0' }}>{`${geo.accessNote} ${geo.turnaround}.`}</p>}
        </section>

        {/* KINEO-MOTORES-GEO-2026-10-06 — preço por vídeo, quantos por plano, usar o modelo direto (fonte oficial, datada) e o
            CTA com a campanha da página + a frase da marca. */}
        {geo && <EnginePriceCard geo={geo} ctaHref={signupHref} campaign={CAMPAIGN} />}

        {/* Pika vs Kineo — fatos de terceiro SEMPRE com a data da consulta (PIKA_CHECKED_ON) */}
        <section style={{ marginTop: 48 }} data-kineo="s25-vs-pika">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>Pika vs Kineo (checked {PIKA_CHECKED_ON})</h2>
          <div style={{ ...CARD, borderRadius: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={TH}><span className="sr-only">Compared</span></th>
                  <th style={TH}>Pika</th>
                  <th style={TH}>Kineo · {e.name}</th>
                </tr>
              </thead>
              <tbody>
                {pika.map((r) => (
                  <tr key={r.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ ...TD, color: '#86868b', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.label}</td>
                    <td style={{ ...TD, color: '#d2d2d7' }}>{r.pika}</td>
                    <td style={{ ...TD, fontWeight: 700 }}>{r.kineo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#6e6e73', textAlign: 'center', margin: '10px auto 0', maxWidth: 680, lineHeight: 1.6 }}>
            Pika details from <a href={PIKA_PRICING_URL} rel="nofollow noopener" target="_blank" style={{ color: '#86868b' }}>Pika&rsquo;s pricing page</a>, checked {PIKA_CHECKED_ON}. Plans and prices change; check Pika for today&rsquo;s terms. Kineo prices come from Kineo&rsquo;s pricing source.
          </p>
        </section>

        {/* Mais filmes por mês: o Seedance 1.5, com o custo da menor duração dele */}
        <section style={{ marginTop: 40, ...CARD, borderRadius: 16, padding: '18px 20px' }} data-kineo="s25-more-films">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>Want more films per month?</h2>
          <p style={{ margin: '6px 0 0', color: '#a1a1a8', lineHeight: 1.6, fontSize: '0.92rem' }}>
            {copy.moreFilms}{' '}
            <Link href="/ai-video-generator/seedance" style={{ color: '#2997ff', fontWeight: 700, textDecoration: 'none' }}>See Seedance 1.5 →</Link>
          </p>
        </section>

        {/* FAQ — a citável (onde usar + quanto custa; é mais barato direto?) e a da sessão CEO */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>Questions, answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {e.faq.map((f) => (
              <div key={f.q} style={{ ...CARD, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontWeight: 800, marginBottom: 6, fontSize: '0.95rem' }}>{f.q}</div>
                <p style={{ margin: 0, color: '#86868b', lineHeight: 1.6, fontSize: '0.9rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '0.82rem' }}>
            <Link href="/terms" style={{ color: '#86868b', textDecoration: 'none' }}>Terms (commercial use)</Link>
          </p>
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 48, textAlign: 'center', ...CARD, borderRadius: 18, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Put your own topic through {e.name}</h2>
          <p style={{ color: '#86868b', margin: '8px 0 18px', fontSize: '0.95rem' }}>{copy.ctaLine}</p>
          <OrganicCtaLink href={signupHref} source={CAMPAIGN} placement="final" style={{ ...primaryButton, padding: '14px 30px', fontSize: '1.02rem' }}>
            {ctaLabel}
          </OrganicCtaLink>
          <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: '#6e6e73' }}>
            <Link href={PLANS_HREF} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>
              See what each paid plan includes →
            </Link>
          </p>
        </section>

        <nav style={{ marginTop: 40, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73', lineHeight: 2 }}>
          <Link href="/ai-video-generator" style={{ color: '#86868b', textDecoration: 'none' }}>Every engine</Link>
          {' · '}
          <Link href="/examples" style={{ color: '#86868b', textDecoration: 'none' }}>Real examples</Link>
          {' · '}
          <Link href="/pricing" style={{ color: '#86868b', textDecoration: 'none' }}>Pricing</Link>
        </nav>
      </div>

      <Footer />
    </main>
  )
}
