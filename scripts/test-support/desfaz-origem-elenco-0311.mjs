// KINEO-ORIGEM-DO-ELENCO-0311 — [TRAVA 8.2 — fundador 03/11: "Conserta a etnia agora"]
// (de onde é quem está em cena, em todos os motores + KINEO-LEGENDA-NUMERO-CARREGA-0311).
// Recibo EXATO desta entrega: para cada arquivo existente, o hash de antes (origin/main), o de depois e os trechos trocados; para cada
// arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a origin/main —
// edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { relative as relativo, join as juntar } from 'node:path'
import { semLeva3Revisor0311 } from './desfaz-leva3-revisor-0311.mjs'

export const ORIGEM_ELENCO_0311 = JSON.parse(readFileSync(new URL('./desfaz-origem-elenco-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
const RAIZ = juntar(import.meta.dirname, '..', '..')
const caminho = (arquivo) => rel(/^[a-zA-Z]:[\\/]|^\//.test(String(arquivo)) ? relativo(RAIZ, String(arquivo)) : String(arquivo))

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semOrigemElenco0311(source, file) {
  const entry = ORIGEM_ELENCO_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-origem-elenco-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-origem-elenco-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaOrigemElenco0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = ORIGEM_ELENCO_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semOrigemElenco0311(text, path)) === lf(upstream)
  const added = ORIGEM_ELENCO_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** O mesmo desfazer sobre um texto JÁ lido (para encadear camadas: a mais nova sai primeiro). */
export function semOrigemElencoNoTexto(texto, arquivo) {
  if (typeof texto !== 'string') return texto
  return semOrigemElenco0311(texto, caminho(arquivo))
}
/** readFileSync com esta camada desfeita. */
export function lerSemOrigemElenco(arquivo, codificacao) {
  return semOrigemElencoNoTexto(readFileSync(arquivo, codificacao), arquivo)
}
/** A leitura da camada Leva 3 (lib/compose.ts) com esta camada, mais nova, desfeita antes: troca lerSemLeva3 nas cadeias de leitura. */
export function lerSemOrigemNemLeva3(arquivo, codificacao) {
  const texto = lerSemOrigemElenco(arquivo, codificacao)
  return typeof texto === 'string' ? semLeva3Revisor0311(texto, caminho(arquivo)) : texto
}
