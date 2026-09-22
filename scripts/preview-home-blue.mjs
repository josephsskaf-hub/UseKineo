// Actual home JSX rendered without effects, credentials, analytics or DB access.
// Usage: node scripts/preview-home-blue.mjs <output directory>
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
const requireNode = createRequire(import.meta.url)
const baseline = 'cf0ab13e'
const out = process.argv[2]
if (!out) throw Error('Output directory required')
fs.mkdirSync(out, { recursive: true })
const {hero} = JSON.parse(execFileSync(process.execPath,['scripts/test-home-curation.mjs','--data'],{encoding:'utf8'}))
const actualComponents = ['EngineCycleCard','WallMedia','ResumeStrip','InterfaceLanguage']
function render(before, language, signedIn) {
 const cache = new Map()
 function load(file) {
  if(cache.has(file)) return cache.get(file)
  let source = before && ['app/KineoLanding.tsx','lib/ui/homePresentation.ts'].includes(file)
   ? execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}) : fs.readFileSync(file,'utf8')
  const box={exports:{}}; cache.set(file,box.exports)
  const react={...React,useEffect:()=>{},useContext:()=>({language,dict:null,choose:()=>{}})}
  const shim=id=>{
   if(id==='react') return react
   if(id==='react/jsx-runtime') return requireNode(id)
   if(id==='next/link') return {__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)}
   if(id==='next/navigation') return {useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/'}
   if(id==='@/lib/analytics') return {trackEvent:()=>{throw Error('Analytics forbidden')}}
   if(id==='@/components/NavCreditsBadge') return {__esModule:true,default:()=>React.createElement('a',{href:'/pricing',style:{fontSize:12,whiteSpace:'nowrap'}},'⚡ Demo')}
   if(id.startsWith('@/components/') && actualComponents.includes(id.split('/').at(-1))) return load(id.slice(2)+'.tsx')
   if(id.startsWith('@/components/') || id==='./RevealOnScroll' || id==='./HomeTopicForm') return new Proxy({default:({children})=>children??null},{get:(t,k)=>k==='__esModule'?true:t[k]??(({children})=>children??null)})
   if(id==='node:crypto'||id==='crypto') return requireNode(id)
   const base=id.startsWith('@/')?id.slice(2):id.startsWith('.')?path.posix.join(path.posix.dirname(file),id):null
   if(base?.startsWith('lib/'))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return load(base+ext)
   throw Error('Dependency not allowed: '+id)
  }
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:box.exports,module:box,require:shim,process:{env:{}},URL,URLSearchParams,console},{filename:file})
  return box.exports
 }
 const Page=load('app/KineoLanding.tsx').default
 const html=renderToStaticMarkup(React.createElement(Page,{initialUser:signedIn?{id:'demo'}:null,engineWall:hero,resume:signedIn?{title:'A story beneath the ocean',episode:1,videoId:'demo'}:null}))
 // Assets remain the exact approved public posters. This fixture uses no private media.
 const safe=html.replace(/(src|poster)="\//g,'$1="https://www.usekineo.com/').replace(/<a\b/g,'<a target="_blank" rel="noopener"')
 return `<!doctype html><html lang="${language}" dir="${language==='ar'?'rtl':'ltr'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Kineo · ${before?'Antes':'Home azul'}</title><style>@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;550;600;650;700;750;800&display=swap');:root{--font-inter:Manrope;--font-display:Manrope;--type-title-weight:550;--type-label-weight:600}body{margin:0;background:#000}.klp .rv{opacity:1;transform:none}</style>${safe}</html>`
}
for(const language of ['en','es','hi','ar'])for(const signedIn of [false,true])for(const before of [true,false]){
 const name=`home-${before?'before':'after'}-${language}-${signedIn?'account':'guest'}.html`
 fs.writeFileSync(path.join(out,name),render(before,language,signedIn))
}
console.log('Rendered actual home JSX: before/after, guest/account, EN/ES/HI/RTL. Effects and backend omitted.')
