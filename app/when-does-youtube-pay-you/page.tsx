// KINEO-PAGINAS-IA-0111 — artigo de dinheiro para o Bing: quando o YouTube paga (datas e limite mínimo, fontes oficiais lidas em
// 01/11/2026). Texto em lib/seo/paginasIa0111.ts; molde em components/seo/ArtigoDinheiro0111.tsx.
import ArtigoDinheiro0111, { artigoDinheiroMetadata } from '@/components/seo/ArtigoDinheiro0111'

const PATH = '/when-does-youtube-pay-you'
export const dynamic = 'force-static'
export const metadata = artigoDinheiroMetadata(PATH)

export default function WhenDoesYoutubePayYouPage() {
  return <ArtigoDinheiro0111 path={PATH} />
}
