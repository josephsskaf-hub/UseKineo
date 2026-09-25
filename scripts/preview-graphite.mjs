// Offline rendering of actual JSX and theme CSS. No effects, APIs or purchases.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { renderPage } from './preview-ux-complete.mjs'
const require=createRequire(import.meta.url)
const ts=require('typescript'), postcss=require('postcss'), tailwind=require('tailwindcss')
const out=process.argv[2]
if(!out)throw Error('Output path required')
const base='0c69b34e'
const read=(file,before=false)=>before?execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}):fs.readFileSync(file,'utf8')
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
function homeCSS(before){const module={exports:{}};vm.runInNewContext(ts.transpileModule(read('app/kineoLandingTheme.ts',before),{compilerOptions:{module:1}}).outputText,{module,exports:module.exports,require:()=>({default:new Proxy({},{get:(_,key)=>String(key)})})});return module.exports.KINEO_LANDING_THEME_CSS}
const pages=[['Home','app/KineoLanding.tsx',{}],['Studio','app/(dashboard)/studio/StudioClient.tsx',{}],['Images','app/(dashboard)/images/ImagesClient.tsx',{galleryLoading:false}],['Library','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,vids:[]}],['Audio','app/(dashboard)/audio/AudioClient.tsx',{galleryLoading:false}],['Animate','app/(dashboard)/animate/AnimateClient.tsx',{}],['Avatar','app/(dashboard)/avatar/AvatarStudioClient.tsx',{}],['Pricing','app/pricing/PricingClient.tsx',{}]]
const rendered=pages.map(([name,file,fixture])=>{console.error('Render '+name);return {name,html:renderPage(file,false,{...fixture,demoOffer:'current'})}})
const utilities=(await postcss([tailwind({content:rendered.map(p=>({raw:p.html,extension:'html'})),corePlugins:{preflight:true}})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const docs=rendered.map(({name,html})=>({name,variants:[true,false].map(before=>{
 let content=html
 if(before&&name==='Home')content=content.replace(homeCSS(false),homeCSS(true))
 content=content.replace(/src="(\/(?:posters|videos)\/[^"?]+\.(?:webp|jpg|png))"/g,(match,url,ext)=>{const file=path.join('public',url);return fs.existsSync(file)?`src="data:image/${ext==='jpg'?'jpeg':ext};base64,${fs.readFileSync(file).toString('base64')}"`:match})
 return `<!doctype html><html lang="en" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${utilities}${read('app/globals.css')}${read('app/appearance.css',before)}${name==='Home'?read('app/examples/ExamplesGallery.module.css',before):''}:root{--font-manrope:Arial;--font-inter:Arial;--font-display:Arial;--font-sans:Arial}body{margin:0}video{background:#20252b}</style><body>${content}</body></html>`
})}))
fs.mkdirSync(path.dirname(out),{recursive:true})
for(const page of docs)for(const [i,html] of page.variants.entries())fs.writeFileSync(path.join(path.dirname(out),`${page.name.toLowerCase()}-${i?'after':'before'}.html`),html)
fs.writeFileSync(out,`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · Branco + grafite</title><style>body{margin:24px;background:#eeede9;color:#20252b;font:14px system-ui}header{display:flex;flex-wrap:wrap;align-items:center;gap:20px}h1{font-size:24px}select,button{padding:10px;border:1px solid #aaa;border-radius:7px;background:white;color:#20252b}.pair{display:flex;gap:24px;overflow:auto}article{flex:none}iframe{border:1px solid #cbcdd0;background:white;border-radius:12px}p{max-width:1000px;line-height:1.6}</style><header><h1>Branco + grafite · antes e depois</h1><select aria-label="Página">${docs.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select><button id="size">Ver mobile</button></header><p>Código real renderizado offline. Base ${base}; depois: paleta aprovada e alinhamento. Galerias pessoais vazias; sem geração, login ou pagamentos. O tema escuro permanece disponível, com refinamento previsto para amanhã.</p><div class="pair"><article><h2>Antes</h2><iframe id="before" title="Antes" width="1440" height="1000" sandbox="allow-same-origin"></iframe></article><article><h2>Depois</h2><iframe id="after" title="Depois" width="1440" height="1000" sandbox="allow-same-origin"></iframe></article></div><script>const pages=${JSON.stringify(docs).replaceAll('<','\\u003c')};const frames=[document.querySelector('#before'),document.querySelector('#after')];const select=document.querySelector('select');function show(){frames.forEach((frame,i)=>frame.srcdoc=pages[Number(select.value)].variants[i])}select.onchange=show;let mobile=false;document.querySelector('#size').onclick=e=>{mobile=!mobile;frames.forEach(f=>f.width=mobile?390:1440);e.target.textContent=mobile?'Ver desktop':'Ver mobile'};show();</script></html>`)
console.log(out)
