// KINEO-JUNTA-TRENDING-3110 — fundador 30/10 ("juntar sim"): o Trending virou o topo da página Made with Kineo (os mesmos blocos,
// lib/trending/trendingNow.ts). Este endereço continua vivo para links antigos e para o Google: redireciona de vez (308).
// Histórico: KINEO-TRENDING-2026-10-13 — /trending, "🔥 Trending now", pedida pelo fundador em 13/10.
import { permanentRedirect } from 'next/navigation'
import { MADE_WITH_KINEO_HREF } from '@/lib/homeGaleria'

export default function TrendingPage(): never {
  permanentRedirect(MADE_WITH_KINEO_HREF)
}
