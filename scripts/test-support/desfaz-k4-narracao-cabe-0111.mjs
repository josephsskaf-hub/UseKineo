// KINEO-K4-NARRACAO-CABE-0111 — [TRAVA 8.2 — vai do fundador 02/11 "2 c"]
// (opção C: o escritor do filme grátis Kling 4 escreve na faixa medida, dentro da do Seedance de 15 s; a rota mede a fala — a TTS da
// montagem, reaproveitada no cache, com prazo próprio — antes do POST pago; a sobra é movimento).
// Recibo EXATO desta entrega no motor de vídeo: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const K4_NARRACAO_CABE_0111 = JSON.parse(readFileSync(new URL('./desfaz-k4-narracao-cabe-0111-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semK4NarracaoCabe0111(source, file) {
  const entry = K4_NARRACAO_CABE_0111.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-k4-narracao-cabe-0111: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-k4-narracao-cabe-0111: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaK4NarracaoCabe0111Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = K4_NARRACAO_CABE_0111.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semK4NarracaoCabe0111(text, path)) === lf(upstream)
  const added = K4_NARRACAO_CABE_0111.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
