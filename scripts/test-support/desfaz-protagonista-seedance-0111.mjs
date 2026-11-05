import { semK4Sempre0511 } from './desfaz-k4-sempre-0511.mjs' // KINEO-K4-SEMPRE-0511 — a camada mais nova (05/11) sai primeiro
// KINEO-PROTAGONISTA-SEEDANCE-0111 — [TRAVA 8.2 — vai do fundador 01/11 "vai personagem"; conserto local, sem publicar]: o elenco do
// roteiro passa a ser lido pelo SENTIDO (lib/cinematic/elencoSemantico: gpt-4o-mini, JSON estrito, conferido contra o texto, falha
// segura = o determinístico) quando há protagonista nomeado — BRO é pombo, Mila é gente, Max não é o filhote, lugar não é personagem.
// Recibo EXATO desta entrega no motor de vídeo: para cada arquivo existente, o hash de antes (origin/main),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer
// estes trechos devolver EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const PROTAGONISTA_SEEDANCE_0111 = JSON.parse(readFileSync(new URL('./desfaz-protagonista-seedance-0111-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semProtagonistaSeedance0111(source, file) {
  source = semK4Sempre0511(source, file)
  const entry = PROTAGONISTA_SEEDANCE_0111.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-protagonista-seedance-0111: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-protagonista-seedance-0111: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaProtagonistaSeedance0111Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = PROTAGONISTA_SEEDANCE_0111.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semProtagonistaSeedance0111(text, path)) === lf(upstream)
  const added = PROTAGONISTA_SEEDANCE_0111.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
