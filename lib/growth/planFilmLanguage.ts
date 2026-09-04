/**
 * Measurement contract for plan-capacity copy.
 *
 * This does not change a grant, engine cost, price or checkout destination.
 * Callers pass values derived from the canonical pricing and engine-cost
 * modules; this helper only puts the finished-film result before the internal
 * credit unit so a buyer can understand what the existing balance produces.
 */
export const PLAN_FILM_LANGUAGE_VERSION = 'plan_film_language_v1'

export function formatPlanFilmCapacity(
  films: number,
  singular: string,
  credits: number,
  plural = `${singular}s`,
): string {
  if (!Number.isInteger(films) || films < 0) {
    throw new Error('films must be a non-negative integer')
  }
  if (!Number.isInteger(credits) || credits < 0) {
    throw new Error('credits must be a non-negative integer')
  }
  const filmLabel = films === 1 ? singular : plural
  return `${films} ${filmLabel} / month · ${credits} credits`
}

export function planFilmLanguageMetadata() {
  return {
    capacity_unit_version: PLAN_FILM_LANGUAGE_VERSION,
  } as const
}
