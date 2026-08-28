import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ProductToVideoClient from './ProductToVideoClient'

const CANONICAL = 'https://www.usekineo.com/product-to-video-script'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Free Product Video Ad Script Generator — No Signup | Kineo',
  description: 'Turn verified product facts into a 35-second faceless video ad script free. Hook, problem, product, proof and CTA — no signup or invented claims.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Turn product facts into a faceless video ad script',
    description: 'Get a fact-bounded product Short script free, then carry it into a finished faceless video.',
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo free product video ad script generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free product video ad script generator',
    description: 'Paste verified product facts. Get a hook-to-CTA faceless Short script without invented claims.',
    images: ['/og-card.png'],
  },
}

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kineo Product Video Ad Script Generator',
    url: CANONICAL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A free no-signup tool that turns verified product facts into a structured faceless Short ad script.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does this tool read a product URL?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. Paste the verified facts or product-page text you want the script to use. The tool does not scrape a URL or invent missing product information.' },
      },
      {
        '@type': 'Question',
        name: 'Does the free tool create the finished product video?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. It creates a text script. A Kineo account is required to add voiceover, visuals, captions and render a finished faceless video.' },
      },
    ],
  },
]

export default function ProductToVideoScriptPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <ProductToVideoClient />
      <Footer />
    </>
  )
}
