import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import BusinessContentPlanClient from './BusinessContentPlanClient'
import {
  affiliateLandingContext,
  type PublicSearchParams,
} from '@/lib/growth/affiliateLandingContext'

const CANONICAL = 'https://www.usekineo.com/business-video-content-plan'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Free Business Video Content Planner — Weekly Shorts Plan | Kineo',
  description: 'Build a free weekly business video plan from your offer, audience, goal and publishing cadence. Get concrete Short angles before signup.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Build a weekly video content plan for your business',
    description: 'Turn one business goal into a week of evidence-bounded Short ideas, free and without signup.',
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo business video content planner' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free weekly business video content planner',
    description: 'Offer + audience + goal + cadence → a practical week of Short ideas.',
    images: ['/og-card.png'],
  },
}

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kineo Business Video Content Planner',
    url: CANONICAL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A free no-signup planner that maps a business goal and cadence into a weekly Short-form video plan.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does this planner schedule or publish social posts?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. It creates a weekly content plan. Kineo can create videos from the ideas, but this planner does not schedule or publish posts.' },
      },
      {
        '@type': 'Question',
        name: 'Does it research product claims or customer proof?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. The plan identifies the evidence each video needs. The business must provide and verify every claim, result, quote and limitation.' },
      },
    ],
  },
]

export default function BusinessVideoContentPlanPage({ searchParams }: { searchParams?: PublicSearchParams }) {
  const partnerContext = affiliateLandingContext(searchParams, 'business')
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <BusinessContentPlanClient affiliateContext={partnerContext} />
      <Footer showStats={false} />
    </>
  )
}
