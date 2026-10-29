// Read only after verifying the cinematic birth claim. Browser fields never select this path.
export type Kling4TrialEngine = 'kling4' | 'seedance15_fallback' | 'seedance15_cap'

export function kling4TrialEngineFromClaim(response: Record<string, unknown> | null | undefined): Kling4TrialEngine | null {
  if (response?.duration !== 15 || response.quality !== 'cinematic_ai' || response.aspect !== '9:16') return null
  const marker = response.kling4_trial
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return null
  const trial = marker as Record<string, unknown>
  if (trial.version !== 'kling4_trial_2810') return null
  return trial.engine_used === 'kling4' || trial.engine_used === 'seedance15_fallback' || trial.engine_used === 'seedance15_cap'
    ? trial.engine_used : null
}

/** The birth route already awaited this result. Bind its signed URL without repolling the supplier. */
export function kling4TrialVideoUrlFromClaim(response: Record<string, unknown> | null | undefined): string | null {
  if (kling4TrialEngineFromClaim(response) !== 'kling4') return null
  const url = (response!.kling4_trial as Record<string, unknown>).video_url
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null
}
