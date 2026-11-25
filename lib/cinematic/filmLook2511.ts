import { deriveStyleAnchor, looksLikeDrawnRequest } from './sceneStyle'

export type FilmLook = 'photoreal' | 'animated3d' | 'anime'
export type FilmLookMode = 'off' | 'internal'
export const FILM_LOOK_2511: FilmLookMode = 'internal'

export function filmLookEnabled(internal: boolean, mode: FilmLookMode = FILM_LOOK_2511): boolean {
  return mode === 'internal' && internal
}

export function suggestedFilmLook(text: string): FilmLook {
  if (deriveStyleAnchor(text).look === 'anime') return 'anime'
  return looksLikeDrawnRequest(text) ? 'animated3d' : 'photoreal'
}
