// KINEO-HISTORIA-REAL-1411 'all' v2 — [bloqueio do revisor, CEO 14/11] (o papel só sai ligado ao nome; contagem por extenso não é ano:
// papelLigadoAoNome1411). Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts (8cc10a0f4 → b78414b24): o hash
// de antes, o de depois e os trechos trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const HISTORIA_REAL_ALL_V2_1411 = JSON.parse(readFileSync(new URL('./desfaz-historia-real-all-v2-1411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semHistoriaRealAllV21411(source, file) {
  const entry = HISTORIA_REAL_ALL_V2_1411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-historia-real-all-v2-1411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-historia-real-all-v2-1411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
