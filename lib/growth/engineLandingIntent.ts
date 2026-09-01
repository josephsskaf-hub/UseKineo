export const ENGINE_LANDING_PARAMS = [
  'fast',
  'seedance',
  'kling',
  'veo',
  'hollywood',
  'h3',
  'omni',
  's25', // KINEO-S25-LAUNCH-2026-09-01 — pagina so existe com S25_PUBLIC
] as const

export type EngineLandingParam = (typeof ENGINE_LANDING_PARAMS)[number]

export const ENGINE_LANDING_LABELS: Record<EngineLandingParam, string> = {
  fast: 'Kineo 1',
  seedance: 'Seedance 1.5',
  kling: 'Kling 2.5',
  veo: 'Veo 3.1',
  hollywood: 'Kling 3',
  h3: 'MiniMax H3',
  omni: 'Omni Flash',
  s25: 'Seedance 2.5',
}

/**
 * Canonical public pages for answer engines and organic visitors. Keep this
 * beside the runtime engine allowlist so a renamed engine cannot leave the
 * machine-readable catalog pointing at a guessed or stale slug.
 */
export const ENGINE_LANDING_PUBLIC_PATHS: Record<EngineLandingParam, string> = {
  fast: '/ai-video-generator/kineo-1',
  seedance: '/ai-video-generator/seedance',
  kling: '/ai-video-generator/kling',
  veo: '/ai-video-generator/veo',
  hollywood: '/ai-video-generator/kling-3',
  h3: '/ai-video-generator/minimax-h3',
  omni: '/ai-video-generator/gemini-omni-flash',
  s25: '/ai-video-generator/seedance-2-5',
}

export function engineLandingPublicPath(engine: EngineLandingParam): string {
  return ENGINE_LANDING_PUBLIC_PATHS[normalizeEngine(engine)]
}

const DEFAULT_CAMPAIGN = 'seo_engine'

function normalizeEngine(value: string): EngineLandingParam {
  return ENGINE_LANDING_PARAMS.includes(value as EngineLandingParam)
    ? value as EngineLandingParam
    : 'fast'
}

function normalizeCampaign(value: string): string {
  const clean = value.trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(clean) ? clean : DEFAULT_CAMPAIGN
}

/**
 * Keep the engine named by an organic landing page through authentication.
 * The destination is the Studio cockpit, where the visitor still reviews the
 * selected engine and cost before any render can be submitted.
 */
export function buildEngineLandingDestination(input: {
  engine: EngineLandingParam
  campaign: string
}): string {
  const params = new URLSearchParams({
    engine: normalizeEngine(input.engine),
    intent_campaign: normalizeCampaign(input.campaign),
  })
  return `/studio?${params.toString()}`
}

export function buildEngineLandingSignupHref(input: {
  engine: EngineLandingParam
  campaign: string
}): string {
  const campaign = normalizeCampaign(input.campaign)
  const params = new URLSearchParams({
    utm_source: 'seo',
    utm_medium: 'organic',
    utm_campaign: campaign,
    intent_campaign: campaign,
    redirect: buildEngineLandingDestination({
      engine: normalizeEngine(input.engine),
      campaign,
    }),
  })
  return `/signup?${params.toString()}`
}
