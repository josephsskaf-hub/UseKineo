// KINEO-PAGINAS-UGC-2010 — /ai-black-friday-video-ads: o Kit Black Friday do Studio Ads (EN; par PT em /anuncios-black-friday-com-ia).
import { BlackFridayPage, bfMetadata } from '@/components/ugc/UgcPages'

export const dynamic = 'force-static'
export const metadata = bfMetadata('en')

export default function Page() {
  return <BlackFridayPage lang="en" />
}
