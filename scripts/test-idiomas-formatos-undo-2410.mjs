// KINEO-IDIOMAS-FORMATOS-2410 — immutable base, exact LF/CRLF/Windows undo; no filesystem mutation.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semIdiomasFormatos2410 as undo, IDIOMAS_FORMATOS_2410_BASE as BASE, IDIOMAS_FORMATOS_2410_MANIFEST as manifest } from './test-support/desfaz-idiomas-formatos-2410.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const lf = s => s.replace(/\r\n/g, '\n')
const hash = s => createHash('sha256').update(s).digest('hex')
assert.equal(manifest.base, BASE)
let checks = 0
for (const [file, item] of Object.entries(manifest.sources)) {
  const raw = readFileSync(file, 'utf8'), current = lf(raw), base = git('show', BASE + ':' + file)
  assert.equal(item.before, base, 'before bytes come from immutable origin/main: ' + file)
  assert.equal(item.beforeHash, hash(base)); assert.equal(item.afterHash, hash(current))
  assert.equal(undo(raw, file), raw.includes('\r\n') ? base.replace(/\n/g, '\r\n') : base)
  assert.equal(undo(current, file), base); assert.equal(undo(base, file), base)
  assert.equal(undo(current.replace(/\n/g, '\r\n'), file), base.replace(/\n/g, '\r\n'))
  assert.equal(undo(current, file.replace(/\//g, '\\')), base)
  const historical = git('show', BASE + '^:' + file)
  assert.equal(undo(historical, file), historical, 'older exact source can re-enter the historical adapter chain: ' + file)
  assert.throws(() => undo(current + '\n// source tampered\n', file), /fonte divergente/)
  const removed = current.replaceAll('KINEO-IDIOMAS-FORMATOS-2410', 'REMOVED_TASK_MARK')
  if (removed !== current) assert.throws(() => undo(removed, file), /fonte divergente/)
  checks += 10
}
assert.ok(Object.keys(manifest.sources).length >= 20, 'complete productive and historical adaptation layer is inventoried')
for (const file of manifest.newFiles) {
  assert.ok(existsSync(file), 'new task source exists: ' + file)
  assert.throws(() => git('show', BASE + ':' + file), undefined, 'new task file did not exist at base: ' + file)
}
for (const file of manifest.artifacts) assert.ok(file.startsWith('docs/') && existsSync(file), 'artifact is under docs: ' + file)
const actual = [...new Set([...git('diff', '--name-only', BASE).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')])].filter(Boolean).sort()
assert.deepEqual([...Object.keys(manifest.sources), ...manifest.newFiles, ...manifest.artifacts].sort(), actual, 'no changed or new task file escapes exact undo inventory')
assert.equal(undo('unrelated\r\n', 'lib/unrelated.ts'), 'unrelated\r\n')
console.log(`ok idiomas/formatos undo: ${checks} exact source checks; immutable base; idempotent; LF/CRLF/Windows; tampering rejected; full inventory; no network or filesystem mutation`)
