import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {source,renderPage} from './preview-ux-complete.mjs'
const require=createRequire(import.meta.url),ts=require('typescript')
let checks=0
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const ok=(value,label)=>{assert.ok(value,label);checks++}
function attributes(file,before,names){
 const sf=ts.createSourceFile(file,source(file,before),99,true,4),out=[]
 function walk(n){if(ts.isJsxAttribute(n)&&names.includes(n.name.getText(sf)))out.push(n.getText(sf).replace(/\s+/g,' '));ts.forEachChild(n,walk)}walk(sf);return out.sort()
}
for(const name of ['images/ImagesClient','audio/AudioClient','library/LibraryClient']){
 const file=`app/(dashboard)/${name}.tsx`
 eq(attributes(file,false,['onClick','onChange','onMouseEnter','onMouseLeave','disabled','src','poster','href']),attributes(file,true,['onClick','onChange','onMouseEnter','onMouseLeave','disabled','src','poster','href']),name+' keeps handlers, costs gates, destinations and media')
 // Normalize only Windows checkout line endings; executable text must match.
 const old=source(file,true).replace(/\r\n/g,'\n'),next=source(file).replace(/\r\n/g,'\n')
 eq(next.split('  return (')[0],old.split('  return (')[0],name+' setup, requests, credit handling unchanged')
}
const home='app/KineoLanding.tsx',oldHome=source(home,true),newHome=source(home)
const oldAnswers=[...oldHome.matchAll(/<div className="qa"><h3>(.*?)<\/h3><p>(.*?)<\/p><\/div>/g)].map(m=>[m[1],m[2]])
const newAnswers=[...newHome.matchAll(/<details className="qa"><summary><h3>(.*?)<\/h3><\/summary><p>(.*?)<\/p><\/details>/g)].map(m=>[m[1],m[2]])
eq(newAnswers,oldAnswers,'all FAQ answers, pricing functions and offer conditions are unchanged')
eq(newAnswers.length,15,'fifteen keyboard-native disclosures, not missing answers')
eq(attributes(home,false,['src','poster']),attributes(home,true,['src','poster']),'home keeps every literal/dynamic media source')
ok(newHome.includes("['cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni']"),'curated hero order retained')
const html=renderPage(home)
eq((html.match(/<h1[ >]/g)||[]).length,1,'one visible main heading')
eq((html.match(/<details class="qa"/g)||[]).length,15,'native FAQ renders on the server')
for(const page of ['images/ImagesClient','audio/AudioClient']){
 const file=`app/(dashboard)/${page}.tsx`
 for(const [state,fixture] of Object.entries({empty:{galleryLoading:false},busy:{busy:true,prompt:'user text',text:'user text'},picker:{pickerOpen:true},failure:{galleryLoading:false,galleryFailed:true,error:'Example error'},results:{galleryLoading:false,items:[{url:'/fixture.png',model:'dev',text:'User-owned content'}]}})){
  const rendered=renderPage(file,false,fixture)
  ok(rendered.indexOf('<textarea')<rendered.indexOf('class="rail creation-settings"'),page+' '+state+': input before settings in DOM')
  ok(rendered.includes('class="creation-results"'),page+' '+state+': results separate from editor')
  if(state==='empty'||state==='busy')ok(/disabled="" class="go/.test(rendered),page+' '+state+': generate remains disabled')
  if(state==='failure')ok(rendered.includes('role="alert"')&&rendered.includes('Try again'),page+': error is actionable')
 }
}
for(const tab of ['videos','images','audio']){
 const rendered=renderPage('app/(dashboard)/library/LibraryClient.tsx',false,{loaded:true,tab})
 eq((rendered.match(/aria-pressed="true"/g)||[]).length,1,tab+': one selected asset filter')
 ok(rendered.includes('class="library-toolbar"'),tab+': shared toolbar renders')
}
const toolsBefore=renderPage('app/tools/page.tsx',true),toolsAfter=renderPage('app/tools/page.tsx')
const hrefs=html=>[...html.matchAll(/<a[^>]* href="([^"]+)"/g)].map(m=>m[1]).filter(h=>!h.startsWith('#tools-')).sort()
eq(hrefs(toolsAfter),hrefs(toolsBefore),'tools retain every destination, no missing or duplicate tool')
eq((toolsAfter.match(/<article /g)||[]).length,(toolsBefore.match(/<article /g)||[]).length,'tools grouping keeps every canonical card')
for(const id of ['write','plan','publish'])ok(toolsAfter.includes(`id="tools-${id}"`),'working category anchor '+id)
console.log(`PASS ${checks} executable UX invariants; no network, generation, tracking or credentials`)
