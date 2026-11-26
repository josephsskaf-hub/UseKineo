import { engineLabelFor, recordedFilmEngine } from '../engineLabel'

export type MonitorFilm = {
  id: string
  title: string
  engine: string | null
  secondary: string | null
  engineNote: string | null
  created: string | null
  reviewed: string | null
  score: number | null
  defects: string[] | null
  url: string | null
}

export interface FilmMonitorSnapshot {
  recent: MonitorFilm[]
  reviews: MonitorFilm[]
  checked: string
}

export const MONITOR_LIMIT = 30

export function reviewerScore(raw: unknown): number | null {
  if (typeof raw !== 'number' && (typeof raw !== 'string' || !raw.trim())) return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null
}

/** A mixed receipt lists verified renderers alphabetically, without assigning roles. */
export function filmEngineProfile(receipt: string | null | undefined, event?: { engine_used?: unknown; motores?: unknown }) {
  const verified = recordedFilmEngine(receipt)
  const eventCode = typeof event?.engine_used === 'string' ? recordedFilmEngine(event.engine_used) : null
  // The fallback budget may be stamped "seedance15_fallback" even when the clip receipt proves H3.
  const actual = verified || eventCode
  const profile = { engine: engineLabelFor(null, actual), secondary: null as string | null, engineNote: null as string | null }
  if (actual?.startsWith('mixed:')) {
    const labels = [...new Set(actual.slice(6).split(',').map(code => engineLabelFor(null, code)).filter((x): x is string => !!x))]
    profile.engine = labels[0] || null
    profile.secondary = labels.slice(1).join(' + ') || null
    profile.engineNote = 'Render conjunto. O registro não distingue os papéis dos motores.'
  } else if (Array.isArray(event?.motores) && event.motores.length === 2 && event.motores[1] === eventCode && actual && eventCode &&
      (actual === eventCode || (eventCode === 'seedance15_fallback' && actual === 'h3_max_turbo'))) {
    const previous = event.motores[0] === 'gemini_omni_flash' ? 'omni' : event.motores[0]
    const attempted = typeof previous === 'string' ? engineLabelFor(null, previous) : null
    if (attempted && attempted !== profile.engine) {
      profile.secondary = attempted
      profile.engineNote = 'Tentativa anterior registrada. O motor de render entregou o filme.'
    }
  }
  return profile
}
