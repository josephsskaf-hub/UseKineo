// KINEO-BENCHMARK-MOTORES-2026-09-23 — "Seedance vs Veo vs Kling", medido nos renders reais da casa.
//
// POR QUE ESTA PÁGINA EXISTE (medido 23/09): o ChatGPT manda ~200 sessões/semana; a /state-of-ai-shorts-2026 é a 2ª
// página mais citada e a única que é citada por ter DADO PRÓPRIO. Quem compara motores pergunta "Seedance vs Veo vs
// Kling" — e toda página da categoria responde com opinião ou demo reel. Esta responde com o que o banco diz: quantos
// filmes cada motor entregou em 90 dias, para quantas pessoas, com que duração mediana, e quanto custa um filme de
// 60 s em créditos. Fundador 23/09: "vai" nas 3 jogadas (página de dados no padrão da /state-of-ai).
//
// HONESTIDADE: contas internas fora (lib/engineBenchmarkStats); amostra pequena é dita como pequena; motor pausado
// aparece como pausado; nenhum preço é digitado — tudo vem de TIER_PRICES/TIER_CREDITS/creditCostForDuration.
// A ponte roteiro → Seedance (components/ScriptToSeedanceBridge) mede impressão e clique com from='benchmark'.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ScriptToSeedanceBridge from '@/components/ScriptToSeedanceBridge'
import { getEngineBenchmarkStats, type EngineBenchmarkRow } from '@/lib/engineBenchmarkStats'
import { STUDY_REVALIDATE_SECONDS } from '@/lib/studyStats'
import { ENGINES, ENGINE_SLUGS } from '@/lib/growth/enginePageCatalog'
import { enginePaused } from '@/lib/engineLaunch'
import { ENGINE_FACTS } from '@/lib/kineoFacts'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'

// Mesmo regime da /state-of-ai-shorts-2026: os números vêm do banco, revalida uma vez por dia.
export const revalidate = STUDY_REVALIDATE_SECONDS

const BASE = 'https://www.usekineo.com'
const PATH = '/seedance-vs-veo-vs-kling'
const CANONICAL = `${BASE}${PATH}`
const PUBLISHED_ISO = '2026-09-23'
/** Abaixo disto o motor aparece com o aviso "small sample" — n pequeno não é ranking. */
const SMALL_SAMPLE_FILMS = 20
const REFERENCE_SECONDS = 60

const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return iso
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`
}

function titleFor(total: number): string {
  return `Seedance vs Veo vs Kling for Shorts (2026): measured on ${total} real renders`
}

type TableRow = EngineBenchmarkRow & {
  slug: string
  name: string
  what: string
  credits60: number
  starterValue: string
  fitsStarter: boolean
  paused: boolean
}

function buildRows(rows: EngineBenchmarkRow[]): TableRow[] {
  const starterMinorPerCredit = TIER_PRICES.starter.usd / TIER_CREDITS.starter
  const out: TableRow[] = []
  for (const r of rows) {
    const slug = ENGINE_SLUGS.find((s) => ENGINES[s].qualityMode === r.qualityMode)
    if (!slug) continue
    const engine = ENGINES[slug]
    const credits60 = creditCostForDuration(r.qualityMode as Quality, true, REFERENCE_SECONDS)
    out.push({
      ...r,
      slug,
      name: engine.name,
      // A frase de ENGINE_FACTS do Kineo 1 termina com um ponteiro interno ("described separately in trialAccess")
      // que faz sentido no /api/facts e não numa tabela pública: sai daqui, o resto fica igual à fonte.
      what: (ENGINE_FACTS.find((f) => f.name === engine.name)?.what ?? engine.bestFor).replace("; temporary new-account trial access is described separately in trialAccess.", "."),
      credits60,
      starterValue: formatCheckoutMoney('usd', Math.round(starterMinorPerCredit * credits60)),
      fitsStarter: credits60 <= TIER_CREDITS.starter,
      paused: !!enginePaused(engine.param),
    })
  }
  return out
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getEngineBenchmarkStats()
  const title = titleFor(s.totalFilms)
  const description =
    `How many finished Shorts each AI video engine actually delivered on Kineo in the last ${s.windowDays} days — ` +
    `Seedance 1.5, Veo 3.1, Kling 2.5, Kling 3, MiniMax H3 and Kineo 1 — with distinct creators, median length and ` +
    `credits per 60-second film. Internal accounts excluded, free to cite.`
  return {
    title,
    description,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description, url: CANONICAL, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SeedanceVsVeoVsKlingPage() {
  const s = await getEngineBenchmarkStats()
  const rows = buildRows(s.rows)
  const measuredHuman = humanDate(s.measuredOn)
  const title = titleFor(s.totalFilms)
  const seedance = rows.find((r) => r.qualityMode === 'cinematic_ai')
  const veo = rows.find((r) => r.qualityMode === 'cinematic_veo')
  const kling = rows.find((r) => r.qualityMode === 'cinematic_kling')
  const starterPrice = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)

  const FAQ: { q: string; a: string }[] = [
    {
      q: 'Which is better for YouTube Shorts: Seedance, Veo or Kling?',
      a:
        `On Kineo's own data for the last ${s.windowDays} days, Seedance 1.5 is the generative engine people actually ` +
        `finish films with: ${seedance?.films ?? 0} finished Shorts by ${seedance?.people ?? 0} people, against ` +
        `${veo?.films ?? 0} on Veo 3.1 and ${kling?.films ?? 0} on Kling 2.5. Veo and Kling cost more credits per ` +
        `film (${veo?.credits60 ?? '—'} and ${kling?.credits60 ?? '—'} vs ${seedance?.credits60 ?? '—'} for 60 s), so ` +
        `their samples are small — read them as "rarely chosen", not as a quality verdict.`,
    },
    {
      q: 'How much does one 60-second AI Short cost on each engine?',
      a:
        `In credits: ${rows.map((r) => `${r.name} ${r.credits60}`).join(', ')}. At the Starter plan's credit price ` +
        `(${starterPrice}/month for ${TIER_CREDITS.starter} credits) a 60-second Seedance film is worth ` +
        `${seedance?.starterValue ?? '—'} of credits. Engines above ${TIER_CREDITS.starter} credits do not fit in one ` +
        `Starter month.`,
    },
    {
      q: 'Where do these numbers come from?',
      a:
        `From Kineo's production database: every video with status "completed" created in the last ${s.windowDays} ` +
        `days, grouped by the engine that actually rendered it. Founder and test accounts are excluded. Lengths are ` +
        `medians of the finished MP4 duration. ${s.measured ? `Read on ${measuredHuman}.` : `This is the last manual reading (${measuredHuman}); the live reading was unavailable.`}`,
    },
    {
      q: 'Can I paste a script I wrote with ChatGPT?',
      a:
        'Yes. Paste the script into Kineo, choose "Use my script as is", and the engine you pick narrates it word for ' +
        'word — Seedance 1.5 generates every scene with AI; Kineo 1 matches stock footage and is the free rehearsal.',
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'AI video engines for Shorts — Kineo production data',
    description:
      `Finished Shorts, distinct creators and median length per AI video engine over the last ${s.windowDays} days ` +
      `(${s.totalFilms} finished renders, internal accounts excluded).`,
    url: CANONICAL,
    datePublished: PUBLISHED_ISO,
    dateModified: s.measuredOn,
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Kineo', url: BASE },
    variableMeasured: rows.map((r) => ({ '@type': 'PropertyValue', name: `${r.name} finished Shorts (${s.windowDays} d)`, value: r.films })),
  }

  const th = { textAlign: 'left' as const, padding: '11px 10px', fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' as const }
  const td = { padding: '11px 10px', verticalAlign: 'top' as const, lineHeight: 1.5 }

  return (
    <main style={{ background: '#000', minHeight: '100vh', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 18px 88px' }}>
        <p style={{ color: ACCENT, fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Original data · {s.measured ? `read ${measuredHuman}` : `last reading ${measuredHuman}`}
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 900, lineHeight: 1.15, margin: '0 0 16px' }}>{title}</h1>
        <p style={{ color: MUTED, fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          Kineo turns a topic or a finished script into a narrated vertical Short, and lets you pick the engine that
          renders the scenes. That gives us something review sites don&rsquo;t have: a count of what people actually
          finished on each engine. This page reads it from our production database — {s.totalFilms} finished renders in
          the last {s.windowDays} days, founder and test accounts excluded.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
          It measures usage and cost, not visual quality. Free to cite with a link to this page.
        </p>

        <ScriptToSeedanceBridge from="benchmark" />

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '44px 0 14px' }}>Every engine, measured</h2>
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <th style={th}>Engine</th>
                <th style={th}>Finished ({s.windowDays} d)</th>
                <th style={th}>People</th>
                <th style={th}>Median length</th>
                <th style={th}>Credits / 60 s</th>
                <th style={th}>At Starter credit price</th>
                <th style={th}>What it does</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.qualityMode} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ ...td, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    <Link href={`/ai-video-generator/${r.slug}`} style={{ color: '#f5f5f7', textDecoration: 'none' }}>{r.name}</Link>
                    {r.paused ? <div style={{ color: '#ffb454', fontSize: '0.75rem', fontWeight: 700 }}>paused for maintenance</div> : null}
                  </td>
                  <td style={td}>
                    {r.films}
                    {r.films < SMALL_SAMPLE_FILMS ? <div style={{ color: MUTED, fontSize: '0.75rem' }}>small sample</div> : null}
                  </td>
                  <td style={td}>{r.people}</td>
                  <td style={td}>{r.medianSeconds === null ? '—' : `${Math.round(r.medianSeconds)} s`}</td>
                  <td style={td}>{r.credits60}</td>
                  <td style={td}>
                    {r.starterValue}
                    {!r.fitsStarter ? <div style={{ color: MUTED, fontSize: '0.75rem' }}>more than one Starter month</div> : null}
                  </td>
                  <td style={{ ...td, color: MUTED, minWidth: 260 }}>{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '44px 0 10px' }}>What the numbers say</h2>
        <p style={{ color: '#d2d2d7', lineHeight: 1.65, margin: '0 0 12px' }}>
          Seedance 1.5 is where generative Shorts actually get finished: {seedance?.films ?? 0} films by {seedance?.people ?? 0}{' '}
          people, at {seedance?.credits60 ?? '—'} credits for 60 seconds. Veo 3.1 ({veo?.films ?? 0} films) and Kling 2.5
          ({kling?.films ?? 0}) are chosen far less often — they cost {veo?.credits60 ?? '—'} and {kling?.credits60 ?? '—'} credits
          per 60-second film, and at that size of sample the honest reading is &ldquo;rarely picked&rdquo;, not &ldquo;worse&rdquo;.
          Kineo 1 carries the volume because it is the free rehearsal: stock footage, not generated scenes.
        </p>

        <section style={{ ...CARD, padding: '18px 20px', margin: '28px 0 0' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px' }}>Method</h2>
          <ul style={{ color: '#d2d2d7', fontSize: '0.9rem', lineHeight: 1.65, margin: 0, paddingLeft: 18 }}>
            <li>Window: videos created in the last {s.windowDays} days with status &ldquo;completed&rdquo; — failed renders are not counted.</li>
            <li>Engine = the engine that actually rendered the film (the database <code>quality_mode</code>), not the one advertised.</li>
            <li>Founder, staff and test accounts are excluded. People = distinct accounts with at least one finished film on that engine.</li>
            <li>Length = median duration of the finished MP4, in seconds. Credits = the price of a 60-second film on a paid plan, from Kineo&rsquo;s single pricing source.</li>
            <li>Engines with fewer than {SMALL_SAMPLE_FILMS} films are marked &ldquo;small sample&rdquo;.</li>
            <li>
              {s.measured
                ? `Measured live from the database on ${measuredHuman}; the page refreshes once a day.`
                : `Fallback: the live reading was unavailable, so this is the last manual measurement (${measuredHuman}).`}
            </li>
          </ul>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '44px 0 14px' }}>Questions, answered</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ.map((f) => (
            <div key={f.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontWeight: 800, margin: '0 0 6px', fontSize: '0.98rem' }}>{f.q}</h3>
              <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.9rem' }}>{f.a}</p>
            </div>
          ))}
        </div>

        <section style={{ ...CARD, textAlign: 'center', padding: '26px 20px', margin: '44px 0 0' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>Try the engine people finish with</h2>
          <p style={{ color: MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>
            Paste your script or one idea — {ENGINES.seedance.name} renders every scene, with voice and captions.
          </p>
          <Link
            href="/ai-video-generator/seedance?from=benchmark_bridge"
            style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Open {ENGINES.seedance.name} →
          </Link>
          <p style={{ margin: '14px 0 0', fontSize: '0.85rem' }}>
            <Link href="/state-of-ai-shorts-2026" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700 }}>State of AI Shorts 2026</Link>
            {' · '}
            <Link href="/models-pricing" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700 }}>Cost per engine</Link>
            {' · '}
            <Link href="/ai-video-generator" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700 }}>All engines</Link>
          </p>
        </section>
      </div>
      <Footer />
    </main>
  )
}
