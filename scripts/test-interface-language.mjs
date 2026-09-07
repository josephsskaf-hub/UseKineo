import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import {source,renderPage} from './preview-ux-complete.mjs'
const require=createRequire(import.meta.url),ts=require('typescript')
let checks=0
const check=(value,message)=>{assert.ok(value,message);checks++}
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++}
function pure(file){const box={exports:{}};vm.runInNewContext(ts.transpileModule(source(file),{compilerOptions:{module:1,target:7}}).outputText,{exports:box.exports});return box.exports}
const language=pure('lib/ui/interfaceLanguage.ts'),labels=pure('lib/ui/interfaceLabels.ts').INTERFACE_ES
for(const value of [null,undefined,'pt','ES',{},'<script>','es/en',''])equal(language.parseInterfaceLanguage(value),'en','invalid preference is English')
equal(language.parseInterfaceLanguage('es'),'es','explicit Spanish accepted')
equal(language.parseInterfaceLanguage('en'),'en','English can be restored')
const canonical=pure('lib/ui/canonicalCopySpanish.ts').canonicalCopySpanish
for(const amount of [0,1,25,40,80,180]){
 const input=`Start free — every engine unlocked, including Kling 3. Make ${amount} AI ${amount===1?'film':'films'} free, watermarked. Upgrade any time to download them clean.`
 equal(canonical(input).match(/\d+/g),input.match(/\d+/g),'canonical quantities preserved, not frozen at today’s grant')
}
equal(canonical('A different offer: 500 free credits'),undefined,'unrecognized offer is not silently translated to another promise')
for(const tier of ['starter','basic','pro'])for(const variant of ['big','cta']){
 const en=renderPage('components/LandingPlanPrice.tsx',false,{}, {tier,variant}),es=renderPage('components/LandingPlanPrice.tsx',false,{interfaceLanguage:'es'},{tier,variant})
 equal(es.match(/\$[\d.]+/g),en.match(/\$[\d.]+/g),'Spanish keeps exact USD price '+tier+' '+variant)
 check(es.includes('/mes'),'billing interval localized '+tier+' '+variant)
}
for(const [en,es] of Object.entries(labels)){
 check(es.trim().length>0,'nonempty translation: '+en)
 equal(es.match(/\d+/g),en.match(/\d+/g),'numerical claims unchanged: '+en)
}
for(const [file,expected] of [
 ['app/KineoLanding.tsx','Escribe una idea'],
 // 06/09: the founder added local editors; assert the new real Spanish heading.
 // Founder requested descriptive tool names instead of the previous slogan.
 ['app/tools/page.tsx','Herramientas para editar y crear vídeos'],
 ['app/(dashboard)/images/ImagesClient.tsx','Primero describe tu imagen'],
 ['app/(dashboard)/audio/AudioClient.tsx','Primero escribe tu guion'],
 ['app/(dashboard)/library/LibraryClient.tsx','Biblioteca'],
]){
 const en=renderPage(file,false,{loaded:true,galleryLoading:false}),es=renderPage(file,false,{loaded:true,galleryLoading:false,interfaceLanguage:'es'})
 check(es.includes(expected),file+' renders real Spanish UI')
 const hrefs=html=>[...html.matchAll(/href="([^"]*)"/g)].map(m=>m[1]).sort()
 equal(hrefs(es),hrefs(en),file+' language keeps every destination')
 check(!en.includes('lang="es" style='),file+' default SSR remains English')
}
const userText='My private script: Images, Library, Studio. Do not translate this.'
const image=renderPage('app/(dashboard)/images/ImagesClient.tsx',false,{prompt:userText,interfaceLanguage:'es'})
check(image.includes('>'+userText+'</textarea>'),'user prompt untouched in Spanish')
const audio=renderPage('app/(dashboard)/audio/AudioClient.tsx',false,{text:userText,interfaceLanguage:'es'})
check(audio.includes('>'+userText+'</textarea>'),'narration untouched in Spanish')
const library=renderPage('app/(dashboard)/library/LibraryClient.tsx',false,{loaded:true,interfaceLanguage:'es',vids:[{id:'fixture',title:userText,video_url:'/fixture.mp4'}]})
check(library.includes(userText),'user video title not translated')
for(const file of ['app/(dashboard)/animate/AnimateClient.tsx','app/(dashboard)/avatar/AvatarStudioClient.tsx']){
 const parse=before=>ts.createSourceFile(file,source(file,before),99,true,4)
 // Git stores LF; this Windows worktree may use CRLF. Normalize only line endings.
 const callbacks=before=>{const sf=parse(before),out=[];function walk(n){if(ts.isJsxAttribute(n)&&['onClick','onChange','disabled','src','poster','checked','value'].includes(n.name.getText(sf)))out.push(n.getText(sf).replace(/\r\n/g,'\n'));ts.forEachChild(n,walk)}walk(sf);return out.sort()}
 equal(callbacks(false),callbacks(true),file+' preserves handlers, consent, media and disabled gates')
 const logic=before=>{const sf=parse(before),component=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword));const firstReturn=component.body.statements.find(ts.isReturnStatement);return source(file,before).slice(component.body.pos,firstReturn.pos).replace(/\r\n/g,'\n')}
 equal(logic(false),logic(true),file+' all pre-render executable logic unchanged')
 for(const phase of ['idle','submitting','animating','done','failed']){
  const html=renderPage(file,false,{phase,finalUrl:phase==='done'?'/fixture.mp4':null,resultUrl:phase==='done'?'/fixture.mp4':null}, {isLoggedIn:false,userId:null})
  // The completed state replaces the placeholder, not an instruction saying "preview".
  check(phase==='done' ? html.includes('<video src="/fixture.mp4"') : html.includes('preview'),file+' '+phase+' renders placeholder or completed player')
 }
}
const avatar=renderPage('app/(dashboard)/avatar/AvatarStudioClient.tsx',false,{phase:'done',finalUrl:'/fixture.mp4'},{isLoggedIn:true})
check(avatar.includes('id="avatar-preview"'),'avatar preview has an actual jump target')
check(!avatar.includes('hidden lg:flex'),'avatar result and download no longer desktop-only')
check(avatar.includes('download=""')&&avatar.includes('/fixture.mp4'),'completed avatar keeps its download')
const footerBefore=renderPage('components/Footer.tsx',true),footerAfter=renderPage('components/Footer.tsx')
const links=html=>[...html.matchAll(/href="([^"]*)"/g)].map(m=>m[1]).sort()
equal(links(footerAfter),links(footerBefore),'footer keeps every link through native disclosures')
equal((footerAfter.match(/<details /g)||[]).length,4,'four footer navigation groups')
console.log(`PASS ${checks} locale and workspace checks; no network, database, email or generation`)
