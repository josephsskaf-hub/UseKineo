// KINEO-BING-SEO-1510 — DESFAZ, em memória, a rodada do Bing nos arquivos que guardiões antigos conferem BYTE A BYTE contra
// uma base: app/page.tsx (título e description da home), app/text-to-video-shorts/page.tsx (título, description, resposta e
// FAQ) e app/sitemap.ts (o carimbo de lastmod das páginas tocadas). Módulo auxiliar; não é teste (o nome não começa com test-).
//
// As trocas [como estava, como ficou] estão em desfaz-bing-seo-1510-trocas.json, geradas do diff da rodada e conferidas na
// geração: aplicar o desfaz na árvore devolve a base (codex/leva2-1510) byte a byte. Cada bloco tem de aparecer EXATAMENTE
// uma vez (senão lança: conserto pela metade ou mudança alheia no trecho não passa) e a marca não pode sobrar no arquivo.
// Arquivo sem a marca = volta igual (a rodada ainda não está nesta árvore). Fim de linha: o do próprio texto (LF ou CRLF).
// ENCADEAR: quem já desfaz outra camada do mesmo arquivo aplica esta por fora (a rodada do Bing é a camada mais nova).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_BING_SEO_1510 = 'KINEO-BING-SEO-1510'
const TROCAS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-bing-seo-1510-trocas.json'), 'utf8'))
export const ARQUIVOS_BING_SEO_1510 = Object.freeze(Object.keys(TROCAS))

/** Devolve `src` sem a rodada do Bing (só para os arquivos da lista; os outros voltam intocados). */
export function semBingSeo1510(rel, src) {
  const key = String(rel ?? '').replace(/\\/g, '/')
  if (!Object.hasOwn(TROCAS, key) || typeof src !== 'string' || !src.includes(MARCA_BING_SEO_1510)) return src
  const crlf = src.includes('\r\n')
  let s = crlf ? src.replace(/\r\n/g, '\n') : src
  for (const [antes, depois] of TROCAS[key]) {
    const n = s.split(depois).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_BING_SEO_1510} em ${key}: bloco achado ${n}× — ${depois.slice(0, 70)}`)
    s = s.split(depois).join(antes)
  }
  if (s.includes(MARCA_BING_SEO_1510)) throw new Error(`desfaz ${MARCA_BING_SEO_1510} em ${key}: sobrou linha marcada`)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
