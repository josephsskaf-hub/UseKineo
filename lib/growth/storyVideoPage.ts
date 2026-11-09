import { H3_TURBO_PUBLIC } from '@/lib/engineLaunch'
import { H3_TURBO_PAGE } from '@/lib/growth/h3TurboPage'
import { STARTER_MONTH, STARTER_CREDITS, creditsPerReferenceVideo } from '@/lib/marketingPrice'

export const STORY_VIDEO_UPDATED = '2026-11-09'
export const STORY_VIDEO_ENGINE = H3_TURBO_PUBLIC ? H3_TURBO_PAGE.name : 'Seedance 1.5'
const cost = creditsPerReferenceVideo('cinematic_ai')

export const STORY_VIDEO_COPY = {
  description: `Create a narrated vertical story with ${STORY_VIDEO_ENGINE}, captions and music. ${cost} credits for 60 seconds. Review character continuity and limits.`,
  intro: `Kineo turns an idea or a narration script into a vertical story with generated scenes, voice, captions and music using ${STORY_VIDEO_ENGINE}. A 60-second story costs ${cost} credits, with paid plans starting at ${STARTER_MONTH} for ${STARTER_CREDITS} monthly credits.`,
  costAnswer: `The standard 60-second story uses ${cost} credits. Plans start at ${STARTER_MONTH} for ${STARTER_CREDITS} monthly credits. Other creations share that balance. Trial eligibility and watermark terms are shown in Studio and on the plans page.`,
  engineAnswer: H3_TURBO_PUBLIC
    ? 'The standard workflow uses MiniMax H3 Max Turbo for image-anchored scenes, sold in Kineo as H3 Turbo. Seedance 1.5 Pro remains a text-to-video fallback, so one film can contain scenes from both. H3 Max is a separate Studio choice with its own cost.'
    : 'Seedance 1.5 Pro supplies generated scenes in the standard narrated-film workflow. Check the selected model and duration in Studio.',
  faq: [
    { q: 'Can I start from my own story script?', a: 'Yes. Kineo accepts an idea or a finished narration script. Review the prepared script and settings in Studio before generating.' },
    { q: 'Will the same character look identical in every scene?', a: 'Character identity, faces, hands and small details can vary between generated scenes. Review continuity in the finished film. This workflow does not guarantee identical characters, exact product reproduction or lip-synced dialogue.' },
    { q: 'Do the example films prove the current model?', a: 'Existing example films retain their original engine labels. A historical Seedance film remains a Seedance example. Review the current engine description separately.' },
    { q: 'How long will my story take to generate?', a: 'The requested film length differs from generation time. Waiting time depends on the model, duration and retries. Review progress in Studio. A fixed completion time or audience result is not guaranteed.' },
  ],
}
