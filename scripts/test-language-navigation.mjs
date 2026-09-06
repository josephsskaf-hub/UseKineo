import assert from 'node:assert/strict'
import {renderPage,source} from './preview-ux-complete.mjs'
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
const page='app/KineoLanding.tsx'
for(const signedIn of [false,true])for(const language of ['en','es']){
 const html=renderPage(page,false,{interfaceLanguage:language,previewCredits:540},{initialUser:signedIn})
 const main=html.match(/<nav aria-label="Main">([\s\S]*?)<\/nav>/)?.[1]??''
 const hero=html.match(/<header class="hero">([\s\S]*?)<\/header>/)?.[1]??''
 check((main.match(/class="kineo-interface-language"/g)||[]).length===1,'one language control in Main')
 check(!hero.includes('kineo-interface-language')&&!hero.includes('home-jump'),'no language or duplicate shortcuts in hero')
 // React also emits lang on each option; attribute adjacency is not a contract.
 check(new RegExp('<option(?=[^>]*value="'+language+'")[^>]*selected=""').test(main),'current language selected')
 check(main.includes('href="/tools"')&&main.includes('href="/examples"')&&main.includes('href="#pricing"'),'canonical navigation retained')
 if(signedIn){
  check(main.indexOf('kineo-interface-language')<main.indexOf('540 credits'),'language precedes balance')
  check(main.includes('nav-dashboard')&&main.includes('540 credits'),'balance and Dashboard preserved')
  check(main.includes('id="mobile-nav-menu"'),'mobile Dashboard menu retained')
 }
}
check(!source('lib/ui/homePresentation.ts').includes('.home-jump'),'obsolete shortcut CSS removed')
console.log(`PASS ${checks} language navigation contracts; no requests`)

if(process.argv.includes('--nav-preview')){
 const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')
 const baseline='3fbe0c6f'
 const panels=[false,true].map(signedIn=>`<section><h2>${signedIn?'Conta demonstrativa · saldo fictício':'Visitante'}</h2>${[1280,390].map(width=>`<h3>${width}px</h3><div class="pair">${[true,false].map(before=>{
  const html=renderPage(page,before,{previewCredits:540},{initialUser:signedIn},baseline)
  const styles=[...html.matchAll(/<style[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')
  const nav=html.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)?.[0]??''
  const intro=html.match(/<div class="home-intro">[\s\S]*?(?=<div id="samples")/)?.[0]??''
  return `<article><h4>${before?'Antes':'Depois'}</h4><iframe title="${before?'Antes':'Depois'} ${signedIn?'conta':'visitante'} ${width}" width="${width}" height="520" sandbox="allow-same-origin" srcdoc="${esc('<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;background:#000;font-family:Arial;color:#fff}</style>'+styles+'<div class="klp">'+nav+'<header class="hero"><div class="wrap">'+intro+'</div></header></div></html>')}"></iframe></article>`
 }).join('')}</div>`).join('')}</section>`).join('')
 console.log(('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · Idioma no menu</title><style>body{margin:24px;background:#0b1018;color:#fff;font:15px Arial}.pair{display:flex;gap:20px;overflow:auto}iframe{border:1px solid #435166}article{flex-shrink:0}</style><h1>Idioma no menu principal</h1><p>JSX real, antes fixado em '+baseline+'. Saldo 540 é fixture, não consulta. Vídeos e outros componentes omitidos nesta comparação de navegação.</p>'+panels+'</html>').replace(/[ \t]+$/gm,''))
}
