// VOLTA 2: mounted real React components, controlled auth promises, no network or account.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
const req=createRequire(process.cwd()+'/package.json')
const renderer=process.env.KINEO_CITATION_TEST_RENDERER||req.resolve('react-test-renderer')
const rr=createRequire(renderer),React=rr('react'),{create,act}=req(renderer)
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const support=fs.readFileSync('scripts/gpt24h-offline-support.mjs','utf8').replace("resolve(dirname(fileURLToPath(import.meta.url)), '..')","process.cwd()").replace("const require = createRequire(resolve(root, 'package.json'))",`const local=createRequire(resolve(root,'package.json'));const reactRequire=createRequire(${JSON.stringify(renderer)});const require=n=>n==='react'||n.startsWith('react/')?reactRequire(n):local(n)`)
const {offlineModules,source}=await import('data:text/javascript;base64,'+Buffer.from(support).toString('base64'))
const BOX='components/seo/CitationIdeaForm.tsx',GATE='lib/growth/citationIdeaAccess.ts',HANDOFF='lib/gptHandoff.ts'
const dep={[HANDOFF]:source(HANDOFF).replace("import { createHash } from 'node:crypto'","const createHash=()=>{throw Error('Not used by this offline form proof')}")}
const identity=offlineModules()('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS
const A={id:'house-a',email:identity[0],email_confirmed_at:'2026-11-23'},B={id:'house-b',email:identity[1],email_confirmed_at:'2026-11-23'},OUT={id:'buyer',email:'test-buyer@example.com',email_confirmed_at:'2026-11-23'}
const draft='Meu relógio azul voltou três minutos quando a torre tocou.',newDraft='A coruja contou quatro lanternas antes do amanhecer.'
const payload=(user,error=null)=>({data:{user},error})
async function mount(rep={},article='best',release='internal'){
 let callback,unsubscribed=0;const requests=[]
 const auth={getUser:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),onAuthStateChange:f=>{callback=f;return{data:{subscription:{unsubscribe:()=>unsubscribed++}}}}}
 const gate=(rep[GATE]??source(GATE)).replace("CITATION_IDEA_RELEASE: CitationIdeaRelease = 'off'",`CITATION_IDEA_RELEASE: CitationIdeaRelease = '${release}'`)
 const l=offlineModules({replacements:{...dep,...rep,[GATE]:gate},mocks:{'lib/supabase/client.ts':{createClient:()=>({auth})},'lib/analytics.ts':{trackEvent(){},trackClosedEvent(){},rememberSignupCampaign(){}}}})
 let tree;await act(async()=>{tree=create(React.createElement(l(BOX).default,{article}),{unstable_isConcurrent:true})})
 const fields=()=>tree.root.findAllByType('textarea'),field=()=>fields()[0],modes=()=>tree.root.findAllByType('button').filter(x=>x.props['aria-pressed']!==undefined).map(x=>x.props['aria-pressed'])
 const resolve=async(i,user,error=null)=>{assert.ok(requests[i],'auth request exists');await act(async()=>requests[i].resolve(payload(user,error)))}
 const emit=async(event,user)=>{await act(async()=>callback(event,user?{user}:null))}
 const fill=async(mode='finished_script',text=draft)=>{await act(async()=>{const buttons=tree.root.findAllByType('button').filter(x=>x.props['aria-pressed']!==undefined);buttons[mode==='idea'?0:1].props.onClick()});await act(async()=>field().props.onChange({target:{value:text}}))}
 const snapshot=phase=>({article,phase,fields:fields().length,text:field()?.props.value??null,modes:modes(),reads:requests.length})
 return{tree,requests,fields,field,modes,resolve,emit,fill,snapshot,callback:()=>callback,unsubscribeCount:()=>unsubscribed,close:async()=>{await act(async()=>tree.unmount())}}
}
function retained(h,text,mode,message){assert.equal(h.fields().length,1,message);assert.equal(h.field().props.value,text,message);assert.deepEqual(h.modes(),mode==='idea'?[true,false]:[false,true],message)}
function empty(h,message){assert.equal(h.fields().length,0,message)}
function fresh(h,message){retained(h,'','idea',message)}
async function verify(rep={}){
 const proof=[]
 for(const article of ['best','pay'])for(const mode of ['idea','finished_script']){
  const h=await mount(rep,article);try{
   empty(h,'initial access waits for getUser');await h.resolve(0,A);await h.fill(mode);proof.push(h.snapshot('before renewal'))
   await h.emit('TOKEN_REFRESHED',A);retained(h,draft,mode,'renewal keeps field while pending');proof.push(h.snapshot('renewal pending'))
   await h.resolve(1,{...A});retained(h,draft,mode,'renewal keeps draft after verification');proof.push(h.snapshot('renewal verified'))
   await h.emit('SIGNED_IN',A);retained(h,draft,mode,'same-account sign-in preserves draft pending');await h.resolve(2,A);retained(h,draft,mode,'same-account sign-in preserves draft verified')
  }finally{await h.close()}
 }
 // Logout invalidates every pending read, and even a batched relogin to the same ID gets a fresh child.
 {const h=await mount(rep);try{
  await h.resolve(0,A);await h.fill();await h.emit('TOKEN_REFRESHED',A);await h.emit('SIGNED_OUT',null);empty(h,'logout closes field immediately');proof.push(h.snapshot('logout'))
  await h.resolve(1,A);empty(h,'logout ignores pending response')
  await h.emit('SIGNED_IN',A);await h.resolve(2,A);fresh(h,'relogin gets fresh draft');await h.fill()
  await act(async()=>{h.callback()('SIGNED_OUT',null);h.callback()('SIGNED_IN',{user:A});h.requests.at(-1).resolve(payload(A))});fresh(h,'logout/login batch discards old text');proof.push(h.snapshot('batched relogin fresh'))
 }finally{await h.close()}}
 // A verified account context change must reset even if React batches clear + grant together.
 {const h=await mount(rep);try{await h.resolve(0,A);await h.fill();await h.emit('TOKEN_REFRESHED',A);await h.resolve(1,{...A,email:B.email});fresh(h,'verified account change discards old draft');proof.push(h.snapshot('verified account context changed'))}finally{await h.close()}}
 // Different ID, including a different account with the same e-mail: old state must disappear before verification.
 for(const next of [B,{...B,email:A.email},OUT]){const h=await mount(rep);try{
  await h.resolve(0,A);await h.fill();await h.emit('SIGNED_IN',next);empty(h,'identity switch hides old field while pending');proof.push(h.snapshot('identity switch pending '+next.id))
  await h.resolve(1,next);if(next.id==='buyer')empty(h,'external identity stays closed');else fresh(h,'new identity gets fresh draft')
 }finally{await h.close()}}
 // A valid-looking callback cannot grant access; the verified response must have the requested identity.
 {const h=await mount(rep);try{await h.resolve(0,A);await h.fill();await h.emit('SIGNED_IN',B);await h.resolve(1,A);empty(h,'identity mismatch stays closed')}finally{await h.close()}}
 // Latest revocation closes the draft, including responses carrying user + error and thrown requests.
 for(const kind of ['null','error','throw','unconfirmed']){const h=await mount(rep);try{
  await h.resolve(0,A);await h.fill();await h.emit('TOKEN_REFRESHED',A)
  if(kind==='throw')await act(async()=>h.requests[1].reject(new Error('Revoked')))
  else await h.resolve(1,kind==='null'?null:kind==='unconfirmed'?{...A,email_confirmed_at:null}:A,kind==='error'?new Error('Revoked'):null)
  empty(h,'revoked session removes draft');proof.push(h.snapshot('revoked '+kind))
 }finally{await h.close()}}
 // Last response wins. A stale success cannot change owner, and a stale failure cannot erase the latest draft.
 {const h=await mount(rep);try{
  await h.resolve(0,A);await h.fill();await h.emit('SIGNED_IN',B);await h.emit('SIGNED_IN',A);await h.resolve(2,A);await h.fill('finished_script',newDraft);await h.resolve(1,B);retained(h,newDraft,'finished_script','late response cannot replace current draft');proof.push(h.snapshot('late other-account response ignored'))
  await h.emit('TOKEN_REFRESHED',A);await h.emit('TOKEN_REFRESHED',A);await h.resolve(4,A);await h.resolve(3,null,new Error('Old failure'));retained(h,newDraft,'finished_script','late failed response cannot erase current draft')
 }finally{await h.close()}}
 {const h=await mount(rep);try{
  await h.emit('SIGNED_IN',B);await h.resolve(1,B);await h.fill('idea',newDraft);await h.resolve(0,A);retained(h,newDraft,'idea','late initial response cannot replace current draft')
 }finally{await h.close()}}
 // Existing public guest behavior stays public; off never requests auth. No new login requirement.
 for(const release of ['off','public']){const h=await mount(rep,'best',release);try{assert.equal(h.requests.length,0,'off/public do not request preview auth');if(release==='off')empty(h,'off remains closed');else{await h.fill();retained(h,draft,'finished_script','public guest input unchanged')}}finally{await h.close()}}
 {const h=await mount(rep);await h.close();assert.equal(h.unsubscribeCount(),1,'subscription is cleaned up');await act(async()=>{h.callback()('SIGNED_IN',{user:A});h.requests[0].resolve(payload(A))});assert.equal(h.requests.length,1,'unmounted listener cannot start more reads')}
 return proof
}
const oldSha=process.env.KINEO_CITATION_BASE_SHA
const proof=await verify(oldSha?{[BOX]:execFileSync('git',['show',oldSha+':'+BOX],{encoding:'utf8'})}:{})
console.log('PASS mounted real forms: 4 article/mode renewals, pending reads, logout, batched relogin, identity switches, revocations, out-of-order results and cleanup')
if(process.env.KINEO_CITATION_LIFECYCLE_PROOF)fs.writeFileSync(process.env.KINEO_CITATION_LIFECYCLE_PROOF,JSON.stringify({scope:'React Test Renderer 18.3.1 concurrent root; no browser or viewport, real components with fake auth promises; no account/network/movie',proof},null,2))
if(!oldSha){
 const sub=(a,b)=>{const s=source(BOX).replace(/\r\n/g,'\n');assert.equal(s.split(a).length,2,'exact mutation anchor '+a);return{[BOX]:s.replace(a,b)}}
 const mutants=[
  ['clear on refresh',()=>sub('const current = ++generation','const current = ++generation\n        forgetDraft()'),'renewal keeps field while pending'],
  ['no state key',()=>sub("key={`${user?.id ?? 'public'}:${draftVersion}`} ",''),'verified account change discards old draft'],
  ['logout leaves draft',()=>sub('generation++\n          forgetDraft()','generation++\n          // mutation: draft not cleared'),'logout closes field immediately'],
  ['logout does not invalidate request',()=>sub('generation++\n          forgetDraft()','// mutation: generation unchanged\n          forgetDraft()'),'logout ignores pending response'],
  ['stale response accepted',()=>sub('if (!active || current !== generation) return','if (!active) return'),'logout ignores pending response'],
  ['auth error ignored',()=>sub('const next = error ? null : data.user','const next = data.user'),'revoked session removes draft'],
  ['wrong verified identity accepted',()=>sub('(expectedId && next.id !== expectedId)','false'),'identity mismatch stays closed'],
  ['identity switch keeps old field',()=>sub('if (verified.current?.id !== hint.id) forgetDraft()','if (false) forgetDraft()'),'identity switch hides old field while pending'],
 ]
 for(const [name,mutate,message]of mutants){await assert.rejects(()=>verify(mutate()),e=>e?.code==='ERR_ASSERTION'&&e.name==='AssertionError'&&(e.message===message||e.message.startsWith(message+'\n')),name+' must fail at exact assertion '+message);console.log('PASS mutant '+name+' -> '+message)}
 console.log('PASS '+mutants.length+' lifecycle mutants killed by their exact assertion; no network or spend')
}
