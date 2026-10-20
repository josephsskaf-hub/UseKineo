// KINEO-PAGINAS-UGC-2010 — /ai-ugc-ads/for/<nicho>: os 12 nichos de e-commerce, cada um com ângulo, roteiro e formatos próprios.
import { notFound } from 'next/navigation'
import { UgcNichePage, ugcNicheMetadata } from '@/components/ugc/UgcPages'
import { UGC_NICHE_SLUGS, isUgcNicheSlug } from '@/lib/seo/paginasUgc2010'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return UGC_NICHE_SLUGS.map((niche) => ({ niche }))
}

export function generateMetadata({ params }: { params: { niche: string } }) {
  return isUgcNicheSlug(params.niche) ? ugcNicheMetadata(params.niche) : { title: 'Page not found', robots: { index: false, follow: false } }
}

export default function Page({ params }: { params: { niche: string } }) {
  if (!isUgcNicheSlug(params.niche)) notFound()
  return <UgcNichePage slug={params.niche} />
}
