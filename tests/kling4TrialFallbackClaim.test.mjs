// Offline HMAC/CAS proof for the real scoped fallback mutation. No credentials/network/vendor calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as crypto from 'node:crypto'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const cache = new Map()
function load(file) {
  if(cache.has(file))return cache.get(file)
  const exports={};cache.set(file,exports)
  const code=ts.transpileModule(readFileSync(join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,console,URL,Date,Buffer,require(specifier){
    if(specifier==='node:crypto')return crypto
    if(specifier.startsWith('@/'))return load(specifier.slice(2)+'.ts')
    throw Error('Unsupported offline dependency '+specifier)
  }},{filename:file})
  return exports
}
const lib=load('lib/cinematic/claim.ts')
const secret='offline-signature-placeholder',user='00000000-0000-4000-8000-000000000001',generation='offline-first-film'
const model='kling/v4/text-to-video',seedance='fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
function fixture({quality='cinematic_ai',url=null,conflict=false}={}){
  const response={generationId:generation,quality,duration:15,aspect:'9:16',fal_request_ids:['kling-original'],fal_models:[model],
    scenes:['one multishot'],voiceover_script:'Original narration',narration_voice:{voice:'original'},music_mood:'original',
    kling4_trial:{version:'kling4_trial_2810',engine_used:'kling4',cost_usd:2.355,country:'BR',original_request_id:'kling-original',submitted_at:'2026-10-29T00:00:00Z',
      fallback_scenes:[{prompt:'first scene',duration:6},{prompt:'second scene',duration:7},{prompt:'third scene',duration:8}],
      fallback_response:{scenes:['first','second','third'],scene_captions:['a','b','c'],clip_word_starts:[0,4,8]}}}
  const authority={claimId:lib.cinematicClaimId(user,generation),userId:user,generationId:generation,status:'done',fingerprint:'f'.repeat(64),creditCost:7,
    quality,engine:'seedance',falRequestIds:['kling-original'],falModels:[model],authorizedCompletedUrls:[url],responseHash:lib.cinematicValueHash(response)}
  let row={id:authority.claimId,user_id:user,name:'cinematic_submission_claim',path:'/api/generate-video-cinematic',session_id:generation,
    metadata:{generation_id:generation,status:'done',fingerprint:authority.fingerprint,credit_cost:7,quality,engine:'seedance',fal_request_ids:authority.falRequestIds,
      fal_models:authority.falModels,authorized_completed_urls:authority.authorizedCompletedUrls,response,response_hash:authority.responseHash,authority:lib.signCinematicClaim(secret,authority)}}
  const db={from(table){assert.equal(table,'events');let patch=null;const filters=[];return{
    select(){return this},update(value){patch=value;return this},eq(key,value){filters.push([key,value]);return this},
    async maybeSingle(){
      if(patch&&conflict)return{data:null,error:null}
      if(filters.some(([key,value])=>(key==='metadata->>authority'?row.metadata.authority:row[key])!==value))return{data:null,error:null}
      if(patch)row={...row,...patch}
      return{data:structuredClone(row),error:null}
    }
  }}}
  return{db,get row(){return row}}
}
const switchArgs={secret,userId:user,generationId:generation,originalRequestId:'kling-original',requestIds:['seedance-0',null,'seedance-2'],ambiguous:true,reason:'timeout'}

test('real HMAC mutation freezes fallback vectors and restores original scene metadata',async()=>{
  const f=fixture(),oldAuthority=f.row.metadata.authority
  const result=await lib.switchKling4TrialToSeedanceFallback({...switchArgs,db:f.db})
  assert.equal(result.ok,true)
  const claim=result.claim
  assert.notEqual(claim.authority,oldAuthority)
  assert.deepEqual(Array.from(claim.falRequestIds),switchArgs.requestIds)
  assert.deepEqual(Array.from(claim.falModels),[seedance,seedance,seedance])
  assert.deepEqual(Array.from(claim.response.scenes),['first','second','third'])
  assert.equal(claim.response.voiceover_script,'Original narration')
  assert.equal(claim.response.narration_voice.voice,'original')
  assert.equal(claim.response.music_mood,'original')
  assert.equal(claim.creditCost,7)
  assert.equal(claim.engine,'seedance')
  assert.equal(claim.response.kling4_trial.cost_usd,2.355)
  assert.equal(claim.response.kling4_trial.original_request_id,'kling-original')
  assert.equal(claim.response.kling4_trial.fallback_ambiguous,true)
  assert.equal(claim.response.submission_uncertain,false,'frozen unknown slots are deliberately excluded, not endlessly awaited')
  assert.equal(lib.verifyCinematicClaimRow({row:f.row,secret,userId:user,generationId:generation}).ok,true)
  const ready=await lib.authorizeCinematicCompletedUrls({db:f.db,secret,userId:user,generationId:generation,completed:[
    {requestId:'seedance-0',model:seedance,url:'https://offline.invalid/0.mp4'},
    {requestId:'seedance-2',model:seedance,url:'https://offline.invalid/2.mp4'}]})
  assert.equal(ready.ok,true)
  assert.equal(lib.cinematicJobsAreTerminal(ready.claim),true,'partial fallback can compose the accepted scenes')
  const replay=await lib.switchKling4TrialToSeedanceFallback({...switchArgs,db:f.db})
  assert.equal(replay.ok,true)
  assert.equal(replay.claim.authorizedCompletedUrls[0],'https://offline.invalid/0.mp4','replay never erases accepted URL proof')
  assert.equal((await lib.switchKling4TrialToSeedanceFallback({...switchArgs,db:f.db,requestIds:['different',null,null]})).ok,false)
})

test('paid claims, wrong original id, completed Kling source, malformed vectors and CAS races cannot switch',async()=>{
  for(const options of [{quality:'cinematic_kling'},{url:'https://offline.invalid/kling-complete.mp4'},{conflict:true}]){
    const f=fixture(options),before=JSON.stringify(f.row)
    assert.equal((await lib.switchKling4TrialToSeedanceFallback({...switchArgs,db:f.db})).ok,false)
    assert.equal(JSON.stringify(f.row),before)
  }
  for(const override of [{originalRequestId:'forged'},{requestIds:['too-short']}]){
    const f=fixture()
    assert.equal((await lib.switchKling4TrialToSeedanceFallback({...switchArgs,...override,db:f.db})).ok,false)
  }
})

test('zero accepted fallback has valid signed state for the explicit refund path',async()=>{
  const f=fixture()
  const result=await lib.switchKling4TrialToSeedanceFallback({...switchArgs,db:f.db,requestIds:[null,null,null]})
  assert.equal(result.ok,true)
  assert.equal(result.claim.falRequestIds.some(Boolean),false)
  assert.equal(lib.verifyCinematicClaimRow({row:f.row,secret,userId:user,generationId:generation}).ok,true)
  assert.equal(lib.cinematicJobsAreTerminal(result.claim),false,'caller must explicitly refund zero acceptance, not fabricate terminal provider evidence')
})
