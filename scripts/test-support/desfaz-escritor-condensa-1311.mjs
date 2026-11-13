// KINEO-ESCRITOR-CONDENSA-1311 — [dono 13/11 ~20:10 "quero saber porque todo cliente que falha… e já ter uma solução"; item B da CEO] (a 3ª
// tentativa "condensar" do escritor no filme curto, antes da recusa "declined the topic").
// Recibo EXATO desta entrega no escritor: o hash de antes (a origin/main em que nasceu), o de depois e os trechos trocados; o arquivo novo
// (lib/escritorCondensa.ts) pelo hash. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base —
// edição desconhecida, parcial ou a mais continua reprovando. É a camada mais nova do escritor: desfaz-sem-personagem-inventado-1111 (a
// ponta da cadeia) a tira primeiro. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const ESCRITOR_CONDENSA_1311 = JSON.parse(readFileSync(new URL('./desfaz-escritor-condensa-1311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/').replace(/^.*?(app\/|lib\/|components\/|scripts\/)/, '$1')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semEscritorCondensa1311(source, file) {
  const entry = ESCRITOR_CONDENSA_1311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-escritor-condensa-1311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-escritor-condensa-1311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
