// KINEO-PAGINAS-IA-0111 — as 20 rotas novas da rodada "dobrar o canal que já paga" (ChatGPT/Bing), fundador 01/11/2026
// ("vai tudo, avulso 2,90"). MÓDULO PURO, sem import: app/sitemap.ts e o guardião scripts/test-paginas-ia-0111.mts leem daqui
// sem carregar o catálogo inteiro. Os textos moram em lib/seo/paginasIa0111.ts (nichos e artigos) e lib/seo/intentPages.ts
// (casos de uso e alternativas, mesmo catálogo das 100+ páginas /ai-video-generator/for/*).

export const PAGINAS_IA_0111_MARK = 'KINEO-PAGINAS-IA-0111'
/** Dia em que os textos foram escritos e as fontes primárias dos artigos de dinheiro foram lidas. */
export const PAGINAS_IA_0111_REVIEWED_ISO = '2026-11-01'

/** 8 nichos novos em /free-ai-shorts/<slug> (a família que o ChatGPT já cita: /free-ai-shorts/horror = 94 visitas em 14 d). */
export const PAGINAS_IA_0111_NICHE_SLUGS = [
  'mythology',
  'billionaires',
  'military-history',
  'urban-legends',
  'dinosaurs',
  'survival-stories',
  'inventions',
  'abandoned-places',
] as const

/** 4 casos de uso + 6 alternativas em /ai-video-generator/for/<slug> (/for/urdu = 93 visitas; /vs/invideo = 2 cadastros → 1 pagante). */
export const PAGINAS_IA_0111_INTENT_SLUGS = [
  'restaurants-and-cafes',
  'youtube-automation-channels',
  'home-services-companies',
  'car-dealerships',
  'vyond-alternative',
  'animoto-alternative',
  'clipchamp-alternative',
  'mootion-alternative',
  'visla-alternative',
  'colossyan-alternative',
] as const

/** 2 artigos de dinheiro para o Bing (que manda gente para /how-much-do-youtube-shorts-pay: 96 visitas em 14 d). */
export const PAGINAS_IA_0111_MONEY_PATHS = [
  '/when-does-youtube-pay-you',
  '/youtube-shorts-revenue-sharing-explained',
] as const

export const PAGINAS_IA_0111_PATHS: readonly string[] = [
  ...PAGINAS_IA_0111_NICHE_SLUGS.map((s) => `/free-ai-shorts/${s}`),
  ...PAGINAS_IA_0111_INTENT_SLUGS.map((s) => `/ai-video-generator/for/${s}`),
  ...PAGINAS_IA_0111_MONEY_PATHS,
]
