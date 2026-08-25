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
import OrganicCtaLink from '@/components/OrganicCtaLink'
import StickyFreeShortCTA from '@/components/StickyFreeShortCTA'
import WallMedia from '@/components/WallMedia'
import { getEngineRenders } from '@/lib/engineWall'
import {
  getFreeTierOffer,
  swapFreeTierCopy as ft,
  TRIAL_GRANT_CREDITS_COPY,
  // KINEO-TRIAL-COBRE-MOTOR-2026-08-21 — as FAQs desta página afirmavam
  // quantos vídeos de CADA motor os créditos grátis pagavam. Com o grant em
  // 25 (era 80), duas dessas frases viraram falsas: Kling 2.5 "cover one"
  // deixou de cobrir, e Seedance "the first four films" virou um. Agora a
  // conta é feita, não escrita.
  trialFilmsForEngine,
} from '@/lib/freeTierOffer'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_MONTH } from '@/lib/marketingPrice'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'
export const dynamicParams = false

type Engine = {
  /** Valor aceito por /generate?engine=… (GenerateClient.tsx:762). */
  param: 'fast' | 'seedance' | 'kling' | 'veo' | 'hollywood' | 'h3' | 'omni'
  /** quality_mode no banco — chave de getEngineRenders. */
  qualityMode: string
  /** Nome comercial exibido (bate com os selos de lib/engineWall.ts). */
  name: string
  /** Endpoint real, verbatim de app/api/generate-video-cinematic/route.ts. */
  model: string
  /** Custo em créditos — fonte única lib/credits/engineCost.ts. */
  credits: string
  /** Plano mínimo. Studio = fora do trial Creator (lib/reverseTrial.ts). */
  tier: 'Free' | 'Creator' | 'Studio'
  h1: string
  intro: string
  bestFor: string
  tradeoff: string
  faq: { q: string; a: string }[]
}

// Modelos conferidos LINHA A LINHA em app/api/generate-video-cinematic/route.ts
// (15/08): SEEDANCE_MODEL, KLING_MODEL, VEO_MODEL, KLING3_MODEL. A sprint das
// 10h levantou a suspeita de que "Kling 2.5 / Seedance 1.5" fossem rótulos
// velhos (fontes de 2026 falam em Kling 3.0 e Seedance 2.0). Conferido: os
// rótulos da home descrevem exatamente os endpoints que chamamos. Nada a mudar.
export const ENGINES: Record<string, Engine> = {
  'kineo-1': {
    param: 'fast',
    qualityMode: 'fast',
    name: 'Kineo 1',
    model: 'Kineo’s own stock-footage + TTS pipeline',
    credits: 'Free (watermarked) · 5 credits for a clean export',
    tier: 'Free',
    h1: 'Kineo 1 — the free AI video generator that finishes the whole Short',
    intro:
      'Kineo 1 is our own engine: it writes a hook-first script, records the AI voiceover, matches real footage to every line and burns in captions, then hands you a ready-to-post 9:16 MP4 — usually in 3–7 minutes. It is the engine that runs without a card, and it is the one most of the videos on this page were made with.',
    bestFor: 'Daily posting volume. Facts, listicles, money and history Shorts where the footage is real-world B-roll, not generated.',
    tradeoff: 'It uses stock footage rather than generating each frame, so it cannot invent a scene that does not exist. For invented scenes, use Seedance or a Studio engine.',
    faq: [
      {
        q: 'Is Kineo 1 really free?',
        a: `Yes — Kineo 1 renders and plays with a watermark at no cost and with no credit card. ${ft(OFFER, 'A new account can create up to 3 watermarked Fast videos every 24 hours.', OFFER.copy.sentence)} A clean, watermark-free export costs 5 credits on a paid plan.`,
      },
      {
        q: 'How long does a Kineo 1 video take?',
        a: 'Usually 3–7 minutes from typing the idea to a downloadable vertical MP4 (4.2-minute median, 6.6-minute p90, measured on real renders).',
      },
      {
        q: 'What do I actually get at the end?',
        a: 'A vertical 9:16 MP4 with the script, AI voiceover, matched footage and burned-in captions already assembled — ready to upload to YouTube Shorts, TikTok or Reels with no editing step.',
      },
    ],
  },
  seedance: {
    param: 'seedance',
    qualityMode: 'cinematic_ai',
    name: 'Seedance 1.5',
    model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video',
    credits: '20 credits per video',
    tier: 'Creator',
    h1: 'Seedance 1.5 AI video generator — every scene generated, not stock',
    intro:
      'Seedance 1.5 Pro (ByteDance) is the workhorse generative engine inside Kineo: instead of matching stock footage to your script, it generates every scene from the script itself. You still type one idea — Kineo writes the beats, prompts Seedance scene by scene, voices it, captions it and returns a finished vertical Short. 20 credits per video, and it is included in the Creator trial.',
    bestFor: 'Anything that does not exist on a stock site: an abandoned island, a burning crater, a 1922 expedition. Mystery, history and “weird facts” channels live here.',
    tradeoff: 'Generated scenes cost more than stock and take longer than Kineo 1. If your topic is well covered by real footage, Kineo 1 is faster and free.',
    faq: [
      {
        q: 'Can I use Seedance 1.5 without paying?',
        a: `Seedance costs 20 credits per video. ${ft(OFFER, 'A new account starts with free watermarked Fast videos; Seedance runs on a paid plan starting at ' + STARTER_MONTH + '.', `Every new account gets ${TRIAL_GRANT_CREDITS_COPY} free credits with no card, and Seedance is included — so your first ${trialFilmsForEngine(20)} Seedance ${trialFilmsForEngine(20) === 1 ? 'film comes' : 'films come'} out of the free credits, watermarked. A plan unlocks the clean download.`)}`,
      },
      {
        q: 'What model is behind Kineo’s Seedance engine?',
        a: 'ByteDance Seedance 1.5 Pro (text-to-video), called scene by scene from the script Kineo writes for your topic. The badge on every video on this page is the real engine that rendered it — nothing is relabelled.',
      },
      {
        q: 'Seedance vs Kling vs Veo — which should I pick?',
        a: 'Seedance is the best value per generated video (20 credits) and handles most faceless Shorts. Kling 2.5 is stronger on camera movement and physical motion. Veo 3.1 is Google’s flagship and the most expensive. Kling 2.5, Veo 3.1 and Kling 3 are unlocked on every new account — the free credits just have to cover the engine cost.',
      },
    ],
  },
  kling: {
    param: 'kling',
    qualityMode: 'cinematic_kling',
    name: 'Kling 2.5',
    model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
    credits: '50 credits per video',
    tier: 'Studio',
    h1: 'Kling 2.5 AI video generator for vertical Shorts — camera motion that holds up',
    intro:
      'Kling 2.5 Turbo Pro is the engine to reach for when the shot has to MOVE: a push-in through Roman ruins, a drone climb over a golden mountain, a 50-metre strike in a packed stadium. Kineo drives it from the script — you type the idea, Kineo writes the beats, prompts Kling scene by scene, voices and captions the result, and returns a finished 9:16 Short. 50 credits per video on the Studio plan.',
    bestFor: 'Sports, action, travel and any topic where the camera itself is part of the storytelling.',
    tradeoff: 'Studio-plan engine at 50 credits — 2.5× a Seedance video. If the scene is static, Seedance gets you the same story for less.',
    faq: [
      {
        q: 'Is Kling 2.5 free on Kineo?',
        a: `Yes — every new account unlocks Kling 2.5 along with every other engine. It costs 50 credits per video, and the ${TRIAL_GRANT_CREDITS_COPY} free credits ${trialFilmsForEngine(50) > 0 ? `cover ${trialFilmsForEngine(50)}` : 'do not stretch to one — they cover a full Seedance film instead, which is the same pipeline on a cheaper engine'}. Any plan or top-up unlocks Kling. Trial films come out watermarked; a plan unlocks the clean download.`,
      },
      {
        q: 'Which Kling model does Kineo use?',
        a: 'Kling 2.5 Turbo Pro (text-to-video), plus the matching image-to-video endpoint of the same family when a scene is anchored to a reference frame.',
      },
      {
        q: 'Do I have to write prompts for each scene?',
        a: 'No. You type one idea. Kineo writes the script with a hook-first structure, breaks it into scenes and writes each scene prompt for Kling itself. You can edit the script before it renders.',
      },
    ],
  },
  veo: {
    param: 'veo',
    qualityMode: 'cinematic_veo',
    name: 'Veo 3.1',
    model: 'fal-ai/veo3.1/fast',
    credits: '90 credits per video',
    tier: 'Studio',
    h1: 'Veo 3.1 AI video generator — Google’s flagship, wired into a finished Short',
    intro:
      'Veo 3.1 is Google’s flagship video model, and inside Kineo it is not a clip generator you then have to edit: you type one idea and get the whole vertical Short — script, AI voiceover, Veo-generated scenes and captions — assembled and ready to post. 90 credits per video on the Studio plan.',
    bestFor: 'The hero video of a channel: the one render a week that has to look expensive. Prompt adherence and scene coherence are its strong suit.',
    tradeoff: 'The most expensive engine after Kling 3 (90 credits) and Studio-only. It is not the engine for posting daily — pair it with Kineo 1 for volume.',
    faq: [
      {
        q: 'Can I try Veo 3.1 for free?',
        a: `Yes — Veo 3.1 is unlocked on every account at 90 credits per video; the ${TRIAL_GRANT_CREDITS_COPY} free credits do not cover one, so it takes a plan or a top-up. What you can test at no cost is the pipeline itself: run the same topic through Kineo 1 or Seedance, see the script, voice and captions, then switch engines once you like the format.`,
      },
      {
        q: 'What is different about Veo inside Kineo versus using Veo directly?',
        a: 'Veo returns silent scenes. Kineo writes the script, splits it into scenes, prompts Veo for each one, records the voiceover, syncs captions and assembles the 9:16 export. You get a publishable Short instead of raw clips.',
      },
      {
        q: 'Veo 3.1 or Kling 3?',
        a: 'Veo 3.1 (90 credits) is the stronger general-purpose flagship. Kling 3 (150 credits) is the one to use when a scene needs a person speaking on camera with native voice and lip sync.',
      },
    ],
  },
  'kling-3': {
    param: 'hollywood',
    qualityMode: 'cinematic_hollywood',
    name: 'Kling 3',
    model: 'fal-ai Kling 3 (dialogue / i2v scene routing)',
    credits: '150 credits per video',
    tier: 'Studio',
    h1: 'Kling 3 AI video generator — film scenes with native voice and lip sync',
    intro:
      'Kling 3 is the top of the range: multi-scene films where a character can speak on camera, in their own generated voice, with lip sync — a medieval historian holding a book, a reporter in golden hour on a Manhattan street, a presenter in a futuristic studio. Kineo routes each scene to the right Kling 3 endpoint and returns the finished vertical film. 150 credits per video on the Studio plan.',
    bestFor: 'Talking-head storytelling without a camera, a face, or a studio. The renders people say “that does not even look like AI” about.',
    tradeoff: 'The most expensive engine in the catalogue at 150 credits, and Studio-only. One Kling 3 render costs what seven Seedance renders cost.',
    faq: [
      {
        q: 'How much does a Kling 3 video cost on Kineo?',
        a: '150 credits per video, on the Studio plan. It is the most expensive engine in the catalogue and is not part of the free trial.',
      },
      {
        q: 'Can Kling 3 make a character speak on camera?',
        a: 'Yes — that is the reason it exists in the catalogue. Kling 3 renders dialogue scenes with a native generated voice and lip sync, so you can build a talking-head channel without ever filming yourself.',
      },
      {
        q: 'Can I keep the same face across every video?',
        a: 'Yes. Character Lock saves a presenter and reuses the exact same face across renders and thumbnails, so a channel keeps one recognisable host.',
      },
    ],
  },
  // KINEO-H3-2026-08-19 — pagina propria do motor novo. Estas paginas sao a
  // porta de entrada organica ("minimax h3 video generator"), e sao lidas pelo
  // ChatGPT: e por isso que cada motor tem a sua. Numeros conferidos na fal em
  // 19/08 — \$0.06/s em 768p.
  'minimax-h3': {
    param: 'h3',
    qualityMode: 'cinematic_h3',
    name: 'MiniMax H3',
    model: 'minimax/h3 (text-to-video / image-to-video)',
    credits: '45 credits per video',
    tier: 'Creator',
    h1: 'MiniMax H3 AI video generator — cinematic film that fits your plan',
    // #293 — KINEO-H3-FALA-NA-PAGINA-2026-08-23. Desde hoje o H3 renderiza
    // cenas de DIÁLOGO com lip sync alternando com narração (o mesmo desenho do
    // Kling 3), validado em dois renders reais. A página vendia só "cinemático
    // e barato" — o argumento mais forte do motor estava fora do texto que o
    // Google lê e que o comprador compara. O link interno também é o que dá
    // tração à página nova /ai-video-with-talking-characters: página órfã
    // demora semanas para ser indexada; página linkada de uma que já ranqueia
    // entra na próxima passada do crawler.
    intro:
      'MiniMax H3 is the cinematic engine you can actually afford to use more than once a month. It renders multi-scene films at 45 credits, so a Creator plan makes two of them and a Studio plan four — where the top-tier Kling 3, at 150 credits, fits once. Since August 2026 it also renders talking-character scenes: a person on screen speaks your exact line with lip sync while a documentary narrator carries the rest of the film. H3 reads up to nine reference images in a single context, which is what keeps a character and a visual style consistent from the first scene to the last.',
    bestFor: 'Series and channels: anything where the same look has to survive across eight scenes and across weeks of episodes.',
    tradeoff: 'Renders at 768p rather than 1080p. For a 9:16 Short that is plenty, and one-click HD Enhance covers the cases where it is not.',
    faq: [
      {
        q: 'How much does a MiniMax H3 video cost on Kineo?',
        a: '45 credits per finished film. On the Creator plan (90 credits) that is two films a month; on Studio (180 credits) it is four.',
      },
      {
        q: 'Why choose MiniMax H3 over Kling 3?',
        a: 'Cost and consistency. Kling 3 costs 150 credits, so only the Studio plan fits one per month. H3 costs 45, and it accepts up to nine reference images at once — which is the difference between a character who looks the same in every scene and one who drifts. Kling 3 still wins when a scene needs a person speaking on camera with native lip sync.',
      },
      {
        q: 'Does MiniMax H3 generate its own audio?',
        a: 'The model can, but Kineo keeps it muted on purpose. Your narration is spoken exactly as you wrote it, and letting the model add a second voice on top would break that. The soundtrack you hear is chosen to match the subject of the video.',
      },
    ],
  },
  // KINEO-OMNI-2026-08-25 — página do motor novo, publicada APÓS a validação
  // real (Flight 19, 72s, auditoria ffmpeg zero-apagão). "gemini omni flash
  // video generator" é a busca que nasce com o ranking de agosto — chegar
  // cedo nela é chegar antes do concorrente ter página.
  'gemini-omni-flash': {
    param: 'omni',
    qualityMode: 'cinematic_omni',
    name: 'Omni Flash',
    model: 'google/gemini-omni-flash (image-to-video)',
    credits: '150 credits per video',
    tier: 'Studio',
    h1: "Gemini Omni Flash AI video generator — Google's #1-ranked model, as a finished Short",
    intro:
      "Omni Flash is Google's Gemini Omni Flash — the #1-ranked video model in the August 2026 blind arena — running inside Kineo's cinematic pipeline. Every scene is anchored to a generated still image, so characters and world stay consistent across the whole film; Kineo adds the documentary narration, karaoke captions and soundtrack, and delivers a vertical 1080×1920 master. It sits at the same 150-credit tier as Kling 3: the two flagship engines, two different looks.",
    bestFor: 'Flagship storytelling where motion realism matters most: physical scenes, weather, machines, crowds — the model was ranked #1 for exactly this.',
    tradeoff: 'Scenes cap at 10 seconds each (the provider limit), so very long single-shot monologues are split across cuts. Kling 3 still wins when a scene needs a character speaking on camera with native lip sync.',
    faq: [
      {
        q: 'How much does an Omni Flash video cost on Kineo?',
        a: '150 credits per finished film — the same tier as Kling 3. One fits each month on the Studio plan.',
      },
      {
        q: 'Is this really the #1 video model?',
        a: "Gemini Omni Flash ranked #1 in the August 2026 blind video arena (Elo ratings from anonymous side-by-side voting). Rankings move; this badge reflects the August 2026 standings, and we update it when they change.",
      },
      {
        q: 'Why choose Omni Flash over Kling 3?',
        a: 'Motion realism and physical grounding — Omni Flash leads the arena on how scenes and subjects behave. Kling 3 wins for on-camera talking characters with native lip sync. Same price, so pick per story: physical spectacle → Omni Flash; a narrator character carrying the film on camera → Kling 3.',
      },
    ],
  },
}

export const ENGINE_SLUGS = Object.keys(ENGINES)

export function generateStaticParams() {
  return ENGINE_SLUGS.map((engine) => ({ engine }))
}

const BASE = 'https://www.usekineo.com'

export function generateMetadata({ params }: { params: { engine: string } }): Metadata {
  const e = ENGINES[params.engine]
  if (!e) return {}
  const title = `${e.name} AI Video Generator for YouTube Shorts | Kineo`
  const description = `Turn one idea into a finished vertical Short rendered by ${e.name} — script, AI voiceover, scenes and captions, ${e.credits.toLowerCase()}. Watch real user renders made with ${e.name}, not a demo reel.`
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
  const signupUrl = `/signup?utm_source=seo&utm_medium=organic&utm_campaign=${campaign}&intent_campaign=${campaign}&engine=${e.param}`
  const generateUrl = `/generate?engine=${e.param}&intent_campaign=${campaign}`

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

  const tierNote =
    e.tier === 'Studio'
      ? `${e.name} is unlocked on every account — the only limit is whether your credits cover it.`
      : e.tier === 'Creator'
        ? ft(OFFER, `${e.name} runs on a paid plan; Starter is ${STARTER_MONTH}.`, `${e.name} is unlocked on every new account — ${TRIAL_GRANT_CREDITS_COPY} free credits, no card. Trial films are watermarked; a plan unlocks the clean download.`)
        : ft(OFFER, 'Free with a watermark · no card', OFFER.copy.chip)

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
            {e.name} · {e.credits}
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>{e.h1}</h1>
          <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 680 }}>{e.intro}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 22 }}>
            <OrganicCtaLink
              href={signupUrl}
              source={campaign}
              placement="hero"
              style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}
            >
              Start free with {e.name} →
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
                  ['Cost per video', e.credits],
                  ['Plan needed', e.tier === 'Free' ? 'None — runs on a free account' : e.tier === 'Creator' ? 'Creator (included in the free trial)' : 'Studio'],
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
                      <td style={{ padding: '11px 10px', color: '#d2d2d7', whiteSpace: 'nowrap' }}>{o.tier === 'Free' ? 'Free' : `${o.credits.split(' ')[0]} cr`}</td>
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
            One idea in, a ready-to-post vertical Short out. No editing timeline, no card to start.
          </p>
          <OrganicCtaLink
            href={signupUrl}
            source={campaign}
            placement="final"
            style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}
          >
            Start free →
          </OrganicCtaLink>
          <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: '#6e6e73' }}>
            Already have an account?{' '}
            <Link href={generateUrl} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>
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

      <StickyFreeShortCTA href={signupUrl} />
      <Footer />
    </main>
  )
}
