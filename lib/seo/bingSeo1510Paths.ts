// KINEO-BING-SEO-1510 — as páginas que a rodada mudou e o lastmod delas. Arquivo SEM imports de propósito: app/sitemap.ts o
// importa, e vários guardiões executam o sitemap com carregadores estritos (o padrão de lib/seo/paginasLote1Paths.ts).
// O resto da rodada (textos, fontes, contas) mora em lib/seo/bingSeo1510.ts, que reexporta estas constantes.

/** O lastmod que app/sitemap.ts carimba nas páginas tocadas (o cron do IndexNow avisa o Bing pela troca de lastmod). */
export const BING_SEO_1510_LASTMOD_ISO = '2026-10-15T12:00:00.000Z'
/** As páginas cujo HTML esta rodada mudou (título, description, alt ou conteúdo). */
export const BING_SEO_1510_PATHS = [
  '/',
  '/faceless-youtube-shorts-generator',
  '/ai-video-generator/seedance',
  '/can-you-monetize-ai-videos',
  '/best-ai-shorts-generators',
  '/text-to-video-shorts',
] as const
