// ═══ KINEO-VS-HIGGSFIELD-2026-08-25 ══════════════════════════════════════════
// O fundador colou o print do pricing do Higgsfield ao lado do nosso: eles são
// a referência de vitrine e vendem GERAÇÕES (créditos → clipes soltos). Nós
// vendemos o FILME PRONTO. Essa diferença é o argumento de venda inteiro e não
// existia em página nenhuma nossa.
//
// A honestidade aqui é estratégica, não moral (embora seja as duas): quem
// pesquisa "higgsfield alternative" já conhece o produto deles. Página que
// finge que o concorrente é ruim queima a confiança na primeira linha. Página
// que reconhece o que ele faz melhor E mostra onde a gente resolve o problema
// que ele não resolve — essa converte, e é a que a LLM cita.
import type { Metadata } from 'next'
import Link from 'next/link'
import { TIER_PRICES, TIER_CREDITS } from '@/lib/checkoutPricing'
import { filmsAndScenes } from '@/lib/marketingPrice'
// KINEO-SELO-OMNI-POPUP-2026-09-30 — a página dizia "six engines including Omni Flash (#1)" na FAQ e "seven, incl.
// Omni Flash (#1, Aug 2026)" na tabela: contagem errada (duas vezes, diferente em cada lugar) e um motor pausado
// desde 15/09 vendido como diferencial. Contagem e lista agora são as derivadas dos interruptores.
import { VIDEO_ENGINE_COUNT_WORD, VIDEO_ENGINE_LIST_COPY } from '@/lib/engineLaunch'
import { TRIAL_CREDITS_SHOWN, TRIAL_FIRST_FILM_PHRASE, TRIAL_FIRST_FILM_SHORT, GRANT_COUNTRY_CLAUSE } from '@/lib/freeTierOffer' // KINEO-VERDADE-TRIAL-2026-10-05 · KINEO-MOTORES-GEO-2026-10-06 (país)
const ENGINE_COUNT = VIDEO_ENGINE_COUNT_WORD.toLowerCase()

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const usd = (cents: number) => `$${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`

export const metadata: Metadata = {
  title: 'Kineo vs Higgsfield — clips or a finished film? (2026 honest comparison)',
  description:
    'Higgsfield sells AI generations; Kineo delivers the finished vertical film — script, scenes, voiceover, karaoke captions and soundtrack in one render. Same engines, different output. Honest side-by-side with real renders.',
  alternates: { canonical: `${BASE}/kineo-vs-higgsfield` },
  openGraph: {
    title: 'Kineo vs Higgsfield — clips or a finished film?',
    description: 'Same top engines. One gives you clips to edit; the other gives you the finished Short. Honest comparison, real renders.',
    url: `${BASE}/kineo-vs-higgsfield`,
    type: 'article',
  },
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the difference between Kineo and Higgsfield?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Both run top AI video models. Higgsfield is a generation platform: you buy credits, generate clips and images, and assemble the result yourself. Kineo is a film pipeline: you paste a script or one line and get back a finished vertical Short — scenes planned and rendered, AI voiceover, karaoke captions, soundtrack and a 1080×1920 master, with no editing step.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Kineo cheaper than Higgsfield?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Kineo plans start at ${usd(TIER_PRICES.starter.usd)}/month and the mid plan is ${usd(TIER_PRICES.basic.usd)}/month; Higgsfield's plans start at $15/month (Starter, 200 credits) and Plus is $49/month, or $39/month billed annually (1,000 credits), as listed on Higgsfield's site in October 2026. The honest comparison is per finished video: with Kineo the credits include the whole film — narration, captions and music — while on a generation platform a finished Short usually means several generations plus your editing time.`,
      },
    },
    {
      '@type': 'Question',
      name: 'Does Kineo have the same AI models?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Kineo runs ${ENGINE_COUNT} engines you can use today — ${VIDEO_ENGINE_LIST_COPY}, with Kling 3 adding native voice and lip sync — all inside one subscription, selectable per video.`, // KINEO-FILME-GRATIS-15S-2026-09-29 — Kineo 1 fora do catálogo público
      },
    },
  ],
}

const ROWS: Array<[string, string, string]> = [
  ['What you get back', 'Clips and images you assemble', 'A finished vertical film — no editing step'],
  ['Script', 'You write it', 'Write it, paste it, or type one line and it is written for you'],
  ['Voiceover', 'Add it yourself', 'Included — AI narration, 4 voices'],
  ['Captions', 'Add them yourself', 'Included — karaoke word-by-word'],
  ['Soundtrack', 'Add it yourself', 'Included — mood-matched per genre'],
  ['Character/world consistency', 'Per generation', 'Anchored across every scene of the film'],
  ['Top engines', 'Yes — several', `Yes — ${ENGINE_COUNT}: ${VIDEO_ENGINE_LIST_COPY}`],
  ['Talking character with lip sync', 'Limited', 'Kling 3 renders a character speaking your line'],
  ['Entry', 'Limited free tier', `Free trial${GRANT_COUNTRY_CLAUSE}: ${TRIAL_FIRST_FILM_SHORT}, no card`],
]

export default function VsHiggsfieldPage() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 64px', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>Kineo · Comparison</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.15, margin: '10px 0 14px', letterSpacing: '-0.02em' }}>
        Kineo vs Higgsfield: clips, or a finished film?
      </h1>

      <p style={{ color: '#c7c7cc', fontSize: 16 }}>
        Let&apos;s be fair about it: Higgsfield is a strong generation platform with a beautiful catalogue of models, and
        if what you want is to generate images and clips and craft the edit yourself, it does that well. This page
        exists for the other person — the one who wants to post a Short today and doesn&apos;t want to open an editor at all.
      </p>

      <p style={{ color: '#c7c7cc', fontSize: 16 }}>
        That&apos;s the whole difference. <b>A generation platform hands you the raw material. Kineo hands you the film.</b>
      </p>

      <div style={{ margin: '26px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid #2a2a2d' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#161618' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#86868b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>&nbsp;</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#a1a1a8', fontSize: 12 }}>Generation platform</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#5cb3ff', fontSize: 12 }}>Kineo</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, a, b], i) => (
              <tr key={k} style={{ background: i % 2 ? '#131316' : '#161618' }}>
                <td style={{ padding: '10px 14px', color: '#86868b', fontWeight: 700 }}>{k}</td>
                <td style={{ padding: '10px 14px', color: '#a1a1a8' }}>{a}</td>
                <td style={{ padding: '10px 14px', color: '#e8e8ea', fontWeight: 600 }}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>The price question, answered honestly</h2>
      <p style={{ color: '#c7c7cc' }}>
        Kineo starts at <b>{usd(TIER_PRICES.starter.usd)}/month</b> ({TIER_CREDITS.starter} credits, {filmsAndScenes('starter')}) and the
        popular plan is <b>{usd(TIER_PRICES.basic.usd)}/month</b> ({TIER_CREDITS.basic} credits, {filmsAndScenes('basic')}).
        The number that actually matters is not the monthly price, it is <b>the cost of one finished Short</b> — because
        on a generation platform a finished Short is several generations plus the hour you spend assembling it. Here
        the credits already include the narration, the captions, the music and the master.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>Judge it by output, not by table</h2>
      <p style={{ color: '#c7c7cc' }}>
        Tables are easy to write, so don&apos;t trust ours either — watch the films:{' '}
        <Link href="/ai-robot-video-generator" style={{ color: '#2997ff' }}>a giant-robot battle with the exact 150-word script that generated it</Link>,{' '}
        <Link href="/arena" style={{ color: '#2997ff' }}>the same pipeline across the engines</Link>, or{' '}
        <Link href="/examples" style={{ color: '#2997ff' }}>real user renders</Link> with honest engine badges.
      </p>

      <div style={{ margin: '30px 0 0', padding: '20px 22px', borderRadius: 14, background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.3)', textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px' }}>Type one line. Get the finished Short.</p>
        <Link
          href="/free?utm_source=seo&utm_medium=vs_higgsfield&utm_campaign=comparison"
          style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}
        >
          Start free
        </Link>
        <p style={{ color: '#86868b', fontSize: 12, marginTop: 10 }}>{`Free — ${TRIAL_CREDITS_SHOWN} credits${GRANT_COUNTRY_CLAUSE}, ${TRIAL_FIRST_FILM_PHRASE}, no card`}</p>
      </div>

      <p style={{ color: '#5a5a60', fontSize: 11.5, marginTop: 20 }}>
        Competitor pricing and features change; Higgsfield figures were read from Higgsfield’s own price list in October 2026. We link
        to our own renders so you can verify our side yourself. Kineo is not affiliated with Higgsfield.
      </p>
    </main>
  )
}
