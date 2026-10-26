// [TRAVA 8.2 — vai do fundador 26/10 "1A"] KINEO-FILME15-ROSTO-2610 — desfaz EXATO, em memória, da camada "rosto fixo no filme de
// 15 s" na rota (3 trechos: import, pedido implícito, decisão da folha). Arquivo novo da camada: lib/filmes/filme15RostoFixo.ts.
// Tabela em desfaz-filme15-rosto-2610-hunks.json (before/after com 1 linha de contexto). Sem a marca = intocado. Trecho ausente,
// ambíguo ou resultado diferente da base = LANÇA. Camada MAIS NOVA: desfaz-filme15-fiel-2610 chama isto PRIMEIRO.
import { readFileSync } from 'node:fs'
import { semFilme15Perfeito2610 } from './desfaz-filme15-perfeito-2610.mjs' // KINEO-FILME15-PERFEITO-2610 — newer layer first
import { createHash } from 'node:crypto'
export const MARCA_FILME15_ROSTO_2610 = 'KINEO-FILME15-ROSTO-2610'
export const FILME15_ROSTO_2610 = JSON.parse(readFileSync(new URL('./desfaz-filme15-rosto-2610-hunks.json', import.meta.url), 'utf8'))
export const FILME15_ROSTO_2610_NOVOS = Object.freeze(['lib/filmes/filme15RostoFixo.ts', 'scripts/test-filme15-rosto-2610.mjs', 'scripts/test-support/desfaz-filme15-rosto-2610.mjs', 'scripts/test-support/desfaz-filme15-rosto-2610-hunks.json'])
const sha = (t) => createHash('sha256').update(t).digest('hex')

export function semFilme15Rosto2610(texto, p) {
  texto = semFilme15Perfeito2610(texto, p) // KINEO-FILME15-PERFEITO-2610
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  const entry = FILME15_ROSTO_2610.scope[rel]
  if (typeof texto !== 'string' || !entry || !texto.includes(MARCA_FILME15_ROSTO_2610)) return texto
  const crlf = texto.includes('\r\n')
  let t = texto.replace(/\r\n/g, '\n')
  if (sha(t) === entry.beforeSha256) return texto
  for (const h of entry.hunks) {
    const n = t.split(h.after).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_FILME15_ROSTO_2610}: trecho ${n === 0 ? 'ausente' : 'ambíguo'} em ${rel}`)
    t = t.replace(h.after, () => h.before)
  }
  if (sha(t) !== entry.beforeSha256) throw new Error(`desfaz ${MARCA_FILME15_ROSTO_2610}: resultado diverge da base em ${rel}`)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
