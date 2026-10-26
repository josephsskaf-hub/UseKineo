import { levaTaskSource, levaTaskInventory, levaCurrentInventory } from './test-support/leva-integration-2410.mjs' // KINEO-LEVA-2410 — sealed live source and complete current-tree inventory.
// KINEO-APRESENTADORES-2410 — exact rollback proof, without changing the working tree.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { APRESENTADORES_2410_BASE as BASE, APRESENTADORES_2410_MANIFEST as manifest, semApresentadores2410 as undo } from './test-support/desfaz-apresentadores-2410.mjs'
const hash = s => createHash('sha256').update(s).digest('hex')
for (const [file, entry] of Object.entries(manifest.sources)) {
  const live = levaTaskSource(readFileSync(file, 'utf8'), file, 'presenters').replace(/\r\n/g, '\n')
  const before = execFileSync('git', ['show', `${BASE}:${file}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')
  assert.equal(hash(live), entry.afterHash, 'live source matches sealed layer: ' + file)
  assert.equal(undo(live, file), before, 'exact baseline restored: ' + file)
  assert.equal(undo(undo(live, file), file), before, 'undo is idempotent: ' + file)
  assert.equal(undo(live.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'CRLF preserved: ' + file)
  assert.throws(() => undo(live + '\n// unreviewed change KINEO-APRESENTADORES-2410\n', file), /source_diverged/)
}
for (const file of manifest.added) assert(existsSync(file), 'new task file exists: ' + file)
assert.equal(undo('older unrelated source', 'lib/ads/v2Presenter.ts'), 'older unrelated source')
console.log(`PASS: exact undo to ${BASE} for ${Object.keys(manifest.sources).length} files; CRLF, idempotence, divergence rejection and ${manifest.added.length} new files inventoried.`)
