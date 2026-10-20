// KINEO-PAGINAS-UGC-2010 — /anuncios-black-friday-com-ia: o Kit Black Friday em português (par EN em /ai-black-friday-video-ads).
import { BlackFridayPage, bfMetadata } from '@/components/ugc/UgcPages'

export const dynamic = 'force-static'
export const metadata = bfMetadata('pt')

export default function Page() {
  return <BlackFridayPage lang="pt" />
}
