// VIDEO-FIEL-2610: frozen exact projection, not a substitute for current behavior.
// Read-only, no credentials/network/providers. Unknown changes must remain visible.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { VIDEO_FIEL_BASE, VIDEO_FIEL_MANIFEST as manifest, semVideoFiel2610 as undo, comVideoFiel2610 as redo } from '../../scripts/test-support/desfaz-video-fiel-2610.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flat = value => value.replace(/\r\n/g, '\n')
const crlf = value => flat(value).replace(/\n/g, '\r\n')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const git = (...args) => flat(execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }))
let checks = 0, mutants = 0
function check(fn) { fn(); checks++ }
function cannotEraseMutation(source, file, base) {
  try { assert.notEqual(flat(undo(source, file)), base, 'unknown mutation was erased: ' + file) }
  catch (error) { if (error?.code === 'ERR_ASSERTION') throw error; assert.match(String(error), /VIDEO-FIEL-2610:/) }
  mutants++
}

check(() => assert.equal(manifest.base, '9d8d3fad413d94798081528dbd61f3ba7848a76a'))
check(() => assert.ok(Object.keys(manifest.scope).length >= 25))
for (const [file, entry] of Object.entries(manifest.scope)) {
  const base = git('show', VIDEO_FIEL_BASE + ':' + file)
  const current = flat(fs.readFileSync(path.join(root, file), 'utf8'))
  check(() => assert.equal(hash(base), entry.beforeSha256, 'immutable base: ' + file))
  check(() => assert.equal(hash(current), entry.afterSha256, 'frozen candidate: ' + file))
  check(() => assert.equal(hash(JSON.stringify(entry.hunks)), entry.hunksSha256, 'frozen hunks: ' + file))
  check(() => assert.equal(undo(current, file), base, 'exact reverse: ' + file))
  check(() => assert.equal(redo(base, file), current, 'exact forward: ' + file))
  check(() => assert.equal(redo(undo(current, file), file), current, 'roundtrip: ' + file))
  check(() => assert.equal(undo(undo(current, file), file), base, 'reverse idempotent: ' + file))
  check(() => assert.equal(redo(redo(base, file), file), current, 'forward idempotent: ' + file))
  check(() => assert.equal(undo(crlf(current), file.replace(/\//g, '\\')), crlf(base), 'CRLF and Windows path: ' + file))
  check(() => assert.equal(redo(crlf(base), file), crlf(current)))
  const extra = '\n// unreviewed later bytes must survive\n'
  check(() => assert.equal(undo(current + extra, file), base + extra))
  check(() => assert.equal(redo(base + extra, file), current + extra))
  const older = git('show', VIDEO_FIEL_BASE + '^:' + file)
  check(() => assert.equal(undo(older, file), older, 'older history remains intact: ' + file))
  for (const hunk of entry.hunks) {
    cannotEraseMutation(current.replace(hunk.after, hunk.after + hunk.after), file, base)
    cannotEraseMutation(current.replace(hunk.after, hunk.after.replace(/[^\s]/, '§')), file, base)
  }
  const saved = entry.hunks[0].before
  try {
    entry.hunks[0].before += '\n// corrupt manifest\n'
    check(() => assert.throws(() => undo(current, file), /divergent manifest/))
    mutants++
  } finally { entry.hunks[0].before = saved }
}
for (const [file, expected] of Object.entries(manifest.addedProduct)) {
  check(() => assert.equal(hash(flat(fs.readFileSync(path.join(root, file), 'utf8'))), expected, 'new product source frozen: ' + file))
  check(() => assert.throws(() => git('show', VIDEO_FIEL_BASE + ':' + file), undefined, 'new product source is not misattributed to base: ' + file))
}
for (const file of manifest.currentBehaviorTests) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  check(() => assert.doesNotMatch(text, /semVideoFiel2610|semCompraClareza2610|semIdiomasFormatos2410|desfaz-video-fiel-2610/, 'current behavior must remain raw: ' + file))
  check(() => assert.ok(fs.readFileSync(path.join(root, '.github/workflows/guardiao.yml'), 'utf8').includes('node ' + file), 'current behavior remains a CI gate: ' + file))
}
check(() => assert.equal(undo('unrelated\r\nVIDEO-FIEL-2610', 'unrelated.ts'), 'unrelated\r\nVIDEO-FIEL-2610'))
const changedOldManifests = git('diff', '--name-only', VIDEO_FIEL_BASE, '--', 'scripts/test-support/*fontes.json').trim().split('\n').filter(Boolean).filter(file => !file.endsWith('/desfaz-video-fiel-2610-fontes.json'))
check(() => assert.deepEqual(changedOldManifests, [], 'old frozen JSON manifests and hashes remain immutable'))
console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutants: mutants, sources: Object.keys(manifest.scope).length, newProductSources: Object.keys(manifest.addedProduct).length, currentBehaviorTests: manifest.currentBehaviorTests.length, base: VIDEO_FIEL_BASE, writes: 0, network: 0 }))
