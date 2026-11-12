// KINEO-IDEIA-FICHA-ASSUNTO-1211 — [CEO 12/11 noite] (o papel sem nome regido por preposição de referência não vira elenco: lib/cinematic/elencoEpoca.ts
// protagonistaSemNome + papelSemNomeAge). Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts: o hash de antes, o de depois e os trechos
// trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const IDEIA_FICHA_ASSUNTO_1211 = JSON.parse(readFileSync(new URL('./desfaz-ideia-ficha-assunto-1211-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semIdeiaFichaAssunto1211(source, file) {
  const entry = IDEIA_FICHA_ASSUNTO_1211.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-ideia-ficha-assunto-1211: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-ideia-ficha-assunto-1211: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
