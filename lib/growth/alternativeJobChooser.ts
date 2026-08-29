import { buildBlankStudioSignupHref } from './publicCreationIntent'

export const ALTERNATIVE_JOB_CAMPAIGN = 'alternatives_job_chooser_20260828' as const

export type AlternativeJobId =
  | 'original_faceless_short'
  | 'long_video_to_clips'
  | 'ai_presenter'
  | 'recording_editor'

export interface AlternativeJobPath {
  id: AlternativeJobId
  eyebrow: string
  title: string
  description: string
  recommendation: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  sourceHref: string
  sourceLabel: string
  kineoFit: 'best_fit' | 'not_the_job'
}

export const KINEO_ALTERNATIVES_SIGNUP_HREF = buildBlankStudioSignupHref({
  campaign: ALTERNATIVE_JOB_CAMPAIGN,
  utmSource: 'alternatives',
})

/**
 * A job-to-tool map, not a feature scoreboard. Competitor categories are
 * grounded in the vendors' own product pages and the Kineo path stays honest:
 * Kineo starts from an idea or script; it does not clip or edit uploaded video.
 */
export const ALTERNATIVE_JOB_PATHS: readonly AlternativeJobPath[] = [
  {
    id: 'original_faceless_short',
    eyebrow: 'Start with an idea or script',
    title: 'Create an original faceless Short',
    description: 'You do not have footage yet. You want the script, voice, vertical visuals and captions produced as one Short.',
    recommendation: 'Kineo is built for this exact starting point.',
    primaryHref: KINEO_ALTERNATIVES_SIGNUP_HREF,
    primaryLabel: 'Open Kineo Studio',
    sourceHref: '/facts',
    sourceLabel: 'Check the Kineo facts',
    kineoFit: 'best_fit',
  },
  {
    id: 'long_video_to_clips',
    eyebrow: 'Start with a recording or URL',
    title: 'Turn a long video into short clips',
    description: 'You already have a podcast, interview, webinar or long video and need the strongest moments extracted.',
    recommendation: 'Use a clipping tool. OpusClip describes this as its core job; Kineo is not a re-clipper.',
    primaryHref: '/alternatives/opusclip',
    primaryLabel: 'Compare Kineo and OpusClip',
    sourceHref: 'https://www.opus.pro/',
    sourceLabel: 'OpusClip official product page',
    kineoFit: 'not_the_job',
  },
  {
    id: 'ai_presenter',
    eyebrow: 'Start with a presenter',
    title: 'Put an AI avatar on camera',
    description: 'A consistent digital spokesperson, cloned presenter or training host is central to the video.',
    recommendation: 'Compare dedicated avatar platforms first. HeyGen and Synthesia lead with avatars and presenter-led video.',
    primaryHref: '/alternatives/heygen',
    primaryLabel: 'Compare Kineo and HeyGen',
    secondaryHref: '/alternatives/synthesia',
    secondaryLabel: 'Or compare Synthesia',
    sourceHref: 'https://www.heygen.com/avatars/ai-video-avatar',
    sourceLabel: 'HeyGen official avatar page',
    kineoFit: 'not_the_job',
  },
  {
    id: 'recording_editor',
    eyebrow: 'Start with recorded media',
    title: 'Edit a podcast or recording by transcript',
    description: 'You need to record, transcribe, remove words, clean audio and edit material that already exists.',
    recommendation: 'Use a recording editor. Descript positions text-based editing and podcast production as core workflows.',
    primaryHref: '/alternatives/descript',
    primaryLabel: 'Compare Kineo and Descript',
    sourceHref: 'https://www.descript.com/',
    sourceLabel: 'Descript official product page',
    kineoFit: 'not_the_job',
  },
] as const

