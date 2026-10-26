import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { UPSELL_FILME15_2610 as manifest, semUpsellFilme152610 } from './test-support/desfaz-upsell-filme15-2610.mjs'

const normalize = source => source.replace(/\r\n/g, '\n')
const sha = source => createHash('sha256').update(source).digest('hex')
assert.equal(manifest.base, '46fa10e58fced6430e0a2ba7bb445bb8905bd2e7')
let hunks = 0
for (const [file, entry] of Object.entries({ ...manifest.scope, ...manifest.readerScope })) {
  const before = normalize(execFileSync('git', ['show', `${manifest.base}:${file}`], { encoding: 'utf8', maxBuffer: 4e6 }))
  const current = normalize(readFileSync(file, 'utf8'))
  assert.equal(sha(before), entry.beforeSha256, 'immutable main hash: ' + file)
  assert.equal(sha(current), entry.afterSha256, 'current raw source hash: ' + file)
  assert.equal(semUpsellFilme152610(current, file), before, 'exact LF undo: ' + file)
  assert.equal(semUpsellFilme152610(current.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'exact CRLF undo: ' + file)
  assert.equal(semUpsellFilme152610(before, file), before, 'old source is idempotent: ' + file)
  assert.throws(() => semUpsellFilme152610(current + '\n// unrelated changed byte\n', file), /source differs|missing|ambiguous/, 'unrelated edits are never erased: ' + file)
  for (const hunk of entry.hunks) {
    hunks++
    assert.equal(current.split(hunk.after).length, 2, 'unique frozen hunk: ' + file)
    const position = hunk.after.indexOf('\n')
    const changed = hunk.after.slice(0, position) + ' // tampered context' + hunk.after.slice(position)
    assert.throws(() => semUpsellFilme152610(current.replace(hunk.after, changed), file), /missing|source differs/, 'changed context fails closed: ' + file)
    assert.throws(() => semUpsellFilme152610(current + '\n' + hunk.after, file), /ambiguous/, 'duplicated hunk fails closed: ' + file)
  }
}
assert.equal(Object.keys(manifest.scope).length, 7)
assert.equal(Object.keys(manifest.readerScope).length, 1)
assert.equal(manifest.newRuntimeFiles.length, 9)
assert.equal(semUpsellFilme152610('unrelated source', 'lib/unrelated.ts'), 'unrelated source')
console.log(`upsell-filme15 exact undo: 7 runtime sources, 1 historical reader, 9 new runtime files, ${hunks} frozen hunks; LF/CRLF/idempotence/tamper/ambiguity pass; no source writes`)
