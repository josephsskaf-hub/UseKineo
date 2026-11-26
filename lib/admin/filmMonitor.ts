export type MonitorFilm = {
  id: string
  title: string
  engine: string | null
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
