import { semK4Sempre0511 } from './desfaz-k4-sempre-0511.mjs' // KINEO-K4-SEMPRE-0511 — a camada mais nova (05/11) sai primeiro
// KINEO-MURO-PRIMEIRO-FILME-0311 — [TRAVA 8.2 — "vai" do fundador 03/11]
// (o 1º filme nunca recusa: a recusa com conserto seguro se aperta sozinha; sem oferta paga na tela antes do 1º filme).
// Recibo EXATO desta entrega no GenerateClient, no StudioClient e em lib/recusaBotao: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { semDuracaoColadaSaldo0411 } from './desfaz-duracao-colada-saldo-0411.mjs' // KINEO-DURACAO-COLADA-SALDO-0411 — camada mais nova (04/11, laço do revisor) sai primeiro
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const MURO_PRIMEIRO_FILME_0311 = JSON.parse(readFileSync(new URL('./desfaz-muro-primeiro-filme-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semMuroPrimeiroFilme0311(source, file) {
  source = semK4Sempre0511(source, file)
  source = semDuracaoColadaSaldo0411(source, file) // KINEO-DURACAO-COLADA-SALDO-0411
  const entry = MURO_PRIMEIRO_FILME_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-muro-primeiro-filme-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-muro-primeiro-filme-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaMuroPrimeiroFilme0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = MURO_PRIMEIRO_FILME_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semMuroPrimeiroFilme0311(text, path)) === lf(upstream)
  const added = MURO_PRIMEIRO_FILME_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
