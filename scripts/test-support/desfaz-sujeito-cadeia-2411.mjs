// KINEO-SUJEITO-CADEIA-2411 — só medida (o bloco cadeia_2411 no evento do sujeito)
// (CEO 24/11: medir por que 61% dos filmes grátis saem sem sujeito lido, antes de mexer no validador).
// Recibo EXATO desta entrega no motor de vídeo: para cada arquivo existente, o hash de antes (origin/main), o de depois e os trechos
// trocados. Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a origin/main — edição desconhecida,
// parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const SUJEITO_CADEIA_2411 = JSON.parse(readFileSync(new URL('./desfaz-sujeito-cadeia-2411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semSujeitoCadeia2411(source, file) {
  const entry = SUJEITO_CADEIA_2411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-sujeito-cadeia-2411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-sujeito-cadeia-2411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaSujeitoCadeia2411Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = SUJEITO_CADEIA_2411.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semSujeitoCadeia2411(text, path)) === lf(upstream)
  const added = SUJEITO_CADEIA_2411.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
