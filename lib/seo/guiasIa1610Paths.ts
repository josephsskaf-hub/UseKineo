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

// ─── Divulgação (KINEO-GUIAS-IA-1610, publicação de 17/10) ───────────────────────────────────────────────────────────
// O que o /llms.txt diz de cada guia e qual página que JÁ existe leva a ela (1 link interno por guia, no padrão de links
// relacionados daquela página). `label` = o título da guia em lib/growth/guiasIa1610.ts — o guardião
// scripts/test-guias-ia-1610.mjs confere que são iguais. Nenhum número nosso nem de concorrente aqui (a página traz os fatos).
export type GuiaIaDivulgacao = { label: string; llms: string; from: string; anchor: string }
export const GUIAS_IA_DIVULGACAO: Readonly<Record<GuiaIaSlug, GuiaIaDivulgacao>> = {
  'ai-product-video-accuracy': {
    label: 'AI Product Video Accuracy: Keep Your Product Honest',
    llms: 'how to check packaging, color and features in an AI product video against the real product before publishing, and how to compare AI ad tools without assuming perfect product fidelity.',
    from: '/ads/for/online-stores',
    anchor: 'Keep AI product videos accurate',
  },
  'ai-dropshipping-video-ads': {
    label: 'AI Video Ads for Dropshipping: Step by Step',
    llms: 'a step-by-step workflow for a dropshipping product ad made from authorized product assets and verified claims, with a dated comparison of AI ad tools.',
    from: '/ads/for/online-stores',
    anchor: 'Dropshipping video ads, step by step',
  },
  'ai-personal-care-product-ads': {
    label: 'AI Video Ads for Small Personal Care Brands',
    llms: 'personal care product ads built from verified facts and real product photos, without invented reviews or results.',
    from: '/ads/for/online-stores',
    anchor: 'Video ads for personal care brands',
  },
  'ai-clothing-brand-video': {
    label: 'AI Video Ads for Clothing Brands: What to Check',
    llms: 'clothing-brand video ads from real garment photos, and what to review in garment details, fit and generated motion.',
    from: '/ads/for/online-stores',
    anchor: 'Video ads for clothing brands',
  },
  'ai-tech-product-ads': {
    label: 'AI Video Ads for Tech Products: A Practical Guide',
    llms: 'planning a cinematic tech-product ad without inventing features, and when real product footage works better than generated scenes.',
    from: '/ads/for/online-stores',
    anchor: 'Video ads for tech products',
  },
  'elevenlabs-alternatives-narrated-video': {
    label: 'ElevenLabs Alternatives for Narrated AI Videos',
    llms: 'whether you need a voice file, an editor, an avatar or a finished narrated video, and which tool fits each output (ElevenLabs, Descript, HeyGen, Kineo).',
    from: '/ai-voice-generator',
    anchor: 'ElevenLabs alternatives for narrated videos',
  },
  'multilingual-video-narration': {
    label: 'Multilingual Video Narration: A Practical AI Workflow',
    llms: 'new narrated videos in the supported narration languages versus dubbing an existing video, and what still needs a human review.',
    from: '/ai-voice-generator',
    anchor: 'Multilingual video narration',
  },
  'weekly-video-ads-approval': {
    label: 'Weekly Video Ads with Approval: Kineo Automate',
    llms: 'Kineo Automate, a done-for-you service: weekly business video ads approved through a private link, with publishing and media buying left to the business; package and pilot terms on the page.',
    from: '/business-video-ads',
    anchor: 'Weekly video ads with approval',
  },
}

/** As guias que levam um link a partir de `from` (ordem de GUIAS_IA_SLUGS). */
export const guiasIaLinksFrom = (from: string) =>
  GUIAS_IA_SLUGS.filter((slug) => GUIAS_IA_DIVULGACAO[slug].from === from).map((slug) => ({ href: guiaIaPath(slug), label: GUIAS_IA_DIVULGACAO[slug].anchor }))

/** Linhas do /llms.txt, uma por guia, no formato da casa `- [rótulo](url): nota`. */
export function guiasIaLlmsLines(base: string): string {
  return GUIAS_IA_SLUGS.map((slug) => `- [${GUIAS_IA_DIVULGACAO[slug].label}](${base}${guiaIaPath(slug)}): ${GUIAS_IA_DIVULGACAO[slug].llms}`).join('\n')
}
