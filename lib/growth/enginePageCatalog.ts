// Shared data for the engine page, hub and sitemap. Route modules export only Next-supported names.
// Mechanical extraction for CITACOES-01; existing content and feature gates are preserved.
import { S25_PUBLIC } from '@/lib/engineLaunch'
import { getFreeTierOffer, swapFreeTierCopy as ft, trialFilmsForEngine, TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'
import { STARTER_MONTH, MARKETING_REFERENCE_SECONDS, creditsPerReferenceVideo, videosPerMonth } from '@/lib/marketingPrice'
import type { EngineLandingParam } from '@/lib/growth/engineLandingIntent'

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
    tier: 'Starter',
    h1: 'Kineo 1 — the free AI video generator that finishes the whole Short',
    intro:
      'Kineo 1 is our own engine: it writes a hook-first script, records the AI voiceover, matches real footage to every line and burns in captions, then hands you a ready-to-post 9:16 MP4 — usually in 3–7 minutes. It is the engine that runs without a card, and it is the one most of the videos on this page were made with.',
    bestFor: 'Daily posting volume. Facts, listicles, money and history Shorts where the footage is real-world B-roll, not generated.',
    tradeoff: 'It uses stock footage rather than generating each frame, so it cannot invent a scene that does not exist. For invented scenes, use Seedance or a Studio engine.',
    faq: [
      {
        q: 'Is Kineo 1 really free?',
        a: `Kineo 1 is included in every plan and in the free trial (30 credits, every engine unlocked, no card). ${ft(OFFER, 'A new account can create up to 3 watermarked Fast videos every 24 hours.', OFFER.copy.sentence)} A clean, watermark-free 60-second export costs ${FAST_COST} credits on a paid plan.`,
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
    tier: 'Starter',
    h1: 'Seedance 1.5 AI video generator — every scene generated, not stock',
    intro:
      `Seedance 1.5 Pro (ByteDance) is the workhorse generative engine inside Kineo: instead of matching stock footage to your script, it generates every scene from the script itself. You still type one idea — Kineo writes the beats, prompts Seedance scene by scene, voices it, captions it and returns a finished vertical Short. ${SEEDANCE_COST} credits per 60-second video — and the free trial (30 credits) covers one of them.`,
    bestFor: 'Anything that does not exist on a stock site: an abandoned island, a burning crater, a 1922 expedition. Mystery, history and “weird facts” channels live here.',
    tradeoff: 'Generated scenes cost more than stock and take longer than Kineo 1. If your topic is well covered by real footage, Kineo 1 is faster and free.',
    faq: [
      {
        q: 'Can I use Seedance 1.5 without paying?',
        a: `Seedance costs ${SEEDANCE_COST} credits per 60-second video. Every new account starts with the
         free trial (30 credits, every engine unlocked, no card) and Seedance is included — so your first Seedance film comes out of those 30 credits. After the trial, Starter (${STARTER_MONTH}) and Creator keep Seedance unlocked.`,
      },
      {
        q: 'What model is behind Kineo’s Seedance engine?',
        a: 'ByteDance Seedance 1.5 Pro (text-to-video), called scene by scene from the script Kineo writes for your topic. The badge on every video on this page is the real engine that rendered it — nothing is relabelled.',
      },
      {
        q: 'Seedance vs Kling vs Veo — which should I pick?',
        a: `Choose by your budget and remaining credits: a complete ${MARKETING_REFERENCE_SECONDS}-second reference film costs ${SEEDANCE_COST} credits with Seedance 1.5, ${KLING_COST} with Kling 2.5 or ${VEO_COST} with Veo 3.1. New accounts receive ${TRIAL_CREDITS_SHOWN} free credits, with every engine unlocked and no card required. That balance ${trialFilmsForEngine(SEEDANCE_COST) > 0 ? 'covers a complete Seedance reference film' : 'does not cover a complete Seedance reference film'}; engine access does not guarantee enough credits for a render. Choose a paid plan with sufficient credits when you need more. Free-trial films carry a watermark; a paid plan unlocks clean downloads.`,
      },
    ],
  },
  kling: {
    param: 'kling',
    qualityMode: 'cinematic_kling',
    name: 'Kling 2.5',
    model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
    creditCost: KLING_COST,
    tier: 'Studio',
    h1: 'Kling 2.5 AI video generator for vertical Shorts — camera motion that holds up',
    intro:
      `Kling 2.5 Turbo Pro is the engine to reach for when the shot has to MOVE: a push-in through Roman ruins, a drone climb over a golden mountain, a 50-metre strike in a packed stadium. Kineo drives it from the script — you type the idea, Kineo writes the beats, prompts Kling scene by scene, voices and captions the result, and returns a finished 9:16 Short. A 60-second video costs ${KLING_COST} credits; the Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_kling')}.`,
    bestFor: 'Sports, action, travel and any topic where the camera itself is part of the storytelling.',
    tradeoff: `At ${KLING_COST} credits per 60 seconds, Kling 2.5 costs ${KLING_COST / SEEDANCE_COST}× a Seedance video. If the scene is static, Seedance gets you the same story for less.`,
    faq: [
      {
        q: 'Is Kling 2.5 free on Kineo?',
        a: `New accounts receive ${TRIAL_CREDITS_SHOWN} free credits, with every engine unlocked and no card required. A complete ${MARKETING_REFERENCE_SECONDS}-second Kling 2.5 reference film costs ${KLING_COST} credits, so the trial balance ${trialFilmsForEngine(KLING_COST) > 0 ? 'covers one complete reference film' : 'does not cover one complete reference film'}. Engine access and sufficient balance are separate requirements: choose a paid plan with enough credits for the render. Free-trial films carry a watermark; a paid plan unlocks clean downloads.`,
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
    tier: 'Studio',
    h1: 'Veo 3.1 AI video generator — Google’s flagship, wired into a finished Short',
    intro:
      `Veo 3.1 is Google’s flagship video model, and inside Kineo it is not a clip generator you then have to edit: you type one idea and get the whole vertical Short — script, AI voiceover, Veo-generated scenes and captions — assembled and ready to post. A 60-second video costs ${VEO_COST} credits; the Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_veo')}.`,
    bestFor: 'The hero video of a channel: the one render a week that has to look expensive. Prompt adherence and scene coherence are its strong suit.',
    tradeoff: `The most expensive engine after the ${KLING3_COST}-credit flagships (${VEO_COST} credits per 60 seconds). It is not the engine for posting daily — pair it with Kineo 1 for volume.`,
    faq: [
      {
        q: 'Can I try Veo 3.1 for free?',
        a: `New accounts receive ${TRIAL_CREDITS_SHOWN} free credits, with every engine unlocked and no card required. A complete ${MARKETING_REFERENCE_SECONDS}-second Veo 3.1 reference film costs ${VEO_COST} credits, so the trial balance ${trialFilmsForEngine(VEO_COST) > 0 ? 'covers one complete reference film' : 'does not cover one complete reference film'}. Engine access and sufficient balance are separate requirements: choose a paid plan with enough credits for the render. Free-trial films carry a watermark; a paid plan unlocks clean downloads.`,
      },
      {
        q: 'What is different about Veo inside Kineo versus using Veo directly?',
        a: 'Veo returns silent scenes. Kineo writes the script, splits it into scenes, prompts Veo for each one, records the voiceover, syncs captions and assembles the 9:16 export. You get a publishable Short instead of raw clips.',
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
    tier: 'Studio',
    h1: 'Kling 3 AI video generator — film scenes with native voice and lip sync',
    intro:
      `Kling 3 is the top of the range: multi-scene films where a character can speak on camera, in their own generated voice, with lip sync — a medieval historian holding a book, a reporter in golden hour on a Manhattan street, a presenter in a futuristic studio. Kineo routes each scene to the right Kling 3 endpoint and returns the finished vertical film. A 60-second video costs ${KLING3_COST} credits; the Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_hollywood')}.`,
    bestFor: 'Talking-head storytelling without a camera, a face, or a studio. The renders people say “that does not even look like AI” about.',
    tradeoff: `The most expensive engine in the catalogue at ${KLING3_COST} credits per 60 seconds. One Kling 3 render costs what ${Math.floor(KLING3_COST / SEEDANCE_COST)} Seedance renders cost.`,
    faq: [
      {
        q: 'How much does a Kling 3 video cost on Kineo?',
        a: `${KLING3_COST} credits per 60-second video. The Studio monthly grant covers ${videosPerMonth('pro', 'cinematic_hollywood')}; the 30-credit free trial does not.`,
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
    creditCost: H3_COST,
    tier: 'Studio',
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
      `MiniMax H3 is the cinematic engine you can actually afford to use more than once a month. It renders 60-second multi-scene films at ${H3_COST} credits, so a Creator plan makes ${videosPerMonth('basic', 'cinematic_h3')} and a Studio plan ${videosPerMonth('pro', 'cinematic_h3')} — where the top-tier Kling 3, at ${KLING3_COST} credits, fits once. Since August 2026 it also renders talking-character scenes: a person on screen speaks your exact line with lip sync while a documentary narrator carries the rest of the film. Kineo seeds each H3 scene with its own planned anchor image; that helps the shot follow the storyboard, but identity can still drift between scenes.`,
    bestFor: 'Dialogue-led explainers and frequent cinematic publishing where lower credit cost matters more than perfect identity continuity.',
    tradeoff: 'Renders at 768p rather than 1080p. For a 9:16 Short that is plenty, and one-click HD Enhance covers the cases where it is not.',
    faq: [
      {
        q: 'How much does a MiniMax H3 video cost on Kineo?',
        a: `${H3_COST} credits per 60-second finished film. The Creator monthly grant fits ${videosPerMonth('basic', 'cinematic_h3')} films; Studio fits ${videosPerMonth('pro', 'cinematic_h3')}.`,
      },
      {
        q: 'Why choose MiniMax H3 over Kling 3?',
        a: `Cost and directed dialogue. Kling 3 costs ${KLING3_COST} credits, so the Studio monthly grant fits one. H3 costs ${H3_COST}, supports image-anchored scenes and can alternate lip-synced dialogue with documentary narration. Kling 3 still wins when native generated voice and the strongest dialogue scene matter most.`,
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
    tier: 'Studio',
    h1: "Gemini Omni Flash AI video generator — Google's #1-ranked model, as a finished Short",
    intro:
      `Omni Flash is Google's Gemini Omni Flash — the #1-ranked video model in the August 2026 blind arena — running inside Kineo's cinematic pipeline. Every scene is anchored to a generated still image, so characters and world stay consistent across the whole film; Kineo adds the documentary narration, karaoke captions and soundtrack, and delivers a vertical 1080×1920 master. It sits at the same ${OMNI_COST}-credit tier as Kling 3: the two flagship engines, two different looks.`,
    bestFor: 'Flagship storytelling where motion realism matters most: physical scenes, weather, machines, crowds — the model was ranked #1 for exactly this.',
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
          tier: 'Studio',
          h1: "Seedance 2.5 AI video generator — ByteDance's newest model, as a finished Short",
          intro:
            `Seedance 2.5 is ByteDance's newest video model, running inside Kineo's cinematic pipeline: every scene is anchored to a generated still for visual consistency, your narration is spoken word for word, and the film comes out with karaoke captions and an AI-composed soundtrack. Kineo renders at 480p and masters to a 1080×1920 HD file with Topaz-based enhancement — that is how a ${S25_COST}-credit film fits the $29 Studio plan while other platforms gate this model behind $49+ tiers (as of September 2026).`,
          bestFor: 'Spectacle: weather, explosions, machines, crowds, historical set pieces — scenes where the newest motion model earns its cost. Scenes run up to 15 seconds, the longest in the catalog.',
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

export const ENGINE_SLUGS = Object.keys(ENGINES)
