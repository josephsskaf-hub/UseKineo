// KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 + KINEO-SUJEITO-NA-METADE-1711 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (revisor 17/11, filme 44d02f20, Kling 4 grátis, nota 5: "In 1950, a plane vanished" sem avião — a leitura do sujeito segue pelas frases
// seguintes da narração, e a frase do sujeito sobrevive à cena fundida do pedido por seção).
// Recibo EXATO desta entrega no motor de vídeo: para cada arquivo existente, o hash de antes (origin/main), o de depois e os trechos
// trocados. Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a origin/main — edição desconhecida,
// parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const SUJEITO_FALA_SEGUINTE_1711 = JSON.parse(readFileSync(new URL('./desfaz-sujeito-fala-seguinte-1711-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semSujeitoFalaSeguinte1711(source, file) {
  const entry = SUJEITO_FALA_SEGUINTE_1711.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-sujeito-fala-seguinte-1711: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-sujeito-fala-seguinte-1711: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaSujeitoFalaSeguinte1711Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = SUJEITO_FALA_SEGUINTE_1711.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semSujeitoFalaSeguinte1711(text, path)) === lf(upstream)
  const added = SUJEITO_FALA_SEGUINTE_1711.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
