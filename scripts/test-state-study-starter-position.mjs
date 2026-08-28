import fs from 'node:fs'

const source = fs.readFileSync('app/state-of-ai-shorts-2026/page.tsx', 'utf8')
let passed = 0

function check(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`)
  passed += 1
  console.log(`✓ ${label}`)
}

const findings = source.indexOf('>Key findings</h2>')
const starterRender = source.indexOf('{starterSection}')
const speedSection = source.indexOf('How long an AI Short actually takes')
const methodology = source.indexOf('>Methodology</h2>')

check(findings >= 0, 'key findings section still exists')
check(starterRender >= 0, 'starter section is rendered')
check(speedSection >= 0, 'render-speed section still exists')
check(methodology >= 0, 'methodology section still exists')
check(findings < starterRender, 'starter renders after key findings')
check(starterRender < speedSection, 'starter renders before the long study body')
check(starterRender < methodology, 'starter no longer waits until methodology')
check((source.match(/const starterSection =/g) ?? []).length === 1, 'one starter section definition')
check((source.match(/\{starterSection\}/g) ?? []).length === 1, 'one starter section render')
check((source.match(/formId="study-start-a-short"/g) ?? []).length === 1, 'one study starter form')
check((source.match(/campaign="starter_state_of_ai_shorts"/g) ?? []).length === 1, 'historical campaign preserved once')
check((source.match(/source="starter_state_of_ai_shorts"/g) ?? []).length === 1, 'historical source preserved once')
check(source.includes('placement="after_key_findings"'), 'new position is measurable')
check(source.includes('analyticsVariant="state_study_starter_after_findings_2026_08_28"'), 'position variant is allow-listed at caller')
check(source.includes('Turn this topic into a Short →'), 'activation CTA preserved')
check(source.includes('No card required for the free Fast workflow.'), 'free-workflow contract preserved')
check(source.includes('The animal with a survival trick science still cannot explain'), 'animal example preserved')
check(source.includes('The country almost nobody is allowed to enter'), 'geography example preserved')
check(source.includes('The empire that collapsed in a single generation'), 'history example preserved')
check(!source.includes('Pick one of the top-3 niches above'), 'removed false above-the-ranking direction')
check(source.includes('three leading niches in this study'), 'copy remains true in the new position')

console.log(`\n${passed}/21 state-study starter position checks passed`)
