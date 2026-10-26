// [TRAVA 8.2 — vai do fundador 26/10 "precisa reconhecer todas as línguas"] KINEO-VISUAL-INGLES-2610 — desfaz EXATO, em memória, da
// regra "campos visuais sempre em inglês" no escritor de cenas (lib/runway.ts, linha languageRule). Sem a marca = intocado; trecho
// ausente/ambíguo ou resultado diferente da base = LANÇA. Camada MAIS NOVA: desfaz-filme15-elenco-2610 chama isto PRIMEIRO.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const MARCA_VISUAL_INGLES_2610 = 'KINEO-VISUAL-INGLES-2610'
export const VISUAL_INGLES_2610 = JSON.parse(readFileSync(new URL('./desfaz-visual-ingles-2610-hunks.json', import.meta.url), 'utf8'))
export const VISUAL_INGLES_2610_NOVOS = Object.freeze(['scripts/test-visual-ingles-2610.mjs', 'scripts/test-support/desfaz-visual-ingles-2610.mjs', 'scripts/test-support/desfaz-visual-ingles-2610-hunks.json'])
const sha = (t) => createHash('sha256').update(t).digest('hex')

export function semVisualIngles2610(texto, p) {
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  const entry = VISUAL_INGLES_2610.scope[rel]
  if (typeof texto !== 'string' || !entry || !texto.includes(MARCA_VISUAL_INGLES_2610)) return texto
  const crlf = texto.includes('\r\n')
  let t = texto.replace(/\r\n/g, '\n')
  if (sha(t) === entry.beforeSha256) return texto
  for (const h of entry.hunks) {
    const n = t.split(h.after).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_VISUAL_INGLES_2610}: trecho ${n === 0 ? 'ausente' : 'ambíguo'} em ${rel}`)
    t = t.replace(h.after, () => h.before)
  }
  if (sha(t) !== entry.beforeSha256) throw new Error(`desfaz ${MARCA_VISUAL_INGLES_2610}: resultado diverge da base em ${rel}`)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
