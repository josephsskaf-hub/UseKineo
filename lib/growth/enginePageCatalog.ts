// Shared data for the engine page, hub and sitemap. Route modules export only Next-supported names.
// Mechanical extraction for CITACOES-01; existing content and feature gates are preserved.
import { S25_PUBLIC, AVATAR_PUBLIC, enginePaused } from '@/lib/engineLaunch'
import { FREE_FILM_LABEL, getFreeTierOffer, swapFreeTierCopy as ft, trialFilmsForEngine, TRIAL_CREDITS_SHOWN, TRIAL_SEEDANCE15_FILMS, GRANT_COUNTRY_CLAUSE, TRIAL_FREE_FILM_CREDITS } from '@/lib/freeTierOffer'
import { STARTER_MONTH, MARKETING_REFERENCE_SECONDS, creditsPerReferenceVideo, videosPerMonth } from '@/lib/marketingPrice'
import { ENGINE_LANDING_LABELS, type EngineLandingParam } from '@/lib/growth/engineLandingIntent'
// KINEO-MOTORES-GEO-2026-10-06 — a camada citável das páginas de motor (resposta, tabela de preço, comparação direta).
import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing'
import type { Quality } from '@/lib/credits/engineCost'
import { buildEngineCitation, dayMonthYear, ENGINE_GEO_FILM_MINUTES, type CitationPlan, type EngineCitation } from '@/lib/seo/engineCitation'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()
const FAST_COST = creditsPerReferenceVideo('fast')
const SEEDANCE_COST = creditsPerReferenceVideo('cinematic_ai')
const KLING_COST = creditsPerReferenceVideo('cinematic_kling')
const VEO_COST = creditsPerReferenceVideo('cinematic_veo')
const KLING3_COST = creditsPerReferenceVideo('cinematic_hollywood')
const H3_COST = creditsPerReferenceVideo('cinematic_h3')
const OMNI_COST = creditsPerReferenceVideo('cinematic_omni')
const S25_COST = creditsPerReferenceVideo('cinematic_s25')

// ═══ KINEO-MOTORES-GEO-2026-10-06 — a página de motor que o ChatGPT cita (TAREFA 12) ═══════════════════════════
// Planos e trial chegam das MESMAS constantes que cobram e concedem (TIER_PRICES/TIER_CREDITS; lib/freeTierOffer);
// o preço do clipe e do filme sai de lib/seo/engineCitation.ts (clipCreditCost / creditCostForDuration). Nada digitado.
const GEO_PLANS: CitationPlan[] = [
  { tier: 'starter', label: 'Starter', usdCents: TIER_PRICES.starter.usd, credits: TIER_CREDITS.starter },
  { tier: 'basic', label: 'Creator', usdCents: TIER_PRICES.basic.usd, credits: TIER_CREDITS.basic },
  { tier: 'pro', label: 'Studio', usdCents: TIER_PRICES.pro.usd, credits: TIER_CREDITS.pro },
]
const GEO_TRIAL = { credits: TRIAL_CREDITS_SHOWN, countryClause: GRANT_COUNTRY_CLAUSE, freeFilmLabel: FREE_FILM_LABEL, freeFilmCredits: TRIAL_FREE_FILM_CREDITS }
/** Página de motor indexável = motor fora de manutenção e liberado pelo interruptor de lançamento (S25 só com S25_PUBLIC). */
function geoVisible(param: EngineLandingParam): boolean {
  return !enginePaused(param) && (param !== 's25' || S25_PUBLIC)
}
function geoFor(slug: string, param: EngineLandingParam): EngineCitation | null {
  return geoVisible(param) ? buildEngineCitation({ slug, key: param, name: ENGINE_LANDING_LABELS[param], plans: GEO_PLANS, trial: GEO_TRIAL }) : null
}
/** A entrada citável "onde usar + quanto custa" (+ "é mais barato direto?" quando há preço direto conferido). */
function geoFaq(geo: EngineCitation | null): { q: string; a: string }[] {
  return geo ? [geo.faqWhereCost, ...(geo.faqDirect ? [geo.faqDirect] : [])] : []
}
const SEEDANCE_GEO = geoFor('seedance', 'seedance')
const KLING_GEO = geoFor('kling', 'kling')
const VEO_GEO = geoFor('veo', 'veo')
const KLING3_GEO = geoFor('kling-3', 'hollywood')
const H3_GEO = geoFor('minimax-h3', 'h3')
const OMNI_GEO = geoFor('gemini-omni-flash', 'omni')
const S25_GEO = geoFor('seedance-2-5', 's25')

/**
 * Menor plano mensal cujo grant paga um vídeo de referência (60 s) inteiro — DERIVADO desde KINEO-MOTORES-GEO-2026-10-06.
 * Era digitado e envelheceu: Kling 3 e MiniMax H3 diziam "Studio" enquanto o Creator (150 cr) paga um Kling 3 e o
 * Starter (60 cr) paga um H3 — a mesma página mostrava "Creator" no bloco de capacidade e "Studio" na tabela.
 */
function tierFor(quality: Quality): Engine['tier'] {
  return videosPerMonth('starter', quality) >= 1 ? 'Starter' : videosPerMonth('basic', quality) >= 1 ? 'Creator' : 'Studio'
}
/**
 * A tabela "Every engine, side by side" de TODA página de motor (e o hub) lista o motor pausado como opção — o
 * "Reach for it when" do Omni vendia "ranked #1" sem dizer que ele está em manutenção desde 15/09. O aviso nasce
 * da MESMA pausa do servidor (enginePaused) e some sozinho quando o motor volta.
 */
function pausedLead(param: EngineLandingParam): string {
  const pause = enginePaused(param)
  return pause ? `Paused for new videos since ${dayMonthYear(pause.since)} — ${pause.alternative.label} covers it meanwhile. ` : ''
}

export type Engine = {
  /** Valor aceito por /generate?engine=… (GenerateClient.tsx:762). */
  param: EngineLandingParam
  /** quality_mode no banco — chave de getEngineRenders. */
  qualityMode: string
  /** Nome comercial exibido (bate com os selos de lib/engineWall.ts). */
  name: string
  /** Endpoint real, verbatim de app/api/generate-video-cinematic/route.ts. */
  model: string
  /** Custo de um vídeo de referência de 60s, derivado do biller. */
  creditCost: number
  /** Menor grant mensal que paga um vídeo de referência inteiro. */
  tier: 'Free' | 'Starter' | 'Creator' | 'Studio'
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
    creditCost: FAST_COST,
    tier: tierFor('fast'), // KINEO-MOTORES-GEO-2026-10-06 — derivado
    // KINEO-FILME-GRATIS-15S-2026-09-29 — [Citações/Codex, edição mínima factual] o Kineo 1 deixou de ser o motor
    // grátis de conta nova: a página /ai-video-generator/kineo-1 virou 301 para a do Seedance (next.config) e saiu do
    // sitemap/ENGINE_SLUGS. O texto abaixo fica para o dia em que KINEO1_PUBLIC voltar, já sem promessa de grátis.
    h1: 'Kineo 1 — the stock-footage AI video generator that finishes the whole Short',
    intro:
      'Kineo 1 is our own engine: it writes a hook-first script, records the AI voiceover, matches real footage to every line and burns in captions, then hands you a ready-to-post 9:16 MP4 — usually in 3–7 minutes. It is kept for existing paying accounts and one-time business packs.',
    bestFor: 'Daily posting volume. Facts, listicles, money and history Shorts where the footage is real-world B-roll, not generated.',
    tradeoff: 'It uses stock footage rather than generating each frame, so it cannot invent a scene that does not exist. For invented scenes, use Seedance or a Studio engine.',
    faq: [
      {
        q: 'Who can use Kineo 1?',
        a: `Kineo 1 is kept for existing paying accounts and one-time business packs; a 60-second export costs ${FAST_COST} credits. New accounts start instead with a ${FREE_FILM_LABEL}. ${ft(OFFER, 'A new account can create up to 3 watermarked Fast videos every 24 hours.', OFFER.copy.sentence)}`,
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
    creditCost: SEEDANCE_COST,
    tier: tierFor('cinematic_ai'),
    h1: 'Seedance 1.5 AI video generator — every scene generated, not stock',
    intro:
      `Seedance 1.5 Pro (ByteDance) is the workhorse generative engine inside Kineo: instead of matching stock footage to your script, it generates every scene from the script itself. You still type one idea — Kineo writes the beats, prompts Seedance scene by scene, voices it, captions it and returns a finished vertical Short. ${SEEDANCE_COST} credits per 60-second video; the ${TRIAL_CREDITS_SHOWN}-credit free trial pays for ${TRIAL_SEEDANCE15_FILMS === 1 ? 'one' : TRIAL_SEEDANCE15_FILMS} ${FREE_FILM_LABEL}, and longer Seedance films come with Starter.`,
    bestFor: 'Anything that does not exist on a stock site: an abandoned island, a burning crater, a 1922 expedition. Mystery, history and “weird facts” channels live here.',
    tradeoff: `Generated scenes take longer to render than stock footage (usually ${ENGINE_GEO_FILM_MINUTES.min}–${ENGINE_GEO_FILM_MINUTES.max} minutes), and a 60-second film costs more credits than a short one.`,
    faq: [
      ...geoFaq(SEEDANCE_GEO), // KINEO-MOTORES-GEO-2026-10-06 — onde usar + quanto custa
      {
        q: 'Can I use Seedance 1.5 without paying?',
        a: `Yes, once: every new account${GRANT_COUNTRY_CLAUSE} starts with the free trial (${TRIAL_CREDITS_SHOWN} credits, no card), which pays for ${TRIAL_SEEDANCE15_FILMS === 1 ? 'one' : TRIAL_SEEDANCE15_FILMS} ${FREE_FILM_LABEL}, watermarked. A 60-second Seedance film costs ${SEEDANCE_COST} credits and comes with Starter (${STARTER_MONTH}) or Creator.`,
      },
      {
        q: 'What model is behind Kineo’s Seedance engine?',
        a: 'ByteDance Seedance 1.5 Pro (text-to-video), called scene by scene from the script Kineo writes for your topic. The badge on every video on this page is the real engine that rendered it — nothing is relabelled.',
      },
      {
        q: 'Seedance vs Kling vs Veo — which should I pick?',
        a: `Choose by your budget and remaining credits: a complete ${MARKETING_REFERENCE_SECONDS}-second reference film costs ${SEEDANCE_COST} credits with Seedance 1.5, ${KLING_COST} with Kling 2.5 or ${VEO_COST} with Veo 3.1. New accounts${GRANT_COUNTRY_CLAUSE} receive ${TRIAL_CREDITS_SHOWN} free credits, no card required. That balance ${trialFilmsForEngine(SEEDANCE_COST) > 0 ? 'covers a complete Seedance reference film' : 'does not cover a complete Seedance reference film'}; engine access does not guarantee enough credits for a render. Choose a paid plan with sufficient credits when you need more. Free-trial films carry a watermark; a paid plan unlocks clean downloads.`,
      },
    ],
  },
  kling: {
    param: 'kling',
    qualityMode: 'cinematic_kling',
    name: 'Kling 2.5',
    model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
    creditCost: KLING_COST,
    tier: tierFor('cinematic_kling'),
    h1: 'Kling 2.5 AI video generator for vertical Shorts — camera motion that holds up',
    intro:
      `Kling 2.5 Turbo Pro is the engine to reach for when the shot has to MOVE: a push-in through Roman ruins, a drone climb over a golden mountain, a 50-metre strike in a packed stadium. Kineo drives it from the script — you type the idea, Kineo writes the beats, prompts Kling scene by scene, voices and captions the result, and returns a finished 9:16 Short. A 60-second video costs ${KLING_COST} credits; the Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_kling')}.`,
    bestFor: 'Sports, action, travel and any topic where the camera itself is part of the storytelling.',
    tradeoff: `At ${KLING_COST} credits per 60 seconds, Kling 2.5 costs about ${(KLING_COST / SEEDANCE_COST).toFixed(1).replace(/\.0$/, '')}× a Seedance video. If the scene is static, Seedance gets you the same story for less.`,
    faq: [
      ...geoFaq(KLING_GEO), // KINEO-MOTORES-GEO-2026-10-06
      {
        q: 'Is Kling 2.5 free on Kineo?',
        a: `New accounts${GRANT_COUNTRY_CLAUSE} receive ${TRIAL_CREDITS_SHOWN} free credits, no card required. A complete ${MARKETING_REFERENCE_SECONDS}-second Kling 2.5 reference film costs ${KLING_COST} credits, so the trial balance ${trialFilmsForEngine(KLING_COST) > 0 ? 'covers one complete reference film' : 'does not cover one complete reference film'}. Engine access and sufficient balance are separate requirements: choose a paid plan with enough credits for the render. Free-trial films carry a watermark; a paid plan unlocks clean downloads.`,
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
    creditCost: VEO_COST,
    tier: tierFor('cinematic_veo'),
    h1: 'Veo 3.1 AI video generator — Google’s flagship, wired into a finished Short',
    intro:
      `Veo 3.1 is Google’s flagship video model — Kineo runs its Fast version — and inside Kineo it is not a clip generator you then have to edit: you type one idea and get the whole vertical Short — script, AI voiceover, Veo-generated scenes and captions — assembled and ready to post. A 60-second video costs ${VEO_COST} credits; the Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_veo')}.`,
    bestFor: 'The hero video of a channel: the one render a week that has to look expensive. Prompt adherence and scene coherence are its strong suit.',
    tradeoff: `The most expensive engine after the ${KLING3_COST}-credit flagships (${VEO_COST} credits per 60 seconds). It is not the engine for posting daily — pair it with Seedance 1.5 for volume.`,
    faq: [
      ...geoFaq(VEO_GEO), // KINEO-MOTORES-GEO-2026-10-06
      {
        q: 'Can I try Veo 3.1 for free?',
        a: `New accounts${GRANT_COUNTRY_CLAUSE} receive ${TRIAL_CREDITS_SHOWN} free credits, no card required. A complete ${MARKETING_REFERENCE_SECONDS}-second Veo 3.1 reference film costs ${VEO_COST} credits, so the trial balance ${trialFilmsForEngine(VEO_COST) > 0 ? 'covers one complete reference film' : 'does not cover one complete reference film'}. Engine access and sufficient balance are separate requirements: choose a paid plan with enough credits for the render. Free-trial films carry a watermark; a paid plan unlocks clean downloads.`,
      },
      {
        q: 'What is different about Veo inside Kineo versus using Veo directly?',
        a: 'Used directly, Veo returns separate clips you still have to edit. Kineo writes the script, splits it into scenes, prompts Veo for each one with the model’s own audio turned off, records the voiceover, syncs captions and assembles the 9:16 export. You get a publishable Short instead of raw clips.',
      },
      {
        q: 'Veo 3.1 or Kling 3?',
        a: `Veo 3.1 (${VEO_COST} credits) is the stronger general-purpose flagship. Kling 3 (${KLING3_COST} credits) is the one to use when a scene needs a person speaking on camera with native voice and lip sync.`,
      },
    ],
  },
  'kling-3': {
    param: 'hollywood',
    qualityMode: 'cinematic_hollywood',
    name: 'Kling 3',
    model: 'fal-ai Kling 3 (dialogue / i2v scene routing)',
    creditCost: KLING3_COST,
    tier: tierFor('cinematic_hollywood'), // era 'Studio' digitado: o Creator (150 cr) paga um Kling 3 de 60 s
    h1: 'Kling 3 AI video generator — film scenes with native voice and lip sync',
    intro:
      `Kling 3 is the top of the range: multi-scene films where a character can speak on camera, in their own generated voice, with lip sync — a medieval historian holding a book, a reporter in golden hour on a Manhattan street, a presenter in a futuristic studio. Kineo routes each scene to the right Kling 3 endpoint and returns the finished vertical film. A 60-second video costs ${KLING3_COST} credits; the Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_hollywood')}.`,
    bestFor: 'Talking-head storytelling without a camera, a face, or a studio. The renders people say “that does not even look like AI” about.',
    tradeoff: `The most expensive engine in the catalogue at ${KLING3_COST} credits per 60 seconds. One Kling 3 render costs what ${Math.floor(KLING3_COST / SEEDANCE_COST)} Seedance renders cost.`,
    faq: [
      // KINEO-MOTORES-GEO-2026-10-06 — onde usar + quanto custa (a do trial dizia "10-credit" digitado).
      KLING3_GEO ? KLING3_GEO.faqWhereCost : {
        q: 'How much does a Kling 3 video cost on Kineo?',
        a: `${KLING3_COST} credits per 60-second video. The Creator monthly grant covers ${videosPerMonth('basic', 'cinematic_hollywood')} and Studio ${videosPerMonth('pro', 'cinematic_hollywood')}; the ${TRIAL_CREDITS_SHOWN}-credit free trial does not.`,
      },
      {
        q: 'Can Kling 3 make a character speak on camera?',
        a: 'Yes — that is the reason it exists in the catalogue. Kling 3 renders dialogue scenes with a native generated voice and lip sync, so you can build a talking-head channel without ever filming yourself.',
      },
      // KINEO-AVATAR-FORA-2026-09-28 (revisão 2) — o Character Lock é ferramenta do Avatar Studio e saiu do catálogo
      // junto com o Avatar (pricing e kineoFacts já não vendem). A página do Kling 3 ainda prometia "Yes. Character Lock
      // saves a presenter". Sem o interruptor, a resposta diz o que o motor FAZ: um retrato-âncora por filme
      // (lib/hollywood/anchors.ts semeia toda cena de diálogo com ele) e nenhum rosto salvo entre vídeos no catálogo.
      AVATAR_PUBLIC
        ? {
            q: 'Can I keep the same face across every video?',
            a: 'Yes. Character Lock saves a presenter and reuses the exact same face across renders and thumbnails, so a channel keeps one recognisable host.',
          }
        : {
            q: 'Does the character keep the same face across the film?',
            a: 'Within one film, that is the job of the anchor: before any scene is rendered, Kineo generates one portrait of the character and starts every dialogue scene from it, so the face and outfit stay the same scene to scene. Saving a face to reuse across separate videos is not part of the catalogue today.',
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
    creditCost: H3_COST,
    tier: tierFor('cinematic_h3'), // era 'Studio' digitado: o Starter (60 cr) paga um H3 de 60 s
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
      `MiniMax H3 is the cinematic engine you can actually afford to use more than once a month. It renders 60-second multi-scene films at ${H3_COST} credits, so a Creator plan makes ${videosPerMonth('basic', 'cinematic_h3')} and a Studio plan ${videosPerMonth('pro', 'cinematic_h3')} — against ${videosPerMonth('basic', 'cinematic_hollywood')} and ${videosPerMonth('pro', 'cinematic_hollywood')} films of the top-tier Kling 3, at ${KLING3_COST} credits each. Since August 2026 it also renders talking-character scenes: a person on screen speaks your exact line with lip sync while a documentary narrator carries the rest of the film. Kineo seeds each H3 scene with its own planned anchor image; that helps the shot follow the storyboard, but identity can still drift between scenes.`,
    bestFor: 'Dialogue-led explainers and frequent cinematic publishing where lower credit cost matters more than perfect identity continuity.',
    tradeoff: 'Renders at 768p rather than 1080p. For a 9:16 Short that is plenty, and one-click HD Enhance covers the cases where it is not.',
    faq: [
      // KINEO-MOTORES-GEO-2026-10-06 — a entrada de custo vira a citável (onde + quanto; + o preço de usar direto).
      ...(H3_GEO ? geoFaq(H3_GEO) : [{
        q: 'How much does a MiniMax H3 video cost on Kineo?',
        a: `${H3_COST} credits per 60-second finished film. The Creator monthly grant fits ${videosPerMonth('basic', 'cinematic_h3')} films; Studio fits ${videosPerMonth('pro', 'cinematic_h3')}.`,
      }]),
      {
        q: 'Why choose MiniMax H3 over Kling 3?',
        a: `Cost and directed dialogue. Kling 3 costs ${KLING3_COST} credits, so the Creator monthly grant fits ${videosPerMonth('basic', 'cinematic_hollywood')} and Studio ${videosPerMonth('pro', 'cinematic_hollywood')}. H3 costs ${H3_COST}, supports image-anchored scenes and can alternate lip-synced dialogue with documentary narration. Kling 3 still wins when native generated voice and the strongest dialogue scene matter most.`,
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
    creditCost: OMNI_COST,
    tier: tierFor('cinematic_omni'),
    h1: "Gemini Omni Flash AI video generator — Google's #1-ranked model, as a finished Short",
    intro:
      `Omni Flash is Google's Gemini Omni Flash — the #1-ranked video model in the August 2026 blind arena — running inside Kineo's cinematic pipeline. Every scene is anchored to a generated still image, so characters and world stay consistent across the whole film; Kineo adds the documentary narration, karaoke captions and soundtrack, and delivers a vertical 1080×1920 master. It sits at the same ${OMNI_COST}-credit tier as Kling 3: the two flagship engines, two different looks.`,
    bestFor: pausedLead('omni') + 'Flagship storytelling where motion realism matters most: physical scenes, weather, machines, crowds — the model was ranked #1 for exactly this.',
    tradeoff: 'Scenes cap at 10 seconds each (the provider limit), so very long single-shot monologues are split across cuts. Kling 3 still wins when a scene needs a character speaking on camera with native lip sync.',
    faq: [
      {
        q: 'How much does an Omni Flash video cost on Kineo?',
        a: `${OMNI_COST} credits per 60-second finished film — the same tier as Kling 3. The Studio monthly grant fits ${videosPerMonth('pro', 'cinematic_omni')}.`,
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
  // KINEO-S25-LAUNCH-2026-09-01 — pagina do Seedance 2.5, atras do interruptor
  // unico: com S25_PUBLIC=false o slug nem e gerado (404 limpo, nada indexado
  // antes do canario). A manchete e a diferenca de acesso, nao de tecnologia:
  // o mesmo modelo que concorrentes trancam em planos de US$49 entra aqui no
  // plano de US$29 — e sai FILME PRONTO, nao clipe solto. Claims datadas.
  ...(S25_PUBLIC
    ? {
        'seedance-2-5': {
          param: 's25' as EngineLandingParam,
          qualityMode: 'cinematic_s25',
          name: 'Seedance 2.5',
          model: 'fal-ai/seedance-2.5 (image-to-video, 480p native + HD Enhance master)',
          creditCost: S25_COST,
          tier: tierFor('cinematic_s25'),
          h1: "Seedance 2.5 AI video generator — ByteDance's newest model, as a finished Short",
          intro:
            `Seedance 2.5 is ByteDance's newest video model, running inside Kineo's cinematic pipeline: every scene is anchored to a generated still for visual consistency, your narration is spoken word for word, and the film comes out with karaoke captions and an AI-composed soundtrack. Kineo renders at 480p and masters to a 1080×1920 HD file with Topaz-based enhancement — that is how a ${S25_COST}-credit film fits the $29 Studio plan while other platforms gate this model behind $49+ tiers (as of September 2026).`,
          bestFor: pausedLead('s25') + 'Spectacle: weather, explosions, machines, crowds, historical set pieces — scenes where the newest motion model earns its cost. Scenes run up to 15 seconds, the longest in the catalog.',
          tradeoff: "Slower than every other engine (long scenes queue longer at the provider — plan on 15-20 minutes), and native 480p before enhancement: fine text and faces hold up less than on Kling 3. Kling 3 still wins for on-camera speech with lip sync.",
          faq: [
            {
              q: 'How much does a Seedance 2.5 video cost on Kineo?',
              a: `${S25_COST} credits per 60-second finished film — the Studio tier. The Studio monthly grant fits ${videosPerMonth('pro', 'cinematic_s25')}.`,
            },
            {
              q: 'Why is Seedance 2.5 cheaper here than on other platforms?',
              a: 'Two reasons. Kineo renders at 480p and enhances the master to HD instead of paying for native 720p+ (which costs the provider more than twice as much per second). And Kineo sells a finished film — script, voice, captions, soundtrack, editing — rather than raw 8-second clips you assemble yourself. As of September 2026 most consumer platforms only offer this model on plans of $49/month or more.',
            },
            {
              q: 'Does the 480p render look bad?',
              a: 'Every film is mastered to 1080×1920 with enhancement, and each film on this page is a real render you can judge. Fine on-screen text and very close faces are where the difference shows; landscapes, action and atmosphere hold up well.',
            },
          ],
        },
      }
    : {}),
}

// KINEO-FILME-GRATIS-15S-2026-09-29 — slugs aposentados das páginas públicas: /ai-video-generator/kineo-1 (e /<lang>)
// virou 301 para /ai-video-generator/seedance em next.config.js (Kineo 1 fora do catálogo público, KINEO1_PUBLIC=false,
// lib/engineLaunch.ts). Espelho sem import de propósito (este catálogo é carregado por guardiões com lista fechada de
// imports); scripts/test-copy-filme-gratis-15s-2026-09-29.mjs confere que o espelho e o interruptor andam juntos.
export const RETIRED_ENGINE_SLUGS: readonly string[] = ['kineo-1']
export const ENGINE_SLUGS = Object.keys(ENGINES).filter((slug) => !RETIRED_ENGINE_SLUGS.includes(slug))

// ═══ KINEO-MOTORES-GEO-2026-10-06 — a camada citável por slug e a régua "motor desligado não tem página indexável" ═══
// ENGINE_GEO[slug] = resposta + tabela de preço + comparação direta (lib/seo/engineCitation.ts); null = motor pausado
// ou fora do lançamento. isIndexableEngineSlug: a página do motor pausado segue no ar (aviso de manutenção, link para a
// alternativa), mas com robots noindex (app/ai-video-generator/[engine]/layout.tsx) e fora do sitemap e do llms.txt.
// Despausar o motor (lib/engineLaunch.ts) devolve página indexável, sitemap e llms.txt sozinho — nada a redigitar.
export const ENGINE_GEO: Record<string, EngineCitation | null> = {
  seedance: SEEDANCE_GEO,
  kling: KLING_GEO,
  veo: VEO_GEO,
  'kling-3': KLING3_GEO,
  'minimax-h3': H3_GEO,
  'gemini-omni-flash': OMNI_GEO,
  ...(S25_PUBLIC ? { 'seedance-2-5': S25_GEO } : {}),
}
/** A página /ai-video-generator/<slug> pode ser indexada? (publicada, fora de manutenção, liberada pelo lançamento) */
export function isIndexableEngineSlug(slug: string): boolean {
  const e = ENGINES[slug]
  return Boolean(e) && ENGINE_SLUGS.includes(slug) && geoVisible(e.param)
}
export const INDEXABLE_ENGINE_SLUGS: readonly string[] = ENGINE_SLUGS.filter(isIndexableEngineSlug)
