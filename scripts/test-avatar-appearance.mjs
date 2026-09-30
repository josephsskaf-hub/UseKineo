// Offline presentation regression: actual JSX and canonical theme tokens.
import assert from 'node:assert/strict'
import ts from 'typescript'
import postcss from 'postcss'
import {renderPage, source} from './preview-ux-complete.mjs'
import {createOfflineLoader} from './test-support/offline-ts-loader.mjs'
const base='b0f4a293',file='app/(dashboard)/avatar/AvatarStudioClient.tsx'
let checks=0
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const ok=(a,label)=>{assert.ok(a,label);checks++}
// Exclude only paint properties inside JSX style objects. Display/visibility,
// controls, text, requests, consent, media sources and all other code stay frozen.
function withoutPaint(code){
 const sf=ts.createSourceFile(file,code,99,true,4)
 const paint=new Set(['background','border','color','boxShadow','borderRadius','padding'])
 const result=ts.transform(sf,[context=>{
  const visit=n=>{
   if(ts.isJsxAttribute(n)&&n.name.text==='style'&&ts.isJsxExpression(n.initializer)&&ts.isObjectLiteralExpression(n.initializer.expression)){
    const object=n.initializer.expression
    return ts.factory.updateJsxAttribute(n,n.name,ts.factory.updateJsxExpression(n.initializer,ts.factory.updateObjectLiteralExpression(object,object.properties.filter(p=>!ts.isPropertyAssignment(p)||!paint.has(p.name.getText(sf))))))
   }
   return ts.visitEachChild(n,visit,context)
  }
  return n=>ts.visitNode(n,visit)
 }])
 const text=ts.createPrinter({removeComments:true}).printFile(result.transformed[0]);result.dispose();return text.replace(/\r\n/g,'\n')
}
const currentFrozen=withoutPaint(source(file)),beforeFrozen=withoutPaint(source(file,true,base))
eq(currentFrozen===beforeFrozen,true,'all non-presentation code stays identical')
ok(withoutPaint(source(file).replace('disabled={!canGenerate}','disabled={false}'))!==currentFrozen,'mutant removing generation gate is rejected')
ok(withoutPaint(source(file).replace('setRights(e.target.checked)','setRights(true)'))!==currentFrozen,'mutant bypassing consent choice is rejected')
const load=createOfflineLoader(),css=load('lib/ui/avatarPresentation.ts').AVATAR_PRESENTATION_CSS
const rules=postcss.parse(css).nodes.filter(n=>n.type==='rule')
const declarations=selector=>Object.fromEntries(rules.filter(n=>n.selector===selector).flatMap(n=>n.nodes.filter(d=>d.type==='decl').map(d=>[d.prop,d.value])))
eq(declarations('.avatar-workspace .neon-card').background,'var(--card)','panel inherits selected theme')
eq(declarations('.avatar-workspace .btn-neon').background,'var(--indigo)','primary action inherits selected theme')
ok(!css.includes('#141920')&&!css.includes('#303946'),'fixed dark panel palette is removed')
ok(css.includes('outline:2px solid var(--accent)'),'keyboard focus follows theme')
const content=html=>html.replace(/<style[^>]*>[\s\S]*?<\/style>/g,'').replace(/ style="[^"]*"/g,'')
const fixtures=[{}, {faceUrl:'/fixture-face.svg',rights:true,script:'User authored script'}, {faceUrl:'/fixture-face.svg',fidelity:'scene',scenePrompt:'User authored scene'}, {sourceKind:'video',videoUrl:'/fixture.mp4'}, {phase:'animating',faceUrl:'/fixture-face.svg',progress:54}, {phase:'done',finalUrl:'/fixture.mp4'}, {phase:'failed',uploadError:'Fixture error'}, {recording:true}]
for(const fixture of fixtures){
 const now=renderPage(file,false,fixture,{isLoggedIn:true})
 eq(content(now),content(renderPage(file,true,fixture,{isLoggedIn:true},base)),'same controls, messages, consent and media in '+JSON.stringify(fixture))
 ok(!/background:(?:rgba\(0,0,0,.3\)|rgba\(41,151,255,0.15\))/.test(now),'form fields and selected buttons use theme tokens')
}
// Canonical palettes, not a second independently maintained Avatar palette.
const root=postcss.parse(source('app/appearance.css'))
const palette=selector=>Object.fromEntries(root.nodes.filter(n=>n.type==='rule'&&n.selector===selector).flatMap(n=>n.nodes.filter(d=>d.type==='decl').map(d=>[d.prop,d.value])))
const rgb=value=>{let s=value.slice(1);if(s.length===3)s=[...s].map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)}
const lum=rgb=>rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0)
const contrast=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const selector of [':root',"html[data-theme='dark'], .kineo-admin-theme"]){
 const p=palette(selector)
 for(const [fg,bg] of [['--text','--card'],['--muted','--card'],['--accent','--accent-soft'],['--on-accent','--indigo'],['--text2','--card'],['--text','--card2'],['--muted','--card2']])ok(contrast(p[fg],p[bg])>=4.5,selector+' readable '+fg+' on '+bg)
}
console.log(`Avatar appearance: ${checks} checks passed; offline, no generation or billing.`)
