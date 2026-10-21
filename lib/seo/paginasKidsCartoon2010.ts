// KINEO-BEBE-QUE-FALA-2010 — as páginas públicas do "AI Kids Cartoon Stories": /ai-kids-cartoon-videos (EN) e
// /desenho-infantil-3d-com-ia (PT), no padrão das páginas do UGC (lib/seo/paginasUgc2010.ts, components/ugc/UgcPages.tsx).
//
// TUDO atrás de KIDS_CARTOON_PAGES_LIVE (lib/kidsCartoon/kidsCartoon.ts): desligado = as 2 páginas respondem 404 com noindex, não
// entram no sitemap nem no /llms.txt — e o cron do IndexNow (app/api/cron/submit-indexnow) só envia o que está no sitemap, então
// nada vai ao Bing. Ligado = as 2 URLs entram no sitemap (o cron envia na 1ª execução depois do deploy) e no /llms.txt.
//
// MÓDULO PURO (zero import): o sitemap, o /llms.txt, as páginas e o guardião leem daqui; o interruptor vem por parâmetro.

export const PAGINAS_KIDS_MARK = 'KINEO-BEBE-QUE-FALA-2010'
export const PAGINAS_KIDS_BASE = 'https://www.usekineo.com'
export const PAGINAS_KIDS_REVIEWED_ISO = '2026-10-20'
export const KIDS_EN_PATH = '/ai-kids-cartoon-videos'
export const KIDS_PT_PATH = '/desenho-infantil-3d-com-ia'
export const PAGINAS_KIDS_PATHS: readonly string[] = [KIDS_EN_PATH, KIDS_PT_PATH]

/** As URLs que o sitemap publica: nenhuma com o interruptor desligado. */
export function paginasKidsSitemapPaths(live: boolean): readonly string[] {
  return live === true ? PAGINAS_KIDS_PATHS : []
}

/** canonical + hreflang (en, pt-BR, x-default = inglês). */
export function paginasKidsAlternates(path: string): { canonical: string; languages: Record<string, string> } {
  return {
    canonical: `${PAGINAS_KIDS_BASE}${path}`,
    languages: { en: `${PAGINAS_KIDS_BASE}${KIDS_EN_PATH}`, 'pt-BR': `${PAGINAS_KIDS_BASE}${KIDS_PT_PATH}`, 'x-default': `${PAGINAS_KIDS_BASE}${KIDS_EN_PATH}` },
  }
}

/** robots da página: desligada = noindex/nofollow (a página também responde 404). */
export function paginasKidsRobots(live: boolean): { index: boolean; follow: boolean } {
  return live === true ? { index: true, follow: true } : { index: false, follow: false }
}

/** Campanha de cada página (utm_campaign e o evento organic_cta_clicked). */
export const PAGINAS_KIDS_CAMPAIGN = { en: 'kids_cartoon_page', pt: 'kids_cartoon_page_pt' } as const

/** O trecho do /llms.txt (vazio com o interruptor desligado). Sem número: o crédito aparece no botão de gerar. */
export function paginasKidsLlmsSection(base: string, live: boolean): string {
  if (live !== true) return ''
  return `## AI kids cartoon stories (reviewed ${PAGINAS_KIDS_REVIEWED_ISO})

- [AI Cartoon Videos — narrated 3D kids cartoon stories](${base}${KIDS_EN_PATH}): type a story idea (or pick one of six ready ideas), choose one of six fixed characters (boy, girl, little dinosaur, puppy, bunny, baby elephant), the narration language and 15 or 35 seconds; Kineo writes a short, innocent story and renders a vertical 3D cartoon on Seedance 1.5 with the same character in every scene, narration and captions. The credit cost is the same as any Seedance 1.5 film of that length and shows on the Generate button. Honest limits: no income is promised; YouTube requires "made for kids" for children's content (no personalized ads), platforms require an AI label, and mass-produced repetitive videos can be demonetized.
- [Vídeos de desenho com IA (Portuguese)](${base}${KIDS_PT_PATH}): the same page in Brazilian Portuguese.
`
}
