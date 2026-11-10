import { H3_TURBO_PUBLIC } from '@/lib/engineLaunch'
import { H3_TURBO_PAGE } from '@/lib/growth/h3TurboPage'
import { STARTER_MONTH, STARTER_CREDITS, creditsPerReferenceVideo } from '@/lib/marketingPrice'

export const RUNWAY_REVIEWED_ON = '2026-11-10'
export const RUNWAY_KINEO_ENGINE = H3_TURBO_PUBLIC ? H3_TURBO_PAGE.name : 'Seedance 1.5'
const cost = creditsPerReferenceVideo('cinematic_ai')

export const RUNWAY_SOURCES = [
  { label: 'Runway generation modes and Agent', href: 'https://help.runwayml.com/hc/en-us/articles/37425232841875-Getting-Started-with-Generative-Video' },
  { label: 'Runway Generate Speech', href: 'https://help.runwayml.com/hc/en-us/articles/23859696734611-Generating-speech-from-text' },
  { label: 'Runway Workflows: Stitch and Add Audio', href: 'https://help.runwayml.com/hc/en-us/articles/47184761711379-Using-Utility-Nodes-in-Workflows' },
]

export const RUNWAY_ALTERNATIVE = {
  name: 'Runway',
  h1: 'A Runway alternative for a finished narrated short film',
  intro: `Kineo is a Runway alternative for creators who want an assembled vertical film with generated scenes, narration, captions and music from an idea or script. Its standard ${RUNWAY_KINEO_ENGINE} workflow uses ${cost} credits for 60 seconds, with paid plans starting at ${STARTER_MONTH} for ${STARTER_CREDITS} monthly credits.`,
  description: `Compare Kineo’s narrated-film workflow with Runway Agent, speech and Workflows. ${RUNWAY_KINEO_ENGINE}: ${cost} credits for 60 seconds. Sources, costs and limits.`,
  theyDo: 'Runway documents video generation and editing, a conversational Agent for multi-shot videos, speech generation, and customizable Workflows.',
  pickThem: 'Choose Runway if you want to direct and edit shots or build a custom creative pipeline with Agent and Workflows. Choose Kineo if you prefer a guided idea-or-script-to-narrated-film workflow with captions and music. Both require review; compare an actual result against your needs before committing to a larger project.',
  rows: [
    { feature: 'Create a multi-scene video', sfa: 'An idea or narration script to an assembled film', them: 'Conversational Agent; customizable Workflows' },
    { feature: 'AI narration', sfa: 'Included in the narrated-film workflow', them: 'Generate Speech; audio models in Agent or Workflows' },
    { feature: 'Assemble scenes and audio', sfa: 'Generated scenes, narration and music assembled automatically', them: 'Stitch and Add Audio nodes in Workflows' },
    { feature: 'Captions', sfa: 'Included in the narrated film', them: 'Check the current tools for your caption workflow' },
    { feature: 'Cost of the Kineo standard 60-second film', sfa: `${cost} credits; plans from ${STARTER_MONTH}`, them: 'Not priced here: different models and operations consume credits' },
  ],
  faq: [
    { q: 'What is the best Runway alternative for a finished short film?', a: `Kineo is an option if you want generated scenes, narration, captions and music assembled into a vertical film from an idea or script. The standard ${RUNWAY_KINEO_ENGINE} workflow uses ${cost} credits for 60 seconds. This page does not establish a universal quality winner; Runway also documents multi-shot video creation with Agent.` },
    { q: 'Can Runway generate voiceover and assemble videos?', a: 'Yes. Runway documents Generate Speech, audio generation in Agent and Workflows, and Stitch and Add Audio nodes for combining videos and narration. Check its current tools and plans for the complete caption and export workflow you need.' },
    { q: 'Is Kineo cheaper than Runway for a finished film?', a: `A standard 60-second Kineo film uses ${cost} credits. Starter is ${STARTER_MONTH} with ${STARTER_CREDITS} monthly credits shared across your creations. The duration table on this page allocates that plan’s credit cost; it is not a separate purchase price. We have not priced an equivalent finished Runway project, so we do not claim Kineo is cheaper.` },
    { q: 'Which model does the Kineo standard film use?', a: H3_TURBO_PUBLIC
      ? 'Image-anchored scenes use MiniMax H3 Max Turbo, sold in Kineo as H3 Turbo. Seedance 1.5 Pro remains a text-to-video fallback, so one film can contain scenes from both. H3 Max is a separate Studio choice with its own credit cost.'
      : 'Seedance 1.5 Pro supplies generated scenes in the standard narrated-film workflow. Check the selected model and duration in Studio.' },
    { q: 'What should I check before paying?', a: 'Review character continuity, faces, hands, on-screen text, narration and captions. Generated details can vary. The workflow does not guarantee lip-synced dialogue, exact product reproduction, a fixed completion time or audience results. Trial eligibility and watermark terms are shown in Studio and on the plans page.' },
  ],
}

export const RUNWAY_KINEO_STEPS = [
  { n: '1', t: 'Bring an idea or script', d: 'Enter a topic or your narration script and review the selected engine and duration in Studio.' },
  { n: '2', t: 'Generate the narrated film', d: 'Kineo plans the scenes and assembles generated footage, AI narration, captions and music.' },
  { n: '3', t: 'Review before posting', d: 'Check the delivered vertical MP4. Trial films are watermarked; paid plans unlock clean downloads. Completion time varies.' },
]
