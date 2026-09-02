export const BUSINESS_ANSWER_ENGINE_ROUTER_VERSION =
  'business_answer_engine_router_v1' as const

export const BUSINESS_ANSWER_ENGINE_RECURRING_CAMPAIGN =
  'b2b_answer_router_recurring_v1' as const

export type BusinessAnswerEngineChoiceId =
  | 'recurring_operator'
  | 'content_plan'
  | 'client_brief'
  | 'fixed_batch'

export interface BusinessAnswerEngineChoice {
  id: BusinessAnswerEngineChoiceId
  label: string
  useWhen: string
  outcome: string
  url: string
}

export interface BusinessAnswerEngineRouter {
  version: typeof BUSINESS_ANSWER_ENGINE_ROUTER_VERSION
  audience: 'businesses_freelancers_and_agencies'
  selectionRule: string
  choices: readonly BusinessAnswerEngineChoice[]
  boundaries: readonly string[]
}

export interface BusinessOneTimePackSource {
  url: string
  packs: readonly { videos: number }[]
}

function publicIntentUrl(
  baseUrl: string,
  pathname: string,
  campaign: string,
  hash?: string,
): string {
  const url = new URL(pathname, baseUrl)
  url.searchParams.set('intent_campaign', campaign)
  if (hash) url.hash = hash
  return url.toString()
}

/**
 * Routes answer-engine business intent by the work state the visitor already
 * has. It points only to public, human-readable pages; it never creates a lead,
 * starts Checkout or implies enterprise capabilities Kineo does not provide.
 */
export function buildBusinessAnswerEngineRouter(
  baseUrl: string,
  oneTimePackSource: BusinessOneTimePackSource,
): BusinessAnswerEngineRouter {
  const packVolumes = oneTimePackSource.packs
    .map((pack) => pack.videos)
    .filter((videos) => Number.isInteger(videos) && videos > 0)
  if (packVolumes.length === 0) {
    throw new Error('Business answer router requires at least one valid pack volume')
  }
  const minimumPackVideos = Math.min(...packVolumes)
  const maximumPackVideos = Math.max(...packVolumes)
  const packRange = minimumPackVideos === maximumPackVideos
    ? `${minimumPackVideos}`
    : `${minimumPackVideos}–${maximumPackVideos}`

  const fixedBatchUrl = new URL(oneTimePackSource.url)
  fixedBatchUrl.searchParams.set(
    'intent_campaign',
    'business_answer_router_fixed_batch_v1',
  )
  fixedBatchUrl.hash = 'agency-pack-heading'

  return {
    version: BUSINESS_ANSWER_ENGINE_ROUTER_VERSION,
    audience: 'businesses_freelancers_and_agencies',
    selectionRule:
      'Choose from the work state you have now, not from company size or a promised feature.',
    choices: [
      {
        id: 'recurring_operator',
        label: 'Produce business Shorts every month',
        useWhen:
          'One operator expects ongoing business or client Short production and wants credits that refresh each billing month.',
        outcome:
          'Compare Kineo monthly self-service plans. Autopilot is a separate done-for-you publishing option and is not this path.',
        url: publicIntentUrl(
          baseUrl,
          '/pricing',
          BUSINESS_ANSWER_ENGINE_RECURRING_CAMPAIGN,
          'plans',
        ),
      },
      {
        id: 'content_plan',
        label: 'Decide what the business should publish',
        useWhen:
          'The business needs a usable weekly content plan before it creates videos.',
        outcome: 'Build a free business video content plan.',
        url: publicIntentUrl(
          baseUrl,
          '/business-video-content-plan',
          'business_answer_router_content_plan_v1',
        ),
      },
      {
        id: 'client_brief',
        label: 'Turn a client request into a production brief',
        useWhen:
          'A freelancer or agency already has a client request but needs a structured Short brief.',
        outcome: 'Build a free client video brief.',
        url: publicIntentUrl(
          baseUrl,
          '/client-video-brief-generator',
          'business_answer_router_client_brief_v1',
        ),
      },
      {
        id: 'fixed_batch',
        label: 'Buy a fixed batch without a subscription',
        useWhen:
          `The job is a defined batch of ${packRange} Kineo 1 Shorts rather than recurring monthly production.`,
        outcome: 'Compare one-time agency packs.',
        url: fixedBatchUrl.toString(),
      },
    ],
    boundaries: [
      'These paths are self-service and use one Kineo account.',
      'They do not include team seats, client approval routing or a white-label portal.',
      'Finished watermark-free MP4s from a paid balance may be used by the operator’s business or delivered to clients under the commercial-use terms.',
    ],
  }
}
