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
const base=process.argv[3]??'495c2821',out=process.argv[2]
if(!out)throw Error('Output directory required')
const read=(file,before)=>before?execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8',maxBuffer:16*1024*1024}):fs.readFileSync(file,'utf8')
const font=`@font-face{font-family:PreviewManrope;src:url(data:font/woff2;base64,${fs.readFileSync('public/design/business-ads-20260924/manrope-latin.woff2').toString('base64')}) format('woff2');font-weight:200 800;font-display:swap}`
const pages=[
 ['Home','app/KineoLanding.tsx',{}],
 ['Images','app/(dashboard)/images/ImagesClient.tsx',{galleryLoading:false,items:[{id:'demo-only',url:'/design/neutral-20260924/product-concept.png',model:'dev'}]}],
 ['Image preview','app/(dashboard)/images/ImagesClient.tsx',{galleryLoading:false,sample:{src:'/design/neutral-20260924/product-concept.png',name:'Demonstration only'}}],
 ['Library','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,tab:'images',vids:[],imgs:[{id:'demo-image',url:'/posters/arena-veo31.webp',model:'Preview - demonstration only'}]},{videoCollection:React.createElement('div')}],
 ['Ads','app/(dashboard)/ads/v2/AdsV2Client.tsx',{previewFunctions:['AdsV2Session'],phase:'build',photos:[{key:'demo-photo',srcUrl:'/design/business-ads-20260924/restaurant-concept.png',name:'Demonstration concept',w:1536,h:1024,fx:.5,fy:.5,kind:'place',file:{name:'demo.png',size:1024}}]},{initialBalance:150}],
 ['Studio','app/(dashboard)/studio/StudioClient.tsx',{balance:150,prompt:'A lighthouse above the ocean',demoOffer:'current'}],
 ['Mobile review','app/(dashboard)/studio/StudioClient.tsx',{balance:150,prompt:'A lighthouse above the ocean',demoOffer:'current'}],
 ['Video library','app/(dashboard)/history/HistoryClient.tsx',{}, {embedded:true,snapshotTime:1790632800000,videos:[{id:'demo-film',topic:'Demonstration project',status:'completed',quality_mode:'cinematic_veo',video_url:'/demo.mp4',thumbnail_url:'/posters/arena-veo31.webp',created_at:'2026-09-29T10:00:00Z',platform:'shorts'}]}],
 ['Examples','app/examples/ExamplesGallery.tsx',{}, {startPaused:true,videos:[{id:'demo1',title:'Tunguska',badge:'OMNI FLASH',engine:'cinematic_omni',posterUrl:'/posters/examples-hd-sep24/tunguska-globe.webp',videoUrl:'/demo.mp4'},{id:'demo2',title:'The volcano watcher',badge:'VEO 3.1',engine:'cinematic_veo',posterUrl:'/posters/examples-hd-sep24/volcano-selected.webp',videoUrl:'/demo.mp4'},{id:'demo3',title:'The night train',badge:'KLING 2.5',engine:'cinematic_kling',posterUrl:'/posters/examples-hd-sep24/train-selected.webp',videoUrl:'/demo.mp4'}]}],
 ['Film player','app/examples/ExamplesGallery.tsx',{selected:{id:'demo',title:'Lituya Bay',badge:'MINIMAX H3',engine:'cinematic_h3',posterUrl:'/posters/examples-hd-sep24/lituya-h3.webp',videoUrl:'/demo.mp4'}},{videos:[]}],
 ['Pricing','app/pricing/PricingClient.tsx',{billing:'monthly'}],
 ['Navigation','components/Sidebar.tsx',{demoShell:true,credits:150,creditsLoading:false},{initialLoggedIn:true,initialEmail:'preview@example.invalid'}],
 ['Mobile navigation','components/MobileNav.tsx',{},{}],
 ['Credits','components/CreditsTopupModal.tsx',{amount:150,currency:'usd',credits:0},{onClose(){},surface:'offline_preview'}],
 ['Render notice','components/ActiveRenderPill.tsx',{pathname:'/images',probe:{state:'completed',videoId:'demo',title:'Demonstration project',seriesSeed:'Demonstration project'}}],
 ['Payment notice','components/PaymentConfirmedToast.tsx',{visible:true,credits:150,syncing:false}],
 ['Footer','components/Footer.tsx',{}],
 ['Empty Library','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,tab:'images',vids:[],imgs:[]}],
]
const rendered=pages.map(([name,file,fixture,props={}])=>{
 console.error('Render '+name)
 return {name,variants:[true,false].map(before=>renderPage(file,before,{...fixture,demoOffer:'current'},props,base)+(name==='Mobile review'&&!before?renderPage('components/MobileCreationShortcut.tsx',false,{shown:true},{targetId:'studio-generation-review',cost:'Demonstration cost'}):''))}
})

const utilities=(await postcss([tailwind({content:rendered.flatMap(p=>p.variants.map(raw=>({raw,extension:'html'}))),corePlugins:{preflight:true}})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const docs=rendered.map(({name,variants})=>({name,variants:variants.map((html,index)=>{
 const before=index===0
 html=html.replace(/(?:src|poster)="(\/(?:posters|videos|design)\/[^"?]+\.(?:webp|jpg|png))"/g,(match,url,ext)=>{const file=path.join('public',url);return fs.existsSync(file)?`${match.startsWith('poster')?'poster':'src'}="data:image/${ext==='jpg'?'jpeg':ext};base64,${fs.readFileSync(file).toString('base64')}"`:match}).replaceAll('<dialog ','<dialog open style="position:fixed;inset:0;z-index:999" ')
 const css=utilities+read('app/globals.css',before)+read('app/appearance.css',before)+(['Home','Examples','Film player'].includes(name)?read('app/examples/ExamplesGallery.module.css',before):'')
 return `<!doctype html><html lang="en" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${font}${css}:root{--font-manrope:PreviewManrope;--font-inter:PreviewManrope;--font-display:PreviewManrope;--font-sans:PreviewManrope}body{margin:0}video{background:#20252b}</style><body>${html}</body></html>`
})}))
fs.mkdirSync(out,{recursive:true})
for(const p of docs)for(const [i,html] of p.variants.entries()){const name=p.name.toLowerCase().replaceAll(' ','-');fs.writeFileSync(path.join(out,`${name}-${i?'after':'before'}.html`),html);if(i)fs.writeFileSync(path.join(out,`${name}-dark.html`),html.replace('data-theme="light"','data-theme="dark"'))}
fs.writeFileSync(path.join(out,'antes-depois.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · Refinamento</title><style>body{margin:24px;background:#f0f1ef;color:#20252b;font:14px system-ui}header{display:flex;flex-wrap:wrap;align-items:center;gap:16px}h1{font-size:24px}select,button{padding:10px;border:1px solid #a9afb6;border-radius:9px;background:white;color:#20252b}.pair{display:flex;gap:24px;overflow:auto}article{flex:1;min-width:0}.viewport{overflow:hidden;border-radius:12px}iframe{border:1px solid #dcdedc;background:white;border-radius:12px}p{max-width:1050px;line-height:1.6}</style><header><h1>Acabamento · antes e depois</h1><select aria-label="Página">${docs.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select><button id="size">Ver mobile</button><button id="theme">Ver dark</button></header><p>Prévia do código real. Antes: ${base}. Depois: superfícies leves, controles consistentes, foco único e alinhamento. Inglês original preservado. Renderização offline, fonte Manrope local, galerias vazias e saldo de demonstração; sem geração nem pagamentos.</p><div class="pair"><article><h2>Antes</h2><div class="viewport"><iframe id="before" title="Antes" width="1440" height="2100" sandbox="allow-same-origin"></iframe></div></article><article><h2>Depois</h2><div class="viewport"><iframe id="after" title="Depois" width="1440" height="2100" sandbox="allow-same-origin"></iframe></div></article></div><script>const pages=${JSON.stringify(docs).replaceAll('<','\\u003c')};const frames=[document.querySelector('#before'),document.querySelector('#after')];const select=document.querySelector('select');let dark=false,mobile=false;function fit(){frames.forEach(f=>{const w=mobile?390:1440;const scale=Math.min(1,f.parentElement.clientWidth/w);f.width=w;f.style.transform='scale('+scale+')';f.style.transformOrigin='top left';f.parentElement.style.height=(2100*scale)+'px'})}addEventListener('resize',fit);function show(){frames.forEach((frame,i)=>frame.srcdoc=pages[Number(select.value)].variants[i].replace('data-theme="light"','data-theme="'+(dark?'dark':'light')+'"'))}select.value=0;select.onchange=show;document.querySelector('#size').onclick=e=>{mobile=!mobile;fit();e.target.textContent=mobile?'Ver desktop':'Ver mobile'};document.querySelector('#theme').onclick=e=>{dark=!dark;e.target.textContent=dark?'Ver light':'Ver dark';show()};show();fit();</script></html>`)
console.log(path.join(out,'antes-depois.html'))
const compare=path.join(out,'antes-depois.html')
fs.writeFileSync(compare,fs.readFileSync(compare,'utf8').replace('Renderização offline, fonte Manrope local, galerias vazias e saldo de demonstração; sem geração nem pagamentos.','Renderização offline. Fotos, filmes e saldo são dados demonstrativos para visualizar os controles, não novas amostras atribuídas aos motores. Em produção, as referências de imagem vêm do acervo privado do próprio usuário. Sem geração nem pagamentos.'))
