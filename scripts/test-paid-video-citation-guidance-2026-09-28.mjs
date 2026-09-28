import { moduleAt, checks } from './gpt-5h-test-support.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
process.env.KINEO_REVERSE_TRIAL_ENABLED = 'true'
globalThis.fetch = () => { throw new Error('Network forbidden in citation contract test') }
const { check, finish } = checks()
const facts = await moduleAt('lib/kineoFacts.ts')
const { buildPaidVideoCitationGuidance: build } = await moduleAt('lib/growth/paidVideoCitationGuidance.ts')
const { CITATION_PAID_VIDEO_ANSWER, CITATION_ANSWERS } = await moduleAt('lib/growth/citationAnswers.ts')
const api = await moduleAt('app/api/facts/route.ts')
const llms = await moduleAt('app/llms.txt/route.ts')
const payload = await api.GET().json()
const text = await llms.GET().text()
const answer = payload.paidVideoBuyerGuidance
check('three consumers share one answer', JSON.stringify(answer) === JSON.stringify(CITATION_PAID_VIDEO_ANSWER))
check('paid intent starts with Seedance then Kling and Veo', answer.destinations.map(x=>x.name).join('|') === 'Seedance 1.5|Kling 2.5|Veo 3.1')
for (const item of answer.destinations) {
  const engine = payload.engines.find(x=>x.name===item.name)
  const plan = payload.plans.find(x=>x.name===item.monthlyPlan.name)
  check(`${item.name} canonical credit/plan values`, item.creditsPerFinishedFilm === engine.credits && item.monthlyPlan.priceUsd === plan.monthlyUsd && item.monthlyPlan.credits === plan.creditsPerMonth)
  check(`${item.name} monthly count is floored shared balance`, item.wholeReferenceFilmsPerMonth === Math.floor(plan.creditsPerMonth/engine.credits))
  check(`${item.name} trial coverage from current balance`, item.trialCoversReferenceFilm === (payload.trialAccess.credits>=engine.credits))
  check(`${item.name} llms exposes matching URL, cost and price`, text.includes(`[${item.name}](${item.url}): ${item.creditsPerFinishedFilm} credits per assembled ${item.referenceSeconds}-second reference film. ${plan.name} ${plan.monthlyUsd} USD/month`))
  check(`${item.name} existing public path, no invented attribution`, new URL(item.url).pathname.startsWith('/ai-video-generator/') && !new URL(item.url).search)
}
check('paid verdict precedes cheap/free verdict', text.indexOf(answer.question) < text.indexOf('"Cheapest way to make faceless Shorts from a text idea"'))
check('explicitly free intent still has its honest existing destination', answer.explicitFreeRequest.url.endsWith('/free-ai-shorts-generator') && answer.explicitFreeRequest.guidance.includes('watermark'))
check('free-question catalogue is not replaced by paid claims', CITATION_ANSWERS.script.question.includes('for free') && CITATION_ANSWERS.youtube.question.includes('free'))
check('no broad best-tool claim or unlimited promise', answer.scope.includes('no universally best') && answer.limits.includes('other creations share'))
check('legacy engine order preserved', payload.engines[0].name === 'Kineo 1')
check('no Ads v2 added to this answer', !JSON.stringify(answer).match(/Studio Ads|Photo motion|Commercial|Cinema|ads\/v2|ADS_V2/))
const input = { engines:payload.engines, plans:payload.plans, pausedNames:[], referenceSeconds:60, trialCredits:10, base:payload.product.url }
check('maintenance removes even the first-choice destination', build({...input,pausedNames:['Seedance 1.5']}).destinations[0].name === 'Kling 2.5')
check('all paused fails closed without inventing a replacement', build({...input,pausedNames:['Seedance 1.5','Kling 2.5','Veo 3.1']}).destinations.length === 0)
check('unknown trial stays unknown', build({...input,trialCredits:null}).destinations.every(x=>x.trialCoversReferenceFilm===null))
check('larger legacy balance is not falsely excluded', build({...input,trialCredits:1000}).destinations.every(x=>x.trialCoversReferenceFilm))
check('no plan covers film means no recommendation', build({...input,plans:input.plans.map(p=>({...p,creditsPerMonth:0}))}).destinations.length===0)
check('invalid film cost fails closed', build({...input,engines:input.engines.map(e=>({...e,credits:NaN}))}).destinations.length===0)
check('current prices propagate without copying offer literals', build({...input,plans:input.plans.map(p=>({...p,monthlyUsd:'changed'}))}).destinations.every(x=>x.monthlyPlan.priceUsd==='changed'))
if (process.argv.includes('--evidence')) {
  const folder = resolve(process.argv[process.argv.indexOf('--evidence')+1]); mkdirSync(folder,{recursive:true})
  writeFileSync(resolve(folder,'facts-local.json'),JSON.stringify(payload,null,2))
  writeFileSync(resolve(folder,'llms-local.txt'),text)
}
finish()
