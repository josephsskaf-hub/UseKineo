// KINEO-K4-PAGO-SILENCIO-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (a régua de silêncio do Kling 4 PAGO de 15 s julga o clipe único de 15 s com a fala inteira, no passo real da faixa do escritor).
// Recibo EXATO desta entrega no motor de vídeo: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const K4_PAGO_SILENCIO_0211 = JSON.parse(readFileSync(new URL('./desfaz-k4-pago-silencio-0211-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semK4PagoSilencio0211(source, file) {
  const entry = K4_PAGO_SILENCIO_0211.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-k4-pago-silencio-0211: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-k4-pago-silencio-0211: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaK4PagoSilencio0211Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = K4_PAGO_SILENCIO_0211.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semK4PagoSilencio0211(text, path)) === lf(upstream)
  const added = K4_PAGO_SILENCIO_0211.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
