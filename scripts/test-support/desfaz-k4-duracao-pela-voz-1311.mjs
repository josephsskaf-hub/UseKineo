// KINEO-K4-DURACAO-PELA-VOZ-1311 [CEO 13/11, "nota ≥ 8 no teste grátis — a próxima causa"] — recibo EXATO desta entrega no caminho
// grátis do Kling 4 (lib/kling4Trial.ts: o interruptor KLING4_DURACAO_PELA_VOZ, 'all' desde 13/11 05:11, decisão do dono "A").
// Para o arquivo: o hash de antes (a origin/main de que a entrega parte), o de depois e os trechos trocados. Um guardião histórico
// só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais (por
// exemplo o interruptor mudado para 'off' ou 'internal' sem gerar o recibo de novo) continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const K4_DURACAO_PELA_VOZ_1311 = JSON.parse(readFileSync(new URL('./desfaz-k4-duracao-pela-voz-1311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semK4DuracaoPelaVoz1311(source, file) {
  const entry = K4_DURACAO_PELA_VOZ_1311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-k4-duracao-pela-voz-1311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-k4-duracao-pela-voz-1311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaK4DuracaoPelaVoz1311Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = K4_DURACAO_PELA_VOZ_1311.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semK4DuracaoPelaVoz1311(text, path)) === lf(upstream)
}
