export const BUSINESS_PILOT_REVIEW_VARIANT = 'business_pilot_review_v1'
export const BUSINESS_PILOT_REVIEW_RESPONSE_VARIANT = 'business_pilot_review_response_v1'
export const BUSINESS_PILOT_REVIEW_PRICING_SOURCE = 'business_pilot_review_pricing_v1'
export const BUSINESS_PILOT_REVIEW_PATH = '/business-pilot-review'

export type BusinessPilotUseCase = 'own_brand' | 'client_work'
export type BusinessPilotCadence = 'single_campaign' | 'weekly' | 'ongoing'
export type BusinessPilotReviewer = 'brand_owner' | 'marketing_lead' | 'subject_expert' | 'client_approver'
export type BusinessPilotDecision = 'approve_limited_evaluation' | 'needs_changes' | 'not_now'

export type BusinessPilotSelection = {
  useCase: BusinessPilotUseCase
  cadence: BusinessPilotCadence
  reviewer: BusinessPilotReviewer
}

export const DEFAULT_BUSINESS_PILOT_SELECTION: BusinessPilotSelection = {
  useCase: 'own_brand',
  cadence: 'weekly',
  reviewer: 'marketing_lead',
}

export const BUSINESS_PILOT_OPTIONS = Object.freeze({
  useCase: Object.freeze([
    { value: 'own_brand' as const, label: 'Content for our own brand' },
    { value: 'client_work' as const, label: 'Content for client work' },
  ]),
  cadence: Object.freeze([
    { value: 'single_campaign' as const, label: 'One campaign' },
    { value: 'weekly' as const, label: 'Weekly publishing' },
    { value: 'ongoing' as const, label: 'Ongoing production' },
  ]),
  reviewer: Object.freeze([
    { value: 'brand_owner' as const, label: 'Brand owner' },
    { value: 'marketing_lead' as const, label: 'Marketing lead' },
    { value: 'subject_expert' as const, label: 'Subject expert' },
    { value: 'client_approver' as const, label: 'Client approver' },
  ]),
})

export const BUSINESS_PILOT_DECISIONS = Object.freeze([
  { value: 'approve_limited_evaluation' as const, label: 'Approve a limited evaluation' },
  { value: 'needs_changes' as const, label: 'Request changes first' },
  { value: 'not_now' as const, label: 'Not now' },
])

function closedValue<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? value as T : fallback
}

export function sanitizeBusinessPilotReviewSelection(input: Partial<BusinessPilotSelection>): BusinessPilotSelection {
  return {
    useCase: closedValue(input.useCase, BUSINESS_PILOT_OPTIONS.useCase.map((option) => option.value), DEFAULT_BUSINESS_PILOT_SELECTION.useCase),
    cadence: closedValue(input.cadence, BUSINESS_PILOT_OPTIONS.cadence.map((option) => option.value), DEFAULT_BUSINESS_PILOT_SELECTION.cadence),
    reviewer: closedValue(input.reviewer, BUSINESS_PILOT_OPTIONS.reviewer.map((option) => option.value), DEFAULT_BUSINESS_PILOT_SELECTION.reviewer),
  }
}

export function readBusinessPilotReviewSearch(search: URLSearchParams): BusinessPilotSelection {
  return sanitizeBusinessPilotReviewSelection({
    useCase: search.get('use_case') as BusinessPilotUseCase | undefined,
    cadence: search.get('cadence') as BusinessPilotCadence | undefined,
    reviewer: search.get('reviewer') as BusinessPilotReviewer | undefined,
  })
}

export function readBusinessPilotDecisionSearch(search: URLSearchParams): BusinessPilotDecision | null {
  const value = search.get('decision')
  return BUSINESS_PILOT_DECISIONS.some((option) => option.value === value)
    ? value as BusinessPilotDecision
    : null
}

export function isBusinessPilotReviewReferral(search: URLSearchParams): boolean {
  return search.get('utm_source') === 'business_pilot_review' &&
    search.get('utm_medium') === 'referral' &&
    search.get('utm_campaign') === BUSINESS_PILOT_REVIEW_VARIANT
}

export function isBusinessPilotResponseReferral(search: URLSearchParams): boolean {
  return search.get('utm_source') === 'business_pilot_review_response' &&
    search.get('utm_medium') === 'referral' &&
    search.get('utm_campaign') === BUSINESS_PILOT_REVIEW_RESPONSE_VARIANT &&
    readBusinessPilotDecisionSearch(search) !== null
}

function labelFor<T extends string>(options: readonly { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value
}

export function businessPilotReviewMetadata(selection: BusinessPilotSelection) {
  const safe = sanitizeBusinessPilotReviewSelection(selection)
  return {
    source: BUSINESS_PILOT_REVIEW_PRICING_SOURCE,
    variant: BUSINESS_PILOT_REVIEW_VARIANT,
    use_case: safe.useCase,
    cadence: safe.cadence,
    reviewer: safe.reviewer,
  }
}

export function businessPilotReviewShareMetadata(selection: BusinessPilotSelection, method: 'native' | 'clipboard') {
  return { ...businessPilotReviewMetadata(selection), method }
}

export function businessPilotDecisionMetadata(selection: BusinessPilotSelection, decision: BusinessPilotDecision) {
  return { ...businessPilotReviewMetadata(selection), decision }
}

export function businessPilotResponseShareMetadata(
  selection: BusinessPilotSelection,
  decision: BusinessPilotDecision,
  method: 'native' | 'clipboard',
) {
  return { ...businessPilotDecisionMetadata(selection, decision), method }
}

export function buildBusinessPilotReviewShareUrl(selection: BusinessPilotSelection): string {
  const safe = sanitizeBusinessPilotReviewSelection(selection)
  const query = new URLSearchParams({
    utm_source: 'business_pilot_review',
    utm_medium: 'referral',
    utm_campaign: BUSINESS_PILOT_REVIEW_VARIANT,
    use_case: safe.useCase,
    cadence: safe.cadence,
    reviewer: safe.reviewer,
  })
  return 'https://www.usekineo.com' + BUSINESS_PILOT_REVIEW_PATH + '?' + query.toString()
}

export function buildBusinessPilotReviewPricingHref(): string {
  return '/pricing?intent_campaign=' + BUSINESS_PILOT_REVIEW_PRICING_SOURCE
}

export function buildBusinessPilotResponseShareUrl(
  selection: BusinessPilotSelection,
  decision: BusinessPilotDecision,
): string {
  const safe = sanitizeBusinessPilotReviewSelection(selection)
  const query = new URLSearchParams({
    utm_source: 'business_pilot_review_response',
    utm_medium: 'referral',
    utm_campaign: BUSINESS_PILOT_REVIEW_RESPONSE_VARIANT,
    use_case: safe.useCase,
    cadence: safe.cadence,
    reviewer: safe.reviewer,
    decision,
  })
  return 'https://www.usekineo.com' + BUSINESS_PILOT_REVIEW_PATH + '?' + query.toString()
}

export function buildBusinessPilotReviewMemo(selection: BusinessPilotSelection): string {
  const safe = sanitizeBusinessPilotReviewSelection(selection)
  return [
    'KINEO — INTERNAL PILOT DECISION NOTE',
    '',
    'Decision requested',
    'Decide whether your team should run a limited self-service evaluation before considering a paid plan.',
    '',
    'Proposed evaluation',
    'Use case: ' + labelFor(BUSINESS_PILOT_OPTIONS.useCase, safe.useCase),
    'Cadence: ' + labelFor(BUSINESS_PILOT_OPTIONS.cadence, safe.cadence),
    'Reviewer: ' + labelFor(BUSINESS_PILOT_OPTIONS.reviewer, safe.reviewer),
    '',
    'What to evaluate',
    '• Whether the workflow is useful for the selected use case.',
    '• Whether the output is accurate enough after review by your team or client.',
    '• Whether the current public plans fit the intended cadence.',
    '',
    'Known boundaries',
    '• Self-service means one account; it does not include team seats, client approval routing or white-label software/client portal.',
    '• AI output requires human review before publishing.',
    '• This note makes no SOC 2, ISO 27001 or enterprise SLA claim.',
    '• Verify the current privacy policy, terms, product scope and pricing before deciding.',
    '',
    'Internal evaluation draft only. Not a contract, certification, legal approval or ROI forecast.',
  ].join('\n')
}

export function buildBusinessPilotResponse(selection: BusinessPilotSelection, decision: BusinessPilotDecision): string {
  const safe = sanitizeBusinessPilotReviewSelection(selection)
  const decisionLabel = labelFor(BUSINESS_PILOT_DECISIONS, decision)
  const nextStep = decision === 'approve_limited_evaluation'
    ? 'Review the current public plans and run only the limited evaluation described in the note.'
    : decision === 'needs_changes'
      ? 'Return to the evaluation owner with the categories that need to change before proceeding.'
      : 'Do not proceed now. Revisit the evaluation only if the use case or timing changes.'
  return [
    'KINEO — PILOT REVIEW RESPONSE',
    '',
    'Decision: ' + decisionLabel,
    'Use case: ' + labelFor(BUSINESS_PILOT_OPTIONS.useCase, safe.useCase),
    'Cadence: ' + labelFor(BUSINESS_PILOT_OPTIONS.cadence, safe.cadence),
    'Reviewer: ' + labelFor(BUSINESS_PILOT_OPTIONS.reviewer, safe.reviewer),
    '',
    'Next step',
    nextStep,
    '',
    'This self-contained response does not route or certify an approval. Send it back to the evaluation owner.',
  ].join('\n')
}

export type BusinessPilotReviewShareAsset = {
  title: string
  text: string
  url: string
  clipboardText: string
}

export function buildBusinessPilotReviewAsset(selection: BusinessPilotSelection): BusinessPilotReviewShareAsset {
  const text = buildBusinessPilotReviewMemo(selection)
  const url = buildBusinessPilotReviewShareUrl(selection)
  return {
    title: 'Kineo internal pilot decision note',
    text,
    url,
    clipboardText: text + '\n\nReview the current Kineo information: ' + url,
  }
}

export function buildBusinessPilotResponseAsset(
  selection: BusinessPilotSelection,
  decision: BusinessPilotDecision,
): BusinessPilotReviewShareAsset {
  const text = buildBusinessPilotResponse(selection, decision)
  const url = buildBusinessPilotResponseShareUrl(selection, decision)
  return {
    title: 'Kineo pilot review response',
    text,
    url,
    clipboardText: text + '\n\nOpen the response: ' + url,
  }
}

type ShareNavigator = {
  share?: (payload: { title: string; text: string; url: string }) => Promise<void>
  clipboard?: { writeText: (value: string) => Promise<void> }
}

export async function requestBusinessPilotReviewShare(
  asset: BusinessPilotReviewShareAsset,
  browser: ShareNavigator,
): Promise<'native' | 'clipboard' | 'manual' | 'cancelled'> {
  if (typeof browser.share === 'function') {
    try {
      await browser.share({ title: asset.title, text: asset.text, url: asset.url })
      return 'native'
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return 'cancelled'
    }
  }
  if (typeof browser.clipboard?.writeText === 'function') {
    try {
      await browser.clipboard.writeText(asset.clipboardText)
      return 'clipboard'
    } catch {
      return 'manual'
    }
  }
  return 'manual'
}
