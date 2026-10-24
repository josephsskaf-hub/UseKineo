// KINEO-COMPRA-AVULSA-2410 — exact whole-task inventory and source restoration, with tamper rejection.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semCompraAvulsa2410 as undo, COMPRA_AVULSA_2410_BASE as BASE, COMPRA_AVULSA_2410_MANIFEST as manifest } from './test-support/desfaz-compra-avulsa-2410.mjs'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const lf = text => text.replace(/\r\n/g, '\n'), crlf = text => text.replace(/\n/g, '\r\n')
const hash = text => createHash('sha256').update(text).digest('hex')
assert.equal(manifest.base, BASE)
for (const [file, known] of Object.entries(manifest.sources)) {
  const before = git('show', `${BASE}:${file}`), current = lf(readFileSync(file, 'utf8'))
  assert.equal(hash(before), known.beforeHash, 'immutable source base: ' + file)
  assert.equal(hash(current), known.afterHash, 'current source fingerprint: ' + file)
  assert.equal(undo(current, file), before, 'exact LF restoration: ' + file)
  assert.equal(undo(crlf(current), file.replaceAll('/', '\\')), crlf(before), 'CRLF and Windows paths: ' + file)
  assert.equal(undo(before, file), before, 'base fixed point: ' + file)
  assert.equal(undo(undo(current, file), file), before, 'idempotent: ' + file)
  assert.throws(() => undo(current + '\n// KINEO-COMPRA-AVULSA-2410 tampered\n', file), /fonte divergente/)
  if (current.includes('KINEO-COMPRA-AVULSA-2410')) assert.throws(() => undo(current.replaceAll('KINEO-COMPRA-AVULSA-2410', 'REMOVED_TASK_MARK') + '\n// oneTimeItem tampered\n', file), /fonte divergente/)
  const saved = known.beforeHash
  try { known.beforeHash = 'corrupt'; assert.throws(() => undo(current, file), /before divergente/) } finally { known.beforeHash = saved }
}
for (const file of manifest.newFiles) {
  assert.ok(existsSync(file), file)
  assert.throws(() => git('show', `${BASE}:${file}`), undefined, 'new source absent from base: ' + file)
}
for (const file of manifest.artifacts) assert.ok(file.startsWith('docs/') && existsSync(file), file)
const actual = [...new Set([...git('diff', '--name-only', BASE).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')])].filter(Boolean).sort()
assert.deepEqual([...Object.keys(manifest.sources), ...manifest.newFiles, ...manifest.artifacts].sort(), actual, 'complete task inventory; no hidden changes')
assert.equal(undo('unrelated\r\n', 'lib/unrelated.ts'), 'unrelated\r\n')
console.log(`PASS compra avulsa undo: ${Object.keys(manifest.sources).length} exact sources; full task inventory; LF/CRLF/Windows; tamper rejected; base ${BASE}`)
