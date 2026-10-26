// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — reproducible proof of the exact legacy-only in-memory adapter.
// Reads the actual existing candidate files and adapter with readFileSync; git show supplies the immutable base.
// No disk mutation, network, SDK, environment files, engineWall or homeVideoCuration are read.
import fs from 'node:fs'
import { semCompraClareza2610 } from './test-support/desfaz-compra-clareza-2610.mjs' // COMPRA-CLAREZA-2610
import { semAdminLeve2310 } from './test-support/desfaz-admin-leve-2310.mjs' // KINEO-ADMIN-LEVE-2310 — remove only the exact later admin delta before historical source integrity checks.
import { semPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { semAdsCena95PlanFailed2110 } from './test-support/desfaz-ads-cena-95-plan-failed-2110.mjs' // KINEO-ADS-CENA-95-PLAN-FAILED-2110

const argument = process.argv.find((arg) => arg.startsWith('--root='))?.slice('--root='.length)
const ROOT = path.resolve(argument || process.env.TEST_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const BASE = 'f3532d7d2' // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — preserve Cartoon/Cena95 merged-main layers.
const HELPER = 'scripts/test-support/desfaz-roteiro-curto-2210.mjs'
const MARK = 'KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22'
const SCOPE = {
  ".github/workflows/guardiao.yml": 1,
  "app/(dashboard)/generate/GenerateClient.tsx": 34,
  "app/(dashboard)/studio/StudioClient.tsx": 9,
  "app/api/admin/live/route.ts": 8,
  "components/ChatGptWelcomeBanner.tsx": 6,
  "scripts/diagnose-studio-continuation.mjs": 1,
  "scripts/test-ads-cena-2110.mjs": 2,
  "scripts/test-ads-cena-95-2110.mjs": 3,
  "scripts/test-ads-cena-ajuste-2110.mjs": 2,
  "scripts/test-ads-fluxo-1310.mjs": 2,
  "scripts/test-bebe-que-fala-2010.mjs": 4,
  "scripts/test-chatgpt-script-handoff.mjs": 1,
  "scripts/test-coerencia-kineo1-2026-09-16.mjs": 2,
  "scripts/test-desenho-nota9-2110.mjs": 2,
  "scripts/test-despacho-vazio-2026-09-04.mjs": 1,
  "scripts/test-duracao-rewards-2026-10-06.mjs": 2,
  "scripts/test-estorno-explicado-2026-09-02.mjs": 1,
  "scripts/test-estrela-do-filme-2026-09-29.mjs": 2,
  "scripts/test-failure-cause-38.mjs": 4,
  "scripts/test-failure-screen-40.mjs": 3,
  "scripts/test-filme-rapido-1710.mjs": 3,
  "scripts/test-five-improvements.mjs": 2,
  "scripts/test-kids-venda-2010.mjs": 2,
  "scripts/test-leva-confiabilidade-2026-08-28.mjs": 1,
  "scripts/test-mcp-studio-2010.mjs": 3,
  "scripts/test-mcp-studio-ajuste-2010.mjs": 2,
  "scripts/test-meta95-personagem-2010.mjs": 2,
  "scripts/test-meta95-personagem-ajuste-2010.mjs": 2,
  "scripts/test-motor-15s-1510.mjs": 2,
  "scripts/test-mrr-studio-near-idea-2026-10-01.mjs": 2,
  "scripts/test-parceiro-eyebible-2-1410.mjs": 2,
  "scripts/test-parede-v1-2026-09-23.mjs": 2,
  "scripts/test-quality-failure-ui-2026-09-11.mjs": 2,
  "scripts/test-rotulo-credito-1510.mjs": 2,
  "scripts/test-script-preflight.mjs": 3,
  "scripts/test-studio-duracao-saldo-1510.mjs": 2,
  "scripts/test-studio-fantasma-1510.mjs": 2,
  "scripts/test-support/desfaz-ads-cena-95-2110.mjs": 2,
  "scripts/test-support/desfaz-filmes-f1-virgula-1910.mjs": 2,
  "scripts/test-verbatim-intocavel-2010.mjs": 1
}
const read = (file) => semAdminLeve2310(semPaginasIaClaras2110(semCompraClareza2610(fs.readFileSync(path.join(ROOT, file), 'utf8'), file), file), file) // COMPRA-CLAREZA-2610 — exact presentation layer first; preserve every historical comparison and mutant.
const unavailable = () => { throw new Error('Offline adapter proof forbids external operations') }
let passed = 0
function assert(condition, message) { if (!condition) throw new Error(message); passed++ }
function rejects(run, message) {
  let rejected = false
  try { run() } catch (e) { rejected = String(e.message).includes('expected exactly 1 candidate match') }
  assert(rejected, message)
}

try {
  // Execute the adapter actually on disk. Its private hunk data stays private in production;
  // this VM-only observation avoids adding a new public export solely for this proof.
  const context = vm.createContext({ fetch: unavailable, require: unavailable, setTimeout: unavailable, semCompraClareza2610 })
  const helper = semAdsCena95PlanFailed2110(read(HELPER), HELPER) // KINEO-ADS-CENA-95-PLAN-FAILED-2110 — executar o helper Roteiro exato antes da VM.
  const executableHelper = helper.replace(/^import \{ semCompraClareza2610 \} from [^\n]+\n/m, '') // COMPRA-CLAREZA-2610 — inject the real imported pure function into the bounded VM.
  vm.runInContext(executableHelper.replace(/^export\s+/gm, '') + '\nglobalThis.proof = { undo: semRoteiroCurto2210, hunks: HUNKS }', context, { timeout: 3000, filename: HELPER })
  const { undo, hunks } = context.proof
  const actualScope = Object.fromEntries(Object.entries(hunks).map(([file, changes]) => [file, changes.length]))
  assert(JSON.stringify(actualScope) === JSON.stringify(SCOPE) && undo('unrelated ' + MARK, 'unrelated.ts') === 'unrelated ' + MARK,
    'Adapter scope must be exactly the 40 existing task sources/131 hunks; unrelated sources must survive')

  for (const [file, changes] of Object.entries(hunks)) {
    const candidate = semAdsCena95PlanFailed2110(read(file), file) // KINEO-ADS-CENA-95-PLAN-FAILED-2110 — manter os725 checks e seus mutantes originais.
    const base = execFileSync('git', ['show', BASE + ':' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true })
    const eol = candidate.includes('\r\n') ? '\r\n' : '\n'
    const candidateLf = candidate.replace(/\r\n/g, '\n')
    const rawUndone = undo(candidate, file)
    const rawOffset = (flatOffset) => {
      let raw = 0
      for (let flat = 0; flat < flatOffset; flat++) raw += candidate[raw] === '\r' && candidate[raw + 1] === '\n' ? 2 : 1
      return raw
    }
    const intervals = changes.map((hunk) => {
      // Each exact hunk uses LF or CRLF; raw offsets also preserve untouched lines in either convention.
      const flatAt = candidateLf.indexOf(hunk.after)
      const at = rawOffset(flatAt), end = rawOffset(flatAt + hunk.after.length)
      const after = candidate.slice(at, end)
      const before = after.includes('\r\n') ? hunk.before.replace(/\n/g, '\r\n') : hunk.before
      return { at, after, length: after.length, delta: before.length - after.length }
    })
    let outsideAt = -1
    for (let index = 0; index < candidate.length; index++) {
      if (!/[\r\n]/.test(candidate[index]) && !intervals.some((range) => index >= range.at && index < range.at + range.length)) { outsideAt = index; break }
    }
    if (outsideAt < 0) throw new Error(file + ': no unchanged byte exists outside the exact hunks')
    const mappedOutsideAt = outsideAt + intervals.filter((range) => range.at < outsideAt).reduce((sum, range) => sum + range.delta, 0)
    const outsideCharacter = candidate[outsideAt] === '!' ? '?' : '!'
    const outsideCandidate = candidate.slice(0, outsideAt) + outsideCharacter + candidate.slice(outsideAt + 1)
    const outsideBase = rawUndone.slice(0, mappedOutsideAt) + outsideCharacter + rawUndone.slice(mappedOutsideAt + 1)
    assert(undo(candidateLf, file) === base && rawUndone.replace(/\r\n/g, '\n') === base, file + ': actual candidate to immutable base is exact after Git newline normalization')
    assert(undo(base, file) === base, file + ': base without the task marker is unchanged')
    assert(undo(candidateLf.replace(/\n/g, '\r\n'), file) === base.replace(/\n/g, '\r\n'), file + ': CRLF roundtrip is exact')
    assert(undo(outsideCandidate, file) === outsideBase, file + ': one-character mutation outside all hunks is preserved')
    assert(undo(candidate, file.replace(/\//g, '\\')) === rawUndone, file + ': Windows path resolves the same exact source')
    for (const [index, hunk] of changes.entries()) {
      const after = intervals[index].after
      const at = candidate.indexOf(after)
      assert(at >= 0 && candidate.indexOf(after, at + 1) < 0, file + ': candidate hunk ' + (index + 1) + ' exists exactly once')
      let offset = after.indexOf(MARK)
      if (offset < 0) offset = Math.floor(after.length / 2)
      const character = after[offset] === 'X' ? 'Y' : 'X'
      const inside = candidate.slice(0, at + offset) + character + candidate.slice(at + offset + 1)
      // A single-hunk file can lose its only task marker when the hunk is removed/mutated.
      // Keep an external marker in that malformed fixture: genuinely unmarked base is intentionally a no-op.
      const marked = (source) => source.includes(MARK) ? source : source + eol + '# ' + MARK + eol
      rejects(() => undo(marked(inside), file), file + ': one-character mutation inside hunk ' + (index + 1) + ' must throw')
      const missing = candidate.slice(0, at) + candidate.slice(at + after.length)
      rejects(() => undo(marked(missing), file), file + ': missing hunk ' + (index + 1) + ' must throw')
      rejects(() => undo(candidate + eol + after, file), file + ': duplicate hunk ' + (index + 1) + ' must throw')
    }
    console.log('PASS ' + file + ': exact roundtrip, base/CRLF/Windows, outside mutation preserved; ' + changes.length + ' hunks mutation/missing/duplicate rejected')
  }
  if (passed !== 725) throw new Error('Proof changed scope: expected 725 checks, found ' + passed)
  console.log('KINEO-ROTEIRO-CURTO-UNDO-2210: ' + passed + ' passed, 0 failed.')
} catch (e) {
  console.error('FAIL ' + e.message)
  console.log('KINEO-ROTEIRO-CURTO-UNDO-2210: ' + passed + ' passed before failure.')
  process.exitCode = 1
}
