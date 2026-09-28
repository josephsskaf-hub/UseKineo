// Offline, actual JSX comparison. No effects, API calls or customer records.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { renderPage } from './preview-ux-complete.mjs'
const require=createRequire(import.meta.url)
const postcss=require('postcss'),tailwind=require('tailwindcss')
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const base=process.argv[3]??'799133fd',out=process.argv[2]
if(!out)throw Error('Output directory required')
const read=(file,before)=>before?execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8',maxBuffer:16*1024*1024}):fs.readFileSync(file,'utf8')
const font=`@font-face{font-family:PreviewManrope;src:url(data:font/woff2;base64,${fs.readFileSync('public/design/business-ads-20260924/manrope-latin.woff2').toString('base64')}) format('woff2');font-weight:200 800;font-display:swap}`
function adsInput(before){
 const file='app/(dashboard)/ads/new/AdsWizardClient.tsx',src=read(file,before),ast=ts.createSourceFile(file,src,99,true,4)
 const component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='AdsAutoPanel')
 const ret=component.body.statements.filter(ts.isReturnStatement).at(-1).expression.getText(ast)
 const constants=[];let originalCss=''
 for(const stmt of ast.statements)if(ts.isVariableStatement(stmt))for(const d of stmt.declarationList.declarations){
  if(['MAX_MEDIA','AUTO_PLACEHOLDER'].includes(d.name.getText(ast)))constants.push('const '+d.getText(ast)+';')
  if(d.initializer&&ts.isNoSubstitutionTemplateLiteral(d.initializer)&&d.initializer.text.includes('.adsw .adsw-media{'))originalCss=d.initializer.text
 }
 if(!ret.includes('Let the AI make your ad')||!originalCss)throw Error('Ads input structure changed')
 const min=read('lib/ads/autoBrief.ts',before).match(/export const ADS_AUTO_MIN_ITEMS = (\d+)/)?.[1]
 const code=`${constants.join('\n')}const ADS_AUTO_MIN_ITEMS=${min};function Preview(){const anon=false,welcomeBack=false,order=null,recent=[],brand=null,createdHere={current:false},media=[],link='',linkNote=null,logo=null,busy=null,rest=[],text='',consent=false,error=null,logoInput={current:null},mediaInput={current:null},ADS_UPLOAD_ACCEPT_LOGO='',ADS_UPLOAD_ACCEPT_MEDIA='';const stepsOut=()=>{};return ${ret}}module.exports=Preview;`
 const box={exports:{}};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:1,jsx:2}}).outputText,{module:box,React})
 const theme={exports:{}};vm.runInNewContext(ts.transpileModule(read('app/(dashboard)/ads/new/adsWizardTheme.ts',before),{compilerOptions:{module:1}}).outputText,{module:theme,exports:theme.exports})
 const studio=renderPage('app/(dashboard)/studio/StudioClient.tsx',before,{demoOffer:'current'},{},base).match(/<style>([\s\S]*?)<\/style>/)?.[1]
 if(!studio)throw Error('Studio kit CSS missing')
 return `<main class="stu adsw"><style>${studio}${originalCss}${theme.exports.ADS_WIZARD_THEME_CSS}</style>${renderToStaticMarkup(React.createElement(box.exports))}</main>`
}
const pages=[
 ['Home','app/KineoLanding.tsx',{}],
 ['Studio','app/(dashboard)/studio/StudioClient.tsx',{}],
 ['Images','app/(dashboard)/images/ImagesClient.tsx',{galleryLoading:false}],
 ['Library','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,tab:'images',vids:[],imgs:[{id:'demo-image',url:'/posters/arena-veo31.webp',model:'Preview · demonstration only'}]},{videoCollection:React.createElement('div')}],
 ['Audio','app/(dashboard)/audio/AudioClient.tsx',{galleryLoading:false}],
 ['Animate','app/(dashboard)/animate/AnimateClient.tsx',{}],
 ['Avatar','app/(dashboard)/avatar/AvatarStudioClient.tsx',{}],
 ['Pricing','app/pricing/PricingClient.tsx',{billing:'monthly'}],
 ['Business','app/business-video-ads/page.tsx',{}],
 ['Navigation','components/Sidebar.tsx',{demoShell:true,credits:150,creditsLoading:false},{initialLoggedIn:true,initialEmail:'preview@example.invalid'}],
 ['Mobile navigation','components/MobileNav.tsx',{},{}],
 ['Credits','components/CreditsTopupModal.tsx',{amount:150,currency:'usd',credits:0},{onClose(){},surface:'offline_preview'}],
]
const rendered=pages.map(([name,file,fixture,props={}])=>{
 console.error('Render '+name)
 return {name,variants:[true,false].map(before=>renderPage(file,before,{...fixture,demoOffer:'current'},props,base))}
})
rendered.push({name:'Ads input',variants:[true,false].map(adsInput)})
const utilities=(await postcss([tailwind({content:rendered.flatMap(p=>p.variants.map(raw=>({raw,extension:'html'}))),corePlugins:{preflight:true}})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const docs=rendered.map(({name,variants})=>({name,variants:variants.map((html,index)=>{
 const before=index===0
 html=html.replace(/src="(\/(?:posters|videos)\/[^"?]+\.(?:webp|jpg|png))"/g,(match,url,ext)=>{const file=path.join('public',url);return fs.existsSync(file)?`src="data:image/${ext==='jpg'?'jpeg':ext};base64,${fs.readFileSync(file).toString('base64')}"`:match})
 const css=utilities+read('app/globals.css',before)+read('app/appearance.css',before)+(name==='Home'?read('app/examples/ExamplesGallery.module.css',before):name==='Business'?read('app/business-video-ads/businessAds.module.css',before):'')
 return `<!doctype html><html lang="en" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${font}${css}:root{--font-manrope:PreviewManrope;--font-inter:PreviewManrope;--font-display:PreviewManrope;--font-sans:PreviewManrope}body{margin:0}video{background:#20252b}</style><body>${html}</body></html>`
})}))
fs.mkdirSync(out,{recursive:true})
for(const p of docs)for(const [i,html] of p.variants.entries()){const name=p.name.toLowerCase().replaceAll(' ','-');fs.writeFileSync(path.join(out,`${name}-${i?'after':'before'}.html`),html);if(i)fs.writeFileSync(path.join(out,`${name}-dark.html`),html.replace('data-theme="light"','data-theme="dark"'))}
fs.writeFileSync(path.join(out,'antes-depois.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · Refinamento</title><style>body{margin:24px;background:#f0f1ef;color:#20252b;font:14px system-ui}header{display:flex;flex-wrap:wrap;align-items:center;gap:16px}h1{font-size:24px}select,button{padding:10px;border:1px solid #a9afb6;border-radius:9px;background:white;color:#20252b}.pair{display:flex;gap:24px;overflow:auto}article{flex:1;min-width:0}.viewport{overflow:hidden;border-radius:12px}iframe{border:1px solid #dcdedc;background:white;border-radius:12px}p{max-width:1050px;line-height:1.6}</style><header><h1>Acabamento · antes e depois</h1><select aria-label="Página">${docs.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select><button id="size">Ver mobile</button><button id="theme">Ver dark</button></header><p>Prévia do código real. Antes: ${base}. Depois: superfícies leves, controles consistentes, foco único e alinhamento. Inglês original preservado. Renderização offline, fonte Manrope local, galerias vazias e saldo de demonstração; sem geração nem pagamentos.</p><div class="pair"><article><h2>Antes</h2><div class="viewport"><iframe id="before" title="Antes" width="1440" height="1050" sandbox="allow-same-origin"></iframe></div></article><article><h2>Depois</h2><div class="viewport"><iframe id="after" title="Depois" width="1440" height="1050" sandbox="allow-same-origin"></iframe></div></article></div><script>const pages=${JSON.stringify(docs).replaceAll('<','\\u003c')};const frames=[document.querySelector('#before'),document.querySelector('#after')];const select=document.querySelector('select');let dark=false,mobile=false;function fit(){frames.forEach(f=>{const w=mobile?390:1440;const scale=Math.min(1,f.parentElement.clientWidth/w);f.width=w;f.style.transform='scale('+scale+')';f.style.transformOrigin='top left';f.parentElement.style.height=(1050*scale)+'px'})}addEventListener('resize',fit);function show(){frames.forEach((frame,i)=>frame.srcdoc=pages[Number(select.value)].variants[i].replace('data-theme="light"','data-theme="'+(dark?'dark':'light')+'"'))}select.value=1;select.onchange=show;document.querySelector('#size').onclick=e=>{mobile=!mobile;fit();e.target.textContent=mobile?'Ver desktop':'Ver mobile'};document.querySelector('#theme').onclick=e=>{dark=!dark;e.target.textContent=dark?'Ver light':'Ver dark';show()};show();fit();</script></html>`)
console.log(path.join(out,'antes-depois.html'))
