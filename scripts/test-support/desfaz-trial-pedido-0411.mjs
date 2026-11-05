import { semK4Sempre0511 } from './desfaz-k4-sempre-0511.mjs' // KINEO-K4-SEMPRE-0511 — a camada mais nova (05/11) sai primeiro
// KINEO-TRIAL-A-PEDIDO-0411 — [TRAVA 8.2 — fundador 04/11: "Metade das contas sem crédito" + "2a"]
// (o lado "a pedido" do teste: a recusa na rota gerativa).
// Recibo EXATO desta entrega: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const TRIAL_PEDIDO_0411 = JSON.parse(readFileSync(new URL('./desfaz-trial-pedido-0411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semTrialPedido0411(source, file) {
  source = semK4Sempre0511(source, file)
  const entry = TRIAL_PEDIDO_0411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-trial-pedido-0411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-trial-pedido-0411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaTrialPedido0411Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = TRIAL_PEDIDO_0411.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semTrialPedido0411(text, path)) === lf(upstream)
  const added = TRIAL_PEDIDO_0411.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** readFileSync com esta camada desfeita (só nos arquivos do recibo e só se forem exatamente o "depois"); aceita caminho absoluto ou relativo à raiz. */
import { readFileSync as lerCru } from 'node:fs'
import { relative as relativo, join as juntar } from 'node:path'
const RAIZ_TRIAL_PEDIDO = juntar(import.meta.dirname, '..', '..')
export function lerSemTrialPedido(arquivo, codificacao) {
  return semTrialPedidoNoTexto(lerCru(arquivo, codificacao), arquivo)
}
/** O mesmo desfazer sobre um texto JÁ lido (para encadear camadas: a mais nova sai primeiro). */
export function semTrialPedidoNoTexto(texto, arquivo) {
  texto = semK4Sempre0511(texto, arquivo)
  if (typeof texto !== 'string') return texto
  const r = rel(/^[a-zA-Z]:[\\/]|^\//.test(String(arquivo)) ? relativo(RAIZ_TRIAL_PEDIDO, String(arquivo)) : String(arquivo))
  return semTrialPedido0411(texto, r)
}
