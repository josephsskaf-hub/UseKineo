// KINEO-PAGINAS-UGC-2010 — /ai-ugc-video-generator: o termo de busca alternativo, com texto próprio e curto que leva à pilar.
import { UgcGeneratorPage, ugcGeneratorMetadata } from '@/components/ugc/UgcPages'

export const dynamic = 'force-static'
export const metadata = ugcGeneratorMetadata()

export default function Page() {
  return <UgcGeneratorPage />
}
