import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const repo = process.cwd()
const out = mkdtempSync(join(tmpdir(), 'kineo-script-timer-'))
const require = createRequire(import.meta.url)

try {
  const tsc = require.resolve('typescript/bin/tsc')

  execFileSync(process.execPath, [tsc,
    'lib/growth/shortsScriptTimer.ts',
    'lib/narrationFit.ts',
    'lib/scriptParser.ts',
    '--outDir', out,
    '--rootDir', 'lib',
    '--module', 'commonjs',
    '--target', 'ES2020',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
  ], { cwd: repo, stdio: 'pipe' })

  const { timeShortsScript, countScriptWords, SCRIPT_TIMER_TARGETS } = require(
    join(out, 'growth', 'shortsScriptTimer.js'),
  )

  let checks = 0
  const check = (condition, message) => {
    assert.ok(condition, message)
    checks += 1
  }

  check(JSON.stringify(SCRIPT_TIMER_TARGETS) === '[35,60]', 'public targets stay aligned with the page')
  check(countScriptWords('  one   two\nthree ') === 3, 'word count collapses whitespace')

  const empty = timeShortsScript('', 60)
  check(empty.status === 'empty', 'empty input has an explicit state')
  check(empty.spokenWords === 0 && empty.estimatedSeconds === 0, 'empty input has zero narration')

  const minimum60 = timeShortsScript(Array(132).fill('word').join(' '), 60)
  check(minimum60.minimumWords === 132, '60-second safe minimum derives to 132 words')
  check(minimum60.status === 'on_target', '132 spoken words clear the 95% production floor')
  check(minimum60.missingWords === 0, 'on-target script reports no missing words')

  const short60 = timeShortsScript(Array(131).fill('word').join(' '), 60)
  check(short60.status === 'short', '131 spoken words remain below the 60-second floor')
  check(short60.missingWords === 1, 'short script reports the exact one-word gap')

  const minimum35 = timeShortsScript(Array(77).fill('word').join(' '), 35)
  check(minimum35.minimumWords === 77, '35-second safe minimum derives to 77 words')
  check(minimum35.status === 'on_target', '77 spoken words clear the 35-second floor')

  const spoken = Array(77).fill('narration').join(' ')
  const structured = timeShortsScript(`HOOK\n[Pexels: storm over ocean]\n${spoken}\nPAYOFF`, 35)
  check(structured.spokenWords === 77, 'HOOK, PAYOFF and Pexels directions are not spoken')
  check(structured.rawWords > structured.spokenWords, 'ignored direction words are visible')
  check(structured.ignoredWords === structured.rawWords - structured.spokenWords, 'ignored count reconciles')

  const metadataOnly = timeShortsScript('HOOK\n[Pexels: storm over ocean]\nPAYOFF', 60)
  check(metadataOnly.status === 'no_narration', 'direction-only input cannot pretend to contain speech')

  const long = timeShortsScript(Array(200).fill('word').join(' '), 60)
  check(long.status === 'long', 'materially long narration has its own state')
  check(long.excessWords === 62, 'long state shows the gap from the 138-word target')

  check(minimum60.coverage >= 0.95, 'coverage uses the canonical production floor')
  check(Math.abs(minimum60.estimatedSeconds - 132 / 2.3) < 0.0001, 'duration uses canonical 2.3 words/second')

  console.log(`shorts-script-timer: ${checks}/${checks} checks passed`)
} finally {
  rmSync(out, { recursive: true, force: true })
}
