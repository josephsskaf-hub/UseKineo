// KINEO-BEBE-QUE-FALA-2010 — /ai-kids-cartoon-videos: a página do AI Kids Cartoon Stories (EN; par PT em /desenho-infantil-3d-com-ia).
// Atrás de KIDS_CARTOON_PAGES_LIVE: desligado = 404 (notFound) + noindex, e fora do sitemap/llms.txt.
import { notFound } from 'next/navigation'
import { KidsCartoonPage, kidsPageMetadata } from '@/components/kidsCartoon/KidsCartoonPages'
import { KIDS_CARTOON_PAGES_LIVE } from '@/lib/kidsCartoon/kidsCartoon'

export const dynamic = 'force-static'
export const metadata = kidsPageMetadata('en')

export default function Page() {
  if (!KIDS_CARTOON_PAGES_LIVE) notFound()
  return <KidsCartoonPage lang="en" />
}
