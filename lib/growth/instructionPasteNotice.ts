export const INSTRUCTION_PASTE_NOTICE_VERSION = 'instruction_paste_notice_v1'

export const INSTRUCTION_PASTE_NOTICE = {
  title: 'Your ChatGPT script is still here',
  body: 'Kineo will narrate the spoken lines and keep recognized Visual, Camera and timing labels out of the voiceover. Review it, then press Generate when you\'re ready.',
} as const

export function shouldShowInstructionPasteNotice(reason: string | null | undefined): boolean {
  return reason === 'prompt_looks_like_instruction'
}

export function instructionPasteNoticeMetadata() {
  return {
    version: INSTRUCTION_PASTE_NOTICE_VERSION,
    reason: 'prompt_looks_like_instruction',
    surface: 'generate_idea',
  } as const
}

export function instructionPromptLengthBand(length: number) {
  if (!Number.isFinite(length) || length < 0) return 'unknown'
  if (length < 300) return 'under_300'
  if (length < 700) return '300_699'
  if (length < 1000) return '700_999'
  if (length === 1000) return '1000'
  return 'over_1000'
}
