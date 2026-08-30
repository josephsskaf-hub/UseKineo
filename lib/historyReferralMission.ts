export const HISTORY_REFERRAL_MISSION_VARIANT = 'history_referral_mission_v1'
export const PRIVATE_FILE_SHARE_REFERRAL_VARIANT = 'native_file_share_referral_v2'

export type HistoryReferralMissionCopy = {
  eyebrow: string
  headline: string
  description: string
  primaryAction: string
  whatsappMessage: string
  privacyNote: string
}

export type PrivateFileShareReferral = {
  code: string
  inviteUrl: string
  rewardCredits: number
  eyebrow: string
  headline: string
  description: string
  shareText: string
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

/**
 * Resolves the referral payload used beside the private MP4 share action.
 *
 * The API remains the only reward/link source. Invalid, mismatched or
 * non-canonical data fails closed to the existing private-file-only flow.
 */
export function privateFileShareReferral(input: {
  code: unknown
  inviteUrl: unknown
  rewardCredits: unknown
}): PrivateFileShareReferral | null {
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : ''
  const rewardCredits = normalizeReferralRewardCredits(input.rewardCredits)
  const inviteUrl = normalizeReferralInviteUrl(input.inviteUrl, code)
  if (!inviteUrl || rewardCredits === null) return null

  return {
    code,
    inviteUrl,
    rewardCredits,
    eyebrow: `Private MP4 · ${rewardCredits} credits each`,
    headline: 'Share your MP4. Invite one creator too.',
    description: `The video stays a direct file. Your Kineo invite goes in the message; after their first video qualifies, you can both receive ${rewardCredits} credits.`,
    shareText: `I made this Short with Kineo. Want to try it? After your first video qualifies, we can both receive ${rewardCredits} Kineo credits: ${inviteUrl}`,
  }
}
