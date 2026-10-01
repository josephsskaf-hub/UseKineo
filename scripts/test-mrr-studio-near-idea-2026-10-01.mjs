import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const file = 'lib/growth/mrrStudio.ts'
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const source = read(file)
function policy(text = source) {
  return createOfflineLoader({ source: (p, raw) => p === file ? text : raw })(file)
}
function contract(module) {
  const base = { prompt: 'The ocean froze for one night', cost: 17, balance: 20, overLimit: false, bareStarter: false }
  const decide = (p = {}) => module.nearIdeaAction({ ...base, ...p })
  assert.equal(decide().label, 'Generate · 17 cr →') // includes a surcharge passed by Studio
  assert.equal(decide().disabled, false)
  for (const patch of [{prompt:' '}, {bareStarter:true}, {overLimit:true}, {balance:null}, {balance:NaN}, {cost:NaN}, {cost:0}, {balance:16}]) {
    assert.equal(decide(patch).disabled, true, JSON.stringify(patch))
  }
  assert.equal(decide({cost:7,balance:7}).label, 'Generate · 7 cr →')
  assert.equal(decide({cost:7,balance:7}).disabled, false)
}
contract(policy())
for (const [from, to] of [
  ['f.cost > f.balance', 'false'],
  ['!f.prompt.trim() || f.bareStarter', 'false'],
  ['if (f.overLimit)', 'if (false)'],
  ['${f.cost} cr', '1 cr'],
]) {
  assert.ok(source.includes(from), 'mutation target exists')
  assert.throws(() => contract(policy(source.replace(from, to))), 'mutant must fail: '+from)
}
function integration(s) {
  const textarea=s.indexOf('<textarea className="studio-prompt"')
  const action=s.indexOf('<StudioNearIdeaAction')
  const modes=s.indexOf('className={`pill${scriptMode',textarea)
  assert.ok(textarea>0 && action>textarea && action<modes, 'CTA immediately follows idea')
  assert.ok(s.includes("MRR_NEAR_IDEA_ENABLED && scriptMode !== 'clip'"), 'switch and clip isolation')
  assert.ok(s.includes('prompt={prompt} cost={cost} balance={balance} overLimit={limit.over}'), 'uses live final cost and guards')
  assert.ok(s.includes("onGenerate={() => { recordMrr('mrr_generate_clicked'); generate() }}"), 'same guarded generation handler')
  assert.ok(s.includes("if (e.currentTarget.value.trim()) recordMrr('mrr_idea_entered')"), 'only explicit typing/paste records idea')
  assert.ok(s.includes('<div id="studio-generation-review"'), 'original review remains')
}
const studio=read('app/(dashboard)/studio/StudioClient.tsx')
integration(studio)
for (const [from,to] of [['cost={cost}','cost={7}'],["MRR_NEAR_IDEA_ENABLED && scriptMode !== 'clip'","true"],["generate() }} />","newPaidRender() }} />"]]) {
  assert.ok(studio.includes(from))
  assert.throws(()=>integration(studio.replace(from,to)))
}
const component=read('components/StudioNearIdeaAction.tsx')
assert.ok(component.includes('if (!action.disabled) props.onGenerate()'))
assert.ok(!/fetch\(|useEffect|router\.push/.test(component), 'no hidden start or new API')
const events=[]
const hook=createOfflineLoader({mocks:{
  react:{useRef:x=>({current:x}),useCallback:fn=>fn,useEffect:fn=>fn()},
  '@/lib/analytics':{trackEvent:async(name,metadata)=>{events.push({name,metadata});return true}},
}})('lib/growth/useMrrStudioFunnel.ts').useMrrStudioFunnel()
hook('mrr_idea_entered'); hook('mrr_idea_entered'); hook('mrr_generate_clicked'); hook('mrr_generate_clicked')
assert.deepEqual(events.map(e=>e.name),['mrr_studio_viewed','mrr_idea_entered','mrr_generate_clicked'])
for(const e of events) {
  assert.equal(e.metadata.version,'mrr_studio_20261001_v1')
  assert.deepEqual(Object.keys(e.metadata).sort(),['surface','variant','version'])
}
console.log('MRR Studio: policy, boundary states, wiring, private event payloads and 7 killed mutants PASS')
