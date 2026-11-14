// KINEO-HISTORIA-REAL-1411 — [CEO 13-14/11, item 3.3, v2 e N1/N2 da revisão independente] (a camada de história real em lib/cinematic/elencoEpoca.ts:
// ano por extenso, papel = nomeado, ficha do objeto real). Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts (00c4b47b8 → 52a214f60): o hash
// de antes, o de depois e os trechos trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const HISTORIA_REAL_1411 = JSON.parse(readFileSync(new URL('./desfaz-historia-real-1411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semHistoriaReal1411(source, file) {
  const entry = HISTORIA_REAL_1411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-historia-real-1411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-historia-real-1411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
