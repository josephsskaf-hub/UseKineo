// Complete task delta restored exactly to its immutable main base, in memory.
// No file writes, env, database, provider access or network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semVitrine2610, VITRINE_2610_BASE, VITRINE_2610_MANIFEST } from './test-support/desfaz-vitrine-filmes-2610.mjs'
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs'
import { semLista1510 } from './test-support/desfaz-ads-lista-1510.mjs'
import { semMarcas1510 } from './test-support/desfaz-ads-marcas-1510.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
const lf = value => value.replace(/\r\n/g, '\n')
const hash = value => createHash('sha256').update(value).digest('hex')
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const rejects = (callback, pattern, label) => { assert.throws(callback, pattern, label); checks++ }
const manifest = VITRINE_2610_MANIFEST
check(Object.keys(manifest.scope).length === 25, 'complete task scope is frozen as 25 product files')
check(VITRINE_2610_BASE === '62213b008292f110117d1abbe20c157efdb55902', 'base is immutable latest main used at task start')
for (const [file, entry] of Object.entries(manifest.scope)) {
  const actual = fs.readFileSync(file, 'utf8'), current = lf(actual)
  check(hash(current) === entry.afterSha256, file + ': current product source matches frozen reviewed task delta')
  check(lf(git('show', `${manifest.product}:${file}`)) === current, file + ': manifest source tied to immutable product commit')
  if (entry.kind === 'new') {
    check(git('ls-tree', '--name-only', VITRINE_2610_BASE, '--', file).trim() === '', file + ': absent in main base')
    check(semVitrine2610(current, file) === null, file + ': exact new file returns to absent')
    check(semVitrine2610(current.replace(/\n/g, '\r\n'), file.replace(/\//g, '\\')) === null, file + ': CRLF and Windows new-file removal')
    rejects(() => semVitrine2610(current + '// unrelated work\n', file), /modified new file; refusing deletion/, file + ': new file with later work is never silently deleted')
    rejects(() => semVitrine2610(current.replace(/\S/, '@'), file), /modified new file; refusing deletion/, file + ': corrupted new source rejected')
    check(semVitrine2610(null, file) === null, file + ': absence idempotent')
    continue
  }
  const base = lf(git('show', `${VITRINE_2610_BASE}:${file}`))
  check(hash(base) === entry.beforeSha256, file + ': frozen preimage matches immutable main')
  check(semVitrine2610(current, file) === base, file + ': all task hunks undo exactly to main')
  check(lf(semVitrine2610(actual, file)) === base, file + ': actual filesystem EOL')
  check(semVitrine2610(current.replace(/\n/g, '\r\n'), file) === base.replace(/\n/g, '\r\n'), file + ': CRLF roundtrip')
  check(semVitrine2610(current, file.replace(/\//g, '\\')) === base, file + ': Windows separators')
  check(semVitrine2610(base, file) === base, file + ': base idempotent')
  const before = '// unrelated work before\r\n', after = '\n// unrelated work after\r\n'
  check(semVitrine2610(before + current + after, file) === before + base + after, file + ': preserves mixed-EOL unrelated prefix and suffix exactly')
  check(semVitrine2610(before + base + after, file) === before + base + after, file + ': base with unrelated work remains untouched')
  for (const hunk of entry.hunks) {
    rejects(() => semVitrine2610(current.replace(hunk.after, hunk.after.replace(/\S/, '@')), file), /expected exactly 1 candidate match/, file + ': tampered hunk rejected')
    rejects(() => semVitrine2610(current + '\n' + hunk.after, file), /expected exactly 1 candidate match/, file + ': duplicated hunk rejected')
  }
}
check(manifest.testScopeBase === VITRINE_2610_BASE, 'historical-script preimages use the same immutable main base')
check(JSON.stringify(Object.keys(manifest.testScope).sort()) === JSON.stringify(['scripts/test-ads-reteste-1510.mjs', 'scripts/test-equipe-business-2026-10-10.mjs', 'scripts/test-geo-rodada2-2026-10-08.mjs', 'scripts/test-motores-geo-2026-10-06.mjs', 'scripts/test-support/desfaz-paginas-ia-claras-2110.mjs', 'scripts/test-trafego-undo-2310.mjs']), 'separate historical-script scope is exact and excludes product/projector/manifest')
for (const [file, entry] of Object.entries(manifest.testScope)) {
  const current = lf(fs.readFileSync(file, 'utf8')), base = lf(git('show', `${manifest.testScopeBase}:${file}`))
  check(hash(current) === entry.afterSha256 && hash(base) === entry.beforeSha256, file + ': historical before/after hashes are exact')
  check(semVitrine2610(current, file) === base, file + ': later test adaptation returns exactly to main preimage')
  check(semVitrine2610(current.replace(/\n/g, '\r\n'), file.replace(/\//g, '\\')) === base.replace(/\n/g, '\r\n'), file + ': historical CRLF and Windows separators')
  check(semVitrine2610(base, file) === base, file + ': historical preimage is a fixed point')
  const extra = '\n// unrelated historical-test edit survives\r\n'
  check(semVitrine2610(current + extra, file) === base + extra, file + ': unrelated script work preserved')
  for (const hunk of entry.hunks) {
    rejects(() => semVitrine2610(current.replace(hunk.after, hunk.after.replace(/\S/, '@')), file), /expected exactly 1 candidate match/, file + ': corrupted historical hunk rejected')
    rejects(() => semVitrine2610(current + '\n' + hunk.after, file), /expected exactly 1 candidate match/, file + ': duplicated historical hunk rejected')
  }
}
const newLegacyFile = 'components/MadeWithKineo.tsx', newLegacySource = fs.readFileSync(newLegacyFile, 'utf8')
const legacySourceChain = (source) => { const closed = semCloseReal1910(source, newLegacyFile); return closed === null ? null : semMarcas1510(newLegacyFile, semLista1510(newLegacyFile, closed.replace(/\r\n/g, '\n'))) }
check(legacySourceChain(newLegacySource) === null && legacySourceChain(null) === null, 'verified new-file removal remains null through Close/Lista/Marcas and repeated entry')
check((legacySourceChain(newLegacySource) ?? '').replace(/\r\n/g, '\n') === '', 'only the outer legacy scanner converts removed source to empty text')
rejects(() => legacySourceChain(newLegacySource + '\n// altered new file\n'), /modified new file; refusing deletion/, 'historical chain never hides an altered new source as empty')
for (const file of ['lib/checkoutPricing.ts', 'lib/settlementCurrency.ts', 'lib/publicSurfacePolicy.ts', 'vercel.json']) {
  check(lf(fs.readFileSync(file, 'utf8')) === lf(git('show', `${VITRINE_2610_BASE}:${file}`)), file + ': unrelated pricing, privacy flag and cron schedule untouched')
}
check(semVitrine2610('unchanged', 'unrelated.ts') === 'unchanged', 'unknown files untouched')
console.log(`KINEO-VITRINE-FILMES-2610-UNDO: ${checks} passed, 0 failed (exact, in memory).`)
