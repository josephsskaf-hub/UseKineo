// Offline only. No environment files, SDKs, network, credentials or paid renders.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { test } = require('node:test')

function load(name, mocks = {}, env = {}) {
  const filename = path.resolve(__dirname, '../lib', name + '.ts')
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {}, process: { env }, Date, AbortSignal,
    fetch: mocks.__fetch ?? (() => { throw Error('network forbidden') }),
    require: spec => {
      if (Object.hasOwn(mocks, spec)) return mocks[spec]
      if (spec === './kling4PaidPolicy' || spec === './kling4Promo') return load(spec.slice(2), mocks, env)
      throw Error('SDK/network/import forbidden: ' + spec)
    } }
  vm.runInNewContext(output, box, { filename })
  return box.exports
}
const policy = load('kling4PaidPolicy')
const display = load('kling4Promo')
const server = load('kling4PromoServer')
const now = Date.parse('2026-10-29T12:00:00.000Z')
const on = { paidLive: true, promoLive: true, launchAt: '2026-10-28T00:00:00.000Z' }
const userId = '00000000-0000-4000-8000-000000000001'
const subscription = { userId, provider: 'stripe', subscriptionId: 'sub_verified', plan: 'basic', status: 'active',
  startedAt: '2026-10-01T00:00:00.000Z', paidThrough: '2026-11-30T00:00:00.000Z', verifiedAt: new Date(now).toISOString() }
function fakeDb(dataByTable, rpc) {
  return { rpc: rpc ?? (() => { throw Error('unexpected rpc') }), from: table => {
    const result = dataByTable[table] ?? {data:null,error:null}
    const query = { select: () => query, eq: () => query, contains: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => result }
    return query
  } }
}

test('both switches are opt-in; malformed or absent launch is fail-closed', () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1']) {
    const p = policy.kling4PromoPolicy({KLING4_PAID_LIVE:value, KLING4_PROMO_LIVE:value})
    assert.equal(p.paidLive, false); assert.equal(p.promoLive, false)
  }
  assert.equal(policy.kling4PromoPolicy({KLING4_PAID_LIVE:'true',KLING4_PROMO_LIVE:'true'}).launchAt, null)
  for (const launch of [null, 'today', '2026-02-30T00:00:00Z', '2026-12-01T00:00:00Z']) {
    assert.equal(policy.kling4PromoPolicyReason({...on, launchAt:launch}, now), 'launch_unconfigured')
  }
  assert.equal(policy.kling4PromoPolicyReason({...on,paidLive:false},now),'paid_off')
  assert.equal(policy.kling4PromoPolicyReason({...on,promoLive:false},now),'promo_off')
  assert.equal(policy.kling4PromoPolicyReason(on, Date.parse('2026-10-27T23:59:59Z')),'not_launched')
})

test('current subscribers start at launch; new subscribers at subscription; 30 days and UTC signup cutoff are exact', () => {
  assert.equal(policy.kling4PromoWindow(subscription,on,now).expiresAt,'2026-11-27T00:00:00.000Z')
  const fresh = {...subscription,startedAt:'2026-10-29T10:00:00.000Z'}
  assert.equal(policy.kling4PromoWindow(fresh,on,now).expiresAt,'2026-11-28T10:00:00.000Z')
  const expiry = Date.parse('2026-11-27T00:00:00Z')
  assert.equal(policy.kling4PromoWindow({...subscription,verifiedAt:new Date(expiry-1).toISOString()},on,expiry-1).eligible,true)
  assert.equal(policy.kling4PromoWindow({...subscription,verifiedAt:new Date(expiry).toISOString()},on,expiry).reason,'expired')
  const december = Date.parse('2026-12-01T00:00:00Z')
  const finalSignup = {...subscription,startedAt:'2026-11-30T23:59:59.999Z',paidThrough:'2027-01-01T00:00:00Z',verifiedAt:new Date(december).toISOString()}
  assert.equal(policy.kling4PromoWindow(finalSignup,on,december).eligible,true)
  assert.equal(policy.kling4PromoWindow({...finalSignup,startedAt:new Date(december).toISOString()},on,december).reason,'signup_closed')
})

test('only a freshly verified active paid subscription passes; pack, unpaid, stale verification and missing dates cannot', () => {
  assert.equal(policy.kling4PromoWindow(null,on,now).eligible,false)
  for (const patch of [{status:'past_due'},{status:'trialing'},{plan:'free'},{plan:'autopilot_trial'},
    {paidThrough:new Date(now).toISOString()},{startedAt:null},{verifiedAt:new Date(now-60_001).toISOString()},
    {verifiedAt:new Date(now+5_001).toISOString()}]) {
    assert.equal(policy.kling4PromoWindow({...subscription,...patch},on,now).eligible,false)
  }
  for (const plan of policy.KLING4_PAID_PLANS) assert.equal(policy.kling4PromoWindow({...subscription,plan},on,now).eligible,true)
  assert.equal(policy.kling4PromoReservedMilliUsd(15,1280),3635)
  assert.equal(policy.kling4PromoReservedMilliUsd(60,10000),19420)
  for (const args of [[61,0],[0,0],[15,-1],[15,10001],[15,0.5],[NaN,0]]) assert.equal(policy.kling4PromoReservedMilliUsd(...args),null)
})

test('copy is budget-gated, expiry-safe, UTC-bound and separate from authenticated free use', () => {
  const args={policy:on,subscription,now,budgetAvailable:true,usedToday:0}
  assert.equal(display.buildKling4PromoAvailability(args).promoAvailable,true)
  const anonymous=display.buildKling4PromoAvailability({...args,subscription:null})
  assert.equal(anonymous.publicOfferLive,true); assert.equal(anonymous.promoAvailable,false)
  for (const budgetAvailable of [false,null]) {
    const result=display.buildKling4PromoAvailability({...args,budgetAvailable})
    assert.equal(result.publicOfferLive,false); assert.equal(result.promoAvailable,false)
  }
  assert.equal(display.buildKling4PromoAvailability({...args,usedToday:3}).reason,'daily_limit')
  assert.equal(display.buildKling4PromoAvailability({...args,enrollmentExpiresAt:'2026-10-29T00:00:00Z'}).reason,'expired')
  const december=Date.parse('2026-12-01T00:00:00Z')
  assert.equal(display.buildKling4PromoAvailability({...args,now:december}).publicOfferLive,false)
  const beforeMidnight=Date.parse('2026-10-29T23:59:59.999Z')
  assert.equal(display.buildKling4PromoAvailability({...args,now:beforeMidnight}).validUntil,'2026-10-30T00:00:00.000Z')
  const expiring={...subscription,paidThrough:new Date(now+999).toISOString()}
  assert.equal(display.buildKling4PromoAvailability({...args,subscription:expiring}).validUntil,expiring.paidThrough)
})

test('reservation ignores client proof, validates RPC outcome, and retains immutable replay after rollback', async () => {
  const input={userId,jobId:'film-1',kind:'film',seconds:15,falExtrasMilliUsd:1280}
  const opts={policy:on,now,resolveSubscription:async()=>subscription}
  let called=0
  assert.equal((await server.reserveKling4Promo(fakeDb({}),{...input,userId:'bad'},opts)).reason,'invalid_request')
  assert.equal((await server.reserveKling4Promo(fakeDb({}),input,{...opts,resolveSubscription:async()=>null})).isFree,false)
  assert.equal((await server.reserveKling4Promo(fakeDb({}),input,{...opts,resolveSubscription:async()=>({...subscription,userId:'other'})})).isFree,false)
  const db=fakeDb({},async (_name,args)=>{
    called++; assert.equal(args.p_user_id,userId); assert.equal(args.p_plan,'basic'); assert.equal(args.p_fal_extras_milliusd,1280)
    return {data:{is_free:true,reason:'ok',reserved_milliusd:3635,reservation_id:userId,remaining:2,expires_at:'2026-11-27T00:00:00Z'}}
  })
  const result=await server.reserveKling4Promo(db,input,opts)
  assert.equal(result.isFree,true); assert.equal(result.reservedUsd,3.635); assert.equal(called,1)
  const forged=fakeDb({},async()=>({data:{is_free:true,reason:'ok',reserved_milliusd:1,reservation_id:userId}}))
  assert.equal((await server.reserveKling4Promo(forged,input,opts)).isFree,false)
  const prior={kind:'film',seconds:15,is_free:true,reason:'ok',estimated_milliusd:3635,reserved_milliusd:3635,reservation_id:userId}
  const replay=await server.reserveKling4Promo(fakeDb({kling4_promo_uses:{data:prior}}),input,{...opts,policy:{...on,paidLive:false}})
  assert.equal(replay.isFree,true); assert.equal(replay.duplicate,true)
  assert.equal((await server.reserveKling4Promo(fakeDb({kling4_promo_uses:{data:prior}}),{...input,kind:'ad'},opts)).reason,'identity_conflict')
  assert.equal(await server.verifyKling4PromoReservation(fakeDb({kling4_promo_uses:{data:prior}}),{userId,jobId:'film-1',kind:'film',seconds:15}),true)
  assert.equal(await server.verifyKling4PromoReservation(fakeDb({kling4_promo_uses:{data:prior}}),{userId,jobId:'film-1',kind:'ad',seconds:15}),false)
})

test('a prepared ad needs same-UTC-day live paid authority for its FIRST start; in-flight recovery proof remains immutable',async()=>{
  const row={kind:'ad',seconds:15,is_free:true,reason:'ok',reservation_id:userId,request_day:'2026-10-29',
    expires_at:'2026-11-27T00:00:00Z',estimated_milliusd:3635,reserved_milliusd:3635,submitted_at:null,
    subscription_started_at:subscription.startedAt}
  const input={userId,jobId:'prepared-ad',kind:'ad',seconds:15}
  const opts={policy:on,now,resolveSubscription:async()=>subscription}
  const db=patch=>fakeDb({kling4_promo_uses:{data:{...row,...patch}}})
  assert.equal((await server.validateKling4PromoStart(db({}),input,opts)).isFree,true)
  const old=await server.validateKling4PromoStart(db({request_day:'2026-10-28'}),input,opts)
  assert.equal(old.reason,'reservation_expired'); assert.equal(old.hadFreeReservation,true)
  assert.equal((await server.validateKling4PromoStart(db({expires_at:new Date(now).toISOString()}),input,opts)).reason,'expired')
  assert.equal((await server.validateKling4PromoStart(db({}),input,{...opts,resolveSubscription:async()=>null})).reason,'not_subscribed')
  for(const patch of [{paidLive:false},{promoLive:false}]) {
    const result=await server.validateKling4PromoStart(db({}),input,{...opts,policy:{...on,...patch}})
    assert.equal(result.isFree,false); assert.equal(result.hadFreeReservation,true)
  }
  for(const patch of [{kind:'film'},{seconds:30},{reserved_milliusd:0},{submitted_at:new Date(now).toISOString()}])
    assert.equal((await server.validateKling4PromoStart(db(patch),input,opts)).isFree,false)
  assert.equal((await server.validateKling4PromoStart(db({}),input,{...opts,resolveSubscription:async()=>({...subscription,status:'past_due'})})).isFree,false)
  // An already accepted job can still prove its original zero charge after midnight/expiry/cancellation.
  assert.equal(await server.verifyKling4PromoReservation(db({request_day:'2026-10-28',submitted_at:'2026-10-28T12:00:00Z'}),input),true)
  // Same person switches billing subscription in December; the old enrollment end remains authoritative.
  const december=Date.parse('2026-12-02T12:00:00Z')
  const decemberRow={...row,request_day:'2026-12-02',expires_at:'2026-12-20T00:00:00Z',subscription_started_at:'2026-11-20T00:00:00Z'}
  const replacement={...subscription,startedAt:'2026-12-01T12:00:00Z',paidThrough:'2027-01-01T00:00:00Z',verifiedAt:new Date(december).toISOString()}
  assert.equal((await server.validateKling4PromoStart(fakeDb({kling4_promo_uses:{data:decemberRow}}),input,
    {...opts,now:december,resolveSubscription:async()=>replacement})).isFree,true)
})

test('runtime Stripe source checks active LIVE status, paid invoice, customer and metadata owner, not has_paid/is_pro', async () => {
  const profile={id:userId,plan:'basic',has_paid:true,is_pro:true,stripe_customer_id:'cus_owner',stripe_subscription_id:'sub_verified'}
  const sub={id:'sub_verified',livemode:true,status:'active',metadata:{supabase_user_id:userId},customer:'cus_owner',
    start_date:Date.parse(subscription.startedAt)/1000,current_period_end:Date.parse(subscription.paidThrough)/1000,
    latest_invoice:{status:'paid',paid:true,amount_paid:1990}}
  for (const patch of [{},{status:'past_due'},{status:'trialing'},{status:'canceled'},{livemode:false},
    {customer:'cus_other'},{metadata:{supabase_user_id:'other'}},{latest_invoice:{status:'paid',paid:true,amount_paid:0}}]) {
    const s=load('kling4PromoServer',{'./stripe':{stripe:{subscriptions:{retrieve:async()=>({...sub,...patch})}}}}, {STRIPE_SECRET_KEY:'offline-test-key'})
    const resolved=await s.resolveKling4PaidSubscription(fakeDb({profiles:{data:profile}}),userId,now)
    assert.equal(!!resolved,Object.keys(patch).length===0)
  }
  assert.equal(await server.resolveKling4PaidSubscription(fakeDb({profiles:{data:{...profile,stripe_subscription_id:null}}}),userId,now),null)
})

test('runtime PayPal source requires ACTIVE verified subscription and a real positive last payment', async () => {
  const p={id:userId,plan:'basic',paypal_subscription_id:'I_verified'}
  const sub={id:'I_verified',status:'ACTIVE',custom_id:userId,start_time:subscription.startedAt,plan_id:'P_live',
    billing_info:{next_billing_time:subscription.paidThrough,last_payment:{time:subscription.startedAt,amount:{value:'19.90'}}}}
  for (const patch of [{},{status:'APPROVED'},{status:'SUSPENDED'},{custom_id:'other'},
    {billing_info:{...sub.billing_info,last_payment:{time:subscription.startedAt,amount:{value:'0'}}}}]) {
    const s=load('kling4PromoServer',{'./paypal':{paypalFetch:async()=>({...sub,...patch}),tierFromPlanId:async()=>({tier:'basic'})}},
      {PAYPAL_CLIENT_ID:'offline',PAYPAL_CLIENT_SECRET:'offline'})
    assert.equal(!!await s.resolveKling4PaidSubscription(fakeDb({profiles:{data:p}}),userId,now),Object.keys(patch).length===0)
  }
  for (const [legacy,tier] of [['creator','basic'],['studio','pro']]) {
    assert.equal(policy.normalizeKling4PaidPlan(legacy),tier)
    const mocks={'./paypal':{paypalFetch:async()=>sub,tierFromPlanId:async()=>({tier})}}
    const s=load('kling4PromoServer',mocks,{PAYPAL_CLIENT_ID:'offline',PAYPAL_CLIENT_SECRET:'offline'})
    assert.equal((await s.resolveKling4PaidSubscription(fakeDb({profiles:{data:{...p,plan:legacy}}}),userId,now)).plan,legacy)
    const unpaid=load('kling4PromoServer',{'./paypal':{...mocks['./paypal'],paypalFetch:async()=>({...sub,status:'SUSPENDED'})}},
      {PAYPAL_CLIENT_ID:'offline',PAYPAL_CLIENT_SECRET:'offline'})
    assert.equal(await unpaid.resolveKling4PaidSubscription(fakeDb({profiles:{data:{...p,plan:legacy}}}),userId,now),null)
  }
})

test('runtime Dodo source requires live active ownership plus a positive server-only live payment', async () => {
  const profile={id:userId,plan:'basic',dodo_subscription_id:'sub_dodo'}
  const sub={subscription_id:'sub_dodo',status:'active',metadata:{supabase_user_id:userId},
    created_at:subscription.startedAt,next_billing_date:subscription.paidThrough}
  for (const patch of [{},{status:'on_hold'},{status:'cancelled'},{metadata:{supabase_user_id:'other'}}]) {
    const s=load('kling4PromoServer',{
      './dodo':{dodoMode:()=> 'live',dodoApiKey:()=> 'offline',dodoBaseUrl:()=> 'https://offline.invalid'},
      __fetch:async url=>{assert.equal(url,'https://offline.invalid/subscriptions/sub_dodo');return {ok:true,json:async()=>({...sub,...patch})}},
    })
    const payment={metadata:{amount_total:1990}}
    assert.equal(!!await s.resolveKling4PaidSubscription(fakeDb({profiles:{data:profile},events:{data:payment}}),userId,now),Object.keys(patch).length===0)
    assert.equal(await s.resolveKling4PaidSubscription(fakeDb({profiles:{data:profile},events:{data:{metadata:{amount_total:0}}}}),userId,now),null)
  }
})

test('availability GET is private/no-store; auth is server derived; all failure paths hide promotional copy',async()=>{
  const route=fs.readFileSync(path.resolve(__dirname,'../app/api/kling4-paid/availability/route.ts'),'utf8')
  assert.match(route,/auth\.getUser\(\)/); assert.match(route,/Vary: 'Cookie, Authorization'/)
  assert.match(route,/'CDN-Cache-Control': 'no-store'/); assert.match(route,/fetchCache = 'force-no-store'/)
  assert.doesNotMatch(route,/searchParams|req\.json|has_paid|is_pro/)
  const sink=fs.readFileSync(path.resolve(__dirname,'../app/api/events/route.ts'),'utf8')
  const serverOnly=sink.slice(sink.indexOf('const SERVER_ONLY_EVENTS'),sink.indexOf('])',sink.indexOf('const SERVER_ONLY_EVENTS')))
  assert.match(serverOnly,/'kling4_promo_use_reserved'/);assert.match(serverOnly,/'kling4_paid_engine_used'/)
  const options={policy:on,now,resolveSubscription:async()=>subscription}
  const broken=fakeDb({kling4_promo_days:{error:true}})
  assert.equal((await server.readKling4PaidAvailability(broken,{userId},options)).publicOfferLive,false)
  assert.equal((await server.readKling4PaidAvailability(null,{userId},options)).promoAvailable,false)
  const db=fakeDb({kling4_promo_days:{data:{reserved_milliusd:0}}})
  assert.equal((await server.readKling4PaidAvailability(db,{userId},options)).promoAvailable,true)
  assert.equal((await server.readKling4PaidAvailability(fakeDb({kling4_promo_days:{data:{reserved_milliusd:99999}}}),{userId},options)).reason,'daily_cap')
})
