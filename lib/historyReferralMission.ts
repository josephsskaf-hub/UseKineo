export const HISTORY_REFERRAL_MISSION_VARIANT = 'history_referral_mission_v1'

export type HistoryReferralMissionCopy = {
  eyebrow: string
  headline: string
  description: string
  primaryAction: string
  whatsappMessage: string
  privacyNote: string
}

export function normalizeReferralRewardCredits(value: unknown): number | null {
  const credits = Number(value)
  if (!Number.isSafeInteger(credits) || credits <= 0 || credits > 1000) return null
  return credits
}

export function normalizeReferralInviteUrl(value: unknown, referralCode: string): string | null {
  if (typeof value !== 'string' || !/^[A-HJ-NP-Z2-9]{8}$/.test(referralCode)) return null
  try {
    const url = new URL(value)
    const queryKeys = [...url.searchParams.keys()]
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'www.usekineo.com' ||
      url.port || url.username || url.password || url.hash ||
      url.pathname !== '/' ||
      queryKeys.length !== 1 || queryKeys[0] !== 'ref' ||
      url.searchParams.get('ref') !== referralCode
    ) return null
    return url.toString()
  } catch {
    return null
  }
}

export function historyReferralMissionCopy(
  rewardCredits: number,
): HistoryReferralMissionCopy {
  return {
    eyebrow: `Give ${rewardCredits} credits · Get ${rewardCredits} credits`,
    headline: 'Invite one creator. Keep your video private.',
    description: `Share only your Kineo invite link. If a qualifying friend signs up and finishes their first video, you can both receive ${rewardCredits} credits.`,
    primaryAction: 'Invite on WhatsApp',
    whatsappMessage: `I made a Short with Kineo. Want to try it? Sign up here and, after your first video qualifies, we can both receive ${rewardCredits} Kineo credits:`,
    privacyNote: 'This shares only your Kineo invite link. Your video stays private, and nothing is sent until you choose a person.',
  }
}
