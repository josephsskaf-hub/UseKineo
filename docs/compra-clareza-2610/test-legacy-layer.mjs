// Offline source-integrity proof; current behavioral tests never use this adapter.
import assert from 'node:assert/strict'
import { semEmAlta2610 } from '../../scripts/test-support/desfaz-em-alta-2610.mjs' // KINEO-EM-ALTA-2610
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { semVideoFiel2610 } from '../../scripts/test-support/desfaz-video-fiel-2610.mjs' // VIDEO-FIEL-2610: before frozen source comparison, never in current behavior tests.
import { COMPRA_CLAREZA_HUNKS, COMPRA_CLAREZA_MANIFEST, semCompraClareza2610 } from '../../scripts/test-support/desfaz-compra-clareza-2610.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const flat = source => source.replace(/\r\n/g, '\n')
const sha = source => crypto.createHash('sha256').update(source).digest('hex')
let assertions = 0, mutants = 0
function check(run) { run(); assertions++ }
assert.deepEqual(Object.keys(COMPRA_CLAREZA_HUNKS).sort(), ['.github/workflows/guardiao.yml', 'app/(dashboard)/generate/GenerateClient.tsx', 'app/(dashboard)/studio/StudioClient.tsx', 'scripts/test-support/desfaz-roteiro-curto-2210.mjs', 'scripts/test-support/desfaz-trending-inventario-2510.mjs', 'scripts/test-roteiro-curto-undo-2210.mjs'].sort())
for (const [file, hunks] of Object.entries(COMPRA_CLAREZA_HUNKS)) {
  const candidate = flat(semVideoFiel2610(semEmAlta2610(fs.readFileSync(path.join(ROOT, file), 'utf8'), file), file)) // KINEO-EM-ALTA-2610 — reancora do guardião do roteiro curto sai antes
  const base = flat(execFileSync('git', ['show', `${COMPRA_CLAREZA_MANIFEST.base}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }))
  const meta = COMPRA_CLAREZA_MANIFEST.scope[file]
  check(() => assert.equal(sha(base), meta.beforeSha256))
  check(() => assert.equal(sha(candidate), meta.afterSha256, 'Frozen candidate must be reviewed again if changed'))
  check(() => assert.equal(flat(semCompraClareza2610(candidate, file)), base, 'Every unrelated byte and handler is preserved'))
  check(() => assert.equal(flat(semCompraClareza2610(candidate.replace(/\n/g, '\r\n'), file)), base))
  check(() => assert.equal(semCompraClareza2610(base, file), base))
  check(() => assert.equal(flat(semCompraClareza2610(candidate + '\n// unknown later change\n', file)), base + '\n// unknown later change\n', 'Unknown changes survive for historical guardians to detect'))
  for (const hunk of hunks) {
    check(() => assert.throws(() => semCompraClareza2610(candidate.replace(hunk.after, hunk.after + hunk.after), file), /expected exactly 1 candidate match/))
    check(() => assert.throws(() => semCompraClareza2610(candidate.replace(hunk.after, hunk.after.replace(/[^\s]/, '§')), file), /expected exactly 1 candidate match/))
    mutants += 2
  }
}
check(() => assert.equal(semCompraClareza2610('unrelated COMPRA-CLAREZA-2610', 'unrelated.ts'), 'unrelated COMPRA-CLAREZA-2610'))
console.log(`Compra legacy projection PASS: ${assertions} integrity checks, ${mutants} rejected hunk mutations; current product tests read unprojected source.`)
