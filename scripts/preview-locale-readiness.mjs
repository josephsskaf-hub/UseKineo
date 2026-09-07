// Real JSX, synthetic state, no effects/network. Writes an apply_patch document to stdout.
import fs from 'node:fs'
import {gzipSync} from 'node:zlib'
import {createRequire} from 'node:module'
import {renderPage,source} from './preview-ux-complete.mjs'
const require=createRequire(import.meta.url),postcss=require('postcss'),tailwind=require('tailwindcss')
if(!process.argv[2])throw Error('Pass the approved font comparison HTML')
const fontSource=fs.readFileSync(process.argv[2],'utf8')
const fonts=[...fontSource.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m=>m[0]).filter(s=>/font-family:\s*['"]?Manrope['"]?\s*;/.test(s)).join('\n')
if(!fonts)throw Error('Manrope font not found')
const base='6f6eca73'
const video={id:'demo-video',topic:'The lighthouse — demonstration only',title:'The lighthouse — demonstration only',status:'completed',video_url:'/fixture.mp4',created_at:'2026-09-07',credits_used:4}
const cases=[
 ['Meus vídeos · fechado','app/(dashboard)/history/HistoryClient.tsx',{subscriptionOfferEligible:true,referralCode:'DEMO',referralRewardCredits:25,referralInviteUrl:'https://www.usekineo.com/?ref=DEMO'},{videos:[video,{...video,id:'demo-two',topic:'Episode two — demonstration only'}]}],
 ['Meus vídeos · opções expandidas','app/(dashboard)/history/HistoryClient.tsx',{sharingOptionsOpen:true},{videos:[video]}],
 ['Studio','app/(dashboard)/studio/StudioClient.tsx',{},{}],
 ['Biblioteca','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,recentVideo:{...video,status:'processing',video_url:null},vids:[]},{}],
 ['Home','app/KineoLanding.tsx',{},{}],
 ['Ferramentas','app/tools/page.tsx',{},{}],
 ['Editor','app/tools/editor/VideoEditor.tsx',{supported:true},{initialTool:'trim'}],
 ['Imagens','app/(dashboard)/images/ImagesClient.tsx',{galleryLoading:false},{}],
 ['Áudio','app/(dashboard)/audio/AudioClient.tsx',{galleryLoading:false},{}],
 ['Avatar','app/(dashboard)/avatar/AvatarStudioClient.tsx',{}, {isLoggedIn:false}],
 ['Animar','app/(dashboard)/animate/AnimateClient.tsx',{},{}],
 ['Navegação móvel','components/MobileNav.tsx',{},{}],
]
const content=cases.map(([,file])=>({raw:source(file),extension:'tsx'}))
const css=(await postcss([tailwind({...require('../tailwind.config.js'),content})]).process(source('app/globals.css'),{from:undefined})).css
const shared=fonts+css+source('app/tools/editor/editor.css')+'\n:root{--font-manrope:Manrope;--font-devanagari:"Nirmala UI","Noto Sans Devanagari"}body{margin:0;background:#000;color:#f5f5f7}.library-page{max-width:1040px;margin:auto;padding:24px}'
const rows=[]
for(const language of ['en','es','hi'])for(const [name,file,fixture,props]of cases){
 const pair=[true,false].map(before=>{
  const locale=before&&language==='hi'?'en':language
  const markup=renderPage(file,before,{...fixture,interfaceLanguage:locale},props,base)
  // Fixtures must not fetch media or open live payment/generation destinations.
  const inert=markup.replace(/<(video|audio)\b[^>]*>[\s\S]*?<\/\1>/g,'<div style="min-height:140px;display:grid;place-items:center;background:#131c26;color:#94aec9">Projeto demonstrativo · mídia omitida</div>').replace(/<img\b[^>]*>/g,'').replace(/(?:src|poster)="[^"]*"/g,'')
  return `<html lang="${locale}"><meta charset="utf-8"><style>/* SHARED */</style>${inert}</html>`
 })
 rows.push({name:name+' · '+language.toUpperCase(),pair})
}
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · galeria e três idiomas</title><style>body{background:#101319;color:#eef2f8;font:15px Arial;margin:0}header{padding:20px}p{max-width:1050px;line-height:1.5}select{padding:10px;font:inherit;border-radius:8px;margin:6px}main{display:flex;gap:20px;overflow:auto;padding:20px}article{flex:1;min-width:0}body.mobile article{flex:0 0 var(--width)}iframe{width:100%;height:1100px;border:1px solid #42516a;border-radius:12px}</style><header><h1>Galeria, navegação e idiomas</h1><p>JSX real antes/depois. Antes: ${base}; hindi é comparado ao inglês anterior. Projetos e elegibilidade fictícios, mídia externa e integrações omitidas. Meus vídeos mantém uma oferta principal; indicação/compartilhamento ficam após a galeria, recolhidos. No preview Hindi usa a fonte Devanagari disponível no computador; o deploy usa Noto Sans Devanagari auto-hospedada. Idioma de interface não muda roteiro, preço nem narração. Tradução não inclui artigos SEO, admin, e-mails ou mensagens brutas de fornecedores.</p><label>Página <select id="page">${rows.map((r,i)=>`<option value="${i}">${r.name}</option>`).join('')}</select></label><label>Largura <select id="width"><option value="auto">Lado a lado</option><option value="1280">Desktop 1280</option><option value="390">Mobile 390</option><option value="320">Mobile 320</option></select></label></header><main><article><h2>Antes</h2><iframe id="before" title="Antes" sandbox="allow-same-origin"></iframe></article><article><h2>Depois</h2><iframe id="after" title="Depois" sandbox="allow-same-origin"></iframe></article></main><script>const styles=${JSON.stringify(shared).replace(/</g,'\\u003c')},rows=${JSON.stringify(rows).replace(/</g,'\\u003c')};function show(){const p=rows[+document.querySelector('#page').value].pair;for(const[i,id]of['before','after'].entries())document.getElementById(id).srcdoc=p[i].replace('/* SHARED */',styles)}document.querySelector('#page').onchange=show;document.querySelector('#width').onchange=e=>{document.body.classList.toggle('mobile',e.target.value!=='auto');document.body.style.setProperty('--width',e.target.value+'px')};show()</script></html>`
const data=gzipSync(html).toString('base64')
const artifact=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · galeria e idiomas</title><p>Abrindo comparação…</p><script>(async()=>{const b=Uint8Array.from(atob('${data}'),c=>c.charCodeAt(0));const h=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();document.open();document.write(h);document.close()})();</script></html>`
process.stdout.write('*** Begin Patch\n*** Add File: C:/tmp/kineo-five-improvements-2026-09-07/docs/previews/GALERIA-E-IDIOMAS-2026-09-07.html\n+'+artifact+'\n*** End Patch')
