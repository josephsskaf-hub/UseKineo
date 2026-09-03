export const BUSINESS_PLAN_CAMPAIGN = 'weekly_business_video_plan' as const
export const BUSINESS_PLAN_SHARE_CAMPAIGN = 'weekly_business_video_plan_share_v1' as const
export const BUSINESS_PLAN_SHARE_URL =
  `https://www.usekineo.com/business-video-content-plan?utm_source=business_plan_copy&utm_medium=referral&utm_campaign=${BUSINESS_PLAN_SHARE_CAMPAIGN}` as const
export const BUSINESS_PLAN_ATTRIBUTION_VERSION = 'business_content_plan_attribution_v1' as const
export const BUSINESS_PLAN_AFFILIATE_ENTRY = 'affiliate_business' as const
export const BUSINESS_PLAN_AFFILIATE_SOURCE = 'affiliate' as const
export const BUSINESS_PLAN_AFFILIATE_MEDIUM = 'partner' as const
export const BUSINESS_PLAN_AFFILIATE_CAMPAIGN = 'affiliate_business_plan' as const

export type BusinessContentPlanEntry =
  | 'plan_copy_referral'
  | typeof BUSINESS_PLAN_AFFILIATE_ENTRY
  | 'direct_or_other'

type BusinessContentPlanSearchParams =
  | Record<string, string | string[] | undefined>
  | undefined

function normalizedSingleParam(
  searchParams: BusinessContentPlanSearchParams,
  key: string,
): string {
  const value = searchParams?.[key]
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function readBusinessContentPlanEntry(
  searchParams: BusinessContentPlanSearchParams,
): BusinessContentPlanEntry {
  const isPlanCopyReferral =
    normalizedSingleParam(searchParams, 'utm_source') === 'business_plan_copy'
    && normalizedSingleParam(searchParams, 'utm_medium') === 'referral'
    && normalizedSingleParam(searchParams, 'utm_campaign') === BUSINESS_PLAN_SHARE_CAMPAIGN
  if (isPlanCopyReferral) return 'plan_copy_referral'
  const isAffiliateBusiness =
    normalizedSingleParam(searchParams, 'utm_source') === BUSINESS_PLAN_AFFILIATE_SOURCE
    && normalizedSingleParam(searchParams, 'utm_medium') === BUSINESS_PLAN_AFFILIATE_MEDIUM
    && normalizedSingleParam(searchParams, 'utm_campaign') === BUSINESS_PLAN_AFFILIATE_CAMPAIGN
  return isAffiliateBusiness ? BUSINESS_PLAN_AFFILIATE_ENTRY : 'direct_or_other'
}

export function businessContentPlanEntryMetadata(entry: BusinessContentPlanEntry) {
  return {
    attribution_version: BUSINESS_PLAN_ATTRIBUTION_VERSION,
    entry,
    referral_campaign: entry === 'plan_copy_referral'
      ? BUSINESS_PLAN_SHARE_CAMPAIGN
      : entry === BUSINESS_PLAN_AFFILIATE_ENTRY
        ? BUSINESS_PLAN_AFFILIATE_CAMPAIGN
        : null,
  } as const
}

export function businessContentPlanViewMarker(entry: BusinessContentPlanEntry): string {
  return `kineo:${BUSINESS_PLAN_ATTRIBUTION_VERSION}:viewed:${entry}`
}

function businessPlanSignupAttribution(entry: BusinessContentPlanEntry) {
  if (entry === 'plan_copy_referral') {
    return {
      utm_source: 'business_plan_copy',
      utm_medium: 'referral',
      utm_campaign: BUSINESS_PLAN_SHARE_CAMPAIGN,
    }
  }
  if (entry === BUSINESS_PLAN_AFFILIATE_ENTRY) {
    return {
      utm_source: BUSINESS_PLAN_AFFILIATE_SOURCE,
      utm_medium: BUSINESS_PLAN_AFFILIATE_MEDIUM,
      utm_campaign: BUSINESS_PLAN_AFFILIATE_CAMPAIGN,
    }
  }
  return {
    utm_source: 'business_planner',
    utm_medium: 'organic',
    utm_campaign: BUSINESS_PLAN_CAMPAIGN,
  }
}

export const BUSINESS_GOALS = [
  { id: 'leads', label: 'Generate qualified leads' },
  { id: 'explain', label: 'Explain the product clearly' },
  { id: 'trust', label: 'Build trust before the sale' },
  { id: 'launch', label: 'Support a launch or offer' },
] as const

export type BusinessGoalId = (typeof BUSINESS_GOALS)[number]['id']

export const BUSINESS_CADENCES = [
  { id: 'three', label: '3 videos / week', weeklyVideos: 3, fourWeekVideos: 12 },
  { id: 'five', label: '5 videos / week', weeklyVideos: 5, fourWeekVideos: 20 },
  { id: 'seven', label: '7 videos / week', weeklyVideos: 7, fourWeekVideos: 28 },
] as const

export type BusinessCadenceId = (typeof BUSINESS_CADENCES)[number]['id']

export type BusinessContentPlanItem = {
  day: string
  angle: string
  hook: string
  brief: string
  evidence: string
}

export function normalizeBusinessOffer(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 140)
}

export function normalizeBusinessAudience(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 100)
}

function goalDirection(goal: BusinessGoalId): string {
  const directions: Record<BusinessGoalId, string> = {
    leads: 'help the right viewer recognize a real problem and choose a useful next step',
    explain: 'make the offer easier to understand without oversimplifying its limits',
    trust: 'show the process, proof and tradeoffs a careful buyer needs before deciding',
    launch: 'connect the launch to a specific use case without fake urgency',
  }
  return directions[goal]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

function planIndices(cadence: BusinessCadenceId): number[] {
  if (cadence === 'three') return [0, 2, 4]
  if (cadence === 'five') return [0, 1, 2, 3, 4]
  return [0, 1, 2, 3, 4, 5, 6]
}

export function buildBusinessContentPlan(input: {
  offer: string
  audience?: string
  goal: BusinessGoalId
  cadence: BusinessCadenceId
}): BusinessContentPlanItem[] {
  const offer = normalizeBusinessOffer(input.offer)
  const audience = normalizeBusinessAudience(input.audience) || 'the people you serve'
  if (offer.length < 8) return []
  const direction = goalDirection(input.goal)

  const angles: Omit<BusinessContentPlanItem, 'day'>[] = [
    {
      angle: 'Problem recognition',
      hook: `What sends ${audience} looking for ${offer}?`,
      brief: `Name one concrete problem, then ${direction}.`,
      evidence: 'Use one verified customer situation; do not invent a result.',
    },
    {
      angle: 'Decision guide',
      hook: `Three questions to ask before choosing ${offer}.`,
      brief: 'Teach the viewer how to compare fit, not why every viewer should buy.',
      evidence: 'Use verified requirements, limitations or selection criteria.',
    },
    {
      angle: 'How it works',
      hook: `How ${offer} works, one real step at a time.`,
      brief: 'Explain a real step from input to outcome in plain language.',
      evidence: 'Use a verified process step or replace it with [add process detail].',
    },
    {
      angle: 'Objection answered',
      hook: `The honest answer to the objection buyers raise about ${offer}.`,
      brief: 'Answer the objection directly and include the tradeoff most sellers omit.',
      evidence: 'Quote a real objection; never fabricate a customer comment.',
    },
    {
      angle: 'Feature to use case',
      hook: `When one feature of ${offer} actually matters.`,
      brief: 'Connect one supplied feature to one specific use case without exaggeration.',
      evidence: 'Use a verified feature and state who it is not for.',
    },
    {
      angle: 'Proof with a limit',
      hook: `The proof to check before trusting ${offer}.`,
      brief: 'Show evidence and its boundary instead of presenting an unsupported win.',
      evidence: 'Add [verified demo, specification, customer quote, or limitation].',
    },
    {
      angle: 'Fit and next step',
      hook: `Who should choose ${offer} — and who should skip it?`,
      brief: 'End the week with a clear fit test and a non-deceptive next step.',
      evidence: 'Use verified eligibility and no fake deadline, scarcity or guarantee.',
    },
  ]

  return planIndices(input.cadence).map((angleIndex) => ({
    day: DAYS[angleIndex],
    ...angles[angleIndex],
  }))
}

export function businessCadenceDetails(cadence: BusinessCadenceId) {
  return BUSINESS_CADENCES.find((option) => option.id === cadence) ?? BUSINESS_CADENCES[0]
}

export function recommendedBusinessPack(cadence: BusinessCadenceId): 'bulk20' | 'bulk30' {
  return cadence === 'seven' ? 'bulk30' : 'bulk20'
}

export function businessContentPlanAsText(input: {
  offer: string
  audience?: string
  goal: BusinessGoalId
  cadence: BusinessCadenceId
  items: BusinessContentPlanItem[]
}): string {
  const offer = normalizeBusinessOffer(input.offer)
  const audience = normalizeBusinessAudience(input.audience) || 'the people this business serves'
  const goal = BUSINESS_GOALS.find((option) => option.id === input.goal)?.label ?? BUSINESS_GOALS[0].label
  const cadence = businessCadenceDetails(input.cadence)
  const items = input.items.slice(0, cadence.weeklyVideos)
  if (offer.length < 8 || items.length === 0) return ''

  const plan = items.flatMap((item) => [
    `${item.day} — ${item.angle}`,
    `Hook: ${item.hook}`,
    `Brief: ${item.brief}`,
    `Evidence: ${item.evidence}`,
    '',
  ])

  return [
    'WEEKLY BUSINESS SHORTS PLAN',
    `Offer: ${offer}`,
    `Audience: ${audience}`,
    `Goal: ${goal}`,
    `Cadence: ${cadence.label}`,
    '',
    ...plan,
    'Build your own free plan with Kineo:',
    BUSINESS_PLAN_SHARE_URL,
  ].join('\n')
}

export function buildBusinessPlanActivationHref(input: {
  offer: string
  audience?: string
  goal: BusinessGoalId
  firstItem: BusinessContentPlanItem
  entry?: BusinessContentPlanEntry
}): string {
  const offer = normalizeBusinessOffer(input.offer)
  const audience = normalizeBusinessAudience(input.audience) || 'the people this business serves'
  const goal = BUSINESS_GOALS.find((option) => option.id === input.goal)?.label ?? BUSINESS_GOALS[0].label
  const prompt = [
    'Create a 35-second faceless business Short.',
    `Business offer: ${offer}`,
    `Audience: ${audience}`,
    `Goal: ${goal}`,
    `Angle: ${input.firstItem.angle}`,
    `Hook direction: ${input.firstItem.hook}`,
    `Evidence boundary: ${input.firstItem.evidence}`,
    'Use only verified facts. Keep [placeholders] for anything not supplied.',
  ].join('\n')
  const destination = `/studio/create?${new URLSearchParams({
    prompt,
    duration: '35',
    autoanalyze: '1',
    intent_campaign: BUSINESS_PLAN_CAMPAIGN,
  }).toString()}`
  return `/signup?${new URLSearchParams({
    ...businessPlanSignupAttribution(input.entry ?? 'direct_or_other'),
    redirect: destination,
  }).toString()}`
}

export function buildBusinessPlanEmptyActivationHref(
  entry: BusinessContentPlanEntry = 'direct_or_other',
): string {
  return `/signup?${new URLSearchParams(businessPlanSignupAttribution(entry)).toString()}`
}
