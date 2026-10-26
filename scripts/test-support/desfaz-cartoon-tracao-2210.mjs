import { semAmostraAnuncio2410 } from './desfaz-amostra-anuncio-2410.mjs' // KINEO-LEVA-2410 — newest siblings first.
import { levaUndoPrefix, semLevaIntegration2410, levaBlob, levaHash } from './leva-integration-2410.mjs' // KINEO-LEVA-2410
// KINEO-CARTOON-TRACAO-2210 — exact, in-memory historical adapter; the new guardian reads real source.
// Only exact diff hunks for declared existing files are undone. Missing/duplicate/mutated hunks throw.
// Changes outside those hunks survive. No network, environment reads, source writes or production calls.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CARTOON_TRACAO_BASE = '7950e41134dd03388e67c131501d3e2bce61a3eb'
export const CARTOON_TRACAO_MARK = 'KINEO-CARTOON-TRACAO-2210'
export const CARTOON_TRACAO_HUNKS = Object.freeze(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-cartoon-tracao-2210-original-hunks.json'), 'utf8')))

export const CARTOON_TRACAO_INTEGRATED_HUNKS = Object.freeze(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-cartoon-tracao-2210-hunks.json'), 'utf8')))
export function reverseCartoonIntegrated2410(text, file) {
  const rel = String(file ?? '').replace(/\\/g, '/'), hunks = CARTOON_TRACAO_INTEGRATED_HUNKS[rel]
  if (typeof text !== 'string' || !hunks) return text
  let result = text.replace(/\r\n/g, '\n')
  for (const hunk of hunks) {
    const count = result.split(hunk.after).length - 1
    if (count !== 1) throw Error('desfaz-cartoon-tracao-2210: integrated context expected exactly 1 candidate match: ' + rel)
    result = result.replace(hunk.after, hunk.before)
  }
  if (levaHash(text) !== levaHash(levaBlob('618bed34', rel)) || result !== levaBlob('3ec6c9d9', rel)) throw Error('desfaz-cartoon-tracao-2210: fonte divergente integrated ' + rel)
  return text.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

export function semCartoonTracao2210(text, file) {
  text = semAmostraAnuncio2410(semLevaIntegration2410(text, file), file) // KINEO-LEVA-2410 — exact reviewed integration edits only.
  const integratedRel = String(file ?? '').replace(/\\/g, '/')
  if (typeof text === 'string' && CARTOON_TRACAO_INTEGRATED_HUNKS[integratedRel] && levaHash(text) === levaHash(levaBlob('618bed34', integratedRel))) return reverseCartoonIntegrated2410(text, integratedRel) // KINEO-LEVA-2410 — actually reverse recorded integrated context, never a prefix-pair shortcut.
  const prefix = levaUndoPrefix(text, file, 'cartoon')
  if (prefix !== null) return prefix // KINEO-LEVA-2410 — preserves every older sibling byte.

  const rel = String(file ?? '').replace(/\\/g, '/')
  const hunks = CARTOON_TRACAO_HUNKS[rel]
  if (typeof text !== 'string' || !hunks || !text.includes(CARTOON_TRACAO_MARK)) return text
  const crlf = text.includes('\r\n')
  let result = text.replace(/\r\n/g, '\n')
  for (const hunk of hunks) {
    const count = result.split(hunk.after).length - 1
    if (count !== 1) throw new Error(`desfaz-cartoon-tracao-2210: ${rel}: expected exactly 1 candidate match, found ${count}`)
    result = result.replace(hunk.after, hunk.before)
  }
  return crlf ? result.replace(/\n/g, '\r\n') : result
}
