import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ClientVideoBriefGenerator from './ClientVideoBriefGenerator'

const CANONICAL = 'https://www.usekineo.com/client-video-brief-generator'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Free Client Video Brief Generator for Short-Form Agencies | Kineo',
  description:
    'Turn a client offer, audience, goal, proof and CTA into a clear 35-second faceless video brief. Free, no signup, email or card.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Build a client-ready Short video brief in minutes',
    description: 'A free, no-signup brief builder for agencies, freelancers and business teams creating vertical client videos.',
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/og-agency-card.png', width: 1200, height: 630, alt: 'Kineo client Short video brief generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free client Short video brief generator',
    description: 'Turn five client inputs into a structured 35-second faceless video brief.',
    images: ['/og-agency-card.png'],
  },
}

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kineo Client Video Brief Generator',
    url: CANONICAL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A free no-signup tool that turns client inputs into a structured 35-second faceless Short video brief.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What should a short-form video brief include?',
        acceptedAnswer: { '@type': 'Answer', text: 'A useful short-form brief names the audience, objective, opening tension, story beats, visual direction, verified proof, call to action and approval boundaries.' },
      },
      {
        '@type': 'Question',
        name: 'Does this free tool render the finished video?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. It creates an editable text brief in the browser. You can copy it for a client or carry it into Kineo to create a finished faceless vertical video.' },
      },
    ],
  },
]

export default function ClientVideoBriefGeneratorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <ClientVideoBriefGenerator />
      <Footer />
    </>
  )
}
