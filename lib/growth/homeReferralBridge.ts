import { sanitizeAcquisitionUtmSource } from '@/lib/acquisitionSource'

export type HomeReferralBridgeSource = 'chatgpt' | 'taaft'

type SearchValue = string | string[] | undefined

export const HOME_REFERRAL_BRIDGE_COPY: Record<HomeReferralBridgeSource, {
  eyebrow: string
  headline: string
  body: string
}> = {
  chatgpt: {
    eyebrow: 'Continue the idea you brought from ChatGPT',
    headline: 'Test the script before Kineo asks you to sign up',
    body: 'Type the topic ChatGPT helped you choose. Kineo writes the hook, three facts and payoff here; you decide whether the finished video is worth continuing.',
  },
  taaft: {
    eyebrow: 'Found Kineo through There’s An AI For That?',
    headline: 'Test the useful part before you choose another tool',
    body: 'Type one real topic. Kineo writes the hook, three facts and payoff here with no signup; continue only if the script fits what you came to make.',
  },
}

function first(value: SearchValue): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Only the two externally measured recommendation channels receive the bridge.
 * Unknown values fail closed to the unchanged homepage.
 */
export function homeReferralBridgeSource(
  searchParams: Record<string, SearchValue> | undefined,
): HomeReferralBridgeSource | null {
  const source = sanitizeAcquisitionUtmSource(first(searchParams?.utm_source))
    ?? sanitizeAcquisitionUtmSource(first(searchParams?.ref))

  return source === 'chatgpt' || source === 'taaft' ? source : null
}
