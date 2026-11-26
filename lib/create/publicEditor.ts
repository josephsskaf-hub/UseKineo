import type { FilmLook } from '@/lib/cinematic/filmLook2511'
import { duracoesDoMotor } from './motorOpcional'
import { motorDaCaixa } from '@/lib/growth/studioSimples'
import { analyzePromptMaxChars } from '@/lib/analyzeLimits'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'

export { PUBLIC_CREATE_EDITORS } from './publicEditorRelease'
export const validFilmDraftId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)

const durations = [15, 35, 60, 90]
const aspects = ['9:16', '16:9', '1:1', '4:5']
const languageAllowed = (value: unknown) => value === 'auto' || NARRATION_LANGUAGES.some(item => item.code === value)
type Query = Record<string, string | string[] | undefined>
export function filmEntry(query: Query, visitor: boolean, confirmedCountry: boolean) {
  const verbatim = query.script_mode === 'verbatim'
  const idea = query.ideia ?? query.prompt
  const requested = typeof query.duration === 'string' && /^\d{1,3}$/.test(query.duration) && Number(query.duration) > 0 ? Number(query.duration) : undefined
  const supported = duracoesDoMotor(motorDaCaixa(query.engine))
  const duration = requested ? supported.find(d => d >= requested) ?? supported[supported.length - 1] : undefined
  const adjustment = requested && requested !== duration ? `Requested ${requested} s. This engine offers ${duration} s for this film.` : ''
  const look: FilmLook | undefined = query.look === 'photoreal' || query.look === 'anime' || query.look === 'animated3d' ? query.look : undefined
  const draftId = query.volta === '1' && validFilmDraftId(query.draft) ? query.draft : undefined
  return {
    visitor, confirmedCountry, draftId, duration, verbatim, look, adjustment,
    text: typeof idea === 'string' && idea.length <= analyzePromptMaxChars(verbatim ? 'verbatim' : 'ai') ? idea : '',
    language: typeof query.language === 'string' && languageAllowed(query.language) ? query.language : 'auto',
    aspect: typeof query.aspect === 'string' && aspects.includes(query.aspect) ? query.aspect : '9:16',
    resumed: Boolean(draftId || duration || idea || query.language || query.aspect || query.look || query.script_mode),
  }
}
export type FilmEntry = ReturnType<typeof filmEntry>
export type GuestFilmDraft = {
  text: string; duration: number; language: string; aspect: string; verbatim: boolean; engine: string; look?: FilmLook
  dialogue: null | { duration: number; language: string; aspect: string; engine: string }
}
const prefix = 'kineo:guest-film:'
export function filmSignup(draft: GuestFilmDraft): string {
  const id = crypto.randomUUID()
  const value = JSON.stringify({ draft, at: Date.now() })
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(prefix)) continue
    try { if (Date.now() - JSON.parse(localStorage.getItem(key)!).at >= 2 * 3600_000) localStorage.removeItem(key) } catch { localStorage.removeItem(key) }
  }
  localStorage.setItem(prefix + id, value)
  if (localStorage.getItem(prefix + id) !== value) throw new Error('Draft unavailable')
  const query = new URLSearchParams({ draft: id, volta: '1' })
  for (const [key, item] of new URLSearchParams(window.location.search)) {
    if (/^(?:utm_[a-z]+|intent_campaign|ref|gclid|msclkid|fbclid|ttclid)$/.test(key)) query.set(key, item)
  }
  return '/signup?' + new URLSearchParams({ redirect: '/create/film?' + query })
}
export function restoreFilm(id: string, authenticated = false): GuestFilmDraft | null {
  try {
    if (!validFilmDraftId(id)) return null
    const key = prefix + id
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key)
    const { draft, at } = JSON.parse(raw ?? 'null')
    if (typeof at !== 'number' || at > Date.now() || Date.now() - at > 2 * 3600_000) return null
    const settingsValid = (s: GuestFilmDraft | NonNullable<GuestFilmDraft['dialogue']>) =>
      s && durations.includes(s.duration) && languageAllowed(s.language) && aspects.includes(s.aspect)
    if (!settingsValid(draft) || typeof draft.engine !== 'string' || typeof draft.verbatim !== 'boolean' || typeof draft.text !== 'string' ||
      draft.text.length > analyzePromptMaxChars(draft.verbatim ? 'verbatim' : 'ai') ||
      (draft.dialogue !== null && !(settingsValid(draft.dialogue) && draft.duration === 15 && draft.language === 'en' && draft.aspect === '9:16'))) return null
    if (authenticated && raw) { sessionStorage.setItem(key, raw); localStorage.removeItem(key) }
    return draft
  } catch { return null }
}
