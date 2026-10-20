// KINEO-BEBE-QUE-FALA-2010 — /desenho-infantil-3d-com-ia: a página do AI Kids Cartoon Stories em português (par EN em /ai-kids-cartoon-videos).
// Atrás de KIDS_CARTOON_PAGES_LIVE: desligado = 404 (notFound) + noindex, e fora do sitemap/llms.txt.
import { notFound } from 'next/navigation'
import { KidsCartoonPage, kidsPageMetadata } from '@/components/kidsCartoon/KidsCartoonPages'
import { KIDS_CARTOON_PAGES_LIVE } from '@/lib/kidsCartoon/kidsCartoon'

export const dynamic = 'force-static'
export const metadata = kidsPageMetadata('pt')

export default function Page() {
  if (!KIDS_CARTOON_PAGES_LIVE) notFound()
  return <KidsCartoonPage lang="pt" />
}
