// KINEO-AMOSTRA-ANUNCIO-2410 — exact source restoration, tamper rejection and legacy layer preservation.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semAmostraAnuncio2410, AMOSTRA_ANUNCIO_2410 as manifest } from './test-support/desfaz-amostra-anuncio-2410.mjs'
const hash = text => createHash('sha256').update(text).digest('hex')
assert.equal(manifest.base, '1c078ed013302ac47c42f783305df688c4e97cfd')
for (const [file, known] of Object.entries(manifest.sources)) {
  const originalBuffer = readFileSync(file), source = originalBuffer.toString('utf8'), normalized = source.replace(/\r\n/g, '\n')
  const before = execFileSync('git', ['show', manifest.base + ':' + file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
  assert.equal(known.before, before, 'base blob: ' + file); assert.equal(hash(before), known.beforeHash); assert.equal(hash(normalized), known.afterHash, 'candidate source: ' + file)
  assert.equal(semAmostraAnuncio2410(normalized, file), before, 'exact undo: ' + file)
  assert.equal(semAmostraAnuncio2410(before, file), before, 'idempotent: ' + file)
  assert.equal(semAmostraAnuncio2410(normalized.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'CRLF: ' + file)
  assert.throws(() => semAmostraAnuncio2410(source + '\n// KINEO-AMOSTRA-ANUNCIO-2410 mutant\n', file), /fonte divergente/)
  assert.deepEqual(readFileSync(file), originalBuffer, 'proofs preserve every source byte: ' + file)
}
for (const file of manifest.newFiles) assert.ok(readFileSync(file).length, 'inventoried new file: ' + file)
console.log(`PASS sample exact undo: ${Object.keys(manifest.sources).length} existing sources, ${manifest.newFiles.length} new sources; original blobs, SHA256, CRLF, tamper and byte preservation`)
