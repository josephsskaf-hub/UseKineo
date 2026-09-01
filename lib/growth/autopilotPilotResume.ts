export const AUTOPILOT_PILOT_RESUME_VERSION = 'one_time_pilot_resume_v1'
export const AUTOPILOT_PILOT_RESUME_VISIBLE_RATIO = 0.6
export const AUTOPILOT_PILOT_SESSION_COOKIE = 'kineo_autopilot_pilot_session'
export const AUTOPILOT_PILOT_DISMISSED_COOKIE = 'kineo_autopilot_pilot_resume_dismissed'
// Public boolean only: it contains no Session id, owner, price or destination.
// The client uses it to avoid a billing API request for every site visitor.
export const AUTOPILOT_PILOT_RESUME_HINT_COOKIE = 'kineo_autopilot_pilot_resume_hint'

export type AutopilotPilotResumeReason =
  | 'eligible'
  | 'wrong_mode'
  | 'wrong_product'
  | 'wrong_owner'
  | 'already_entitled'
  | 'already_settled'
  | 'invalid_amount'
  | 'offer_drift'

export type AutopilotPilotResumeDecision = {
  eligible: boolean
  reason: AutopilotPilotResumeReason
  canCreateInternalRetry: boolean
}

export function decideAutopilotPilotResume(input: {
  mode: string | null
  pack: string | null
  ownerUserId: string | null
  expectedUserId: string
  status: string | null
  paymentStatus: string | null
  alreadyEntitled: boolean
  currency: string | null
  amountTotal: number | null
  canonicalCurrency: string
  canonicalAmount: number
}): AutopilotPilotResumeDecision {
  if (input.mode !== 'payment') {
    return { eligible: false, reason: 'wrong_mode', canCreateInternalRetry: false }
  }
  if (input.pack !== 'autopilot_pilot') {
    return { eligible: false, reason: 'wrong_product', canCreateInternalRetry: false }
  }
  if (!input.ownerUserId || input.ownerUserId !== input.expectedUserId) {
    return { eligible: false, reason: 'wrong_owner', canCreateInternalRetry: false }
  }
  if (input.alreadyEntitled) {
    return { eligible: false, reason: 'already_entitled', canCreateInternalRetry: false }
  }
  if (input.status === 'complete' || input.paymentStatus === 'paid') {
    return { eligible: false, reason: 'already_settled', canCreateInternalRetry: false }
  }
  if (
    !input.currency ||
    !/^[a-z]{3}$/.test(input.currency) ||
    input.amountTotal === null ||
    !Number.isFinite(input.amountTotal) ||
    input.amountTotal < 0
  ) {
    return { eligible: false, reason: 'invalid_amount', canCreateInternalRetry: false }
  }

  if (
    input.currency !== input.canonicalCurrency ||
    input.amountTotal !== input.canonicalAmount
  ) {
    return { eligible: false, reason: 'offer_drift', canCreateInternalRetry: false }
  }

  return { eligible: true, reason: 'eligible', canCreateInternalRetry: true }
}

export function isAutopilotPilotResumeMeasurementHost(hostname: string): boolean {
  return hostname.trim().toLowerCase() === 'www.usekineo.com'
}

export function autopilotPilotResumeMetadata(destinationKind: string): Record<string, unknown> {
  return {
    variant: AUTOPILOT_PILOT_RESUME_VERSION,
    product: 'autopilot_pilot',
    purchase_type: 'one_time',
    surface: 'global_resume',
    destination_kind: destinationKind,
  }
}
