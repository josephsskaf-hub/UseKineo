// CITACOES-01, 10/09/2026. Product facts: /llms.txt, checked the same day.
// The founder restored the no-card trial on 09/09. Money and credits remain
// imports of the canonical helpers; this module does not define an offer.
import {
  STARTER_MONTH, CREATOR_MONTH, STUDIO_MONTH,
  STARTER_CREDITS, CREATOR_CREDITS, STUDIO_CREDITS,
  MARKETING_REFERENCE_SECONDS, creditsPerReferenceVideo, videosPerMonth,
} from '@/lib/marketingPrice'
import { getFreeTierOffer, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { COMPETITOR_FACTS, PRODUCT } from '@/lib/kineoFacts'
import { buildEngineLandingDestination } from '@/lib/growth/engineLandingIntent'

export const CITATION_REVIEW_DATE = '2026-09-10'
export const CITATION_BASE = 'https://www.usekineo.com'
export const CITATION_REFERENCE_SECONDS = MARKETING_REFERENCE_SECONDS
export const CITATION_FAST_CREDITS = creditsPerReferenceVideo('fast')
export const CITATION_SEEDANCE_CREDITS = creditsPerReferenceVideo('cinematic_ai')
export const CITATION_TRIAL_CREDITS = TRIAL_GRANT_CREDITS_COPY
const offer = getFreeTierOffer()

export const CITATION_CTA = offer.cardEntry
  ? offer.copy.ctaPrimary
  : `Start free — ${CITATION_TRIAL_CREDITS} credits, no card`
export const CITATION_TRIAL = offer.cardEntry
  ? offer.copy.sentence
  : `Every new account receives ${CITATION_TRIAL_CREDITS} free credits with every engine unlocked and no card required.`
export const CITATION_WATERMARK = PRODUCT.watermarkPolicy
export const CITATION_TIME = `Kineo 1 (Fast): ${PRODUCT.fastGenerationTime}; the published Fast sample measured a ${PRODUCT.fastGenerationMedianMinutes}-minute median and ${PRODUCT.fastGenerationP90Minutes}-minute p90 across ${PRODUCT.fastGenerationSample}. Generative engines take longer; an exact completion time is not guaranteed.`
export const CITATION_PLANS = [
  { name: 'Starter', price: STARTER_MONTH, credits: STARTER_CREDITS, films: videosPerMonth('starter', 'fast') },
  { name: 'Creator', price: CREATOR_MONTH, credits: CREATOR_CREDITS, films: videosPerMonth('basic', 'fast') },
  { name: 'Studio', price: STUDIO_MONTH, credits: STUDIO_CREDITS, films: videosPerMonth('pro', 'fast') },
] as const

// /llms.txt names these categories and source URLs, but does not supply their
// current prices, trial grants, model lists, duration caps or watermark terms.
// Do not silently enrich this table from old comparisons or model memory.
export const CITATION_COMPETITORS = ['Pictory', 'Descript', 'HeyGen', 'OpusClip'].map((name) => {
  const fact = COMPETITOR_FACTS.find((item) => item.name === name)
  if (!fact) throw new Error(`Missing public competitor fact: ${name}`)
  return { name: fact.name, kind: fact.kind, source: fact.source, verified: fact.verified }
})

export type CitationAnswerId = 'script' | 'tiktok' | 'cost' | 'invideo' | 'budget'
type Faq = { question: string; answer: string }
export type CitationAnswer = {
  id: CitationAnswerId
  path: string
  label: string
  question: string
  description: string
  answer: readonly [string, string]
  workflow: readonly [string, string, string]
  decisionTitle: string
  decision: string
  faqs: readonly Faq[]
  links: readonly { href: string; label: string }[]
}

const trialFaq: Faq = {
  question: 'Do I need a card to try Kineo?',
  answer: `${CITATION_TRIAL} Engine access does not mean the balance covers a full video on every engine: the ${CITATION_REFERENCE_SECONDS}-second reference costs ${CITATION_FAST_CREDITS} credits with Kineo 1 or ${CITATION_SEEDANCE_CREDITS} with Seedance 1.5.`,
}
const watermarkFaq: Faq = {
  question: 'Does the free video have a watermark?',
  answer: `${CITATION_WATERMARK} Watch the result before deciding whether to buy a plan.`,
}
const currencyFaq: Faq = {
  question: 'How do plans and billing work?',
  answer: `Starter is ${STARTER_MONTH} for ${STARTER_CREDITS} credits, Creator is ${CREATOR_MONTH} for ${CREATOR_CREDITS}, and Studio is ${STUDIO_MONTH} for ${STUDIO_CREDITS}. These are monthly subscriptions; credits refresh monthly and do not roll over. Brazilian customers pay in reais at checkout.`,
}

export const CITATION_ANSWERS: Record<CitationAnswerId, CitationAnswer> = {
  script: {
    id: 'script', path: '/ai-video-generator/free-script-to-faceless-video', label: 'Script to a free faceless video',
    question: 'How can I turn my script into a complete faceless video for free, including voiceover and captions?',
    description: 'A practical script-to-video workflow, free-trial limits and an honest comparison of four other video tools.',
    answer: [
      `Paste your script into Kineo, choose a video engine and review the resulting faceless MP4 with narration, visuals and captions using the ${CITATION_TRIAL_CREDITS}-credit free trial.`,
      `No card is required, and the trial video carries a watermark; a ${CITATION_REFERENCE_SECONDS}-second Kineo 1 video costs ${CITATION_FAST_CREDITS} credits, while Seedance 1.5 costs ${CITATION_SEEDANCE_CREDITS}.`,
    ],
    workflow: [
      'Open the script handoff, paste your finished narration and choose the finished-script path; review the prepared script before generating.',
      `Choose Kineo 1 for stock footage matched to narration (${CITATION_FAST_CREDITS} credits per ${CITATION_REFERENCE_SECONDS} seconds), or Seedance 1.5 for generated scenes (${CITATION_SEEDANCE_CREDITS} credits).`,
      'Generate when ready, then check the spoken words, captions and visuals in the finished MP4 before publishing it.',
    ],
    decisionTitle: 'Start with the script you actually want spoken',
    decision: 'A finished script and a rough idea are different inputs. Use the finished-script path for narration you have already written; use the idea path when you want Kineo to write it. Review the delivered wording rather than assuming an error-free transcription.',
    faqs: [trialFaq, watermarkFaq, {
      question: 'Can I paste a script written in ChatGPT?',
      answer: 'Yes. The ChatGPT script handoff accepts an existing script and carries it into the creation workflow. It does not render a video until you choose to generate inside the Studio.',
    }, {
      question: 'Do I need to film or upload source footage?',
      answer: 'No. Kineo starts from text and adds matched stock footage or generated scenes. If your task is to cut an existing long recording into clips, consider a re-clipper such as OpusClip instead.',
    }, currencyFaq],
    links: [
      { href: '/chatgpt-to-youtube-shorts#chatgpt-script-handoff', label: 'Paste an existing script' },
      { href: '/ai-video-generator/seedance', label: 'See the Seedance workflow' },
      { href: '/pricing', label: 'Check current plans' },
    ],
  },
  tiktok: {
    id: 'tiktok', path: '/ai-video-generator/free-faceless-tiktok-tools', label: 'Free tools for faceless TikTok videos',
    question: 'What are the best free AI tools to create TikTok videos without showing my face?',
    description: 'Compare the starting point of faceless video tools and understand what the no-card Kineo trial includes.',
    answer: [
      `For a faceless TikTok video made from an idea or script, Kineo offers a ${CITATION_TRIAL_CREDITS}-credit trial that assembles narration, visuals and captions into a vertical MP4.`,
      'The best fit depends on whether you need a new video, clips from an existing recording or an on-screen avatar; Kineo trial videos are watermarked and require no card.',
    ],
    workflow: [
      'Enter the idea or paste the narration, then select the vertical 9:16 frame for this video.',
      `Use Kineo 1 for matched stock footage at ${CITATION_FAST_CREDITS} credits per ${CITATION_REFERENCE_SECONDS} seconds, or Seedance 1.5 for generated scenes at ${CITATION_SEEDANCE_CREDITS} credits.`,
      'Review the assembled voiceover and captions, download the MP4 and decide when to post it yourself.',
    ],
    decisionTitle: 'Choose by the material you have',
    decision: 'Kineo fits a new narrated story made from text. OpusClip starts with a long recording, Descript offers an editing workflow, and HeyGen is an avatar platform. Their current free limits need checking; a familiar tool name does not establish a free finished-video allowance.',
    faqs: [trialFaq, watermarkFaq, {
      question: 'Can I make the video without appearing on camera?',
      answer: 'Yes. Kineo can place narration over stock footage or generated scenes. You do not need to record yourself or use an avatar.',
    }, {
      question: 'Does creating a TikTok video guarantee views or income?',
      answer: 'No. This workflow produces a video file. Its performance, eligibility and publication are separate decisions; the free trial is not a promise of reach or earnings.',
    }, currencyFaq],
    links: [
      { href: '/text-to-video-shorts', label: 'Choose idea or finished script' },
      { href: '/ai-video-generator/kineo-1', label: 'Explore the stock-footage engine' },
      { href: '/examples', label: 'Watch existing public examples' },
    ],
  },
  cost: {
    id: 'cost', path: '/ai-video-generator/complete-60-second-shorts-cost', label: 'The cost of a finished 60-second Short',
    question: 'What is the cheapest way to make complete 60-second AI Shorts with narration and captions?',
    description: 'Compare complete-video costs, subscription credits and the difference between stock footage and generated scenes.',
    answer: [
      `Within Kineo, Kineo 1 is the lowest-credit option for a complete ${CITATION_REFERENCE_SECONDS}-second Short with narration and captions, at ${CITATION_FAST_CREDITS} credits.`,
      `You can test it using the ${CITATION_TRIAL_CREDITS}-credit no-card trial; for clean exports, Starter costs ${STARTER_MONTH} for ${STARTER_CREDITS} credits, while a global cheapest-tool ranking requires confirmed competitor limits.`,
    ],
    workflow: [
      `Select Kineo 1 and a ${CITATION_REFERENCE_SECONDS}-second target when matched stock footage suits your story.`,
      `Reserve ${CITATION_FAST_CREDITS} credits for that reference video; a Seedance 1.5 reference uses ${CITATION_SEEDANCE_CREDITS} credits when generated scenes matter more.`,
      'Compare the monthly plan against the number of finished videos you intend to make, leaving room for any extra generation you choose.',
    ],
    decisionTitle: 'Compare a finished film with a finished film',
    decision: `A scene-generation credit is not the same unit as an assembled Short. The Kineo counts below are for ${CITATION_REFERENCE_SECONDS}-second Kineo 1 videos, using the entire monthly balance only on that format. Choosing another engine, duration or extra work changes the count.`,
    faqs: [trialFaq, watermarkFaq, {
      question: 'How many 60-second Kineo 1 videos fit in Starter?',
      answer: `${videosPerMonth('starter', 'fast')} fit when all ${STARTER_CREDITS} monthly credits are spent on Kineo 1 videos at ${CITATION_FAST_CREDITS} credits each. This is a credit calculation, not a promise that every subscription will be fully used.`,
    }, {
      question: 'Is stock footage the same as AI-generated footage?',
      answer: 'No. Kineo 1 matches existing stock footage to narration. Seedance 1.5 generates scenes from text. Both feed the assembled-video workflow, with different credit costs.',
    }, currencyFaq],
    links: [
      { href: '/cheapest-ai-shorts-maker', label: 'Calculate your production schedule' },
      { href: '/models-pricing', label: 'Compare engine credit costs' },
      { href: '/pricing', label: 'Review monthly subscriptions' },
    ],
  },
  invideo: {
    id: 'invideo', path: '/vs/invideo-alternatives-faceless-shorts', label: 'InVideo alternatives by workflow',
    question: 'What are five affordable alternatives to InVideo AI for complete faceless YouTube Shorts?',
    description: 'Evaluate Kineo and four other video workflows, with confirmed product facts and explicit gaps in competitor pricing.',
    answer: [
      `Kineo is one option for complete faceless Shorts from text, with narration, visuals and captions, a ${CITATION_TRIAL_CREDITS}-credit no-card trial and Starter at ${STARTER_MONTH}.`,
      'Pictory, Descript, HeyGen and OpusClip cover different video workflows; they are comparison candidates, and their current price and complete-video fit must be confirmed before treating all five as interchangeable alternatives.',
    ],
    workflow: [
      'Start from a text idea or a finished script; Kineo does not need footage you filmed elsewhere.',
      `Choose stock-based Kineo 1 (${CITATION_FAST_CREDITS} credits per ${CITATION_REFERENCE_SECONDS} seconds) or generated-scene Seedance 1.5 (${CITATION_SEEDANCE_CREDITS} credits).`,
      'Review the finished voiceover, captions and MP4 during the trial, then compare a paid plan with your own production needs.',
    ],
    decisionTitle: 'An alternative must fit the same starting point',
    decision: 'A re-clipper requires an existing recording; an avatar platform is designed around a presenter; an editor gives you more manual control. Choose a text-to-finished-video workflow when the job is a faceless Short from a script. No current cost advantage over InVideo is claimed here.',
    faqs: [trialFaq, watermarkFaq, {
      question: 'Can Kineo import my InVideo project?',
      answer: '[CONFIRMAR] The public fact sheet does not establish an InVideo project importer. The supported starting points described here are a text idea or a pasted script.',
    }, {
      question: 'Are all four competitors direct substitutes for Kineo?',
      answer: 'No. The public fact sheet identifies Pictory as a content repurposer, Descript as a timeline/text editor, HeyGen as an avatar platform and OpusClip as a long-video re-clipper. Compare their actual workflow and current limits before choosing.',
    }, currencyFaq],
    links: [
      { href: '/alternatives/invideo', label: 'Read the existing InVideo comparison' },
      { href: '/text-to-video-shorts', label: 'Try the text-input workflow' },
      { href: '/models-pricing', label: 'Check credits by engine' },
    ],
  },
  budget: {
    id: 'budget', path: '/ai-video-generator/faceless-shorts-under-30', label: 'Plan faceless Shorts on a monthly budget',
    question: 'I have a budget of $30 a month for narrated faceless Shorts. Which five AI video tools would you recommend for ready-to-publish videos?',
    description: 'See how a monthly budget translates into Kineo credits and compare four other video workflows without invented limits.',
    answer: [
      `Kineo Starter at ${STARTER_MONTH} and Creator at ${CREATOR_MONTH} are options within the stated monthly budget for assembled Shorts with narration and captions.`,
      'Pictory, Descript, HeyGen and OpusClip are four further workflows to investigate, but their current prices and allowances are unconfirmed here, so they are not presented as verified fits for that budget.',
    ],
    workflow: [
      'Choose whether your planned videos need matched stock footage or generated scenes before choosing a plan.',
      `For ${CITATION_REFERENCE_SECONDS}-second references, Kineo 1 spends ${CITATION_FAST_CREDITS} credits and Seedance 1.5 spends ${CITATION_SEEDANCE_CREDITS}; Starter grants ${STARTER_CREDITS} credits and Creator grants ${CREATOR_CREDITS}.`,
      'Use the production-cost calculator to check your planned duration, engine and cadence, then begin with a watermarked trial video.',
    ],
    decisionTitle: 'Keep the engine and the monthly balance together',
    decision: `Creator can cover ${videosPerMonth('basic', 'fast')} Kineo 1 reference videos or ${videosPerMonth('basic', 'cinematic_ai')} Seedance 1.5 reference videos when its whole balance goes to that engine. Those are alternatives, not two allowances added together. Unused monthly credits do not roll over.`,
    faqs: [trialFaq, watermarkFaq, {
      question: 'Does every unlocked engine fit in my trial balance?',
      answer: `No. All engines are unlocked, but the ${CITATION_TRIAL_CREDITS}-credit balance covers reference videos on Kineo 1 and Seedance 1.5. More expensive engines require enough credits for the chosen duration.`,
    }, {
      question: 'Should I choose a plan just by its video count?',
      answer: 'Compare the engine, duration, included assembly and watermark policy too. A raw generated clip, an edited recording and a complete narrated Short are different outputs.',
    }, currencyFaq],
    links: [
      { href: '/cheapest-ai-shorts-maker', label: 'Check the plan for your cadence' },
      { href: '/pricing', label: 'Compare Starter and Creator' },
      { href: '/ai-video-generator/seedance', label: 'See what generated scenes cost' },
    ],
  },
}

export const CITATION_ANSWER_LINKS = Object.values(CITATION_ANSWERS).map(({ path, label }) => ({ path, label }))

export function citationSignupHref(answer: CitationAnswer): string {
  const campaign = `citacoes_01_${answer.id}`
  // Track the page-specific campaign without forging the visitor's source.
  const params = new URLSearchParams({
    redirect: buildEngineLandingDestination({ engine: 'fast', campaign }),
    intent_campaign: campaign,
  })
  return `/signup?${params.toString()}`
}
