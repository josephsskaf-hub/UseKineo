// KINEO-GRATIS-REFAZ-CENA-0311 — [TRAVA 8.2 — fundador 03/11: "As 2 sim" — refazer a cena reprovada no 1º filme grátis]
// (teto novo do juiz — época, pessoa inventada, plano parado — no 1º filme grátis de país rico refaz UMA cena).
// Recibo EXATO desta entrega em lib/free15Gate.ts, lib/free15GateServer.ts e scripts/test-painel-motor-entregue-0211.mjs (+ os novos): para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const GRATIS_REFAZ_0311 = JSON.parse(readFileSync(new URL('./desfaz-gratis-refaz-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semGratisRefaz0311(source, file) {
  const entry = GRATIS_REFAZ_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-gratis-refaz-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-gratis-refaz-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaGratisRefaz0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = GRATIS_REFAZ_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semGratisRefaz0311(text, path)) === lf(upstream)
  const added = GRATIS_REFAZ_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** readFileSync com esta camada desfeita (só nos arquivos do recibo e só se forem exatamente o "depois"); aceita caminho absoluto ou relativo à raiz. */
import { readFileSync as lerCru } from 'node:fs'
import { relative as relativo, join as juntar } from 'node:path'
const RAIZ_GRATIS_REFAZ_0311 = juntar(import.meta.dirname, '..', '..')
export function lerSemGratisRefaz0311(arquivo, codificacao) {
  return semGratisRefaz0311NoTexto(lerCru(arquivo, codificacao), arquivo)
}
/** O mesmo desfazer sobre um texto JÁ lido (para encadear camadas: a mais nova sai primeiro). */
export function semGratisRefaz0311NoTexto(texto, arquivo) {
  if (typeof texto !== 'string') return texto
  const r = rel(/^[a-zA-Z]:[\\/]|^\//.test(String(arquivo)) ? relativo(RAIZ_GRATIS_REFAZ_0311, String(arquivo)) : String(arquivo))
  return semGratisRefaz0311(texto, r)
}
