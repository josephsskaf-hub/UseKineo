export const ORGANIC_SIGNUP_TRUTH_VERSION = 'organic_signup_truth_v1' as const

// Campaigns emitted by public search pages. They prove the product handoff even
// when acquisition source is ChatGPT or another referral. Keep source/medium
// separate so this cohort does not erase the real first touch.
const LEGACY_ORGANIC_CAMPAIGN_PREFIXES = [
  'push22_',
  'push32_',
  'push39_',
  'push48_',
  'push60_',
  'push63_',
  'push66_',
  'push69_',
  'push70_',
  'push77_',
  'push96_',
  'seo_',
  'starter_',
] as const

function token(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().slice(0, 100)
}

export function isOrganicSignupAttribution(input: {
  source?: string | null
  medium?: string | null
  campaign?: string | null
}): boolean {
  const source = token(input.source)
  const medium = token(input.medium)
  const campaign = token(input.campaign)
  if (source === 'seo' && medium === 'organic') return true
  return LEGACY_ORGANIC_CAMPAIGN_PREFIXES.some((prefix) => campaign.startsWith(prefix))
}

export type OrganicSignupHandoffContext = {
  version: typeof ORGANIC_SIGNUP_TRUTH_VERSION
  campaign: string
  source: string
  medium: string
  createIntent: string | null
}

/** No prompt, email or full URL enters analytics. */
export function organicSignupHandoffContext(params: URLSearchParams): OrganicSignupHandoffContext | null {
  const campaign = token(params.get('intent_campaign') || params.get('utm_campaign'))
  const source = token(params.get('utm_source'))
  const medium = token(params.get('utm_medium'))
  if (!isOrganicSignupAttribution({ source, medium, campaign })) return null

  const rawIntent = token(params.get('create_intent'))
  const createIntent = /^(?:fast|trial_best|example_remix)$/.test(rawIntent) ? rawIntent : null
  return {
    version: ORGANIC_SIGNUP_TRUTH_VERSION,
    campaign,
    source: source || 'legacy_campaign',
    medium: medium || 'legacy_campaign',
    createIntent,
  }
}
