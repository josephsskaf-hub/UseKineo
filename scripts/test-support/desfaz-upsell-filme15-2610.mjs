// KINEO-UPSELL-FILME15-2610 — exact newest layer for historical guardians only.
// Current behavior is tested raw by test-upsell-filme15-2610.mjs. No source file is changed here.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const UPSELL_FILME15_2610 = JSON.parse(readFileSync(new URL('./desfaz-upsell-filme15-2610-hunks.json', import.meta.url), 'utf8'))
const sha = text => createHash('sha256').update(text).digest('hex')
export function semUpsellFilme152610(source, file) {
  const rel = String(file ?? '').replace(/\\/g, '/'), entry = UPSELL_FILME15_2610.scope[rel] ?? UPSELL_FILME15_2610.readerScope?.[rel]
  if (!entry || typeof source !== 'string') return source
  const crlf = source.includes('\r\n'); let text = source.replace(/\r\n/g, '\n')
  if (sha(text) === entry.beforeSha256) return source
  // Older historical snapshots have no identifiable trace of this task.
  if (!entry.evidence.some(fragment => text.includes(fragment))) return source
  for (const hunk of entry.hunks) {
    const occurrences = text.split(hunk.after).length - 1
    if (occurrences !== 1) throw new Error(`desfaz upsell-filme15-2610: ${occurrences === 0 ? 'missing' : 'ambiguous'} hunk in ${rel}`)
    text = text.replace(hunk.after, () => hunk.before)
  }
  if (sha(text) !== entry.beforeSha256) throw new Error('desfaz upsell-filme15-2610: source differs from immutable main in ' + rel)
  return crlf ? text.replace(/\n/g, '\r\n') : text
}
