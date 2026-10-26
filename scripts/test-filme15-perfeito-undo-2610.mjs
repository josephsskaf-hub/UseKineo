// KINEO-FILME15-PERFEITO-2610: exact undo, immutable base, mutants and real chain.
// All projections happen in memory. No source writes, environment files or network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { FILME15_PERFEITO_MANIFEST as manifest, FILME15_PERFEITO_BASE as BASE,
  semFilme15Perfeito2610 as undo, comFilme15Perfeito2610 as redo } from './test-support/desfaz-filme15-perfeito-2610.mjs'
import { semFilme15Fiel2610 } from './test-support/desfaz-filme15-fiel-2610.mjs'
import { semCaptionCanonico2610 } from './test-support/desfaz-caption-canonico-2610.mjs'
const lf = s => s.replace(/\r\n/g, '\n')
const crlf = s => lf(s).replace(/\n/g, '\r\n')
const hash = s => crypto.createHash('sha256').update(s).digest('hex')
const read = file => lf(fs.readFileSync(file, 'utf8'))
const git = (...args) => lf(execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }))
let checks = 0, mutants = 0
const check = fn => { fn(); checks++ }
assert.equal(BASE, 'b0d4e093ace5b6efb7069b70a58f97ce5e9d9e9d')
function preserveMutation(changed, file, before) {
  try { assert.notEqual(lf(undo(changed, file)), before, 'unknown mutation erased: ' + file) }
  catch (error) { if (error.code === 'ERR_ASSERTION') throw error; assert.match(String(error), /FILME15-PERFEITO-2610:/) }
  mutants++
}
for (const [file, entry] of Object.entries(manifest.scope)) {
  const before = git('show', BASE + ':' + file), after = read(file)
  check(() => assert.equal(hash(before), entry.beforeSha256, 'exact base bytes: ' + file))
  check(() => assert.equal(hash(after), entry.afterSha256, 'exact current bytes: ' + file))
  check(() => assert.equal(hash(JSON.stringify(entry.hunks)), entry.hunksSha256))
  check(() => assert.equal(undo(after, file), before))
  check(() => assert.equal(redo(before, file), after))
  check(() => assert.equal(redo(undo(after, file), file), after))
  check(() => assert.equal(undo(undo(after, file), file), before))
  check(() => assert.equal(redo(redo(before, file), file), after))
  check(() => assert.equal(undo(crlf(after), file.replaceAll('/', '\\')), crlf(before)))
  check(() => assert.equal(semFilme15Fiel2610(after, file), before, 'FIEL entrypoint strips the newer layer first'))
  const extra = '\n// unknown later bytes must remain visible\n'
  check(() => assert.equal(undo(after + extra, file), before + extra))
  check(() => assert.equal(redo(before + extra, file), after + extra))
  if (git('ls-tree', '--name-only', BASE + '^', '--', file).trim() === file) {
    const older = git('show', BASE + '^:' + file)
    check(() => assert.equal(undo(older, file), older))
  } else check(() => assert.throws(() => git('show', BASE + '^:' + file), undefined, 'source absent before the upstream merge is not fabricated: ' + file))
  for (const hunk of entry.hunks) {
    preserveMutation(after.replace(hunk.after, hunk.after + hunk.after), file, before)
    preserveMutation(after.replace(hunk.after, hunk.after.replace(/[^\s]/, '§')), file, before)
  }
  const saved = entry.hunks[0].before
  try { entry.hunks[0].before += '\n// corrupt manifest\n'; check(() => assert.throws(() => undo(after, file), /divergent manifest/)); mutants++ }
  finally { entry.hunks[0].before = saved }
}
for (const [file, expected] of Object.entries(manifest.addedSources)) {
  check(() => assert.equal(hash(read(file)), expected, 'new source immutable: ' + file))
  check(() => assert.throws(() => git('show', BASE + ':' + file), undefined, 'not attributed to upstream: ' + file))
}
const captionHelper = read('scripts/test-support/desfaz-caption-canonico-2610.mjs')
check(() => assert.match(captionHelper, /project\(semFilme15Fiel2610\(source, file\), file, 'reverse'\)/, 'actual canonical historical chain strips perfeito through FIEL first'))
check(() => assert.equal(semCaptionCanonico2610('unrelated\r\n', 'lib/unrelated.ts'), 'unrelated\r\n'))
for (const file of ['scripts/test-filme15-perfeito-2610.mjs', 'scripts/test-filme15-gate-integration-2610.mjs', 'scripts/test-filme15-portao-fonte-2610.mjs', 'scripts/test-filme15-rosto-duracao-2610.mjs', 'scripts/test-filme15-legenda-inteira-2610.mjs', 'scripts/test-filme15-legenda-canonica-2610.mjs']) {
  if (fs.existsSync(file)) check(() => assert.doesNotMatch(read(file), /import[^\n]*desfaz-|semFilme15Perfeito2610\(/, 'current behavior reads raw code: ' + file))
}
const oldManifests = git('ls-tree', '-r', '--name-only', BASE, '--', 'scripts/test-support').trim().split('\n').filter(file => /(?:fontes|trocas|hunks).*\.json$/.test(file))
for (const file of oldManifests) check(() => assert.equal(read(file), git('show', BASE + ':' + file), 'old manifest stays immutable: ' + file))
const inventory = [...Object.keys(manifest.scope), ...Object.keys(manifest.addedSources), manifest.manifestPath].sort()
const actual = [...new Set([...git('diff', '--name-only', BASE).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')])]
  .filter(file => file && !file.endsWith('.tsbuildinfo') && !file.startsWith('node_modules/')).sort()
check(() => assert.deepEqual(inventory, actual, 'complete task inventory relative to exact upstream'))
console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutants: mutants, sources: Object.keys(manifest.scope).length, addedSources: Object.keys(manifest.addedSources).length, base: BASE, sourceWrites: 0, network: 0 }))
