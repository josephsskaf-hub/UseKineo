import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
import { filmLookEnabled, type FilmLook } from './filmLook2511'
import { filmVoiceEnabled } from './filmVoice2511'
import { FALA_DOS_PERSONAGENS_2511, falaDosPersonagensLigada } from './falaDosPersonagens2511'

export function filmLookAccount(email: string | null | undefined): boolean {
  return filmLookEnabled(INTERNAL_EXACT_EMAILS.includes((email ?? '').trim().toLowerCase()))
}

type DialogueRequest = {
  voice_mode?: unknown; engine?: unknown; duration?: unknown; language?: unknown; aspect?: unknown; kids_cartoon?: unknown
}

export function selectedFilmLook(value: unknown, email: string | null | undefined, request?: DialogueRequest): FilmLook | undefined {
  // The public Film button can request the fixed dialogue preset. The manual style picker keeps its own release.
  if (value === 'photoreal' && email && request?.voice_mode === 'characters' && filmVoiceEnabled()
    && falaDosPersonagensLigada(FALA_DOS_PERSONAGENS_2511, email) && request.language === 'en'
    && (request.duration === 15 || request.duration === '15') && !request.kids_cartoon
    && (request.engine === 'seedance' || request.engine === 'cinematic_ai')
    && (request.aspect === undefined || request.aspect === '9:16')) return 'photoreal'
  if (!filmLookAccount(email)) return undefined
  return value === 'photoreal' || value === 'animated3d' || value === 'anime' ? value : undefined
}
