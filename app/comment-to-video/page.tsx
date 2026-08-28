import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import CommentToVideoClient from './CommentToVideoClient'
import { normalizeAudienceComment } from '@/lib/growth/commentToVideo'

const CANONICAL = 'https://www.usekineo.com/comment-to-video'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Comment to Video Script Generator — Free, No Signup | Kineo',
  description: 'Paste a viewer comment, customer FAQ or sales objection and get a hook-to-payoff Short response script free. No signup, email or card.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Turn a real comment into your next Short — free',
    description: 'Paste an audience question or customer objection. Get a structured response script you can turn into a Short.',
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo comment to Short script generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free comment-to-Short script generator',
    description: 'Turn one audience comment or customer FAQ into a hook-to-payoff response script.',
    images: ['/og-card.png'],
  },
}

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kineo Comment to Video Script Generator',
    url: CANONICAL,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A free, no-signup tool that turns an audience comment, customer FAQ or objection into a structured Short response script.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does the free comment-to-video tool make a finished video?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. It produces a text script. A Kineo account is required to add voiceover, visuals, captions and render the finished video.' },
      },
      {
        '@type': 'Question',
        name: 'Can I use a customer FAQ or sales objection?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Paste the exact question or objection. Review the generated draft and replace any placeholder with verified facts from your business before publishing.' },
      },
    ],
  },
]

type SearchParams = Record<string, string | string[] | undefined>

export default function CommentToVideoPage({ searchParams }: { searchParams?: SearchParams }) {
  const raw = Array.isArray(searchParams?.comment) ? searchParams?.comment[0] : searchParams?.comment
  const initialComment = normalizeAudienceComment(raw)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <CommentToVideoClient initialComment={initialComment} />
      <Footer />
    </>
  )
}
