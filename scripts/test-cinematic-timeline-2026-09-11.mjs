// Offline: real timeline policy and real Creatomate builder. No credentials or I/O providers.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const nativeRequire = createRequire(import.meta.url)
let checks = 0
const eq = (a,b,m) => { assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m); checks++ }
const ok = (a,m) => { assert.ok(a,m); checks++ }
const forbidden = () => { throw Error('Network, database and provider calls are forbidden') }
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const box = { exports: {} }; cache.set(file,box.exports)
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9,esModuleInterop:true}}).outputText
  vm.runInNewContext(code,{
    exports:box.exports, module:box, Buffer, URL, URLSearchParams, TextEncoder,
    process:{env:{}}, console:{log(){},warn(){},error(){}}, fetch:forbidden,
    setTimeout:forbidden, clearTimeout(){},
    require(id){
      if(id==='node:crypto'||id==='crypto')return nativeRequire(id)
      if(id==='openai')return {__esModule:true,default:class{constructor(){forbidden()}},toFile:forbidden}
      if(id==='@supabase/supabase-js')return {createClient:forbidden}
      if(id==='server-only')return {}
      const base=id.startsWith('@/')?id.slice(2):id.startsWith('.')?path.join(path.dirname(file),id):null
      if(!base)throw Error('Unexpected import '+id)
      for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return load(base+ext)
      throw Error('Missing dependency '+base)
    },
  },{timeout:10000})
  return box.exports
}
const policy=load('lib/cinematic/timelineContract.ts')
const builder=load('lib/compose.ts').buildHollywoodCreatomateSource
// Native fixtures include observed audio, so this suite isolates timeline
// arithmetic without bypassing the integrated speech contract.
const scene=(seconds,engine='support')=>({url:'https://fixture.invalid/scene.mp4',seconds,engine,caption:'',
  ...(['host','dialogue'].includes(engine)?{dialogueLine:'Hello',speechWords:[{word:'Hello',start:0.1,end:0.5}]}:{})})
for (const target of [35,60,90]) {
  const scenes=Array.from({length:Math.ceil(target/10)},(_,i)=>scene(Math.min(10,target-i*10)))
  const snapshot=JSON.stringify(scenes)
  for(let i=0;i<scenes.length;i++)scenes[i].seconds=policy.trimNarratedSupport(scenes,i,3,target)
  eq(JSON.stringify(scenes),snapshot,'No spare footage: no shrink below selected duration')
  const source=builder({clips:scenes,narrationBlocks:[],requestedDuration:target})
  eq(source.duration,target,'Actual builder preserves requested duration')
  eq(source.elements.filter(x=>x.type==='video').length,scenes.length,'No synthetic padding scene')
}
const spare=Array.from({length:7},()=>scene(10))
for(let i=0;i<spare.length;i++)spare[i].seconds=policy.trimNarratedSupport(spare,i,3,60)
eq(spare.reduce((s,c)=>s+c.seconds,0),60,'Trimming can consume only real excess above floor')
for(const seconds of [[10,10,10,10,6,7],[10,10,10,10,6,7,6],[10,10,10,10]]){
  const scenes=seconds.map(s=>scene(s)),before=JSON.stringify(scenes)
  assert.throws(()=>builder({clips:scenes,narrationBlocks:[],requestedDuration:60}),/cinematic_timeline_too_short/);checks++
  eq(JSON.stringify(scenes),before,'Short real case rejected without padding or mutation')
}
const wordLine=Array(15).fill('word').join(' ')
const planned=[10,10,10,10,6,7,6].map(seconds=>({type:'support',seconds,voiceover:wordLine}))
const fitted=policy.fitCinematicPlanFloor(planned,60,10)
eq(fitted.reduce((s,c)=>s+c.seconds,0),60,'59-second real plan becomes 60 seconds of provider footage before submission')
eq(planned.reduce((s,c)=>s+c.seconds,0),59,'Source plan unchanged by pure allocator')
ok(fitted.every(c=>c.seconds<=10),'Omni never exceeds its real 10s cap')
const sparse=[{type:'support',seconds:4,voiceover:'A short line.'}]
eq(policy.fitCinematicPlanFloor(sparse,60,10),sparse,'No mute payoff fabricated for insufficient story')
eq(policy.fitCinematicPlanFloor([{type:'dialogue',seconds:5,voiceover:wordLine}],60,15)[0].seconds,5,'Native speech never stretched')
const signed={scene_engines:['dialogue','support','host'],scene_seconds:[7,9,11],scene_narrations:[null,'middle',null],scene_dialogues:['hook',null,'payoff'],scene_captions:['a','b','c']}
const aligned=policy.signedSceneMetadata(signed,['a',null,'c'],['a','c'])
for(const broken of [{}, {...signed,scene_seconds:[7]}, {...signed,scene_seconds:[7,9,null]}, {...signed,scene_engines:['dialogue','support','fake']}, {...signed,scene_dialogues:undefined}]) {
  assert.throws(()=>policy.signedSceneMetadata(broken,['a',null,'c'],['a','c'],true),/metadata_invalid/);checks++
}
eq(policy.signedSceneMetadata(signed,['a',null,'c'],['a','c'],true).scene_seconds,[7,11],'Complete signed metadata accepted; never default missing scene duration')
eq(aligned.scene_seconds,[7,11],'Cron missing middle scene retains original timeline indexes')
eq(aligned.scene_dialogues,['hook','payoff'],'Missing middle scene cannot erase payoff speech')
eq(aligned.scene_engines,['dialogue','host'],'Native speech ownership preserved')
assert.throws(()=>policy.signedSceneMetadata(signed,['a',null,'c'],['c','a']),/alignment/);checks++
assert.throws(()=>policy.signedSceneMetadata(signed,['a',null,'c'],['a','private']),/alignment/);checks++
const first=builder({clips:[scene(10,'host'),scene(10)],narrationBlocks:[],requestedDuration:20})
const firstVideo=first.elements.find(x=>x.type==='video')
eq(firstVideo.time,0,'Hook begins at frame zero')
ok(!firstVideo.enter_transition,'First face and word are not hidden by a fade from black')
eq(firstVideo.duration,10,'Native speech does not extend under the next scene')
const long=builder({clips:Array.from({length:10},()=>scene(10,'dialogue')),narrationBlocks:[],requestedDuration:90})
eq(long.duration,100,'Final native payoff is not cut by the former 90s ceiling')

// Execute the actual route's descent decision (AST, no copied implementation).
const route=fs.readFileSync('app/api/generate-video-cinematic/route.ts','utf8')
const sf=ts.createSourceFile('route.ts',route,99,true)
let decision
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='degrau')decision=n.initializer.getText(sf);ts.forEachChild(n,visit)}
visit(sf);ok(!!decision,'Decision exists in actual submission route')
const fit=load('lib/narrationFit.ts')
for(const consent of [undefined,false,'true',true]){
  let calls=0
  const result=vm.runInNewContext(decision,{body:{allow_shorter_duration:consent},verbatim:true,parsedScript:{narration:Array(110).fill('word').join(' ')},requestedDuration:60,hollywoodPath:true,
    AUTOFIT_DOWN_FLOOR_SECONDS:fit.AUTOFIT_DOWN_FLOOR_SECONDS,AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD:fit.AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD,
    autofitDown:(...args)=>{calls++;return fit.autofitDown(...args)}})
  eq(calls,consent===true?1:0,'Only explicit boolean consent can shorten requested duration')
  if(consent!==true)eq(result,null,'Normal request keeps duration and existing author-review path')
}
console.log(`${checks} timeline checks passed; provider calls 0; no render, DB, or secrets.`)
