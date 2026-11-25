import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
import { filmLookEnabled, type FilmLook } from './filmLook2511'

export function filmLookAccount(email: string | null | undefined): boolean {
  return filmLookEnabled(INTERNAL_EXACT_EMAILS.includes((email ?? '').trim().toLowerCase()))
}

export function selectedFilmLook(value: unknown, email: string | null | undefined): FilmLook | undefined {
  if (!filmLookAccount(email)) return undefined
  return value === 'photoreal' || value === 'animated3d' || value === 'anime' ? value : undefined
}
