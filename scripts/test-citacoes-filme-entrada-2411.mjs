import assert from 'node:assert/strict'
import fs from 'node:fs'
import {offlineModules,source} from './gpt24h-offline-support.mjs'
const ENTRY='app/api/citations/film-entry/route.ts',RELEASE='lib/growth/citationFilmRelease.ts'
const exact=offlineModules()('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS
const house={id:'fixture-house',email:exact[0],email_confirmed_at:'fixture'},buyer={id:'fixture-buyer',email:'local-proof',email_confirmed_at:'fixture'}
const campaigns=['push60_free_ai_shorts_generator','starter_shorts_pay','push77_short_cost_calculator','starter_reels_pay','starter_best_generators','starter_state_of_ai_shorts','push22_script_generator']
const fake="const NextResponse={json:(body,o)=>({body,status:o?.status??200,headers:new Map(Object.entries(o?.headers??{}))}),redirect:(url,status)=>({url:String(url),status,headers:new Map()})}"
function world({release='public',user=null,error=null,throws=false,rep={}}={}){
 let reads=0
 const replacements={...rep,[ENTRY]:(rep[ENTRY]??source(ENTRY)).replace("import { NextResponse } from 'next/server'",fake),[RELEASE]:source(RELEASE).replace(/CITATION_FILM_RELEASE: CitationFilmRelease = '(off|internal|public)'/,"CITATION_FILM_RELEASE: CitationFilmRelease = '"+release+"'")}
 const l=offlineModules({replacements,mocks:{'lib/supabase/server.ts':{createClient:()=>({auth:{getUser:async()=>{reads++;if(throws)throw Error('offline');return{data:{user},error}}}})}}})
 return{GET:l(ENTRY).GET,l,reads:()=>reads}
}
function params(campaign,mode='ai'){return new URLSearchParams({prompt:'A brass owl.\r\nIt counted three lights.',create_intent:campaign===campaigns[0]?'trial_best':'fast',intent_campaign:campaign,script_mode:mode,redirect:'https://untrusted.invalid/ignored'})}
const request=p=>new Request('http://local.invalid/api/citations/film-entry?'+p)
let checks=0
async function verify(rep={}){
 for(const campaign of campaigns)for(const mode of ['ai','verbatim'])for(const user of [null,buyer]){
  const w=world({rep,user}),result=await w.GET(request(params(campaign,mode)))
  assert.equal(result.status,303,'ENTRY redirects without generation')
  assert.equal(w.reads(),1,'ENTRY identity verified on server')
  assert.ok(result.headers.get('Cache-Control').includes('private')&&result.headers.get('Cache-Control').includes('no-store'),'ENTRY private uncached')
  assert.ok(result.headers.get('Vary').includes('Cookie'),'ENTRY varies by identity')
  const target=new URL(result.url);assert.equal(target.origin,'http://local.invalid','ENTRY same origin only')
  assert.equal(target.pathname,user?'/studio':'/signup','ENTRY actual path for session state')
  assert.equal(target.searchParams.get('prompt'),'A brass owl.\nIt counted three lights.','ENTRY exact normalized words')
  assert.equal(target.searchParams.get('script_mode'),mode,'ENTRY mode')
  if(user){for(const key of ['create_intent','autoanalyze','studio'])assert.equal(target.searchParams.has(key),false,'ENTRY manual review no autostart')}
  else {
   const preview=w.l('lib/growth/signupCreationPreview.ts').buildSignupCreationPreviewFromAuthParams(target.searchParams)
   assert.ok(preview,'ENTRY real saved card recognizes canonical redirect')
   assert.equal(preview.kind,mode==='ai'?'idea':'script','ENTRY saved card mode')
   assert.equal(target.searchParams.get('create_intent'),params(campaign).get('create_intent'),'ENTRY benefit kept')
  }
  checks++
 }
 for(const [release,user,error,throws,status,reads]of [['off',buyer,null,false,404,0],['internal',null,null,false,404,1],['internal',buyer,null,false,404,1],['internal',house,null,false,303,1],['public',null,{name:'AuthSessionMissingError'},false,303,1],['public',null,{name:'AuthApiError'},false,503,1],['public',buyer,null,true,503,1]]){
  const w=world({rep,release,user,error,throws}),r=await w.GET(request(params(campaigns[0])));assert.equal(r.status,status,'ENTRY gate/error status');assert.equal(w.reads(),reads,'ENTRY off no auth reads');checks++
 }
 for(const [key,value]of [['intent_campaign','unapproved'],['prompt',''],['prompt','x'.repeat(1001)],['script_mode','bad'],['create_intent','other'],['duration','60'],['language','pt']]){
  const p=params(campaigns[0]);p.set(key,value);const w=world({rep});assert.equal((await w.GET(request(p))).status,400,'ENTRY unsupported input rejected');assert.equal(w.reads(),0);checks++
 }
}
await verify()
const mutate=(a,b)=>{const s=source(ENTRY);assert.equal(s.split(a).length,2);return{[ENTRY]:s.replace(a,b)}}
const mutants=[
 ['machine bypass',"user ? destinoDaIdeia(canonical) : '/signup'","user ? canonical : '/signup'",'ENTRY actual path for session state'],
 ['cache public',"'private, no-store, max-age=0'","'public, max-age=60'",'ENTRY private uncached'],
 ['internal widened',"CITATION_FILM_RELEASE === 'internal' && !citationIdeaVisible(user, 'internal')","CITATION_FILM_RELEASE === 'internal' && false",'ENTRY gate/error status'],
 ['auth errors ignored',"if (error && error.name !== 'AuthSessionMissingError') return fail(503)","if (false) return fail(503)",'ENTRY gate/error status'],
 ['mode overwritten','createIntent, scriptMode })',"createIntent, scriptMode: 'ai' })",'ENTRY saved card mode'],
 ['scope widened','!CAMPAIGNS.has(campaign)','false','ENTRY unsupported input rejected'],
]
for(const[name,a,b,message]of mutants){await assert.rejects(()=>verify(mutate(a,b)),e=>e?.code==='ERR_ASSERTION'&&e.message.startsWith(message),name+' exact failure');console.log('PASS mutant '+name+' -> '+message)}
if(process.env.KINEO_CITATION_ENTRY_PROOF)fs.writeFileSync(process.env.KINEO_CITATION_ENTRY_PROOF,JSON.stringify({positiveCases:42,mutants:mutants.length,scope:'Real server GET and real signup preview; controlled auth I/O; no URL rewriting in browser proof; no network/account/generation/payment.'},null,2))
console.log('PASS 42 server entry cases, six exact mutants; guest canonical card and verified session manual Studio; no addresses logged.')
