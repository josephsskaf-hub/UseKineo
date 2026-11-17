// KINEO-K4-GRATIS-20S-1711 [dono 17/11, opção A] — recibo EXATO desta entrega no caminho grátis do Kling 4: lib/kling4Trial.ts (o total do
// clipe, clipSeconds; ausente = 15) e lib/kling4TrialScript.ts (o teto da medição; padrão 15,5). Um guardião histórico só ignora o arquivo
// se desfazer estes trechos devolver EXATAMENTE a origin/main f63918082 — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const K4_GRATIS_20S_1711 = JSON.parse(readFileSync(new URL('./desfaz-k4-gratis-20s-1711-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semK4Gratis20s1711(source, file) {
  const entry = K4_GRATIS_20S_1711.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-k4-gratis-20s-1711: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-k4-gratis-20s-1711: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaK4Gratis20s1711Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = K4_GRATIS_20S_1711.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semK4Gratis20s1711(text, path)) === lf(upstream)
}
