// Complete task delta restored exactly to its immutable main base, in memory.
// No file writes, env, database, provider access or network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semVitrine2610, VITRINE_2610_BASE, VITRINE_2610_MANIFEST } from './test-support/desfaz-vitrine-filmes-2610.mjs'

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
for (const file of ['lib/checkoutPricing.ts', 'lib/settlementCurrency.ts', 'lib/publicSurfacePolicy.ts', 'vercel.json']) {
  check(lf(fs.readFileSync(file, 'utf8')) === lf(git('show', `${VITRINE_2610_BASE}:${file}`)), file + ': unrelated pricing, privacy flag and cron schedule untouched')
}
check(semVitrine2610('unchanged', 'unrelated.ts') === 'unchanged', 'unknown files untouched')
console.log(`KINEO-VITRINE-FILMES-2610-UNDO: ${checks} passed, 0 failed (exact, in memory).`)
