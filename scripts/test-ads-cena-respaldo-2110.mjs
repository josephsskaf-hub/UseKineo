// KINEO-ADS-CENA-RESPALDO-2110 — POST/cenaJson/start reais; DB, ledger e fornecedores em dublês sem rede.
import assert from 'node:assert/strict'
import { semIdiomasFormatos2410 } from './test-support/desfaz-idiomas-formatos-2410.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — remove only this exact newer source layer before the protected-source comparison.
import { semAdsCenaSegue2110 } from './test-support/desfaz-ads-cena-segue-2110.mjs' // KINEO-ADS-CENA-SEGUE-2110
import { semPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { PACING_PHOTO, PACING_HOUSE, PACING_ORDER, pacingShort } from './test-support/ads-cena-95-pacing-fixtures-2110.mjs'
const BASE='68d3c13b935a14c17d3a6e7228fe5eab1be027ab', MARK='KINEO-ADS-CENA-RESPALDO-2110'
const F={route:'app/api/admin/ads-cena/route.ts',internal:'lib/ads/cena/internal.ts',internalAjuste:'lib/ads/cena/internalAjuste.ts',live:'lib/ads/cena/live.ts',plan:'lib/ads/cena/plan.ts',natural:'lib/ads/cena/ajustePlan.ts',preflight:'lib/ads/cena/ajustePreflight.ts',runtime:'lib/ads/cena/runtime.ts',pipeline:'lib/ads/cena/pipeline.ts',start:'lib/ads/v2StartCore.ts',early:'lib/ads/v2AudioCedo.ts',media:'lib/ads/cena/ajusteMedia.ts',montage:'lib/ads/cena/ajusteMontage.ts',legacyMontage:'lib/ads/cena/montage.ts',respaldo:'lib/ads/cena/ajusteRespaldo.ts'}
const read=p=>semPaginasIaClaras2110(semAdsCenaSegue2110(readFileSync(p,'utf8').replace(/\r\n/g,'\n'),p),p) // KINEO-PAGINAS-IA-CLARAS-2110 KINEO-ADS-CENA-SEGUE-2110 — restore newest policy before historical mutation inputs.
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).replace(/\r\n/g,'\n')
const deliveryHead=git('log','--format=%H%x09%s',BASE+'..HEAD').trim().split('\n').find(line=>{const subject=line.slice(line.indexOf('\t')+1);return(subject.startsWith(MARK+' ')||subject.startsWith(MARK+': '))&&subject.includes('[TRAVA 8.2 — vai do fundador 21/10 "quero chegar a 9.5 de mínimo"]')})?.split('\t')[0] // KINEO-ADS-CENA-SEGUE-2110
assert.ok(deliveryHead,'own RESPALDO delivery is marked and authorized') // KINEO-ADS-CENA-SEGUE-2110
const plain=x=>JSON.parse(JSON.stringify(x)),same=(a,b,why)=>assert.deepEqual(plain(a),plain(b),why)
const NOW=Date.parse('2026-10-22T20:00:00Z')
class FixedDate extends Date {constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}
class OfflineResponse extends Response {static json(body,init={}){return new OfflineResponse(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json',...init.headers}})}}
const sourceLoader=(over={},mocks={},globals={})=>createOfflineLoader({mocks,source:(p,s)=>over[p]??semPaginasIaClaras2110(semAdsCenaSegue2110(s,p),p),globals:{Request,Response,Headers,Error,Date:FixedDate,...globals}}) // KINEO-ADS-CENA-SEGUE-2110 — explicit mutant overrides stay intact.
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

/** The route, planner, cenaJson and start remain real; only external boundaries are doubled. */
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

export async function reproduceRespaldoBase(){
 const sources=Object.fromEntries([F.plan,F.natural,F.internalAjuste].map(p=>[p,git('show',BASE+':'+p)]))
 for(const unsupported of[false,true])for(const dry of[true,false]){const f=plain(RETOMADA_FIXTURES[1]);f.raw.hooks[0]='Imagine running on clouds every day!';if(unsupported)f.raw.benefit='Comfortable support keeps every step light. Buy one, get one free.';const w=world(f,sources),r=await w.post(dry);if(unsupported){assert.equal(r.status,502);assert.equal(r.body.reason,'cena_unsubstantiated_script');assert.equal(w.modelCalls.length,3);assert.equal(w.effects.length,0)}else{assert.equal(r.status,dry?200:202);assert.equal(w.modelCalls.length,2)}console.log(JSON.stringify({baseline:true,unsupported,dry,status:r.status,reason:r.body.reason,modelCalls:w.modelCalls.length,effects:w.effects.length}))}
}

const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')
function unchangedExceptProductCase(actual,expected,product){
  assert.equal(actual.replace(new RegExp(esc(product),'giu'),'PRODUCT'),expected.replace(new RegExp(esc(product),'giu'),'PRODUCT'),'good words/punctuation remain unchanged apart from approved product casing')
  for(const brand of product.split(/\s/u).filter(t=>/[A-Z]{2,}/u.test(t)))if(expected.includes(brand))assert.ok(actual.includes(brand),'brand casing remains exact: '+brand)
}
function badFixture(language='en',field='hooks.0'){
  const f=plain(RETOMADA_FIXTURES[language==='pt'?0:1]),bad=language==='pt'?'Conforto perfeito todos os dias!':'Imagine running on clouds every day!'
  if(field==='hooks.0')f.raw.hooks[0]=bad
  else f.raw.use=(field==='use_mixed'?'Meet the Stride shoes. ':'')+bad
  return {f,bad,field:field==='use_mixed'?'use':field}
}
async function diagnosticsProof(over={}){
  const N=sourceLoader(over)(F.natural)
  for(const language of['pt','en']){
    const {f,bad,field}=badFixture(language);let error
    try{N.naturalAjusteScript(f.raw,f.input,f.product)}catch(e){error=e}
    assert.ok(error,'unsupported generated copy must be rejected, not laundered into a valid script')
    assert.ok(Array.isArray(error.issues)&&error.issues.some(i=>i.field===field&&i.phrase.includes(bad)&&Array.isArray(i.rules)&&i.rules.length>0),'exact field, phrase and rules are retained')
    assert.equal(typeof error.reason_detail,'string');assert.ok(error.reason_detail.includes(bad));assert.ok(error.reason_detail.length<=1000)
  }
}
async function httpRespaldoProof(over={}){
  for(const language of['pt','en'])for(const correctedAt of[1,2,3,Infinity]){
    const {f,bad}=badFixture(language),good=plain(RETOMADA_FIXTURES[language==='pt'?0:1].raw),sequence=correctedAt===Infinity?[f.raw]:[...Array(correctedAt-1).fill(f.raw),good]
    const dry=world(f,over,{rawSequence:sequence}),live=world(f,over,{rawSequence:sequence}),a=await dry.post(),b=await live.post(false)
    assert.equal(a.status,200,JSON.stringify(a.body));assert.equal(b.status,202,JSON.stringify(b.body))
    const plan=live.tables.ads_v2_orders[0].plan.cena.plan;same(a.body.plan,plan,'dry and live choose the identical corrected/fallback plan');same(a.body.costs,b.body.costs)
    assert.equal(dry.effects.length,0);assert.equal(dry.tables.ads_v2_orders.length,0);assert.equal(live.effects.filter(e=>e[0]==='debit').length,1);assert.equal(live.effects.filter(e=>['queue','voice','render','music-submit','forbidden95'].includes(e[0])).length,0)
    for(const w of[dry,live]){
      assert.equal(w.modelCalls.length,1+Math.min(correctedAt,3),'one classifier plus first script and at most two GPT corrections')
      for(const c of w.modelCalls.slice(2)){const text=c.messages[1].content[0].text;assert.ok(text.includes(bad),'GPT receives the actual rejected phrase');const correction=JSON.parse(text).correction;assert.ok(correction.rejected.some(i=>i.field==='hooks.0'&&i.phrase.includes(bad)&&i.rules.length),'GPT gets exact line/rules, not only the old draft')}
      const script=plan.script;assert.ok(!script.narration.includes(bad));assert.equal(script.cta,f.input.cta);assert.ok(script.narration.includes(f.input.oferta));assert.equal(w.moderationCalls.filter(c=>c.text===script.narration).length,1)
      for(const key of['use','benefit','cta'])unchangedExceptProductCase(script[key],good[key],f.product)
      for(const k of[1,2])unchangedExceptProductCase(script.hooks[k],good.hooks[k],f.product)
      if(correctedAt!==Infinity)unchangedExceptProductCase(script.hooks[0],good.hooks[0],f.product)
      if(language==='pt')assert.equal(script.use,good.use.replace('Creme GLOW','creme GLOW'),'ordinary product noun is lowercased inside the unchanged good sentence')
      assert.doesNotThrow(()=>w.load(F.natural).naturalAjusteScript(script,plan.input,plan.product),'fallback is parsed again by the same complete validator')
    }
  }
}
async function mixedLineProof(over={}){
  const {f,bad}=badFixture('en','use_mixed'),w=world(f,over),r=await w.post()
  assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(w.modelCalls.length,4);assert.ok(r.body.plan.script.use.includes('Meet the Stride shoes.'));assert.ok(!r.body.plan.script.use.includes(bad))
  for(const key of['benefit','cta'])unchangedExceptProductCase(r.body.plan.script[key],f.raw[key],f.product)
  for(let n=0;n<3;n++)unchangedExceptProductCase(r.body.plan.script.hooks[n],f.raw.hooks[n],f.product)
}
async function legacyProof(over={}){
  const enabled={[F.live]:read(F.live).replace('CENA95_LIVE: boolean = false','CENA95_LIVE: boolean = true'),...over}
  for(const dry of[true,false]){
    const results=[]
    for(const historical of[false,true]){const sources=historical?{...enabled,...Object.fromEntries([F.plan,F.natural,F.internalAjuste].map(p=>[p,git('show',BASE+':'+p)]))}:enabled,w=world(pacingShort(),sources,{allow95:true,isolated:true}),r=await w.post(dry);results.push({r:{status:r.status,body:r.body},events:w.events,effects:w.effects,tables:w.tables,calls:w.modelCalls})}
    same(results[0],results[1],'95 enabled retains the exact previous API/requests/debit/costs')
  }
  for(const fixture of RETOMADA_FIXTURES){const f=plain(fixture);if(f.input.language==='pt')f.input.cta=f.raw.cta='Peça seu Creme GLOW.';const results=[]
    for(const historical of[false,true]){const sources=historical?{...over,...Object.fromEntries([F.plan,F.natural].map(p=>[p,git('show',BASE+':'+p)]))}:over,w=world(f,sources),p=await w.load(F.plan).planCena(w.load(F.plan).cenaInput(f.input),'kling3',w.load(F.runtime).cenaJson);results.push({p,calls:w.modelCalls,effects:w.effects})}
    same(results[0],results[1],'planCena without retomada keeps the old parser/prompt/retry behavior byte-for-byte')
  }
}

async function errorHttpProof(over={}){
  for(const dry of[true,false]){
    const f=plain(RETOMADA_FIXTURES[0]),w=world(f,over),r=await w.post(dry,{oferta:Array(35).fill('Oferta').join(' ')+'.'})
    assert.equal(r.status,422,JSON.stringify(r.body));assert.equal(r.body.error,'cena_ajuste_required_text_does_not_fit');assert.equal(typeof r.body.reason_detail,'string');assert.ok(r.body.reason_detail.includes('Oferta'));assert.equal(w.effects.length,0);assert.equal(w.modelCalls.length,4)
    const malformed=plain(RETOMADA_FIXTURES[1]);malformed.raw.hooks=['Repeated?','Repeated?','Repeated?'];const m=world(malformed,over),bad=await m.post(dry)
    assert.equal(bad.status,502);assert.equal(bad.body.reason,'cena_invalid_script');assert.equal(typeof bad.body.reason_detail,'string');assert.ok(bad.body.reason_detail.includes('Repeated?'),'HTTP diagnostics expose the rejected phrase instead of only a generic code');assert.equal(m.effects.length,0)
  }
}
async function grammarProof(over={}){
  for(const language of['en','pt']){
    const f=plain(RETOMADA_FIXTURES[language==='pt'?0:1]);f.raw.benefit=language==='pt'?'O creme é perfeito. Compre 1 e leve 2.':'Stride shoes are perfect. Buy one, get one free.'
    if(language==='pt'){f.input.frase='Creme GLOW; É fácil de aplicar.';f.input.beneficios=['É fácil de aplicar.']}
    const w=world(f,over),r=await w.post();assert.equal(r.status,200,JSON.stringify(r.body));const spoken=r.body.plan.script.benefit
    assert.ok(!/shoes is|tem é|oferece é/iu.test(spoken),spoken);assert.equal(spoken.split(f.input.oferta).length-1,1,'good existing offer is not duplicated by a repaired neighboring sentence');assert.ok(!/perfect|perfeito/iu.test(spoken))
  }
}
async function unitProof(over={}){
  const R=sourceLoader(over)(F.respaldo),f=plain(RETOMADA_FIXTURES[1])
  for(const line of['Imagine running on clouds every day!','Like never before!','Elevate your game!','The ultimate choice!']){const raw={...f.raw,hooks:[line,...f.raw.hooks.slice(1)]};assert.ok(R.ajusteRespaldoIssues(raw,f.input,f.product).some(i=>i.field==='hooks.0'))}
  assert.ok(R.ajusteRespaldoIssues({...f.raw,hooks:[f.raw.hooks[0],'Like never before!',f.raw.hooks[2]]},f.input,f.product).some(i=>i.field==='hooks.1'),'alternative hooks keep their exact field index')
  for(const line of['Choose Stride shoes for 50% off.','Stride shoes cure foot pain.'])assert.ok(R.ajusteRespaldoIssues({...f.raw,use:line},f.input,f.product).some(i=>i.field==='use'))
  const missing={...f.raw,benefit:f.input.oferta},issues=R.ajusteRespaldoIssues(missing,f.input,f.product);assert.ok(issues.some(i=>i.field==='benefit'&&i.phrase===missing.benefit&&i.missing===true),'missing benefit feedback retains the real field text and explicit missing flag')
  const fixed=R.repairAjusteLines(missing,f.input,f.product,issues);assert.ok(fixed.benefit.includes('easy to clean'));assert.equal(fixed.benefit.split(f.input.oferta).length-1,1);unchangedExceptProductCase(fixed.use,f.raw.use,f.product);assert.equal(fixed.cta,f.raw.cta)
  const typed={...f.input,frase:f.input.frase+' on clouds'},allowed={...f.raw,hooks:['Imagine running on clouds every day!',...f.raw.hooks.slice(1)]};assert.ok(!R.ajusteRespaldoIssues(allowed,typed,f.product).some(i=>i.rules.some(rule=>rule.includes('metaphor'))),'typed metaphor is not invented')
  const typedCta='Choose Stride shoes like never before.';assert.ok(!R.ajusteRespaldoIssues({...f.raw,cta:typedCta},{...f.input,cta:typedCta},f.product).some(i=>i.field==='cta'&&i.rules.some(r=>r.includes('metaphor'))))
  const rawCta={...f.raw,cta:'Save 50% on Stride shoes.'},fixedCta=R.repairAjusteLines(rawCta,f.input,f.product,R.ajusteRespaldoIssues(rawCta,f.input,f.product));assert.equal(fixedCta.cta,f.input.cta,'a rejected CTA restores only the typed CTA')
  const lengthy={...f.raw,hooks:['Would you like to see these Stride shoes in your routine today?',...f.raw.hooks.slice(1)]};assert.ok(R.ajusteRespaldoIssues(lengthy,f.input,f.product).some(i=>i.rules.some(r=>r.includes('Hook exceeds 10'))))
  const caseInput={...short().input,frase:'Creme GLOW'},c=R.ajusteProductCase({hooks:['Creme GLOW hoje?','Outro?','Qual?'],use:'Veja o Creme GLOW.',benefit:'',cta:'Escolha Creme GLOW.'},caseInput,'Creme GLOW');assert.equal(c.use,'Veja o creme GLOW.');assert.equal(c.hooks[0],'Creme GLOW hoje?')
  const brand=R.ajusteProductCase({hooks:['iPhone today?','Other?','Ready?'],use:'iPhone is here.',benefit:'',cta:'Choose iPhone.'},{...short().input,frase:'iPhone'},'iPhone');assert.equal(brand.use,'iPhone is here.');assert.equal(brand.hooks[0],'iPhone today?')
  const pt=badFixture('pt','use').f;pt.input.language='pt-BR';const ptFixed=R.repairAjusteLines(pt.raw,pt.input,pt.product,R.ajusteRespaldoIssues(pt.raw,pt.input,pt.product));assert.match(ptFixed.use,/^Conheça /u);assert.ok(!ptFixed.use.includes('Meet'))
  assert.throws(()=>R.ajusteRespaldoIssues([],f.input,f.product),/invalid_json/)
  let calls=0,parsed=0;const sameIssue=[{field:'use',phrase:'Unchanged unsupported line.',rules:['unsupported']}]
  await assert.rejects(()=>R.writeAjusteScript(f.input,f.product,async()=>{calls++;return f.raw},()=>{parsed++;throw new R.AjusteScriptError('cena_unsubstantiated_script',sameIssue)},'offline prompt'),/required_text_does_not_fit/)
  assert.equal(calls,3);assert.equal(parsed,4,'neutral fallback must run through the same parse callback')
  const long=plain(f);long.raw.hooks[0]='Imagine running on clouds every single day with the most wonderful shoes!';const w=world(long,over),r=await w.post();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(w.modelCalls.length,4);assert.ok(r.body.plan.script.hook.split(' ').length<=10)
  const cta=Array(45).fill('Go').join(' ')+'.',impossible=world(f,over,{rawSequence:[{...f.raw,cta}]}),error=await impossible.post(true,{cta});assert.equal(error.status,422,JSON.stringify(error.body));assert.ok(error.body.reason_detail.includes(cta));assert.equal(impossible.effects.length,0)
}
async function brandHttpProof(over={}){
  const f={category:'other',product:'iPhone',input:{...short().input,frase:'iPhone; iPhone is here.',beneficios:['iPhone is here.'],cta:'Choose iPhone.'},raw:{hooks:['iPhone today?','What suits you?','Ready to choose?'],use:'iPhone is here.',benefit:'iPhone is here.',cta:'Choose iPhone.'}}
  for(const dry of[true,false]){const w=world(f,over),r=await w.post(dry);assert.equal(r.status,dry?200:202,JSON.stringify(r.body));const plan=dry?r.body.plan:w.tables.ads_v2_orders[0].plan.cena.plan;for(const field of['use','benefit','cta'])assert.equal(plan.script[field],f.raw[field]);assert.equal(w.modelCalls.length,2)}
  const mixed=plain(f);mixed.raw.use='See iPhone. iPhone is the best.';const N=sourceLoader(over)(F.natural);let issue
  try{N.naturalAjusteScript(mixed.raw,mixed.input,mixed.product)}catch(e){issue=e}
  assert.ok(issue?.issues.some(i=>i.field==='use'&&i.phrase==='iPhone is the best.'),'sentence diagnosis keeps the preceding valid lower-brand sentence out of the rejection')
  const w=world(mixed,over),r=await w.post();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(w.modelCalls.length,4);assert.ok(r.body.plan.script.use.includes('See iPhone.'));assert.ok(!r.body.plan.script.use.includes('best'));assert.equal(r.body.plan.script.benefit,f.raw.benefit)
}
async function caseRepairProof(over={}){
  const f={category:'skincare',product:'Face Cream',input:{...short().input,frase:'Face Cream',beneficios:[],oferta:'',cta:'Choose Face Cream.'},raw:{hooks:['Which cream today?','Time for your routine?','Ready to choose?'],use:'See the jar. Try the Face Cream like never before.',benefit:'',cta:'Choose Face Cream.'}}
  for(const dry of[true,false]){const w=world(f,over),r=await w.post(dry);assert.equal(r.status,dry?200:202,JSON.stringify(r.body));const script=(dry?r.body.plan:w.tables.ads_v2_orders[0].plan.cena.plan).script;assert.equal(w.modelCalls.length,4);assert.ok(script.use.includes('See the jar.'),'valid neighboring sentence survives generic product casing');assert.ok(!script.use.includes('like never before'));assert.equal(script.cta,'Choose face cream.');for(const c of w.modelCalls.slice(2)){const rejected=JSON.parse(c.messages[1].content[0].text).correction.rejected;assert.ok(rejected.some(i=>i.field==='use'&&i.phrase==='Try the face cream like never before.'))}}
}
async function missingHttpProof(over={}){
  const f=plain(RETOMADA_FIXTURES[1]);f.raw.benefit=f.input.oferta
  for(const corrected of[false,true]){const w=world(f,over,{rawSequence:corrected?[f.raw,RETOMADA_FIXTURES[1].raw]:[f.raw]}),r=await w.post();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(w.modelCalls.length,corrected?3:4);for(const c of w.modelCalls.slice(2)){const rejected=JSON.parse(c.messages[1].content[0].text).correction.rejected;assert.ok(rejected.some(i=>i.field==='benefit'&&i.phrase===f.input.oferta&&i.missing===true&&i.rules.some(rule=>rule.toLowerCase().includes('easy to clean'))),'GPT receives actual benefit-field text and the missing typed fact')};const script=r.body.plan.script;assert.ok(script.benefit.includes('easy to clean'));assert.equal(script.benefit.split(f.input.oferta).length-1,1);if(!corrected)assert.ok(script.benefit.startsWith(f.input.oferta),'adding a missing fact retains the existing valid sentence');unchangedExceptProductCase(script.use,f.raw.use,f.product);assert.equal(script.cta,f.input.cta)}
}
export async function proofRespaldo(over={}){await diagnosticsProof(over);await httpRespaldoProof(over);await mixedLineProof(over);await errorHttpProof(over);await grammarProof(over);await unitProof(over);await brandHttpProof(over);await caseRepairProof(over);await missingHttpProof(over);await legacyProof(over)}

async function redMutant(label,file,before,after,proof){
  const original=read(file);assert.equal(original.split(before).length-1,1,'unique mutation anchor: '+label)
  const changed=original.replace(before,after),compiled=ts.transpileModule(changed,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}})
  assert.ok(!(compiled.diagnostics??[]).some(d=>d.category===ts.DiagnosticCategory.Error),'mutant must parse: '+label);assert.doesNotThrow(()=>new vm.Script(compiled.outputText))
  let failure;try{await proof({[file]:changed})}catch(e){failure=e}
  assert.equal(failure?.code,'ERR_ASSERTION','only behavioral assertions count, never syntax/import/transport: '+label+' '+(failure?.stack??'survived'));console.log('ok mutante vermelho: '+label)
}
export async function proofRespaldoMutants(){
  const m=[
    ['metáfora sem lastro é aceita',F.respaldo,"rules.push(...exaggerations.filter(x => !fold(facts).includes(fold(x))).map(x => `superlative or metaphor not typed: ${x}`))",'void 0',diagnosticsProof],
    ['diagnóstico perde frase',F.respaldo,'issues.push({ field, phrase, rules })',"issues.push({ field, phrase: '', rules })",diagnosticsProof],
    ['diagnóstico perde regras',F.respaldo,'issues.push({ field, phrase, rules })','issues.push({ field, phrase, rules: [] })',diagnosticsProof],
    ['detalhe trunca frase real',F.respaldo,'.slice(0, 1000)','.slice(0, 8)',diagnosticsProof],
    ['alternativa perde índice',F.respaldo,'`hooks.${k}`',"'hooks.0'",unitProof],
    ['faltas digitadas não são diagnosticadas',F.respaldo,'if (missing.length) issues.push','if (false) issues.push',unitProof],
    ['gancho longo perde correção',F.respaldo,'if (words(phrase) > 10) issues.push','if (false) issues.push',unitProof],
    ['limite40palavras desaparece',F.respaldo,'if (words(speech(r)) > 40)','if (false)',errorHttpProof],
    ['casing genérico fica incorreto',F.respaldo,'common.test(w) ? w.toLocaleLowerCase() : w','w',unitProof],
    ['casing apaga marca',F.respaldo,'common.test(w) ? w.toLocaleLowerCase() : w','w.toLocaleLowerCase()',unitProof],
    ['casing capitaliza iPhone',F.respaldo,'start && common.test(typed.split(/\\s+/u)[0])','start',unitProof],
    ['CTA de fallback ignora digitado',F.respaldo,"finish(input.cta || `${pt ? 'Peça' : 'Choose'} ${label}`)","finish(`${pt ? 'Peça' : 'Choose'} ${label}`)",unitProof],
    ['fallback sobrescreve frase boa',F.respaldo,'const out: Record<string, unknown> = { ...r, hooks: Array.isArray(r.hooks) ? [...r.hooks] : [] }','const out: Record<string, unknown> = { ...r, use: neutral.use, hooks: Array.isArray(r.hooks) ? [...r.hooks] : [] }',httpRespaldoProof],
    ['fallback apaga campo inteiro',F.respaldo,"out[field] = original.replace(issue.phrase, replacement).replace(/\\s+/gu, ' ').trim()",'out[field] = replacement',mixedLineProof],
    ['fallback não troca ocorrência barrada',F.respaldo,"out[field] = original.replace(issue.phrase, replacement).replace(/\\s+/gu, ' ').trim()","out[field] = original.replace('NONMATCH', replacement).replace(/\\s+/gu, ' ').trim()",mixedLineProof],
    ['GPT recebe só uma tentativa',F.respaldo,'attempt < 3','attempt < 1',httpRespaldoProof],
    ['GPT recebe só uma correção',F.respaldo,'attempt < 3','attempt < 2',httpRespaldoProof],
    ['GPT gasta quarta tentativa',F.respaldo,'attempt < 3','attempt < 4',httpRespaldoProof],
    ['GPT não recebe regra e campo',F.respaldo,'rejected: issues','rejected: []',httpRespaldoProof],
    ['AJUSTE pula novo planner',F.plan,'if (options.retomada) script = await writeAjusteScript','if (false) script = await writeAjusteScript',httpRespaldoProof],
    ['AJUSTE executa também laço legado',F.plan,'!options.retomada && n < 2','n < 2',httpRespaldoProof],
    ['validador não recusa falta de lastro',F.natural,"if (rejected.length) throw new AjusteScriptError('cena_unsubstantiated_script', rejected)","if (false) throw new AjusteScriptError('cena_unsubstantiated_script', rejected)",diagnosticsProof],
    ['parser pula casing autorizado',F.natural,'const r = ajusteProductCase(raw, input, product)',"const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>",httpRespaldoProof],
    ['fallback desativado vira502',F.respaldo,"if (error instanceof AjusteScriptError && error.message === 'cena_unsubstantiated_script')",'if (false)',httpRespaldoProof],
    ['fallback sem rodada de reparo',F.respaldo,'round < 6','round < 0',httpRespaldoProof],
    ['fallback retorna sem revalidar',F.respaldo,'try { return parse(draft) } catch (e)', 'try { return draft as CenaScript } catch (e)',httpRespaldoProof],
    ['reparo sem progresso repete',F.respaldo,'JSON.stringify(e.issues) === JSON.stringify(issues)','false',unitProof],
    ['benefício repete oferta boa',F.respaldo,"if (field === 'benefit') {",'if (false) {',grammarProof],
    ['cópulaPTvolta a tem é',F.respaldo,'(?:não|pode|ajuda|é|tem|contém|hidrata|protege)(?=\\s|$)','(?:não|pode|ajuda|é|tem|contém|hidrata|protege)\\b',grammarProof],
    ['calçado plural recebeis',F.respaldo,"adjective ? plural ? 'are' : 'is' : plural ? 'have' : 'has'","adjective ? 'is' : 'has'",grammarProof],
    ['ptBRfallbackvirainglês',F.respaldo,"(input.language ?? 'en').toLowerCase().startsWith('pt')","input.language === 'pt'",unitProof],
    ['HTTP deixa de explicar frase',F.internalAjuste,'{ reason: message.slice(0, 200), reason_detail }','{ reason: message.slice(0, 200) }',errorHttpProof],
    ['orçamento impossível vira502',F.internalAjuste,"return v2Fail(message, 422, { reason: message, reason_detail })","return v2Fail(message, 502, { reason: message, reason_detail })",errorHttpProof],
    ['marca minúscula legítima é recusada',F.natural,'&& !namedStart.test(text)','&& true',brandHttpProof],
    ['frase boa junto a iPhone é apagada',F.respaldo,'text.split(/(?<=[.!?])\\s+/u)','text.split(/(?<=[.!?])\\s+(?=[\\p{Lu}¿¡])/u)',brandHttpProof],
    ['reparo usa grafia diferente do diagnóstico',F.respaldo,'const r = ajusteProductCase(raw, input, product), pt =','const r = data(raw), pt =',caseRepairProof],
    ['benefício ausente perde frase real',F.respaldo,"phrase: clean(r.benefit), missing: true","phrase: '', missing: true",missingHttpProof],
    ['benefício ausente perde marcador explícito',F.respaldo,'missing: true, rules: missing.map','rules: missing.map',unitProof],
  ]
  for(const item of m)await redMutant(...item)
  console.log('ok respaldo: '+m.length+' mutantes reais');return m.length
}

async function undoProof(){
  const U=await import('./test-support/desfaz-ads-cena-respaldo-2110.mjs');assert.equal(U.CENA_RESPALDO_BASE,BASE);assert.equal(U.CENA_RESPALDO_MARK,MARK);assert.ok(U.CENA_RESPALDO_FILES.length>0,'strict snapshot table cannot be empty')
  // Pages belongs to BASE: inspect the raw source before undoing the newer Respaldo layer.
  for(const file of U.CENA_RESPALDO_FILES){const actual=semAdsCenaSegue2110(readFileSync(file,'utf8').replace(/\r\n/g,'\n'),file),before=git('show',BASE+':'+file);assert.ok(actual.includes(MARK));assert.equal(U.semAdsCenaRespaldo2110(actual,file),before);assert.equal(U.semAdsCenaRespaldo2110(before,file),before);assert.equal(U.semAdsCenaRespaldo2110(actual.replace(/\n/g,'\r\n'),file),before.replace(/\n/g,'\r\n'));assert.throws(()=>U.semAdsCenaRespaldo2110(actual+'\n// mutation\n',file),/fonte divergente/);assert.notEqual(U.semAdsCenaRespaldo2110(actual.replaceAll(MARK,'REMOVED'),file),before)} // KINEO-ADS-CENA-SEGUE-2110 — Pages remains part of the RESPALDO base.
  assert.ok(U.CENA_RESPALDO_NEW.includes('scripts/test-ads-cena-respaldo-2110.mjs'))
  for(const p of U.CENA_RESPALDO_NEW){assert.ok(readFileSync(p).length);assert.throws(()=>git('show',BASE+':'+p))}
  const inventory=new Set([...U.CENA_RESPALDO_FILES,...U.CENA_RESPALDO_NEW]);assert.ok(git('diff','--name-only',BASE,deliveryHead).trim().split('\n').filter(Boolean).every(p=>inventory.has(p))) // KINEO-ADS-CENA-SEGUE-2110 — exact own delivery scope.
  const protectedDrift = git('diff','--name-only',BASE,'--','lib/ads/cena/*95.ts','lib/kidsVenda*','lib/kidsCartoon*').trim().split('\n').filter(Boolean).filter(file => semIdiomasFormatos2410(semCartoonConsistencia2210(readFileSync(file,'utf8').replace(/\r\n/g,'\n'),file),file) !== git('show',BASE+':'+file)).join('\n') // KINEO-IDIOMAS-FORMATOS-2410 — retain the full current diff and catch every change outside the exactly reversed layer.
  assert.equal(protectedDrift,'','95 and Kids sources remain byte-identical') // KINEO-IDIOMAS-FORMATOS-2410
}
export async function runRespaldo(){await reproduceRespaldoBase();await proofRespaldo();console.log('ok respaldo: POST/cenaJson/start reais, primeira+2correções, fallback só da frase barrada, diagnóstico e controles95/legado');await proofRespaldoMutants();await undoProof();console.log('ok respaldo: desfaz estrito, CRLF, inventário e fontes95/Kids intactas')}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await runRespaldo()
