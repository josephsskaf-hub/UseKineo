export const ENGINE_LANDING_PARAMS = [
  'fast',
  'seedance',
  'kling',
  'veo',
  'hollywood',
  'h3',
  'omni',
] as const

export type EngineLandingParam = (typeof ENGINE_LANDING_PARAMS)[number]

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
