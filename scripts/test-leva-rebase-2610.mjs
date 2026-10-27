import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs'
// KINEO-LEVA-REBASE-2610 — physical source seals plus both complete immutable chains.
// No environment, network, database, paid render or source mutation.
import assert from 'node:assert/strict'
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'
import { semVitrine2610 } from './test-support/desfaz-vitrine-filmes-2610.mjs'
import { semUpsellFilme152610 } from './test-support/desfaz-upsell-filme15-2610.mjs'
import { readFileSync } from 'node:fs'
import {
  REBASE, REBASE_MAIN, REBASE_LEVA, REBASE_BASE, REBASE_MANIFEST_PATH, FINAL_PRE_LEVA_2610, FINAL_MAIN_2610,
  REBASE_LEGACY_MANIFEST, rebaseLf, rebaseHash, rebaseGit, rebaseTextFile,
  rebaseCurrentInventory, verifyRebaseManifest, verifyRebaseCurrentTree,
  semLevaSobreMain2610, semMainSobreLeva2610, semLevaSobreIntegracao2610, semIntegracaoSobreMain2372610, preloadRebaseBlobs2610, rebaseImmutableSource2610,
} from './test-support/leva-rebase-2610.mjs'
let checks = 0, mutants = 0
const check = fn => { fn(); checks++ }
const crlf = text => rebaseLf(text).replace(/\n/g, '\r\n')
check(() => assert.equal(REBASE.main, REBASE_MAIN))
check(() => assert.equal(REBASE.leva, REBASE_LEVA))
check(() => assert.equal(REBASE.base, REBASE_BASE))
check(() => assert.deepEqual(verifyRebaseCurrentTree(), rebaseCurrentInventory()))
check(() => assert.equal(rebaseLf(readFileSync(REBASE_LEGACY_MANIFEST, 'utf8')), rebaseGit('show', REBASE_LEVA + ':' + REBASE_LEGACY_MANIFEST), 'the old LEVA manifest remains exact, not resealed'))

// Product preservation is checked on RAW bytes, never satisfied by projection.
// The newer main owns these complete sources, including native PT/ES MiniMax
// and the character-sheet block inside the real cinematic generation route.
const protectedMain = [
  ...rebaseGit('ls-tree', '-r', '--name-only', FINAL_MAIN_2610, '--', 'lib/filmes').trim().split('\n').filter(Boolean),
  'lib/textLanguage.ts', 'app/api/generate-video-cinematic/route.ts',
]
for (const file of protectedMain) check(() => assert.equal(rebaseLf(readFileSync(file, 'utf8')), rebaseGit('show', FINAL_MAIN_2610 + ':' + file), 'complete current main product survives byte-exact: ' + file))
const composeFile = 'app/api/compose/route.ts'
const purchaseLines = rebaseGit('show', REBASE_LEVA + ':' + composeFile).split('\n').filter(line => line.includes('KINEO-COMPRA-AVULSA-2410') && line.includes('hasPaid && cinematicUpstreamDebited'))
check(() => assert.equal(purchaseLines.length, 1, 'the exact one-line purchase delta comes from immutable LEVA'))
const compose = rebaseLf(readFileSync(composeFile, 'utf8')), purchaseLine = purchaseLines[0] + '\n'
check(() => assert.equal(compose.split(purchaseLine).length - 1, 1, 'paid exact-balance delivery survives exactly once in raw compose'))
check(() => assert.equal(compose.replace(purchaseLine, ''), rebaseGit('show', FINAL_MAIN_2610 + ':' + composeFile), 'every main compose byte survives; the only new product delta is the immutable purchase line'))

// Current CI gates are checked on RAW workflow bytes independently of seals or
// historical projection. Resealing a workflow that loses either parent's gate
// must never make the old whole-workflow historical pin sufficient by itself.
const workflowFile = '.github/workflows/guardiao.yml'
const rawWorkflow = readFileSync(workflowFile, 'utf8')
const workflowCommand = line => /^\s*(?:run:\s*)?node\s/.test(line) ? line.trim().replace(/^run:\s*/, '') : null
const workflowParents = [FINAL_MAIN_2610, REBASE_LEVA].map(ref => {
  const lines = rebaseGit('show', ref + ':' + workflowFile).split('\n')
  return { ref, lines, commands: lines.map(workflowCommand).filter(Boolean) }
})
function subsequence(expected, actual) {
  let at = 0
  for (const value of actual) if (value === expected[at]) at++
  return at === expected.length
}
const ownWorkflowCommand = 'node scripts/test-leva-rebase-2610.mjs'
function verifyRawWorkflowParents(source) {
  const lines = rebaseLf(source).split('\n'), commands = lines.map(workflowCommand).filter(Boolean)
  for (const parent of workflowParents) {
    assert.ok(subsequence(parent.lines, lines), 'raw workflow preserves every exact parent line and its order: ' + parent.ref)
    assert.ok(subsequence(parent.commands, commands), 'raw workflow preserves every parent command and its order: ' + parent.ref)
  }
  assert.equal(commands.filter(command => command === ownWorkflowCommand).length, 1, 'raw workflow executes the new rebase guardian exactly once')
}
check(() => verifyRawWorkflowParents(rawWorkflow))
check(() => verifyRawWorkflowParents(crlf(rawWorkflow)))
const currentWorkflowLines = rebaseLf(rawWorkflow).split('\n')
for (let i = 0; i < workflowParents.length; i++) {
  const parent = workflowParents[i], other = workflowParents[1 - i]
  const unique = parent.commands.find(command => !other.commands.includes(command) && currentWorkflowLines.filter(line => workflowCommand(line) === command).length === 1)
  check(() => assert.ok(unique, 'each parent has a unique current command to mutate: ' + parent.ref))
  const removed = currentWorkflowLines.filter(line => workflowCommand(line) !== unique).join('\n')
  check(() => assert.notEqual(removed, rebaseLf(rawWorkflow), 'parent command deletion is actually applied'))
  check(() => assert.throws(() => verifyRawWorkflowParents(removed), /workflow/, 'removing a unique parent command rejects even with a fresh source seal'))
  mutants++
}
const ownWorkflowLine = currentWorkflowLines.find(line => workflowCommand(line) === ownWorkflowCommand)
check(() => assert.ok(ownWorkflowLine, 'the current rebase command has a real executable line'))
const noOwnGuardian = currentWorkflowLines.filter(line => workflowCommand(line) !== ownWorkflowCommand).join('\n')
check(() => assert.throws(() => verifyRawWorkflowParents(noOwnGuardian), /workflow/, 'deleting the new guard rejects'))
const duplicatedOwnGuardian = rebaseLf(rawWorkflow).replace(ownWorkflowLine, ownWorkflowLine + '\n' + ownWorkflowLine)
check(() => assert.notEqual(duplicatedOwnGuardian, rebaseLf(rawWorkflow), 'new guard duplication is actually applied'))
check(() => assert.throws(() => verifyRawWorkflowParents(duplicatedOwnGuardian), /workflow/, 'duplicating the new guard rejects'))
mutants += 2

// A source owned by the Ads sample must keep its CURRENT paid/sample gate when
// entering unrelated historical adapters. The sealed final projection is not global.
const unrelatedSourceFile = 'app/api/ads/v2/cena/route.ts', unrelatedSource = readFileSync(unrelatedSourceFile, 'utf8')
check(() => assert.equal(semAfiliado50_2610(unrelatedSourceFile, unrelatedSource), rebaseLf(unrelatedSource)))
check(() => assert.equal(semVitrine2610(unrelatedSource, unrelatedSourceFile), unrelatedSource))
check(() => assert.equal(semUpsellFilme152610(unrelatedSource, unrelatedSourceFile), unrelatedSource))
// An absent immutable blob must not resolve to Git's default HEAD display for a bracketed route.
const newShowcaseFile = 'app/es/made-with-kineo/[slug]/page.tsx'
const newShowcaseSource = readFileSync(newShowcaseFile, 'utf8')
check(() => assert.throws(() => rebaseImmutableSource2610(REBASE_LEVA, newShowcaseFile), /absent immutable source/))
check(() => assert.equal(semMainSobreLeva2610(newShowcaseSource, newShowcaseFile), newShowcaseSource, 'absence never fabricates a historical blob'))
check(() => assert.equal(semVitrine2610(newShowcaseSource, newShowcaseFile), null, 'exact new Vitrine route returns to absence'))
check(() => assert.equal(semCloseReal1910(newShowcaseSource, newShowcaseFile), null, 'the complete legacy chain preserves removed-source null'))
check(() => assert.equal(semCloseReal1910(null, newShowcaseFile), null, 're-entering the complete legacy chain preserves null'))
check(() => assert.throws(() => semCloseReal1910(newShowcaseSource + '\n// changed new route\n', newShowcaseFile), /modified new file; refusing deletion/, 'changed new route cannot be erased by the legacy chain'))

preloadRebaseBlobs2610()
for (const [target, undo] of [[REBASE_MAIN, semLevaSobreMain2610], [REBASE_LEVA, semMainSobreLeva2610], [FINAL_PRE_LEVA_2610, semLevaSobreIntegracao2610], [FINAL_MAIN_2610, semIntegracaoSobreMain2372610]]) {
  for (const file of Object.keys(REBASE.sources).filter(rebaseTextFile)) {
    const raw = readFileSync(file, 'utf8'), current = rebaseLf(raw)
    check(() => assert.equal(rebaseHash(current), REBASE.sources[file].hash, 'physical full-source seal: ' + file))
    let expected
    try { expected = rebaseImmutableSource2610(target, file) } catch {
      check(() => assert.equal(undo(raw, file), raw, 'new file absent from destination remains visible: ' + file))
      continue
    }
    check(() => assert.equal(rebaseLf(undo(raw, file)), expected, 'exact immutable destination: ' + file))
    check(() => assert.equal(undo(crlf(raw), file.replaceAll('/', '\\')), crlf(expected), 'CRLF and Windows path: ' + file))
    check(() => assert.equal(undo(expected, file), expected, 'historical destination fixed point: ' + file))
    check(() => assert.equal(undo(undo(raw, file), file), undo(raw, file), 'projection idempotent: ' + file))
    for (const bad of [current + '\n// unreviewed outside bytes\n', current.slice(0, Math.floor(current.length / 2)) + '§' + current.slice(Math.floor(current.length / 2))]) {
      check(() => assert.equal(undo(bad, file), bad, 'unknown source/mutant cannot become historical source: ' + file)); mutants++
    }
    const removed = current.replaceAll(/KINEO-[A-Z0-9-]+/g, 'REMOVED_TASK_MARK')
    if (removed !== current) { check(() => assert.equal(undo(removed, file), removed, 'removed markers never bypass full-source hash: ' + file)); mutants++ }
  }
  check(() => assert.equal(undo(null, 'unrelated.ts'), null))
  check(() => assert.equal(undo('unrelated\r\n', 'unrelated.ts'), 'unrelated\r\n'))
}

for (const key of ['base', 'main', 'leva']) {
  const saved = REBASE[key]
  try { REBASE[key] = '0000000'; check(() => assert.throws(verifyRebaseManifest, /manifesto divergente/, 'immutable ref mutation rejects: ' + key)); mutants++ } finally { REBASE[key] = saved }
}
const sealedFile = Object.keys(REBASE.sources)[0], seal = REBASE.sources[sealedFile]
try { delete REBASE.sources[sealedFile]; check(() => assert.throws(verifyRebaseManifest, /manifesto divergente/, 'omitting any source seal rejects')); mutants++ } finally { REBASE.sources[sealedFile] = seal }
const inventory = REBASE.inventory
try { REBASE.inventory = [...inventory, 'docs/unreviewed-rebase.txt'].sort(); check(() => assert.throws(verifyRebaseCurrentTree, /manifesto divergente|inventário/, 'unknown current inventory path rejects')); mutants++ } finally { REBASE.inventory = inventory }
try { REBASE.inventory = inventory.filter(file => file !== sealedFile); delete REBASE.sources[sealedFile]; check(() => assert.throws(verifyRebaseCurrentTree, /inventário/, 'omitting a path and its matching seal still rejects')); mutants++ } finally { REBASE.inventory = inventory; REBASE.sources[sealedFile] = seal }
const savedHash = seal.hash
try { seal.hash = '0'.repeat(64); check(() => assert.throws(verifyRebaseCurrentTree, /fonte divergente/, 'wrong complete live-source seal rejects')); mutants++ } finally { seal.hash = savedHash }
check(() => assert.ok(REBASE.inventory.includes(REBASE_MANIFEST_PATH), 'the manifest itself remains inventoried'))
verifyRebaseCurrentTree()
console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutants: mutants, files: REBASE.inventory.length, main: REBASE_MAIN, leva: REBASE_LEVA, writes: 0, network: 0 }))
