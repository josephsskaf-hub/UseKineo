import { deriveStyleAnchor } from './sceneStyle'
import type { FilmLook } from './filmLook2511'
import { filmVoiceEnabled } from './filmVoice2511'

// A checkout return carries only a visual cue, never the author's second text.
const PREVIEW_STYLE_CUES = { anime: 'anime', animated3d: '3D animated film', illustration: 'watercolor illustration' } as const
export type PreviewStyle = keyof typeof PREVIEW_STYLE_CUES
export function previewStyle(value: unknown): PreviewStyle | undefined {
  return filmVoiceEnabled() && (value === 'anime' || value === 'animated3d' || value === 'illustration') ? value : undefined
}
export function previewStyleCue(style?: PreviewStyle): string {
  return style ? PREVIEW_STYLE_CUES[style] : ''
}
export function previewStyleFromIdea(idea: string): PreviewStyle | undefined {
  return filmVoiceEnabled() ? previewStyle(deriveStyleAnchor(idea).look) : undefined
}

/** The editor may use auto language. The route checks the resolved language. */
export function characterVoiceAvailable(seconds: number, language: string, text: string, look?: FilmLook, cartoon = false, styleSuffix = ''): boolean {
  return seconds === 15 && !cartoon && (language === 'en' || language === 'auto')
    && deriveStyleAnchor(text, styleSuffix, look).look === 'photoreal'
}
