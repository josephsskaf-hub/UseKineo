// KINEO-LINHA-DE-EPOCA-1411 — [CEO 14/11 12:25, lote 1b] (a linha de época segue a cena: roupa só com gente, veículo só com veículo de rua;
// linhaDeEpocaDaCena). Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts (e75833d13 → af09605d6): o hash
// de antes, o de depois e os trechos trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const LINHA_DE_EPOCA_1411 = JSON.parse(readFileSync(new URL('./desfaz-linha-de-epoca-1411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semLinhaDeEpoca1411(source, file) {
  const entry = LINHA_DE_EPOCA_1411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-linha-de-epoca-1411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-linha-de-epoca-1411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
