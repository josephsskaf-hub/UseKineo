// KINEO-PAGINAS-LOTE1-2026-10-12 — página do lote 1 (textos em lib/seo/paginasLote1.ts, molde em components/Lote1Landing.tsx).
import Lote1Landing, { lote1LandingMetadata } from '@/components/Lote1Landing'

export const dynamic = 'force-static'
export const metadata = lote1LandingMetadata('generador-de-videos-de-terror')

export default function Page() {
  return <Lote1Landing pageKey="generador-de-videos-de-terror" />
}
