import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'

import { RECREATE_RELEASE, SERIES_RELEASE, type InternalRelease } from './release'
export { RECREATE_RELEASE, SERIES_RELEASE, RECREATE_MOTION_ENABLED, type InternalRelease } from './release'

// Visibility only: recreateSession still requires an authenticated user for every API and private asset.
// Metric exclusion patterns such as test% are NOT an authorization allowlist in internal mode.
export function releaseVisible(email: string | null | undefined, release: InternalRelease): boolean {
  return release === 'public' || (release === 'internal' && !!email && INTERNAL_EXACT_EMAILS.includes(email.trim().toLowerCase()))
}
export const recreateVisible = (email?: string | null) => releaseVisible(email, RECREATE_RELEASE)
export const seriesVisible = (email?: string | null) => releaseVisible(email, SERIES_RELEASE)
