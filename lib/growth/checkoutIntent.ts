export const CHECKOUT_INTENT_CLASSIFIER_VERSION = 'checkout-intent-v1'

export type CheckoutIntentClass =
  | 'desire'
  | 'ready_script'
  | 'activation_defect'
  | 'unknown'

export type CheckoutIntentEvidence = {
  videosOk: number | null
  creditsIntact: boolean | null
  hadFinishedScript: boolean | null
}

export function classifyCheckoutIntent(
  evidence: CheckoutIntentEvidence,
): CheckoutIntentClass {
  if (typeof evidence.videosOk === 'number' && evidence.videosOk > 0) return 'desire'
  if (evidence.videosOk === 0 && evidence.hadFinishedScript === true) return 'ready_script'
  if (
    evidence.videosOk === 0 &&
    evidence.hadFinishedScript === false &&
    evidence.creditsIntact === true
  ) {
    return 'activation_defect'
  }
  return 'unknown'
}

export function checkoutIntentMetadata(evidence: CheckoutIntentEvidence) {
  return {
    checkout_intent_class: classifyCheckoutIntent(evidence),
    checkout_intent_classifier: CHECKOUT_INTENT_CLASSIFIER_VERSION,
    videos_ok: evidence.videosOk,
    credits_intact: evidence.creditsIntact,
    had_finished_script: evidence.hadFinishedScript,
  }
}
