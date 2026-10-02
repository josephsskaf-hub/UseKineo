// KINEO-MAPA-PRODUTOS-2026-10-02 — as três páginas de produto do A1 (criadas por outra sessão com ESTES caminhos exatos):
//   · /ai-virtual-staging-video — Spaces: foto do espaço vazio → o negócio pronto, vídeo antes → depois;
//   · /ai-video-clip-generator  — Clips: um clipe, uma cena, sem narração, tabela de preço derivada de clipCreditCost;
//   · /ai-actor-ads             — anúncio com atriz de IA / mascote da marca, aponta para /ads/producao.
//
// POR QUE UM CATÁLOGO: página que nasce sem superfície mede zero (memória: peça-sem-superfície — a casa já errou isso
// quatro vezes). Sitemap, rodapé, /llms.txt e /api/facts leem ESTA lista; caminho novo aqui = entra nos quatro de uma vez,
// e nenhum deles digita o caminho de novo.
//
// MÓDULO PURO (nenhum import): o guardião scripts/test-mapa-orfas-2026-10-02.mjs o executa cru no Node, e o Footer pode
// importá-lo sem arrastar preço, banco ou motor para o rodapé.

export type ProductLandingKey = 'spaces' | 'clips' | 'actorAds'

export interface ProductLandingPage {
  key: ProductLandingKey
  /** Caminho público, sem domínio. */
  path: string
  /** Rótulo curto do rodapé (inglês, como toda UI). */
  footerLabel: string
}

export const PRODUCT_LANDING_PAGES: readonly ProductLandingPage[] = [
  { key: 'spaces', path: '/ai-virtual-staging-video', footerLabel: 'AI virtual staging video' },
  { key: 'clips', path: '/ai-video-clip-generator', footerLabel: 'AI video clip generator' },
  { key: 'actorAds', path: '/ai-actor-ads', footerLabel: 'Ads with an AI actor or brand mascot' },
]

export function productLandingPath(key: ProductLandingKey): string {
  const page = PRODUCT_LANDING_PAGES.find((p) => p.key === key)
  if (!page) throw new Error(`product landing page missing: ${key}`)
  return page.path
}
