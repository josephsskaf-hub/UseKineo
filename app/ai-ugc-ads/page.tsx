// KINEO-PAGINAS-UGC-2010 — /ai-ugc-ads: a página pilar do AI UGC Ads (EN; par PT em /anuncios-ugc-com-ia, hreflang nos dois).
import { UgcPillarPage, ugcPillarMetadata } from '@/components/ugc/UgcPages'

export const dynamic = 'force-static'
export const metadata = ugcPillarMetadata('en')

export default function Page() {
  return <UgcPillarPage lang="en" />
}
