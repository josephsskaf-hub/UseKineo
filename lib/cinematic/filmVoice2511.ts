export type FilmVoiceMode = 'narrator' | 'characters'

export const FILM_VOICE_RELEASE: 'off' | 'on' = 'on'

export function filmVoiceMode(value: unknown): FilmVoiceMode | undefined {
  return value === 'narrator' || value === 'characters' ? value : undefined
}

export function voiceModeFields(value: unknown): { voice_mode?: FilmVoiceMode } {
  const voiceMode = filmVoiceMode(value)
  return filmVoiceEnabled() && voiceMode ? { voice_mode: voiceMode } : {}
}

export function filmVoiceEnabled(): boolean {
  return FILM_VOICE_RELEASE === 'on'
}
