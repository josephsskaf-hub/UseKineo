// KINEO-HOME-REMODELA-2010 — a home e o menu do topo remodelados (fundador 20/10).
//
// O QUE O FUNDADOR PEDIU (palavras dele):
//   · "Os clips, eu quero dobrar o número de clips" — a faixa de Clipes passa de 4 para 8 cartões e aparece para TODO visitante
//     (antes só no braço clips_first do A/B), logo depois dos cards do topo. Nada de render novo: só prévias que já estão em
//     public/previews/ (efeitos do /clips + os 3 clipes de texto do antigo card "Clips").
//   · "No More Tools, eu quero extinguir esses cards… só quero colocar os exemplos deles, que estão muito bons, em algum outro
//     lugar" — a fileira de 4 cards (Claude · Ads · Clips · Nano Banana Pro) sai da home (o componente e as rotas ficam); os
//     clipes do card Clips entram na faixa de Clipes e a foto do card Nano Banana entra na galeria.
//   · "Imagens feitas pelo Kineo. Eu quero mais 10 fotos feitas pelo Kineo. 10 fotos boas que lembrem de ads." — a seção vira
//     "Images made by Kineo" com 10 fotos novas de anúncio de produto (Nano Banana Pro, conta do fundador, 20/10).
//   · Menu (20/10): "esses vão ser os quatro principais, e ao lado vai ser o MCP do Claude e do GPT… more tools a gente vai
//     cancelar" — topo = Make a film · Product ads · AI UGC Ads · AI Cartoon Videos · Claude & ChatGPT · Trending · Pricing.
//     O "More tools" sai (computador e celular); Images, Clips, Spaces e Examples seguem no ar pela URL e no rodapé.
//
// Módulo puro (sem import): o guardião scripts/test-home-remodela-2010.mjs o executa num vm.

export const HOME_REMODELA_2010_MARK = 'KINEO-HOME-REMODELA-2010'

/** 4º item principal do topo: a página dos desenhos 3D para crianças (nasce na mesma publicação, sessão dos 4 cards). */
export const MENU_CARTOON_HREF = '/ai-kids-cartoon-videos'
/** Rótulo autoral (traduzido pelo UiLabel a partir de lib/ui/refinementCopy.json, 16 línguas). */
export const MENU_CARTOON_LABEL = 'AI Cartoon Videos'
/** Id do item no nav_item_clicked (lib/navTelemetry aceita "more:<id>" sem mexer no enum do contrato). */
export const MENU_CARTOON_NAV_ITEM = 'more:cartoon'

/** Item do conector, "ao lado" dos 4 principais: a página do MCP (Claude e ChatGPT usam o mesmo servidor /api/mcp). */
export const MENU_CONNECTOR_HREF = '/claude-connector'
/** Nomes de produto: não passam pela tradução. Selo honesto: "Claude & ChatGPT" = funciona nos dois, sem "official"/"partner". */
export const MENU_CONNECTOR_LABEL = 'Claude & ChatGPT'
export const MENU_CONNECTOR_NAV_ITEM = 'more:mcp'

/** A ordem do topo público (rótulos autorais), da esquerda para a direita; Log in / Dashboard ficam à direita. */
export const TOP_MENU_ORDER = ['Make a film', 'Product ads', 'AI UGC Ads', MENU_CARTOON_LABEL, MENU_CONNECTOR_LABEL, '🔥 Trending', 'Pricing'] as const

/** Título da galeria da home (era "Images made with Kineo", dentro de "More tools"). */
export const HOME_GALLERY_TITLE = 'Images made by Kineo'

/** Quantos cartões a faixa de Clipes mostra (era 4: "dobrar"). */
export const HOME_CLIPS_COUNT = 8
