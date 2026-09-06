import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {source,renderPage} from './preview-ux-complete.mjs'
const baseline='d8889f6c'
let checks=0
const strip=s=>s.replace(/\r\n/g,'\n').replace(/^import \{ UiLabel \} from '@\/components\/InterfaceLanguage'\n/gm,'').replace(/<UiLabel>|<\/UiLabel>/g,'')
// Compare the WHOLE files after removing only the transparent text wrappers.
// This covers callbacks, effects, consent, sources, routing and input values,
// not only selected regular-expression anchors or a disconnected library.
for(const file of ['app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/avatar/AvatarStudioClient.tsx','app/(dashboard)/animate/AnimateClient.tsx','components/EngineCycleCard.tsx','components/NavEngineItem.tsx','components/Sidebar.tsx','app/KineoLanding.tsx']){
 const before=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'})
 assert.equal(strip(source(file)),strip(before),file+' changed only presentation wrappers');checks++
}
const fixtures=[
 ['app/(dashboard)/studio/StudioClient.tsx',{},'Primero tu idea'],
 ['app/(dashboard)/studio/StudioClient.tsx',{prompt:'CLIENT TEXT unchanged',balance:200},'Generar ·'],
 ['app/(dashboard)/studio/StudioClient.tsx',{pickerOpen:true},'La forma más económica'],
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
