import { semK4Sempre0511 } from './desfaz-k4-sempre-0511.mjs' // KINEO-K4-SEMPRE-0511 — a camada mais nova (05/11) sai primeiro
// KINEO-SEM-INICIO-AUTOMATICO-0211 — [TRAVA 8.2 — aval permanente do fundador (proteção do cliente) 02/11]
// (depois do checkout nada começa sozinho; a duração restaurada é a escolhida — o 35 → 60 da manobiayousaf; o 1º filme que
// custa crédito espera o clique; /create?autostart só preenche).
// Recibo EXATO desta entrega: para cada arquivo existente, o hash de antes (origin/main), o de depois e os trechos trocados;
// para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver
// EXATAMENTE a origin/main — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const SEM_INICIO_AUTOMATICO_0211 = JSON.parse(readFileSync(new URL('./desfaz-sem-inicio-automatico-0211-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semSemInicioAutomatico0211(source, file) {
  source = semK4Sempre0511(source, file)
  const entry = SEM_INICIO_AUTOMATICO_0211.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-sem-inicio-automatico-0211: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-sem-inicio-automatico-0211: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaSemInicioAutomatico0211Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = SEM_INICIO_AUTOMATICO_0211.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semSemInicioAutomatico0211(text, path)) === lf(upstream)
  const added = SEM_INICIO_AUTOMATICO_0211.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
