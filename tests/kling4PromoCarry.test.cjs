// Offline strict-day continuation budget guard. No provider SDK, env file, credential or paid render.
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const {test}=require('node:test')
const filename=path.resolve(__dirname,'../lib/kling4PromoCarry.ts')
const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText
const box={exports:{}}
vm.runInNewContext(code,box,{filename})
const {ensureKling4PromoBudgetToday:ensure}=box.exports
const identity={userId:'00000000-0000-4000-8000-000000000001',jobId:'accepted-film'}

test('carry derives cost only from a verified server RPC, with no client amount or new entitlement',async()=>{
 let calls=0
 const db={rpc:async(name,args)=>{
  calls++;assert.equal(name,'ensure_kling4_promo_budget_today')
  assert.deepEqual(JSON.parse(JSON.stringify(args)),{p_user_id:identity.userId,p_job_id:identity.jobId})
  return {data:{allowed:true,reason:'reserved',reserved_milliusd:11392}}
 }}
 assert.equal(await ensure(db,identity),true);assert.equal(calls,1)
 for(const reason of ['current_day','reserved','duplicate']){
  assert.equal(await ensure({rpc:async()=>({data:{allowed:true,reason,reserved_milliusd:3835}})},identity),true)
 }
 for(const row of [{allowed:false,reason:'daily_cap'},{allowed:false,reason:'unverified'},
  {allowed:true,reason:'reserved',reserved_milliusd:0},{allowed:true,reason:'reserved',reserved_milliusd:19421},
  {allowed:true,reason:'other',reserved_milliusd:11392},{allowed:true,reason:'reserved',reserved_milliusd:1.5}]){
  assert.equal(await ensure({rpc:async()=>({data:row})},identity),false)
 }
 assert.equal(await ensure({rpc:async()=>({error:{code:'offline'}})},identity),false)
 assert.equal(await ensure({rpc:async()=>{throw Error('offline')}},identity),false)
 assert.equal(await ensure({rpc:()=>{throw Error('invalid identity must not reach DB')}},{...identity,userId:'client-forged'}),false)
 const sink=fs.readFileSync(path.resolve(__dirname,'../app/api/events/route.ts'),'utf8')
 const list=sink.slice(sink.indexOf('const SERVER_ONLY_EVENTS'),sink.indexOf('])',sink.indexOf('const SERVER_ONLY_EVENTS')))
 assert.match(list,/'kling4_promo_carry_reserved'/)
})
