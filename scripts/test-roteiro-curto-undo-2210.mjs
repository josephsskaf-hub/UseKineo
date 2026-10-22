// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — reproducible proof of the exact legacy-only in-memory adapter.
// Reads the actual four candidate files and adapter with readFileSync; git show supplies the immutable base.
// No disk mutation, network, SDK, environment files, engineWall or homeVideoCuration are read.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const argument = process.argv.find((arg) => arg.startsWith('--root='))?.slice('--root='.length)
const ROOT = path.resolve(argument || process.env.TEST_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const BASE = '72d23210c'
const HELPER = 'scripts/test-support/desfaz-roteiro-curto-2210.mjs'
const MARK = 'KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22'
const SCOPE = { 'app/(dashboard)/generate/GenerateClient.tsx': 34, 'app/(dashboard)/studio/StudioClient.tsx': 9, 'components/ChatGptWelcomeBanner.tsx': 6, 'app/api/admin/live/route.ts': 8 }
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
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
  const context = vm.createContext({ fetch: unavailable, require: unavailable, setTimeout: unavailable })
  const helper = read(HELPER)
  vm.runInContext(helper.replace(/^export\s+/gm, '') + '\nglobalThis.proof = { undo: semRoteiroCurto2210, hunks: HUNKS }', context, { timeout: 3000, filename: HELPER })
  const { undo, hunks } = context.proof
  const actualScope = Object.fromEntries(Object.entries(hunks).map(([file, changes]) => [file, changes.length]))
  assert(JSON.stringify(actualScope) === JSON.stringify(SCOPE) && undo('unrelated ' + MARK, 'unrelated.ts') === 'unrelated ' + MARK,
    'Adapter scope must be exactly the four task sources/57 hunks; unrelated sources must survive')

  for (const [file, changes] of Object.entries(hunks)) {
    const candidate = read(file)
    const base = execFileSync('git', ['show', BASE + ':' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true })
    const eol = candidate.includes('\r\n') ? '\r\n' : '\n'
    const expectedBase = eol === '\r\n' ? base.replace(/\n/g, '\r\n') : base
    const candidateLf = candidate.replace(/\r\n/g, '\n')
    assert(undo(candidate, file) === expectedBase, file + ': actual candidate to immutable base is byte-exact for its newline convention')
    assert(undo(base, file) === base, file + ': base without the task marker is unchanged')
    assert(undo(candidateLf.replace(/\n/g, '\r\n'), file) === base.replace(/\n/g, '\r\n'), file + ': CRLF roundtrip is exact')
    assert(undo('!' + candidate.slice(1), file) === '!' + expectedBase.slice(1), file + ': one-character mutation outside all hunks is preserved')
    assert(undo(candidate, file.replace(/\//g, '\\')) === expectedBase, file + ': Windows path resolves the same exact source')
    for (const [index, hunk] of changes.entries()) {
      const after = eol === '\r\n' ? hunk.after.replace(/\n/g, '\r\n') : hunk.after
      const at = candidate.indexOf(after)
      assert(at >= 0 && candidate.indexOf(after, at + 1) < 0, file + ': candidate hunk ' + (index + 1) + ' exists exactly once')
      let offset = after.indexOf(MARK)
      if (offset < 0) offset = Math.floor(after.length / 2)
      const character = after[offset] === 'X' ? 'Y' : 'X'
      const inside = candidate.slice(0, at + offset) + character + candidate.slice(at + offset + 1)
      rejects(() => undo(inside, file), file + ': one-character mutation inside hunk ' + (index + 1) + ' must throw')
      const missing = candidate.slice(0, at) + candidate.slice(at + after.length)
      rejects(() => undo(missing, file), file + ': missing hunk ' + (index + 1) + ' must throw')
      rejects(() => undo(candidate + eol + after, file), file + ': duplicate hunk ' + (index + 1) + ' must throw')
    }
    console.log('PASS ' + file + ': exact roundtrip, base/CRLF/Windows, outside mutation preserved; ' + changes.length + ' hunks mutation/missing/duplicate rejected')
  }
  if (passed !== 249) throw new Error('Proof changed scope: expected 249 checks, found ' + passed)
  console.log('KINEO-ROTEIRO-CURTO-UNDO-2210: ' + passed + ' passed, 0 failed.')
} catch (e) {
  console.error('FAIL ' + e.message)
  console.log('KINEO-ROTEIRO-CURTO-UNDO-2210: ' + passed + ' passed before failure.')
  process.exitCode = 1
}
