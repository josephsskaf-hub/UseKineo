// KINEO-JUIZ-PERGUNTAS-0311 — [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]
// (as perguntas novas do crítico do still: época, pessoa em cena sem gente, estilo foto × desenho).
// Recibo EXATO desta entrega (frente B) em lib/cinematic/criticoStill.ts (protegido), lib/regua95/pixelScore.ts, coletar.ts, lib/free15GateServer.ts e
// scripts/test-despacho-vazio (+ os arquivos novos, por hash): o hash de antes (origin/main), o de depois e os trechos trocados.
// Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou
// a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FRENTE_B_0311 = JSON.parse(readFileSync(new URL('./desfaz-frente-b-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semFrenteB0311(source, file) {
  const entry = FRENTE_B_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-frente-b-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-frente-b-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaFrenteB0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = FRENTE_B_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semFrenteB0311(text, path)) === lf(upstream)
  const added = FRENTE_B_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}

/** readFileSync com esta camada desfeita (só nos 2 arquivos do recibo e só se forem exatamente o "depois"); aceita caminho absoluto ou relativo à raiz. */
import { readFileSync as lerCru } from 'node:fs'
import { relative as relativo, join as juntar } from 'node:path'
const RAIZ_FRENTE_B_0311 = juntar(import.meta.dirname, '..', '..')
export function lerSemFrenteB0311(arquivo, codificacao) {
  return semFrenteB0311NoTexto(lerCru(arquivo, codificacao), arquivo)
}
/** O mesmo desfazer sobre um texto JÁ lido (para encadear camadas: a mais nova sai primeiro). */
export function semFrenteB0311NoTexto(texto, arquivo) {
  if (typeof texto !== 'string') return texto
  const r = rel(/^[a-zA-Z]:[\\/]|^\//.test(String(arquivo)) ? relativo(RAIZ_FRENTE_B_0311, String(arquivo)) : String(arquivo))
  return semFrenteB0311(texto, r)
}
