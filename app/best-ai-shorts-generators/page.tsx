// KINEO-SEO-ROUNDUP-2026-07-25 — /best-ai-shorts-generators: a roundup/hub
// page targeting the commercial-investigation head term "best ai shorts
// generator" / "best ai video generator for youtube shorts". Roundup pages win
// this intent because searchers want a ranked shortlist, not a single product
// pitch. Honest positioning only: no fabricated ratings or review counts —
// each tool is described by its real public category (re-clipper, avatar,
// captions, editor, generative-clip model, from-scratch generator). Kineo is
// #1 on a defensible, honest axis: it is the one tool here that builds a full
// Short from just a topic. Every competitor mentioned links to its real
// /alternatives/<slug> page (slugs verified against COMPETITORS in
// app/alternatives/[competitor]/page.tsx). Static + FAQPage + BreadcrumbList
// + ItemList JSON-LD so Google and answer engines can lift the ranking.

import type { Metadata } from 'next'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-STARTER-EM-ARTIGO-2026-08-15 — o MESMO componente da home/#70, nunca
// uma cópia. Ver o bloco no corpo. Client island; `force-static` segue valendo.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_MO, STARTER_MONTH } from '@/lib/marketingPrice'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const UPDATED = 'July 25, 2026'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Best AI YouTube Shorts Generators (2026) — Ranked & Compared',
  description:
    'The best AI YouTube Shorts generators in 2026, honestly ranked and compared. From-scratch generators vs re-clippers vs avatar and caption tools — what each does, free tiers and starting prices, so you pick the right one.',
  alternates: { canonical: 'https://www.usekineo.com/best-ai-shorts-generators' },
  openGraph: {
    title: 'Best AI YouTube Shorts Generators (2026) — Ranked & Compared',
    description:
      'A ranked, honest roundup of the best AI Shorts generators in 2026: from-scratch vs re-clip, script + voice + captions, free tiers and starting prices.',
    url: 'https://www.usekineo.com/best-ai-shorts-generators',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best AI YouTube Shorts Generators (2026)',
    description:
      'The best AI Shorts generators, ranked and compared honestly — from-scratch vs re-clip, free tiers and starting prices.',
  },
}

type Tool = {
  name: string
  slug: string | null // /alternatives/<slug>, or null for Kineo
  category: string
  take: string
  bestFor: string
  fromScratch: string
  freeTier: string
  startingPrice: string
}

// Ranked shortlist. Positioning is drawn from each tool's real public category,
// mirrored from Kineo's own comparison pages at /alternatives. Prices for
// competitors are intentionally described only as "paid plans" / rough ranges —
// third-party prices change and we do not want to quote stale numbers. Only
// Kineo's own prices are stated exactly.
const TOOLS: Tool[] = [
  {
    name: 'Kineo',
    slug: null,
    category: 'From-scratch faceless Short generator',
    take:
      'Kineo is the only tool on this list that turns a single typed topic into a finished faceless Short — script, AI voiceover, matched visuals and captions — with no footage, no camera and no timeline. Fast Mode renders usually land in about 3–7 minutes, and you can also paste your own script or add a talking AI Presenter. It is narrow on purpose: it does one job, idea-to-postable-Short, and does not try to be a general editor.',
    bestFor: 'Faceless creators starting from just an idea, with no source video to work from.',
    fromScratch: 'Yes',
    freeTier: `${ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)}, no card`,
    startingPrice: STARTER_MO,
  },
  {
    name: 'OpusClip',
    slug: 'opusclip',
    category: 'Long-video re-clipper',
    take:
      'OpusClip is the best-known tool for chopping a long video you already recorded — a podcast, stream or talking-head — into short vertical clips with captions and a virality score. It is genuinely great at that one job. It cannot help if you have no footage: there is nothing to clip from an idea.',
    bestFor: 'Creators who already film long videos and want them auto-clipped into Shorts.',
    fromScratch: 'No — needs your long video',
    freeTier: 'Limited free plan',
    startingPrice: 'Paid plans',
  },
  {
    name: 'InVideo AI',
    slug: 'invideo',
    category: 'General-purpose AI video maker',
    take:
      'InVideo AI is a powerful, broad text-to-video generator that can produce many formats — long, horizontal and vertical — from a prompt, with editing controls layered on top. That breadth is its strength and its trade-off: it is less opinionated about the retention-first structure a faceless Short needs. A capable all-rounder rather than a Shorts specialist.',
    bestFor: 'People who want one flexible tool for many video formats, not just Shorts.',
    fromScratch: 'Yes',
    freeTier: 'Limited free plan',
    startingPrice: 'Paid plans',
  },
  {
    name: 'Fliki',
    slug: 'fliki',
    category: 'Text-to-video with a huge voice library',
    take:
      'Fliki turns a script, blog post or prompt into a video using one of the largest AI voice and language libraries in the category (thousands of voices, 80+ languages). It is excellent when multilingual narration or voice cloning matters. It leans on a script you bring and an editor you work in, so it is less of a one-click, idea-to-Short flow.',
    bestFor: 'Multilingual creators who need many voices and languages and bring their own script.',
    fromScratch: 'Partial — best with your script',
    freeTier: 'Limited free plan',
    startingPrice: 'Paid plans',
  },
  {
    name: 'Pictory',
    slug: 'pictory',
    category: 'Content-repurposing summarizer',
    take:
      'Pictory summarizes long-form content — articles, blog posts, scripts and long videos — into shorter videos with stock visuals, AI voiceover and captions. It is mature and reliable for repurposing content you already have. It expects you to bring that source material, so it is not an idea-first generator.',
    bestFor: 'Bloggers and marketers turning existing written or long-form content into Shorts.',
    fromScratch: 'No — needs your content',
    freeTier: 'Limited free trial',
    startingPrice: 'Paid plans',
  },
  {
    name: 'HeyGen',
    slug: 'heygen',
    category: 'AI avatar / talking-head video',
    take:
      'HeyGen is the leading AI-avatar platform: pick or create a digital presenter, type a script and get a polished talking-head clip, with strong translation and enterprise workflows. It is the right tool when the deliverable is a spokesperson on screen. It produces the avatar clip, not the whole assembled, footage-driven Short around it.',
    bestFor: 'Anyone who wants a consistent talking avatar or corporate presenter clips.',
    fromScratch: 'Avatar clip from a script',
    freeTier: 'Limited free plan',
    startingPrice: 'Paid plans (higher entry)',
  },
  {
    name: 'Crayo',
    slug: 'crayo',
    category: 'Template-driven viral formats',
    take:
      'Crayo specializes in high-volume faceless clips built around specific viral templates — Reddit-story, fake-texts and split-screen gameplay — from a prompt or a link. If your channel lives on those exact formats, it is purpose-built for you. It is template-first rather than idea-first, so it is narrower if you want general narrated topics.',
    bestFor: 'Channels built on Reddit-story, fake-text or split-screen formats.',
    fromScratch: 'Yes, within its templates',
    freeTier: 'Limited free plan',
    startingPrice: 'Paid plans',
  },
  {
    name: 'AutoShorts',
    slug: 'autoshorts',
    category: 'Faceless autopilot with scheduling',
    take:
      'AutoShorts auto-generates faceless videos and can auto-post them to your channels on a schedule, which is its main draw. It is built for hands-off volume. The trade-off creators report is that scripts and footage can be hit-or-miss, so the output usually needs a review pass.',
    bestFor: 'Creators who want scheduled, hands-off auto-posting above per-video polish.',
    fromScratch: 'Yes',
    freeTier: 'Limited free trial',
    startingPrice: 'Paid plans',
  },
  {
    name: 'VEED',
    slug: 'veed',
    category: 'Browser-based video editor with AI tools',
    take:
      'VEED is a capable browser-based editor with AI helpers — auto-subtitles, a stock library, screen recording and a full timeline. It is built for people who want to sit down and edit hands-on. It is an editor first, so getting a finished Short still means assembling it yourself rather than one-shot generation.',
    bestFor: 'Editors who want manual control, subtitles and screen recording in the browser.',
    fromScratch: 'No — you edit it',
    freeTier: 'Free plan + paid tiers',
    startingPrice: 'Free + paid plans',
  },
  {
    name: 'Submagic',
    slug: 'submagic',
    category: 'Animated captions & B-roll',
    take:
      'Submagic adds punchy animated captions, emojis and B-roll to a video you already have, and it does that polish extremely well. It is a finishing layer, not a generator. If you have no video to caption yet, you still need a tool that creates one first.',
    bestFor: 'Creators who already have a video and want standout captions and effects.',
    fromScratch: 'No — needs your video',
    freeTier: 'Limited free trial',
    startingPrice: 'Paid plans',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is the best AI YouTube Shorts generator in 2026?',
    a: 'It depends on your starting point. If you have no footage and want a finished faceless Short from just a topic, Kineo is the strongest pick — it writes the script, adds an AI voiceover, matches visuals and burns in captions, usually in about 3–7 minutes. If you already record long videos and only want them clipped, a re-clipper like OpusClip is the better fit. If you need a talking presenter on screen, HeyGen is built for that.',
  },
  {
    q: 'What is the difference between a from-scratch generator and a re-clipper?',
    a: 'A from-scratch generator (like Kineo) creates a brand-new Short from an idea — you supply no video. A re-clipper (like OpusClip or Vizard) needs an existing long video and cuts the best moments out of it into short clips. If you have no source footage, a re-clipper cannot help you; if you already film long videos, a re-clipper saves you editing time.',
  },
  {
    q: 'Which AI Shorts tools include the script, voiceover and captions?',
    a: 'Kineo includes all of it from one idea — script, AI voiceover, matched visuals and captions. Caption-only tools like Submagic add captions to a video you already made. Avatar tools like HeyGen give you a talking presenter but not the full footage-driven Short around it. Always check whether a tool writes the script for you or expects you to bring one.',
  },
  {
    q: 'Are there free AI Shorts generators?',
    a: `Most tools here have a limited free plan or trial, usually with a watermark or a monthly cap. ${ft(OFFER, 'Kineo lets a new account create, download and share up to 3 watermarked Fast videos every 24 hours with no credit card.', OFFER.copy.sentence)} Paid plans remove the watermark and add credits — Kineo Starter is ${STARTER_MONTH}, the same price worldwide.`,
  },
  {
    q: 'How should I choose an AI Shorts generator?',
    a: 'Answer four questions: (1) Do you have source footage, or are you starting from an idea? (2) Do you need the script and voiceover written for you, or will you bring your own? (3) Do you want a face/presenter, or fully faceless? (4) What is your budget and do you need a free tier to test first? Match those answers to a tool built for that exact job rather than the most feature-packed one.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CTA_URL =
  '/free-ai-shorts-generator?utm_source=best-roundup&utm_medium=seo&utm_campaign=seo-sprint'

export default function BestAiShortsGeneratorsPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.usekineo.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Best AI Shorts Generators',
        item: 'https://www.usekineo.com/best-ai-shorts-generators',
      },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Best AI YouTube Shorts Generators (2026)',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: TOOLS.length,
    itemListElement: TOOLS.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      description: t.category,
    })),
  }

  return (
    <main
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '64px 20px 96px',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }}
      />

      <div style={{ maxWidth: 860, margin: '0 auto' }}>
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
          Roundup — updated {UPDATED}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          Best AI YouTube Shorts Generators (2026)
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          &ldquo;Best AI Shorts generator&rdquo; has no single answer, because these tools
          are not doing the same job. Some generate a whole video from an idea, some re-clip
          a long video you already filmed, some only add captions, and some put a talking
          avatar on screen. The right one depends on what you are starting with. Below is an
          honest, ranked shortlist — what each tool actually does, who it is for, and how they
          compare on price and free tiers.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          No paid placements and no invented star ratings. Positioning reflects each tool&rsquo;s
          real public category as of {UPDATED}. We only quote Kineo&rsquo;s own exact prices;
          competitor prices change, so verify those on their sites.
        </p>

        {/* How to choose */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How to choose an AI Shorts generator
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 16px' }}>
          Before comparing features, answer four questions. They eliminate most of the list
          instantly.
        </p>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 20px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              1. From scratch, or re-clip?
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              If you have no footage and want a video from just a topic, you need a from-scratch
              generator (Kineo, InVideo). If you already record long videos or podcasts, a
              re-clipper (OpusClip) cuts them into Shorts far faster than starting over.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              2. Do you want the script and voiceover written for you?
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Some tools expect you to bring a script (Fliki shines when you do). Others write the
              hook-to-payoff script and narrate it for you, so you never face a blank page. If you
              want to type one topic and walk away, that distinction matters most.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              3. Faceless, or a presenter on screen?
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              For a talking avatar or spokesperson, avatar tools (HeyGen) are purpose-built. For
              fully faceless footage-driven Shorts, a faceless generator fits better. A few tools
              — including Kineo — can do both.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              4. Price and free tier
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Most tools have a limited free plan or watermarked trial so you can test output
              before paying. Check what the plan really costs every month — an advertised
              first-month price is not the price you will pay — whether credits
              roll over, and whether the free tier is enough to validate a niche.
            </p>
          </section>
        </div>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 44px' }}>
          Planning to monetize? It also helps to know the numbers before you commit to a niche —
          see{' '}
          <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
            how much YouTube Shorts pay
          </a>{' '}
          and the{' '}
          <a href="/youtube-shorts-rpm-by-niche" style={{ color: ACCENT, textDecoration: 'none' }}>
            YouTube Shorts RPM by niche
          </a>
          .
        </p>

        {/* Ranked list */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          The ranking: 10 best AI Shorts generators
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 20px' }}>
          Ranked for the most common case: a creator who wants to publish faceless Shorts and is
          starting from an idea rather than existing footage. If your situation is different, the
          &ldquo;best for&rdquo; note on each tool points you to the right pick.
        </p>
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 48px', display: 'grid', gap: 12 }}>
          {TOOLS.map((t, i) => (
            <li key={t.name} style={{ ...CARD, padding: '18px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 8px' }}>
                <span style={{ color: ACCENT, fontWeight: 800, fontSize: '1.15rem', minWidth: 28 }}>
                  {i + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'inline' }}>
                    {t.slug ? (
                      <a
                        href={`/alternatives/${t.slug}`}
                        style={{ color: '#f5f5f7', textDecoration: 'none' }}
                      >
                        {t.name}
                      </a>
                    ) : (
                      t.name
                    )}
                  </h3>
                  <p style={{ color: ACCENT, fontSize: '0.82rem', fontWeight: 600, margin: '2px 0 0' }}>
                    {t.category}
                  </p>
                </div>
              </div>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 10px' }}>
                {t.take}
              </p>
              <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>
                <strong style={{ color: '#f5f5f7' }}>Best for:</strong> {t.bestFor}
                {t.slug && (
                  <>
                    {' '}
                    <a
                      href={`/alternatives/${t.slug}`}
                      style={{ color: ACCENT, textDecoration: 'none' }}
                    >
                      Kineo vs {t.name} →
                    </a>
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>

        {/* Comparison table */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          Comparison table
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          What each tool does at a glance. &ldquo;From scratch&rdquo; means it can build a Short
          from just an idea with no source video.
        </p>
        <div style={{ overflowX: 'auto', margin: '0 0 48px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              minWidth: 640,
            }}
          >
            <thead>
              <tr>
                {['Tool', 'What it does', 'From scratch?', 'Free tier', 'Starting price'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderBottom: `1px solid ${ACCENT}`,
                      color: ACCENT,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.name}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2d', fontWeight: 700 }}>
                    {t.slug ? (
                      <a href={`/alternatives/${t.slug}`} style={{ color: '#f5f5f7', textDecoration: 'none' }}>
                        {t.name}
                      </a>
                    ) : (
                      <span style={{ color: ACCENT }}>{t.name}</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2d', color: '#d2d2d7' }}>
                    {t.category}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2d', color: '#d2d2d7' }}>
                    {t.fromScratch}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2d', color: '#d2d2d7' }}>
                    {t.freeTier}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2d', color: '#d2d2d7' }}>
                    {t.startingPrice}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Why Kineo #1 */}
        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 48px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px' }}>
            Why Kineo tops the list for from-scratch Shorts
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Most tools here assume you already have something — a long video to clip, a script to
            narrate, a clip to caption, or an avatar to render. Kineo is the one that starts from
            nothing but a topic and hands you a finished, ready-to-post 9:16 Short: hook-first
            script, AI voiceover, matched visuals and captions, usually in about 3–7 minutes. Test
            it free — {ft(OFFER, 'up to 3 watermarked Fast videos every 24 hours, no credit card.', 'every new account can start a 7-day Creator trial: $1 to start, 80 credits, every engine except Studio, card required.')}
          </p>
          {/* KINEO-STARTER-EM-ARTIGO-2026-08-15 — aqui havia um `<a href={CTA_URL}>`
              CRU para `/free-ai-shorts-generator`: nenhum `organic_cta_clicked`
              (o banco não distinguia "ninguém clica" de "não há instrumento") e
              destino em OUTRA página de SEO, o circuito fechado de 14/08.

              O parágrafo acima acabou de afirmar, sobre 11 concorrentes, que a
              diferença desta ferramenta é COMEÇAR DE UM TÓPICO E NADA MAIS.
              Provar isso com um link para outro artigo era a contradição mais
              cara da página. Agora a própria frase é executável: o leitor digita
              o tópico ali e o argumento vira demonstração.

              Medido em 15/08 16h: artigo COM porta = 316 sessões / 0 cliques;
              one-click starters da home = 278 pessoas / 68% de ativação. Mesmo
              componente da home/#70, nunca uma cópia. `CTA_URL` continua vivo no
              bloco "Keep reading" — lá ele é leitura, não é a oferta. */}
          <TopicGeneratorForm
            campaign="starter_best_generators"
            source="starter_best_generators"
            formId="roundup-start-a-short"
            examples={[
              'The invention that was laughed at before it changed everything',
              'The place on Earth with rules no other country has',
              'The historical mistake that is still costing us today',
            ]}
            copy={{
              label: 'Try the from-scratch claim — type a topic, get a Short',
              placeholder: 'Type one topic — nothing else needed, no footage, no script',
              submit: 'Turn this topic into a Short →',
              examplesLabel: 'Example topics to test it with',
              note: 'Nothing but a topic goes in. Your topic stays attached through signup. No card required for the free Fast workflow.',
            }}
          />
        </section>

        {/* FAQ */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 48px' }}>
          {FAQ.map((item, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {item.a}
              </p>
            </section>
          ))}
        </div>

        {/* Further reading */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>
          Keep reading
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/alternatives" style={{ color: ACCENT, textDecoration: 'none' }}>
              All 27 tool comparisons
            </a>{' '}
            — head-to-head pages for every generator, re-clipper, avatar and editor above.
          </li>
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
              How much do YouTube Shorts pay?
            </a>{' '}
            — realistic earnings before you pick a tool or niche.
          </li>
          <li>
            <a href="/youtube-shorts-rpm-by-niche" style={{ color: ACCENT, textDecoration: 'none' }}>
              YouTube Shorts RPM by niche
            </a>{' '}
            — which niches pay the most per 1,000 views.
          </li>
          <li>
            <a href={CTA_URL} style={{ color: ACCENT, textDecoration: 'none' }}>
              Free AI Shorts generator
            </a>{' '}
            — make your first faceless Short now, no card.
          </li>
        </ul>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Positioning on this page reflects each tool&rsquo;s public product category as of{' '}
          {UPDATED}. Only Kineo&rsquo;s prices are quoted exactly; verify competitor pricing and
          features on their official sites, as they change over time.
        </p>
      </div>
    </main>
  )
}
