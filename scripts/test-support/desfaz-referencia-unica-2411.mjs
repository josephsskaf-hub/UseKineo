// KINEO-REFERENCIA-UNICA-2411 — recibo EXATO desta entrega em lib/kling4Trial.ts (o montador da referência única, o campo novo no timing e o desvio
// atrás dele). Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a origin/main f58bcb31a — edição desconhecida,
// parcial ou a mais continua reprovando. O comportamento novo é provado em scripts/test-referencia-unica-2411.mjs. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const REFERENCIA_UNICA_2411_RECIBO = JSON.parse(readFileSync(new URL('./desfaz-referencia-unica-2411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semReferenciaUnica2411(source, file) {
  const entry = REFERENCIA_UNICA_2411_RECIBO.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-referencia-unica-2411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-referencia-unica-2411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaReferenciaUnica2411Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = REFERENCIA_UNICA_2411_RECIBO.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semReferenciaUnica2411(text, path)) === lf(upstream)
}
