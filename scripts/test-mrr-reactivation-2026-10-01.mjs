import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file='app/api/admin/mrr-reactivation/route.ts',read=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n'),source=read(file)
const pure=createOfflineLoader()('lib/growth/mrrReactivation.ts')
const good={id:'00000000-0000-4000-8000-000000000111',email:'creator@example.test',has_paid:false,plan:'free',email_opted_out:false,created_at:new Date(Date.now()-2*86400000).toISOString()}
assert.equal(pure.eligibleReactivationProfile(good),true)
for(const patch of [{has_paid:true},{has_paid:null},{plan:'creator'},{email_opted_out:true},{email:'den.higgins@example.test'},{email:'x@altaitools.com'},{email:'josephsskaf@gmail.com'}])assert.equal(pure.eligibleReactivationProfile({...good,...patch}),false)
assert.ok(!pure.readyFilmDraft('hello\r\nBcc: x').subject.includes('\n'))
assert.ok(pure.readyFilmDraft('My film').text.includes('/library?'))
assert.ok(!pure.readyFilmDraft('My film').text.includes('/v/'))
const paged=await pure.readEveryPage(async(a,b)=>({data:Array.from({length:Math.max(0,Math.min(1201-a,b-a+1))},(_,i)=>a+i),error:null}));assert.equal(paged.length,1201)
await assert.rejects(()=>pure.readEveryPage(async()=>({data:null,error:'offline'})))

async function contract(text=source,sendEnabled=true){
 let founder=true,suppressed=false;const sent=[],written=[],events=[]
 const db={from(table){let write=null;const q={select(){return q},order(){return q},range(){return q},in(){return q},eq(){return q},gte(){return q},lt(){return q},insert(row){write=row;return q},then(resolve,reject){
  let result={data:[],error:null,count:0};
  if(write){written.push({table,row:write});if(write.id&&events.some(e=>e.id===write.id))result.error={code:'23505'};else events.push(write)}
  else if(table==='profiles')result.data=[good];else if(table==='events')result.data=events;else if(table==='videos')result.data=[{id:'video-fixture',user_id:good.id,status:'completed',video_url:'https://example.test/film.mp4',title:'My film',created_at:good.created_at}];
  return Promise.resolve(result).then(resolve,reject)
 }};return q}}
 const load=createOfflineLoader({source:(p,s)=>p===file?text:p==='lib/growth/mrrReactivation.ts'&&sendEnabled?s.replace('MRR_REACTIVATION_SEND_ENABLED = false','MRR_REACTIVATION_SEND_ENABLED = true'):s,env:{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.test',SUPABASE_SERVICE_ROLE_KEY:'offline-fixture-not-a-secret',RESEND_API_KEY:'offline-fixture'},globals:{AbortSignal:{timeout:()=>undefined},fetch:async(url,init)=>{sent.push({url,init});return{ok:true,status:200,json:async()=>({id:'provider-fixture'})}}},mocks:{
  'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
  '@supabase/supabase-js':{createClient:()=>db},
  '@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'founder-fixture',email:founder?'josephsskaf@gmail.com':'stranger@example.test'}}})}})},
  '@/lib/lifecycle/suppression':{loadLifecycleSuppression:async()=>({degraded:suppressed,eventsDegraded:false,isSuppressed:()=>suppressed})},
  '@/lib/emailSuppression':{emailFooterText:()=> '\nUnsubscribe: https://example.test/unsubscribe',unsubscribeHeaders:()=>({'List-Unsubscribe':'fixture'})},
  '@/lib/email/quota':{dailyCap:()=>100,recordResendResponse:async()=>{}},
 }})
 const api=load(file),request=body=>({headers:{get:()=> 'https://example.test'},nextUrl:{origin:'https://example.test'},json:async()=>body})
 founder=false;assert.equal((await api.GET()).status,403);founder=true
 suppressed=true;assert.equal((await api.GET()).status,503);suppressed=false
 let preview=await api.GET();assert.equal(preview.status,200);assert.equal(preview.body.sent,0);assert.equal(preview.body.recipients.length,1)
 assert.equal(written.length,0);assert.equal(sent.length,0)
 assert.equal((await api.POST(request({dryRun:true}))).status,200);assert.equal(written.length,0)
 assert.equal((await api.POST({...request({}),headers:{get:()=> 'https://evil.test'}})).status,403)
 const body={dryRun:false,confirm:'SEND_REVIEWED_READY_FILMS',ids:[good.id],expires:preview.body.expires,reviewToken:preview.body.reviewToken}
 if(!sendEnabled){assert.equal((await api.POST(request(body))).status,423);assert.equal(sent.length,0);assert.equal(written.length,0);return}
 assert.equal((await api.POST(request({...body,reviewToken:'0'.repeat(64)}))).status,409);assert.equal(sent.length,0)
 const result=await api.POST(request(body));assert.equal(result.status,200);assert.equal(sent.length,1);assert.equal(written[0].row.name,'mrr_ready_film_claimed')
 assert.equal((await api.POST(request(body))).status,409);assert.equal(sent.length,1,'repeat click cannot resend')
 const payload=JSON.parse(sent[0].init.body);assert.equal(payload.reply_to,'joseph@usekineo.com');assert.ok(payload.text.includes('Unsubscribe:'));assert.ok(payload.text.includes('My film'));assert.equal(payload.to.length,1)
}
assert.equal(pure.MRR_REACTIVATION_SEND_ENABLED,false)
await contract(source,false)
await assert.rejects(()=>contract(source.replace('!MRR_REACTIVATION_SEND_ENABLED','false'),false))
await contract()
for(const [from,to]of[
 ["user.email?.trim().toLowerCase() !== FOUNDER","false"],['body.dryRun !== false','false'],
 ["req.headers.get('origin') !== req.nextUrl.origin","false"],['suppression.degraded || suppression.eventsDegraded','false'],
 ['!matches(body.reviewToken, reviewToken(ctx, recipients, body.expires))','false'],
]){assert.ok(source.includes(from));await assert.rejects(()=>contract(source.replace(from,to)),from)}
assert.ok(read('lib/lifecycle/emailEvents.ts').includes("'mrr_ready_film_sent'"))
assert.ok(read('app/api/events/route.ts').includes("'mrr_ready_film_sent'"))
assert.ok(!/setInterval|useEffect/.test(read('components/growth/MrrReactivationReview.tsx')),'no auto-send lifecycle')
console.log('MRR reactivation: 1201-row pagination, exclusions, founder-only preview zero writes, signed review, CSRF, atomic claim, no repeat; 6 killed mutants PASS (includes HOLD: zero writes/sends even with a reviewed founder payload)')
