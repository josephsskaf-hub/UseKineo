// [TRAVA 8.2 — vai do fundador 26/10 "tinha que seguir o menino depressivo"] KINEO-FILME15-ELENCO-2610 — desfaz EXATO, em memória, do
// elenco do filme de 15 s na rota (import, elenco pelos visuais das cenas, protagonista em toda cena, bloco da folha com o elenco do
// ajuste). Arquivo novo da camada: lib/filmes/filme15Elenco.ts. Sem a marca = intocado; trecho ausente/ambíguo ou resultado
// diferente da base = LANÇA. Camada MAIS NOVA: desfaz-filme15-rosto-2610 chama isto PRIMEIRO.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { semVisualIngles2610 } from './desfaz-visual-ingles-2610.mjs' // KINEO-VISUAL-INGLES-2610 — camada mais nova sai primeiro
export const MARCA_FILME15_ELENCO_2610 = 'KINEO-FILME15-ELENCO-2610'
export const FILME15_ELENCO_2610 = JSON.parse(readFileSync(new URL('./desfaz-filme15-elenco-2610-hunks.json', import.meta.url), 'utf8'))
export const FILME15_ELENCO_2610_NOVOS = Object.freeze(['lib/filmes/filme15Elenco.ts', 'scripts/test-filme15-elenco-2610.mjs', 'scripts/test-support/desfaz-filme15-elenco-2610.mjs', 'scripts/test-support/desfaz-filme15-elenco-2610-hunks.json'])
const sha = (t) => createHash('sha256').update(t).digest('hex')

export function semFilme15Elenco2610(texto, p) {
  texto = semVisualIngles2610(texto, p) // KINEO-VISUAL-INGLES-2610
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  const entry = FILME15_ELENCO_2610.scope[rel]
  if (typeof texto !== 'string' || !entry || !texto.includes(MARCA_FILME15_ELENCO_2610)) return texto
  const crlf = texto.includes('\r\n')
  let t = texto.replace(/\r\n/g, '\n')
  if (sha(t) === entry.beforeSha256) return texto
  for (const h of entry.hunks) {
    const n = t.split(h.after).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_FILME15_ELENCO_2610}: trecho ${n === 0 ? 'ausente' : 'ambíguo'} em ${rel}`)
    t = t.replace(h.after, () => h.before)
  }
  if (sha(t) !== entry.beforeSha256) throw new Error(`desfaz ${MARCA_FILME15_ELENCO_2610}: resultado diverge da base em ${rel}`)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
