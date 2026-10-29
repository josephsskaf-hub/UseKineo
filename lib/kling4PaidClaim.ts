/** Browser consumer of the authenticated paid-film status response; no server dependencies. */
export function kling4PaidReplacement(value: unknown, generationId: string): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const r = value as Record<string, unknown>
  const marker = r.kling4_paid as Record<string, unknown> | undefined
  if (r.generationId !== generationId || r.quality !== 'cinematic_hollywood' || !marker ||
    marker.version !== 'kling4_paid_2810' || typeof marker.promo !== 'boolean' || marker.engine_used !== 'seedance15_fallback' ||
    marker.fallback_finalized !== true || marker.fallback_budget_reserved !== true ||
    ![15, 30, 60].includes(Number(marker.seconds)) || marker.seconds !== r.duration) return null
  const count = Number(marker.seconds) / 5
  const validId = (id: unknown) => id === null || typeof id === 'string' && id.length > 0 && id.length <= 512
  if (!Array.isArray(marker.original_request_ids) || marker.original_request_ids.length !== Number(marker.seconds) / 15 ||
    !marker.original_request_ids.every(validId) || !Array.isArray(r.fal_request_ids) || r.fal_request_ids.length !== count ||
    !r.fal_request_ids.every(validId) || !Array.isArray(r.fal_models) || r.fal_models.length !== count ||
    !r.fal_models.every(model => model === 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video')) return null
  for (const key of ['scenes', 'scene_captions', 'scene_narrations', 'scene_seconds', 'scene_engines', 'scene_dialogues']) {
    if (!Array.isArray(r[key]) || (r[key] as unknown[]).length !== count) return null
  }
  if (!(r.scene_seconds as unknown[]).every(seconds => seconds === 5) ||
    !(r.scene_engines as unknown[]).every(engine => engine === 'cinematic') ||
    !(r.scene_dialogues as unknown[]).every(line => line === null) ||
    !(r.scenes as unknown[]).every(scene => typeof scene === 'string' && scene.trim()) ||
    !(r.scene_narrations as unknown[]).every(line => typeof line === 'string' && line.trim()) ||
    typeof r.voiceover_script !== 'string') return null
  const normalize = (text: string) => text.trim().split(/\s+/u).filter(Boolean).join(' ')
  if (normalize((r.scene_narrations as string[]).join(' ')) !== normalize(r.voiceover_script)) return null
  return r
}
