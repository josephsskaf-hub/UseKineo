// VIDEO-FIEL-2610 — frozen, reversible compatibility for historical guardians only.
// Current behavior tests must never import this projection. No product module uses it.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const VIDEO_FIEL_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-video-fiel-2610-fontes.json', import.meta.url), 'utf8'))
export const VIDEO_FIEL_BASE = VIDEO_FIEL_MANIFEST.base
const flat = value => value.replace(/\r\n/g, '\n')
const hash = value => createHash('sha256').update(value).digest('hex')

function project(source, file, direction) {
  const relative = typeof file === 'string' ? file.replace(/\\/g, '/') : file
  const entry = VIDEO_FIEL_MANIFEST.scope[relative]
  if (typeof source !== 'string' || !entry) return source
  if (hash(JSON.stringify(entry.hunks)) !== entry.hunksSha256) throw new Error('VIDEO-FIEL-2610: divergent manifest ' + relative)
  const text = flat(source), reverse = direction === 'reverse'
  const targetHash = reverse ? entry.beforeSha256 : entry.afterSha256
  if (hash(text) === targetHash) return source
  const from = reverse ? 'after' : 'before', to = reverse ? 'before' : 'after'
  const matches = entry.hunks.map((hunk, index) => {
    if (!hunk[from]) throw new Error('VIDEO-FIEL-2610: empty hunk ' + relative)
    const positions = []
    for (let at = text.indexOf(hunk[from]); at >= 0; at = text.indexOf(hunk[from], at + 1)) positions.push(at)
    return { index, positions, length: hunk[from].length, replacement: hunk[to] }
  })
  // An older unrelated source remains untouched. Unknown bytes are never erased;
  // frozen hash checks in the historical guardians still reject any divergence.
  if (matches.every(item => item.positions.length === 0)) return source
  if (matches.some(item => item.positions.length !== 1)) throw new Error('VIDEO-FIEL-2610: partial or ambiguous source ' + relative)
  const ordered = matches.map(item => ({ ...item, at: item.positions[0] })).sort((a, b) => b.at - a.at)
  for (let i = 1; i < ordered.length; i++) if (ordered[i].at + ordered[i].length > ordered[i - 1].at) throw new Error('VIDEO-FIEL-2610: overlapping hunks ' + relative)
  let result = text
  for (const item of ordered) result = result.slice(0, item.at) + item.replacement + result.slice(item.at + item.length)
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

export const semVideoFiel2610 = (source, file) => project(source, file, 'reverse')
export const comVideoFiel2610 = (source, file) => project(source, file, 'forward')
