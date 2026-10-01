import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file='lib/growth/mrrRevenueFollowthrough.ts',read=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n'),source=read(file)
function contract(text=source){
 const load=createOfflineLoader({source:(p,s)=>p===file?text:s}),m=load(file),pricing=load('lib/checkoutPricing.ts'),cost=load('lib/credits/engineCost.ts')
 for(const tier of ['starter','basic','pro'])for(const seconds of [15,35,60]){
  const v=m.mrrFilmCapacity(tier,'cinematic_ai',seconds),real=cost.creditCostForDuration('cinematic_ai',true,seconds)
  assert.equal(v.cost,real);assert.equal(v.films,Math.floor(pricing.TIER_CREDITS[tier]/real));assert.equal(v.price,pricing.formatCheckoutMoney('usd',pricing.getTierPrice(tier,'usd')))
 }
 assert.equal(m.mrrFilmCapacity('starter','cinematic_ai',NaN),null)
 const u=new URL(m.mrrShareHref(),'https://local');assert.equal(u.pathname,'/studio');assert.equal(u.searchParams.get('utm_source'),'share');assert.equal(u.searchParams.get('utm_campaign'),m.MRR_SHARE_VERSION)
 for(const key of ['create_intent','autoanalyze','prompt','studio'])assert.equal(u.searchParams.has(key),false)
 assert.equal(load('lib/acquisitionSource.ts').sanitizeAcquisitionUtmSource('share'),'share')
}
contract()
for(const [from,to]of[['Math.floor(TIER_CREDITS[tier] / cost)','999'],['getTierPrice(tier, \'usd\')','1'],['utm_source=share','utm_source=home'],['/studio?','/studio?autoanalyze=1&']]){assert.ok(source.includes(from));assert.throws(()=>contract(source.replace(from,to)))}
const pricing=read('components/growth/MrrPricingProof.tsx'),episode=read('components/growth/MrrEpisodeValue.tsx'),share=read('components/growth/MrrShareFooter.tsx'),generate=read('app/(dashboard)/generate/GenerateClient.tsx')
assert.ok(pricing.includes('/v/83db8b63-b654-491e-a0aa-86ce1bc1f3d7'))
assert.ok(pricing.includes('7 days of the first charge'))
assert.ok(pricing.includes('not an automatic refund of your subscription'))
assert.ok(pricing.includes('if (!MRR_PRICING_PROOF_ENABLED) return null'))
assert.ok(episode.includes('MRR_EPISODE_VALUE_ENABLED && eligible'))
assert.ok(episode.includes('return <>{children}</>'))
assert.ok(generate.includes("eligible={planFitFirstDelivery && commercialPlan === 'free' && Boolean(nextEpisode) && !thirdFilmDoor.visible}"))
assert.ok(generate.includes("startNextEpisode(showTrialRepeatEpisode ? { trialRepeat: true } : undefined)"),'existing next-episode handler preserved')
assert.ok(share.includes('if (!MRR_SHARE_ENABLED) return null'))
assert.ok(share.includes('supported countries'))
assert.ok(read('app/v/[id]/page.tsx').includes('<MrrShareFooter />'))
assert.ok(generate.includes("commercialPlan === 'free' && planTier === 'free' && hasPaid === false && <MrrShareFooter />"))
assert.ok(!/fetch\(|generate\(|create_intent/.test(pricing+episode+share),'display-only enhancements')
const hooks=read('lib/growth/useMrrVisible.ts')
function telemetry(text){assert.ok(text.includes('e.intersectionRatio >= 0.5'));assert.ok(text.includes('if (!enabled || acted.current) return'));assert.ok(text.includes('{ version }'));assert.ok(!text.includes('prompt:'))}
telemetry(hooks)
for(const [from,to]of[['e.intersectionRatio >= 0.5','true'],['if (!enabled || acted.current) return','if (!enabled) return']])assert.throws(()=>telemetry(hooks.replace(from,to)))
console.log('MRR follow-through: canonical films/prices, existing actions, share attribution, privacy, flags and 6 killed mutants PASS')
