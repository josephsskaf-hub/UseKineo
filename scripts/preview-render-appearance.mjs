// Render the actual progress components and project section offline.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
const require=createRequire(import.meta.url)
const React=require('react'), ts=require('typescript'), postcss=require('postcss'), tailwind=require('tailwindcss')
const {renderToStaticMarkup}=require('react-dom/server')
const base='6ccf1c74', file='app/(dashboard)/generate/GenerateClient.tsx'
const out=process.argv[2]
if(!out)throw Error('Output directory required')
const read=(p,before)=>before?execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8',maxBuffer:8*1024*1024}):fs.readFileSync(p,'utf8')
function render(before,fast){
  const source=read(file,before), ast=ts.createSourceFile(file,source,99,true,4)
  const names=['ProgressBar','RenderHeader','PipelineStages','FastPipelineStages','NextIdeaDuringWait']
  const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n')
  const sections=[],styles=[]
  const visit=n=>{
    if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(ast)==='section'){
      const c=n.openingElement.attributes.properties.find(p=>p.name?.getText(ast)==='className')?.initializer?.text
      if(c==='gv-card render-workspace-primary rounded-2xl mb-6'||c==='render-workspace-details')sections.push(n.getText(ast))
    }
    if(ts.isNoSubstitutionTemplateLiteral(n)&&n.text.includes('main.render-workspace'))styles.push(n.text)
    ts.forEachChild(n,visit)
  };visit(ast)
  if(sections.length!==2||!styles.length)throw Error('Render markup changed; review preview extraction')
  const preview=`${functions}
    function Preview(){
      const phase='composing',mode=${JSON.stringify(fast?'fast':'cinematic')},displayProgress=62,statusMessage='Rendering your video…',fastStep=3,fastLoadingStartedAt=null,renderProgress=62,finalVideoUrl=null;
      const analysis={title:'Example project — offline demonstration'},prompt='',duration=60,language='en',ideiaNaFila=null,scenes=['Example scene — demonstration only'];
      const handleSalvarIdeiaDaEspera=()=>false,handleLimparIdeiaDaEspera=()=>{},trackEvent=()=>{},normalizarIdeia=s=>s;
      return <main className="render-workspace" style={{padding:24}}>${sections.join('')}</main>
    }
    module.exports=Preview;`
  const box={exports:{}}
  const hooks={useState:React.useState,useEffect:()=>{},useRef:React.useRef}
  const code=ts.transpileModule(preview,{compilerOptions:{module:1,jsx:2,target:7}}).outputText
  vm.runInNewContext(code,{module:box,React,...hooks,normalizarIdeia:s=>s,KineoBolt:()=>React.createElement('span',null,'ϟ')})
  return {html:renderToStaticMarkup(React.createElement(box.exports)),css:styles.join('\n')}
}
const states=[false,true].flatMap(fast=>[true,false].map(before=>({fast,before,...render(before,fast)})))
const utilities=(await postcss([tailwind({content:states.map(s=>({raw:s.html,extension:'html'}))})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const docs=['light','dark'].flatMap(theme=>states.map(s=>({name:`${theme} · ${s.fast?'Kineo 1':'Cinematic'} · ${s.before?'antes':'depois'}`,html:`<!doctype html><html data-theme="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${utilities}${read('app/globals.css',false)}${read('app/appearance.css',s.before)}${s.css}:root{--font-manrope:Arial;--font-display:Arial;--font-inter:Arial;--font-sans:Arial}body{margin:0;font-family:Arial,sans-serif}@keyframes spin{to{transform:rotate(360deg)}}</style><body>${s.html}</body></html>`})))
fs.mkdirSync(out,{recursive:true})
docs.forEach((d,i)=>fs.writeFileSync(path.join(out,`render-${i}.html`),d.html))
const encoded=JSON.stringify(docs).replaceAll('<','\\u003c')
fs.writeFileSync(path.join(out,'antes-depois.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Render · aparência integrada</title><style>body{margin:24px;background:#f6f5f2;color:#20252b;font:15px system-ui}header{display:flex;align-items:center;gap:16px;flex-wrap:wrap}button,select{padding:10px;border:1px solid #a9afb6;border-radius:8px}.pair{display:flex;gap:20px;overflow:auto}article{flex:none}iframe{border:1px solid #cbcdd0;border-radius:14px}</style><header><h1>Render · antes e depois</h1><select aria-label="Tema"><option value="0">Light</option><option value="4">Dark</option></select><select aria-label="Motor"><option value="0">Cinematic</option><option value="2">Kineo 1</option></select><button>Ver mobile</button></header><p>Componentes reais com projeto fictício. Sem render, cobrança ou rede. Abra os detalhes para conferir o resumo e os campos.</p><div class="pair"><article><h2>Antes</h2><iframe title="Antes" width="1280" height="1100" sandbox="allow-same-origin"></iframe></article><article><h2>Depois</h2><iframe title="Depois" width="1280" height="1100" sandbox="allow-same-origin"></iframe></article></div><script>const docs=${encoded};const frames=[...document.querySelectorAll('iframe')],selects=[...document.querySelectorAll('select')];function show(){const i=selects.reduce((a,s)=>a+Number(s.value),0);frames.forEach((f,n)=>f.srcdoc=docs[i+n].html)}selects.forEach(s=>s.onchange=show);let mobile=false;document.querySelector('button').onclick=e=>{mobile=!mobile;frames.forEach(f=>f.width=mobile?390:1280);e.target.textContent=mobile?'Ver desktop':'Ver mobile'};show();</script></html>`)
console.log(path.join(out,'antes-depois.html'))
