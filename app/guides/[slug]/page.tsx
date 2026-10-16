// KINEO-GUIAS-IA-1610 — /guides/<slug>: as guias do GPT de 16/10/2026 conferidas contra o código (lib/growth/guiasIa1610.ts).
import { notFound } from 'next/navigation'
import GuiaIaPage, { guiaIaMetadata } from '@/components/GuiaIaPage'
import { GUIAS_IA } from '@/lib/growth/guiasIa1610'
import { GUIAS_IA_SLUGS, type GuiaIaSlug } from '@/lib/seo/guiasIa1610Paths'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return GUIAS_IA_SLUGS.map((slug) => ({ slug }))
}

const find = (slug: string) => (GUIAS_IA_SLUGS as readonly string[]).includes(slug) ? GUIAS_IA[slug as GuiaIaSlug] : undefined

export function generateMetadata({ params }: { params: { slug: string } }) {
  const guide = find(params.slug)
  return guide ? guiaIaMetadata(guide) : { title: 'Page not found', robots: { index: false, follow: false } }
}

export default function Page({ params }: { params: { slug: string } }) {
  const guide = find(params.slug)
  if (!guide) notFound()
  return <GuiaIaPage guide={guide} />
}
