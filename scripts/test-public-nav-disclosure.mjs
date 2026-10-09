// Offline regression for the menu click bug: disclosure, outside click and Escape.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import React from 'react'
import ts from 'typescript'
import { renderPage } from './preview-ux-complete.mjs'
let focus=0, effects=[], listeners=new Map()
const current={open:true,contains:target=>target.inside,removeAttribute:()=>{current.open=false},querySelector:()=>({focus:()=>focus++})}
const other={open:true}
class FakeNode { constructor(inside){this.inside=inside} }
const document={querySelectorAll:()=>[current,other].filter(d=>d.open),addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)}
const hooks={...React,useRef:()=>({current}),useEffect:fn=>effects.push(fn)}
const module={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/PublicNavDropdown.tsx','utf8'),{compilerOptions:{module:1,jsx:2,esModuleInterop:true}}).outputText,{module,exports:module.exports,React:hooks,document,Node:FakeNode,require:id=>id==='react'?hooks:{UiLabel:({children})=>children}})
const tree=module.exports.default({label:'Video',item:'video',children:React.createElement('a',{href:'/studio'},'Studio')})
assert.equal(tree.type,'details')
assert.equal(tree.props.children[0].type,'summary')
tree.props.onToggle({currentTarget:current})
assert.equal(other.open,false)
const cleanup=effects[0]()
listeners.get('pointerdown')({target:new FakeNode(true)})
assert.equal(current.open,true)
listeners.get('pointerdown')({target:new FakeNode(false)})
assert.equal(current.open,false)
current.open=true
tree.props.onKeyDown({key:'Escape'})
assert.equal(current.open,false)
assert.equal(focus,1)
cleanup();assert.equal(listeners.size,0)
const home=renderPage('app/KineoLanding.tsx',false,{demoOffer:'current'})
for(const href of ['/viral-now','/scripts']) assert.ok(!home.includes(`href="${href}"`))
// KINEO-MENU-VIDEO-LIMPO-2026-10-09 — re-ancorado: o fundador ("2 sim") tirou Audio, Animate e Thumbnails do menu (as páginas seguem no ar).
for(const href of ['/audio','/animate','/thumbnail-generator']) assert.ok(!home.includes(`href="${href}"`))
// 29/09 (KINEO-KINEO1-FORA-2026-09-29): o Kineo 1 ('fast') saiu do mega-menu público; os demais destinos seguem vigiados.
for(const engine of ['seedance','kling','veo','hollywood','h3']) assert.ok(home.includes(`/studio?engine=${engine}&amp;intent_campaign=nav_mega`))
assert.ok(!home.includes('/studio?engine=fast&amp;intent_campaign=nav_mega'))
for(const component of ['components/Sidebar.tsx','components/MobileNav.tsx']){
 const html=renderPage(component,false,{demoShell:true,demoOffer:'current'},{initialLoggedIn:true})
 for(const href of ['/viral-now','/scripts']) assert.ok(!html.includes(`href="${href}"`))
}
console.log('Public menu: native activation, exclusive opening, outside click, Escape/focus, engine/tool destinations and legacy-link removal passed.')
