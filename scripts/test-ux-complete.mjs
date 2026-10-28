import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {source,renderPage} from './preview-ux-complete.mjs'
import { semGaleriaHome2710 } from './test-support/desfaz-galeria-home-2710.mjs' // KINEO-GALERIA-HOME-2710 — o item "Made with Kineo" (27/10) sai em memória só na prova de fonte inteira aprovada
const require=createRequire(import.meta.url),ts=require('typescript')
// Preserve the original whole-file preservation proof at delivery. Runtime checks below execute the current approved UI.
const delivery='54bfdc48'
const approvedIntegration='a698625a'
const approvedSource=file=>eq(semGaleriaHome2710(source(file),file).replace(/\r\n/g,'\n'),source(file,true,approvedIntegration).replace(/\r\n/g,'\n'),file+' current whole source matches the approved integration')
let checks=0
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const ok=(value,label)=>{assert.ok(value,label);checks++}
function attributes(file,before,names,revision){
 const sf=ts.createSourceFile(file,revision?source(file,true,revision):source(file,before),99,true,4),out=[]
 function walk(n){if(ts.isJsxAttribute(n)&&names.includes(n.name.getText(sf)))out.push(n.getText(sf).replace(/\s+/g,' '));ts.forEachChild(n,walk)}walk(sf);return out.sort()
}
for(const name of ['images/ImagesClient','audio/AudioClient','library/LibraryClient']){
 const file=`app/(dashboard)/${name}.tsx`
 approvedSource(file)
 eq(attributes(file,false,['onClick','onChange','onMouseEnter','onMouseLeave','disabled','src','poster','href'],delivery),attributes(file,true,['onClick','onChange','onMouseEnter','onMouseLeave','disabled','src','poster','href']),name+' keeps handlers, costs gates, destinations and media')
 // Normalize only Windows checkout line endings; executable text must match.
 // InterfaceLanguage adds an import and wraps authored text (including clearBtn).
 // Keep its English children for this baseline check; no executable setup is exempt.
 const old=source(file,true).replace(/\r\n/g,'\n'),next=source(file,true,delivery).replace(/\r\n/g,'\n').replace("import { UiLabel } from '@/components/InterfaceLanguage'\n",'').replace(/<UiLabel>([^<>]*)<\/UiLabel>/g,'$1')
 eq(next.split('  return (')[0],old.split('  return (')[0],name+' setup, requests, credit handling unchanged')
}
// English children remain exact; Spanish labels are verified by the locale tests.
const home='app/KineoLanding.tsx',oldHome=source(home,true),newHome=source(home,true,delivery).replace(/<UiLabel>([\s\S]*?)<\/UiLabel>/g,'$1')
approvedSource(home)
const oldAnswers=[...oldHome.matchAll(/<div className="qa"><h3>(.*?)<\/h3><p>(.*?)<\/p><\/div>/g)].map(m=>[m[1],m[2]])
const newAnswers=[...newHome.matchAll(/<details className="qa"><summary><h3>(.*?)<\/h3><\/summary><p>(.*?)<\/p><\/details>/g)].map(m=>[m[1],m[2]])
eq(newAnswers,oldAnswers,'all FAQ answers, pricing functions and offer conditions are unchanged')
eq(newAnswers.length,15,'fifteen keyboard-native disclosures, not missing answers')
eq(attributes(home,false,['src','poster'],delivery),attributes(home,true,['src','poster']),'home keeps every literal/dynamic media source')
ok(newHome.includes("['cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni']"),'original delivery retained its curated hero order')
ok(source(home).includes('<HomeFeaturedFilms />'),'current home renders the founder-curated films component')
const html=renderPage(home)
eq((html.match(/<h1[ >]/g)||[]).length,1,'one visible main heading')
eq((html.match(/<details class="qa"/g)||[]).length,15,'native FAQ renders on the server')
for(const page of ['images/ImagesClient','audio/AudioClient']){
 const file=`app/(dashboard)/${page}.tsx`
 for(const [state,fixture] of Object.entries({empty:{galleryLoading:false},busy:{busy:true,prompt:'user text',text:'user text'},picker:{pickerOpen:true},failure:{galleryLoading:false,galleryFailed:true,error:'Example error'},results:{galleryLoading:false,items:[{url:'/fixture.png',model:'dev',text:'User-owned content'}]}})){
  const rendered=renderPage(file,false,fixture)
  const input=rendered.indexOf('<textarea'), settings=page.startsWith('images/')?rendered.indexOf('<span class="n">3</span>'):rendered.indexOf('class="rail creation-settings"')
  ok(input>=0 && settings>input,page+' '+state+': authored input precedes format settings in DOM')
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
// 06/09: founder requested five genuine local editors. Exclude ONLY their new
// destinations when comparing the legacy hub; none of the thirteen old tools may disappear.
eq(hrefs(toolsAfter).filter(h=>!h.startsWith('/tools/editor?tool=')),hrefs(toolsBefore),'tools retain every original destination')
eq((toolsAfter.match(/<article /g)||[]).length,(toolsBefore.match(/<article /g)||[]).length+5,'five additional editors; every canonical card remains')
for(const id of ['write','plan','publish'])ok(toolsAfter.includes(`id="tools-${id}"`),'working category anchor '+id)
console.log(`PASS ${checks} executable UX invariants; no network, generation, tracking or credentials`)
