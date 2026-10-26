import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {source,renderPage} from './preview-ux-complete.mjs'
const baseline='d8889f6c'
// Keep the original wrapper-only proof at its immutable delivery. Current UI is exercised below; later approved features are not wrapper changes.
const delivery='6e30c986'
// Approved integration snapshot: later reviewed work is retained, and any new whole-file delta must be reviewed explicitly.
const approvedIntegration='a698625a'
let checks=0
const strip=s=>s.replace(/\r\n/g,'\n').replace(/^import \{ UiLabel \} from '@\/components\/InterfaceLanguage'\n/gm,'').replace(/<UiLabel>|<\/UiLabel>/g,'')
// Compare the WHOLE files after removing only the transparent text wrappers.
// This covers callbacks, effects, consent, sources, routing and input values,
// not only selected regular-expression anchors or a disconnected library.
for(const file of ['app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/avatar/AvatarStudioClient.tsx','app/(dashboard)/animate/AnimateClient.tsx','components/EngineCycleCard.tsx','components/NavEngineItem.tsx','components/Sidebar.tsx','app/KineoLanding.tsx']){
 assert.equal(source(file).replace(/\r\n/g,'\n'),source(file,true,approvedIntegration).replace(/\r\n/g,'\n'),file+' current whole source matches the approved integration');checks++
 const before=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'})
 // Founder 06/09 moved the language control into Main and removed the three
 // duplicate hero shortcuts. Normalize only that exact approved navigation delta;
 // test-language-navigation.mjs executes the new placement for both auth states.
 const navigation=s=>s.replace(/\r\n/g,'\n').replace(/          <div className="home-jump" role="navigation" aria-label="On this page">\n            <a href="#samples"><UiLabel>Real videos<\/UiLabel><\/a>\n            <a href="#toolkit"><UiLabel>Tools<\/UiLabel><\/a>\n            <a href="#pricing"><UiLabel>Plans<\/UiLabel><\/a>\n            <InterfaceLanguageSelect \/>\n          <\/div>\n/,'').replace('          <InterfaceLanguageSelect />\n','').replace('btn btn-w nav-dashboard','btn btn-w')
 // Founder-requested rename 06/09. The new editor tests assert both real nav links;
 // this old wrapper test continues protecting all other home logic and media.
 const current = file==='app/KineoLanding.tsx' ? source(file,true,delivery).replaceAll('<UiLabel>Editing tools</UiLabel>','<UiLabel>Free tools</UiLabel>') : source(file,true,delivery)
 assert.equal(strip(file==='app/KineoLanding.tsx'?navigation(current):current),strip(file==='app/KineoLanding.tsx'?navigation(before):before),file+' original delivery changed only approved presentation');checks++
}
const fixtures=[
 ['app/(dashboard)/studio/StudioClient.tsx',{},'Primero escribe tu idea'],
 ['app/(dashboard)/studio/StudioClient.tsx',{prompt:'CLIENT TEXT unchanged',balance:200},'Generar ·'],
 ['app/(dashboard)/studio/StudioClient.tsx',{pickerOpen:true},'El motor de vídeo IA para el día a día'],
 ['app/(dashboard)/animate/AnimateClient.tsx',{},'Una foto que cobra vida.'],
 ['app/(dashboard)/animate/AnimateClient.tsx',{phase:'animating'},'Dando vida a tu foto'],
 ['app/(dashboard)/avatar/AvatarStudioClient.tsx',{},'Tu rostro. Tu guion.'],
 ['app/(dashboard)/avatar/AvatarStudioClient.tsx',{phase:'done',finalUrl:'/fixture.mp4'},'Descargar MP4'],
]
const hrefs=h=>[...h.matchAll(/(?:href|src|value|checked|disabled)="([^"]*)"/g)].map(m=>m[0])
for(const [file,state,copy] of fixtures){
 const en=renderPage(file,false,state,{isLoggedIn:false,userId:null})
 const es=renderPage(file,false,{...state,interfaceLanguage:'es'},{isLoggedIn:false,userId:null})
 assert.ok(es.includes(copy),file+' real Spanish state');checks++
 assert.deepEqual(hrefs(es),hrefs(en),file+' same controls and destinations');checks++
 if(state.prompt){assert.ok(es.includes('>CLIENT TEXT unchanged</textarea>'));checks++}
}
console.log(`PASS ${checks} workspace Spanish contracts, no external requests`)
