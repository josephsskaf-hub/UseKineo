// KINEO-FAMOSO-FORA-DO-TEXTO-2511 [CEO 25/11; revisora 392f0a52, D5] — recibo EXATO desta entrega no caminho grátis do Kling 4: lib/kling4Trial.ts ganha 3
// trechos e nada mais: (1) o import de semFamosoNoTextoDoMotor2511; (2) cabeComProtecao2611, o corte do teto que guarda a proteção "no readable text…"
// (D1); (3) no buildKling4TrialInput com timing (o grátis), a troca do nome de figura atual da lista no texto final de cada plano. O montador, as durações,
// a referência, o transporte e o filme pago (sem timing) não mudam; o comportamento novo é provado em scripts/test-famoso-fora-do-texto-2511.mjs. Um guardião
// histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base (origin/main) — edição desconhecida, parcial ou a mais continua
// reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FAMOSO_FORA_DO_TEXTO_2511 = JSON.parse(readFileSync(new URL('./desfaz-famoso-fora-do-texto-2511-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semFamosoForaDoTexto2511(source, file) {
  const entry = FAMOSO_FORA_DO_TEXTO_2511.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-famoso-fora-do-texto-2511: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-famoso-fora-do-texto-2511: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaFamosoForaDoTexto2511Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = FAMOSO_FORA_DO_TEXTO_2511.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semFamosoForaDoTexto2511(text, path)) === lf(upstream)
}
