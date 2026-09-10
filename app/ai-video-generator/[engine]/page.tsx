// KINEO-ENGINE-SEO-2026-08-15 — o cluster de SEO por MOTOR.
//
// POR QUE ESTA PÁGINA EXISTE (docs/SPRINT-2026-08-15-10H.md, seção 5):
// desde 15/08 a home lidera pelos NOMES dos motores — Seedance 1.5, Kling 2.5,
// Veo 3.1, Kling 3, Kineo 1 — e o site não tinha UMA página mirando esses
// nomes. As 29 páginas programáticas existentes são por NICHO (money, mystery,
// faith…) e as de comparação são por CONCORRENTE. O vocabulário que a nossa
// própria home passou a usar era, até aqui, um buraco no cluster.
//
// POR QUE A NOSSA GANHA EM VEZ DE VIRAR A DÉCIMA QUINTA: WaveSpeed, OpenArt,
// vo3ai, veo3ai e o blog da HeyGen disputam "free AI video generator — Veo /
// Kling / Seedance" mostrando DEMO REEL PRÓPRIO. Nós mostramos Shorts 9:16
// REAIS, terminados, de usuários reais, naquele motor, com o tópico em texto e
// link para a página pública do vídeo (/v/[id], indexável, com video-sitemap).
// A infra já existia inteira — getEngineHero/buildWall, /v/[id], video-sitemap.
//
// HONESTIDADE (a regra que o conserto das 10h de hoje pagou caro para aprender):
// Kling 2.5, Veo 3.1 e Kling 3 são motores de STUDIO. O trial Creator NÃO os
// destrava. Esta página diz isso na cara, no chip do hero e no FAQ — nunca
// "grátis" para um motor que o visitante não consegue rodar de graça. Toda copy
// de free tier passa por ft(OFFER, …), como as outras ~45 frases do repositório.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import AgencyVolumeBridge from '@/components/AgencyVolumeBridge'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import StickyFreeShortCTA from '@/components/StickyFreeShortCTA'
import WallMedia from '@/components/WallMedia'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { getEngineRenders } from '@/lib/engineWall'
import {
  getFreeTierOffer,
  swapFreeTierCopy as ft,
  TRIAL_CREDITS_SHOWN,
} from '@/lib/freeTierOffer'
import {
  buildEngineLandingDestination,
  buildEngineLandingSignupHref,
} from '@/lib/growth/engineLandingIntent'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
import { ENGINES, ENGINE_SLUGS, type Engine } from '@/lib/growth/enginePageCatalog'
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'
export const dynamicParams = false

function engineCostLabel(engine: Engine): string {
  return engine.tier === 'Free'
    ? `Free with watermark · ${engine.creditCost} credits for a clean 60-second export`
    : `${engine.creditCost} credits per 60-second video`
}

export function generateStaticParams() {
  return ENGINE_SLUGS.map((engine) => ({ engine }))
}

const BASE = 'https://www.usekineo.com'

export function generateMetadata({ params }: { params: { engine: string } }): Metadata {
  const e = ENGINES[params.engine]
  if (!e) return {}
  const title = `${e.name} AI Video Generator for YouTube Shorts | Kineo`
  const description = `Turn one idea into a finished vertical Short rendered by ${e.name} — script, AI voiceover, scenes and captions, ${engineCostLabel(e).toLowerCase()}. Watch real user renders made with ${e.name}, not a demo reel.`
  const url = `${BASE}/ai-video-generator/${params.engine}`
  return {
    metadataBase: new URL(BASE),
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }

export default async function EnginePage({ params }: { params: { engine: string } }) {
  const e = ENGINES[params.engine]
  if (!e) notFound()

  // A PROVA. Renders reais daquele motor, do banco, com o quality_mode REAL —
  // um vídeo só recebe o selo "VEO 3.1" se foi o Veo que o gerou. Falha de
  // banco ⇒ lista vazia ⇒ a seção some (buildWall já é try/catch), a página
  // nunca quebra por causa dela.
  const renders = await getEngineRenders(e.qualityMode, 8)

  const campaign = `seo_engine_${params.engine}`
  const studioUrl = buildEngineLandingDestination({ engine: e.param, campaign })
  const signupUrl = buildEngineLandingSignupHref({ engine: e.param, campaign })
  // EVIDÊNCIA DE PRODUÇÃO (29/08/2026): seo_engine_kineo-1 ativou 7 de 19
  // cadastros, enquanto as portas orgânicas que carregam uma ideia concreta
  // ativaram 64–76%. Kineo 1 é o único motor desta página que pode preservar
  // esse padrão e ainda cumprir exatamente o motor prometido: create_intent=fast
  // abre o Fast, não troca a escolha e não toca nos motores premium.
  const kineoOneStarterId = 'try-kineo-1'
  const primaryCtaHref = e.param === 'fast' ? `#${kineoOneStarterId}` : signupUrl

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: e.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'AI video generator', item: `${BASE}/ai-video-generator/${params.engine}` },
      { '@type': 'ListItem', position: 3, name: e.name, item: `${BASE}/ai-video-generator/${params.engine}` },
    ],
  }

  const tierNote = e.tier === 'Free'
    ? ft(OFFER, 'Free with a watermark · no card', OFFER.copy.chip)
    : `${e.name} is unlocked on every account. Its ${e.creditCost}-credit 60-second cost is covered by the ${e.tier} monthly grant; the ${TRIAL_CREDITS_SHOWN}-credit free trial ${TRIAL_CREDITS_SHOWN >= e.creditCost ? 'covers one' : 'does not cover one'}.`

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: '#86868b', fontSize: 13 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <span>AI video generator</span>
          <span aria-hidden> / </span>
          <span style={{ color: '#d2d2d7' }}>{e.name}</span>
        </nav>

        {/* Hero */}
        <section style={{ marginTop: 34, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', borderRadius: 999, padding: '6px 14px' }}>
            {e.name} · {engineCostLabel(e)}
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>{e.h1}</h1>
          <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 680 }}>{e.intro}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 22 }}>
            <OrganicCtaLink
              href={primaryCtaHref}
              source={campaign}
              placement="hero"
              style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}
            >
              {e.tier === 'Free' || TRIAL_CREDITS_SHOWN >= e.creditCost
                ? `Try ${e.name} free →`
                : CARD_ENTRY_COPY.ctaLong}
            </OrganicCtaLink>
            <Link
              href="/pricing"
              style={{ display: 'inline-block', border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 24px', borderRadius: 980, textDecoration: 'none' }}
            >
              See plans &amp; credits
            </Link>
          </div>
          {/* Honestidade explícita: nunca prometer grátis um motor de Studio. */}
          <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '12px 0 0' }}>{tierNote}</p>
        </section>

        {e.param === 'fast' && (
          <TopicGeneratorForm
            campaign={campaign}
            source={campaign}
            formId={kineoOneStarterId}
            creationIntent="fast"
            preserveHandoffForSignedIn
            examples={[
              'The island nobody is allowed to visit',
              'The money habit that quietly keeps people broke',
              'The strange signal scientists still cannot explain',
            ]}
            copy={{
              label: 'What should Kineo 1 make first?',
              placeholder: 'Type one topic, fact, story or hook',
              submit: 'Make this with Kineo 1 →',
              examplesLabel: 'One-click starter ideas',
              note: 'Your idea stays attached through signup and starts with Kineo 1. Your remaining trial balance stays available for the next test.',
            }}
          />
        )}

        {/* A PROVA — renders reais deste motor */}
        {renders.length > 0 && (
          <section style={{ marginTop: 52 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 6px' }}>
              Real Shorts rendered by {e.name}
            </h2>
            <p style={{ textAlign: 'center', color: '#86868b', fontSize: '0.9rem', margin: '0 auto 20px', maxWidth: 620, lineHeight: 1.6 }}>
              Not a demo reel. These are finished 9:16 videos from real Kineo accounts, and the badge on each one is the
              engine that actually rendered it. Open any of them to watch the whole thing and read the script.
            </p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {renders.map((v) => (
                <Link
                  key={v.id}
                  href={`/v/${v.id}`}
                  style={{ display: 'block', overflow: 'hidden', borderRadius: 14, ...CARD, textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '9 / 16', overflow: 'hidden', background: '#000' }}>
                    <WallMedia src={v.videoUrl} />
                    <span style={{ position: 'absolute', left: 8, top: 8, zIndex: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', padding: '2px 7px', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {v.badge}
                    </span>
                  </div>
                  <p style={{ margin: 0, padding: '9px 10px', fontSize: '11.5px', fontWeight: 700, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)' }}>{v.title}</p>
                </Link>
              ))}
            </div>
            <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: '0.85rem' }}>
              <Link href="/examples" style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>
                See the 20 best renders across every engine →
              </Link>
            </p>
          </section>
        )}

        {/* Ficha técnica */}
        <section style={{ marginTop: 52 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>{e.name} inside Kineo</h2>
          <div style={{ ...CARD, borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                {[
                  ['Model called', e.model],
                  ['Cost per video', engineCostLabel(e)],
                  ['Smallest monthly grant that covers one', e.tier === 'Free' ? 'None — runs on a free account' : e.tier],
                  ['Output', 'Vertical 9:16 MP4, script + AI voiceover + captions already assembled'],
                  ['Typical turnaround', '3–7 minutes from idea to download'],
                  ['Best for', e.bestFor],
                  ['Trade-off', e.tradeoff],
                ].map(([k, v], i) => (
                  <tr key={k} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '12px 14px', color: '#86868b', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{k}</td>
                    <td style={{ padding: '12px 14px', color: '#f5f5f7', lineHeight: 1.55 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {params.engine === 'kineo-1' ? (
          <AgencyVolumeBridge entry="kineo1_engine" />
        ) : null}

        {/* Como funciona */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Type one idea', d: 'A topic, a fact, a hook — one sentence. No prompt engineering, no scene list.' },
              { n: '2', t: `${e.name} renders the scenes`, d: 'Kineo writes the hook-first script, splits it into scenes and prompts the engine for each one, then adds the AI voiceover and captions.' },
              { n: '3', t: 'Download & post', d: 'A vertical 9:16 MP4 in a few minutes, ready for YouTube Shorts, TikTok and Reels.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 14, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.12)', color: '#2997ff', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#86868b', lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Escolha de motor — a tabela que responde "qual eu uso?" e faz o
            interlinking do cluster inteiro numa superfície só. */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>Every engine, side by side</h2>
          <div style={{ ...CARD, borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#86868b' }}>Engine</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', fontWeight: 700, color: '#86868b' }}>Cost</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', fontWeight: 700, color: '#86868b' }}>Plan</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#86868b' }}>Reach for it when</th>
                </tr>
              </thead>
              <tbody>
                {ENGINE_SLUGS.map((slug, i) => {
                  const o = ENGINES[slug]
                  const here = slug === params.engine
                  return (
                    <tr key={slug} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: here ? 'rgba(41,151,255,0.07)' : i % 2 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 800 }}>
                        {here ? (
                          <span style={{ color: '#2997ff' }}>{o.name} <span style={{ fontWeight: 600, color: '#6e6e73' }}>· you are here</span></span>
                        ) : (
                          <Link href={`/ai-video-generator/${slug}`} style={{ color: '#f5f5f7', textDecoration: 'none' }}>{o.name}</Link>
                        )}
                      </td>
                      <td style={{ padding: '11px 10px', color: '#d2d2d7', whiteSpace: 'nowrap' }}>{o.tier === 'Free' ? 'Free' : `${o.creditCost} cr`}</td>
                      <td style={{ padding: '11px 10px', color: o.tier === 'Studio' ? '#86868b' : '#2997ff', fontWeight: 700 }}>{o.tier}</td>
                      <td style={{ padding: '11px 14px', color: '#86868b', lineHeight: 1.5 }}>{o.bestFor}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.74rem', color: '#6e6e73', textAlign: 'center', margin: '10px 0 0' }}>
            Credit costs read from Kineo&rsquo;s single pricing source (August 2026). Engines and costs may change.
          </p>
        </section>

        {/* FAQ */}
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
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 48, textAlign: 'center', ...CARD, borderRadius: 18, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Put your own topic through {e.name}</h2>
          <p style={{ color: '#86868b', margin: '8px 0 18px', fontSize: '0.95rem' }}>
            One idea in, a ready-to-post vertical Short out. No editing timeline. Free to start.
          </p>
          <OrganicCtaLink
            href={primaryCtaHref}
            source={campaign}
            placement="final"
            style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}
          >
            {CARD_ENTRY_COPY.ctaLong}
          </OrganicCtaLink>
          <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: '#6e6e73' }}>
            Already have an account?{' '}
            <Link href={studioUrl} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>
              Open the generator with {e.name} selected →
            </Link>
          </p>
        </section>

        {/* Interlinking do cluster */}
        <nav style={{ marginTop: 40, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73', lineHeight: 2 }}>
          <div>
            <span>Other engines: </span>
            {ENGINE_SLUGS.filter((s) => s !== params.engine).map((s, i) => (
              <span key={s}>
                {i > 0 && ' · '}
                <Link href={`/ai-video-generator/${s}`} style={{ color: '#86868b', textDecoration: 'none' }}>{ENGINES[s].name}</Link>
              </span>
            ))}
          </div>
          <div>
            <Link href="/examples" style={{ color: '#86868b', textDecoration: 'none' }}>Real examples</Link>
            {' · '}
            <Link href="/pricing" style={{ color: '#86868b', textDecoration: 'none' }}>Pricing</Link>
            {' · '}
            <Link href="/alternatives" style={{ color: '#86868b', textDecoration: 'none' }}>Tool alternatives</Link>
            {' · '}
            <Link href="/free-ai-shorts-generator" style={{ color: '#86868b', textDecoration: 'none' }}>Free AI Shorts generator</Link>
            {' · '}
            <Link href="/best-ai-shorts-generators" style={{ color: '#86868b', textDecoration: 'none' }}>Best AI Shorts generators</Link>
          </div>
        </nav>
      </div>

      <StickyFreeShortCTA href={primaryCtaHref} />
      <Footer />
    </main>
  )
}
