// Offline presentation fixture: actual result JSX, no effects, APIs or checkout.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
const require=createRequire(import.meta.url)
const React=require('react'),ts=require('typescript'),postcss=require('postcss'),tailwind=require('tailwindcss')
const {renderToStaticMarkup}=require('react-dom/server')
const base='23c4d39d',file='app/(dashboard)/generate/GenerateClient.tsx',out=process.argv[2]
if(!out)throw Error('Output directory required')
const read=(p,b)=>b?execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8',maxBuffer:8e6}):fs.readFileSync(p,'utf8')
function render(before,downloaded){
 const source=read(file,before),ast=ts.createSourceFile(file,source,99,true,4)
 let section,bar,styles=[]
 const attr=(n,key)=>n.openingElement.attributes.properties.find(p=>p.name?.getText(ast)===key)?.initializer?.text
 function walk(n){
  if(ts.isJsxElement(n)&&attr(n,'className')?.includes('gv-card done-result'))section=n
  if(ts.isJsxElement(n)&&attr(n,'aria-label')==='Your next episode')bar=n
  if(ts.isNoSubstitutionTemplateLiteral(n)&&n.text.includes('main.done-workspace'))styles.push(n.text)
  ts.forEachChild(n,walk)
 }walk(ast)
 if(!section||!bar)throw Error('Result layout changed')
 // Keep the full section, but no remote media. All conditional offer variants use fixtures.
 let jsx=section.getText(ast)
 const replacements=[]
 function trim(n){
  if(ts.isJsxElement(n)&&attr(n,'className')==='done-result-preview')replacements.push([n.getStart(ast)-section.getStart(ast),n.end-section.getStart(ast),'<div className="done-result-preview"><div className="gv-done-frame" style={{aspectRatio:"9 / 16",background:"#16191d",color:"#fff",display:"grid",placeItems:"center",borderRadius:12}}>MP4 · visual demonstration</div></div>'])
  ts.forEachChild(n,trim)
 }trim(section)
 for(const [a,b,t] of replacements.sort((a,b)=>b[0]-a[0]))jsx=jsx.slice(0,a)+t+jsx.slice(b)
 const refs=new Set(),calls=new Set(),components=new Set()
 const parsed=ts.createSourceFile('preview.tsx',jsx+bar.getText(ast),99,true,4)
 function find(n){if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))&&/^[A-Z]/.test(n.tagName.getText(parsed)))components.add(n.tagName.getText(parsed));if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression))calls.add(n.expression.text);if(ts.isIdentifier(n)&&n.text.endsWith('Ref'))refs.add(n.text);ts.forEachChild(n,find)}find(parsed)
 const fixture={React,analysis:{title:'Example film — visual demonstration',next_ideas:[]},duration:60,finalVideoSeconds:60,finalVideoUrl:'#',credits:null,phase:'done',planTier:'free',hasPaid:false,trialActive:false,trialPostVideoPhase:null,showPostVideoExportChoice:true,watermarkedDownloadConfirmed:downloaded,episode2Seed:'Example episode',episode2Engine:'cinematic_ai',wmCheckout:{pending:null},cleanExportTrialDoor:{visible:false},nextIdeasCount:3,nextIdeas:[],scenes:[],commercialPlan:'free',currentResultHasWatermark:true,TIER_CREDITS:{starter:60},postVideoPriceNote:'Price shown by the existing checkout',CHECKOUT_CURRENCY_DISCLOSURE:'Prices in USD',cleanExportDirectRef:null,publicVideoId:'offline',freeClampNotice:null,shareState:{},privateReferral:null,prompt:'',postedLink:'',postUrl:'',srtText:'',captionText:'',showPostReward:false}
 for(const k of refs)fixture[k]={current:null}
 for(const k of calls)if(!(k in fixture))fixture[k]=()=>null
 fixture.slugifyTitle=()=> 'example'
 Object.assign(fixture,{useState:React.useState,useRef:React.useRef,useEffect:()=>{},filmReadyNextFilmHref:()=>'/studio',filmReadyCreditsExit:()=> 'topup',filmReadyPlansHref:()=>'/pricing',filmReadyPlanLabel:()=> 'Change plan',Link:({children,...p})=>React.createElement('a',p,children),upscaleQuality:'hd',ytPrivacy:'private'})
 const scope=new Proxy(fixture,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:components.has(String(k))?()=>null:null})
 for(const name of ['FilmReadyExits','CleanFilmTrialDoor','NextActionCard']){
  const f=`components/${name}.tsx`,src=read(f,before),tree=ts.createSourceFile(f,src,99,true,4)
  const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(tree).replace('export default ','')
  const js=ts.transpileModule(fn,{compilerOptions:{jsx:2,target:7}}).outputText
  fixture[name]=vm.runInNewContext(`(function(scope){with(scope){${js};return ${name}}})`,{})(scope)
 }
 const code=ts.transpileModule(`function Preview(){return <main className="done-workspace" style={{padding:24,paddingBottom:90}}>${jsx}${bar.getText(ast)}</main>}`,{compilerOptions:{jsx:2,target:7}}).outputText
 const fn=vm.runInNewContext(`(function(scope){with(scope){${code};return Preview}})`,{})(scope)
 return {html:renderToStaticMarkup(React.createElement(fn)),css:styles.join('\n')}
}
const states=[false,true].flatMap(downloaded=>[true,false].map(before=>({downloaded,before,...render(before,downloaded)})))
const utilities=(await postcss([tailwind({content:states.map(s=>({raw:s.html,extension:'html'}))})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const docs=['light','dark'].flatMap(theme=>states.map(s=>({html:`<!doctype html><html data-theme="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${utilities}${read('app/globals.css',false)}${read('app/appearance.css',s.before)}${s.css}body{margin:0;font-family:Arial,sans-serif}:root{--font-display:Arial;--font-inter:Arial}h2,h3{margin-block:8px}</style><body>${s.html}</body></html>`})))
fs.mkdirSync(out,{recursive:true});docs.forEach((d,i)=>fs.writeFileSync(path.join(out,`result-${i}.html`),d.html))
fs.writeFileSync(path.join(out,'antes-depois.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Vídeo pronto · cores integradas</title><style>body{margin:24px;background:#f6f5f2;color:#20252b;font:15px system-ui}header{display:flex;gap:16px;align-items:center;flex-wrap:wrap}button,select{padding:10px;border:1px solid #a9afb6;border-radius:8px}.pair{display:flex;gap:20px;overflow:auto}article{flex:none}iframe{border:1px solid #cbcdd0;border-radius:14px}</style><header><h1>Vídeo pronto · antes e depois</h1><select aria-label="Tema"><option value="0">Light</option><option value="4">Dark</option></select><select aria-label="Estado"><option value="0">Antes do download</option><option value="2">Depois do download</option></select><button>Ver mobile</button></header><p>JSX real com dados fictícios e mídia substituída. Sem geração, cobrança ou rede. Ações sem efeito nesta comparação.</p><div class="pair"><article><h2>Antes</h2><iframe title="Antes" width="1440" height="1050" sandbox="allow-same-origin"></iframe></article><article><h2>Depois</h2><iframe title="Depois" width="1440" height="1050" sandbox="allow-same-origin"></iframe></article></div><script>const docs=${JSON.stringify(docs).replaceAll('<','\\u003c')};const frames=[...document.querySelectorAll('iframe')],selects=[...document.querySelectorAll('select')];function show(){const i=selects.reduce((a,s)=>a+Number(s.value),0);frames.forEach((f,n)=>f.srcdoc=docs[i+n].html)}selects.forEach(s=>s.onchange=show);let mobile=false;document.querySelector('button').onclick=e=>{mobile=!mobile;frames.forEach(f=>f.width=mobile?390:1440);e.target.textContent=mobile?'Ver desktop':'Ver mobile'};show();</script></html>`)
console.log(path.join(out,'antes-depois.html'))
