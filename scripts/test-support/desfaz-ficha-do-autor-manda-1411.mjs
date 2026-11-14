// KINEO-FICHA-DO-AUTOR-MANDA-1411 — [CEO 14/11, dry-run da Earhart] (a aparência escrita pelo autor manda sobre a sorteada da camada de época:
// aplicarElencoEEpoca + fichasDoAutor). Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts (927a809ea → 20519e2df): o hash
// de antes, o de depois e os trechos trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FICHA_DO_AUTOR_MANDA_1411 = JSON.parse(readFileSync(new URL('./desfaz-ficha-do-autor-manda-1411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semFichaDoAutorManda1411(source, file) {
  const entry = FICHA_DO_AUTOR_MANDA_1411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-ficha-do-autor-manda-1411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-ficha-do-autor-manda-1411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
