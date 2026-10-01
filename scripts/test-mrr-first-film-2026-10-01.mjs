import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file='lib/growth/mrrFirstFilm.ts'
const read=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const source=read(file)
function contract(text=source) {
  const load=createOfflineLoader({source:(p,s)=>p===file?text:s})
  const m=load(file)
  const facts={historyEmpty:true,trialActive:true,hasPaid:false,shortFilmAllowed:true,balance:10}
  const offer=m.firstFilmOffer(facts)
  assert.equal(offer.seconds,15)
  assert.equal(offer.cost,load('lib/credits/engineCost.ts').creditCostForDuration('cinematic_ai',true,15))
  assert.ok(offer.cost<=10 && offer.cost>0)
  for(const patch of [{historyEmpty:false},{trialActive:null},{trialActive:false},{hasPaid:true},{hasPaid:null},{shortFilmAllowed:false},{balance:null},{balance:NaN},{balance:offer.cost-1}])
    assert.equal(m.firstFilmOffer({...facts,...patch}),null,JSON.stringify(patch))
  assert.ok(m.firstFilmOffer({...facts,balance:offer.cost}))
  const url=new URL(m.firstFilmGenerateHref(),'https://example.test')
  assert.equal(url.pathname,'/studio/create')
  assert.equal(url.searchParams.get('engine'),'seedance')
  assert.equal(url.searchParams.get('duration'),'15')
  assert.equal(url.searchParams.get('create_intent'),'trial_best')
  assert.equal(url.searchParams.get('intent_campaign'),m.MRR_FIRST_FILM_VERSION)
  for(const key of ['autoanalyze','studio','studio_handoff_token']) assert.equal(url.searchParams.has(key),false)
  assert.ok(url.searchParams.get('prompt').includes('fictional'))
  const handoff=load('lib/creationHandoff.ts').resolveActivationCreationContract(url.searchParams)
  assert.equal(handoff.duration,15)
  assert.equal(handoff.createIntent,'trial_best')
  const resolve=load('lib/growth/trialActivationIntent.ts').resolveActivationRender
  const input={createIntent:'trial_best',trialActive:true,hasPaid:false,credits:10,requestedDuration:15,scriptMode:'ai',seedanceCostAt:n=>load('lib/credits/engineCost.ts').creditCostForDuration('cinematic_ai',true,n),entrada15:true,shortSeconds:15,promptFitsShort:true,kineo1:false}
  assert.equal(resolve(input).engine,'seedance')
  assert.equal(resolve(input).duration,15)
  assert.equal(resolve({...input,credits:0}).engine,'none')
}
contract()
for(const [from,to] of [
  ['!f.historyEmpty','false'],['f.trialActive !== true','false'],['f.hasPaid !== false','false'],
  ['!f.shortFilmAllowed','false'],['f.balance < cost','false'],["create_intent: 'trial_best'","create_intent: 'fast'"],
]) {assert.ok(source.includes(from));assert.throws(()=>contract(source.replace(from,to)),from)}
function wiring(component,studio) {
  assert.ok(component.includes('if (!MRR_FIRST_FILM_ENABLED || !offer) return null'))
  assert.ok(component.includes('committed.current || !firstFilmOffer(facts)'))
  const click=component.indexOf('onClick={() => {')
  assert.ok(click>0 && component.indexOf('router.push(')>click)
  assert.equal((component.match(/router\.push\(/g)||[]).length,1)
  assert.ok(component.includes('intersectionRatio >= 0.5'))
  assert.ok(component.includes("trackEvent('mrr_first_film_committed'"))
  assert.ok(!/fetch\(|localStorage|sessionStorage/.test(component))
  assert.ok(studio.includes('d?.historyReliable === true && d?.completedCount === 0'))
  assert.ok(studio.includes("!prompt.trim() && scriptMode !== 'clip'"))
  assert.ok(studio.includes('trialActive={trialOn} hasPaid={contaPaga} shortFilmAllowed={entrada15} balance={balance}'))
}
const c=read('components/MrrFirstFilm.tsx'),s=read('app/(dashboard)/studio/StudioClient.tsx')
wiring(c,s)
for(const [from,to] of [['committed.current || !firstFilmOffer(facts)','false'],['!MRR_FIRST_FILM_ENABLED || !offer','!offer']])
  assert.throws(()=>wiring(c.replaceAll(from,to),s))
assert.throws(()=>wiring(c,s.replace('d?.historyReliable === true && d?.completedCount === 0','true')))
console.log('MRR first film: eligibility, canonical cost, explicit single intent, reliable history, visible impression; 9 mutants killed PASS')



