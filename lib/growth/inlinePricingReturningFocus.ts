export const INLINE_PRICING_RETURNING_FOCUS_VERSION = 'inline_pricing_returning_focus_v1'

export type InlinePricingLayout = 'legacy' | 'focused' | 'expanded'
export type CompletedCountBucket = 'unknown' | '1' | '2_3' | '4_plus'

export type InlinePricingDecision = {
  eligible: boolean
  layout: 'legacy' | 'focused'
  completedCountBucket: CompletedCountBucket
}

const ALLOWED_LAYOUTS = new Set<InlinePricingLayout>(['legacy', 'focused', 'expanded'])
const ALLOWED_BUCKETS = new Set<CompletedCountBucket>(['unknown', '1', '2_3', '4_plus'])

export function decideInlinePricingLayout(input: {
  historyReliable: unknown
  completedCount: unknown
}): InlinePricingDecision {
  if (
    input.historyReliable !== true ||
    typeof input.completedCount !== 'number' ||
    !Number.isInteger(input.completedCount) ||
    input.completedCount < 1
  ) {
    return {
      eligible: false,
      layout: 'legacy',
      completedCountBucket: 'unknown',
    }
  }

  const completedCountBucket: CompletedCountBucket = input.completedCount === 1
    ? '1'
    : input.completedCount <= 3
      ? '2_3'
      : '4_plus'

  return {
    eligible: true,
    layout: 'focused',
    completedCountBucket,
  }
}

export function buildInlinePricingDecisionMetadata(input: {
  layout: unknown
  completedCountBucket: unknown
}): {
  decision_version: typeof INLINE_PRICING_RETURNING_FOCUS_VERSION
  decision_layout: InlinePricingLayout
  completed_count_bucket: CompletedCountBucket
  pricing_surface: 'generate_step_1'
} | null {
  if (
    typeof input.layout !== 'string' ||
    !ALLOWED_LAYOUTS.has(input.layout as InlinePricingLayout) ||
    typeof input.completedCountBucket !== 'string' ||
    !ALLOWED_BUCKETS.has(input.completedCountBucket as CompletedCountBucket)
  ) {
    return null
  }

  return {
    decision_version: INLINE_PRICING_RETURNING_FOCUS_VERSION,
    decision_layout: input.layout as InlinePricingLayout,
    completed_count_bucket: input.completedCountBucket as CompletedCountBucket,
    pricing_surface: 'generate_step_1',
  }
}

// Experiment gate (count people, never raw events): keep the variant untouched
// until 10 external signed-in people have a stored viewport-qualified viewed
// event. Stop immediately if the displayed tier or price diverges from the
// checkout, and revert after the gate if there is no downstream action.
export const INLINE_PRICING_RETURNING_FOCUS_GATE = {
  minimumExternalVisiblePeople: 10,
  viewportRatio: 0.35,
  stopOnCheckoutDivergence: true,
} as const
