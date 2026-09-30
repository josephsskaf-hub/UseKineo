// Actual page/metadata/FAQ rendered offline; no paid generation, credentials or events.
import assert from 'node:assert/strict'
import {React,offlineModules,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const boundary=()=>({__esModule:true,default:()=>null})
const mocks=Object.fromEntries(['components/Footer.tsx','components/AgencyVolumeBridge.tsx','components/StickyFreeShortCTA.tsx','components/WallMedia.tsx','components/ExitIntentOffer.tsx','components/AffiliateLandingContext.tsx','app/examples/ExampleVideoPlayer.tsx','app/examples/ExampleLiveMedia.tsx','app/youtube-shorts-from-topic/TopicGeneratorForm.tsx','app/text-to-video-shorts/TextToVideoIntentForm.tsx'].map(p=>[p,boundary()]))
mocks['lib/analytics.ts']={trackEvent:()=>{throw Error('No analytics in offline render')}}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...props})=>React.createElement('a',props,children)}
const canonical=offlineModules()('lib/freeTierOffer.ts')
let count=0
for(const enabled of [false,true]){
const offer=canonical.buildFreeTierOffer(enabled)
const load=offlineModules({mocks:{...mocks,'lib/freeTierOffer.ts':{...canonical,getFreeTierOffer:()=>offer}}})
for(const route of ['free-ai-shorts-generator','text-to-video-shorts']){
  const file=`app/${route}/page.tsx`,page=load(file),html=renderToStaticMarkup(React.createElement(page.default,{searchParams:{}}))
  assert.ok(page.metadata.description.includes(offer.copy.planLimitLine));count++
  assert.ok(!/Fast free|free Fast|Fast test/.test(page.metadata.description));count++
  assert.ok(!/free Fast test/.test(page.metadata.twitter.description));count++
  const headline=renderToStaticMarkup(React.createElement('span',null,offer.copy.headline)).replace(/^<span>|<\/span>$/g,'')
  assert.ok(html.includes(`<p style="color:#86868b;margin:8px 0 18px">${headline}</p>`));count++
  assert.equal(page.metadata.alternates.canonical,`https://www.usekineo.com/${route}`);count++
  const faq=JSON.parse([...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('FAQPage')))
  assert.ok(faq.mainEntity.every(q=>html.includes(q.name)&&html.includes(q.acceptedAnswer.text.replace(/&/g,'&amp;'))));count++
  if(route==='free-ai-shorts-generator'){
    const answer=faq.mainEntity.find(q=>q.name==='What happens after the free videos?').acceptedAnswer.text
    assert.ok(answer.includes(offer.copy.sentence)&&answer.includes('before making your first film'));count++
    assert.ok(!answer.includes('free daily limit'));count++
    const badSource=source(file).replace('`${OFFER.copy.sentence} For recurring production, compare the monthly plans and the credits required by your chosen engine and duration. You can choose a plan before making your first film.`',"'You can keep testing with watermarked Fast videos within the free daily limit.'")
    const mutated=offlineModules({mocks:{...mocks,'lib/freeTierOffer.ts':{...canonical,getFreeTierOffer:()=>offer}},replacements:{[file]:badSource}})(file)
    const badHtml=renderToStaticMarkup(React.createElement(mutated.default,{searchParams:{}}))
    const badFaq=JSON.parse([...badHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('FAQPage')))
    assert.ok(!badFaq.mainEntity.find(q=>q.name==='What happens after the free videos?').acceptedAnswer.text.includes(offer.copy.sentence));count++
  }
  assert.ok(html.includes('data-bridge="bridge_paid_proof_v2"')&&html.includes('trying a film first is optional'));count++
  assert.ok(!html.includes('utm_source=chatgpt'));count++
}
}
// Canonical country condition must be present when policy restricts the trial; future policy changes must not turn it universal.
const countryClause=' in eligible fixture countries'
const fixture=offlineModules({mocks:{...mocks,'lib/freeTierOffer.ts':{...canonical,GRANT_COUNTRY_CLAUSE:countryClause}}})
const bridge=renderToStaticMarkup(React.createElement(fixture('components/PaidSeedanceBridge.tsx').default,{from:'citation_test'}))
assert.ok(bridge.includes(`New accounts${countryClause} can try one`));count++
console.log(`PASS ${count} entry truth checks; real SSR, FAQ, canonical metadata and restricted-country fixture; no events/network/payment`)
