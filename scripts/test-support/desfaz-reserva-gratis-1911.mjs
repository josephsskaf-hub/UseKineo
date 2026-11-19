// KINEO-RESERVA-GRATIS-1911 [CEO 19/11, Frente 1] — recibo EXATO desta entrega no caminho grátis do Kling 4: lib/kling4TrialAsyncStatus.ts (a
// consulta de status no prazo de 8 min, interruptor K4_ESPERA_QUEM_RODA_1911) e lib/kling4TrialScript.ts (o motivo novo
// 'narration_short_unscaled_kling4' no tipo). Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base
// 114018ade — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app. Gerador: gerar-recibo-reserva-gratis-1911.mjs.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const RESERVA_GRATIS_1911 = JSON.parse(readFileSync(new URL('./desfaz-reserva-gratis-1911-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semReservaGratis1911(source, file) {
  const entry = RESERVA_GRATIS_1911.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-reserva-gratis-1911: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-reserva-gratis-1911: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaReservaGratis1911Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = RESERVA_GRATIS_1911.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semReservaGratis1911(text, path)) === lf(upstream)
}
