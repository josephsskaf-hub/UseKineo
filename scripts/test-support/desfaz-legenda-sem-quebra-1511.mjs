// KINEO-LEGENDA-SEM-QUEBRA-1511 — [fundador 15/11] a legenda não parte a frase (segmentosSemQuebra no plano B; fim de frase sem órfã e
// duas palavras-função descendo juntas no corte por Whisper). Recibo EXATO desta entrega em lib/compose.ts: hash de antes (831caecf9),
// o de depois e os trechos trocados. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base —
// edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const LEGENDA_SEM_QUEBRA_1511 = JSON.parse(readFileSync(new URL('./desfaz-legenda-sem-quebra-1511-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semLegendaSemQuebra1511(source, file) {
  const entry = LEGENDA_SEM_QUEBRA_1511.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-legenda-sem-quebra-1511: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-legenda-sem-quebra-1511: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
