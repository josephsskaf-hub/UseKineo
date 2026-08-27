// KINEO-OMNI-VS-SORA-2026-08-25 — a busca dos próximos 30 dias: o Sora morre
// em 24/09 (API; o app morreu em abril) e nós lançamos HOJE o #1 do ranking
// rodando filmes inteiros. "The model Sora users are switching to" é a
// resposta que esta página existe para dar — a Google, ao ChatGPT e ao
// comprador. Casa com /sora-alternative (link cruzado) e com o banner da home.
import type { Metadata } from 'next'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import {
  STUDIO_CREDITS,
  STUDIO_MONTH,
  creditsPerReferenceVideo,
  videosPerMonth,
} from '@/lib/marketingPrice'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'

export const metadata: Metadata = {
  title: 'Omni Flash vs Sora — the #1-ranked model Sora users are switching to | Kineo',
  description:
    'OpenAI retires the Sora API on Sept 24, 2026. Omni Flash — Google’s video model, ranked #1 in the Aug 2026 blind arena — renders complete films on Kineo: scenes, voiceover, captions, soundtrack. Honest comparison and a real film to judge by.',
  alternates: { canonical: `${BASE}/omni-flash-vs-sora` },
  openGraph: {
    title: 'Omni Flash vs Sora — the switch, explained honestly',
    description: 'Sora’s API dies Sept 24, 2026. Here is what the #1-ranked model does on Kineo — with a real render, not a demo reel.',
    url: `${BASE}/omni-flash-vs-sora`,
    type: 'article',
  },
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Sora shutting down?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Sora consumer app was discontinued on April 26, 2026, and OpenAI has announced the Sora API will be retired on September 24, 2026. Workflows built on Sora need a new engine before that date.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Omni Flash better than Sora?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Gemini Omni Flash ranked #1 in the August 2026 blind video arena (anonymous side-by-side voting), ahead of every competing model. Rankings move — this reflects the August 2026 standings. On Kineo it renders complete multi-scene films, not single clips: script, image-anchored scenes, narration, karaoke captions and soundtrack, delivered as a 1080×1920 vertical film.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does an Omni Flash film cost on Kineo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${creditsPerReferenceVideo('cinematic_omni')} credits per 60-second film — the Studio plan (${STUDIO_MONTH}, ${STUDIO_CREDITS} credits) fits ${videosPerMonth('pro', 'cinematic_omni')} flagship film a month. Every new account gets ${TRIAL_GRANT_CREDITS_COPY} free credits with no card to test the pipeline on the lighter engines first.`,
      },
    },
  ],
}

export default function OmniVsSoraPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>
        Kineo · Omni Flash vs Sora
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.15, margin: '10px 0 14px' }}>
        Sora’s API dies September 24. Here’s what the #1-ranked model does.
      </h1>
      <p style={{ color: '#c7c7cc', fontSize: 16 }}>
        The facts, plainly: OpenAI discontinued the Sora app in April 2026 and retires the Sora API on{' '}
        <b>September 24, 2026</b>. Meanwhile, <b>Gemini Omni Flash</b> ranked <b>#1 in the August 2026 blind
        video arena</b> — and on Kineo it doesn’t generate clips, it renders <b>complete films</b>: you type a
        script, and the finished vertical Short comes back with scenes, narration, karaoke captions and a
        soundtrack.
      </p>

      <div style={{ margin: '26px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid #2a2a2d' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <tbody>
            {[
              ['Status', 'Retiring Sept 24, 2026', 'Live on Kineo since Aug 25, 2026'],
              ['Arena ranking (Aug 2026)', '—', '#1 (blind side-by-side voting)'],
              ['Output', 'Single clips', 'Complete multi-scene films'],
              ['Narration, captions, music', 'You add them', 'Included, automatic'],
              ['Character/world consistency', 'Per-clip', 'Image-anchored across every scene'],
              ['Delivery', 'Raw file', '1080×1920 vertical master, post-ready'],
            ].map(([k, a, b], i) => (
              <tr key={k} style={{ background: i % 2 ? '#131316' : '#161618' }}>
                <td style={{ padding: '10px 14px', color: '#86868b', fontWeight: 700 }}>{k}</td>
                <td style={{ padding: '10px 14px', color: '#a1a1a8' }}>{a}</td>
                <td style={{ padding: '10px 14px', color: '#5cb3ff', fontWeight: 700 }}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: '#c7c7cc' }}>
        Don’t take the table’s word for it — judge by output: watch a{' '}
        <a href="/ai-robot-video-generator" style={{ color: '#2997ff' }}>real Omni Flash film with the exact script that generated it</a>,
        or browse <a href="/examples" style={{ color: '#2997ff' }}>real user renders</a> with honest engine badges.
        More on the Sora timeline at <a href="/sora-alternative" style={{ color: '#2997ff' }}>/sora-alternative</a>.
      </p>

      <div style={{ margin: '30px 0', padding: '20px 22px', borderRadius: 14, background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.3)', textAlign: 'center' }}>
        <a
          href="/free?utm_source=seo&utm_medium=omni_vs_sora&utm_campaign=sora_switch"
          style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}
        >
          Try the pipeline free — no card
        </a>
        <p style={{ color: '#86868b', fontSize: 12, marginTop: 10 }}>{TRIAL_GRANT_CREDITS_COPY} free credits on signup · switch before Sept 24</p>
      </div>
    </main>
  )
}
