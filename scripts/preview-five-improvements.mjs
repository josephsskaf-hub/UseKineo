// Offline before/after JSX; stdout patch only. Synthetic project and offer, no network.
import fs from 'node:fs'
import {gzipSync} from 'node:zlib'
import {createRequire} from 'node:module'
import {renderPage,source} from './preview-ux-complete.mjs'
const require=createRequire(import.meta.url),postcss=require('postcss'),tailwind=require('tailwindcss')
const base='5b155dc5'
// Input is the previously approved, self-contained typography comparison.
// Usage: node scripts/preview-five-improvements.mjs /path/to/typography.html
if(!process.argv[2])throw Error('Pass the approved typography HTML containing Manrope font faces')
const old=fs.readFileSync(process.argv[2],'utf8')
const fonts=[...old.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m=>m[0]).filter(s=>/font-family:\s*['"]?Manrope['"]?\s*;/.test(s)).join('\n')
if(!fonts)throw Error('Manrope preview font missing')
const content=['app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/library/LibraryClient.tsx','components/LibraryRecentProject.tsx','components/AffiliateFirstClickNudge.tsx','components/AvatarLaunchBanner.tsx'].map(f=>({raw:source(f),extension:'tsx'}))
const css=(await postcss([tailwind({...require('../tailwind.config.js'),content})]).process(source('app/globals.css'),{from:undefined})).css
const project={id:'demo-video',title:'The lighthouse that disappeared — demonstration',video_url:null,status:'processing',created_at:'2026-09-07'}
const rows=[]
for(const language of ['en','es']) {
 for(const [name,file,fixture] of [
  ['Studio · avisos e idioma','app/(dashboard)/studio/StudioClient.tsx',{}],
  ['Biblioteca · projeto recente','app/(dashboard)/library/LibraryClient.tsx',{loaded:true,recentVideo:project,vids:[]}],
  ['Avatar · destino do botão','components/AvatarLaunchBanner.tsx',{visible:true}],
 ]) {
  const pair=[true,false].map(before=>{
   let html=renderPage(file,before,{...fixture,interfaceLanguage:language},{},base)
   if(name.startsWith('Studio')&&before)html=renderPage('components/AffiliateFirstClickNudge.tsx',true,{offer:{caption:'Demonstration only',destination:'home'},interfaceLanguage:language},{pathname:'/studio',isLoggedIn:true},base)+html
   return `<html lang="${language}"><meta charset="utf-8"><style>/* SHARED_STYLES */:root{--font-manrope:Manrope}body{background:#0b0d12;color:#eef2f8;margin:0}.library-page{max-width:1040px;margin:auto;padding:24px}</style>${html}</html>`
  })
  rows.push({name:name+' · '+language.toUpperCase(),pair})
 }
}
const panel=s=>'<html><meta charset="utf-8"><style>/* SHARED_STYLES */body{padding:20px;background:#0b0d12;color:#eef2f8;font:16px/1.5 Manrope,sans-serif}a{color:#8ac5ff;overflow-wrap:anywhere}p{margin:16px 0}</style>'+s
rows.push({name:'Histórico · tentar novamente (destino)',pair:[panel('<h1>Tentar novamente</h1><a href="/studio/create?prompt=Example">Try again</a><p>Antes: abria o compositor antigo.</p>'),panel('<h1>Tentar novamente</h1><a href="/studio?prompt=Example&engine=fast&duration=35&script_mode=ai">Try again</a><p>Depois: abre a revisão no Studio, sem iniciar geração, mantendo Fast / 35s / modo AI.</p>')]})
const notices=renderPage('components/InstallAppBanner.tsx',true,{mode:'android'}, {},base)+renderPage('components/EnablePushBanner.tsx',true,{show:true,pathname:'/library'}, {},base)+renderPage('components/ReferralPromoBanner.tsx',true,{show:true,pathname:'/library'}, {},base)
rows.push({name:'Biblioteca · avisos secundários (fixtures)',pair:[panel(notices),panel('<h1>Espaço para o projeto</h1><p>Os convites de instalação, notificações e indicação não aparecem sobre a Biblioteca. Alertas de pagamento, saldo e render continuam; notificações já autorizadas continuam sendo mantidas.</p>')]})
const privacyBefore='<h1>Link aberto → alteração imediata</h1><p>Antes: o GET publicava/despublicava sem tela de confirmação. Esta representação descreve o comportamento; não é screenshot de uma tela que existia.</p>'
const privacyAfter='<h1>Publish this video page?</h1><p>Anyone with the public link can watch this video. Your other videos stay private. Only continue if you want to share this one.</p><button>Publish this video</button><p>Cancel — go to my library</p><p>No credits are used. This confirmation expires in 15 minutes.</p>'
rows.push({name:'Privacidade · confirmação (representação do contrato)',pair:[privacyBefore,privacyAfter].map(s=>'<html><meta charset="utf-8"><style>body{padding:28px;max-width:520px;background:#0b0d12;color:#f4f5f7;font:16px/1.6 system-ui}h1{font-size:30px;font-weight:500}p{color:#b8c2d2}button{background:#2997ff;padding:12px;border:0;border-radius:10px}</style>'+s)})
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · cinco melhorias</title><style>body{margin:0;background:#101319;color:#eef2f8;font:15px Arial}header{padding:20px}h1{font-size:24px}p{max-width:980px;line-height:1.5;color:#bdc7d7}select{font:inherit;padding:10px;margin:6px;border-radius:8px}main{display:flex;gap:20px;overflow:auto;padding:20px}article{flex:1;min-width:0}iframe{width:100%;height:1000px;border:1px solid #42516a;border-radius:12px}body.mobile article{flex:0 0 var(--width)}h2{font-size:16px}</style><header><h1>Cinco melhorias · comparação antes/depois</h1><p>JSX real, dados demonstrativos, sem integrações nem operações. A biblioteca mostra um projeto em processamento para provar que ele não desaparece só por ainda não ter MP4. Aviso de afiliado era anterior ao formulário; agora permanece na área de afiliados. Manrope preservada.</p><label>Seção <select id="page">${rows.map((r,i)=>`<option value="${i}">${r.name}</option>`).join('')}</select></label><label>Largura <select id="width"><option value="auto">Lado a lado</option><option value="1280">Desktop 1280</option><option value="390">Celular 390</option><option value="320">Celular 320</option></select></label></header><main><article><h2>Antes</h2><iframe id="before" title="Antes" sandbox="allow-same-origin"></iframe></article><article><h2>Depois</h2><iframe id="after" title="Depois" sandbox="allow-same-origin"></iframe></article></main><script>const rows=${JSON.stringify(rows).replace(/</g,'\\u003c')};function show(){const p=rows[+document.querySelector('#page').value].pair;document.querySelector('#before').srcdoc=p[0];document.querySelector('#after').srcdoc=p[1]}document.querySelector('#page').onchange=show;document.querySelector('#width').onchange=e=>{document.body.classList.toggle('mobile',e.target.value!=='auto');document.body.style.setProperty('--width',e.target.value+'px')};show();</script></html>`
const sharedHtml=html.replace('const rows=', 'const sharedStyles='+JSON.stringify(fonts+css)+';const rows=').replace('srcdoc=p[0]', 'srcdoc=p[0].replace("/* SHARED_STYLES */",sharedStyles)').replace('srcdoc=p[1]', 'srcdoc=p[1].replace("/* SHARED_STYLES */",sharedStyles)')
const data=gzipSync(sharedHtml).toString('base64')
const artifact=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · cinco melhorias</title><p>Abrindo comparação…</p><script>(async()=>{const b=Uint8Array.from(atob('${data}'),c=>c.charCodeAt(0));const h=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();document.open();document.write(h);document.close()})();</script></html>`
process.stdout.write('*** Begin Patch\n*** Add File: docs/previews/CINCO-MELHORIAS-2026-09-07.html\n+'+artifact+'\n*** End Patch')
