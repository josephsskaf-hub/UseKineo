// Real JSX and event handlers; all HTTP, storage and photo preparation are injected locally.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import {isDeepStrictEqual} from 'node:util'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const ROOT=path.resolve(process.env.KINEO_TEST_ROOT||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'))
const require=createRequire(path.join(ROOT,'package.json')),ts=require('typescript'),React=require('react'),jsx=require('react/jsx-runtime')
const L=require(path.join(ROOT,'docs/recreate-0911/test-recreate.cjs')).loader()
const F=L('lib/recreate/formats'),E=L('lib/recreate/entry'),P=L('lib/recreate/catalogPublic'),pricing=L('lib/checkoutPricing')
const UI='app/recreate/RecreateClient.tsx',raw=fs.readFileSync(path.join(ROOT,UI),'utf8').replace(/\r\n/g,'\n')
const quotes=F.RECREATE_FORMATS.map(f=>{const credits=f.type==='swap'?pricing.recreateCreditCost(f.seconds):F.recreateEffectCredits(f);return{id:f.id,credits,shortfall:0,available:credits!==null}})
let checks=0
const ok=(value,label)=>{checks++;assert.ok(value,label)}
const equal=(a,b,label)=>{checks++;if(!isDeepStrictEqual(a,b))throw new assert.AssertionError({message:label,actual:a,expected:b})}
const nodes=(node,p,out=[])=>{if(Array.isArray(node)){node.forEach(n=>nodes(n,p,out));return out}if(!node||typeof node!=='object')return out;if(p(node))out.push(node);return nodes(node.props?.children,p,out)}
const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):node==null||typeof node==='boolean'?'':String(node)
const by=(h,p)=>{const found=nodes(h.tree,p)[0];assert.ok(found,'fixture target');return found}
const gen=h=>by(h,n=>n.type==='button'&&Object.hasOwn(n.props,'data-recreate-generate'))
const area=(h,i=0)=>nodes(h.tree,n=>n.type==='button'&&/^(Add your photo|Add photo of person \d|Change photo \d)$/.test(n.props['aria-label']||''))[i]
const prompt=h=>by(h,n=>n.type==='textarea')
const photo=name=>new File(['fixture'],name+'.jpg',{type:'image/jpeg'})
const ref='22222222-3333-4444-5555-666666666666',ACCOUNT='11111111-2222-4333-8444-555555555555'
function harness(options={},source=raw){
 const h={slots:[],cursor:0,dirty:true,pending:[],tree:null,calls:[],saves:[],loads:[],clears:[],navigations:[],history:[],listeners:new Map(),timers:new Map(),storage:new Map(options.storage||[]),post:[...(options.post||[])],quoteReplies:[...(options.quoteReplies||[])],props:{initialId:'passarela',currentFlow:true,signedIn:false,accountKey:null,guestQuotes:quotes,...options.props}}
 if(h.props.signedIn&&!h.props.accountKey)h.props.accountKey=ACCOUNT
 const useState=initial=>{const i=h.cursor++;const slot=h.slots[i]??={value:typeof initial==='function'?initial():initial};return[slot.value,value=>{slot.value=typeof value==='function'?value(slot.value):value;h.dirty=true}]}
 const useRef=initial=>h.slots[h.cursor++]??={current:initial}
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
 const useEffect=(create,deps)=>{const i=h.cursor++,old=h.slots[i];if(!old||!same(old.deps,deps)){const slot={deps,create,cleanup:old?.cleanup};h.slots[i]=slot;h.pending.push(slot)}}
 const stub=()=>null
 const prepare=async file=>file
 const dependencies={
  'react':{...React,useState,useRef,useEffect},'react/jsx-runtime':jsx,'next/link':{__esModule:true,default:'a'},
  '@/components/KineoBolt':{KineoBrandIcon:stub},'@/lib/clips/clipCatalog':L('lib/clips/clipCatalog'),'@/lib/recreate/formats':F,'@/lib/recreate/entry':E,'@/lib/recreate/catalogPublic':P,
  '@/lib/recreate/photos':{compressPhoto:prepare,cropFace:prepare,composePairPhoto:async()=>photo('pair')},
  './RecreatePlayer':{__esModule:true,default:'fixture-player',ExampleCover:'fixture-cover'},
  '@/components/create/CreateTabs':{__esModule:true,default:stub},'@/components/create/CreateNavConta':{__esModule:true,default:stub},
  '@/lib/videoDownload':{downloadVideoFile:stub},'@/lib/downloadNosso':{downloadHref:(url)=>'/api/download?url='+encodeURIComponent(url)},
  '@/lib/growth/visitanteEscreveAntes':L('lib/growth/visitanteEscreveAntes'),
  '@/lib/recreate/flowDraft':{
   async saveRecreateFlowDraft(...args){h.saves.push(args);return options.saveFails?null:ref},
   async loadRecreateFlowDraft(...args){h.loads.push(args);return options.restorePromise?await options.restorePromise:options.restored??null},
   async clearRecreateFlowDraft(value){h.clears.push(value)},async expireRecreateFlowDrafts(){},
  },
 }
 let uuid=0,timerId=0
 const window={location:{assign:url=>h.navigations.push(url)},history:{replaceState:(_,__,url)=>h.history.push(url)},confirm:()=>options.confirm!==false,matchMedia:()=>({matches:false}),addEventListener:(name,fn)=>h.listeners.set(name,fn),removeEventListener:(name,fn)=>{if(h.listeners.get(name)===fn)h.listeners.delete(name)},requestAnimationFrame:fn=>fn()}
 const fetch=async(url,init={})=>{
  h.calls.push({url,...init})
  if(url==='/api/avatar/upload')return Response.json(options.uploadStatus?{error:'Sign in again.'}:{url:'https://fixture.invalid/storage/v1/object/public/avatars/'+(h.props.accountKey||ACCOUNT)+'/'+h.calls.length+'.jpg'},{status:options.uploadStatus||200})
  if(url==='/api/recreate'&&init.method==='POST'){
   if(options.hangPost)return new Promise(()=>{})
   const next=h.post.shift();if(next instanceof Error)throw next
   if(next)return Response.json(next.body,{status:next.status||200})
   return Response.json({clip:{id:'fixture-clip',status:'pending',...options.clip}})
  }
  if(url==='/api/recreate'){const next=h.quoteReplies.shift();return next?Response.json(next.body,{status:next.status}):Response.json({catalog:options.quotes||quotes})}
  if(url==='/api/recreate/social')return Response.json({items:[]})
  if(url.startsWith('/api/recreate/status'))return options.hangStatus?new Promise(()=>{}):Response.json({clip:{id:'fixture-clip',status:'done',video_url:'https://fixture.invalid/result.mp4',...options.status}})
  throw Error('Unexpected fixture I/O '+url)
 }
 const code=ts.transpileModule(source,{fileName:UI,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{if(name.endsWith('.css'))return{};if(!Object.hasOwn(dependencies,name))throw Error('Unmocked dependency '+name);return dependencies[name]},window,document:{querySelector:()=>null},URL:{createObjectURL:()=> 'blob:fixture-'+(++uuid),revokeObjectURL(){}},URLSearchParams,File,Blob,FormData,Response,AbortController,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.invalid'}},fetch,crypto:{randomUUID:()=> '11111111-2222-4333-8444-'+String(++uuid).padStart(12,'0')},sessionStorage:{getItem:key=>h.storageFailure==='readback'&&h.lastWrite===key?null:h.storage.get(key)||null,setItem:(key,value)=>{if(h.storageFailure==='write')throw new Error('Fixture storage write failed');h.storage.set(key,value);h.lastWrite=key},removeItem:key=>h.storage.delete(key)},setInterval:()=>1,clearInterval(){},setTimeout:(fn,delay)=>{const id=++timerId;h.timers.set(id,{fn,delay});return id},clearTimeout:id=>h.timers.delete(id),console},{filename:UI})
 const Component=module.exports.default
 h.render=()=>{h.cursor=0;h.dirty=false;h.tree=Component(h.props)}
 h.flush=async()=>{for(let i=0;i<25;i++){if(h.dirty)h.render();for(const item of h.pending.splice(0)){item.cleanup?.();item.cleanup=item.create()}await Promise.resolve();await Promise.resolve()}if(h.dirty)throw Error('Hook fixture did not settle')}
 h.click=async node=>{node.props.onClick?.({preventDefault(){}});await h.flush()}
 h.unmount=()=>{for(const slot of h.slots)slot?.cleanup?.()}
 h.replay=()=>{for(const slot of h.slots)if(slot?.create){slot.cleanup?.();slot.cleanup=slot.create()}}
 h.timer=()=>{const entry=[...h.timers.entries()].sort((a,b)=>a[1].delay-b[1].delay)[0];if(!entry)throw Error('No pending timer');h.timers.delete(entry[0]);return entry[1].fn()};h.render();return h
}
async function add(h,index=0,name='face',via='paste'){
 const file=photo(name),target=area(h,index)
 if(via==='paste')target.props.onPaste({preventDefault(){},clipboardData:{items:[{kind:'file',getAsFile:()=>file}]}})
 else target.props.onDrop({preventDefault(){},dataTransfer:{files:[file]}})
 await h.flush();return file
}
const posts=h=>h.calls.filter(c=>c.url==='/api/recreate'&&c.method==='POST')
async function guest(source){
 const h=harness({},source);await h.flush();ok(h.calls.length===0,'guest mount sends no private HTTP')
 ok(nodes(h.tree,n=>n.type==='fixture-player')[0].props.src.startsWith('/previews/'),'guest uses public reference media')
 ok(text(h.tree).includes('Estimated'),'guest credits explicitly estimated')
 await add(h);ok(h.calls.length===0,'paste remains local');ok(!gen(h).props.disabled,'photo enables guest Generate')
 await h.click(gen(h));equal(h.saves.length,1,'guest saves only on Generate');equal(h.calls.length,0,'guest Generate does not upload or POST')
 const destination=new URL(h.navigations[0],'https://fixture.invalid'),back=new URL(destination.searchParams.get('redirect'),'https://fixture.invalid')
 equal(back.pathname,'/recreate-flow-preview/passarela','auth returns to preview model');equal(back.searchParams.get('draft'),ref,'auth uses opaque draft ref')
 ok(!h.navigations[0].includes('face.jpg')&&!back.searchParams.has('prompt'),'auth URL contains no customer photo or text')
 let blocked=false;h.listeners.get('beforeunload')?.({preventDefault(){blocked=true}});ok(!blocked,'saved signup handoff bypasses leave warning')
 const failed=harness({saveFails:true},source);await failed.flush();await add(failed);await failed.click(gen(failed));equal(failed.navigations.length,0,'failed draft save never navigates')
 blocked=false;failed.listeners.get('beforeunload')?.({preventDefault(){blocked=true}});ok(blocked,'failed signup save keeps leave protection')
 const production=harness({props:{flowBasePath:'/recreate'}},source);await production.flush();await add(production);await production.click(gen(production));ok(decodeURIComponent(production.navigations[0]).includes('/recreate/passarela?draft='),'auth honors production base path')
}
async function retry(source){
 const h=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[new TypeError('lost response')]},source);await h.flush();await add(h);await h.click(gen(h))
 equal(posts(h).length,1,'unknown request never retries automatically');ok(area(h).props.disabled,'unknown request locks photo edits');ok(prompt(h).props.disabled,'unknown request locks prompt edits')
 ok(text(gen(h)).includes('Retry same request'),'unknown request offers identical retry');await h.click(gen(h))
 equal(posts(h).length,2,'explicit retry sends once');equal(posts(h)[0].body,posts(h)[1].body,'retry preserves payload byte for byte');equal(posts(h)[0].headers['Idempotency-Key'],posts(h)[1].headers['Idempotency-Key'],'retry preserves exact key')
 equal(h.calls.filter(c=>c.url==='/api/avatar/upload').length,1,'retry reuses uploaded photo');ok(nodes(h.tree,n=>n.props?.['data-flow-status']==='pending').length===1,'pending status occupies principal stage')
 const pointer=[...h.storage.entries()].find(([key])=>key.includes(':attempt:'));ok(!pointer,'accepted reply clears reload pointer')
 const noIdentity=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[{status:503,body:{code:'future_server_code',error:'Unknown future error'}}]},source);await noIdentity.flush();await add(noIdentity);await noIdentity.click(gen(noIdentity));ok(area(noIdentity).props.disabled,'future 5xx code remains uncertain')
 const reload=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:[['kineo:recreate:flow:attempt:'+ACCOUNT+':passarela',JSON.stringify({key:'earlier-key',at:Date.now()})]]},source);await reload.flush();ok(gen(reload).props.disabled,'reload without payload never dispatches another request');equal(posts(reload).length,0,'reload marker sends no generation')
 const browse=harness({props:{initialId:undefined,signedIn:true,accountKey:ACCOUNT},storage:[['kineo:recreate:flow:attempt:'+ACCOUNT+':passarela',JSON.stringify({key:'earlier-key',at:Date.now()})]]},source);await browse.flush();await browse.click(by(browse,n=>n.type==='button'&&n.props['aria-label']==='Use Runway walk'));ok(area(browse).props.disabled,'gallery selection also respects uncertain marker')
 const known=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[new TypeError('lost response'),{status:402,body:{code:'credits',error:'Check your balance.'}}]},source);await known.flush();await add(known);await known.click(gen(known));await known.click(gen(known));ok(area(known).props.disabled,'current credit refusal cannot disprove earlier request')
}
async function auth(source){
 const h=harness({props:{signedIn:true,accountKey:ACCOUNT},uploadStatus:401},source);await h.flush();await add(h);await h.click(gen(h));equal(h.saves.length,1,'upload 401 saves current snapshot');equal(h.navigations.length,1,'upload 401 returns to signup');equal(posts(h).length,0,'upload 401 cannot dispatch')
 const expired=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[{status:404,body:{error:'Not found.'}}]},source);await expired.flush();await add(expired);await expired.click(gen(expired));const again=by(expired,n=>n.type==='button'&&text(n)==='Sign in again');await expired.click(again);equal(expired.saves.length,1,'explicit 404 recovery saves latest photos');equal(expired.navigations.length,1,'explicit 404 recovery returns safely')
}
async function restore(source){
 const saved=photo('restored'),h=harness({props:{signedIn:true,accountKey:ACCOUNT,draftRef:ref},restored:{photos:[saved],prompt:F.recreateFormat('passarela').prompt}},source);await h.flush();ok(!gen(h).props.disabled,'restored photos ready after auth');equal(posts(h).length,0,'restore never automatically generates');equal(h.clears.length,0,'restore never consumes draft');h.replay();await h.flush();equal(h.clears.length,0,'StrictMode restore remains idempotent');await h.click(gen(h));equal(posts(h).length,1,'restored draft needs explicit Generate');equal(h.clears.length,1,'accepted request clears draft')
 let resolve;const waiting=harness({props:{draftRef:ref},restorePromise:new Promise(r=>resolve=r)},source);await waiting.flush();ok(area(waiting).props.disabled,'restore locks photo editing');waiting.unmount();resolve({photos:[saved],prompt:'restored'});await waiting.flush();equal(posts(waiting).length,0,'unmounted restore never submits')
}
async function states(source){
 const h=harness({props:{signedIn:true},clip:{queued:true,queue_position:3}},source);await h.flush();await add(h,0,'face','drop');await h.click(gen(h));ok(text(h.tree).includes('In line · position 3'),'queue position comes from server');await h.timer();await h.flush();ok(nodes(h.tree,n=>n.type==='fixture-player'&&n.props.src==='https://fixture.invalid/result.mp4').length===1,'ready video replaces base in principal stage');ok(!nodes(h.tree,n=>n.type==='fixture-player'&&n.props.label?.startsWith('Base video')).length,'ready stage does not keep base video')
 const noPosition=harness({props:{signedIn:true},clip:{queued:true}},source);await noPosition.flush();await add(noPosition);await noPosition.click(gen(noPosition));ok(!/position \d/.test(text(noPosition.tree)),'missing queue position is never invented')
 for(const refunded of[0,40]){const failure=harness({props:{signedIn:true},clip:{status:'failed',credits_refunded:refunded,reason:'not_swapped'}},source);await failure.flush();await add(failure);await failure.click(gen(failure));equal(/Nothing was charged/.test(text(failure.tree)),refunded>0,'refund copy depends on confirmed server state')}
 const poor=harness({props:{signedIn:true},quotes:quotes.map(q=>({...q,shortfall:99}))},source);await poor.flush();await add(poor);ok(gen(poor).props.disabled,'account shortfall prevents Generate');equal(poor.calls.filter(c=>c.url==='/api/avatar/upload').length,0,'insufficient balance never uploads photos')
 const replay=harness({props:{signedIn:true},post:[{body:{clip:{id:'fixture-clip',status:'done'},replay:true}}]},source);await replay.flush();await add(replay);await replay.click(gen(replay));ok(replay.timers.size>0,'terminal replay requests authoritative status');await replay.timer();await replay.flush();ok(nodes(replay.tree,n=>n.type==='fixture-player'&&n.props.src==='https://fixture.invalid/result.mp4').length===1,'terminal replay obtains result URL from status');equal(posts(replay).length,1,'terminal replay status never sends another POST')
}
async function parity(source){
 const h=harness({props:{currentFlow:false,signedIn:true}},source);await h.flush();ok(!h.tree.props['data-recreate-current-flow'],'off mode keeps legacy root');ok(text(h.tree).includes('Your version, step by step.'),'off mode keeps legacy heading');ok(!area(h).props.onPaste,'off mode has no new paste flow');ok(!text(h.tree).includes('Use your video'),'off mode has no own-video link');equal(h.calls.length,2,'off mode retains legacy quote and social reads')
 // M12 revisão (1): o link só nasce com ownVideoVisible vindo do servidor; sem ele, nenhum "Use your video" (guardião: test-recreate-flow-guardas-1411).
 const hidden=harness({props:{initialId:undefined}},source);await hidden.flush();ok(!nodes(hidden.tree,n=>typeof n.props?.href==='string'&&n.props.href.endsWith('/your-video')).length,'own video link hidden without server permission')
 const browse=harness({props:{initialId:undefined,ownVideoVisible:true}},source);await browse.flush();ok(nodes(browse.tree,n=>n.type==='fixture-cover').every(n=>!n.props.src.startsWith('/api/')),'guest gallery media stays public');const link=by(browse,n=>n.props?.href==='/recreate-flow-preview/your-video');ok(!!link,'gallery exposes own video within current design')
}
async function timeout(source){
 const h=harness({props:{signedIn:true,accountKey:ACCOUNT},hangPost:true},source);await h.flush();await add(h);await h.click(gen(h));ok(h.timers.size>0,'POST has a timeout');h.timer();await h.flush();ok(text(gen(h)).includes('Retry same request'),'POST timeout is uncertain');ok(area(h).props.disabled,'POST timeout locks inputs');equal(posts(h).length,1,'POST timeout never automatically resends')
 const poll=harness({props:{signedIn:true},hangStatus:true},source);await poll.flush();await add(poll);await poll.click(gen(poll));poll.timer();await poll.flush();poll.timer();await poll.flush();ok(nodes(poll.tree,n=>n.type==='button'&&text(n)==='Refresh status').length===1,'status timeout offers explicit status retry');equal(posts(poll).length,1,'status timeout never sends generation')
}
async function availability(source){
 const h=harness({props:{signedIn:true},quoteReplies:[{status:503,body:{error:'temporarily unavailable'}}]},source);await h.flush();await add(h);ok(gen(h).props.disabled,'failed quote keeps Generate disabled');ok(nodes(h.tree,n=>n.type==='button'&&text(n)==='Retry availability').length===1,'availability failure offers retry');const retry=by(h,n=>n.type==='button'&&text(n)==='Retry availability');await h.click(retry);ok(!gen(h).props.disabled,'availability retry restores Generate');equal(posts(h).length,0,'availability retry never dispatches generation');equal(h.calls.filter(c=>c.url==='/api/recreate'&&c.method!=='POST').length,2,'availability retry only repeats authenticated GET')
}
async function reloadSnapshot(source){
 const first=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[new TypeError('response lost')]},source);await first.flush();await add(first);await first.click(gen(first));const stored=[...first.storage.entries()];ok(stored.length===1,'unknown dispatch saves exact request snapshot')
 const resumed=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:stored},source);await resumed.flush();ok(!gen(resumed).props.disabled,'validated reload snapshot offers same-request retry');equal(posts(resumed).length,0,'restored snapshot never sends automatically');await resumed.click(gen(resumed));equal(posts(resumed)[0].body,posts(first)[0].body,'reload retry preserves exact payload');equal(posts(resumed)[0].headers['Idempotency-Key'],posts(first)[0].headers['Idempotency-Key'],'reload retry preserves exact key');equal(resumed.calls.filter(c=>c.url==='/api/avatar/upload').length,0,'reload retry never invents Files or reuploads')
 for(const edit of[snapshot=>{snapshot.account='99999999-2222-4333-8444-555555555555'},snapshot=>{snapshot.payload.photos[0]='https://external.invalid/face.jpg'},snapshot=>{snapshot.payload.engine='untrusted'}]){const value=JSON.parse(stored[0][1]);edit(value);const invalid=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:[[stored[0][0],JSON.stringify(value)]]},source);await invalid.flush();ok(gen(invalid).props.disabled,'invalid saved snapshot remains blocked');equal(posts(invalid).length,0,'invalid snapshot cannot dispatch')}
}
async function uncertainRecovery(source){
 const first=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[new TypeError('response lost')]},source);await first.flush();await add(first);await first.click(gen(first));const stored=[...first.storage.entries()],original=posts(first)[0]
 for(const status of[401,404]){
  const resumed=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:stored,post:[{status,body:{error:'Session unavailable.'}}]},source);await resumed.flush();await resumed.click(gen(resumed))
  ok(!gen(resumed).props.disabled,'auth during uncertain retry retains same-request retry');ok(area(resumed).props.disabled,'auth during uncertain retry keeps editor locked');equal(resumed.saves.length,0,'auth retry without Files never rewrites photo draft');ok(resumed.storage.has(stored[0][0]),'auth retry preserves persisted request')
  if(status===404)await resumed.click(by(resumed,n=>n.type==='button'&&text(n)==='Sign in again'))
  equal(resumed.navigations.length,1,'uncertain auth returns to same model without Files');const destination=new URL(resumed.navigations[0],'https://fixture.invalid'),back=new URL(destination.searchParams.get('redirect'),'https://fixture.invalid');equal(back.pathname,'/recreate-flow-preview/passarela','uncertain auth keeps model route');ok(!back.searchParams.has('draft'),'uncertain auth uses existing request snapshot instead of Files')
  const returned=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:[...resumed.storage.entries()],post:[{body:{clip:{id:'fixture-clip',status:'done'},replay:true}}]},source);await returned.flush();equal(posts(returned).length,0,'reauth return never automatically dispatches');await returned.click(gen(returned));equal(posts(returned)[0].body,original.body,'reauth retry keeps exact original payload');equal(posts(returned)[0].headers['Idempotency-Key'],original.headers['Idempotency-Key'],'reauth retry keeps original key');equal(returned.calls.filter(call=>call.url==='/api/avatar/upload').length,0,'reauth retry never reuploads');await returned.timer();await returned.flush();ok(nodes(returned.tree,node=>node.type==='fixture-player'&&node.props.src==='https://fixture.invalid/result.mp4').length===1,'terminal replay is confirmed by authenticated status only')
 }
 for(const failure of['write','readback']){
  const resumed=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:stored},source);await resumed.flush();resumed.storageFailure=failure;await resumed.click(gen(resumed));equal(posts(resumed).length,0,'failed snapshot rewrite never dispatches');ok(!gen(resumed).props.disabled,'failed snapshot rewrite keeps retry payload in memory');ok(area(resumed).props.disabled,'failed snapshot rewrite keeps uncertain editor locked');ok(resumed.storage.has(stored[0][0]),'failed snapshot rewrite never clears saved request');resumed.storageFailure=null;await resumed.click(gen(resumed));equal(posts(resumed)[0].body,original.body,'storage recovery retries same payload');equal(posts(resumed)[0].headers['Idempotency-Key'],original.headers['Idempotency-Key'],'storage recovery retries same key')
  const fresh=harness({props:{signedIn:true,accountKey:ACCOUNT}},source);await fresh.flush();await add(fresh);fresh.storageFailure=failure;await fresh.click(gen(fresh));equal(posts(fresh).length,0,'first snapshot failure cannot send a new request');ok(!area(fresh).props.disabled,'first unsent snapshot failure permits correction');fresh.storageFailure=null;await fresh.click(gen(fresh));equal(posts(fresh).length,1,'first request starts only after snapshot storage recovers')
 }
}
async function uncertainHttpErrors(source){
 for(const [status,code]of[[409,'unpriced'],[429,'queue_full'],[402,'credits'],[400,'request']]){
  const first=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[new TypeError('response lost')]},source);await first.flush();await add(first);await first.click(gen(first));const stored=[...first.storage.entries()],original=posts(first)[0]
  const retry=harness({props:{signedIn:true,accountKey:ACCOUNT},storage:stored,post:[{status,body:{code,error:'Current request refused.'}}]},source);await retry.flush();equal(posts(retry).length,0,'restored uncertain HTTP scenario never auto-dispatches');await retry.click(gen(retry));ok(area(retry).props.disabled&&prompt(retry).props.disabled,'current HTTP refusal keeps uncertain fields locked');ok(!gen(retry).props.disabled,'current HTTP refusal retains retry payload');ok(retry.storage.has(stored[0][0]),'current HTTP refusal preserves saved request');equal(posts(retry)[0].body,original.body,'current HTTP refusal used original payload');equal(posts(retry)[0].headers['Idempotency-Key'],original.headers['Idempotency-Key'],'current HTTP refusal used original key');await retry.click(gen(retry));equal(posts(retry)[1].body,original.body,'retry after current refusal keeps original payload');equal(posts(retry)[1].headers['Idempotency-Key'],original.headers['Idempotency-Key'],'retry after current refusal keeps original key');equal(retry.calls.filter(call=>call.url==='/api/avatar/upload').length,0,'current HTTP refusal retry never reuploads')
  const fresh=harness({props:{signedIn:true,accountKey:ACCOUNT},post:[{status,body:{code,error:'Current request refused.'}}]},source);await fresh.flush();await add(fresh);await fresh.click(gen(fresh));ok(!area(fresh).props.disabled,'first known refusal still permits correction');equal(fresh.storage.size,0,'first known refusal clears only its unsent attempt')
 }
}
const scenarios={guest,retry,auth,restore,states,parity,timeout,availability,reloadSnapshot,uncertainRecovery,uncertainHttpErrors}
const requested=process.argv.length===2?null:process.argv[2]==='--scenario'&&process.argv.length===4?process.argv[3]:''
assert.ok(requested===null||Object.hasOwn(scenarios,requested),'Usage: node test-recreate-current-flow-1411.mjs [--scenario name]')
for(const [name,run]of Object.entries(scenarios))if(requested===null||requested===name)await run(raw)
const baseline=checks,replace=(from,to)=>{assert.equal(raw.split(from).length,2,'unique mutant anchor');return raw.replace(from,to)}
const mutants=[
 ['private guest reads','guest','if (currentFlow && !signedIn) { setQuotes([...guestQuotes]); setFlowQuoteReady(true); return }','if (false) { setQuotes([...guestQuotes]); setFlowQuoteReady(true); return }','guest mount sends no private HTTP'],
 ['upload before auth','guest','if (!signedIn) { await goToSignup(); return }','if (false) { await goToSignup(); return }','guest saves only on Generate'],
 ['save failure ignored','guest',"if (!ref) throw new Error(UNSAVED_MESSAGE)","if (false) throw new Error(UNSAVED_MESSAGE)",'failed draft save never navigates'],
 ['new key on retry','retry',"'Idempotency-Key': sent.key","'Idempotency-Key': `new-${crypto.randomUUID()}`",'retry preserves exact key'],
 ['uncertain unlocks editing','retry','if (failure.uncertain) setUncertain(true)','if (failure.uncertain) setUncertain(false)','unknown request locks photo edits'],
 ['future code treated known','retry',"response.status >= 500 && !knownRefusal","response.status >= 500 && !data.code",'future 5xx code remains uncertain'],
 ['upload status lost','auth',"throw Object.assign(new Error(data.error ?? 'Photo upload failed.'), { status: res.status })","throw new Error(data.error ?? 'Photo upload failed.')",'upload 401 saves current snapshot'],
 ['result keeps base','states','src={clip.video_url} label="Your version" stage=','src={selected.preview} label="Your version" stage=','ready video replaces base in principal stage'],
 ['refund invented','states',"const flowFailure = clip?.credits_refunded ?","const flowFailure = !!clip ?",'refund copy depends on confirmed server state'],
 ['signup handoff still warns','guest','if (handoffApproved.current) return; event.preventDefault();','event.preventDefault();','saved signup handoff bypasses leave warning'],
 ['POST timeout unlocks editor','timeout','if (failure.uncertain) setUncertain(true)','if (failure.uncertain) setUncertain(false)','POST timeout is uncertain'],
 ['availability failure has no retry','availability','setAvailabilityRetry(true);','setAvailabilityRetry(false);','availability failure offers retry'],
 ['gallery bypasses reload pointer','retry','[currentFlow, signedIn, accountKey, selected?.id]','[currentFlow, signedIn, accountKey, initialId]','gallery selection also respects uncertain marker'],
 ['terminal replay skips status','states',"const needsStatus = (data.clip.status === 'done'", "const needsStatus = false && (data.clip.status === 'done'",'terminal replay requests authoritative status'],
 ['reload drops payload snapshot','reloadSnapshot','attempt.current = restored','attempt.current = null','validated reload snapshot offers same-request retry'],
 ['snapshot owner not checked','reloadSnapshot','saved.account !== account ||','false ||','invalid saved snapshot remains blocked'],
 ['auth reply clears uncertain request','uncertainRecovery','const ambiguous = retrying ||','const ambiguous = false ||','auth during uncertain retry retains same-request retry'],
 ['storage failure clears uncertain payload','uncertainRecovery','if (!retrying) { clearAttempt(sent.model); requestKey.current = null }','if (true) { clearAttempt(sent.model); requestKey.current = null }','failed snapshot rewrite keeps retry payload in memory'],
 ['current refusal discards earlier request','uncertainHttpErrors','const ambiguous = retrying ||','const ambiguous = false ||','current HTTP refusal keeps uncertain fields locked'],
 ['all errors become permanently uncertain','uncertainHttpErrors','const ambiguous = retrying ||','const ambiguous = true ||','first known refusal still permits correction'],
]
const selectedMutants=mutants.filter(([,scenario])=>requested===null||requested===scenario)
for(const[name,scenario,from,to,message]of selectedMutants){let error;try{await scenarios[scenario](replace(from,to))}catch(e){error=e}assert.ok(error instanceof assert.AssertionError&&error.message===message,`mutant ${name}: expected ${message}; got ${error?.message}`);console.log('ok mutant: '+name)}
if(requested===null){
const css=fs.readFileSync(path.join(ROOT,'app/recreate/currentFlow.css'),'utf8')
ok(css.includes('object-fit:contain')&&css.includes('env(safe-area-inset-bottom)')&&css.includes('position:fixed'),'flow CSS retains full photo and visible mobile dock')
ok([...css.matchAll(/font-size:(\d+)px/g)].every(m=>Number(m[1])>=12),'flow CSS font floor is 12px')
ok(!/watch|#c4ff|lime/i.test(css),'flow CSS uses current appearance only')
}
console.log(`PASS current Recreate flow${requested?' ['+requested+']':''}: ${baseline+(requested===null?3:0)} checks and ${selectedMutants.length} exact-assertion mutants; injected I/O only.`)
