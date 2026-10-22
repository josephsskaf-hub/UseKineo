// KINEO-ADS-CENA-RETOMADA-2110 — POST/start/advance reais; DB, ledger e fornecedores em dublês sem rede.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { PACING_PHOTO, PACING_HOUSE, PACING_ORDER, pacingShort } from './test-support/ads-cena-95-pacing-fixtures-2110.mjs'
const BASE='796333e9a07ee0c83bb414312a062b63f8fc32bb', MARK='KINEO-ADS-CENA-RETOMADA-2110'
const F={route:'app/api/admin/ads-cena/route.ts',internal:'lib/ads/cena/internal.ts',internalAjuste:'lib/ads/cena/internalAjuste.ts',live:'lib/ads/cena/live.ts',plan:'lib/ads/cena/plan.ts',natural:'lib/ads/cena/ajustePlan.ts',preflight:'lib/ads/cena/ajustePreflight.ts',runtime:'lib/ads/cena/runtime.ts',pipeline:'lib/ads/cena/pipeline.ts',start:'lib/ads/v2StartCore.ts',early:'lib/ads/v2AudioCedo.ts',media:'lib/ads/cena/ajusteMedia.ts',montage:'lib/ads/cena/ajusteMontage.ts',legacyMontage:'lib/ads/cena/montage.ts'}
const read=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).replace(/\r\n/g,'\n')
const plain=x=>JSON.parse(JSON.stringify(x)),same=(a,b,why)=>assert.deepEqual(plain(a),plain(b),why)
const NOW=Date.parse('2026-10-22T20:00:00Z')
class FixedDate extends Date {constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}
class OfflineResponse extends Response {static json(body,init={}){return new OfflineResponse(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json',...init.headers}})}}
const sourceLoader=(over={},mocks={},globals={})=>createOfflineLoader({mocks,source:(p,s)=>over[p]??s,globals:{Request,Response,Headers,Error,Date:FixedDate,...globals}})
export const RETOMADA_FIXTURES=[
 {category:'skincare',product:'Creme GLOW',input:{foto:PACING_PHOTO,frase:'Creme GLOW; Não contém fragrância.',beneficios:['Não contém fragrância.'],oferta:'Compre 1 e leve 2.',cta:'Use o cupom GLOW10.',language:'pt',formato:'ugc',voice_mode:'narrated',rota:'kling3'},raw:{hooks:['Qual creme escolher?','Rotina sem perfume?','GLOW na bancada?'],use:'Veja o Creme GLOW na sua rotina.',benefit:'Ele não contém fragrância. Compre 1 e leve 2.',cta:'Use o cupom GLOW10.'}},
 {category:'footwear',product:'Stride shoes',input:{foto:PACING_PHOTO,frase:'Stride shoes; Easy to clean.',beneficios:['Easy to clean.'],oferta:'Buy one, get one free.',cta:'Choose your Stride shoes.',language:'en',formato:'product',voice_mode:'narrated',rota:'kling3'},raw:{hooks:['Ready to leave?','Time to move?','Which shoes today?'],use:'Take a step with Stride shoes.',benefit:'Stride shoes are easy to clean. Buy one, get one free.',cta:'Choose your Stride shoes.'}},
]
const short=()=>({category:'skincare',product:'GLOW cream',input:{foto:PACING_PHOTO,frase:'GLOW cream',beneficios:[],oferta:'',cta:'Choose GLOW cream.',language:'en',formato:'product',voice_mode:'narrated',rota:'kling3'},raw:{hooks:['Which cream today?','Ready to choose?','What suits you?'],use:'Meet the GLOW cream.',benefit:'',cta:'Choose GLOW cream.'}})
function database(tables, effects) {
  return { tables, from(table) {
    assert.ok(table in tables, 'unexpected offline table ' + table)
    let change, insert, applied = false, result, limit = Infinity; const filters = []
    const q = { select() { return q }, order() { return q }, limit(n) { limit = n; return q }, eq(k, v) { filters.push(r => r[k] === v); return q }, in(k, values) { filters.push(r => values.includes(r[k])); return q }, is(k, v) { filters.push(r => v === null ? r[k] == null : r[k] === v); return q }, update(p) { change = p; return q }, insert(p) { insert = p; return q }, upsert(p) { insert = p; return q },
      exec(single = false) {
        if (!applied) { applied = true
          if (insert !== undefined) { const rows = (Array.isArray(insert) ? insert : [insert]).map(r => ({ id: PACING_ORDER, created_at: new Date(NOW).toISOString(), ...plain(r) })); tables[table].push(...rows); result = { data: rows, error: null }; effects.push(['db-insert', table, plain(rows)]) }
          else { const rows = tables[table].filter(r => filters.every(f => f(r))).slice(0, limit); if (change) { for (const r of rows) Object.assign(r, plain(change)); effects.push(['db-update', table, plain(change)]) } result = { data: rows.map(plain), error: null } }
        }
        return { data: single ? result.data[0] ?? null : result.data, error: result.error }
      }, maybeSingle() { return Promise.resolve(q.exec(true)) }, single() { return q.maybeSingle() }, then(resolve, reject) { return Promise.resolve(q.exec()).then(resolve, reject) },
    }; return q
  } }
}

/** The route, planner, cenaJson, start and advance remain real; only external boundaries are doubled. */
function world(fixture=short(),over={},options={}) {
  const f=plain(fixture),effects=[],events=[],modelCalls=[],moderationCalls=[],tables={ads_v2_orders:[],profiles:[{id:PACING_HOUSE.id,video_credits:1000}],ads_v2_shots:[]},admin=database(tables,effects)
  admin.auth={admin:{getUserById:async()=>({data:{user:PACING_HOUSE},error:null})}}
  const access={reason:'internal',ownerId:PACING_HOUSE.id,admin},unexpected=(...a)=>{throw new Error('offline boundary unexpectedly called: '+a.join(' '))}
  const forbidden95=name=>(..._a)=>{effects.push(['forbidden95',name]);throw new Error('95 engine must remain disabled: '+name)}
  const shots={submitShotOnce:async(endpoint,input)=>{const saved=tables.ads_v2_orders[0]?.plan.cena;effects.push(['queue',endpoint,plain(input),saved?.ajusteMedia?.close.status]);return {kind:'accepted',requestId:'offline-close-job'}},pollFalJob:async()=>({state:'done',url:'https://offline.example/fal-close.mp4'}),persistShotClip:async()=>({storedUrl:'https://offline.example/stored-close.mp4',measuredSeconds:options.closeSeconds??5})}
  const billing={adsV2BillingRef:()=> 'offline-ledger',chargeAdsV2:async(_db,r)=>{effects.push(['debit',plain(r)]);tables.profiles[0].video_credits-=r.cost;return {ok:true,balance:tables.profiles[0].video_credits}},failAdsV2Order:async(_db,order,reason)=>{const r=tables.ads_v2_orders.find(x=>x.id===order.id);if(r?.status==='failed')return {won:false,refund:'confirmed',amount:0};if(r)r.status='failed';effects.push(['refund',reason]);return {won:true,refund:'confirmed',amount:41}}}
  const compose={CreatomateSubmitError:class extends Error{},submitCreatomateRender:async source=>{effects.push(['render',plain(source)]);return 'offline-render'},uploadVoiceoverToSupabase:async()=>{effects.push(['voice-upload']);return 'https://offline.example/voice.mp3'},estimateMp3DurationSeconds:()=>options.voiceSeconds??14}
  const advance={loadAdsV2Order:async(_db,id,uid)=>({order:plain(tables.ads_v2_orders.find(r=>r.id===id&&r.user_id===uid)??null),error:null}),buildInitialShotRows:()=>[],dispatchAdsV2Shots:async()=>{effects.push(['legacy-dispatch']);return 0},loadAdsV2Shots:async()=>[],adsV2View:o=>({order_id:o.id,status:o.status}),adsV2PresenterPlanOf:()=>null,adsV2CloseRealNarrationVoice:unexpected}
  const moderateContent=async a=>{moderationCalls.push(plain(a));return options.moderate?options.moderate(a):{ok:true}}
  const mocks={
    'next/server':{NextResponse:OfflineResponse,NextRequest:Request},'@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user:options.user===undefined?PACING_HOUSE:options.user}})}})},'../_shared/db':{isAdminEmail:e=>e===PACING_HOUSE.email},
    '@/lib/ads/serverAccess':{loadAdsAccess:async()=>access,adsGate:r=>r==='internal'?'ok':'no_access',adsSampleOpen:async()=>false,isMissingAdsTable:()=>false},'@/lib/ads/v2Access':{adsV2Visible:()=>true},'@/lib/ads/v2Tiers':{adsV2Credits:()=>41,estimateAdUsd:()=>({totalUsd:1.23})},'@/lib/serverEvents':{writeServerEvent:async e=>events.push(plain(e))},'@/lib/safety/contentModeration':{moderateContent},
    '@/lib/ads/v2Billing':billing,'../v2Billing':billing,'@/lib/ads/v2Advance':advance,'@/lib/compose':compose,'@/lib/ttsFallback':{synthesizeTtsFallback:async(text)=>{effects.push(['voice',text]);return Buffer.from('offline voice')}},'../v2Shots':shots,'@/lib/ads/v2Shots':shots,'../v2Images':{persistSceneImage:unexpected},'@/lib/userFootage':{FOOTAGE_PUBLIC_PREFIX:'https://offline.example/footage/'},
    '@/lib/lyriaMusic':{submeterLyria:async()=>{effects.push(['music-submit']);return {requestId:'music-job',statusUrl:'https://offline.example/music-status',responseUrl:'https://offline.example/music-result'}},esperarLyria:async h=>{effects.push(['music-poll',plain(h)]);return 'https://offline.example/music.mp3'},lyriaPromptFor:x=>x},
    '@/lib/openai':{openai:{chat:{completions:{create:async(request,transport)=>{assert.equal(transport.maxRetries,0);assert.equal(transport.timeout,20_000);assert.equal(request.response_format.type,'json_object');modelCalls.push(plain(request));const vision=request.messages[1].content.some(p=>p.type==='image_url'),index=modelCalls.filter(c=>!c.messages[1].content.some(p=>p.type==='image_url')).length-1;const content=vision?{category:f.category,confidence:.99,product:f.product,offer:'',benefits:[],photo_is_isolated_product:options.isolated??false}:options.rawSequence?.[Math.min(index,options.rawSequence.length-1)]??f.raw;return {choices:[{message:{content:JSON.stringify(content)}}],usage:{prompt_tokens:111,completion_tokens:77}}}}}}},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000003'},
  }
  if(!options.allow95)for(const key of ['./plan95','@/lib/ads/cena/plan95'])mocks[key]={planCena95:forbidden95('planner'),cena95CostTableOf:()=>null}
  if(!options.allow95){mocks['./pipeline95']={newCena95State:forbidden95('state')};mocks['./presenters95']={cena95ActorFromOrder:forbidden95('history')};mocks['@/lib/ads/cena/preflight95']={cena95Preflight:forbidden95('preflight')}}
  mocks['./runtime95']={advanceCena95Order:options.paid95?async()=>effects.push(['paid95-resumed']):forbidden95('runtime')}
  const load=sourceLoader(over,mocks)
  return {f,effects,events,modelCalls,moderationCalls,tables,admin,access,load,
    async post(dry_run=true,body={}){const r=await load(F.route).POST(new Request('https://offline.example/api/admin/ads-cena',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f.input,dry_run,...body})}));return {status:r.status,body:await r.json(),headers:r.headers}},
    async start(dry_run=false){const r=await load(F.start).adsV2StartFor(PACING_HOUSE,access,async()=>({order_id:PACING_ORDER,dry_run}),NOW);return {status:r.status,body:await r.json()}},
    async advance(){await load(F.runtime).advanceCenaOrder(admin,plain(tables.ads_v2_orders[0]),NOW+60_000)},
  }
}

async function httpProof(over={}) {
  assert.equal(sourceLoader(over)(F.live).CENA95_LIVE,false,'95 is dormant by default')
  for(const fixture of [...RETOMADA_FIXTURES,short()]){
    const dry=world(fixture,over),live=world(fixture,over),a=await dry.post(),b=await live.post(false)
    assert.equal(a.status,200,JSON.stringify(a.body));assert.equal(b.status,202,JSON.stringify(b.body))
    const p=live.tables.ads_v2_orders[0].plan.cena.plan;same(a.body.plan,p,'dry/live use identical GPT text and composition');same(a.body.costs,b.body.costs)
    assert.equal(a.body.engine,'AJUSTE-2110');assert.equal(p.ajusteLive.version,MARK);assert.ok(!('quality95'in p));assert.equal(dry.effects.length,0);assert.equal(dry.tables.ads_v2_orders.length,0)
    assert.equal(live.effects.filter(e=>e[0]==='debit').length,1);assert.equal(live.tables.profiles[0].video_credits,959);assert.equal(live.effects.filter(e=>['queue','voice','render','music-submit','forbidden95'].includes(e[0])).length,0)
    for(const w of[dry,live]){
      assert.equal(w.modelCalls.length,2,'one classifier plus one GPT script, no 95 history/isolated-photo gate')
      const speech=[fixture.raw.hooks[0],fixture.raw.use,fixture.raw.benefit,fixture.raw.cta].filter(Boolean).join(' ')
      assert.equal(p.script.narration,speech,'the complete spoken GPT text is validated, never rewritten');assert.equal(p.script.cta,fixture.input.cta)
      assert.ok(w.modelCalls[1].messages[0].content.includes('natural human'));assert.ok(w.modelCalls[1].messages[1].content[0].text.includes(fixture.input.cta))
      assert.equal(w.moderationCalls.filter(c=>c.text===speech).length,1,'generated copy moderated once on dry and live');assert.equal(new Set(w.moderationCalls.map(c=>c.text)).size,w.moderationCalls.length)
      const checked=w.load(F.preflight).preflightCenaAjuste(p,p.input.rota??'kling3');assert.equal(checked.close.photoReference,fixture.input.foto);assert.ok(checked.finalText.length)
      assert.equal(a.body.costs.kling3.totalUsd,null,'extensions never become a made-up measured invoice');assert.ok(a.body.note.includes('não incluem'))
    }
  }
  for(const user of[null,{id:'external',email:'outside@example.com'}]){const w=world(short(),over,{user}),r=await w.post();assert.equal(r.status,user?403:401);assert.equal(w.modelCalls.length,0);assert.equal(w.effects.length,0)}
}

async function copyProof(over={}) {
  const N=sourceLoader(over)(F.natural),fixture=RETOMADA_FIXTURES[0],valid=(r,i=fixture.input,p=fixture.product)=>{let value;assert.doesNotThrow(()=>{value=N.naturalAjusteScript(r,i,p)});return value}
  assert.equal(valid(fixture.raw).narration,[fixture.raw.hooks[0],fixture.raw.use,fixture.raw.benefit,fixture.raw.cta].join(' '))
  assert.equal(valid(short().raw,short().input,short().product).benefit,'')
  for(const change of[{benefit:''},{cta:'Peça seu creme.'},{use:'It offers Creme GLOW.'},{use:'watch as they use Creme GLOW.'},{use:'Escolha Creme GLOW'},{benefit:'Ele cura eczema. Compre 1 e leve 2.'}])assert.throws(()=>N.naturalAjusteScript({...fixture.raw,...change},fixture.input,fixture.product))
  const fragments={...short().input,beneficios:['Easy to clean.']};assert.throws(()=>N.naturalAjusteScript({...short().raw,benefit:'Easy to clean.'},fragments,'GLOW cream'),/sentence/)
  assert.throws(()=>N.naturalAjusteScript({...fixture.raw,benefit:'Ele não contém fragrância.'},fixture.input,fixture.product),'typed offer must remain spoken')
  for(const raw of[{...fixture.raw,use:'Speak slowly and smile. Meet Creme GLOW.'},{...fixture.raw,hooks:['[smiles]','Ready?','Choose?']},{...fixture.raw,use:'Camera pans across Creme GLOW.'}])assert.throws(()=>N.naturalAjusteScript(raw,fixture.input,fixture.product),/natural_speech/)
  for(const product of['Camera case','[GLOW]']){const f=short();f.product=product;f.input={...f.input,frase:product,cta:'Choose '+product+'.'};f.raw={...f.raw,use:'Meet the '+product+'.',cta:f.input.cta};assert.equal(valid(f.raw,f.input,product).use,f.raw.use,'literal product names are not scene directions')}
  const first={...fixture.raw,use:'It offers Creme GLOW.'},w=world(fixture,over,{rawSequence:[first,fixture.raw]}),r=await w.post();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(w.modelCalls.length,3);assert.equal(r.body.plan.script.use,fixture.raw.use)
  const failed=world(fixture,over,{rawSequence:[first,first]}),bad=await failed.post(false);assert.equal(bad.status,502);assert.equal(failed.modelCalls.length,3);assert.equal(failed.effects.length,0)
  for(const dry of[true,false])for(const reason of['blocked','unavailable']){const w=world(short(),over,{moderate:a=>a.text===['Which cream today?','Meet the GLOW cream.','Choose GLOW cream.'].join(' ')?{ok:false,reason}:{ok:true}}),r=await w.post(dry);assert.equal(r.status,reason==='blocked'?422:503);assert.equal(w.effects.length,0)}
}

async function flagProof(over={}) {
  const enabled={[F.live]:read(F.live).replace('CENA95_LIVE: boolean = false','CENA95_LIVE: boolean = true'),...over}
  for(const isolated of[true,false])for(const dry of[true,false]){
    const results=[]
    for(const before of[true,false]){const historical=before?Object.fromEntries([F.internal,F.plan,F.start,F.runtime,F.early].map(p=>[p,git('show',BASE+':'+p)])):{};const w=world(pacingShort(),{...enabled,...historical},{allow95:true,isolated}),r=await w.post(dry);results.push({r:{status:r.status,body:r.body},tables:w.tables,effects:w.effects,events:w.events,calls:w.modelCalls,moderation:w.moderationCalls})}
    same(results[0],results[1],'switch true restores 95 API, costs, DB, debit, moderation and GPT requests byte-for-byte')
    assert.equal(results[1].r.status,isolated?(dry?200:202):400)
  }
  const old=world(pacingShort(),enabled,{allow95:true,isolated:true}),r=await old.post();assert.equal(r.status,200)
  const off=world(short(),over),saved=old.load('lib/ads/cena/pipeline95.ts').newCena95State(r.body.plan,'kling3')
  off.tables.ads_v2_orders.push({id:PACING_ORDER,user_id:PACING_HOUSE.id,status:'planned',tier:'commercial',seconds:15,card_url:PACING_PHOTO,plan:{shots:[{idx:0,kind:'text',source:'user_photo'}],cena:saved}})
  for(const dry of[true,false]){const start=await off.start(dry);assert.equal(start.status,409);assert.equal(start.body.error,'cena95_disabled_replan');assert.equal(off.effects.length,0)}
  const paid=world(short(),over,{paid95:true});paid.tables.ads_v2_orders.push({...plain(off.tables.ads_v2_orders[0]),status:'generating'});await paid.advance();assert.ok(paid.effects.some(e=>e[0]==='paid95-resumed'),'already charged 95 retains its stored engine while default flag is off')
  const changed95=git('diff','--name-only',BASE,'--','lib/ads/cena/*95.ts').trim();assert.equal(changed95,'','all 95 modules remain byte-identical')
}

async function compositionProof(over={}) {
  const C=sourceLoader(over)(F.natural),catalog=sourceLoader(over)('lib/ads/cena/catalog.ts').CENA_CATALOG
  const w=world(short(),over),r=await w.post();assert.equal(r.status,200);const base=r.body.plan
  for(const category of Object.keys(catalog))for(const voice_mode of['narrated','talking'])for(const formato of['ugc','product']){
    const p=C.ajustePlanComposition({...base,category,input:{...base.input,formato,voice_mode},voice_mode,interaction:catalog[category].interaction})
    assert.equal(p.format,formato==='ugc'?'ugc_person':voice_mode==='talking'?'product_talking_close':'product_close_demo')
    for(const prompt of[...p.keyframePrompts,...p.segmentPrompts,p.videoPrompt])assert.ok(prompt.includes(formato==='ugc'?'creator PERSON':'whole product is the protagonist'))
    if(formato==='product'){assert.ok(p.actor.includes('never a full-body'));if(category==='wearable')assert.ok(!p.interaction.includes('runs'));if(voice_mode==='talking')assert.ok(p.actor.includes('speaking mouth'))}
    else assert.ok(p.actor.includes('natural face'))
    assert.equal(p.script.narration,base.script.narration,'visual framing never rewrites copy')
  }
}

async function judgeProof(over={}) {
  const w=world(RETOMADA_FIXTURES[0],over),r=await w.post();assert.equal(r.status,200);const P=w.load(F.plan),Pipe=w.load(F.pipeline),plan=r.body.plan
  const raw={own_hands_attached:true,extra_hands:false,extra_people:false,product_whole:true,product_faithful:true,real_scale:true,touching_face:false,actor_identity_match:true,wardrobe_match:true,product_wrist_match:true,score:85}
  for(const face of[undefined,false,true]){
    const v={...raw,...(face===undefined?{}:{ugc_face_visible:face})}
    assert.equal(P.judgeCena(v,plan.continuity,true).approved,face===true,'new UGC requires a visible creator in the same original judge')
    assert.equal(P.judgeCena(v,plan.continuity).approved,true,'Product and older requests retain the original score80 contract')
    for(const marker of[true,false])for(const formato of['ugc','product']){
      const p=plain(plan);p.input.formato=formato;if(!marker)delete p.ajusteLive
      const s=Pipe.newCenaState(p,'kling3');s.phase='judge';s.jobs=[0,1,2,3].map(index=>({index,kind:'image',status:'done',url:'https://offline.example/keyframe-'+index+'.png'}))
      const calls=[];await Pipe.stepCena(s,{now:()=>NOW,save:async()=>{},json:async c=>{calls.push(c);return v},event:async()=>{},submit:async()=>{throw new Error('unexpected submit')},poll:async()=>{throw new Error('unexpected poll')},persist:async()=>{throw new Error('unexpected copy')}})
      const expects=marker&&formato==='ugc';assert.equal(s.phase,expects&&face!==true?'images':'video');assert.equal(calls.length,4,'no extra paid judge call is introduced')
      assert.equal(calls.every(c=>c.text.includes('ugc_face_visible')),expects)
    }
  }
  for(const key of['own_hands_attached','product_whole','product_faithful','real_scale','actor_identity_match','wardrobe_match','product_wrist_match'])assert.equal(P.judgeCena({...raw,[key]:false},{...plan.continuity,productWrist:'left'},false).approved,false,'fidelity remains fail-closed: '+key)
}

function readyState(plan,route='kling3') {
  const jobs=route==='veo31'?[{seconds:8,keepSeconds:8},{seconds:8,keepSeconds:7}]:[{seconds:15,keepSeconds:15}]
  return {plan:plain(plan),route,phase:'ready',imageRound:1,videoAttempt:1,jobs:jobs.map((j,index)=>({...j,index,kind:'video',status:'done',url:'https://offline.example/scene-'+index+'.mp4'})),voiceUrl:plan.voice_mode==='narrated'?'https://offline.example/voice.mp3':undefined}
}

async function mediaProof(over={}) {
  const w=world(short(),over),r=await w.post();assert.equal(r.status,200);const M=w.load(F.media),plan=r.body.plan
  for(const route of['kling3','seedance2','veo31']){const c=M.ajusteCloseRequest(plan,route);assert.equal(c.photoReference,plan.input.foto);assert.equal(c.input.image_url??c.input.start_image_url,plan.input.foto);assert.equal(c.seconds,route==='veo31'?6:5);assert.equal(c.keepSeconds,5);assert.equal(c.input.generate_audio,false);assert.match(c.input.prompt,/Preserve any hands, people or objects already present/)}
  const make=(options={})=>{const state=readyState(plan),log=[],saved=[];let time=NOW,copies=0;const d={now:()=>time,save:async s=>{saved.push(plain(s));log.push(['save',s.ajusteMedia?.close.status,s.ajusteMedia?.music.status])},submitClose:async j=>{assert.equal(saved.at(-1).ajusteMedia.close.status,'submitting','close intention persisted before POST');log.push(['post',plain(j)]);return options.submit??{kind:'accepted',requestId:'close-job'}},pollClose:async()=>options.poll??{state:'done',url:'https://offline.example/fal.mp4'},persistClose:async()=>{copies++;return options.copy===false?null:{storedUrl:'https://offline.example/copied.mp4',measuredSeconds:options.seconds??5}},submitMusic:async()=>{assert.equal(saved.at(-1).ajusteMedia.music.status,'submitting','music intention persisted before POST');log.push(['music-post']);if(options.musicError)throw new Error('offline music rejection');return {requestId:'music',statusUrl:'https://offline.example/status',responseUrl:'https://offline.example/result'}},pollMusic:async h=>{log.push(['music-poll',plain(h)]);return options.musicPending?null:'https://offline.example/music.mp3'},event:async()=>{}};return {state,d,log,saved,get copies(){return copies},time:n=>time=n}}
  const ok=make();assert.equal(await M.stepAjusteMedia(ok.state,ok.d),'pending');assert.equal(await M.stepAjusteMedia(ok.state,ok.d),'ready');assert.equal(ok.log.filter(x=>x[0]==='post').length,1);assert.equal(ok.log.filter(x=>x[0]==='music-post').length,1);assert.equal(ok.log.find(x=>x[0]==='music-poll')[1].requestId,'music')
  const retry=make({submit:{kind:'rejected'}});await M.stepAjusteMedia(retry.state,retry.d);assert.equal(retry.state.ajusteMedia.close.attempt,2);assert.equal(await M.stepAjusteMedia(retry.state,retry.d),'failed');assert.equal(retry.log.filter(x=>x[0]==='post').length,2)
  const ambiguous=make({submit:{kind:'ambiguous'}});await M.stepAjusteMedia(ambiguous.state,ambiguous.d);await M.stepAjusteMedia(ambiguous.state,ambiguous.d);ambiguous.time(NOW+21*60_000);assert.equal(await M.stepAjusteMedia(ambiguous.state,ambiguous.d),'failed');assert.equal(ambiguous.log.filter(x=>x[0]==='post').length,1);assert.equal(ambiguous.state.ajusteMedia.close.attempt,1)
  const pending=make({poll:{state:'pending',url:null}});await M.stepAjusteMedia(pending.state,pending.d);pending.time(NOW+26*60_000);assert.equal(await M.stepAjusteMedia(pending.state,pending.d),'failed');assert.equal(pending.log.filter(x=>x[0]==='post').length,1)
  const copy=make({copy:false});await M.stepAjusteMedia(copy.state,copy.d);await M.stepAjusteMedia(copy.state,copy.d);await M.stepAjusteMedia(copy.state,copy.d);assert.equal(copy.copies,2);assert.equal(copy.log.filter(x=>x[0]==='post').length,1)
  const shortClip=make({seconds:4.99});await M.stepAjusteMedia(shortClip.state,shortClip.d);await M.stepAjusteMedia(shortClip.state,shortClip.d);assert.equal(shortClip.state.ajusteMedia.close.attempt,2)
  const noMusic=make({musicError:true});await M.stepAjusteMedia(noMusic.state,noMusic.d);assert.equal(await M.stepAjusteMedia(noMusic.state,noMusic.d),'ready');assert.equal(noMusic.state.ajusteMedia.music.status,'skipped')
  const music=make({musicPending:true});await M.stepAjusteMedia(music.state,music.d);await M.stepAjusteMedia(music.state,music.d);await M.stepAjusteMedia(music.state,music.d);assert.equal(music.log.filter(x=>x[0]==='music-post').length,1);music.time(NOW+46_000);assert.equal(await M.stepAjusteMedia(music.state,music.d),'ready');assert.equal(music.state.ajusteMedia.music.status,'skipped')
  const legacy=readyState(plan);delete legacy.plan.ajusteLive;let calls=0;assert.equal(await M.stepAjusteMedia(legacy,{...ok.d,save:async()=>calls++,submitClose:async()=>calls++}),'ready');assert.equal(calls,0)
}

async function runtimeProof(over={}) {
  for(const mode of['narrated','talking']){const f=short();f.input.voice_mode=mode;const w=world(f,over),r=await w.post(false);assert.equal(r.status,202,JSON.stringify(r.body));const row=w.tables.ads_v2_orders[0];row.plan.cena=readyState(row.plan.cena.plan);delete row.plan.cena.voiceUrl
    same(w.load(F.early).adsV2AudioCedoFalta(row),{musica:false,voz:false,narracao:null},'cron early audio must not duplicate AJUSTE audio')
    await w.advance();assert.equal(w.effects.filter(x=>x[0]==='queue').length,1);assert.equal(w.effects.find(x=>x[0]==='queue')[3],'submitting')
    await w.advance();assert.equal(row.status,'assembling');assert.equal(w.effects.filter(x=>x[0]==='voice').length,mode==='narrated'?1:0);assert.equal(w.effects.filter(x=>x[0]==='music-submit').length,1);assert.equal(w.effects.filter(x=>x[0]==='render').length,1)
    await w.advance();assert.equal(w.effects.filter(x=>x[0]==='voice').length,mode==='narrated'?1:0)
  }
  const w=world(short(),over),r=await w.post(false);assert.equal(r.status,202);const p=w.tables.ads_v2_orders[0].plan.cena.plan;p.script.narration+=' tampered';await w.advance();assert.equal(w.tables.ads_v2_orders[0].status,'failed');assert.equal(w.effects.filter(e=>e[0]==='refund').length,1);assert.equal(w.effects.filter(e=>e[0]==='queue').length,0)
  const bad=world(short(),over),dr=await bad.post();assert.equal(dr.status,200);const plan=plain(dr.body.plan);plan.script.narration+=' tampered';bad.tables.ads_v2_orders.push({id:PACING_ORDER,user_id:PACING_HOUSE.id,status:'planned',tier:'commercial',seconds:15,card_url:PACING_PHOTO,plan:{shots:[{idx:0,kind:'text'}],cena:bad.load(F.pipeline).newCenaState(plan,'kling3')}});const s=await bad.start();assert.equal(s.status,502);assert.equal(bad.effects.length,0,'saved AJUSTE is preflighted before debit')
  const fail=world(short(),over,{closeSeconds:4.99}),fr=await fail.post(false);assert.equal(fr.status,202);const row=fail.tables.ads_v2_orders[0];row.plan.cena=readyState(row.plan.cena.plan);delete row.plan.cena.voiceUrl
  for(let n=0;n<4;n++)await fail.advance()
  assert.equal(row.status,'failed');assert.equal(fail.effects.filter(e=>e[0]==='debit').length,1);assert.equal(fail.effects.filter(e=>e[0]==='queue').length,2);assert.equal(fail.effects.filter(e=>e[0]==='refund').length,1);assert.equal(fail.effects.filter(e=>e[0]==='render').length,0)
  const before=[]
  for(const historical of[false,true]){const sources=historical?{...over,[F.runtime]:git('show',BASE+':'+F.runtime)}:over,x=world(short(),sources),res=await x.post();assert.equal(res.status,200);const p=plain(res.body.plan);delete p.ajusteLive;x.tables.ads_v2_orders.push({id:PACING_ORDER,user_id:PACING_HOUSE.id,status:'generating',tier:'commercial',seconds:15,plan:{cena:readyState(p)}});await x.advance();before.push({tables:x.tables,effects:x.effects,events:x.events})}
  same(before[0],before[1],'older AJUSTE runtime keeps response, render JSON, DB and provider behavior exactly')
}

async function montageProof(over={}) {
  const w=world(short(),over),r=await w.post();assert.equal(r.status,200);const M=w.load(F.montage),Media=w.load(F.media)
  for(const route of['kling3','seedance2','veo31'])for(const mode of['narrated','talking']){
    const p={...r.body.plan,voice_mode:mode,input:{...r.body.plan.input,voice_mode:mode}},s=readyState(p,route);s.ajusteMedia={version:MARK,close:{...Media.ajusteCloseRequest(p,route),status:'done',attempt:1,url:'https://offline.example/own-product-close.mp4',measuredSeconds:route==='veo31'?6:5},music:{status:'done',url:'https://offline.example/music.mp3'},voiceSeconds:14}
    let source;assert.doesNotThrow(()=>{source=M.buildAjusteMontage(s)});assert.equal(source.duration,15);assert.equal(source.frame_rate,24)
    const visual=source.elements.filter(e=>e.type==='video'&&e.track===2),native=source.elements.filter(e=>e.type==='video'&&e.track===1)
    assert.equal(visual.reduce((n,e)=>n+e.duration,0),15);assert.equal(visual.at(-1).time,10);assert.equal(visual.at(-1).duration,5);assert.equal(visual.at(-1).source,s.ajusteMedia.close.url);assert.ok(visual.every(e=>e.volume==='0%'))
    assert.equal(native.reduce((n,e)=>n+e.duration,0),mode==='talking'?15:0);assert.ok(native.every(e=>e.volume==='100%'))
    assert.ok(source.elements.every(e=>!['image','shape'].includes(e.type)));assert.equal(source.elements.filter(e=>e.track===50).length,mode==='narrated'?1:0)
    for(const e of source.elements.filter(e=>e.track===60)){const db=20*Math.log10(parseFloat(e.volume)/100);assert.ok(Math.abs(db-(mode==='narrated'&&e.time>=14?-15:-18))<.00001)}
    for(const e of source.elements.filter(e=>e.type==='video'))for(const other of source.elements.filter(other=>other!==e&&other.type==='video'&&other.track===e.track))assert.ok(e.time+e.duration<=other.time+1e-6||other.time+other.duration<=e.time+1e-6,'visual clips never overlap on one track')
    const legacy=plain(s);delete legacy.plan.ajusteLive;same(M.buildAjusteMontage(legacy),w.load(F.legacyMontage).buildCenaMontage(legacy),'no marker keeps the original montage JSON')
  }
  const p=plain(r.body.plan);p.product='GLOW [Pro]';p.input.oferta='Use [GLOW10]';p.script.cta='Choose GLOW [Pro].';const shown=M.ajusteFinalTextElements(p).map(e=>e.text).join(' ');assert.ok(shown.includes('［Pro］')&&shown.includes('［GLOW10］'));assert.ok(!shown.includes('[Pro]'))
}

export async function proofRetomada(over={}){await httpProof(over);await copyProof(over);await compositionProof(over);await judgeProof(over);await flagProof(over);await mediaProof(over);await runtimeProof(over);await montageProof(over)}

/** Local visual receipt: real plan/montage JSON, synthetic scene illustrations, no generated media. */
export async function retomadaPreviewData(){
  const cream=plain(RETOMADA_FIXTURES[0]);cream.input.cta=cream.raw.cta='Peça seu Creme GLOW.'
  const watch={category:'wearable',product:'Pulse',input:{foto:PACING_PHOTO,frase:'Pulse; Bateria para 7 dias.',beneficios:['Bateria para 7 dias.'],oferta:'Frete grátis.',cta:'Escolha Pulse.',language:'pt',formato:'product',voice_mode:'narrated',rota:'kling3'},raw:{hooks:['Qual relógio escolher?','Hora de sair?','Pulse no pulso?'],use:'Conheça o Pulse no seu pulso.',benefit:'A bateria dura 7 dias. Frete grátis.',cta:'Escolha Pulse.'}}
  const out=[]
  for(const f of[cream,watch]){const w=world(f),input=w.load(F.plan).cenaInput(f.input),old=await w.load(F.plan).planCena(input,'kling3',w.load(F.runtime).cenaJson),r=await w.post();assert.equal(r.status,200,JSON.stringify(r.body));const fresh=r.body.plan,s=readyState(fresh);s.ajusteMedia={version:MARK,close:{...w.load(F.media).ajusteCloseRequest(fresh,'kling3'),status:'done',attempt:1,url:'https://offline.example/own-product-close.mp4',measuredSeconds:5},music:{status:'done',url:'https://offline.example/music.mp3'},voiceSeconds:14};out.push({format:f.input.formato,product:f.product,before:{plan:old,source:w.load(F.legacyMontage).buildCenaMontage(readyState(old))},after:{plan:fresh,source:w.load(F.montage).buildAjusteMontage(s)}})}
  return out
}

async function redMutant(label,file,before,after,proof){
  const original=read(file);assert.equal(original.split(before).length-1,1,'unique mutation anchor: '+label);const changed=original.replace(before,after)
  const compiled=ts.transpileModule(changed,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}})
  assert.ok(!(compiled.diagnostics??[]).some(d=>d.category===ts.DiagnosticCategory.Error),'mutant must parse: '+label);assert.doesNotThrow(()=>new vm.Script(compiled.outputText))
  let failure;try{await proof({[file]:changed})}catch(e){failure=e}
  assert.equal(failure?.code,'ERR_ASSERTION','requires a behavioral assertion, never SyntaxError/import/transport: '+label+' '+(failure?.stack??'survived'))
  console.log('ok mutante vermelho: '+label)
}
export async function proofRetomadaMutants(){
  const mutations=[
    ['95 deixa de ser desligado',F.live,'CENA95_LIVE: boolean = false','CENA95_LIVE: boolean = true',httpProof],
    ['admin ignora AJUSTE',F.internal,'if (!CENA95_LIVE) return internalCenaAjusteFor','if (false) return internalCenaAjusteFor',httpProof],
    ['start permite95desligado',F.start,"'quality95' in cena.plan && !CENA95_LIVE","'quality95' in cena.plan && false",flagProof],
    ['pedido95pago perde motor salvo',F.runtime,"if ('quality95' in state.plan)",'if (false)',flagProof],
    ['código reescreve a fala',F.natural,'hook: hooks[0], use, benefit, cta, narration',"hook: hooks[0], use: 'It offers ' + use, benefit, cta, narration",httpProof],
    ['benefício vazio legítimo recusado',F.natural,'((input.beneficios?.length || input.oferta) && !benefit)','!benefit',httpProof],
    ['cupom digitado perde lastro',F.natural,"typedCta: input.cta ?? ''","typedCta: ''",httpProof],
    ['CTA digitado pode sumir',F.natural,'input.cta && fold(cta).replace','false && fold(cta).replace',copyProof],
    ['direções entram na narração',F.natural,'const spoken = all.replace(',"const spoken = ''.replace(",copyProof],
    ['frase incompleta aceita',F.natural,"if (!/^[\\p{Lu}\\p{N}]/u.test(text) || !/[.!?][”\"']?$/u.test(text))",'if (false)',copyProof],
    ['GPT perde nova tentativa',F.plan,'for (let n = 0; n < 2; n++)','for (let n = 0; n < 1; n++)',copyProof],
    ['Produto volta a corrida ampla',F.natural,'const interaction = ugc ? plan.interaction : actions[plan.category] ?? plan.interaction','const interaction = plan.interaction',compositionProof],
    ['Produto perde crop',F.natural,"include a visible sleeve or clothing hem; never a full-body person'","include a visible sleeve or clothing hem'",compositionProof],
    ['UGC perde pessoa no prompt',F.natural,'one adult creator, with their natural face, upper torso, own connected arms and the whole product visibly in frame','one adult with only hands in frame',compositionProof],
    ['juizUGC aceita rosto ausente',F.plan,'if (expectsUgcFace && r.ugc_face_visible !== true)','if (false)',judgeProof],
    ['pipelineUGC não pede rosto',F.pipeline,"s.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110' && s.plan.input.formato === 'ugc'",'false',judgeProof],
    ['preflight não confere fala salva',F.preflight,'if (checked.narration !== plan.script.narration || checked.hook !== plan.script.hook)','if (false)',runtimeProof],
    ['start pula preflightAJUSTE',F.start,"if (cena?.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110')",'if (false)',runtimeProof],
    ['runtime pula preflightAJUSTE',F.runtime,"if (state.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110')",'if (false)',runtimeProof],
    ['áudio cedo duplica voz',F.early,"if ((order.plan as { cena?: { plan?: { ajusteLive?: { version?: string } } } }).cena?.plan?.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110')",'if (false)',runtimeProof],
    ['closePOST sem intenção durável',F.media,"j.status = 'submitting'; j.claimedAt = d.now(); await d.save(s)","j.status = 'submitting'; j.claimedAt = d.now()",mediaProof],
    ['close altera foto cliente',F.media,'const photoReference = plan.input.foto',"const photoReference = plan.input.foto + '?altered=1'",mediaProof],
    ['close tenta três vezes',F.media,'close.attempt < 2','close.attempt < 3',mediaProof],
    ['close ambíguo reenviado',F.media,"if (j.status === 'submitting') {","if (j.status === 'submitting') { j.status = 'new'; await advanceClose(s, d); return;",mediaProof],
    ['timeout incerto cobra retry',F.media,"'cena_ajuste_close_result_unconfirmed', false","'cena_ajuste_close_result_unconfirmed', true",mediaProof],
    ['close curto é aceito',F.media,'if (stored.measuredSeconds < j.keepSeconds)','if (false)',mediaProof],
    ['músicaPOST sem intenção durável',F.media,"music.status = 'submitting'; music.claimedAt = d.now(); await d.save(s)","music.status = 'submitting'; music.claimedAt = d.now()",mediaProof],
    ['música pending perde handle',F.media,'let url: string | null = null',"let url: string | null = null; music.status = 'new'",mediaProof],
    ['close visual volta à foto parada',F.montage,'source: close.url','source: s.plan.input.foto',montageProof],
    ['trilhas de voz e vídeo colidem',F.montage,"track: 1, volume: '100%'","track: 2, volume: '100%'",montageProof],
    ['música cobre a voz',F.montage,'start < speechEnd ? -18 : -15','start < speechEnd ? 0 : -15',montageProof],
    ['layout legado deixa de ser idêntico',F.montage,'if (!ajusteLiveOf(s.plan)) return buildCenaMontage(s)','if (!ajusteLiveOf(s.plan)) return {}',montageProof],
    ['colchetes viram comandos visuais',F.montage,"text.replace(/\\[/gu, '［').replace(/\\]/gu, '］')",'text',montageProof],
  ]
  for(const m of mutations)await redMutant(...m)
  console.log('ok retomada: '+mutations.length+' mutantes reais');return mutations.length
}

async function undoProof(){
  const U=await import('./test-support/desfaz-ads-cena-retomada-2110.mjs');assert.equal(U.CENA_RETOMADA_BASE,BASE);assert.equal(U.CENA_RETOMADA_MARK,MARK);assert.ok(U.CENA_RETOMADA_FILES.length>0,'exact snapshot table cannot be empty')
  for(const p of U.CENA_RETOMADA_FILES){const actual=read(p),before=git('show',BASE+':'+p);assert.ok(actual.includes(MARK));assert.equal(U.semAdsCenaRetomada2110(actual,p),before);assert.equal(U.semAdsCenaRetomada2110(before,p),before);assert.equal(U.semAdsCenaRetomada2110(actual.replace(/\n/g,'\r\n'),p),before.replace(/\n/g,'\r\n'));assert.throws(()=>U.semAdsCenaRetomada2110(actual+'\n// mutated\n',p),/fonte divergente/);assert.notEqual(U.semAdsCenaRetomada2110(actual.replaceAll(MARK,'REMOVED'),p),before)}
  for(const p of ['scripts/test-ads-cena-retomada-2110.mjs','docs/previews/ads-cena-retomada-2110.html'])assert.ok(U.CENA_RETOMADA_NEW.includes(p),'guard/preview are in the exact inventory')
  const declared=new Set([...U.CENA_RETOMADA_FILES,...U.CENA_RETOMADA_NEW]);for(const p of U.CENA_RETOMADA_NEW){assert.ok(readFileSync(p).length);assert.throws(()=>git('show',BASE+':'+p))}
  assert.ok(git('diff','--name-only',BASE).trim().split('\n').filter(Boolean).every(p=>declared.has(p)),'all changes belong to the exact undo layer')
}
export async function runRetomada(){await proofRetomada();console.log('ok retomada: HTTP/start/advance reais, AJUSTE/95, áudio, close, música, juiz e legado');await proofRetomadaMutants();await undoProof();console.log('ok retomada: desfaz exato, CRLF, inventário e fontes95 intactas')}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await runRetomada()
