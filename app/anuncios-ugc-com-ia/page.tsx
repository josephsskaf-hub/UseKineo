// KINEO-PAGINAS-UGC-2010 — /anuncios-ugc-com-ia: a pilar do AI UGC Ads em português (par EN em /ai-ugc-ads, hreflang nos dois).
import { UgcPillarPage, ugcPillarMetadata } from '@/components/ugc/UgcPages'

export const dynamic = 'force-static'
export const metadata = ugcPillarMetadata('pt')

export default function Page() {
  return <UgcPillarPage lang="pt" />
}
