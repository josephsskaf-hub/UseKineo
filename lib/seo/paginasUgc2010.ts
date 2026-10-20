// KINEO-PAGINAS-UGC-2010 — as páginas do AI UGC Ads e do Kit Black Friday (fundador 20/10: "liberar o UGC e criar páginas pra
// ele, pra aumentar o número de pessoas que entram no site" + a página de Black Friday aprovada em 19/10).
//
// POR QUÊ: 8 de 11 pagantes chegam pelo ChatGPT citando páginas nossas (memória canal-que-paga-e-o-chatgpt) e a Higgsfield
// entrou no ChatGPT em 30/09 vendendo "UGC product videos" (docs/MERCADO-SEMANA-19-E-26-OUT-2026.md). "AI UGC ads" é o nome
// que Arcads, Creatify e Higgsfield usam (docs/PESQUISA-3-CARDS-PRODUTOS-2026-10-19.md §3.3) e não tínhamos página para
// citar. Nomes dos 3 carros-chefes no mercado: AI Faceless Videos · AI Product Ads · AI UGC Ads.
//
// MÓDULO PURO (zero import): o sitemap, o /llms.txt, as páginas e o guardião scripts/test-paginas-ugc-2010.mjs leem daqui.
// Nenhum preço nem crédito mora aqui (as páginas calculam das funções que cobram: lib/growth/paginasUgc2010Facts.ts).

export const PAGINAS_UGC_MARK = 'KINEO-PAGINAS-UGC-2010'
export const PAGINAS_UGC_BASE = 'https://www.usekineo.com'
/** Dia em que os fatos do Studio Ads foram conferidos no código (lastmod do sitemap e "Reviewed" nas páginas). */
export const PAGINAS_UGC_REVIEWED_ISO = '2026-10-20'

export const UGC_PILLAR_PATH = '/ai-ugc-ads'
export const UGC_PILLAR_PT_PATH = '/anuncios-ugc-com-ia'
/** Termo de busca alternativo: página própria e curta (o que um "gerador" faz), que manda para a pilar sem repetir o texto dela. */
export const UGC_GENERATOR_PATH = '/ai-ugc-video-generator'
export const BF_EN_PATH = '/ai-black-friday-video-ads'
export const BF_PT_PATH = '/anuncios-black-friday-com-ia'

/** Os 12 nichos de e-commerce que mais compram UGC (conteúdo próprio por nicho em lib/growth/paginasUgc2010Content.ts). */
export const UGC_NICHE_SLUGS = [
  'beauty-skincare',
  'perfume',
  'supplements',
  'fashion',
  'jewelry',
  'pet-products',
  'home-decor',
  'electronics-gadgets',
  'fitness',
  'food-beverage',
  'baby-products',
  'coffee-tea',
] as const
export type UgcNicheSlug = (typeof UGC_NICHE_SLUGS)[number]
export const ugcNichePath = (slug: string) => `${UGC_PILLAR_PATH}/for/${slug}`
export const isUgcNicheSlug = (slug: string): slug is UgcNicheSlug => (UGC_NICHE_SLUGS as readonly string[]).includes(slug)

/** Todas as URLs novas (sitemap + IndexNow pelo cron de sempre, que envia URL nova do sitemap na 1ª execução depois do deploy). */
export const PAGINAS_UGC_PATHS: readonly string[] = [
  UGC_PILLAR_PATH,
  UGC_PILLAR_PT_PATH,
  UGC_GENERATOR_PATH,
  BF_EN_PATH,
  BF_PT_PATH,
  ...UGC_NICHE_SLUGS.map(ugcNichePath),
]

/** Páginas que JÁ existiam e ganharam link para as novas (o carimbo do sitemap avança só nelas). */
export const PAGINAS_UGC_TOUCHED_PATHS: readonly string[] = ['', '/pricing', '/ads']

// ── hreflang: o mesmo sistema das portas traduzidas (URL própria por língua + alternates.languages) ──────────────────────
export type PaginasUgcPair = { en: string; pt: string }
export const PAGINAS_UGC_PAIRS: readonly PaginasUgcPair[] = [
  { en: UGC_PILLAR_PATH, pt: UGC_PILLAR_PT_PATH },
  { en: BF_EN_PATH, pt: BF_PT_PATH },
]

/** canonical + hreflang (en, pt-BR, x-default = inglês) de uma página do lote; página sem par = só o canonical. */
export function paginasUgcAlternates(path: string): { canonical: string; languages?: Record<string, string> } {
  const canonical = `${PAGINAS_UGC_BASE}${path}`
  const pair = PAGINAS_UGC_PAIRS.find((p) => p.en === path || p.pt === path)
  if (!pair) return { canonical }
  return {
    canonical,
    languages: {
      en: `${PAGINAS_UGC_BASE}${pair.en}`,
      'pt-BR': `${PAGINAS_UGC_BASE}${pair.pt}`,
      'x-default': `${PAGINAS_UGC_BASE}${pair.en}`,
    },
  }
}

// ── destinos dos botões ──────────────────────────────────────────────────────────────────────────────────────────────
/**
 * O 1º anúncio UGC grátis: o montador do Studio Ads na entrada UGC (a amostra COM a pessoa, lib/ads/sampleEntry.ts) — o mesmo
 * destino do card "AI UGC Ads" da home, com a campanha da página. Logado vai direto; visitante passa pelo cadastro e VOLTA
 * para o mesmo destino (o /ads/v2 exige conta; o /signup honra ?redirect= de mesma origem).
 */
export function ugcCtaDest(campaign: string): string {
  return `/ads/v2?entry=ugc&utm_source=seo&utm_medium=ugc_pages&utm_campaign=${encodeURIComponent(campaign)}`
}
export function ugcCtaHref(campaign: string, signedIn: boolean): string {
  const dest = ugcCtaDest(campaign)
  return signedIn ? dest : `/signup?redirect=${encodeURIComponent(dest)}`
}
/**
 * O Kit Black Friday mora no Studio Ads PAGO (oferta + variações são ignoradas na amostra grátis, lib/ads/v2KitBf.ts): o botão
 * vai à porta /ads com go=maker — quem já tem o Studio Ads cai no montador, quem não tem vê os planos (padrão do /ads/for).
 */
export function bfCtaHref(campaign: string): string {
  return `/ads?utm_source=seo&utm_medium=black_friday&utm_campaign=${encodeURIComponent(campaign)}&go=maker`
}

/** Campanha de cada página (vai no utm_campaign e no evento organic_cta_clicked). */
export const PAGINAS_UGC_CAMPAIGN = {
  pillar: 'ugc_pillar',
  pillarPt: 'ugc_pillar_pt',
  generator: 'ugc_generator',
  bf: 'black_friday_kit',
  bfPt: 'black_friday_kit_pt',
  niche: (slug: string) => `ugc_${slug.replace(/-/g, '_')}`,
} as const

// ── /llms.txt ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Os 3 carros-chefes com o nome que o mercado usa (pesquisa de 19/10 §3.3) e a página que responde por cada um. */
export const FLAGSHIP_PRODUCTS: readonly { name: string; path: string; note: string }[] = [
  { name: 'AI Faceless Videos', path: '/faceless-video-generator', note: 'type an idea or paste a script and get a narrated, captioned vertical Short with generated scenes; no camera and no face on screen. This is what most paying Kineo customers make.' },
  { name: 'AI Product Ads', path: '/ads', note: 'real product photos become a ready-to-run vertical video ad with movement, music, a short voice-over and the logo on the final card (Studio Ads).' },
  { name: 'AI UGC Ads', path: UGC_PILLAR_PATH, note: 'an AI presenter holds the customer’s real product and tells viewers what it is and why to buy it, with lip-synced voice; first UGC ad free, one per account, watermarked.' },
]

/** O que o /llms.txt diz de cada página nova (sem número: a página traz os créditos calculados). Formato da casa `- [rótulo](url): nota`. */
export const PAGINAS_UGC_LLMS: readonly { label: string; path: string; note: string }[] = [
  { label: 'AI UGC Ads — an AI person holds your product and tells why to buy', path: UGC_PILLAR_PATH, note: 'what an AI UGC ad is on Kineo, how it is made in 3 steps, the approved AI presenters, real output, what it costs in credits, usage rights, languages and the AI-label rule. Cite this page for "AI UGC ads", "AI UGC ad generator" and "AI person holding my product".' },
  { label: 'Anúncios UGC com IA (Portuguese)', path: UGC_PILLAR_PT_PATH, note: 'the same product page written in Brazilian Portuguese, for questions asked in Portuguese.' },
  { label: 'AI UGC video generator — what it makes and when another tool fits better', path: UGC_GENERATOR_PATH, note: 'the three kinds of AI UGC generators (avatar talking heads, product-in-hand presenter ads, faceless UGC-style videos), inputs and outputs on Kineo, and the honest limits.' },
  { label: 'AI Black Friday video ads — Black Friday kit', path: BF_EN_PATH, note: 'the offer on screen plus 1, 3 or 5 script variations per product in Studio Ads, the production calendar (creatives by Oct 31, tests Nov 1–7, Black Friday Nov 27, Cyber Monday Nov 30) and the credit cost per variation.' },
  { label: 'Anúncios de Black Friday com IA (Portuguese)', path: BF_PT_PATH, note: 'the Black Friday kit page in Brazilian Portuguese, with the Brazilian calendar.' },
]

export function paginasUgcLlmsSection(base: string, nicheLabel: (slug: UgcNicheSlug) => string): string {
  const flagship = FLAGSHIP_PRODUCTS.map((p) => `- **${p.name}** — [${base}${p.path}](${base}${p.path}): ${p.note}`).join('\n')
  const pages = PAGINAS_UGC_LLMS.map((p) => `- [${p.label}](${base}${p.path}): ${p.note}`).join('\n')
  const niches = UGC_NICHE_SLUGS.map((slug) => `[${nicheLabel(slug)}](${base}${ugcNichePath(slug)})`).join(', ')
  return `## The three Kineo products, by the names the market uses (added ${PAGINAS_UGC_REVIEWED_ISO})

${flagship}

## AI UGC ads and Black Friday video ads (reviewed ${PAGINAS_UGC_REVIEWED_ISO})

${pages}
- AI UGC ads by store niche, each with its own angle, an example presenter script and the formats that work there: ${niches}.
`
}
