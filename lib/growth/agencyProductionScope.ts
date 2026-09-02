export const AGENCY_PRODUCTION_SCOPE_VERSION = 'agency_production_scope_v1' as const
export const AGENCY_PRODUCTION_SCOPE_ENTRY = 'scope_brief' as const
export const AGENCY_PRODUCTION_SCOPE_EFFECTIVE_DATE = '2026-09-02' as const
export const AGENCY_PRODUCTION_SCOPE_RECURRING_CAMPAIGN =
  'b2b_agency_scope_recurring_v1' as const
export const AGENCY_PRODUCTION_SCOPE_AUTOPILOT_CAMPAIGN =
  'b2b_agency_scope_autopilot_v1' as const
export const AGENCY_PRODUCTION_SCOPE_FIT_REVIEW_CAMPAIGN =
  'b2b_agency_scope_brief_v1' as const
export const AGENCY_PRODUCTION_SCOPE_SOURCE = 'agency_scope_brief' as const
export const AGENCY_PRODUCTION_SCOPE_MEDIUM = 'scope_document' as const

export interface AgencyScopePackFact {
  videos: number
  priceUsd: string
  pricePerFastVideoUsd: string
}

export interface AgencyScopeBusinessOffer {
  url: string
  namedVideoCountEngine: string
  packs: readonly AgencyScopePackFact[]
  boundaries: readonly string[]
}

export interface AgencyProductionScope {
  version: typeof AGENCY_PRODUCTION_SCOPE_VERSION
  effectiveDate: typeof AGENCY_PRODUCTION_SCOPE_EFFECTIVE_DATE
  title: string
  disclaimer: string
  scope: readonly string[]
  boundaries: readonly string[]
  packReferences: readonly AgencyScopePackFact[]
  purchasePaths: readonly {
    id: 'fixed_batch' | 'recurring_self_service' | 'autopilot'
    label: string
    description: string
    url: string
  }[]
  fitReviewUrl: string
  termsUrl: string
}

function publicUrl(baseUrl: string, pathname: string): URL {
  const url = new URL(pathname, baseUrl)
  if (url.protocol !== 'https:') throw new Error('Agency production scope requires HTTPS')
  return url
}

export function buildAgencyProductionScope(
  baseUrl: string,
  offer: AgencyScopeBusinessOffer,
): AgencyProductionScope {
  if (!offer.packs.length) throw new Error('Agency production scope requires at least one pack')

  const fixedBatchUrl = new URL(offer.url)
  if (fixedBatchUrl.protocol !== 'https:' || fixedBatchUrl.origin !== new URL(baseUrl).origin) {
    throw new Error('Agency production scope requires a canonical HTTPS offer URL')
  }
  fixedBatchUrl.searchParams.set('entry', AGENCY_PRODUCTION_SCOPE_ENTRY)
  fixedBatchUrl.hash = 'agency-pack-heading'

  const fitReviewUrl = new URL(offer.url)
  fitReviewUrl.searchParams.set('entry', AGENCY_PRODUCTION_SCOPE_ENTRY)
  fitReviewUrl.hash = 'agency-brief-heading'

  const recurringUrl = publicUrl(baseUrl, '/pricing')
  recurringUrl.searchParams.set(
    'intent_campaign',
    AGENCY_PRODUCTION_SCOPE_RECURRING_CAMPAIGN,
  )
  recurringUrl.hash = 'plans'

  const autopilotUrl = publicUrl(baseUrl, '/pricing')
  autopilotUrl.searchParams.set(
    'intent_campaign',
    AGENCY_PRODUCTION_SCOPE_AUTOPILOT_CAMPAIGN,
  )
  autopilotUrl.hash = 'autopilot'

  return {
    version: AGENCY_PRODUCTION_SCOPE_VERSION,
    effectiveDate: AGENCY_PRODUCTION_SCOPE_EFFECTIVE_DATE,
    title: 'Kineo agency production scope',
    disclaimer:
      'Product scope, not a contract. The current Kineo Terms of Service prevail if this brief and the Terms differ.',
    scope: [
      `One-time packs cover finished ${offer.namedVideoCountEngine} Shorts in the quantities listed below.`,
      'Finished watermark-free MP4s from a paid balance may be used by the operator’s business or delivered to clients under the commercial-use terms.',
      'The operator is responsible for reviewing each AI-generated output before publishing or delivering it.',
    ],
    boundaries: [...offer.boundaries],
    packReferences: offer.packs.map((pack) => ({ ...pack })),
    purchasePaths: [
      {
        id: 'fixed_batch',
        label: 'Fixed one-time batch',
        description: 'For a defined batch without a subscription or sales call.',
        url: fixedBatchUrl.toString(),
      },
      {
        id: 'recurring_self_service',
        label: 'Recurring self-service production',
        description: 'For one operator who wants credits refreshed each billing month.',
        url: recurringUrl.toString(),
      },
      {
        id: 'autopilot',
        label: 'Autopilot',
        description:
          'A separate done-for-you publishing option. It is not included in one-time packs or ordinary self-service subscriptions.',
        url: autopilotUrl.toString(),
      },
    ],
    fitReviewUrl: fitReviewUrl.toString(),
    termsUrl: publicUrl(baseUrl, '/terms').toString(),
  }
}

export function renderAgencyProductionScopeTxt(scope: AgencyProductionScope): string {
  const fixedPack = scope.purchasePaths.find((path) => path.id === 'fixed_batch')
  if (!fixedPack) throw new Error('Agency production scope is missing the fixed-batch path')

  return `# ${scope.title}

Version: ${scope.version}
Effective date: ${scope.effectiveDate}
Status: ${scope.disclaimer}

## Scope available today

${scope.scope.map((line) => `- ${line}`).join('\n')}

## One-time pack reference

${scope.boundaries.map((line) => `- ${line}`).join('\n')}
${scope.packReferences.map((pack) => `- ${pack.videos} videos: ${pack.priceUsd} once (${pack.pricePerFastVideoUsd} per video).`).join('\n')}
- Current pack details: ${fixedPack.url}

## Choose the purchase path

${scope.purchasePaths.map((path) => `- ${path.label}: ${path.description} ${path.url}`).join('\n')}

## Optional product-fit review

- If the planned volume does not fit a standard path, submit the existing monthly-volume review: ${scope.fitReviewUrl}
- Submitting the review does not add the work email to the viral-ideas mailing list.

## Authority

- Terms of Service: ${scope.termsUrl}
- This brief summarizes current product scope and does not replace the Terms.
`
}
