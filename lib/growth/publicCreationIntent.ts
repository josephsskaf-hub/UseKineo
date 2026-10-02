const DEFAULT_CAMPAIGN = 'organic_creation'
const DEFAULT_MEDIUM = 'organic'
// KINEO-ATRIBUICAO-POUSO-2026-10-02 — ACABOU o `utm_source=seo` cravado. Ele era escrito em TODO link de cadastro das
// páginas públicas, e o /signup grava utm_source como ORIGEM de primeiro toque (lib/analytics.ts captureSourceOnce):
// quem chegou do ChatGPT sem referrer, ou direto, e clicou numa dessas páginas virava "seo" — origem inventada. Quem
// identifica a página agora é o caminho de entrada (profiles.signup_landing_path). Chamador que SABE a origem
// (utmSource explícito, ex. 'alternatives') continua mandando; sem ela, o link não leva utm_source nenhum.
// O medium 'organic' + a campanha seguem (lib/growth/organicSignupTruth.ts reconhece organic sem source).

function boundedToken(value: string, fallback: string): string {
  const clean = value.trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(clean) ? clean : fallback
}

/** utm_source só quando o chamador passou um valor válido; nunca um padrão inventado. */
function setExplicitSource(params: URLSearchParams, utmSource: string | undefined): void {
  const source = boundedToken(utmSource ?? '', '')
  if (source) params.set('utm_source', source)
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
  const signup = new URLSearchParams()
  setExplicitSource(signup, input.utmSource)
  signup.set('utm_medium', boundedToken(input.utmMedium ?? DEFAULT_MEDIUM, DEFAULT_MEDIUM))
  signup.set('utm_campaign', campaign)
  signup.set('intent_campaign', campaign)
  signup.set('redirect', `/studio?${destination.toString()}`)
  return `/signup?${signup.toString()}`
}

type PromptedCreationIntent = 'fast' | 'trial_best'

/**
 * Automatic creation is reserved for a concrete prompt submitted or
 * deliberately selected by the visitor. Empty work fails closed instead of
 * producing a URL whose create_intent authentication will silently discard.
 */
export function buildPromptedSignupHref(input: {
  prompt: string
  campaign: string
  creationIntent: PromptedCreationIntent
  utmSource?: string
  utmMedium?: string
}): string {
  const prompt = input.prompt.trim().slice(0, 1000)
  if (!prompt) throw new Error('prompt_required_for_fast_creation')

  const campaign = campaignToken(input.campaign)
  const signup = new URLSearchParams({
    prompt,
    create_intent: input.creationIntent,
    intent_campaign: campaign,
  })
  setExplicitSource(signup, input.utmSource)
  signup.set('utm_medium', boundedToken(input.utmMedium ?? DEFAULT_MEDIUM, DEFAULT_MEDIUM))
  signup.set('utm_campaign', campaign)
  return `/signup?${signup.toString()}`
}

/** Legacy callers that explicitly promise Fast retain their exact contract. */
export function buildPromptedFastSignupHref(input: {
  prompt: string
  campaign: string
  utmSource?: string
  utmMedium?: string
}): string {
  return buildPromptedSignupHref({ ...input, creationIntent: 'fast' })
}
