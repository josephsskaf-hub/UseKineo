// KINEO-IDIOMAS-FORMATOS-2410 — actual planner, parser, chosen-still pipeline and UI; all paid effects injected offline.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const SHOTS='lib/ads/cena/escolhaShots.ts', PLAN='lib/ads/cena/escolhaPlan.ts', INPUT='lib/ads/cena/plan.ts', UI='app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const categories=['wearable','skincare','perfume','footwear','bag','bottle','supplement','tea','other']
const read=p=>readFileSync(p,'utf8').replace(/\r\n/gu,'\n'), plain=x=>JSON.parse(JSON.stringify(x))
const needs={wearable:[/fastens.*LEFT wrist/u,/steps.*LEFT wrist.*taps/u,/CLOSE.*LEFT wrist/u],skincare:[/CLOSED.*twice.*four fingernails/u,/lid OFF.*then scoops/u,/ONE gentle stroke.*OPEN/u],perfume:[/removes.*cap/u,/sprays.*ONCE.*wrist.*away from the face/u,/replaces.*cap.*turns/u],footwear:[/ties.*on their own feet/u,/stands up and jogs/u,/CLOSE.*running strides/u],bag:[/lifts.*existing handle/u,/strap.*shoulder.*walks/u,/CLOSE.*bag.*walking/u],bottle:[/picks up.*capped bottle/u,/opens.*existing cap.*no invented contents/u,/CLOSE.*opened real bottle.*cap/u],supplement:[/CLOSED.*supplement container/u,/opens.*existing closure.*no invented/u,/CLOSE.*no ingestion/u],tea:[/CLOSED.*tea package/u,/opens.*tea package.*cup/u,/CLOSE.*package.*cup/u],other:[/picks up.*actual product/u,/turns.*front to side.*no invented function/u,/CLOSE.*original front/u]}
function world(over={}){return createOfflineLoader({globals:{Error},mocks:{'next/server':{NextResponse:Response}},source:(p,s)=>over[p]??s})}
function json(category){return async c=>c.images.length?{category,confidence:.99,product:'Produto',offer:'',benefits:[]}:{hooks:['Conhece o Produto?','Qual Produto escolher?','Veja o Produto.'],use:'Conheça o Produto.',benefit:'',cta:'Conheça o Produto.'}}
function fixture(category,formato){return{foto:'https://offline.example/product.png',frase:'Produto.',language:'pt',formato,voice_mode:'narrated'}}
async function proof(over={}){
 const load=world(over),S=load(SHOTS),P=load(PLAN),I=load(INPUT),C=load('lib/ads/cena/escolhaCatalog.ts'),F=load('lib/ads/cena/escolhaStills.ts'),V=load('lib/ads/cena/escolhaVideo.ts'),B=load('lib/ads/cena/pipeline.ts')
 assert.deepEqual(plain(S.CENA_ESCOLHA_FORMATS.map(f=>f.id)),['ugc','product','product_in_hand','unboxing'],'both new formats remain selectable and parser-recognized')
 let checked=0,max=0,languageContracts=0
 for(const category of categories)for(const {id:formato}of S.CENA_ESCOLHA_FORMATS){
  const body=fixture(category,formato),input=I.cenaInput(body);assert.equal(input.formato,formato,'API parser preserves selected format')
  const plan=await P.planCenaEscolha(input,'kling3',json(category),{presenter_id:'sofia',scenario_id:C.escolhaScenarios(category)[0].id,category})
  assert.equal(plan.format,'escolha_'+formato);assert.equal(plan.input.formato,formato)
  for(const language of load('lib/textLanguage.ts').NARRATION_LANGUAGE_CODES){assert.equal(I.cenaInput({...body,language}).language,language);const translated=plain(plan);translated.input.language=language;P.preflightCenaEscolha(translated,'kling3');languageContracts++}
  const actual=V.escolhaVideoRequests(plan,'kling3','https://offline.example/CHOSEN.png')[0]
  assert.equal(actual.input.start_image_url,'https://offline.example/CHOSEN.png');assert.equal(actual.input.generate_audio,true)
  assert.equal(actual.input.multi_prompt.length,3);assert.equal(actual.input.shot_type,'customize');assert.equal(actual.input.prompt,undefined)
  for(const[k,shot]of actual.input.multi_prompt.entries()){
   assert.equal(shot.duration,'5');assert.equal(shot.prompt,plan.escolha.shotPrompts[k],'sent prompt is complete: fitting must not truncate an action or safety rule')
   assert.ok(shot.prompt.length<=500,'each final Kling shot <=500');max=Math.max(max,shot.prompt.length)
   assert.match(shot.prompt,/same ONE adult, outfit, scene/u);assert.match(shot.prompt,/whole real product, label unchanged/u);assert.match(shot.prompt,/Own attached hands, five fingers/u);assert.match(shot.prompt,/No invented branding\/text\/split screen/u)
   assert.match(shot.prompt,/Lips closed; ambient action sounds only, no speech\/music/u)
   if(formato==='ugc'||formato==='product')assert.match(shot.prompt,needs[category][k],category+' take'+k+' retains its concrete action')
   if(formato==='product_in_hand')assert.match(shot.prompt,[/presents.*product.*hands.*camera/u,/brings.*product.*camera.*turns front to side/u,/CLOSE.*product.*hand/u][k])
   if(formato==='unboxing')assert.match(shot.prompt,[/opens.*unbranded.*outer box/u,/lifts.*actual product from that same box/u,/CLOSE.*actual product.*opened shipping box/u][k])
  }
  assert.match(actual.input.multi_prompt[2].prompt,/Whole label above56%; live movement to15s; no card/u)
  assert.match(plan.keyframePrompts[0],/SINGLE PHOTOGRAPH/u)
  if(formato==='unboxing'){assert.match(plan.keyframePrompts[0],/CLOSED.*transparent front.*whole actual product.*fully visible inside/u);assert.ok(!/real shoes stay naturally on the feet/u.test(plan.keyframePrompts[0]))}
  if(formato==='product_in_hand'){assert.match(plan.keyframePrompts[0],/wearable\/shoes are held, not worn/u);assert.ok(!/real shoes stay naturally on the feet/u.test(plan.keyframePrompts[0]))}
  const flow=F.newEscolhaFlow(),state=B.newCenaState(plan,'kling3'),effects=[]
  const deps={now:()=>1,save:async()=>{},json:async()=>({score:90,reasons:['offline fixture']}),submit:async job=>{effects.push(plain(job));return{kind:'accepted',requestId:'image-'+effects.length}},poll:async job=>({state:'done',url:'https://offline.example/provider-'+job.index+'.png'}),persist:async job=>'https://offline.example/stored-'+job.index+'.png'}
  await F.stepEscolhaStills(plan,flow,deps);await F.stepEscolhaStills(plan,flow,deps)
  assert.equal(flow.stage,'choose');assert.equal(effects.length,4);assert.ok(effects.every(e=>e.kind==='image'),'photos never submit a video')
  const stored={cena:state,escolhaFlow:flow};F.chooseEscolhaStill(stored,'still-3');assert.equal(state.keyframe,'https://offline.example/stored-2.png')
  const video=[];await B.stepCena(state,{...deps,event:async()=>{},submit:async job=>{video.push(plain(job));return{kind:'accepted',requestId:'video'}}})
  assert.equal(video.length,1);assert.deepEqual(video[0].input.multi_prompt,plain(actual.input.multi_prompt),'runtime submits the exact three planned category/format actions');assert.equal(video[0].input.start_image_url,state.keyframe)
  assert.equal(F.escolhaView(stored).format_id,formato,'resume response preserves selected format')
  checked++
 }
 for(const bad of ['new-brand','',1,null])assert.throws(()=>I.cenaInput({...fixture('other','product'),formato:bad}),/cena_bad_format/u)
 return{combinations:checked,sentShots:checked*3,maxPromptCharacters:max,languageParserPreflights:languageContracts}
}
async function localePostProof(over={}){
 const cases={fr:{product:'Produit',hooks:['Un instant pour vous ?','Une pause dans la journée ?','Envie de découvrir ?'],use:'Découvrez Produit.',cta:'Regardez de plus près.'},ja:{product:'商品',hooks:['見てみませんか？','何を選びますか？','気になりますか？'],use:'商品をご覧ください。',cta:'詳しくご覧ください。'},th:{product:'สินค้า',hooks:['ลองดูไหม?','กำลังมองหาอะไร?','สนใจไหม?'],use:'ดูสินค้าได้เลย.',cta:'ดูรายละเอียดเพิ่มเติม.'},yue:{product:'產品',hooks:['想睇下嗎？','想了解更多嗎？','準備好未？'],use:'一齊睇下產品。',cta:'了解更多。'}}
 for(const[language,sample]of Object.entries(cases))for(const broken of[false,true]){
  let db=0,start=0,writer=0;const user={id:'00000000-0000-4000-8000-000000000001',email:'josephsskaf@gmail.com'},admin={from(){db++;throw Error('dry-run DB forbidden')}}
  const load=createOfflineLoader({globals:{Error},source:(p,s)=>over[p]??s,mocks:{'next/server':{NextResponse:Response},'@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user}})}})},'@/lib/ads/serverAccess':{adsGate:()=> 'ok',loadAdsAccess:async()=>({reason:'internal',ownerId:user.id,admin})},'@/lib/ads/cena/runtime':{cenaJson:async c=>{if(c.images.length)return{category:'other',confidence:1,product:sample.product,offer:'',benefits:[]};writer++;return broken?'{bad-json':{...sample,benefit:''}}},'@/lib/safety/contentModeration':{moderateContent:async()=>({ok:true})},'@/lib/ads/v2StartCore':{adsV2StartFor:async()=>{start++;throw Error('dry-run start forbidden')}}}})
  const response=await load('app/api/ads/v2/cena/route.ts').POST({json:async()=>({...fixture('other','unboxing'),frase:sample.product+'.',language,dry_run:true,stage:'plan',presenter_id:'sofia',scenario_id:'other_table',category:'other'})}),data=await response.json()
  assert.equal(db,0);assert.equal(start,0)
  if(broken){assert.equal(response.status,502,JSON.stringify(data));assert.equal(data.error,'escolha_script_language_unavailable');assert.equal(writer,3);assert.equal(data.plan,undefined,'unavailable localized writer cannot fabricate English speech')}
  else{assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.plan.input.language,language);assert.ok(data.narration_used.includes(sample.use));assert.ok(!/Ready for|Meet |Choose |Discover |Know /u.test(data.narration_used),'native draft preserved without English fallback')}
 }
}
function walk(node,out=[]){if(Array.isArray(node))for(const c of node)walk(c,out);else if(node&&typeof node==='object'&&node.props){out.push(node);walk(node.props.children,out)}return out}
async function uiProof(){
 for(const formato of ['product_in_hand','unboxing']){
  const state=[],refs=[];let at=0,ref=0,requests=[]
  const hooks={...React,useState(value){const i=at++;if(!(i in state))state[i]=i===0?{...fixture('tea',formato),oferta:'',beneficios:'',cta:'',rota:'',presenter_id:'sofia',category:'tea',scenario_id:'tea_kitchen'}:i===11?true:value;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}]},useEffect(){},useRef(value){return refs[ref++]??(refs[ref-1]={current:value})}}
  const load=createOfflineLoader({mocks:{react:hooks,'react/jsx-runtime':await import('react/jsx-runtime'),'react-dom':{createPortal:v=>v},'@/lib/ads/uploadFootage':{AdsUploadError:class extends Error{},uploadFootage(){throw Error('offline upload forbidden')}}},globals:{AbortController,fetch:async(url,o)=>{requests.push(JSON.parse(o.body));return{status:200,ok:true,json:async()=>({stage:'planned',narration_used:'Produto.'})}}},source:(p,s)=>p===UI?ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText:s})
  const component=load(UI).default;const render=()=>{at=ref=0;return component({lang:'pt',ownerKey:'offline',resume:false})};let tree=render()
  assert.ok(walk(tree).some(n=>n.type==='option'&&n.props.value===formato),'UI exposes selected new format')
  const button=walk(tree).find(n=>n.type==='button'&&n.props.className==='primary');assert.equal(button.props.disabled,false);button.props.onClick();for(let k=0;k<20;k++)await Promise.resolve()
  assert.equal(requests.length,1);assert.equal(requests[0].formato,formato);assert.equal(requests[0].stage,'plan','UI only plans before explicit photo choice')
 }
}
const result=await proof();await uiProof();await localePostProof()
const mutants=[
 {name:'parser_drops_new_format',file:INPUT,from:"formato: escolhaFormat(b.formato) ? b.formato : 'product'",to:"formato: b.formato === 'ugc' ? 'ugc' : 'product'"},
 {name:'unboxing_becomes_generic',file:SHOTS,from:"format === 'unboxing' ? UNBOX_STORY",to:"format === 'not-a-format' ? UNBOX_STORY"},
 {name:'watch_loses_action',file:SHOTS,from:'takes two confident steps, glances at their own LEFT wrist and taps',to:'stands still, looks away and avoids'},
 {name:'close_loses_brand_guard',file:SHOTS,from:'No invented branding/text/split screen.',to:'Add a new luxury brand logo.'},
 {name:'runtime_discards_category_prompts',file:'lib/ads/cena/escolhaVideo.ts',from:'selected.shotPrompts.map(prompt => ({ prompt,',to:"selected.shotPrompts.map(prompt => ({ prompt: 'Generic product.',"},
]
const killed=[]
for(const m of mutants){const raw=read(m.file);assert.equal(raw.split(m.from).length-1,1,'unique mutant anchor '+m.name);let error;try{await proof({[m.file]:raw.replace(m.from,m.to)})}catch(e){error=e}assert.equal(error?.code,'ERR_ASSERTION','mutant dies behaviorally '+m.name+': '+error?.message);killed.push(m.name)}
for(const m of[{name:'cantonese_rejected_as_three_letters',file:INPUT,from:'!narrationLanguage(b.language)',to:"(typeof b.language !== 'string' || !/^[a-z]{2}$/.test(b.language))"},{name:'localized_script_uses_english_repair',file:PLAN,from:"const legacySpeech = (input: CenaInput): boolean => ['pt', 'en'].includes(input.language ?? 'en')",to:'const legacySpeech = (_input: CenaInput): boolean => true'}]){const raw=read(m.file);assert.equal(raw.split(m.from).length-1,1);let error;try{await localePostProof({[m.file]:raw.replace(m.from,m.to)})}catch(e){error=e}assert.equal(error?.code,'ERR_ASSERTION','locale mutant dies behaviorally '+m.name+': '+error?.message);killed.push(m.name)}
console.log(JSON.stringify({status:'TESTADO LOCALMENTE',...result,uiFormats:2,mutantsKilled:killed,paidCalls:0},null,2))
