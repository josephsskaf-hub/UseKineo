// KINEO-BING-SEO-1510 — texto alternativo das capas e miniaturas que a home serve.
//
// O Bing Webmaster (15/10) acusou ~25 imagens da home "sem alt": eram todas alt="" — as capas da vitrine
// (app/examples/ExamplesGallery.tsx, components/TrendingRow.tsx) e as miniaturas do menu de motores
// (components/NavEngineItem.tsx). Para leitor de tela o alt vazio é "decorativo"; para o buscador é imagem sem descrição.
// O alt diz SÓ o que é verdade sobre a imagem: a capa é um quadro do Short daquele título; a miniatura é a prévia daquele
// item do menu. Nada de motor, de preço ou de promessa no alt (o selo do motor já está visível ao lado).
// MÓDULO PURO: sem imports — o guardião scripts/test-bing-seo-1510.mjs o executa isolado.

/** Alt da capa de um Short da vitrine: o título real do filme; sem título, a descrição genérica e verdadeira. */
export function posterAlt1510(video: { title?: string | null }): string {
  const title = (video.title ?? '').replace(/\s+/g, ' ').trim()
  return title ? `Poster frame from the Short “${title}”` : 'Poster frame from a sample vertical Short'
}

/** Alt da miniatura quadrada do menu de motores (public/nav-thumbs): a prévia daquele item. */
export function navThumbAlt1510(name: string): string {
  const n = (name ?? '').replace(/\s+/g, ' ').trim()
  return n ? `${n} preview frame` : 'Engine preview frame'
}
