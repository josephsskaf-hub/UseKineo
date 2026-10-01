import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file='lib/growth/mrrShowcase.ts'
const read=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const source=read(file)
function load(text=source,credits=100,price=1290) {
  return createOfflineLoader({source:(p,raw)=>p===file?text:raw,mocks:{
    '@/lib/checkoutPricing':{TIER_CREDITS:{starter:credits},getTierPrice:()=>price},
    '@/lib/credits/engineCost':{creditCostForDuration:(engine,paid,seconds)=>{
      assert.equal(engine,'cinematic_ai');assert.equal(paid,true);return {15:7,35:15,60:30}[seconds]
    }},
  }})(file)
}
function contract(m) {
  assert.equal(m.showcasePlanValue('starter',35).films,6,'whole films round down')
  assert.equal(m.showcasePlanValue('starter',35).monthlyPriceMinor,1290)
}
contract(load())
assert.equal(load(source,60,2300).showcasePlanValue('starter',35).films,4)
assert.equal(load(source,60,2300).showcasePlanValue('starter',35).monthlyPriceMinor,2300,'pricing source stays live')
for(const [from,to] of [['Math.floor(credits / cost)','Math.ceil(credits / cost)'],["getTierPrice(tier, 'usd')",'0']]) {
  assert.ok(source.includes(from));assert.throws(()=>contract(load(source.replace(from,to))))
}
const page=read('app/showcase/page.tsx'), experience=read('app/showcase/ShowcaseExperience.tsx'), door=read('components/MrrShowcaseLink.tsx')
function surfaces(p,e,d) {
  assert.ok(p.includes('<ShowcaseClient><ShowcaseExperience /></ShowcaseClient>'), 'preserve queued public showcase')
  assert.ok(e.includes('if (!MRR_SHOWCASE_ENABLED) return null'), 'own switch removes only value block')
  assert.ok(!e.includes('<ExamplesGallery'), 'do not duplicate queued portfolio')
  assert.ok(read('app/showcase/ShowcaseClient.tsx').includes("section === 'films' && children"), 'value follows actual film proof')
  assert.ok(e.includes('IntersectionObserver') && e.includes('observer.observe(panel.current)'), 'measure exposed value panel')
  assert.ok(e.includes('rememberSignupCampaign(MRR_SHOWCASE_VERSION)') && !e.includes('utm_source='), 'preserve original acquisition source')
  assert.ok(e.includes("trackEvent('mrr_showcase_viewed'") && e.includes("trackEvent('mrr_showcase_first_gesture'"))
  assert.ok(e.includes('version: MRR_SHOWCASE_VERSION'))
  assert.ok(e.includes('Standard monthly price.'))
  assert.ok(d.includes('if (!MRR_SHOWCASE_ENABLED) return null'))
  assert.ok(d.includes('IntersectionObserver') && d.includes("trackEvent('mrr_showcase_door_clicked'"))
  assert.ok(read('components/TrendingRow.tsx').includes('<MrrShowcaseLink />'))
}
surfaces(page,experience,door)
assert.throws(()=>surfaces(page,experience.replace('if (!MRR_SHOWCASE_ENABLED) return null',''),door))
assert.throws(()=>surfaces(page.replace('<ShowcaseClient><ShowcaseExperience /></ShowcaseClient>','<ShowcaseExperience />'),experience,door))
assert.throws(()=>surfaces(page,experience.replace('observer.observe(panel.current)',''),door))
assert.throws(()=>surfaces(page,experience.replace("trackEvent('mrr_showcase_viewed'","trackEvent('wrong'"),door))
assert.ok(!/createClient|supabase|fetch\(/.test(page+experience+door),'no auth/data/provider requests added')
console.log('MRR Showcase: preserved queue/acquisition, visible impression, canonical film math, switches, events and 6 killed mutants PASS')
