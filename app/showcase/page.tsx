import type { Metadata } from 'next'
import ShowcaseClient from './ShowcaseClient'
import { notFound } from 'next/navigation'
import { SHOWCASE_PUBLIC } from '@/lib/showcaseTelemetry'

const title = 'Kineo Showcase — Films, Images, Spaces & Ads'
const description = 'Everything here was made on Kineo — from one sentence or a few photos. Explore films, campaign images, space transformations and product ads.'
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: 'https://www.usekineo.com/showcase' },
  openGraph: { title, description, url: 'https://www.usekineo.com/showcase', type: 'website',
    images: [{ url: 'https://www.usekineo.com/showcase-og.jpg', width: 1200, height: 630, alt: 'Kineo Showcase — Films, Images, Spaces & Ads' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['https://www.usekineo.com/showcase-og.jpg'] },
}

export default function ShowcasePage() {
  if (!SHOWCASE_PUBLIC) notFound()
  return <ShowcaseClient />
}
