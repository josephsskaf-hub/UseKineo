import { semIntegracaoSobreMain2372610 } from './test-support/leva-rebase-2610.mjs' // exact final source before immutable historical proofs.
// KINEO-FILME15-PERFEITO-2610: exact undo, immutable base, mutants and real chain.
// All projections happen in memory. No source writes, environment files or network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { FILME15_PERFEITO_MANIFEST as manifest, FILME15_PERFEITO_BASE as BASE,
  semFilme15Perfeito2610 as undo, comFilme15Perfeito2610 as redo } from './test-support/desfaz-filme15-perfeito-2610.mjs'
import { semFilme15Fiel2610 } from './test-support/desfaz-filme15-fiel-2610.mjs'
import { semFilme15Perfeito2610 as semFilme15PerfeitoIrma, comFilme15Perfeito2610 as comFilme15PerfeitoIrma } from './test-support/desfaz-filme15-perfeito-2610.mjs' // KINEO-LEVA-PERFEITO-2610
import { semFilme15Elenco2610 } from './test-support/desfaz-filme15-elenco-2610.mjs' // KINEO-LEVA-PERFEITO-2610
import { semVozNativa2610 } from './test-support/desfaz-voz-nativa-2610.mjs' // KINEO-LEVA-PERFEITO-2610
const semIrmas = (t, f) => { // KINEO-LEVA-PERFEITO-2610 — o elenco já tira o visual em inglês
  const s = semVozNativa2610(semFilme15Elenco2610(t, f), f)
  // no desfaz do rosto, as irmãs só puseram import + chamada (uma linha cada, com a marca delas): saem por linha inteira
  if (typeof s !== 'string' || !String(f).endsWith('desfaz-filme15-rosto-2610.mjs')) return s
  const nl = s.includes(String.fromCharCode(13, 10)) ? String.fromCharCode(13, 10) : String.fromCharCode(10)
  return s.split(nl).filter((l) => !/KINEO-VOZ-NATIVA-2610|KINEO-FILME15-ELENCO-2610/.test(l)).join(nl)
}
const flatIrmas = (t) => typeof t === 'string' ? t.split(String.fromCharCode(13)).join('') : t // KINEO-LEVA-PERFEITO-2610
import { semCaptionCanonico2610 } from './test-support/desfaz-caption-canonico-2610.mjs'
const lf = s => s.replace(/\r\n/g, '\n')
const crlf = s => lf(s).replace(/\n/g, '\r\n')
const hash = s => crypto.createHash('sha256').update(s).digest('hex')
const read = file => lf(semIntegracaoSobreMain2372610(fs.readFileSync(file, 'utf8'), file))
const git = (...args) => lf(execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }))
let checks = 0, mutants = 0
const check = fn => { fn(); checks++ }
assert.equal(BASE, '2072944f17eab603bc40fcaa0d576d3b0ce9c78f')
function preserveMutation(changed, file, before) {
  try { assert.notEqual(lf(undo(changed, file)), before, 'unknown mutation erased: ' + file) }
  catch (error) { if (error.code === 'ERR_ASSERTION') throw error; assert.match(String(error), /FILME15-PERFEITO-2610:/) }
  mutants++
}
for (const [file, entry] of Object.entries(manifest.scope)) {
  const before = git('show', BASE + ':' + file), after = flatIrmas(comFilme15PerfeitoIrma(semIrmas(semFilme15PerfeitoIrma(read(file), file), file), file)) // KINEO-LEVA-PERFEITO-2610 — camadas irmãs que entraram na main depois da base (elenco, voz nativa, visual em inglês) saem; a deste pacote é reaplicada
  check(() => assert.equal(hash(before), entry.beforeSha256, 'exact base bytes: ' + file))
  check(() => assert.equal(hash(after), entry.afterSha256, 'exact current bytes: ' + file))
  check(() => assert.equal(hash(JSON.stringify(entry.hunks)), entry.hunksSha256))
  check(() => assert.equal(undo(after, file), before))
  check(() => assert.equal(redo(before, file), after))
  check(() => assert.equal(redo(undo(after, file), file), after))
  check(() => assert.equal(undo(undo(after, file), file), before))
  check(() => assert.equal(redo(redo(before, file), file), after))
  check(() => assert.equal(undo(crlf(after), file.replaceAll('/', '\\')), crlf(before)))
  check(() => assert.equal(semFilme15Fiel2610(after, file), semFilme15Fiel2610(before, file), 'FIEL entrypoint strips the newer layer first'))
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
for (const file of Object.keys(manifest.addedSources).filter(file => /^scripts\/test-filme15-.*\.mjs$/.test(file) && !file.endsWith('perfeito-undo-2610.mjs'))) {
  check(() => assert.doesNotMatch(read(file), /import[^\n]*desfaz-|semFilme15Perfeito2610\(/, 'current behavior reads raw code: ' + file))
}
const oldManifests = git('ls-tree', '-r', '--name-only', BASE, '--', 'scripts/test-support').trim().split('\n').filter(file => /(?:fontes|trocas|hunks).*\.json$/.test(file))
const MAIN_DO_MERGE = '62213b008292f110117d1abbe20c157efdb55902' // KINEO-LEVA-PERFEITO-2610 — a main no merge: camadas irmãs (FIEL/ELENCO/VOZ/VISUAL) mudaram manifestos depois da BASE; este pacote não muda nenhum
for (const file of oldManifests) check(() => assert.equal(read(file), lf(git('show', MAIN_DO_MERGE + ':' + file)), 'old manifest stays immutable: ' + file))
const inventory = [...Object.keys(manifest.scope), ...Object.keys(manifest.addedSources), manifest.manifestPath].sort()
// KINEO-LEVA-PERFEITO-2610 — o inventário é medido contra a main do merge (as camadas irmãs já estão nela); arquivo de fora do
// inventário só passa se TODA linha que a integração mudou nele traz a marca da integração (re-âncora de guardião irmão).
const soReancora = (file) => { const d = git('diff', '-U0', MAIN_DO_MERGE, '--', file).split('\n').filter(l => /^[+-](?![+-])/.test(l)); return d.length > 0 && d.filter(l => l.startsWith('+')).every(l => l.includes('KINEO-LEVA-PERFEITO-2610')) }
const PONTA = git('log', '-1', '--format=%H', '--grep=KINEO-LEVA-PERFEITO-2610').trim() || 'HEAD' // KINEO-LEVA-PERFEITO-2610 — inventário medido na última commit deste pacote: camadas mais novas por cima (ex.: KINEO-PRIVACIDADE-PLUGIN-2610) não entram
const actual = [...new Set([...git('diff', '--name-only', MAIN_DO_MERGE, PONTA).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')])]
  .filter(file => file && !file.endsWith('.tsbuildinfo') && !file.startsWith('node_modules/'))
  .filter(file => inventory.includes(file) || !soReancora(file)).sort()
check(() => assert.deepEqual(inventory, actual, 'complete task inventory relative to exact upstream'))
console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutants: mutants, sources: Object.keys(manifest.scope).length, addedSources: Object.keys(manifest.addedSources).length, base: BASE, sourceWrites: 0, network: 0 }))
