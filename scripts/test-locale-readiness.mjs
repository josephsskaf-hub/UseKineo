// Offline contract checks: no accounts, storage, provider calls or paid renders.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {renderPage, source} from './preview-ux-complete.mjs'
let checks=0
const ok=(v,m)=>{assert.ok(v,m);checks++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++}
function pure(file){const exports={};vm.runInNewContext(ts.transpileModule(source(file),{compilerOptions:{module:1,target:9}}).outputText,{exports});return exports}
const {INTERFACE_HI:hi,canonicalCopyHindi}=pure('lib/ui/interfaceHindi.ts')
const {parseInterfaceLanguage}=pure('lib/ui/interfaceLanguage.ts')
// Preserve the original complete Hindi proof. Later approved pricing/FAQ copy
// has six untranslated labels; freeze that exact main state and execute the
// explicit English fallback, rather than inventing translations in integration.
const gitSource=(ref,file)=>execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8',maxBuffer:32*1024*1024}).replace(/\r\n/g,'\n')
const pureText=text=>{const exports={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:1,target:9}}).outputText,{exports});return exports}
const originalHindi=pureText(gitSource('b9b49729','lib/ui/interfaceHindi.ts')).INTERFACE_HI
const originalSpanish=pureText(gitSource('b9b49729','lib/ui/interfaceLabels.ts')).INTERFACE_ES
for(const key of Object.keys(originalSpanish))ok(originalHindi[key],'original Hindi covers original UiLabel dictionary: '+key)
const approvedMissing=[
 'Any video engine — premium engines use more credits per film',
 '500 projects · your films stay in your library',
 'Unlimited projects · your films stay in your library',
 '20% off your first month · then',
 '/first month',
 'None. You type one idea and the AI writes the script, records the voice, generates every scene and adds captions.',
]
for(const file of ['lib/ui/interfaceHindi.ts','lib/ui/interfaceLabels.ts'])eq(source(file).replace(/\r\n/g,'\n'),gitSource('3ec6c9d9b',file),'approved current dictionary exact '+file)
eq(Object.keys(pure('lib/ui/interfaceLabels.ts').INTERFACE_ES).filter(key=>!hi[key]).sort(),approvedMissing.slice().sort(),'only the six approved main labels use fallback')
const component=source('components/InterfaceLanguage.tsx'),componentAst=ts.createSourceFile('InterfaceLanguage.tsx',component,99,true,4)
const realUiText=componentAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='UiText')?.getText(componentAst)
ok(realUiText,'real UiText can be executed')
const uiExports={}
vm.runInNewContext(ts.transpileModule(realUiText+'\nexports.UiText=UiText',{compilerOptions:{module:1,target:9,jsx:2}}).outputText,{exports:uiExports,React,InterfaceLanguageContext:{},useContext:()=>({language:'hi',dict:null}),hindiInterfaceCopy:text=>hi[text]??canonicalCopyHindi(text),KineoBoltText:({children})=>children})
for(const key of approvedMissing){const html=renderToStaticMarkup(React.createElement(uiExports.UiText,{es:'fixture Spanish'},key));ok(html.includes('lang="en"'),'untranslated approved label is marked English');ok(html.includes(key.replace(/&/g,'&amp;')),'fallback preserves authored claim verbatim')}
for(const l of ['en','es','hi'])eq(parseInterfaceLanguage(l),l,'explicit locale accepted')
for(const v of ['xx','pt-BR','HI','in',null,'<script>'])/* KINEO-INTERFACE-16-LINGUAS-2026-09-21: 'pt' virou língua da interface */eq(parseInterfaceLanguage(v),'en','unknown locale never geoguessed')
for(const [en,translated] of Object.entries(hi)){
  ok(translated.trim(),'nonempty Hindi: '+en)
  eq(translated.match(/\d+(?:[.,]\d+)*/g)?.sort(),en.match(/\d+(?:[.,]\d+)*/g)?.sort(),'same numerical claims: '+en)
}
const hrefs=html=>[...html.matchAll(/href="([^"]*)"/g)].map(m=>m[1]).sort()
// Locale spans can split "$" from its unchanged amount. Compare visible text,
// not adjacency in HTML; otherwise Spanish falsely looks like a missing price.
const prices=html=>html.replace(/<[^>]*>/g,'').match(/\$[\d.]+/g)
const author='My original story — Español हिन्दी <not markup> & 25 USD'
const fixtureVideo={id:'demo-video',topic:author,title:author,video_url:'/fixture.mp4',status:'completed',credits_used:4,created_at:'2026-09-07T00:00:00Z'}
const historyFile='app/(dashboard)/history/HistoryClient.tsx'
const libraryFile='app/(dashboard)/library/LibraryClient.tsx'
const libraryResetBefore="onClick={() => setQ('')}"
const libraryResetAfter="onClick={() => { setQ(''); organization.setFavoritesOnly(false) }}"
// Approved refinements 6efd499e/221a59ba: reset all visible filters and select
// original/enhanced consistently. Reanchor only these three exact attributes and
// the paired Library reset (65a49c30);
// retain the historical baseline for every other handler, gate and media source.
const historyReanchors=new Map([
 ["onClick={() => setQuery('')}","onClick={() => { setQuery(''); organization.setFavoritesOnly(false); setFormat('all') }}"],
 ['src={enhUrls[v.id] ?? v.video_url}','src={src}'],
 ['src={enhUrls[video.id] ?? video.video_url}','src={filmSource(video.video_url, enhUrls[video.id], fileVersions[video.id])!}'],
])
const studioReanchors=new Map([
 ['disabled={!prompt.trim() || limit.over}','disabled={!prompt.trim() || limit.over || linkOnlyInput}'],
 ['onChange={(e) => setPrompt(e.target.value)}','onChange={(e) => { setPrompt(e.target.value); if (isStandaloneHttpUrl(e.target.value)) setChatGptQuickstart(null) }}'],
])
function handlers(code) {
 const a=ts.createSourceFile('component.tsx',code,99,true,4),out=[]
 function walk(n){if(ts.isJsxAttribute(n)&&['onClick','onChange','disabled','value','checked','src','poster','onDownload','onClose','downloading'].includes(n.name.getText(a)))out.push(n.getText(a).replace(/\r\n/g,'\n'));ts.forEachChild(n,walk)}
 walk(a);return out.sort()
}
function missingHandlers(file,code) {
 const now=handlers(code)
 const base=file===historyFile?handlers(source(file,true,'3ec6c9d9b')):handlers(source(file,true,'6f6eca73')).map(h=>{
  if(file===historyFile)return historyReanchors.get(h)??h
  if(file===libraryFile)return h===libraryResetBefore?libraryResetAfter:h.replace('completed_video_count: vids.length','completed_video_count: completedCount')
  if(file==='app/(dashboard)/studio/StudioClient.tsx')return studioReanchors.get(h)??h
  return h
 })
 return base.filter(h=>!now.includes(h))
}
// The Essential preview extracted the old modal into FilmPreviewDialog. Keep
// the prior full handler proof on its immutable approved source, and pin the
// current wrapper and consumer while checking their actual props below.
const oldHistoryHandlers=handlers(source(historyFile,true,'6f6eca73')).map(h=>h==='src={enhUrls[v.id] ?? v.video_url}'?'src={filmSource(v.video_url, enhUrls[v.id], fileVersions[v.id])!}':historyReanchors.get(h)??h)
eq(oldHistoryHandlers.filter(h=>!handlers(source(historyFile,true,'221a59ba')).includes(h)),[],'original complete History wiring survives in its approved pre-extraction fixture')
for(const file of [historyFile,'components/FilmPreviewDialog.tsx','app/(dashboard)/studio/StudioClient.tsx'])eq(source(file).replace(/\r\n/g,'\n'),gitSource('3ec6c9d9b',file),'approved current wrapper full source '+file)
for(const file of ['app/(dashboard)/history/HistoryClient.tsx','app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/library/LibraryClient.tsx','app/tools/editor/VideoEditor.tsx']) {
 // KINEO-TRES-MODOS-2026-09-11 — acréscimo aprovado no Studio (modo clipe): a trava exige que todo handler da base continue presente; remoção/mudança segue reprovando.
 // The approved unified Library includes unfinished projects. Its completed
 // counter now uses Ready projects; the event and destination must stay intact.
 eq(missingHandlers(file,source(file)),[],'existing handlers, media, settings and submit gates preserved '+file)
}
// Execute the current reset handler and the actual source expressions, rather
// than accepting changed strings without proving the behavior they represent.
const historyCode=source(historyFile),historyAst=ts.createSourceFile(historyFile,historyCode,99,true,4)
function jsxExpression(attribute,ast=historyAst) {
 let expression
 function walk(n){if(ts.isJsxAttribute(n)&&n.getText(ast).replace(/\r\n/g,'\n')===attribute)expression=n.initializer.expression.getText(ast);ts.forEachChild(n,walk)}
 walk(ast);assert.ok(expression,'approved JSX attribute is wired');return expression
}
function execute(code,context={}) {
 const box={...context,exports:{}}
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:1,target:9}}).outputText,box)
 return box.exports
}
const resetExpression=jsxExpression(historyReanchors.get("onClick={() => setQuery('')}"))
function resetWorks(expression) {
 const calls=[]
 execute(`(${expression})()`,{setQuery:v=>calls.push(['query',v]),organization:{setFavoritesOnly:v=>calls.push(['favoritesOnly',v])},setFormat:v=>calls.push(['format',v])})
 return JSON.stringify(calls)===JSON.stringify([['query',''],['favoritesOnly',false],['format','all']])
}
ok(resetWorks(resetExpression),'reset clears query, favorites-only and format together')
for(const call of ["setQuery('');",'organization.setFavoritesOnly(false);',"setFormat('all')"])ok(!resetWorks(resetExpression.replace(call,'')),'reset mutant rejected: '+call)
const libraryCode=source(libraryFile),libraryAst=ts.createSourceFile(libraryFile,libraryCode,99,true,4)
const libraryResetExpression=jsxExpression(libraryResetAfter,libraryAst)
function libraryResetWorks(expression) {
 const calls=[]
 execute(`(${expression})()`,{setQ:v=>calls.push(['query',v]),organization:{setFavoritesOnly:v=>calls.push(['favoritesOnly',v])}})
 return JSON.stringify(calls)===JSON.stringify([['query',''],['favoritesOnly',false]])
}
ok(libraryResetWorks(libraryResetExpression),'Library reset clears query and favorites-only together')
for(const call of ["setQ('');",'organization.setFavoritesOnly(false)'])ok(!libraryResetWorks(libraryResetExpression.replace(call,'')),'Library reset mutant rejected: '+call)
ok(missingHandlers(libraryFile,libraryCode.replace(libraryResetAfter,'onClick={() => {}}')).length>0,'guard rejects disconnected Library reset')
const {filmSource}=pure('lib/ui/deliveryRefinement.ts')
const mediaExpressions=[...historyReanchors.values()].filter(v=>v.startsWith('src=')).map(attribute=>{
 const expression=jsxExpression(attribute)
 if(expression!=='src')return expression
 let initializer
 function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(historyAst)==='src'&&n.initializer?.getText(historyAst).includes('filmSource(v.video_url'))initializer=n.initializer.getText(historyAst);ts.forEachChild(n,walk)}
 walk(historyAst);ok(initializer,'real Essential preview src uses the version selector');return initializer
})
function mediaWorks(select) {
 for(const expression of mediaExpressions)for(const choice of [undefined,'original','enhanced'])for(const enhanced of [undefined,'enhanced.mp4']) {
  const film={id:'chosen-film',video_url:'original.mp4'}
  const result=execute(`exports.url=${expression}`,{filmSource:select,v:film,video:film,enhUrls:{[film.id]:enhanced},fileVersions:{[film.id]:choice}})
  if(result.url!==(choice==='original'?'original.mp4':enhanced??'original.mp4'))return false
 }
 return true
}
ok(mediaWorks(filmSource),'card and player select original/enhanced and fall back to original when enhancement is absent')
ok(!mediaWorks((_original,enhanced)=>enhanced),'media mutant rejected: ignores original choice and missing enhancement')
ok(!mediaWorks(original=>original),'media mutant rejected: ignores enhanced choice')
const downloadFn=historyAst.statements.flatMap(function walk(n){return ts.isFunctionDeclaration(n)&&n.name?.text==='handleDownload'?[n.getText(historyAst)]:n.getChildren(historyAst).flatMap(walk)})[0]
assert.ok(downloadFn,'real download handler exists')
for(const choice of [undefined,'original','enhanced'])for(const enhanced of [undefined,'enhanced.mp4']) {
 const calls=[],film={id:'chosen-film',video_url:'original.mp4',topic:author}
 const {run}=execute(downloadFn+'\nexports.run=handleDownload',{filmSource,downloadingId:null,setDownloadingId:()=>{},setDownloadNotes:()=>{},extractTitle:x=>x,enhUrls:{[film.id]:enhanced},fileVersions:{[film.id]:choice},isWatermarkedFastAsset:()=>false,downloadVideoFile:async args=>{calls.push(args);return 'blob'},downloadOutcomeMessage:()=>'',ui:x=>x,showToast:()=>{}})
 await run(film)
 eq(calls.map(c=>c.url),[choice==='original'?'original.mp4':enhanced??'original.mp4'],'download matches preview selection '+choice+' / '+enhanced)
}
for(const [from,to] of [
 ...[...historyReanchors.values()].map(attribute=>[attribute,attribute.startsWith('src=')?'src={"wrong.mp4"}':'onClick={() => {}}']),
 ['onClick={() => handleDownload(video)}','onClick={() => {}}'],
 ['onClick={() => handleEnhance(video)}','onClick={() => {}}'],
]) {
 ok(historyCode.includes(from),'mutation anchor exists: '+from)
 ok(missingHandlers(historyFile,historyCode.replace(from,to)).length>0,'guard rejects changed approved or commercial wiring: '+from)
}
for(const [file,fixture,props] of [
 ['app/KineoLanding.tsx',{},{}], ['app/tools/page.tsx',{},{}],
 ['app/tools/editor/VideoEditor.tsx',{supported:true},{initialTool:'trim'}],
 ['app/(dashboard)/studio/StudioClient.tsx',{prompt:author,balance:25},{}],
 ['app/(dashboard)/images/ImagesClient.tsx',{prompt:author,galleryLoading:false},{}],
 ['app/(dashboard)/audio/AudioClient.tsx',{text:author,galleryLoading:false},{}],
 ['app/(dashboard)/library/LibraryClient.tsx',{loaded:true,vids:[fixtureVideo],recentVideo:fixtureVideo},{}],
 ['app/(dashboard)/avatar/AvatarStudioClient.tsx',{}, {isLoggedIn:false}],
 ['app/(dashboard)/animate/AnimateClient.tsx',{},{}],
 ['app/(dashboard)/history/HistoryClient.tsx',{subscriptionOfferEligible:true},{videos:[fixtureVideo]}],
 ['components/Footer.tsx',{},{}],
]) {
 const en=renderPage(file,false,{...fixture,interfaceLanguage:'en'},props)
 for(const language of ['es','hi']){
  const html=renderPage(file,false,{...fixture,interfaceLanguage:language},props)
  eq(hrefs(html),hrefs(en),file+' same destinations in '+language)
  eq(prices(html),prices(en),file+' prices not converted in '+language)
  ok(!html.includes('undefined'),'no missing label '+file+' '+language)
  if(en.includes('My original story'))ok(html.includes('My original story'),'user input intact '+file+' '+language)
 }
}
for(const language of ['en','es','hi']){
 for(const tab of ['videos','images','audio']){
  const html=renderPage('app/(dashboard)/library/LibraryClient.tsx',false,{loaded:true,loadFailed:true,tab,interfaceLanguage:language})
  ok(html.includes('role="alert"'),'failed load has actionable error '+language+' '+tab)
  ok(!html.includes('create your first'),'read failure never pushes first generation')
 }
 for(const error of ['unsupported','file_limits','clip_limits','invalid_settings','invalid_speed','invalid_text','invalid_framing','decode_failed','keep_visible','export_stalled','audio_unavailable','play_failed','cancelled','export_failed','export_incomplete']){
  const html=renderPage('app/tools/editor/VideoEditor.tsx',false,{supported:true,error,interfaceLanguage:language},{initialTool:'trim'})
  ok(html.includes('role="alert"'),'editor error visible '+error+' '+language)
  if(language==='hi')ok(/[\u0900-\u097F]/.test(html.match(/role="alert">([^<]+)/)?.[1]??''),'editor error actually Hindi '+error)
 }
 for(const tool of ['trim','resize','speed','mute','text']){
  const html=renderPage('app/tools/editor/VideoEditor.tsx',false,{supported:true,interfaceLanguage:language},{initialTool:tool})
  eq((html.match(/aria-pressed="true"/g)??[]).length,1,'one selected tool '+tool+' '+language)
 }
 const history=renderPage('app/(dashboard)/history/HistoryClient.tsx',false,{subscriptionOfferEligible:true,interfaceLanguage:language},{videos:[fixtureVideo]})
 const details=history.indexOf('<details'),video=history.indexOf('id="v-demo-video"')
 ok(video>=0&&details>video,'owned video before secondary disclosure '+language)
 ok(!history.includes('aria-label="Private sharing notice"'),'no competing privacy hero when closed')
 const opened=renderPage('app/(dashboard)/history/HistoryClient.tsx',false,{sharingOptionsOpen:true,interfaceLanguage:language},{videos:[fixtureVideo]})
 ok(opened.includes('aria-label="Private sharing notice"'),'secondary privacy information remains reachable')
}
// Use the literal from the actual production component, not a copy of its CSS.
function cssConstant(file,names,target){
 const ast=ts.createSourceFile(file,source(file),99,true,4),pieces=[]
 for(const st of ast.statements)if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations)if(names.includes(d.name.getText(ast)))pieces.push('const '+d.getText(ast))
 ok(pieces.length===names.length,'all actual CSS constants found '+file)
 return execute(pieces.join('\n')+'\nexports.css='+target).css
}
function actualCss(expression,ast){
 if(ts.isNoSubstitutionTemplateLiteral(expression))return expression.text
 if(!ts.isIdentifier(expression))return null
 if(expression.text==='STUDIO_LAYOUT_CSS')return cssConstant('app/(dashboard)/studio/StudioClient.tsx',['STUDIO_LAYOUT_CSS'],'STUDIO_LAYOUT_CSS')
 if(expression.text==='STAGE_CSS')return cssConstant('app/(dashboard)/studio/StudioClient.tsx',['STAGE_TINT','STAGE_CSS'],'STAGE_CSS')
 if(expression.text==='STUDIO_KIT_CSS'){
  const workspace=cssConstant('lib/ui/workspacePresentation.ts',['WORKSPACE_PRESENTATION_CSS'],'WORKSPACE_PRESENTATION_CSS')
  const kitAst=ts.createSourceFile('studioKit.tsx',source('components/studioKit.tsx'),99,true,4)
  const decl=kitAst.statements.filter(ts.isVariableStatement).flatMap(st=>[...st.declarationList.declarations]).find(d=>d.name.getText(kitAst)==='STUDIO_KIT_CSS')
  ok(decl,'actual shared Studio CSS declaration found')
  return execute('const '+decl.getText(kitAst)+'\nexports.css=STUDIO_KIT_CSS',{WORKSPACE_PRESENTATION_CSS:workspace}).css
 }
 return null
}
for(const file of ['components/MobileNav.tsx','app/(dashboard)/studio/StudioClient.tsx']){
 const a=ts.createSourceFile(file,source(file),99,true,4),styles=[]
 function walk(n){if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(a)==='style'){
  const attr=n.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.text==='dangerouslySetInnerHTML')
  const obj=attr?.initializer?.expression
  const css=obj&&ts.isObjectLiteralExpression(obj)?obj.properties.find(p=>p.name?.getText(a)==='__html')?.initializer:null
  if(css){const value=actualCss(css,a);ok(typeof value==='string','every real raw style resolves to actual constant '+file);if(typeof value==='string')styles.push(value)}
 }ts.forEachChild(n,walk)}walk(a)
 ok(styles.length>=1,'actual static raw CSS found '+file)
 for(const css of styles){
  ok(!css.includes('</style'),'CSS cannot break out of raw-text element')
  const raw=renderToStaticMarkup(React.createElement('style',{dangerouslySetInnerHTML:{__html:css}}))
  eq(raw,'<style>'+css+'</style>','SSR CSS equals browser raw text')
  ok(renderToStaticMarkup(React.createElement('style',null,css))!==raw,'old text-child behavior reproduces the mismatch')
 }
}
const unknown=canonicalCopyHindi('An unknown future offer with 999 credits')
// Execute the actual calendar/age helpers under two browser clocks/timezones.
// A UTC date near midnight used to render as the previous day in Sao Paulo.
function historyClock(before, zone, now) {
 const file='app/(dashboard)/history/HistoryClient.tsx', code=source(file,before,'530d8e01')
 const ast=ts.createSourceFile(file,code,99,true,4)
 const names=['formatDate','formatStarted','classifyVideoState']
 const body=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n')
 class Clock extends Date {
  constructor(...args){super(...(args.length?args:[now]))}
  static now(){return now}
  toLocaleDateString(locale,options){return super.toLocaleDateString(locale,{timeZone:zone,...options})}
 }
 const ctx={Date:Clock,exports:{}}
 vm.runInNewContext(ts.transpileModule(`const FAILED_STATUSES=new Set(['failed','error','cancelled']);const STALE_PROCESSING_MS=1800000;${body}\nObject.assign(exports,{${names.join(',')}})`,{compilerOptions:{target:9}}).outputText,ctx)
 return ctx.exports
}
const clockSnapshot=Date.parse('2026-09-07T06:00:00Z')
const server=historyClock(false,'UTC',clockSnapshot),client=historyClock(false,'America/Sao_Paulo',clockSnapshot+2000)
const oldServer=historyClock(true,'UTC',clockSnapshot),oldClient=historyClock(true,'America/Sao_Paulo',clockSnapshot+2000)
ok(oldServer.formatDate('2026-08-01T01:00:00Z')!==oldClient.formatDate('2026-08-01T01:00:00Z'),'red: real old date helper differs across timezone')
ok(oldServer.formatDate('2026-09-07T05:00:01Z')!==oldClient.formatDate('2026-09-07T05:00:01Z'),'red: real old relative date crosses hydration boundary')
for(const date of ['2026-08-01T01:00:00Z','2026-09-07T05:00:01Z','2026-09-07T05:59:01Z']){
 eq(server.formatDate(date,clockSnapshot),client.formatDate(date,clockSnapshot),'calendar and relative date deterministic '+date)
 eq(server.formatStarted(date,clockSnapshot),client.formatStarted(date,clockSnapshot),'started age deterministic '+date)
}
for(const status of ['completed','failed','processing']){
 const video={status,created_at:'2026-09-07T05:30:01Z'}
 eq(server.classifyVideoState(video,clockSnapshot),client.classifyVideoState(video,clockSnapshot),'display state stable across timeout edge '+status)
}
ok(source('components/library/VideoCollection.tsx').includes('snapshotTime={Date.now()}'),'real server collection supplies shared clock')
ok(source('app/(dashboard)/history/HistoryClient.tsx').includes('useState(snapshotTime)'),'first browser render reuses server clock')
eq(unknown,undefined,'unknown claim not rewritten')
ok(!source('components/InterfaceLanguage.tsx').includes('navigator.language'),'manual choice only')
ok(source('app/layout.tsx').includes('preload: false'),'no Hindi preload for every visitor')
ok(source('app/(dashboard)/history/HistoryClient.tsx').includes('if (event.currentTarget.open) setSharingOptionsOpen(true)'),'reopening details does not remount integrations or repeat their mount impressions')
console.log(`Locale readiness: ${checks} checks passed. Offline contracts, not paid end-to-end certification.`)
