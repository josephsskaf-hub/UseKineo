// ═══ KINEO-ARENA-2026-08-25 — A PÁGINA QUE NENHUM CONCORRENTE CONSEGUE FAZER ═
//
// A jogada (noite de 25/08): todo mundo que procura "veo vs kling", "seedance
// vs veo 3", "melhor modelo de vídeo IA" cai em blog post com opinião e demo
// reel fabricado. Ninguém publica O MESMO ROTEIRO rodado em motores
// diferentes, porque ninguém TEM os motores todos rodando no mesmo pipeline —
// nós temos os 7, e temos os renders reais no acervo.
//
// Por que isso vende assinatura (e não só tráfego):
//   1. Responde a dúvida REAL de quem vai pagar ("qual motor eu uso?") — e a
//      resposta honesta é "depende do que você filma", que é exatamente o
//      argumento de ter TODOS num plano só. O concorrente que só tem um motor
//      não pode escrever esta página sem se sabotar.
//   2. É munição de citação para LLM (ChatGPT/Perplexity respondendo
//      comparações de modelo) — a fonte de tráfego que mais cresce pra nós.
//   3. Cada card leva pro Studio COM o motor já selecionado (?engine=).
//
// Regra da casa mantida: todo clipe aqui é render REAL, com o selo do motor
// que o gerou. Zero demo fabricado. Os previews são os mesmos da vitrine
// (public/previews), então a página não custa banda nova.
import type { Metadata } from 'next'
import Link from 'next/link'
import { creditCostFor } from '@/lib/credits/engineCost'
import { formatCheckoutMoney, getTierPrice } from '@/lib/checkoutPricing'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { getPublicEngineExample } from '@/lib/publicExamples'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const STARTER_PRICE_LABEL = formatCheckoutMoney('usd', getTierPrice('starter', 'usd'))

export const metadata: Metadata = {
  title: 'AI Video Engine Arena — Omni Flash vs Veo 3.1 vs Kling 3 vs MiniMax H3 | Kineo',
  description:
    'The same kind of script, rendered by seven different AI video engines — real Kineo renders, honest engine labels, credit cost per film. Pick the engine by what you actually see, not by a demo reel.',
  alternates: { canonical: `${BASE}/arena` },
  openGraph: {
    title: 'AI Video Engine Arena — seven engines, real renders, one pipeline',
    description: 'Omni Flash (#1, Aug 2026), Veo 3.1, Kling 3, MiniMax H3, Kling 2.5, Seedance 1.5 and Kineo 1 — side by side, honestly labeled.',
    url: `${BASE}/arena`,
    type: 'website',
  },
}

type Fighter = {
  badge: string
  engineParam: string
  quality: Parameters<typeof creditCostFor>[0]
  exampleId: string
  strength: string
  watchOut: string
  bestFor: string
}

// Curadoria: o MESMO tipo de cena (o melhor clipe curado de cada motor na
// vitrine) para a comparação ser justa. Ver lib/engineWall.ts.
const FIGHTERS: Fighter[] = [
  {
    badge: 'OMNI FLASH',
    engineParam: 'omni',
    quality: 'cinematic_omni',
    exampleId: '36a04f7b-65f7-42d9-a2ab-198b5a7f115e',
    strength: 'Ranked #1 in the August 2026 blind arena. Physical realism — metal colliding, glass falling, fire spreading — is where it separates from everything else.',
    watchOut: 'Scenes cap at 10 seconds, so a long film is cut into more shots.',
    bestFor: 'Spectacle: robot battles, disasters, anything where physics has to look real.',
  },
  {
    badge: 'VEO 3.1',
    engineParam: 'veo',
    quality: 'cinematic_veo',
    exampleId: '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba',
    strength: "Google's flagship. The most film-like light and color of the lineup; landscapes and interiors look photographed rather than generated.",
    watchOut: 'Costs more than Seedance, Kling 2.5 and H3, and clips top out around 8 seconds.',
    bestFor: 'Documentary, travel, mood pieces — anything that lives on beauty.',
  },
  {
    badge: 'KLING 3',
    engineParam: 'hollywood',
    quality: 'cinematic_hollywood',
    exampleId: '4b12925e-16e6-4b56-af5a-7047f9ae7a28',
    strength: 'Film scenes with native voice and lip sync: a character on camera can actually speak your line, mouth matching.',
    watchOut: 'Premium price per film — worth it when someone has to talk.',
    bestFor: 'Storytelling with a narrator on camera, interviews, testimony scenes.',
  },
  {
    badge: 'MINIMAX H3',
    engineParam: 'h3',
    quality: 'cinematic_h3',
    exampleId: '8aabb05a-2492-48de-a96a-0a7875c0c8d3',
    strength: 'Directed talking-character scenes with lip sync, alternating with documentary narration, at a lower credit cost than Kling 3.',
    watchOut: 'Each scene uses one anchor image, so identity can still drift between shots. Renders at 768p, mastered vertically on delivery.',
    bestFor: 'Dialogue-led explainers and channels that need cinematic output more often.',
  },
  {
    badge: 'KLING 2.5',
    engineParam: 'kling',
    quality: 'cinematic_kling',
    exampleId: 'c4e4fbab-0978-4daa-9fcf-119096370210',
    strength: 'Lower-credit cinematic camera work — dolly, crane and orbit — without paying the Veo, Kling 3 or Omni tier.',
    watchOut: 'Less physical realism than Omni Flash on heavy action, and no directed lip-synced dialogue.',
    bestFor: 'The daily driver for cinematic Shorts on a budget.',
  },
  {
    badge: 'SEEDANCE 1.5',
    engineParam: 'seedance',
    quality: 'cinematic_ai',
    exampleId: '75728dfb-3b29-47fa-aea8-b806d549a2b9',
    strength: 'The workhorse. Fast, dependable, and the cheapest full AI film in the lineup — this is what your free trial renders.',
    watchOut: 'Simpler motion than the premium engines.',
    bestFor: 'Volume: posting every day without burning the budget.',
  },
  {
    badge: 'KINEO 1',
    engineParam: 'fast',
    quality: 'fast',
    exampleId: 'c87c3a25-c3b7-4a97-8429-eb0fc98b67bc',
    strength: "Our own engine: real stock footage, cut to your narration, with karaoke captions. Not AI-generated imagery — real filmed footage.",
    watchOut: 'You get reality, not imagination: it cannot render a giant robot.',
    bestFor: 'Facts, finance and news formats where footage beats generation.',
  },
]

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Which AI video model is the best in 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Gemini Omni Flash ranked #1 in the August 2026 blind video arena and is strongest on physical realism. But "best" depends on the shot: Veo 3.1 leads on cinematic light; Kling 3 gives dialogue scenes native generated voice and lip sync; MiniMax H3 also supports directed lip-synced dialogue at a lower credit cost; and Kling 2.5 is the lower-credit camera-motion option. On Kineo all of them run in the same pipeline, so you pick per video instead of per subscription.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I compare AI video engines on the same script?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Yes. Every clip on this page is a real Kineo render, labeled with the engine that actually generated it. You can render your own script on any engine from the same text box and compare the results yourself — a new account gets ${TRIAL_GRANT_CREDITS_COPY} free credits with no card.`,
      },
    },
    {
      '@type': 'Question',
      name: 'Do I have to pay for each AI video model separately?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `No. One Kineo plan unlocks all seven engines and you spend credits per video, so an expensive flagship film and a cheap fast render come out of the same balance. Plans start at ${STARTER_PRICE_LABEL}/month.`,
      },
    },
  ],
}

export default function ArenaPage() {
  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 20px 64px', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>Kineo · Engine Arena</p>
      <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.02em', margin: '10px 0 14px' }}>
        Seven AI video engines. <span style={{ color: '#5cb3ff' }}>Real renders, honest labels.</span>
      </h1>
      <p style={{ color: '#c7c7cc', fontSize: 16, maxWidth: 760 }}>
        Every comparison you find online is a blog post with a demo reel. This page is the opposite: each clip below
        came out of the same Kineo pipeline, from a customer-style script, and carries the badge of the engine that
        actually rendered it. Read the trade-offs, then send your own script to the one you like — they all live in
        the same text box.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, margin: '30px 0' }}>
        {FIGHTERS.map((f) => {
          const example = getPublicEngineExample(f.exampleId)
          if (!example) return null
          const previewPath = example.arenaPreviewPath ?? example.videoPath
          const posterPath = example.arenaPosterPath ?? example.posterPath
          return (
          <div key={f.badge} style={{ borderRadius: 16, border: '1px solid #2a2a2d', background: '#131316', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', background: '#000' }}>
              <video
                src={previewPath}
                poster={posterPath}
                muted
                playsInline
                preload="none"
                controls
                controlsList="nodownload"
                aria-label={`${f.badge} example: ${example.title}`}
                style={{ width: '100%', display: 'block', aspectRatio: '500 / 280', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,.75)', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 900, letterSpacing: '.1em' }}>
                {f.badge}
              </span>
            </div>
            <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <p style={{ color: '#c7c7cc', fontSize: 13.5, margin: '0 0 10px' }}><b style={{ color: '#f5f5f7' }}>Strength.</b> {f.strength}</p>
              <p style={{ color: '#a1a1a8', fontSize: 12.5, margin: '0 0 10px' }}><b style={{ color: '#e0a458' }}>Trade-off.</b> {f.watchOut}</p>
              <p style={{ color: '#a1a1a8', fontSize: 12.5, margin: '0 0 14px' }}><b style={{ color: '#34d399' }}>Best for.</b> {f.bestFor}</p>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ color: '#86868b', fontSize: 11.5, fontWeight: 700 }}>{creditCostFor(f.quality, true)} credits / film</span>
                <Link
                  href={`/studio?engine=${f.engineParam}&intent_campaign=arena`}
                  style={{ background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: 12.5, padding: '8px 14px', borderRadius: 10, textDecoration: 'none' }}
                >
                  Try this engine →
                </Link>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      <div style={{ padding: '22px 24px', borderRadius: 16, background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.3)', textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 900, margin: '0 0 6px' }}>One subscription. All seven.</p>
        <p style={{ color: '#a1a1a8', fontSize: 14, margin: '0 0 14px' }}>
          You don&apos;t pick an engine when you subscribe — you pick it per video, from the same text box. Plans from {STARTER_PRICE_LABEL}/month; a new account gets {TRIAL_GRANT_CREDITS_COPY} free credits, no card.
        </p>
        <Link
          href="/studio?intent_campaign=arena&utm_source=seo&utm_medium=arena&utm_campaign=engine_arena"
          style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}
        >
          Render your script free →
        </Link>
      </div>

      <p style={{ color: '#5a5a60', fontSize: 12, textAlign: 'center', marginTop: 18 }}>
        Arena rankings move — the #1 claim reflects the August 2026 standings. Clips are real customer-pipeline renders, never demo reels.
      </p>
    </main>
  )
}
