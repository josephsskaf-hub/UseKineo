// KINEO-DURACAO-COLADA-SALDO-0411 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// ("esta conta paga?" não depende de /api/me/plan ter chegado: a duração colada não sobe além do saldo e a descida do filme grátis acontece).
// Recibo EXATO desta entrega no GenerateClient: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const DURACAO_COLADA_SALDO_0411 = JSON.parse(readFileSync(new URL('./desfaz-duracao-colada-saldo-0411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semDuracaoColadaSaldo0411(source, file) {
  const entry = DURACAO_COLADA_SALDO_0411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-duracao-colada-saldo-0411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-duracao-colada-saldo-0411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaDuracaoColadaSaldo0411Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = DURACAO_COLADA_SALDO_0411.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semDuracaoColadaSaldo0411(text, path)) === lf(upstream)
  const added = DURACAO_COLADA_SALDO_0411.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
