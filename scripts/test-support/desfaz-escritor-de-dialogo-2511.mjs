// KINEO-ESCRITOR-DE-DIALOGO-2511 — [CEO 25/11 noite; decisão em docs/estrategia/DECISAO-PERSONAGEM-FALANDO-2511.md] (o escritor do modo "personagens
// falam": um import e um bloco no começo do POST de app/api/generate-script/route.ts, mais o arquivo novo lib/cinematic/escritorDeDialogo2511.ts).
// Recibo EXATO desta entrega no escritor: o hash de antes (a origin/main eb07dbd73 em que nasceu), o de depois e os trechos trocados; o arquivo novo pelo
// hash. Um guardião histórico só ignora a camada se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida, parcial ou a mais continua
// reprovando. É a camada MAIS NOVA do escritor: desfaz-escritor-condensa-1311 (a anterior) a tira primeiro. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const ESCRITOR_DE_DIALOGO_2511 = JSON.parse(readFileSync(new URL('./desfaz-escritor-de-dialogo-2511-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/').replace(/^.*?(app\/|lib\/|components\/|scripts\/)/, '$1')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semEscritorDeDialogo2511(source, file) {
  const entry = ESCRITOR_DE_DIALOGO_2511.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-escritor-de-dialogo-2511: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-escritor-de-dialogo-2511: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
