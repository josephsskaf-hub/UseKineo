// Execute actual route statements with safe in-memory dependencies. Financial
// HMAC/ledger/races are exercised separately by test-quality-rejection.
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const src=fs.readFileSync('app/api/compose/route.ts','utf8')
const ast=ts.createSourceFile('route.ts',src,99,true)
const load=createOfflineLoader(), timeline=load('@/lib/cinematic/timelineContract')
let checks=0
const eq=(a,b)=>{assert.deepEqual(a===undefined?undefined:JSON.parse(JSON.stringify(a)),b);checks++}
function find(test){let result;function visit(n){if(!result&&test(n))result=n;ts.forEachChild(n,visit)}visit(ast);assert.ok(result);return result}
function evaluate(code,scope){const box={exports:{}};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:1,target:9}}).outputText,{exports:box.exports,...scope},{timeout:3000});return box.exports}
const json=(body,init={})=>new Response(JSON.stringify(body),{status:init.status??200,headers:{'Content-Type':'application/json'}})
const next={json}
const reasonList=['cinematic_timeline_too_short','scene_speech_exceeds_footage','cinematic_scene_metadata_invalid','cinematic_dialogue_unverified','cinematic_speech_missing','cinematic_voice_unavailable','cinematic_narration_unverified','requested_voice_unavailable']
const responseInitializer=find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='qualityFailureResponse').initializer.getText(ast)
const rejectDecl=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='rejectBeforeProviderSubmission').getText(ast)
for(const qualityCode of reasonList){
  for(const settled of [true,false]){
    const calls=[]
    const context={NextResponse:next,cinematicUpstreamDebited:true,composeAdmin:{},serviceRoleKey:'FIXTURE_ONLY',authenticatedUserId:'fixture',generationId:'fixture-generation',ownsSubmissionClaim:true,composeProviderAttempted:false,
      rejectCinematicQuality:async args=>{calls.push(args);return {refunded:settled,refundConfirmed:settled,claimReleased:settled,retryable:false,outcome:settled?'quality_rejected_refunded':'quality_rejection_support_pending'}},
      releaseGenerationClaim:async()=>{throw Error('Paid quality rejection must not DELETE the mutex')}}
    const module=evaluate(`const qualityFailureResponse=${responseInitializer}; export ${rejectDecl}`,context)
    const result=await module.rejectBeforeProviderSubmission(json({error:'Safe quality failure',code:qualityCode},{status:422}))
    const body=await result.json()
    eq(result.status,422);eq(body.qualityCheckFailed,true);eq(body.refunded,settled);eq(body.refundConfirmed,settled)
    eq(body.claimReleased,settled);eq(body.retryable,false);eq(body.generationId,'fixture-generation')
    eq(calls.length,1);eq(calls[0].ownsComposeClaim,true);eq(calls[0].composeProviderAttempted,false)
  }
}
// Existing non-quality failures retain their old pre-submit release policy.
let released=0
const ordinary=evaluate(`const qualityFailureResponse=${responseInitializer}; export ${rejectDecl}`,{NextResponse:next,cinematicUpstreamDebited:false,generationId:'fixture-generation',ownsSubmissionClaim:false,
  releaseGenerationClaim:async()=>released++,rejectCinematicQuality:async()=>{throw Error('Unexpected financial unwind')}})
eq((await ordinary.rejectBeforeProviderSubmission(json({error:'Bad URL'},{status:400}))).status,400);eq(released,1)
const noDebit=await (await ordinary.rejectBeforeProviderSubmission(json({error:'Clone unavailable',code:'requested_voice_unavailable'},{status:422}))).json()
eq(noDebit.noDebit,true);eq(noDebit.refunded,false)

// A terminal birth must never fall back into the old 409 polling loop.
const birthGuard=find(n=>ts.isIfStatement(n)&&n.expression.getText(ast)==="cinematicBirthClaim.status !== 'settled'").getText(ast)
for(const verified of [null,{refunded:true,refundConfirmed:true,claimReleased:true,retryable:false,reason:'cinematic_timeline_too_short'}]){
  const module=evaluate(`const qualityFailureResponse=${responseInitializer}; export async function run(){${birthGuard} return null}`,{NextResponse:next,generationId:'fixture-generation',cinematicBirthClaim:{status:'released'},composeAdmin:{},serviceRoleKey:'FIXTURE_ONLY',authenticatedUserId:'fixture',readVerifiedQualityRejection:async()=>verified})
  const response=await module.run(),body=await response.json()
  eq(response.status,422);eq(body.pending,undefined);eq(body.retryable,false);eq(body.refundConfirmed,!!verified)
}

// An early caller must not turn partial URL authorization into a quality
// failure/refund while an accepted Fal job remains in flight.
const terminalGuard=find(n=>ts.isIfStatement(n)&&n.expression.getText(ast)==='!cinematicJobsAreTerminal(cinematicBirthClaim)')
for(const terminal of [true,false]){
  let passed=0
  const module=evaluate(`export async function run(){${terminalGuard.getText(ast)} reachedPaidWork();return null}`,{NextResponse:next,cinematicBirthClaim:{},cinematicJobsAreTerminal:()=>terminal,reachedPaidWork:()=>passed++})
  const response=await module.run()
  eq(response?.status??200,terminal?200:409);eq(passed,terminal?1:0)
  if(response){const body=await response.json();eq(body.pending,true);eq(body.qualityCheckFailed,undefined);eq(body.refunded,undefined)}
}
// Code ordering is a supplement to executing the guard, not its substitute.
eq(terminalGuard.pos<src.indexOf('async function rejectBeforeProviderSubmission'),true)

// Execute the real duration-adjustment statements, not a copied trim function:
// narration must not invent extra footage via support loop or final-frame hold.
const advanced=find(n=>ts.isIfStatement(n)&&n.expression.getText(ast).includes("quality === 'cinematic_hollywood'")&&n.thenStatement.getText(ast).includes('const rawEngines'))
const statements=advanced.thenStatement.statements
const from=statements.findIndex(n=>ts.isForOfStatement(n)&&n.initializer.getText(ast)==='const m')
const to=statements.findIndex(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='narrationBlocks'))
assert.ok(from>=0&&to>from)
const adjustments=statements.slice(from,to).map(n=>n.getText(ast)).join('\n')
for(const sceneIdx of [0,5]){
  for(const dur of [3,12]){
    const clips=Array.from({length:6},()=>({engine:'support',seconds:10}))
    const module=evaluate(`export async function run(){${adjustments};return null}`,{...timeline,NextResponse:next,console:{log(){},warn(){}},quality:'cinematic_omni',duration:60,generationId:'fixture-generation',secondsOf:timeline.cinematicSceneSeconds,
      hollywoodClips:clips,originalFootageSeconds:clips.map(timeline.cinematicSceneSeconds),measured:[{sceneIdx,dur}],rejectBeforeProviderSubmission:async r=>r})
    const result=await module.run()
    eq(clips.every(c=>c.seconds<=10),true)
    eq(clips.reduce((s,c)=>s+c.seconds,0),60)
    eq(result?.status??200,dur>10?422:200)
    if(result)eq((await result.json()).reason,'scene_speech_exceeds_footage')
  }
}
// Execute the actual publication closure: neither the browser nor an old
// salvage response may supply proof that an unbound POST did not exist.
const generationSource=fs.readFileSync('app/api/generate-video-cinematic/route.ts','utf8')
const generationAst=ts.createSourceFile('generation.ts',generationSource,99,true)
let publishNode
function findPublisher(node){if(ts.isVariableDeclaration(node)&&node.name.getText(generationAst)==='publishCinematicResponse')publishNode=node.initializer;ts.forEachChild(node,findPublisher)}
findPublisher(generationAst);assert.ok(publishNode)
for(const uncertain of [true,false]){
  const cached=[],signed=[]
  const module=evaluate(`export const publish=${publishNode.getText(generationAst)}`,{
    cinematicSubmissionUncertain:uncertain,cinematicSubmissionCache:{set:(k,v)=>cached.push(v)},cacheKey:'fixture-cache',
    claimFingerprint:'fixture-fingerprint',cost:25,claimQuality:'cinematic_ai',claimEngine:'fixture-engine',
    cinematicAdmin:{},serviceRoleKey:'fixture',user:{id:'fixture-user'},generationId:'fixture-generation',
    completeCinematicClaim:async value=>{signed.push(value);return {ok:true,claim:{}}},
    settleDebitAndRespond:async (_,response)=>json(response),NextResponse:next,
  })
  const response=await module.publish({submission_uncertain:!uncertain},['fixture-request',null],['fixture-model','fixture-model'])
  eq((await response.json()).submission_uncertain,uncertain)
  eq(cached[0].response.submission_uncertain,uncertain);eq(signed[0].response.submission_uncertain,uncertain)
}
console.log(`${checks} route-integration checks passed; actual failure/replay/footage/publication statements; no network, no refund, no provider.`)
