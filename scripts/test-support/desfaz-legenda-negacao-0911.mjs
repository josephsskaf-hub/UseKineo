// KINEO-LEGENDA-NEGACAO-0911 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (a legenda não separa a negação do que ela nega: o corte por teto de palavras de lib/compose.ts — Whisper e proporcional — chama lib/legendaNegacao.ts).
// Recibo EXATO desta entrega em lib/compose.ts: o hash de antes (a origin/main em que nasceu), o de depois e os trechos trocados.
// Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida, parcial
// ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { semLegendaSemAspas1111 } from './desfaz-legenda-sem-aspas-1111.mjs' // KINEO-LEGENDA-SEM-ASPAS-1111 — camada mais nova do compose (11/11) sai primeiro
import { semSemPersonagemInventado1111 } from './desfaz-sem-personagem-inventado-1111.mjs' // KINEO-SEM-PERSONAGEM-INVENTADO-1111 — camada mais nova do escritor (11/11) sai primeiro

export const LEGENDA_NEGACAO_0911 = JSON.parse(readFileSync(new URL('./desfaz-legenda-negacao-0911-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semLegendaNegacao0911(source, file) {
  source = semSemPersonagemInventado1111(semLegendaSemAspas1111(source, file), file) // KINEO-LEGENDA-SEM-ASPAS-1111 + KINEO-SEM-PERSONAGEM-INVENTADO-1111 — as camadas mais novas (11/11) saem antes, em toda cadeia
  const entry = LEGENDA_NEGACAO_0911.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-legenda-negacao-0911: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-legenda-negacao-0911: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "base + esta entrega"? */
export function deltaLegendaNegacao0911Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = LEGENDA_NEGACAO_0911.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semLegendaNegacao0911(text, path)) === lf(upstream)
  const added = LEGENDA_NEGACAO_0911.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
