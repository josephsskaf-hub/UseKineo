// KINEO-LEVA-2410 — exact in-memory projections of the four immutable merge prefixes.
// Original branch guardians remain intact; current-tree hashes and inventory are checked separately.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
export const LEVA_MANIFEST_PATH = 'scripts/test-support/leva-integration-2410-fontes.json'
export const LEVA = JSON.parse(readFileSync(new URL('./leva-integration-2410-fontes.json', import.meta.url), 'utf8'))
export const levaLf = text => text.replace(/\r\n/g, '\n')
// Hashes are pure functions of exact immutable string values. Historical chains
// revisit the same few snapshots thousands of times; mutants have different keys.
// Only digests are cached: every manifest/known-hash comparison still executes.
const digestCache = new Map(), DIGEST_CACHE_LIMIT = 64, DIGEST_CACHE_BYTES = 8 << 20
let digestBytes = 0
export function levaHash(text) {
  const cached = digestCache.get(text)
  if (cached !== undefined) return cached
  const digest = createHash('sha256').update(levaLf(text)).digest('hex'), bytes = text.length * 2
  if (bytes <= DIGEST_CACHE_BYTES) {
    while (digestCache.size >= DIGEST_CACHE_LIMIT || digestBytes + bytes > DIGEST_CACHE_BYTES) {
      const oldest = digestCache.keys().next().value
      digestCache.delete(oldest); digestBytes -= oldest.length * 2
    }
    digestCache.set(text, digest); digestBytes += bytes
  }
  return digest
}
const cache = new Map()
const missing = new Set()
let warmed = false
function warmPrefixes() {
  if (warmed) return
  warmed = true
  const refs = [...new Set([LEVA.base, LEVA.head, ...Object.values(LEVA.layers).flatMap(layer => [layer.base, layer.before, layer.after, layer.original]).filter(Boolean)])]
  const files = [...new Set(Object.values(LEVA.layers).flatMap(layer => layer.files ?? []))]
  const queries = refs.flatMap(ref => files.map(file => ref + ':' + file))
  const bytes = execFileSync('git', ['cat-file', '--batch'], { input: queries.join('\n') + '\n', windowsHide: true, maxBuffer: 256 << 20, stdio: ['pipe','pipe','ignore'] })
  let offset = 0
  for (const key of queries) {
    const end = bytes.indexOf(10, offset), header = bytes.toString('utf8', offset, end)
    offset = end + 1
    if (header.endsWith(' missing')) { missing.add(key); continue }
    const size = Number(header.slice(header.lastIndexOf(' ') + 1))
    if (!Number.isSafeInteger(size) || size < 0) throw Error('KINEO-LEVA-2410: invalid immutable blob header')
    cache.set(key, bytes.toString('utf8', offset, offset + size).replace(/\r\n/g, '\n'))
    offset += size + 1
  }
}
export function levaGit(...args) { return execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n') }
export function levaBlob(ref, file) {
  warmPrefixes()
  const key = ref + ':' + file
  if (missing.has(key)) throw Error('Immutable blob did not exist: ' + key)
  if (!cache.has(key)) cache.set(key, levaGit('show', key))
  return cache.get(key)
}
const rel = file => String(file ?? '').replace(/\\/g, '/')
const eol = (source, original) => original.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source

// This adapter removes ONLY the reviewed integration edits after the last merge.
// An unrecognized historical source is left to its original exact guardian.
export function semLevaIntegration2410(text, file) {
  if (typeof text !== 'string') return text
  const path = rel(file), known = LEVA.sources[path]
  if (!known || levaHash(text) !== known.hash) return text
  let before
  try { before = levaBlob(LEVA.head, path) } catch { return text }
  return eol(before, text)
}

// Exact merge-prefix undo. Each caller first removes its newer sibling layers.
// Returning null delegates original branch sources/mutants to the original leaf logic.
export function levaUndoPrefix(text, file, task) {
  if (typeof text !== 'string') return null
  const path = rel(file), layer = LEVA.layers[task]
  if (!layer.files.includes(path)) return null
  const before = levaBlob(layer.before, path), after = levaBlob(layer.after, path)
  const hash = levaHash(text)
  if (hash === levaHash(after)) return eol(before, text)
  if (hash === levaHash(before)) return text
  // Repeated historical adapters can re-enter at any exact older prefix. In
  // particular the sample SQL dependency is also evidence in the purchase leaf.
  const prefixes = [LEVA.base, ...['cards','cartoon','sample','presenters','purchase'].map(key => LEVA.layers[key].after)]
  for (const ref of prefixes.slice(0, prefixes.indexOf(layer.after))) {
    try { if (hash === levaHash(levaBlob(ref, path))) return text } catch { /* File did not exist yet. */ }
  }
  const order = ['cards','cartoon','sample','presenters','purchase']
  for (const key of order.slice(0, order.indexOf(task))) {
    try { if (hash === levaHash(levaBlob(LEVA.layers[key].original, path))) return text } catch { /* File did not exist yet. */ }
  }
  return null
}

// The old proofs still check their exact original branch source, SHA and baseline.
// Projection is allowed only after the live physical source passes its sealed hash.
export function levaTaskSource(text, file, task) {
  if (typeof text !== 'string') return text
  const path = rel(file), known = LEVA.sources[path]
  const original = levaBlob(LEVA.layers[task].original, path)
  if (known ? levaHash(text) !== known.hash : levaHash(text) !== levaHash(original)) throw Error('KINEO-LEVA-2410: fonte divergente ' + path)
  return eol(original, text)
}

export function levaCurrentInventory(base) {
  return [...new Set([...levaGit('diff', '--name-only', base).trim().split('\n'), ...levaGit('ls-files', '--others', '--exclude-standard').trim().split('\n')])].filter(Boolean).sort()
}
let expectedLayers
export function verifyLevaManifest() {
  if (LEVA.base !== '1c078ed013302ac47c42f783305df688c4e97cfd' || LEVA.head !== '68c65670') throw Error('KINEO-LEVA-2410: manifesto divergente: base/head')
  if (!expectedLayers) {
    expectedLayers = {
      cards: { base: LEVA.base, original: '3ec6c9d9', before: LEVA.base, after: '3ec6c9d9' },
      sample: { base: LEVA.base, original: '17afd045d', before: '618bed34', after: 'cfd30692' },
      presenters: { base: LEVA.base, original: '3a4db3096', before: 'cfd30692', after: '418971fd' },
      purchase: { base: '7950e41134dd03388e67c131501d3e2bce61a3eb', original: '51b6431ce', before: '418971fd', after: '68c65670' },
      cartoon: { base: '7950e41134dd03388e67c131501d3e2bce61a3eb', original: 'c91476688', before: '3ec6c9d9', after: '618bed34' },
      languages: { base: '8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405', original: '7950e41134dd03388e67c131501d3e2bce61a3eb' },
    }
    for (const layer of Object.values(expectedLayers)) if (layer.after) layer.files = levaGit('diff', '--name-only', '--diff-filter=M', layer.before, layer.after).trim().split('\n').filter(Boolean)
  }
  if (JSON.stringify(LEVA.layers) !== JSON.stringify(expectedLayers)) throw Error('KINEO-LEVA-2410: manifesto divergente: exact layer metadata/files')
  const textFiles = LEVA.inventory.filter(file => file !== LEVA_MANIFEST_PATH && /\.(?:mjs|cjs|js|jsx|ts|tsx|json|ya?ml|sql|md|html|css|txt|log)$/.test(file)).sort()
  if (JSON.stringify(Object.keys(LEVA.sources).sort()) !== JSON.stringify(textFiles) || Object.values(LEVA.sources).some(entry => !/^[0-9a-f]{64}$/.test(entry.hash))) throw Error('KINEO-LEVA-2410: manifesto divergente: complete source hash coverage')
}
export function verifyLevaCurrentTree() {
  verifyLevaManifest()
  const actual = levaCurrentInventory(LEVA.base)
  if (JSON.stringify(actual) !== JSON.stringify(LEVA.inventory)) throw Error('KINEO-LEVA-2410: inventário divergente\n' + actual.filter(file => !LEVA.inventory.includes(file)).join('\n'))
  for (const [file, known] of Object.entries(LEVA.sources)) {
    if (!existsSync(file) || levaHash(readFileSync(file, 'utf8')) !== known.hash) throw Error('KINEO-LEVA-2410: fonte divergente ' + file)
  }
  return actual
}
export function levaTaskInventory(task, actual) {
  verifyLevaCurrentTree()
  if (JSON.stringify([...actual].sort()) !== JSON.stringify(levaCurrentInventory(LEVA.layers[task].base))) throw Error('KINEO-LEVA-2410: inventário de entrada divergente ' + task)
  const expected = levaGit('diff', '--name-only', LEVA.layers[task].base, LEVA.layers[task].original).trim().split('\n').filter(Boolean).sort()
  // Every projected entry must physically exist in the current tree. Unknown additions
  // have already failed the complete current-tree inventory assertion above.
  const selected = actual.filter(file => expected.includes(file)).sort()
  if (JSON.stringify(selected) !== JSON.stringify(expected)) throw Error('KINEO-LEVA-2410: task inventory missing ' + task)
  return selected
}
