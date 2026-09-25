// Actual admin JSX, offline fixtures only: no effects, credentials or requests.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { renderPage } from './preview-ux-complete.mjs'
const require = createRequire(import.meta.url)
const postcss = require('postcss'), tailwind = require('tailwindcss')
const out = process.argv[2]
if (!out) throw Error('Output path required')
const base = '0c2377b0'
const data = { mrr:0, arpu:0, payingActive:0, mrrByPlan:[], hasPaidEver:0,
  totalUsers:0, signupsToday:0, signupsThisWeek:0, signupsThisMonth:0,
  signupToPaidRate:'0%', newUsersThisWeek:0, newActivatedThisWeek:0,
  activationRateWeek:'0%', videosToday:0, videosThisWeek:0,
  internalExcluded:0, scopeLabel:'Offline demonstration — synthetic data',
  funnels:[], checkoutLeak:null, atRiskCount:0, atRiskUsers:[],
  abandonedCount:0, checkoutConversionRate:'0%' }
const live = renderPage('components/LiveNowPanel.tsx', false, {data:{visitors_7d:0,visitors_24h:0,signups_24h:0,videos_24h:0,checkouts_24h:0,online_now:0,online:[]}})
const ceo = renderPage('app/(dashboard)/admin/ceo/CeoClient.tsx', false, {}, {data,home:true}).replace('</header>', '</header>'+live)
const utilities = (await postcss([tailwind({content:[{raw:ceo,extension:'html'}]})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
const globals = fs.readFileSync('app/globals.css','utf8')
const beforeCSS = execFileSync('git',['show',`${base}:app/appearance.css`],{encoding:'utf8'})
const afterCSS = fs.readFileSync('app/appearance.css','utf8')
const variants = [beforeCSS,afterCSS].map((css,i)=>`<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${utilities}${globals}${css}:root{--font-manrope:Arial;--font-sans:Arial}body{margin:0}</style><body>${i?'<div class="kineo-admin-theme">':''}${ceo}${i?'</div>':''}</body></html>`)
fs.mkdirSync(path.dirname(out),{recursive:true})
variants.forEach((html,i)=>fs.writeFileSync(path.join(path.dirname(out),i?'admin-after.html':'admin-before.html'),html))
fs.writeFileSync(out,`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>ADM · correção do tema escuro</title><style>body{background:#0c1521;color:#eef5fe;font:15px system-ui;margin:24px}.pair{display:flex;gap:20px;overflow:auto}article{flex:none}iframe{border:1px solid #42617f;border-radius:12px}button{padding:12px;color:#eef5fe;background:#192b3f;border:1px solid #42617f;border-radius:8px}</style><h1>ADM · antes e depois</h1><p>JSX real com dados fictícios zerados. O tema público continua Light; o ADM recebe sua própria paleta escura. Sem conexão com contas, banco ou pagamentos.</p><button id="size">Ver mobile</button><div class="pair"><article><h2>Antes · fundos brancos e textos escuros</h2><iframe title="Antes" width="1440" height="1050" sandbox="allow-same-origin"></iframe></article><article><h2>Depois · ADM escuro e legível</h2><iframe title="Depois" width="1440" height="1050" sandbox="allow-same-origin"></iframe></article></div><script>const docs=${JSON.stringify(variants).replaceAll('<','\u003c')};const frames=[...document.querySelectorAll('iframe')];frames.forEach((f,i)=>f.srcdoc=docs[i]);let mobile=false;document.querySelector('button').onclick=e=>{mobile=!mobile;frames.forEach(f=>f.width=mobile?390:1440);e.target.textContent=mobile?'Ver desktop':'Ver mobile'};</script></html>`)
console.log(out)
// Public Home header: remove only the standalone theme shortcut.
const homeVariants = [true,false].map(before => {
  const markup = renderPage('app/KineoLanding.tsx',before,{}, {},base)
  const styles = [...markup.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('')
  const nav = markup.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)?.[0]
  if (!nav) throw Error('Home navigation missing')
  return `<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${globals}${afterCSS}${styles}</style><body><div class="klp">${nav}</div></body></html>`
})
fs.writeFileSync(path.join(path.dirname(out),'home-menu.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Home · menu limpo</title><style>body{font:16px system-ui;background:#f6f5f2;color:#20252b;margin:24px}iframe{width:100%;height:150px;border:1px solid #cbcdd0}</style><h1>Home · atalho de tema removido do topo</h1><p>Aparência continua disponível no menu da conta. Cabeçalho real renderizado offline.</p><h2>Antes</h2><iframe title="Antes" sandbox="allow-same-origin"></iframe><h2>Depois</h2><iframe title="Depois" sandbox="allow-same-origin"></iframe><script>const docs=${JSON.stringify(homeVariants).replaceAll('<','\\u003c')};document.querySelectorAll('iframe').forEach((f,i)=>f.srcdoc=docs[i]);</script></html>`)
