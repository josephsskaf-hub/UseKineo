// KINEO-DATA-PR-2026-07-24 (PUSH #87) — "State of AI Shorts 2026" study.
// KINEO-LIVE-STUDY-2026-08-05 — o estudo virou VIVO.
//
// O QUE MUDOU E POR QUÊ
// ─────────────────────
// A versão original chumbou os números no JSX em 24/07. Doze dias depois, os
// CINCO números principais estavam errados (a tabela está em lib/studyStats.ts),
// e o pior deles era a velocidade: a página publicava mediana de 2,30 min contra
// 4,2 min reais. Uma página que convida a citar ("free to cite") e ensina o
// número errado sobre TEMPO DE ESPERA não é só imprecisa — ela entrega gente que
// chega esperando 2 minutos, espera 7, e vai embora antes do vídeo ficar pronto.
//
// Agora todo número de volume, velocidade, confiabilidade e mix de motor vem do
// banco (lib/studyStats.ts), a página revalida uma vez por dia, e o dateModified
// do JSON-LD acompanha sozinho. Um estudo que se atualiza é citável para sempre;
// um estudo datado morre no dia em que envelhece.
//
// O RANKING DE NICHOS continua sendo análise manual de keyword bucketing (não dá
// para derivar do banco sem um classificador), então ele está rotulado com a
// data da própria análise, separado dos números vivos. Honestidade > uniformidade.

import type { Metadata } from 'next'
import {
  getStudyStats,
  RELIABILITY_WINDOW_START,
  STUDY_REVALIDATE_SECONDS,
} from '@/lib/studyStats'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-STARTER-EM-ARTIGO-2026-08-15 — o MESMO componente que a home e as 13
// páginas de intenção usam, nunca uma cópia. Ver o bloco de comentário no corpo.
// Client island; o resto da página segue server e a revalidação diária vale.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

// Revalidação diária: os números vêm do banco, então `force-static` mentiria.
// O valor vem do módulo dos dados — duas cópias do mesmo número é como o
// estudo envelheceu da primeira vez.
export const revalidate = STUDY_REVALIDATE_SECONDS

const CANONICAL = 'https://www.usekineo.com/state-of-ai-shorts-2026'
const PUBLISHED_ISO = '2026-07-24'

// O ranking de nichos é análise manual sobre os tópicos gerados; a data é dele,
// não da leitura do banco. Ver metodologia.
const NICHE_ANALYSIS_DATE = 'July 24, 2026'
const NICHE_ANALYSIS_BASE = 568

const NICHE_DEMAND: { niche: string; mentions: number; note: string }[] = [
  { niche: 'Animals & nature', mentions: 185, note: 'The sleeper #1 — low competition, universally watchable' },
  { niche: 'Geography & countries', mentions: 167, note: '"Countries that…" formats dominate' },
  { niche: 'History & empires', mentions: 160, note: 'Rome, Egypt and war stories lead' },
  { niche: 'Finance & money', mentions: 123, note: 'Highest RPM niche in the set' },
  { niche: 'Mystery, crime & horror', mentions: 99, note: 'Strong retention formats' },
  { niche: 'Luxury & cars', mentions: 90, note: 'Aspirational content, strong on TikTok' },
  { niche: 'Facts & curiosities', mentions: 65, note: 'The classic faceless entry point' },
  { niche: 'Space & science', mentions: 51, note: 'Evergreen, zero-decay topics' },
  { niche: 'Motivation & stoicism', mentions: 46, note: 'Saturated — harder to stand out in 2026' },
  { niche: 'Fitness & health', mentions: 12, note: 'Underserved on AI tools today' },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return iso
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`
}

function humanMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return ym
  return `${MONTHS_SHORT[m - 1]} ${y}`
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStudyStats()
  const title = `State of AI Shorts 2026 — Original Data from ${s.totalVideos} AI-Generated Videos`
  const description =
    `What ${s.totalCreators} real creators generated with AI in 2026: how long an AI Short ` +
    `actually takes to render (${s.medianMinutes}-minute median), the most in-demand faceless ` +
    `niches, engine mix and growth curve. Original platform data, updated daily, free to cite.`
  return {
    title,
    description,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description, url: CANONICAL, type: 'article' },
    twitter: { card: 'summary_large_image', title: 'State of AI Shorts 2026', description },
  }
}

export default async function StateOfAiShortsPage() {
  const s = await getStudyStats()
  const measuredHuman = humanDate(s.measuredOn)
  const sinceHuman = humanDate(s.since)
  const windowHuman = humanDate(RELIABILITY_WINDOW_START)
  const peakVideos = s.monthly.reduce((max, m) => (m.videos > max ? m.videos : max), 1)

  const FINDINGS: { stat: string; label: string; detail: string }[] = [
    {
      stat: `${s.medianMinutes} min`,
      label: 'median time to render an AI Short',
      detail:
        `Measured end-to-end across ${s.speedSample} completed renders: ${s.medianMinutes} minutes ` +
        `at the median, ${s.p90Minutes} minutes at the 90th percentile. This is the number nobody ` +
        `in the category publishes, and the one that decides whether a creator waits or leaves.`,
    },
    {
      stat: `${s.totalVideos}`,
      label: 'AI Shorts generated by real creators',
      detail:
        `Since ${sinceHuman}, ${s.totalCreators} distinct creators have generated ${s.totalVideos} ` +
        `finished videos — ${s.videosPerCreator} per active creator. Internal and test accounts excluded.`,
    },
    {
      stat: `${s.completionRate}%`,
      label: 'render completion rate',
      detail:
        `Of every render attempt that reached a final state since ${windowHuman}, ` +
        `${s.completionRate}% finished. Failed renders refund credits automatically, so the cost of a ` +
        `failure to the creator is zero.`,
    },
    {
      stat: `${s.fastSharePercent}%`,
      label: 'of videos use Fast Mode (stock footage)',
      detail:
        `Stock-footage Fast Mode at 1 credit accounts for ${s.fastSharePercent}% of finished videos; ` +
        `premium generative engines account for ${s.premiumSharePercent}%. Creators overwhelmingly ` +
        `validate cheap first — the premium upgrade is the exception, not the norm.`,
    },
  ]

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `State of AI Shorts 2026 — Original Data from ${s.totalVideos} AI-Generated Videos`,
    datePublished: PUBLISHED_ISO,
    dateModified: s.measuredOn,
    author: { '@type': 'Organization', name: 'Kineo', url: 'https://www.usekineo.com' },
    publisher: { '@type': 'Organization', name: 'Kineo', url: 'https://www.usekineo.com' },
    mainEntityOfPage: CANONICAL,
    description:
      `Original platform data on AI short-form video: median render time of ${s.medianMinutes} minutes, ` +
      `${s.completionRate}% completion rate, niche demand ranking, engine mix and growth curve across ` +
      `${s.totalVideos} AI-generated YouTube Shorts.`,
  }

  // Dataset schema: é o que faz um motor de resposta tratar a página como FONTE
  // DE DADOS e não como post de blog. Licença explícita = citação com link.
  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'State of AI Shorts 2026 — Kineo platform data',
    description:
      `Aggregate statistics on AI-generated short-form video production: render speed ` +
      `(median and p90), completion rate, engine mix, monthly volume and faceless niche demand. ` +
      `Derived from ${s.totalVideos} finished videos by ${s.totalCreators} creators.`,
    url: CANONICAL,
    datePublished: PUBLISHED_ISO,
    dateModified: s.measuredOn,
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Kineo', url: 'https://www.usekineo.com' },
    temporalCoverage: `${s.since}/${s.measuredOn}`,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Median render time (minutes)', value: s.medianMinutes },
      { '@type': 'PropertyValue', name: 'P90 render time (minutes)', value: s.p90Minutes },
      { '@type': 'PropertyValue', name: 'Render completion rate (%)', value: s.completionRate },
      { '@type': 'PropertyValue', name: 'Total finished videos', value: s.totalVideos },
      { '@type': 'PropertyValue', name: 'Distinct creators', value: s.totalCreators },
      { '@type': 'PropertyValue', name: 'Fast Mode share (%)', value: s.fastSharePercent },
    ],
  }

  return (
    <main
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '64px 20px 96px',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
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
          Original research — updated daily · last read {measuredHuman}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          State of AI Shorts 2026
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          What do people actually make when an AI can turn any idea into a finished faceless
          video — and how long does it really take? These figures are read straight from
          Kineo&rsquo;s production database once a day. Today they cover {s.totalVideos} finished
          Shorts by {s.totalCreators} creators since {sinceHuman}.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          Free to cite with a link to this page. Anonymous aggregates only — no individual
          creator data, no internal or test accounts.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>Key findings</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
            margin: '0 0 48px',
          }}
        >
          {FINDINGS.map((f, i) => (
            <section key={i} style={{ ...CARD, padding: '18px 18px' }}>
              <p style={{ color: ACCENT, fontSize: '1.9rem', fontWeight: 800, margin: '0 0 4px' }}>
                {f.stat}
              </p>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 8px' }}>{f.label}</h3>
              <p style={{ color: '#d2d2d7', fontSize: '0.88rem', lineHeight: 1.55, margin: 0 }}>
                {f.detail}
              </p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          How long an AI Short actually takes
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Every tool in this category advertises a time and none of them publish a distribution.
          Here is ours, measured from the moment a creator submits a topic to the moment the
          finished MP4 exists — including script generation, footage matching and final compose.
        </p>
        <div style={{ ...CARD, padding: '18px 20px', margin: '0 0 48px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            <div>
              <p style={{ color: ACCENT, fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2px' }}>
                {s.medianMinutes} min
              </p>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>median (half finish faster)</p>
            </div>
            <div>
              <p style={{ color: ACCENT, fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2px' }}>
                {s.p90Minutes} min
              </p>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>90th percentile</p>
            </div>
            <div>
              <p style={{ color: ACCENT, fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2px' }}>
                {s.completionRate}%
              </p>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>finish successfully</p>
            </div>
          </div>
          <p style={{ color: '#d2d2d7', fontSize: '0.88rem', lineHeight: 1.55, margin: '16px 0 0' }}>
            Sample: {s.speedSample} completed renders since {windowHuman}. The practical takeaway
            for anyone evaluating AI video tools: budget five to seven minutes per Short, not
            sixty seconds. A tool promising one minute is either measuring a different thing or
            not measuring at all.
          </p>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>Monthly volume</h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Finished videos per calendar month. The current month is partial by definition.
        </p>
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 48px', display: 'grid', gap: 8 }}>
          {s.monthly.map((m) => (
            <li
              key={m.month}
              style={{ ...CARD, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 88 }}>
                {humanMonth(m.month)}
              </span>
              <div
                style={{
                  height: 8,
                  flex: `0 1 ${Math.max(6, Math.round((m.videos / peakVideos) * 100))}%`,
                  background: ACCENT,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
              <span style={{ color: '#d2d2d7', fontSize: '0.85rem', fontWeight: 600 }}>
                {m.videos}
              </span>
            </li>
          ))}
        </ol>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          The 2026 faceless niche demand ranking
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Topic mentions across {NICHE_ANALYSIS_BASE} generated videos, bucketed by keyword
          ({NICHE_ANALYSIS_DATE} analysis — unlike the figures above, this ranking is a manual
          classification and is not recomputed daily). The surprise: animals and geography
          out-demand the &ldquo;classic&rdquo; motivation niche by 4×.
        </p>
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 48px', display: 'grid', gap: 8 }}>
          {NICHE_DEMAND.map((n, i) => (
            <li
              key={n.niche}
              style={{ ...CARD, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span style={{ color: ACCENT, fontWeight: 800, minWidth: 28 }}>{i + 1}.</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{n.niche}</p>
                <p style={{ color: MUTED, fontSize: '0.85rem', margin: '2px 0 0' }}>{n.note}</p>
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div
                  style={{
                    height: 6,
                    width: `${Math.max(8, Math.round((n.mentions / 185) * 120))}px`,
                    background: ACCENT,
                    borderRadius: 3,
                    marginLeft: 'auto',
                    marginBottom: 4,
                    opacity: 0.85,
                  }}
                />
                <span style={{ color: '#d2d2d7', fontSize: '0.85rem', fontWeight: 600 }}>
                  {n.mentions} mentions
                </span>
              </div>
            </li>
          ))}
        </ol>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          What this means if you are starting a channel now
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 48px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              The contrarian pick is animals, not motivation
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Motivation content is what everyone thinks faceless channels make — it ranked 9th of
              10 in actual demand. Animals, geography and history rank 1–3: visually rich,
              endlessly repeatable, and far less saturated.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              Cheap-first is the real workflow, by a wide margin
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              {s.fastSharePercent}% of finished videos use the 1-credit stock engine and only{' '}
              {s.premiumSharePercent}% use a premium generative one. Whatever the marketing of this
              category says, creators are validating topics cheaply and reserving expensive renders
              for concepts that already proved themselves.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              Plan for minutes, not seconds
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              At a {s.medianMinutes}-minute median and {s.p90Minutes} minutes at p90, a daily
              posting habit costs well under ten minutes of machine time a day — but it is not
              instant, and any workflow built on the assumption of instant output will break.
              The bottleneck for faceless channels in 2026 is topic selection and consistency,
              not production.
            </p>
          </section>
        </div>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 48px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Test the data yourself — free
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 4px' }}>
            Pick one of the top-3 niches above — or type your own topic. Expect
            about {s.medianMinutes} minutes. {ft(OFFER, 'Up to 3 watermarked videos every 24 hours, no card.', OFFER.copy.headline)}
          </p>
          {/* ── KINEO-STARTER-EM-ARTIGO-2026-08-15 ────────────────────────────
              A sprint de 14/08 pôs uma PORTA aqui (o `OrganicCtaLink` que
              ocupava este lugar, "Generate a free Short →", source
              `seo_state_of_ai_shorts`, placement `study_cta`). Ela consertou os
              três defeitos certos — mas a medição seguinte, de 15/08 16h,
              mostrou que ter porta não é a variável:

                | superfície                      | pessoas | ativação |
                | home one-click starters (#69)   |   278   |   68%    |
                | páginas de artigo COM porta     |   316 sessões | 0 cliques |

              O que separa 68% de 0% é a página deixar a pessoa FAZER alguma
              coisa antes de pedir qualquer coisa. Uma porta pergunta; um
              starter já começa. Então a porta virou o starter — o MESMO
              componente da home/#70 (`TopicGeneratorForm`), com os três nichos
              que ESTA página acabou de rankear como exemplos, para que o
              primeiro clique carregue o tema do próprio leitor.

              UMA variável trocada, e só uma: destino, utm e create_intent=fast
              são os de sempre. A porta antiga NÃO fica ao lado — duas ofertas
              na mesma tela é o defeito que /examples pagou em 14/08 (10 dos 16
              cliques iam para /pricing antes do primeiro vídeo). O histórico de
              `seo_state_of_ai_shorts` continua no banco; o depois se lê pelo
              `source` novo abaixo. */}
          <TopicGeneratorForm
            campaign="starter_state_of_ai_shorts"
            source="starter_state_of_ai_shorts"
            formId="study-start-a-short"
            examples={[
              'The animal with a survival trick science still cannot explain',
              'The country almost nobody is allowed to enter',
              'The empire that collapsed in a single generation',
            ]}
            copy={{
              label: 'Start with one of the top niches — or your own topic',
              placeholder: 'Type one topic — e.g. the animal that outlived the dinosaurs',
              submit: 'Turn this topic into a Short →',
              examplesLabel: 'Top-ranked niches from this study',
              note: `Median finish time in the data above is ${s.medianMinutes} minutes. Your topic stays attached through signup. No card required for the free Fast workflow.`,
            }}
          />
        </section>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>Methodology</h2>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 10px' }}>
          Volume, creator count, monthly curve and engine mix cover every finished video on Kineo
          (usekineo.com) from {sinceHuman} to {measuredHuman}: {s.totalVideos} videos by{' '}
          {s.totalCreators} distinct creators. Internal, founder and test accounts are excluded
          from every figure. Render speed and completion rate are measured per render attempt,
          from the first pipeline stage to the finished file, over attempts started on or after{' '}
          {windowHuman} (n={s.speedSample} completed) — that start date excludes two third-party
          outages on July 31 and August 1, 2026, which are documented separately and would
          otherwise misrepresent current reliability. Completion rate is finished attempts over
          attempts that reached any final state. Niche demand is a manual keyword-bucket analysis
          dated {NICHE_ANALYSIS_DATE} over {NICHE_ANALYSIS_BASE} video topics; buckets can overlap
          (a &ldquo;richest animals&rdquo; video counts in both finance and animals), so those
          figures are topic mentions, not exclusive video counts. Aggregates only; no personal
          data.{!s.live && ' Figures on this view are the last successful reading.'}
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.7 }}>
          Citing this study: &ldquo;State of AI Shorts 2026&rdquo;, Kineo,
          usekineo.com/state-of-ai-shorts-2026, data as of {measuredHuman}. Press &amp; data
          questions: hello@usekineo.com.
        </p>
      </div>
    </main>
  )
}
