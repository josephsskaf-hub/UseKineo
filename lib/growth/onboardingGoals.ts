export const ONBOARDING_GOAL_VARIANT = 'goal_router_v1' as const
export const HOME_WELCOME_GOAL_CAMPAIGN = 'growth_home_welcome_goal_router_20260828' as const

export type OnboardingGoalId = 'creator' | 'business' | 'agency'

export interface OnboardingGoal {
  id: OnboardingGoalId
  label: string
  shortLabel: string
  description: string
  topic: string
  niche: string
  hook: string
  cta: string
}

// Growth owns this copy. Keep the choices about the job the visitor needs to
// finish, never about engines: the entitlement-aware generator remains the
// single source of truth for which engine the account can use.
export const ONBOARDING_GOALS: readonly OnboardingGoal[] = [
  {
    id: 'creator',
    label: 'Grow my channel',
    shortLabel: 'My channel',
    description: 'Start with a curiosity idea built to hold attention.',
    topic: 'The disappearance nobody solved in 70 years',
    niche: 'mystery',
    hook: 'Three people vanished without a trace. What they left behind made the case even stranger.',
    cta: 'Create my channel-growth video →',
  },
  {
    id: 'business',
    label: 'Promote my business',
    shortLabel: 'My business',
    description: 'Turn a real customer problem into a useful Short.',
    topic: 'Three signs a customer is ready to buy — and most businesses miss all of them',
    niche: 'business',
    hook: 'Your next customer may already be ready to buy. These three signals tell you before they leave.',
    cta: 'Create my business video →',
  },
  {
    id: 'agency',
    label: 'Create for clients',
    shortLabel: 'Client work',
    description: 'Start from a brief you can adapt to a client.',
    topic: 'The marketing mistake that makes a great local business look invisible online',
    niche: 'agency',
    hook: 'A great local business can still look invisible online — and this one mistake is usually why.',
    cta: 'Create my client-ready video →',
  },
] as const

export const DEFAULT_ONBOARDING_GOAL = ONBOARDING_GOALS[0]

export function isOnboardingGoalId(value: unknown): value is OnboardingGoalId {
  return value === 'creator' || value === 'business' || value === 'agency'
}

export function getOnboardingGoal(value: unknown): OnboardingGoal {
  if (!isOnboardingGoalId(value)) return DEFAULT_ONBOARDING_GOAL
  return ONBOARDING_GOALS.find((goal) => goal.id === value) ?? DEFAULT_ONBOARDING_GOAL
}

/**
 * The post-signup home is a showroom by founder decision. This handoff keeps
 * that first view intact, then opens the existing Studio with one editable
 * starter idea. It deliberately omits `create_intent`: choosing a goal may
 * prepare the script, but it never starts a video render or spends credits.
 */
export function buildHomeWelcomeGoalHref(goal: OnboardingGoal): string {
  const params = new URLSearchParams({
    engine: 'seedance',
    prompt: goal.topic,
    intent_campaign: HOME_WELCOME_GOAL_CAMPAIGN,
    onboarding_goal: goal.id,
  })
  return `/studio?${params.toString()}`
}
