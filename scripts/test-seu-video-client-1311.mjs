// Real browser-service methods, injected HTTP only. No account, storage service,
// credentials, provider, API or paid generation is contacted by this test.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]}
const ROOT=path.resolve(arg('--root',path.join(path.dirname(fileURLToPath(import.meta.url)),'..')))
const require=createRequire(path.join(path.resolve(arg('--deps',ROOT)),'package.json'))
const ts=require('typescript')
const RULES='lib/recreate/seuVideoRules.ts',PRESENTATION='lib/recreate/seuVideoPresentation.ts',CLIENT='lib/recreate/seuVideoClient.ts',raw=new Map(),compiled=new Map()
// Read the requested runtime tree only. A missing dependency must fail instead
// of silently testing an older Git snapshot or another worktree.
const read=rel=>{if(!raw.has(rel)){const file=path.join(ROOT,rel);if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new Error('Missing runtime file: '+rel);raw.set(rel,fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'))}return raw.get(rel)}
function world(overrides={}){
  const cache=new Map();let accidental=0
  const load=rel=>{
    if(cache.has(rel))return cache.get(rel).exports
    const module={exports:{}};cache.set(rel,module)
    const source=Object.hasOwn(overrides,rel)?overrides[rel]:read(rel),key=rel+'\0'+source
    if(!compiled.has(key))compiled.set(key,ts.transpileModule(source,{fileName:rel,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)
    const shim=id=>{if(id==='server-only')return{};const name=id.startsWith('@/')?id.slice(2):id.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(rel),id)):null;if(!name||/server|supabase|\/api\//.test(name))throw Error('Forbidden dependency '+id);return load(name.endsWith('.ts')?name:name+'.ts')}
    vm.runInNewContext(compiled.get(key),{module,exports:module.exports,require:shim,process:{env:Object.freeze({})},File,Blob,FormData,URL,URLSearchParams,Response,AbortController,Uint8Array,Object,Promise,Map,WeakMap,WeakSet,Set,Number,String,Array,Math,JSON,Error,TypeError,fetch(){accidental++;throw Error('Uninjected network forbidden')},console},{filename:rel})
    return module.exports
  }
  return{load,get loaded(){return[...cache.keys()]},get accidental(){return accidental}}
}
let checks=0
function ok(condition,message){checks++;if(!condition)throw new assert.AssertionError({message})}
async function errorOf(C,run,code,message){let error;try{await run()}catch(e){error=e}ok(error instanceof C.SeuVideoClientError&&error.code===code,message);return error}
const u32=(b,o,n)=>b.writeUInt32BE(n>>>0,o)
const box=(name,...parts)=>{const payload=Buffer.concat(parts),b=Buffer.alloc(payload.length+8);u32(b,0,b.length);b.write(name,4);payload.copy(b,8);return b}
function video({seconds=7,fps=30,width=540,height=960,mime='video/mp4',name='reference.mp4'}={}){
  const tkhd=Buffer.alloc(24);u32(tkhd,16,width*65536);u32(tkhd,20,height*65536)
  const mdhd=Buffer.alloc(20);u32(mdhd,12,1000);u32(mdhd,16,Math.round(seconds*1000))
  const hdlr=Buffer.alloc(12);hdlr.write('vide',8)
  const stts=Buffer.alloc(16);u32(stts,4,1);u32(stts,8,Math.max(1,Math.round(seconds*fps)));u32(stts,12,1)
  const content=box('moov',box('trak',box('tkhd',tkhd),box('mdia',box('mdhd',mdhd),box('hdlr',hdlr),box('minf',box('stbl',box('stts',stts))))))
  return new File([content],name,{type:mime})
}
const photo=(name='person.jpg',type='image/jpeg')=>new File([new Uint8Array([255,216,255,0])],name,{type})
const API='/api/recreate/seu-video',ID='00000000-0000-4000-8000-000000000001'
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
function transport(options={}){
  const calls=[];let photoNo=0,generateNo=0
  const fetch=async(url,init={})=>{
    const method=init.method??'GET',body=typeof init.body==='string'?JSON.parse(init.body):init.body
    calls.push({url,method,body,headers:init.headers,credentials:init.credentials,signal:init.signal})
    const fail=options.errors?.[url]
    if(fail)return json(fail.body??{error:'Fixture refusal'},fail.status)
    if(url===API+'/upload')return options.badTicket?json({ok:true}):json({ok:true,video_path:'recreate-uploads/account/'+ID+'.mp4',upload_url:'https://storage.example/upload/signed?token=fixture',token:'fixture-token',bucket:'renders'})
    if(url==='https://storage.example/upload/signed?token=fixture')return new Response(null,{status:options.putStatus??200})
    if(url===API+'/check')return json({ok:true,seconds:7,fps:30,width:540,height:960,bytes:200,generated_seconds:7,aspect_ratio:'9:16',credits:40,prompt:options.prompt??'Recreate @Video1. Person one becomes @Image1.',balance:100,shortfall:0,needs_plan:false,...options.check})
    if(url==='/api/avatar/upload')return json({url:'https://storage.example/storage/v1/object/public/avatars/account/photo-'+(++photoNo)+'.jpg'})
    if(url===API){generateNo++;if(options.firstGenerateNetwork&&generateNo===1)throw new TypeError('connection lost');return json({clip:options.badClip?{}:{id:ID,status:'pending'},replay:generateNo>1})}
    if(url.startsWith('/api/recreate/status?'))return json({clip:{id:ID,status:'processing',...options.status}})
    throw Error('Unexpected request '+url)
  }
  return{fetch,calls}
}
const count=(t,url)=>t.calls.filter(c=>c.url===url).length
const input=(C,checked,photos=[photo()])=>({checked,photos,prompt:C.defaultSeuVideoPrompt(photos.length),consent:true,key:'seu-video-request-0001',confirmedCredits:checked.credits})
async function prepared(C,opts={},people=1){const t=transport(opts),client=C.createSeuVideoClient({fetch:t.fetch,preparePhoto:async f=>f}),checked=await client.prepareSeuVideo({file:video(),people});return{t,client,checked}}

async function verify(overrides={}){
  const W=world(overrides),C=W.load(CLIENT)
  ok(!W.loaded.includes('lib/recreate/seuVideo.ts')&&!W.loaded.includes(PRESENTATION),'browser dependency graph excludes provider module')
  const rules=W.load('lib/recreate/seuVideo.ts'),safe=W.load(RULES)
  ok(!Object.keys(safe).some(k=>/MODEL|MOTOR|USD|custoFal|entradaSeedance|entradaKling|RELEASE/.test(k)),'browser rules expose no provider model or supplier price')
  const empty=transport(),idle=C.createSeuVideoClient({fetch:empty.fetch})
  ok(empty.calls.length===0&&W.accidental===0,'initialization performs no endpoint calls')
  for(const seconds of[2,7,10,10.6,15])ok(C.estimateSeuVideoCredits(seconds)===rules.creditosDoSeuVideo(rules.segundosGerados(seconds)),'pricing comes from shared helper')
  ok(C.estimateSeuVideoCredits(1.9)===null&&C.estimateSeuVideoCredits(15.1)===null,'estimate rejects duration outside limits')
  ok(C.defaultSeuVideoPrompt(3).includes('@Image3')&&C.defaultSeuVideoPrompt(1)===rules.promptPadrao(1),'prompt comes from shared helper')
  await C.validateSeuVideoFile(video())
  await C.validateSeuVideoFile(video({mime:'',name:'PHONE.MOV'}))
  await C.validateSeuVideoFile(video({fps:15}))
  ok(empty.calls.length===0&&W.accidental===0,'local metadata and fps do not call server')
  for(const file of[video({seconds:1.9}),video({seconds:15.1})])await errorOf(C,()=>C.validateSeuVideoFile(file),'duration','local duration rejected')
  await errorOf(C,()=>C.validateSeuVideoFile(video({mime:'video/webm',name:'a.webm'})),'format','WebM rejected locally')
  await errorOf(C,()=>C.validateSeuVideoFile(new File(['not an ISO container'],'x.mp4',{type:'video/mp4'})),'format','unreadable container rejected locally')
  const large={size:100*1024*1024+1,type:'video/mp4',name:'large.mp4'}
  await errorOf(C,()=>idle.prepareSeuVideo({file:large,people:1}),'size','oversize rejects before upload')
  ok(empty.calls.length===0,'local invalid file never requests upload')
  for(const photos of[[],[photo(),photo(),photo(),photo()],[new File(['x'],'bad.gif',{type:'image/gif'})]])await errorOf(C,()=>C.validateSeuVideoPhotos(photos),photos.length>0&&photos.length<=3?'photo_format':'photos','local photo constraints')

  const {t,client,checked}=await prepared(C)
  ok(t.calls.map(c=>c.method+' '+c.url).join('|')==='POST '+API+'/upload|PUT https://storage.example/upload/signed?token=fixture|POST '+API+'/check','signed upload order is POST PUT check')
  ok(t.calls[0].body.content_type==='video/mp4'&&t.calls[0].body.bytes>0&&t.calls[1].body instanceof File&&t.calls[1].credentials==='omit','signed upload sends file without account credentials')
  ok(t.calls[2].body.video_path===checked.video_path&&t.calls[2].body.people===1&&Object.isFrozen(checked)&&checked.balance===100&&checked.needs_plan===false,'checked quote retains authority and account fields')
  const changed=await prepared(C,{check:{credits:53,prompt:'Authoritative @Video1 @Image1 prompt'}})
  ok(changed.checked.credits===53&&changed.checked.prompt==='Authoritative @Video1 @Image1 prompt','server check controls price and prefilled prompt')
  const before=changed.t.calls.length
  await errorOf(C,()=>changed.client.generateSeuVideo({...input(C,changed.checked),confirmedCredits:40}),'cost_changed','changed cost requires new confirmation before photos')
  ok(changed.t.calls.length===before,'cost mismatch sends no photos or generation')
  await changed.client.generateSeuVideo(input(C,changed.checked))
  ok(count(changed.t,API)===1,'new confirmed checked price permits generation')
  ok(changed.t.calls.find(c=>c.url===API).body.prompt_edited===true,'edited prompt telemetry reflects actual difference from checked instruction')
  await errorOf(C,()=>client.generateSeuVideo({...input(C,checked),checked:{...checked}}),'check_required','only issued checked object can generate')

  const files=[photo('one.jpg'),photo('two.jpg')],two=await prepared(C,{check:{prompt:C.defaultSeuVideoPrompt(2)}},2),twoInput=input(C,two.checked,files)
  await Promise.all([two.client.generateSeuVideo(twoInput),two.client.generateSeuVideo(twoInput)])
  await two.client.generateSeuVideo(twoInput)
  ok(count(two.t,API)===1&&count(two.t,'/api/avatar/upload')===2,'same concurrent and completed key never resubmits')
  const forms=two.t.calls.filter(c=>c.url==='/api/avatar/upload')
  ok(forms.every(c=>c.body instanceof FormData&&c.body.get('purpose')==='animate'&&c.body.get('rights')==='true'&&c.body.get('file') instanceof File),'photos reuse own-account animate upload contract')
  const posted=two.t.calls.find(c=>c.url===API)
  ok(posted.body.prompt_edited===false,'unchanged prompt telemetry stays false')
  ok(posted.headers['idempotency-key']===twoInput.key&&posted.body.video_path===two.checked.video_path&&posted.body.photos.length===2&&posted.body.consent===true&&!('engine'in posted.body)&&!('credits'in posted.body),'generation request keeps exact backend contract and key')
  const sameCount=two.t.calls.length
  await errorOf(C,()=>two.client.generateSeuVideo({...twoInput,prompt:twoInput.prompt+' Different request.'}),'idempotency_conflict','same key cannot change request inputs')
  ok(two.t.calls.length===sameCount,'idempotency conflict is caught before upload')

  const retry=await prepared(C,{firstGenerateNetwork:true}),retryInput=input(C,retry.checked)
  const network=await errorOf(C,()=>retry.client.generateSeuVideo(retryInput),'network','lost generate response is explicit failure')
  ok(network.outcome==='unknown'&&count(retry.t,API)===1,'ambiguous generate is not retried automatically')
  await retry.client.generateSeuVideo(retryInput)
  const attempts=retry.t.calls.filter(c=>c.url===API)
  ok(attempts.length===2&&count(retry.t,'/api/avatar/upload')===1&&JSON.stringify(attempts[0].body)===JSON.stringify(attempts[1].body)&&attempts.every(c=>c.headers['idempotency-key']===retryInput.key),'explicit retry retains same key payload and photo URL')
  const ambiguous=await prepared(C,{badClip:true})
  const unknown=await errorOf(C,()=>ambiguous.client.generateSeuVideo(input(C,ambiguous.checked)),'response','malformed success keeps ambiguous generation outcome')
  ok(unknown.outcome==='unknown'&&count(ambiguous.t,API)===1,'malformed successful POST does not claim not-started')

  const snapshot=await prepared(C),mutable=input(C,snapshot.checked),originalKey=mutable.key,originalPhoto=mutable.photos[0]
  const inFlight=snapshot.client.generateSeuVideo(mutable)
  mutable.key='changed-after-click';mutable.photos.splice(0,1,photo('different.jpg'))
  await inFlight
  const originalPost=snapshot.t.calls.find(c=>c.url===API),originalUpload=snapshot.t.calls.find(c=>c.url==='/api/avatar/upload')
  ok(originalPost.headers['idempotency-key']===originalKey&&originalUpload.body.get('file').name===originalPhoto.name,'in-flight request freezes clicked key and photo selection')

  for(const[code,patch]of[['consent',{consent:false}],['prompt',{prompt:'Missing references'}],['idempotency',{key:''}],['people_changed',{photos:[photo(),photo()]}]])await errorOf(C,()=>client.generateSeuVideo({...input(C,checked),...patch}),code,'generation input validates '+code)
  for(const[code,checkPatch]of[['plan',{needs_plan:true}],['credits',{shortfall:5}]]){const f=await prepared(C,{check:checkPatch});await errorOf(C,()=>f.client.generateSeuVideo(input(C,f.checked)),code,'checked '+code+' blocks before photo upload');ok(count(f.t,'/api/avatar/upload')===0&&count(f.t,API)===0,'blocked account sends no photo or generation')}
  const aborter=new AbortController();aborter.abort()
  await errorOf(C,()=>idle.prepareSeuVideo({file:video(),people:1},aborter.signal),'aborted','aborted preparation has no requests')
  ok(empty.calls.length===0,'cancelled local operation sends no request')
  for(const[status,code]of[[401,'auth'],[404,'unavailable']]){
    const f=transport({errors:{[API+'/upload']:{status}}}),c=C.createSeuVideoClient({fetch:f.fetch})
    const e=await errorOf(C,()=>c.prepareSeuVideo({file:video(),people:1}),code,'auth and internal preview refusals are distinct')
    ok(e.status===status&&f.calls.length===1,'auth/internal error stops before PUT')
    if(status===404)ok(e.message==='This preview is available to approved accounts only. Your files are still here.','404 never infers missing login')
  }
  const fps=transport({errors:{[API+'/check']:{status:422,body:{ok:false,code:'fps',error:'24 to 60 fps required'}}}})
  await errorOf(C,()=>C.createSeuVideoClient({fetch:fps.fetch}).prepareSeuVideo({file:video({fps:15}),people:1}),'fps','server remains authority for fps')
  ok(count(fps,API)===0&&count(fps,'/api/avatar/upload')===0,'fps refusal never starts generation')
  for(const opts of[{badTicket:true},{putStatus:500}]){const f=transport(opts);await errorOf(C,()=>C.createSeuVideoClient({fetch:f.fetch}).prepareSeuVideo({file:video(),people:1}),opts.badTicket?'response':'upload','invalid ticket and failed PUT stop preparation');ok(count(f,API+'/check')===0,'failed upload does not check')}

  for(const code of['engine_refused','refused_face','provider_rejected','provider_failed','not_swapped','swap_unchanged'])for(const status of[422,503]){
    const message='Server instruction '+code+': Nothing was charged. Try another photo.'
    const f=await prepared(C,{errors:{[API]:{status,body:{code,error:message}}}})
    const e=await errorOf(C,()=>f.client.generateSeuVideo(input(C,f.checked)),code,'provider refusal remains actionable')
    ok(e.outcome==='not-started'&&e.message===message&&C.isSeuVideoRefusal(code),'explicit refusal preserves server message and unlocks retry even on 5xx')
  }
  for(const body of[{}, {code:'storage',error:'Could not start the request.'}]){
    const f=await prepared(C,{errors:{[API]:{status:503,body}}})
    const e=await errorOf(C,()=>f.client.generateSeuVideo(input(C,f.checked)),body.code??'http','5xx without known refusal remains uncertain')
    ok(e.outcome===(body.code?'not-started':'unknown'),'coded rejection and missing server response stay distinct')
  }
  for(const[status,amount,expected]of[['failed',undefined,false],['failed',0,false],['failed',40,true],['processing',40,false],['done',40,false]]){
    const f=transport({status:{status,...(amount===undefined?{}:{credits_refunded:amount}),video_url:'https://storage.example/video.mp4'}})
    const c=C.createSeuVideoClient({fetch:f.fetch}),clip=await c.getSeuVideoStatus(ID)
    ok(clip.refundConfirmed===expected,'refund is confirmed only from failed status and positive returned amount')
    ok(f.calls.length===1&&f.calls[0].method==='GET','status never invokes generation')
    if(status==='failed')ok(clip.video_url===null,'failed status cannot expose a result video')
  }
  for(const amount of[0,40]){
    const f=transport({status:{status:'failed',reason:'engine_refused',message:'You were not charged.',credits_refunded:amount}})
    const clip=await C.createSeuVideoClient({fetch:f.fetch}).getSeuVideoStatus(ID)
    ok(clip.reason==='engine_refused'&&Boolean(clip.message),'committed backend engine_refused reaches status UI')
    ok(clip.message==='You were not charged.'&&clip.refundConfirmed===(amount>0),'server status message is preserved independently from refund confirmation')
  }
  const serverPresentation=W.load(PRESENTATION).seuVideoPresentation()
  ok(serverPresentation.resolution==='720p'&&serverPresentation.audio==='silent'&&serverPresentation.minSeconds===3&&serverPresentation.maxSeconds===15&&serverPresentation.minSide===700&&serverPresentation.waitLabel==='About 2 minutes','server presentation follows current resolution audio wait and validation')
  ok(!JSON.stringify(serverPresentation).match(/kling|seedance|fal|model|0\.094|0\.1323/i),'public presentation contains no provider details')
  const singular='Replace the main person in @Video1 with the man from @Image1: his face and hair match @Image1. Keep the choreography, timing, camera, framing, background and lighting of @Video1 exactly. Keep the original clothing from @Video1.'
  ok(C.genderSeuVideoPrompt(['man'])===singular,'approved singular prompt is exact')
  ok(C.genderSeuVideoPrompt(['woman'])===singular.replace('the man from','the woman from').replace('his face','her face'),'woman prompt uses explicit word and pronoun')
  for(const genders of[[],['man','woman','man','woman'],[''],['man',undefined]]){let threw=false;try{C.genderSeuVideoPrompt(genders)}catch{threw=true}ok(threw,'incomplete gender never defaults to Man')}
  for(const genders of[['man','woman'],['woman','man','woman']]){
    const positions=genders.length===2?['on the left','on the right']:['on the left','in the center','on the right']
    const prompt=C.genderSeuVideoPrompt(genders,positions)
    const mapped=genders.every((g,i)=>prompt.includes('the '+g+' from @Image'+(i+1)+': '+(g==='man'?'his':'her')+' face and hair match @Image'+(i+1)))
    ok(safe.validarPrompt(prompt,genders.length).ok&&mapped&&positions.every(p=>prompt.includes('the person '+p+' in @Video1')),'each person has its own gender position and photo reference')
  }
  const high=video({width:720,height:1280}),publicTransport=transport(),publicClient=C.createSeuVideoClient({fetch:publicTransport.fetch,presentation:serverPresentation})
  await C.validateSeuVideoFile(high,serverPresentation)
  for(const[file,code]of[[video({seconds:2.9,width:720,height:1280}),'duration'],[video({width:699,height:1280}),'resolution']])await errorOf(C,()=>publicClient.prepareSeuVideo({file,people:1,genders:['man']}),code,'server-selected limits reject locally before uploads')
  ok(publicTransport.calls.length===0,'current invalid dimensions and duration send no endpoint calls')
  for(const seconds of[3,15])await C.validateSeuVideoFile(video({seconds,width:700,height:700}),serverPresentation)
  const genders=['woman'],genderPrompt=C.genderSeuVideoPrompt(genders),genderTransport=transport({check:{prompt:genderPrompt,presentation:{...serverPresentation,waitLabel:'Updated server wait'}}}),genderClient=C.createSeuVideoClient({fetch:genderTransport.fetch,presentation:serverPresentation})
  const genderChecked=await genderClient.prepareSeuVideo({file:high,people:1,genders,positions:['on the left']})
  ok(genderTransport.calls.find(c=>c.url===API+'/check').body.genders[0]==='woman'&&genderChecked.genders[0]==='woman'&&Object.isFrozen(genderChecked.genders)&&genderChecked.presentation.waitLabel==='Updated server wait','check carries gender and returns authoritative public presentation')
  await genderClient.generateSeuVideo({...input(C,genderChecked),prompt:genderPrompt,genders,promptEdited:false})
  ok(genderTransport.calls.find(c=>c.url===API).body.prompt_edited===true,'gender-based prompt is edited even when equal to checked prompt')
  const invalidGender=transport(),invalidClient=C.createSeuVideoClient({fetch:invalidGender.fetch,presentation:serverPresentation})
  await errorOf(C,()=>invalidClient.prepareSeuVideo({file:high,people:2,genders:['man']}),'genders','missing photo gender rejects before any upload')
  ok(invalidGender.calls.length===0,'invalid gender never sends uploads')
  const mismatch=await errorOf(C,()=>genderClient.generateSeuVideo({...input(C,genderChecked),genders:['man']}),'genders_changed','changed gender requires a fresh check')
  const changedGenderCost=genderTransport.calls.length
  await errorOf(C,()=>genderClient.generateSeuVideo({...input(C,genderChecked),confirmedCredits:99}),'cost_changed','gender prompt still requires checked quote confirmation')
  ok(genderTransport.calls.length===changedGenderCost,'gender cost confirmation sends no extra request')
  ok(W.accidental===0,'all operations use injected transport and no implicit network')
}

await verify()
const baselineChecks=checks
const replace=(from,to,rel=CLIENT)=>{const s=read(rel);assert.equal(s.split(from).length-1,1,'unique mutant anchor '+from);return{[rel]:s.replace(from,to)}}
const mutations=[
  ['browser imports whole provider module',()=>replace("validarPrompt, promptPorGenero,\n} from './seuVideoRules'","validarPrompt, promptPorGenero,\n} from './seuVideo'"),'browser dependency graph excludes provider module'],
  ['explicit refusal stays uncertain on 5xx',()=>replace(' && !hasServerCode',''),'explicit refusal preserves server message and unlocks retry even on 5xx'],
  ['server failure message replaced',()=>replace("let message = typeof data.error === 'string' ? data.error : 'This step could not finish. Please retry.'","let message = 'Please retry.'"),'explicit refusal preserves server message and unlocks retry even on 5xx'],
  ['gender prompt falsely unedited',()=>replace('input.promptEdited === true || !!genders || prompt.prompt !== checked.prompt','input.promptEdited === true || prompt.prompt !== checked.prompt'),'gender-based prompt is edited even when equal to checked prompt'],
  ['local dimension check removed',()=>replace('if (limits && Math.min(meta.largura, meta.altura) < limits.minSide)','if (false)'),'server-selected limits reject locally before uploads'],
  ['gender silently defaults to man',()=>replace("genders.some(g => g !== 'man' && g !== 'woman')","false",RULES),'incomplete gender never defaults to Man'],
  ['singular prompt loses gender pronoun',()=>replace("(gender === 'man' ? 'his' : 'her')","'their'",RULES),'approved singular prompt is exact'],
  ['check presentation ignored',()=>replace('presentationFrom(data.presentation) ?? presentationFrom(deps.presentation)','presentationFrom(deps.presentation)'),'check carries gender and returns authoritative public presentation'],
  ['edited prompt telemetry lost',()=>replace('prompt_edited: promptEdited','prompt_edited: false'),'edited prompt telemetry reflects actual difference from checked instruction'],
  ['default credits hardcoded',()=>replace('return creditosDoSeuVideo(segundosGerados(seconds))','return 40'),'pricing comes from shared helper'],
  ['cost confirmation ignored',()=>replace('if (!finite(input.confirmedCredits) || input.confirmedCredits !== checked.credits)','if (false)'),'changed cost requires new confirmation before photos'],
  ['automatic constructor endpoint',()=>replace("  const jobs = new Map<string,", "  void request('/api/should-not-run', {}).catch(() => {})\n  const jobs = new Map<string,"),'initialization performs no endpoint calls'],
  ['idempotency key replaced on each POST',()=>replace("'idempotency-key': key","'idempotency-key': key + '-changed'"),'generation request keeps exact backend contract and key'],
  ['same-key dedupe removed',()=>replace('if (existing?.result) return existing.result','if (false && existing?.result) return existing.result'),'same concurrent and completed key never resubmits'],
  ['changed key payload allowed',()=>replace('if (existing && existing.fingerprint !== fingerprint)','if (false)'),'same key cannot change request inputs'],
  ['refund inferred from failure',()=>replace("const refundConfirmed = phase === 'status' && v.status === 'failed' && refunded !== undefined && refunded > 0","const refundConfirmed = phase === 'status' && v.status === 'failed'"),'refund is confirmed only from failed status and positive returned amount'],
  ['photo permission removed',()=>replace("form.set('rights', 'true')","form.set('rights', 'false')"),'photos reuse own-account animate upload contract'],
]
for(const[name,mutate,message]of mutations){let caught;try{await verify(mutate())}catch(error){caught=error}assert(caught instanceof assert.AssertionError&&caught.message===message,'mutant must fail by exact assertion: '+name+'; received '+caught?.message);console.log('  ok mutant: '+name)}
console.log(`PASS seuVideoClient: ${baselineChecks} checks and ${mutations.length} mutants; injected I/O only.`)
