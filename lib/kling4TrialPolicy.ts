// Founder decision, 2026-10-28. One rollback switch; country/admission policy stays upstream.
export const KLING4_TRIAL_LIVE = true

export function kling4TrialEligible(f: {
  paid: boolean; admitted: boolean; shortFilm: boolean
  priorFilms: number | null; priorDebits: number | null; live?: boolean
}): boolean {
  return (f.live ?? KLING4_TRIAL_LIVE) && !f.paid && f.admitted && f.shortFilm &&
    f.priorFilms === 0 && f.priorDebits === 0
}
