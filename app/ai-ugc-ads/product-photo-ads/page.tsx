import { notFound } from 'next/navigation'
import { ProductPhotoAdsPage, productPhotoAdsMetadata } from '@/components/ugc/UgcPages'
import { CITATION_PAGES_RELEASE } from '@/lib/growth/citationPagesRelease'
import InternalCitationPreview from '@/components/seo/InternalCitationPreview'

export const dynamic = 'auto'
export function generateMetadata() {
  return CITATION_PAGES_RELEASE === 'public' ? productPhotoAdsMetadata() : { robots: { index: false, follow: false } }
}
export default function Page() {
  if (CITATION_PAGES_RELEASE === 'off') notFound()
  const page = <ProductPhotoAdsPage />
  return CITATION_PAGES_RELEASE === 'internal' ? <InternalCitationPreview>{page}</InternalCitationPreview> : page
}
