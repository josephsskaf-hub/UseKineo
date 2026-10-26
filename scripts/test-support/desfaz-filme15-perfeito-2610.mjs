// KINEO-FILME15-PERFEITO-2610: exact, reversible historical projection only.
// Current product tests must read the raw source. Never import this from product code.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FILME15_PERFEITO_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-filme15-perfeito-2610-fontes.json', import.meta.url), 'utf8'))
export const FILME15_PERFEITO_BASE = FILME15_PERFEITO_MANIFEST.base
const lf = value => value.replace(/\r\n/g, '\n')
const hash = value => createHash('sha256').update(value).digest('hex')
function project(source, file, reverse) {
  const relative = typeof file === 'string' ? file.replace(/\\/g, '/') : file
  const entry = FILME15_PERFEITO_MANIFEST.scope[relative]
  if (typeof source !== 'string' || !entry) return source
  if (hash(JSON.stringify(entry.hunks)) !== entry.hunksSha256) throw Error('FILME15-PERFEITO-2610: divergent manifest ' + relative)
  const text = lf(source), targetHash = reverse ? entry.beforeSha256 : entry.afterSha256
  if (hash(text) === targetHash) return source
  const from = reverse ? 'after' : 'before', to = reverse ? 'before' : 'after'
  const positions = entry.hunks.map(hunk => {
    if (!hunk[from]) throw Error('FILME15-PERFEITO-2610: empty hunk ' + relative)
    const hits = []
    for (let at = text.indexOf(hunk[from]); at >= 0; at = text.indexOf(hunk[from], at + 1)) hits.push(at)
    return { hits, length: hunk[from].length, replacement: hunk[to] }
  })
  if (positions.every(item => item.hits.length === 0)) return source
  if (positions.some(item => item.hits.length !== 1)) throw Error('FILME15-PERFEITO-2610: partial or ambiguous source ' + relative)
  const ordered = positions.map(item => ({ ...item, at: item.hits[0] })).sort((a, b) => b.at - a.at)
  for (let i = 1; i < ordered.length; i++) if (ordered[i].at + ordered[i].length > ordered[i - 1].at) throw Error('FILME15-PERFEITO-2610: overlapping hunks ' + relative)
  let result = text
  for (const item of ordered) result = result.slice(0, item.at) + item.replacement + result.slice(item.at + item.length)
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}
export const semFilme15Perfeito2610 = (source, file) => project(source, file, true)
export const comFilme15Perfeito2610 = (source, file) => project(source, file, false)
