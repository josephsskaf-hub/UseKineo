// KINEO-FALA-PARA-CLIENTE-2611 [CEO 26/11, item 3] — recibo EXATO desta entrega no servidor do portão free15: lib/free15GateServer.ts ganha 2 trechos e nada
// mais: (1) o import de montagemFalada2511; (2) a dependência `falado` do advanceFree15Gate (o filme falado do claim não é reparado). O juiz, a régua do pixel,
// o refazer da cena e o desconto da marca não mudam; o comportamento novo é provado em scripts/test-fala-para-cliente-2611.mjs. Um guardião histórico só
// ignora estes trechos se desfazê-los devolver EXATAMENTE o arquivo de antes desta entrega — edição desconhecida, parcial ou a mais continua reprovando.
// É a camada mais nova: sai ANTES das outras (desfaz-gratis-refaz-imagem-0311, desfaz-gratis-refaz-0311, desfaz-elenco-trava-0311). Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FALA_PARA_CLIENTE_2611 = JSON.parse(readFileSync(new URL('./desfaz-fala-para-cliente-2611-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semFalaParaCliente2611(source, file) {
  const entry = FALA_PARA_CLIENTE_2611.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-fala-para-cliente-2611: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-fala-para-cliente-2611: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
