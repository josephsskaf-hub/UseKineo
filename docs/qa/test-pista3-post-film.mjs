import assert from 'node:assert/strict'
import { render, sandbox, validProfile, film, filmId } from './pista3-fixtures.mjs'
let checks = 0
const ok = (value,label) => {assert.ok(value,label);checks++}
const eq = (a,b,label) => {assert.deepEqual(a,b,label);checks++}
const library = 'lib/growth/postFilmCreatorOffer.ts'
const component = 'components/PostFilmCreatorOffer.tsx'
const history = 'app/(dashboard)/history/HistoryClient.tsx'
const policy = sandbox().load(library)
const canonical = sandbox().load('lib/checkoutPricing.ts')
const expectedOfferValues = [
  canonical.formatCheckoutMoney('usd', canonical.CARD_TRIAL_ENTRY_FEE_MINOR),
  canonical.formatCheckoutMoney('usd', canonical.TIER_PRICES.basic.usd),
  String(canonical.CARD_TRIAL_GRANT_CREDITS), String(canonical.CARD_TRIAL_DAYS),
]
ok(policy.isPostFilmCreatorEligible(validProfile),'known never-paid free profile eligible')
for (const bad of [null,undefined,{}, {...validProfile,has_paid:null},{...validProfile,has_paid:true},{...validProfile,plan:null},{...validProfile,plan:'basic'},{...validProfile,plan:'autopilot'},{...validProfile,is_pro:true},{...validProfile,stripe_subscription_id:'sub_existing'},{...validProfile,paypal_subscription_id:'existing'}]) {
  eq(policy.isPostFilmCreatorEligible(bad),false,'unknown or paid profile hidden')
}
for (const key of Object.keys(validProfile)) { const p={...validProfile};delete p[key];eq(policy.isPostFilmCreatorEligible(p),false,'missing field fails closed '+key) }
// Version B separates first purchase from already-paid trial continuity.
// Exercise both server surfaces with real profile states; balances are not eligibility.
const audiences = [
  ['new card-required account', {...validProfile,trial_status:'card_required',credits:0}, true],
  ['historical never-paid free account', {...validProfile,trial_status:'active',credits:25}, true],
  ['paid Creator trial', {...validProfile,plan:'basic_trial',has_paid:true,stripe_subscription_id:'sub_trial'}, false],
  ['trial plan before other flags settle', {...validProfile,plan:'basic_trial'}, false],
  ['paid flag before plan settles', {...validProfile,has_paid:true}, false],
]
for (const [label,profile,expected] of audiences) {
  eq(policy.isPostFilmCreatorEligible(profile),expected,label+' eligibility')
  const page = await render('app/go/[token]/page.tsx',{profile},{params:{token:'a'.repeat(32)}})
  eq(page.html.includes('data-testid="pista3-creator-offer"'),expected,label+' handoff')
  const ownerPage = await sandbox({profile}).load('app/(dashboard)/history/page.tsx').default()
  eq(ownerPage.props.creatorTrialEligible,expected,label+' owned-film server')
}
for (const surface of ['history_film','gpt_handoff']) {
  const url = new URL(policy.postFilmCreatorCheckoutHref(surface),'https://example.invalid')
  eq(url.pathname,'/api/stripe/checkout','existing checkout')
  eq([...url.searchParams.keys()].sort(),['billing','intent_campaign','tier','trial'],'no rebuild or extra product')
  eq(url.searchParams.get('tier'),'basic','Creator product')
  eq(url.searchParams.get('billing'),'monthly','monthly billing')
  eq(url.searchParams.get('trial'),'1','existing card trial')
  ok(url.searchParams.get('intent_campaign').endsWith(surface),'surface carried to server')
}
for (const language of ['en','es','hi']) {
  const {html} = await render(component,{language},{surface:'history_film',eligible:true,videoId:filmId})
  for (const value of expectedOfferValues) ok(html.includes(value),'canonical offer in '+language+' '+value)
  ok(!html.includes('undefined'),'no missing copy')
  if(language==='hi')ok(/[\u0900-\u097f]/.test(html),'Hindi authored')
  const hidden = await render(component,{language},{surface:'history_film',eligible:false})
  eq(hidden.html,'','ineligible has no offer')
}
const mutation = await render(component,{transform:(file,text) => file === 'lib/checkoutPricing.ts' ? text.replace('CARD_TRIAL_ENTRY_FEE_MINOR = 100','CARD_TRIAL_ENTRY_FEE_MINOR = 137') : text},{surface:'history_film',eligible:true})
ok(mutation.html.includes('$1.37'),'actual JSX follows canonical fee mutation')
const ready = {videos:[film],snapshotTime:Date.parse('2026-09-08T03:00:00Z'),creatorTrialEligible:true}
const shown = await render(history,{fixture:{lightbox:filmId,cleanExportLocked:true}},ready)
ok(shown.html.includes('data-testid="pista3-creator-offer"'),'actual owner viewer mounts offer')
ok(shown.html.includes('Download with Kineo watermark'),'owned download preserved')
ok(shown.html.includes('Start Starter'),'monthly alternative retained')
for (const v of [{...film,status:'failed'},{...film,video_url:null}]) {
  const result = await render(history,{fixture:{lightbox:filmId}},{...ready,videos:[v]})
  ok(!result.html.includes('data-testid="pista3-creator-offer"'),'no offer without completed file')
}
const anonymous = await render('app/go/[token]/page.tsx',{signedIn:false},{params:{token:'a'.repeat(32)}})
ok(anonymous.html.includes('Make this video'),'script continuation path remains')
ok(anonymous.html.includes('first purchase on Kineo'),'public first purchase limit explicit')
ok(anonymous.html.includes('The Creator trial requires a payment method.'),'handoff explains card requirement')
ok(!/free to try|no card|try your script free/i.test(anonymous.html),'handoff does not promise removed free entry')
ok(anonymous.html.includes('Open this script in Studio'),'public offer continues the idea before purchase')
ok(!anonymous.html.includes('Try Creator for'),'public handoff has no isolated direct checkout CTA')
const handoffOffer = await render(component,{}, {surface:'gpt_handoff',eligible:true,handoffHref:'/api/gpt/handoff/go?token='+ 'a'.repeat(32)})
ok(handoffOffer.html.includes('/api/gpt/handoff/go?token='+'a'.repeat(32)),'offer preserves token through existing handoff route')
ok(!handoffOffer.html.includes('<button'),'handoff offer does not call checkout launcher')
eq((await render(component,{}, {surface:'gpt_handoff',eligible:true})).html,'','public offer fails closed without its script continuation')
for (const language of ['es','hi']) {
  const offer = await render(component,{language},{surface:'gpt_handoff',eligible:true,firstPurchaseOnly:true,handoffHref:'/api/gpt/handoff/go?token='+ 'a'.repeat(32)})
  ok(!/gratis|मुफ़्त/.test(offer.html),'translated offer does not promise free generation in '+language)
}
for (const options of [{profile:null},{profileError:true},{profile:{...validProfile,has_paid:true}},{bot:true}]) {
  const result = await render('app/go/[token]/page.tsx',options,{params:{token:'a'.repeat(32)}})
  ok(!result.html.includes('data-testid="pista3-creator-offer"'),'unknown/paid/bot handoff has no offer')
}
for(const p of [validProfile,null,{...validProfile,has_paid:true}]) {
  const s = sandbox({profile:p})
  const node = await s.load('app/(dashboard)/history/page.tsx').default()
  eq(node.props.creatorTrialEligible,p===validProfile,'server passes verified eligibility only')
  ok(s.reads.some(read=>read.table==='profiles'),'server actually reads profile')
}

// Exercise actual component's click and visibility effect, with virtual time.
let io, timer, delay, visibilityListener
const doc={visibilityState:'visible',addEventListener:(name,fn)=>{visibilityListener=fn},removeEventListener:()=>{}}
class Observer {constructor(fn){io=fn}observe(){}disconnect(){}}
const s=sandbox({globals:{window:{IntersectionObserver:Observer},IntersectionObserver:Observer,document:doc,setTimeout:(fn,ms)=>{timer=fn;delay=ms;return 1},clearTimeout:()=>{timer=null}}})
const node=s.load(component).default({surface:'history_film',eligible:true,videoId:filmId,error:'Synthetic redirect failure'})
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found}return null}
const button=find(node,n=>n.type==='button')
button.ref.current={}
const cleanup=s.effects[0]()
io([{isIntersecting:true,intersectionRatio:0.4}]);eq(timer,undefined,'less than half does not count')
io([{isIntersecting:true,intersectionRatio:0.5}]);eq(delay,1000,'one continuous second')
doc.visibilityState='hidden';visibilityListener();eq(timer,null,'hidden tab cancels dwell')
doc.visibilityState='visible';visibilityListener();timer()
eq(s.events.length,1,'one visible exposure')
io([{isIntersecting:true,intersectionRatio:1}]);eq(timer,null,'same mount not counted twice')
button.props.onClick();eq(s.launches.length,1,'actual CTA uses launcher')
eq(s.launches[0][1],policy.postFilmCreatorCheckoutHref('history_film'),'actual click keeps product and campaign')
ok(find(node,n=>n.props?.role==='alert'),'parent checkout failure visible next to offer')
cleanup()
const shared=[]
const sharedNode=s.load(component).default({surface:'history_film',eligible:true,onLaunch:(...args)=>shared.push(args)})
find(sharedNode,n=>n.type==='button').props.onClick();eq(shared.length,1,'owner uses shared launcher latch')
eq(s.launches.length,1,'does not launch through second hook')
console.log(`Pista 3 post-film: ${checks} checks passed. Offline; no network, database or payments.`)
