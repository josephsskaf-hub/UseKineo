import 'server-only'

import { releaseVisible } from '@/lib/recreate/access'
import type { InternalRelease } from '@/lib/recreate/release'
import { createClient } from '@/lib/supabase/server'

export const PRICING_PLAN_ENTRY_RELEASE = 'off' as InternalRelease

export function pricingPlanEntryVisible(email: string | null, release: InternalRelease = PRICING_PLAN_ENTRY_RELEASE) {
  return releaseVisible(email, release)
}

export async function pricingPlanEntryForViewer(readEmail = async () => (await createClient().auth.getUser()).data.user?.email ?? null) {
  try {
    return pricingPlanEntryVisible(await readEmail())
  } catch {
    return false
  }
}
