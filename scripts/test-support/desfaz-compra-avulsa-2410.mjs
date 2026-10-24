// KINEO-COMPRA-AVULSA-2410 — pure leaf: only this task, exact reverse hunks + before/after hashes, no historical imports.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const COMPRA_AVULSA_2410_BASE = '7950e41134dd03388e67c131501d3e2bce61a3eb'
export const COMPRA_AVULSA_2410_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-compra-avulsa-2410-fontes.json', import.meta.url), 'utf8'))
const hash = text => createHash('sha256').update(text).digest('hex')
export function semCompraAvulsa2410(text, file) {
  const rel = String(file ?? '').replace(/\\/g, '/'), known = COMPRA_AVULSA_2410_MANIFEST.sources[rel]
  if (!known || typeof text !== 'string') return text
  const lf = text.replace(/\r\n/g, '\n'), current = hash(lf)
  if (current === known.beforeHash) return text
  if (current !== known.afterHash) {
    if (!/KINEO-COMPRA-AVULSA-2410|one_time_item|one_time_ad|one_time_film35|oneTimeItem|OneTimeItem|oneTimeMember|CompraAvulsa2410|compra-avulsa-2410|@electric-sql\/pglite/.test(lf)) return text
    throw new Error('desfaz-compra-avulsa-2410: fonte divergente ' + rel)
  }
  let result = lf
  for (const change of [...known.changes].reverse()) {
    const first = result.indexOf(change.after)
    if (!change.after || first < 0 || result.indexOf(change.after, first + 1) !== -1) throw new Error('desfaz-compra-avulsa-2410: hunk divergente ' + rel)
    result = result.slice(0, first) + change.before + result.slice(first + change.after.length)
  }
  if (hash(result) !== known.beforeHash) throw new Error('desfaz-compra-avulsa-2410: before divergente ' + rel)
  return text.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
