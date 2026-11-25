import { notFound } from 'next/navigation'
import IntentPage from '@/app/ai-video-generator/for/[slug]/page'
import { citationReleaseForSlug, isCitationDraftSlug } from '@/lib/growth/citationPagesRelease'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default function CitationFormatPreview({ params }: { params: { slug: string } }) {
  if (citationReleaseForSlug(params.slug) !== 'internal' || !isCitationDraftSlug(params.slug)) notFound()
  // IntentPage applies InternalCitationPreview, which verifies the session on the server.
  return <IntentPage params={params} />
}
