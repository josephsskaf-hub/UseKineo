// KINEO-LEGENDA-CENA-3110 — [TRAVA 8.2 — vai do fundador 31/10: "pode fazer os 3 consertos agora"
// (revisor 30/10 23:20: legenda fecha frase em ؟ ۔ । 。！？; cena com ação e lado da câmera; última cena ≠ primeira)].
// Recibo EXATO desta entrega no motor de vídeo: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const LEGENDA_CENA_3110 = JSON.parse(readFileSync(new URL('./desfaz-legenda-cena-3110-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semLegendaCena3110(source, file) {
  const entry = LEGENDA_CENA_3110.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-legenda-cena-3110: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-legenda-cena-3110: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaLegendaCena3110Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = LEGENDA_CENA_3110.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semLegendaCena3110(text, path)) === lf(upstream)
  const added = LEGENDA_CENA_3110.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
