// KINEO-IDIOMAS-FORMATOS-2410 — both immutable histories, exact integration undo and complete task inventory; no filesystem mutation.
import assert from 'node:assert/strict'
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semVideoFiel2610 } from './test-support/desfaz-video-fiel-2610.mjs' // VIDEO-FIEL-2610: before immutable afterHash comparison.
import { semCardsGiro2410, CARDS_GIRO_2410_MANIFEST as cardsGiro } from './test-support/desfaz-cards-giro-2410.mjs' // KINEO-CARDS-GIRO-2410 — preserve the original exact hashes and inventory below.
import { semIdiomasFormatos2410 as undo, IDIOMAS_FORMATOS_2410_BASE as BASE, IDIOMAS_FORMATOS_2410_MANIFEST as manifest } from './test-support/desfaz-idiomas-formatos-2410.mjs'

const INTEGRATION_BASE = '8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405'
const PREVIOUS = 'b01cfe2cb2d9f244df0ee22baa649daa8d6103fe'
const OVERLAPS = ['.github/workflows/guardiao.yml', 'scripts/test-ads-escolha-publico-2410.mjs', 'scripts/test-support/desfaz-ads-escolha-publico-2410.mjs'].sort()
const UPSTREAM_READER = 'scripts/test-trafego-undo-2310.mjs'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const lf = s => s.replace(/\r\n/g, '\n')
const crlf = s => s.replace(/\n/g, '\r\n')
const affiliateRaw = file => { const source=readFileSync(file,'utf8'), projected=semAfiliado50_2610(file,source); return source.includes('\r\n')?crlf(projected):projected }
const hash = s => createHash('sha256').update(s).digest('hex')
assert.equal(manifest.base, BASE, 'the original immutable task base is preserved')
assert.deepEqual(manifest.integration, { base: INTEGRATION_BASE, previous: PREVIOUS }, 'integration names the exact upstream and original branch SHAs')
assert.equal(git('rev-parse', INTEGRATION_BASE).trim(), INTEGRATION_BASE)
assert.equal(git('rev-parse', PREVIOUS).trim(), PREVIOUS)
assert.deepEqual(Object.entries(manifest.sources).filter(([, item]) => Object.hasOwn(item, 'integratedBefore') || Object.hasOwn(item, 'integratedBeforeHash')).map(([file]) => file).sort(), OVERLAPS, 'exactly the three upstream overlaps have an integrated before')
assert.deepEqual(Object.entries(manifest.sources).filter(([, item]) => Object.hasOwn(item, 'sourceBase')).map(([file]) => file), [UPSTREAM_READER], 'only the new upstream reader has its own source base')
for (const [file, item] of Object.entries(manifest.sources)) {
  const sourceBase = item.sourceBase ?? BASE
  const raw = semCardsGiro2410(semVideoFiel2610(affiliateRaw(file), file), file), current = lf(raw), originalBase = git('show', sourceBase + ':' + file) // KINEO-CARDS-GIRO-2410
  const integratedBase = git('show', INTEGRATION_BASE + ':' + file)
  assert.equal(item.before, originalBase, 'before bytes come from their immutable source base: ' + file)
  assert.equal(item.beforeHash, hash(originalBase), 'immutable before hash: ' + file)
  assert.equal(item.afterHash, hash(current), 'current exact source hash: ' + file)
  if (OVERLAPS.includes(file)) {
    assert.equal(item.integratedBefore, integratedBase, 'the upstream overlap is preserved exactly: ' + file)
    assert.equal(item.integratedBeforeHash, hash(integratedBase), 'integrated before hash: ' + file)
  } else {
    assert.equal(originalBase, integratedBase, 'non-overlap task sources have the same before on both histories: ' + file)
  }
  if (item.sourceBase) {
    assert.equal(item.sourceBase, INTEGRATION_BASE, 'upstream reader belongs to the integrated base')
    assert.ok(!Object.hasOwn(item, 'originalAfterHash'), 'upstream reader has no fabricated pre-integration task hash')
  } else {
    const previous = git('show', PREVIOUS + ':' + file)
    assert.equal(item.originalAfterHash, hash(previous), 'original after hash comes from the exact pre-integration SHA: ' + file)
    assert.equal(undo(previous, file), originalBase, 'original branch still restores the original before: ' + file)
    assert.equal(undo(crlf(previous), file.replace(/\//g, '\\')), crlf(originalBase), 'original branch CRLF and Windows path: ' + file)
    assert.equal(undo(undo(previous, file), file), originalBase, 'original history is idempotent: ' + file)
  }
  assert.equal(undo(raw, file), raw.includes('\r\n') ? crlf(integratedBase) : integratedBase, 'current undo preserves the integrated upstream: ' + file)
  assert.equal(undo(current, file), integratedBase, 'current LF undo: ' + file)
  assert.equal(undo(crlf(current), file), crlf(integratedBase), 'current CRLF undo: ' + file)
  assert.equal(undo(current, file.replace(/\//g, '\\')), integratedBase, 'Windows path normalization: ' + file)
  assert.equal(undo(originalBase, file), originalBase, 'original before is a fixed point: ' + file)
  assert.equal(undo(integratedBase, file), integratedBase, 'integrated before is a fixed point: ' + file)
  assert.equal(undo(undo(current, file), file), integratedBase, 'current history is idempotent: ' + file)
  const historical = git('show', sourceBase + '^:' + file)
  assert.equal(undo(historical, file), historical, 'older exact source can re-enter the historical chain: ' + file)
  assert.throws(() => undo(current + '\n// source tampered\n', file), /fonte divergente/, 'current source tampering is rejected: ' + file)
  const removed = current.replaceAll('KINEO-IDIOMAS-FORMATOS-2410', 'REMOVED_TASK_MARK')
  if (removed !== current) assert.throws(() => undo(removed, file), /fonte divergente/, 'task evidence survives removed marker: ' + file)
  const savedBefore = item.before
  try {
    item.before += '\n// corrupt manifest before\n'
    assert.throws(() => undo(originalBase, file), /manifesto divergente/, 'before bytes are verified before a fixed-point return: ' + file)
  } finally { item.before = savedBefore }
  if (OVERLAPS.includes(file)) {
    const savedIntegrated = item.integratedBefore
    try {
      item.integratedBefore += '\n// corrupt integrated before\n'
      assert.throws(() => undo(current, file), /manifesto divergente/, 'integrated before bytes are verified before restoration: ' + file)
      assert.throws(() => undo(integratedBase, file), /manifesto divergente/, 'integrated fixed-point bytes are verified: ' + file)
    } finally { item.integratedBefore = savedIntegrated }
  }
}
assert.ok(Object.keys(manifest.sources).length >= 20, 'complete productive and historical adaptation layer is inventoried')
for (const file of manifest.newFiles) {
  assert.ok(existsSync(file), 'new task source exists: ' + file)
  assert.throws(() => git('show', INTEGRATION_BASE + ':' + file), undefined, 'task source did not exist in the integrated upstream: ' + file)
}
for (const file of manifest.artifacts) assert.ok(file.startsWith('docs/') && existsSync(file), 'artifact is under docs: ' + file)
const giroFiles = new Set([...Object.keys(cardsGiro.sources), ...cardsGiro.newFiles, ...(cardsGiro.artifacts ?? [])]), idiomaFiles = new Set([...Object.keys(manifest.sources), ...manifest.newFiles, ...manifest.artifacts]) // KINEO-CARDS-GIRO-2410 — exclude only this separately verified layer; keep every original Idiomas source.
const actual = [...new Set([...git('diff', '--name-only', INTEGRATION_BASE, '7ab62db2b10bea45b0c550879c7353f03caf3a6a').trim().split('\n')])].filter(file => file && !file.startsWith('scripts/test-support/desfaz-cards-bordas-2410') && (!giroFiles.has(file) || idiomaFiles.has(file))).sort() // KINEO-CARDS-GIRO-2410 · KINEO-CARDS-BORDAS-2410 // KINEO-TRENDING-INVENTARIO-2510 — inventario historico da entrega publicada, nao de todas as tarefas futuras.
assert.deepEqual([...Object.keys(manifest.sources), ...manifest.newFiles, ...manifest.artifacts].sort(), actual, 'task inventory is relative to integrated upstream; upstream-only files are not attributed to this task')
assert.equal(undo('unrelated\r\n', 'lib/unrelated.ts'), 'unrelated\r\n')
console.log(`ok idiomas/formatos undo: ${Object.keys(manifest.sources).length} exact sources; original dd0 history preserved; exactly 3 upstream overlaps; current undo equals ${INTEGRATION_BASE}; idempotent; LF/CRLF/Windows; tampering rejected; full integration inventory; no network or filesystem mutation`)
