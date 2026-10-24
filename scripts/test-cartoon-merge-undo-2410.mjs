// KINEO-CARTOON-JUNTAR-2410 — exact current integration projections, immutable branch sources and live drift mutants.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { cartoonMergeSource2410 as project } from './test-support/cartoon-merge-sources-2410.mjs'
import { CARTOON_CONSISTENCIA_FILES, CARTOON_CONSISTENCIA_NEW } from './test-support/desfaz-cartoon-consistencia-2210.mjs'
import { CARTOON_TRACAO_HUNKS } from './test-support/desfaz-cartoon-tracao-2210.mjs'

const manifest = JSON.parse(readFileSync(new URL('./test-support/cartoon-merge-sources-2410.json', import.meta.url), 'utf8'))
const expected = { main: '1c078ed013302ac47c42f783305df688c4e97cfd', tracao: '189e7e2b5', consistencia: '153e9f31f', cardsGiro: '3ec6c9d9b790e00c05650ccab7e9af426cd106d1' }
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const requests = Object.entries(manifest.targets).flatMap(([target, entry]) => Object.keys(entry.files).map(file => ({ target, file, ref: entry.sha + ':' + file })))
const blobs = execFileSync('git', ['cat-file', '--batch'], { input: requests.map(item => item.ref).join('\n') + '\n', maxBuffer: 64 << 20, stdio: ['pipe', 'pipe', 'ignore'] })
const historical = new Map()
let offset = 0
for (const item of requests) {
  const end = blobs.indexOf(10, offset), header = blobs.subarray(offset, end).toString('utf8'), match = header.match(/ blob (\d+)$/)
  assert.ok(match, 'immutable blob exists: ' + item.ref)
  const size = Number(match[1]); offset = end + 1
  historical.set(item.target + ':' + item.file, blobs.subarray(offset, offset + size).toString('utf8').replace(/\r\n/g, '\n'))
  offset += size + 1
}
let proofs = 0
assert.deepEqual(Object.keys(manifest.targets).sort(), Object.keys(expected).sort())
for (const [target, entry] of Object.entries(manifest.targets)) {
  assert.equal(entry.sha, git('rev-parse', expected[target]).trim(), 'immutable projection target: ' + target)
  assert.ok(Object.keys(entry.files).length > 0)
  for (const [file, hunks] of Object.entries(entry.files)) {
    const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), before = historical.get(target + ':' + file)
    assert.equal(project(raw, file, target), before, target + ': current source restores exact immutable source: ' + file)
    assert.equal(project(raw.replace(/\n/g, '\r\n'), file.replace(/\//g, '\\'), target), before.replace(/\n/g, '\r\n'), target + ': CRLF and Windows path: ' + file)
    assert.equal(project(before, file, target), before, target + ': immutable source is a fixed point: ' + file)
    assert.notEqual(project('X' + raw, file, target), before, target + ': unrelated one-character drift is never hidden: ' + file)
    assert.equal(project('// outside edit\n' + raw, file, target), '// outside edit\n' + before, target + ': edits outside contextual hunks survive: ' + file)
    for (const hunk of hunks) {
      assert.equal(raw.split(hunk.after).length, 2, 'every integration hunk applies once: ' + file)
      const at = raw.indexOf(hunk.after) + Math.floor(hunk.after.length / 2)
      const mutated = raw.slice(0, at) + (raw[at] === 'X' ? 'Y' : 'X') + raw.slice(at + 1)
      assert.notEqual(project(mutated, file, target), before, 'edited contextual hunk cannot restore original source: ' + file)
      assert.notEqual(project(raw + hunk.after, file, target), before, 'duplicated contextual hunk cannot restore original source: ' + file)
      proofs += 3
    }
    proofs += 5
  }
}
assert.equal(project('outside\r\n', 'unrelated.ts'), 'outside\r\n')
// Closed task inventories remain checked by their original guardians. The current
// combined branch is separately guarded against every tracked or untracked extra.
const integrationFiles = [
  'scripts/test-ads-cena-respaldo-2110.mjs', 'scripts/test-cartoon-consistencia-2210.mjs', 'scripts/test-cartoon-tracao.mjs',
  'scripts/test-cena-negacao-1510.mjs', 'scripts/test-contrato-classicos-1410.mjs', 'scripts/test-idiomas-formatos-undo-2410.mjs',
  'scripts/test-cards-giro-undo-2410.mjs',
  'scripts/test-support/desfaz-cartoon-consistencia-2210.mjs', 'scripts/test-support/desfaz-idiomas-formatos-2410.mjs',
  'scripts/test-cartoon-merge-undo-2410.mjs', 'scripts/test-support/cartoon-merge-sources-2410.mjs', 'scripts/test-support/cartoon-merge-sources-2410.json',
]
const tractionNew = [
  'app/api/admin/send-kids-launch/route.ts', 'lib/growth/kidsLaunchEmail.ts', 'scripts/test-cartoon-tracao.mjs',
  'scripts/test-support/desfaz-cartoon-tracao-2210.mjs', 'scripts/test-support/desfaz-cartoon-tracao-2210-hunks.json',
  'docs/CARTOON-INSTAGRAM-2210.md', 'docs/CARTOON-TRACAO-2210.md', 'docs/previews/cartoon-tracao-2210.html',
  'docs/previews/cartoon-tracao-2210-en-desktop.png', 'docs/previews/cartoon-tracao-2210-en-mobile.png',
  'docs/previews/cartoon-tracao-2210-pt-desktop.png', 'docs/previews/cartoon-tracao-2210-pt-mobile.png',
]
const allowed = new Set([...CARTOON_CONSISTENCIA_FILES, ...CARTOON_CONSISTENCIA_NEW, ...Object.keys(CARTOON_TRACAO_HUNKS), ...tractionNew, ...integrationFiles])
const tracked = git('diff', '--name-only', expected.cardsGiro, '--').trim().split('\n').filter(Boolean) // Inventory only is anchored to latest main; all original source hashes remain immutable.
const untracked = git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean)
const assertInventory = (files, extras) => assert.ok(files.length + extras.length > 0 && [...files, ...extras].every(file => allowed.has(file)),
  'finite live Cartoon integration inventory: ' + [...files, ...extras].filter(file => !allowed.has(file)).join(', '))
assertInventory(tracked, untracked)
assert.throws(() => assertInventory([...tracked, 'lib/cartoon-unrelated.ts'], untracked), assert.AssertionError, 'unrelated production source stays red')
assert.throws(() => assertInventory([...tracked, 'docs/unrelated.md'], untracked), assert.AssertionError, 'unrelated document stays red')
assert.throws(() => assertInventory(tracked, [...untracked, 'scripts/untracked-cartoon-mutation.mjs']), assert.AssertionError, 'untracked extra stays red')
proofs += 4
console.log(`ok Cartoon merge: ${proofs} exact integration, immutable source, LF/CRLF/Windows and drift proofs; historical hashes unchanged; no network or source writes`)
