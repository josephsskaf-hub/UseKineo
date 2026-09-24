import { source, moduleAt, checks } from './gpt-5h-test-support.mjs'
// Explicit public-offer fixture, not production env or credentials.
process.env.KINEO_REVERSE_TRIAL_ENABLED = 'true'
const { check, finish } = checks()
const { getKineoFacts, FREE_TIER, TRIAL_ACCESS, RECURRING_FREE_ACCESS, START_HERE_FACT, ENGINE_FACTS } = await moduleAt('lib/kineoFacts.ts')
const { getFreeTierOffer } = await moduleAt('lib/freeTierOffer.ts')
const { buildRecurringFreeAccessFact } = await moduleAt('lib/growth/trialAccessFacts.ts')
const { estimateHandoff, HANDOFF_ENGINES, engineFamily } = await moduleAt('lib/gptHandoff.ts')
const schema = JSON.parse(source('public/gpt/openapi.json'))
const props = schema.components.schemas.HandoffRequest.properties
let allowance = FREE_TIER.allowance
if (process.argv.includes('--mutant')) allowance = '10 free credits on signup with every engine unlocked'
check('trial copy separates balance from access in same statement', allowance.includes('not every unlocked engine') && allowance.includes('Kineo 1') && allowance.includes('watermark'))
check('access entitlement preserved rather than falsely disabling engines', TRIAL_ACCESS.everyEngineUnlocked === true)
check('current balance covers only Kineo 1 reference films', TRIAL_ACCESS.engineCoverage.filter(e=>e.wholeReferenceVideosCovered>0).map(e=>e.engine).join(',') === 'Kineo 1')
check('recurring limit derives from live offer and reaches facts payload', RECURRING_FREE_ACCESS.maxSeconds === getFreeTierOffer().maxFreeFastSeconds && getKineoFacts().recurringFreeAccess.maxSeconds === 15)
check('legacy helper caller explicitly exposes unknown/no cap as null', buildRecurringFreeAccessFact({engine:'Kineo 1',videosPerWindow:1,rollingWindowHours:168}).maxSeconds===null)
let invalidCapRejected=false
try { buildRecurringFreeAccessFact({engine:'Kineo 1',videosPerWindow:1,rollingWindowHours:168,maxSeconds:NaN}) } catch { invalidCapRejected=true }
check('invalid recurring duration is rejected',invalidCapRejected)
check('not-a-fit copy includes recurring cap and balance distinction', getKineoFacts().notAFit.some(f=>f.useInstead.includes('up to 15 seconds') && f.useInstead.includes('not every unlocked engine')))
check('start route explains new grant and preserves existing account balances', START_HERE_FACT.action.includes('not Seedance') && START_HERE_FACT.action.includes('Existing accounts'))
check('paused Omni is not advertised with ranking badge', ENGINE_FACTS.find(e=>e.name==='Omni Flash').what.includes('PAUSED') && !ENGINE_FACTS.find(e=>e.name==='Omni Flash').what.includes('#1'))
const llms=source('app/llms.txt/route.ts')
check('llms includes source-derived recurring seconds and no stale Omni badge', llms.includes('RECURRING_FREE_ACCESS.maxSeconds') && !llms.includes('#1-ranked'))
const costCopy=schema.paths['/api/gpt/handoff'].post.responses['200'].description+' '+props.durationSec.description
check('schema stops promising Starter covers every engine', !costCopy.includes('Starter, US$') && costCopy.includes('enough credits') && costCopy.includes('getKineoFacts'))
check('schema preserves legacy engine id without recommending paused Omni', props.engineHint.enum.includes('omni') && props.engineHint.description.includes('temporarily paused'))
for(const [family,budget] of [['classic',[[35,105,115],[60,180,195],[90,270,290]]],['hollywood',[[35,80,90],[60,150,165],[90,205,230]]]]) {
 for(const [seconds,lo,hi] of budget) {
  check(`${family} ${seconds}s schema budget present`, new RegExp(`${lo}-${hi}(?: words)? for ${seconds}s`).test(props.script.description))
  for(const engine of HANDOFF_ENGINES.filter(e=>engineFamily(e)===family)) {
   const words=n=>Array.from({length:n},(_,i)=>`word${i}`).join(' ')
   check(`${engine} ${seconds}s budget accepted by real estimator`, estimateHandoff(words(lo),seconds,engine).fit!=='short' && estimateHandoff(words(hi),seconds,engine).fit!=='long')
  }
 }
}
const ops=Object.values(schema.paths).flatMap(p=>Object.values(p)).map(o=>o.operationId).sort()
check('only approved handoff POST and facts GET exist', JSON.stringify(ops)===JSON.stringify(['createKineoHandoff','getKineoFacts']) && schema.paths['/api/facts'].get.operationId==='getKineoFacts')
finish()
