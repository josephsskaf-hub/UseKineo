// KINEO-VITRINE-FILMES-2610 — exact task-only projection, in memory.
// Existing files preserve unrelated bytes. New files are removed only when
// their complete frozen content matches; modifications cause a hard refusal.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const VITRINE_2610_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-vitrine-filmes-2610-hunks.json', import.meta.url), 'utf8'))
export const VITRINE_2610_BASE = VITRINE_2610_MANIFEST.base
const hash = value => createHash('sha256').update(value).digest('hex')
const flat = value => value.replace(/\r\n/g, '\n')
const positions = (text, needle) => {
  const matches = []
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) matches.push(at)
  return matches
}

export function semVitrine2610(source, file) {
  const relative = typeof file === 'string' ? file.replace(/\\/g, '/') : file
  const entry = VITRINE_2610_MANIFEST.scope[relative] ?? VITRINE_2610_MANIFEST.testScope?.[relative]
  if (!entry || source === null) return source
  if (typeof source !== 'string') throw Error('VITRINE-2610: source must be string or null: ' + relative)
  const text = flat(source)
  if (entry.kind === 'new') {
    if (hash(entry.after) !== entry.afterSha256) throw Error('VITRINE-2610: divergent manifest: ' + relative)
    if (hash(text) !== entry.afterSha256) throw Error('VITRINE-2610: modified new file; refusing deletion: ' + relative)
    return null
  }
  if (hash(JSON.stringify(entry.hunks)) !== entry.hunksSha256) throw Error('VITRINE-2610: divergent manifest: ' + relative)
  if (hash(text) === entry.beforeSha256) return source
  const candidates = entry.hunks.map(hunk => positions(text, hunk.after))
  // A base file with unrelated edits is already undone. Partial, corrupted or
  // duplicated task hunks are rejected, never erased by a broad text regex.
  if (candidates.every(matches => matches.length === 0)
      && entry.hunks.every(hunk => positions(text, hunk.before).length === 1)) return source
  const rawOffset = position => {
    let raw = 0
    for (let at = 0; at < position; at++) raw += source[raw] === '\r' && source[raw + 1] === '\n' ? 2 : 1
    return raw
  }
  const replacements = entry.hunks.map((hunk, index) => {
    const matches = candidates[index]
    if (matches.length !== 1) throw Error(`VITRINE-2610: ${relative} hunk ${index}: expected exactly 1 candidate match, found ${matches.length}`)
    const start = rawOffset(matches[0]), end = rawOffset(matches[0] + hunk.after.length)
    const replacement = source.slice(start, end).includes('\r\n') ? hunk.before.replace(/\n/g, '\r\n') : hunk.before
    return { start, end, replacement }
  }).sort((a, b) => b.start - a.start)
  for (let index = 1; index < replacements.length; index++) if (replacements[index].end > replacements[index - 1].start) throw Error('VITRINE-2610: overlapping hunks')
  let result = source
  for (const item of replacements) result = result.slice(0, item.start) + item.replacement + result.slice(item.end)
  return result
}
