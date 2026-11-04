// KINEO-CITADO-NAO-AGE-0311 — [TRAVA 8.2 — fundador 03/11: "já pode arrumar"]
// (quem o roteiro só cita não vira personagem de quem abre a história; uma descrição por pessoa).
// Recibo EXATO desta entrega nas camadas de elenco: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const CITADO_NAO_AGE_0311 = JSON.parse(readFileSync(new URL('./desfaz-citado-nao-age-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semCitadoNaoAge0311(source, file) {
  const entry = CITADO_NAO_AGE_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-citado-nao-age-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-citado-nao-age-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaCitadoNaoAge0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = CITADO_NAO_AGE_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semCitadoNaoAge0311(text, path)) === lf(upstream)
  const added = CITADO_NAO_AGE_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** readFileSync com esta camada desfeita (só nos arquivos do recibo e só se forem exatamente o "depois"); aceita caminho absoluto ou relativo à raiz. */
import { readFileSync as lerCru } from 'node:fs'
import { relative as relativo, join as juntar } from 'node:path'
const RAIZ_CITADO_NAO_AGE = juntar(import.meta.dirname, '..', '..')
export function lerSemCitadoNaoAge(arquivo, codificacao) {
  return semCitadoNaoAgeNoTexto(lerCru(arquivo, codificacao), arquivo)
}
/** O mesmo desfazer sobre um texto JÁ lido (para encadear camadas: a mais nova sai primeiro). */
export function semCitadoNaoAgeNoTexto(texto, arquivo) {
  if (typeof texto !== 'string') return texto
  const r = rel(/^[a-zA-Z]:[\\/]|^\//.test(String(arquivo)) ? relativo(RAIZ_CITADO_NAO_AGE, String(arquivo)) : String(arquivo))
  return semCitadoNaoAge0311(texto, r)
}
