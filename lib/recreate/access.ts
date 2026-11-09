import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'

// Founder 09/11/2026: "Sim para as 5", decision 5. No public rollout authorized.
export type InternalRelease = 'off' | 'internal' | 'public'
export const RECREATE_RELEASE: InternalRelease = 'internal'
export const SERIES_RELEASE: InternalRelease = 'internal'
export const RECREATE_MOTION_ENABLED = false

// Metric exclusion patterns such as test% are NOT an authorization allowlist.
export function releaseVisible(email: string | null | undefined, release: InternalRelease): boolean {
  return release === 'public' || (release === 'internal' && !!email && INTERNAL_EXACT_EMAILS.includes(email.trim().toLowerCase()))
}
export const recreateVisible = (email?: string | null) => releaseVisible(email, RECREATE_RELEASE)
export const seriesVisible = (email?: string | null) => releaseVisible(email, SERIES_RELEASE)
