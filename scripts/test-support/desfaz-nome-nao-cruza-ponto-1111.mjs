// KINEO-NOME-NAO-CRUZA-PONTO-1111 — [CEO 11/11, filme do Leo] (o prefixo de título do NOME_RUN_RE só aceita título de verdade ou inicial).
// Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts: o hash de antes, o de depois e o trecho trocado. Um guardião histórico só
// ignora a camada se desfazer este trecho devolver EXATAMENTE a base. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const NOME_NAO_CRUZA_PONTO_1111 = JSON.parse(readFileSync(new URL('./desfaz-nome-nao-cruza-ponto-1111-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semNomeNaoCruzaPonto1111(source, file) {
  const entry = NOME_NAO_CRUZA_PONTO_1111.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-nome-nao-cruza-ponto-1111: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-nome-nao-cruza-ponto-1111: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
