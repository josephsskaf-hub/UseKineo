// Self-contained visual comparison from real JSX. No requests or browser effects.
import fs from 'node:fs'
import {renderPage} from './preview-ux-complete.mjs'
const base='163198f0',esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')
const embed=(html,title,width,height)=>`<article><h3>${title}</h3><iframe title="${title} ${width}" width="${width}" height="${height}" sandbox="allow-same-origin" srcdoc="${esc('<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;background:#090d13;color:#fff;font-family:Arial}</style>'+html+'</html>')}"></iframe></article>`
let panels=''
for(const width of [1280,390]){
  panels+=`<h2>${width}px · menu principal</h2><div class="pair">`
  for(const before of [true,false]){
    const html=renderPage('app/KineoLanding.tsx',before,{previewCredits:540},{initialUser:true},base)
    const nav=html.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)?.[0]??''
    const styles=[...html.matchAll(/<style[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')
    panels+=embed(styles+'<div class="klp">'+nav+'</div>',before?'Antes · Free tools':'Depois · Editing tools',width,240)
  }
  panels+='</div><h2>'+width+'px · central de ferramentas</h2><div class="pair">'
  for(const before of [true,false]) panels+=embed(renderPage('app/tools/page.tsx',before,{}, {},base),before?'Antes · 13 ferramentas existentes':'Depois · 5 editores + 13 ferramentas preservadas',width,width===390?2600:1250)
  panels+='</div><h2>'+width+'px · editor novo (sem equivalente anterior)</h2><div class="pair">'
  for(const language of ['en','es']){
    const html=renderPage('app/tools/editor/VideoEditor.tsx',false,{interfaceLanguage:language,supported:true,mime:'video/mp4'},{initialTool:'trim'})
    panels+=embed('<style>'+fs.readFileSync('app/tools/editor/editor.css','utf8')+'</style>'+html,language==='en'?'Novo · inglês':'Novo · espanhol',width,width===390?1850:1300)
  }
  panels+='</div>'
}
console.log(('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · cinco ferramentas de edição</title><style>body{margin:24px;background:#080d15;color:#edf3ff;font:15px Arial}.pair{display:flex;gap:24px;overflow:auto}article{flex-shrink:0}iframe{border:1px solid #425166;border-radius:12px}h2{margin-top:44px}</style><h1>Cinco ferramentas de edição · antes e depois</h1><p>Antes: '+base+'. Depois: JSX real. Desktop e mobile; editor novo em inglês e espanhol. Este HTML é um comparativo estático: não edita nem envia arquivos. Saldo 540 é apenas fixture demonstrativa. O editor funcional precisa de verificação separada no navegador.</p>'+panels+'</html>').replace(/[ \t]+$/gm,''))
