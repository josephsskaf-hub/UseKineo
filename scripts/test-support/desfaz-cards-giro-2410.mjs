// KINEO-CARDS-GIRO-2410 — exact leaf; immutable before bytes, complete target hash, no writes and no older undo imports.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { semCardsBordas2410 } from './desfaz-cards-bordas-2410.mjs' // KINEO-CARDS-BORDAS-2410
export const CARDS_GIRO_2410_BASE = '1c078ed013302ac47c42f783305df688c4e97cfd'
export const CARDS_GIRO_2410_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-cards-giro-2410-fontes.json', import.meta.url), 'utf8'))
export const CARDS_GIRO_2410_FILES = Object.freeze(Object.keys(CARDS_GIRO_2410_MANIFEST.sources))
export const CARDS_GIRO_2410_NEW = Object.freeze(CARDS_GIRO_2410_MANIFEST.newFiles)
const hash = source => createHash('sha256').update(source).digest('hex')
export function semCardsGiro2410(text, file) {
  text = semCardsBordas2410(text, file) // KINEO-CARDS-BORDAS-2410 — camada mais nova sai antes dos hashes do giro.
  const relative = String(file ?? '').replace(/\\/g, '/'), known = CARDS_GIRO_2410_MANIFEST.sources[relative]
  if (typeof text !== 'string' || !known) return text
  if (hash(known.before) !== known.beforeHash) throw Error('desfaz-cards-giro-2410: manifesto divergente ' + relative)
  const actual = hash(text.replace(/\r\n/g, '\n'))
  if (actual === known.beforeHash) return text
  if (actual !== known.afterHash) {
    // Earlier source snapshots and their own mutants have no Giro layer and remain untouched.
    if (!text.includes('KINEO-CARDS-GIRO-2410') && !(known.evidence ?? []).some(fragment => text.includes(fragment))) return text
    throw Error('desfaz-cards-giro-2410: fonte divergente ' + relative)
  }
  return text.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
