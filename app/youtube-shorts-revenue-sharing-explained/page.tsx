// KINEO-PAGINAS-IA-0111 — artigo de dinheiro para o Bing: como o YouTube divide a receita dos Shorts (Creator Pool, música,
// engaged views, a fatia do criador), da política oficial lida em 01/11/2026. Texto em lib/seo/paginasIa0111.ts.
import ArtigoDinheiro0111, { artigoDinheiroMetadata } from '@/components/seo/ArtigoDinheiro0111'

const PATH = '/youtube-shorts-revenue-sharing-explained'
export const dynamic = 'force-static'
export const metadata = artigoDinheiroMetadata(PATH)

export default function YoutubeShortsRevenueSharingPage() {
  return <ArtigoDinheiro0111 path={PATH} />
}
