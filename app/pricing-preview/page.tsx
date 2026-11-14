import type { Metadata } from 'next'
import PricingClient from '@/app/pricing/PricingClient'
import { pricingBillingHandoff } from '@/lib/growth/pricingPlanChoiceAttribution'

export const metadata: Metadata = {
  title: 'Kineo pricing · option A preview',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: 'https://www.usekineo.com/pricing' },
}

export default function PricingPreviewPage({ searchParams = {} }: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const handoff = pricingBillingHandoff(searchParams)
  return <PricingClient key={handoff.key} initialBilling={handoff.initialBilling} watchPreview />
}
