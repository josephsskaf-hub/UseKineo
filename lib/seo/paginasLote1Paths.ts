// KINEO-PAGINAS-LOTE1-2026-10-12 — os CAMINHOS das 10 páginas do lote 1, num módulo PURO (sem import nenhum): o sitemap e o
// llms.txt importam daqui, e há guardiões que executam o sitemap offline carregando só .ts de lib/ — um import com alias
// lá dentro os derrubaria. Os textos vivem em lib/seo/paginasLote1.ts; o guardião scripts/test-paginas-lote1-1210.mjs
// confere que as chaves de lá e as listas daqui são as mesmas.

/** Data da revisão (o sitemap carimba esta data como lastmod das 10 páginas). */
export const LOTE1_REVIEWED_ISO = '2026-10-12'

/** Os 7 nichos novos em /free-ai-shorts/<slug>. */
export const LOTE1_NICHE_SLUG_LIST: readonly string[] = ['cartoon', 'what-if', 'ocean', 'disasters', 'nature', 'ancient-mysteries', 'creepy-facts']

/** As 3 páginas de intenção fora da família de nicho. */
export const LOTE1_LANDING_PATH_LIST: readonly string[] = ['/ai-shorts-generator-no-watermark', '/ai-short-film-generator', '/generador-de-videos-de-terror']

/** As 10 URLs do lote (sitemap, llms.txt e o ping do IndexNow depois de publicar). */
export const LOTE1_PATHS: readonly string[] = [
  ...LOTE1_NICHE_SLUG_LIST.map((s) => `/free-ai-shorts/${s}`),
  ...LOTE1_LANDING_PATH_LIST,
]
