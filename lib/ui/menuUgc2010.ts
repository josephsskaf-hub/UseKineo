// KINEO-MENU-UGC-2010 — o item "AI UGC Ads" no MENU DO TOPO do site (fundador 20/10: "o 2 no menu no topo, sim").
//
// POR QUÊ: "AI UGC ads" é o nome que o mercado busca (Arcads, Creatify, Higgsfield) e a página pilar /ai-ugc-ads nasceu em 20/10
// (KINEO-PAGINAS-UGC-2010) só com links de dentro da home/porta /ads. No topo ela fica a 1 clique de qualquer página pública.
//
// REGRAS FIXAS DO FUNDADOR: o menu do topo NUNCA encolhe — o item entra logo depois de "Product ads" e nenhum item existente sai, muda
// de ordem ou de nome; visual igual aos itens de texto de hoje (Trending/Pricing), sem preço. O rótulo "AI UGC Ads" já está traduzido
// nas 16 línguas em lib/ui/refinementCopy.json (chave dos 3 cards da home). Destino pela língua da interface — a mesma regra do link
// "How AI UGC ads work" dos 3 cards (components/home/HomeThreeCards.tsx): português → /anuncios-ugc-com-ia; o resto → /ai-ugc-ads.
//
// Módulo puro (só importa as rotas, que também são puras); o guardião scripts/test-menu-ugc-2010.mjs o executa num vm.
import { UGC_PILLAR_PATH, UGC_PILLAR_PT_PATH } from '@/lib/seo/paginasUgc2010'

export const MENU_UGC_2010_MARK = 'KINEO-MENU-UGC-2010'
/** Rótulo autoral (traduzido pelo UiLabel a partir do dicionário de refinamento). */
export const MENU_UGC_LABEL = 'AI UGC Ads'
/** Id do item no nav_item_clicked (lib/navTelemetry: "more:<id>" é aceito sem mexer no enum do contrato). */
export const MENU_UGC_NAV_ITEM = 'more:ugc'

/** Destino do item pela língua da interface: português vai à pilar em português; qualquer outra língua, à pilar em inglês. */
export function menuUgcHref(language: string | null | undefined): string {
  return language === 'pt' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH
}
