// Engineering-as-marketing: free interactive "Faceless Channel Niche Picker".
// Targets "faceless youtube niche quiz" / "best faceless niche 2026" searches.
// Server component handles SEO (metadata + static comparison table); the quiz
// itself is a client component with pure in-memory state (no localStorage).

import type { Metadata } from 'next'
import QuizClient from './QuizClient'

export const metadata: Metadata = {
  title: 'Faceless YouTube Niche Picker (2026) — Free Quiz',
  description:
    'Free 5-question quiz that picks your best faceless YouTube niche for 2026 from 12 proven options — scored on RPM, competition, visual availability and repeatability. No signup.',
  alternates: { canonical: 'https://www.usekineo.com/niche-picker' },
  openGraph: {
    title: 'Faceless YouTube Niche Picker (2026) — Free Quiz',
    description:
      'Answer 5 questions and get your best faceless YouTube niche for 2026, with RPM ranges, example video topics and a free way to make your first Short.',
    url: 'https://www.usekineo.com/niche-picker',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Faceless YouTube Niche Picker (2026) — Free Quiz',
    description:
      'Answer 5 questions and get your best faceless YouTube niche for 2026, with RPM ranges and example topics.',
  },
}

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

// Static SEO comparison table — public-knowledge RPM ranges for faceless
// channels in 2026. RPM varies heavily by audience country and season; these
// are typical bands for a mostly-US English audience.
const TABLE: { niche: string; rpm: string; competition: string; difficulty: string }[] = [
  { niche: 'Personal Finance & Money', rpm: '$8–$15', competition: 'Very high', difficulty: 'Medium — research-heavy, but formats are proven' },
  { niche: 'Luxury & Business', rpm: '$5–$10', competition: 'Medium', difficulty: 'Easy — abundant stock footage, light research' },
  { niche: 'True Crime & Mystery', rpm: '$4–$8', competition: 'High', difficulty: 'Hard — deep research and careful storytelling' },
  { niche: 'History', rpm: '$4–$8', competition: 'High', difficulty: 'Medium — endless topics, needs accuracy' },
  { niche: 'Health & Fitness', rpm: '$4–$8', competition: 'High', difficulty: 'Medium — claims must be responsible' },
  { niche: 'Food & Travel', rpm: '$2–$6', competition: 'Medium', difficulty: 'Easy — visual, repeatable comparison formats' },
  { niche: 'Stoicism & Motivation', rpm: '$2–$5', competition: 'Very high', difficulty: 'Easy — fast scripts, hardest to differentiate' },
  { niche: 'Geography & Countries', rpm: '$2–$5', competition: 'Medium', difficulty: 'Easy — maps make visuals trivial' },
  { niche: 'Horror Stories', rpm: '$2–$5', competition: 'Medium', difficulty: 'Medium — lives or dies on writing quality' },
  { niche: 'Movies & Celebrity', rpm: '$2–$4', competition: 'High', difficulty: 'Easy — trend-driven, light research' },
  { niche: 'Gaming', rpm: '$1–$4', competition: 'Very high', difficulty: 'Easy — you likely know the topics already' },
  { niche: 'Animals & Nature', rpm: '$1–$3', competition: 'High', difficulty: 'Easy — universally shareable, low RPM' },
]

export default function NichePickerPage() {
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
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
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
          Free tool — no signup
        </p>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          Faceless YouTube Niche Picker (2026)
        </h1>
        <p style={{ color: MUTED, fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Answer 5 quick questions and this quiz picks your best faceless channel niche
          from 12 proven options — finance, true crime, history, stoicism, geography and
          more. Each niche is scored on typical RPM, how crowded it is, how easy the
          visuals are to source, and how repeatable the format is day after day. You get
          a top pick plus two runners-up, with example video topics for each.
        </p>

        <QuizClient />

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px' }}>
          The 12 faceless niches compared (2026)
        </h2>
        <p style={{ color: MUTED, lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 18px' }}>
          RPM (revenue per 1,000 monetized views) bands below are typical public
          figures reported by faceless creators with a mostly-US English audience.
          Your actual RPM depends on audience country, season and format — Shorts
          RPM runs lower than long-form across every niche.
        </p>
        <div style={{ ...CARD, padding: '6px 0', overflowX: 'auto', margin: '0 0 40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: 560 }}>
            <thead>
              <tr>
                {['Niche', 'Typical RPM', 'Competition', 'Difficulty'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      color: MUTED,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      borderBottom: '1px solid #2a2a2d',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE.map((row, i) => (
                <tr key={row.niche}>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontWeight: 600,
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #232326',
                    }}
                  >
                    {row.niche}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      color: ACCENT,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #232326',
                    }}
                  >
                    {row.rpm}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      color: '#d2d2d7',
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #232326',
                    }}
                  >
                    {row.competition}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      color: '#d2d2d7',
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #232326',
                    }}
                  >
                    {row.difficulty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 12px' }}>
          How to read this table
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 40px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              High RPM is not automatically the best choice
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Finance pays $8–$15 per 1,000 monetized views but is also the most
              contested faceless niche on YouTube. A motivation channel at $2–$5 RPM
              that ships a video every day often out-earns a finance channel that
              ships once a week. Pick the niche you can sustain, then optimize RPM.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              Visual availability decides your production speed
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Geography (maps), luxury (stock footage) and animals (nature clips) have
              near-infinite visual supply, so a Short takes minutes to assemble. True
              crime and history need era-appropriate or case-specific footage, which is
              where AI-generated visuals close the gap for faceless creators.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              Repeatability beats one viral hit
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              The channels that get monetized are the ones with a format they can
              repeat 100+ times: &ldquo;Why does this border look like this?&rdquo;,
              &ldquo;The scene that was improvised&rdquo;, &ldquo;Marcus Aurelius
              on…&rdquo;. The quiz above weights repeatability heavily for anyone with
              under an hour a day.
            </p>
          </section>
        </div>

        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6 }}>
          Picked your niche? Kineo turns one typed topic into a finished faceless
          Short — script, AI voiceover, visuals and captions — usually in 2–4 minutes.{' '}
          <a
            href="https://www.usekineo.com/free-ai-shorts-generator?utm_source=niche-picker&utm_medium=tool&utm_campaign=acq5"
            style={{ color: ACCENT, textDecoration: 'none' }}
          >
            Generate your first Short free →
          </a>
        </p>
      </div>
    </main>
  )
}
