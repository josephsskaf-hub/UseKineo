// Execute real GET handlers and browser transport with controlled I/O; no network or addresses logged.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {offlineModules,source} from './gpt24h-offline-support.mjs'
const req=createRequire(process.cwd()+'/package.json'),ts=req('typescript')
const BOX='app/api/citations/film-visibility/route.ts',CLIP='app/api/account/clip-visibility/route.ts',NAV='app/api/account/create-visibility/route.ts',CONFIG='lib/growth/citationFilmRelease.ts',TRANSPORT='lib/auth/readServerVisibility.ts',CLIENT='lib/growth/citationFilmVisibilityClient.ts'
const house=offlineModules()('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS
const actor={id:'actor-house',email:house[0],email_confirmed_at:'fixture'}
const external={id:'actor-buyer',email:'outside'+'@'+'buyer.invalid',email_confirmed_at:'fixture'}
const legacyPattern={id:'actor-legacy',email:'test-visibility'+'@'+'buyer.invalid',email_confirmed_at:'fixture'}
const fakeNext="const NextResponse={json:(body,init)=>({body,headers:init?.headers??{}})}"
function world({release='internal',configSource,user=actor,error=null,throws=false,clipPublic=true,clipRelease='public',joinedRelease='public',recreateRelease='public',shellRelease='public'}={}){
 let reads=0
 const replace=(file,name,value)=>source(file).replace(new RegExp('('+name+':?[^=\\n]*=\\s*)[\\x27\\x22](off|internal|public)[\\x27\\x22]'),(_,a)=>a+JSON.stringify(value))
 const rep=Object.fromEntries([BOX,CLIP,NAV].map(f=>[f,source(f).replace("import { NextResponse } from 'next/server'",fakeNext)]))
 // KINEO-CITACOES-PUBLIC-2411: o padrão agora é 'public'; a troca casa qualquer valor e confere a âncora (nunca no-op calado).
 rep[CONFIG]=(configSource??source(CONFIG)).replace(/(CITATION_FILM_RELEASE: CitationFilmRelease = )'(?:off|internal|public)'/,"$1'"+(release??'__keep__')+"'")
 if(release===null)rep[CONFIG]=configSource??source(CONFIG)
 else assert.ok(rep[CONFIG].includes("CITATION_FILM_RELEASE: CitationFilmRelease = '"+release+"'"),'RELEASE override anchor')
 rep['lib/clips/clipLaunch.ts']=source('lib/clips/clipLaunch.ts').replace(/(export const CLIPS_PUBLIC\s*=\s*)(true|false)/,(_,a)=>a+String(clipPublic))
 rep['lib/create/clipNaMolduraRelease.ts']=replace('lib/create/clipNaMolduraRelease.ts','CREATE_CLIP_INPLACE',clipRelease)
 rep['lib/create/release.ts']=replace('lib/create/release.ts','CLIP_RECREATE_JUNTOS_RELEASE',joinedRelease);rep['lib/create/release.ts']=rep['lib/create/release.ts'].replace(/(CREATE_SHELL_RELEASE:[^=\n]*=\s*)['"](off|internal|public)['"]/,(_,a)=>a+JSON.stringify(shellRelease))
 rep['lib/recreate/release.ts']=replace('lib/recreate/release.ts','RECREATE_RELEASE',recreateRelease)
 const l=offlineModules({replacements:rep,mocks:{'lib/supabase/server.ts':{createClient:()=>({auth:{getUser:async()=>{reads++;if(throws)throw Error('fixture unavailable');return{data:{user},error}}}})}}})
 return{l,reads:()=>reads}
}
function response(result,expected,message){
 assert.deepEqual(JSON.parse(JSON.stringify(result.body)),expected,message)
 for(const value of Object.values(result.body))assert.equal(typeof value,'boolean','response contains booleans only')
 assert.ok(result.headers['Cache-Control'].includes('private')&&result.headers['Cache-Control'].includes('no-store'),'private uncached response')
 assert.ok(result.headers.Vary.includes('Cookie'),'response varies by auth cookie')
}
let checks=0
// DEFAULT (virada 24/11): sem cookie e sem user_id o GET real devolve visible:true e não lê auth. Mutantes do padrão têm de morrer aqui.
async function defaultPublic(configSource){
 const w=world({release:null,configSource,throws:true}),r=await w.l(BOX).GET({url:'https://local.invalid/api/citations/film-visibility'})
 assert.equal(w.l(CONFIG).CITATION_FILM_RELEASE,'public','DEFAULT film release public')
 response(r,{visible:true},'DEFAULT guest visible without cookie');assert.equal(w.reads(),0,'DEFAULT no auth read');checks++
}
await defaultPublic()
const defaultMutants=[['default back to internal',"'internal'"],['default back to off',"'off'"]]
for(const[name,value]of defaultMutants){
 const s=source(CONFIG),a="CITATION_FILM_RELEASE: CitationFilmRelease = 'public'";assert.equal(s.split(a).length,2,'unique mutant anchor')
 await assert.rejects(()=>defaultPublic(s.replace(a,"CITATION_FILM_RELEASE: CitationFilmRelease = "+value)),e=>e?.code==='ERR_ASSERTION'&&e.message.startsWith('DEFAULT film release public'),'mutant '+name)
 console.log('PASS mutant '+name+' -> DEFAULT film release public')
}
for(const release of ['off','public']){
 const w=world({release,throws:true}),r=await w.l(BOX).GET({url:'https://local.invalid/api/citations/idea-visibility'})
 response(r,{visible:release==='public'},'public/off visibility from configuration');assert.equal(w.reads(),0,'public/off no auth read');checks++
}
for(const[user,id,expected]of[[actor,actor.id,true],[{...actor,email:' '+actor.email.toUpperCase()+' '},actor.id,true],[{...actor,email_confirmed_at:null},actor.id,false],[external,external.id,false],[legacyPattern,legacyPattern.id,false],[{...external,user_metadata:{email:house[0]}},external.id,false],[actor,'other-actor',false],[null,'actor-house',false]]){
 const w=world({user}),r=await w.l(BOX).GET({url:'https://local.invalid/api/citations/idea-visibility?user_id='+encodeURIComponent(id)})
 response(r,{visible:expected},'private GET binds verified identity and exact membership');assert.equal(w.reads(),1,'private GET reads verified auth once');checks++
}
for(const options of [{error:Error('fixture invalid')},{throws:true}]){
 const w=world(options),r=await w.l(BOX).GET({url:'https://local.invalid/api/citations/idea-visibility?user_id='+actor.id});response(r,{visible:false},'auth failure closes idea preview');checks++
}
for(const url of ['https://local.invalid/api/citations/idea-visibility','https://local.invalid/?user_id='+'x'.repeat(129),'not-a-url']){
 const w=world(),r=await w.l(BOX).GET({url});response(r,{visible:false},'missing invalid or oversized identity closes preview');assert.equal(w.reads(),0,'invalid identity not sent to auth');checks++
}
for(const[options,expected,reads]of[[{clipPublic:true,throws:true},true,0],[{clipPublic:false,user:actor},true,1],[{clipPublic:false,user:external},false,1],[{clipPublic:false,user:legacyPattern},true,1],[{clipPublic:false,user:null},false,1],[{clipPublic:false,error:Error('fixture invalid')},false,1],[{clipPublic:false,throws:true},false,1]]){
 const w=world(options);response(await w.l(CLIP).GET(),{visible:expected},'existing Clips eligibility retained');assert.equal(w.reads(),reads,'Clips auth reads');checks++
}
const navCases=[
 [{user:actor},{showClip:true,showRecreate:false}],
 [{user:external},{showClip:true,showRecreate:false}],
 [{user:null},{showClip:false,showRecreate:true}],
 [{clipPublic:false,user:actor},{showClip:true,showRecreate:false}],
 [{clipPublic:false,user:external},{showClip:false,showRecreate:true}],
 [{clipPublic:false,user:legacyPattern},{showClip:true,showRecreate:false}],
 [{clipRelease:'internal',user:actor},{showClip:true,showRecreate:false}],
 [{clipRelease:'internal',user:external},{showClip:false,showRecreate:true}],
 [{clipRelease:'internal',user:legacyPattern},{showClip:false,showRecreate:true}],
 [{clipRelease:'off',user:actor},{showClip:false,showRecreate:true}],
 [{shellRelease:'off',user:actor},{showClip:false,showRecreate:true}],
 [{joinedRelease:'internal',user:actor},{showClip:true,showRecreate:false}],
 [{joinedRelease:'internal',user:external},{showClip:true,showRecreate:true}],
 [{joinedRelease:'off',user:actor},{showClip:true,showRecreate:true}],
 [{recreateRelease:'internal',user:external},{showClip:true,showRecreate:false}],
 [{error:Error('fixture invalid')},{showClip:false,showRecreate:false}],
 [{throws:true},{showClip:false,showRecreate:false}],
]
for(const[options,expected]of navCases){const w=world(options);response(await w.l(NAV).GET(),expected,'creation navigation mirrors existing authenticated predicates');checks++}
// Actual browser-safe read transport, with fetch as the only substituted I/O.
function transport(fakeFetch){
 const module={exports:{}},code=ts.transpileModule(source(TRANSPORT),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports,fetch:fakeFetch},{filename:TRANSPORT});return module.exports.readServerVisibility
}
for(const value of [{visible:true},{visible:false},null,[],true,'true',42]){
 let called=0
 const read=transport(async(url,options)=>{called++;assert.equal(url,'/api/fixture','local target preserved');assert.equal(options.method,'GET','read-only method');assert.equal(options.credentials,'same-origin','same-origin cookies only');assert.equal(options.cache,'no-store','no stale access cache');return{ok:true,json:async()=>value}})
 const result=await read('/api/fixture')
 assert.equal(JSON.stringify(result),JSON.stringify(value&&typeof value==='object'&&!Array.isArray(value)?value:null),'transport validates object shape');assert.equal(called,1);checks++
}
for(const mode of ['http','json','network']){
 const read=transport(async()=>{if(mode==='network')throw Error('fixture unavailable');return{ok:mode!=='http',json:async()=>{throw Error('fixture invalid JSON')}}});assert.equal(await read('/api/fixture'),null,'transport errors close visibility');checks++
}
for(const value of [{visible:true},{visible:false},{visible:'true'},{},null]){
 let request
 const l=offlineModules({mocks:{[TRANSPORT]:{readServerVisibility:async url=>{request=url;return value}}}})
 assert.equal(await l(CLIENT).citationFilmServerVisible('actor + / ?'),value?.visible===true,'client accepts strict server boolean only')
 assert.equal(new URL(request,'https://local.invalid').searchParams.get('user_id'),'actor + / ?','identity encoded intact');checks++
}
if(process.env.KINEO_CITATION_SERVER_PROOF)fs.writeFileSync(process.env.KINEO_CITATION_SERVER_PROOF,JSON.stringify({checks,scope:'Real server GETs and client transport with fake getUser/fetch only; no network, account, rendering or payment; protected identifiers never written',box:BOX,clip:CLIP,navigation:NAV,transport:TRANSPORT},null,2))
console.log('PASS '+checks+' real GET/transport cases ('+defaultMutants.length+' default mutants killed): boolean-only responses, verified binding, exact idea membership, unchanged legacy decisions, no-store and strict payloads. No addresses logged.')
