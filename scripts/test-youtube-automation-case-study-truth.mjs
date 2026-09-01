import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/youtube-automation-case-study/page.tsx', import.meta.url), 'utf8')
const normalized = source.replace(/\s+/g, ' ')

const checks = [
  ['headline states the failed outcome', source.includes('Our first public Autopilot test did not publish a video.')],
  ['metadata title carries the ledger result', source.includes('Our Public YouTube Autopilot Experiment: 4 Runs, 0 Posts')],
  ['schema modification date is current', source.includes("dateModified: '2026-09-01'")],
  ['public verification date is explicit', source.includes("lastVerified: 'September 1, 2026'")],
  ['baseline subscribers remain dated', source.includes("baselineSubs: '12,641'")],
  ['baseline videos remain dated', source.includes('baselineVideos: 155')],
  ['public subscriber snapshot is explicit', source.includes("publicSubs: '12.5K'")],
  ['public video snapshot is explicit', source.includes('publicVideos: 170')],
  ['scheduled run count is explicit', source.includes('scheduledRuns: 4')],
  ['published run count is zero', source.includes('publishedRuns: 0')],
  ['failed run count is explicit', source.includes('failedRuns: 1')],
  ['skipped run count is explicit', source.includes('skippedRuns: 3')],
  ['session unavailable is explained', source.includes('Session unavailable') && source.includes('could not use an authenticated YouTube')],
  ['public upload increase is not attributed to Kineo', source.includes('does not attribute those')],
  ['daily publishing is explicitly unproven', normalized.includes('does not prove daily publishing')],
  ['success gate is explicit', source.includes('at least six of seven')],
  ['pilot disclosure remains visible', source.includes('this public test is not proof of')],
  ['pilot CTA uses existing canonical pricing destination', source.includes('/pricing?intent_campaign=autopilot_case_study_v1#autopilot')],
  ['agency pack bridge uses existing destination', source.includes('/ai-shorts-for-agencies')],
  ['old weekly-success promise is gone', !source.includes('Live experiment · updated weekly')],
  ['old same-product success claim is gone', !source.includes('Same product you get.')],
  ['old automatic cadence claim is gone', !source.includes('1 Short per day, published automatically')],
]

for (const [name, condition] of checks) {
  assert.equal(condition, true, name)
  console.log(`✓ ${name}`)
}

console.log(`\n${checks.length}/${checks.length} case-study truth checks passed`)
