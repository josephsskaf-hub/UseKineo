import type { Engine } from '@/lib/growth/enginePageCatalog'
import { creditsPerReferenceVideo, STARTER_MONTH } from '@/lib/marketingPrice'

const cost = creditsPerReferenceVideo('cinematic_ai')
export const H3_TURBO_PAGE_UPDATED = '2026-11-07'

/** Current standard-film copy. The legacy URL and Studio engine key stay seedance. */
export const H3_TURBO_PAGE: Engine = {
  param: 'seedance',
  qualityMode: 'cinematic_ai',
  name: 'MiniMax H3 Turbo',
  model: 'MiniMax H3 Max Turbo for image-anchored scenes; Seedance 1.5 Pro for the text-to-video fallback',
  creditCost: cost,
  tier: 'Starter',
  h1: 'MiniMax H3 Turbo — a finished narrated vertical film',
  intro: `Kineo uses MiniMax H3 Turbo to animate the planned scenes of its standard narrated film, then assembles the voiceover, captions and music into a vertical MP4. A 60-second film costs ${cost} credits, with paid plans starting at ${STARTER_MONTH} per month.`,
  metaDescription: `MiniMax H3 Turbo in Kineo: a narrated vertical film with scenes, captions and music. ${cost} credits per 60 seconds. Compare duration costs and limits.`,
  bestFor: 'Narrated stories, explainers and faceless Shorts made from an idea or a finished script.',
  tradeoff: 'Scene quality and character identity can vary. The workflow can fall back to Seedance 1.5 Pro for text-to-video scenes. Review the delivered film before posting.',
  faq: [
    { q: 'Why does this page still have Seedance in its address?', a: 'This existing address now describes Kineo’s standard film workflow, sold as MiniMax H3 Turbo. Existing Seedance films keep the badge of the model that rendered them. Seedance clips are a separate workflow.' },
    { q: 'Which model renders the scenes?', a: 'Image-anchored scenes use MiniMax H3 Max Turbo, sold in Kineo as H3 Turbo. The standard workflow retains Seedance 1.5 Pro as a text-to-video fallback. A film can contain scenes from the fallback.' },
    { q: 'Is H3 Turbo the same workflow as H3 Max?', a: 'H3 Max is a separate Studio choice with its own credit cost. Review the selected engine and duration before generating.' },
    { q: 'What does a finished film include?', a: 'A vertical 9:16 MP4 with generated scenes, AI narration, captions and music. You can start with an idea or supply the narration script.' },
    { q: 'What does a 60-second film cost?', a: `${cost} credits for the standard narrated workflow. A paid plan starts at ${STARTER_MONTH} per month. The duration table shows credit use for other lengths. Extra creations share the same balance.` },
    { q: 'What are the limits before I buy?', a: 'Generated faces, hands, text and continuity can need another attempt. This workflow uses narration over scenes. It does not guarantee lip-synced dialogue, exact product reproduction, a fixed completion time or audience results. Trial eligibility and watermark terms appear in Studio and on the plans page.' },
  ],
}
