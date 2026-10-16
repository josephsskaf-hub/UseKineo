// KINEO-GUIAS-IA-1610 — as guias /guides/<slug> escritas pelo GPT em 16/10/2026 para busca e citação por IA
// (fonte do texto: docs/PAGINAS-CITACAO-IA-20-GPT-2026-10-16.md na árvore do fundador), conferidas contra o código.
//
// MÓDULO PURO (sem import), como lib/seo/vsNovos1610.ts: o sitemap e o guardião scripts/test-guias-ia-1610.mjs leem daqui.
// Só entram as guias que NÃO repetem a intenção de uma página que já existe — as puladas ficam listadas abaixo com o
// motivo e a página que já responde, para ninguém recriá-las sem antes decidir juntar.

export const GUIAS_IA_MARK = 'KINEO-GUIAS-IA-1610'
export const GUIAS_IA_BASE = 'https://www.usekineo.com'
/** Dia em que os fatos da Kineo foram conferidos no código e os preços dos concorrentes consultados (lastmod do sitemap). */
export const GUIAS_IA_REVIEWED_ISO = '2026-10-16'
export const GUIAS_IA_PRICES_CHECKED_LABEL = 'Public prices checked October 16, 2026, in USD'

export const GUIAS_IA_SLUGS = [
  'ai-product-video-accuracy', // GPT 11
  'ai-dropshipping-video-ads', // GPT 13
  'ai-personal-care-product-ads', // GPT 15
  'ai-clothing-brand-video', // GPT 7
  'ai-tech-product-ads', // GPT 3
  'elevenlabs-alternatives-narrated-video', // GPT 19
  'multilingual-video-narration', // GPT 18
  'weekly-video-ads-approval', // GPT 14 (Kineo Automate: números aprovados pelo fundador em 16/10)
] as const
export type GuiaIaSlug = (typeof GUIAS_IA_SLUGS)[number]

export const guiaIaPath = (slug: string) => `/guides/${slug}`
export const GUIAS_IA_PATHS: readonly string[] = GUIAS_IA_SLUGS.map(guiaIaPath)

/** Páginas do lote do GPT que NÃO nasceram (URL sugerida → página que já responde a mesma intenção, ou o motivo). */
export const GUIAS_IA_PULADAS: Readonly<Record<string, string>> = {
  '/guides/affordable-ai-video-generator': '/cheapest-ai-shorts-maker', // GPT 1
  '/guides/ai-videos-tiktok-reels-shorts': '/ai-video-generator/for/vertical-videos', // GPT 2 (+ /for/tiktok, /for/youtube-shorts, /for/instagram-reels)
  '/guides/script-to-faceless-video': '/ai-video-generator/free-script-to-faceless-video', // GPT 4
  '/guides/daily-faceless-video-budget': '/ai-video-generator/faceless-shorts-under-30', // GPT 5
  '/guides/kineo-vs-runway-faceless': '/alternatives/runwayml', // GPT 6 (+ /ai-video-generator/for/runway-alternative)
  '/guides/watermark-free-ai-video-privacy': '/ai-shorts-generator-no-watermark', // GPT 8 (privacidade: só há frase pública sobre prompts)
  '/guides/shopify-ai-video-workflow': 'app Shopify desligado (SHOPIFY_APP_LIVE); link de loja já em /ads/for/online-stores', // GPT 9
  '/guides/product-photos-to-video': '/ads/for/online-stores', // GPT 10
  '/guides/ai-video-ad-production-cost': '/ads/for/online-stores', // GPT 12 (custo por anúncio)
  '/guides/ai-video-ads-local-businesses': '/ads/for/local-services', // GPT 16 (+ /ai-video-generator/for/local-businesses)
  '/guides/ai-voiceover-costs-short-videos': '/ai-voice-generator', // GPT 17
  '/guides/ai-narration-without-recording': '/ai-voice-generator', // GPT 20 (+ /ai-video-generator/for/ai-voiceover-videos)
}
