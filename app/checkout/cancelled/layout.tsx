
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { checkoutSavedPlanVisible } from '@/lib/growth/checkoutSavedPlanRelease'
import { SavedPlanReleaseProvider } from '@/components/checkout/SavedPlanActions'

export default async function CheckoutCancelledLayout({ children }: { children: ReactNode }) {
  const enabled = await checkoutSavedPlanVisible(async () => (await createClient().auth.getUser()).data.user?.email ?? null)
  return enabled ? <SavedPlanReleaseProvider>{children}</SavedPlanReleaseProvider> : children
}
