import type { ReactNode } from 'react'
import { PricingPlanEntryProvider } from '@/components/pricing/PricingPlanEntry'
import { PRICING_PLAN_ENTRY_RELEASE, pricingPlanEntryForViewer } from '@/lib/growth/pricingPlanEntryRelease'

export default function PricingLayout({ children }: { children: ReactNode }) {
  if (PRICING_PLAN_ENTRY_RELEASE === 'off') return children
  if (PRICING_PLAN_ENTRY_RELEASE === 'public') {
    return <PricingPlanEntryProvider visible>{children}</PricingPlanEntryProvider>
  }
  return pricingPlanEntryForViewer().then(visible => (
    <PricingPlanEntryProvider visible={visible}>{children}</PricingPlanEntryProvider>
  ))
}
