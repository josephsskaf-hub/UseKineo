// KINEO-PRECO-MERCADO-0411 — [fundador 04/11: "9. 19. 59", mensal sem desconto, anual 50%, sem avulso, sem top-up].
// Recibo EXATO desta entrega para os guardiões históricos que comparam a tabela de preços com a base byte a byte: o hash de antes,
// o de depois e os trechos trocados. Só desfaz se o arquivo for EXATAMENTE o "depois"; edição desconhecida, parcial ou a mais segue
// reprovando no guardião que chamou. Nunca usar em lib/app. Regerar: node scripts/test-support/gerar-recibo-preco-mercado-0411.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const PRECO_MERCADO_0411 = JSON.parse(readFileSync(new URL('./desfaz-preco-mercado-0411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semPrecoMercado0411(source, file) {
  const entry = PRECO_MERCADO_0411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-preco-mercado-0411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-preco-mercado-0411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
