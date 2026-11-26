import { deriveStyleAnchor, type StyleLook } from './sceneStyle'
import type { FilmLook } from './filmLook2511'
import { filmVoiceEnabled } from './filmVoice2511'

// A checkout return carries only a visual cue, never the author's second text.
export type PreviewStyle = Exclude<StyleLook, 'photoreal'>
const PREVIEW_STYLE_CUES: Record<PreviewStyle, string> = {
  anime: 'anime',
  animated3d: '3D animated film',
  illustration: 'watercolor illustration',
  noir: 'film noir',
}
export function previewStyle(value: unknown): PreviewStyle | undefined {
  if (filmVoiceEnabled() && typeof value === 'string' && Object.prototype.hasOwnProperty.call(PREVIEW_STYLE_CUES, value)) return value as PreviewStyle
}
export function previewStyleCue(style?: PreviewStyle): string {
  return style ? PREVIEW_STYLE_CUES[style] : ''
}
export function isPreviewStyleCue(value: unknown): value is string {
  return filmVoiceEnabled() && typeof value === 'string' && Object.values(PREVIEW_STYLE_CUES).includes(value)
}
export function previewStyleFromIdea(idea: string): PreviewStyle | undefined {
  return filmVoiceEnabled() ? previewStyle(deriveStyleAnchor(idea).look) : undefined
}

/** The editor may use auto language. The route checks the resolved language. */
export function characterVoiceAvailable(seconds: number, language: string, text: string, look?: FilmLook, cartoon = false, styleSuffix = ''): boolean {
  return seconds === 15 && !cartoon && (language === 'en' || language === 'auto')
    && deriveStyleAnchor(text, styleSuffix, look).look === 'photoreal'
}
