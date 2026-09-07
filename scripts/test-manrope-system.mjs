// Offline only: no env, network, database, render or payment.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url), postcss=require('postcss')
const base='19514335'
const read=f=>fs.readFileSync(f,'utf8')
const before=f=>execFileSync('git',['show',`${base}:${f}`],{encoding:'utf8'})
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
const clean=s=>s.replace(/\r\n/g,'\n')
const eraseFamilies=s=>clean(s).replace(/fontFamily:\s*(['"])[^\r\n]*?\1/g,'fontFamily: FONT').replace(/font-family:[^;}\r\n]+/g,'font-family:FONT')
const changed=execFileSync('git',['-c','core.safecrlf=false','diff',base,'--name-only'],{encoding:'utf8'}).trim().split('\n')
for(const f of changed.filter(f=>f.endsWith('.tsx')&&f!=='app/layout.tsx')){
 check(eraseFamilies(read(f))===eraseFamilies(before(f)),f+': only font-family changes; all behavior/copy unchanged')
}
check(eraseFamilies(read('app/tools/editor/editor.css'))===eraseFamilies(before('app/tools/editor/editor.css')),'editor controls styling only; no export changes')
const layout=read('app/layout.tsx')
check(layout.includes("import { Manrope } from 'next/font/google'"),'actual root layout imports Manrope')
check(layout.includes('className={manrope.variable}'),'actual root HTML mounts font variable')
check(!layout.includes('Space_Grotesk')&&!layout.includes('Inter('),'no redundant family downloads')
check(layout.includes("display: 'swap'"),'text remains readable while loading')
check(!layout.includes("weight: ["),'variable weights rather than several static downloads')
const css=postcss.parse(read('app/globals.css')), tokens={}
css.walkDecls(d=>{if(d.prop.startsWith('--font-'))tokens[d.prop]=d.value})
check(tokens['--font-inter']==='var(--font-manrope)','legacy body consumers resolve to approved family')
check(tokens['--font-space-grotesk']==='var(--font-manrope)','legacy heading consumers resolve to approved family')
check(tokens['--font-display']==='var(--font-sans)','titles and body share family')
check(tokens['--font-sans'].includes('var(--font-manrope)'),'canonical body token')
const config=require('../tailwind.config.js')
check(config.theme.extend.fontFamily.sans[0]==='var(--font-sans)','Tailwind sans does not bypass system')
check(config.theme.extend.fontFamily.display[0]==='var(--font-display)','Tailwind heading class configured')
for(const f of ['lib/ui/homePresentation.ts','lib/ui/workspacePresentation.ts']){
 const rules=read(f).match(/`([\s\S]*)`/)[1]
 check(!!postcss.parse(rules),f+': valid CSS')
 check(rules.includes('font-weight:var(--type-title-weight)'),f+': approved lighter title rhythm')
 check(rules.includes('text-transform:none'),f+': labels are not forced uppercase')
}
// Baseline-sensitive ownership safety: do not alter media, money, routes or
// the shared generator just to change typography. Alias propagation suffices.
for(const f of ['app/KineoLanding.tsx','components/studioKit.tsx','components/Sidebar.tsx','components/MobileNav.tsx','app/(dashboard)/generate/GenerateClient.tsx','lib/videoEditor.ts','lib/checkoutPricing.ts']){
 if(fs.existsSync(f))check(clean(read(f))===clean(before(f)),f+': unchanged')
}
console.log(`PASS ${checks} typography/scope contracts; no external access`)
