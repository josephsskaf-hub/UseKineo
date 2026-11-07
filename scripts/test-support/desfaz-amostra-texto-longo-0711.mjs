// KINEO-AMOSTRA-TEXTO-LONGO-0711 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (a amostra grátis de anúncio não recusa mais o texto longo: o nome FALADO do produto é curto e as frases do próprio escritor encurtam a fala em lib/ads/cena/escolhaPlan.ts).
// Recibo EXATO desta entrega em lib/ads/cena/escolhaPlan.ts: o hash de antes (a origin/main em que nasceu), o de depois e os trechos trocados.
// Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida, parcial
// ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const AMOSTRA_TEXTO_LONGO_0711 = JSON.parse(readFileSync(new URL('./desfaz-amostra-texto-longo-0711-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semAmostraTextoLongo0711(source, file) {
  const entry = AMOSTRA_TEXTO_LONGO_0711.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-amostra-texto-longo-0711: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-amostra-texto-longo-0711: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "base + esta entrega"? */
export function deltaAmostraTextoLongo0711Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = AMOSTRA_TEXTO_LONGO_0711.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semAmostraTextoLongo0711(text, path)) === lf(upstream)
  const added = AMOSTRA_TEXTO_LONGO_0711.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
