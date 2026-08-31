export const HOME_ONE_VIDEO_RETURN_VERSION = 'home_one_video_return_v1' as const
export const HOME_ONE_VIDEO_RETURN_HREF = '/history' as const

export type HomeOneVideoReturnInput = {
  signedIn: boolean
  historyReliable: boolean
  completedCount: number | null
  isPro: boolean
  plan: string | null
}

export type HomeOneVideoReturnDecision =
  | { eligible: false; reason: 'anonymous' | 'subscriber' | 'history_unavailable' | 'not_one_video' }
  | {
      eligible: true
      completedCountBucket: '1'
      destination: 'history_milestone'
      href: typeof HOME_ONE_VIDEO_RETURN_HREF
      version: typeof HOME_ONE_VIDEO_RETURN_VERSION
    }

export function decideHomeOneVideoReturn(input: HomeOneVideoReturnInput): HomeOneVideoReturnDecision {
  if (!input.signedIn) return { eligible: false, reason: 'anonymous' }

  const normalizedPlan = (input.plan ?? '').trim().toLowerCase()
  if (input.isPro || (normalizedPlan !== '' && normalizedPlan !== 'free')) {
    return { eligible: false, reason: 'subscriber' }
  }

  if (!input.historyReliable || !Number.isInteger(input.completedCount) || (input.completedCount ?? -1) < 0) {
    return { eligible: false, reason: 'history_unavailable' }
  }
  if (input.completedCount !== 1) return { eligible: false, reason: 'not_one_video' }

  return {
    eligible: true,
    completedCountBucket: '1',
    destination: 'history_milestone',
    href: HOME_ONE_VIDEO_RETURN_HREF,
    version: HOME_ONE_VIDEO_RETURN_VERSION,
  }
}
