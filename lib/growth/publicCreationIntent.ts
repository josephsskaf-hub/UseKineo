const DEFAULT_CAMPAIGN = 'organic_creation'
const DEFAULT_SOURCE = 'seo'
const DEFAULT_MEDIUM = 'organic'

function boundedToken(value: string, fallback: string): string {
  const clean = value.trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(clean) ? clean : fallback
}

function campaignToken(value: string): string {
  return boundedToken(value, DEFAULT_CAMPAIGN)
}

/**
 * A public CTA without user-authored work may open the Studio, but it must not
 * claim an automatic creation intent. Authentication preserves the bounded
 * internal redirect; the Studio still requires an explicit Generate action.
 */
export function buildBlankStudioSignupHref(input: {
  campaign: string
  utmSource?: string
  utmMedium?: string
}): string {
  const campaign = campaignToken(input.campaign)
  const destination = new URLSearchParams({
    engine: 'fast',
    intent_campaign: campaign,
  })
  const signup = new URLSearchParams({
    utm_source: boundedToken(input.utmSource ?? DEFAULT_SOURCE, DEFAULT_SOURCE),
    utm_medium: boundedToken(input.utmMedium ?? DEFAULT_MEDIUM, DEFAULT_MEDIUM),
    utm_campaign: campaign,
    intent_campaign: campaign,
    redirect: `/studio?${destination.toString()}`,
  })
  return `/signup?${signup.toString()}`
}

/**
 * Automatic Fast creation is reserved for a concrete prompt submitted or
 * deliberately selected by the visitor. Empty work fails closed instead of
 * producing a URL whose create_intent authentication will silently discard.
 */
export function buildPromptedFastSignupHref(input: {
  prompt: string
  campaign: string
  utmSource?: string
  utmMedium?: string
}): string {
  const prompt = input.prompt.trim().slice(0, 1000)
  if (!prompt) throw new Error('prompt_required_for_fast_creation')

  const campaign = campaignToken(input.campaign)
  const signup = new URLSearchParams({
    prompt,
    create_intent: 'fast',
    intent_campaign: campaign,
    utm_source: boundedToken(input.utmSource ?? DEFAULT_SOURCE, DEFAULT_SOURCE),
    utm_medium: boundedToken(input.utmMedium ?? DEFAULT_MEDIUM, DEFAULT_MEDIUM),
    utm_campaign: campaign,
  })
  return `/signup?${signup.toString()}`
}
