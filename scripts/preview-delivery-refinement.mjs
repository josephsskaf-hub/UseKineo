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
const base=process.argv[3]??'241d4635',out=process.argv[2]
if(!out)throw Error('Output directory required')
const read=(file,before)=>before?execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8',maxBuffer:16*1024*1024}):fs.readFileSync(file,'utf8')
const font=`@font-face{font-family:PreviewManrope;src:url(data:font/woff2;base64,${fs.readFileSync('public/design/business-ads-20260924/manrope-latin.woff2').toString('base64')}) format('woff2');font-weight:200 800;font-display:swap}`

const history='app/(dashboard)/history/HistoryClient.tsx'
const topic='A lighthouse above the Atlantic: the keeper who returned every evening to guide fishing boats safely through the winter storms'
const videos=[{id:'demo-film',topic,status:'completed',quality_mode:'cinematic_veo',video_url:'https://example.invalid/original.mp4',created_at:'2026-09-29T10:00:00Z',platform:'shorts',duration_seconds:60}]
const props={embedded:true,snapshotTime:1790632800000,videos}
const fixture={enhUrls:{'demo-film':'https://example.invalid/enhanced.mp4'},enhStatus:{'demo-film':'done'},fileVersions:{'demo-film':'original'},downloadNotes:{'demo-film':'File opened in another tab. Save it there.'}}
const prior={narration:'Discover our latest collection.',total_seconds:12,overlays:[{role:'brand',start:0,end:3,text:'New collection'}],shots:[{idx:0,role:'hook',kind:'place',source:'client_photo',photo:'demo',cut_seconds:3}]}
const next={...prior,narration:'Discover a new perspective on everyday essentials.',overlays:[{role:'brand',start:0,end:3,text:'Everyday essentials'}],shots:[{...prior.shots[0],cut_seconds:4}]}
const simpleBox={exports:{}}
vm.runInNewContext(ts.transpileModule(read('lib/ads/v2Simple.ts',false),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,simpleBox)
const pages=[
 ['Library',history,fixture,props],
 ['Film player',history,{...fixture,lightbox:'demo-film',fileResolutions:{'https://example.invalid/original.mp4':'1080 × 1920'}},props],
 ['Manual copy',history,{...fixture,manualCopy:topic+'\n\nA demonstration description, ready to copy.'},props],
 ['Simple Ads review','app/(dashboard)/ads/v2/AdsV2Simple.tsx',{exportName:'SimplePlanPreview'},{plan:next,copy:simpleBox.exports.ADS_V2_SIMPLE_COPY.en,cost:null,short:0,busy:null,narrationOn:true,itemByFootage:new Map(),onMake(){}}],
 ['Ads review','app/(dashboard)/ads/v2/AdsV2Client.tsx',{exportName:'PlanPreview'},{plan:next,cost:null,balance:null,narrationOn:true,busy:null,photoByFootage:new Map(),onToggleNarration(){},onMake(){},onCheck(){}}]
]
const rendered=pages.map(([name,file,fixture,props])=>{
 console.error('Render '+name)
 return {name,variants:[true,false].map(before=>{
  let html=renderPage(file,before,fixture,props,base)
  if(name.endsWith('Ads review')){
   if(!before)html=renderPage('components/AdsPlanChanges.tsx',false,{}, {before:prior,after:next})+html
   const css=read('app/(dashboard)/ads/new/adsWizardTheme.ts',before).match(/= `([\s\S]*?)`/)[1]+read('app/(dashboard)/ads/v2/AdsV2Client.tsx',before).match(/const ADS_V2_CSS = `([\s\S]*?)`/)[1]
   html='<style>'+css+'</style><main class="stu adsw adv2"><section class="adv2-card"><h2>Review your plan</h2>'+html+'</section></main>'
  }
  return html
 })}
})
const utilities=(await postcss([tailwind({content:rendered.flatMap(p=>p.variants.map(raw=>({raw,extension:'html'}))),corePlugins:{preflight:true}})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const docs=rendered.map(({name,variants})=>({name,variants:variants.map((html,index)=>{
 const before=index===0
 html=html.replace(/(?:src|poster)="(\/(?:posters|videos|design)\/[^"?]+\.(?:webp|jpg|png))"/g,(match,url,ext)=>{const file=path.join('public',url);return fs.existsSync(file)?`${match.startsWith('poster')?'poster':'src'}="data:image/${ext==='jpg'?'jpeg':ext};base64,${fs.readFileSync(file).toString('base64')}"`:match}).replaceAll('<dialog ','<dialog open style="position:fixed;inset:0;z-index:999" ')
 const css=utilities+read('app/globals.css',before)+read('app/appearance.css',before)
 return `<!doctype html><html lang="en" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${font}${css}:root{--font-manrope:PreviewManrope;--font-inter:PreviewManrope;--font-display:PreviewManrope;--font-sans:PreviewManrope}body{margin:0}video{background:#20252b}</style><body>${html}</body></html>`
})}))
fs.mkdirSync(out,{recursive:true})
for(const p of docs)for(const [i,html] of p.variants.entries()){const name=p.name.toLowerCase().replaceAll(' ','-');fs.writeFileSync(path.join(out,`${name}-${i?'after':'before'}.html`),html);if(i)fs.writeFileSync(path.join(out,`${name}-dark.html`),html.replace('data-theme="light"','data-theme="dark"'))}
fs.writeFileSync(path.join(out,'antes-depois.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · Refinamento</title><style>body{margin:24px;background:#f0f1ef;color:#20252b;font:14px system-ui}header{display:flex;flex-wrap:wrap;align-items:center;gap:16px}h1{font-size:24px}select,button{padding:10px;border:1px solid #a9afb6;border-radius:9px;background:white;color:#20252b}.pair{display:flex;gap:24px;overflow:auto}article{flex:1;min-width:0}.viewport{overflow:hidden;border-radius:12px}iframe{border:1px solid #dcdedc;background:white;border-radius:12px}p{max-width:1050px;line-height:1.6}</style><header><h1>Entrega e revisão · antes e depois</h1><select aria-label="Página">${docs.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select><button id="size">Ver mobile</button><button id="theme">Ver dark</button></header><p>Prévia do código real. Antes: ${base}. Depois: feedback de download, versão do arquivo, título completo, cópia manual e comparação de planos. Os dados são fictícios; o player é estático. No estado anterior não havia recuperação de cópia nem comparação. Inglês original preservado. Renderização offline, fonte Manrope local, galerias vazias e saldo de demonstração; sem geração nem pagamentos.</p><div class="pair"><article><h2>Antes</h2><div class="viewport"><iframe id="before" title="Antes" width="1440" height="2100" sandbox="allow-same-origin"></iframe></div></article><article><h2>Depois</h2><div class="viewport"><iframe id="after" title="Depois" width="1440" height="2100" sandbox="allow-same-origin"></iframe></div></article></div><script>const pages=${JSON.stringify(docs).replaceAll('<','\\u003c')};const frames=[document.querySelector('#before'),document.querySelector('#after')];const select=document.querySelector('select');let dark=false,mobile=false;function fit(){frames.forEach(f=>{const w=mobile?390:1440;const scale=Math.min(1,f.parentElement.clientWidth/w);f.width=w;f.style.transform='scale('+scale+')';f.style.transformOrigin='top left';f.parentElement.style.height=(2100*scale)+'px'})}addEventListener('resize',fit);function show(){frames.forEach((frame,i)=>frame.srcdoc=pages[Number(select.value)].variants[i].replace('data-theme="light"','data-theme="'+(dark?'dark':'light')+'"'))}select.value=0;select.onchange=show;document.querySelector('#size').onclick=e=>{mobile=!mobile;fit();e.target.textContent=mobile?'Ver desktop':'Ver mobile'};document.querySelector('#theme').onclick=e=>{dark=!dark;e.target.textContent=dark?'Ver light':'Ver dark';show()};show();fit();</script></html>`)
console.log(path.join(out,'antes-depois.html'))
const compare=path.join(out,'antes-depois.html')
fs.writeFileSync(compare,fs.readFileSync(compare,'utf8').replace('Renderização offline, fonte Manrope local, galerias vazias e saldo de demonstração; sem geração nem pagamentos.','Renderização offline. Fotos, filmes e saldo são dados demonstrativos para visualizar os controles, não novas amostras atribuídas aos motores. Em produção, as referências de imagem vêm do acervo privado do próprio usuário. Sem geração nem pagamentos.'))
