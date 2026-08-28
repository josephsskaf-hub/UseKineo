export const TEXT_TO_VIDEO_CAMPAIGN = 'push58_text_to_video_shorts'
export const TEXT_TO_VIDEO_INTENT_VARIANT = 'text_to_video_intent_v1_2026_08_28'

export type TextToVideoInputMode = 'idea' | 'finished_script'

export const TEXT_TO_VIDEO_INPUT_MODES: ReadonlyArray<{
  id: TextToVideoInputMode
  label: string
  description: string
  scriptMode: 'ai' | 'verbatim'
  duration: 35 | 45
}> = [
  {
    id: 'idea',
    label: 'I have an idea or topic',
    description: 'Kineo writes the hook, story and payoff.',
    scriptMode: 'ai',
    duration: 45,
  },
  {
    id: 'finished_script',
    label: 'I have a finished script',
    description: 'Keep the spoken wording and build scenes around it.',
    scriptMode: 'verbatim',
    duration: 35,
  },
] as const

const MODE_BY_ID = new Map(TEXT_TO_VIDEO_INPUT_MODES.map((mode) => [mode.id, mode]))

export function getTextToVideoInputMode(value: string | null | undefined) {
  return MODE_BY_ID.get((value ?? '').trim().toLowerCase() as TextToVideoInputMode)
    ?? TEXT_TO_VIDEO_INPUT_MODES[0]
}
