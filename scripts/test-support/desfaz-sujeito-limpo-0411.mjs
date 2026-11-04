// KINEO-SUJEITO-LIMPO-0411 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (assunto-lixo na cena: só um nome próprio limpo e isolado vira assunto).
// Recibo EXATO desta entrega na qualidade do filme: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const SUJEITO_LIMPO_0411 = JSON.parse(readFileSync(new URL('./desfaz-sujeito-limpo-0411-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semSujeitoLimpo0411(source, file) {
  const entry = SUJEITO_LIMPO_0411.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-sujeito-limpo-0411: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-sujeito-limpo-0411: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaSujeitoLimpo0411Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = SUJEITO_LIMPO_0411.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semSujeitoLimpo0411(text, path)) === lf(upstream)
  const added = SUJEITO_LIMPO_0411.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** readFileSync com esta camada desfeita (só nos arquivos do recibo e só se forem exatamente o "depois"); aceita caminho absoluto ou relativo à raiz. */
import { readFileSync as lerCru } from 'node:fs'
import { relative as relativo, join as juntar } from 'node:path'
const RAIZ_SUJEITO_LIMPO = juntar(import.meta.dirname, '..', '..')
export function lerSemSujeitoLimpo(arquivo, codificacao) {
  return semSujeitoLimpoNoTexto(lerCru(arquivo, codificacao), arquivo)
}
/** O mesmo desfazer sobre um texto JÁ lido (para encadear camadas: a mais nova sai primeiro). */
export function semSujeitoLimpoNoTexto(texto, arquivo) {
  if (typeof texto !== 'string') return texto
  const r = rel(/^[a-zA-Z]:[\\/]|^\//.test(String(arquivo)) ? relativo(RAIZ_SUJEITO_LIMPO, String(arquivo)) : String(arquivo))
  return semSujeitoLimpo0411(texto, r)
}
