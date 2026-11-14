// Local catalog draft contracts. Real TS modules, fake IDB transactions; no browser/network/auth/upload.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const options={},args=process.argv.slice(2)
for(let i=0;i<args.length;i++){const flag=args[i],value=args[++i];assert(['--root','--deps'].includes(flag)&&value&&!value.startsWith('--'),'Usage: test-recreate-flow-draft-1411.mjs [--root checkout] [--deps dependency-root]');options[flag.slice(2)]=value}
const ROOT=path.resolve(options.root??path.join(path.dirname(fileURLToPath(import.meta.url)),'..')),DEPS=path.resolve(options.deps??ROOT)
const require=createRequire(import.meta.url),ts=require(require.resolve('typescript',{paths:[DEPS]}))
const MODULE='lib/recreate/flowDraft.ts',DATABASE='kineo-recreate-flow-v1',TAB='kineo:recreate-flow:tab:v1',REFS='kineo:recreate-flow:refs:v1',TTL=2*60*60*1000
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8').replace(/\r\n/g,'\n'),compiled=new Map()
let checks=0
function check(id,condition,message){checks++;assert(condition,'['+id+'] '+message)}
function session(){return{map:new Map(),failRead:false,failWrite:false,lieRefs:false,getItem(key){if(this.failRead)throw Error('Storage read failed');return this.map.get(key)??null},setItem(key,value){if(this.failWrite)throw Error('Storage write failed');if(!(this.lieRefs&&key===REFS))this.map.set(key,String(value))},removeItem(key){this.map.delete(key)}}}
// Transactions run serially with private working copies and atomic commit/rollback.
function database(){
 const state={databases:new Map(),log:[],indexes:new Set(),failOpen:false,failRead:false,failPut:false,failCommitPut:false,hideReads:false,opened:0,closed:0},waiting=[];let running=false
 const rows=name=>{if(!state.databases.has(name))state.databases.set(name,new Map());return state.databases.get(name)}
 function start(){if(running||!waiting.length)return;running=true;const tx=waiting.shift();tx.working=new Map([...rows(tx.name)].map(([k,v])=>[k,structuredClone(v)]));queueMicrotask(()=>step(tx))}
 function finish(tx,error){if(tx.ended)return;tx.ended=true;if(!error&&state.failCommitPut&&tx.put)error=Error('Commit aborted');if(error){tx.error=error;tx.onabort?.()}else{if(tx.mode==='readwrite')state.databases.set(tx.name,tx.working);tx.oncomplete?.()}running=false;start()}
 function step(tx){
  if(tx.ended)return
  const work=tx.queue.shift();if(!work){finish(tx);return}
  try{work()}catch(error){finish(tx,error);return}
  queueMicrotask(()=>step(tx))
 }
 function store(tx){
  function request(action,key){
   const r={};state.log.push({action,key:typeof key==='object'?key?.id:key,database:tx.name,mode:tx.mode})
   tx.queue.push(()=>{
    if(action==='get'&&state.failRead||action==='put'&&state.failPut)throw Error('Request failed')
    if(action!=='get'&&tx.mode!=='readwrite')throw Error('Write in readonly transaction')
    if(action==='get')r.result=state.hideReads?undefined:structuredClone(tx.working.get(key))
    else if(action==='put'){tx.put=true;tx.working.set(key.id,structuredClone(key));r.result=key.id}
    else if(action==='delete')r.result=tx.working.delete(key)
    else if(action==='clear'){tx.working.clear();r.result=undefined}
    r.onsuccess?.()
   });return r
  }
  return{indexNames:{contains:name=>state.indexes.has(name)},createIndex(name){state.indexes.add(name)},get:key=>request('get',key),put:value=>request('put',value),delete:key=>request('delete',key),clear:()=>request('clear'),index(name){return{openKeyCursor(range){
   state.log.push({action:'expired-keys',index:name,database:tx.name,mode:tx.mode});const r={};let keys,index=0
   const advance=()=>{if(!keys)keys=[...tx.working.values()].filter(row=>typeof row.at==='number'&&(range.open?row.at<range.upper:row.at<=range.upper)).map(row=>row.id);const key=keys[index];r.result=key===undefined?null:{primaryKey:key,delete:()=>request('delete',key),continue(){index++;tx.queue.push(advance)}};r.onsuccess?.()}
   tx.queue.push(advance);return r
  }}}}
 }
 function connection(name){state.opened++;let closed=false;return{objectStoreNames:{contains:()=>true},close(){if(!closed){closed=true;state.closed++}},createObjectStore(){return{indexNames:{contains:name=>state.indexes.has(name)},createIndex(name){state.indexes.add(name)}}},transaction(_store,mode){const tx={name,mode,queue:[],put:false,ended:false,objectStore(){return store(tx)}};waiting.push(tx);queueMicrotask(start);return tx}}}
 return{state,rows,open(name){const r={};queueMicrotask(()=>{if(state.failOpen){r.error=Error('IDB unavailable');r.onerror?.();return}r.result=connection(name);r.transaction={objectStore:()=>({indexNames:{contains:n=>state.indexes.has(n)},createIndex(n){state.indexes.add(n)}})};r.onupgradeneeded?.();r.onsuccess?.()});return r}}
}
function world({idb=database(),storage=session(),override}={}){
 let now=Date.UTC(2026,10,14,5),accidental=0
 class Clock extends Date{static now(){return now}}
 const cache=new Map()
 function load(file){file=file.replace(/^@\//,'');if(!file.endsWith('.ts'))file+='.ts';if(cache.has(file))return cache.get(file);const source=file===MODULE&&override?override:read(file),key=file+'\0'+source
  if(!compiled.has(key)){const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0,'Source parses');compiled.set(key,ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)}
  const exports={};cache.set(file,exports)
  vm.runInNewContext(compiled.get(key),{exports,require(name){if(name.startsWith('@/'))return load(name.slice(2));if(name.startsWith('.'))return load(path.posix.normalize(path.posix.join(path.posix.dirname(file),name)));throw Error('Forbidden dependency '+name)},Blob,File,Date:Clock,crypto,URL,URLSearchParams,sessionStorage:storage,indexedDB:idb,IDBKeyRange:{upperBound:(upper,open=false)=>({upper,open})},process:{env:{}},fetch(){accidental++;throw Error('Network forbidden')}},{filename:file,timeout:3000});return exports
 }
 const api=load(MODULE),formats=load('lib/recreate/formats.ts').RECREATE_FORMATS,entry=load('lib/recreate/entry.ts'),one=formats.find(f=>entry.publicRecreatePath(f.id)&&f.photoSlots===1),two=formats.find(f=>entry.publicRecreatePath(f.id)&&f.photoSlots===2),internal=formats.find(f=>!entry.publicRecreatePath(f.id))
 assert(one&&two&&internal,'Actual public 1/2-photo and internal models are available for contract scenarios')
 return{api,idb,storage,load,one,two,internal,tick(ms){now+=ms},get accidental(){return accidental}}
}
const photo=(name='face.webp',type='image/webp',bytes='private face bytes')=>new File([bytes],name,{type,lastModified:123})
const save=(w,extra={})=>w.api.saveRecreateFlowDraft(extra.model??w.one.id,extra.photos??[photo()],extra.prompt??'My private instruction',extra.key??'recreate-request-0001',extra.account??null)
async function verify(override){
 const w=world({override}),original=photo(),ref=await save(w,{photos:[original]})
 check('save',w.api.flowDraftRefValid(ref)&&w.idb.rows(DATABASE).size===1,'committed local draft gets an opaque reference')
 check('privacy',[...w.storage.map.values()].every(value=>!value.includes('instruction')&&!value.includes('face.webp')&&!value.includes('request-0001')),'sessionStorage keeps opaque references only')
 check('namespace',[...w.idb.state.databases.keys()].every(name=>name===DATABASE),'catalog uses only its own DB namespace')
 const [a,b]=await Promise.all([w.api.loadRecreateFlowDraft(ref,w.one.id),w.api.loadRecreateFlowDraft(ref,w.one.id)])
 check('idempotent',a&&b&&w.idb.rows(DATABASE).size===1&&a.prompt===b.prompt,'StrictMode/concurrent reads do not consume usable draft')
 check('files',a.photos[0] instanceof File&&a.photos[0]!==b.photos[0]&&await a.photos[0].text()==='private face bytes'&&a.photos[0].name===original.name&&a.photos[0].type===original.type&&a.photos[0].lastModified===123,'original image bytes and metadata reconstructed as independent Files')
 check('identity',a.requestKey==='recreate-request-0001'&&a.prompt==='My private instruction','instruction and retry key survive auth return')
 a.photos.length=0;a.prompt='caller mutation';check('idempotent',(await w.api.loadRecreateFlowDraft(ref,w.one.id)).photos.length===1&&(await w.api.loadRecreateFlowDraft(ref,w.one.id)).prompt==='My private instruction','caller mutations cannot alter persisted draft')
 const gets=w.idb.state.log.filter(x=>x.action==='get');check('privacy',gets.every(entry=>entry.key===ref),'only exact ref is read; no row enumeration')
 const email=world({idb:w.idb,override}),returned=await email.api.loadRecreateFlowDraft(ref,w.one.id,'account-a')
 check('email',returned?.photos[0] instanceof File&&returned.requestKey==='recreate-request-0001','explicit ref adopts in new email/OAuth tab')
 check('account-claim',w.idb.rows(DATABASE).get(ref).accountKey==='account-a','guest draft binds to first authenticated account')
 check('email',!!await email.api.loadRecreateFlowDraft(ref,w.one.id,'account-a'),'adopted ref can be read repeatedly')
 check('account',await w.api.loadRecreateFlowDraft(ref,w.one.id,'account-b')===null&&await w.api.loadRecreateFlowDraft(ref,w.one.id)===null,'another account and signed-out caller cannot read account-bound draft')
 const second=world({idb:w.idb,override});check('account',await second.api.loadRecreateFlowDraft(ref,w.one.id,'account-b')===null,'fresh tab with exact ref cannot bypass account binding')
 const owner=w.idb.rows(DATABASE).get(ref).owner;w.idb.rows(DATABASE).get(ref).owner=crypto.randomUUID()
 check('owner',await email.api.loadRecreateFlowDraft(ref,w.one.id,'account-a')===null,'existing pointer refuses changed record owner')
 w.idb.rows(DATABASE).get(ref).owner=owner
 const copied=world({idb:w.idb,override});copied.storage.map.set(TAB,crypto.randomUUID());copied.storage.map.set(REFS,email.storage.map.get(REFS))
 check('owner',await copied.api.loadRecreateFlowDraft(ref,w.one.id,'account-a')===null,'copied pointer from another tab is not trusted')
 const race=world({override}),raceRef=await save(race),ra=world({idb:race.idb,override}),rb=world({idb:race.idb,override})
 const claim=await Promise.all([ra.api.loadRecreateFlowDraft(raceRef,race.one.id,'account-a'),rb.api.loadRecreateFlowDraft(raceRef,race.one.id,'account-b')])
 check('account-claim',claim.filter(Boolean).length===1,'competing accounts cannot both claim the guest record')
 const aborted=world({override}),abortedRef=await save(aborted);aborted.idb.state.failCommitPut=true
 check('account-claim',await aborted.api.loadRecreateFlowDraft(abortedRef,aborted.one.id,'account-a')===null&&aborted.idb.rows(DATABASE).get(abortedRef).accountKey===null,'aborted account claim returns no files and preserves the guest draft')
 aborted.idb.state.failCommitPut=false;check('account-claim',!!await aborted.api.loadRecreateFlowDraft(abortedRef,aborted.one.id,'account-a'),'account can explicitly retry a failed local claim')
 const bound=world({override}),boundRef=await save(bound,{account:'account-a'})
 check('account',await bound.api.loadRecreateFlowDraft(boundRef,bound.one.id,'account-b')===null&&!!await bound.api.loadRecreateFlowDraft(boundRef,bound.one.id,'account-a'),'signed-in save is account-bound immediately')
 const pair=world({override}),pairRef=await save(pair,{model:pair.two.id,photos:[photo('left.jpg','image/jpeg','left'),photo('right.png','image/png','right')]})
 check('slots',!!pairRef&&JSON.stringify(await Promise.all((await pair.api.loadRecreateFlowDraft(pairRef,pair.two.id)).photos.map(file=>file.text())))==='["left","right"]','two-photo order stays exact')
 check('model',await pair.api.loadRecreateFlowDraft(pairRef,pair.one.id)===null,'model ref cannot restore into a different template')
 for(const [label,extra]of[['internal model',{model:w.internal.id,photos:Array.from({length:w.internal.photoSlots},()=>photo())}],['unknown model',{model:'unknown-model'}],['missing photo',{photos:[]}],['sparse photo array',{photos:new Array(1)}],['wrong photo count',{photos:[photo(),photo()]}],['Blob instead of File',{photos:[new Blob(['bad'],{type:'image/png'})]}],['empty photo',{photos:[photo('empty.png','image/png','')]}],['photo MIME',{photos:[photo('bad.gif','image/gif')]}],['photo over 8 MiB',{photos:[photo('large.png','image/png',new Uint8Array(8*1024*1024+1))]}],['prompt length',{prompt:'x'.repeat(551)}],['request key',{key:'private path / signed?token=secret'}],['account key',{account:'account with spaces'}]])check('validation',await save(w,extra)===null,'reject invalid '+label)
 const boundary=world({override}),boundaryRef=await save(boundary,{photos:[photo('max.png','image/png',new Uint8Array(8*1024*1024))],prompt:'x'.repeat(550)})
 check('validation',!!boundaryRef&&!!await boundary.api.loadRecreateFlowDraft(boundaryRef,boundary.one.id),'8 MiB and 550 characters are accepted boundaries')
 for(const input of['../other','https://signed.invalid/file?token=x','',null])check('ref',!w.api.flowDraftRefValid(input)&&await w.api.loadRecreateFlowDraft(input,w.one.id)===null,'invalid opaque ref is rejected')
 const ttl=world({override}),ttlRef=await save(ttl);ttl.tick(TTL-1)
 check('ttl',!!await ttl.api.loadRecreateFlowDraft(ttlRef,ttl.one.id),'draft usable just before two-hour expiry');ttl.tick(1)
 check('ttl',await ttl.api.loadRecreateFlowDraft(ttlRef,ttl.one.id)===null&&ttl.idb.rows(DATABASE).size===0,'two-hour boundary expires and deletes photo bytes')
 const abandoned=world({override}),abandonedRef=await save(abandoned);abandoned.tick(TTL);abandoned.idb.state.log.length=0;await abandoned.api.expireRecreateFlowDrafts()
 check('expiry-index',!abandoned.idb.rows(DATABASE).has(abandonedRef)&&abandoned.idb.state.log.some(x=>x.action==='expired-keys')&&!abandoned.idb.state.log.some(x=>x.action==='get'),'standalone sweep deletes abandoned photos through key-only index')
 const future=world({override}),futureRef=await save(future);future.idb.rows(DATABASE).get(futureRef).at+=1
 check('ttl',await future.api.loadRecreateFlowDraft(futureRef,future.one.id)===null,'future timestamp cannot bypass freshness')
 const corrupt=world({override}),corruptRef=await save(corrupt);corrupt.idb.rows(DATABASE).get(corruptRef).server_token='must-not-be-stored'
 check('validation',await corrupt.api.loadRecreateFlowDraft(corruptRef,corrupt.one.id)===null,'unknown stored server fields are rejected')
 for(const fault of['failOpen','failPut','failCommitPut','failRead','hideReads']){const failed=world({override});failed.idb.state[fault]=true;check(['failRead','hideReads'].includes(fault)?'readback':'nullsave',await save(failed)===null,'failed '+fault+' never reports a usable saved ref')}
 const previous=world({override}),previousRef=await save(previous,{prompt:'previous usable draft'});previous.idb.state.failPut=true
 check('nullsave',await save(previous,{prompt:'failed replacement'})===null,'failed replacement reports null');previous.idb.state.failPut=false
 check('nullsave',(await previous.api.loadRecreateFlowDraft(previousRef,previous.one.id)).prompt==='previous usable draft','failed replacement cannot destroy the last usable draft')
 const noSession=world({override});noSession.storage.failWrite=true;check('nullsave',await save(noSession)===null,'session write failure cannot authorize navigation')
 const lying=world({override});lying.storage.lieRefs=true;check('session-readback',await save(lying)===null,'reference write/readback must be truthful')
 const snapshot=world({override}),clicked=photo('clicked.jpg','image/jpeg'),files=[clicked],saving=snapshot.api.saveRecreateFlowDraft(snapshot.one.id,files,'clicked prompt','clicked-request-0001');files[0]=photo('late.jpg','image/jpeg')
 const clickedRef=await saving;check('snapshot',(await snapshot.api.loadRecreateFlowDraft(clickedRef,snapshot.one.id)).photos[0].name==='clicked.jpg','save snapshots clicked files before async work')
 const clear=world({override}),clearA=await save(clear),clearB=await save(clear,{prompt:'second'});clear.idb.rows('kineo-seu-video-draft-v1').set('unrelated',{photos:'different namespace'})
 await clear.api.clearRecreateFlowDraft(clearA)
 check('clear',!clear.idb.rows(DATABASE).has(clearA)&&!!await clear.api.loadRecreateFlowDraft(clearB,clear.one.id),'accepted/refused clear only removes explicit return')
 await clear.api.clearRecreateFlowDraft('../invalid')
 check('clear',clear.idb.rows(DATABASE).size===1,'invalid ref cannot clear unrelated records')
 await clear.api.clearRecreateFlowDraft()
 check('logout',clear.idb.rows(DATABASE).size===0&&clear.idb.rows('kineo-seu-video-draft-v1').size===1&&!clear.storage.map.has(TAB)&&!clear.storage.map.has(REFS),'logout clears all catalog photos and local pointers without touching own-video draft')
 check('cleanup',w.idb.state.opened===w.idb.state.closed&&race.idb.state.opened===race.idb.state.closed,'all successful, failed and claimed connections close')
 check('no-io',w.accidental+email.accidental+race.accidental===0&&!/\bfetch\s*\(|watchDraft|WatchRecreate|seuVideoDraft|process\.env|localStorage/.test(read(MODULE)),'draft has no network, WATCH, own-video or secret dependencies')
}
await verify();const baseline=checks,source=read(MODULE)
function replace(from,to){assert.equal(source.split(from).length-1,1,'Unique mutant anchor '+from);return source.replace(from,to)}
const mutants=[
 ['destructive load','idempotent',()=>replace('remember(ref, record.owner)',"await transaction('readwrite', store => store.delete(ref))\n      remember(ref, record.owner)")],
 ['owner changed','owner',()=>replace('expectedOwner !== undefined && record.owner !== expectedOwner','false')],
 ['copied tab pointer accepted','owner',()=>replace('value.tab !== tab(false)','false')],
 ['account read boundary removed','account',()=>replace('record.accountKey !== null && record.accountKey !== accountKey','false')],
 ['guest account claim removed','account-claim',()=>replace('record.accountKey === null && accountKey !== null','false')],
 ['TTL extended silently','ttl',()=>replace('TTL = 2 * 60 * 60 * 1000','TTL = 3 * 60 * 60 * 1000')],
 ['abandoned expiry removed','ttl',()=>replace('if (cursor) { cursor.delete(); cursor.continue() }','if (cursor) { cursor.continue() }')],
 ['save reports success after failed write','nullsave',()=>replace('if (written) try { await transaction(\'readwrite\', store => store.delete(written!)) } catch {}\n      return null',"if (written) try { await transaction('readwrite', store => store.delete(written!)) } catch {}\n      return '11111111-2222-4333-8444-555555555555'")],
 ['save skips record readback','readback',()=>replace("const stored = await transaction<unknown>('readonly', store => store.get(record.id))",'const stored = record')],
 ['session reference readback skipped','session-readback',()=>replace("if (sessionStorage.getItem(REFS_KEY) !== raw)",'if (false)')],
 ['request key lost','identity',()=>replace('...(record.requestKey === undefined ? {} : { requestKey: record.requestKey })','...{}')],
 ['unapproved catalog model allowed','validation',()=>replace('!publicRecreatePath(model)','false')],
 ['oversize photos accepted','validation',()=>replace('photo.blob.size <= PHOTO_MAX','true')],
 ['account binding never checked at save','validation',()=>replace("key === null || typeof key === 'string' && /^[a-z0-9_-]{1,128}$/i.test(key)",'true')],
 ['logout clears only session pointers','logout',()=>replace('ref === undefined ? store.clear() : store.delete(ref)','ref === undefined ? store.get(ref) : store.delete(ref)')],
]
const expected={
 'destructive load':'[idempotent] StrictMode/concurrent reads do not consume usable draft',
 'owner changed':'[owner] existing pointer refuses changed record owner',
 'copied tab pointer accepted':'[owner] copied pointer from another tab is not trusted',
 'account read boundary removed':'[account] another account and signed-out caller cannot read account-bound draft',
 'guest account claim removed':'[account-claim] guest draft binds to first authenticated account',
 'TTL extended silently':'[ttl] two-hour boundary expires and deletes photo bytes',
 'abandoned expiry removed':'[ttl] two-hour boundary expires and deletes photo bytes',
 'save reports success after failed write':'[nullsave] failed failOpen never reports a usable saved ref',
 'save skips record readback':'[readback] failed failRead never reports a usable saved ref',
 'session reference readback skipped':'[session-readback] reference write/readback must be truthful',
 'request key lost':'[identity] instruction and retry key survive auth return',
 'unapproved catalog model allowed':'[validation] reject invalid internal model',
 'oversize photos accepted':'[validation] reject invalid photo over 8 MiB',
 'account binding never checked at save':'[validation] reject invalid account key',
 'logout clears only session pointers':'[logout] logout clears all catalog photos and local pointers without touching own-video draft',
}
for(const[name,id,mutate]of mutants){let error;try{await verify(mutate())}catch(e){error=e}assert(error instanceof assert.AssertionError,'Only AssertionError kills mutant: '+name+' '+error?.stack);assert.equal(error.message,expected[name],name+' must fail by its exact guard');console.log('MUTANT REJECTED ['+id+'] '+name)}
console.log('PASS RecreateFlowDraft: '+baseline+' offline checks; '+mutants.length+'/'+mutants.length+' targeted mutants rejected; no browser/network/auth/render.')
