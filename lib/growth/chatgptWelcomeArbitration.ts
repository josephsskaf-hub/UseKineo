import { TRIAL_FIRST_DELIVERY_VERSION } from '@/lib/growth/trialBalanceBridge'

export const CHATGPT_WELCOME_SUPPRESSION_REASON = 'trial_first_delivery_intent' as const

export type ChatGptWelcomeDecisionReason =
  | typeof CHATGPT_WELCOME_SUPPRESSION_REASON
  | 'dismissed'
  | 'not_chatgpt_first_touch'
  | 'eligible'
  | 'already_recorded'

export type ChatGptWelcomeDecision = {
  visible: boolean
  recordShown: boolean
  reason: ChatGptWelcomeDecisionReason
}

export type ChatGptWelcomeDecisionInput = {
  intentCampaign: string | null | undefined
  dismissed: boolean
  firstTouchIsChatGpt: boolean
  shownAlready: boolean
}

/**
 * Gives an explicit first-delivery mission ownership of the current route.
 *
 * Suppression is deliberately route-scoped: it does not write the Quickstart
 * dismissal key, so a normal dashboard route remains eligible later. The
 * exact shared campaign constant prevents the two acquisition experiments
 * from silently drifting apart.
 */
export function decideChatGptWelcome(
  input: ChatGptWelcomeDecisionInput,
): ChatGptWelcomeDecision {
  if (input.intentCampaign === TRIAL_FIRST_DELIVERY_VERSION) {
    return {
      visible: false,
      recordShown: false,
      reason: CHATGPT_WELCOME_SUPPRESSION_REASON,
    }
  }
  if (input.dismissed) {
    return { visible: false, recordShown: false, reason: 'dismissed' }
  }
  if (!input.firstTouchIsChatGpt) {
    return { visible: false, recordShown: false, reason: 'not_chatgpt_first_touch' }
  }
  if (input.shownAlready) {
    return { visible: true, recordShown: false, reason: 'already_recorded' }
  }
  return { visible: true, recordShown: true, reason: 'eligible' }
}

export function trialFirstDeliveryOwnsRoute(
  intentCampaign: string | null | undefined,
): boolean {
  return intentCampaign === TRIAL_FIRST_DELIVERY_VERSION
}
