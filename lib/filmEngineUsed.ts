/** Only verified birth models and a server render intent are evidence of the engine. */
type EngineClaim = { response?: Record<string, unknown> | null; falModels: string[]; falRequestIds: (string | null)[]; authorizedCompletedUrls: (string | null)[] }
function engineOf(model: string) {
  if (model.startsWith('minimax/h3-max-turbo/')) return 'h3_max_turbo'
  if (model === 'minimax/h3-max/reference-to-video') return 'h3_max_reference'
  if (model.startsWith('minimax/h3-max/')) return 'h3_max'
  if (model.startsWith('minimax/h3/')) return 'h3'
  if (model.startsWith('kling/v4/')) return 'kling4'
  if (model.startsWith('fal-ai/bytedance/seedance/v1.5/')) return 'seedance'
  if (model.startsWith('fal-ai/kling-video/v2.5-')) return 'kling25'
  if (model.startsWith('fal-ai/veo3.1/')) return 'veo31'
  if (model.startsWith('google/gemini-omni-flash/')) return 'omni'
  if (model.startsWith('fal-ai/seedance-2.5/')) return 's25'
  if (/^fal-ai\/kling-video\/(?:o3|v3)\//.test(model)) return 'kling3'
  if (model.startsWith('fal-ai/sora-2/')) return 'sora'
  if (model.includes('/ai-avatar/')) return 'avatar'
  return null
}
export function filmEngineUsed(claim: EngineClaim | null, trustedQuality?: unknown): string {
  if (claim) {
    if (claim.authorizedCompletedUrls.length !== claim.falModels.length || claim.falRequestIds.length !== claim.falModels.length) return 'unknown'
    const models = claim.falModels.filter((_, i) => Boolean(claim.authorizedCompletedUrls[i]))
    const engines = new Set<string>()
    for (const model of models) {
      const engine = engineOf(model)
      if (!engine) return 'unknown'
      engines.add(engine)
    }
    if (engines.has('h3_max')) engines.delete('h3_max_reference')
    const [first, ...rest] = [...engines].sort()
    if (!first) return 'unknown'
    if (rest.length) return 'mixed:' + [first, ...rest].join(',')
    const trial = claim.response?.kling4_trial as { engine_used?: string } | undefined
    if (first === 'seedance' && trial?.engine_used === 'seedance15_cap') return 'seedance15_cap'
    if (first === 'seedance' && (trial || claim.response?.kling4_paid)) return 'seedance15_fallback'
    return first
  }
  if (trustedQuality === 'avatar' || trustedQuality === 'presenter') return 'avatar'
  return trustedQuality === 'fast' ? 'kineo1' : 'unknown'
}
