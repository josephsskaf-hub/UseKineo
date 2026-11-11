// KINEO-LEGENDA-SEM-ASPAS-1111 — [CEO 11/11] (a legenda não mostra as aspas de abertura/fecho do roteiro: lib/compose.ts chama
// lib/legendaSemAspas.ts em buildCaptionElements). Recibo EXATO desta entrega em lib/compose.ts: o hash de antes (a origin/main em que
// nasceu), o de depois e os trechos trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a
// base — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const LEGENDA_SEM_ASPAS_1111 = JSON.parse(readFileSync(new URL('./desfaz-legenda-sem-aspas-1111-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semLegendaSemAspas1111(source, file) {
  const entry = LEGENDA_SEM_ASPAS_1111.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-legenda-sem-aspas-1111: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-legenda-sem-aspas-1111: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
