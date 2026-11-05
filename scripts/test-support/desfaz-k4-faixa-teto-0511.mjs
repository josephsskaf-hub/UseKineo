// KINEO-K4-FAIXA-TETO-0511 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (o roteiro do filme grátis Kling 4 nasce na faixa, também quando o escritor condensa texto colado; acima do teto, uma apara).
// Recibo EXATO desta entrega no escritor: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { semBotao35s0411 } from './desfaz-botao-35s-0411.mjs' // KINEO-BOTAO-35S-0411 — camada mais nova (04/11) sai primeiro
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const K4_FAIXA_TETO_0511 = JSON.parse(readFileSync(new URL('./desfaz-k4-faixa-teto-0511-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semK4FaixaTeto0511(source, file) {
  source = semBotao35s0411(source, file) // KINEO-BOTAO-35S-0411
  const entry = K4_FAIXA_TETO_0511.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-k4-faixa-teto-0511: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-k4-faixa-teto-0511: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaK4FaixaTeto0511Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  source = semBotao35s0411(source, file) // KINEO-BOTAO-35S-0411
  const path = rel(file), text = lf(source), entry = K4_FAIXA_TETO_0511.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semK4FaixaTeto0511(text, path)) === lf(upstream)
  const added = K4_FAIXA_TETO_0511.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** readFileSync com esta camada desfeita (só nos arquivos do recibo e só se forem exatamente o "depois"); aceita caminho absoluto ou relativo à raiz. */
import { readFileSync as lerCru } from 'node:fs'
import { relative as relativo, join as juntar, isAbsolute as eAbsoluto } from 'node:path'
const RAIZ_K4_FAIXA = juntar(import.meta.dirname, '..', '..')
export function lerSemK4FaixaTeto(arquivo, codificacao) {
  const texto = lerCru(arquivo, codificacao)
  if (typeof texto !== 'string') return texto
  const r = rel(eAbsoluto(String(arquivo)) ? relativo(RAIZ_K4_FAIXA, String(arquivo)) : String(arquivo))
  return semK4FaixaTeto0511(texto, r)
}
