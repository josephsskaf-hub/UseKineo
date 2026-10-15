// KINEO-REBASE-2026-07-10 — 2:1 credit rebase: every "50 credits" → 20 (Seedance).
// ROBO2-SEO-2026-06-28 — high-intent SEO page for the "cheapest AI shorts maker"
// buyer cluster (cheapest AI YouTube Shorts generator / affordable faceless shorts AI /
// make AI YouTube Shorts cheap). Honest angle: a USD calculator uses the real
// plan credits and prices. Generates from a topic, not a re-clipper.
// Static page; added to sitemap. FAQ JSON-LD for rich results.
//
// KINEO-PAGINAS-MOTOR-1610 — a página respondia com o Kineo 1 ("Fast Mode", "3 Fast videos every 24h"), que saiu do catálogo
// público em 29/09 (KINEO1_PUBLIC=false): a promessa da primeira dobra não existia mais. E o teste no ChatGPT de 15/10 mostrou
// que a Kineo não aparece para "cheapest way to make AI YouTube Shorts" (o topo cita Google Flow grátis, Kling, CapCut). Agora:
//   · resumo citável de 3 linhas no topo respondendo EXATAMENTE essa pergunta, com o custo por Short calculado em código
//     (lib/seo/paginasMotor1610.ts → creditCostForDuration / TIER_PRICES / TIER_CREDITS);
//   · a tabela de custo por motor e duração (15/35/60 s) do artigo do GPT (docs/paginas-gpt/ai-short-video-cost-2026.md);
//   · a comparação honesta com Google Flow, Seedance.tv, Dreamina, CapCut e o app do Kling (fonte oficial e data no módulo),
//     sem vencedor universal;
//   · a moeda dita pela frase canônica (CHECKOUT_CURRENCY_DISCLOSURE): "Brazil pays in BRL" contradizia o checkout em USD.
// Nenhum preço ou crédito da Kineo digitado aqui.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import StickyFreeShortCTA from '@/components/StickyFreeShortCTA'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import ShortCostCalculator from './ShortCostCalculator'
import AgencyVolumeBridge from '@/components/AgencyVolumeBridge'
import { CheapestAnswer1610, CompetitorTable1610 } from '@/components/PaginasMotor1610'
import {
  ENGINE_REFS,
  FONTES_CONCORRENTES_1610,
  PAGINAS_MOTOR_1610_CHECKED_LABEL,
  REFERENCE_PLAN_LINE,
  cheapestAnswer,
  engineListed,
  filmCredits,
  usd,
  creditsToCents,
} from '@/lib/seo/paginasMotor1610'
import { FREE_FILM_LABEL, GRANT_COUNTRY_CLAUSE, TRIAL_FREE_FILM_SECONDS, TRIAL_SEEDANCE15_FILMS } from '@/lib/freeTierOffer'
import { CHECKOUT_CURRENCY_DISCLOSURE } from '@/lib/marketingPrice'

const CALCULATOR_CAMPAIGN = 'push77_short_cost_calculator'
const CALCULATOR_FORM_ID = 'try-costed-workflow'
const CALCULATOR_EXAMPLES = [
  'The island nobody is allowed to visit',
  'The money habit that quietly keeps people broke',
  'Why the Door to Hell is still burning',
] as const

// Os números da página (todos derivados): o filme mais barato de 60 s e os três motores mais usados.
const ANSWER = cheapestAnswer()
const SEEDANCE_60 = filmCredits('seedance', 60) as number
const KLING_60 = filmCredits('kling', 60) as number
const VEO_60 = filmCredits('veo', 60) as number
const HAS_FREE_FILM = TRIAL_SEEDANCE15_FILMS >= 1
const FLOW = FONTES_CONCORRENTES_1610.googleFlow
const FLOW_CLIPS_60 = Math.ceil(60 / FLOW.veoFastMaxSeconds)
const FLOW_CREDITS_60 = FLOW_CLIPS_60 * FLOW.veoFastCreditsPerGeneration
const ENGINE_LIST_60 = (['seedance', 'kling', 'h3', 'veo', 'hollywood', 's25'] as const)
  .filter(engineListed)
  .map((k) => `${ENGINE_REFS[k].name} ${filmCredits(k, 60)}`)
  .join(', ')

export const metadata: Metadata = {
  title: 'Cheapest Way to Make AI YouTube Shorts (2026) | Kineo',
  description:
    'The cost of an AI YouTube Short: Kineo’s finished narrated film per engine vs Google Flow, Seedance.tv, Dreamina, CapCut and Kling clips, with sources.',
  alternates: { canonical: 'https://www.usekineo.com/cheapest-ai-shorts-maker' },
  openGraph: {
    title: 'Cheapest way to make AI YouTube Shorts (2026)',
    description:
      'Cost per finished Short on every Kineo engine, next to the public prices of Google Flow, Seedance.tv, Dreamina, CapCut and the Kling app.',
    url: 'https://www.usekineo.com/cheapest-ai-shorts-maker',
    type: 'website',
  },
}

const STEPS: { n: string; t: string; d: string }[] = [
  { n: '1', t: 'Type one idea or paste your script', d: 'No source footage, no long video to re-clip. One line is enough — "the island too dangerous to visit", "how compound interest works".' },
  { n: '2', t: 'Pick the engine by cost', d: `For a 60-second film, ${ENGINE_REFS.seedance.name} uses ${SEEDANCE_60} credits, ${ENGINE_REFS.kling.name} ${KLING_60} and ${ENGINE_REFS.veo.name} ${VEO_60}. Shorter films cost proportionally less.` },
  { n: '3', t: 'Download a ready-to-post Short', d: 'A finished 9:16 video — script, AI voiceover, generated scenes, captions and music — with no editor and no timeline.' },
]

const WHY_CHEAPER: { t: string; d: string }[] = [
  { t: 'You pay for the finished film, not for raw seconds', d: 'Clip tools charge per generated clip; the script, the voice-over across clips, the captions and the edit are still yours to do. Kineo’s credits cover all of that in one render.' },
  { t: `Start at ${SEEDANCE_60} credits for 60 seconds`, d: `${ENGINE_REFS.seedance.name} is the lowest-credit engine for a finished 60-second film; use a premium engine only when the scene needs it.` },
  { t: 'No camera, no editor, no extra subscriptions', d: 'Script, AI voiceover, scenes, captions and music come from one pass — the price of a Short is the credits, not a stack of separate tools.' },
  { t: 'Try before you pay', d: HAS_FREE_FILM ? `New accounts${GRANT_COUNTRY_CLAUSE} get one ${FREE_FILM_LABEL}, watermarked, so you can judge the result before choosing a plan.` : 'Compare the published examples on each engine page before choosing a plan.' },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'What is the cheapest way to make AI YouTube Shorts?', a: ANSWER.summary.join(' ') },
  { q: 'How much does one AI YouTube Short cost on Kineo?', a: `In credits, a finished 60-second film costs: ${ENGINE_LIST_60}. At the ${REFERENCE_PLAN_LINE()}, the ${ANSWER.cheapest.name} film is worth about ${usd(creditsToCents(ANSWER.cheapest.c60))}. A 15-second ${ANSWER.cheapest.name} film costs ${ANSWER.cheapest.c15} credits. You pay for a plan; every film uses credits from the same monthly balance.` },
  { q: 'Is Google Flow cheaper than Kineo?', a: `In money, Google Flow’s free tier can be: free accounts get ${FLOW.freeCreditsPerDay} credits a day and a Veo 3.1 Fast generation costs ${FLOW.veoFastCreditsPerGeneration} (Google’s help page, read ${PAGINAS_MOTOR_1610_CHECKED_LABEL}). A 60-second Short from ${FLOW.veoFastMaxSeconds}-second clips needs ${FLOW_CLIPS_60} clips, or ${FLOW_CREDITS_60} credits, and you still write the script, record or generate the voice-over and add captions. Kineo charges per finished film with all of that done. Which is cheaper depends on what your editing time is worth.` },
  { q: 'Why is a cheap AI Shorts generator not just a clip cutter?', a: 'Clip cutters like OpusClip or Submagic re-clip a long video you already filmed — no help if you are faceless and starting from scratch. Kineo creates the video from an idea, so the price buys a finished Short, not chopped-up footage.' },
  { q: 'Do I have to use the most expensive AI engine?', a: `No. You pick the engine per video. For 60 seconds, ${ENGINE_REFS.seedance.name} uses ${SEEDANCE_60} credits, ${ENGINE_REFS.kling.name} ${KLING_60} and ${ENGINE_REFS.veo.name} ${VEO_60}. A higher credit price is what you spend, not a guarantee of a better Short.` },
  { q: 'Are the dollar amounts the price of one video?', a: `No. They are what the credits are worth at the ${REFERENCE_PLAN_LINE()}. Your checkout charges for the plan you choose; other creations use the same balance.` },
  { q: 'Can I try it before paying for a plan?', a: `${HAS_FREE_FILM ? `Yes. New accounts${GRANT_COUNTRY_CLAUSE} get one ${FREE_FILM_LABEL}, watermarked.` : 'You can compare the published examples on each engine page first.'} Paid plans unlock clean exports.` },
]

export default function CheapestAiShortsMakerPage() {
  const signupUrl = '/signup?intent_campaign=push22_cheapest'
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const h2: CSSProperties = { fontSize: 'clamp(1.3rem, 3.5vw, 1.7rem)', fontWeight: 800, margin: '44px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#86868b', lineHeight: 1.65, margin: '0 0 12px' }
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 20px 88px' }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
          AI Short cost, compared
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1.12, margin: '18px 0 0' }}>
          The cheapest way to make AI YouTube Shorts
        </h1>
        <CheapestAnswer1610 />
        <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '22px 0 0' }}>
          Kineo turns a single idea into a finished Short — the hook and script, an AI voiceover, generated scenes, captions and music — and charges credits by engine and length. Below: the same math for the free and paid tools people compare it with, and a calculator for your monthly volume.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '22px 0 0' }}>
          <OrganicCtaLink href={signupUrl} source="push22_cheapest" placement="hero" style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}>{HAS_FREE_FILM ? `Make my free ${TRIAL_FREE_FILM_SECONDS}-second film →` : 'Create my account →'}</OrganicCtaLink>
          <Link href="/pricing" style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}>See pricing</Link>
        </div>
        <p style={{ fontSize: 13, color: '#2997ff', fontWeight: 700, margin: '12px 0 0' }}>
          USD prices matched to Checkout · {CHECKOUT_CURRENCY_DISCLOSURE}
        </p>

        <ShortCostCalculator />

        <TopicGeneratorForm
          campaign={CALCULATOR_CAMPAIGN}
          source={CALCULATOR_CAMPAIGN}
          examples={CALCULATOR_EXAMPLES}
          formId={CALCULATOR_FORM_ID}
          creationIntent="trial_best"
          copy={{
            label: 'What should your first cost-tested Short be about?',
            placeholder: 'Type one topic or paste your script',
            submit: 'Create this Short →',
            examplesLabel: 'Low-cost topic examples',
            note: HAS_FREE_FILM ? `Your topic stays attached through signup. New accounts${GRANT_COUNTRY_CLAUSE} start with a ${FREE_FILM_LABEL}.` : 'Your topic stays attached through signup.',
          }}
        />

        <AgencyVolumeBridge entry="cost_page" />

        <CompetitorTable1610 />

        <h2 style={h2}>Make AI YouTube Shorts cheap in 3 steps</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 14, background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '16px 18px' }}>
              <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.18)', color: '#2997ff', fontWeight: 800, display: 'grid', placeItems: 'center' }}>{s.n}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#f5f5f7' }}>{s.t}</div>
                <div style={{ fontSize: 14, color: '#86868b', marginTop: 3, lineHeight: 1.55 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>Where Kineo is the cheaper choice — and where it is not</h2>
        <p style={p}>
          If you have time to edit and want to spend nothing, a free clip allowance and a free editor cost less money. Kineo is built for the other case: one idea in, a finished faceless Short out, at a known credit price per film.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {WHY_CHEAPER.map((w) => (
            <div key={w.t} style={{ background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, color: '#f5f5f7' }}>{w.t}</div>
              <div style={{ fontSize: 14, color: '#86868b', marginTop: 6, lineHeight: 1.6 }}>{w.d}</div>
            </div>
          ))}
        </div>

        <h2 style={h2}>When NOT to use these numbers</h2>
        <ul style={{ ...p, paddingLeft: 18 }}>
          <li>As a fixed production quote when one exact scene is essential: a credit budget does not guarantee the first render meets the brief.</li>
          <li>To pick the most expensive engine because it costs more — the price is verified here, a quality ranking is not.</li>
          <li>When you already have all your footage and only need editing: buying new AI scenes adds cost you do not need.</li>
          <li>For product-photo ads: <Link href="/ads" style={{ color: '#2997ff' }}>Studio Ads</Link> has its own credits per ad, not covered by this table.</li>
        </ul>

        <h2 style={h2}>An affordable faceless shorts AI — not a clip cutter</h2>
        <p style={p}>
          Most “AI Shorts” tools (OpusClip, Submagic, Klap) take a long video you already filmed and chop it into clips. That’s no help if you’re faceless and starting from just an idea. Kineo works the other way around: it <strong style={{ color: '#f5f5f7' }}>creates the entire video from a topic</strong> — so the price gets you a finished Short, not chopped-up footage, and you never need source video, a camera, or an editing app. Want the full breakdown of that workflow? See <Link href="/youtube-shorts-from-topic" style={{ color: '#2997ff' }}>making a YouTube Short from a topic</Link>.
        </p>

        <h2 style={h2}>Pick the right engine — pay more only when the scene needs it</h2>
        <p style={p}>
          Every video lets you choose the engine. <strong style={{ color: '#f5f5f7' }}>For 60 seconds: {ENGINE_LIST_60} credits</strong>. Start with {ENGINE_REFS.seedance.name} when cost matters most, then use a premium engine only when the creative needs it. See <Link href="/seedance-vs-veo-vs-kling" style={{ color: '#2997ff' }}>which engine fits which story</Link>, compare the full plans on the <Link href="/pricing" style={{ color: '#2997ff' }}>pricing page</Link>, or see how it stacks up against other tools under <Link href="/alternatives" style={{ color: '#2997ff' }}>alternatives</Link>. For a worked example, read the <Link href="/ai-video-generator/complete-60-second-shorts-cost" style={{ color: '#2997ff' }}>complete Short cost guide</Link>; for workflow differences, use the <Link href="/vs/invideo-alternatives-faceless-shorts" style={{ color: '#2997ff' }}>faceless video tool comparison</Link>.
        </p>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map((f) => (
            <div key={f.q} style={{ background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, color: '#f5f5f7' }}>{f.q}</div>
              <div style={{ fontSize: 14, color: '#86868b', marginTop: 6, lineHeight: 1.6 }}>{f.a}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 44, textAlign: 'center', background: 'radial-gradient(circle at 50% 0%, rgba(41,151,255,0.14), #0c0c0e 70%)', border: '1px solid rgba(41,151,255,0.25)', borderRadius: 18, padding: '34px 22px' }}>
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>One idea in, a finished Short out.</div>
          <p style={{ color: '#86868b', margin: '8px 0 18px' }}>{HAS_FREE_FILM ? `Your first ${TRIAL_FREE_FILM_SECONDS}-second film is free.` : 'Pick the engine that fits your budget.'}</p>
          <OrganicCtaLink href={signupUrl} source="push22_cheapest" placement="final" style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}>Start my first Short →</OrganicCtaLink>
        </div>
      </div>
      <StickyFreeShortCTA />
      <Footer />
    </main>
  )
}
