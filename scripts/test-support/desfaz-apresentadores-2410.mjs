import { levaUndoPrefix, semLevaIntegration2410 } from './leva-integration-2410.mjs' // KINEO-LEVA-2410
import { semCompraAvulsa2410 } from './desfaz-compra-avulsa-2410.mjs' // KINEO-LEVA-2410 — newest sibling first.
// KINEO-APRESENTADORES-2410 — exact source layer; unknown edits fail closed.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const APRESENTADORES_2410_BASE = '1c078ed013302ac47c42f783305df688c4e97cfd'
export const APRESENTADORES_2410_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-apresentadores-2410-fontes.json', import.meta.url), 'utf8'))
const hash = value => createHash('sha256').update(value).digest('hex')
export function semApresentadores2410(text, file) {
  text = semLevaIntegration2410(text, file) // KINEO-LEVA-2410 — exact reviewed integration edits only.
  text = semCompraAvulsa2410(text, file) // KINEO-LEVA-2410
  const prefix = levaUndoPrefix(text, file, 'presenters')
  if (prefix !== null) return prefix // KINEO-LEVA-2410 — preserves every older sibling byte.

  const known = APRESENTADORES_2410_MANIFEST.sources[String(file ?? '').replace(/\\/g, '/')]
  if (!known || typeof text !== 'string') return text
  const source = text.replace(/\r\n/g, '\n'), digest = hash(source)
  if (digest === known.beforeHash) return text
  if (digest === known.afterHash) {
    if (hash(known.before) !== known.beforeHash) throw new Error('apresentadores_2410_corrupt_undo_manifest:' + file)
    return text.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
  }
  // Historical guardians can enter at an older layer, before this task existed.
  if (!text.includes('KINEO-APRESENTADORES-2410')) return text
  throw new Error('apresentadores_2410_source_diverged:' + file)
}
