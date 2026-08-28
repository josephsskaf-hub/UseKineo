// PUSH #39 — crawlable acquisition page with auth-safe topic handoff.
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getViralNowTopics } from '@/lib/viralTopics'
import ViralNowClient from './ViralNowClient'

const VIRAL_NOW_URL = 'https://www.usekineo.com/viral-now'
// Search Console, 28/08/2026 (01/07-26/08): the exact query `#viralnow`
// already reaches this URL at position 14.5 (11 impressions, 0 clicks). Match
// the query in the snippet without claiming live trend detection: the source
// below is a curated catalogue rotated deterministically every four hours.
const TITLE = '#ViralNow: 8 YouTube Shorts Ideas to Post Today | Kineo'
const DESCRIPTION =
  'Browse 8 ready-to-create YouTube Shorts ideas, rotated every 4 hours from Kineo’s curated library. Pick one and keep it through signup—no card required.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: VIRAL_NOW_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: VIRAL_NOW_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default async function ViralNowPage() {
  const supabase = createClient()
  const [{ data: { user } }, topics] = await Promise.all([
    supabase.auth.getUser(),
    Promise.resolve(getViralNowTopics()),
  ])
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '#ViralNow: 8 YouTube Shorts ideas to post today',
    alternateName: ['Viral Now', 'Viral Now YouTube Shorts ideas'],
    description: DESCRIPTION,
    numberOfItems: topics.length,
    itemListElement: topics.map((topic, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'CreativeWork',
        name: topic.title,
        description: topic.description,
        url: `${VIRAL_NOW_URL}#topic-${topic.id}`,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }}
      />
      <ViralNowClient isLoggedIn={Boolean(user)} initialTopics={topics} />
    </>
  )
}
