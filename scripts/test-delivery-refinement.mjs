// Offline behavior checks: no credentials, requests, downloads or paid operations.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { renderPage } from './preview-ux-complete.mjs'
let count=0
const check=(v,m)=>{assert.ok(v,m);count++}
const read=p=>fs.readFileSync(p,'utf8')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const box={exports:{}}
vm.runInNewContext(compile(read('lib/ui/deliveryRefinement.ts')),box)
const {filmSource,downloadOutcomeMessage,planChanges}=box.exports
const history='app/(dashboard)/history/HistoryClient.tsx', source=read(history)
const ast=ts.createSourceFile(history,source,99,true,4)
function fn(name){let result;const walk=n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=n.getText(ast);ts.forEachChild(n,walk)};walk(ast);assert.ok(result);return compile(result)}
for(const choice of ['original','enhanced',undefined]){
  check(filmSource('original.mp4','enhanced.mp4',choice)===(choice==='original'?'original.mp4':'enhanced.mp4'),'version selects real source')
  check(filmSource('original.mp4',undefined,choice)==='original.mp4','missing enhancement uses original')
}
const video={id:'demo',video_url:'original.mp4',topic:'A demonstration title'}
for(const outcome of ['blob','fallback_opened','popup_blocked','unavailable','coalesced',null,'throw']){
  const calls=[],notes=[],toasts=[]
  const ctx={ui:x=>x,downloadingId:null,setDownloadingId:()=>{},setDownloadNotes:f=>notes.push(f({}).demo),fileVersions:{demo:'original'},enhUrls:{demo:'enhanced.mp4'},extractTitle:x=>x,filmSource,isWatermarkedFastAsset:()=>false,downloadVideoFile:async o=>{calls.push(o);if(outcome==='throw')throw Error('offline');return outcome},downloadOutcomeMessage,showToast:m=>toasts.push(m)}
  vm.runInNewContext(fn('handleDownload'),ctx)
  await ctx.handleDownload(video)
  check(calls[0].url==='original.mp4','handler downloads selected original')
  check(toasts.length===(outcome==='blob'?1:0),'only handed-off blob emits success toast')
  check(notes.at(-1)===downloadOutcomeMessage(outcome==='throw'?null:outcome),'honest outcome shown inline')
  ctx.enhStatus={demo:'done'};toasts.length=0;calls.length=0
  vm.runInNewContext(fn('handleEnhance'),ctx);await ctx.handleEnhance(video)
  check(calls[0].url==='enhanced.mp4','existing HD download uses actual enhanced file')
  check(toasts.length===(outcome==='blob'?1:0),'HD download does not claim success on failure')
  check(notes.at(-1)===downloadOutcomeMessage(outcome==='throw'?null:outcome),'HD path exposes honest outcome too')
}
for(const mode of ['blocked','missing','success']){
  let fallback=null,copied=null
  const ctx={navigator:mode==='missing'?{}:{clipboard:{writeText:async()=>{if(mode==='blocked')throw Error('denied')}}},setManualCopy:t=>fallback=t,setCopiedKey:k=>copied=k,setTimeout:()=>{},showToast:()=>{},ui:x=>x}
  vm.runInNewContext(fn('copyToClipboard'),ctx);await ctx.copyToClipboard('demo','Full text \n with Unicode Ω')
  check(mode==='success'?copied==='demo'&&fallback===null:fallback==='Full text \n with Unicode Ω'&&copied===null,'clipboard fallback handles missing API and denial')
}
const titleCtx={};vm.runInNewContext(fn('extractTitle'),titleCtx)
const long='HOOK: '+ 'An unusually long but meaningful title '.repeat(5)
check(titleCtx.extractTitle(long,false).length>90,'expanded title not pre-truncated')
check(titleCtx.extractTitle(long).length<=90,'existing compact title behavior preserved')
const original={narration:'Original script',overlays:[{role:'brand',start:0,end:2,text:'Original words'}],shots:[{idx:0,role:'hook',kind:'place',source:'client_photo',cut_seconds:3,photo:'a'}]}
check(!planChanges(original,structuredClone(original)).narration&&planChanges(original,original).shots.length===0,'equal plan has no differences')
for(const key of ['role','kind','source','cut_seconds','photo','beat']){
  const next=structuredClone(original);next.shots[0][key]=key==='cut_seconds'?4:'changed'
  check(planChanges(original,next).shots[0]===0,`detect ${key} change`)
}
const next={...original,narration:'New script',overlays:[],shots:[]}
const changes=planChanges(original,next)
check(changes.narration&&changes.overlays&&changes.shots.length===1,'removal and narration detected')
check(original.shots[0].photo==='a','comparison never mutates prior plan')
const props={embedded:true,snapshotTime:1790632800000,videos:[{...video,topic:long,status:'completed',quality_mode:'seedance',created_at:'2026-09-29T10:00:00Z'}]}
const html=renderPage(history,false,{enhUrls:{demo:'enhanced.mp4'},fileVersions:{demo:'original'}},props)
check(html.includes('Original file')&&html.includes('Enhanced file'),'both existing versions displayed')
check(html.includes('delivery-title')&&html.includes(titleCtx.extractTitle(long,false)),'full title reaches accessible disclosure')
const copy=JSON.parse(read('lib/ui/refinementCopy.json'))
for(const lang of Object.keys(copy))for(const key of ['Copy manually','Changes since your last plan','Original file','Enhanced file','Full title','Download could not be confirmed. Please try again.'])check(Boolean(copy[lang][key]),`${lang} translated ${key}`)
for(const file of ['AdsV2Client','AdsV2Simple']){
  const s=read(`app/(dashboard)/ads/v2/${file}.tsx`)
  check(s.includes('rememberPlan(r.data)')&&s.includes('<AdsPlanChanges before={previousPlan}'),'both Ads modes integrate successful-plan comparison')
}
console.log(`${count} delivery refinement checks passed; offline only.`)
