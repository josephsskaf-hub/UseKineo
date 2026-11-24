
import 'server-only'
import { releaseVisible } from '@/lib/recreate/access'
import type { InternalRelease } from '@/lib/recreate/release'

export const CHECKOUT_SAVED_PLAN_RELEASE: InternalRelease = 'off'

export async function checkoutSavedPlanVisible(
  readEmail: () => Promise<string | null>,
  release: InternalRelease = CHECKOUT_SAVED_PLAN_RELEASE,
): Promise<boolean> {
  if (release !== 'internal') return releaseVisible(null, release)
  try {
    return releaseVisible(await readEmail(), release)
  } catch {
    return false
  }
}
