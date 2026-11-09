// KINEO-QUANDO-NAO-E-GALINHA-0911 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// ("when Lucas" não vira mais galinha: a espécie do personagem só é lida de palavra inteira em lib/cinematic/elencoEpoca.ts, tipoDe).
// Recibo EXATO desta entrega em lib/cinematic/elencoEpoca.ts: o hash de antes (a origin/main em que nasceu), o de depois e os trechos trocados.
// Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida, parcial
// ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const QUANDO_NAO_E_GALINHA_0911 = JSON.parse(readFileSync(new URL('./desfaz-quando-nao-e-galinha-0911-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semQuandoNaoEGalinha0911(source, file) {
  const entry = QUANDO_NAO_E_GALINHA_0911.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-quando-nao-e-galinha-0911: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-quando-nao-e-galinha-0911: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "base + esta entrega"? */
export function deltaQuandoNaoEGalinha0911Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = QUANDO_NAO_E_GALINHA_0911.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semQuandoNaoEGalinha0911(text, path)) === lf(upstream)
  const added = QUANDO_NAO_E_GALINHA_0911.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
