// Offline React render of real page JSX. No effects, requests, analytics or credentials.
// Stdout only; the caller saves the artifact with apply_patch.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const React = require('react')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
export const BASE = '28e7a163'
const root = path.resolve(import.meta.dirname, '..')
export function source(file, before = false) {
  return before ? execFileSync('git', ['show', `${BASE}:${file}`], {cwd:root,encoding:'utf8'}) : fs.readFileSync(path.join(root,file),'utf8')
}
export function renderPage(entry, before = false, fixture = {}, props = {}) {
  const cache = new Map()
  const sf = ts.createSourceFile(entry,source(entry,before),99,true,4)
  const names = []
  function walk(n) {
    if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf)==='useState') names.push(n.name.elements[0].getText(sf))
    ts.forEachChild(n,walk)
  }
  walk(sf)
  let index=0
  const react={...React,useContext:context=>fixture.interfaceLanguage ? {language:fixture.interfaceLanguage,choose:()=>{throw Error('Language mutation in offline render')}} : React.useContext(context),useEffect:()=>{},useCallback:fn=>fn,useMemo:fn=>fn(),useRef:current=>({current}),useState:value=>{
    const name=names[index++]
    if(!name)throw Error('Unmapped state in '+entry)
    return [Object.hasOwn(fixture,name)?fixture[name]:typeof value==='function'?value():value,()=>{throw Error('State mutation in offline render')}]
  }}
  function load(file) {
    if(cache.has(file))return cache.get(file)
    const historical=before && [entry,'components/studioKit.tsx'].includes(file)
    const code=source(file,historical)
    const box={exports:{}}; cache.set(file,box.exports)
    const shim=id=>{
      if(id==='react')return react
      if(id==='react/jsx-runtime')return require(id)
      if(id==='next/link')return {__esModule:true,default:({children,prefetch,...p})=>React.createElement('a',p,children)}
      if(id==='next/navigation')return {useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/studio',useRouter:()=>({})}
      if(id==='@/lib/analytics')return {trackEvent:()=>{throw Error('Analytics forbidden')}}
      if(id==='@/lib/supabase/client')return {createClient:()=>{throw Error('Database access forbidden in offline preview')}}
      if(id==='@/lib/seriesDoorImpressions')return {useSeriesDoorSeen:()=>({registrarPorta:()=>()=>{}})}
      if(id==='server-only')return {}
      if(id==='@/components/studioKit')return load('components/studioKit.tsx')
      if(id==='@/components/InterfaceLanguage')return load('components/InterfaceLanguage.tsx')
      if(id.startsWith('@/components/') || id==='./RevealOnScroll' || id==='./HomeTopicForm'){
        const Stub=({children,...props})=>children??null
        return new Proxy({default:Stub},{get:(target,key)=>key==='__esModule'?true:target[key]??Stub})
      }
      const base=id.startsWith('@/')?id.slice(2):id.startsWith('.')?path.posix.join(path.posix.dirname(file),id):null
      if(!base || !base.startsWith('lib/'))throw Error('Unexpected dependency '+id+' in '+file)
      for(const ext of ['.ts','.tsx'])if(fs.existsSync(path.join(root,base+ext)))return load(base+ext)
      throw Error('Missing '+base)
    }
    const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
    const context={module:box,exports:box.exports,require:shim,React:react,process:{env:{}},URL,URLSearchParams,console,fetch:()=>{throw Error('Network forbidden')}}
    vm.runInNewContext(js,context,{filename:file})
    cache.set(file,box.exports);return box.exports
  }
  const Component=load(entry).default
  const html=renderToStaticMarkup(React.createElement(Component,props))
  if(index!==names.length)throw Error('Conditional hooks in '+entry)
  return html
}
export const PAGES = [
 ['Home','app/KineoLanding.tsx',{}],
 ['Free tools','app/tools/page.tsx',{}],
 ['Images','app/(dashboard)/images/ImagesClient.tsx',{galleryLoading:false}],
 ['Audio','app/(dashboard)/audio/AudioClient.tsx',{galleryLoading:false}],
 ['Library','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,vids:[{id:'fixture',title:'Example project · demonstration only',video_url:null}]}],
 ['Animate','app/(dashboard)/animate/AnimateClient.tsx',{}],
 ['Avatar','app/(dashboard)/avatar/AvatarStudioClient.tsx',{}],
 ['Footer','components/Footer.tsx',{}],
]
if(process.argv.includes('--preview') || process.argv.includes('--language-preview')){
 const languagePreview=process.argv.includes('--language-preview')
 const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')
 const pairs=(languagePreview?PAGES.filter(([name])=>!['Animate','Avatar'].includes(name)):PAGES).map(([name,file,fixture])=>`<section><h2>${name}</h2>${[1280,390].map(width=>`<h3>${width===390?'Mobile':'Desktop'}</h3><div class="pair">${[true,false].map(before=>`<article><h4>${languagePreview?(before?'English · current UI':'Español · cobertura parcial'):(before?'BEFORE · '+BASE:'AFTER · working code')}</h4><iframe title="${name} ${before?'before':'after'} ${width}" width="${width}" height="${name==='Home'?2400:1050}" sandbox="allow-same-origin" srcdoc="${escape('<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;background:#0b0e13;font-family:Arial,sans-serif}a{color:inherit}</style><body>'+renderPage(file,languagePreview?false:before,{...fixture,...(languagePreview&&!before?{interfaceLanguage:'es'}:{})})+'</body></html>')}"></iframe></article>`).join('')}</div>`).join('')}</section>`).join('')
 console.log(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · reformulação integral · comparação</title><style>body{background:#080b10;color:#eaf1ff;font:15px Arial;margin:24px}h1{font-size:28px}.pair{display:flex;gap:24px;align-items:flex-start;overflow:auto}article{flex-shrink:0}iframe{border:1px solid #344055;border-radius:12px}section{margin-bottom:50px}</style><h1>Kineo — comparação do código real</h1><p>Antes fixado em ${BASE}. Depois: JSX atual, desktop e mobile. Offline: integrações e galerias externas omitidas; Library usa um projeto fictício identificado. Sem geração, compra, telemetria ou acesso ao banco. Os vídeos curados são protegidos por teste separado.</p>${pairs}</html>`)
}
