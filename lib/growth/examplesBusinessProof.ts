export const EXAMPLES_BUSINESS_PROOF_VERSION = 'examples_business_proof_bridge_v1'

export const EXAMPLES_BUSINESS_PROOF_DESTINATION =
  '/ai-shorts-for-agencies#agency-pack-heading'

export const EXAMPLES_BUSINESS_PROOF_VIEW_MARKER =
  `kineo:${EXAMPLES_BUSINESS_PROOF_VERSION}:viewed`

export const EXAMPLES_BUSINESS_PROOF_CLICK_MARKER =
  `kineo:${EXAMPLES_BUSINESS_PROOF_VERSION}:clicked`

export const EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO = 0.5

export function examplesBusinessProofMetadata() {
  return {
    version: EXAMPLES_BUSINESS_PROOF_VERSION,
    surface: 'examples_index',
    placement: 'after_creator_cta',
    destination: 'agency_packs',
  } as const
}

export function isExamplesBusinessProofDestination(href: unknown): boolean {
  return href === EXAMPLES_BUSINESS_PROOF_DESTINATION
}

export function examplesBusinessProofViewSettlement(stored: boolean) {
  return stored ? 'recorded' : 'retryable'
}
