// CAPTION-CANONICO-2610: exact historical projection only; current caption behavior reads RAW files.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { CAPTION_CANONICO_MANIFEST as manifest, semCaptionCanonico2610 as undo, comCaptionCanonico2610 as redo } from '../../scripts/test-support/desfaz-caption-canonico-2610.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flat = s => s.replace(/\r\n/g, '\n')
const crlf = s => flat(s).replace(/\n/g, '\r\n')
const hash = s => crypto.createHash('sha256').update(s).digest('hex')
const git = (...args) => flat(execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }))
const read = file => flat(fs.readFileSync(path.join(root, file), 'utf8'))
let checks = 0, mutants = 0
const check = fn => { fn(); checks++ }
function preserveMutation(source, file, base) {
  try { assert.notEqual(flat(undo(source, file)), base, 'unknown change erased: ' + file) }
  catch (error) { if (error.code === 'ERR_ASSERTION') throw error; assert.match(String(error), /CAPTION-CANONICO-2610:/) }
  mutants++
}
check(() => assert.equal(manifest.base, '464bc9d19dbc23a34b08092b7db6c0f5128b7619'))
check(() => assert.deepEqual(Object.keys(manifest.scope).sort(), ['.github/workflows/guardiao.yml', 'app/api/compose/route.ts', 'docs/video-fiel-2610/test-legacy-layer.mjs', 'scripts/test-support/desfaz-video-fiel-2610.mjs'].sort()))
for (const [file, entry] of Object.entries(manifest.scope)) {
  const before = git('show', manifest.base + ':' + file), after = read(file)
  check(() => assert.equal(hash(before), entry.beforeSha256, 'immutable before: ' + file))
  check(() => assert.equal(hash(after), entry.afterSha256, 'frozen after: ' + file))
  check(() => assert.equal(hash(JSON.stringify(entry.hunks)), entry.hunksSha256))
  check(() => assert.equal(undo(after, file), before))
  check(() => assert.equal(redo(before, file), after))
  check(() => assert.equal(redo(undo(after, file), file), after))
  check(() => assert.equal(undo(undo(after, file), file), before))
  check(() => assert.equal(redo(redo(before, file), file), after))
  check(() => assert.equal(undo(crlf(after), file.replace(/\//g, '\\')), crlf(before)))
  check(() => assert.equal(redo(crlf(before), file), crlf(after)))
  const extra = '\n// unknown later bytes must survive\n'
  check(() => assert.equal(undo(after + extra, file), before + extra))
  check(() => assert.equal(redo(before + extra, file), after + extra))
  if (git('ls-tree', '--name-only', manifest.base + '^', '--', file).trim() === file) {
    const older = git('show', manifest.base + '^:' + file)
    check(() => assert.equal(undo(older, file), older))
  } else check(() => assert.throws(() => git('show', manifest.base + '^:' + file)))
  for (const h of entry.hunks) {
    preserveMutation(after.replace(h.after, h.after + h.after), file, before)
    preserveMutation(after.replace(h.after, h.after.replace(/[^\s]/, '§')), file, before)
  }
  const saved = entry.hunks[0].before
  try {
    entry.hunks[0].before += '\n// forbidden manifest mutation\n'
    check(() => assert.throws(() => undo(after, file), /divergent manifest/)); mutants++
  } finally { entry.hunks[0].before = saved }
}
for (const [file, expected] of Object.entries({ ...manifest.addedProduct, ...manifest.frozenEvidence })) {
  check(() => assert.equal(hash(read(file)), expected, 'current product/evidence immutable: ' + file))
}
for (const file of manifest.currentBehaviorTests) {
  const text = read(file)
  check(() => assert.doesNotMatch(text, /semCaptionCanonico2610|semVideoFiel2610|semCompraClareza2610|semIdiomasFormatos2410|desfaz-free15-caption/, 'current behavior reads raw source'))
  check(() => assert.ok(text.includes('createOfflineLoader()') && text.includes("const route = read(routePath)")))
  check(() => assert.ok(read('.github/workflows/guardiao.yml').includes('node ' + file)))
}
// Every historical JSON manifest already present in base is byte-equivalent after LF normalization.
const historical = git('ls-tree', '-r', '--name-only', manifest.base, '--', 'scripts/test-support').trim().split('\n').filter(f => /(?:fontes|trocas|manifest).*\.json$/.test(f))
assert.ok(historical.length > 10)
for (const file of historical) check(() => assert.equal(read(file), git('show', manifest.base + ':' + file), 'unchanged old manifest: ' + file))
check(() => assert.equal(undo('unknown\r\nbytes', 'unrelated.ts'), 'unknown\r\nbytes'))
console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutants: mutants, sources: Object.keys(manifest.scope).length, oldManifestsPreserved: historical.length, base: manifest.base, writes: 0, network: 0 }))
