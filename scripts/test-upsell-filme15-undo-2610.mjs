import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { UPSELL_FILME15_2610 as manifest, UPSELL_FILME15_2610_INTEGRATION as integration, semUpsellFilme152610 } from './test-support/desfaz-upsell-filme15-2610.mjs'
import { semLevaSobreIntegracao2610 } from './test-support/leva-rebase-2610.mjs'

const normalize = source => source.replace(/\r\n/g, '\n')
const sha = source => createHash('sha256').update(source).digest('hex')
const git = (...args) => normalize(execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 4e6 }))
assert.equal(manifest.base, '46fa10e58fced6430e0a2ba7bb445bb8905bd2e7')
assert.equal(integration.base, 'c93ccc0a5151a3dcdd38fd3c6647731ab3399402')
assert.equal(integration.product, '3c41db6f931d4c3840ff2f28153fd94be608f89c')
assert.equal(integration.original, '908cdad7a8e36b3b16a0c60e3f9ef72a0b385121')
assert.deepEqual(Object.keys(integration.scope).sort(), Object.keys({ ...manifest.scope, ...manifest.readerScope }).sort(), 'integration adds no source beyond the original exact undo scope')
let hunks = 0
function exactUndoProof(file, entry, before, current, label) {
  assert.equal(sha(before), entry.beforeSha256, label + ' immutable predecessor hash: ' + file)
  assert.equal(sha(current), entry.afterSha256, label + ' current complete source hash: ' + file)
  assert.equal(semUpsellFilme152610(current, file), before, label + ' exact LF undo: ' + file)
  assert.equal(semUpsellFilme152610(current.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), label + ' exact CRLF undo: ' + file)
  assert.equal(semUpsellFilme152610(current.replace(/\n/g, '\r\n'), file.replace(/\//g, '\\')), before.replace(/\n/g, '\r\n'), label + ' Windows paths: ' + file)
  assert.equal(semUpsellFilme152610(before, file), before, label + ' old source is idempotent: ' + file)
  assert.throws(() => semUpsellFilme152610(current + '\n// unrelated changed byte\n', file), /source differs|missing|ambiguous/, label + ' unrelated edits are never erased: ' + file)
  for (const hunk of entry.hunks) {
    hunks++
    assert.equal(current.split(hunk.after).length, 2, label + ' unique frozen hunk: ' + file)
    const position = hunk.after.indexOf('\n')
    const changed = hunk.after.slice(0, position) + ' // tampered context' + hunk.after.slice(position)
    assert.throws(() => semUpsellFilme152610(current.replace(hunk.after, changed), file), /missing|source differs/, label + ' changed context fails closed: ' + file)
    assert.throws(() => semUpsellFilme152610(current + '\n' + hunk.after, file), /ambiguous/, label + ' duplicated hunk fails closed: ' + file)
  }
}
// The original task is still certified against its frozen reviewed Git source.
// No original hashes, hunks, inventories or mutant assertions were relaxed.
for (const [file, entry] of Object.entries({ ...manifest.scope, ...manifest.readerScope })) {
  const before = git('show', `${manifest.base}:${file}`)
  const current = git('show', `${integration.original}:${file}`)
  exactUndoProof(file, entry, before, current, 'original')
}
// The actual final tree must match the separately sealed merged source before
// the SAME LF/CRLF/idempotence/tamper/ambiguity proof removes only its upsell.
for (const [file, entry] of Object.entries(integration.scope)) {
  const before = git('show', `${integration.base}:${file}`)
  const current = normalize(semLevaSobreIntegracao2610(readFileSync(file, 'utf8'), file))
  assert.equal(current, git('show', `${integration.product}:${file}`), 'current integration is tied to the immutable reviewed merge: ' + file)
  assert.equal(sha(JSON.stringify(entry.hunks)), entry.hunksSha256, 'integration hunks remain sealed: ' + file)
  exactUndoProof(file, entry, before, current, 'integration')
}
assert.equal(Object.keys(manifest.scope).length, 7)
assert.equal(Object.keys(manifest.readerScope).length, 1)
assert.equal(manifest.newRuntimeFiles.length, 9)
assert.equal(semUpsellFilme152610('unrelated source', 'lib/unrelated.ts'), 'unrelated source')
console.log(`upsell-filme15 exact undo: original + integration, 7 runtime sources, 1 historical reader, 9 new runtime files, ${hunks} frozen hunks; LF/CRLF/Windows/idempotence/tamper/ambiguity pass; no source writes`)
