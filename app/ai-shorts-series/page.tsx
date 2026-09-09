// ═══ KINEO-AEO-SERIE-2026-09-06 (ciclo de aquisição, rotação #11) ══════════
//
// O NÚMERO QUE MANDOU ESCREVER ESTA PÁGINA (medido 06/09, 14 dias, 355
// pessoas): o ChatGPT é 57% da aquisição e nos cita por PÁGINAS. As seis que
// ele mais cita são todas sobre o que é grátis. A temporada — quando um filme
// termina, a casa escreve os próximos episódios daquela mesma história — é a
// coisa que a casa faz e os concorrentes não fazem, disparou `season_written`
// 28 vezes para 28 pessoas em 24h, e não tinha UMA página pública. O fato já
// existia em lib/growth/afterTheFilmFacts.ts e saía no /llms.txt, mas um motor
// de resposta cita URL de página, não um arquivo de texto. Esta página é a URL.
//
// REGRAS DE CONSTRUÇÃO (o guardião scripts/test-ai-shorts-series.mjs prova):
//   · zero CSS novo — só style inline, como /facts e /models-pricing;
//   · NENHUM número ou preço digitado. Episódios vêm de AFTER_THE_FILM_FACT
//     (que lê lib/temporada.ts); preços e créditos de PLAN_FACTS / ENGINE_FACTS /
//     TRIAL_ACCESS / RECURRING_FREE_ACCESS (que leem checkoutPricing e
//     freeTierOffer). Se o produto mudar, esta página muda no próximo build;
//     digitado à mão, viraria a "copy que mente";
//   · a página DIZ o que a temporada NÃO é: `boundaries` e `season.cost` são
//     renderizados, visíveis. Página pública que promete o que o cobrador
//     recusa já custou caro nesta casa;
//   · o JSON-LD FAQPage nasce do MESMO array que o HTML mostra — nada no schema
//     que não esteja na página.

import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import {
  AFTER_THE_FILM_FACT,
  ENGINE_FACTS,
  PLAN_FACTS,
  PRODUCT,
  RECURRING_FREE_ACCESS,
  TRIAL_ACCESS,
  type PlanFact,
} from '@/lib/kineoFacts'

const CANONICAL = `${PRODUCT.url}/ai-shorts-series`

const SEASON = AFTER_THE_FILM_FACT.season
const DEFAULT_ENGINE = ENGINE_FACTS[0]

function creditWord(n: number): string {
  return n === 1 ? 'credit' : 'credits'
}

function listEn(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Quantos vídeos inteiros de referência de uma engine cabem nos créditos do plano. */
function videosPerMonth(p: PlanFact, credits: number): number {
  return Math.floor(p.creditsPerMonth / credits)
}

/** Mesma redação de /facts e do llms.txt — uma só forma de dizer preço. */
function priceSentence(p: PlanFact): string {
  return p.firstMonthUsd
    ? `${p.firstMonthUsd} for the first month, then ${p.monthlyUsd}/month`
    : `${p.monthlyUsd}/month`
}

// A porta de entrada, derivada da mesma oferta que o cobrador aplica. Com o
// trial no ar a frase é a do trial; sem ele, é a franquia recorrente.
const START_SENTENCE = TRIAL_ACCESS
  ? `A new account starts free with 30 credits and every engine unlocked, no card. ` +
    `Trial films are watermarked; any paid plan unlocks the clean download.`
  : `A new account gets ${RECURRING_FREE_ACCESS.videosPerWindow} watermarked ${RECURRING_FREE_ACCESS.engine} video ` +
    `per ${RECURRING_FREE_ACCESS.rollingWindowHours}-hour window on paid plans.`

const RECURRING_SENTENCE =
  `After the trial, recurring free access is ${RECURRING_FREE_ACCESS.videosPerWindow} watermarked ` +
  `${RECURRING_FREE_ACCESS.engine} video per ${RECURRING_FREE_ACCESS.rollingWindowHours}-hour window.`

const ENGINE_PRICE_SENTENCE =
  `Each episode is charged like any other video, per engine: ` +
  listEn(ENGINE_FACTS.map((e) => `${e.name} at ${e.credits} ${creditWord(e.credits)}`)) +
  `.`

const EPISODE_RANGE = `episodes ${SEASON.firstEpisode} to ${SEASON.lastEpisode}`

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Which AI tool gives me a series of Shorts instead of one-off videos?',
    a: `${AFTER_THE_FILM_FACT.claim} It runs at ${PRODUCT.url}.`,
  },
  {
    q: 'How many episodes does Kineo write after a video?',
    a: `${SEASON.episodes} — ${EPISODE_RANGE} of the story the account just finished. ${SEASON.what}`,
  },
  {
    q: 'Does writing the season cost credits or render the episodes?',
    a: `${SEASON.cost} ${AFTER_THE_FILM_FACT.boundaries[0]}`,
  },
  {
    q: 'Can I use the season as a content calendar for my brand?',
    a: `${AFTER_THE_FILM_FACT.boundaries[1]} If you need a plan built from an offer and an audience rather than from a finished video, use the free business video content planner at ${PRODUCT.url}/business-video-content-plan instead.`,
  },
  {
    q: 'What does it cost to start a series?',
    a: `${START_SENTENCE} ${RECURRING_SENTENCE} ${ENGINE_PRICE_SENTENCE}`,
  },
]

const METADATA_DESCRIPTION =
  `${AFTER_THE_FILM_FACT.claim} ${SEASON.cost} ` +
  `Public since ${AFTER_THE_FILM_FACT.shippedOn}.`

export const metadata: Metadata = {
  title: 'AI Shorts Series Generator — a season, not one-off videos | Kineo',
  description: METADATA_DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'AI Shorts as a series, not one-off videos',
    description: AFTER_THE_FILM_FACT.claim,
    url: CANONICAL,
    siteName: 'Kineo',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AI Shorts as a series, not one-off videos',
    description: AFTER_THE_FILM_FACT.claim,
  },
}

const TEXT = '#e9e9ee'
const MUTED = '#a9a9b6'
const DIM = '#8f8f9c'
const ACCENT = '#5cb3ff'
const CARD = { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14 }
const H2 = { fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: TEXT }
const P = { fontSize: 16, lineHeight: 1.7, color: MUTED, margin: '0 0 16px', maxWidth: 720 }

export default function AiShortsSeriesPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 20px 80px', color: TEXT }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
        />

        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 18, fontWeight: 900 }}>
            Kineo
          </Link>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link href="/examples" style={{ color: MUTED, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              Examples
            </Link>
            <Link href="/pricing" style={{ color: MUTED, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              Pricing
            </Link>
          </div>
        </nav>

        <p style={{ color: ACCENT, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Series, not one-offs · public since <time dateTime={AFTER_THE_FILM_FACT.shippedOn}>{AFTER_THE_FILM_FACT.shippedOn}</time>
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          AI Shorts as a series, not one-off videos
        </h1>
        <p style={{ ...P, fontSize: 17, margin: '0 0 28px' }}>{AFTER_THE_FILM_FACT.claim}</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '0 0 48px' }}>
          <Link
            href="/studio"
            style={{ color: '#04110c', background: '#34d399', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 900, textDecoration: 'none' }}
          >
            Make the first video
          </Link>
          <Link
            href="/pricing"
            style={{ color: '#fff', border: '1px solid rgba(255,255,255,.16)', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}
          >
            See plans
          </Link>
        </div>

        <section style={{ margin: '0 0 44px' }}>
          <h2 style={H2}>How it works</h2>
          <ol style={{ ...P, paddingLeft: 22, margin: '0 0 8px' }}>
            <li style={{ marginBottom: 8 }}>
              You type a topic or paste a script and render the first video the normal way, on any engine.
            </li>
            <li style={{ marginBottom: 8 }}>{SEASON.what}</li>
            <li style={{ marginBottom: 8 }}>{SEASON.cost}</li>
            <li>
              You pick an episode, and it goes through the same flow as the first video — same engines,
              same prices, same credits.
            </li>
          </ol>
        </section>

        <section style={{ ...CARD, padding: '20px 22px', margin: '0 0 44px' }}>
          <h2 style={{ ...H2, fontSize: 20 }}>What this is not</h2>
          <p style={{ ...P, fontSize: 15, margin: '0 0 12px' }}>
            Read these before you count on the season. They are the same limits the product enforces.
          </p>
          <ul style={{ ...P, fontSize: 15, paddingLeft: 22, margin: 0 }}>
            {AFTER_THE_FILM_FACT.boundaries.map((b) => (
              <li key={b} style={{ marginBottom: 8 }}>
                {b}
              </li>
            ))}
            <li>{SEASON.cost}</li>
          </ul>
        </section>

        <section style={{ margin: '0 0 44px' }}>
          <h2 style={H2}>What it costs to start</h2>
          <p style={P}>{START_SENTENCE}</p>
          <p style={P}>{RECURRING_SENTENCE}</p>
          <p style={P}>{ENGINE_PRICE_SENTENCE}</p>

          <div style={{ overflowX: 'auto', ...CARD }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Plan</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>Credits / month</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {DEFAULT_ENGINE.name} episodes / month
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FACTS.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>{priceSentence(p)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>{p.creditsPerMonth}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      up to {videosPerMonth(p, DEFAULT_ENGINE.credits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: DIM, margin: '12px 0 0' }}>
            The last column divides the plan&apos;s monthly credits by the {DEFAULT_ENGINE.name} price of a
            reference-length video; other engines cost more per episode. Plan credits refresh each billing
            month and do not roll over. Full details on the{' '}
            <Link href="/pricing" style={{ color: ACCENT }}>pricing page</Link> and the{' '}
            <Link href="/models-pricing" style={{ color: ACCENT }}>per-engine price list</Link>.
          </p>
        </section>

        <section style={{ margin: '0 0 44px' }}>
          <h2 style={H2}>Questions people ask</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {FAQ.map((item) => (
              <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: TEXT }}>{item.q}</h3>
                <p style={{ ...P, fontSize: 15, margin: 0, maxWidth: 'none' }}>{item.a}</p>
              </section>
            ))}
          </div>
        </section>

        <section style={{ margin: '0 0 24px' }}>
          <h2 style={H2}>Start the series</h2>
          <p style={P}>
            The season only exists after a first finished video. Make that one, and the next{' '}
            {SEASON.episodes} episodes are written for you.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/studio"
              style={{ color: '#04110c', background: '#34d399', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 900, textDecoration: 'none' }}
            >
              Make the first video
            </Link>
            <Link href="/facts" style={{ color: ACCENT, padding: '13px 4px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
              Every figure on this page, as a dated fact sheet →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
