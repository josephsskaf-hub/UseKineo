import type { Metadata } from 'next'
import AffiliateLegacyRouterClient from './AffiliateLegacyRouterClient'

export const metadata: Metadata = {
  title: 'Choose your Kineo path',
  description: 'Choose the Kineo starting point that matches what you need to create.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function AffiliateStartPage() {
  return <AffiliateLegacyRouterClient />
}
