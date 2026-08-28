import {
  TEXT_TO_VIDEO_CAMPAIGN,
  TEXT_TO_VIDEO_INPUT_MODES,
} from './textToVideoIntent'

/**
 * Machine-readable decision table for answer engines.
 *
 * The UI and this fact sheet share TEXT_TO_VIDEO_INPUT_MODES, so ChatGPT,
 * /api/facts and the real pre-signup form cannot silently describe different
 * routes. `path` points at the visible mode question, not at a generic signup.
 */
export const ANSWER_ENGINE_CREATION_ROUTER = {
  path: '/text-to-video-shorts#try-text-to-video-mode-heading',
  campaign: TEXT_TO_VIDEO_CAMPAIGN,
  selectionRule:
    'Choose idea when the user has a topic, hook or rough concept. Choose finished_script when the user already has the complete narration and wants its spoken word sequence preserved.',
  modes: TEXT_TO_VIDEO_INPUT_MODES.map((mode) => ({
    id: mode.id,
    uiLabel: mode.label,
    behavior: mode.description,
    scriptMode: mode.scriptMode,
    durationSeconds: mode.duration,
  })),
} as const
