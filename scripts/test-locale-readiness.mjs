// Offline contract checks: no accounts, storage, provider calls or paid renders.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {renderPage, source} from './preview-ux-complete.mjs'
let checks=0
const ok=(v,m)=>{assert.ok(v,m);checks++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++}
function pure(file){const exports={};vm.runInNewContext(ts.transpileModule(source(file),{compilerOptions:{module:1,target:9}}).outputText,{exports});return exports}
const {INTERFACE_HI:hi,canonicalCopyHindi}=pure('lib/ui/interfaceHindi.ts')
const {parseInterfaceLanguage}=pure('lib/ui/interfaceLanguage.ts')
for(const key of Object.keys(pure('lib/ui/interfaceLabels.ts').INTERFACE_ES))ok(hi[key],'Hindi covers existing UiLabel dictionary: '+key)
for(const l of ['en','es','hi'])eq(parseInterfaceLanguage(l),l,'explicit locale accepted')
for(const v of ['pt','pt-BR','HI','in',null,'<script>'])eq(parseInterfaceLanguage(v),'en','unknown locale never geoguessed')
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
for(const file of ['app/(dashboard)/history/HistoryClient.tsx','app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/library/LibraryClient.tsx','app/tools/editor/VideoEditor.tsx']) {
 const handlers=before=>{const a=ts.createSourceFile(file,source(file,before,'6f6eca73'),99,true,4),out=[];function walk(n){if(ts.isJsxAttribute(n)&&['onClick','onChange','disabled','value','checked','src','poster'].includes(n.name.getText(a)))out.push(n.getText(a).replace(/\r\n/g,'\n'));ts.forEachChild(n,walk)}walk(a);return out.sort()}
 eq(handlers(false),handlers(true),'existing handlers, media, settings and submit gates preserved '+file)
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
for(const file of ['components/MobileNav.tsx','app/(dashboard)/studio/StudioClient.tsx']){
 const a=ts.createSourceFile(file,source(file),99,true,4),styles=[]
 function walk(n){if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(a)==='style'){
  const attr=n.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.text==='dangerouslySetInnerHTML')
  const obj=attr?.initializer?.expression
  const css=obj&&ts.isObjectLiteralExpression(obj)?obj.properties.find(p=>p.name?.getText(a)==='__html')?.initializer:null
  if(css&&ts.isNoSubstitutionTemplateLiteral(css))styles.push(css.text)
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
eq(unknown,undefined,'unknown claim not rewritten')
ok(!source('components/InterfaceLanguage.tsx').includes('navigator.language'),'manual choice only')
ok(source('app/layout.tsx').includes('preload: false'),'no Hindi preload for every visitor')
ok(source('app/(dashboard)/history/HistoryClient.tsx').includes('if (event.currentTarget.open) setSharingOptionsOpen(true)'),'reopening details does not remount integrations or repeat their mount impressions')
console.log(`Locale readiness: ${checks} checks passed. Offline contracts, not paid end-to-end certification.`)
