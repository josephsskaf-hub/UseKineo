// KINEO-GEMINI-NA-ESTEIRA-2511 [CEO 25/11; revisora 25/11, conserto 3] — recibo EXATO desta entrega no caminho grátis do Kling 4: lib/kling4TrialAsyncStatus.ts
// ganha 4 inserções e nada mais: (1) o import do acompanhamento do Gemini; (2) o id antigo do Gemini ainda acha o filme depois da queda; (3) o dublê do
// guardião; (4) o filme que está no Gemini vai ao acompanhamento dele, e a queda volta à lógica de hoje. O relógio do grátis (8 min), o transporte e a
// reserva de hoje não mudam; o comportamento novo é provado em scripts/test-gemini-na-esteira-2511.mjs. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a base (origin/main 6804eb793) — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const GEMINI_NA_ESTEIRA_2511 = JSON.parse(readFileSync(new URL('./desfaz-gemini-na-esteira-2511-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semGeminiNaEsteira2511(source, file) {
  const entry = GEMINI_NA_ESTEIRA_2511.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-gemini-na-esteira-2511: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-gemini-na-esteira-2511: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaGeminiNaEsteira2511Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = GEMINI_NA_ESTEIRA_2511.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semGeminiNaEsteira2511(text, path)) === lf(upstream)
}
