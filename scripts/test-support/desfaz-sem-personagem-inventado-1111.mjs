// KINEO-SEM-PERSONAGEM-INVENTADO-1111 — [CEO 11/11, filme 657ad797] (o roteirista não acrescenta personagem que o pedido não tem: uma frase
// na regra de fidelidade de app/api/generate-script/route.ts + a medida pessoa_inventada no script_written).
// Recibo EXATO desta entrega no escritor: o hash de antes (a origin/main em que nasceu), o de depois e os trechos trocados; o arquivo novo
// (lib/pessoaInventadaNoRoteiro.ts) pelo hash. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base —
// edição desconhecida, parcial ou a mais continua reprovando. É a camada mais nova do escritor: desfaz-ficha-do-pedido-0911 (a ponta de toda
// cadeia) a tira primeiro. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { semEscritorCondensa1311 } from './desfaz-escritor-condensa-1311.mjs' // KINEO-ESCRITOR-CONDENSA-1311 — a camada mais nova (13/11) sai primeiro

export const SEM_PERSONAGEM_INVENTADO_1111 = JSON.parse(readFileSync(new URL('./desfaz-sem-personagem-inventado-1111-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/').replace(/^.*?(app\/|lib\/|components\/|scripts\/)/, '$1')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semSemPersonagemInventado1111(source, file) {
  source = semEscritorCondensa1311(source, file) // KINEO-ESCRITOR-CONDENSA-1311
  const entry = SEM_PERSONAGEM_INVENTADO_1111.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-sem-personagem-inventado-1111: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-sem-personagem-inventado-1111: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
