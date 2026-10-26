// KINEO-UPSELL-FILME15-2610 — opt-in for the complete version of this person's film.
export const FILM_COMPLETE_VERSION = 'upsell_filme15_2610_v1' as const
export const FILM_COMPLETE_CAMPAIGN = 'film15_full_version' as const
export const FILM_COMPLETE_TARGET_SECONDS = 35
export const FILM_COMPLETE_ENGINE = 'seedance' as const
export const FILM_COMPLETE_INTENT_EVENT = 'film15_full_intent' as const
export const FILM_COMPLETE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type FilmCompleteState = 'awaiting_payment' | 'waiting_entitlement' | 'starting' | 'processing' | 'completed' | 'failed' | 'unavailable'

export function filmCompletePaymentMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, string> {
  if (metadata?.film_complete_version !== FILM_COMPLETE_VERSION ||
      typeof metadata.film_complete_id !== 'string' || !FILM_COMPLETE_UUID.test(metadata.film_complete_id) ||
      typeof metadata.film_complete_source_video_id !== 'string' || !FILM_COMPLETE_UUID.test(metadata.film_complete_source_video_id)) return {}
  return {
    film_complete_id: metadata.film_complete_id,
    film_complete_source_video_id: metadata.film_complete_source_video_id,
    film_complete_version: FILM_COMPLETE_VERSION,
  }
}
