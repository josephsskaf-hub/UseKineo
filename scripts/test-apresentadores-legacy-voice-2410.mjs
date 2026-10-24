// KINEO-APRESENTADORES-2410 — complete real legacy voice function, not a duplicate dispatch model.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = path.resolve(process.argv[2] ?? process.cwd()); process.chdir(root)
const file = 'lib/ads/v2Advance.ts', read = name => readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n')
const current = read(file), base = execFileSync('git',['show','1c078ed013302ac47c42f783305df688c4e97cfd:'+file],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:64<<20}).replace(/\r\n/g,'\n')
const load = createOfflineLoader(), T = load('@/lib/textLanguage'), V = load('@/lib/ads/presenterVoice2410')
const candidates = JSON.parse(read('lib/ads/presenterCandidates2410.json'))
const ids = ['liana','mateo','zuri','omar','meilin','diego','priya','samir','elena','joao','naomi','tariq']
assert(ids.every(id => candidates.some(c => c.id === id)), 'the initial prepared batch remains in a growing catalog')
const legacy = ['sofia','amara','rahul','kenji','jade','robert'], men = new Set(['rahul','kenji','robert'])
const plain = value => JSON.parse(JSON.stringify(value))
function compiled(source,name) {
  const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
  const node = ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)
  assert.ok(node,'complete production function exists: '+name)
  return ts.transpileModule(node.getText(ast).replace(/^export\s+/u,'')+`; exports.invoke=${name};`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
}
const codeCache = new Map()
function world(source,{id,language='pt',pv=false,fail=false,close=false}={}) {
  const calls=[],exports={},gender=men.has(id)?'man':'woman'
  const oldLib={
    adsV2PresenterV2VoiceFor:(lang,g)=>lang==='pt'&&g==='woman'?{engine:'minimax',model:'fal-ai/minimax/speech-2.8-hd',voiceId:'Portuguese_ConfidentWoman',languageBoost:'Portuguese',speed:1}:{engine:'current'},
    adsV2PresenterV2VoiceIdOf:(lang,g,voice)=>lang==='pt'&&g==='woman'?'minimax:Portuguese_ConfidentWoman':voice?.engine==='eleven'?'eleven:'+voice.voice:'minimax:default',
  }
  const bindings={
    exports,console:{warn(){}},
    narrationLanguage:T.narrationLanguage,
    adsV2CloseRealOf:plan=>plan.close,
    adsV2PresenterPlanOf:plan=>plan.presenter,
    presenterV2Lib:async()=>oldLib,
    presenterV2Of:async()=>{calls.push(['v2Lookup']);return pv?{lib:oldLib,v2:{entryId:id,gender}}:null},
    adsV2PresenterVoiceOf:presenter=>men.has(presenter)?{engine:'eleven',voice:presenter==='rahul'?'Brian':'Daniel'}:{engine:'minimax'},
    synthesizeTtsFallback:async(text,ctx)=>{calls.push(['default',text,ctx]);return Buffer.from('default')},
    synthesizeElevenVoice:async(text,voice,ctx)=>{calls.push(['eleven',text,voice,ctx]);if(fail)throw Error('offline-provider-failed');return Buffer.from('eleven')},
    require:name=>{
      if(name==='./presenterCandidates2410')return {presenterCandidateById2410:id=>candidates.find(c=>c.id===id)??null}
      if(name==='./presenterVoice2410')return V
      if(name==='@/lib/avatar/voice')return {synthesizeWithVoice:async args=>{calls.push(['explicit',plain(args)]);if(fail)throw Error('offline-provider-failed');return Buffer.from('explicit')}}
      throw Error('offline: unexpected import '+name)
    },
  }
  const invoke=name=>{
    const key=source+'\0'+name
    if(!codeCache.has(key))codeCache.set(key,compiled(source,name))
    const scoped={...bindings,exports:{}}
    vm.runInNewContext(codeCache.get(key),scoped,{timeout:5000})
    return scoped.exports.invoke
  }
  return {voice:invoke('adsV2NarrationVoice'),identity:invoke('adsV2NarrationVoiceId'),calls,order:{id:'offline-order',user_id:'offline-user',generation_id:'offline-generation',language,tier:pv?'commercial':'premium',plan:{presenter:{presenterId:id},close}}}
}
async function candidateContract(source) {
  for(const candidate of candidates)for(const row of T.NARRATION_LANGUAGES.filter(l=>l.minimaxBoost))for(const fallback of [false,true]){
    const w=world(source,{id:candidate.id,language:row.code,pv:false})
    assert.equal((await w.voice(w.order,'Complete narration.',fallback)).toString(),'explicit')
    assert.deepEqual(plain(w.calls),[['explicit',{text:'Complete narration.',...plain(V.presenterCandidateVoice2410(candidate,row.code))}]],candidate.id+'/'+row.code+': non-v2 styles dispatch explicit voice without touching legacy providers')
    w.calls.length=0
    assert.equal(await w.identity(w.order),'minimax:'+V.presenterCandidateVoice2410(candidate,row.code).voiceId)
    assert.equal(w.calls.length,0,'audit identity resolves candidate without v2 lookup or a provider')
  }
  for(const pv of [false,true])for(const fallback of [false,true]){
    const w=world(source,{id:'joao',language:'ja',pv,fail:true})
    await assert.rejects(w.voice(w.order,'Preserve the selected male voice.',fallback),/offline-provider-failed/)
    assert.equal(w.calls.length,1,'candidate failures never call default, ElevenLabs or legacy v2 dispatch')
    assert.equal(w.calls[0][0],'explicit')
  }
  const speed=world(source,{id:'mateo',language:'pt'})
  await speed.voice(speed.order,'Measured speed correction.',false,1.08)
  assert.equal(speed.calls[0][1].speed,1.08,'the measured legacy speed override retains candidate voice and model')
}
await candidateContract(current)
for(const id of legacy)for(const pv of [false,true])for(const language of ['en','pt','es','ja'])for(const fallback of [false,true])for(const fail of [false,true]){
  const before=world(base,{id,pv,language,fail}),after=world(current,{id,pv,language,fail})
  const result=async w=>{try{return {audio:(await w.voice(w.order,'Unchanged legacy narration.',fallback)).toString(),calls:plain(w.calls)}}catch(error){return {error:error.message,calls:plain(w.calls)}}}
  assert.deepEqual(await result(after),await result(before),'old presenter behavior stays equivalent: '+[id,pv,language,fallback,fail].join('/'))
  assert.equal(await after.identity(after.order),await before.identity(before.order))
}
// Close-real has no presenter; a stray id must not override its established voice route.
const beforeClose=world(base,{id:'joao',close:true}),afterClose=world(current,{id:'joao',close:true})
assert.equal((await beforeClose.voice(beforeClose.order,'Close.',true)).toString(),(await afterClose.voice(afterClose.order,'Close.',true)).toString())
assert.deepEqual(plain(beforeClose.calls),plain(afterClose.calls))
await assert.rejects(candidateContract(base),{code:'ERR_ASSERTION'},'removing the candidate dispatch reproduces the default/female regression')
console.log('ok complete legacy voice: 12 candidates × 37 languages × both fallback modes without v2; audit ids, speed override and failure propagation; six old presenters match origin/main across success/failure; close-real unchanged; baseline mutant rejected; zero network/paid calls')
