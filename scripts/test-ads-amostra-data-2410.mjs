// KINEO-AMOSTRA-ANUNCIO-2410 — actual helper and signed-webhook writer; no env, network, database or paid calls.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const F = { helper: 'lib/ads/cena/escolhaSampleServer.ts', webhook: 'app/api/stripe/webhook/route.ts', sink: 'app/api/events/route.ts', cron: 'app/api/cron/ads-v2-advance/route.ts' }
const read = p => readFileSync(p, 'utf8').replace(/\r\n/gu, '\n')
const actor = '10000000-0000-4000-8000-000000000001', order = '20000000-0000-4000-8000-000000000001', token = '30000000-0000-4000-8000-000000000001'
const identity = { actorId: actor, ownerId: actor, orderId: order }, lease = '2026-10-24T12:00:00Z'
const plain = value => JSON.parse(JSON.stringify(value))
const equal = (a,b,msg) => assert.deepEqual(plain(a),plain(b),msg)
function world(options = {}, over = {}) {
  const calls = [], policy = { ADS_ESCOLHA_SAMPLE_LIVE: true, ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS: 150, ...options.policy }
  const admin = {
    auth: { admin: { getUserById: async id => { calls.push(['auth',id]); return options.authError ? { error: {} } : { data: { user: { email: options.email ?? 'buyer@example.org', email_confirmed_at: '2026-10-01T00:00:00Z', ...options.user } } } } } },
    rpc: async(name,args) => { calls.push(['rpc',name,args]);return options.rpc ? options.rpc(name,args) : { data: { code: 'ok', estimate_cents: 150 } } },
    from: name => {calls.push(['from',name]);const q={ select:()=>q, eq:()=>q, maybeSingle:async()=>options.rowError ? {error:{}} : {data:options.row??{order_id:order,estimate_cents:150}} };return q},
  }
  const load = createOfflineLoader({ source:(p,s)=>over[p]??s, globals:{ Date,crypto:{randomUUID:()=>token} }, mocks:{
    './escolhaSamplePolicy': policy,
    '../serverAccess': {adsSampleAccountOk:async()=>options.antifarm!==false},
    '@/lib/supplier/notify': {notifyFounder:async(...args)=>{calls.push(['notify',...args]);return options.sent??{email:'sent',webhook:'skipped',delivered:true}}},
  } })
  return { api:load(F.helper), admin,calls }
}
async function accountProof(over={}) {
  for(const options of [{},{user:{email_confirmed_at:null}},{user:{email_confirmed_at:'bad'}},{user:{email:''}},{authError:true},{antifarm:false},{policy:{ADS_ESCOLHA_SAMPLE_LIVE:false}}]) {
    const w=world(options,over), want=Object.keys(options).length===0
    assert.equal(await w.api.escolhaSampleAccountOk(w.admin,actor),want,'confirmed auth email and existing antifarm required: '+JSON.stringify(options))
  }
  const w=world({},over);assert.equal(await w.api.escolhaSampleAccountOk(w.admin,'not-a-uuid'),false)
}
async function reserveProof(over={}) {
  const w=world({},over);equal(await w.api.reserveEscolhaSample(w.admin,{...identity,leaseAt:lease}),{ok:true})
  const r=w.calls.find(c=>c[0]==='rpc');assert.equal(r[1],'reserve_ads_escolha_sample');equal(r[2],{p_order_id:order,p_actor_id:actor,p_owner_id:actor,p_lease_at:lease,p_is_internal:false})
  const internal=world({email:'josephsskaf@gmail.com'},over);await internal.api.reserveEscolhaSample(internal.admin,{...identity,leaseAt:lease});assert.equal(internal.calls.find(c=>c[0]==='rpc')[2].p_is_internal,true,'internal never enters person-level events')
  for(const [code,status] of [['ads_sample_used',409],['ads_sample_cap',429],['ads_sample_unavailable',503],['unknown',503]]) {
    const x=world({rpc:()=>({data:{code,reset_at:'2026-10-25T00:00:00Z'}})},over)
    assert.equal((await x.api.reserveEscolhaSample(x.admin,{...identity,leaseAt:lease})).status,status)
  }
  for(const options of [{policy:{ADS_ESCOLHA_SAMPLE_LIVE:false}},{policy:{ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS:149}},{antifarm:false},{authError:true},{rpc:()=>({error:{}})},{rpc:()=>{throw Error('offline')}}]) {
    const x=world(options,over);assert.equal((await x.api.reserveEscolhaSample(x.admin,{...identity,leaseAt:lease})).ok,false,'fail closed: '+JSON.stringify(options))
    if(options.policy) assert.equal(x.calls.length,0,'switch or cost drift cannot consume a lifetime claim')
  }
  const foreign=world({},over);assert.equal((await foreign.api.reserveEscolhaSample(foreign.admin,{...identity,ownerId:token,leaseAt:lease})).ok,false);assert.equal(foreign.calls.length,0,'no workspace farming')
}
async function reservationProof(over={}) {
  const w=world({},over);assert.equal(await w.api.hasEscolhaSampleReservation(w.admin,identity),true)
  for(const options of [{row:{order_id:token,estimate_cents:150}},{row:{order_id:order,estimate_cents:0}},{rowError:true}]) {
    const x=world(options,over);assert.equal(await x.api.hasEscolhaSampleReservation(x.admin,identity),false,'unreserved direct start forbidden')
  }
  const paused=world({policy:{ADS_ESCOLHA_SAMPLE_LIVE:false}},over);assert.equal(await paused.api.hasEscolhaSampleReservation(paused.admin,identity),true,'paid continuation can read an existing reservation while free acquisition is off')
  assert.equal(await w.api.hasEscolhaSampleReservation(w.admin,{...identity,ownerId:token}),false)
  assert.equal(await w.api.escolhaSampleUsed(w.admin,actor),true)
  const missing=world({rowError:true},over);assert.equal(await missing.api.escolhaSampleUsed(missing.admin,actor),true,'missing schema is used,not another free allowance')
  for(const stage of ['Delivered','Upsell']) {
    const x=world({},over);assert.equal(await x.api['markEscolhaSample'+stage](x.admin,identity),true)
    assert.equal(x.calls[0][1],'mark_ads_escolha_sample_'+stage.toLowerCase())
    assert.equal(await x.api['markEscolhaSample'+stage](x.admin,{...identity,ownerId:token}),false)
  }
}
async function alertProof(over={}) {
  const claim={code:'ok',claim_token:token,people:50,first_delivered_at:'2026-10-01',last_delivered_at:'2026-10-08',measured_at:'2026-10-15'}
  const rpc=(name)=>name==='reconcile_ads_escolha_sample_purchases'?{data:0}:name==='claim_ads_escolha_sample_alert'?{data:claim}:{data:true}
  const w=world({rpc},over);assert.equal(await w.api.checkEscolhaSampleConversionAlert(w.admin,Date.now()+30000),true)
  const sent=w.calls.find(c=>c[0]==='notify');assert.ok(sent);equal(sent[3],{emailOnly:true,idempotencyKey:'ads-escolha-sample-50-no-purchase-7d-v1'});assert.ok(sent[2].includes('pessoas externas'));assert.ok(sent[2].includes('Contas internas excluídas'))
  const finish=w.calls.find(c=>c[1]==='finish_ads_escolha_sample_alert');equal(finish[2],{p_claim_token:token,p_sent:true})
  for(const altered of [{code:'not_ready'},{claim_token:actor},{people:49}]) {
    const x=world({rpc:name=>name==='reconcile_ads_escolha_sample_purchases'?{data:0}:{data:{...claim,...altered}}},over)
    assert.equal(await x.api.checkEscolhaSampleConversionAlert(x.admin,Date.now()+30000),false);assert.equal(x.calls.some(c=>c[0]==='notify'),false)
  }
  const failed=world({rpc,sent:{email:'failed',webhook:'sent',delivered:true}},over);assert.equal(await failed.api.checkEscolhaSampleConversionAlert(failed.admin,Date.now()+30000),false,'e-mail is mandatory for this alert')
  equal(failed.calls.find(c=>c[1]==='finish_ads_escolha_sample_alert')[2],{p_claim_token:token,p_sent:false})
  const unavailable=world({rpc:()=>({error:{}})},over);assert.equal(await unavailable.api.checkEscolhaSampleConversionAlert(unavailable.admin,Date.now()+30000),false);assert.equal(unavailable.calls.some(c=>c[0]==='notify'),false)
  const late=world({rpc},over);assert.equal(await late.api.checkEscolhaSampleConversionAlert(late.admin,Date.now()),false);assert.equal(late.calls.length,0)
}
function actualFunction(file,name,bindings,over={}) {
  const ast=ts.createSourceFile(file,over[file]??read(file),ts.ScriptTarget.Latest,true)
  assert.equal(ast.parseDiagnostics.length,0)
  const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,'real production writer')
  const code=ts.transpileModule(node.getText(ast).replace(/^export\s+/u,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  return new Function(...Object.keys(bindings),code+`\nreturn ${name}`)(...Object.values(bindings))
}
async function webhookProof(over={}) {
  const rows=[], admin={from:()=>{const q={select:()=>q,eq:()=>q,contains:()=>q,limit:async()=>({data:[]}),insert:async r=>{rows.push(r);return{}}};return q}}
  const write=actualFunction(F.webhook,'recordPaymentSuccess',{
    createHash,console:{error(){}},isGuestCheckoutSession:()=>false,sessionOwnerUuid:()=>actor,isDfyOrderSession:()=>false,dfySessionTier:()=>null,
    paidClickMetadataFromEvent:()=>({}),firstPaymentCreditsFromSession:()=>null,isOwnerRejection:()=>false,
  },over)
  const session={id:'cs_fixture',payment_status:'paid',livemode:true,mode:'payment',metadata:{},amount_total:990,currency:'usd'}
  await write(admin,'evt_fixture',session,1792843200)
  assert.equal(rows.length,1);const m=rows[0].metadata
  assert.equal(m.source,'stripe_webhook');assert.equal(m.stripe_livemode,true);assert.equal(m.stripe_payment_status,'paid');assert.equal(m.stripe_paid_at,new Date(1792843200000).toISOString());assert.equal(m.amount_total,990)
  await write(admin,'evt_pending',{...session,payment_status:'unpaid'},1792843200);assert.equal(rows.length,1,'unsettled checkout never invents purchase')
  await write(admin,'evt_test',{...session,livemode:false},1792843200);assert.equal(rows[1].metadata.stripe_livemode,false,'SQL can exclude test-mode events')
  const source=over[F.webhook]??read(F.webhook);assert.match(source,/recordPaymentSuccess\(supabase, event\.id, session, event\.created\)/u,'signed event time is passed by actual webhook callers')
}
async function cronAlertBudgetProof(over={}) {
  let now=1_000_000, sent=0;const calls=[]
  class Clock extends Date {static now(){return now}}
  const q={select:()=>q,in:()=>q,order:()=>q,limit:async()=>({data:[{id:order,status:'generating'}],error:null})},admin={from:()=>q}
  const get=actualFunction(F.cron,'GET',{
    isAuthorized:()=>true,Date:Clock,footageAdminClient:()=>admin,BATCH:6,TOTAL_BUDGET_MS:240000,PER_ORDER_BUDGET_MS:60000,isMissingAdsTable:()=>false,
    NextResponse:{json:x=>x},console:{log(){},error(){}},process:{env:{}},
    checkEscolhaSampleConversionAlert:async(_db,deadline)=>{calls.push('alert');if(now+12000<deadline)sent++;return sent>0},
    advanceAdsV2Order:async()=>{calls.push('render');now+=240000;return{status:'assembling'}},drainAdsV2Batches:async()=>[],retryEscolhaNotices:async()=>{},advanceDemosSobMedida:async()=>[],
  },over)
  await get({});assert.equal(sent,1,'a busy render queue cannot starve the stopping email');assert.equal(calls[0],'alert','evaluate conversion before exhausting the render budget')
}
async function sinkProof(over={}) {
  const source=over[F.sink]??read(F.sink),match=source.match(/const SERVER_ONLY_EVENTS = new Set\((\[[\s\S]*?\])\)/u);assert.ok(match)
  const events=new Function('return '+match[1])()
  for(const event of ['ads_sample_started','ads_sample_delivered','ads_sample_upsell_clicked','ads_sample_purchased_7d']) assert.ok(events.includes(event),'browser cannot forge '+event)
}
for(const proof of [accountProof,reserveProof,reservationProof,alertProof,webhookProof,sinkProof,cronAlertBudgetProof]) await proof()
const mutants=[
 ['unconfirmed e-mail qualifies',F.helper,"typeof user.email_confirmed_at !== 'string' || !Number.isFinite(Date.parse(user.email_confirmed_at))","false",accountProof],
 ['antifarm bypassed',F.helper,'return await adsSampleAccountOk(admin, actorId) ? user : null','return user',accountProof],
 ['personal workspace bypassed',F.helper,'i.actorId === i.ownerId','true',reserveProof],
 ['switch ignored',F.helper,'return ADS_ESCOLHA_SAMPLE_LIVE && UUID.test(actorId)','return UUID.test(actorId)',accountProof],
 ['cost drift opens sample',F.helper,'ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS !== 150','false',reserveProof],
 ['internal customer counted',F.helper,'p_is_internal: isInternalEmail(user.email)','p_is_internal: false',reserveProof],
 ['reservation amount ignored',F.helper,'r.data.estimate_cents === ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS','true',reservationProof],
 ['unavailable ledger grants reuse',F.helper,'return !!r.error || !!r.data','return !r.error && !!r.data',reservationProof],
 ['webhook-only alert accepted as email',F.helper,"return sent.email === 'sent'","return sent.delivered",alertProof],
 ['wrong alert lease accepted',F.helper,'row.claim_token !== token','false',alertProof],
 ['49 samples alert early',F.helper,'row.people !== 50','false',alertProof],
 ['Stripe test mode pretends live',F.webhook,'stripe_livemode: session.livemode === true','stripe_livemode: true',webhookProof],
 ['payment time replaced by arrival',F.webhook,'new Date(stripeEventCreated * 1000).toISOString()','new Date().toISOString()',webhookProof],
 ['unpaid checkout becomes payment',F.webhook,"if (session.payment_status !== 'paid') return",'if (false) return',webhookProof],
 ['sample delivery browser forgery',F.sink,"  'ads_sample_delivered',\n",'',sinkProof],
 ['cron alert receives exhausted deadline',F.cron,'checkEscolhaSampleConversionAlert(admin, started + TOTAL_BUDGET_MS)','checkEscolhaSampleConversionAlert(admin, started)',cronAlertBudgetProof],
]
for(const [name,file,from,to,proof] of mutants){
 const source=read(file);assert.equal(source.split(from).length-1,1,'unique mutant: '+name)
 const changed=source.replace(from,to),ast=ts.createSourceFile(file,changed,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0,'valid mutant syntax')
 let error;try{await proof({[file]:changed})}catch(e){error=e}
 assert.equal(error?.code,'ERR_ASSERTION','assertion-killed mutant '+name+': '+(error?.stack??'SURVIVED'))
}
console.log(`ok ads-amostra-data: seven production behavioral groups; ${mutants.length} assertion-killed mutants; no network,env,credential,paid call or source mutation`)
