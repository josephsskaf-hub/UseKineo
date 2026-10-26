// KINEO-LEVA-REBASE-2610 — exact, offline integration boundary for historical guardians.
// Current product tests read raw sources. Unknown input bytes are NEVER projected.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

export const REBASE_MANIFEST_PATH = 'scripts/test-support/leva-rebase-2610-fontes.json'
export const REBASE_MAIN = '62213b008292f110117d1abbe20c157efdb55902'
export const REBASE_LEVA = '07435f57b7e18d4d37c325e57134776d452db382'
export const FINAL_PRE_LEVA_2610 = '3c41db6f931d4c3840ff2f28153fd94be608f89c'
export const FINAL_MAIN_2610 = '237b14fb186655e448e9d2e5e80b5b904a8e9863'
export const REBASE_BASE = '1c078ed013302ac47c42f783305df688c4e97cfd'
export const REBASE_LEGACY_MANIFEST = 'scripts/test-support/leva-integration-2410-fontes.json'
export const REBASE = JSON.parse(readFileSync(new URL('./leva-rebase-2610-fontes.json', import.meta.url), 'utf8'))
export const rebaseLf = text => text.replace(/\r\n/g, '\n')
export const rebaseTextFile = file => /\.(?:mjs|cjs|js|jsx|ts|tsx|json|ya?ml|sql|md|html|css|txt|log)$/.test(file)
// Cache only digests of immutable strings; every live seal comparison still runs.
const digests = new Map(); let digestBytes = 0
export function rebaseHash(value) {
  if (typeof value !== 'string') return createHash('sha256').update(value).digest('hex')
  const cached = digests.get(value)
  if (cached !== undefined) return cached
  const digest = createHash('sha256').update(rebaseLf(value)).digest('hex'), size = value.length * 2
  if (size <= 8 << 20) {
    while (digests.size >= 64 || digestBytes + size > 8 << 20) { const first = digests.keys().next().value; digests.delete(first); digestBytes -= first.length * 2 }
    digests.set(value, digest); digestBytes += size
  }
  return digest
}
export const rebaseGit = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const pathOf = file => String(file ?? '').replace(/\\/g, '/')
const originalEol = (result, input) => input.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
const blobs = new Map(), blobHashes = new Map(), crlfBlobs = new Map()
function blob(ref, path) {
  const key = ref + ':' + path
  if (!blobs.has(key)) {
    let value = null
    try { value = rebaseGit('show', key) } catch { /* A new source has no historical counterpart. */ }
    blobs.set(key, value)
  }
  return blobs.get(key)
}

// Batch only when explicitly requested by the complete rebase guardian.
export function preloadRebaseBlobs2610() {
  verifyRebaseManifest()
  const queries = [REBASE_MAIN, REBASE_LEVA].flatMap(ref => Object.keys(REBASE.sources).filter(rebaseTextFile).map(file => ref + ':' + file)).filter(key => !blobs.has(key))
  if (!queries.length) return
  const bytes = execFileSync('git', ['cat-file', '--batch'], { input: queries.join('\n') + '\n', windowsHide: true, maxBuffer: 256 << 20, stdio: ['pipe', 'pipe', 'ignore'] })
  let offset = 0
  for (const key of queries) {
    const end = bytes.indexOf(10, offset), header = bytes.toString('utf8', offset, end); offset = end + 1
    if (header.endsWith(' missing')) { blobs.set(key, null); continue }
    const size = Number(header.slice(header.lastIndexOf(' ') + 1))
    if (!Number.isSafeInteger(size) || size < 0) throw Error('KINEO-LEVA-REBASE-2610: invalid immutable blob header')
    blobs.set(key, rebaseLf(bytes.toString('utf8', offset, offset + size))); offset += size + 1
  }
}
export function rebaseImmutableSource2610(ref, file) {
  if (![REBASE_MAIN, REBASE_LEVA, FINAL_PRE_LEVA_2610, FINAL_MAIN_2610].includes(ref)) throw Error('KINEO-LEVA-REBASE-2610: unpinned destination')
  const source = blob(ref, pathOf(file))
  if (source === null) throw Error('KINEO-LEVA-REBASE-2610: absent immutable source')
  return source
}

export function verifyRebaseManifest() {
  if (REBASE.version !== 1 || REBASE.base !== REBASE_BASE || REBASE.main !== REBASE_MAIN || REBASE.leva !== REBASE_LEVA) throw Error('KINEO-LEVA-REBASE-2610: manifesto divergente: immutable refs')
  if (!Array.isArray(REBASE.inventory) || REBASE.inventory.some(file => typeof file !== 'string' || /(^|\/)\.env(?:\.|$)/.test(file)) || JSON.stringify(REBASE.inventory) !== JSON.stringify([...new Set(REBASE.inventory)].sort())) throw Error('KINEO-LEVA-REBASE-2610: manifesto divergente: inventory schema')
  const covered = REBASE.inventory.filter(file => file !== REBASE_MANIFEST_PATH)
  if (JSON.stringify(Object.keys(REBASE.sources ?? {}).sort()) !== JSON.stringify(covered) || Object.values(REBASE.sources).some(entry => !entry || !/^[0-9a-f]{64}$/.test(entry.hash) || Object.keys(entry).join(',') !== 'hash')) throw Error('KINEO-LEVA-REBASE-2610: manifesto divergente: complete source hashes')
}

// A complete reviewed current source may enter either immutable historical chain.
// Historical snapshots and their mutants pass through to the ORIGINAL guardians.
// The target always comes from pinned git objects, never mutable manifest contents.
function project(text, file, target) {
  if (typeof text !== 'string') return text
  const path = pathOf(file), known = REBASE.sources[path]
  if (!known || !rebaseTextFile(path)) return text
  if (REBASE.version !== 1 || REBASE.base !== REBASE_BASE || REBASE.main !== REBASE_MAIN || REBASE.leva !== REBASE_LEVA) throw Error('KINEO-LEVA-REBASE-2610: manifesto divergente: immutable refs')
  const before = blob(target, path)
  if (before === null) return text
  const blobKey = target + ':' + path
  if (!blobHashes.has(blobKey)) blobHashes.set(blobKey, createHash('sha256').update(before).digest('hex'))
  // If the reviewed current source IS the target, this path never transforms
  // ANY input: recognized bytes are identical; historical/mutated bytes pass through.
  if (blobHashes.get(blobKey) === known.hash) return text
  if (rebaseHash(text) !== known.hash) return text
  verifyRebaseManifest() // Every actual transformation still requires the complete schema.
  if (!text.includes('\r\n')) return before
  // Only immutable output bytes are cached, never live input or guard decisions.
  if (!crlfBlobs.has(blobKey)) crlfBlobs.set(blobKey, before.replace(/\n/g, '\r\n'))
  return crlfBlobs.get(blobKey)
}

export const semLevaSobreMain2610 = (text, file) => project(text, file, REBASE_MAIN)
export const semMainSobreLeva2610 = (text, file) => project(text, file, REBASE_LEVA)
// Final sealed composition leaves before each earlier exact layer; unknown bytes stay visible.
export const semLevaSobreIntegracao2610 = (text, file) => project(text, file, FINAL_PRE_LEVA_2610)
export const semIntegracaoSobreMain2372610 = (text, file) => project(text, file, FINAL_MAIN_2610)

export function rebaseCurrentInventory(base = REBASE_BASE) {
  return [...new Set([...rebaseGit('diff', '--name-only', base).trim().split('\n'), ...rebaseGit('ls-files', '--others', '--exclude-standard').trim().split('\n')])].filter(Boolean).sort()
}
export function verifyRebaseCurrentTree() {
  verifyRebaseManifest()
  const actual = rebaseCurrentInventory()
  if (JSON.stringify(actual) !== JSON.stringify(REBASE.inventory)) throw Error('KINEO-LEVA-REBASE-2610: inventário divergente')
  for (const [file, entry] of Object.entries(REBASE.sources)) {
    if (!existsSync(file)) throw Error('KINEO-LEVA-REBASE-2610: fonte ausente ' + file)
    const bytes = readFileSync(file), value = rebaseTextFile(file) ? bytes.toString('utf8') : bytes
    if (rebaseHash(value) !== entry.hash) throw Error('KINEO-LEVA-REBASE-2610: fonte divergente ' + file)
  }
  if (rebaseLf(readFileSync(REBASE_LEGACY_MANIFEST, 'utf8')) !== rebaseGit('show', REBASE_LEVA + ':' + REBASE_LEGACY_MANIFEST)) throw Error('KINEO-LEVA-REBASE-2610: manifesto LEVA original alterado')
  return actual
}
